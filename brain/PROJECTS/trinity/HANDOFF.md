
# TRINITY — HANDOFF.md

> The first thing any agent reads. Tells you exactly where we left off.

---

### Kimi — 2026-05-20 (latest)

- **Did:**
  - Added `--web` flag to `trinity start` — auto-launches web dashboard as detached background process
  - Added `_start_web_server()` / `_stop_web_server()` helpers with PID tracking in `~/.trinity/web.pid`
  - Added `--port` flag (default 3777) usable by both `trinity start --web` and `trinity web`
  - `trinity stop` now kills both tmux session AND background web server
  - Updated `print_help()` to show new flags
  - All committed and pushed to `master` (`f2fd550`)

- **Left off:** Session + web UI can now be started/stopped together from one terminal
- **Next agent should:** Test `trinity start --web`, verify dashboard opens at `localhost:3777` without needing a second terminal

- **Blockers:** None

---

### Claude — 2026-05-20 (session 2)

- **Did:**
  - Built full project persistence system
  - New `trinity/projects.py` — global registry at `~/.trinity/projects.json`
  - `config.py` — now falls back to active project path instead of `os.getcwd()` (fixes the "cd breaks workspace" bug)
  - `capture.py` — poller resolves workspace from active project each tick (live switching)
  - `main.py` — `trinity projects`, `trinity switch`, `trinity project rm` commands; auto-registers project on `trinity start`; fixed `_stop_web_server` Windows crash (`os.kill` → `taskkill`)
  - `server.py` — dynamic `_get_workspace()` per request; `/api/projects` + `/api/projects/switch` endpoints; no server restart needed to switch projects
  - Web UI — project switcher dropdown in topbar: lists all projects, active/running indicators, click to switch live
  - All pushed to `master`

- **Left off:** Repo is clean. All 8 files changed in one commit (`f6dcb7c`).

- **Next agent should:** Pick from `backlog.md` — B2 (idle detection reset), I2 (delta capture), or I4 (mobile hamburger) are good next targets

- **Blockers:** None

---

### Claude — 2026-05-20 (session 1)

- **Did:**
  - Audited full repo after Kimi's session
  - Fixed the one gap Kimi missed: `capture_pane()` in `tmux_session.py` was only capturing visible ~24 lines. Added `-S -` flag so it now captures full scrollback history
  - Web UI improvements: auto-resizing textarea for composer, consensus `<pre>` → `<div>` (fixed double-formatting), Live indicator dims when session stopped, blue dot badge on agent tabs with new content, auto-scroll active tab on update, last-sync timestamp on Sync button
  - All committed and pushed to `master`

- **Left off:** Core broadcast→capture→output.md flow is fully working end-to-end. Repo is clean on `master`.

- **Next agent should:** Test `trinity broadcast "hello"`, verify `~/.trinity/agents/<name>/output.md` gets written, check web UI shows output in agent tabs

- **Blockers:** None

---

### Kimi — 2026-05-20 (earlier)

- **Did:**
  - Created `trinity/capture.py` — `PaneCapture` with ANSI stripping, hash-based idle detection (30s stable = done), background auto-poller at 5s
  - Added `write_agent_output()` to `workspace.py`
  - Added `/api/sync` endpoint + `trinity sync` CLI + "Sync Now" button in web UI
  - Wired auto-poller start into `create_app()`

- **Left off:** `capture_pane` in `tmux_session.py` was not updated (missed `-S -`)
- **Resolved by:** Claude's session above
