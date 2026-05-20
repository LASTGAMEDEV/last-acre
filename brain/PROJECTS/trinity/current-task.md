# TRINITY — current-task.md

> What are we working on RIGHT NOW? One task at a time.

---

## Current Task

**Status:** ✅ Completed — waiting for Jose to assign next task

**Completed:** Project persistence + switcher (2026-05-20)

---

## What Was Done This Session

1. `projects.py` — global registry at `~/.trinity/projects.json`
2. `config.py` — falls back to active project (fixes cd-between-commands bug)
3. `capture.py` — poller tracks active project dynamically
4. `main.py` — `trinity projects`, `trinity switch`, `trinity project rm`; auto-register on start; Windows-safe stop
5. `server.py` — dynamic workspace per request, `/api/projects`, `/api/projects/switch`
6. Web UI — project switcher dropdown in topbar, live switching, no restart needed
7. All pushed to `master` (commit `f6dcb7c`)

---

## Up Next (pick from backlog.md)

Suggested priorities:
1. **B2** — Fix idle detection reset on rapid re-broadcast
2. **I2** — Per-response delta capture (write only the latest response to output.md)
3. **I4** — Mobile hamburger button for sidebar
4. **I3** — Smarter “done” detection (prompt-pattern based, not 30s timer)
