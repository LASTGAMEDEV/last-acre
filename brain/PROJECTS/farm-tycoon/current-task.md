# Current Task

> What are we building RIGHT NOW? One thing at a time.
> Update this whenever the mission changes.
> Last updated: 2026-05-19

---

## 🎯 Mission

**Feature:** Living History System — Phase 1: Timeline Engine
**Assigned to:** Kimi (implements) → Claude (reviews)
**Started:** 2026-05-19
✅ **IMPLEMENTED — Claude reviews next**

---

## 📋 What "Done" Looks Like (Phase 1)

- [x] `engine/calendarUtils.ts` — isoDateToGameDay, gameDayToCalendarYear, gameDayToDisplayDate
- [x] `data/historicalEvents.ts` — HistoricalEvent types + 16 events 1970–1985
- [x] `data/historicalPrices.ts` — year-indexed real price table 1970–2026 (scaled to game's price scale)
- [x] `engine/timeline.ts` — advanceTimeline, getTimelineMultiplier, isHistoricallyUnlocked
- [x] `store/useGameStore.ts` — TimelineState slice added, advanceDay wired
- [x] Engine gating — organicCert (≥1990), CAP subsidies (≥1992), CSA (≥1984), hedgerow EFA (≥1992)
- [x] `engine/priceEngine.ts` — uses historical baselines + timeline multipliers
- [x] Fuel price multiplier applied in advanceDay via `getTimelineMultiplier`
- [x] `components/NewspaperModal.tsx` — full-screen modal for major events
- [x] `components/HistoricalToast.tsx` — sliding banner for minor events
- [x] `components/GameHUD.tsx` — calendar year shown prominently
- [x] `app/(tabs)/_layout.tsx` — modal + toast mounted, dismiss wired
- [x] Shop items gated by `isHistoricallyUnlocked()` in `_tienda.tsx`
- [x] `data/productTypes.ts` — unlockId field + glyphosate + BST treatment
- [x] `data/machineTypes.ts` — unlockId field + 4WD tractor
- [x] `data/buildingTypes.ts` — unlockId field for future gates
- [x] TypeScript clean (`npx tsc --noEmit` → 0 errors)
- [x] ESLint clean in new files (no errors, only pre-existing warnings)
- [x] Save key bumped to `granja-tycoon-save-v11`
- [x] Pushed to GitHub (2 commits)
- [ ] Claude reviews against spec
- [ ] Jose approves

---

## 📝 Spec and Plan Files

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-05-19-living-history-system-design.md` | Full system design — all 3 phases |
| `docs/superpowers/plans/2026-05-19-phase1-timeline-engine.md` | **Kimi's task list — Phase 1 only** |
| `brain/PROJECTS/farm-tycoon/living-history-phases.md` | Phase 2 and 3 approach notes |

---

## ⚠️ Critical Notes for Claude's Review

- [[ai-coding-rules]] (also at `docs/ai-coding-rules.md`)
- `engine/` directory (singular, not `engines/`)
- `getYear(day)` in `engine/cooperatives.ts` returns game year (1-based); calendar year = 1969 + getYear(day)
- 360-day game years, 30-day months — all date conversions use this approximation
- Do NOT touch `components/EventBanner.tsx` — it handles existing game events (weather/pests). New HistoricalToast is a separate component
- `activeEvents: GameEvent[]` in store (~line 800) = existing game events. `timeline.activeHistoricalEvents` = new. Do not confuse them.
- **Historical price scaling:** The plan's price table used a different scale than the game's actual `COMMODITY_BASELINES`. Kimi recomputed all values proportionally so 1970 matches the game's baselines (wheat 0.25, corn 0.19, etc.) and subsequent years follow the plan's relative trends.
- **Event targets adapted:** The plan used `beef_price`, `pork_price`, `lamb_price` — the game only has `meat` as a commodity. These were mapped to `meat` in the historical price table. `loan_rate` and `land_value` effects exist in events but are NOT yet wired to any engine (the plan didn't specify wiring them in Phase 1).
- **Shop unlock items added:** Glyphosate (`herbicide_glyphosate_t1`), 4WD Tractor (`tractor_4wd_t1`), and BST (`bst_treatment`) were added to the data files with `unlockId` matching the `UnlockGate` entries in `historicalEvents.ts`.
- **Hedgerow gating:** Only the annual maintenance + CAP subsidy block is gated (≥1992). Daily maturity updates run regardless since they're just boolean flips.
- **CSA gating:** Both season-start and weekly fulfillment are gated (≥1984).
- Save key bumped to `granja-tycoon-save-v11`

---

## 🔗 Phase Roadmap

Phase 1 → Phase 2 → Phase 3. See `living-history-phases.md` for full detail.

---

## 📓 Session Notes

### 2026-05-19 — Full redesign session
- Brainstormed and designed the entire Living History System with Jose
- All major decisions made (see decisions.md)
- Design spec written and approved
- Phase 1 plan written (14 tasks)
- Spec + plan committed and pushed to GitHub
- Kimi will implement Phase 1; Claude reviews afterward


### 2026-05-19 — Implementation session (Kimi)
- All plan tasks implemented
- 2 commits on `main`:
  - `0b7ecd0` — feat(timeline): add calendar utils, historical events DB, price table, timeline engine, NewspaperModal, HistoricalToast
  - `b356bc5` — feat(timeline): wire timeline engine into store, priceEngine, HUD, layout, and shop gating
- TypeScript compiles clean (`npx tsc --noEmit` → 0 errors)
- ESLint clean in new files (only pre-existing warnings in legacy files)
- Ready for Claude's code review against the spec
