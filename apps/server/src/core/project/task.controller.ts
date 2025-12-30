import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskService } from './services/task.service';
import {
  TaskIdDto,
  CreateTaskDto,
  UpdateTaskDto,
  TaskListByProjectDto,
  TaskListBySpaceDto,
  TaskAssignmentDto,
  TaskCompletionDto,
  MoveTaskToProjectDto,
  TaskTriageSummaryDto,
  TaskByPageDto,
} from './dto/task.dto';
import {
  ListTaskLabelsDto,
  CreateTaskLabelDto,
  UpdateTaskLabelDto,
  DeleteTaskLabelDto,
  AssignTaskLabelDto,
  RemoveTaskLabelDto,
} from './dto/task-label.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '../../database/types/entity.types';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import { ProjectService } from './services/project.service';
import { Paginated } from '../../lib/pagination/paginated';
import { Task } from '../../database/types/entity.types';

// Adapter function to transform server pagination format to client format
function adaptPaginationFormat<T>(paginated: Paginated<T>): any {
  return {
    items: paginated.data,
    meta: {
      limit: paginated.pagination.limit,
      page: paginated.pagination.page,
      hasNextPage: paginated.pagination.page < paginated.pagination.totalPages,
      hasPrevPage: paginated.pagination.page > 1,
    },
  };
}

// Empty result adapter
function createEmptyResult(page: number = 1, limit: number = 10): any {
  return {
    items: [],
    meta: {
      limit,
      page,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly projectService: ProjectService,
    private readonly spaceAbility: SpaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('/info')
  async getTask(@Body() dto: TaskIdDto, @AuthUser() user: User) {
    const task = await this.taskService.findById(dto.taskId, {
      includeCreator: true,
      includeAssignee: true,
      includeProject: true,
      includeParentTask: true,
      includeLabels: true,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return task;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/byPage')
  async getTaskByPage(@Body() dto: TaskByPageDto, @AuthUser() user: User) {
    const task = await this.taskService.findByPageId(dto.pageId, {
      includeCreator: true,
      includeAssignee: true,
      includeProject: true,
      includeParentTask: true,
      includeLabels: true,
    });

    if (!task) {
      return null;
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return task;
  }

  @HttpCode(HttpStatus.OK)
  @Post('/listByProject')
  async listTasksByProject(
    @Body() dto: TaskListByProjectDto,
    @AuthUser() user: User,
  ) {
    try {
      console.log('[TaskController] listTasksByProject started:', {
        projectId: dto.projectId,
        hasProjectId: !!dto.projectId,
        projectIdType: typeof dto.projectId,
        projectIdLength: dto.projectId?.length,
        userDetails: { id: user.id, name: user.name },
      });

      if (!dto.projectId || dto.projectId.trim() === '') {
        console.log('[TaskController] Empty projectId, returning empty result');
        return createEmptyResult(dto.page, dto.limit);
      }

      // Try to find the project
      let project;
      try {
        project = await this.projectService.findById(dto.projectId);
        console.log('[TaskController] Project lookup result:', {
          found: !!project,
          projectId: dto.projectId,
        });
      } catch (error: any) {
        console.error('[TaskController] Project lookup failed:', {
          projectId: dto.projectId,
          error: error.message || String(error),
        });
        throw error;
      }

      if (!project) {
        console.log('[TaskController] Project not found:', dto.projectId);
        throw new NotFoundException('Project not found');
      }

      // Check permissions
      try {
        const ability = await this.spaceAbility.createForUser(
          user,
          project.spaceId,
        );
        if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          console.log('[TaskController] Permission denied for user:', user.id);
          throw new ForbiddenException();
        }
      } catch (error: any) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        console.error('[TaskController] Permission check failed:', {
          userId: user.id,
          projectId: dto.projectId,
          error: error.message || String(error),
        });
        throw error;
      }

      // Fetch tasks
      const {
        page,
        limit,
        projectId,
        status,
        bucket,
        searchTerm,
        includeSubtasks,
      } = dto;
      console.log(
        '[TaskController] Calling taskService.findByProjectId with:',
        {
          projectId,
          page,
          limit,
        },
      );

      let result;
      try {
        result = await this.taskService.findByProjectId(
          projectId,
          { page, limit },
          {
            status,
            bucket,
            searchTerm,
            includeSubtasks,
            includeCreator: true,
            includeAssignee: true,
            includeLabels: true,
          },
        );
        console.log('[TaskController] Got result from taskService:', {
          hasResult: !!result,
          dataLength: result?.data?.length,
          paginationInfo: result?.pagination,
        });
      } catch (error: any) {
        console.error('[TaskController] taskService.findByProjectId failed:', {
          projectId,
          error: error.message || String(error),
          stack: error.stack,
        });
        throw error;
      }

      // Transform the pagination format to match client expectations
      console.log('[TaskController] Transforming result format');
      try {
        const transformed = adaptPaginationFormat(result);
        console.log(
          '[TaskController] Successfully transformed result format:',
          {
            itemsLength: transformed?.items?.length,
            meta: transformed?.meta,
          },
        );
        return transformed;
      } catch (error: any) {
        console.error('[TaskController] Failed to transform result format:', {
          error: error.message || String(error),
        });
        throw error;
      }
    } catch (error: any) {
      console.error('[TaskController] Unhandled error in listTasksByProject:', {
        projectId: dto.projectId,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/triageSummary')
  async getDailyTriageSummary(
    @Body() dto: TaskTriageSummaryDto,
    @AuthUser() user: User,
  ) {
    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.taskService.getDailyTriageSummary(dto.spaceId, {
      limit: dto.limit,
      workspaceId: user.workspaceId,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('/listBySpace')
  async listTasksBySpace(
    @Body() dto: TaskListBySpaceDto,
    @AuthUser() user: User,
  ) {
    try {
      console.log('[TaskController] listTasksBySpace started:', {
        spaceId: dto.spaceId,
        hasSpaceId: !!dto.spaceId,
        spaceIdType: typeof dto.spaceId,
        spaceIdLength: dto.spaceId?.length,
        userDetails: { id: user.id, name: user.name },
      });

      if (!dto.spaceId || dto.spaceId.trim() === '') {
        console.log('[TaskController] Empty spaceId, returning empty result');
        return createEmptyResult(dto.page, dto.limit);
      }

      // Check permissions
      try {
        const ability = await this.spaceAbility.createForUser(
          user,
          dto.spaceId,
        );
        if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          console.log('[TaskController] Permission denied for user:', user.id);
          throw new ForbiddenException();
        }
      } catch (error: any) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        console.error('[TaskController] Permission check failed:', {
          userId: user.id,
          spaceId: dto.spaceId,
          error: error.message || String(error),
        });
        throw error;
      }

      // Fetch tasks
      const { page, limit, spaceId, status, bucket, searchTerm } = dto;
      console.log('[TaskController] Calling taskService.findBySpaceId with:', {
        spaceId,
        page,
        limit,
      });

      let result;
      try {
      result = await this.taskService.findBySpaceId(
        spaceId,
        { page, limit },
        {
          status,
          bucket,
          searchTerm,
          includeCreator: true,
          includeAssignee: true,
          includeLabels: true,
          includeProject: true,
        },
      );
        console.log('[TaskController] Got result from taskService:', {
          hasResult: !!result,
          dataLength: result?.data?.length,
          paginationInfo: result?.pagination,
        });
      } catch (error: any) {
        console.error('[TaskController] taskService.findBySpaceId failed:', {
          spaceId,
          error: error.message || String(error),
          stack: error.stack,
        });
        throw error;
      }

      // Transform the pagination format to match client expectations
      console.log('[TaskController] Transforming result format');
      try {
        const transformed = adaptPaginationFormat(result);
        console.log(
          '[TaskController] Successfully transformed result format:',
          {
            itemsLength: transformed?.items?.length,
            meta: transformed?.meta,
          },
        );
        return transformed;
      } catch (error: any) {
        console.error('[TaskController] Failed to transform result format:', {
          error: error.message || String(error),
        });
        throw error;
      }
    } catch (error: any) {
      console.error('[TaskController] Unhandled error in listTasksBySpace:', {
        spaceId: dto.spaceId,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/labels/list')
  async listLabels(
    @Body() dto: ListTaskLabelsDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }
    return this.taskService.listLabels(workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/labels/create')
  async createLabel(
    @Body() dto: CreateTaskLabelDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }
    return this.taskService.createLabel(workspace.id, {
      name: dto.name,
      color: dto.color,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('/labels/update')
  async updateLabel(
    @Body() dto: UpdateTaskLabelDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.updateLabel(workspace.id, dto.labelId, {
      name: dto.name,
      color: dto.color,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('/labels/delete')
  async deleteLabel(
    @Body() dto: DeleteTaskLabelDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.deleteLabel(workspace.id, dto.labelId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/labels/assign')
  async assignLabel(
    @Body() dto: AssignTaskLabelDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.assignLabel(workspace.id, dto.taskId, dto.labelId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/labels/remove')
  async removeLabel(
    @Body() dto: RemoveTaskLabelDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.taskService.removeLabel(workspace.id, dto.taskId, dto.labelId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/create')
  async createTask(
    @Body() dto: CreateTaskDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.taskService.create(user.id, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/update')
  async updateTask(@Body() dto: UpdateTaskDto, @AuthUser() user: User) {
    const task = await this.taskService.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const { taskId, ...updateData } = dto;
    return this.taskService.update(taskId, updateData);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/delete')
  async deleteTask(@Body() dto: TaskIdDto, @AuthUser() user: User) {
    const task = await this.taskService.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    await this.taskService.delete(dto.taskId);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('/assign')
  async assignTask(@Body() dto: TaskAssignmentDto, @AuthUser() user: User) {
    const task = await this.taskService.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.taskService.assignTask(dto.taskId, dto.assigneeId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/complete')
  async completeTask(@Body() dto: TaskCompletionDto, @AuthUser() user: User) {
    const task = await this.taskService.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    if (dto.isCompleted) {
      return this.taskService.markCompleted(dto.taskId);
    } else {
      return this.taskService.markIncomplete(dto.taskId);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/moveToProject')
  async moveTaskToProject(
    @Body() dto: MoveTaskToProjectDto,
    @AuthUser() user: User,
  ) {
    const task = await this.taskService.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const ability = await this.spaceAbility.createForUser(user, task.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.taskService.moveToProject(dto.taskId, dto.projectId);
  }
}
