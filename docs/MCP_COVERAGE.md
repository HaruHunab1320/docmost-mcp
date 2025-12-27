# MCP Coverage Audit

See `docs/MCP.md` for the canonical MCP overview. This document lists method
coverage only.

This document shows current coverage between the internal JSON-RPC MCP API
(`apps/server/src/integrations/mcp`) and the MCP Standard tools
(`apps/server/src/integrations/mcp-standard`).

Legend:
- JSON-RPC Method = `resource.operation` handled by `MCPService`.
- MCP Standard Tool = `tool_name` exposed at `/api/mcp-standard/call_tool`.

## Core Coverage Matrix

### Spaces
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `space.list` | `space_list` | OK |
| `space.get` | `space_get` | OK |
| `space.create` | `space_create` | OK |
| `space.update` | `space_update` | OK |
| `space.delete` | `space_delete` | OK |
| `space.updatePermissions` | `space_update_permissions` | OK |
| `space.members` | `space_members` | OK |
| `space.membersAdd` | `space_members_add` | OK |
| `space.membersRemove` | `space_members_remove` | OK |
| `space.changeMemberRole` | `space_change_member_role` | OK |

### Pages
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `page.list` | `page_list` | OK |
| `page.get` | `page_get` | OK |
| `page.create` | `page_create` | OK |
| `page.update` | `page_update` | OK |
| `page.delete` | `page_delete` | OK |
| `page.move` | `page_move` | OK |
| `page.search` | `page_search` | OK |
| `page.getHistory` | `page_get_history` | OK |
| `page.historyInfo` | `page_history_info` | OK |
| `page.restore` | `page_restore` | OK |
| `page.recent` | `page_recent` | OK |
| `page.breadcrumbs` | `page_breadcrumbs` | OK |
| `page.sidebarPages` | `page_sidebar_pages` | OK |
| `page.moveToSpace` | `page_move_to_space` | OK |

### Comments
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `comment.create` | `comment_create` | OK |
| `comment.get` | `comment_get` | OK |
| `comment.list` | `comment_list` | OK |
| `comment.update` | `comment_update` | OK |
| `comment.delete` | `comment_delete` | OK |
| `comment.resolve` | `comment_resolve` | OK |

### Attachments
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `attachment.list` | `attachment_list` | OK |
| `attachment.get` | `attachment_get` | OK |
| `attachment.upload` | `attachment_upload` | OK |
| `attachment.download` | `attachment_download` | OK |
| `attachment.delete` | `attachment_delete` | OK |

### Users
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `user.list` | `user_list` | OK |
| `user.get` | `user_get` | OK |
| `user.update` | `user_update` | OK |

### Groups
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `group.get` | `group_get` | OK |
| `group.list` | `group_list` | OK |
| `group.create` | `group_create` | OK |
| `group.update` | `group_update` | OK |
| `group.delete` | `group_delete` | OK |
| `group.addMember` | `group_addMember` | OK |
| `group.removeMember` | `group_remove_member` | OK |

### Workspaces
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `workspace.list` | `workspace_list` | OK |
| `workspace.get` | `workspace_get` | OK |
| `workspace.create` | `workspace_create` | OK |
| `workspace.update` | `workspace_update` | OK |
| `workspace.delete` | `workspace_delete` | OK |
| `workspace.addMember` | `workspace_add_member` | OK |
| `workspace.removeMember` | `workspace_remove_member` | OK |
| `workspace.members` | `workspace_members` | OK |
| `workspace.changeMemberRole` | `workspace_change_member_role` | OK |
| `workspace.deleteMember` | `workspace_delete_member` | OK |
| `workspace.invites` | `workspace_invites` | OK |
| `workspace.inviteInfo` | `workspace_invite_info` | OK |
| `workspace.inviteCreate` | `workspace_invite_create` | OK |
| `workspace.inviteResend` | `workspace_invite_resend` | OK |
| `workspace.inviteRevoke` | `workspace_invite_revoke` | OK |
| `workspace.inviteLink` | `workspace_invite_link` | OK |
| `workspace.checkHostname` | `workspace_check_hostname` | OK |

### Projects
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `project.list` | `project_list` | OK |
| `project.get` | `project_get` | OK |
| `project.create` | `project_create` | OK |
| `project.update` | `project_update` | OK |
| `project.archive` | `project_archive` | OK |
| `project.delete` | `project_delete` | OK |
| `project.createPage` | `project_create_page` | OK |

### Tasks
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `task.list` | `task_list` | OK |
| `task.get` | `task_get` | OK |
| `task.create` | `task_create` | OK |
| `task.update` | `task_update` | OK |
| `task.delete` | `task_delete` | OK |
| `task.complete` | `task_complete` | OK |
| `task.assign` | `task_assign` | OK |
| `task.moveToProject` | `task_move_to_project` | OK |
| `task.triageSummary` | `task_triage_summary` | OK |

### Memory
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `memory.ingest` | `memory_ingest` | OK |
| `memory.query` | `memory_query` | OK |
| `memory.daily` | `memory_daily` | OK |
| `memory.days` | `memory_days` | OK |

### Search
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `search.query` | `search_query` | OK |
| `search.suggest` | `search_suggest` | OK |

### Import
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `import.requestUpload` | `import_request_upload` | OK |
| `import.page` | `import_page` | OK |

### Export
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `export.page` | `export_page` | OK |
| `export.space` | `export_space` | OK |

### Approvals
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `approval.request` | `approval_request` | OK |
| `approval.confirm` | `approval_confirm` | OK |

### AI
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `ai.generate` | `ai_generate` | OK |

### System
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `system.listMethods` | `system_list_methods` | OK |
| `system.getMethodSchema` | `system_get_method_schema` | OK |

### Context
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `context.set` | `context_set` | OK |
| `context.get` | `context_get` | OK |
| `context.delete` | `context_delete` | OK |
| `context.list` | `context_list` | OK |
| `context.clear` | `context_clear` | OK |

### UI
| JSON-RPC Method | MCP Standard Tool | Status |
| --- | --- | --- |
| `ui.navigate` | `ui_navigate` | OK |

## Major Product Areas Without MCP Coverage

These are server capabilities that exist outside the JSON-RPC MCP API today:

- Auth flows (login, setup, SSO, tokens).
- Workspace settings and billing metadata.
- Websocket presence beyond UI navigation events.
- Analytics / audit logs (if any).
- App configuration endpoints (env, feature flags).

## Summary

- JSON-RPC MCP does **not** cover the full app feature set yet.
- MCP Standard now covers **all JSON-RPC MCP methods**.
- Remaining gaps are in **features not yet exposed via JSON-RPC MCP** (invites, auth flows, import/export, broader settings, etc.).

If you want, I can turn this into a prioritized implementation plan and start filling the missing tools and handlers.
