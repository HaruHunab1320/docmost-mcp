import { Injectable, Logger } from '@nestjs/common';
import { GroupService } from '../../../core/group/services/group.service';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import { User } from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import {
  createInvalidParamsError,
  createInternalError,
  createPermissionDeniedError,
  createResourceNotFoundError,
} from '../utils/error.utils';
import WorkspaceAbilityFactory from '../../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../../core/casl/interfaces/workspace-ability.type';
import { UserService } from '../../../core/user/user.service';
import { GroupUserService } from '../../../core/group/services/group-user.service';

/**
 * Handler for group-related MCP operations
 */
@Injectable()
export class GroupHandler {
  private readonly logger = new Logger(GroupHandler.name);

  constructor(
    private readonly groupService: GroupService,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly userService: UserService,
    private readonly groupUserService: GroupUserService,
  ) {}

  /**
   * Handles group.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of groups in the workspace
   */
  async listGroups(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing group.list operation for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the complete user object with role information
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check user has permission to list groups
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to list groups in this workspace',
        );
      }

      // Get optional parameters with defaults
      const limit = params.limit || 50;
      const page = params.page || 1;

      // Create pagination options
      const paginationOptions = new PaginationOptions();
      paginationOptions.limit = limit;
      paginationOptions.page = page;
      paginationOptions.query = params.query || '';

      // Get groups in the workspace
      const groupsResult = await this.groupService.getWorkspaceGroups(
        params.workspaceId,
        paginationOptions,
      );

      return {
        groups: groupsResult.items,
        pagination: {
          limit,
          page,
          hasNextPage: groupsResult.meta?.hasNextPage,
          hasPrevPage: groupsResult.meta?.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing groups: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles group.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The group details
   */
  async getGroup(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing group.get operation for user ${userId}`);

    if (!params.groupId) {
      throw createInvalidParamsError('groupId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the complete user object with role information
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Check user has permission to view the group
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to view this group',
        );
      }

      // Get the group
      const group = await this.groupService.getGroupInfo(
        params.groupId,
        params.workspaceId,
      );

      return group;
    } catch (error: any) {
      this.logger.error(
        `Error getting group: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles group.create operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The created group details
   */
  async createGroup(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing group.create operation for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.name) {
      throw createInvalidParamsError('name is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the requesting user
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check if user has permission to create groups
      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Create, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to create groups in this workspace',
        );
      }

      // Prepare the create group DTO
      const createGroupDto = {
        name: params.name,
        description: params.description,
        userIds: params.userIds || [],
      };

      // Create the group
      const createdGroup = await this.groupService.createGroup(
        authUser,
        params.workspaceId,
        createGroupDto,
      );

      return createdGroup;
    } catch (error: any) {
      this.logger.error(
        `Error creating group: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles group.update operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The updated group details
   */
  async updateGroup(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing group.update operation for user ${userId}`);

    if (!params.groupId) {
      throw createInvalidParamsError('groupId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.name && !params.description) {
      throw createInvalidParamsError(
        'At least one field to update is required',
      );
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the complete user object with role information
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check if user has permission to update groups
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Edit, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to update groups in this workspace',
        );
      }

      // Prepare the update group DTO
      const updateGroupDto = {
        groupId: params.groupId,
        name: params.name,
        description: params.description,
      };

      // Update the group
      const updatedGroup = await this.groupService.updateGroup(
        params.workspaceId,
        updateGroupDto,
      );

      return updatedGroup;
    } catch (error: any) {
      this.logger.error(
        `Error updating group: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles group.delete operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success message
   */
  async deleteGroup(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing group.delete operation for user ${userId}`);

    if (!params.groupId) {
      throw createInvalidParamsError('groupId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the complete user object with role information
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check if user has permission to delete groups
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Delete, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to delete groups in this workspace',
        );
      }

      // Delete the group
      await this.groupService.deleteGroup(params.groupId, params.workspaceId);

      return {
        success: true,
        message: 'Group deleted successfully',
      };
    } catch (error: any) {
      this.logger.error(
        `Error deleting group: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles group.addMember operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success message
   */
  async addGroupMember(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing group.addMember operation for user ${userId}`,
    );

    if (!params.groupId) {
      throw createInvalidParamsError('groupId is required');
    }

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the complete requesting user object with role information
      const requestingUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!requestingUser) {
        throw createPermissionDeniedError(
          'Requesting user not found in the specified workspace',
        );
      }

      // Check if requesting user has permission to manage groups
      const ability = this.workspaceAbility.createForUser(
        requestingUser,
        workspace,
      );
      if (
        ability.cannot(WorkspaceCaslAction.Edit, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to add members to groups in this workspace',
        );
      }

      // Add the users to the group
      await this.groupUserService.addUsersToGroupBatch(
        params.userIds,
        params.groupId,
        params.workspaceId,
      );

      return {
        success: true,
        message: `Successfully added ${params.userIds.length} user(s) to the group`,
        userIds: params.userIds,
      };
    } catch (error: any) {
      this.logger.error(
        `Error adding group members: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles group.removeMember operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success message
   */
  async removeGroupMember(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing group.removeMember operation for user ${userId}`,
    );

    if (!params.groupId) {
      throw createInvalidParamsError('groupId is required');
    }

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the complete requesting user object with role information
      const requestingUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!requestingUser) {
        throw createPermissionDeniedError(
          'Requesting user not found in the specified workspace',
        );
      }

      // Check if requesting user has permission to manage groups
      const ability = this.workspaceAbility.createForUser(
        requestingUser,
        workspace,
      );
      if (
        ability.cannot(WorkspaceCaslAction.Edit, WorkspaceCaslSubject.Group)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to remove members from groups in this workspace',
        );
      }

      // Remove the user from the group
      await this.groupUserService.removeUserFromGroup(
        params.userId,
        params.groupId,
        params.workspaceId,
      );

      return {
        success: true,
        message: 'User removed from the group successfully',
      };
    } catch (error: any) {
      this.logger.error(
        `Error removing group member: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
