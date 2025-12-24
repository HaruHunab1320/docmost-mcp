import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createType('task_bucket')
    .asEnum(['none', 'inbox', 'waiting', 'someday'])
    .execute();

  await db.schema
    .alterTable('tasks')
    .addColumn('bucket', sql`task_bucket`, (col) =>
      col.defaultTo('none').notNull(),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('tasks').dropColumn('bucket').execute();
  await db.schema.dropType('task_bucket').execute();
}
