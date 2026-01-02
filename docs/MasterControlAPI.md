# Master Control API: JSON-RPC 2.0 Server (Internal)

This document describes the internal JSON-RPC API used by MCP Standard. External
tools should use MCP Standard (`docs/MCP.md`) instead.

## Overview

The Master Control API is a JSON-RPC 2.0 compliant server used internally by the MCP Standard service to access Raven Docs functionality. External integrations should use `/api/mcp-standard/*`.

## Architecture

The Master Control API follows a layered architecture:

```
┌─────────────────┐
│ MCP Controller  │ ← Internal HTTP Endpoint (/api/mcp)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MCP Service   │ ← Method Dispatch
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Resource Handlers│ ← Business Logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Services  │ ← Data Access
└─────────────────┘
```

### Core Components

1. **MCP Controller** (`mcp.controller.ts`):
   - Internal HTTP endpoint `/api/mcp` used by the MCP Standard service
   - Handles authentication through guards
   - Validates the JSON-RPC request structure
   - Delegates processing to the MCP service

2. **MCP Service** (`mcp.service.ts`):
   - Parses the method name to identify resource and operation
   - Routes requests to the appropriate handler
   - Formats successful responses
   - Handles error cases and generates error responses

3. **Resource Handlers**:
   - Implement business logic for specific resources
   - Enforce permissions and validation
   - Interact with data services to perform operations
   - Emit events for real-time updates

4. **Guards**:
   - `MCPAuthGuard`: Authenticates requests using JWT or API key
   - `MCPApiKeyGuard`: Validates API keys
   - `MCPPermissionGuard`: Ensures users have required permissions

## JSON-RPC Implementation

The API implements the [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification) with the following features:

### Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "resource.operation",
  "params": {
    "param1": "value1",
    "param2": "value2"
  },
  "id": 1
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "result": {
    "key": "value"
  },
  "id": 1
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Additional error information"
    }
  },
  "id": 1
}
```

### Batch Requests

The API supports batch requests, allowing multiple operations to be executed in a single HTTP request:

```json
[
  {"jsonrpc": "2.0", "method": "space.list", "params": {"workspaceId": "123"}, "id": 1},
  {"jsonrpc": "2.0", "method": "page.list", "params": {"spaceId": "456"}, "id": 2}
]
```

## Method Structure

Methods follow a consistent naming pattern:

```
resource.operation
```

Examples:
- `space.create`
- `page.update`
- `comment.delete`
- `user.list`

## Controller Implementation

The controller is implemented using NestJS:

```typescript
@Controller('api/mcp')
@UseGuards(MCPAuthGuard, MCPPermissionGuard)
export class MCPController {
  constructor(private readonly mcpService: MCPService) {}

  @Post()
  async handleRequest(
    @Body() body: any,
    @Req() request: Request,
  ): Promise<any> {
    const user = request.user;
    
    // Handle batch requests
    if (Array.isArray(body)) {
      return Promise.all(
        body.map(item => this.mcpService.processRequest(item, user)),
      );
    }
    
    // Handle single request
    return this.mcpService.processRequest(body, user);
  }
}
```

## Service Implementation

The MCP service handles method resolution and dispatching:

```typescript
@Injectable()
export class MCPService {
  constructor(
    private readonly spaceHandler: SpaceHandler,
    private readonly pageHandler: PageHandler,
    // Other handlers...
  ) {}

  async processRequest(request: any, user: User): Promise<any> {
    // Validate JSON-RPC request
    if (!this.isValidJsonRpcRequest(request)) {
      return this.createErrorResponse(request.id, -32600, 'Invalid Request');
    }

    try {
      // Parse method name (e.g., "space.list")
      const [resource, operation] = request.method.split('.');
      
      // Handle the request based on the resource
      const result = await this.handleRequest(
        resource,
        operation,
        request.params || {},
        user.id,
      );
      
      // Return successful response
      return {
        jsonrpc: '2.0',
        result,
        id: request.id,
      };
    } catch (error) {
      // Handle errors
      return this.handleError(request.id, error);
    }
  }

  private async handleRequest(
    resource: string,
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (resource) {
      case 'space':
        return this.handleSpaceRequest(operation, params, userId);
      case 'page':
        return this.handlePageRequest(operation, params, userId);
      // Other resources...
      default:
        throw createMethodNotFoundError(`${resource}.${operation}`);
    }
  }

  private async handleSpaceRequest(
    operation: string,
    params: any,
    userId: string,
  ): Promise<any> {
    switch (operation) {
      case 'create':
        return this.spaceHandler.createSpace(params, userId);
      case 'list':
        return this.spaceHandler.listSpaces(params, userId);
      case 'get':
        return this.spaceHandler.getSpace(params, userId);
      case 'update':
        return this.spaceHandler.updateSpace(params, userId);
      case 'delete':
        return this.spaceHandler.deleteSpace(params, userId);
      default:
        throw createMethodNotFoundError(`space.${operation}`);
    }
  }

  // Similar methods for other resources...
}
```

## Resource Handlers

Each resource type has a dedicated handler:

```typescript
@Injectable()
export class SpaceHandler {
  constructor(
    private readonly spaceService: SpaceService,
    private readonly mcpEventService: MCPEventService,
  ) {}

  async createSpace(params: any, userId: string): Promise<any> {
    const { name, description, workspaceId } = params;
    
    // Validate parameters
    if (!name || !workspaceId) {
      throw createInvalidParamsError('Missing required parameters');
    }
    
    // Create the space
    const createdSpace = await this.spaceService.createSpace({
      name,
      description,
      workspaceId,
      creatorId: userId,
    });
    
    // Emit event for real-time updates
    this.mcpEventService.emitEvent({
      type: MCPEventType.SPACE_CREATED,
      resourceType: MCPResourceType.SPACE,
      operationType: MCPOperationType.CREATE,
      workspaceId,
      userId,
      data: {
        space: createdSpace,
      },
    });
    
    return { space: createdSpace };
  }

  // Other methods for space operations...
}
```

## Error Handling

The API uses standardized JSON-RPC error codes:

| Code | Message | Meaning |
|------|---------|---------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist / is not available |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 to -32099 | Server error | Reserved for implementation-defined server errors |

Additional custom error codes:

| Code | Message | Meaning |
|------|---------|---------|
| -32001 | Authentication error | User is not authenticated |
| -32002 | Permission error | User does not have permission |
| -32003 | Not found | Requested resource not found |
| -32004 | Validation error | Request validation failed |

## Authentication and Authorization

### Authentication

Requests are authenticated using either:

1. **JWT Token**: Standard user authentication token
2. **API Key**: Special MCP API key (format: `mcp_...`)

The `MCPAuthGuard` attempts JWT authentication first, then falls back to API key:

```typescript
@Injectable()
export class MCPAuthGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly mcpApiKeyGuard: MCPApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try JWT authentication first
      return await this.jwtAuthGuard.canActivate(context);
    } catch (error) {
      // Fall back to API key authentication
      return this.mcpApiKeyGuard.canActivate(context);
    }
  }
}
```

### Authorization

The `MCPPermissionGuard` checks if the authenticated user has the necessary permissions for the requested operation:

```typescript
@Injectable()
export class MCPPermissionGuard implements CanActivate {
  constructor(
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;
    
    // Get required permission for this method
    const permission = this.getRequiredPermission(body.method, body.params);
    
    if (!permission) {
      return true; // No permission required
    }
    
    // Check if user has the required permission
    return this.permissionService.hasPermission(
      user.id,
      permission,
      body.params.workspaceId,
    );
  }

  private getRequiredPermission(method: string, params: any): string {
    // Map methods to required permissions
    const permissionMap: Record<string, string> = {
      'space.create': 'space:create',
      'space.update': 'space:update',
      'space.delete': 'space:delete',
      // Other mappings...
    };
    
    return permissionMap[method];
  }
}
```

## Extending the API

To add a new method to the API:

1. **Create a handler method** in the appropriate resource handler:

```typescript
async newOperation(params: any, userId: string): Promise<any> {
  // Implementation...
}
```

2. **Add the method to the switch statement** in the service:

```typescript
switch (operation) {
  // Existing cases...
  case 'newOperation':
    return this.resourceHandler.newOperation(params, userId);
  default:
    throw createMethodNotFoundError(`resource.${operation}`);
}
```

3. **Add permission requirements** to the permission guard

4. **Add event emission** if needed:

```typescript
this.mcpEventService.emitEvent({
  type: MCPEventType.RESOURCE_NEW_OPERATION,
  resourceType: MCPResourceType.RESOURCE,
  operationType: MCPOperationType.CUSTOM,
  workspaceId: params.workspaceId,
  userId,
  data: {
    // Operation-specific data
  },
});
```

## API Reference

Below is a reference of all available methods in the Master Control API:

### Space Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `space.create` | Create a new space | `name`, `description`, `workspaceId` | Created space object |
| `space.list` | List spaces | `workspaceId` | Array of space objects |
| `space.get` | Get space details | `spaceId`, `workspaceId` | Space object |
| `space.update` | Update a space | `spaceId`, `name`, `description`, `workspaceId` | Updated space object |
| `space.delete` | Delete a space | `spaceId`, `workspaceId` | Success indicator |

### Page Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `page.create` | Create a new page | `title`, `content`, `spaceId`, `parentId?`, `workspaceId` | Created page object |
| `page.list` | List pages | `spaceId`, `workspaceId` | Array of page objects |
| `page.get` | Get page details | `pageId`, `workspaceId` | Page object with content |
| `page.update` | Update a page | `pageId`, `title?`, `content?`, `workspaceId` | Updated page object |
| `page.delete` | Delete a page | `pageId`, `workspaceId` | Success indicator |
| `page.move` | Move a page | `pageId`, `parentId?`, `targetSpaceId?`, `workspaceId` | Updated page object |

### Project Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `project.list` | List projects in a space | `spaceId`, `page?`, `limit?`, `includeArchived?`, `searchTerm?` | Array of project objects |
| `project.get` | Get project details | `projectId` | Project object |
| `project.create` | Create a project | `name`, `spaceId`, `workspaceId`, `description?`, `icon?`, `color?`, `startDate?`, `endDate?` | Created project object |
| `project.update` | Update a project | `projectId`, `name?`, `description?`, `icon?`, `color?`, `coverImage?`, `startDate?`, `endDate?` | Updated project object |
| `project.archive` | Archive or unarchive a project | `projectId`, `isArchived` | Updated project object |
| `project.delete` | Delete a project | `projectId` | Success indicator |
| `project.createPage` | Create project home page | `projectId`, `workspaceId` | Updated project object |

### Task Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `task.list` | List tasks by project or space | `projectId?`, `spaceId?`, `page?`, `limit?`, `status?`, `bucket?`, `searchTerm?`, `includeSubtasks?` | Array of task objects |
| `task.get` | Get task details | `taskId` | Task object |
| `task.create` | Create a task | `title`, `spaceId`, `workspaceId`, `description?`, `status?`, `priority?`, `bucket?`, `dueDate?`, `projectId?`, `parentTaskId?`, `pageId?`, `assigneeId?`, `estimatedTime?` | Created task object |
| `task.update` | Update a task | `taskId`, `title?`, `description?`, `status?`, `priority?`, `bucket?`, `dueDate?`, `assigneeId?`, `pageId?`, `estimatedTime?`, `position?` | Updated task object |
| `task.delete` | Delete a task | `taskId` | Success indicator |
| `task.complete` | Mark task complete/incomplete | `taskId`, `isCompleted` | Updated task object |
| `task.assign` | Assign or unassign a task | `taskId`, `assigneeId?` | Updated task object |
| `task.moveToProject` | Move task to another project | `taskId`, `projectId?` | Updated task object |

### Comment Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `comment.create` | Create a comment | `pageId`, `content`, `parentCommentId?`, `workspaceId` | Created comment object |
| `comment.list` | List comments | `pageId`, `workspaceId` | Array of comment objects |
| `comment.update` | Update a comment | `commentId`, `content`, `workspaceId` | Updated comment object |
| `comment.delete` | Delete a comment | `commentId`, `workspaceId` | Success indicator |

### User Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `user.list` | List users | `workspaceId` | Array of user objects |
| `user.get` | Get user details | `userId`, `workspaceId` | User object |
| `user.update` | Update a user | `userId`, `name?`, `title?`, `workspaceId` | Updated user object |

### Group Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `group.create` | Create a group | `name`, `description?`, `workspaceId` | Created group object |
| `group.list` | List groups | `workspaceId` | Array of group objects |
| `group.update` | Update a group | `groupId`, `name?`, `description?`, `workspaceId` | Updated group object |
| `group.delete` | Delete a group | `groupId`, `workspaceId` | Success indicator |
| `group.addMember` | Add user to group | `groupId`, `userId`, `workspaceId` | Success indicator |
| `group.removeMember` | Remove user from group | `groupId`, `userId`, `workspaceId` | Success indicator |

### Workspace Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `workspace.list` | List workspaces | | Array of workspace objects |
| `workspace.get` | Get workspace details | `workspaceId` | Workspace object |
| `workspace.update` | Update a workspace | `workspaceId`, `name?`, `description?` | Updated workspace object |
| `workspace.addMember` | Add user to workspace | `workspaceId`, `userId`, `role` | Success indicator |
| `workspace.removeMember` | Remove user from workspace | `workspaceId`, `userId` | Success indicator |

### UI Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `ui.navigate` | Navigate the UI | `destination`, `spaceId?`, `pageId?`, `workspaceId` | Success indicator |

### System Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `system.info` | Get system information | | System info object |
| `system.health` | Check system health | | Health status object |

## Security Considerations

1. **Authentication**: All requests must be authenticated
2. **Authorization**: Users can only access resources they have permission for
3. **Validation**: All parameters are validated before processing
4. **Rate Limiting**: Requests are subject to rate limiting
5. **Audit Logging**: All operations are logged for auditing purposes

## Example Usage (Internal)

This endpoint is internal. External integrations should use `/api/mcp-standard/*`.

Example request:

```javascript
const response = await fetch("https://your-raven-docs-instance.com/api/mcp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer mcp_your_api_key_here"
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "page.create",
    params: {
      title: "New Page",
      content: { 
        type: "doc", 
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello, world!"
              }
            ]
          }
        ] 
      },
      spaceId: "space-id",
      workspaceId: "workspace-id"
    },
    id: 1
  })
});

const result = await response.json();
console.log(result);
```

## Future Improvements

1. **Schema Validation**: Add JSON Schema validation for all method parameters
2. **Method Versioning**: Implement versioned methods for backward compatibility
3. **Subscription Support**: Add WebSocket-based subscription for real-time updates
4. **Documentation Generation**: Auto-generate API documentation from code
5. **Metrics and Monitoring**: Add detailed metrics for API usage and performance 
