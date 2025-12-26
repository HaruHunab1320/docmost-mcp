import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [GoalController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}
