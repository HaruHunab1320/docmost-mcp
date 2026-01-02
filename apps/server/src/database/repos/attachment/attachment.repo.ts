import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@raven-docs/db/types/kysely.types';
import { dbOrTx } from '@raven-docs/db/utils';
import {
  Attachment,
  InsertableAttachment,
  UpdatableAttachment,
} from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import {
  executeWithPagination,
  PaginationResult,
} from '@raven-docs/db/pagination/pagination';

@Injectable()
export class AttachmentRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findById(
    attachmentId: string,
    opts?: {
      trx?: KyselyTransaction;
    },
  ): Promise<Attachment> {
    const db = dbOrTx(this.db, opts?.trx);

    return db
      .selectFrom('attachments')
      .selectAll()
      .where('id', '=', attachmentId)
      .executeTakeFirst();
  }

  async insertAttachment(
    insertableAttachment: InsertableAttachment,
    trx?: KyselyTransaction,
  ): Promise<Attachment> {
    const db = dbOrTx(this.db, trx);

    return db
      .insertInto('attachments')
      .values(insertableAttachment)
      .returningAll()
      .executeTakeFirst();
  }

  async findBySpaceId(
    spaceId: string,
    opts?: {
      trx?: KyselyTransaction;
    },
  ): Promise<Attachment[]> {
    const db = dbOrTx(this.db, opts?.trx);

    return db
      .selectFrom('attachments')
      .selectAll()
      .where('spaceId', '=', spaceId)
      .execute();
  }

  /**
   * Get paginated attachments
   *
   * @param opts Options for filtering attachments
   * @param pagination Pagination options
   * @returns Paginated list of attachments
   */
  async getAttachmentsPaginated(
    opts: {
      workspaceId: string;
      spaceId?: string;
      pageId?: string;
      type?: string;
    },
    pagination: PaginationOptions,
  ): Promise<PaginationResult<Attachment>> {
    const { workspaceId, spaceId, pageId, type } = opts;

    let query = this.db
      .selectFrom('attachments')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null);

    if (spaceId) {
      query = query.where('spaceId', '=', spaceId);
    }

    if (pageId) {
      query = query.where('pageId', '=', pageId);
    }

    if (type) {
      query = query.where('type', '=', type);
    }

    if (pagination.query) {
      query = query.where((eb) =>
        eb.or([
          eb('fileName', 'ilike', `%${pagination.query}%`),
          eb('fileExt', 'ilike', `%${pagination.query}%`),
          eb('mimeType', 'ilike', `%${pagination.query}%`),
        ]),
      );
    }

    // Order by most recently created first
    query = query.orderBy('createdAt', 'desc');

    return executeWithPagination(query, {
      page: pagination.page,
      perPage: pagination.limit,
    });
  }

  updateAttachmentsByPageId(
    updatableAttachment: UpdatableAttachment,
    pageIds: string[],
    trx?: KyselyTransaction,
  ) {
    return dbOrTx(this.db, trx)
      .updateTable('attachments')
      .set(updatableAttachment)
      .where('pageId', 'in', pageIds)
      .executeTakeFirst();
  }

  async updateAttachment(
    updatableAttachment: UpdatableAttachment,
    attachmentId: string,
  ): Promise<Attachment> {
    return await this.db
      .updateTable('attachments')
      .set(updatableAttachment)
      .where('id', '=', attachmentId)
      .returningAll()
      .executeTakeFirst();
  }

  async deleteAttachmentById(attachmentId: string): Promise<void> {
    await this.db
      .deleteFrom('attachments')
      .where('id', '=', attachmentId)
      .executeTakeFirst();
  }

  async deleteAttachmentByFilePath(attachmentFilePath: string): Promise<void> {
    await this.db
      .deleteFrom('attachments')
      .where('filePath', '=', attachmentFilePath)
      .executeTakeFirst();
  }
}
