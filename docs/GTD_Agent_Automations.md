# Raven Docs GTD Automations

This document defines the current daily/weekly agent flows and the MCP/API
support required to ship them safely.

## Daily Digest (Morning)

**Goal:** Present a curated list of what matters today with minimal friction.

**Inputs**
- Tasks due today (priority + due date)
- Overdue tasks
- Waiting/Someday lists
- Recently captured Inbox items
- Goal focus (keyword-based matches)

**Outputs**
- A “Today” summary card (overdue + due today)
- Suggested focus by goal
- Inbox triage queue size and urgency

**MCP Required**
- `task_triage_summary`
- `task_list` (optional for extended views)
- `memory_daily` (journal recap)

**Agent Steps**
1) Pull triage summary + goal focus.
2) Generate a daily summary.
3) Store summary in memory + render on Today.

## Daily Triage (During the Day)

**Goal:** Turn raw inbox items into next actions or defer decisions.

**Inputs**
- Inbox tasks (bucket = inbox/none)
- Project list

**Outputs**
- Tasks assigned to projects
- Buckets set (waiting/someday)
- Due dates and priorities set

**MCP Required**
- `task_list` (inbox)
- `project_list`
- `task_update`
- `task_move_to_project`

## Weekly Review (Scheduled)

**Goal:** Comprehensive review and intentional planning.

**Inputs**
- Inbox backlog
- Stale projects
- Waiting/Someday lists
- Upcoming deadlines

**Outputs**
- Weekly review page (checklist + findings)
- Suggested next actions by project

**MCP Required**
- `task_list`
- `project_list`
- `page_create` / `page_update`

## Current Automation Status

- Daily summary + proactive questions are live.
- Autonomy loop can propose up to 3 actions.
- Approval workflow enforced by policy rules + approval tokens.

## Remaining Gaps

- Project recap generator still depends on agent suggestions.
- Task extraction from page checklists is not yet wired.
- Agent policy rules need UX education (what is safe vs destructive).
