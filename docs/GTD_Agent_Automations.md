# Raven Docs GTD Automations

This document defines the daily and weekly automation flows for the Raven Docs agent and the minimum MCP/API support required to ship them.

## Daily Digest (Morning)

**Goal:** Present a curated list of what matters today with minimal friction.

**Inputs**
- Tasks due today (priority + due date)
- Overdue tasks
- Waiting/Someday lists
- Recently captured Inbox items
- Daily note entries from yesterday

**Outputs**
- A “Today” summary card (overdue + due today)
- Suggested next actions by project
- Inbox triage queue size and urgency

**MCP Required**
- `task_list` by due date (today, overdue)
- `task_list` by bucket (waiting, someday)
- `task_list` for Inbox (no projectId)
- `page_list` or `search` for yesterday’s daily note

**Agent Steps**
1) Fetch overdue + due today tasks.
2) Fetch Inbox items and count.
3) Fetch Waiting/Someday items.
4) Summarize into a “Today” digest.
5) Optionally append summary to today’s daily note page.

## Daily Triage (During the Day)

**Goal:** Turn raw inbox items into next actions or defer decisions.

**Inputs**
- Inbox tasks (unassigned)
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
- `task_bucket_set`

**Agent Steps**
1) Load inbox items.
2) Suggest project matches based on content (optional).
3) Apply updates and log changes to daily note.

## Weekly Review (Scheduled)

**Goal:** Comprehensive review of the system and intentional planning.

**Inputs**
- Inbox backlog
- Stale projects (no updates in X days)
- Projects with no active tasks
- Waiting/Someday lists
- Upcoming deadlines (next 14 days)

**Outputs**
- Weekly review page (checklist + findings)
- Suggested next actions by project
- Flags for stale projects

**MCP Required**
- `task_list` (all tasks by space)
- `project_list`
- `task_list` by bucket
- `page_create` / `page_update` for weekly review

**Agent Steps**
1) Create/open weekly review page.
2) Compute stale projects and no-next-action lists.
3) Append findings and suggested next actions.
4) Optionally propose new goals.

## Data/Tool Gaps

- Tasks and Projects are not exposed via MCP Standard yet.
- Task buckets are localStorage only.

## Implementation Checklist

1) Add task/project MCP tools.
2) Persist bucket state server-side.
3) Add endpoints for “due today” and “overdue” queries (or filter client-side).
4) Add a weekly review page generator tool (optional).
