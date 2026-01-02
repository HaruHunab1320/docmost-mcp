import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';

export type ReviewPromptRecord = {
  id: string;
  question: string;
  status: string;
  weekKey: string;
  createdAt: Date;
  source?: string | null;
  metadata?: any;
};

@Injectable()
export class AgentReviewPromptsService {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async createPrompts(input: {
    workspaceId: string;
    spaceId: string;
    weekKey: string;
    questions: string[];
    source?: string;
    metadata?: Record<string, any>;
  }) {
    const questions = input.questions
      .map((question) => question.trim())
      .filter(Boolean);

    if (!questions.length) {
      return [];
    }

    await this.db
      .insertInto('agentReviewPrompts')
      .values(
        questions.map((question) => ({
          workspaceId: input.workspaceId,
          spaceId: input.spaceId,
          weekKey: input.weekKey,
          question,
          status: 'pending',
          source: input.source || null,
          metadata: input.metadata || null,
        })),
      )
      .onConflict((oc) =>
        oc
          .columns(['spaceId', 'weekKey', 'question'])
          .doNothing(),
      )
      .execute();

    return questions;
  }

  async listPending(input: {
    workspaceId: string;
    spaceId: string;
    weekKey: string;
  }): Promise<ReviewPromptRecord[]> {
    return this.db
      .selectFrom('agentReviewPrompts')
      .select([
        'id',
        'question',
        'status',
        'weekKey',
        'createdAt',
        'source',
        'metadata',
      ])
      .where('workspaceId', '=', input.workspaceId)
      .where('spaceId', '=', input.spaceId)
      .where('weekKey', '=', input.weekKey)
      .where('status', '=', 'pending')
      .orderBy('createdAt', 'asc')
      .execute();
  }

  async consumePending(input: {
    workspaceId: string;
    spaceId: string;
    weekKey: string;
  }): Promise<ReviewPromptRecord[]> {
    const prompts = await this.listPending(input);
    if (!prompts.length) {
      return [];
    }

    const ids = prompts.map((prompt) => prompt.id);
    await this.db
      .updateTable('agentReviewPrompts')
      .set({
        status: 'consumed',
        resolvedAt: new Date(),
      })
      .where('id', 'in', ids)
      .execute();

    return prompts;
  }
}
