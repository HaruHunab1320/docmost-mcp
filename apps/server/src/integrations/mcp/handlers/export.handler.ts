import { Injectable, Logger } from '@nestjs/common';
import { ExportService } from '../../export/export.service';
import { PageRepo } from '../../../database/repos/page/page.repo';
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
import { ExportFormat } from '../../export/dto/export-dto';
import { getExportExtension } from '../../export/utils';
import { sanitize } from 'sanitize-filename-ts';
import { v7 as uuid7 } from 'uuid';
import * as path from 'path';
import { User } from '@raven-docs/db/types/entity.types';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';

/**
 * Handler for export-related MCP operations
 */
@Injectable()
export class ExportHandler {
  private readonly logger = new Logger(ExportHandler.name);

  constructor(
    private readonly exportService: ExportService,
    private readonly pageRepo: PageRepo,
    private readonly storageService: StorageService,
    private readonly spaceAbility: SpaceAbilityFactory,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  /**
   * Handles export.page operation
   */
  async exportPage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing export.page for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!params.format) {
      throw createInvalidParamsError('format is required');
    }

    try {
      const page = await this.pageRepo.findById(params.pageId, {
        includeContent: true,
      });

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        page.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to export this page',
        );
      }

      const includeChildren = Boolean(params.includeChildren);
      const fileExt = includeChildren
        ? '.zip'
        : getExportExtension(params.format);
      const fileName =
        sanitize(page.title || 'untitled') + fileExt;

      const fileBuffer = includeChildren
        ? await this.exportService.exportPageWithChildren(
            params.pageId,
            params.format,
          )
        : await this.exportService.exportPage(params.format, page, true);

      const exportId = uuid7();
      const filePath = `exports/${page.workspaceId}/${exportId}/${fileName}`;
      await this.storageService.upload(filePath, fileBuffer);

      const expiresIn = params.expiresIn || 300;
      const downloadUrl = await this.storageService.getSignedUrl(
        filePath,
        expiresIn,
      );

      return {
        downloadUrl,
        filePath,
        fileName,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error: any) {
      this.logger.error(
        `Error exporting page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles export.space operation
   */
  async exportSpace(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing export.space for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    if (!params.format) {
      throw createInvalidParamsError('format is required');
    }

    try {
      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to export this space',
        );
      }

      const space = await this.db
        .selectFrom('spaces')
        .select(['id', 'name', 'workspaceId'])
        .where('id', '=', params.spaceId)
        .executeTakeFirst();

      if (!space) {
        throw createResourceNotFoundError('Space', params.spaceId);
      }

      const exportFile = await this.exportService.exportSpace(
        params.spaceId,
        params.format,
        params.includeAttachments,
      );

      const fileName = sanitize(exportFile.fileName);
      const exportId = uuid7();
      const filePath = `exports/${space.workspaceId}/${exportId}/${fileName}`;
      await this.storageService.upload(filePath, exportFile.fileBuffer);

      const expiresIn = params.expiresIn || 300;
      const downloadUrl = await this.storageService.getSignedUrl(
        filePath,
        expiresIn,
      );

      return {
        downloadUrl,
        filePath,
        fileName,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error: any) {
      this.logger.error(
        `Error exporting space: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
