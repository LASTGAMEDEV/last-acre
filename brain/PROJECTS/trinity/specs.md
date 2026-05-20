
# TRINITY — specs.md

> Source of truth for what TRINITY is and does. Update when features ship.

---

## What It Is

Multi-agent AI orchestrator. Runs Claude Code, OpenAI Codex, Kimi Code, Gemini CLI, Aider (and others) in parallel tmux panes. Coordinates them, captures their outputs, and synthesizes results.

**Repo:** `LASTGAMEDEV/trinity` (private)
**Language:** Python 3.8+
**Depends on:** tmux 2.6+, Flask (web UI)
**Web UI port:** 3777

---

## Architecture

```
trinity/
├── agents.py         — Agent detection & registry (AGENT_REGISTRY)
├── broadcast.py      — BroadcastQueue: queued/direct message sending
├── capture.py        — PaneCapture: reads tmux panes → output.md ✅ (added 2026-05-20)
├── config.py         — Layered JSON config (~/.trinity/ + .trinity/)
├── dashboard.py      — Live tmux dashboard window
├── main.py           — CLI entry point (all commands)
├── orchestrator.py   — Adaptive task decomposition & routing
├── synthesis.py      — Result merging: concat / diff / vote
├── tmux_session.py   — Session/pane creation, send-keys, capture-pane
├── workspace.py      — .trinity/ directory scaffold, read/write agent files
└── web/
    ├── server.py     — Flask app, all /api/* routes
    ├── static/app.js — Frontend polling, broadcast, tabs, badges
    ├── static/style.css
    └── templates/index.html
```

---

## CLI Commands

| Command | What it does |
|---------|-------------|
| `trinity start [dir] [--web]` | Create tmux session, scaffold workspace, launch all agents (and web UI) |
| `trinity stop` | Kill tmux session |
| `trinity attach` | Attach to live session (Ctrl+B D to detach) |
| `trinity broadcast "msg"` | Send same message to all agent panes |
| `trinity send agent "msg"` | Send to a specific agent |
| `trinity sync` | Capture all panes NOW → write output.md ✅ |
| `trinity projects` | List all saved projects with status & age |
| `trinity switch <name/num>` | Set active project (all commands target it) |
| `trinity project rm <name>` | Remove project from registry |
| `trinity orchestrate "task"` | Adaptive: coordinator decomposes → routes subtasks |
| `trinity workflow plan.json` | Execute predefined step-by-step plan |
| `trinity synthesize [--method]` | Merge agent outputs (concat/diff/vote) |
| `trinity status` | Show session + agent states |
| `trinity agents` | List detected/available agents |
| `trinity config [key] [val]` | Read/set config |
| `trinity reset` | Clear .trinity/ workspace |
| `trinity web [--port N]` | Start web UI on localhost:3777 |

**Flags:**
| Flag | Applies to | Meaning |
|------|-----------|---------|
| `--agents a,b` | start, broadcast, sync | Select which agents participate |
| `--web` | start | Auto-launch web dashboard in background |
| `--port N` | start --web, web | Dashboard port (default 3777) |

---

## Web UI Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Dashboard HTML |
| `/api/agents` | GET | Agent list + statuses + output previews (polls every 2s) |
| `/api/agents/all` | GET | Agent list (no status) |
| `/api/agents/config` | POST | Update agent role/category |
| `/api/workspace` | GET | Current task, consensus, all outputs |
| `/api/broadcast` | POST | Broadcast to selected agents |
| `/api/send` | POST | Send to single agent |
| `/api/orchestrate` | POST | Start adaptive orchestration (async thread) |
| `/api/synthesize` | POST | Synthesize outputs, write consensus.md |
| `/api/sync` | POST | Force capture all panes → output.md ✅ |
| `/api/health` | GET | Health check + detected agents |

---

## Supported Agents

| Name | Key | Category | Color |
|------|-----|----------|-------|
| Claude Code | `claude` | architect | purple |
| OpenAI Codex | `codex` | implementer | green |
| Kimi Code | `kimi` | reviewer | yellow |
| Gemini CLI | `gemini` | general | blue |
| GitHub Copilot CLI | `copilot` | general | - |
| Aider | `aider` | implementer | - |

---

## Workspace Layout

```
.trinity/              ← created in project dir on `trinity start`
├── config.json
├── current_task.json
├── queue.json
├── agents/
│   ├── claude/
│   │   ├── input.md
│   │   ├── output.md   ← written by PaneCapture ✅
│   │   └── status.json ← state: idle/working/done/error
│   └── codex/
│       └── ...
└── shared/
    └── consensus.md
```

---

## Config Keys

| Key | Default | Meaning |
|-----|---------|---------|
| `orchestrator.default_mode` | `manual` | manual/broadcast/workflow/adaptive |
| `orchestrator.coordinator` | `claude` | Agent that writes the plan in adaptive mode |
| `synthesis.method` | `concat` | concat/diff/vote |
| `broadcast.per_agent_delay` | `0.5` | Seconds between per-agent sends |
| `broadcast.agent_template` | `\n\n---\n[{agent}] {role}\n` | Prefix injected before each broadcast |
| `tmux.session_name` | `trinity` | tmux session name |
| `broadcast.confirm_when_busy` | `true` | Ask confirmation if panes look busy |

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Auto-detect agents | ✅ | `detect_agents()` checks PATH + version commands |
| Parallel tmux panes | ✅ | |
| Broadcast | ✅ | |
| Capture pane output | ✅ | Fixed 2026-05-20 — was wired but never called |
| Full scrollback capture | ✅ | Fixed 2026-05-20 — added `-S -` to tmux capture-pane |
| Auto-poll (5s) | ✅ | `PaneCapture.start_auto_poll()` started in `create_app()` |
| `trinity sync` CLI | ✅ | |
| Project registry (`~/.trinity/projects.json`) | ✅ | Added 2026-05-20 |
| `trinity projects` / `switch` / `project rm` | ✅ | Added 2026-05-20 |
| Auto-register project on `trinity start` | ✅ | Added 2026-05-20 |
| Live project switching in web UI | ✅ | Added 2026-05-20 — no restart needed |
| Config falls back to active project (fixes cd bug) | ✅ | Fixed 2026-05-20 |
| `/api/sync` endpoint | ✅ | |
| Adaptive orchestration | ✅ | |
| Workflow mode | ✅ | |
| Synthesis (concat/diff/vote) | ✅ | |
| Web UI | ✅ | |
| Web UI live polling | ✅ | 2s interval |
| Web UI agent tab badges | ✅ | Added 2026-05-20 |
| Web UI auto-scroll | ✅ | Added 2026-05-20 |
| Web UI last-sync timestamp | ✅ | Added 2026-05-20 |
| Web UI textarea composer | ✅ | Added 2026-05-20 |
| Config persist project_dir | ❌ | Known issue — changing dirs between commands breaks workspace path |
| Auto-start web from `trinity start --web` | ✅ | Added 2026-05-20 — detached subprocess + PID tracking |
