import { Injectable, Logger } from '@nestjs/common';
import { MCPContextService } from './mcp-context.service';
import { createHash, randomBytes } from 'crypto';

interface ApprovalPayload {
  userId: string;
  method: string;
  paramsHash: string;
  expiresAt: string;
  params: Record<string, any>;
}

@Injectable()
export class MCPApprovalService {
  private readonly logger = new Logger(MCPApprovalService.name);

  private readonly defaultRequiredMethods = new Set<string>([
    'workspace.delete',
    'workspace.removeMember',
    'space.delete',
    'page.delete',
    'project.delete',
    'task.delete',
    'attachment.delete',
    'group.delete',
  ]);

  constructor(private readonly contextService: MCPContextService) {}

  isEnabled(): boolean {
    const value = process.env.MCP_APPROVAL_ENABLED;
    if (value === undefined) {
      return true;
    }
    return value.toLowerCase() !== 'false';
  }

  requiresApproval(method: string): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    const configured = process.env.MCP_APPROVAL_METHODS;
    if (configured !== undefined) {
      const methods = configured
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      return methods.includes(method);
    }

    return this.defaultRequiredMethods.has(method);
  }

  async createApproval(
    userId: string,
    method: string,
    params: Record<string, any>,
    ttlSeconds: number = 300,
  ): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(16).toString('hex');
    const paramsHash = this.hashParams(params);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const payload: ApprovalPayload = {
      userId,
      method,
      paramsHash,
      expiresAt,
      params: this.sanitizeParams(params),
    };

    await this.contextService.setContext(
      userId,
      this.getContextKey(token),
      payload,
      ttlSeconds,
    );

    return { token, expiresAt };
  }

  async consumeApproval(
    userId: string,
    method: string,
    params: Record<string, any>,
    token: string,
  ): Promise<boolean> {
    const payload = (await this.contextService.getContext(
      userId,
      this.getContextKey(token),
    )) as ApprovalPayload | null;

    if (!payload) {
      return false;
    }

    if (payload.userId !== userId || payload.method !== method) {
      return false;
    }

    const paramsHash = this.hashParams(params);
    if (payload.paramsHash !== paramsHash) {
      return false;
    }

    await this.contextService.deleteContext(userId, this.getContextKey(token));
    return true;
  }

  async getApproval(userId: string, token: string): Promise<ApprovalPayload | null> {
    return (await this.contextService.getContext(
      userId,
      this.getContextKey(token),
    )) as ApprovalPayload | null;
  }

  async listApprovals(userId: string): Promise<
    Array<{ token: string; method: string; params: Record<string, any>; expiresAt: string }>
  > {
    const keys = await this.contextService.listContextKeys(userId);
    const approvals = keys.filter((key) => key.startsWith('approval:'));
    const results: Array<{ token: string; method: string; params: Record<string, any>; expiresAt: string }> = [];
    for (const key of approvals) {
      const token = key.replace('approval:', '');
      const payload = await this.getApproval(userId, token);
      if (payload) {
        results.push({
          token,
          method: payload.method,
          params: payload.params || {},
          expiresAt: payload.expiresAt,
        });
      }
    }
    return results.sort((a, b) => (a.expiresAt < b.expiresAt ? -1 : 1));
  }

  async deleteApproval(userId: string, token: string): Promise<void> {
    await this.contextService.deleteContext(userId, this.getContextKey(token));
  }

  private getContextKey(token: string): string {
    return `approval:${token}`;
  }

  private hashParams(params: Record<string, any>): string {
    const sanitized = this.sanitizeParams(params);
    const serialized = this.stableStringify(sanitized);
    return createHash('sha256').update(serialized).digest('hex');
  }

  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    if (!params) {
      return {};
    }
    const { approvalToken, ...rest } = params as any;
    return rest;
  }

  private stableStringify(value: any): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      const entries = keys.map(
        (key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`,
      );
      return `{${entries.join(',')}}`;
    }

    return JSON.stringify(value);
  }
}
