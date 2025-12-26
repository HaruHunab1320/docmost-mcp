import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { AgentChatDto } from './agent-chat.dto';
import { AgentService } from './agent.service';
import { AgentPlannerService } from './agent-planner.service';
import { AgentPlanDto } from './agent-plan.dto';
import { AgentLoopService } from './agent-loop.service';
import { AgentLoopDto } from './agent-loop.dto';
import { AgentHandoffDto } from './agent-handoff.dto';
import { AgentHandoffService } from './agent-handoff.service';
import { AgentLoopSchedulerService } from './agent-loop-scheduler.service';

@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentPlannerService: AgentPlannerService,
    private readonly agentLoopService: AgentLoopService,
    private readonly agentLoopScheduler: AgentLoopSchedulerService,
    private readonly handoffService: AgentHandoffService,
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
}
