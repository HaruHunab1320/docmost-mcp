# Manual Test Runbook (Production Readiness)

Use this checklist to validate Raven Docs end‑to‑end before a production push.

## Setup

- [ ] Start backend + frontend.
- [ ] Create a clean workspace and sign in as owner.
- [ ] Create a space named “QA Space”.
- [ ] Create projects: “Alpha”, “Beta”.
- [ ] Create tasks: one unassigned, one assigned to Alpha, one to Beta.
- [ ] Create pages: one space page + one page linked to each project.

## Auth + Workspace

- [ ] `/auth/setup` completes and redirects to app shell.
- [ ] `/login` succeeds with valid credentials.
- [ ] Invalid login shows error states.
- [ ] Logout returns to `/login`.

## Navigation + Sidebar

- [ ] Space switcher changes space context.
- [ ] Project list expands/collapses per project.
- [ ] Project pages appear nested under projects.
- [ ] Page tree supports create/rename/move.

## Inbox + Triage

- [ ] Quick capture creates task in Inbox.
- [ ] Waiting/Someday filters show bucketed tasks.
- [ ] “Start triage” opens triage queue.
- [ ] Bulk assign + “Do today” updates tasks.

## Today

- [ ] Daily pulse buttons open correct bucket pages.
- [ ] Daily note button creates/opens note.
- [ ] Approvals list loads and actions can be confirmed/denied.

## Review

- [ ] Weekly checklist toggles persist on reload.
- [ ] Weekly review page opens/creates.

## Projects + Tasks

- [ ] Project board loads with columns.
- [ ] Drag/drop task updates status.
- [ ] Task drawer opens and edits persist.
- [ ] Task label manager can create/update/delete labels.
- [ ] Labels can be assigned/removed from tasks.

## Pages + Editor

- [ ] Create page from sidebar.
- [ ] Editor formatting (bold/italic/heading) works.
- [ ] Task list items in page create tasks (sync check).
- [ ] Comments add/edit/delete.
- [ ] Page history loads.

## Attachments

- [ ] Upload attachment to a page.
- [ ] Download and delete attachment.
- [ ] Attachments list filters by space.

## Search

- [ ] Global search returns results.
- [ ] Search results open page/task correctly.

## Settings

- [ ] Account preferences save and persist.
- [ ] Theme switching persists after reload.
- [ ] API key create/delete works.
- [ ] Agent settings toggle + policy editor save.

## Agent + Autonomy

- [ ] “Run now” triggers autonomy loop.
- [ ] Approvals execute and create tasks/pages.
- [ ] Memory insights show new entries.

## Styling + Responsiveness

- [ ] All themes switch without background seams.
- [ ] No stray footer bar or background chunk.
- [ ] Sidebar toggle works on mobile.
- [ ] Header layout does not overlap on tablet.

## Regression Notes

- [ ] No console errors during normal navigation.
- [ ] MCP socket connects without reconnection loop.
- [ ] Task priorities use lowercase enum values.
