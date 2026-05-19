
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

### Living History System — core concept (2026-05-19 — Jose/Claude)
Game starts in 1970. Real historical events fire on their exact dates (USDA/World Bank data). Everything is gradual — ramp-up, peak, ramp-down phases. No instant switches. Fictional brand names (replaceable later). Generic geographic setting. Soft fail only — no hard game-over.

### Multi-generational dynasty with health-driven handoff (2026-05-19)
Farm passes through generations. Handoff triggers at health < 30 (forced) or voluntary if heir is ≥18. Original farmer can stay as mentor after handoff — gives skill bonus for a few years. At least one child always wants the farm (guaranteed succession). Legacy score accumulates across all generations and never resets.

### No energy bar — no artificial limitations (2026-05-19 — Jose)
Jose explicitly rejected any energy mechanic. Farmer stats are Age and Health only. Health affects what you can physically do (and triggers succession) but there is no "stamina" or "daily action limit."

### Reputation recalculates weekly, not daily (2026-05-19)
Daily recalculation was too noisy and gameable. Weekly cadence makes it feel like a real community standing that shifts over time.

### Historical events are gradual, not instant (2026-05-19 — Jose)
Even though we know exact real dates, in the simulation everything phases in. Events have rampUpDays / peakDays / rampDownDays. Oil embargo 1973: ramp 30 days, peak 240 days, ramp-down 60 days.

### Engine gating by calendar year (2026-05-19)
Existing engines are skipped before their real-world invention/legislation date: organicCert (≥1990), CAP subsidies (≥1992), CSA engine (≥1984), hedgerow EFA scheme (≥1992). This prevents anachronistic gameplay.

### Architecture: engine modules + static event database (2026-05-19)
Follows the existing pattern. Pure functions in `engine/`. Static data in `data/`. Timeline state lives in Zustand store as a TimelineState slice. No external API calls for events — everything is baked in at build time.

### Three-phase implementation (2026-05-19)
Phase 1: Timeline engine (history + prices + event UI)
Phase 2: Dynasty engine (farmer character, aging, succession, legacy score)
Phase 3: Family + Reputation + Neighbors
Each phase ships and is reviewed before the next plan is written.

### Full player agency on personal life events (2026-05-19 — Jose)
Dating, marriage, children — player chooses. No forced relationships. Personal events pause the game and show a decision card. No right answer, just your story.

### 360-day calendar conversion (2026-05-19)
Game uses 360-day years (30-day months). Real ISO dates are mapped to game days via approximation: isoDateToGameDay in `engine/calendarUtils.ts`. Calendar year = 1969 + getYear(day).

### Historical events data covers 1970–1985 in Phase 1 (2026-05-19)
Expanding to 1986–2026 is a separate data task deferred to Phase 2 or 3. It's data work, not logic work.

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
