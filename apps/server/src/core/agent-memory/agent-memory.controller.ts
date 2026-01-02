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
import {
  MemoryDailyDto,
  MemoryDaysDto,
  MemoryEntityDto,
  MemoryEntityDetailsDto,
  MemoryGraphDto,
  MemoryIngestDto,
  MemoryLinksDto,
  MemoryQueryDto,
} from './dto/memory.dto';
import { AgentMemoryService } from './agent-memory.service';

@UseGuards(JwtAuthGuard)
@Controller('memory')
export class AgentMemoryController {
  constructor(private readonly memoryService: AgentMemoryService) {}

  @HttpCode(HttpStatus.OK)
  @Post('ingest')
  async ingest(
    @Body() dto: MemoryIngestDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.ingestMemory({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      creatorId: user.id,
      source: dto.source,
      content: dto.content,
      summary: dto.summary,
      tags: dto.tags,
      timestamp: dto.timestamp,
      entities: dto.entities,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('query')
  async query(
    @Body() dto: MemoryQueryDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.queryMemories(
      {
        workspaceId: workspace.id,
        spaceId: dto.spaceId,
        tags: dto.tags,
        sources: dto.sources,
        from: dto.from,
        to: dto.to,
        limit: dto.limit,
      },
      dto.query,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('daily')
  async daily(
    @Body() dto: MemoryDailyDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.getDailyMemories(
      {
        workspaceId: workspace.id,
        spaceId: dto.spaceId,
        limit: dto.limit,
      },
      dto.date,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('days')
  async days(
    @Body() dto: MemoryDaysDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.listMemoryDays({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      limit: dto.days,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('graph')
  async graph(
    @Body() dto: MemoryGraphDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.getMemoryGraph({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      tags: dto.tags,
      sources: dto.sources,
      from: dto.from,
      to: dto.to,
      maxNodes: dto.maxNodes,
      maxEdges: dto.maxEdges,
      minWeight: dto.minWeight,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('entity')
  async entity(
    @Body() dto: MemoryEntityDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.getEntityMemories({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      entityId: dto.entityId,
      limit: dto.limit,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('entity-details')
  async entityDetails(
    @Body() dto: MemoryEntityDetailsDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.getEntityDetails({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      entityId: dto.entityId,
      limit: dto.limit,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('links')
  async links(
    @Body() dto: MemoryLinksDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (dto.workspaceId !== workspace.id) {
      throw new ForbiddenException('Workspace mismatch');
    }

    return this.memoryService.getEntityLinks({
      workspaceId: workspace.id,
      spaceId: dto.spaceId,
      taskIds: dto.taskIds,
      goalIds: dto.goalIds,
      limit: dto.limit,
    });
  }
}
