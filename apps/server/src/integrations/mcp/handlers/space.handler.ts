import { Injectable, Logger } from '@nestjs/common';
import { SpaceService } from '../../../core/space/services/space.service';
import { SpaceMemberService } from '../../../core/space/services/space-member.service';
import { User } from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import {
  createInvalidParamsError,
  createInternalError,
  createPermissionDeniedError,
  createResourceNotFoundError,
} from '../utils/error.utils';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import SpaceAbilityFactory from '../../../core/casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../../../core/casl/interfaces/space-ability.type';
import { UserService } from '../../../core/user/user.service';
import { MCPEventService } from '../services/mcp-event.service';
import { MCPResourceType } from '../interfaces/mcp-event.interface';

/**
 * Handler for space-related MCP operations
 */
@Injectable()
export class SpaceHandler {
  private readonly logger = new Logger(SpaceHandler.name);

  constructor(
    private readonly spaceService: SpaceService,
    private readonly spaceMemberService: SpaceMemberService,
    private readonly workspaceService: WorkspaceService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly userService: UserService,
    private readonly mcpEventService: MCPEventService,
  ) {}

  /**
   * Handles space.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of spaces the user has access to
   */
  async listSpaces(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `SpaceHandler.listSpaces called: userId=${userId}, workspaceId=${params.workspaceId}`,
    );

    try {
      // Validate the workspaceId parameter
      if (!params.workspaceId) {
        this.logger.debug('SpaceHandler: Missing workspaceId parameter');
        throw createInvalidParamsError('workspaceId is required');
      }

      // Verify the workspace exists
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Verify the user exists in the workspace
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        this.logger.warn(
          `SpaceHandler: API key references user ${userId} that does not exist in workspace ${params.workspaceId}`,
        );
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      this.logger.debug(
        `SpaceHandler: User ${authUser.email} authorized for workspace ${params.workspaceId}`,
      );

      // Set up pagination parameters with defaults
      const page = params.page || 1;
      const limit = params.limit || 20;
      const query = params.query || '';

      this.logger.debug(
        `SpaceHandler: Pagination parameters: page=${page}, limit=${limit}, query=${query}`,
      );

      // Get the workspace spaces with pagination
      const spacesResult = await this.spaceService.getWorkspaceSpaces(
        params.workspaceId,
        {
          page,
          limit,
          query,
        },
      );

      this.logger.debug(
        `SpaceHandler: Found ${spacesResult.items.length} spaces for workspace ${params.workspaceId}`,
      );

      // Map the spaces to the response format
      return {
        spaces: spacesResult.items.map((space) => ({
          id: space.id,
          name: space.name,
          description: space.description,
          visibility: space.visibility,
          defaultRole: space.defaultRole,
          createdAt: space.createdAt,
          creatorId: space.creatorId,
          logo: space.logo,
          workspaceId: space.workspaceId,
        })),
        pagination: {
          page: spacesResult.meta.page,
          limit: spacesResult.meta.limit,
          hasNextPage: spacesResult.meta.hasNextPage,
          hasPrevPage: spacesResult.meta.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error in listSpaces: ${error.message || 'Unknown error'}`,
        error.stack,
      );
      if (error.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error.message || String(error));
    }
  }

  /**
   * Handles space.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The space details
   */
  async getSpace(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing space.get operation for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the space
      const space = await this.spaceService.getSpaceInfo(
        params.spaceId,
        params.workspaceId,
      );

      if (!space) {
        throw createResourceNotFoundError('Space', params.spaceId);
      }

      return space;
    } catch (error: any) {
      this.logger.error(
        `Error getting space: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.create operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The created space details
   */
  async createSpace(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing space.create operation for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.name) {
      throw createInvalidParamsError('name is required');
    }

    try {
      // Get workspace to verify it exists
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Create a user object with the necessary fields for createSpace
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Create a space with the provided data
      const createSpaceDto = {
        name: params.name,
        slug: params.slug || params.name.toLowerCase().replace(/\s+/g, '-'),
        description: params.description || '',
      };

      // Create the space
      const space = await this.spaceService.createSpace(
        authUser,
        params.workspaceId,
        createSpaceDto,
      );

      // Emit the space.created event
      this.mcpEventService.createCreatedEvent(
        MCPResourceType.SPACE,
        space.id,
        {
          name: space.name,
          slug: space.slug,
          description: space.description,
        },
        userId,
        params.workspaceId,
      );

      return space;
    } catch (error: any) {
      this.logger.error(
        `Error creating space: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.update operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The updated space details
   */
  async updateSpace(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing space.update operation for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    // At least one field to update must be provided
    if (
      !params.name &&
      params.description === undefined &&
      params.slug === undefined
    ) {
      throw createInvalidParamsError(
        'At least one field to update must be provided',
      );
    }

    try {
      // Get the space first to verify it exists
      const space = await this.spaceService.getSpaceInfo(
        params.spaceId,
        params.workspaceId,
      );

      if (!space) {
        throw createResourceNotFoundError('Space', params.spaceId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Settings)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this space',
        );
      }

      // Create a DTO with the fields to update
      const updateSpaceDto = {};

      if (params.name) {
        updateSpaceDto['name'] = params.name;
      }

      if (params.description !== undefined) {
        updateSpaceDto['description'] = params.description;
      }

      if (params.slug !== undefined) {
        updateSpaceDto['slug'] = params.slug;
      }

      // Update the space
      const updatedSpace = await this.spaceService.updateSpace(
        { ...updateSpaceDto, spaceId: params.spaceId },
        params.workspaceId,
      );

      // Emit the space.updated event
      this.mcpEventService.createUpdatedEvent(
        MCPResourceType.SPACE,
        updatedSpace.id,
        {
          name: updatedSpace.name,
          slug: updatedSpace.slug,
          description: updatedSpace.description,
        },
        userId,
        params.workspaceId,
      );

      return updatedSpace;
    } catch (error: any) {
      this.logger.error(
        `Error updating space: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.delete operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success status
   */
  async deleteSpace(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing space.delete operation for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the space first to verify it exists
      const space = await this.spaceService.getSpaceInfo(
        params.spaceId,
        params.workspaceId,
      );

      if (!space) {
        throw createResourceNotFoundError('Space', params.spaceId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Delete, SpaceCaslSubject.Settings)) {
        throw createPermissionDeniedError(
          'You do not have permission to delete this space',
        );
      }

      // Delete the space
      await this.spaceService.deleteSpace(params.spaceId, params.workspaceId);

      // Emit the space.deleted event
      this.mcpEventService.createDeletedEvent(
        MCPResourceType.SPACE,
        params.spaceId,
        {
          name: space.name,
          slug: space.slug,
        },
        userId,
        params.workspaceId,
      );

      return { success: true, message: 'Space deleted successfully' };
    } catch (error: any) {
      this.logger.error(
        `Error deleting space: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.updatePermissions operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success indication
   */
  async updatePermissions(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing space.updatePermissions operation for user ${userId}`,
    );

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.targetId) {
      throw createInvalidParamsError(
        'targetId (userId or groupId) is required',
      );
    }

    if (!params.role) {
      throw createInvalidParamsError('role is required');
    }

    try {
      // Get the user from the database
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check permissions
      const ability = await this.spaceAbility.createForUser(
        authUser,
        params.spaceId,
      );

      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Member)) {
        throw createPermissionDeniedError(
          'You do not have permission to manage members in this space',
        );
      }

      // Create dto for the update operation
      const updateRoleDto: any = {
        spaceId: params.spaceId,
        role: params.role,
      };

      // Check if we're updating a user or group
      if (params.isGroup) {
        updateRoleDto.groupId = params.targetId;
      } else {
        updateRoleDto.userId = params.targetId;
      }

      // Update the member's role
      await this.spaceMemberService.updateSpaceMemberRole(
        updateRoleDto,
        params.workspaceId,
      );

      return {
        success: true,
        message: `Space permissions updated successfully for ${params.isGroup ? 'group' : 'user'} ${params.targetId}`,
      };
    } catch (error: any) {
      this.logger.error(
        `Error updating space permissions: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.members operation
   */
  async listMembers(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing space.members operation for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = await this.spaceAbility.createForUser(
        authUser,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Member)) {
        throw createPermissionDeniedError(
          'You do not have permission to view members in this space',
        );
      }

      return this.spaceMemberService.getSpaceMembers(
        params.spaceId,
        params.workspaceId,
        {
          page: params.page || 1,
          limit: params.limit || 20,
          query: params.query || '',
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Error listing space members: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.membersAdd operation
   */
  async addMembers(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing space.membersAdd operation for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (
      (!params.userIds || params.userIds.length === 0) &&
      (!params.groupIds || params.groupIds.length === 0)
    ) {
      throw createInvalidParamsError('userIds or groupIds is required');
    }

    try {
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = await this.spaceAbility.createForUser(
        authUser,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Member)) {
        throw createPermissionDeniedError(
          'You do not have permission to manage space members',
        );
      }

      await this.spaceMemberService.addMembersToSpaceBatch(
        {
          spaceId: params.spaceId,
          userIds: params.userIds || [],
          groupIds: params.groupIds || [],
          role: params.role,
        },
        authUser,
        params.workspaceId,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error adding space members: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.membersRemove operation
   */
  async removeMember(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing space.membersRemove operation for user ${userId}`,
    );

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.userId && !params.groupId) {
      throw createInvalidParamsError('userId or groupId is required');
    }

    try {
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = await this.spaceAbility.createForUser(
        authUser,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Member)) {
        throw createPermissionDeniedError(
          'You do not have permission to manage space members',
        );
      }

      await this.spaceMemberService.removeMemberFromSpace(
        {
          spaceId: params.spaceId,
          userId: params.userId,
          groupId: params.groupId,
        },
        params.workspaceId,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error removing space member: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles space.changeMemberRole operation
   */
  async changeMemberRole(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing space.changeMemberRole operation for user ${userId}`,
    );

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.role) {
      throw createInvalidParamsError('role is required');
    }

    if (!params.userId && !params.groupId) {
      throw createInvalidParamsError('userId or groupId is required');
    }

    try {
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = await this.spaceAbility.createForUser(
        authUser,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Member)) {
        throw createPermissionDeniedError(
          'You do not have permission to manage space members',
        );
      }

      await this.spaceMemberService.updateSpaceMemberRole(
        {
          spaceId: params.spaceId,
          userId: params.userId,
          groupId: params.groupId,
          role: params.role,
        },
        params.workspaceId,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error changing space member role: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
