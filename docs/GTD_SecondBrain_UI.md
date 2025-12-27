# GTD + Second Brain UI (Current State)

This document summarizes the GTD/Second Brain experience as implemented in
Raven Docs today.

## Core Goals

- Fast capture with minimal friction.
- Daily triage and automatic prioritization.
- Projects and pages feel unified (everything is a page).
- Default workflows with minimal customization overhead.

## Implemented Surfaces

### Inbox
- Global capture entry point (Journal + quick capture).
- Inbox task list with bucket controls.

### Today
- Daily Pulse (Inbox/Waiting/Someday counts).
- Overdue + Due Today lists.
- Suggested Focus (goal-aware triage summary).
- Agent panels: daily summary, proactive questions, approvals, memory insights.

### Triage
- Triage queue with bulk actions and assignment flows.
- Quick moves to Waiting/Someday.

### Waiting / Someday
- Bucket lists with move-back flows.

### Review
- Weekly review view and checklist patterns.

### Daily Notes / Journal
- Daily note page creation.
- Journal capture that feeds the inbox and memory.

## Project ↔ Page Unification

- Projects are first-class, but pages can be linked to projects and tasks.
- The sidebar shows project-linked pages under project nodes.

## AI + Agent UX

- Memory drawer + insights page.
- Daily summary and proactive questions on Today.
- Approval workflow with explicit confirmation.
- Agent chat drawer available across pages.

## Remaining UI Gaps

- Task label CRUD UI is limited.
- Task extraction from document checklists is not fully wired.
- Some advanced review surfaces (project recap, time tracking) remain in roadmap.

## Design Principles (Applied)

- Minimal, consistent layout.
- Low friction from thought → capture.
- Default workflows over heavy customization.
