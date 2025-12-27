# Raven Docs: Product Vision + Methodology

This document captures the intended use cases, design principles, and core
workflows behind Raven Docs.

## Intended Use Cases

- **Second Brain** for engineers, creators, and teams.
- **GTD-style task management** with a single capture inbox and daily triage.
- **Project + documentation hub** where every project has pages, tasks, and
  linked knowledge.
- **Agent-assisted planning** that summarizes, suggests, and (with approval)
  executes routine actions.

## Design Principles

1) **Minimal friction from thought → capture**  
   Everything starts in the Inbox or Journal capture with minimal metadata.

2) **Default workflows over customization**  
   Users shouldn’t spend time configuring their system. Defaults should work.

3) **Everything is a page**  
   Projects are pages, tasks can reference pages, and knowledge stays linked.

4) **Agent is visible and accountable**  
   The agent must log actions, require approvals for sensitive changes, and
   expose its reasoning through memory logs.

5) **Clear daily rhythm**  
   Morning focus, daily triage, weekly review.

## Core Workflows

### Capture
- Quick capture into Inbox (tasks) or Journal (notes).
- Agent can auto-ingest context into memory.

### Triage
- Inbox → assign project, due date, or bucket (Waiting/Someday).
- Suggested focus based on goal matching.

### Daily Focus
- Today page shows Daily Pulse + overdue + due today.
- Agent summary and proactive questions appear alongside.

### Project Execution
- Tasks live in Kanban/board views.
- Project pages store the narrative and decisions.

### Weekly Review
- Review stale projects and unresolved tasks.
- Agent drafts review pages and suggests next actions.

## Autonomy Boundaries

- **Read + summarize** is always allowed.
- **Write actions** require explicit policy allowlist.
- **Destructive actions** require approvals.

## Agent Policy Model

- **Allow auto-apply**: Safe methods (e.g., `task.update`).
- **Require approval**: Explicitly gated methods.
- **Deny**: Methods blocked entirely (e.g., destructive actions).

Policy is enforced both in the agent loop and the MCP gateway.
