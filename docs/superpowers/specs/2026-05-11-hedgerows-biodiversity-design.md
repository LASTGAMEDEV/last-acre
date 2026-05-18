
# Hedgerows & Biodiversity Buffers

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-05-10-pollination-system-design.md` (bee activity), `2026-04-16-pest-disease-cycles-design.md` (pest infestation probability), `2026-05-11-soil-degradation-restoration-design.md` (wind erosion)

---

## 1. Executive Summary

Hedgerows, buffer strips, and pollinator strips are permanent environmental infrastructure placed on parcel edges. They provide realistic ecological benefits: adjacent hedgerows reduce insect pest infestation probability (via beneficial insects — ladybirds, lacewings, ground beetles), woodland edges and mixed hedgerows block wind erosion, and pollinator strips boost bee activity. Buffer strips along waterways are legally required in Spain under the EU Water Framework Directive — parcels without them are already in violation and receive periodic fines.

All hedgerow types count toward CAP greening Ecological Focus Area (EFA) compliance (Spec `2026-05-11-cap-subsidies-design.md`).

---

## 2. Hedgerow Types

| Type | ID | Width | Establishment Cost | Annual Maintenance | Primary Effect |
|------|-----|-------|-------------------|-------------------|----------------|
| Mixed hedgerow | `hdg_mixed` | 3m strip | €400/100m | €50/100m | Insect pest control + wind erosion block + CAP EFA |
| Buffer strip (waterway) | `hdg_buffer` | 6m strip | €200/100m | €30/100m | Runoff compliance + CAP EFA |
| Pollinator strip | `hdg_pollinator` | 2m strip | €150/100m | €20/100m | Bee activity boost + CAP EFA |
| Woodland edge | `hdg_woodland` | 5m strip | €800/100m | €60/100m | Max pest control + max wind protection + CAP EFA |

---

## 3. Placement & Data Model

Hedgerows are placed on **parcel edges** — north, south, east, or west boundary of a parcel. Each edge can hold one hedgerow independently. They're permanent infrastructure, not crops.

```ts
interface Hedgerow {
  id: string;
  type: 'hdg_mixed' | 'hdg_buffer' | 'hdg_pollinator' | 'hdg_woodland';
  parcelId: string;
  edge: 'north' | 'south' | 'east' | 'west';
  lengthM: number;       // default 100m (standard parcel edge)
  plantedDay: number;
  mature: boolean;       // true after 730 days (2 seasons)
}

// Added to GameState:
hedgerows: Hedgerow[];

// Added to Parcel:
waterwayAdjacent: boolean;   // flagged at game start; static
```

A mature hedgerow takes **730 days** (2 growing seasons). Before maturity, all effects are at **50%**. Real hedgerows take 5–7 years for full function — 2 years is a gameplay compression acknowledged in the decisions table.

---

## 4. Insect Pest Control

Mature hedgerows provide habitat for beneficial insects (ladybirds, lacewings, parasitic wasps, ground beetles) that prey on crop pests — aphids, caterpillars, leatherjackets. This **does not affect weeds**. It reduces the probability of pest/disease infestation events on adjacent parcels.

In the pest/disease system (`engine/pests.ts`), the daily pest infestation roll is modified:

```ts
function pestInfestationChance(parcel: Parcel, hedgerows: Hedgerow[]): number {
  const adjacent = hedgerows.filter(h =>
    h.parcelId === parcel.id && h.mature
  );

  const pestControl = adjacent.reduce((sum, h) =>
    sum + HEDGEROW_PEST_CONTROL[h.type], 0
  );

  // Max 50% reduction — can't eliminate pests entirely
  return baseChance * (1 - Math.min(0.5, pestControl));
}

const HEDGEROW_PEST_CONTROL: Record<HedgerowType, number> = {
  hdg_mixed:      0.15,
  hdg_buffer:     0.05,  // riparian habitat has some beneficial species
  hdg_pollinator: 0.10,
  hdg_woodland:   0.25,
};
```

A parcel with a mature mixed hedgerow and a woodland edge on two sides gets 40% pest reduction — meaningful but not eliminating the need for crop protection.

---

## 5. Wind Erosion Protection

Mixed hedgerows and woodland edges on windward parcel edges (north and west in Spanish continental climate) block wind, preventing wind erosion on bare fields.

From the soil degradation spec, wind erosion normally fires when `bareDayCtr >= 7` during drought weather. With a wind-protective hedgerow on the north or west edge:

```ts
const windProtected = hedgerows.some(h =>
  h.parcelId === parcelId &&
  (h.edge === 'north' || h.edge === 'west') &&
  (h.type === 'hdg_mixed' || h.type === 'hdg_woodland') &&
  h.mature
);
if (!windProtected && drought && parcel.bareDayCtr >= 7) {
  parcel.topsoilErosion += 0.02;
}
```

---

## 6. Bee Activity Boost

Pollinator strips adjacent to a parcel increase effective pollination efficiency for linked apiaries. From the pollination spec, a parcel with a mature pollinator strip on any edge gets a +10% effective hive health bonus when computing pollination yield:

```ts
const pollinatorStrips = hedgerows.filter(h =>
  h.parcelId === parcelId &&
  h.type === 'hdg_pollinator' &&
  h.mature
).length;

// Effective hive health boosted, capped at 1.0
effectiveHiveHealth = Math.min(1.0, rawHiveHealth + pollinatorStrips * 0.10);
```

---

## 7. Waterway Buffer Strip — Legal Compliance

Under EU Water Framework Directive (implemented in Spain via Real Decreto 1/2016), buffer strips are **legally required** along watercourses. Parcels flagged `waterwayAdjacent: true` that lack an active `hdg_buffer` on the relevant edge are in violation.

**Enforcement:** Checked during heavy rainfall events (`heavy_rain` weather). If fertilizer was applied within 3 days AND no buffer strip is present:

```ts
if (event === 'heavy_rain' &&
    parcel.waterwayAdjacent &&
    parcel.fertilizerAppliedDay &&
    currentDay - parcel.fertilizerAppliedDay <= 3 &&
    !hasBufferStrip(parcelId, hedgerows)) {
  money -= 500;
  reputation -= 3;
  addNewsEvent("💧 Environmental fine: fertilizer runoff into waterway — €500, −3 reputation (install a buffer strip to comply)");
}
```

At game start, any `waterwayAdjacent` parcel without a buffer strip shows a one-time warning: *"⚠️ [Parcel] borders a watercourse — EU law requires a 6m buffer strip. Install one to avoid fines."*

---

## 8. CAP EFA Compliance

For the CAP Subsidies spec, hedgerows count toward Ecological Focus Area requirements:

- Each mature hedgerow/buffer/strip = 1 EFA unit
- Pollinator strips count as **2 EFA units** (extra biodiversity value)
- Minimum required: 2 EFA units for greening payment qualification

```ts
function getEFACount(hedgerows: Hedgerow[]): number {
  return hedgerows.filter(h => h.mature).reduce((sum, h) =>
    sum + (h.type === 'hdg_pollinator' ? 2 : 1), 0
  );
}
```

---

## 9. Land Area Cost

A hedgerow occupies real parcel land. A 3m strip along a 100m edge = 300m² = 0.03 ha. On a standard 2ha parcel, each hedgerow side removes ~1.5% of productive area. Small but real — visible in the parcel detail as reduced effective hectares.

---

## 10. Maintenance Cost

Annual maintenance is deducted once per year (Spring payment day):

```ts
const maintenanceCost = hedgerows.reduce((sum, h) =>
  sum + HEDGEROW_MAINTENANCE[h.type] * (h.lengthM / 100), 0
);
money -= maintenanceCost;
```

If the player can't pay maintenance, the hedgerow enters a "neglected" state — effects halved until paid. It doesn't disappear.

---

## 11. UI — Parcel Detail: Environmental Infrastructure

```
Environmental Infrastructure
  North edge: [Plant hedgerow ▼]          Cost: €400
  South edge: [Buffer strip — Mature ✅]   Runoff: compliant
  East edge:  [None]
  West edge:  [Pollinator strip 🌱 Growing] Day 245/730

Hedgerow Benefits
  Pest pressure:  −15% (mixed hedgerow, south)
  Wind erosion:   ⚠️ Unprotected (no hedge on north/west)
  Bee activity:   +10% (pollinator strip growing — active at maturity)
  CAP EFA:        1/2 required ⚠️
```

Waterway-adjacent parcels show a persistent compliance badge:
```
💧 Waterway parcel — buffer strip required  [Install →]
```

---

## 12. Implementation Order

### Phase 1 — Data
1. Add `Hedgerow` type and `hedgerows: Hedgerow[]` to `GameState`
2. Add `waterwayAdjacent: boolean` to relevant parcels in initial state
3. Define `HEDGEROW_PEST_CONTROL` and `HEDGEROW_MAINTENANCE` constants

### Phase 2 — Logic
4. `engine/hedgerows.ts` — `computeHedgerowEffects()`, `getEFACount()`, `hasBufferStrip()`
5. `advanceDay()`: mature hedgerows after 730 days; annual maintenance deduction
6. Pest infestation probability: apply `pestControl` modifier in pest roll
7. Wind erosion check: skip if wind-protective mature hedge on north/west edge
8. Bee activity: apply pollinator strip bonus in pollination yield
9. Runoff fine: check heavy_rain + fertilizer + waterway + no buffer

### Phase 3 — UI
10. Parcel detail edge infrastructure panel
11. Hedgerow effects summary panel
12. Waterway compliance badge
13. Maturity progress bar

---

## 13. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Pest control target | Insect pests only (not weeds) — hedgerows provide beneficial insect habitat, not herbicide |
| 2 | Maturity period | 730 days (2 seasons) — real hedgerows take 5–7 years, this is a gameplay compression |
| 3 | Pest control cap | 50% maximum — can't replace crop protection entirely |
| 4 | Buffer strips legally required | Yes — waterway parcels start in violation if uncompliant; fine triggers on runoff events |
| 5 | Woodland edge cost | High (€800/100m) — reflects real planting + fencing cost, premium payoff |
| 6 | Removal | Not implemented — permanent infrastructure (removal would require planning permission in reality) |

---

## 14. Out of Scope

- Hedgerow species-specific effects (hawthorn vs blackthorn)
- Animal grazing on hedgerows
- Timber/biomass harvesting from woodland edge
- Cross-farm hedgerow sharing (co-op feature)
- Hedgerow removal with permit system

---

## 15. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/hedgerows.ts` |
| **Modify** | `types/index.ts` (Hedgerow type, GameState, Parcel.waterwayAdjacent), initial parcel data (waterwayAdjacent flags), `engine/pests.ts` (pest roll modifier), `store/useGameStore.ts` (advanceDay maturity + maintenance + runoff fine + install action), `engine/pollination.ts` (bee activity boost), Fields parcel detail (edge infrastructure panel) |
