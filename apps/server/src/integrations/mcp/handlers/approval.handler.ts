import { Injectable, Logger } from '@nestjs/common';
import {
  createInvalidParamsError,
  createInternalError,
} from '../utils/error.utils';
import { MCPApprovalService } from '../services/mcp-approval.service';

@Injectable()
export class ApprovalHandler {
  private readonly logger = new Logger(ApprovalHandler.name);

  constructor(private readonly approvalService: MCPApprovalService) {}

  async requestApproval(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing approval.request for user ${userId}`);

    if (!params?.method) {
      throw createInvalidParamsError('method is required');
    }

    try {
      const ttlSeconds = params.ttlSeconds || 300;
      const { token, expiresAt } = await this.approvalService.createApproval(
        userId,
        params.method,
        params.params || {},
        ttlSeconds,
      );

      return {
        approvalToken: token,
        expiresAt,
        method: params.method,
      };
    } catch (error: any) {
      this.logger.error(
        `Error creating approval token: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }

  async confirmApproval(params: any, userId: string): Promise<any> {
    this.logger.debug(`Processing approval.confirm for user ${userId}`);

    if (!params?.approvalToken) {
      throw createInvalidParamsError('approvalToken is required');
    }

    if (!params?.method) {
      throw createInvalidParamsError('method is required');
    }

    try {
      const ok = await this.approvalService.consumeApproval(
        userId,
        params.method,
        params.params || {},
        params.approvalToken,
      );

      return { approved: ok };
    } catch (error: any) {
      this.logger.error(
        `Error confirming approval token: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      if (error?.code && typeof error.code === 'number') {
        throw error;
      }
      throw createInternalError(error?.message || String(error));
    }
  }
}
