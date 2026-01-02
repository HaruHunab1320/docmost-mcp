import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { AIService } from '../../integrations/ai/ai.service';
import { AgentMemoryService } from '../agent-memory/agent-memory.service';
import { TaskService } from '../project/services/task.service';
import { resolveAgentSettings } from './agent-settings';

@Injectable()
export class AgentPlannerService {
  private readonly logger = new Logger(AgentPlannerService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly aiService: AIService,
    private readonly memoryService: AgentMemoryService,
    private readonly taskService: TaskService,
  ) {}

  private getAgentModel() {
    return process.env.GEMINI_AGENT_MODEL || 'gemini-3-pro-preview';
  }

  private parseQuestions(text: string): string[] {
    if (!text) return [];
    return text
      .split('\n')
      .map((line) => line.replace(/^[\s*\d.-]+/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 5);
  }

  private async buildContext(spaceId: string, workspaceId: string) {
    const [goals, memories] = await Promise.all([
      this.db
        .selectFrom('goals')
        .select(['id', 'name', 'horizon'])
        .where('workspaceId', '=', workspaceId)
        .where((eb) =>
          eb('spaceId', '=', spaceId).or('spaceId', 'is', null),
        )
        .orderBy('createdAt', 'desc')
        .execute(),
      this.db
        .selectFrom('agentMemories')
        .select(['summary', 'source', 'createdAt'])
        .where('spaceId', '=', spaceId)
        .orderBy('createdAt', 'desc')
        .limit(12)
        .execute(),
    ]);

    return { goals, memories };
  }

  async generatePlanForSpace(space: {
    id: string;
    name: string;
    workspaceId: string;
    settings?: any;
  }) {
    const settings = resolveAgentSettings(space.settings);
    if (!settings.enabled || !settings.enablePlannerLoop) {
      return null;
    }

    const triage = settings.enableAutoTriage
      ? await this.taskService.getDailyTriageSummary(space.id, {
          limit: 5,
          workspaceId: space.workspaceId,
        })
      : {
          inbox: [],
          waiting: [],
          someday: [],
          overdue: [],
          dueToday: [],
          counts: { inbox: 0, waiting: 0, someday: 0 },
        };

    const { goals, memories } = await this.buildContext(
      space.id,
      space.workspaceId,
    );

    const goalSummary = goals
      .map((goal) => `${goal.name} (${goal.horizon})`)
      .slice(0, 10)
      .join(', ');
    const memorySummary = memories
      .map((memory) => memory.summary)
      .filter(Boolean)
      .join('; ');

    const goalFocusSummary = Array.isArray((triage as any).goalFocus)
      ? (triage as any).goalFocus
          .map((goal: any) => `${goal.name}(${goal.taskCount})`)
          .join(', ')
      : '';

    const planPrompt = [
      `You are Raven Docs' planning agent.`,
      `Space: ${space.name}`,
      `Generate a short plan for today with priorities, next actions, and a timebox suggestion.`,
      `Triage counts: inbox=${triage.counts.inbox}, waiting=${triage.counts.waiting}, someday=${triage.counts.someday}.`,
      `Overdue: ${triage.overdue.map((task) => task.title).join(', ') || 'none'}.`,
      `Due today: ${triage.dueToday.map((task) => task.title).join(', ') || 'none'}.`,
      goalFocusSummary ? `Goal focus: ${goalFocusSummary}.` : null,
      `Goals: ${goalSummary || 'none'}.`,
      `Recent context: ${memorySummary || 'none'}.`,
      `Return markdown with sections: Focus, Plan, Next Actions, Timebox, Risks.`,
    ]
      .filter(Boolean)
      .join('\n');

    let planText = 'Plan unavailable.';
    try {
      const response = await this.aiService.generateContent({
        model: this.getAgentModel(),
        contents: [{ role: 'user', parts: [{ text: planPrompt }] }],
      });
      planText =
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Plan unavailable.';
    } catch (error: any) {
      this.logger.warn(
        `Planner failed for space ${space.id}: ${error?.message || String(error)}`,
      );
    }

    await this.memoryService.ingestMemory({
      workspaceId: space.workspaceId,
      spaceId: space.id,
      source: 'agent-plan',
      summary: `Daily plan for ${space.name}`,
      content: { text: planText },
      tags: ['agent', 'plan'],
    });

    if (settings.enableProactiveQuestions) {
      const questionPrompt = [
        `You are Raven Docs' proactive assistant.`,
        `Suggest 3-5 concise questions to clarify priorities or unblock work.`,
        `Use this context:`,
        `Triage counts: inbox=${triage.counts.inbox}, waiting=${triage.counts.waiting}, someday=${triage.counts.someday}.`,
        goalFocusSummary ? `Goal focus: ${goalFocusSummary}.` : null,
        `Goals: ${goalSummary || 'none'}.`,
        `Recent context: ${memorySummary || 'none'}.`,
        `Return the questions as a bullet list.`,
      ]
        .filter(Boolean)
        .join('\n');

      let questionText = '';
      try {
        const response = await this.aiService.generateContent({
          model: this.getAgentModel(),
          contents: [{ role: 'user', parts: [{ text: questionPrompt }] }],
        });
        questionText =
          response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (error: any) {
        this.logger.warn(
          `Proactive questions failed for space ${space.id}: ${error?.message || String(error)}`,
        );
      }

      const questions = this.parseQuestions(questionText);
      if (questions.length) {
        await this.memoryService.ingestMemory({
          workspaceId: space.workspaceId,
          spaceId: space.id,
          source: 'agent-proactive-questions',
          summary: `Proactive questions for ${space.name}`,
          content: { questions },
          tags: ['agent', 'proactive-question'],
        });
      }
    }

    return planText;
  }

  async generatePlanForSpaceId(spaceId: string, workspace: {
    id: string;
    settings?: any;
  }) {
    const space = await this.db
      .selectFrom('spaces')
      .select(['id', 'name', 'workspaceId'])
      .where('id', '=', spaceId)
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();

    if (!space) {
      return null;
    }

    return this.generatePlanForSpace({
      id: space.id,
      name: space.name,
      workspaceId: space.workspaceId,
      settings: workspace.settings,
    });
  }

  @Cron('0 8,14 * * *')
  async runPlannerLoop() {
    if (
      !process.env.GEMINI_API_KEY &&
      !process.env.gemini_api_key &&
      !process.env.GOOGLE_API_KEY &&
      !process.env.google_api_key
    ) {
      this.logger.debug(
        'Skipping planner loop: GEMINI_API_KEY or GOOGLE_API_KEY not set',
      );
      return;
    }

    const spaces = await this.db
      .selectFrom('spaces')
      .innerJoin('workspaces', 'workspaces.id', 'spaces.workspaceId')
      .select([
        'spaces.id as id',
        'spaces.name as name',
        'spaces.workspaceId as workspaceId',
        'workspaces.settings as settings',
      ])
      .execute();

    for (const space of spaces) {
      try {
        await this.generatePlanForSpace(space);
      } catch (error: any) {
        this.logger.warn(
          `Planner loop failed for space ${space.id}: ${error?.message || String(error)}`,
        );
      }
    }
  }
}
