# Sync Protocol — All Agents Must Follow

> Ensures DOMINGO, Kimi, and Claude are always in sync
> Last updated: 2026-05-10

---

## 🔄 The Rule

**Before EVERY session:** Pull latest brain from GitHub.

**After EVERY session:** Push brain changes to GitHub.

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
1. `brain/MEMORY.md` — What's the state? Who's doing what?
2. `brain/PROJECTS/farm-tycoon/current-task.md` — What's the current mission?
3. `brain/PROJECTS/farm-tycoon/specs.md` — What specs exist?
4. `docs/superpowers/ai-coding-rules` — Guardrails (Kimi especially)

### For DOMINGO (on server)

```bash
cd /root/.openclaw/workspace
git pull origin main
```

**Read in this order:**
1. `brain/MEMORY.md`
2. `brain/PROJECTS/farm-tycoon/current-task.md`
3. Check what Kimi/Claude wrote since last session

---

## 📋 Session End Checklist

### For Kimi & Claude (in Obsidian)

After finishing work:

1. **Update the relevant brain file:**
   - Built a feature? → Update `specs.md` (mark ✅)
   - Found a bug? → Add to `backlog.md`
   - Made a decision? → Log in `decisions.md`
   - Did research? → Dump in `research.md`

2. **Update `DAILY/YYYY-MM-DD.md`:**
   ```markdown
   ## Kimi Session — 2026-05-10 14:00
   - Implemented: Encyclopedia search UI
   - Status: 80% done, stuck on animation
   - Next: Need Jose to review
   ```

3. **Push to GitHub:**
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
| **Kimi** | Code, `specs.md` | `research.md`, `DAILY/` |
| **Claude** | `specs.md`, `decisions.md` | `research.md`, `DAILY/` |
| **DOMINGO** | `current-task.md`, `MEMORY.md` | `DAILY/`, `AGENTS/` |

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
2. Claude writes spec for Y
3. Claude pushes brain
4. Kimi (later) pulls, reads spec, builds it
5. Kimi pushes
6. DOMINGO tracks everything

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
□ git pull origin main
□ Read MEMORY.md
□ Read current-task.md
□ Read specs.md (if building)
□ Read ai-coding-rules (if coding)
□ Do work
□ Update relevant brain files
□ git add brain/
□ git commit -m "WHO: What changed"
□ git push origin main
```

**That's it. Simple. But mandatory.**
