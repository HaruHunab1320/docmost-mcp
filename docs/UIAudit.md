# UI Audit Matrix

This matrix catalogs current UI surfaces and indicates if they appear complete, partial, or unverified. It also lists the most visible TODOs found in code for follow-up.

## Status Legend
- Complete: Implemented and no obvious TODOs detected.
- Partial: Implemented but with TODOs, placeholders, or missing actions.
- Code-verified: Implemented based on code review, not runtime validated.
- Unverified: Present in code, but not confirmed via runtime UI validation.

## Core Navigation and Layout

| Area | Status | Notes |
| --- | --- | --- |
| App shell / main layout | Unverified | Needs runtime check for layout and responsive behavior. |
| Authentication flow | Unverified | Auth UI exists under `features/auth`; needs functional verification. |
| Workspace/space switching | Unverified | UI exists under `features/workspace` and `features/space`. |
| Page tree navigation | Unverified | Part of `features/page`; verify drag/drop, move, and permissions. |

## Editor and Content

| Area | Status | Notes |
| --- | --- | --- |
| Page editor (Tiptap) | Unverified | Core editor exists; confirm embeds, diagrams, and task list. |
| Page history | Unverified | UI exists under `features/page-history`. |
| Comments | Code-verified | Resolve flow wired; update/delete permissions tightened. |
| Attachments | Code-verified | Space selector + delete flow implemented; needs runtime validation. |

## Search

| Area | Status | Notes |
| --- | --- | --- |
| Search UI | Unverified | UI exists under `features/search`. |
| Search scope behavior | Code-verified | Backend now supports cross-space search; validate UI flow. |

## Projects and Tasks

| Area | Status | Notes |
| --- | --- | --- |
| Project dashboard | Unverified | UI exists, needs runtime validation. |
| Kanban board | Unverified | Drag/drop appears implemented. |
| Board filters (labels) | Partial | Labels derived from task data; no label CRUD UI found. |
| Task detail drawer | Code-verified | Page creation/linking now wired; verify UX. |
| Task card editing | Code-verified | Title update and emoji picker wired; verify UX. |
| New task modal | Code-verified | Wired to TaskFormModal; verify create flow. |
| Project file tree | Code-verified | Now lists pages linked to tasks; needs UX validation. |

## Collaboration and Realtime

| Area | Status | Notes |
| --- | --- | --- |
| Live collaboration | Unverified | Needs runtime validation with multiple sessions. |
| MCP event updates | Unverified | Hook exists; verify event propagation. |

## Settings and Admin

| Area | Status | Notes |
| --- | --- | --- |
| API keys UI | Unverified | Exists under `features/api-keys`. |
| User management | Unverified | Exists under `features/user`. |
| Group management | Unverified | Exists under `features/group`. |

## UX / Design Quality

| Area | Status | Notes |
| --- | --- | --- |
| Typography and spacing | Unverified | Needs visual review for consistency. |
| Layout responsiveness | Unverified | Needs mobile and tablet pass. |
| Empty/edge states | Unverified | Check zero-data screens and error handling. |

## Remaining Gaps (Code Scan)

- Page deletion is hard delete only; no restore endpoint for soft-delete flow.
- Task label CRUD UI not found; board filters only work if labels already exist.

## Next Steps (to complete the UI)

1) Run a full UI walkthrough and convert all "Unverified" to Complete/Partial with screenshots or notes.
2) Validate the newly wired flows (attachments delete, task-to-page creation, labels).
3) Align server permissions and UI affordances to prevent broken or hidden actions.
4) Add regression checks for the highest-use flows: auth, page creation, edits, search, tasks.

## UI QA Checklist (Manual)

- Auth: sign up, login, password reset, setup workspace.
- Spaces: create, edit, delete, member roles, space settings.
- Pages: create, move, delete, sidebar navigation, history, search.
- Editor: formatting, embeds, diagrams, comments, attachments, mentions.
- Projects: create project, create task, board/list views, task drawer, labels, assignees.
- Attachments: upload, filter by space, download, delete.
- MCP: list tools, create page, list pages, call tool.

## Runtime Blockers

- Server dev mode failed under Node.js v25 (dependency `buffer-equal-constant-time` expects older Node API). Use Node 18 or 20 to run `apps/server`.
