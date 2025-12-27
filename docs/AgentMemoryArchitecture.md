# Agent Memory Architecture

This document captures the agreed architecture for the Raven Docs agent memory
system and related UI/agent behaviors. It is intended as a stable reference.

## Goals

- Persist agent observations, summaries, and learning events with timestamps.
- Support semantic search and relationship queries.
- Keep memory visible and auditable by the user (toggleable UI drawer).
- Enable agent suggestions and future autonomous actions with safety gates.

## Storage Strategy

### Memgraph (graph + vector)
Stores the searchable memory index and entity relationships:

- Node: `Memory`
  - `id`
  - `timestamp`
  - `summary`
  - `tags` (array)
  - `source` (journal/task/agent/etc.)
  - `embedding` (vector)
  - `embedding_model`
  - `content_ref` (pointer to Postgres row)

- Node: `Entity`
  - `id`
  - `type` (project, task, habit, goal, etc.)
  - `name`

- Edges:
  - `(:Memory)-[:REFERS_TO]->(:Entity)`
  - `(:Memory)-[:FOLLOWS]->(:Memory)`

### Postgres
Stores full memory payloads and metadata:

- `agentMemories` table
  - `id`
  - `workspaceId`
  - `spaceId`
  - `creatorId`
  - `source`
  - `summary`
  - `content` (JSONB)
  - `tags` (JSONB)
  - `createdAt` / `updatedAt`

### Object Storage
Large assets (images/video/files) are stored in object storage and referenced
from Postgres metadata. Memgraph only stores pointers.

## Embeddings

- Use Gemini embeddings for consistency with the Gemini LLM stack.
- Store `embedding_model` per memory node to support model upgrades.

## UI: Memory Drawer + Insights

- Toggleable drawer in the app (Today view) plus a full Insights page.
- Daily memory entries, memory days list, and entity graph.
- Each entry includes a summary and tags; full payloads load from Postgres.

## Agent Behavior (Current)

- Read tasks/projects/journals, produce a daily summary in Today.
- Generate suggestions with approvals enforced by policy rules.
- Ask lightweight proactive questions when information is missing.

## Autonomy Levels

- Level 0: observe + suggest
- Level 1: draft plans + ask questions
- Level 2: create non-destructive drafts (pages, notes)
- Level 3: destructive actions only with approval tokens

## MCP Integration

Current MCP tools:

- `memory_ingest`
- `memory_query`
- `memory_daily`
- `memory_days`

Graph and entity detail endpoints are available via HTTP (`/api/memory/graph`,
`/api/memory/entity`, `api/memory/entity-details`) and are used by the Insights UI.

These allow the agent and external clients to read/write memory safely.

## Safety

- Always log agent decisions and rationale in memory.
- Provide user override for all suggestions.
- Require approval tokens for destructive actions.
