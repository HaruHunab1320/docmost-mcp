import { Injectable } from '@nestjs/common';
import { InjectKysely } from '../../../lib/kysely/nestjs-kysely';
import { Kysely, Transaction } from 'kysely';
import { DB, TaskStatus } from '../../types/db';
import { InsertableTask, Task, UpdatableTask } from '../../types/entity.types';
import { dbOrTx } from '../../utils';
import { PaginationOptions } from '../../../lib/pagination/pagination-options';
import { Paginated } from '../../../lib/pagination/paginated';
import { paginate } from '../../../lib/pagination/paginate';

@Injectable()
export class TaskRepo {
  constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

  // Helper method to validate UUID
  private isValidUuid(uuid: string | undefined | null): boolean {
    return !!uuid && uuid.trim() !== '';
  }

  // Helper method to create empty paginated result
  private createEmptyPaginatedResult<T>(
    pagination: PaginationOptions,
  ): Paginated<T> {
    return {
      data: [],
      pagination: {
        total: 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: 0,
      },
    };
  }

  private async attachLabelsToTasks(
    tasks: Task[],
    trx?: Transaction<DB>,
  ): Promise<void> {
    if (!tasks.length) {
      return;
    }

    const taskIds = tasks.map((task) => task.id);
    const labels = await dbOrTx(this.db, trx)
      .selectFrom('taskLabelAssignments')
      .innerJoin(
        'taskLabels',
        'taskLabels.id',
        'taskLabelAssignments.labelId',
      )
      .select([
        'taskLabelAssignments.taskId as taskId',
        'taskLabels.id as id',
        'taskLabels.name as name',
        'taskLabels.color as color',
      ])
      .where('taskLabelAssignments.taskId', 'in', taskIds)
      .execute();

    const labelsByTaskId = new Map<
      string,
      { id: string; name: string; color: string }[]
    >();
    for (const label of labels) {
      const existing = labelsByTaskId.get(label.taskId) || [];
      existing.push({
        id: label.id,
        name: label.name,
        color: label.color,
      });
      labelsByTaskId.set(label.taskId, existing);
    }

    tasks.forEach((task) => {
      (task as any).labels = labelsByTaskId.get(task.id) || [];
    });
  }

  async findById(
    taskId: string,
    options?: {
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeProject?: boolean;
      includeParentTask?: boolean;
      includeLabels?: boolean;
      includeWatchers?: boolean;
    },
    trx?: Transaction<DB>,
  ): Promise<Task | undefined> {
    // Validate UUID
    if (!this.isValidUuid(taskId)) {
      return undefined;
    }

    let query = dbOrTx(this.db, trx)
      .selectFrom('tasks')
      .selectAll('tasks')
      .where('tasks.id', '=', taskId)
      .where('tasks.deletedAt', 'is', null);

    if (options?.includeCreator) {
      query = query
        .leftJoin('users as creator', 'creator.id', 'tasks.creatorId')
        .select([
          'creator.id as creator_id',
          'creator.name as creator_name',
          'creator.email as creator_email',
          'creator.avatarUrl as creator_avatar_url',
        ]);
    }

    if (options?.includeAssignee) {
      query = query
        .leftJoin('users as assignee', 'assignee.id', 'tasks.assigneeId')
        .select([
          'assignee.id as assignee_id',
          'assignee.name as assignee_name',
          'assignee.email as assignee_email',
          'assignee.avatarUrl as assignee_avatar_url',
        ]);
    }

    if (options?.includeProject) {
      query = query
        .leftJoin('projects', 'projects.id', 'tasks.projectId')
        .select([
          'projects.id as project_id',
          'projects.name as project_name',
          'projects.icon as project_icon',
          'projects.color as project_color',
        ]);
    }

    if (options?.includeParentTask) {
      query = query
        .leftJoin('tasks as parentTask', 'parentTask.id', 'tasks.parentTaskId')
        .select([
          'parentTask.id as parent_task_id',
          'parentTask.title as parent_task_title',
        ]);
    }

    const task = await query.executeTakeFirst();

    // Additional logic for labels and watchers if needed
    if (task && options?.includeLabels) {
      const labels = await dbOrTx(this.db, trx)
        .selectFrom('taskLabelAssignments')
        .innerJoin(
          'taskLabels',
          'taskLabels.id',
          'taskLabelAssignments.labelId',
        )
        .select(['taskLabels.id', 'taskLabels.name', 'taskLabels.color'])
        .where('taskLabelAssignments.taskId', '=', taskId)
        .execute();

      (task as any).labels = labels;
    }

    if (task && options?.includeWatchers) {
      const watchers = await dbOrTx(this.db, trx)
        .selectFrom('taskWatchers')
        .innerJoin('users', 'users.id', 'taskWatchers.userId')
        .select(['users.id', 'users.name', 'users.email', 'users.avatarUrl'])
        .where('taskWatchers.taskId', '=', taskId)
        .execute();

      (task as any).watchers = watchers;
    }

    return task as Task | undefined;
  }

  async findByProjectId(
    projectId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      bucket?: Array<'none' | 'inbox' | 'waiting' | 'someday'>;
      searchTerm?: string;
      includeSubtasks?: boolean;
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeLabels?: boolean;
    },
    trx?: Transaction<DB>,
  ): Promise<Paginated<Task>> {
    console.log('[TaskRepo] findByProjectId started:', {
      projectId,
      projectIdType: typeof projectId,
      projectIdLength: projectId?.length,
      pagination,
      hasOptions: !!options,
    });

    // Validate UUID
    if (!this.isValidUuid(projectId)) {
      console.log('[TaskRepo] Invalid projectId, returning empty result');
      return this.createEmptyPaginatedResult<Task>(pagination);
    }

    try {
      let query = dbOrTx(this.db, trx)
        .selectFrom('tasks')
        .selectAll('tasks')
        .where('tasks.projectId', '=', projectId)
        .where('tasks.deletedAt', 'is', null);

      if (!options?.includeSubtasks) {
        query = query.where('tasks.parentTaskId', 'is', null);
      }

      if (options?.status && options.status.length > 0) {
        query = query.where('tasks.status', 'in', options.status);
      }

      if (options?.bucket && options.bucket.length > 0) {
        query = query.where('tasks.bucket', 'in', options.bucket);
      }

      if (options?.searchTerm) {
        query = query.where((eb) =>
          eb.or([
            eb('tasks.title', 'ilike', `%${options.searchTerm}%`),
            eb('tasks.description', 'ilike', `%${options.searchTerm}%`),
          ]),
        );
      }

      if (options?.includeCreator) {
        query = query
          .leftJoin('users as creator', 'creator.id', 'tasks.creatorId')
          .select([
            'creator.id as creator_id',
            'creator.name as creator_name',
            'creator.email as creator_email',
            'creator.avatarUrl as creator_avatar_url',
          ]);
      }

      if (options?.includeAssignee) {
        query = query
          .leftJoin('users as assignee', 'assignee.id', 'tasks.assigneeId')
          .select([
            'assignee.id as assignee_id',
            'assignee.name as assignee_name',
            'assignee.email as assignee_email',
            'assignee.avatarUrl as assignee_avatar_url',
          ]);
      }

      // Log the SQL query before executing (for debugging)
      console.log(
        '[TaskRepo] About to execute query for projectId:',
        projectId,
      );

      const result = await paginate(query, pagination);
      if (options?.includeLabels) {
        await this.attachLabelsToTasks(result.data, trx);
      }
      console.log('[TaskRepo] findByProjectId succeeded:', {
        resultCount: result?.data?.length,
        pagination: result?.pagination,
      });

      return result;
    } catch (error: any) {
      console.error('[TaskRepo] findByProjectId error:', {
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        projectId,
        query: error.query || 'No query info',
      });
      throw error;
    }
  }

  async findByParentTaskId(
    parentTaskId: string,
    pagination: PaginationOptions,
    options?: {
      includeCreator?: boolean;
      includeAssignee?: boolean;
    },
    trx?: Transaction<DB>,
  ): Promise<Paginated<Task>> {
    // Validate UUID
    if (!this.isValidUuid(parentTaskId)) {
      return this.createEmptyPaginatedResult<Task>(pagination);
    }

    let query = dbOrTx(this.db, trx)
      .selectFrom('tasks')
      .selectAll('tasks')
      .where('tasks.parentTaskId', '=', parentTaskId)
      .where('tasks.deletedAt', 'is', null);

    if (options?.includeCreator) {
      query = query
        .leftJoin('users as creator', 'creator.id', 'tasks.creatorId')
        .select([
          'creator.id as creator_id',
          'creator.name as creator_name',
          'creator.email as creator_email',
          'creator.avatarUrl as creator_avatar_url',
        ]);
    }

    if (options?.includeAssignee) {
      query = query
        .leftJoin('users as assignee', 'assignee.id', 'tasks.assigneeId')
        .select([
          'assignee.id as assignee_id',
          'assignee.name as assignee_name',
          'assignee.email as assignee_email',
          'assignee.avatarUrl as assignee_avatar_url',
        ]);
    }

    return paginate(query, pagination);
  }

  async findByPageId(
    pageId: string,
    trx?: Transaction<DB>,
  ): Promise<Task[]> {
    if (!this.isValidUuid(pageId)) {
      return [];
    }

    return dbOrTx(this.db, trx)
      .selectFrom('tasks')
      .selectAll()
      .where('tasks.pageId', '=', pageId)
      .where('tasks.deletedAt', 'is', null)
      .execute();
  }

  async findBySpaceId(
    spaceId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      bucket?: Array<'none' | 'inbox' | 'waiting' | 'someday'>;
      searchTerm?: string;
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeProject?: boolean;
      includeLabels?: boolean;
    },
    trx?: Transaction<DB>,
  ): Promise<Paginated<Task>> {
    console.log('[TaskRepo] findBySpaceId started:', {
      spaceId,
      spaceIdType: typeof spaceId,
      spaceIdLength: spaceId?.length,
      pagination,
      hasOptions: !!options,
    });

    // Validate UUID
    if (!this.isValidUuid(spaceId)) {
      console.log('[TaskRepo] Invalid spaceId, returning empty result');
      return this.createEmptyPaginatedResult<Task>(pagination);
    }

    try {
      let query = dbOrTx(this.db, trx)
        .selectFrom('tasks')
        .selectAll('tasks')
        .where('tasks.spaceId', '=', spaceId)
        .where('tasks.deletedAt', 'is', null);

      if (options?.status && options.status.length > 0) {
        query = query.where('tasks.status', 'in', options.status);
      }

      if (options?.bucket && options.bucket.length > 0) {
        query = query.where('tasks.bucket', 'in', options.bucket);
      }

      if (options?.searchTerm) {
        query = query.where((eb) =>
          eb.or([
            eb('tasks.title', 'ilike', `%${options.searchTerm}%`),
            eb('tasks.description', 'ilike', `%${options.searchTerm}%`),
          ]),
        );
      }

      if (options?.includeCreator) {
        query = query
          .leftJoin('users as creator', 'creator.id', 'tasks.creatorId')
          .select([
            'creator.id as creator_id',
            'creator.name as creator_name',
            'creator.email as creator_email',
            'creator.avatarUrl as creator_avatar_url',
          ]);
      }

      if (options?.includeAssignee) {
        query = query
          .leftJoin('users as assignee', 'assignee.id', 'tasks.assigneeId')
          .select([
            'assignee.id as assignee_id',
            'assignee.name as assignee_name',
            'assignee.email as assignee_email',
            'assignee.avatarUrl as assignee_avatar_url',
          ]);
      }

      if (options?.includeProject) {
        query = query
          .leftJoin('projects', 'projects.id', 'tasks.projectId')
          .select([
            'projects.id as project_id',
            'projects.name as project_name',
            'projects.color as project_color',
            'projects.icon as project_icon',
          ]);
      }

      // Log the SQL query before executing (for debugging)
      console.log('[TaskRepo] About to execute query for spaceId:', spaceId);

      const result = await paginate(query, pagination);
      if (options?.includeLabels) {
        await this.attachLabelsToTasks(result.data, trx);
      }
      console.log('[TaskRepo] findBySpaceId succeeded:', {
        resultCount: result?.data?.length,
        pagination: result?.pagination,
      });

      return result;
    } catch (error: any) {
      console.error('[TaskRepo] findBySpaceId error:', {
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        spaceId,
        query: error.query || 'No query info',
      });
      throw error;
    }
  }

  async getDailyTriageSummary(
    spaceId: string,
    options?: {
      limit?: number;
    },
    trx?: Transaction<DB>,
  ): Promise<{
    inbox: Task[];
    dueToday: Task[];
    overdue: Task[];
    counts: {
      inbox: number;
      waiting: number;
      someday: number;
    };
  }> {
    if (!this.isValidUuid(spaceId)) {
      return {
        inbox: [],
        dueToday: [],
        overdue: [],
        counts: { inbox: 0, waiting: 0, someday: 0 },
      };
    }

    const limit = options?.limit ?? 20;
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    const baseQuery = () =>
      dbOrTx(this.db, trx)
        .selectFrom('tasks')
        .selectAll('tasks')
        .where('tasks.spaceId', '=', spaceId)
        .where('tasks.deletedAt', 'is', null)
        .where('tasks.isCompleted', '=', false);

    const baseCountQuery = () =>
      dbOrTx(this.db, trx)
        .selectFrom('tasks')
        .where('tasks.spaceId', '=', spaceId)
        .where('tasks.deletedAt', 'is', null)
        .where('tasks.isCompleted', '=', false);

    const inbox = await baseQuery()
      .where('tasks.projectId', 'is', null)
      .where('tasks.bucket', 'in', ['none', 'inbox'])
      .orderBy('tasks.createdAt', 'desc')
      .limit(limit)
      .execute();

    const dueToday = await baseQuery()
      .where('tasks.dueDate', '>=', startOfDay)
      .where('tasks.dueDate', '<', endOfDay)
      .orderBy('tasks.dueDate', 'asc')
      .limit(limit)
      .execute();

    const overdue = await baseQuery()
      .where('tasks.dueDate', '<', startOfDay)
      .orderBy('tasks.dueDate', 'asc')
      .limit(limit)
      .execute();

    const inboxCountResult = await baseCountQuery()
      .where('tasks.projectId', 'is', null)
      .where('tasks.bucket', 'in', ['none', 'inbox'])
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirst();

    const waitingCountResult = await baseCountQuery()
      .where('tasks.bucket', '=', 'waiting')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirst();

    const somedayCountResult = await baseCountQuery()
      .where('tasks.bucket', '=', 'someday')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirst();

    return {
      inbox,
      dueToday,
      overdue,
      counts: {
        inbox: Number(inboxCountResult?.count || 0),
        waiting: Number(waitingCountResult?.count || 0),
        someday: Number(somedayCountResult?.count || 0),
      },
    };
  }

  async findByAssigneeId(
    assigneeId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      searchTerm?: string;
      includeCreator?: boolean;
      includeProject?: boolean;
      workspaceId?: string;
    },
    trx?: Transaction<DB>,
  ): Promise<Paginated<Task>> {
    // Validate UUID
    if (!this.isValidUuid(assigneeId)) {
      return this.createEmptyPaginatedResult<Task>(pagination);
    }

    let query = dbOrTx(this.db, trx)
      .selectFrom('tasks')
      .selectAll('tasks')
      .where('tasks.assigneeId', '=', assigneeId)
      .where('tasks.deletedAt', 'is', null);

    if (options?.workspaceId) {
      query = query.where('tasks.workspaceId', '=', options.workspaceId);
    }

    if (options?.status && options.status.length > 0) {
      query = query.where('tasks.status', 'in', options.status);
    }

    if (options?.searchTerm) {
      query = query.where((eb) =>
        eb.or([
          eb('tasks.title', 'ilike', `%${options.searchTerm}%`),
          eb('tasks.description', 'ilike', `%${options.searchTerm}%`),
        ]),
      );
    }

    if (options?.includeCreator) {
      query = query
        .leftJoin('users as creator', 'creator.id', 'tasks.creatorId')
        .select([
          'creator.id as creator_id',
          'creator.name as creator_name',
          'creator.email as creator_email',
          'creator.avatarUrl as creator_avatar_url',
        ]);
    }

    if (options?.includeProject) {
      query = query
        .leftJoin('projects', 'projects.id', 'tasks.projectId')
        .select([
          'projects.id as project_id',
          'projects.name as project_name',
          'projects.color as project_color',
          'projects.icon as project_icon',
        ]);
    }

    return paginate(query, pagination);
  }

  async create(taskData: InsertableTask, trx?: Transaction<DB>): Promise<Task> {
    // Validate UUIDs - ensure they aren't empty strings
    const validatedData = {
      ...taskData,
      // Convert empty strings to null for nullable UUID fields
      projectId: this.isValidUuid(taskData.projectId)
        ? taskData.projectId
        : null,
      parentTaskId: this.isValidUuid(taskData.parentTaskId)
        ? taskData.parentTaskId
        : null,
      pageId: this.isValidUuid(taskData.pageId) ? taskData.pageId : null,
      assigneeId: this.isValidUuid(taskData.assigneeId)
        ? taskData.assigneeId
        : null,
    };

    const task = await dbOrTx(this.db, trx)
      .insertInto('tasks')
      .values(validatedData)
      .returningAll()
      .executeTakeFirstOrThrow();

    return task as Task;
  }

  async update(
    taskId: string,
    updateData: UpdatableTask,
    trx?: Transaction<DB>,
  ): Promise<Task | undefined> {
    // Validate UUID
    if (!this.isValidUuid(taskId)) {
      return undefined;
    }

    // Validate UUIDs in update data
    const validatedUpdateData = {
      ...updateData,
      // Convert empty strings to null for nullable UUID fields
      assigneeId:
        updateData.assigneeId !== undefined
          ? this.isValidUuid(updateData.assigneeId)
            ? updateData.assigneeId
            : null
          : undefined,
      pageId:
        updateData.pageId !== undefined
          ? this.isValidUuid(updateData.pageId)
            ? updateData.pageId
            : null
          : undefined,
    };

    const task = await dbOrTx(this.db, trx)
      .updateTable('tasks')
      .set({ ...validatedUpdateData, updatedAt: new Date() })
      .where('id', '=', taskId)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();

    return task as Task | undefined;
  }

  async softDelete(taskId: string, trx?: Transaction<DB>): Promise<void> {
    await dbOrTx(this.db, trx)
      .updateTable('tasks')
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', taskId)
      .where('deletedAt', 'is', null)
      .execute();
  }

  async forceDelete(taskId: string, trx?: Transaction<DB>): Promise<void> {
    await dbOrTx(this.db, trx)
      .deleteFrom('tasks')
      .where('id', '=', taskId)
      .execute();
  }

  async markCompleted(
    taskId: string,
    trx?: Transaction<DB>,
  ): Promise<Task | undefined> {
    const task = await dbOrTx(this.db, trx)
      .updateTable('tasks')
      .set({
        status: 'done',
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where('id', '=', taskId)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();

    return task as Task | undefined;
  }

  async markIncomplete(
    taskId: string,
    trx?: Transaction<DB>,
  ): Promise<Task | undefined> {
    const task = await dbOrTx(this.db, trx)
      .updateTable('tasks')
      .set({
        status: 'todo',
        isCompleted: false,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where('id', '=', taskId)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();

    return task as Task | undefined;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    trx?: Transaction<DB>,
  ): Promise<Task | undefined> {
    const task = await dbOrTx(this.db, trx)
      .updateTable('tasks')
      .set({
        status,
        updatedAt: new Date(),
      })
      .where('id', '=', taskId)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();

    return task as Task | undefined;
  }
}
