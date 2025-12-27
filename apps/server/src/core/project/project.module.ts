import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './services/project.service';
import { TaskService } from './services/task.service';
import { TaskController } from './task.controller';
import { DatabaseModule } from '../../database/database.module';
import { CaslModule } from '../casl/casl.module';
import { PageModule } from '../page/page.module';
import { GoalModule } from '../goal/goal.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';

@Module({
  imports: [
    DatabaseModule,
    CaslModule,
    forwardRef(() => PageModule),
    GoalModule,
    AgentMemoryModule,
  ],
  controllers: [ProjectController, TaskController],
  providers: [ProjectService, TaskService],
  exports: [ProjectService, TaskService],
})
export class ProjectModule {}
