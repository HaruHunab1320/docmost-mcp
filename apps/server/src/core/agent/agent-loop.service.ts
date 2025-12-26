import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { AIService } from '../../integrations/ai/ai.service';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';
import { TaskService } from '../project/services/task.service';
import { resolveAgentSettings } from './agent-settings';
import { AgentPolicyService } from './agent-policy.service';
import { MCPService } from '../../integrations/mcp/mcp.service';
import { MCPApprovalService } from '../../integrations/mcp/services/mcp-approval.service';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';

type AgentAction = {
  method: string;
  params: Record<string, any>;
  rationale?: string;
};

type AgentLoopPlan = {
  summary: string;
  actions: AgentAction[];
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
      `Return JSON with fields: summary (string), actions (array).`,
      `Each action: { "method": "${methods.join('|')}", "params": { ... }, "rationale": "..." }`,
      `Only include up to 3 actions that are safe and helpful.`,
      `Space: ${context.spaceName}`,
      `Goals: ${context.goals
        .map((goal) => `${goal.name} (${goal.horizon})`)
        .join(', ') || 'none'}`,
      `Recent context: ${context.memorySummary || 'none'}`,
      `Triage: ${context.triageSummary}`,
    ].join('\n');
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
      ? await this.taskService.getDailyTriageSummary(spaceId, { limit: 4 })
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

    const prompt = this.buildPrompt({
      spaceName: space.name,
      goals: sanitizedGoals,
      memorySummary,
      triageSummary,
    });

    let plan: AgentLoopPlan = { summary: 'No actions proposed.', actions: [] };
    if (process.env.GEMINI_API_KEY || process.env.gemini_api_key) {
      try {
        const response = await this.aiService.generateContent({
          model: this.getAgentModel(),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text =
          response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = this.extractJson(text);
        if (parsed?.summary) {
          plan = parsed;
        }
      } catch (error: any) {
        this.logger.warn(
          `Agent loop failed for space ${spaceId}: ${error?.message || String(error)}`,
        );
      }
    }

    const actionResults: Array<{ method: string; status: string }> = [];
    const actions = Array.isArray(plan.actions) ? plan.actions.slice(0, 3) : [];

    for (const action of actions) {
      if (!action?.method || !this.policyService.isSupportedMethod(action.method)) {
        continue;
      }

      const params = {
        ...action.params,
        workspaceId: workspace.id,
        spaceId,
      };

      const shouldAutoApply = this.policyService.canAutoApply(
        action.method,
        settings,
      );

      if (shouldAutoApply) {
        const result = await this.mcpService.processRequest(
          {
            jsonrpc: '2.0',
            method: action.method,
            params,
            id: Date.now(),
          },
          user,
        );

        if (result.error) {
          actionResults.push({ method: action.method, status: 'failed' });
        } else {
          actionResults.push({ method: action.method, status: 'applied' });
        }
        continue;
      }

      if (this.policyService.requiresApproval(action.method, settings)) {
        const approval = await this.approvalService.createApproval(
          user.id,
          action.method,
          params,
          600,
        );
        actionResults.push({
          method: action.method,
          status: `approval:${approval.token}`,
        });
      }
    }

    await this.memoryService.ingestMemory({
      workspaceId: workspace.id,
      spaceId,
      source: 'agent-loop',
      summary: plan.summary || 'Agent loop executed',
      content: { plan, actions: actionResults },
      tags: ['agent', 'loop'],
    });

    return {
      summary: plan.summary || 'Agent loop executed',
      actions: actionResults,
    };
  }
}
