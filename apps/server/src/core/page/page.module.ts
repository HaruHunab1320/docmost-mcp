import { Module } from '@nestjs/common';
import { PageService } from './services/page.service';
import { PageController } from './page.controller';
import { PageHistoryService } from './services/page-history.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PageController],
  providers: [PageService, PageHistoryService],
  exports: [PageService, PageHistoryService],
})
export class PageModule {}
