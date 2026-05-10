# MEMORY.md — The Shared Brain

> This is the living memory. All agents read this first.
> Updated: 2026-05-10

---

## 📝 AGENT WRITE PROTOCOL

**Every agent must WRITE to these files after working.** Not just read.

| After doing this... | Update this file... | How |
|---------------------|---------------------|-----|
| Implement a feature | `specs.md` | Mark spec ✅, add notes |
| Make a decision | `decisions.md` | Log what was decided and why |
| Do research | `research.md` | Dump findings, link sources |
| Start/end a task | `current-task.md` | Update status |
| Have a session | `DAILY/YYYY-MM-DD.md` | Log what happened |
| Review code | `specs.md` or `decisions.md` | Note changes needed |

**Rule: If you don't write it down, it didn't happen.**

---

## 👤 The Human

**Name:** Jose
**Location:** Madrid, Spain (Europe/Madrid timezone)
**Study:** Agricultural engineering student
**Work style:** Night owl. Peak productivity = evening/night.
**Communication:** Direct, casual, lowercase-friendly. No fake politeness.
**Permission:** Agent has FULL freedom — call him out when he's being stupid.

**Family:** Mom, Dad, Granny, 2 sisters, 2 dogs
**Key people:** Archie — Irish farmer friend, recommends stuff for the game

**Languages:** Fluent English + Spanish (bilingual collaboration OK)

---

## 🎮 Active Projects

### Primary: FArM TYCOON (granja-tycoon)
- Mobile agriculture simulation game
- Realistic mechanics based on real ag engineering knowledge
- NOT ready to ship — perfectionist standards
- Foundation for future 3D Anno 117 style game

### Secondary: lastgamestudio Website
- Needs to be "mad big, fancy"
- Motion design elements
- Domain already owned

### Tertiary: Kickstarter Campaign
- Planning in progress
- Spanish tax implications need research
- Stretch goals = realistic
- Backers get credit toward future 3D game

---

## 🤖 Agent Team

### DOMINGO (Coordinator)
- **Role:** Mission control, keeps everything in sync
- **Personality:** Hype friend, bright, protective, kinetic
- **Job:** Track state, dispatch work, consolidate results, keep morale up
- **Always reads:** This file + specs + current-task before acting
- **Always writes:** DAILY logs, current-task updates, MEMORY.md updates

### Kimi (Implementation Engine)
- **Role:** Code builder, fast and cost-effective
- **When to spawn:** "Build this feature", "Write this module", "Refactor"
- **Guardrails:** Must read `docs/superpowers/ai-coding-rules` before coding
- **Always writes:** specs.md (mark things done), code, technical notes

### Claude (Spec Designer + QA)
- **Role:** Designs specs, then reviews implementations
- **When to spawn:** "Design the spec for X", "Review this", "Audit"
- **Always writes:** specs.md (creates them), decisions.md, review notes

---

## 🗂️ Brain Structure

```
brain/
├── MEMORY.md              ← You are here (long-term memory)
├── AGENTS/
│   ├── DOMINGO.md         ← My full personality + our history
│   ├── KIMI.md            ← Kimi context and preferences
│   └── CLAUDE.md          ← Claude context and preferences
├── PROJECTS/
│   └── farm-tycoon/
│       ├── specs.md       ← Game specs & current state
│       ├── current-task.md ← What we're doing RIGHT NOW
│       ├── decisions.md   ← Why we chose X over Y
│       ├── backlog.md     ← Future features
│       └── research.md    ← Research findings
├── DAILY/
│   └── 2026-05-10.md      ← Today's session log
└── REFERENCE/
    ├── ai-coding-rules.md  ← Link to guardrails
    ├── agriculture-data.md  ← Real farming data for game
    └── competitors.md       ← Farm Manager 2026, etc.
```

---

## 🔑 Important Rules

1. **Always read MEMORY.md first** before doing anything
2. **Update files after every session** — if you don't write, you don't remember
3. **current-task.md** = single source of truth for what's happening now
4. **decisions.md** = capture why we made choices (prevents re-debating)
5. **Text > Brain** — memory is limited, files survive

---

## 📌 Current Status

- Brain structure: ✅ Created by Jose in Obsidian
- ACP harnesses: ❌ Not configured yet (Kimi Code + Claude Code)
- Git sync: ⚠️ Needs `brain/` added to GitHub repo
- Next task: Research realistic agriculture mechanics

---

## 🎯 Next Actions

1. Push `brain/` to GitHub
2. Start research on realistic ag mechanics
