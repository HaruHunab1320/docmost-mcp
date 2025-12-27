# Workflows + Use Cases

This document captures intended Raven Docs usage patterns and the working
flows the UI + agent systems are designed to support.

## Primary Use Cases

1) **Second-brain knowledge base**
   - Long-term notes, research, and project documentation.
   - Daily journal capture and reflective summaries.

2) **Project management**
   - Projects, tasks, and dashboards for active work streams.
   - Task triage, priorities, and cross-project visibility.

3) **GTD execution**
   - Fast capture, daily triage, and weekly review loops.
   - Agent-assisted planning with approvals for changes.

## Core Workflows

### Capture → Triage → Plan → Execute → Review

1) **Capture**
   - Add items to Inbox or create quick notes/pages.
   - Agent can auto-ingest events from daily work.

2) **Triage**
   - Review Inbox / Waiting / Someday buckets.
   - Assign goals, projects, or defer as needed.

3) **Plan (Daily Focus)**
   - Generate a Daily Focus page with a shortlist of tasks and goals.
   - Agent suggests focus areas based on goal keyword matches and recent context.

4) **Execute**
   - Work inside pages/projects; capture notes inline.
   - Agent provides summaries and pending approvals.

5) **Review**
   - Weekly review and periodic summaries in the Review area.
   - Agent generates insights, follow-ups, and trend notes.

## Project + Page Workflow

- Projects exist alongside pages; project tasks and related pages are linked.
- The sidebar surfaces project items and their related pages for navigation.
- Project dashboards expose boards, lists, and summary stats.

## Agent + Approval Workflow

1) Agent loop produces candidate actions (create pages, tasks, summaries).
2) Policy engine decides allow/approve/deny.
3) Approval Center surfaces items in Today/Insights.
4) Confirmed actions execute via MCP handlers and emit real-time events.

## Memory + Insights

- **Daily memory**: captures summaries, decisions, and agent output.
- **Entity graph**: Memgraph stores topics, projects, goals, and relationships.
- **Insights view**: history, trends, and time-based summaries.

## Auto-Generated Content Rules

Auto-generated pages should include identifiers to avoid duplicates:
- **Daily Focus**: include ISO date (e.g. `Daily Focus - 2025-01-05`).
- **Weekly Review**: include week range or ISO week.
- **Project recap**: include project name/id.

These rules are enforced wherever agent tools create pages.

## How to Run Autonomy (Short)

1) Enable the agent in workspace settings and set an autonomy schedule.
2) Ensure AI + memory dependencies are configured (Gemini API key, Memgraph,
   Redis, Postgres).
3) Use “Run Now” (manual) to trigger a loop immediately.
4) Review the approvals queue and confirm or deny actions.
5) Validate outputs in Today / Insights, and review memory logs for traceability.
