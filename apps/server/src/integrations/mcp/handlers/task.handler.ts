import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../../../core/project/services/task.service';
import { ProjectService } from '../../../core/project/services/project.service';
import SpaceAbilityFactory from '../../../core/casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../../../core/casl/interfaces/space-ability.type';
import {
  createInvalidParamsError,
  createInternalError,
  createPermissionDeniedError,
  createResourceNotFoundError,
} from '../utils/error.utils';
import { User } from '@raven-docs/db/types/entity.types';
import { MCPEventService } from '../services/mcp-event.service';
import { MCPResourceType } from '../interfaces/mcp-event.interface';
import {
  TaskBucket,
  TaskPriority,
  TaskStatus,
} from '../../../core/project/constants/task-enums';

/**
 * Handler for task-related MCP operations
 */
@Injectable()
export class TaskHandler {
  private readonly logger = new Logger(TaskHandler.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly mcpEventService: MCPEventService,
  ) {}

  /**
   * Handles task.get operation
   */
  async getTask(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.get operation for user ${userId}`);

    if (!params.taskId) {
      throw createInvalidParamsError('taskId is required');
    }

    try {
      const task = await this.taskService.findById(params.taskId, {
        includeCreator: true,
        includeAssignee: true,
        includeProject: true,
        includeParentTask: true,
        includeLabels: true,
      });

      if (!task) {
        throw createResourceNotFoundError('Task', params.taskId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        task.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to read this task',
        );
      }

      return task;
    } catch (error: any) {
      this.logger.error(
        `Error getting task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.list operation
   */
  async listTasks(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.list operation for user ${userId}`);

    if (!params.projectId && !params.spaceId) {
      throw createInvalidParamsError('projectId or spaceId is required');
    }

    try {
      const user = { id: userId } as User;
      const page = params.page || 1;
      const limit = params.limit || 20;

      if (params.projectId) {
        const project = await this.projectService.findById(params.projectId);
        if (!project) {
          throw createResourceNotFoundError('Project', params.projectId);
        }

        const ability = await this.spaceAbility.createForUser(
          user,
          project.spaceId,
        );
        if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw createPermissionDeniedError(
            'You do not have permission to list tasks in this project',
          );
        }

        const result = await this.taskService.findByProjectId(
          params.projectId,
          { page, limit },
          {
            status: params.status as TaskStatus[],
            bucket: params.bucket as TaskBucket[],
            searchTerm: params.searchTerm,
            includeSubtasks: params.includeSubtasks,
            includeCreator: true,
            includeAssignee: true,
            includeLabels: true,
          },
        );

        return {
          tasks: result.data,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
          },
        };
      }

      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to list tasks in this space',
        );
      }

      const result = await this.taskService.findBySpaceId(
        params.spaceId,
        { page, limit },
        {
          status: params.status as TaskStatus[],
          bucket: params.bucket as TaskBucket[],
          searchTerm: params.searchTerm,
          includeCreator: true,
          includeAssignee: true,
          includeLabels: true,
          includeProject: true,
        },
      );

      return {
        tasks: result.data,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing tasks: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.triageSummary operation
   */
  async triageSummary(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.triageSummary for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    try {
      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to read tasks in this space',
        );
      }

      return this.taskService.getDailyTriageSummary(params.spaceId, {
        limit: params.limit,
        workspaceId: params.workspaceId,
      });
    } catch (error: any) {
      this.logger.error(
        `Error getting triage summary: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.create operation
   */
  async createTask(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.create operation for user ${userId}`);

    if (!params.title) {
      throw createInvalidParamsError('title is required');
    }

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to create tasks in this space',
        );
      }

      const task = await this.taskService.create(userId, params.workspaceId, {
        title: params.title,
        description: params.description,
        status: params.status as TaskStatus | undefined,
        priority: params.priority as TaskPriority | undefined,
        bucket: params.bucket as TaskBucket | undefined,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
        projectId: params.projectId,
        parentTaskId: params.parentTaskId,
        pageId: params.pageId,
        assigneeId: params.assigneeId,
        spaceId: params.spaceId,
        estimatedTime: params.estimatedTime,
      });

      this.mcpEventService.createCreatedEvent(
        MCPResourceType.TASK,
        task.id,
        { title: task.title },
        userId,
        task.workspaceId,
        task.spaceId,
      );

      return task;
    } catch (error: any) {
      this.logger.error(
        `Error creating task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.update operation
   */
  async updateTask(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.update operation for user ${userId}`);

    if (!params.taskId) {
      throw createInvalidParamsError('taskId is required');
    }

    try {
      const task = await this.taskService.findById(params.taskId);
      if (!task) {
        throw createResourceNotFoundError('Task', params.taskId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        task.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this task',
        );
      }

      const updated = await this.taskService.update(params.taskId, {
        title: params.title,
        description: params.description,
        status: params.status as TaskStatus | undefined,
        priority: params.priority as TaskPriority | undefined,
        bucket: params.bucket as TaskBucket | undefined,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
        assigneeId:
          params.assigneeId !== undefined ? params.assigneeId : undefined,
        pageId: params.pageId !== undefined ? params.pageId : undefined,
        estimatedTime: params.estimatedTime,
        position: params.position,
      });

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.TASK,
          updated.id,
          { title: updated.title },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error updating task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.delete operation
   */
  async deleteTask(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.delete operation for user ${userId}`);

    if (!params.taskId) {
      throw createInvalidParamsError('taskId is required');
    }

    try {
      const task = await this.taskService.findById(params.taskId);
      if (!task) {
        throw createResourceNotFoundError('Task', params.taskId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        task.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to delete this task',
        );
      }

      await this.taskService.delete(params.taskId);

      this.mcpEventService.createDeletedEvent(
        MCPResourceType.TASK,
        task.id,
        { title: task.title },
        userId,
        task.workspaceId,
        task.spaceId,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error deleting task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.complete operation
   */
  async completeTask(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.complete operation for user ${userId}`);

    if (!params.taskId) {
      throw createInvalidParamsError('taskId is required');
    }

    if (typeof params.isCompleted !== 'boolean') {
      throw createInvalidParamsError('isCompleted must be a boolean');
    }

    try {
      const task = await this.taskService.findById(params.taskId);
      if (!task) {
        throw createResourceNotFoundError('Task', params.taskId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        task.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this task',
        );
      }

      const updated = params.isCompleted
        ? await this.taskService.markCompleted(params.taskId)
        : await this.taskService.markIncomplete(params.taskId);

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.TASK,
          updated.id,
          { isCompleted: updated.isCompleted },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error completing task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.assign operation
   */
  async assignTask(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing task.assign operation for user ${userId}`);

    if (!params.taskId) {
      throw createInvalidParamsError('taskId is required');
    }

    try {
      const task = await this.taskService.findById(params.taskId);
      if (!task) {
        throw createResourceNotFoundError('Task', params.taskId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        task.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this task',
        );
      }

      const updated = await this.taskService.assignTask(
        params.taskId,
        params.assigneeId ?? null,
      );

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.TASK,
          updated.id,
          { assigneeId: updated.assigneeId },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error assigning task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles task.moveToProject operation
   */
  async moveToProject(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing task.moveToProject operation for user ${userId}`,
    );

    if (!params.taskId) {
      throw createInvalidParamsError('taskId is required');
    }

    try {
      const task = await this.taskService.findById(params.taskId);
      if (!task) {
        throw createResourceNotFoundError('Task', params.taskId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        task.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this task',
        );
      }

      const updated = await this.taskService.moveToProject(
        params.taskId,
        params.projectId ?? null,
      );

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.TASK,
          updated.id,
          { projectId: updated.projectId },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error moving task: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
