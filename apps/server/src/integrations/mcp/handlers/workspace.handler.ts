import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import { User } from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import {
  createInvalidParamsError,
  createInternalError,
  createPermissionDeniedError,
  createResourceNotFoundError,
  createMethodNotFoundError,
} from '../utils/error.utils';
import WorkspaceAbilityFactory from '../../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../../core/casl/interfaces/workspace-ability.type';
import { UserService } from '../../../core/user/user.service';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { WorkspaceInvitationService } from '../../../core/workspace/services/workspace-invitation.service';
import { SpaceRole, UserRole } from '../../../common/helpers/types/permission';
import { MCPEventService } from '../services/mcp-event.service';
import { MCPResourceType } from '../interfaces/mcp-event.interface';
import { EnvironmentService } from '../../environment/environment.service';

/**
 * Handler for workspace-related MCP operations
 */
@Injectable()
export class WorkspaceHandler {
  private readonly logger = new Logger(WorkspaceHandler.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly userService: UserService,
    private readonly workspaceInvitationService: WorkspaceInvitationService,
    private readonly mcpEventService: MCPEventService,
    @InjectKysely() private readonly db: KyselyDB,
    private readonly environmentService: EnvironmentService,
  ) {}

  /**
   * Handles workspace.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The workspace details
   */
  async getWorkspace(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `WorkspaceHandler.getWorkspace called: userId=${userId}, workspaceId=${params.workspaceId}`,
    );

    try {
      if (!params.workspaceId) {
        throw createInvalidParamsError('workspaceId is required');
      }

      // Get workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        this.logger.debug(`Workspace not found: ${params.workspaceId}`);
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Verify the user exists in the workspace
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        this.logger.warn(
          `WorkspaceHandler: API key references user ${userId} that does not exist in workspace ${params.workspaceId}`,
        );
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      this.logger.debug(
        `WorkspaceHandler: User ${authUser.email} authorized for workspace ${params.workspaceId}`,
      );

      this.logger.debug(`Workspace found: ${workspace.name || workspace.id}`);

      // Convert workspace to response format
      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        status: workspace.status,
        logo: workspace.logo,
        hostname: workspace.hostname,
        customDomain: workspace.customDomain,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        defaultSpaceId: workspace.defaultSpaceId,
        trialEndAt: workspace.trialEndAt,
        settings: workspace.settings,
        billingEmail: workspace.billingEmail,
        userRole: authUser.role || 'owner', // Use the actual user role when available
      };
    } catch (error: any) {
      this.logger.error(
        `Error in getWorkspace: ${error.message || 'Unknown error'}`,
        error.stack,
      );

      if (error.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }

      throw createInternalError(error.message || String(error));
    }
  }

  /**
   * Handles workspace.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of workspaces the user has access to
   */
  async listWorkspaces(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.list operation for user ${userId}`);

    try {
      // Get the workspaces the user is a member of directly from the database
      // In most cases, this will be a single workspace
      const userWorkspaces = await this.db
        .selectFrom('users')
        .innerJoin('workspaces', 'users.workspaceId', 'workspaces.id')
        .select([
          'workspaces.id',
          'workspaces.name',
          'workspaces.description',
          'workspaces.hostname',
          'workspaces.logo',
          'workspaces.createdAt',
          'workspaces.updatedAt',
        ])
        .where('users.id', '=', userId)
        .where('users.deletedAt', 'is', null)
        .execute();

      return {
        workspaces: userWorkspaces,
        pagination: {
          limit: userWorkspaces.length,
          page: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing workspaces: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.update operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The updated workspace details
   */
  async updateWorkspace(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing workspace.update operation for user ${userId}`,
    );

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the workspace first to check if it exists
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the user to check permissions
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );

      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check if user has permission to update workspace settings
      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(
          WorkspaceCaslAction.Manage,
          WorkspaceCaslSubject.Settings,
        )
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to update workspace settings',
        );
      }

      // Create update DTO from params, removing workspaceId
      const { workspaceId, ...updateWorkspaceDto } = params;

      // Update the workspace
      const updatedWorkspace = await this.workspaceService.update(
        workspaceId,
        updateWorkspaceDto,
      );

      // Publish event for workspace update
      this.logger.debug(
        `Publishing event for updated workspace ${workspaceId}`,
      );
      this.mcpEventService.createUpdatedEvent(
        MCPResourceType.WORKSPACE,
        workspaceId,
        {
          name: updatedWorkspace.name,
          // Include only modified fields in the event data
          ...(updateWorkspaceDto.hostname && {
            hostname: updatedWorkspace.hostname,
          }),
          ...(updateWorkspaceDto.description && {
            description: updatedWorkspace.description,
          }),
        },
        userId,
        workspaceId,
      );

      return updatedWorkspace;
    } catch (error: any) {
      this.logger.error(
        `Error updating workspace: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.members operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Workspace members
   */
  async listMembers(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.members for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to view workspace members',
        );
      }

      return this.workspaceService.getWorkspaceUsers(params.workspaceId, {
        page: params.page || 1,
        limit: params.limit || 20,
        query: params.query || '',
      });
    } catch (error: any) {
      this.logger.error(
        `Error listing workspace members: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.changeMemberRole operation
   */
  async changeMemberRole(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing workspace.changeMemberRole for user ${userId}`,
    );

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    if (!params.role) {
      throw createInvalidParamsError('role is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to manage workspace members',
        );
      }

      return this.workspaceService.updateWorkspaceUserRole(
        authUser,
        {
          userId: params.userId,
          role: params.role,
        },
        params.workspaceId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error changing member role: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.deleteMember operation
   */
  async deleteMember(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.deleteMember for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to manage workspace members',
        );
      }

      await this.workspaceService.deleteUser(
        authUser,
        params.userId,
        params.workspaceId,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.error(
        `Error deleting workspace member: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.invites operation
   */
  async listInvites(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.invites for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Read, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to view invitations',
        );
      }

      return this.workspaceInvitationService.getInvitations(
        params.workspaceId,
        {
          page: params.page || 1,
          limit: params.limit || 20,
          query: params.query || '',
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Error listing invitations: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.inviteInfo operation
   */
  async inviteInfo(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.inviteInfo for user ${userId}`);

    if (!params.invitationId) {
      throw createInvalidParamsError('invitationId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      return this.workspaceInvitationService.getInvitationById(
        params.invitationId,
        params.workspaceId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error getting invitation info: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.inviteCreate operation
   */
  async inviteCreate(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.inviteCreate for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.emails || params.emails.length === 0) {
      throw createInvalidParamsError('emails is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to invite members',
        );
      }

      return this.workspaceInvitationService.createInvitation(
        {
          emails: Array.isArray(params.emails) ? params.emails : [params.emails],
          role: params.role,
          groupIds: params.groupIds || [],
        },
        workspace,
        authUser,
      );
    } catch (error: any) {
      this.logger.error(
        `Error creating invitation: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.inviteResend operation
   */
  async inviteResend(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.inviteResend for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.invitationId) {
      throw createInvalidParamsError('invitationId is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to manage invitations',
        );
      }

      return this.workspaceInvitationService.resendInvitation(
        params.invitationId,
        workspace,
      );
    } catch (error: any) {
      this.logger.error(
        `Error resending invitation: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.inviteRevoke operation
   */
  async inviteRevoke(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.inviteRevoke for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.invitationId) {
      throw createInvalidParamsError('invitationId is required');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to manage invitations',
        );
      }

      return this.workspaceInvitationService.revokeInvitation(
        params.invitationId,
        params.workspaceId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error revoking invitation: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.inviteLink operation
   */
  async inviteLink(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.inviteLink for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.invitationId) {
      throw createInvalidParamsError('invitationId is required');
    }

    if (this.environmentService.isCloud()) {
      throw createPermissionDeniedError('Invite links are disabled in cloud');
    }

    try {
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to manage invitations',
        );
      }

      const inviteLink =
        await this.workspaceInvitationService.getInvitationLinkById(
          params.invitationId,
          workspace,
        );

      return { inviteLink };
    } catch (error: any) {
      this.logger.error(
        `Error getting invite link: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.checkHostname operation
   */
  async checkHostname(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing workspace.checkHostname for user ${userId}`);

    if (!params.hostname) {
      throw createInvalidParamsError('hostname is required');
    }

    try {
      return this.workspaceService.checkHostname(params.hostname);
    } catch (error: any) {
      this.logger.error(
        `Error checking hostname: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.create operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The created workspace details
   */
  async createWorkspace(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing workspace.create operation for user ${userId}`,
    );

    if (!params.name) {
      throw createInvalidParamsError('name is required');
    }

    try {
      // Get the current user's workspace ID to retrieve the user
      const userWithWorkspace = await this.db
        .selectFrom('users')
        .select(['workspaceId'])
        .where('id', '=', userId)
        .executeTakeFirst();

      if (!userWithWorkspace) {
        throw createResourceNotFoundError('User', userId);
      }

      // Get the complete user object with the proper type
      const user = await this.userService.findById(
        userId,
        userWithWorkspace.workspaceId,
      );

      if (!user) {
        throw createResourceNotFoundError('User', userId);
      }

      // Only owners or admins can create workspaces
      if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
        throw createPermissionDeniedError(
          'Only owners or admins can create workspaces',
        );
      }

      // Create workspace dto from params
      const createWorkspaceDto = {
        name: params.name,
        description: params.description,
        hostname: params.hostname,
      };

      // Create the workspace
      const workspace = await this.workspaceService.create(
        user,
        createWorkspaceDto,
      );

      // Publish event for workspace creation
      this.logger.debug(
        `Publishing event for created workspace ${workspace.id}`,
      );
      this.mcpEventService.createCreatedEvent(
        MCPResourceType.WORKSPACE,
        workspace.id,
        {
          name: workspace.name,
          description: workspace.description,
          hostname: workspace.hostname,
        },
        userId,
        workspace.id,
      );

      return workspace;
    } catch (error: any) {
      this.logger.error(
        `Error creating workspace: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.delete operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success indication
   */
  async deleteWorkspace(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing workspace.delete operation for user ${userId}`,
    );

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      // Get the current user's workspace ID to retrieve the user
      const userWithWorkspace = await this.db
        .selectFrom('users')
        .select(['workspaceId'])
        .where('id', '=', userId)
        .executeTakeFirst();

      if (!userWithWorkspace) {
        throw createResourceNotFoundError('User', userId);
      }

      // Get the complete user object with the proper type
      const user = await this.userService.findById(
        userId,
        userWithWorkspace.workspaceId,
      );

      if (!user) {
        throw createResourceNotFoundError('User', userId);
      }

      // Only owners or admins can delete workspaces
      if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
        throw createPermissionDeniedError(
          'Only owners or admins can delete workspaces',
        );
      }

      // Check if the workspace exists
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Delete the workspace
      await this.workspaceService.deleteWorkspace(params.workspaceId);

      return { success: true, message: 'Workspace deleted successfully' };
    } catch (error: any) {
      this.logger.error(
        `Error deleting workspace: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.addMember operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Result of the operation
   */
  async addMember(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing workspace.addMember operation for user ${userId}`,
    );

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.email) {
      throw createInvalidParamsError('email is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the user to check permissions
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check if user has permission to manage workspace members
      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to add members to this workspace',
        );
      }

      // Create an invitation for the user
      const inviteUserDto = {
        emails: Array.isArray(params.email) ? params.email : [params.email],
        role: params.role || 'MEMBER',
        groupIds: params.groupIds || [],
      };

      // Create the invitation
      await this.workspaceInvitationService.createInvitation(
        inviteUserDto,
        workspace,
        authUser,
      );

      return {
        success: true,
        message: 'Invitation sent successfully',
        detail: `An invitation has been sent to ${Array.isArray(params.email) ? params.email.join(', ') : params.email}`,
      };
    } catch (error: any) {
      this.logger.error(
        `Error adding member to workspace: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles workspace.removeMember operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Result of the operation
   */
  async removeMember(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing workspace.removeMember operation for user ${userId}`,
    );

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.userId) {
      throw createInvalidParamsError('userId is required');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the requesting user to check permissions
      const authUser = await this.userService.findById(
        userId,
        params.workspaceId,
      );
      if (!authUser) {
        throw createPermissionDeniedError(
          'User not found in the specified workspace',
        );
      }

      // Check if user has permission to manage workspace members
      const ability = this.workspaceAbility.createForUser(authUser, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Member)
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to remove members from this workspace',
        );
      }

      // Delete the user from the workspace
      await this.workspaceService.deleteUser(
        authUser,
        params.userId,
        params.workspaceId,
      );

      return {
        success: true,
        message: 'Member removed successfully',
      };
    } catch (error: any) {
      this.logger.error(
        `Error removing member from workspace: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  private async handleWorkspaceRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    this.logger.debug(
      `WorkspaceHandler: handleWorkspaceRequest operation=${operation}`,
    );
    try {
      switch (operation) {
        case 'get':
          this.logger.debug(`WorkspaceHandler: Calling getWorkspace`);
          return await this.getWorkspace(params, userId);
        case 'list':
          return await this.listWorkspaces(params, userId);
        case 'update':
          return await this.updateWorkspace(params, userId);
        case 'create':
          return await this.createWorkspace(params, userId);
        case 'delete':
          return await this.deleteWorkspace(params, userId);
        case 'addMember':
          return await this.addMember(params, userId);
        case 'removeMember':
          return await this.removeMember(params, userId);
        case 'members':
          return await this.listMembers(params, userId);
        case 'changeMemberRole':
          return await this.changeMemberRole(params, userId);
        case 'deleteMember':
          return await this.deleteMember(params, userId);
        case 'invites':
          return await this.listInvites(params, userId);
        case 'inviteInfo':
          return await this.inviteInfo(params, userId);
        case 'inviteCreate':
          return await this.inviteCreate(params, userId);
        case 'inviteResend':
          return await this.inviteResend(params, userId);
        case 'inviteRevoke':
          return await this.inviteRevoke(params, userId);
        case 'inviteLink':
          return await this.inviteLink(params, userId);
        case 'checkHostname':
          return await this.checkHostname(params, userId);
        default:
          this.logger.warn(
            `WorkspaceHandler: Unsupported operation: ${operation}`,
          );
          throw createMethodNotFoundError(`workspace.${operation}`);
      }
    } catch (error: any) {
      this.logger.error(
        `WorkspaceHandler: Error in handleWorkspaceRequest - ${error.message || 'Unknown error'}`,
        error.stack,
      );
      throw error;
    }
  }
}
