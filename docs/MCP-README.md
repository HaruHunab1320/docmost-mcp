# Raven Docs Machine Control Protocol (MCP)

## Introduction

The Machine Control Protocol (MCP) is an initiative to add programmatic control capabilities to Raven Docs, allowing external systems and automation tools to interact with all Raven Docs functionalities.

## What is MCP?

MCP is a standardized protocol for tool-enabled AI integrations. Raven Docs exposes MCP Standard over HTTP to allow AI tools to call server capabilities.

- Creating, reading, updating, and deleting Raven Docs resources
- Managing projects, tasks, and GTD buckets
- Real-time interactions with the Raven Docs platform
- Automation of workflows
- Integration with external systems and tools

## Why MCP?

Raven Docs is a powerful documentation and collaboration platform, but currently lacks a comprehensive API for machine control. The MCP initiative aims to fill this gap by providing:

1. **Automation Capabilities**: Enable users to automate repetitive tasks
2. **Integration Possibilities**: Allow Raven Docs to work seamlessly with other tools in the user's workflow
3. **Extensibility**: Enable the development of third-party plugins and extensions
4. **Machine-to-Machine Communication**: Support AI-driven workflows and bot interactions

## Getting Started

Raven Docs exposes the standard MCP protocol at `/api/mcp-standard`. The JSON-RPC Master Control API is internal and used by the MCP standard service.

### For Users

To use the MCP API:

1. Create an MCP API key from your Raven Docs workspace settings or via the API
2. Use one of our client SDKs or make direct API calls using the API key
3. Follow the MCP API documentation for detailed instructions

API keys provide a secure way to authenticate with the MCP API without needing user interaction, making them ideal for automation and integration scenarios.

### For Developers

If you're interested in contributing to the MCP implementation:

1. Review the [MCP Implementation Plan](./mcp-implementation-plan.md)
2. Set up the upstream Docmost development environment following the [official documentation](https://docmost.com/docs/self-hosting/development/)
3. Check the progress tracking section to identify areas where you can contribute

## Implementation Status

The MCP implementation includes full support for API key authentication, making it easier to build integrations and automations with Raven Docs.

## Examples

Here's a simple example of how to use MCP Standard with API key authentication to create a new page:

```javascript
// Example: Creating a new page via MCP
const mcpRequest = {
  spaceId: "space-123",
  title: "My New Page",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "This is the content of my new page" }]
      }
    ]
  },
  parentPageId: "parent-page-456" // Optional
};

// Sending the request with API key authentication
const response = await fetch("https://example.raven-docs.local/api/mcp-standard/call_tool", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer mcp_your_api_key_here"
  },
  body: JSON.stringify({
    name: "page_create",
    arguments: mcpRequest.params
  })
});

const result = await response.json();
// result.result will contain the created page information
```

Here's a memory example that stores a daily reflection:

```javascript
const memoryRequest = {
  workspaceId: "workspace-123",
  spaceId: "space-456",
  source: "agent",
  summary: "Daily reflection",
  content: {
    text: "Noted progress on the Raven Docs memory UI and MCP tools."
  },
  tags: ["journal", "raven-docs"]
};

const memoryResponse = await fetch("https://example.raven-docs.local/api/mcp-standard/call_tool", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer mcp_your_api_key_here"
  },
  body: JSON.stringify({
    name: "memory_ingest",
    arguments: memoryRequest
  })
});

const memoryResult = await memoryResponse.json();
```

## Future Roadmap

After the initial MCP implementation, we plan to:

1. Develop language-specific SDKs (JavaScript, Python, Go, etc.)
2. Provide integration examples with popular tools and platforms
3. Support webhook capabilities for event-driven architectures
4. Create a plugin marketplace for MCP-based extensions

## Contributing

Contributions to the MCP initiative are welcome! Please check the [MCP Implementation Plan](./mcp-implementation-plan.md) to see where help is needed.

## License

The MCP implementation is part of the Raven Docs project and follows the same licensing terms.

## API Keys

The MCP supports authentication via API keys, which allow applications to access the MCP API without requiring user interaction.

### Managing API Keys

API keys can be managed through the following endpoints:

- `POST /api/api-keys`: Create a new API key
- `GET /api/api-keys`: List all API keys for the current user
- `DELETE /api/api-keys/:id`: Revoke an API key

Only users with administrative privileges can create API keys. API keys are associated with both a user and a workspace, allowing the MCP to enforce the same permissions as the user who created the key.

### Using API Keys

API keys can be used in place of JWTs for authentication by including them in the `Authorization` header:

```
Authorization: Bearer mcp_your_api_key_here
```

When using API keys, all operations will be performed with the permissions of the user who created the key.

**Important**: API keys should be kept secure and should not be shared or exposed in client-side code. If an API key is compromised, it should be revoked immediately.

---

For more information about Docmost, visit [docmost.com](https://docmost.com). 
