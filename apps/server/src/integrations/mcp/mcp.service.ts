import { Injectable, Logger } from '@nestjs/common';
import { MCPRequest, MCPResponse, MCPError } from './interfaces/mcp.interface';
import { PageHandler } from './handlers/page.handler';
import { SpaceHandler } from './handlers/space.handler';
import { UserHandler } from './handlers/user.handler';
import { GroupHandler } from './handlers/group.handler';
import { WorkspaceHandler } from './handlers/workspace.handler';
import { AttachmentHandler } from './handlers/attachment.handler';
import { CommentHandler } from './handlers/comment.handler';
import { SystemHandler } from './handlers/system.handler';
import { ContextHandler } from './handlers/context.handler';
import { UIHandler } from './handlers/ui.handler';
import { ProjectHandler } from './handlers/project.handler';
import { TaskHandler } from './handlers/task.handler';
import { ApprovalHandler } from './handlers/approval.handler';
import { SearchHandler } from './handlers/search.handler';
import { ImportHandler } from './handlers/import.handler';
import { ExportHandler } from './handlers/export.handler';
import { AIHandler } from './handlers/ai.handler';
import { MemoryHandler } from './handlers/memory.handler';
import { RepoHandler } from './handlers/repo.handler';
import { User } from '@raven-docs/db/types/entity.types';
import {
  createInternalError,
  createInvalidRequestError,
  createMethodNotFoundError,
  createParseError,
  createPermissionDeniedError,
  createApprovalRequiredError,
} from './utils/error.utils';
import { MCPApprovalService } from './services/mcp-approval.service';
import { AgentPolicyService } from '../../core/agent/agent-policy.service';
import { WorkspaceRepo } from '@raven-docs/db/repos/workspace/workspace.repo';
import { resolveAgentSettings } from '../../core/agent/agent-settings';

/**
 * Machine Control Protocol (MCP) Service
 *
 * This service is responsible for processing MCP requests and generating
 * appropriate responses. It serves as the central point for handling
 * all MCP operations.
 */
@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);

  constructor(
    private readonly pageHandler: PageHandler,
    private readonly spaceHandler: SpaceHandler,
    private readonly userHandler: UserHandler,
    private readonly groupHandler: GroupHandler,
    private readonly workspaceHandler: WorkspaceHandler,
    private readonly attachmentHandler: AttachmentHandler,
    private readonly commentHandler: CommentHandler,
    private readonly systemHandler: SystemHandler,
    private readonly contextHandler: ContextHandler,
    private readonly uiHandler: UIHandler,
    private readonly projectHandler: ProjectHandler,
    private readonly taskHandler: TaskHandler,
    private readonly approvalHandler: ApprovalHandler,
    private readonly approvalService: MCPApprovalService,
    private readonly policyService: AgentPolicyService,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly searchHandler: SearchHandler,
    private readonly importHandler: ImportHandler,
    private readonly exportHandler: ExportHandler,
    private readonly aiHandler: AIHandler,
    private readonly memoryHandler: MemoryHandler,
    private readonly repoHandler: RepoHandler,
  ) {}

  /**
   * Process an MCP request and generate a response
   *
   * @param request The incoming MCP request
   * @param user The authenticated user
   * @returns The MCP response
   */
  async processRequest(request: MCPRequest, user: User): Promise<MCPResponse> {
    this.logger.debug(
      `MCPService: Processing request ${request.method} from user ${user.email}`,
    );

    try {
      this.validateRequest(request);

      const [resource, operation] = request.method.split('.');
      this.logger.debug(
        `MCPService: Request for resource '${resource}', operation '${operation}'`,
      );

      // Add detailed debug logging for the resource
      this.logger.debug(
        `MCPService: Resource details - value: '${resource}', type: ${typeof resource}, length: ${resource.length}, charCodes: [${Array.from(resource).map((c) => c.charCodeAt(0))}]`,
      );

      let result: any;

      if (resource !== 'approval') {
        const approvalToken = request.params?.approvalToken as string | undefined;
        const needsPolicyCheck = this.policyService.isSupportedMethod(
          request.method,
        );
        const settings =
          needsPolicyCheck && user.workspaceId
            ? resolveAgentSettings(
                (await this.workspaceRepo.findById(user.workspaceId))?.settings,
              )
            : null;
        const policyDecision = settings
          ? this.policyService.evaluate(request.method, settings)
          : null;
        const policyRequiresApproval = policyDecision?.decision === 'approval';
        const policyDenied = policyDecision?.decision === 'deny';

        if (policyDenied) {
          throw createPermissionDeniedError({
            message: 'Denied by agent policy',
            method: request.method,
            reason: policyDecision?.reason,
          });
        }

        if (approvalToken) {
          const approved = await this.approvalService.consumeApproval(
            user.id,
            request.method,
            request.params || {},
            approvalToken,
          );

          if (!approved) {
            throw createApprovalRequiredError({
              message: 'Approval token invalid or expired',
              method: request.method,
            });
          }
        } else if (
          policyRequiresApproval ||
          this.approvalService.requiresApproval(request.method)
        ) {
          const approval = await this.approvalService.createApproval(
            user.id,
            request.method,
            request.params || {},
          );
          throw createApprovalRequiredError({
            message: 'Approval required for this operation',
            approvalToken: approval.token,
            expiresAt: approval.expiresAt,
            method: request.method,
            reason: policyDecision?.reason,
          });
        }
      }

      // Handle UI navigation as a special case first
      if (
        resource.trim().toLowerCase() === 'ui' &&
        operation.trim().toLowerCase() === 'navigate'
      ) {
        this.logger.debug(`MCPService: Special handling for UI navigation`);
        result = await this.handleUIRequest(operation, request.params, user.id);
      } else {
        // Handle other resources with the switch statement
        switch (resource) {
          case 'page':
            this.logger.debug(`MCPService: Delegating to page handler`);
            result = await this.handlePageRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'space':
            this.logger.debug(`MCPService: Delegating to space handler`);
            result = await this.handleSpaceRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'user':
            this.logger.debug(`MCPService: Delegating to user handler`);
            result = await this.handleUserRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'group':
            this.logger.debug(`MCPService: Delegating to group handler`);
            result = await this.handleGroupRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'workspace':
            this.logger.debug(`MCPService: Delegating to workspace handler`);
            result = await this.handleWorkspaceRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'attachment':
            this.logger.debug(`MCPService: Delegating to attachment handler`);
            result = await this.handleAttachmentRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'comment':
            this.logger.debug(`MCPService: Delegating to comment handler`);
            result = await this.handleCommentRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'project':
            this.logger.debug(`MCPService: Delegating to project handler`);
            result = await this.handleProjectRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'task':
            this.logger.debug(`MCPService: Delegating to task handler`);
            result = await this.handleTaskRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'system':
            this.logger.debug(`MCPService: Delegating to system handler`);
            result = await this.handleSystemRequest(operation, request.params);
            break;
          case 'context':
            this.logger.debug(`MCPService: Delegating to context handler`);
            result = await this.handleContextRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'ui':
          case 'UI':
          case ' ui':
          case 'ui ':
          case String(resource).trim().toLowerCase() === 'ui' ? resource : '':
            this.logger.debug(`MCPService: Delegating to UI handler`);
            result = await this.handleUIRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'approval':
            this.logger.debug(`MCPService: Delegating to approval handler`);
            result = await this.handleApprovalRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'search':
            this.logger.debug(`MCPService: Delegating to search handler`);
            result = await this.handleSearchRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'import':
            this.logger.debug(`MCPService: Delegating to import handler`);
            result = await this.handleImportRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'export':
            this.logger.debug(`MCPService: Delegating to export handler`);
            result = await this.handleExportRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'ai':
            this.logger.debug(`MCPService: Delegating to AI handler`);
            result = await this.handleAIRequest(operation, request.params);
            break;
          case 'memory':
            this.logger.debug(`MCPService: Delegating to memory handler`);
            result = await this.handleMemoryRequest(
              operation,
              request.params,
              user.id,
            );
            break;
          case 'repo':
            this.logger.debug(`MCPService: Delegating to repo handler`);
            result = await this.handleRepoRequest(
              operation,
              request.params,
              user,
            );
            break;
          default:
            this.logger.warn(`MCPService: Unsupported resource '${resource}'`);
            throw createMethodNotFoundError(request.method);
        }
      }

      this.logger.debug(
        `MCPService: Request ${request.id} completed successfully`,
      );

      return {
        jsonrpc: '2.0',
        result,
        id: request.id,
      };
    } catch (error: any) {
      this.logger.error(
        `MCPService: Error in processRequest - ${error.message || 'Unknown error'}`,
        error.stack,
      );

      // Return a properly formatted JSON-RPC error response
      return this.handleError(error, request.id);
    }
  }

  /**
   * Handle page-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handlePageRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.pageHandler.getPage(params, userId);
      case 'list':
        return this.pageHandler.listPages(params, userId);
      case 'create':
        return this.pageHandler.createPage(params, userId);
      case 'update':
        return this.pageHandler.updatePage(params, userId);
      case 'delete':
        return this.pageHandler.deletePage(params, userId);
      case 'move':
        return this.pageHandler.movePage(params, userId);
      case 'search':
        return this.pageHandler.searchPages(params, userId);
      case 'getHistory':
        return this.pageHandler.getPageHistory(params, userId);
      case 'historyInfo':
        return this.pageHandler.getPageHistoryInfo(params, userId);
      case 'restore':
        return this.pageHandler.restorePageVersion(params, userId);
      case 'recent':
        return this.pageHandler.getRecentPages(params, userId);
      case 'breadcrumbs':
        return this.pageHandler.getPageBreadcrumbs(params, userId);
      case 'sidebarPages':
        return this.pageHandler.getSidebarPages(params, userId);
      case 'moveToSpace':
        return this.pageHandler.movePageToSpace(params, userId);
      default:
        throw createMethodNotFoundError(`page.${operation}`);
    }
  }

  /**
   * Handle space-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleSpaceRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.spaceHandler.getSpace(params, userId);
      case 'list':
        return this.spaceHandler.listSpaces(params, userId);
      case 'create':
        return this.spaceHandler.createSpace(params, userId);
      case 'update':
        return this.spaceHandler.updateSpace(params, userId);
      case 'delete':
        return this.spaceHandler.deleteSpace(params, userId);
      case 'updatePermissions':
        return this.spaceHandler.updatePermissions(params, userId);
      case 'members':
        return this.spaceHandler.listMembers(params, userId);
      case 'membersAdd':
        return this.spaceHandler.addMembers(params, userId);
      case 'membersRemove':
        return this.spaceHandler.removeMember(params, userId);
      case 'changeMemberRole':
        return this.spaceHandler.changeMemberRole(params, userId);
      default:
        throw createMethodNotFoundError(`space.${operation}`);
    }
  }

  /**
   * Handle user-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleUserRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.userHandler.getUser(params, userId);
      case 'list':
        return this.userHandler.listUsers(params, userId);
      case 'update':
        return this.userHandler.updateUser(params, userId);
      default:
        throw createMethodNotFoundError(`user.${operation}`);
    }
  }

  /**
   * Handle group-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleGroupRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.groupHandler.getGroup(params, userId);
      case 'list':
        return this.groupHandler.listGroups(params, userId);
      case 'create':
        return this.groupHandler.createGroup(params, userId);
      case 'update':
        return this.groupHandler.updateGroup(params, userId);
      case 'delete':
        return this.groupHandler.deleteGroup(params, userId);
      case 'addMember':
        return this.groupHandler.addGroupMember(params, userId);
      case 'removeMember':
        return this.groupHandler.removeGroupMember(params, userId);
      default:
        throw createMethodNotFoundError(`group.${operation}`);
    }
  }

  /**
   * Handle workspace-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleWorkspaceRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.workspaceHandler.getWorkspace(params, userId);
      case 'list':
        return this.workspaceHandler.listWorkspaces(params, userId);
      case 'update':
        return this.workspaceHandler.updateWorkspace(params, userId);
      case 'create':
        return this.workspaceHandler.createWorkspace(params, userId);
      case 'delete':
        return this.workspaceHandler.deleteWorkspace(params, userId);
      case 'addMember':
        return this.workspaceHandler.addMember(params, userId);
      case 'removeMember':
        return this.workspaceHandler.removeMember(params, userId);
      case 'members':
        return this.workspaceHandler.listMembers(params, userId);
      case 'changeMemberRole':
        return this.workspaceHandler.changeMemberRole(params, userId);
      case 'deleteMember':
        return this.workspaceHandler.deleteMember(params, userId);
      case 'invites':
        return this.workspaceHandler.listInvites(params, userId);
      case 'inviteInfo':
        return this.workspaceHandler.inviteInfo(params, userId);
      case 'inviteCreate':
        return this.workspaceHandler.inviteCreate(params, userId);
      case 'inviteResend':
        return this.workspaceHandler.inviteResend(params, userId);
      case 'inviteRevoke':
        return this.workspaceHandler.inviteRevoke(params, userId);
      case 'inviteLink':
        return this.workspaceHandler.inviteLink(params, userId);
      case 'checkHostname':
        return this.workspaceHandler.checkHostname(params, userId);
      default:
        throw createMethodNotFoundError(`workspace.${operation}`);
    }
  }

  /**
   * Handle attachment-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the user making the request
   * @returns The operation result
   */
  private async handleAttachmentRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'list':
        return this.attachmentHandler.listAttachments(params, userId);
      case 'get':
        return this.attachmentHandler.getAttachment(params, userId);
      case 'upload':
        return this.attachmentHandler.uploadAttachment(params, userId);
      case 'download':
        return this.attachmentHandler.downloadAttachment(params, userId);
      case 'delete':
        return this.attachmentHandler.deleteAttachment(params, userId);
      default:
        throw createMethodNotFoundError(`attachment.${operation}`);
    }
  }

  /**
   * Handle memory-related requests
   */
  private async handleMemoryRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'ingest':
        return this.memoryHandler.ingest(params, userId);
      case 'query':
        return this.memoryHandler.query(params, userId);
      case 'daily':
        return this.memoryHandler.daily(params, userId);
      case 'days':
        return this.memoryHandler.days(params, userId);
      default:
        throw createMethodNotFoundError(`memory.${operation}`);
    }
  }

  private async handleRepoRequest(
    operation: string,
    params: any,
    user: User,
  ): Promise<any> {
    switch (operation) {
      case 'listTree':
        return this.repoHandler.listTree(params, user);
      case 'readFile':
        return this.repoHandler.readFile(params, user);
      default:
        throw createMethodNotFoundError(`repo.${operation}`);
    }
  }

  /**
   * Handle comment-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleCommentRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'create':
        return this.commentHandler.createComment(params, userId);
      case 'get':
        return this.commentHandler.getComment(params, userId);
      case 'list':
        return this.commentHandler.listComments(params, userId);
      case 'update':
        return this.commentHandler.updateComment(params, userId);
      case 'delete':
        return this.commentHandler.deleteComment(params, userId);
      case 'resolve':
        return this.commentHandler.resolveComment(params, userId);
      default:
        throw createMethodNotFoundError(`comment.${operation}`);
    }
  }

  /**
   * Handle project-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleProjectRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.projectHandler.getProject(params, userId);
      case 'list':
        return this.projectHandler.listProjects(params, userId);
      case 'create':
        return this.projectHandler.createProject(params, userId);
      case 'update':
        return this.projectHandler.updateProject(params, userId);
      case 'delete':
        return this.projectHandler.deleteProject(params, userId);
      case 'archive':
        return this.projectHandler.archiveProject(params, userId);
      case 'createPage':
        return this.projectHandler.createProjectPage(params, userId);
      default:
        throw createMethodNotFoundError(`project.${operation}`);
    }
  }

  /**
   * Handle task-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleTaskRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'get':
        return this.taskHandler.getTask(params, userId);
      case 'list':
        return this.taskHandler.listTasks(params, userId);
      case 'create':
        return this.taskHandler.createTask(params, userId);
      case 'update':
        return this.taskHandler.updateTask(params, userId);
      case 'delete':
        return this.taskHandler.deleteTask(params, userId);
      case 'complete':
        return this.taskHandler.completeTask(params, userId);
      case 'assign':
        return this.taskHandler.assignTask(params, userId);
      case 'moveToProject':
        return this.taskHandler.moveToProject(params, userId);
      case 'triageSummary':
        return this.taskHandler.triageSummary(params, userId);
      default:
        throw createMethodNotFoundError(`task.${operation}`);
    }
  }

  /**
   * Handle system-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @returns The operation result
   */
  private async handleSystemRequest(
    operation: string,
    params: any,
  ): Promise<any> {
    switch (operation) {
      case 'listMethods':
        return this.systemHandler.listMethods();
      case 'getMethodSchema':
        return this.systemHandler.getMethodSchema(params);
      default:
        throw createMethodNotFoundError(`system.${operation}`);
    }
  }

  /**
   * Handle context-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleContextRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'set':
        return this.contextHandler.setContext(params, userId);
      case 'get':
        return this.contextHandler.getContext(params, userId);
      case 'delete':
        return this.contextHandler.deleteContext(params, userId);
      case 'list':
        return this.contextHandler.listContextKeys(params, userId);
      case 'clear':
        return this.contextHandler.clearSessionContext(params, userId);
      default:
        throw createMethodNotFoundError(`context.${operation}`);
    }
  }

  /**
   * Handle UI-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleUIRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    this.logger.debug(`Handling UI request: ${operation}`, params);
    switch (operation) {
      case 'navigate':
        return this.uiHandler.navigate(params, userId);
      default:
        throw createMethodNotFoundError(`ui.${operation}`);
    }
  }

  /**
   * Handle approval-related requests
   *
   * @param operation The operation to perform
   * @param params The operation parameters
   * @param userId The ID of the authenticated user
   * @returns The operation result
   */
  private async handleApprovalRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'request':
        return this.approvalHandler.requestApproval(params, userId);
      case 'confirm':
        return this.approvalHandler.confirmApproval(params, userId);
      default:
        throw createMethodNotFoundError(`approval.${operation}`);
    }
  }

  /**
   * Handle search-related requests
   */
  private async handleSearchRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'query':
        return this.searchHandler.searchPages(params, userId);
      case 'suggest':
        return this.searchHandler.searchSuggestions(params, userId);
      default:
        throw createMethodNotFoundError(`search.${operation}`);
    }
  }

  /**
   * Handle import-related requests
   */
  private async handleImportRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'requestUpload':
        return this.importHandler.requestUpload(params, userId);
      case 'page':
        return this.importHandler.importPage(params, userId);
      default:
        throw createMethodNotFoundError(`import.${operation}`);
    }
  }

  /**
   * Handle export-related requests
   */
  private async handleExportRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'page':
        return this.exportHandler.exportPage(params, userId);
      case 'space':
        return this.exportHandler.exportSpace(params, userId);
      default:
        throw createMethodNotFoundError(`export.${operation}`);
    }
  }

  /**
   * Handle AI-related requests
   */
  private async handleAIRequest(operation: string, params: any): Promise<any> {
    switch (operation) {
      case 'generate':
        return this.aiHandler.generate(params);
      default:
        throw createMethodNotFoundError(`ai.${operation}`);
    }
  }

  /**
   * Validate an MCP request
   *
   * @param request The MCP request to validate
   */
  private validateRequest(request: MCPRequest): void {
    if (!request) {
      throw createParseError('Invalid request');
    }

    if (request.jsonrpc !== '2.0') {
      throw createInvalidRequestError('Unsupported JSON-RPC version');
    }

    if (!request.method || typeof request.method !== 'string') {
      throw createInvalidRequestError('Method must be a string');
    }

    if (!request.method.includes('.')) {
      throw createInvalidRequestError(
        'Method must be in format "resource.operation"',
      );
    }

    if (request.id === undefined || request.id === null) {
      throw createInvalidRequestError('Id is required');
    }
  }

  /**
   * Handle an error that occurred during request processing
   *
   * @param error The error that occurred
   * @param id The request id
   * @returns An MCP error response
   */
  private handleError(error: any, id: string | number | null): MCPResponse {
    this.logger.error('Error processing MCP request', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error
    ) {
      return {
        jsonrpc: '2.0',
        error: error,
        id: id || null,
      };
    }

    return {
      jsonrpc: '2.0',
      error: createInternalError(error?.message || String(error)),
      id: id || null,
    };
  }
}
