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
import { User, Workspace } from '@docmost/db/types/entity.types';
import {
  MemoryDailyDto,
  MemoryDaysDto,
  MemoryIngestDto,
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
}
