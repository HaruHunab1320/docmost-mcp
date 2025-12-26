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

### Approval Flow

Some sensitive operations require explicit approval. If you call one of those
methods without an approval token, the server returns an `APPROVAL_REQUIRED`
error with an `approvalToken` and `expiresAt`. You can either:

1. Call the same tool again with `approvalToken` in the arguments, or
2. Use `approval_request` and `approval_confirm` explicitly.

### Available Tools

The integration provides access to all Raven Docs functionality through standard MCP tools:

#### Space Management
- `space_list` - List all spaces
- `space_get` - Get space details
- `space_create` - Create a new space
- `space_update` - Update space details
- `space_update_permissions` - Update space member permissions
- `space_members` - List space members
- `space_members_add` - Add members to a space
- `space_members_remove` - Remove a space member
- `space_change_member_role` - Change a space member role
- `space_delete` - Delete a space

#### Page Management
- `page_list` - List pages in a space
- `page_get` - Get page details
- `page_create` - Create a new page
- `page_update` - Update page content
- `page_delete` - Delete a page
- `page_move` - Move a page
- `page_search` - Search pages
- `page_get_history` - Get page history
- `page_history_info` - Get page history details
- `page_restore` - Restore a page history version
- `page_recent` - List recent pages
- `page_breadcrumbs` - Get page breadcrumbs
- `page_sidebar_pages` - List sidebar pages
- `page_move_to_space` - Move a page to another space

#### Project Management
- `project_list` - List projects in a space
- `project_get` - Get project details
- `project_create` - Create a project
- `project_update` - Update a project
- `project_archive` - Archive or unarchive a project
- `project_delete` - Delete a project
- `project_create_page` - Create a project home page

#### Task Management
- `task_list` - List tasks by project or space
- `task_get` - Get task details
- `task_create` - Create a task
- `task_update` - Update a task
- `task_delete` - Delete a task
- `task_complete` - Mark a task complete/incomplete
- `task_assign` - Assign or unassign a task
- `task_move_to_project` - Move a task to another project
- `task_bucket_set` - Set a task bucket
- `task_bucket_clear` - Clear a task bucket
- `task_triage_summary` - Get daily triage summary

#### User Management
- `user_list` - List workspace users
- `user_get` - Get user details
- `user_update` - Update user information

#### Comments
- `comment_create` - Create a comment
- `comment_get` - Get comment details
- `comment_list` - List comments
- `comment_update` - Update a comment
- `comment_delete` - Delete a comment
- `comment_resolve` - Resolve or unresolve a comment

#### Groups
- `group_create` - Create a group
- `group_list` - List groups
- `group_get` - Get group details
- `group_update` - Update a group
- `group_delete` - Delete a group
- `group_addMember` - Add member to group
- `group_remove_member` - Remove member from group

#### Workspaces
- `workspace_list` - List workspaces
- `workspace_get` - Get workspace details
- `workspace_create` - Create a workspace
- `workspace_update` - Update a workspace
- `workspace_delete` - Delete a workspace
- `workspace_add_member` - Invite a workspace member
- `workspace_remove_member` - Remove a workspace member
- `workspace_members` - List workspace members
- `workspace_change_member_role` - Change a workspace member role
- `workspace_delete_member` - Delete a workspace member
- `workspace_invites` - List workspace invites
- `workspace_invite_info` - Get invite info
- `workspace_invite_create` - Create invites
- `workspace_invite_resend` - Resend an invite
- `workspace_invite_revoke` - Revoke an invite
- `workspace_invite_link` - Get invite link
- `workspace_check_hostname` - Check hostname availability

#### Attachments
- `attachment_list` - List attachments
- `attachment_get` - Get attachment details
- `attachment_upload` - Upload an attachment
- `attachment_download` - Download an attachment
- `attachment_delete` - Delete an attachment

#### Search
- `search_query` - Search pages
- `search_suggest` - Get search suggestions

#### Import
- `import_request_upload` - Request a presigned upload URL
- `import_page` - Import a page from storage

#### Export
- `export_page` - Export a page
- `export_space` - Export a space

#### Approvals
- `approval_request` - Request approval for a sensitive operation
- `approval_confirm` - Confirm an approval token

#### AI
- `ai_generate` - Generate content with Gemini models

#### Memory
- `memory_ingest` - Store a new memory entry
- `memory_query` - Query memories with optional semantic search
- `memory_daily` - List memories for a given date
- `memory_days` - List recent days with memory counts

#### Navigation
- `ui_navigate` - Navigate to specific UI locations

#### System
- `system_list_methods` - List MCP methods
- `system_get_method_schema` - Get MCP method schema

#### Context
- `context_set` - Set a context value
- `context_get` - Get a context value
- `context_delete` - Delete a context key
- `context_list` - List context keys
- `context_clear` - Clear context for the session

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
