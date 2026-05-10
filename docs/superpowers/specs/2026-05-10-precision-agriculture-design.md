
# Precision Agriculture — Soil Testing Lab

**Date:** 2026-05-10  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-16-npk-drainage-soil-rework-design.md` (soil system), `2026-04-16-pest-disease-cycles-design.md` (weed/pest flags), `2026-04-05-realistic-animal-production-design.md` (harvester yield data)

---

## 1. Executive Summary

Add a late-mid-game "precision layer" that rewards players who invest in soil intelligence. Four sub-systems: soil sampling with lab reports, variable-rate input application, yield history mapping, and precision spot-spraying. Unlocks at reputation ≥ 65. Access starts via hired agronomist service; a Soil Lab building reduces cost in late game.

**What this fixes / adds:**
- Soil system currently applies blanket NPK — no per-parcel optimization
- Weed spray is always 100% cost even if weeds barely exist
- No feedback loop between past harvests and current field decisions
- Late-game players have nothing to optimize beyond buying more land

---

## 2. Unlock Condition

**Reputation ≥ 65** gates all precision ag features. Below this threshold:
- Agronomist service does not appear in the Shop/Ops hiring menu
- Precision tab in Fields is hidden
- Soil Lab building is not listed in buildings

No other prerequisites. Players can reach rep 65 without owning many parcels.

---

## 3. Sub-system 1 — Soil Sampling & Lab Reports

### 3a. Two Access Methods

| Method | Cost per parcel | Turnaround | Unlock condition |
|--------|----------------|------------|-----------------|
| Hire Agronomist (service) | $400–$800 (scales with parcel hectares) | 3-day delay | Rep ≥ 65 |
| Owned Soil Lab building | $150/parcel | 1-day delay | Build Soil Lab ($45,000) |

Cost formula for hired service: `baseCost = 200 + parcel.hectares * 60`. Capped at $800.

### 3b. Analysis Flow

1. Player taps "Order Soil Analysis" on a parcel card (Precision tab)
2. Cost deducted immediately from cash
3. A `pendingAnalysis` entry is added: `{ parcelId, arrivesDay: currentDay + delay }`
4. On `arrivesDay`, the analysis resolves in `advanceDay()`:
   - `soilAnalysis` object written to parcel
   - Notification: *"Soil report ready for [ParcelName]"*
5. Player can order re-analysis any time — overwrites previous report

### 3c. Report Contents

```ts
interface SoilAnalysis {
  analyzedDay: number;
  score: number;           // 0-100 overall precision score
  recommendation: string;  // e.g. "Apply 42 kg/ha N + lime (pH 0.4 deficit)"
  optimalN: number;        // kg/ha
  optimalP: number;
  optimalK: number;
  optimalPh: number;
  deficitN: number;        // how far below optimal (can be negative = surplus)
  deficitP: number;
  deficitK: number;
  deficitPh: number;
}
```

**Score formula:** Starts at 100, subtract points for each deficit/surplus: `Math.abs(deficit) * 2` per nutrient, capped at 25 per nutrient. Score 80+ = "Healthy", 50–79 = "Needs attention", <50 = "Critical".

**Recommendation string** is auto-generated from deficits: lists specific amendments in plain English. If all values are optimal, says *"No amendments needed — soil is in excellent condition."*

### 3d. Report Staleness

A report older than 2 seasons (60 days) shows a "⚠️ Stale" badge — soil may have changed. Soil events (flood, heat wave, heavy NPK application) immediately mark the report stale.

---

## 4. Sub-system 2 — Variable-Rate Application

### 4a. Precision Apply Action

After a valid (non-stale) soil analysis exists for a parcel, a **"Precision Apply"** button appears alongside the normal fertilizer controls:

- Calculates exact input quantities from `soilAnalysis.optimalN/P/K/Ph`
- Applies only what's needed — if soil already has adequate P, no P is used
- Saves 20–35% vs. blanket application on average
- Costs are deducted from existing fertilizer inventory (same as manual apply)

If the player lacks sufficient fertilizer inventory for precise application, the UI shows a shortfall message: *"Need 40 kg N — only 22 kg in stock."*

### 4b. Efficiency Bonus

Precision-applied parcels get a **+5% yield modifier** for that crop cycle (GPS-guided accuracy reduces waste). This is separate from NPK soil bonuses. Flag: `precisionApplied: boolean` per parcel, reset at harvest.

### 4c. Cost Comparison UI

Before confirming Precision Apply, show a side-by-side cost card:

```
Blanket application:  140 kg N · 80 kg P · 60 kg K  →  $1,240
Precision application: 95 kg N · 40 kg P · 20 kg K  →  $780
Savings: $460 (37%)
```

---

## 5. Sub-system 3 — Yield Mapping

### 5a. Automatic Recording

Every harvest automatically appends to `parcel.yieldHistory`:

```ts
yieldHistory: Array<{
  season: string;    // e.g. "Spring Y2"
  cropId: string;
  kgPerHa: number;
  day: number;
}>;
```

Rolling window: keep last 8 entries (≈ 2 years of data). Older entries are dropped.

### 5b. Yield Trend Indicator

In the Fields parcel list, each parcel shows a trend chip (only visible if ≥ 2 harvests recorded):

| Trend | Condition | Display |
|-------|-----------|---------|
| ↑ Rising | Last harvest > previous by >10% | Green ↑ |
| → Stable | Within ±10% | Gray → |
| ↓ Declining | Last harvest < previous by >10% | Orange ↓ |
| ⚠️ Underperforming | 3+ consecutive ↓ or last harvest <60% of crop avg | Red flag |

### 5c. Underperforming Alert

If a parcel is flagged "Underperforming," a notification fires once per season:
> *"[ParcelName] has had 3 poor harvests. Consider ordering a soil analysis."*

Tapping the notification opens the parcel's Precision tab directly.

### 5d. Yield Map View

In the Precision tab (parcel list), an optional "Yield Map" toggle switches from list to a simple grid view — each parcel card shows its kgPerHa trend as a mini sparkline (last 4 harvests as 4 bars).

No interactive charts. Just bars. Keeps it fast.

---

## 6. Sub-system 4 — Spot Spraying

### 6a. Early Weed Detection

Parcels already have `hasWeeds: boolean`. With precision ag active, weeds get a **2-day early warning** before `hasWeeds` flips to true:

```ts
weedDetectedDay?: number;  // set 2 days before hasWeeds becomes true
```

During the 2-day window, a "⚠️ Weeds detected early" badge shows on the parcel. If the player sprays during this window, it counts as spot-spraying.

### 6b. Spot-Spray Cost Reduction

| Spray timing | Herbicide cost | Yield penalty avoided |
|-------------|---------------|----------------------|
| Normal spray (hasWeeds = true) | 100% cost | Stops spread |
| Spot spray (early window) | 40% cost | Prevents yield loss entirely |
| No spray | 0 cost | −15–25% yield + spread risk |

Spot spray uses same `spray` machinery operation — just cheaper. The cost multiplier: `0.40` if `weedDetectedDay` is set and within the window.

### 6c. Precision Pesticide (Pest Cycles)

Similarly, when a pest infestation is detected (from pest/disease system), with precision ag active the player gets a **1-day early warning** before infestation damage starts. Early treatment costs 50% of normal spray cost.

---

## 7. State Changes

### 7a. Per-Parcel additions

```ts
// Added to existing Parcel type:
soilAnalysis?: SoilAnalysis;      // undefined = not yet analyzed
precisionApplied: boolean;         // reset at harvest
yieldHistory: YieldEntry[];        // rolling 8 entries
weedDetectedDay?: number;          // set 2 days before hasWeeds flips
```

### 7b. Global state additions

```ts
// Added to GameState:
soilLabBuilt: boolean;                                    // false default
pendingAnalyses: Array<{
  parcelId: string;
  arrivesDay: number;
}>;
precisionAgUnlocked: boolean;  // derived: reputation >= 65, but cached for perf
```

### 7c. Save key

No change to `granja-tycoon-save-v9` — all new fields have safe defaults (`undefined`, `false`, `[]`). Old saves load fine.

---

## 8. UI — Precision Tab

New sub-tab **"Precision"** added to the Farm → Fields composite screen. Only visible when `precisionAgUnlocked`.

### 8a. Tab Layout

```
[Fields] [Precision] [Calendar] ...
```

### 8b. Precision Tab Content

**Top card:** Soil Lab status — either "Hire Agronomist" CTA, or if `soilLabBuilt`, shows lab status (ready / analyses pending).

**Parcel list** (one card per owned parcel):
- Parcel name + hectares
- Soil score chip: "Score 84 ✅" / "Score 42 ⚠️" / "Not analyzed"
- Yield trend: ↑ / → / ↓ / ⚠️ chip
- Weed status: Early warning badge if applicable
- Actions: [Order Analysis] / [Precision Apply] (if analysis valid)
- Pending analysis: "Report arriving in 2 days" spinner

**Yield Map toggle** (top-right of parcel list): switches to sparkline grid view.

### 8c. Analysis Report Sheet

Tapping a parcel with a valid report opens a bottom sheet:

```
🌱 North Field — Soil Report
Analyzed: Day 142 (Spring Y2)

Score: 78 / 100 — Needs Attention

NITROGEN    Current: 42  Optimal: 85  ↓ Deficit: 43
PHOSPHORUS  Current: 31  Optimal: 30  ✅ OK
POTASSIUM   Current: 18  Optimal: 45  ↓ Deficit: 27
pH          Current: 5.9 Optimal: 6.5 ↓ Deficit: 0.6

Recommendation:
Apply 43 kg/ha N + 27 kg/ha K + lime amendment

[Precision Apply — $620]  [Close]
```

---

## 9. Buildings

### Soil Lab (`bld_soil_lab`)

| Field | Value |
|-------|-------|
| Name | Soil Testing Lab |
| Cost | $45,000 |
| Category | Processing / Science |
| Unlock | Rep ≥ 65 |
| Effect | Reduces analysis cost to $150/parcel, turnaround 1 day |
| Staffing | Works without workers; 1 assigned worker cuts turnaround to same-day |

---

## 10. Implementation Order

### Phase 1 — Data layer
1. Add `SoilAnalysis`, `YieldEntry` types to `types/index.ts`
2. Add `soilAnalysis`, `precisionApplied`, `yieldHistory`, `weedDetectedDay` to `Parcel` type
3. Add `soilLabBuilt`, `pendingAnalyses`, `precisionAgUnlocked` to `GameState`
4. Add `orderSoilAnalysis(parcelId)` action to store
5. In `advanceDay()`: resolve pending analyses, append yield history on harvest, set `weedDetectedDay` 2 days before `hasWeeds` flips
6. Add `bld_soil_lab` to buildings data

### Phase 2 — Logic
7. Implement `generateSoilAnalysis(parcel): SoilAnalysis` in `engine/precision.ts`
8. Implement `calcPrecisionApplyCost(parcel, analysis)` — returns `{ inputs, cost, savings }`
9. Implement `applyPrecisionInputs(parcelId)` store action
10. Add spot-spray cost multiplier to spray logic

### Phase 3 — UI
11. Add "Precision" sub-tab to Farm screen (hidden below rep 65)
12. Build `PrecisionTab.tsx` — parcel list with soil scores, yield trends, order buttons
13. Build `SoilReportSheet.tsx` — bottom sheet with full report + Precision Apply
14. Add yield trend chips to existing Fields parcel cards (even outside Precision tab)
15. Add weed early-warning badge to parcel cards

---

## 11. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Zone granularity | Per-parcel. No sub-parcel grid. |
| 2 | Access model | Hire first (rep ≥ 65), build lab later ($45k) |
| 3 | Unlock gate | Reputation ≥ 65 |
| 4 | Scope | All 4 sub-systems in one spec |
| 5 | Save key | No bump needed — all fields have safe defaults |
| 6 | Yield map | Simple sparkline bars, no interactive chart |

---

## 12. Out of Scope

- Sub-parcel zone grids
- Drone-based spraying (future feature)
- Soil carbon sequestration tracking
- Satellite imagery UI
- Integration with co-op / shared lab costs
- Agronomist as a hirable permanent worker (distinct from the hire-per-analysis service)

---

## 13. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/precision.ts`, `components/farm/PrecisionTab.tsx`, `components/farm/SoilReportSheet.tsx` |
| **Modify** | `types/index.ts` (Parcel + GameState), `store/useGameStore.ts` (actions + advanceDay), `data/buildings.ts` (soil lab), `app/(tabs)/farm.tsx` (new sub-tab) |
| **No change** | Soil engine, NPK engine, pest engine (read-only from precision layer) |
