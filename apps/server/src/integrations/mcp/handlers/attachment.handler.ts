import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AttachmentService } from '../../../core/attachment/services/attachment.service';
import { WorkspaceService } from '../../../core/workspace/services/workspace.service';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import {
  createInvalidParamsError,
  createPermissionDeniedError,
  createResourceNotFoundError,
  createInternalError,
} from '../utils/error.utils';
import WorkspaceAbilityFactory from '../../../core/casl/abilities/workspace-ability.factory';
import SpaceAbilityFactory from '../../../core/casl/abilities/space-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../../core/casl/interfaces/workspace-ability.type';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../../../core/casl/interfaces/space-ability.type';
import { validate as isValidUUID } from 'uuid';
import { v7 as uuid7 } from 'uuid';
import { User } from '@raven-docs/db/types/entity.types';
import { UserService } from '../../../core/user/user.service';
import { AttachmentRepo } from '../../../database/repos/attachment/attachment.repo';
import { PageRepo } from '../../../database/repos/page/page.repo';
import { prepareFile } from '../../../core/attachment/attachment.utils';
import { getAttachmentFolderPath } from '../../../core/attachment/attachment.utils';
import { AttachmentType } from '../../../core/attachment/attachment.constants';
import { StorageService } from '../../../integrations/storage/storage.service';

/**
 * Handler for attachment-related MCP operations
 */
@Injectable()
export class AttachmentHandler {
  private readonly logger = new Logger(AttachmentHandler.name);

  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly userService: UserService,
    private readonly attachmentRepo: AttachmentRepo,
    private readonly pageRepo: PageRepo,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Handles attachment.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of attachments
   */
  async listAttachments(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing attachment.list operation for user ${userId}`,
    );

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

      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Check permissions based on what's being requested
      if (params.spaceId) {
        // If a specific space is requested, check space permissions
        if (!isValidUUID(params.spaceId)) {
          throw createInvalidParamsError('Invalid spaceId format');
        }

        const spaceAbility = await this.spaceAbility.createForUser(
          user,
          params.spaceId,
        );

        if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw createPermissionDeniedError(
            'You do not have access to this space',
          );
        }
      } else {
        // If no space specified, check general workspace permissions
        const ability = this.workspaceAbility.createForUser(user, workspace);

        if (
          ability.cannot(
            WorkspaceCaslAction.Read,
            WorkspaceCaslSubject.Attachment,
          )
        ) {
          throw createPermissionDeniedError(
            'You do not have access to view attachments',
          );
        }
      }

      // Validate pageId if provided
      if (params.pageId && !isValidUUID(params.pageId)) {
        throw createInvalidParamsError('Invalid pageId format');
      }

      // Create pagination options
      const paginationOptions = new PaginationOptions();
      paginationOptions.page = params.page || 1;
      paginationOptions.limit = params.limit || 20;

      if (params.query) {
        paginationOptions.query = params.query;
      }

      // Get attachments
      const attachmentsResult = await this.attachmentService.getAttachments(
        {
          workspaceId: params.workspaceId,
          spaceId: params.spaceId,
          pageId: params.pageId,
          type: params.type,
        },
        paginationOptions,
      );

      return {
        attachments: attachmentsResult.items,
        pagination: {
          limit: paginationOptions.limit,
          page: paginationOptions.page,
          hasNextPage: attachmentsResult.meta?.hasNextPage,
          hasPrevPage: attachmentsResult.meta?.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing attachments: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw error;
    }
  }

  /**
   * Handles attachment.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The attachment details
   */
  async getAttachment(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing attachment.get operation for user ${userId}`);

    if (!params.attachmentId) {
      throw createInvalidParamsError('attachmentId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.attachmentId)) {
      throw createInvalidParamsError('Invalid attachmentId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the attachment
      const attachment = await this.attachmentRepo.findById(
        params.attachmentId,
      );

      if (!attachment) {
        throw createResourceNotFoundError('Attachment', params.attachmentId);
      }

      // Check if attachment belongs to the specified workspace
      if (attachment.workspaceId !== params.workspaceId) {
        throw createPermissionDeniedError(
          'Attachment not found in this workspace',
        );
      }

      // Check permissions
      if (attachment.spaceId) {
        // Check space-level permissions if the attachment is associated with a space
        const spaceAbility = await this.spaceAbility.createForUser(
          user,
          attachment.spaceId,
        );

        if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw createPermissionDeniedError(
            'You do not have access to this attachment',
          );
        }
      } else {
        // Check workspace-level permissions if no space is associated
        const workspace = await this.workspaceService.findById(
          params.workspaceId,
        );

        if (!workspace) {
          throw createResourceNotFoundError('Workspace', params.workspaceId);
        }

        const ability = this.workspaceAbility.createForUser(user, workspace);

        if (
          ability.cannot(
            WorkspaceCaslAction.Read,
            WorkspaceCaslSubject.Attachment,
          )
        ) {
          throw createPermissionDeniedError(
            'You do not have access to this attachment',
          );
        }
      }

      return {
        attachment: {
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          fileExt: attachment.fileExt,
          mimeType: attachment.mimeType,
          type: attachment.type,
          creatorId: attachment.creatorId,
          pageId: attachment.pageId,
          spaceId: attachment.spaceId,
          workspaceId: attachment.workspaceId,
          createdAt: attachment.createdAt,
          updatedAt: attachment.updatedAt,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting attachment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw error;
    }
  }

  /**
   * Handles attachment.upload operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The uploaded attachment details
   */
  async uploadAttachment(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing attachment.upload operation for user ${userId}`,
    );

    // Validate required parameters
    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!params.fileContent) {
      throw createInvalidParamsError('fileContent is required');
    }

    if (!params.fileName) {
      throw createInvalidParamsError('fileName is required');
    }

    if (!isValidUUID(params.pageId)) {
      throw createInvalidParamsError('Invalid pageId format');
    }

    try {
      // Get the workspace
      const workspace = await this.workspaceService.findById(
        params.workspaceId,
      );

      if (!workspace) {
        throw createResourceNotFoundError('Workspace', params.workspaceId);
      }

      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the page to verify it exists and get the spaceId
      const page = await this.pageRepo.findById(params.pageId);

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Check permissions
      const spaceAbility = await this.spaceAbility.createForUser(
        user,
        page.spaceId,
      );

      if (spaceAbility.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to upload files to this page',
        );
      }

      // Decode base64 file content if provided as base64
      let fileBuffer: Buffer;
      if (typeof params.fileContent === 'string') {
        // Remove any potential data URL prefix like 'data:application/pdf;base64,'
        const base64Data = params.fileContent.replace(
          /^data:[^;]+;base64,/,
          '',
        );
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else if (Buffer.isBuffer(params.fileContent)) {
        fileBuffer = params.fileContent;
      } else {
        throw createInvalidParamsError(
          'fileContent must be a base64 string or Buffer',
        );
      }

      // Create a prepared file object similar to what the uploadFile method expects
      const preparedFile = {
        buffer: fileBuffer,
        fileName: params.fileName,
        fileSize: fileBuffer.length,
        fileExtension: params.fileName.split('.').pop().toLowerCase(),
        mimeType: params.mimeType || 'application/octet-stream',
      };

      // Generate a new attachment ID
      const attachmentId =
        params.attachmentId && isValidUUID(params.attachmentId)
          ? params.attachmentId
          : uuid7();

      // Define the file path
      const filePath = `${getAttachmentFolderPath(AttachmentType.File, params.workspaceId)}/${attachmentId}/${preparedFile.fileName}`;

      // Upload the file to storage
      await this.attachmentService.uploadToDrive(filePath, preparedFile.buffer);

      // Save attachment metadata to database
      const attachment = await this.attachmentService.saveAttachment({
        attachmentId,
        preparedFile,
        filePath,
        type: AttachmentType.File,
        userId,
        spaceId: page.spaceId,
        workspaceId: params.workspaceId,
        pageId: params.pageId,
      });

      return {
        attachment: {
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          fileExt: attachment.fileExt,
          mimeType: attachment.mimeType,
          type: attachment.type,
          creatorId: attachment.creatorId,
          pageId: attachment.pageId,
          spaceId: attachment.spaceId,
          workspaceId: attachment.workspaceId,
          createdAt: attachment.createdAt,
          updatedAt: attachment.updatedAt,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error uploading attachment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles attachment.download operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The attachment content as base64 encoded string
   */
  async downloadAttachment(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing attachment.download operation for user ${userId}`,
    );

    if (!params.attachmentId) {
      throw createInvalidParamsError('attachmentId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.attachmentId)) {
      throw createInvalidParamsError('Invalid attachmentId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the attachment
      const attachment = await this.attachmentRepo.findById(
        params.attachmentId,
      );

      if (!attachment) {
        throw createResourceNotFoundError('Attachment', params.attachmentId);
      }

      // Check if attachment belongs to the specified workspace
      if (attachment.workspaceId !== params.workspaceId) {
        throw createPermissionDeniedError(
          'Attachment not found in this workspace',
        );
      }

      // Check permissions
      if (attachment.spaceId) {
        // Check space-level permissions if the attachment is associated with a space
        const spaceAbility = await this.spaceAbility.createForUser(
          user,
          attachment.spaceId,
        );

        if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw createPermissionDeniedError(
            'You do not have access to this attachment',
          );
        }
      } else {
        // Check workspace-level permissions if no space is associated
        const workspace = await this.workspaceService.findById(
          params.workspaceId,
        );

        if (!workspace) {
          throw createResourceNotFoundError('Workspace', params.workspaceId);
        }

        const ability = this.workspaceAbility.createForUser(user, workspace);

        if (
          ability.cannot(
            WorkspaceCaslAction.Read,
            WorkspaceCaslSubject.Attachment,
          )
        ) {
          throw createPermissionDeniedError(
            'You do not have access to this attachment',
          );
        }
      }

      // Read the file from storage
      const fileContent = await this.storageService.read(attachment.filePath);

      // Convert to base64
      const base64Content = fileContent.toString('base64');

      // Determine if we should include a data URL prefix
      let resultContent = base64Content;
      if (params.includeDataUrl) {
        resultContent = `data:${attachment.mimeType || 'application/octet-stream'};base64,${base64Content}`;
      }

      return {
        attachment: {
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          fileExt: attachment.fileExt,
          mimeType: attachment.mimeType,
          content: resultContent,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error downloading attachment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles attachment.delete operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Confirmation of deletion
   */
  async deleteAttachment(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing attachment.delete operation for user ${userId}`,
    );

    if (!params.attachmentId) {
      throw createInvalidParamsError('attachmentId is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!isValidUUID(params.attachmentId)) {
      throw createInvalidParamsError('Invalid attachmentId format');
    }

    try {
      // Get the user making the request
      const user = await this.userService.findById(userId, params.workspaceId);

      if (!user) {
        throw createPermissionDeniedError('User not found in this workspace');
      }

      // Get the attachment
      const attachment = await this.attachmentRepo.findById(
        params.attachmentId,
      );

      if (!attachment) {
        throw createResourceNotFoundError('Attachment', params.attachmentId);
      }

      // Check if attachment belongs to the specified workspace
      if (attachment.workspaceId !== params.workspaceId) {
        throw createPermissionDeniedError(
          'Attachment not found in this workspace',
        );
      }

      // Check permissions
      if (attachment.spaceId) {
        // Check space-level permissions if the attachment is associated with a space
        const spaceAbility = await this.spaceAbility.createForUser(
          user,
          attachment.spaceId,
        );

        if (
          spaceAbility.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)
        ) {
          throw createPermissionDeniedError(
            'You do not have permission to delete this attachment',
          );
        }
      } else {
        // Check workspace-level permissions if no space is associated
        const workspace = await this.workspaceService.findById(
          params.workspaceId,
        );

        if (!workspace) {
          throw createResourceNotFoundError('Workspace', params.workspaceId);
        }

        const ability = this.workspaceAbility.createForUser(user, workspace);

        if (
          ability.cannot(
            WorkspaceCaslAction.Edit,
            WorkspaceCaslSubject.Attachment,
          )
        ) {
          throw createPermissionDeniedError(
            'You do not have permission to delete this attachment',
          );
        }
      }

      // Delete the file from storage
      try {
        await this.storageService.delete(attachment.filePath);
      } catch (error) {
        this.logger.warn(
          `Failed to delete attachment file from storage: ${attachment.filePath}`,
          error,
        );
        // Continue with deleting the database record even if file deletion fails
      }

      // Delete the attachment record from the database
      await this.attachmentRepo.deleteAttachmentById(attachment.id);

      return {
        success: true,
        message: `Attachment ${attachment.fileName} deleted successfully`,
      };
    } catch (error: any) {
      this.logger.error(
        `Error deleting attachment: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
