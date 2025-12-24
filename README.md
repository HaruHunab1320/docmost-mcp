<div align="center">
    <h1><b>Raven Docs</b></h1>
    <p>
        A second-brain workspace for docs, projects, and GTD-style planning.
        <br />
        <a href="https://github.com/docmost/docmost"><strong>Upstream Docmost</strong></a>
    </p>
</div>
<br />

## Getting started

To get started with Raven Docs, see `README-NEW.md` for setup and use the upstream Docmost docs for baseline reference.

## Origin

Raven Docs is built on the Docmost codebase and continues to evolve with its own product direction.

## Features

- Real-time collaboration
- Diagrams (Draw.io, Excalidraw and Mermaid)
- Spaces
- Permissions management
- Groups
- Comments
- Page history
- Search
- File attachments
- Embeds (Airtable, Loom, Miro and more)
- Translations (10+ languages)
- Projects and task management
- GTD-style Inbox, Triage, Waiting, Someday, and Weekly Review views
- Daily notes and journal capture
- AI Integration via Model Context Protocol (MCP) *(HaruHunab1320 extension)*

## API Integrations (HaruHunab1320 Extensions)

> **Note**: The following API integrations are extensions developed by HaruHunab1320 and are not part of the upstream Docmost project.

### Master Control API (Internal)

Raven Docs includes a JSON-RPC 2.0 API that powers the MCP standard service internally. It is not intended as a public endpoint. The MCP standard interface exposes the supported capabilities.

- Managing spaces, pages, and comments
- User and workspace administration
- Group management
- File uploads and attachments
- UI navigation and control

The MCP Standard API is the supported public interface for agents and automation tools.

### Model Context Protocol (MCP) Integration

This extension implements a bridge between Raven Docs and AI assistants using the Model Context Protocol.

Raven Docs integrates with AI assistants through the [Model Context Protocol](https://modelcontextprotocol.ai/), allowing AI models to:

- Create, read, update, and delete content
- Get contextual information about workspaces, spaces, and pages
- Interact with comments
- Navigate the UI
- Perform user management tasks

This integration enables seamless AI-assisted workflows within your documentation and knowledge base.

#### Using with Cursor

Raven Docs exposes the standard MCP protocol directly at `/api/mcp-standard`, so no separate bridge process is required:

1. Configure your Cursor settings to use the built-in MCP server:
   ```json
   {
     "mcpServers": {
       "raven-docs": {
         "url": "http://localhost:3000/api/mcp-standard",
         "apiKey": "your_api_key_here"
       }
     }
   }
   ```

2. Create an API key for your Raven Docs server:
   ```sh
   ./register-mcp-api-key.sh "Cursor MCP"
   ```

3. Use the generated API key in your Cursor configuration.

4. Start using tools directly from Cursor to interact with your Raven Docs content!

#### Available MCP Tools

The MCP Standard service provides the following tool categories:

**Content Management**
- `space_create`, `space_list`, `space_update`, `space_delete`: Manage spaces
- `page_create`, `page_list`, `page_update`, `page_delete`, `page_move`: Manage pages
- `comment_create`, `comment_list`, `comment_update`, `comment_delete`: Manage comments
- `attachment_upload`, `attachment_list`, `attachment_get`, `attachment_download`, `attachment_delete`: Manage file attachments

**User Management**
- `user_list`, `user_get`, `user_update`: Manage users
- `group_create`, `group_list`, `group_update`, `group_delete`, `group_addMember`, `group_removeMember`: Manage groups
- `workspace_create`, `workspace_list`, `workspace_update`, `workspace_delete`, `workspace_addMember`, `workspace_removeMember`: Manage workspaces

**UI Control**
- `ui_navigate`: Navigate to specific destinations in the Raven Docs interface

Each tool accepts specific parameters and can be called directly from AI assistants that support the Model Context Protocol.

### Screenshots

<p align="center">
<img alt="home" src="https://docmost.com/screenshots/home.png" width="70%">
<img alt="editor" src="https://docmost.com/screenshots/editor.png" width="70%">
</p>

### License
Raven Docs inherits the Docmost core licensed under the open-source AGPL 3.0 license.  
Enterprise features are available under an enterprise license (Enterprise Edition).  

All files in the following directories are licensed under the Docmost Enterprise license defined in `packages/ee/License`.
  - apps/server/src/ee
  - apps/client/src/ee
  - packages/ee

### Contributing

See the upstream [development documentation](https://docmost.com/docs/self-hosting/development)
