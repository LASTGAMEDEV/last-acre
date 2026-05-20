
# TRINITY — Project Index

> Multi-agent AI orchestrator. Runs Claude, Codex, Kimi, Gemini in parallel tmux panes.
> Repo: `LASTGAMEDEV/trinity` (private GitHub)

---

## Quick Links

- [[trinity/HANDOFF]] — Where we left off (READ THIS FIRST)
- [[trinity/current-task]] — Active task
- [[trinity/specs]] — Full feature list & architecture
- [[trinity/backlog]] — Known bugs & improvements
- [[trinity/decisions]] — Why we built it this way

---

## Agent Protocol for TRINITY

**Before starting:** Read `HANDOFF.md` → `specs.md` → `backlog.md`

**Kimi:** Implements features from backlog. Updates `HANDOFF.md` + `specs.md` after.

**Claude:** Reviews code, fixes bugs, improves architecture and UI. Updates `HANDOFF.md` + `decisions.md` after.

**After any session:**
```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add brain/PROJECTS/trinity/
git commit -m "Claude/Kimi: [what changed]"
git push origin main
```
