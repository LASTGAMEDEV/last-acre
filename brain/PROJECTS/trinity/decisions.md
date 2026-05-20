
# TRINITY — decisions.md

> Non-obvious architecture decisions and why we made them.

---

## D1 — Capture is pull-based, not push-based (2026-05-20)

**Decision:** TRINITY reads tmux pane content on a timer (every 5s), rather than having agents write to files directly.

**Why:** AI CLI tools (Claude Code, Codex, Kimi) don't have hooks to fire on output. We can't instrument them. The only interface is what appears in their terminal pane. So we poll.

**Trade-off:** 5s delay between agent finishing and output appearing in web UI. Acceptable for this use case.

---

## D2 — `-S -` for full scrollback capture (2026-05-20)

**Decision:** `tmux capture-pane -p -S -` instead of just `-p`.

**Why:** Without `-S -`, tmux only returns the currently visible terminal content (~24 lines). AI responses are often hundreds of lines long. The `-S -` flag tells tmux to include all scrollback history.

**Trade-off:** Capture returns the *entire session history* for that pane, not just the last response. This means `output.md` contains everything since `trinity start`, not just the latest answer. This is a known limitation tracked in backlog as I2.

---

## D3 — Auto-poller started in `create_app()`, not `trinity start` (2026-05-20)

**Decision:** The background poller thread is started by the web server (`create_app()`), not by the tmux session creator (`cmd_start`).

**Why:** Users can run `trinity web` without having used `trinity start` in this process. The poller handles `is_running()` checks internally — if no session, it just does nothing each tick.

**Trade-off:** If user uses only the CLI (no web), there's no auto-poller. They must use `trinity sync` manually. This is acceptable since CLI users are more likely to check outputs directly in tmux.

---

## D4 — Idle detection: 6 polls × 5s = 30s (2026-05-20)

**Decision:** Agent is marked "done" after 6 consecutive polls (30s) with no content change.

**Why:** We can't know when an AI agent is truly done without agent-specific prompt detection. 30s of silence is a reasonable proxy. Fast agents (Codex) sometimes finish in <10s, but we'd rather wait than falsely mark done mid-response.

**Trade-off:** Status shows "working" for 30s after agent finishes. Tracked in backlog as I3.

---

## D5 — `PaneCapture` is a separate module, not baked into `BroadcastQueue` (2026-05-20)

**Decision:** Kimi created `capture.py` as a standalone module, not extending `broadcast.py`.

**Why:** Separation of concerns. Broadcasting (input) and capturing (output) are independent concerns. Also, capture needs to run on a timer even without a broadcast happening.

---

## D6 — Web UI polls `/api/agents` every 2s (frontend), not SSE/websockets

**Decision:** Simple `setInterval` polling, no server-sent events or WebSocket.

**Why:** Simpler to implement and debug. For a localhost tool, 2s polling has negligible overhead.

**Trade-off:** Not real-time. If agent responds in <2s, update appears slightly delayed. Acceptable.


---

## D7 — `--web` flag launches dashboard as detached subprocess (2026-05-20)

**Decision:** `trinity start --web` spawns the Flask server via `subprocess.Popen(start_new_session=True)`, not a thread.

**Why:** `cmd_start()` ends with `os.execvp("tmux", ...)` which replaces the Python process. A thread would die. A detached subprocess survives the exec because it's in a new process group with its own parent (init).

**PID tracking:** `~/.trinity/web.pid` stores the PID so `trinity stop` can `os.kill(pid, 15)` it.

**Trade-off:** Slightly more complex than a thread, but the only way to keep the server alive after tmux attach replaces the parent process.

---

## D7 — Project registry is global (`~/.trinity/`), not per-project (2026-05-20)

**Decision:** `projects.json` lives in `~/.trinity/` alongside user config, not inside any project's `.trinity/`.

**Why:** The registry needs to be readable from *any* directory. A per-project file would defeat the purpose.

---

## D8 — Web UI project switching without server restart (2026-05-20)

**Decision:** `/api/projects/switch` changes the active project in the registry. The Flask app resolves workspace via `_get_workspace()` on each request, so the switch is instant.

**Why:** Restarting Flask from inside itself is messy (exec tricks, PID files, race conditions). Per-request resolution adds negligible overhead for a localhost tool.

**Trade-off:** Agent cache (TTL=10s) is busted on switch. Poller re-reads active project each tick automatically.
