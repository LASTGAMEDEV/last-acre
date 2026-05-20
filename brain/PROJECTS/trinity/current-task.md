
# TRINITY — current-task.md

> What are we working on RIGHT NOW? One task at a time.

---

## Current Task

**Status:** ✅ Completed — waiting for Jose to assign next task

**Completed:** `trinity start --web` auto-launches dashboard + `trinity stop` kills both (2026-05-20)

---

## What Was Done This Session

1. Kimi implemented `capture.py`, `write_agent_output`, `/api/sync`, auto-poller, `trinity sync` CLI
2. Claude fixed scrollback capture (`-S -` flag) and improved web UI
3. Kimi added `trinity start --web` flag + `--port` + background web server lifecycle
4. All pushed to `master`

---

## Up Next (pick from backlog.md)

Suggested priorities:
1. **B1** — Fix workspace path mismatch (small, high impact for multi-dir users)
2. **I2** — Per-response delta capture (write only the latest response to output.md, not full session history)
3. **I1** — Auto-start session from `trinity web` if none running
