import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Workspace, User } from '@raven-docs/db/types/entity.types';
import { GoalService } from './goal.service';
import {
  GoalAssignDto,
  GoalCreateDto,
  GoalDeleteDto,
  GoalListDto,
  GoalTaskListDto,
  GoalTasksListDto,
  GoalUpdateDto,
} from './dto/goal.dto';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalController {
  constructor(
    private readonly goalService: GoalService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('list')
  async list(
    @Body() dto: GoalListDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }

    return this.goalService.listGoals(workspace.id, dto.spaceId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async create(
    @Body() dto: GoalCreateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }

    return this.goalService.createGoal({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      name: dto.name,
      horizon: dto.horizon,
      description: dto.description,
      keywords: dto.keywords,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async update(
    @Body() dto: GoalUpdateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }

    return this.goalService.updateGoal({
      goalId: dto.goalId,
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      name: dto.name,
      horizon: dto.horizon,
      description: dto.description,
      keywords: dto.keywords,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async delete(
    @Body() dto: GoalDeleteDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }

    return this.goalService.deleteGoal(workspace.id, dto.goalId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('assign')
  async assign(@Body() dto: GoalAssignDto) {
    return this.goalService.assignGoal(dto.taskId, dto.goalId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('unassign')
  async unassign(@Body() dto: GoalAssignDto) {
    return this.goalService.unassignGoal(dto.taskId, dto.goalId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('by-task')
  async listByTask(
    @Body() dto: GoalTaskListDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }

    return this.goalService.listGoalsForTask(dto.taskId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('by-tasks')
  async listByTasks(
    @Body() dto: GoalTasksListDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException();
    }

    return this.goalService.listGoalsForTasks(dto.taskIds, workspace.id);
  }
}
