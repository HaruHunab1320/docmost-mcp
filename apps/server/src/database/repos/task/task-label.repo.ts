import { Injectable } from '@nestjs/common';
import { InjectKysely } from '../../../lib/kysely/nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@raven-docs/db/types/kysely.types';
import {
  InsertableTaskLabel,
  InsertableTaskLabelAssignment,
  TaskLabel,
} from '../../types/entity.types';
import { dbOrTx } from '../../utils';

@Injectable()
export class TaskLabelRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async listByWorkspace(
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<TaskLabel[]> {
    return dbOrTx(this.db, trx)
      .selectFrom('taskLabels')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .orderBy('name', 'asc')
      .execute();
  }

  async findById(
    labelId: string,
    trx?: KyselyTransaction,
  ): Promise<TaskLabel | undefined> {
    return dbOrTx(this.db, trx)
      .selectFrom('taskLabels')
      .selectAll()
      .where('id', '=', labelId)
      .executeTakeFirst();
  }

  async createLabel(
    data: InsertableTaskLabel,
    trx?: KyselyTransaction,
  ): Promise<TaskLabel> {
    return dbOrTx(this.db, trx)
      .insertInto('taskLabels')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateLabel(
    labelId: string,
    updates: Partial<InsertableTaskLabel>,
    trx?: KyselyTransaction,
  ): Promise<TaskLabel | undefined> {
    return dbOrTx(this.db, trx)
      .updateTable('taskLabels')
      .set({ ...updates, updatedAt: new Date() })
      .where('id', '=', labelId)
      .returningAll()
      .executeTakeFirst();
  }

  async deleteLabel(labelId: string, trx?: KyselyTransaction): Promise<void> {
    await dbOrTx(this.db, trx)
      .deleteFrom('taskLabels')
      .where('id', '=', labelId)
      .execute();
  }

  async assignLabel(
    data: InsertableTaskLabelAssignment,
    trx?: KyselyTransaction,
  ): Promise<void> {
    await dbOrTx(this.db, trx)
      .insertInto('taskLabelAssignments')
      .values(data)
      .onConflict((oc) => oc.columns(['taskId', 'labelId']).doNothing())
      .execute();
  }

  async removeLabel(
    taskId: string,
    labelId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    await dbOrTx(this.db, trx)
      .deleteFrom('taskLabelAssignments')
      .where('taskId', '=', taskId)
      .where('labelId', '=', labelId)
      .execute();
  }
}
