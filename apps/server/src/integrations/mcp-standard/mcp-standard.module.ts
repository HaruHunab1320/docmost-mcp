import { Module } from '@nestjs/common';
import { MCPStandardController } from './mcp-standard.controller';
import { MCPStandardService } from './mcp-standard.service';
import { MCPModule } from '../mcp/mcp.module';
import { UserModule } from '../../core/user/user.module';

@Module({
  imports: [MCPModule, UserModule],
  controllers: [MCPStandardController],
  providers: [MCPStandardService],
  exports: [MCPStandardService],
})
export class MCPStandardModule {}