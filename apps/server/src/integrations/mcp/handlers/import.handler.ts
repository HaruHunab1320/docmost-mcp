import { Injectable, Logger } from '@nestjs/common';
import { ImportService } from '../../import/import.service';
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
import { StorageService } from '../../storage/storage.service';
import { v7 as uuid7 } from 'uuid';
import * as path from 'path';
import { User } from '@raven-docs/db/types/entity.types';

/**
 * Handler for import-related MCP operations
 */
@Injectable()
export class ImportHandler {
  private readonly logger = new Logger(ImportHandler.name);

  constructor(
    private readonly importService: ImportService,
    private readonly storageService: StorageService,
    private readonly spaceAbility: SpaceAbilityFactory,
  ) {}

  /**
   * Handles import.requestUpload operation
   */
  async requestUpload(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing import.requestUpload for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.fileName) {
      throw createInvalidParamsError('fileName is required');
    }

    try {
      const expiresIn = params.expiresIn || 300;
      const safeFileName = path.basename(params.fileName);
      const uploadId = uuid7();
      const filePath = `imports/${params.workspaceId}/${uploadId}/${safeFileName}`;

      const uploadUrl = await this.storageService.getUploadSignedUrl(
        filePath,
        expiresIn,
        params.mimeType,
      );

      return {
        uploadUrl,
        filePath,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        method: 'PUT',
      };
    } catch (error: any) {
      this.logger.error(
        `Error creating import upload URL: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles import.page operation
   */
  async importPage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing import.page for user ${userId}`);

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.filePath) {
      throw createInvalidParamsError('filePath is required');
    }

    try {
      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to import pages in this space',
        );
      }

      const exists = await this.storageService.exists(params.filePath);
      if (!exists) {
        throw createResourceNotFoundError('Import file', params.filePath);
      }

      const fileName = path.basename(params.filePath);
      const fileExtension = path.extname(fileName).toLowerCase();
      if (!['.md', '.html'].includes(fileExtension)) {
        throw createInvalidParamsError('Invalid import file type');
      }

      const fileBuffer = await this.storageService.read(params.filePath);
      return this.importService.importPageFromBuffer(
        fileBuffer,
        fileName,
        userId,
        params.spaceId,
        params.workspaceId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error importing page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
