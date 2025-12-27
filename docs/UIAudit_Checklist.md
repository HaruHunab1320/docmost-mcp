# UI Audit Checklist (Live Run)

Use this list during a UI validation session. Fill in Pass/Fail and notes as you go.

## Setup
- Workspace created
- QA Space created
- Projects: Alpha, Beta
- Tasks: unassigned, assigned to Alpha, assigned to Beta
- Pages: one space page + one per project

## Auth
- Sign up / setup workspace
- Login / logout
- Password reset request UI

## Global UI
- Header renders (Raven Docs)
- Quick capture input
- Theme switcher works

## Sidebar + Navigation
- Space switcher
- Project expand/collapse
- Project pages nested under project
- Page tree create/rename/move

## Inbox
- Quick capture creates task
- Bucket filters (Waiting/Someday)
- Start triage opens triage queue

## Today
- Due today list
- Daily note button
- Open triage / review navigation
- Daily pulse buttons open buckets

## Triage
- Select all/none
- Bulk assign to project
- Do today
- Priority update
- Waiting/Someday actions

## Review
- Weekly checklist toggles persist
- Open weekly review page
- Suggestions render for active projects

## Waiting / Someday
- Bucket lists render
- Return to inbox (single + bulk)

## Projects + Tasks
- Create project
- Board loads
- Drag/drop updates status
- Task drawer edits fields

## Task Drawer
- Title/status/due date
- Priority / assignee
- Bucket tag
- Complete + delete

## Pages + Editor
- Create page
- Formatting (bold/italic/heading)
- Embeds (Mermaid/Excalidraw/Draw.io)
- Comments add/edit/delete
- Page history

## Attachments
- Upload / download / delete
- Attachments list filters by space

## Search
- Global search
- Space-scoped search
- Open results

## Settings
- Account preferences save
- Theme persistence across reload
- API keys create
- Agent settings toggle + policy editor

## Agent + Autonomy
- Approvals list loads
- Approve/deny action updates list
- Run autonomy now
- Memory insights list + graph

## Themes + Styling
- All themes switch without seams
- No footer bar / stray background

## Responsiveness
- Mobile sidebar toggle
- Header wraps without overlap
- Page tree usable on tablet
