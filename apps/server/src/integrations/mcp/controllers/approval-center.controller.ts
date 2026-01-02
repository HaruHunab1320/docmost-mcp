import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { MCPApprovalService } from '../services/mcp-approval.service';
import { MCPService } from '../mcp.service';
import { User } from '@raven-docs/db/types/entity.types';
import { AgentMemoryService } from '../../../core/agent-memory/agent-memory.service';

@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalCenterController {
  constructor(
    private readonly approvalService: MCPApprovalService,
    private readonly mcpService: MCPService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('list')
  async list(@AuthUser() user: User) {
    return this.approvalService.listApprovals(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('confirm')
  async confirm(
    @Body() dto: { approvalToken: string },
    @AuthUser() user: User,
  ) {
    const approval = await this.approvalService.getApproval(
      user.id,
      dto.approvalToken,
    );
    if (!approval) {
      return { approved: false, error: 'Approval token invalid or expired' };
    }

    const result = await this.mcpService.processRequest(
      {
        jsonrpc: '2.0',
        method: approval.method,
        params: { ...approval.params, approvalToken: dto.approvalToken },
        id: Date.now(),
      },
      user,
    );

    if (result.error) {
      return { approved: false, error: result.error?.message };
    }

    await this.approvalService.deleteApproval(user.id, dto.approvalToken);

    await this.memoryService.ingestMemory({
      workspaceId: user.workspaceId || '',
      spaceId: approval.params?.spaceId || null,
      source: 'approval-event',
      summary: `Approval applied for ${approval.method}`,
      content: {
        token: dto.approvalToken,
        method: approval.method,
        spaceId: approval.params?.spaceId,
      },
      tags: ['approval-applied'],
    });

    return { approved: true, result: result.result };
  }

  @HttpCode(HttpStatus.OK)
  @Post('reject')
  async reject(
    @Body() dto: { approvalToken: string },
    @AuthUser() user: User,
  ) {
    await this.approvalService.deleteApproval(user.id, dto.approvalToken);
    return { deleted: true };
  }
}
