# MCP Architecture Refactor Required

## Current Issue

The current MCP (Model Context Protocol) bridge implementation has a fundamental architectural flaw: it requires hardcoded user and workspace IDs in environment variables. This approach doesn't work for a multi-user SaaS application where:

1. Multiple users need to use the same MCP bridge
2. Each user has their own workspaces and permissions
3. API keys should be self-contained authentication tokens

## Current (Flawed) Architecture

```bash
# Current .env.mcp configuration
MCP_USER_ID=hardcoded-user-id
MCP_WORKSPACE_ID=hardcoded-workspace-id
MCP_USER_EMAIL=user@example.com
MCP_API_KEY=api_key_here
```

This means only ONE user can use the MCP bridge at a time, which defeats the purpose of a multi-user system.

## Proposed Architecture

### 1. API Key Should Be Self-Contained

The API key should contain all necessary context:
- User ID (derived from the key)
- Allowed workspace IDs
- Permissions/scopes

### 2. Server-Side Changes

The MCP endpoints should:
1. Validate the API key
2. Extract user/workspace context from the validated key
3. Use that context for all operations

```typescript
// Example of proper API key validation
async validateApiKey(key: string): Promise<ApiKeyContext> {
  const apiKey = await this.apiKeyRepo.findByKey(key);
  if (!apiKey || !apiKey.isActive) {
    throw new UnauthorizedException('Invalid API key');
  }
  
  return {
    userId: apiKey.userId,
    workspaceId: apiKey.workspaceId,
    permissions: apiKey.permissions
  };
}
```

### 3. MCP Bridge Changes

The bridge should only need:
```bash
# Proper .env.mcp configuration
MCP_SERVER_URL=http://localhost:3333
MCP_API_KEY=your_api_key_here
# That's it! Everything else comes from the API key
```

### 4. Multi-Workspace Support

If a user has access to multiple workspaces, the API could:
1. Accept an optional `workspaceId` parameter in requests
2. Default to the user's primary workspace
3. Validate the user has access to the requested workspace

## Implementation Steps

1. **Update API Key Model**: Add workspace associations and permissions to API keys
2. **Refactor MCP Service**: Extract user/workspace from API key instead of expecting them in requests
3. **Update MCP Bridge**: Remove hardcoded IDs, pass API key with all requests
4. **Add Workspace Selection**: For operations that need workspace context, allow it as a parameter

## Benefits

1. **True Multi-User Support**: Each user gets their own API key
2. **Security**: No need to share user/workspace IDs
3. **Scalability**: Works for unlimited users
4. **Simplicity**: Users only need to manage one API key

## Temporary Workaround

Until this refactor is complete, users must:
1. Create an API key for their specific user/workspace
2. Configure `.env.mcp` with their hardcoded IDs
3. Understand this limits the bridge to single-user mode

This architectural change is critical for Docmost to function as a proper multi-user collaborative platform.