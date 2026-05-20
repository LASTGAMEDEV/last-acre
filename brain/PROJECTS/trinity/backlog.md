
# TRINITY — backlog.md

> Known issues and improvements. Pick from here for the next session.

---

## 🔴 Bugs

### B1 — Workspace path mismatch when changing directories
- **Problem:** `Config` uses `os.getcwd()` at instantiation. If user `cd`s between `trinity start` and `trinity broadcast`, the workspace is in the wrong place.
- **Fix:** Persist `project_dir` in `.trinity/config.json` on `trinity start`, read it back in subsequent commands
- **Effort:** Small — ~20 lines in `config.py` + `main.py`

### B2 — Poller idle-detection doesn't reset on rapid re-broadcast
- **Problem:** `_idle_counts` in `PaneCapture` counts consecutive unchanged polls. If user broadcasts twice quickly, the idle clock from the first broadcast might roll into the second and mark "done" prematurely.
- **Fix:** Compare `current_task.json`'s `started_at` against the time we last saw content change. Reset idle count if a new task was started.
- **Effort:** Small

### B3 — Header stripping too aggressive in `_clean()`
- **Problem:** `_clean()` in `capture.py` skips ALL leading blank lines while `skip_header=True`. If an agent outputs a blank line at the top of its response before any text, those lines get dropped.
- **Severity:** Low — cosmetic
- **Fix:** Only skip header lines matching the exact patterns, keep blank lines after header is cleared

---

## 🟡 Improvements

### I1 — `trinity web` should start `trinity start` if no session running
- Right now: if you open web UI without starting the session, everything shows "Session Stopped"
- Improvement: auto-start session on `trinity web`, or prompt user
- **Partially resolved:** `trinity start --web` now handles the common case (one command starts both)

### I2 — Output.md should show only the *latest response*, not full session history
- Right now: `capture_pane -S -` captures everything since the tmux session started
- Better: snapshot pane content before each broadcast, store as baseline, write only the *delta* to output.md
- Approach: `PaneCapture.capture_agent()` should store a pre-send snapshot, compare after

### I3 — Status.json "done" detection is unreliable for fast agents
- 6 polls × 5s = 30s of no change → "done". Claude is often done in < 30s.
- Better: detect prompt-ready state (e.g., pane ends with `>` or `$` or the agent's specific prompt character)
- Effort: Medium — need per-agent prompt patterns

### I4 — Web UI mobile: sidebar hidden but no hamburger button
- CSS hides sidebar at < 960px but there's no way to access it on mobile
- Fix: add hamburger toggle button in topbar

### I5 — Web UI: show task history, not just current task
- Topbar shows single "current task" text
- Improvement: small dropdown or panel showing last 5 tasks sent

### I6 — `trinity agents --install` helper
- Show install command for missing agents, let user copy
- Already partially there in `cmd_agents` output — just add a copy button in web UI

### I7 — Windows WSL path normalization
- `trinity` installed via Windows Python but user may run from WSL shell
- Paths like `C:\Users\...` vs `/mnt/c/Users/...` cause issues
- Fix: normalize in `Config.__init__`

---

## 💡 Future Ideas

### F1 — Per-agent response isolation (snapshot diff)
- Before send: snapshot pane hash + line count
- After agent goes idle: take new snapshot, diff against pre-send
- Write only the new lines to output.md
- This makes synthesis much cleaner

### F2 — Agent "thinking" animation in web UI
- When status=working, show animated "..." in the agent's output tab
- Small UX polish

### F3 — Keyboard shortcuts in web UI
- `Ctrl+Enter` → broadcast
- `Ctrl+Shift+Enter` → orchestrate
- `Ctrl+S` → sync
