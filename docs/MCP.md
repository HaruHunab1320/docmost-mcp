# Model Context Protocol (MCP)

This is the canonical MCP reference for Raven Docs. It replaces legacy MCP
readmes and integration summaries.

## Overview

Raven Docs exposes MCP Standard directly at `/api/mcp-standard/*`. Internally it
uses a JSON-RPC 2.0 Master Control API (`/api/mcp`) and a WebSocket event
gateway for real-time updates.

## Architecture (High Level)

- **MCP Standard** (`apps/server/src/integrations/mcp-standard`): Public MCP
  interface for AI tools.
- **Master Control API** (`apps/server/src/integrations/mcp`): Internal JSON-RPC
  service used by MCP Standard.
- **WebSocket Events** (`apps/server/src/integrations/mcp/mcp-websocket.gateway.ts`):
  real-time events for pages, tasks, spaces, etc.
- **Approvals + Policy**: Sensitive actions require approval tokens; policy
  rules are enforced by the MCP gateway and the agent loop.

## Endpoints

- `POST /api/mcp-standard/initialize`
- `POST /api/mcp-standard/list_tools`
- `POST /api/mcp-standard/call_tool`
- `POST /api/mcp-standard/list_resources`
- `POST /api/mcp-standard/read_resource`
- `POST /api/mcp-standard/subscribe`
- `POST /api/mcp-standard/unsubscribe`
- `POST /api/mcp-standard/list_prompts`
- `POST /api/mcp-standard/get_prompt`
- `POST /api/mcp-standard/complete`

## Authentication

Use API keys:

```
Authorization: Bearer mcp_your_api_key_here
```

API keys are associated with a user + workspace and enforce the same
permissions as the issuing user.

## Approvals + Policy

Some methods require approvals. When a tool needs approval, the server returns
an `APPROVAL_REQUIRED` error with `approvalToken` and `expiresAt`.

Policy is enforced in:
- The **agent loop** (auto-apply vs approval vs deny).
- The **MCP gateway** (requests require approval or are denied).

Policy rules are configured in Workspace Settings → Agent Settings:
- **Allow auto-apply**: methods that can run without approval.
- **Require approval**: methods that must be approved.
- **Deny**: methods blocked entirely.

## Tool Coverage

MCP Standard exposes all JSON-RPC methods. See `docs/MCP_COVERAGE.md` for the
coverage matrix. Core tool groups include:

- Spaces, Pages, Comments, Attachments
- Projects + Tasks (including triage summary)
- Users, Groups, Workspaces
- Search, Import/Export
- Memory (ingest/query/daily/days)
- Approvals, Context, System, Navigation

## WebSocket Events

Events are emitted for changes made via MCP and propagate to the client. See
`docs/MCPEvents.md` for event types and client handling.

## Internal JSON-RPC (Master Control API)

The JSON-RPC service is used internally by MCP Standard. External tools should
use MCP Standard instead. See `docs/MasterControlAPI.md` for details.

## Quick Start (Cursor Example)

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
