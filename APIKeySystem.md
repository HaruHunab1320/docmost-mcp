# API Key Authentication System

## Overview

The Raven Docs MCP extension uses a specialized API key system to authenticate requests to the Master Control API. This document explains the API key system design, implementation, and usage.

## Key Components

### 1. API Key Structure

API keys have a specific format to distinguish them from other authentication tokens:

```
mcp_a68e63ded924146c3b53b00ef47f8e73193e01b5eeaa3ae67cd63b99357acc08
```

- Prefix: `mcp_` to identify it as an MCP API key
- Body: A random hex string (typically SHA-256 based)

### 2. Storage and Security

**Key Repository**: `MCPApiKeyRepo`
- API keys are never stored in plain text
- Only the hashed version of the key is stored in the database
- Each key is associated with a specific user and workspace
- Additional metadata includes:
  - Creation date
  - Last used date
  - Key name (for management)

### 3. Key Generation Process

API keys are generated through the `register-mcp-api-key.sh` script, which:

1. Takes a user ID and workspace ID as inputs
2. Validates these against the server
3. Generates a unique random token with the `mcp_` prefix
4. Hashes the token for storage
5. Associates the hashed token with the user and workspace
6. Returns the plain text token to the user (only shown once)

### 4. Authentication Flow

The authentication process involves multiple guards:

1. **MCPAuthGuard**: The primary guard that attempts:
   - JWT authentication first (for regular user sessions)
   - API key authentication as fallback

2. **MCPApiKeyGuard**: Specialized API key validator that:
   - Extracts the Bearer token from the Authorization header
   - Validates the `mcp_` prefix
   - Hashes the token and looks it up in the database
   - Loads the associated user and workspace
   - Attaches the user context to the request

3. **MCPPermissionGuard**: Ensures the authenticated user has permission for the requested operation

## Implementation Details

### MCP API Key Service

The `MCPApiKeyService` provides methods for:

1. **Creating API keys**:
   ```typescript
   createApiKey(userId: string, workspaceId: string, name: string): Promise<string>
   ```

2. **Validating API keys**:
   ```typescript
   validateApiKey(apiKey: string): Promise<{ userId: string; workspaceId: string } | null>
   ```

3. **Listing user's API keys**:
   ```typescript
   listApiKeys(userId: string, workspaceId: string): Promise<MCPApiKeyInfo[]>
   ```

4. **Revoking API keys**:
   ```typescript
   revokeApiKey(apiKeyId: string, userId: string): Promise<boolean>
   ```

### API Key Security Considerations

1. **Key Hashing**: API keys are hashed using a secure one-way function before storage
2. **Transport Security**: Keys should only be transmitted over HTTPS
3. **Revocation**: Keys can be immediately revoked if compromised
4. **Scoped Access**: Each key is bound to a specific user and inherits their permissions

## MCP Bridge Configuration

The MCP bridge uses the API key to authenticate with the Raven Docs server:

```json
{
  "mcpServers": {
    "raven-docs": {
      "command": "npx",
      "args": [
        "tsx",
        "./packages/mcp-bridge/src/index.ts"
      ],
      "env": {
        "MCP_DEBUG": "true",
        "MCP_SERVER_URL": "http://localhost:3000",
        "MCP_API_KEY": "mcp_a68e63ded924146c3b53b00ef47f8e73193e01b5eeaa3ae67cd63b99357acc08",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Usage Examples

### Creating an API Key

Terminal:
```bash
./register-mcp-api-key.sh "Cursor MCP Bridge"
```

HTTP Request:
```bash
curl -X POST http://localhost:3000/api/api-keys/register \
  -H "Content-Type: application/json" \
  -H "x-registration-token: $APP_SECRET" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"workspaceId\": \"$WORKSPACE_ID\",
    \"name\": \"$KEY_NAME\"
  }"
```

### Using an API Key

```typescript
const response = await fetch("http://localhost:3000/api/mcp", {
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
      content: { type: "doc", content: [] },
      spaceId: "space-id",
      workspaceId: "workspace-id"
    },
    id: 1
  })
});
```

## Current Limitations and Potential Improvements

1. **Key Scoping**: Keys are currently scoped to a user's full permissions; more granular permission scoping could be added
2. **Key Rotation**: Automatic key rotation is not implemented but would enhance security
3. **Usage Limits**: Rate limiting per API key is not currently implemented
4. **Audit Logging**: More comprehensive logging of API key usage could be added 
