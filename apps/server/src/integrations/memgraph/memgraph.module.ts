import { Module } from '@nestjs/common';
import { MemgraphService } from './memgraph.service';

@Module({
  providers: [MemgraphService],
  exports: [MemgraphService],
})
export class MemgraphModule {}
