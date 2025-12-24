import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../../database/database.module';
import { EnvironmentModule } from '../environment/environment.module';

@Module({
  imports: [StorageModule, DatabaseModule, EnvironmentModule],
  providers: [ExportService],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}
