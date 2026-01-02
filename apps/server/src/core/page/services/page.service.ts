import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreatePageDto } from '../dto/create-page.dto';
import { UpdatePageDto } from '../dto/update-page.dto';
import { PageRepo } from '../../../database/repos/page/page.repo';
import { Page } from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import {
  executeWithPagination,
  PaginationResult,
} from '@raven-docs/db/pagination/pagination';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@raven-docs/db/types/kysely.types';
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { MovePageDto } from '../dto/move-page.dto';
import { ExpressionBuilder, Transaction } from 'kysely';
import { DB } from '@raven-docs/db/types/db';
import { generateSlugId } from '../../../common/helpers';
import { dbOrTx, executeTx } from '@raven-docs/db/utils';
import { AttachmentRepo } from '../../../database/repos/attachment/attachment.repo';
import { AgentMemoryService } from '../../agent-memory/agent-memory.service';
import { TaskService } from '../../project/services/task.service';

@Injectable()
export class PageService {
  constructor(
    private pageRepo: PageRepo,
    private attachmentRepo: AttachmentRepo,
    @InjectKysely() private readonly db: KyselyDB,
    private readonly agentMemoryService: AgentMemoryService,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
  ) {}

  async findById(
    pageId: string,
    includeContent?: boolean,
    includeYdoc?: boolean,
    includeSpace?: boolean,
  ): Promise<Page> {
    return this.pageRepo.findById(pageId, {
      includeContent,
      includeYdoc,
      includeSpace,
    });
  }

  async create(
    userId: string,
    workspaceId: string,
    createPageDto: CreatePageDto,
    trx?: Transaction<DB>,
  ): Promise<Page> {
    let parentPageId = undefined;

    // check if parent page exists
    if (createPageDto.parentPageId) {
      const parentPage = await this.pageRepo.findById(
        createPageDto.parentPageId,
      );

      if (!parentPage || parentPage.spaceId !== createPageDto.spaceId) {
        throw new NotFoundException('Parent page not found');
      }

      parentPageId = parentPage.id;
    }

    const createdPage = await this.pageRepo.insertPage(
      {
        slugId: generateSlugId(),
        title: createPageDto.title,
        position: await this.nextPagePosition(
          createPageDto.spaceId,
          parentPageId,
          trx,
        ),
        icon: createPageDto.icon,
        parentPageId: parentPageId,
        spaceId: createPageDto.spaceId,
        creatorId: userId,
        workspaceId: workspaceId,
        lastUpdatedById: userId,
        content: createPageDto.content,
      },
      trx,
    );

    try {
      await this.agentMemoryService.ingestMemory({
        workspaceId,
        spaceId: createdPage.spaceId,
        creatorId: userId,
        source: 'page.created',
        summary: `Page created: ${createdPage.title}`,
        tags: ['page', 'created'],
        content: {
          action: 'created',
          pageId: createdPage.id,
          title: createdPage.title,
          parentPageId: createdPage.parentPageId || null,
          spaceId: createdPage.spaceId,
        },
      });
    } catch {
      // Memory ingestion should not block page creation.
    }

    if (createPageDto.content) {
      await this.taskService.syncTasksFromPageContent({
        workspaceId,
        spaceId: createdPage.spaceId,
        pageId: createdPage.id,
        userId,
        content: createPageDto.content,
      });
    }

    return createdPage;
  }

  async nextPagePosition(
    spaceId: string,
    parentPageId?: string,
    trx?: Transaction<DB>,
  ) {
    let pagePosition: string;

    const db = dbOrTx(this.db, trx);
    const lastPageQuery = db
      .selectFrom('pages')
      .select(['position'])
      .where('spaceId', '=', spaceId)
      .orderBy('position', 'desc')
      .limit(1);

    if (parentPageId) {
      // check for children of this page
      const lastPage = await lastPageQuery
        .where('parentPageId', '=', parentPageId)
        .executeTakeFirst();

      if (!lastPage) {
        pagePosition = generateJitteredKeyBetween(null, null);
      } else {
        // if there is an existing page, we should get a position below it
        pagePosition = generateJitteredKeyBetween(lastPage.position, null);
      }
    } else {
      // for root page
      const lastPage = await lastPageQuery
        .where('parentPageId', 'is', null)
        .executeTakeFirst();

      // if no existing page, make this the first
      if (!lastPage) {
        pagePosition = generateJitteredKeyBetween(null, null); // we expect "a0"
      } else {
        // if there is an existing page, we should get a position below it
        pagePosition = generateJitteredKeyBetween(lastPage.position, null);
      }
    }

    return pagePosition;
  }

  async update(
    page: Page,
    updatePageDto: UpdatePageDto,
    userId: string,
  ): Promise<Page> {
    const contributors = new Set<string>(page.contributorIds);
    contributors.add(userId);
    const contributorIds = Array.from(contributors);

    const updatePayload: any = {
      title: updatePageDto.title,
      icon: updatePageDto.icon,
      lastUpdatedById: userId,
      updatedAt: new Date(),
      contributorIds: contributorIds,
    };
    if (updatePageDto.content !== undefined) {
      updatePayload.content = updatePageDto.content;
    }

    await this.pageRepo.updatePage(updatePayload, page.id);

    const updatedPage = await this.pageRepo.findById(page.id, {
      includeSpace: true,
      includeContent: true,
      includeCreator: true,
      includeLastUpdatedBy: true,
      includeContributors: true,
    });

    try {
      await this.agentMemoryService.ingestMemory({
        workspaceId: updatedPage.workspaceId,
        spaceId: updatedPage.spaceId,
        creatorId: userId,
        source: 'page.updated',
        summary: `Page updated: ${updatedPage.title}`,
        tags: ['page', 'updated'],
        content: {
          action: 'updated',
          pageId: updatedPage.id,
          title: updatedPage.title,
          spaceId: updatedPage.spaceId,
        },
      });
    } catch {
      // Memory ingestion should not block page updates.
    }

    if (updatePageDto.content !== undefined) {
      await this.taskService.syncTasksFromPageContent({
        workspaceId: updatedPage.workspaceId,
        spaceId: updatedPage.spaceId,
        pageId: updatedPage.id,
        userId,
        content: updatePageDto.content,
      });
    }

    return updatedPage;
  }

  withHasChildren(eb: ExpressionBuilder<DB, 'pages'>) {
    return eb
      .selectFrom('pages as child')
      .select((eb) =>
        eb
          .case()
          .when(eb.fn.countAll(), '>', 0)
          .then(true)
          .else(false)
          .end()
          .as('count'),
      )
      .whereRef('child.parentPageId', '=', 'pages.id')
      .limit(1)
      .as('hasChildren');
  }

  async getSidebarPages(
    spaceId: string,
    pagination: PaginationOptions,
    pageId?: string,
  ): Promise<any> {
    let query = this.db
      .selectFrom('pages')
      .select([
        'id',
        'slugId',
        'title',
        'icon',
        'position',
        'parentPageId',
        'spaceId',
        'creatorId',
      ])
      .select((eb) => this.withHasChildren(eb))
      .orderBy('position', 'asc')
      .where('spaceId', '=', spaceId);

    if (pageId) {
      query = query.where('parentPageId', '=', pageId);
    } else {
      query = query.where('parentPageId', 'is', null);
    }

    const result = executeWithPagination(query, {
      page: pagination.page,
      perPage: 250,
    });

    return result;
  }

  async movePageToSpace(rootPage: Page, spaceId: string) {
    await executeTx(this.db, async (trx) => {
      // Update root page
      const nextPosition = await this.nextPagePosition(spaceId);
      await this.pageRepo.updatePage(
        { spaceId, parentPageId: null, position: nextPosition },
        rootPage.id,
        trx,
      );
      const pageIds = await this.pageRepo
        .getPageAndDescendants(rootPage.id)
        .then((pages) => pages.map((page) => page.id));
      // The first id is the root page id
      if (pageIds.length > 1) {
        // Update sub pages
        await this.pageRepo.updatePages(
          { spaceId },
          pageIds.filter((id) => id !== rootPage.id),
          trx,
        );
      }
      // Update attachments
      await this.attachmentRepo.updateAttachmentsByPageId(
        { spaceId },
        pageIds,
        trx,
      );
    });
  }

  async movePage(dto: MovePageDto, movedPage: Page) {
    // validate position value by attempting to generate a key
    try {
      generateJitteredKeyBetween(dto.position, null);
    } catch (err) {
      throw new BadRequestException('Invalid move position');
    }

    let parentPageId = null;
    if (movedPage.parentPageId === dto.parentPageId) {
      parentPageId = undefined;
    } else {
      // changing the page's parent
      if (dto.parentPageId) {
        const parentPage = await this.pageRepo.findById(dto.parentPageId);
        if (!parentPage || parentPage.spaceId !== movedPage.spaceId) {
          throw new NotFoundException('Parent page not found');
        }
        parentPageId = parentPage.id;
      }
    }

    await this.pageRepo.updatePage(
      {
        position: dto.position,
        parentPageId: parentPageId,
      },
      dto.pageId,
    );
  }

  async getPageBreadCrumbs(childPageId: string) {
    const ancestors = await this.db
      .withRecursive('page_ancestors', (db) =>
        db
          .selectFrom('pages')
          .select([
            'id',
            'slugId',
            'title',
            'icon',
            'position',
            'parentPageId',
            'spaceId',
          ])
          .select((eb) => this.withHasChildren(eb))
          .where('id', '=', childPageId)
          .unionAll((exp) =>
            exp
              .selectFrom('pages as p')
              .select([
                'p.id',
                'p.slugId',
                'p.title',
                'p.icon',
                'p.position',
                'p.parentPageId',
                'p.spaceId',
              ])
              .select(
                exp
                  .selectFrom('pages as child')
                  .select((eb) =>
                    eb
                      .case()
                      .when(eb.fn.countAll(), '>', 0)
                      .then(true)
                      .else(false)
                      .end()
                      .as('count'),
                  )
                  .whereRef('child.parentPageId', '=', 'id')
                  .limit(1)
                  .as('hasChildren'),
              )
              //.select((eb) => this.withHasChildren(eb))
              .innerJoin('page_ancestors as pa', 'pa.parentPageId', 'p.id'),
          ),
      )
      .selectFrom('page_ancestors')
      .selectAll()
      .execute();

    return ancestors.reverse();
  }

  async getRecentSpacePages(
    spaceId: string,
    pagination: PaginationOptions,
  ): Promise<PaginationResult<Page>> {
    return await this.pageRepo.getRecentPagesInSpace(spaceId, pagination);
  }

  async getRecentPages(
    userId: string,
    pagination: PaginationOptions,
  ): Promise<PaginationResult<Page>> {
    return await this.pageRepo.getRecentPages(userId, pagination);
  }

  async forceDelete(pageId: string): Promise<void> {
    await this.pageRepo.deletePage(pageId);
  }
}
