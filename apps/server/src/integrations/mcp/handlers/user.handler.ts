import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import { UserService } from '../../../core/user/user.service';
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

/**
 * Handler for user-related MCP operations
 */
@Injectable()
export class UserHandler {
  private readonly logger = new Logger(UserHandler.name);

  constructor(
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  /**
   * Handles user.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of users in the workspace
   */
  async listUsers(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `UserHandler.listUsers called: userId=${userId}, workspaceId=${params.workspaceId}`,
    );

    try {
      if (!params.workspaceId) {
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
          `UserHandler: API key references user ${userId} that does not exist in workspace ${params.workspaceId}`,
        );
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      this.logger.debug(
        `UserHandler: User ${authUser.email} authorized for workspace ${params.workspaceId}`,
      );

      // Set up pagination parameters with defaults
      const page = params.page || 1;
      const limit = params.limit || 20;
      const query = params.query || '';

      // Get users for the workspace with pagination
      const result = await this.userService.getWorkspaceUsers(
        params.workspaceId,
        {
          page,
          limit,
          query,
        },
      );

      // Format the response
      return {
        users: result.items.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          lastActiveAt: user.lastActiveAt,
          createdAt: user.createdAt,
        })),
        pagination: {
          page: result.meta.page,
          limit: result.meta.limit,
          hasNextPage: result.meta.hasNextPage,
          hasPrevPage: result.meta.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error in listUsers: ${error.message || 'Unknown error'}`,
        error.stack,
      );

      if (error.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }

      throw createInternalError(error.message || String(error));
    }
  }

  /**
   * Handles user.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The user details
   */
  async getUser(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing user.get operation for user ${userId}`);

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace to validate it exists
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the user
      const user = await this.userService.findById(
        params.userId,
        params.workspaceId,
      );

      if (!user) {
        throw createResourceNotFoundError('User', params.userId);
      }

      return user;
    } catch (error: any) {
      this.logger.error(
        `Error getting user: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles user.update operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The updated user details
   */
  async updateUser(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing user.update operation for user ${userId}`);

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace to validate it exists
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Check if trying to update self - API key authenticated users can update themselves
      const isUpdatingSelf = userId === params.userId;

      // Initialize vars for authUser and ability
      let authUser = null;
      let ability = null;

      if (!isUpdatingSelf) {
        this.logger.debug(
          `UserHandler: API key user ${userId} is trying to update a different user ${params.userId} - checking permissions`,
        );

        // Get the user who is making the request
        authUser = await this.userService.findById(userId, params.workspaceId);

        if (!authUser) {
          throw createPermissionDeniedError(
            'User not found in the specified workspace. API key user must exist in the database to update other users.',
          );
        }

        // Check if the user has the permission to update users
        ability = this.workspaceAbility.createForUser(authUser, workspace);

        if (
          ability.cannot(WorkspaceCaslAction.Edit, WorkspaceCaslSubject.Member)
        ) {
          throw createPermissionDeniedError(
            'You do not have permission to update this user',
          );
        }
      }

      // Extract update data from params
      const updateUserDto: any = {};

      // Only allow certain fields to be updated
      if (params.name !== undefined) {
        updateUserDto.name = params.name;
      }

      if (params.email !== undefined && isUpdatingSelf) {
        updateUserDto.email = params.email;
      }

      if (params.avatarUrl !== undefined) {
        updateUserDto.avatarUrl = params.avatarUrl;
      }

      if (params.locale !== undefined) {
        updateUserDto.locale = params.locale;
      }

      if (params.fullPageWidth !== undefined) {
        updateUserDto.fullPageWidth = params.fullPageWidth;
      }

      // Handle themeId preference
      if (params.themeId !== undefined) {
        updateUserDto.themeId = params.themeId;
        this.logger.debug(
          `UserHandler: Updating themeId to ${params.themeId} for user ${params.userId}`,
        );
      }

      // Admin users can update user roles
      if (
        params.role !== undefined &&
        ability &&
        ability.can(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        updateUserDto.role = params.role;
      }

      // Only update if there are actually fields to update
      if (Object.keys(updateUserDto).length === 0) {
        throw createInvalidParamsError(
          'No valid fields to update were provided',
        );
      }

      // Update the user
      const updatedUser = await this.userService.update(
        updateUserDto,
        params.userId,
        params.workspaceId,
      );

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        locale: updatedUser.locale,
        settings: updatedUser.settings,
      };
    } catch (error: any) {
      this.logger.error(
        `Error updating user: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
