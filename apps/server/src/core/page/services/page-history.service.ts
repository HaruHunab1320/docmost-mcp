import { Injectable } from '@nestjs/common';
import { PageHistoryRepo } from '../../../database/repos/page/page-history.repo';
import { PageHistory } from '@raven-docs/db/types/entity.types';
import { PaginationOptions } from '@raven-docs/db/pagination/pagination-options';
import { PaginationResult } from '@raven-docs/db/pagination/pagination';

@Injectable()
export class PageHistoryService {
  constructor(private pageHistoryRepo: PageHistoryRepo) {}

  async findById(historyId: string): Promise<PageHistory> {
    return await this.pageHistoryRepo.findById(historyId);
  }

  async findHistoryByPageId(
    pageId: string,
    paginationOptions: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const pageHistory = await this.pageHistoryRepo.findPageHistoryByPageId(
      pageId,
      paginationOptions,
    );

    return pageHistory;
  }
}
