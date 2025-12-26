import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../../core/user/user.service';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import { AgentMemoryService } from '../../../core/agent-memory/agent-memory.service';
import {
  createInternalError,
  createInvalidParamsError,
  createPermissionDeniedError,
  createResourceNotFoundError,
} from '../utils/error.utils';

@Injectable()
export class MemoryHandler {
  private readonly logger = new Logger(MemoryHandler.name);

  constructor(
    private readonly memoryService: AgentMemoryService,
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  private async assertWorkspaceAccess(workspaceId: string, userId: string) {
    if (!workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    const workspace = await this.workspaceService.findById(workspaceId);
    if (!workspace) {
      throw createResourceNotFoundError('Workspace', workspaceId);
    }

    const user = await this.userService.findById(userId, workspaceId);
    if (!user) {
      throw createPermissionDeniedError(
        'User not found in the specified workspace',
      );
    }

    return workspace;
  }

  async ingest(params: any, userId: string) {
    this.logger.debug(`MemoryHandler.ingest called for user ${userId}`);
    try {
      await this.assertWorkspaceAccess(params.workspaceId, userId);

      if (!params.source) {
        throw createInvalidParamsError('source is required');
      }

      return await this.memoryService.ingestMemory({
        workspaceId: params.workspaceId,
        spaceId: params.spaceId,
        creatorId: userId,
        source: params.source,
        content: params.content,
        summary: params.summary,
        tags: params.tags,
        timestamp: params.timestamp ? new Date(params.timestamp) : undefined,
        entities: params.entities,
      });
    } catch (error: any) {
      this.logger.error(
        `Error in memory.ingest: ${error.message || 'Unknown error'}`,
        error.stack,
      );

      if (error.code && typeof error.code === 'number') {
        throw error;
      }

      throw createInternalError(error.message || String(error));
    }
  }

  async query(params: any, userId: string) {
    this.logger.debug(`MemoryHandler.query called for user ${userId}`);
    try {
      await this.assertWorkspaceAccess(params.workspaceId, userId);

      return await this.memoryService.queryMemories(
        {
          workspaceId: params.workspaceId,
          spaceId: params.spaceId,
          tags: params.tags,
          from: params.from ? new Date(params.from) : undefined,
          to: params.to ? new Date(params.to) : undefined,
          limit: params.limit,
        },
        params.query,
      );
    } catch (error: any) {
      this.logger.error(
        `Error in memory.query: ${error.message || 'Unknown error'}`,
        error.stack,
      );

      if (error.code && typeof error.code === 'number') {
        throw error;
      }

      throw createInternalError(error.message || String(error));
    }
  }

  async daily(params: any, userId: string) {
    this.logger.debug(`MemoryHandler.daily called for user ${userId}`);
    try {
      await this.assertWorkspaceAccess(params.workspaceId, userId);

      return await this.memoryService.getDailyMemories(
        {
          workspaceId: params.workspaceId,
          spaceId: params.spaceId,
          limit: params.limit,
        },
        params.date ? new Date(params.date) : undefined,
      );
    } catch (error: any) {
      this.logger.error(
        `Error in memory.daily: ${error.message || 'Unknown error'}`,
        error.stack,
      );

      if (error.code && typeof error.code === 'number') {
        throw error;
      }

      throw createInternalError(error.message || String(error));
    }
  }

  async days(params: any, userId: string) {
    this.logger.debug(`MemoryHandler.days called for user ${userId}`);
    try {
      await this.assertWorkspaceAccess(params.workspaceId, userId);

      return await this.memoryService.listMemoryDays({
        workspaceId: params.workspaceId,
        spaceId: params.spaceId,
        limit: params.days || params.limit,
      });
    } catch (error: any) {
      this.logger.error(
        `Error in memory.days: ${error.message || 'Unknown error'}`,
        error.stack,
      );

      if (error.code && typeof error.code === 'number') {
        throw error;
      }

      throw createInternalError(error.message || String(error));
    }
  }
}
