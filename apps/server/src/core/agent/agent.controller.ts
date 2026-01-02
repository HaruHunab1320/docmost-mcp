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
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@raven-docs/db/types/entity.types';
import { AgentChatDto } from './agent-chat.dto';
import { AgentService } from './agent.service';
import { AgentPlannerService } from './agent-planner.service';
import { AgentPlanDto } from './agent-plan.dto';
import { AgentLoopService } from './agent-loop.service';
import { AgentLoopDto } from './agent-loop.dto';
import { AgentHandoffDto } from './agent-handoff.dto';
import { AgentHandoffService } from './agent-handoff.service';
import { AgentLoopSchedulerService } from './agent-loop-scheduler.service';
import { AgentReviewPromptsService } from './agent-review-prompts.service';
import { AgentReviewPromptsDto } from './agent-review-prompts.dto';
import { AgentSuggestionsDto } from './agent-suggestions.dto';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';

const getWeekKey = (date = new Date()) => {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = firstDay.getDay() || 7;
  const weekStart = new Date(firstDay);
  weekStart.setDate(firstDay.getDate() + (7 - dayOffset));
  const diff =
    date.getTime() -
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      .getTime();
  const weekNumber = Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentPlannerService: AgentPlannerService,
    private readonly agentLoopService: AgentLoopService,
    private readonly agentLoopScheduler: AgentLoopSchedulerService,
    private readonly handoffService: AgentHandoffService,
    private readonly reviewPromptService: AgentReviewPromptsService,
    private readonly spaceAbility: SpaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('chat')
  async chat(
    @Body() dto: AgentChatDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.agentService.chat(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('plan')
  async plan(
    @Body() dto: AgentPlanDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.agentPlannerService.generatePlanForSpaceId(dto.spaceId, {
      id: workspace.id,
      settings: workspace.settings,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('loop/run')
  async runLoop(
    @Body() dto: AgentLoopDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.agentLoopService.runLoop(dto.spaceId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('loop/schedule-run')
  async runSchedule(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.agentLoopScheduler.runManual(workspace.id, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('handoff')
  async createHandoff(
    @Body() dto: AgentHandoffDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const name = dto.name || 'External agent handoff';
    return this.handoffService.createHandoffKey(user.id, workspace.id, name);
  }

  @HttpCode(HttpStatus.OK)
  @Post('review-prompts/list')
  async listReviewPrompts(
    @Body() dto: AgentReviewPromptsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException('No access to space');
    }
    const weekKey = dto.weekKey || getWeekKey(new Date());
    return this.reviewPromptService.listPending({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      weekKey,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('suggestions')
  async getSuggestions(
    @Body() dto: AgentSuggestionsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.agentService.suggestNextActions(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('review-prompts/consume')
  async consumeReviewPrompts(
    @Body() dto: AgentReviewPromptsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException('No access to space');
    }
    const weekKey = dto.weekKey || getWeekKey(new Date());
    return this.reviewPromptService.consumePending({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      weekKey,
    });
  }
}
