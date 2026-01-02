import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from '../../../core/search/search.service';
import SpaceAbilityFactory from '../../../core/casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../../../core/casl/interfaces/space-ability.type';
import {
  createInvalidParamsError,
  createInternalError,
  createPermissionDeniedError,
} from '../utils/error.utils';
import { User } from '@raven-docs/db/types/entity.types';

/**
 * Handler for search-related MCP operations
 */
@Injectable()
export class SearchHandler {
  private readonly logger = new Logger(SearchHandler.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly spaceAbility: SpaceAbilityFactory,
  ) {}

  /**
   * Handles search.query operation
   */
  async searchPages(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing search.query for user ${userId}`);

    if (!params.query) {
      throw createInvalidParamsError('query is required');
    }

    try {
      if (params.spaceId) {
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

        return this.searchService.searchPage(params.query, {
          query: params.query,
          spaceId: params.spaceId,
          creatorId: params.creatorId,
          limit: params.limit,
          offset: params.offset,
        });
      }

      return this.searchService.searchPagesForUser(params.query, userId, {
        query: params.query,
        creatorId: params.creatorId,
        limit: params.limit,
        offset: params.offset,
      });
    } catch (error: any) {
      this.logger.error(
        `Error searching pages: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  /**
   * Handles search.suggest operation
   */
  async searchSuggestions(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing search.suggest for user ${userId}`);

    if (!params.query) {
      throw createInvalidParamsError('query is required');
    }

    if (!params.workspaceId) {
      throw createInvalidParamsError('workspaceId is required');
    }

    try {
      return this.searchService.searchSuggestions(
        {
          query: params.query,
          includeUsers: params.includeUsers,
          includeGroups: params.includeGroups,
          includePages: params.includePages,
          spaceId: params.spaceId,
          limit: params.limit,
        },
        userId,
        params.workspaceId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error getting search suggestions: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
