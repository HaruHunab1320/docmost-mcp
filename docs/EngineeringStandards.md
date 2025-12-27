# Engineering Standards + Consistency Audit

This document defines preferred code patterns for Raven Docs and lists current
inconsistencies discovered during the architecture pass.

## Preferred Patterns

### Backend (NestJS)
- **Module layout**: `controller` + `service` + `repo` + DTOs.
- **Validation**: DTOs in `core/<domain>/dto` using `class-validator`.
- **Permissions**: CASL enforced in controllers and handlers.
- **Logging**: Use Nest `Logger` instead of `console.*`.
- **Error handling**: Use typed errors (e.g., MCP errors for MCP paths).

### Frontend (React)
- **Feature folders**: hooks, services, types, components per feature.
- **Query usage**: TanStack Query for data, mutations for write flows.
- **Logging**: avoid `console.*` in production; gate logs behind feature flag.
- **State**: Jotai atoms for workspace/user global state.

## Current Inconsistencies (Audit Findings)

### Logging
Many modules still use `console.*` directly rather than structured logging or
feature-flagged dev logging.

Examples:
- `apps/server/src/core/project/task.controller.ts`
- `apps/server/src/core/project/project.controller.ts`
- `apps/server/src/database/repos/task/task.repo.ts`
- `apps/client/src/features/websocket/hooks/use-mcp-events.ts`
- `apps/client/src/features/project/services/project-service.ts`

### TODOs / Gaps in Code
These TODOs should be tracked and resolved:
- `apps/server/src/integrations/mcp/guards/mcp-permission.guard.ts`: permission checks TODO.
- `apps/server/src/common/middlewares/domain.middleware.ts`: TODO for unification.
- `apps/server/src/main.ts`: legacy JSON-RPC MCP deprecation TODO.
- `apps/client/src/ee/security/pages/security.tsx`: TODO for secondary plan UX.
- `apps/server/src/database/pagination/pagination.ts`: TODO for type fix (`@ts-expect-error`).

### API Consistency
- MCP uses JSON-RPC, REST uses POST + DTO; keep REST endpoints consistent with
  existing DTO validation patterns.
- Task/project endpoints and agents return shapes that are not always documented
  in `docs/`.

## Recommended Cleanup Work

1) Replace `console.*` with `Logger` (server) and feature‑flagged logging (client).
2) Add a global `VITE_ENABLE_LOGS` check in client logging utilities and
   remove inline logs in hot paths.
3) Convert TODOs into issues or tracked roadmap items.
4) Ensure all new MCP/agent endpoints are documented in `docs/MCP.md`.

## Enforcement

- New services/controllers should avoid `console.*`.
- New DTOs must use validation decorators.
- MCP handlers must emit events when mutations occur.
