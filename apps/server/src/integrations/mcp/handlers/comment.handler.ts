import { Injectable, Logger } from '@nestjs/common';
import { CommentService } from '../../../core/comment/comment.service';
import { CommentRepo } from '../../../database/repos/comment/comment.repo';
import { PageRepo } from '../../../database/repos/page/page.repo';
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
import SpaceAbilityFactory from '../../../core/casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../../../core/casl/interfaces/space-ability.type';
import { validate as isValidUUID } from 'uuid';
import { MCPEventService } from '../services/mcp-event.service';
import { MCPResourceType } from '../interfaces/mcp-event.interface';

// Add interface for comment with creator
interface CommentWithCreator {
  id: string;
  content: any;
  pageId: string;
  parentCommentId: string | null;
  selection: string | null;
  creatorId: string | null;
  type: string | null;
  workspaceId: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  resolvedAt: Date | null;
  creator?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Handler for comment-related MCP operations
 */
@Injectable()
export class CommentHandler {
  private readonly logger = new Logger(CommentHandler.name);

  constructor(
    private readonly commentService: CommentService,
    private readonly commentRepo: CommentRepo,
    private readonly pageRepo: PageRepo,
    private readonly workspaceService: WorkspaceService,
    private readonly userService: UserService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly mcpEventService: MCPEventService,
  ) {}

  /**
   * Handles comment.create operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The created comment
   */
  async createComment(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing comment.create operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!params.content) {
      throw createInvalidParamsError('content is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.pageId)) {
      throw createInvalidParamsError('Invalid pageId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the page to verify it exists and check permissions
      const page = await this.pageRepo.findById(params.pageId);

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Check permissions to comment on this page
      const spaceAbility = await this.spaceAbility.createForUser(
        user,
        page.spaceId,
      );

      if (spaceAbility.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to comment on this page',
        );
      }

      // Validate parent comment if provided
      if (params.parentCommentId) {
        if (!isValidUUID(params.parentCommentId)) {
          throw createInvalidParamsError('Invalid parentCommentId format');
        }

        const parentComment = await this.commentRepo.findById(
          params.parentCommentId,
        );

        if (!parentComment || parentComment.pageId !== params.pageId) {
          throw createInvalidParamsError(
            'Parent comment not found or does not belong to this page',
          );
        }

        if (parentComment.parentCommentId !== null) {
          throw createInvalidParamsError('Cannot reply to a reply comment');
        }
      }

      // Create the comment
      const createCommentDto = {
        pageId: params.pageId,
        content:
          typeof params.content === 'string'
            ? params.content
            : JSON.stringify(params.content),
        selection: params.selection,
        parentCommentId: params.parentCommentId,
      };

      const comment = await this.commentService.create(
        userId,
        params.pageId,
        params.workspaceId,
        createCommentDto,
      );

      return {
        comment: this.transformCommentToResponse(comment),
      };
    } catch (error: any) {
      this.logger.error(
        `Error creating comment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles comment.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The comment details
   */
  async getComment(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing comment.get operation for user ${userId}`);

    if (!params.commentId) {
      throw createInvalidParamsError('commentId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.commentId)) {
      throw createInvalidParamsError('Invalid commentId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the comment with creator information
      const comment = await this.commentRepo.findById(params.commentId, {
        includeCreator: true,
      });

      if (!comment) {
        throw createResourceNotFoundError('Comment', params.commentId);
      }

      // Check if comment belongs to the specified workspace
      if (comment.workspaceId !== params.workspaceId) {
        throw createPermissionDeniedError(
          'Comment not found in this workspace',
        );
      }

      // Get the page to check permissions
      const page = await this.pageRepo.findById(comment.pageId);

      if (!page) {
        throw createResourceNotFoundError(
          'Page associated with this comment',
          comment.pageId,
        );
      }

      // Check permissions to view this comment
      const spaceAbility = await this.spaceAbility.createForUser(
        user,
        page.spaceId,
      );

      if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to view comments on this page',
        );
      }

      return {
        comment: this.transformCommentToResponse(comment),
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting comment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles comment.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of comments
   */
  async listComments(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing comment.list operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.pageId)) {
      throw createInvalidParamsError('Invalid pageId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the page to check permissions
      const page = await this.pageRepo.findById(params.pageId);

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Check permissions to view comments on this page
      const spaceAbility = await this.spaceAbility.createForUser(
        user,
        page.spaceId,
      );

      if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to view comments on this page',
        );
      }

      // Create pagination options
      const paginationOptions = new PaginationOptions();
      paginationOptions.page = params.page || 1;
      paginationOptions.limit = params.limit || 20;

      // Get comments
      const commentsResult = await this.commentService.findByPageId(
        params.pageId,
        paginationOptions,
      );

      return {
        comments: commentsResult.items,
        pagination: {
          limit: paginationOptions.limit,
          page: paginationOptions.page,
          hasNextPage: commentsResult.meta?.hasNextPage,
          hasPrevPage: commentsResult.meta?.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing comments: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles comment.update operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The updated comment
   */
  async updateComment(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing comment.update operation for user ${userId}`);

    if (!params.commentId) {
      throw createInvalidParamsError('commentId is required');
    }

    if (!params.content) {
      throw createInvalidParamsError('content is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.commentId)) {
      throw createInvalidParamsError('Invalid commentId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the comment
      const comment = await this.commentRepo.findById(params.commentId);

      if (!comment) {
        throw createResourceNotFoundError('Comment', params.commentId);
      }

      // Check if comment belongs to the specified workspace
      if (comment.workspaceId !== params.workspaceId) {
        throw createPermissionDeniedError(
          'Comment not found in this workspace',
        );
      }

      // Verify the user is the creator of the comment
      if (comment.creatorId !== userId) {
        throw createPermissionDeniedError(
          'You can only update your own comments',
        );
      }

      // Update the comment
      const updateCommentDto = {
        commentId: params.commentId,
        content:
          typeof params.content === 'string'
            ? params.content
            : JSON.stringify(params.content),
      };

      const updatedComment = await this.commentService.update(
        params.commentId,
        updateCommentDto,
        user,
      );

      return {
        comment: this.transformCommentToResponse(updatedComment),
      };
    } catch (error: any) {
      this.logger.error(
        `Error updating comment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles comment.delete operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success message
   */
  async deleteComment(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing comment.delete operation for user ${userId}`);

    if (!params.commentId) {
      throw createInvalidParamsError('commentId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.commentId)) {
      throw createInvalidParamsError('Invalid commentId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the comment
      const comment = await this.commentRepo.findById(params.commentId);

      if (!comment) {
        throw createResourceNotFoundError('Comment', params.commentId);
      }

      // Check if comment belongs to the specified workspace
      if (comment.workspaceId !== params.workspaceId) {
        throw createPermissionDeniedError(
          'Comment not found in this workspace',
        );
      }

      // Delete the comment
      await this.commentService.remove(params.commentId, user);

      return {
        success: true,
        message: 'Comment deleted successfully',
      };
    } catch (error: any) {
      this.logger.error(
        `Error deleting comment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Helper to transform a comment object to response format
   *
   * @param comment The comment to transform
   * @returns The transformed comment
   */
  private transformCommentToResponse(comment: any): any {
    // Cast to CommentWithCreator type to handle creator property
    const commentWithCreator = comment as unknown as CommentWithCreator;

    return {
      id: commentWithCreator.id,
      content: commentWithCreator.content,
      pageId: commentWithCreator.pageId,
      parentCommentId: commentWithCreator.parentCommentId,
      selection: commentWithCreator.selection,
      creatorId: commentWithCreator.creatorId,
      creator: commentWithCreator.creator,
      type: commentWithCreator.type,
      workspaceId: commentWithCreator.workspaceId,
      createdAt: commentWithCreator.createdAt,
      editedAt: commentWithCreator.editedAt,
    };
  }

  /**
   * Handles comment.resolve operation
   *
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The resolved comment
   */
  async resolveComment(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing comment.resolve operation for user ${userId}`);

    if (!params.commentId) {
      throw createInvalidParamsError('commentId is required');
    }

    if (typeof params.resolved !== 'boolean') {
      throw createInvalidParamsError('resolved must be a boolean');
    }

    try {
      const comment = await this.commentRepo.findById(params.commentId);
      if (!comment) {
        throw createResourceNotFoundError('Comment', params.commentId);
      }

      const page = await this.pageRepo.findById(comment.pageId);
      if (!page) {
        throw createResourceNotFoundError('Page', comment.pageId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to resolve comments in this space',
        );
      }

      if (
        comment.creatorId !== userId &&
        ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
      ) {
        throw createPermissionDeniedError(
          'You can only resolve your own comments',
        );
      }

      const updated = await this.commentService.resolve(
        comment.id,
        params.resolved,
        userId,
      );

      this.mcpEventService.createUpdatedEvent(
        MCPResourceType.COMMENT,
        comment.id,
        { resolved: params.resolved },
        userId,
        comment.workspaceId,
        page.spaceId,
      );

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Error resolving comment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
