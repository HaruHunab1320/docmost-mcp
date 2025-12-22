# Raven Docs UI Audit Runbook

Use this runbook to validate the UI end-to-end. Mark each step with Pass/Fail and capture notes or screenshots.

## Conventions
- Pass/Fail/Blocked for each step.
- Capture any console errors and include the page route.
- If a step depends on data, create minimal test data first.

## 0) Setup
- Log in to a test workspace.
- Create one space named "QA Space".
- Create two projects: "Alpha" and "Beta".
- Create three tasks: one unassigned, one assigned to Alpha, one assigned to Beta.
- Create one page in the space, and one page linked to each project (if the UI allows it).

## 1) Auth
- Sign up flow works and creates a workspace.
- Login/logout works.
- Password reset request email UI completes (even if email is not sent in dev).

## 2) Header + Global
- Header loads with Raven Docs title.
- Quick capture input is visible and enabled.
- Shortcut tooltip icon shows capture/triage hints.
- Theme switcher opens and swaps themes correctly.

## 3) Sidebar + Navigation
- Space switcher changes spaces correctly.
- Projects section expands/collapses per project.
- Project pages appear nested under the project.
- Pages tree supports create, rename, and move.

## 4) Inbox
- Quick capture adds a task to Inbox.
- Inbox list excludes project tasks.
- "Show Waiting" and "Show Someday" toggles include bucketed items.
- "Start triage" opens the triage queue.

## 5) Today
- Today shows tasks due today only.
- "Open triage" and "Review" buttons navigate correctly.
- Daily note button creates/opens a note.

## 6) Triage
- Select all/none works.
- Bulk assign to project works.
- "Do today" sets due date to today.
- Priority bulk update works.
- Waiting/Someday actions move tasks into buckets.

## 7) Review
- Weekly checklist toggles persist (reload page to confirm).
- "Open weekly review page" opens or creates a page.
- Suggestions render for projects with recent activity.
- Waiting/Someday sections show bucketed tasks.

## 8) Waiting / Someday
- Bucket list renders for each page.
- Single "Return to Inbox" works.
- Bulk return works.

## 9) Projects + Board
- Create project from UI.
- Board loads columns and tasks.
- Drag/drop updates task status.
- Task drawer opens and edits fields.

## 10) Tasks (Drawer)
- Edit title, status, due date, priority.
- Assign/unassign user (if users exist).
- Set bucket tag (Waiting/Someday) and confirm in Inbox/Review.
- Complete and delete task.

## 11) Pages + Editor
- Create page from sidebar.
- Editor formatting (bold/italic/heading) works.
- Diagram embeds (Mermaid/Excalidraw/Draw.io) render.
- Comments add/edit/delete.
- Page history shows revisions.

## 12) Attachments
- Upload attachment to a page.
- Download attachment.
- Delete attachment.
- Attachments page filters by space.

## 13) Search
- Global search finds pages and opens results.
- Space-scoped search filters correctly.

## 14) Settings
- Account preferences save.
- Theme switching persists across reload.
- API keys page loads and can create a key.

## 15) Themes + Styling
- All themes switch with full background coverage.
- Page body matches block background (no contrast seams).
- No footer bar or stray background at bottom of screen.

## 16) Responsiveness
- Mobile sidebar toggle works.
- Header wraps without overlap.
- Pages tree remains usable on tablet.

## 17) MCP Test Pages
- MCP test pages load.
- Navigation tool triggers UI navigation.
