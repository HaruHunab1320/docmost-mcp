import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { TaskRepo } from '../../database/repos/task/task.repo';
import { AgentMemoryService } from './agent-memory.service';
import { AIService } from '../../integrations/ai/ai.service';
import { resolveAgentSettings } from '../agent/agent-settings';

@Injectable()
export class AgentSummaryService {
  private readonly logger = new Logger(AgentSummaryService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly taskRepo: TaskRepo,
    private readonly memoryService: AgentMemoryService,
    private readonly aiService: AIService,
  ) {}

  private getAgentModel() {
    return process.env.GEMINI_AGENT_MODEL || 'gemini-3-pro-preview';
  }

  private async hasSummaryForToday(spaceId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const existing = await this.db
      .selectFrom('agentMemories')
      .select(['id'])
      .where('spaceId', '=', spaceId)
      .where('source', '=', 'agent-summary')
      .where('createdAt', '>=', start)
      .limit(1)
      .execute();

    return existing.length > 0;
  }

  private async hasDigestForToday(spaceId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const existing = await this.db
      .selectFrom('agentMemories')
      .select(['id'])
      .where('spaceId', '=', spaceId)
      .where('source', '=', 'activity-digest')
      .where('createdAt', '>=', start)
      .limit(1)
      .execute();

    return existing.length > 0;
  }

  private async generateActivityDigestForSpace(space: {
    id: string;
    name: string;
    workspaceId: string;
    settings?: any;
  }) {
    const agentSettings = resolveAgentSettings(space.settings);
    if (!agentSettings.enabled) {
      return;
    }

    const shouldSkip = await this.hasDigestForToday(space.id);
    if (shouldSkip) {
      return;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const entries = await this.db
      .selectFrom('agentMemories')
      .select(['summary', 'source', 'createdAt'])
      .where('spaceId', '=', space.id)
      .where('createdAt', '>=', start)
      .where((eb) =>
        eb.or([
          eb('source', 'like', 'page.%'),
          eb('source', 'like', 'task.%'),
          eb('source', 'like', 'project.%'),
          eb('source', 'like', 'comment.%'),
          eb('source', 'like', 'goal.%'),
          eb('source', 'in', ['agent-chat', 'agent-summary']),
        ]),
      )
      .orderBy('createdAt', 'desc')
      .limit(50)
      .execute();

    if (!entries.length) {
      return;
    }

    const grouped = new Map<string, string[]>();
    for (const entry of entries) {
      const source = entry.source || 'activity';
      const [bucket] = source.split('.');
      const key = bucket || source;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      const line = entry.summary || source;
      grouped.get(key)?.push(line);
    }

    let digestText = `# Activity Digest\n\n`;
    for (const [bucket, lines] of grouped) {
      const title = bucket.charAt(0).toUpperCase() + bucket.slice(1);
      digestText += `## ${title}\n`;
      lines.slice(0, 10).forEach((line) => {
        digestText += `- ${line}\n`;
      });
      digestText += '\n';
    }

    await this.memoryService.ingestMemory({
      workspaceId: space.workspaceId,
      spaceId: space.id,
      source: 'activity-digest',
      summary: `Activity digest for ${space.name}`,
      content: { text: digestText },
      tags: ['activity-digest'],
    });
  }

  private async generateSummaryForSpace(space: {
    id: string;
    name: string;
    workspaceId: string;
    settings?: any;
  }) {
    const agentSettings = resolveAgentSettings(space.settings);
    if (!agentSettings.enabled || !agentSettings.enableDailySummary) {
      return;
    }

    const shouldSkip = await this.hasSummaryForToday(space.id);
    if (shouldSkip) {
      return;
    }

    const triage = agentSettings.enableAutoTriage
      ? await this.taskRepo.getDailyTriageSummary(space.id, { limit: 5 })
      : {
          inbox: [],
          waiting: [],
          someday: [],
          overdue: [],
          dueToday: [],
          counts: { inbox: 0, waiting: 0, someday: 0 },
        };

    const prompt = [
      `You are Raven Docs' daily planner assistant.`,
      `Space: ${space.name}`,
      `Summarize today's triage, suggest 3-5 priorities, and propose time blocks.`,
      `Counts: inbox=${triage.counts.inbox}, waiting=${triage.counts.waiting}, someday=${triage.counts.someday}.`,
      `Overdue: ${triage.overdue.map((task) => task.title).join(', ') || 'none'}.`,
      `Due today: ${triage.dueToday.map((task) => task.title).join(', ') || 'none'}.`,
      `Return markdown with sections: Summary, Priorities, Time Blocks, Risks.`,
    ].join('\n');

    let summaryText = '';
    try {
      const response = await this.aiService.generateContent({
        model: this.getAgentModel(),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      summaryText =
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Daily summary unavailable.';
    } catch (error: any) {
      this.logger.warn(
        `Failed to generate AI summary for space ${space.id}: ${error?.message || String(error)}`,
      );
      summaryText = 'Daily summary unavailable.';
    }

    await this.memoryService.ingestMemory({
      workspaceId: space.workspaceId,
      spaceId: space.id,
      source: 'agent-summary',
      summary: `Daily summary for ${space.name}`,
      content: { text: summaryText },
      tags: ['daily-summary', 'triage'],
    });
  }

  @Cron('0 7 * * *')
  async runDailySummaries() {
    if (
      !process.env.GEMINI_API_KEY &&
      !process.env.gemini_api_key &&
      !process.env.GOOGLE_API_KEY &&
      !process.env.google_api_key
    ) {
      this.logger.debug(
        'Skipping daily summaries: GEMINI_API_KEY or GOOGLE_API_KEY not set',
      );
      return;
    }

    const spaces = await this.db
      .selectFrom('spaces')
      .innerJoin('workspaces', 'workspaces.id', 'spaces.workspaceId')
      .select(['spaces.id as id', 'spaces.name as name', 'spaces.workspaceId as workspaceId', 'workspaces.settings as settings'])
      .execute();

    for (const space of spaces) {
      try {
        await this.generateActivityDigestForSpace(space);
        await this.generateSummaryForSpace(space);
      } catch (error: any) {
        this.logger.warn(
          `Daily summary failed for space ${space.id}: ${error?.message || String(error)}`,
        );
      }
    }
  }
}
