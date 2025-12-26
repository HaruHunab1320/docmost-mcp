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
Stores the searchable memory index:

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

- `agent_memories` table
  - `id`
  - `content` (text/JSON)
  - `metadata` (JSONB)
  - `created_at`
  - `updated_at`

### Object Storage
Large assets (images/video/files) are stored in object storage and referenced
from Postgres metadata. Memgraph only stores pointers.

## Embeddings

- Use Gemini embeddings for consistency with the Gemini LLM stack.
- Store `embedding_model` per memory node to support model upgrades.

## UI: Memory Drawer

- Toggleable drawer in the app (Today view).
- Shows "Daily Memory" entries and a file-tree/timeline of past days.
- Each entry includes a short summary and hints about topics.
- Selecting an entry loads full content from Postgres.

## Agent Behavior (Phase 1)

- Read tasks/projects/journals, produce a daily summary in Today.
- Generate suggestions, never auto-apply without confirmation.
- Ask lightweight questions in daily journal templates when information is missing.

## Autonomy Levels

- Level 0: observe + suggest
- Level 1: draft plans + ask questions
- Level 2: create non-destructive drafts (pages, notes)
- Level 3: destructive actions only with approval tokens

## MCP Integration

Planned tools:

- `memory_ingest`
- `memory_query`
- `memory_daily`

These allow the agent and external clients to read/write memory safely.

## Safety

- Always log agent decisions and rationale in memory.
- Provide user override for all suggestions.
- Require approval tokens for destructive actions.

