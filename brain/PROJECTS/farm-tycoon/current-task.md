# Current Task

> What are we building RIGHT NOW? One thing at a time.
> Update this whenever the mission changes.
> Last updated: 2026-05-19

---

## 🎯 Mission

**Feature:** Living History System — Phase 1: Timeline Engine
**Assigned to:** Kimi (implements) → Claude (reviews)
**Started:** 2026-05-19
**Status:** Plan written. Kimi implements next.

---

## 📋 What "Done" Looks Like (Phase 1)

- [ ] `engine/calendarUtils.ts` — isoDateToGameDay, gameDayToCalendarYear, gameDayToDisplayDate
- [ ] `data/historicalEvents.ts` — HistoricalEvent types + 40 events 1970–1985
- [ ] `data/historicalPrices.ts` — year-indexed real price table 1970–2026
- [ ] `engine/timeline.ts` — advanceTimeline, getTimelineMultiplier, isHistoricallyUnlocked
- [ ] `store/useGameStore.ts` — TimelineState slice added, advanceDay wired
- [ ] Engine gating — organicCert (≥1990), CAP subsidies (≥1992), CSA (≥1984), hedgerow EFA (≥1992)
- [ ] `engine/priceEngine.ts` — uses historical baselines + timeline multipliers
- [ ] `components/NewspaperModal.tsx` — full-screen modal for major events
- [ ] `components/HistoricalToast.tsx` — sliding banner for minor events
- [ ] `components/GameHUD.tsx` — calendar year shown prominently
- [ ] `app/(tabs)/_layout.tsx` — modal + toast mounted, dismiss wired
- [ ] Shop items gated by `isHistoricallyUnlocked()`
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] ESLint clean (`npx expo lint`)
- [ ] Claude reviews against spec
- [ ] Jose approves
- [ ] Pushed to GitHub

---

## 📝 Spec and Plan Files

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-05-19-living-history-system-design.md` | Full system design — all 3 phases |
| `docs/superpowers/plans/2026-05-19-phase1-timeline-engine.md` | **Kimi's task list — Phase 1 only** |
| `brain/PROJECTS/farm-tycoon/living-history-phases.md` | Phase 2 and 3 approach notes |

---

## ⚠️ Critical — Read Before Writing Any Code

- [[ai-coding-rules]] (also at `docs/ai-coding-rules.md`)
- No inline `require()` — top-level `import` only (pre-existing violation at store line 1292 — ignore it, don't add more)
- `engine/` directory (singular, not `engines/`)
- `getYear(day)` in `engine/cooperatives.ts` returns game year (1-based); calendar year = 1969 + getYear(day)
- 360-day game years, 30-day months — all date conversions use this approximation
- Do NOT touch `components/EventBanner.tsx` — it handles existing game events (weather/pests). New HistoricalToast is a separate component
- `activeEvents: GameEvent[]` in store (~line 800) = existing game events. `timeline.activeHistoricalEvents` = new. Do not confuse them.
- Save key must be bumped when TimelineState is added to store shape

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
