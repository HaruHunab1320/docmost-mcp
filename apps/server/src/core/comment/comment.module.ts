import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { DatabaseModule } from '../../database/database.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';

@Module({
  imports: [DatabaseModule, AgentMemoryModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
