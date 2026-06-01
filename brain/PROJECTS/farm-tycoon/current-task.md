# Current Task

> What are we building RIGHT NOW? One thing at a time.
> Update this whenever the mission changes.
> Last updated: 2026-05-19

---

## 🎯 Mission

**Feature:** Living History System — Phase 2: Dynasty Engine
**Assigned to:** Kimi (implements) → Claude (reviews)
**Started:** 2026-05-19
🔵 **PLAN READY — Kimi to implement**

---

## 📋 What "Done" Looks Like (Phase 2)

- [x] `engine/dynasty.ts` — types, initial state, annual aging, health decline, handoff detection, skill gain
- [x] `data/farmerNames.ts` — pool of first/last name pairs
- [x] `engine/legacyScore.ts` — annual legacy delta + handoff contribution
- [x] `engine/inheritance.ts` — buildNextFarmer, buildAncestorRecord
- [x] `store/useGameStore.ts` — DynastyState slice added, performHandoff + earnKnowledge + triggerVoluntaryHandoff actions, advanceDay wired, save key bumped to v12
- [x] `components/office/SettingsSection.tsx` — save key updated v11 → v12
- [x] `components/GameHUD.tsx` — farmer name chip + age + health bar in Row 1, tap navigates to Legado tab
- [x] `components/HandoffModal.tsx` — full-screen modal on pendingHandoff, wired in app/_layout.tsx
- [x] `components/legado/CaracterSection.tsx` — farmer profile, skills grid, knowledge bank, voluntary handoff button
- [x] `components/legado/ArbolSection.tsx` — ancestors family tree
- [x] `app/(tabs)/legado.tsx` — new Legado tab with Caracter + Arbol sub-tabs
- [x] `app/(tabs)/_layout.tsx` — Legado tab registered as 5th visible tab
- [x] TypeScript clean (`npx tsc --noEmit` → 0 errors)
- [x] ESLint clean in new files
- [ ] Pushed to GitHub
- [ ] Claude reviews against spec

---

## 📝 Spec and Plan Files

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-05-19-living-history-system-design.md` | Full system design — all 3 phases |
| `docs/superpowers/plans/2026-05-19-phase2-dynasty-engine.md` | **Kimi's task list — Phase 2 only** |
| `brain/PROJECTS/farm-tycoon/living-history-phases.md` | Phase 2 and 3 approach notes |

---

## ⚠️ Critical Notes for Kimi

- [[ai-coding-rules]] (also at `docs/ai-coding-rules.md`) — **read before starting**
- Save key bumps from `granja-tycoon-save-v11` → `granja-tycoon-save-v12`. Also update `SettingsSection.tsx` (both the export and import AsyncStorage key calls).
- `engine/` files are pure functions only — no store imports. DynastyState gets passed as a parameter.
- `INITIAL_DYNASTY_STATE` calls `createInitialFarmer(1970)` at module load, which picks a random name from the pool. This is intentional.
- When inserting the dynasty block into `advanceDay()`, add a `// === DYNASTY ENGINE ===` header comment and do NOT touch any surrounding blocks.
- New UI components go in `components/legado/` (create the directory). Do NOT put them in `components/office/`.
- `legado.tsx` is a top-level tab (no underscore prefix) — but DO register it with a `<Tabs.Screen name="legado" .../>` entry in `_layout.tsx` like the other 4 main tabs.
- The plan's `inheritance.ts` imports `LAST_NAMES` from `'../data/farmerNames'` at the top — use that import directly. Do NOT use `require()`.
- The `as any` cast on `width: '50%'` style — just use `'50%'` as a string directly; RN accepts `DimensionValue` strings without casting.
- Dynasty skill effects on gameplay (mentor +15%, knowledge bonuses affecting loan rates etc.) are NOT wired in Phase 2. Define and display them, but don't hook them into the game engines yet — that's Phase 3.

---

## ✅ Phase 1 Status (Complete)

Phase 1 (Timeline Engine) was implemented by Kimi and reviewed. Known non-blocking issues:
- Only 16 historical events (1970–1985) out of planned ~40 — Phase 2/3 data work
- `fertiliser_cost`, `loan_rate`, `land_value` effects stored but not consumed — Phase 3
- Save key is v12

---

## 🔗 Phase Roadmap

Phase 1 ✅ → Phase 2 ✅ → **Phase 3 (NEXT)**. See `living-history-phases.md` for full detail.

---

## 📓 Session Notes

### 2026-05-19 — Design session
- Brainstormed and designed the entire Living History System with Jose
- Phase 1 plan written and Kimi implemented it
- Claude reviewed Phase 1, found 3 non-blocking issues (see Phase 1 Status above)
- Phase 2 plan written by Claude (`2026-05-19-phase2-dynasty-engine.md`)
- AI coding rules updated: save key v12, 5th Legado tab, advanceDay block headers, DimensionValue rule, components/legado/ directory
- All pushed to GitHub (commit 6f889a2)
