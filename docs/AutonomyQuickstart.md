# Autonomy Quickstart

This guide explains how to run the agent loop and approvals workflow.

## Prereqs

- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) configured.
- Postgres + Redis running.
- Memgraph running for memory insights.

## Enable Autonomy

1) Open **Workspace Settings → Agent**.
2) Enable agent and autonomy.
3) Set a daily/weekly schedule and timezone.

## Run Immediately

Use the **Run Now** button in Agent settings to trigger a loop immediately.

## Approvals

- Open **Today → Approvals**.
- Confirm or deny actions.
- Approved actions are executed through MCP handlers and emit real‑time events.

## Troubleshooting

- **No memories**: check Memgraph connection.
- **Approvals don’t execute**: validate MCP policy and ensure handler params are valid.
- **Loop produces no actions**: confirm agent is enabled and inbox/goal data exists.
