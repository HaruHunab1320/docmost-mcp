import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AttachmentService } from './services/attachment.service';
import { FastifyReply } from 'fastify';
import { FileInterceptor } from '../../common/interceptors/file.interceptor';
import * as bytes from 'bytes';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@raven-docs/db/types/entity.types';
import { StorageService } from '../../integrations/storage/storage.service';
import {
  getAttachmentFolderPath,
  validAttachmentTypes,
} from './attachment.utils';
import { getMimeType } from '../../common/helpers';
import {
  AttachmentType,
  inlineFileExtensions,
  MAX_AVATAR_SIZE,
} from './attachment.constants';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import { PageRepo } from '@raven-docs/db/repos/page/page.repo';
import { AttachmentRepo } from '@raven-docs/db/repos/attachment/attachment.repo';
import { validate as isValidUUID } from 'uuid';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import { AttachmentIdDto } from './dto/attachment.input';

@Controller()
export class AttachmentController {
  private readonly logger = new Logger(AttachmentController.name);

  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly storageService: StorageService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageRepo: PageRepo,
    private readonly attachmentRepo: AttachmentRepo,
    private readonly environmentService: EnvironmentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('attachments')
  async listAttachments(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Query('spaceId') spaceId?: string,
    @Query('pageId') pageId?: string,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('query') query?: string,
  ) {
    // Check permissions based on what's being requested
    if (spaceId) {
      // If a specific space is requested, check space permissions
      const spaceAbility = await this.spaceAbility.createForUser(user, spaceId);
      if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw new ForbiddenException('You do not have access to this space');
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
        throw new ForbiddenException(
          'You do not have access to view attachments',
        );
      }
    }

    if (pageId && !isValidUUID(pageId)) {
      throw new BadRequestException('Invalid page ID');
    }

    if (spaceId && !isValidUUID(spaceId)) {
      throw new BadRequestException('Invalid space ID');
    }

    // Setup pagination options
    const paginationOptions = new PaginationOptions();
    paginationOptions.page = page;
    paginationOptions.limit = limit;
    if (query) {
      paginationOptions.query = query;
    }

    // Get paginated attachments
    const attachments = await this.attachmentService.getAttachments(
      {
        workspaceId: workspace.id,
        spaceId,
        pageId,
        type,
      },
      paginationOptions,
    );

    return attachments;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('attachments/delete')
  async deleteAttachment(
    @Body() input: AttachmentIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    if (!isValidUUID(input.attachmentId)) {
      throw new BadRequestException('Invalid attachment id');
    }

    const attachment = await this.attachmentRepo.findById(input.attachmentId);
    if (!attachment || attachment.workspaceId !== workspace.id) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.spaceId) {
      const spaceAbility = await this.spaceAbility.createForUser(
        user,
        attachment.spaceId,
      );
      if (spaceAbility.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
        throw new ForbiddenException(
          'You do not have permission to delete this attachment',
        );
      }
    } else {
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(
          WorkspaceCaslAction.Manage,
          WorkspaceCaslSubject.Attachment,
        )
      ) {
        throw new ForbiddenException(
          'You do not have permission to delete this attachment',
        );
      }
    }

    try {
      await this.storageService.delete(attachment.filePath);
    } catch (error) {
      this.logger.warn(
        `Failed to delete attachment file from storage: ${attachment.filePath}`,
        error,
      );
    }

    await this.attachmentRepo.deleteAttachmentById(attachment.id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('files/upload')
  @UseInterceptors(FileInterceptor)
  async uploadFile(
    @Req() req: any,
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const maxFileSize = bytes(this.environmentService.getFileUploadSizeLimit());

    let file = null;
    try {
      file = await req.file({
        limits: { fileSize: maxFileSize, fields: 3, files: 1 },
      });
    } catch (err: any) {
      this.logger.error(err.message);
      if (err?.statusCode === 413) {
        throw new BadRequestException(
          `File too large. Exceeds the ${this.environmentService.getFileUploadSizeLimit()} limit`,
        );
      }
    }

    if (!file) {
      throw new BadRequestException('Failed to upload file');
    }

    const pageId = file.fields?.pageId?.value;

    if (!pageId) {
      throw new BadRequestException('PageId is required');
    }

    const page = await this.pageRepo.findById(pageId);

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const spaceAbility = await this.spaceAbility.createForUser(
      user,
      page.spaceId,
    );
    if (spaceAbility.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    const spaceId = page.spaceId;

    const attachmentId = file.fields?.attachmentId?.value;
    if (attachmentId && !isValidUUID(attachmentId)) {
      throw new BadRequestException('Invalid attachment id');
    }

    try {
      const fileResponse = await this.attachmentService.uploadFile({
        filePromise: file,
        pageId: pageId,
        spaceId: spaceId,
        userId: user.id,
        workspaceId: workspace.id,
        attachmentId: attachmentId,
      });

      return res.send(fileResponse);
    } catch (err: any) {
      if (err?.statusCode === 413) {
        const errMessage = `File too large. Exceeds the ${this.environmentService.getFileUploadSizeLimit()} limit`;
        this.logger.error(errMessage);
        throw new BadRequestException(errMessage);
      }
      this.logger.error(err);
      throw new BadRequestException('Error processing file upload.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/files/:fileId/:fileName')
  async getFile(
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Param('fileId') fileId: string,
    @Param('fileName') fileName?: string,
  ) {
    if (!isValidUUID(fileId)) {
      throw new NotFoundException('Invalid file id');
    }

    const attachment = await this.attachmentRepo.findById(fileId);
    if (
      !attachment ||
      attachment.workspaceId !== workspace.id ||
      !attachment.pageId ||
      !attachment.spaceId
    ) {
      throw new NotFoundException();
    }

    const spaceAbility = await this.spaceAbility.createForUser(
      user,
      attachment.spaceId,
    );

    if (spaceAbility.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    try {
      const fileStream = await this.storageService.read(attachment.filePath);
      res.headers({
        'Content-Type': attachment.mimeType,
        'Cache-Control': 'private, max-age=3600',
      });

      if (!inlineFileExtensions.includes(attachment.fileExt)) {
        res.header(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        );
      }

      return res.send(fileStream);
    } catch (err) {
      this.logger.error(err);
      throw new NotFoundException('File not found');
    }
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('attachments/upload-image')
  @UseInterceptors(FileInterceptor)
  async uploadAvatarOrLogo(
    @Req() req: any,
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const maxFileSize = bytes(MAX_AVATAR_SIZE);

    let file = null;
    try {
      file = await req.file({
        limits: { fileSize: maxFileSize, fields: 3, files: 1 },
      });
    } catch (err: any) {
      this.logger.error('File upload error:', err);
      if (err?.statusCode === 413) {
        throw new BadRequestException(
          `File too large. Exceeds the ${MAX_AVATAR_SIZE} limit`,
        );
      }
    }

    if (!file) {
      throw new BadRequestException('Invalid file upload');
    }

    // Log all fields for debugging
    this.logger.debug('File upload fields:', file.fields);

    const attachmentType = file.fields?.type?.value;
    const spaceId = file.fields?.spaceId?.value;

    this.logger.debug(
      `Processing upload - type: ${attachmentType}, spaceId: ${spaceId}`,
    );

    if (!attachmentType) {
      throw new BadRequestException('attachment type is required');
    }

    if (
      !validAttachmentTypes.includes(attachmentType) ||
      attachmentType === AttachmentType.File
    ) {
      throw new BadRequestException('Invalid image attachment type');
    }

    // Handle ProjectCover type specifically
    if (attachmentType === AttachmentType.ProjectCover) {
      if (!spaceId) {
        throw new BadRequestException(
          'spaceId is required for project cover image',
        );
      }

      // Check if user has permission to manage the space
      const spaceAbility = await this.spaceAbility.createForUser(user, spaceId);
      if (
        spaceAbility.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
      ) {
        throw new ForbiddenException(
          'You do not have permission to upload project cover images',
        );
      }
    } else if (attachmentType === AttachmentType.WorkspaceLogo) {
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(
          WorkspaceCaslAction.Manage,
          WorkspaceCaslSubject.Settings,
        )
      ) {
        throw new ForbiddenException();
      }
    } else if (attachmentType === AttachmentType.SpaceLogo) {
      if (!spaceId) {
        throw new BadRequestException('spaceId is required');
      }

      const spaceAbility = await this.spaceAbility.createForUser(user, spaceId);
      if (
        spaceAbility.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Settings)
      ) {
        throw new ForbiddenException();
      }
    }

    try {
      this.logger.debug(
        `Uploading ${attachmentType} image for user: ${user.id}, workspace: ${workspace.id}, space: ${spaceId || 'none'}`,
      );

      const fileResponse = await this.attachmentService.uploadImage(
        file,
        attachmentType,
        user.id,
        workspace.id,
        spaceId,
      );

      this.logger.debug('Upload successful, returning response:', fileResponse);
      return res.send(fileResponse);
    } catch (err: any) {
      this.logger.error('Error processing file upload:', err);
      throw new BadRequestException(
        err?.message || 'Error processing file upload.',
      );
    }
  }

  @Get('attachments/img/:attachmentType/:fileName')
  async getLogoOrAvatar(
    @Res() res: FastifyReply,
    @AuthWorkspace() workspace: Workspace,
    @Param('attachmentType') attachmentType: AttachmentType,
    @Param('fileName') fileName?: string,
  ) {
    if (
      !validAttachmentTypes.includes(attachmentType) ||
      attachmentType === AttachmentType.File
    ) {
      throw new BadRequestException('Invalid image attachment type');
    }

    const filePath = `${getAttachmentFolderPath(attachmentType, workspace.id)}/${fileName}`;

    try {
      const fileStream = await this.storageService.read(filePath);
      res.headers({
        'Content-Type': getMimeType(filePath),
        'Cache-Control': 'private, max-age=86400',
      });
      return res.send(fileStream);
    } catch (err) {
      this.logger.error(err);
      throw new NotFoundException('File not found');
    }
  }
}
