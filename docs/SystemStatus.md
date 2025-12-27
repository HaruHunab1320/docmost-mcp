# System Status Audit

This document captures a current-state architecture pass for Raven Docs. It is
intended as a living, system-by-system inventory that describes what exists,
what is stable, and what still needs work.

## Scope

- Backend (NestJS) core modules and integrations.
- Frontend (React) feature areas and UI surfaces.
- Real-time and agent systems.
- Data stores and background services.

## Backend Systems

### Core modules (`apps/server/src/core`)

**Auth + Users**
- Status: Implemented.
- Notes: Auth flows, JWT, and user profile management are wired. UI exists for
  login/setup/reset. Invite flows present.

**Workspace**
- Status: Implemented.
- Notes: Workspace settings, member management, invites, and API keys are
  exposed via controllers and settings UI.

**Spaces**
- Status: Implemented.
- Notes: Space CRUD + members + permissions via CASL.

**Pages**
- Status: Implemented.
- Notes: Page CRUD, history, export/import hooks, page move and sidebar
  navigation. Real-time collaboration via the collaboration module.

**Comments**
- Status: Implemented.
- Notes: Comment create/update/delete/resolve, selection anchoring.

**Groups**
- Status: Implemented.
- Notes: Group CRUD + membership management.

**Search**
- Status: Implemented.
- Notes: Search endpoints + suggest API. UI exists in client.

**Attachments**
- Status: Implemented.
- Notes: Upload/download/delete. Storage driver abstraction.

**Projects + Tasks**
- Status: Implemented (API + UI).
- Notes: Projects and tasks are persisted in DB with board views, dashboards,
  and task drawers. Task label CRUD + assignment now supported.

**Goals**
- Status: Implemented.
- Notes: Goal CRUD + matching by keywords, used for triage and agent logic.

### Agent systems (`apps/server/src/core/agent`, `agent-memory`)

**Agent loop**
- Status: Implemented.
- Notes: Autonomous loop generates actions, logs phases, retries, and approval
  requests. Policy engine enforces allow/approve/deny per method.

**Agent scheduler**
- Status: Implemented.
- Notes: Hourly cron checks autonomy schedules (daily/weekly/monthly) and runs
  loops for enabled spaces. Manual run endpoint is available.

**Planner loop**
- Status: Implemented.
- Notes: Generates a daily plan + proactive questions. Stored in memories.

**Agent memory**
- Status: Implemented.
- Notes: Postgres stores full memory payloads, Memgraph stores embeddings and
  entity relationships. Query/graph/preview endpoints are live.

**Approvals**
- Status: Implemented.
- Notes: Approval tokens created by MCP approval service, surfaced to UI.
  Agent loop logs approval latency.

### Integrations (`apps/server/src/integrations`)

**MCP + MCP Standard**
- Status: Implemented.
- Notes: Internal JSON-RPC (`/api/mcp`) and MCP Standard (`/api/mcp-standard`)
  are complete. Approval flow is enforced by policy and MCP approval service.

**Memgraph**
- Status: Implemented.
- Notes: Memory graph and entity relationships stored in Memgraph.

**AI**
- Status: Implemented.
- Notes: Gemini integration for generation + embeddings.

**Storage**
- Status: Implemented.
- Notes: Local + S3 storage drivers.

**Mail**
- Status: Implemented.
- Notes: SMTP/Postmark drivers.

**Import/Export**
- Status: Implemented.
- Notes: Space/page import/export endpoints present.

**Queue**
- Status: Implemented.
- Notes: Background processors and queue module in place.

**Security/Health/Telemetry**
- Status: Implemented.
- Notes: Health endpoints, version/robots, telemetry module.

## Frontend Systems (`apps/client/src/features`)

**Auth**
- Status: Implemented.
- Notes: Login/setup/invite/password reset pages present.

**Workspace + Space**
- Status: Implemented.
- Notes: Workspace settings, members, spaces list, space sidebar.

**Pages + Editor**
- Status: Implemented.
- Notes: Tiptap editor, history UI, comments, embeds, exports, attachments.

**Projects + Tasks**
- Status: Implemented.
- Notes: Project dashboard, boards, task drawer, file tree, metrics views.

**GTD**
- Status: Implemented (core flows).
- Notes: Inbox, Today, Triage, Waiting, Someday, Weekly Review, Daily notes,
  journal capture, and daily pulse.

**Agent UI**
- Status: Implemented.
- Notes: Daily summary, approvals panel, proactive questions, memory drawer,
  memory insights/graph, agent chat drawer, policy settings.

**Goals**
- Status: Implemented.
- Notes: Goal CRUD UI, keyword matching for focus summary.

**WebSocket**
- Status: Implemented.
- Notes: MCP events, navigation events, event debugger.

## Realtime + Collaboration

- Collaboration uses Hocuspocus/Yjs for page editing.
- MCP socket events broadcast changes to the UI (space/page/task changes).

## Data Stores

- **Postgres**: Core system of record (spaces/pages/projects/tasks/agent memories).
- **Redis**: Sessions, MCP approval context, background systems.
- **Memgraph**: Memory graph + embeddings + entity relationships.
- **Object Storage**: Attachments (local or S3).

## Workflow Coverage (UI + Agent)

- **Capture**: Inbox entry, page creation, daily notes.
- **Triage**: Inbox/Waiting/Someday surfaces, daily pulse counts.
- **Plan**: Daily Focus page generation + suggested focus.
- **Execute**: Projects, tasks, pages, editor collaboration.
- **Review**: Weekly review screen and memory insights.

## Readiness Risks (Code Scan)

- **Client logging**: MCP event hooks emit extensive console logs; should be
  gated behind a dev flag to reduce noise and CPU overhead.
- **Autonomy scheduling**: Cron runs hourly; schedule settings must be set or
  runs are skipped (ensure timezone + cadence are configured).
- **Memgraph dependency**: Memory insights require Memgraph connectivity; when
  Memgraph is down, memory graph features degrade.
- **Task label CRUD**: Labels are used by boards but lack management UI.
- **Permissions TODOs**: MCP permission guard still has placeholder logic.

## Known Gaps / Remaining Work

 - Page task list extraction sync still needs runtime validation.
- Page task list extraction/sync with task database is not fully wired.
- Some docs still reference legacy limitations (needs cleanup).
- UI audit items still need runtime confirmation (see `docs/UIAudit.md`).
- Security (EE) settings still contain placeholder TODOs for second plan UX.
- MCP permission guard now enforces role tiers; CASL alignment still pending.

## Consistency Notes

- **API shape:** Core REST uses `POST` for most operations with DTOs; MCP uses
  JSON-RPC and MCP Standard. Keep new endpoints consistent with existing DTO
  validation patterns.
- **Permissions:** CASL abilities are enforced on server; UI should reflect
  permission availability to avoid dead actions.
- **Agent logging:** Agent decisions and approvals should always be logged in
  `agentMemories` to preserve traceability.
- **MCP approvals:** Sensitive operations must use approval tokens; policy rules
  are enforced in MCP + agent loop.

## Next Documentation Targets

- Update architecture diagrams with agent memory + MCP policy enforcement.
- Document the GTD workflow as implemented (not just proposed).
- Add a “How to run autonomy” section with approvals + policy rules.
