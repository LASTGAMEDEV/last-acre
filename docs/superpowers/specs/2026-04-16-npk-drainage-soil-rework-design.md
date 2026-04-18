# NPK + Drainage Soil Rework — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Goal

Extend the soil system with three new stats — **Phosphorus (P)**, **Potassium (K)**, and **Drainage** — and replace the flat `fertilized: boolean` model with a proper NPK application system. Each nutrient depletes independently per crop harvest and must be replenished with specific products. Drainage interacts with the existing heavy rain climate events.

---

## Architecture

All soil math stays in `engine/crops.ts` (pure functions, no Zustand imports). The store extends `SoilStats`, updates `PlantedCrop`, and wires the new drain logic into `advanceDay()` / harvest call sites. The UI adds P, K, and drainage bars to the existing Soil sub-tab in `tierras.tsx` and updates the planting modal to show NPK product selection. Save key bumps v4 → v5 with a migration function.

---

## Data Model Changes

### `engine/crops.ts` — SoilStats

```typescript
export interface SoilStats {
  nitrogen: number;       // 0–100, optimal 60–80 (existing)
  organicMatter: number;  // 0–10, optimal 4–7 (existing)
  compaction: number;     // 0–100, optimal 0–25 (existing)
  pH: number;             // 4.0–8.5, optimal 6.0–7.0 (existing)
  microbialLife: number;  // 0–100, optimal 60–100 (existing)
  phosphorus: number;     // NEW: 0–100, optimal 40–70
  potassium: number;      // NEW: 0–100, optimal 40–70
  drainage: number;       // NEW: 0–100, optimal 60–100 (lower = waterlogged)
}

export const SOIL_DEFAULTS: SoilStats = {
  nitrogen: 65,
  organicMatter: 4.5,
  compaction: 20,
  pH: 6.5,
  microbialLife: 70,
  phosphorus: 60,   // NEW
  potassium: 60,    // NEW
  drainage: 65,     // NEW
};
```

### `data/cropTypes.ts` — CropType

Add two new drain fields per crop. Nitrogen drain already handled by `fertilityDrain`.

```typescript
export interface CropType {
  // ... existing fields ...
  fertilityDrain: number;    // existing — N drain per harvest
  phosphorusDrain: number;   // NEW: P drain per harvest (per ha)
  potassiumDrain: number;    // NEW: K drain per harvest (per ha)
}
```

**Per-crop drain values:**

| Crop | P drain | K drain |
|------|---------|---------|
| grass | 1 | 2 |
| alfalfa | 2 | 3 |
| barley | 3 | 3 |
| oats | 3 | 3 |
| wheat | 4 | 4 |
| corn | 5 | 6 |
| sorghum | 3 | 4 |
| rice | 4 | 4 |
| potatoes | 9 | 10 |
| sugarbeet | 8 | 9 |
| soy | 2 | 3 |
| sugarcane | 7 | 9 |
| sunflower | 5 | 9 |
| rapeseed | 5 | 5 |
| canola | 5 | 5 |
| cotton | 6 | 7 |
| grapes | 6 | 8 |
| tomatoes | 7 | 7 |
| strawberries | 6 | 7 |
| olives | 4 | 5 |
| almonds | 5 | 6 |
| saffron | 4 | 5 |
| vanilla | 4 | 5 |
| lavender | 3 | 4 |
| ginseng | 4 | 5 |

Note: soy and alfalfa have low drain because legumes fix nitrogen and are light on other nutrients.

### `engine/crops.ts` — PlantedCrop

Replace the fertilizer boolean with per-nutrient applied amounts:

```typescript
export interface PlantedCrop {
  cropId: string;
  parcelId: string;
  plantedDay: number;
  hectares: number;
  // REMOVED: fertilized: boolean
  // REMOVED: appliedFertilizerBonus?: number
  appliedN?: number;        // NEW: N application bonus multiplier (e.g. 1.15)
  appliedP?: number;        // NEW: P application bonus multiplier (e.g. 1.10)
  appliedK?: number;        // NEW: K application bonus multiplier (e.g. 1.08)
  frostDamage?: number;
  droughtStress?: number;
  moistureLevel?: number;
}
```

### Backwards compatibility

All call sites that read `crop.fertilized` or `crop.appliedFertilizerBonus` must be updated. Migration maps old saves: `fertilized: true` → `appliedN: 1.3, appliedP: 1.0, appliedK: 1.0`.

---

## Yield Formula Changes

### `computeSoilYieldModifier(soil: SoilStats)`

Add P and K modifiers alongside existing N/OM/compaction/pH/microbial:

```typescript
// Phosphorus modifier
const pMod =
  soil.phosphorus < 20 ? 0.60 + (soil.phosphorus / 20) * 0.40   // 0.60–1.00 below 20
  : soil.phosphorus < 40 ? 1.00                                    // neutral 20–40
  : soil.phosphorus <= 70 ? 1.0 + ((soil.phosphorus - 40) / 30) * 0.08  // +0–8% in 40–70
  : 1.08 - ((soil.phosphorus - 70) / 30) * 0.03;                  // slight drop above 70

// Potassium modifier
const kMod =
  soil.potassium < 20 ? 0.65 + (soil.potassium / 20) * 0.35
  : soil.potassium < 40 ? 1.00
  : soil.potassium <= 70 ? 1.0 + ((soil.potassium - 40) / 30) * 0.06  // +0–6% in 40–70
  : 1.06;  // K doesn't over-penalise at high levels

// Drainage modifier
const drainMod =
  soil.drainage < 20 ? 0.60   // severe waterlogging
  : soil.drainage < 40 ? 0.60 + ((soil.drainage - 20) / 20) * 0.30  // 0.60–0.90
  : soil.drainage < 60 ? 0.90 + ((soil.drainage - 40) / 20) * 0.10  // 0.90–1.00
  : 1.00;  // 60+ is neutral/good

return nitrogenMod * omMod * compactionMod * pHMod * microbialMod * pMod * kMod * drainMod;
```

### `harvestAmount()` — NPK applied bonus

Replace `fertilizerMod` with three separate applied-nutrient bonuses:

```typescript
const nBonus = crop.appliedN ?? 1.0;
const pBonus = crop.appliedP ?? 1.0;
const kBonus = crop.appliedK ?? 1.0;
const fertilizerMod = nBonus * pBonus * kBonus;
```

### `advanceSoilStats()` — drainage tick

Add drainage daily update. Drainage recovers naturally (+0.3/day up to starting value) and drops on heavy rain events:

```typescript
// Drainage: natural recovery toward 65
const drainageRecovery = Math.min(0.3, 65 - soil.drainage);
let newDrainage = Math.min(100, soil.drainage + Math.max(0, drainageRecovery));

// Called with weatherEvent param; heavy_rain drops drainage
if (params.weatherEvent === 'heavy_rain') {
  newDrainage = Math.max(0, newDrainage - 12);
} else if (params.weatherEvent === 'drought') {
  newDrainage = Math.min(100, newDrainage + 2); // drought improves drainage slightly
}
```

### Post-harvest soil drain

In `advanceDay()` and harvest call sites, drain P and K from soil after each harvest:

```typescript
const newPhosphorus = Math.max(0, parcel.soil.phosphorus - (cropType.phosphorusDrain * parcel.plantedCrop.hectares * 0.1));
const newPotassium  = Math.max(0, parcel.soil.potassium  - (cropType.potassiumDrain  * parcel.plantedCrop.hectares * 0.1));
```

(Scale factor 0.1 means a 1-ha potato harvest drains 0.9 P and 1.0 K per harvest cycle — roughly 3 cycles before significant depletion.)

---

## New Shop Products

Add to the processed/amendment product list (same pattern as existing lime/sulfur/subsoiler):

| ID | Name | Effect | Cost/ha |
|----|------|--------|---------|
| `npk_nitrogen` | Nitrogen (Urea) | +20 N to soil | $90 |
| `npk_phosphorus` | Superphosphate | +20 P to soil | $110 |
| `npk_potassium` | Potash (K) | +20 K to soil | $100 |
| `npk_blend` | NPK Blend | +10 N / +12 P / +12 K | $220 |
| `drainage_tile` | Drainage Tile | +15 drainage permanently | $400 |

Amendments apply to the parcel's `SoilStats` directly via a new `applySoilNPK(parcelId, productId)` action. Drainage tile is a one-time permanent improvement.

NPK products can also be applied **at planting** to set `appliedN / appliedP / appliedK`:

| Product | appliedN | appliedP | appliedK |
|---------|----------|----------|----------|
| Urea | 1.15 | 1.0 | 1.0 |
| Superphosphate | 1.0 | 1.10 | 1.0 |
| Potash | 1.0 | 1.0 | 1.08 |
| NPK Blend | 1.10 | 1.08 | 1.07 |

---

## UI Changes (`app/(tabs)/tierras.tsx`)

### Soil sub-tab

Add 3 new stat bars after the existing 5:

```
Phosphorus   [████████░░]  62  →  green 40–70, amber 20–40, red <20
Potassium    [███████░░░]  58  →  green 40–70, amber 20–40, red <20
Drainage     [████████░░]  65  →  green 60+, amber 30–60, red <30
```

### Planting modal — fertilizer selector

Replace the existing "Fertilize? Yes/No" toggle with a 5-option selector:

```
None | N (Urea) | P (Superphosphate) | K (Potash) | NPK Blend
```

Each option shows the cost delta and the applied bonus. The selected product sets `appliedN/P/K` on the planted crop and deducts cost.

---

## Save Migration (v4 → v5)

```typescript
function migrateV4toV5(state: any): GameState {
  return {
    ...state,
    parcels: state.parcels.map((p: any) => ({
      ...p,
      soil: {
        ...p.soil,
        phosphorus: p.soil?.phosphorus ?? 60,
        potassium:  p.soil?.potassium  ?? 60,
        drainage:   p.soil?.drainage   ?? 65,
      },
      plantedCrop: p.plantedCrop ? {
        ...p.plantedCrop,
        appliedN: p.plantedCrop.fertilized ? 1.3 : undefined,
        appliedP: undefined,
        appliedK: undefined,
        fertilized: undefined,
        appliedFertilizerBonus: undefined,
      } : null,
    })),
  };
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `engine/crops.ts` | Extend `SoilStats`; update `SOIL_DEFAULTS`; add P/K modifiers to `computeSoilYieldModifier`; update `harvestAmount` signature; update `advanceSoilStats` for drainage |
| `data/cropTypes.ts` | Add `phosphorusDrain`, `potassiumDrain` to `CropType` interface and all 28 crop definitions |
| `store/useGameStore.ts` | Update `PlantedCrop`; update all fertilizer action/call sites; add `applySoilNPK` action; add new products; add drainage tile building; bump save key + migration |
| `app/(tabs)/tierras.tsx` | Add P/K/drainage bars to Soil tab; replace fertilizer toggle with NPK selector in planting modal |

---

## Out of Scope

- Soil temperature (deferred)
- Salinity (deferred)
- Organic certification system
- Irrigation water quality affecting soil
