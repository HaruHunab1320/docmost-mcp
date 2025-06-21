# Model Context Protocol Integration

## Overview

The Model Context Protocol (MCP) integration in Docmost enables AI assistants like Claude to directly interact with the documentation platform. This document explains how the MCP integration works, its architecture, and how to extend it.

## What is the Model Context Protocol?

The [Model Context Protocol](https://modelcontextprotocol.ai/) (MCP) is a standardized interface for AI models to interact with external tools and services. It provides a consistent way for AI assistants to:

1. Discover available tools
2. Understand tool capabilities and parameter requirements
3. Call tools with appropriate parameters
4. Process tool responses

## Architecture

The MCP integration for Docmost consists of three main components:

### 1. MCP Bridge (`packages/mcp-bridge/`)

The MCP Bridge acts as an adapter between AI assistants and the Docmost API:

```
┌─────────────┐      ┌───────────────┐      ┌─────────────┐
│             │      │               │      │             │
│ AI Assistant│<────>│   MCP Bridge  │<────>│ Docmost API │
│             │      │               │      │             │
└─────────────┘      └───────────────┘      └─────────────┘
     (Cursor)          (MCP Server)          (JSON-RPC API)
```

### 2. Master Control API (`apps/server/src/integrations/mcp/`)

A JSON-RPC 2.0 API that provides a uniform interface to all Docmost functionality.

### 3. WebSocket Events (`apps/client/src/features/websocket/`)

Real-time event system that notifies clients about changes made through the MCP API.

## MCP Bridge Implementation

The MCP Bridge is implemented using the `@modelcontextprotocol/sdk` package and consists of:

### Main Components

1. **MCP Server** (`index.ts`):
   - Initializes the MCP protocol server
   - Registers tools based on resource definitions
   - Handles parameter transformation
   - Routes requests to the Docmost API

2. **Resource Definitions** (`resources.ts`):
   - Defines Zod schemas for all resources
   - Implements handlers for each operation
   - Maps tool parameters to API parameters

3. **API Client** (`api.ts`):
   - Handles communication with the Docmost API
   - Formats requests as JSON-RPC
   - Manages authentication

### Tool Registration Process

Each tool in the MCP Bridge follows this registration pattern:

```typescript
server.tool(
  toolName,                 // e.g., "space_list"
  operation.description,    // Human-readable description
  zodSchema,                // Parameter schema
  async (params) => {
    // Transform parameters if needed
    // Special handling for specific operations
    
    // Make API request
    const result = await makeRequest(`${resource.name}.${opName}`, params);
    
    // Return formatted response
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);
```

### Parameter Handling

The MCP Bridge includes special handling for various parameter types:

1. **Comment Content Transformation**:
   ```typescript
   if (resource.name === "comment" && opName === "create" && params.text) {
     params.content = { text: params.text };
     delete params.text;
   }
   ```

2. **Parent ID Mapping**:
   ```typescript
   if (params.parentId) {
     params.parentCommentId = params.parentId;
     delete params.parentId;
   }
   ```

3. **Page Move Special Handling**:
   ```typescript
   if (resource.name === "page" && opName === "move" && params.spaceId) {
     const { spaceId, ...restParams } = params;
     params = { ...restParams, targetSpaceId: spaceId };
   }
   ```

## Master Control API Implementation

The Master Control API is built on NestJS and implements the JSON-RPC 2.0 specification:

### Key Components

1. **Controller** (`mcp.controller.ts`):
   - HTTP endpoint for JSON-RPC requests
   - Request validation
   - Authentication and authorization
   - Error handling

2. **Service** (`mcp.service.ts`):
   - Routing requests to appropriate handlers
   - Response formatting
   - Method resolution

3. **Handlers** (e.g., `space.handler.ts`):
   - Business logic for each resource
   - Permission checks
   - Data access

### Request Flow

1. Client sends a JSON-RPC request to `/api/mcp`
2. Request is authenticated using JWT or API key
3. Request is validated according to JSON-RPC spec
4. Method is resolved to a handler (e.g., "space.list" → SpaceHandler.listSpaces)
5. Handler performs the operation
6. Result is returned as a JSON-RPC response

## WebSocket Events

The MCP integration includes a WebSocket component for real-time updates:

1. **Server Gateway** (`mcp-websocket.gateway.ts`):
   - Broadcasts events for MCP operations
   - Handles socket authentication and connections

2. **Client Hook** (`use-mcp-events.ts`):
   - Connects to the WebSocket server
   - Handles incoming events
   - Updates UI based on events

## Events Implementation

The MCP operations emit events that are broadcast to connected clients:

```typescript
// Server-side event emission
this.mcpEventService.emitEvent({
  type: MCPEventType.SPACE_CREATED,
  resourceType: MCPResourceType.SPACE,
  operationType: MCPOperationType.CREATE,
  workspaceId,
  data: {
    space: createdSpace,
  },
});

// Client-side event handling
useEffect(() => {
  if (socket) {
    socket.on("mcp:event", (event: MCPEvent) => {
      if (event.type === MCPEventType.SPACE_CREATED) {
        // Update UI
      }
    });
  }
}, [socket]);
```

## Tool Categories

The MCP bridge exposes the following tool categories:

### Content Management

- **Space Management**:
  - `space_create`: Create a new space
  - `space_list`: List spaces in a workspace
  - `space_update`: Update a space
  - `space_delete`: Delete a space

- **Page Management**:
  - `page_create`: Create a new page
  - `page_list`: List pages in a space
  - `page_update`: Update a page
  - `page_delete`: Delete a page
  - `page_move`: Move a page to a different parent or space

- **Comment Management**:
  - `comment_create`: Create a comment
  - `comment_list`: List comments on a page
  - `comment_update`: Update a comment
  - `comment_delete`: Delete a comment

- **Attachment Management**:
  - `attachment_upload`: Upload a file attachment
  - `attachment_list`: List attachments for a page
  - `attachment_get`: Get attachment details
  - `attachment_download`: Download an attachment
  - `attachment_delete`: Delete an attachment

### User Management

- `user_list`: List users in a workspace
- `user_get`: Get a user's details
- `user_update`: Update a user

### Group Management

- `group_create`: Create a user group
- `group_list`: List groups in a workspace
- `group_update`: Update a group
- `group_delete`: Delete a group
- `group_addMember`: Add a user to a group
- `group_removeMember`: Remove a user from a group

### Workspace Management

- `workspace_create`: Create a workspace
- `workspace_list`: List workspaces
- `workspace_update`: Update a workspace
- `workspace_delete`: Delete a workspace
- `workspace_addMember`: Add a member to a workspace
- `workspace_removeMember`: Remove a member from a workspace

### UI Control

- `ui_navigate`: Navigate to a specific destination in the UI

## Extending the MCP Integration

To add new tools to the MCP bridge:

1. **Add a new operation to a resource in `resources.ts`**:
   ```typescript
   operations: {
     // Existing operations...
     newOperation: {
       description: "Description of the new operation",
       handler: async (params: z.infer<typeof newOperationSchema>) => {
         return makeRequest("resource.newOperation", newOperationSchema, params);
       },
     },
   },
   ```

2. **Implement the handler in the appropriate handler file**:
   ```typescript
   async handleNewOperation(params: any, userId: string): Promise<any> {
     // Implementation...
   }
   ```

3. **Add the method to the switch statement in the service**:
   ```typescript
   switch (operation) {
     // Existing cases...
     case 'newOperation':
       return this.resourceHandler.handleNewOperation(params, userId);
     default:
       throw createMethodNotFoundError(`resource.${operation}`);
   }
   ```

4. **Add an event type if needed**:
   ```typescript
   export enum MCPEventType {
     // Existing events...
     RESOURCE_NEW_OPERATION = 'resource.newOperation',
   }
   ```

## Next Steps and Improvements

1. **Code Organization**:
   - Split large files into modules
   - Standardize parameter handling

2. **Error Handling**:
   - More specific error messages
   - Better error reporting to AI assistants

3. **Schema Improvements**:
   - Consolidate schema definitions
   - Better parameter descriptions for AI assistants

4. **Tool Discoverability**:
   - Improved tool descriptions
   - Example parameters for common operations

5. **Context Gathering**:
   - Enhanced context for AI operations
   - More sophisticated context filtering 