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

## Per-Route Verification Map

Use this list to drive runtime verification and capture pass/fail.

| Route | Expected Checks |
| --- | --- |
| `/auth/setup` | Setup flow creates workspace, sets admin, redirects. |
| `/login` | Login success, error states render, logout returns here. |
| `/spaces/:spaceId` | Space loads, header + sidebar render, navigation works. |
| `/spaces/:spaceId/inbox` | Capture task, bucket filters, open triage. |
| `/spaces/:spaceId/today` | Daily pulse buttons, approvals list, daily note. |
| `/spaces/:spaceId/triage` | Bulk actions, assign project, do today. |
| `/spaces/:spaceId/review` | Weekly checklist, review page link. |
| `/spaces/:spaceId/waiting` | Waiting list, return to inbox. |
| `/spaces/:spaceId/someday` | Someday list, return to inbox. |
| `/spaces/:spaceId/projects` | Project dashboard, open project. |
| `/spaces/:spaceId/projects?projectId=...` | Board loads, task drawer edits. |
| `/spaces/:spaceId/pages/:pageId` | Editor load, formatting, comments. |
| `/spaces/:spaceId/attachments` | Upload/download/delete. |
| `/spaces/:spaceId/search` | Search results + open. |
| `/settings/account` | Profile updates persist. |
| `/settings/workspace` | Workspace settings save, agent toggle works. |
| `/settings/api-keys` | API key create/delete. |

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
| Agent settings | Unverified | Autonomy toggle + policy editor UI; needs runtime validation. |

## Agent + Autonomy

| Area | Status | Notes |
| --- | --- | --- |
| Approvals panel | Unverified | Approvals list + confirm/deny UI needs runtime validation. |
| Memory insights | Unverified | Graph and history views need runtime validation. |
| Autonomy run | Unverified | Run-now workflow + schedule settings need validation. |

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
5) Use `docs/UIAudit_Checklist.md` during runtime validation to record pass/fail.

## Raven Docs UI Audit Checklist (Manual)

| Area | Steps | Status | Notes |
| --- | --- | --- | --- |
| Auth | Sign up, login, password reset, setup workspace. |  |  |
| Spaces | Create/edit/delete space, switch space, member roles, space settings. |  |  |
| Sidebar | Project list expands, project pages show under project, pages tree works. |  |  |
| Inbox | Quick capture creates task, bucket filters work, start triage button works. |  |  |
| Today | Due-today list renders, open triage, open review, daily note button. |  |  |
| Triage | Select all/none, bulk assign, do today, set priority, move to Waiting/Someday. |  |  |
| Review | Weekly checklist toggles, open weekly review page, suggestions render. |  |  |
| Waiting/Someday | Bucket lists render, return to inbox for single and bulk. |  |  |
| Projects | Create project, open board, create task, open task drawer, assign project. |  |  |
| Tasks | Edit title, status, due date, priority, assignee, bucket tag, delete/complete. |  |  |
| Pages | Create page, move page, delete page, page history, page search. |  |  |
| Editor | Formatting, embeds, diagrams, task list, mentions, comments. |  |  |
| Attachments | Upload, view, download, delete; filter by space. |  |  |
| Search | Global search, space-scoped search, open result. |  |  |
| Settings | Account preferences, theme switching, API keys UI. |  |  |
| Agent | Toggle autonomy, edit policy, run autonomy now, approvals list. |  |  |
| Themes | Light/dark and all themes switch cleanly, backgrounds match surfaces. |  |  |
| Responsiveness | Sidebar toggles, header, layout on mobile/tablet. |  |  |
| MCP UI | MCP test pages load, navigation tool works. |  |  |

## Runtime Blockers

- Server dev mode failed under Node.js v25 (dependency `buffer-equal-constant-time` expects older Node API). Use Node 18 or 20 to run `apps/server`.
