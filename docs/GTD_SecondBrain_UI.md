# GTD + Second Brain UI Additions (Proposal)

## Goals
- Capture fast with minimal friction.
- Daily triage and automatic prioritization.
- Projects and pages feel unified (everything is a page).
- Default workflows, minimal customization.

## Core Surfaces
### 1) Universal Inbox
- One-click global capture input (header + keyboard shortcut).
- Accepts quick text, optional tags, optional due date.
- Saves to a single Inbox list (default space).

### 2) Daily Triage View
- Dedicated view: Inbox items, auto-suggested next actions, quick assign.
- Buttons: Next, Schedule, Delegate, Someday, Archive.
- Inline convert to project task or page.

### 3) Today + Timeline
- Today view: tasks with due today + highest priority.
- Timeline view: calendar list and upcoming reminders.
- Optional autosort: urgency + project activity + last touched.

### 4) Projects as Pages
- Project has a home page.
- Project pages show linked documents and tasks.
- Sidebar shows project tree with pages (in progress).

### 5) Journal / Daily Notes
- Auto-create daily journal page.
- Input stream for notes, tasks, ideas.
- “Capture to Inbox” inline action per bullet.

### 6) Reviews
- Weekly review checklist view.
- Stale project review prompts.
- Auto-suggest: “Next action missing”.

## Mapping to Current Models
- Inbox items: tasks with status = Inbox (new enum state).
- Project tasks: existing tasks.
- Project pages: linked via tasks -> pageId or direct project page mapping.
- Journal: pages in a dedicated space or tagged pages.

## Minimal First Iteration
- Global capture input + Inbox list page.
- Daily triage view with quick actions.
- Today view that aggregates due/priority.
- Project home page (page created at project creation).

## Open Questions
- Should Inbox live per workspace or per space?
- Do we allow “Areas” (PARA) as a top-level nav?
