
# Current Task

> What are we building RIGHT NOW? One thing at a time.
> Update this whenever the mission changes.
> Last updated: 2026-05-11

---

## 🎯 Mission

**Feature:** Implement 9 new approved specs (batch 2)
**Assigned to:** Kimi
**Started:** 2026-05-11
**Status:** Ready — all specs written and approved, no plan files yet (Claude writes plans first if needed, or Kimi implements directly from specs)

---

## 📋 What "Done" Looks Like

- [x] Soil Degradation & Restoration: engine + store + UI
- [x] Tillage System: engine + store + UI
- [x] Hedgerows & Biodiversity: engine + store + UI
- [x] CAP Subsidies: engine + store + UI
- [x] Organic Certification: engine + store + UI
- [x] Land Leasing & Sharecropping: engine + store + UI
- [x] Storage Quality Decay: engine + store + UI
- [x] Night Operations: engine + store + UI
- [x] CSA (Community Supported Agriculture): engine + store + UI
- [x] TypeScript clean (`npx tsc --noEmit`)
- [x] ESLint clean (`npx expo lint`) — zero errors (only pre-existing warnings)
- [x] Jose approves
- [ ] Pushed to GitHub

---

## 📝 Spec Files — Read these FIRST

All specs are in `docs/superpowers/specs/`:

| # | Spec | File |
|---|------|------|
| 1 | Active Soil Degradation & Restoration | `2026-05-11-soil-degradation-restoration-design.md` |
| 2 | Tillage System Choice | `2026-05-11-tillage-system-design.md` |
| 3 | Hedgerows & Biodiversity Buffers | `2026-05-11-hedgerows-biodiversity-design.md` |
| 4 | CAP Subsidies & Agri-Environment Schemes | `2026-05-11-cap-subsidies-design.md` |
| 5 | Organic Certification & Transition Period | `2026-05-11-organic-certification-design.md` |
| 6 | Land Leasing & Sharecropping | `2026-05-11-land-leasing-sharecropping-design.md` |
| 7 | Storage Quality Decay | `2026-05-11-storage-quality-decay-design.md` |
| 8 | Night Operations & Time-Optimised Scheduling | `2026-05-11-night-operations-design.md` |
| 9 | Community Supported Agriculture (CSA) | `2026-05-11-csa-community-supported-agriculture-design.md` |

**Suggested implementation order:** 7 → 1 → 2 → 3 → 4 → 5 → 6 → 8 → 9
(Storage Quality first because it changes `inventory` to `inventoryBatches` — other specs read inventory)

---

## ⚠️ Critical — Read Before Writing Any Code

- [[ai-coding-rules]] (also at `docs/ai-coding-rules.md`) — guardrails, must read first
- Save key is `granja-tycoon-save-v10` (already bumped by Kimi)
- Always `??` guard new optional fields — existing saves won't have them
- Currency is **€** not `$`
- No inline `require()` — top-level `import` only
- No unused imports

---

## 🔗 Dependencies Between Specs

- **Spec 7 (Storage Quality)** changes `inventory: Record<string, number>` → `inventoryBatches: StoredBatch[]`. Implement this first; all harvest/sell actions will need updating.
- **Spec 1 (Soil Degradation)** uses `soilWetUntilDay` driven by `WeatherEvent` — already in `engine/climate.ts`
- **Spec 3 (Hedgerows)** hooks into `engine/pests.ts` pest infestation probability (NOT weed system)
- **Spec 5 (Organic)** depends on Spec 3 (hedgerows exist) and pesticide tracking (`pesticideSprayedDay` already on parcels)
- **Spec 6 (Leasing)** tenant improvements reference Spec 3 hedgerow installation

---

## 🔄 Progress

- [x] Specs written
- [x] Plans written (optional — Kimi can work from specs directly)
- [x] Kimi implements
- [x] Claude reviews
- [x] TypeScript clean
- [x] ESLint clean
- [x] Jose approves
- [ ] Pushed to GitHub

---

## 🚧 Blockers

_(none — all 9 specs are approved and ready)_

---

## 📓 Session Notes

### Previous batch (completed 2026-05-11)
- Pollination, Feed Ration, Manure/Composting, Precision Ag — all fully implemented and reviewed by Claude
- Minor fixes applied: € symbol, no inline require(), no unused imports
- Coding rules updated in `docs/ai-coding-rules.md`
