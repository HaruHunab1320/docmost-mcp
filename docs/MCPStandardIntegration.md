# MCP Standard Integration in Raven Docs

The standard Model Context Protocol (MCP) has been integrated directly into the Raven Docs server, eliminating the need for a separate bridge server.

## What's New

Instead of running a separate MCP bridge server, the Raven Docs server now includes built-in support for the standard MCP protocol at `/api/mcp-standard/*` endpoints. This provides better performance and simplifies deployment.

## Configuration for AI Tools

### For Cursor

Add to your `.cursorrules` or MCP configuration:

```json
{
  "mcpServers": {
    "raven-docs": {
      "url": "http://localhost:3000/api/mcp-standard",
      "apiKey": "mcp_your_api_key_here"
    }
  }
}
```

### API Endpoints

The following standard MCP endpoints are available:

- `POST /api/mcp-standard/initialize` - Initialize connection
- `POST /api/mcp-standard/list_tools` - List available tools
- `POST /api/mcp-standard/call_tool` - Call a specific tool
- `POST /api/mcp-standard/list_resources` - List available resources
- `POST /api/mcp-standard/read_resource` - Read a specific resource
- `POST /api/mcp-standard/subscribe` - Subscribe to resource updates
- `POST /api/mcp-standard/unsubscribe` - Unsubscribe from updates
- `POST /api/mcp-standard/list_prompts` - List available prompts
- `POST /api/mcp-standard/get_prompt` - Get a specific prompt
- `POST /api/mcp-standard/complete` - Complete text

### Authentication

All endpoints (except `initialize` and `list_tools`) require authentication via API key:

```
Authorization: Bearer mcp_your_api_key_here
```

### Available Tools

The integration provides access to all Raven Docs functionality through standard MCP tools:

#### Space Management
- `space_list` - List all spaces
- `space_create` - Create a new space
- `space_update` - Update space details
- `space_delete` - Delete a space

#### Page Management
- `page_list` - List pages in a space
- `page_create` - Create a new page
- `page_update` - Update page content
- `page_delete` - Delete a page
- `page_move` - Move a page

#### User Management
- `user_list` - List workspace users
- `user_get` - Get user details
- `user_update` - Update user information

#### Comments
- `comment_create` - Create a comment
- `comment_list` - List comments
- `comment_update` - Update a comment
- `comment_delete` - Delete a comment

#### Groups
- `group_create` - Create a group
- `group_list` - List groups
- `group_addMember` - Add member to group

#### Navigation
- `ui_navigate` - Navigate to specific UI locations

### Example Usage

```javascript
// Initialize connection
const response = await fetch('http://localhost:3000/api/mcp-standard/initialize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    protocolVersion: '2024-11-05',
    capabilities: {}
  })
});

// List available tools
const tools = await fetch('http://localhost:3000/api/mcp-standard/list_tools', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Call a tool (requires authentication)
const result = await fetch('http://localhost:3000/api/mcp-standard/call_tool', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mcp_your_api_key_here'
  },
  body: JSON.stringify({
    name: 'page_create',
    arguments: {
      title: 'My New Page',
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'This is my page content'
          }]
        }]
      },
      spaceId: 'space-123',
      workspaceId: 'workspace-456'
    }
  })
});
```

## Migration from Bridge Server

If you were previously using the separate MCP bridge server:

1. Stop the bridge server process
2. Update your AI tool configuration to use the new endpoints
3. Use the same API keys - they work with both systems

The integrated implementation is fully compatible with the bridge server's protocol, so no changes to your tools or workflows are needed beyond updating the endpoint URLs.

## Benefits

- **No separate server needed** - Everything runs in the main Raven Docs process
- **Better performance** - Direct integration eliminates network overhead
- **Simplified deployment** - One less service to manage
- **Consistent authentication** - Uses the same API key system
- **Full compatibility** - Works with all MCP-compatible AI tools
