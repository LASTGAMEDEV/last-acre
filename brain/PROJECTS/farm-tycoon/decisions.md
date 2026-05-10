
# Decisions Log

> Any non-obvious choice made about the game, architecture, or workflow.
> If a future agent might question WHY we did X, write it here.
> Format: decision → why → date + who.

---

## Architecture

### Save key: `granja-tycoon-save-vN`
Bump N whenever a feature adds or changes required fields in the Zustand store shape. Prevents save corruption on app update.
_2026-05-10 — Jose/Claude_

### Zustand v5 + Expo web: no `persist` with `AsyncStorage` on web
Zustand's persist middleware with AsyncStorage breaks on Expo web due to ESM/import.meta issues. Use localStorage adapter or skip persistence on web.
_Prior session — Claude_

---

## Game Design

_(no game design decisions logged yet — add them as you make them)_

---

## Workflow

### Push to GitHub immediately after any change — not just session end
Prevents work loss if a session crashes or context gets lost mid-task.
_2026-05-10 — Jose_

### Obsidian vault = granja-tycoon/ folder
The vault is opened directly from the repo root. `brain/`, `docs/`, `projects/` all live inside the same git repo. One push syncs everything for all agents.
_2026-05-10 — Jose_

### Kimi implements, Claude reviews — don't let Kimi self-review
Kimi is fast but misses edge cases and security issues. Claude runs `npx tsc --noEmit && npx expo lint` after every Kimi session and reviews against the spec before committing.
_Prior session — Jose/Claude_
