import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskRepo } from '../../../database/repos/task/task.repo';
import { ProjectRepo } from '../../../database/repos/project/project.repo';
import { SpaceRepo } from '../../../database/repos/space/space.repo';
import { PageRepo } from '../../../database/repos/page/page.repo';
import {
  InsertableTask,
  Task,
  UpdatableTask,
} from '../../../database/types/entity.types';
import { PaginationOptions } from '../../../lib/pagination/pagination-options';
import { Paginated } from '../../../lib/pagination/paginated';
import { TaskBucket, TaskPriority, TaskStatus } from '../constants/task-enums';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepo: TaskRepo,
    private readonly projectRepo: ProjectRepo,
    private readonly spaceRepo: SpaceRepo,
    private readonly pageRepo: PageRepo,
  ) {}

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
  ): Promise<Task | undefined> {
    return this.taskRepo.findById(taskId, options);
  }

  async findByProjectId(
    projectId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      bucket?: TaskBucket[];
      searchTerm?: string;
      includeSubtasks?: boolean;
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeLabels?: boolean;
    },
  ): Promise<Paginated<Task>> {
    console.log('[TaskService] findByProjectId called with:', {
      projectId,
      projectIdType: typeof projectId,
      projectIdLength: projectId?.length,
      pagination,
      options,
    });

    try {
      const result = await this.taskRepo.findByProjectId(
        projectId,
        pagination,
        options,
      );
      console.log('[TaskService] findByProjectId succeeded:', {
        resultDataCount: result?.data?.length,
        pagination: result?.pagination,
      });
      return result;
    } catch (error: any) {
      console.error('[TaskService] findByProjectId error:', {
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        projectId,
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
  ): Promise<Paginated<Task>> {
    return this.taskRepo.findByParentTaskId(parentTaskId, pagination, options);
  }

  async findBySpaceId(
    spaceId: string,
    pagination: PaginationOptions,
    options?: {
      status?: TaskStatus[];
      bucket?: TaskBucket[];
      searchTerm?: string;
      includeCreator?: boolean;
      includeAssignee?: boolean;
      includeProject?: boolean;
      includeLabels?: boolean;
    },
  ): Promise<Paginated<Task>> {
    console.log('[TaskService] findBySpaceId called with:', {
      spaceId,
      spaceIdType: typeof spaceId,
      spaceIdLength: spaceId?.length,
      pagination,
      options,
    });

    try {
      const result = await this.taskRepo.findBySpaceId(
        spaceId,
        pagination,
        options,
      );
      console.log('[TaskService] findBySpaceId succeeded:', {
        resultDataCount: result?.data?.length,
        pagination: result?.pagination,
      });
      return result;
    } catch (error: any) {
      console.error('[TaskService] findBySpaceId error:', {
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        spaceId,
      });
      throw error;
    }
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
  ): Promise<Paginated<Task>> {
    return this.taskRepo.findByAssigneeId(assigneeId, pagination, options);
  }

  async create(
    userId: string,
    workspaceId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      bucket?: TaskBucket;
      dueDate?: Date;
      projectId?: string;
      parentTaskId?: string;
      pageId?: string;
      assigneeId?: string;
      spaceId: string;
      estimatedTime?: number;
    },
  ): Promise<Task> {
    // Check if space exists
    const space = await this.spaceRepo.findById(data.spaceId, workspaceId);
    if (!space) {
      throw new NotFoundException(`Space with id ${data.spaceId} not found`);
    }

    // Verify project if provided
    if (data.projectId) {
      const project = await this.projectRepo.findById(data.projectId);
      if (
        !project ||
        project.workspaceId !== workspaceId ||
        project.spaceId !== data.spaceId
      ) {
        throw new Error(
          'Project not found or does not belong to the workspace/space',
        );
      }
    }

    // Verify parent task if provided
    if (data.parentTaskId) {
      const parentTask = await this.taskRepo.findById(data.parentTaskId);
      if (
        !parentTask ||
        parentTask.workspaceId !== workspaceId ||
        parentTask.spaceId !== data.spaceId
      ) {
        throw new Error(
          'Parent task not found or does not belong to the workspace/space',
        );
      }
    }

    // Verify page if provided
    if (data.pageId) {
      const page = await this.pageRepo.findById(data.pageId);
      if (
        !page ||
        page.workspaceId !== workspaceId ||
        page.spaceId !== data.spaceId
      ) {
        throw new Error(
          'Page not found or does not belong to the workspace/space',
        );
      }
    }

    const taskData: InsertableTask = {
      title: data.title,
      description: data.description,
      status: data.status || TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM,
      bucket: data.bucket || TaskBucket.NONE,
      dueDate: data.dueDate,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      pageId: data.pageId,
      assigneeId: data.assigneeId,
      creatorId: userId,
      spaceId: data.spaceId,
      workspaceId,
      isCompleted: data.status === TaskStatus.DONE,
      completedAt: data.status === TaskStatus.DONE ? new Date() : null,
      estimatedTime: data.estimatedTime,
    };

    return this.taskRepo.create(taskData);
  }

  async update(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      bucket?: TaskBucket;
      dueDate?: Date | null;
      assigneeId?: string | null;
      pageId?: string | null;
      estimatedTime?: number | null;
      position?: string;
    },
  ): Promise<Task | undefined> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return undefined;
    }

    const updateData: UpdatableTask = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.bucket !== undefined && { bucket: data.bucket }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.pageId !== undefined && { pageId: data.pageId }),
      ...(data.estimatedTime !== undefined && {
        estimatedTime: data.estimatedTime,
      }),
      ...(data.position !== undefined && { position: data.position }),
    };

    // Handle status changes specially to manage completion state
    if (data.status && data.status !== task.status) {
      if (data.status === TaskStatus.DONE) {
        return this.taskRepo.markCompleted(taskId);
      } else if (
        task.status === TaskStatus.DONE &&
        [
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_REVIEW,
          TaskStatus.BLOCKED,
        ].includes(data.status)
      ) {
        return this.taskRepo.markIncomplete(taskId);
      } else {
        return this.taskRepo.updateTaskStatus(taskId, data.status);
      }
    }

    return this.taskRepo.update(taskId, updateData);
  }

  async delete(taskId: string): Promise<void> {
    await this.taskRepo.softDelete(taskId);
  }

  async markCompleted(taskId: string): Promise<Task | undefined> {
    return this.taskRepo.markCompleted(taskId);
  }

  async markIncomplete(taskId: string): Promise<Task | undefined> {
    return this.taskRepo.markIncomplete(taskId);
  }

  async assignTask(
    taskId: string,
    assigneeId: string | null,
  ): Promise<Task | undefined> {
    return this.taskRepo.update(taskId, { assigneeId });
  }

  async moveToProject(
    taskId: string,
    projectId: string | null,
  ): Promise<Task | undefined> {
    if (projectId === null) {
      return this.taskRepo.update(taskId, { projectId: null });
    }

    // Verify project exists
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Project and task must be in the same space
    if (project.spaceId !== task.spaceId) {
      throw new Error('Project and task must be in the same space');
    }

    return this.taskRepo.update(taskId, { projectId });
  }
}
