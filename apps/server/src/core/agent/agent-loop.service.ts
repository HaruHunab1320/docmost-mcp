import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { AIService } from '../../integrations/ai/ai.service';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';
import { TaskService } from '../project/services/task.service';
import { resolveAgentSettings } from './agent-settings';
import { AgentPolicyService } from './agent-policy.service';
import { MCPService } from '../../integrations/mcp/mcp.service';
import { MCPApprovalService } from '../../integrations/mcp/services/mcp-approval.service';
import { AgentReviewPromptsService } from './agent-review-prompts.service';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { User, Workspace } from '@raven-docs/db/types/entity.types';
import { SpaceRepo } from '@raven-docs/db/repos/space/space.repo';

type AgentAction = {
  method: string;
  params: Record<string, any>;
  rationale?: string;
};

type AgentLoopPlan = {
  summary: string;
  actions: AgentAction[];
  reviewQuestions?: string[];
};

type ActionResult = {
  method: string;
  status: string;
  phase: 'validated' | 'approval' | 'executed' | 'failed' | 'denied' | 'skipped';
  attempts?: number;
  error?: string;
  reason?: string;
};

const formatISODate = (date: Date) => date.toISOString().slice(0, 10);
const formatYearMonth = (date: Date) => formatISODate(date).slice(0, 7);

const getWeekKey = (date = new Date()) => {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = firstDay.getDay() || 7;
  const weekStart = new Date(firstDay);
  weekStart.setDate(firstDay.getDate() + (7 - dayOffset));
  const diff =
    date.getTime() -
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .getTime();
  const weekNumber = Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const normalizeParams = (method: string, params: Record<string, any>) => {
  if (method.startsWith('task.')) {
    if (typeof params.priority === 'string') {
      params.priority = params.priority.toLowerCase();
    }
    if (typeof params.status === 'string') {
      params.status = params.status.toLowerCase();
    }
    if (typeof params.bucket === 'string') {
      params.bucket = params.bucket.toLowerCase();
    }
  }

  if (method === 'page.create' && typeof params.content !== 'object') {
    delete params.content;
  }

  if (method === 'task.create' && !params.title) {
    params.title = 'New task';
  }

  if (method === 'page.create' && !params.title) {
    params.title = 'Untitled page';
  }

  return params;
};

const shouldRetry = (error: unknown) => {
  const message =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.error?.message || '';
  const lower = String(message).toLowerCase();
  return (
    lower.includes('timeout') ||
    lower.includes('temporar') ||
    lower.includes('rate limit') ||
    lower.includes('econn') ||
    lower.includes('unavailable')
  );
};

@Injectable()
export class AgentLoopService {
  private readonly logger = new Logger(AgentLoopService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly aiService: AIService,
    private readonly memoryService: AgentMemoryService,
    private readonly taskService: TaskService,
    private readonly policyService: AgentPolicyService,
    private readonly mcpService: MCPService,
    private readonly approvalService: MCPApprovalService,
    private readonly reviewPromptService: AgentReviewPromptsService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly spaceRepo: SpaceRepo,
  ) {}

  private getAgentModel() {
    return process.env.GEMINI_AGENT_MODEL || 'gemini-3-pro-preview';
  }

  private extractJson(text: string): AgentLoopPlan | null {
    if (!text) return null;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (error) {
      return null;
    }
  }

  private async buildContext(spaceId: string, workspaceId: string) {
    const [goals, memories] = await Promise.all([
      this.db
        .selectFrom('goals')
        .select(['id', 'name', 'horizon', 'keywords'])
        .where('workspaceId', '=', workspaceId)
        .where((eb) => eb('spaceId', '=', spaceId).or('spaceId', 'is', null))
        .orderBy('createdAt', 'desc')
        .limit(10)
        .execute(),
      this.db
        .selectFrom('agentMemories')
        .select(['summary', 'source', 'createdAt'])
        .where('workspaceId', '=', workspaceId)
        .where('spaceId', '=', spaceId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .execute(),
    ]);

    return { goals, memories };
  }

  private buildPrompt(context: {
    spaceName: string;
    goals: Array<{ id: string; name: string; horizon: string; keywords?: unknown }>;
    memorySummary: string;
    triageSummary: string;
  }) {
    const methods = ['task.create', 'task.update', 'page.create', 'project.create'];
    return [
      `You are Raven Docs' autonomous agent.`,
      `Generate a concise JSON plan with actionable next steps.`,
      `Return ONLY JSON with fields: summary (string), actions (array), reviewQuestions (array, optional). No markdown.`,
      `Each action: { "method": "${methods.join('|')}", "params": { ... }, "rationale": "..." }`,
      `Only include up to 3 actions that are safe and helpful.`,
      `If you have follow-up questions for the weekly review, include them in reviewQuestions (array of strings). Use an empty array if none.`,
      `Space: ${context.spaceName}`,
      `Goals: ${context.goals
        .map((goal) => `${goal.name} (${goal.horizon})`)
        .join(', ') || 'none'}`,
      `Recent context: ${context.memorySummary || 'none'}`,
      `Triage: ${context.triageSummary}`,
    ].join('\n');
  }

  private async getDailyFocusTitle(spaceId: string) {
    const today = formatISODate(new Date());
    const title = `Daily Focus ${today}`;
    const existing = await this.db
      .selectFrom('pages')
      .select(['id'])
      .where('spaceId', '=', spaceId)
      .where('title', '=', title)
      .executeTakeFirst();

    if (existing) {
      return null;
    }

    return title;
  }

  private async getUniquePageTitle(spaceId: string, title: string) {
    const existing = await this.db
      .selectFrom('pages')
      .select(['id'])
      .where('spaceId', '=', spaceId)
      .where('title', '=', title)
      .executeTakeFirst();

    if (existing) {
      return null;
    }

    return title;
  }

  async runLoop(spaceId: string, user: User, workspace: Workspace) {
    const settings = resolveAgentSettings(workspace.settings);
    if (!settings.enabled || !settings.enableAutonomousLoop) {
      throw new ForbiddenException('Autonomous loop disabled');
    }

    const ability = await this.spaceAbility.createForUser(user, spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException('No access to space');
    }

    const space = await this.spaceRepo.findById(spaceId, workspace.id);
    if (!space) {
      throw new ForbiddenException('Space not found');
    }

    const triage = settings.enableAutoTriage
      ? await this.taskService.getDailyTriageSummary(spaceId, {
          limit: 4,
          workspaceId: workspace.id,
        })
      : {
          inbox: [],
          waiting: [],
          someday: [],
          overdue: [],
          dueToday: [],
          counts: { inbox: 0, waiting: 0, someday: 0 },
        };

    const { goals, memories } = await this.buildContext(spaceId, workspace.id);
    const sanitizedGoals = goals.map((goal) => ({
      ...goal,
      keywords: Array.isArray(goal.keywords) ? goal.keywords : [],
    }));
    const memorySummary = memories
      .map((memory) => memory.summary)
      .filter(Boolean)
      .join('; ');
    const triageSummary = `inbox=${triage.counts.inbox}, waiting=${triage.counts.waiting}, someday=${triage.counts.someday}, overdue=${triage.overdue.length}, dueToday=${triage.dueToday.length}`;
    const goalFocusSummary = Array.isArray((triage as any).goalFocus)
      ? (triage as any).goalFocus
          .map((goal: any) => `${goal.name}(${goal.taskCount})`)
          .join(', ')
      : '';

    const prompt = this.buildPrompt({
      spaceName: space.name,
      goals: sanitizedGoals,
      memorySummary,
      triageSummary: goalFocusSummary
        ? `${triageSummary}, goalFocus=${goalFocusSummary}`
        : triageSummary,
    });

    let plan: AgentLoopPlan = { summary: 'No actions proposed.', actions: [] };
    let rawResponse = '';
    if (
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key ||
      process.env.GOOGLE_API_KEY ||
      process.env.google_api_key
    ) {
      try {
        const response = await this.aiService.generateContent({
          model: this.getAgentModel(),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text =
          response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawResponse = text;
        const parsed = this.extractJson(text);
        if (parsed?.summary) {
          plan = parsed;
        } else if (text) {
          plan = { summary: text.slice(0, 180), actions: [] };
        }
      } catch (error: any) {
        this.logger.warn(
          `Agent loop failed for space ${spaceId}: ${error?.message || String(error)}`,
        );
      }
    }

    const actionResults: ActionResult[] = [];
    const validationNotes: string[] = [];
    const actions = Array.isArray(plan.actions) ? plan.actions.slice(0, 3) : [];
    const reviewQuestions = Array.isArray(plan.reviewQuestions)
      ? plan.reviewQuestions.map((question) => String(question))
      : [];

    if (reviewQuestions.length) {
      await this.reviewPromptService.createPrompts({
        workspaceId: workspace.id,
        spaceId,
        weekKey: getWeekKey(new Date()),
        questions: reviewQuestions,
        source: 'agent-loop',
      });
    }

    for (const action of actions) {
      if (!action?.method || !this.policyService.isSupportedMethod(action.method)) {
        actionResults.push({
          method: action?.method || 'unknown',
          status: 'skipped:unsupported',
          phase: 'skipped',
          reason: 'unsupported-method',
        });
        validationNotes.push(
          `Skipped unsupported method: ${action?.method || 'unknown'}`,
        );
        continue;
      }

      const params = {
        ...action.params,
        workspaceId: workspace.id,
        spaceId,
      };
      const normalizedParams = normalizeParams(action.method, params);

      if (
        action.method === 'page.create' &&
        typeof normalizedParams.title === 'string'
      ) {
        const lowerTitle = normalizedParams.title.toLowerCase();
        if (lowerTitle.includes('daily focus')) {
          const dailyTitle = await this.getDailyFocusTitle(spaceId);
          if (!dailyTitle) {
            actionResults.push({
              method: action.method,
              status: 'skipped:daily-focus-exists',
              phase: 'skipped',
              reason: 'daily-focus-exists',
            });
            validationNotes.push('Skipped Daily Focus: already exists');
            continue;
          }
          normalizedParams.title = dailyTitle;
        } else if (lowerTitle.includes('weekly review')) {
          const weeklyTitle = `Weekly Review ${getWeekKey(new Date())}`;
          const uniqueTitle = await this.getUniquePageTitle(
            spaceId,
            weeklyTitle,
          );
          if (!uniqueTitle) {
            actionResults.push({
              method: action.method,
              status: 'skipped:weekly-review-exists',
              phase: 'skipped',
              reason: 'weekly-review-exists',
            });
            validationNotes.push('Skipped Weekly Review: already exists');
            continue;
          }
          normalizedParams.title = uniqueTitle;
        } else if (lowerTitle.includes('monthly review')) {
          const monthlyTitle = `Monthly Review ${formatYearMonth(new Date())}`;
          const uniqueTitle = await this.getUniquePageTitle(
            spaceId,
            monthlyTitle,
          );
          if (!uniqueTitle) {
            actionResults.push({
              method: action.method,
              status: 'skipped:monthly-review-exists',
              phase: 'skipped',
              reason: 'monthly-review-exists',
            });
            validationNotes.push('Skipped Monthly Review: already exists');
            continue;
          }
          normalizedParams.title = uniqueTitle;
        } else if (lowerTitle.includes('project recap')) {
          const projectId =
            typeof normalizedParams.projectId === 'string'
              ? normalizedParams.projectId
              : 'general';
          const recapTitle = `Project Recap ${projectId} ${formatISODate(
            new Date(),
          )}`;
          const uniqueTitle = await this.getUniquePageTitle(
            spaceId,
            recapTitle,
          );
          if (!uniqueTitle) {
            actionResults.push({
              method: action.method,
              status: 'skipped:project-recap-exists',
              phase: 'skipped',
              reason: 'project-recap-exists',
            });
            validationNotes.push('Skipped Project Recap: already exists');
            continue;
          }
          normalizedParams.title = uniqueTitle;
        }
      }

      const policyDecision = this.policyService.evaluate(
        action.method,
        settings,
      );

      if (policyDecision.decision === 'deny') {
        actionResults.push({
          method: action.method,
          status: `denied:${policyDecision.reason}`,
          phase: 'denied',
          reason: policyDecision.reason,
        });
        validationNotes.push(
          `Denied ${action.method}: ${policyDecision.reason}`,
        );
        continue;
      }

      if (policyDecision.decision === 'auto') {
        const maxAttempts = 2;
        let attempt = 0;
        let lastError: any = null;
        let success = false;
        while (attempt < maxAttempts && !success) {
          attempt += 1;
          try {
            const result = await this.mcpService.processRequest(
              {
                jsonrpc: '2.0',
                method: action.method,
                params: normalizedParams,
                id: Date.now(),
              },
              user,
            );

            if (!result.error) {
              success = true;
              actionResults.push({
                method: action.method,
                status: 'applied',
                phase: 'executed',
                attempts: attempt,
              });
              break;
            }

            lastError = result.error;
            if (!shouldRetry(result.error) || attempt >= maxAttempts) {
              actionResults.push({
                method: action.method,
                status: 'failed',
                phase: 'failed',
                attempts: attempt,
                error: result.error?.message || 'Unknown error',
              });
              break;
            }
          } catch (error: any) {
            lastError = error;
            if (!shouldRetry(error) || attempt >= maxAttempts) {
              actionResults.push({
                method: action.method,
                status: 'failed',
                phase: 'failed',
                attempts: attempt,
                error: error?.message || 'Unknown error',
              });
              break;
            }
          }
        }
        if (!success && !lastError) {
          actionResults.push({
            method: action.method,
            status: 'failed',
            phase: 'failed',
            attempts: maxAttempts,
            error: 'Unknown error',
          });
        }
        continue;
      }

      if (policyDecision.decision === 'approval') {
        const approval = await this.approvalService.createApproval(
          user.id,
          action.method,
          normalizedParams,
          600,
        );
        await this.memoryService.ingestMemory({
          workspaceId: workspace.id,
          spaceId,
          source: 'approval-event',
          summary: `Approval created for ${action.method}`,
          content: {
            token: approval.token,
            method: action.method,
            spaceId,
          },
          tags: ['approval-created'],
        });
        actionResults.push({
          method: action.method,
          status: `approval:${approval.token}`,
          phase: 'approval',
          reason: policyDecision.reason,
        });
        validationNotes.push(
          `Approval required for ${action.method}: ${policyDecision.reason}`,
        );
      }
    }

    await this.memoryService.ingestMemory({
      workspaceId: workspace.id,
      spaceId,
      source: 'agent-loop',
      summary: plan.summary || 'Agent loop executed',
      content: {
        plan,
        actions: actionResults,
        rawResponse,
        validationNotes,
        phases: {
          planning: { model: this.getAgentModel() },
          execution: { total: actionResults.length },
        },
      },
      tags: ['agent', 'loop'],
    });

    return {
      summary: plan.summary || 'Agent loop executed',
      actions: actionResults,
    };
  }
}
