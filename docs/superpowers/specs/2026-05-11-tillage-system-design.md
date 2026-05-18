
# Tillage System Choice

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-03-30-machinery-overhaul-design.md` (machinery system), `2026-04-02-fuel-system-design.md` (fuel), `2026-04-16-pest-disease-cycles-design.md` (weed pressure), `2026-05-11-soil-degradation-restoration-design.md` (compaction, erosion, organic matter)

---

## 1. Executive Summary

Tillage is one of the most consequential long-term decisions a real farmer makes. This spec adds a **per-parcel tillage system choice** that ties machinery, fuel, weed pressure, and soil health into one strategic commitment with realistic multi-season consequences.

Three systems: **conventional tillage** (moldboard plow — high fuel, buries weeds, degrades soil structure), **reduced tillage** (chisel/disc — balanced), and **no-till** (minimal disturbance — builds soil and eventually suppresses weeds, but requires a 2-3 season transition that penalizes yields before paying off). Switching systems has delayed consequences, not instant ones.

---

## 2. Tillage Systems

| System | ID | Fuel Multiplier | Soil OM Drift | Weed Pressure | Machinery Required |
|--------|-----|----------------|--------------|--------------|-------------------|
| Conventional (moldboard plow) | `'conventional'` | 2.5× | −0.002/day | Low (buries seed bank) | Heavy tractor + plow |
| Reduced (chisel/disc) | `'reduced'` | 1.5× | 0 (neutral) | Medium | Medium tractor |
| No-till | `'notill'` | 0.3× | +0.003/day | High → Low over time (see §4) | No-till planter |

---

## 3. Per-Parcel State

```ts
// Added to Parcel type:
tillageSystem: 'conventional' | 'reduced' | 'notill';  // default: 'conventional'
tillageSystemSince: number;    // day the current system was adopted (for transition tracking)
notillSeasons: number;         // completed full seasons of no-till (for weed bank depletion)
residueCoverage: boolean;      // true after harvest if no plowing done (no-till residue)
```

Changing tillage system takes effect at the **next planting** — not mid-crop.

---

## 4. Realistic Weed Pressure — Declining No-Till Bank

In conventional tillage, the weed seed bank is buried deep and rarely germinates. In no-till, seeds sit at the surface and germinate readily — but they also die at the surface without deep burial replenishment. Over 4–5 seasons the surface bank depletes significantly.

**No-till weed pressure multiplier by season:**

| No-till seasons completed | Weed pressure multiplier |
|--------------------------|--------------------------|
| 0 (transition year 1) | × 1.6 |
| 1 | × 1.5 |
| 2 | × 1.4 |
| 3 | × 1.2 |
| 4 | × 1.0 |
| 5+ | × 0.7 (below conventional — depleted bank) |

```ts
function notillWeedMult(notillSeasons: number): number {
  const curve = [1.6, 1.5, 1.4, 1.2, 1.0, 0.7];
  return curve[Math.min(notillSeasons, 5)];
}
```

Conventional tillage stays fixed at × 0.4 (buries seeds). Reduced at × 0.8.

**Weed flush on reversion:** If a parcel switches FROM no-till back to conventional, the first season gets a one-time weed flush: weed multiplier × 2.0 for that season (plowing resurfaces decades of buried seed bank). After one season it normalises to × 0.4. This is flagged with a warning at the moment of switching.

---

## 5. No-Till Transition Yield Penalty

Real farmers see a yield dip for 2–3 years when switching to no-till — soil biology (earthworms, mycorrhizal networks, drainage channels) hasn't adapted yet. Benefits don't appear immediately.

**Yield modifier by no-till seasons completed:**

| Season | Yield modifier |
|--------|---------------|
| 0 (transition year 1) | × 0.92 (−8%) |
| 1 | × 0.95 (−5%) |
| 2 | × 0.98 (−2%) |
| 3+ | × 1.00 (penalty gone) |

```ts
function notillYieldTransitionMod(notillSeasons: number): number {
  const curve = [0.92, 0.95, 0.98, 1.0];
  return curve[Math.min(notillSeasons, 3)];
}
```

Applied in `harvestYield()` alongside other modifiers. The organic matter gain from no-till (+0.003/day) then provides an *additional* yield boost over time, making year 4+ genuinely better than conventional.

---

## 6. Residue Management & Erosion Interaction

**Conventional tillage buries residue.** After plowing, crop residue is incorporated — `residueCoverage = false`. This means the parcel is effectively bare until the next crop establishes, making it vulnerable to erosion (interacts with the soil degradation spec's `bareDayCtr`).

**No-till leaves residue on surface.** After harvest on a no-till parcel, `residueCoverage = true`. This:
- Resets `bareDayCtr` to 0 (residue counts as surface cover — no erosion accumulation)
- Provides 50% of cover crop erosion protection during the gap between crops
- Contributes to organic matter accumulation (already modeled via OM drift)

```ts
// In harvest action:
if (parcel.tillageSystem === 'notill') {
  parcel.residueCoverage = true;
  parcel.bareDayCtr = 0;
}
// In advanceDay() bare field check:
if (parcel.residueCoverage) {
  parcel.bareDayCtr = 0;  // residue protects surface
}
// Residue coverage cleared at planting (next crop takes over)
parcel.residueCoverage = false;  // on planting action
```

**Reduced tillage:** Partial residue incorporation. `residueCoverage = false` but `bareDayCtr` accumulates at 50% speed (disc/chisel leaves some surface material).

---

## 7. Fuel Consumption

Each tractor job on a parcel multiplies fuel cost by the tillage system's multiplier:

```ts
const TILLAGE_FUEL_MULT: Record<TillageSystem, number> = {
  conventional: 2.5,
  reduced: 1.5,
  notill: 0.3,
};
fuelCost = baseFuelCost * TILLAGE_FUEL_MULT[parcel.tillageSystem];
```

---

## 8. Soil Organic Matter Drift

In `advanceDay()`, per cropped parcel:

```ts
const TILLAGE_OM_DELTA: Record<TillageSystem, number> = {
  conventional: -0.002,
  reduced: 0,
  notill: 0.003,
};
if (parcel.planted || parcel.residueCoverage) {
  parcel.organicMatter = Math.max(0.05,
    Math.min(1.0, parcel.organicMatter + TILLAGE_OM_DELTA[parcel.tillageSystem])
  );
}
```

---

## 9. Machinery Requirements

| Tillage System | Minimum Machinery |
|---------------|------------------|
| Conventional | Heavy tractor (≥120hp) + Moldboard plow |
| Reduced | Medium tractor (≥80hp) + Chisel plow or Disc harrow |
| No-till | Any tractor + No-till planter |

**Missing machinery behaviour:** At planting time if required machinery is absent:
- Warning shown: *"⚠️ No-till requires a no-till planter — using reduced tillage for this crop"*
- Falls back to next simpler system for this planting only
- Tillage system setting is NOT changed (player's intention is preserved)
- `notillSeasons` does NOT increment for fallback seasons

---

## 10. New Machinery Implements

Add to machinery catalog:

| ID | Name | Cost | Required For |
|----|------|------|-------------|
| `mach_plow_mb` | Moldboard Plow | €8,500 | Conventional |
| `mach_chisel` | Chisel Plow | €4,200 | Reduced |
| `mach_disc` | Disc Harrow | €3,800 | Reduced (alternative) |
| `mach_notill_planter` | No-Till Planter | €12,000 | No-till |

---

## 11. UI — Tillage Selector

In the Fields screen parcel detail panel:

```
Tillage System
[No-till ▼]   Fuel: Low | Weeds: ↓ (Season 4) | OM: ↑ | Transition: complete
```

Dropdown options show fuel/weed/OM icons. Grayed options show missing machinery tooltip. Warning shown on switching from no-till to conventional: *"⚠️ Reverting to conventional tillage will cause a one-season weed flush as buried seeds resurface."*

**Fields overview header aggregate:**
```
Tillage: 40% conventional · 35% reduced · 25% no-till
```

---

## 12. Implementation Order

### Phase 1 — Data
1. Add `tillageSystem`, `tillageSystemSince`, `notillSeasons`, `residueCoverage` to `Parcel`
2. Add implements to machinery catalog
3. Define `TILLAGE_FUEL_MULT`, `TILLAGE_OM_DELTA` constants and `notillWeedMult()`, `notillYieldTransitionMod()` functions

### Phase 2 — Logic
4. Fuel multiplier in tractor job cost
5. OM drift in `advanceDay()` per parcel
6. Weed multiplier (`notillWeedMult`) in weed growth calculation
7. Transition yield penalty (`notillYieldTransitionMod`) in `harvestYield()`
8. Residue coverage set on harvest, cleared on planting; `bareDayCtr` interaction
9. Weed flush flag when switching notill → conventional
10. `notillSeasons` increment each completed season on no-till
11. Machinery check + fallback at planting with warning

### Phase 3 — UI
12. Tillage selector in parcel detail panel
13. Switch-to-conventional weed flush warning
14. `notillSeasons` progress display ("Season 3 of 5 — weed bank depleting")
15. Aggregate tillage summary in Fields header

---

## 13. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Per-parcel (not farm-wide) | Different fields suit different approaches |
| 2 | No-till weed curve | Realistic depletion over 5 seasons — strategic payoff for patience |
| 3 | Transition yield penalty | 3-season ramp — no-till isn't a free upgrade |
| 4 | Residue counts as cover | No-till residue resets `bareDayCtr` — rewards the system holistically |
| 5 | Weed flush on reversion | One-season penalty for switching back — discourages flip-flopping |
| 6 | Missing machinery | Warning + fallback, doesn't reset `notillSeasons` |

---

## 14. Out of Scope

- Strip tillage (hybrid 4th option)
- Tillage depth control (shallow vs deep disc)
- Subsoil tillage (already in soil degradation spec)
- Residue harvesting for biogas (separate processing spec)

---

## 15. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | None (functions go in `engine/soilDegradation.ts` or new `engine/tillage.ts`) |
| **Modify** | `types/index.ts` (Parcel tillage fields), `data/buildingTypes.ts` (implements), `engine/crops.ts` (transition yield mod), `store/useGameStore.ts` (advanceDay weed/OM/residue + planting machinery check), Fields parcel detail (tillage selector + weed bank progress) |
