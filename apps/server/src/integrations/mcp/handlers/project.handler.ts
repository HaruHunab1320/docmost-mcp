import { Injectable, Logger } from '@nestjs/common';
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

/**
 * Handler for project-related MCP operations
 */
@Injectable()
export class ProjectHandler {
  private readonly logger = new Logger(ProjectHandler.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly mcpEventService: MCPEventService,
  ) {}

  /**
   * Handles project.get operation
   */
  async getProject(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing project.get operation for user ${userId}`);

    if (!params.projectId) {
      throw createInvalidParamsError('projectId is required');
    }

    try {
      const project = await this.projectService.findById(params.projectId, {
        includeCreator: true,
      });

      if (!project) {
        throw createResourceNotFoundError('Project', params.projectId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        project.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to read this project',
        );
      }

      return project;
    } catch (error: any) {
      this.logger.error(
        `Error getting project: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles project.list operation
   */
  async listProjects(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing project.list operation for user ${userId}`);

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
          'You do not have permission to list projects in this space',
        );
      }

      const page = params.page || 1;
      const limit = params.limit || 20;
      const result = await this.projectService.findBySpaceId(
        params.spaceId,
        { page, limit },
        {
          includeArchived: params.includeArchived,
          includeCreator: true,
          searchTerm: params.searchTerm,
        },
      );

      return {
        projects: result.data,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing projects: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles project.create operation
   */
  async createProject(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing project.create operation for user ${userId}`);

    if (!params.name) {
      throw createInvalidParamsError('name is required');
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
          'You do not have permission to create projects in this space',
        );
      }

      const project = await this.projectService.create(
        userId,
        params.workspaceId,
        {
          name: params.name,
          description: params.description,
          spaceId: params.spaceId,
          icon: params.icon,
          color: params.color,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          endDate: params.endDate ? new Date(params.endDate) : undefined,
        },
      );

      this.mcpEventService.createCreatedEvent(
        MCPResourceType.PROJECT,
        project.id,
        { name: project.name },
        userId,
        project.workspaceId,
        project.spaceId,
      );

      return project;
    } catch (error: any) {
      this.logger.error(
        `Error creating project: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles project.update operation
   */
  async updateProject(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing project.update operation for user ${userId}`);

    if (!params.projectId) {
      throw createInvalidParamsError('projectId is required');
    }

    try {
      const project = await this.projectService.findById(params.projectId);
      if (!project) {
        throw createResourceNotFoundError('Project', params.projectId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        project.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this project',
        );
      }

      const updated = await this.projectService.update(params.projectId, {
        name: params.name,
        description: params.description,
        icon: params.icon,
        color: params.color,
        coverImage: params.coverImage,
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
      });

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.PROJECT,
          updated.id,
          { name: updated.name },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error updating project: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles project.delete operation
   */
  async deleteProject(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing project.delete operation for user ${userId}`);

    if (!params.projectId) {
      throw createInvalidParamsError('projectId is required');
    }

    try {
      const project = await this.projectService.findById(params.projectId);
      if (!project) {
        throw createResourceNotFoundError('Project', params.projectId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        project.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to delete this project',
        );
      }

      await this.projectService.delete(params.projectId);

      this.mcpEventService.createDeletedEvent(
        MCPResourceType.PROJECT,
        project.id,
        { name: project.name },
        userId,
        project.workspaceId,
        project.spaceId,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error deleting project: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles project.archive operation
   */
  async archiveProject(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing project.archive operation for user ${userId}`);

    if (!params.projectId) {
      throw createInvalidParamsError('projectId is required');
    }

    try {
      const project = await this.projectService.findById(params.projectId);
      if (!project) {
        throw createResourceNotFoundError('Project', params.projectId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        project.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to archive this project',
        );
      }

      const isArchived =
        typeof params.isArchived === 'boolean' ? params.isArchived : true;
      const updated = isArchived
        ? await this.projectService.archive(params.projectId)
        : await this.projectService.unarchive(params.projectId);

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.PROJECT,
          updated.id,
          { isArchived: updated.isArchived },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error archiving project: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles project.createPage operation
   */
  async createProjectPage(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing project.createPage operation for user ${userId}`,
    );

    if (!params.projectId) {
      throw createInvalidParamsError('projectId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      const project = await this.projectService.findById(params.projectId);
      if (!project) {
        throw createResourceNotFoundError('Project', params.projectId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        project.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this project',
        );
      }

      const updated = await this.projectService.createProjectPage(
        userId,
        params.workspaceId,
        params.projectId,
      );

      if (updated) {
        this.mcpEventService.createUpdatedEvent(
          MCPResourceType.PROJECT,
          updated.id,
          { homePageId: updated.homePageId },
          userId,
          updated.workspaceId,
          updated.spaceId,
        );
      }

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error creating project page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
