# Sync Protocol — All Agents Must Follow

> Ensures DOMINGO, Kimi, and Claude are always in sync
> Last updated: 2026-05-10

---

## 🔄 The Rule

**Before EVERY session:** Pull latest brain from GitHub.

**After EVERY session:** Push brain changes to GitHub.

**After ANY change — Obsidian or game code:** Push to GitHub immediately. Don't wait until "end of session." Every edit that matters gets committed and pushed.

**No exceptions.** If you don't sync, you're working with stale data.

---

## 📋 Session Start Checklist

### For Kimi & Claude (in Obsidian)

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git pull origin main
```

Then in Obsidian: **Reload vault** (Ctrl+R) to see updates.

**Read in this order:**
1. `brain/PROJECTS/farm-tycoon/HANDOFF.md` — What's happening RIGHT NOW?
2. `brain/MEMORY.md` — Who are we? What's the project?
3. `brain/PROJECTS/farm-tycoon/current-task.md` — What's the current mission?
4. `brain/PROJECTS/farm-tycoon/specs.md` — What specs exist?
5. `docs/ai-coding-rules.md` — Guardrails (Kimi especially)
6. `brain/INBOX.md` — Anything left mid-session that needs handling?

### For DOMINGO (on server)

```bash
cd /root/.openclaw/workspace
git pull origin main
```

**Read in this order:**
1. `brain/PROJECTS/farm-tycoon/HANDOFF.md` — What's happening RIGHT NOW?
2. `brain/MEMORY.md`
3. `brain/PROJECTS/farm-tycoon/current-task.md`
4. `brain/INBOX.md` — Anything left mid-session?
5. Check what Kimi/Claude wrote since last session

---

## 📋 Session End Checklist

### For Kimi & Claude (in Obsidian)

After finishing work:

1. **Update `brain/PROJECTS/farm-tycoon/HANDOFF.md`** — mandatory, always:
   ```markdown
   ### [Agent] — YYYY-MM-DD HH:MM
   - Did: X
   - Left off: exact state of the thing (file, function, what's broken/working)
   - Next agent should: specific next action
   - Blockers: anything blocking progress
   ```

2. **Update the relevant brain file:**
   - Built a feature? → Update `specs.md` (mark ✅) + update progress in `current-task.md`
   - Found a bug? → Add to `backlog.md`
   - Made a non-obvious decision? → Log in `decisions.md`
   - Did research? → Dump in `research.md`
   - Not sure where it goes? → Dump in `brain/INBOX.md`

3. **Update `DAILY/YYYY-MM-DD.md`:**
   ```markdown
   ## Kimi Session — 2026-05-10 14:00
   - Implemented: Encyclopedia search UI
   - Status: 80% done, stuck on animation
   - Next: Need Jose to review
   ```

4. **Push to GitHub:**
   ```bash
   cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
   git add brain/
   git commit -m "Kimi: Encyclopedia search UI 80% done"
   git push origin main
   ```

### For DOMINGO (on server)

After finishing work:

1. **Update relevant brain files:**
   - Tracked state? → Update `current-task.md`
   - Learned something? → Update `MEMORY.md`
   - Coordinated something? → Log in `DAILY/`

2. **Push to GitHub:**
   ```bash
   cd /root/.openclaw/workspace
   git add brain/
   git commit -m "DOMINGO: State update"
   git push origin main
   ```

---

## ⚡ Conflict Resolution

**If git says "merge conflict":**

1. **DON'T PANIC.** It's just two people edited the same file.
2. Open the file in Obsidian (or text editor).
3. Look for these markers:
   ```
   <<<<<<< HEAD
   Your changes
   =======
   Their changes
   >>>>>>> branch-name
   ```
4. Keep what matters, delete the markers.
5. `git add .`, `git commit`, `git push`

**Prevention:**
- Each agent focuses on different files when possible
- Kimi writes to code, updates `specs.md`
- Claude writes to `specs.md`, `decisions.md`
- DOMINGO writes to `current-task.md`, `MEMORY.md`, `DAILY/`
- Jose = touches everything, commits often

---

## 🎯 Who Updates What

| Agent | Primary Files | Secondary Files |
|-------|--------------|-----------------|
| **Jose** | Code, everything | All brain files |
| **Kimi** | Code only — implements exactly what the plan says | `DAILY/` (session notes) |
| **Claude** | `docs/superpowers/specs/`, `docs/superpowers/plans/`, `projects/farm-tycoon/specs.md`, `decisions.md` | `DAILY/`, QA after Kimi |
| **DOMINGO** | `current-task.md`, `MEMORY.md` | `DAILY/`, `AGENTS/` |

**Save key rule:** any time a feature adds new required fields to the Zustand store shape, bump `granja-tycoon-save-v9` → `v10` (etc.) in `store/useGameStore.ts` and update the reference in `projects/farm-tycoon/specs.md`.

**Rule:** You CAN edit any file, but try to stay in your lane to avoid conflicts.

---

## 📡 Communication Protocol

**When Jose tells Kimi: "Build X"**
1. Kimi pulls brain
2. Kimi reads specs for X
3. Kimi reads ai-coding-rules
4. Kimi builds X
5. Kimi updates specs.md (mark X ✅)
6. Kimi pushes brain
7. DOMINGO pulls, sees update, logs it

**When Jose tells Claude: "Spec Y"**
1. Claude pulls brain
2. Claude writes spec to `docs/superpowers/specs/YYYY-MM-DD-feature-name-design.md`
3. Claude writes implementation plan to `docs/superpowers/plans/YYYY-MM-DD-feature-name.md`
4. Claude adds entry to `projects/farm-tycoon/specs.md` index
5. Claude pushes brain
6. Kimi (later) pulls, reads spec + plan, builds it
7. **Claude runs `npx tsc --noEmit && npx expo lint` after Kimi session — zero errors before commit**
8. If new store fields were added: Claude bumps save key (`v9` → `v10`, etc.)
9. Kimi pushes
10. DOMINGO tracks everything

**When DOMINGO does research:**
1. DOMINGO writes to `research.md`
2. DOMINGO pushes
3. Jose/Kimi/Claude pull → reads research → uses it

---

## 📝 Quick Commands Reference

### For Jose (Windows — Command Prompt / PowerShell)
```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"

# Start session
git pull origin main

# End session
git add brain/
git commit -m "Describe what changed"
git push origin main
```

### For Kimi & Claude (in Obsidian — Terminal plugin or system terminal)
Same commands as Jose. Run in terminal, then reload Obsidian vault.

### For DOMINGO (Linux server)
```bash
cd /root/.openclaw/workspace

# Start session
git pull origin main

# End session
git add brain/
git commit -m "DOMINGO: Describe what changed"
git push origin main
```

---

## 🚨 Emergency: Someone's Out of Sync

**Symptom:** Agent is working on old specs, missing critical updates.

**Fix:**
1. Stop working immediately
2. `git pull origin main`
3. Read updated brain files
4. Re-assess
5. Continue or adjust

**If pull fails (conflicts):**
1. Save your work somewhere safe (copy files)
2. `git stash` (saves your uncommitted changes)
3. `git pull origin main`
4. `git stash pop` (applies your changes on top)
5. Fix conflicts if any

---

## ✅ Session Start Summary

Every agent, every time:

```
START:
□ git pull origin main  (+ reload Obsidian Ctrl+R)
□ Read HANDOFF.md       ← most important, tells you right now state
□ Read INBOX.md         ← anything left mid-session to handle?
□ Read MEMORY.md
□ Read current-task.md
□ Read specs.md         (if building)
□ Read ai-coding-rules  (if coding)

WORK:
□ Do the thing
□ Dump anything mid-session into INBOX.md if unsure where it goes

END:
□ Update HANDOFF.md     ← mandatory, always, before anything else
□ Update relevant brain files (specs/backlog/decisions/research/current-task)
□ Update DAILY/YYYY-MM-DD.md
□ git add brain/
□ git commit -m "WHO: What changed"
□ git push origin main
```

**That's it. Simple. But mandatory.**
