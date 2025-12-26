import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { MemgraphService } from '../../integrations/memgraph/memgraph.service';
import { AIService } from '../../integrations/ai/ai.service';
import { v7 as uuid7 } from 'uuid';
import { int as neo4jInt } from 'neo4j-driver';
import { sql } from 'kysely';

export interface MemoryRecord {
  id: string;
  workspaceId: string;
  spaceId?: string | null;
  creatorId?: string | null;
  source?: string | null;
  summary?: string | null;
  content?: any;
  tags?: string[] | null;
  timestamp: Date;
}

interface MemoryQueryFilters {
  workspaceId: string;
  spaceId?: string;
  tags?: string[];
  from?: Date;
  to?: Date;
  limit?: number;
}

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly memgraph: MemgraphService,
    private readonly aiService: AIService,
  ) {}

  private buildContentText(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  private buildSummary(contentText: string, summary?: string) {
    if (summary) return summary;
    if (!contentText) return 'Memory';
    return contentText.length > 160
      ? `${contentText.slice(0, 157)}...`
      : contentText;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async embedText(text: string): Promise<number[]> {
    const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    const result = await this.aiService.embedContent({
      model,
      content: text,
    });
    return result.embedding;
  }

  async ingestMemory(input: {
    workspaceId: string;
    spaceId?: string;
    creatorId?: string;
    source?: string;
    content?: any;
    summary?: string;
    tags?: string[];
    timestamp?: Date;
    entities?: Array<{ id: string; type: string; name: string }>;
  }): Promise<MemoryRecord> {
    const timestamp = input.timestamp || new Date();
    const contentText = this.buildContentText(input.content);
    const summary = this.buildSummary(contentText, input.summary);
    const tags = input.tags || [];
    const memoryId = uuid7();
    const content = input.content ?? null;
    const contentJson =
      content === null || content === undefined
        ? null
        : (sql`${JSON.stringify(content)}::jsonb` as unknown as any);
    const tagsJson = sql`${JSON.stringify(tags)}::jsonb` as unknown as any;

    await this.db
      .insertInto('agentMemories')
      .values({
        id: memoryId,
        workspaceId: input.workspaceId,
        spaceId: input.spaceId || null,
        creatorId: input.creatorId || null,
        source: input.source || null,
        summary,
        content: contentJson,
        tags: tagsJson,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .execute();

    const embeddingInput = summary || contentText;
    const embedding = embeddingInput ? await this.embedText(embeddingInput) : [];

    const session = this.memgraph.getSession();
    try {
      await session.run(
        `
        MERGE (m:Memory {id: $id})
        SET m.workspaceId = $workspaceId,
            m.spaceId = $spaceId,
            m.source = $source,
            m.summary = $summary,
            m.tags = $tags,
            m.timestamp = $timestamp,
            m.timestampMs = $timestampMs,
            m.embedding = $embedding,
            m.embeddingModel = $embeddingModel,
            m.contentRef = $contentRef
        `,
        {
          id: memoryId,
          workspaceId: input.workspaceId,
          spaceId: input.spaceId || null,
          source: input.source || null,
          summary,
          tags,
          timestamp: timestamp.toISOString(),
          timestampMs: timestamp.getTime(),
          embedding,
          embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
          contentRef: memoryId,
        },
      );

      if (input.entities?.length) {
        for (const entity of input.entities) {
          await session.run(
            `
            MERGE (e:Entity {id: $entityId})
            SET e.type = $entityType, e.name = $entityName
            WITH e
            MATCH (m:Memory {id: $memoryId})
            MERGE (m)-[:REFERS_TO]->(e)
            `,
            {
              entityId: entity.id,
              entityType: entity.type,
              entityName: entity.name,
              memoryId,
            },
          );
        }
      }
    } finally {
      await session.close();
    }

    return {
      id: memoryId,
      workspaceId: input.workspaceId,
      spaceId: input.spaceId || null,
      creatorId: input.creatorId || null,
      source: input.source || null,
      summary,
      content,
      tags,
      timestamp,
    };
  }

  private async fetchMemoryContent(ids: string[]) {
    if (!ids.length) return new Map();
    const rows = await this.db
      .selectFrom('agentMemories')
      .select(['id', 'content', 'summary', 'tags', 'source', 'createdAt'])
      .where('id', 'in', ids)
      .execute();

    return new Map(rows.map((row) => [row.id, row]));
  }

  async queryMemories(
    filters: MemoryQueryFilters,
    queryText?: string,
  ): Promise<any[]> {
    const session = this.memgraph.getSession();
    const limit = filters.limit || 20;
    const params: any = {
      workspaceId: filters.workspaceId,
      spaceId: filters.spaceId || null,
      tags: filters.tags || [],
      fromMs: filters.from ? filters.from.getTime() : null,
      toMs: filters.to ? filters.to.getTime() : null,
      fetchLimit: neo4jInt(Math.max(limit * 5, 50)),
    };

    const whereParts = [
      'm.workspaceId = $workspaceId',
      filters.spaceId ? 'm.spaceId = $spaceId' : null,
      filters.tags?.length ? 'ANY(tag IN $tags WHERE tag IN m.tags)' : null,
      filters.from ? 'm.timestampMs >= $fromMs' : null,
      filters.to ? 'm.timestampMs <= $toMs' : null,
    ].filter(Boolean);

    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(' AND ')}`
      : '';

    try {
      const result = await session.run(
        `
        MATCH (m:Memory)
        ${whereClause}
        RETURN m
        ORDER BY m.timestampMs DESC
        LIMIT $fetchLimit
        `,
        params,
      );

      const records = result.records.map((record) => record.get('m').properties);
      const ids = records.map((record) => record.id as string);
      const contentMap = await this.fetchMemoryContent(ids);

      let scored = records.map((record) => {
        const stored = contentMap.get(record.id);
        return {
          id: record.id,
          workspaceId: record.workspaceId,
          spaceId: record.spaceId,
          source: record.source,
          summary: record.summary,
          tags: record.tags || [],
          timestamp: new Date(Number(record.timestampMs)),
          embedding: record.embedding || [],
          content: stored?.content,
        };
      });

      if (queryText) {
        const embedding = await this.embedText(queryText);
        scored = scored
          .map((item) => ({
            ...item,
            score: this.cosineSimilarity(embedding, item.embedding || []),
          }))
          .sort((a, b) => (b.score || 0) - (a.score || 0));
      }

      return scored.slice(0, limit).map((item) => ({
        ...item,
        embedding: undefined,
      }));
    } finally {
      await session.close();
    }
  }

  async getDailyMemories(filters: MemoryQueryFilters, date?: Date) {
    const target = date || new Date();
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return this.queryMemories(
      {
        ...filters,
        from: start,
        to: end,
        limit: filters.limit || 50,
      },
      undefined,
    );
  }

  async listMemoryDays(filters: MemoryQueryFilters) {
    const days = filters.limit || 14;
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - days + 1);
    const session = this.memgraph.getSession();
    const params: any = {
      workspaceId: filters.workspaceId,
      spaceId: filters.spaceId || null,
      fromMs: start.getTime(),
      toMs: end.getTime(),
    };

    const whereParts = [
      'm.workspaceId = $workspaceId',
      filters.spaceId ? 'm.spaceId = $spaceId' : null,
      'm.timestampMs >= $fromMs',
      'm.timestampMs <= $toMs',
    ].filter(Boolean);

    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(' AND ')}`
      : '';

    try {
      const result = await session.run(
        `
        MATCH (m:Memory)
        ${whereClause}
        RETURN m.timestamp AS timestamp
        `,
        params,
      );

      const counts = new Map<string, number>();
      for (const record of result.records) {
        const timestamp = record.get('timestamp') as string | null;
        if (!timestamp) continue;
        const day = timestamp.slice(0, 10);
        if (!day) continue;
        counts.set(day, (counts.get(day) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => (a.day < b.day ? 1 : -1))
        .slice(0, days);
    } finally {
      await session.close();
    }
  }
}
