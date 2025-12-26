import { Injectable } from '@nestjs/common';
import { MCPApprovalService } from '../../integrations/mcp/services/mcp-approval.service';
import { AgentSettings } from './agent-settings';

type PolicyDecision = {
  decision: 'auto' | 'approval' | 'deny';
  reason: string;
};

@Injectable()
export class AgentPolicyService {
  private readonly methodPermissions: Record<string, keyof AgentSettings> = {
    'task.create': 'allowTaskWrites',
    'task.update': 'allowTaskWrites',
    'page.create': 'allowPageWrites',
    'project.create': 'allowProjectWrites',
  };

  constructor(private readonly approvalService: MCPApprovalService) {}

  evaluate(method: string, settings: AgentSettings): PolicyDecision {
    const permissionKey = this.methodPermissions[method];
    if (!permissionKey) {
      return { decision: 'deny', reason: 'unsupported-method' };
    }

    const policy = settings.policy || {};
    const denyList = new Set(policy.deny || []);
    const requireApprovalList = new Set(policy.requireApproval || []);
    const allowAutoList = new Set(policy.allowAutoApply || []);

    if (denyList.has(method)) {
      return { decision: 'deny', reason: 'policy-deny' };
    }

    const writesAllowed = Boolean(settings[permissionKey]);
    if (!writesAllowed) {
      return { decision: 'approval', reason: 'writes-disabled' };
    }

    if (requireApprovalList.has(method)) {
      return { decision: 'approval', reason: 'policy-approval' };
    }

    if (this.approvalService.requiresApproval(method)) {
      return { decision: 'approval', reason: 'sensitive-method' };
    }

    if (allowAutoList.size > 0 && !allowAutoList.has(method)) {
      return { decision: 'approval', reason: 'policy-approval' };
    }

    if (allowAutoList.has(method)) {
      return { decision: 'auto', reason: 'policy-auto' };
    }

    return { decision: 'auto', reason: 'writes-allowed' };
  }

  canAutoApply(method: string, settings: AgentSettings): boolean {
    return this.evaluate(method, settings).decision === 'auto';
  }

  requiresApproval(method: string, settings: AgentSettings): boolean {
    return this.evaluate(method, settings).decision === 'approval';
  }

  isSupportedMethod(method: string): boolean {
    return !!this.methodPermissions[method];
  }
}
