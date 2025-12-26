import { Injectable } from '@nestjs/common';
import { MCPApprovalService } from '../../integrations/mcp/services/mcp-approval.service';
import { AgentSettings } from './agent-settings';

@Injectable()
export class AgentPolicyService {
  private readonly methodPermissions: Record<string, keyof AgentSettings> = {
    'task.create': 'allowTaskWrites',
    'task.update': 'allowTaskWrites',
    'page.create': 'allowPageWrites',
    'project.create': 'allowProjectWrites',
  };

  constructor(private readonly approvalService: MCPApprovalService) {}

  canAutoApply(method: string, settings: AgentSettings): boolean {
    const permissionKey = this.methodPermissions[method];
    if (!permissionKey) {
      return false;
    }

    if (!settings[permissionKey]) {
      return false;
    }

    if (this.approvalService.requiresApproval(method)) {
      return false;
    }

    return true;
  }

  requiresApproval(method: string, settings: AgentSettings): boolean {
    const permissionKey = this.methodPermissions[method];
    if (!permissionKey) {
      return false;
    }

    if (!settings[permissionKey]) {
      return true;
    }

    return this.approvalService.requiresApproval(method);
  }

  isSupportedMethod(method: string): boolean {
    return !!this.methodPermissions[method];
  }
}
