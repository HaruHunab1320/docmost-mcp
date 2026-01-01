# Manual Test Runbook (Production Readiness)

Use this checklist to validate Raven Docs end‑to‑end before a production push.

## Setup

- [X] Start backend + frontend.
- [X] Create a clean workspace and sign in as owner.
- [X] Create a space named “QA Space”.
- [X] Create projects: “Alpha”, “Beta”.
- [X] Create tasks: one unassigned, one assigned to Alpha, one to Beta.
- [X] Create pages: one space page + one page linked to each project.

## Auth + Workspace

- [X] `/auth/setup` completes and redirects to app shell.
- [X] `/login` succeeds with valid credentials.
- [X] Invalid login shows error states.
- [X] Logout returns to `/login`.

## Navigation + Sidebar

- [X] Space switcher changes space context.
- [X] Project list expands/collapses per project.
- [X] Project pages appear nested under projects.
- [X] Page tree supports create/rename/move.

## Inbox + Triage

- [X] Quick capture creates task in Inbox.
- [X] Waiting/Someday filters show bucketed tasks.
- [X] “Start triage” opens triage queue.
- [X] Bulk assign + “Do today” updates tasks.

## Today

- [X] Daily pulse buttons open correct bucket pages.
- [X] Daily note button creates/opens note.
- [X] Approvals list loads and actions can be confirmed/denied.

## Review

- [X] Weekly checklist toggles persist on reload.
- [X] Weekly review page opens/creates.

## Projects + Tasks

- [X] Project board loads with columns.
- [X] Drag/drop task updates status.
- [X] Task drawer opens and edits persist.
- [X] Task label manager can create/update/delete labels.
- [X] Labels can be assigned/removed from tasks.

## Pages + Editor

- [X] Create page from sidebar.
- [X] Editor formatting (bold/italic/heading) works.
- [X] Task list items in page create tasks (sync check).
- [X] Comments add/edit/delete.
- [X] Page history loads.

## Attachments

- [X] Upload attachment to a page.
- [X] Download and delete attachment.
- [X] Attachments list filters by space.

## Search

- [X] Global search returns results.
- [X] Search results open page/task correctly.

## Settings

- [X] Account preferences save and persist.
- [X] Theme switching persists after reload.
- [X] API key create/delete works.
- [X] Agent settings toggle + policy editor save.

## Agent + Autonomy

- [X] “Run now” triggers autonomy loop.
- [X] Approvals execute and create tasks/pages.
- [X] Memory insights show new entries.

## Styling + Responsiveness

- [X] All themes switch without background seams.
- [X] No stray footer bar or background chunk.
- [X] Sidebar toggle works on mobile.
- [X] Header layout does not overlap on tablet.

## Regression Notes

- [X] No console errors during normal navigation.
- [X] MCP socket connects without reconnection loop.
- [X] Task priorities use lowercase enum values.
