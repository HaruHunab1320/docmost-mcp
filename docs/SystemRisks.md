# System Risks + Remediation Order

This document lists the highest‑impact risks discovered during the code audit
and proposes a remediation order. It is meant to drive short‑term stabilization
work.

## P0 (Stability / Data Integrity)

1) **Policy + approvals enforcement**
   - Risk: misconfigured policy can bypass approvals or block legitimate actions.
   - Fix: add integration tests for allow/approve/deny flows and MCP bridge.
   - Owner: Agent/MCP layer (Agent + MCP team).

2) **Agent memory ingestion**
   - Risk: invalid JSON payloads can break memory persistence.
   - Fix: validate JSON payloads before inserts; guard AI outputs.
   - Owner: Agent memory service (Agent team).

3) **MCP event loop + logging noise**
   - Risk: high console logging can overwhelm dev UX and degrade perf.
   - Fix: gate logs behind env flag; reduce per‑event spam.
   - Owner: Websocket client hooks (Frontend team).

## P1 (Product Gaps)

1) **Task label CRUD**
   - Status: Implemented (task drawer label manager + REST endpoints).
   - Follow-up: confirm runtime UX in UI audit.
   - Owner: Project/task feature (Frontend + Backend).

2) **Page ↔ task list sync**
   - Status: Initial sync implemented (task items create tasks on page updates).
   - Follow-up: add delete/update reconciliation and runtime validation.
   - Owner: Editor + task services (Editor + Backend).

3) **Permissions TODOs**
   - Status: Implemented role-based guard for MCP endpoints.
   - Follow-up: align with CASL abilities for space-specific checks.
   - Owner: MCP integration (Backend).

## P2 (UX + Ops)

1) **Autonomy scheduling clarity**
   - Risk: users assume autonomy runs without cadence settings.
   - Fix: surface schedule defaults + “last run” hints in settings UI.
   - Owner: Agent settings UI (Frontend).

2) **Docs drift**
   - Risk: multiple MCP docs caused confusion.
   - Fix: keep `docs/MCP.md` canonical and link all other references there.
   - Owner: Docs (Platform/Docs).

## Suggested Remediation Order

1) MCP policy + approvals tests.
2) Agent memory payload validation.
3) MCP event logging gates.
4) Task label CRUD.
5) Page ↔ task list sync.
6) MCP permission TODO resolution.
7) Autonomy schedule UX.
