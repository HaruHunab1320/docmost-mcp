import { Injectable, Logger } from '@nestjs/common';
import { PageService } from '../../../core/page/services/page.service';
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
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import { User } from '@raven-docs/db/types/entity.types';
import { CreatePageDto } from '../../../core/page/dto/create-page.dto';
import { PageHistoryService } from '../../../core/page/services/page-history.service';
import { validate as isValidUUID } from 'uuid';
import { MCPEventService } from '../services/mcp-event.service';
import { MCPResourceType } from '../interfaces/mcp-event.interface';
import { SpaceService } from '../../../core/space/services/space.service';

/**
 * Handler for page-related MCP operations
 */
@Injectable()
export class PageHandler {
  private readonly logger = new Logger(PageHandler.name);

  constructor(
    private readonly pageService: PageService,
    private readonly pageRepo: PageRepo,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageHistoryService: PageHistoryService,
    private readonly mcpEventService: MCPEventService,
    private readonly spaceService: SpaceService,
  ) {}

  /**
   * Handles page.get operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The page data
   */
  async getPage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.get operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    try {
      const page = await this.pageRepo.findById(params.pageId, {
        includeContent: true,
        includeSpace: true,
        includeCreator: true,
        includeLastUpdatedBy: true,
      });

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to read this page',
        );
      }

      return page;
    } catch (error: any) {
      this.logger.error(
        `Error getting page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.list operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of pages in the space
   */
  async listPages(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.list operation for user ${userId}`);

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    try {
      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(
        user,
        params.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to list pages in this space',
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

      // Get pages in the space using page service methods
      const pagesResult = await this.pageService.getRecentSpacePages(
        params.spaceId,
        paginationOptions,
      );

      return {
        pages: pagesResult.items,
        pagination: {
          limit,
          page,
          hasNextPage: pagesResult.meta?.hasNextPage,
          hasPrevPage: pagesResult.meta?.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error listing pages: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.recent operation
   */
  async getRecentPages(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.recent operation for user ${userId}`);

    try {
      const limit = params.limit || 20;
      const page = params.page || 1;
      const query = params.query || '';

      const pagination = new PaginationOptions();
      pagination.limit = limit;
      pagination.page = page;
      pagination.query = query;

      if (params.spaceId) {
        const user = { id: userId } as User;
        const ability = await this.spaceAbility.createForUser(
          user,
          params.spaceId,
        );
        if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw createPermissionDeniedError(
            'You do not have permission to read pages in this space',
          );
        }

        return this.pageService.getRecentSpacePages(params.spaceId, pagination);
      }

      return this.pageService.getRecentPages(userId, pagination);
    } catch (error: any) {
      this.logger.error(
        `Error getting recent pages: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.breadcrumbs operation
   */
  async getPageBreadcrumbs(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.breadcrumbs operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    try {
      const page = await this.pageRepo.findById(params.pageId);
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
          'You do not have permission to read this page',
        );
      }

      return this.pageService.getPageBreadCrumbs(page.id);
    } catch (error: any) {
      this.logger.error(
        `Error getting breadcrumbs: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.sidebarPages operation
   */
  async getSidebarPages(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing page.sidebarPages operation for user ${userId}`,
    );

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
          'You do not have permission to read pages in this space',
        );
      }

      let pageId: string | null = null;
      if (params.pageId) {
        const page = await this.pageRepo.findById(params.pageId);
        if (!page) {
          throw createResourceNotFoundError('Page', params.pageId);
        }
        if (page.spaceId !== params.spaceId) {
          throw createPermissionDeniedError(
            'Page does not belong to the specified space',
          );
        }
        pageId = page.id;
      }

      const pagination = new PaginationOptions();
      pagination.page = params.page || 1;
      pagination.limit = params.limit || 50;
      pagination.query = params.query || '';

      return this.pageService.getSidebarPages(
        params.spaceId,
        pagination,
        pageId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error getting sidebar pages: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.historyInfo operation
   */
  async getPageHistoryInfo(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing page.historyInfo operation for user ${userId}`,
    );

    if (!params.historyId) {
      throw createInvalidParamsError('historyId is required');
    }

    try {
      const history = await this.pageHistoryService.findById(params.historyId);
      if (!history) {
        throw createResourceNotFoundError('Page history', params.historyId);
      }

      const user = { id: userId } as User;
      const ability = await this.spaceAbility.createForUser(
        user,
        history.spaceId,
      );
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to read this page history',
        );
      }

      return history;
    } catch (error: any) {
      this.logger.error(
        `Error getting page history info: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.moveToSpace operation
   */
  async movePageToSpace(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing page.moveToSpace operation for user ${userId}`,
    );

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    try {
      const movedPage = await this.pageRepo.findById(params.pageId);
      if (!movedPage) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      if (movedPage.spaceId === params.spaceId) {
        throw createInvalidParamsError('Page is already in this space');
      }

      const user = { id: userId } as User;
      const abilities = await Promise.all([
        this.spaceAbility.createForUser(user, movedPage.spaceId),
        this.spaceAbility.createForUser(user, params.spaceId),
      ]);

      if (
        abilities.some((ability) =>
          ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page),
        )
      ) {
        throw createPermissionDeniedError(
          'You do not have permission to move this page',
        );
      }

      return this.pageService.movePageToSpace(movedPage, params.spaceId);
    } catch (error: any) {
      this.logger.error(
        `Error moving page to space: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.create operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The created page data
   */
  async createPage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.create operation for user ${userId}`);

    if (!params.title) {
      throw createInvalidParamsError('title is required');
    }

    if (!params.spaceId) {
      throw createInvalidParamsError('spaceId is required');
    }

    try {
      // Get the space first to get the workspaceId
      const space = await this.spaceService.getSpaceInfo(
        params.spaceId,
        params.workspaceId,
      );
      if (!space) {
        throw createResourceNotFoundError('Space', params.spaceId);
      }

      const createPageDto = new CreatePageDto();
      createPageDto.title = params.title;
      createPageDto.spaceId = params.spaceId;
      const content =
        params.content && typeof params.content === 'object'
          ? params.content
          : null;
      createPageDto.content = content;
      createPageDto.parentPageId = params.parentId;

      // Create the page
      const page = await this.pageService.create(
        userId,
        space.workspaceId,
        createPageDto,
      );

      // Emit the page.created event
      this.mcpEventService.createCreatedEvent(
        MCPResourceType.PAGE,
        page.id,
        {
          title: page.title,
          parentPageId: page.parentPageId,
        },
        userId,
        space.workspaceId,
        page.spaceId,
      );

      return page;
    } catch (error: any) {
      this.logger.error(
        `Error creating page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.update operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The updated page data
   */
  async updatePage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.update operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    try {
      const page = await this.pageRepo.findById(params.pageId, {
        includeSpace: true,
      });

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to update this page',
        );
      }

      // Prepare update data
      const updateData: any = {};

      if (params.title !== undefined) {
        updateData.title = params.title;
      }

      if (params.icon !== undefined) {
        updateData.icon = params.icon;
      }

      if (params.content !== undefined) {
        updateData.content = params.content;
      }

      if (params.parentPageId !== undefined) {
        updateData.parentPageId = params.parentPageId;
      }

      // Update the page
      await this.pageRepo.updatePage(updateData, params.pageId);

      // Get the updated page
      const updatedPage = await this.pageRepo.findById(params.pageId, {
        includeContent: true,
        includeSpace: true,
        includeCreator: true,
        includeLastUpdatedBy: true,
      });

      // Publish an event for the updated page
      this.logger.debug(`Publishing event for updated page ${updatedPage.id}`);
      this.mcpEventService.createUpdatedEvent(
        MCPResourceType.PAGE,
        updatedPage.id,
        {
          title: updatedPage.title,
          content: params.content ? true : undefined,
        },
        userId,
        page.workspaceId,
        page.spaceId,
      );

      return updatedPage;
    } catch (error: any) {
      this.logger.error(
        `Error updating page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.delete operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns Success status
   */
  async deletePage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.delete operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    try {
      const page = await this.pageRepo.findById(params.pageId, {
        includeSpace: true,
      });

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Delete, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to delete this page',
        );
      }

      // Delete the page
      await this.pageRepo.deletePage(params.pageId);

      // Publish an event for the deleted page
      this.logger.debug(`Publishing event for deleted page ${params.pageId}`);
      this.mcpEventService.createDeletedEvent(
        MCPResourceType.PAGE,
        params.pageId,
        {
          title: page.title,
          parentPageId: page.parentPageId,
        },
        userId,
        page.workspaceId,
        page.spaceId,
      );

      return { success: true, message: 'Page deleted successfully' };
    } catch (error: any) {
      this.logger.error(
        `Error deleting page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.move operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The moved page data
   */
  async movePage(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.move operation for user ${userId}`);

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!params.targetSpaceId) {
      throw createInvalidParamsError('targetSpaceId is required');
    }

    try {
      // Find the page
      const page = await this.pageRepo.findById(params.pageId, {
        includeSpace: true,
      });

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions for source space
      let ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to move this page',
        );
      }

      // Check permissions for target space
      ability = await this.spaceAbility.createForUser(
        user,
        params.targetSpaceId,
      );
      if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to create pages in the target space',
        );
      }

      // Get workspace ID for the target space
      const workspace = await this.pageRepo.findFirstWorkspaceBySpaceId(
        params.targetSpaceId,
      );
      if (!workspace) {
        throw createResourceNotFoundError('Workspace', 'for the target space');
      }

      // Update the page with new space ID and optionally parent page ID
      const updateData: any = {
        spaceId: params.targetSpaceId,
        workspaceId: workspace.id,
        lastUpdatedById: userId,
      };

      if (params.parentPageId !== undefined) {
        updateData.parentPageId = params.parentPageId;
      }

      // Move the page
      await this.pageRepo.updatePage(updateData, params.pageId);

      // Return the updated page with additional details
      return await this.pageRepo.findById(params.pageId, {
        includeContent: true,
        includeSpace: true,
        includeCreator: true,
        includeLastUpdatedBy: true,
      });
    } catch (error: any) {
      this.logger.error(
        `Error moving page: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.search operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of pages matching the search criteria
   */
  async searchPages(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.search operation for user ${userId}`);

    if (!params.query) {
      throw createInvalidParamsError('query is required');
    }

    try {
      // Create pagination options
      const paginationOptions = new PaginationOptions();
      paginationOptions.limit = params.limit || 50;
      paginationOptions.page = params.page || 1;
      paginationOptions.query = params.query;

      // If a specific spaceId is provided, search within that space only
      if (params.spaceId) {
        // Check if user has access to the space
        const user = { id: userId } as User;
        const ability = await this.spaceAbility.createForUser(
          user,
          params.spaceId,
        );
        if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
          throw createPermissionDeniedError(
            'You do not have permission to search pages in this space',
          );
        }

        // Search pages in the specific space
        const pagesResult = await this.pageService.getRecentSpacePages(
          params.spaceId,
          paginationOptions,
        );

        return {
          pages: pagesResult.items,
          pagination: {
            limit: paginationOptions.limit,
            page: paginationOptions.page,
            hasNextPage: pagesResult.meta?.hasNextPage,
            hasPrevPage: pagesResult.meta?.hasPrevPage,
          },
        };
      } else {
        // Search across all spaces the user has access to
        const pagesResult = await this.pageService.getRecentPages(
          userId,
          paginationOptions,
        );

        return {
          pages: pagesResult.items,
          pagination: {
            limit: paginationOptions.limit,
            page: paginationOptions.page,
            hasNextPage: pagesResult.meta?.hasNextPage,
            hasPrevPage: pagesResult.meta?.hasPrevPage,
          },
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Error searching pages: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.getHistory operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns List of page history versions
   */
  async getPageHistory(params: any, userId: string): Promise<any> {
    this.logger.debug(
      `Processing page.getHistory operation for user ${userId}`,
    );

    if (!params.pageId) {
      throw createInvalidParamsError('pageId is required');
    }

    if (!isValidUUID(params.pageId)) {
      throw createInvalidParamsError('Invalid pageId format');
    }

    try {
      // Get the page to verify it exists and check permissions
      const page = await this.pageRepo.findById(params.pageId);

      if (!page) {
        throw createResourceNotFoundError('Page', params.pageId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Read, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to view history for this page',
        );
      }

      // Get optional parameters with defaults
      const limit = params.limit || 20;
      const page_num = params.page || 1;

      // Create pagination options
      const paginationOptions = new PaginationOptions();
      paginationOptions.limit = limit;
      paginationOptions.page = page_num;

      // Get page history
      const historyResult = await this.pageHistoryService.findHistoryByPageId(
        params.pageId,
        paginationOptions,
      );

      return {
        history: historyResult.items,
        pagination: {
          limit,
          page: page_num,
          hasNextPage: historyResult.meta?.hasNextPage,
          hasPrevPage: historyResult.meta?.hasPrevPage,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting page history: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles page.restore operation
   *
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The restored page
   */
  async restorePageVersion(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing page.restore operation for user ${userId}`);

    if (!params.historyId) {
      throw createInvalidParamsError('historyId is required');
    }

    if (!isValidUUID(params.historyId)) {
      throw createInvalidParamsError('Invalid historyId format');
    }

    try {
      // Get the history version to verify it exists
      const history = await this.pageHistoryService.findById(params.historyId);

      if (!history) {
        throw createResourceNotFoundError(
          'Page history version',
          params.historyId,
        );
      }

      // Get the page to verify it exists
      const page = await this.pageRepo.findById(history.pageId);

      if (!page) {
        throw createResourceNotFoundError('Page', history.pageId);
      }

      // Create a mock user with just the ID for permission checking
      const user = { id: userId } as User;

      // Check permissions
      const ability = await this.spaceAbility.createForUser(user, page.spaceId);
      if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
        throw createPermissionDeniedError(
          'You do not have permission to restore this page version',
        );
      }

      // Update the page with the history content
      const updateResult = await this.pageRepo.updatePage(
        {
          content: history.content,
          title: history.title,
          icon: history.icon,
          lastUpdatedById: userId,
          updatedAt: new Date(),
        },
        page.id,
      );

      // Return the updated page
      return await this.pageRepo.findById(page.id, {
        includeContent: true,
        includeSpace: true,
        includeCreator: true,
        includeLastUpdatedBy: true,
      });
    } catch (error: any) {
      this.logger.error(
        `Error restoring page version: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error; // Re-throw MCP errors
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
