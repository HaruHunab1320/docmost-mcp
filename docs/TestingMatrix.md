# Testing Matrix

This matrix maps critical workflows to API endpoints and MCP tools.

## Auth + Workspace

- **Setup workspace**
  - REST: `POST /api/auth/setup`
  - MCP Standard: `workspace_update`, `space_create`
  - JSON-RPC: `workspace.update`, `space.create`

- **Login**
  - REST: `POST /api/auth/login`
  - MCP: N/A (session auth)

## Capture + Triage

- **Create task (Inbox)**
  - REST: `POST /api/tasks/create`
  - MCP Standard: `task_create`
  - JSON-RPC: `task.create`

- **Move to Waiting/Someday**
  - REST: `POST /api/tasks/update`
  - MCP Standard: `task_update`
  - JSON-RPC: `task.update`

- **Triage summary**
  - REST: `POST /api/tasks/triageSummary`
  - MCP Standard: `task_triage_summary`
  - JSON-RPC: `task.triageSummary`

## Projects + Tasks

- **Create project**
  - REST: `POST /api/projects/create`
  - MCP Standard: `project_create`
  - JSON-RPC: `project.create`

- **Create project task**
  - REST: `POST /api/tasks/create`
  - MCP Standard: `task_create`
  - JSON-RPC: `task.create`

- **Move task between projects**
  - REST: `POST /api/tasks/moveToProject`
  - MCP Standard: `task_move_to_project`
  - JSON-RPC: `task.moveToProject`

- **Assign task**
  - REST: `POST /api/tasks/assign`
  - MCP Standard: `task_assign`
  - JSON-RPC: `task.assign`

- **Complete task**
  - REST: `POST /api/tasks/complete`
  - MCP Standard: `task_complete`
  - JSON-RPC: `task.complete`

- **Bucket set/clear**
  - REST: `POST /api/tasks/update`
  - MCP Standard: `task_bucket_set`, `task_bucket_clear`
  - JSON-RPC: `task.update`

- **Label CRUD**
  - REST: `POST /api/tasks/labels/list|create|update|delete`
  - MCP Standard: N/A
  - JSON-RPC: N/A

- **Label assign/remove**
  - REST: `POST /api/tasks/labels/assign|remove`
  - MCP Standard: N/A
  - JSON-RPC: N/A

## Pages + Editor

- **Create page**
  - REST: `POST /api/pages/create`
  - MCP Standard: `page_create`
  - JSON-RPC: `page.create`

- **Update page**
  - REST: `POST /api/pages/update`
  - MCP Standard: `page_update`
  - JSON-RPC: `page.update`

- **Delete page**
  - REST: `POST /api/pages/delete`
  - MCP Standard: `page_delete`
  - JSON-RPC: `page.delete`

- **Move page**
  - REST: `POST /api/pages/move`
  - MCP Standard: `page_move`
  - JSON-RPC: `page.move`

- **Page history**
  - REST: `POST /api/pages/history`
  - MCP Standard: `page_get_history`
  - JSON-RPC: `page.history`

## Comments

- **Create comment**
  - REST: `POST /api/comments/create`
  - MCP Standard: `comment_create`
  - JSON-RPC: `comment.create`

- **Resolve comment**
  - REST: `POST /api/comments/resolve`
  - MCP Standard: `comment_resolve`
  - JSON-RPC: `comment.resolve`

## Attachments

- **Upload file**
  - REST: `POST /api/files/upload`
  - MCP Standard: `attachment_upload`
  - JSON-RPC: `attachment.upload`

- **Delete attachment**
  - REST: `POST /api/attachments/delete`
  - MCP Standard: `attachment_delete`
  - JSON-RPC: `attachment.delete`

- **Download attachment**
  - REST: `GET /api/files/:fileId/:fileName`
  - MCP Standard: `attachment_download`
  - JSON-RPC: `attachment.download`

## Search

- **Search**
  - REST: `POST /api/search`
  - MCP Standard: `search_query`
  - JSON-RPC: `search.query`

- **Suggest**
  - REST: `POST /api/search/suggest`
  - MCP Standard: `search_suggest`
  - JSON-RPC: `search.suggest`

## Agent + Autonomy

- **Run loop**
  - REST: `POST /api/agent/loop/run`
  - MCP Standard: N/A (REST only)
  - JSON-RPC: N/A

- **Approvals list**
  - REST: `POST /api/approvals/list`
  - MCP Standard: N/A (REST only)
  - JSON-RPC: N/A

- **Approve action**
  - REST: `POST /api/approvals/confirm`
  - MCP Standard: `approval_confirm`
  - JSON-RPC: `approval.confirm`

## Memory + Insights

- **Ingest memory**
  - REST: `POST /api/memory/ingest`
  - MCP Standard: `memory_ingest`
  - JSON-RPC: `memory.ingest`

- **Query memory**
  - REST: `POST /api/memory/query`
  - MCP Standard: `memory_query`
  - JSON-RPC: `memory.query`

- **Daily memory**
  - REST: `POST /api/memory/daily`
  - MCP Standard: `memory_daily`
  - JSON-RPC: `memory.daily`

## MCP Standard

- **List tools**
  - REST: `POST /api/mcp-standard/list_tools`

- **Call tool**
  - REST: `POST /api/mcp-standard/call_tool`
