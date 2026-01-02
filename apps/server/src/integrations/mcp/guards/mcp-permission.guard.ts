import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { MCPRequest } from '../interfaces/mcp.interface';
import { User } from '@raven-docs/db/types/entity.types';
import { UserRole } from '../../../common/helpers/types/permission';

/**
 * Permission levels for MCP operations
 */
export enum MCPPermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

/**
 * Guard for MCP operation-level permissions
 *
 * This guard checks if the user has the required permission level
 * to perform a specific MCP operation.
 */
@Injectable()
export class MCPPermissionGuard implements CanActivate {
  private readonly logger = new Logger(MCPPermissionGuard.name);

  // Permission requirements for each resource.operation
  private readonly permissionMap = {
    // Page operations
    'page.get': MCPPermissionLevel.READ,
    'page.list': MCPPermissionLevel.READ,
    'page.create': MCPPermissionLevel.WRITE,
    'page.update': MCPPermissionLevel.WRITE,
    'page.delete': MCPPermissionLevel.WRITE,

    // Space operations
    'space.get': MCPPermissionLevel.READ,
    'space.list': MCPPermissionLevel.READ,
    'space.create': MCPPermissionLevel.WRITE,
    'space.update': MCPPermissionLevel.ADMIN,
    'space.delete': MCPPermissionLevel.ADMIN,

    // User operations
    'user.get': MCPPermissionLevel.READ,
    'user.list': MCPPermissionLevel.READ,
    'user.update': MCPPermissionLevel.ADMIN,

    // Group operations
    'group.get': MCPPermissionLevel.READ,
    'group.list': MCPPermissionLevel.READ,
    'group.create': MCPPermissionLevel.ADMIN,
    'group.update': MCPPermissionLevel.ADMIN,
    'group.delete': MCPPermissionLevel.ADMIN,
    'group.addMember': MCPPermissionLevel.ADMIN,
    'group.removeMember': MCPPermissionLevel.ADMIN,

    // Workspace operations
    'workspace.get': MCPPermissionLevel.READ,
    'workspace.update': MCPPermissionLevel.ADMIN,
    'workspace.create': MCPPermissionLevel.ADMIN,
    'workspace.addMember': MCPPermissionLevel.ADMIN,
    'workspace.removeMember': MCPPermissionLevel.ADMIN,

    // Attachment operations
    'attachment.get': MCPPermissionLevel.READ,
    'attachment.list': MCPPermissionLevel.READ,
    'attachment.upload': MCPPermissionLevel.WRITE,
    'attachment.download': MCPPermissionLevel.READ,
    'attachment.delete': MCPPermissionLevel.WRITE,

    // Comment operations
    'comment.get': MCPPermissionLevel.READ,
    'comment.list': MCPPermissionLevel.READ,
    'comment.create': MCPPermissionLevel.WRITE,
    'comment.update': MCPPermissionLevel.WRITE,
    'comment.delete': MCPPermissionLevel.WRITE,

    // Memory operations
    'memory.ingest': MCPPermissionLevel.WRITE,
    'memory.query': MCPPermissionLevel.READ,
    'memory.daily': MCPPermissionLevel.READ,
    'memory.days': MCPPermissionLevel.READ,

    // Repo operations
    'repo.listTree': MCPPermissionLevel.READ,
    'repo.readFile': MCPPermissionLevel.READ,

    // UI operations
    'ui.navigate': MCPPermissionLevel.ADMIN,

    // Default to admin for any operation not explicitly defined
    default: MCPPermissionLevel.ADMIN,
  };

  constructor() {}

  /**
   * Check if the user can activate the route
   *
   * @param context The execution context
   * @returns true if the user has permission, false otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user?.user || request.user;
    const mcpRequest: MCPRequest = request.body;

    if (!user) {
      this.logger.warn('User not found in request');
      throw new UnauthorizedException('User not authenticated');
    }

    if (!mcpRequest || !mcpRequest.method) {
      // Not an MCP request, or method validation will be handled elsewhere
      return true;
    }

    return this.hasPermission(mcpRequest.method, user);
  }

  /**
   * Check if a user has permission to perform an operation
   *
   * @param method The MCP method
   * @param user The user
   * @returns true if the user has permission, false otherwise
   */
  private hasPermission(method: string, user: User): boolean {
    // Get the required permission level for the method
    const requiredLevel =
      this.permissionMap[method] || this.permissionMap.default;

    const role = (user.role || '').toLowerCase();
    const isAdmin = role === UserRole.ADMIN || role === UserRole.OWNER;

    const allowed =
      requiredLevel === MCPPermissionLevel.READ
        ? true
        : requiredLevel === MCPPermissionLevel.WRITE
          ? role === UserRole.MEMBER || isAdmin
          : isAdmin;

    this.logger.debug(
      `Checking permission for method ${method}, required level: ${requiredLevel}`,
    );

    return allowed;
  }
}
