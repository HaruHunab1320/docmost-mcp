import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { AIService } from '../../integrations/ai/ai.service';
import { AgentMemoryService } from './agent-memory.service';
import { resolveAgentSettings } from '../agent/agent-settings';

@Injectable()
export class AgentInsightsService {
  private readonly logger = new Logger(AgentInsightsService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly aiService: AIService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  private getAgentModel() {
    return process.env.GEMINI_AGENT_MODEL || 'gemini-3-pro-preview';
  }

  private async getRecentMemoryText(
    spaceId: string,
    since: Date,
  ): Promise<string> {
    const rows = await this.db
      .selectFrom('agentMemories')
      .select(['summary', 'content', 'createdAt'])
      .where('spaceId', '=', spaceId)
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .execute();

    return rows
      .map((row) => {
        if (typeof row.content === 'string') {
          return row.content;
        }
        if (row.content && typeof row.content === 'object' && 'text' in row.content) {
          return (row.content as { text?: string }).text || row.summary || '';
        }
        return row.summary || '';
      })
      .filter(Boolean)
      .join('\n');
  }

  private async generateSummary(
    spaceId: string,
    workspaceId: string,
    spaceName: string,
    label: string,
    days: number,
    tag: string,
  ) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const memoryText = await this.getRecentMemoryText(spaceId, since);
    if (!memoryText) {
      return;
    }

    const prompt = [
      `You are Raven Docs' memory analyst.`,
      `Provide a concise ${label} summary based on the recent memory log.`,
      `Highlight themes, progress, and open loops.`,
      `Memory log:`,
      memoryText,
    ].join('\n');

    let summaryText = `${label} summary unavailable.`;
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
        summaryText =
          response?.candidates?.[0]?.content?.parts?.[0]?.text || summaryText;
      } catch (error: any) {
        this.logger.warn(
          `Summary generation failed for space ${spaceId}: ${error?.message || String(error)}`,
        );
      }
    }

    await this.memoryService.ingestMemory({
      workspaceId,
      spaceId,
      source: 'agent-insight',
      summary: `${label} summary for ${spaceName}`,
      content: { text: summaryText },
      tags: ['agent', 'agent-insight', tag],
    });
  }

  private async generateSignals(
    spaceId: string,
    workspaceId: string,
    spaceName: string,
  ) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const memoryText = (await this.getRecentMemoryText(spaceId, since)).toLowerCase();
    if (!memoryText) return;

    const keywords = [
      'gym',
      'workout',
      'diet',
      'sleep',
      'journal',
      'reading',
      'learning',
      'coding',
      'meeting',
    ];

    const hits = keywords
      .map((keyword) => ({
        keyword,
        count: memoryText.split(keyword).length - 1,
      }))
      .filter((item) => item.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (hits.length) {
      await this.memoryService.ingestMemory({
        workspaceId,
        spaceId,
        source: 'agent-insight',
        summary: `Habit signals for ${spaceName}`,
        content: { signals: hits },
        tags: ['agent', 'agent-insight', 'habit-signal'],
      });
    }

    const goals = await this.db
      .selectFrom('goals')
      .select(['id', 'name', 'keywords'])
      .where('workspaceId', '=', workspaceId)
      .where((eb) => eb('spaceId', '=', spaceId).or('spaceId', 'is', null))
      .execute();

    for (const goal of goals) {
      const rawKeywords = Array.isArray(goal.keywords) ? goal.keywords : [];
      const goalKeywords = rawKeywords
        .filter((kw): kw is string => typeof kw === 'string')
        .map((kw) => kw.toLowerCase())
        .filter(Boolean);
      if (!goalKeywords.length) {
        continue;
      }
      const hasMention = goalKeywords.some((keyword) =>
        memoryText.includes(keyword),
      );
      if (hasMention) {
        continue;
      }

      await this.memoryService.ingestMemory({
        workspaceId,
        spaceId,
        source: 'agent-insight',
        summary: `Goal drift detected: ${goal.name}`,
        content: { goalId: goal.id, goalName: goal.name },
        tags: ['agent', 'agent-insight', 'goal-drift'],
      });
    }
  }

  private async generateTopicClusters(
    spaceId: string,
    workspaceId: string,
    spaceName: string,
  ) {
    const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    const entities = await this.memoryService.listTopEntities({
      workspaceId,
      spaceId,
      from: since,
      limit: 8,
    });

    if (!entities.length) return;

    await this.memoryService.ingestMemory({
      workspaceId,
      spaceId,
      source: 'agent-insight',
      summary: `Topic clusters for ${spaceName}`,
      content: {
        clusters: entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          count: entity.count,
        })),
      },
      tags: ['agent', 'agent-insight', 'topic-cluster'],
    });
  }

  private async generateGoalTrends(
    spaceId: string,
    workspaceId: string,
  ) {
    const recentSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const baselineSince = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentText = (await this.getRecentMemoryText(spaceId, recentSince)).toLowerCase();
    const baselineText = (await this.getRecentMemoryText(spaceId, baselineSince)).toLowerCase();

    if (!baselineText) return;

    const goals = await this.db
      .selectFrom('goals')
      .select(['id', 'name', 'keywords'])
      .where('workspaceId', '=', workspaceId)
      .where((eb) => eb('spaceId', '=', spaceId).or('spaceId', 'is', null))
      .execute();

    const trends = goals
      .map((goal) => {
        const rawKeywords = Array.isArray(goal.keywords) ? goal.keywords : [];
        const keywords = rawKeywords
          .filter((kw): kw is string => typeof kw === 'string')
          .map((kw) => kw.toLowerCase())
          .filter(Boolean);
        if (!keywords.length) return null;

        const recentHits = keywords.reduce(
          (acc, keyword) => acc + (recentText.split(keyword).length - 1),
          0,
        );
        const baselineHits = keywords.reduce(
          (acc, keyword) => acc + (baselineText.split(keyword).length - 1),
          0,
        );

        if (!baselineHits) return null;

        const ratio = recentHits / baselineHits;
        return {
          goalId: goal.id,
          goalName: goal.name,
          recentHits,
          baselineHits,
          ratio,
        };
      })
      .filter(Boolean)
      .filter((trend) => trend && trend.ratio < 0.4);

    if (!trends.length) return;

    await this.memoryService.ingestMemory({
      workspaceId,
      spaceId,
      source: 'agent-insight',
      summary: `Goal trends detected`,
      content: { trends },
      tags: ['agent', 'agent-insight', 'goal-trend'],
    });
  }

  private async runForSpaces(handler: (space: any) => Promise<void>) {
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
      const settings = resolveAgentSettings(space.settings);
      if (!settings.enabled || !settings.enableMemoryInsights) {
        continue;
      }

      try {
        await handler(space);
      } catch (error: any) {
        this.logger.warn(
          `Insights run failed for space ${space.id}: ${error?.message || String(error)}`,
        );
      }
    }
  }

  @Cron('0 7 * * 1')
  async runWeeklySummary() {
    await this.runForSpaces(async (space) => {
      await this.generateSummary(
        space.id,
        space.workspaceId,
        space.name,
        'Weekly',
        7,
        'weekly-summary',
      );
      await this.generateSignals(space.id, space.workspaceId, space.name);
      await this.generateTopicClusters(space.id, space.workspaceId, space.name);
      await this.generateGoalTrends(space.id, space.workspaceId);
    });
  }

  @Cron('0 7 1 * *')
  async runMonthlySummary() {
    await this.runForSpaces(async (space) => {
      await this.generateSummary(
        space.id,
        space.workspaceId,
        space.name,
        'Monthly',
        30,
        'monthly-summary',
      );
      await this.generateTopicClusters(space.id, space.workspaceId, space.name);
      await this.generateGoalTrends(space.id, space.workspaceId);
    });
  }

  @Cron('0 19 * * *')
  async runDailySignals() {
    await this.runForSpaces(async (space) => {
      await this.generateSignals(space.id, space.workspaceId, space.name);
      await this.generateTopicClusters(space.id, space.workspaceId, space.name);
      await this.generateGoalTrends(space.id, space.workspaceId);
    });
  }
}
