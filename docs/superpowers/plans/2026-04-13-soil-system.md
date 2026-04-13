# Soil System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `fertility` (1–25) field on each parcel with 5 tracked soil dimensions (`nitrogen`, `organicMatter`, `compaction`, `pH`, `microbialLife`) plus a `cropHistory` array, update yield calculation to use them, tick them daily in `advanceDay`, add cover crops, and add soil amendment items to the shop.

**Architecture:** Pure engine functions in `engine/crops.ts` handle all soil math (no store imports). The store extends `LandParcel`, wires the daily tick into `advanceDay`, and adds new actions. `app/(tabs)/tierras.tsx` gets a "Soil" sub-tab on the parcel detail view. Save key bumped v4 → v5 with a migration function.

**Tech Stack:** TypeScript, Zustand 5, React Native / Expo Router, no test suite — type-check (`npx tsc --noEmit`) is the verification step for each task.

---

## File Map

| File | Change |
|---|---|
| `engine/crops.ts` | Add `SoilStats` interface; `computeSoilYieldModifier()`; `advanceSoilStats()`; update `harvestAmount()` signature |
| `data/cropTypes.ts` | Add `coverCrop?: boolean` flag; add `isCoverCrop` entries for rye, clover, mustard, buckwheat |
| `store/useGameStore.ts` | Extend `LandParcel`; add `cropHistory`; update `harvestAmount` calls; wire `advanceSoilStats` in `advanceDay`; add `applySoilAmendment`, `plantCoverCrop` actions; add amendment shop items; bump save key + migration |
| `app/(tabs)/tierras.tsx` | Add "Soil" sub-tab to parcel detail modal with 5 stat bars |

---

## Task 1: SoilStats type + computeSoilYieldModifier in engine/crops.ts

**File:** `engine/crops.ts` (append after existing exports)

- [ ] **Step 1 — Append SoilStats interface and computeSoilYieldModifier**

Add to the end of `engine/crops.ts`:

```typescript
// ─── Soil System ─────────────────────────────────────────────────────────────

export interface SoilStats {
  nitrogen: number;       // 0–100, optimal 60–80
  organicMatter: number;  // 0–10, optimal 4–7
  compaction: number;     // 0–100, optimal 0–25 (lower = better)
  pH: number;             // 4.0–8.5, optimal 6.0–7.0
  microbialLife: number;  // 0–100, optimal 60–100
}

export const SOIL_DEFAULTS: SoilStats = {
  nitrogen: 65,
  organicMatter: 4.5,
  compaction: 20,
  pH: 6.5,
  microbialLife: 70,
};

/**
 * Returns a yield multiplier (0.3–1.2) based on all 5 soil dimensions.
 * Modifiers stack multiplicatively. A perfectly managed parcel can reach 1.2.
 */
export function computeSoilYieldModifier(soil: SoilStats): number {
  // Nitrogen: optimal 60–80, penalise outside that range
  const nMod =
    soil.nitrogen < 40
      ? 0.6 + (soil.nitrogen / 40) * 0.4        // 0.6 at 0, 1.0 at 40
      : soil.nitrogen > 90
      ? 0.85                                     // excess nitrogen = slight penalty
      : 1.0 + Math.min((soil.nitrogen - 60) / 200, 0.10); // +0–10% in 60–80 range

  // Organic matter: optimal ≥ 4%; below 2% penalised
  const omMod =
    soil.organicMatter < 2
      ? 0.75 + (soil.organicMatter / 2) * 0.25  // 0.75 at 0%, 1.0 at 2%
      : 1.0 + Math.min((soil.organicMatter - 4) / 40, 0.05); // +0–5% above 4%

  // Compaction: 0 = best, 100 = worst
  const compMod =
    soil.compaction > 50
      ? 1.0 - ((soil.compaction - 50) / 50) * 0.30 // −30% at 100
      : 1.0;

  // pH: optimal 6.0–7.0; outside 5.5–7.5 penalised
  const pHDev = Math.max(0, Math.abs(soil.pH - 6.5) - 0.5); // deviation beyond ±0.5
  const pHMod = Math.max(0.80, 1.0 - pHDev * 0.20);

  // Microbial life: below 30 penalised; above 60 slight bonus
  const microMod =
    soil.microbialLife < 30
      ? 0.85 + (soil.microbialLife / 30) * 0.15 // 0.85 at 0, 1.0 at 30
      : 1.0 + Math.min((soil.microbialLife - 60) / 400, 0.05); // +0–5% above 60

  return Math.max(0.3, nMod * omMod * compMod * pHMod * microMod);
}
```

- [ ] **Step 2 — Type-check**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3 — Commit**

```bash
git add engine/crops.ts
git commit -m "feat(soil): add SoilStats type and computeSoilYieldModifier"
```

---

## Task 2: advanceSoilStats daily tick in engine/crops.ts

**File:** `engine/crops.ts` (append after Task 1 additions)

- [ ] **Step 1 — Append advanceSoilStats**

```typescript
export interface SoilTickParams {
  /** cropId currently growing, or null if fallow */
  activeCropId: string | null;
  /** true if a crop was harvested TODAY on this parcel */
  harvestedToday: boolean;
  /** true if any machinery operated on this parcel today */
  machineryUsedToday: boolean;
  /** true if today's rainfall was heavy (≥ 8 mm simulated) */
  heavyRainToday: boolean;
  /** true if a pesticide was applied to this parcel today */
  pesticideAppliedToday: boolean;
  /** true if manure/compost was applied today */
  manureAppliedToday: boolean;
  /** true if subsoiler attachment was used today */
  subsoilerUsedToday: boolean;
}

/**
 * Pure daily soil tick. Returns a new SoilStats object.
 * Called once per owned parcel per advanceDay() call.
 */
export function advanceSoilStats(
  soil: SoilStats,
  params: SoilTickParams,
  cropNitrogenDemand: number, // nitrogenDemand from CropType, 0 if fallow
): SoilStats {
  let { nitrogen, organicMatter, compaction, pH, microbialLife } = soil;

  // ── Nitrogen ──
  if (params.activeCropId) {
    nitrogen -= cropNitrogenDemand / 90; // spread demand over ~1 season of growth
  }
  if (params.heavyRainToday) {
    nitrogen -= 1.5; // runoff loss
  }
  if (params.harvestedToday) {
    nitrogen -= cropNitrogenDemand * 0.5; // burst loss at harvest
  }
  // Fallow recovery (very slow natural mineralisation)
  if (!params.activeCropId) {
    nitrogen += 0.1;
  }

  // ── Organic Matter ──
  if (params.activeCropId) {
    organicMatter -= 0.004; // slow depletion during active crop
  }
  if (!params.activeCropId) {
    organicMatter += 0.003; // slow natural accumulation when fallow
  }
  if (params.manureAppliedToday) {
    organicMatter += 0.5;
  }

  // ── Compaction ──
  if (params.machineryUsedToday) {
    compaction += 2;
  }
  if (!params.activeCropId && !params.machineryUsedToday) {
    compaction -= 0.5; // fallow recovery via freeze-thaw etc.
  }
  if (params.subsoilerUsedToday) {
    compaction -= 18;
  }

  // ── pH ── (drifts very slowly; lime/sulfur handled by applySoilAmendment action)
  if (params.heavyRainToday) {
    pH -= 0.005; // leaching slightly acidifies
  }

  // ── Microbial Life ──
  if (params.pesticideAppliedToday) {
    microbialLife -= 10;
  }
  // Follows organic matter: tends toward organicMatter * 12 over time
  const microTarget = Math.min(100, organicMatter * 12);
  microbialLife += (microTarget - microbialLife) * 0.01; // 1% convergence per day

  // Clamp all values
  return {
    nitrogen:     Math.max(0, Math.min(100, nitrogen)),
    organicMatter: Math.max(0, Math.min(10, organicMatter)),
    compaction:   Math.max(0, Math.min(100, compaction)),
    pH:           Math.max(4.0, Math.min(8.5, pH)),
    microbialLife: Math.max(0, Math.min(100, microbialLife)),
  };
}
```

- [ ] **Step 2 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3 — Commit**

```bash
git add engine/crops.ts
git commit -m "feat(soil): add advanceSoilStats daily tick function"
```

---

## Task 3: Update harvestAmount signature in engine/crops.ts

**File:** `engine/crops.ts`

The existing `harvestAmount` takes `fertility: number` (1–25). Replace it with `soil: SoilStats` so the store can pass the full soil object.

- [ ] **Step 1 — Update harvestAmount**

Replace the existing `harvestAmount` function with:

```typescript
export function harvestAmount(
  crop: PlantedCrop,
  cropType: CropType,
  soil: SoilStats,            // replaces fertility: number
  climateModifier: number,    // 0.6–1.2
  hasWeeds: boolean,
  machineYieldBonus: number,  // 1.0 = no machine, 1.1+ = from owned machines
  frostDamage = 0,
  droughtStress = 0,
): number {
  const soilMod     = computeSoilYieldModifier(soil);
  const fertilizerMod = crop.fertilized
    ? (crop.appliedFertilizerBonus ?? cropType.fertilizerBonus)
    : 1.0;
  const weedMod     = hasWeeds ? 0.75 : 1.0;
  const frostMod    = Math.max(0, 1 - frostDamage * 0.7);
  const droughtMod  = Math.max(0, 1 - droughtStress * 0.8);

  return (
    crop.hectares *
    cropType.baseYield *
    soilMod *
    fertilizerMod *
    weedMod *
    climateModifier *
    machineYieldBonus *
    frostMod *
    droughtMod
  );
}
```

- [ ] **Step 2 — Type-check (expect errors from store — fix next task)**

```bash
npx tsc --noEmit
```

Expected: errors in `store/useGameStore.ts` at the 3 `harvestAmount` call sites (argument type mismatch). That is correct — we fix them in Task 4.

- [ ] **Step 3 — Commit**

```bash
git add engine/crops.ts
git commit -m "feat(soil): update harvestAmount to accept SoilStats instead of fertility"
```

---

## Task 4: Extend LandParcel + update store

**File:** `store/useGameStore.ts`

Six changes: extend `LandParcel`, add `nitrogenDemand` to `CropType` usage, fix the 3 `harvestAmount` call sites, add soil fields to `newGame()` initialisation, wire `advanceSoilStats` into `advanceDay()`, add `applySoilAmendment` and `plantCoverCrop` actions + their type signatures.

- [ ] **Step 1 — Extend LandParcel interface**

Find:
```typescript
export interface LandParcel {
  id: string;
  name: string;
  fertility: number;
```

Replace with:
```typescript
export interface LandParcel {
  id: string;
  name: string;
  /** @deprecated use soil.nitrogen — kept for save migration only */
  fertility: number;
  // ── Soil system ──
  soil: SoilStats;
  cropHistory: string[]; // last 4 harvested cropIds (oldest first)
```

- [ ] **Step 2 — Update the crops import to include new exports**

Find:
```typescript
import { PlantedCrop, SoilType, getSoilModifier, harvestAmount } from '../engine/crops';
```

Replace with:
```typescript
import {
  PlantedCrop, SoilType, getSoilModifier, harvestAmount,
  SoilStats, SOIL_DEFAULTS, advanceSoilStats, SoilTickParams,
} from '../engine/crops';
```

- [ ] **Step 3 — Add action signatures to GameState (after cancelRecurringContract)**

Find:
```typescript
  cancelRecurringContract: (contractId: string) => void;
  buyProduct: (productId: string) => void;
```

Replace with:
```typescript
  cancelRecurringContract: (contractId: string) => void;
  applySoilAmendment: (parcelId: string, amendment: 'lime' | 'sulfur' | 'subsoiler') => void;
  plantCoverCrop: (parcelId: string, coverCropId: string) => void;
  buyProduct: (productId: string) => void;
```

- [ ] **Step 4 — Fix harvestAmount call site #1 (line ~2937, auto-worker harvest)**

Find the line containing:
```typescript
Math.round(harvestAmount(parcel.plantedCrop!, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, 1.0, parcel.plantedCrop!.frostDamage ?? 0, parcel.plantedCrop!.droughtStress ?? 0)),
```

Replace with:
```typescript
Math.round(harvestAmount(parcel.plantedCrop!, cropType, parcel.soil ?? SOIL_DEFAULTS, climateModifier, parcel.hasWeeds, 1.0, parcel.plantedCrop!.frostDamage ?? 0, parcel.plantedCrop!.droughtStress ?? 0)),
```

- [ ] **Step 5 — Fix harvestAmount call site #2 (line ~3783, manual harvest)**

Find the line containing:
```typescript
const rawUnits = harvestAmount(crop, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, 1.0, crop.frostDamage ?? 0, crop.droughtStress ?? 0);
```

Replace with:
```typescript
const rawUnits = harvestAmount(crop, cropType, parcel.soil ?? SOIL_DEFAULTS, climateModifier, parcel.hasWeeds, 1.0, crop.frostDamage ?? 0, crop.droughtStress ?? 0);
```

- [ ] **Step 6 — Fix harvestAmount call site #3 (line ~5676, worker delivery harvest)**

Find the line containing:
```typescript
const rawUnits = harvestAmount(p.plantedCrop, cropType, p.fertility, climateModifier, p.hasWeeds, yieldBonus, p.plantedCrop.frostDamage ?? 0, p.plantedCrop.droughtStress ?? 0);
```

Replace with:
```typescript
const rawUnits = harvestAmount(p.plantedCrop, cropType, p.soil ?? SOIL_DEFAULTS, climateModifier, p.hasWeeds, yieldBonus, p.plantedCrop.frostDamage ?? 0, p.plantedCrop.droughtStress ?? 0);
```

- [ ] **Step 7 — Update cropHistory on harvest**

In each of the 3 harvest call sites, after the harvest is computed and before the parcel is updated, add a cropHistory update. Find the pattern where parcels are mapped after harvest (look for `plantedCrop: null` reset). For each harvest site, update the parcel map to include:

```typescript
cropHistory: [
  ...(parcel.cropHistory ?? []).slice(-3),
  parcel.plantedCrop!.cropId,
],
```

Example — in the auto-worker harvest map, find the parcel update object and add `cropHistory` to it alongside the `plantedCrop: null` reset.

- [ ] **Step 8 — Initialise soil in newGame() parcel definitions**

Find the parcel initialisation in `newGame()`. Each `LandParcel` object needs `soil` and `cropHistory` added. Find the pattern `fertility:` in the newGame parcel array and add alongside each:

```typescript
soil: { ...SOIL_DEFAULTS },
cropHistory: [],
```

- [ ] **Step 9 — Wire advanceSoilStats into advanceDay()**

In `advanceDay()`, find the section that processes parcels (look for `finalParcels` and the parcel map). After the existing per-parcel processing, add a soil tick. Find the `finalParcels` computation and wrap the map to also update soil:

```typescript
// After existing finalParcels computation, add soil tick pass:
const parcelsWithSoil = finalParcels.map((p) => {
  if (!p.owned) return p;
  const cropType = p.plantedCrop
    ? CROP_TYPES.find(ct => ct.id === p.plantedCrop!.cropId)
    : undefined;
  const tickParams: SoilTickParams = {
    activeCropId: p.plantedCrop?.cropId ?? null,
    harvestedToday: false, // harvest already happened above; set per-parcel if needed
    machineryUsedToday: false, // TODO phase 1c: track per-parcel machinery use
    heavyRainToday: (todayWeather?.rainfall ?? 0) >= 8,
    pesticideAppliedToday: false, // TODO phase 1c
    manureAppliedToday: false,    // TODO phase 1c
    subsoilerUsedToday: false,    // set by applySoilAmendment action
  };
  const nitrogenDemand = cropType
    ? (cropType.fertilityDrain ?? 0) * 4
    : 0;
  return {
    ...p,
    soil: advanceSoilStats(p.soil ?? SOIL_DEFAULTS, tickParams, nitrogenDemand),
  };
});
```

Then in the final `set({...})` call at the bottom of `advanceDay`, change `parcels: finalParcels` to `parcels: parcelsWithSoil` (or wherever `finalParcels` is passed to `parcels:`).

- [ ] **Step 10 — Implement applySoilAmendment action (near cancelRecurringContract)**

```typescript
      applySoilAmendment: (parcelId, amendment) => {
        set((s) => {
          const parcel = s.parcels.find((p) => p.id === parcelId);
          if (!parcel || !parcel.owned) return {};
          const current = parcel.soil ?? SOIL_DEFAULTS;
          let newSoil: SoilStats;
          let cost = 0;
          if (amendment === 'lime') {
            newSoil = { ...current, pH: Math.min(8.5, current.pH + 0.5) };
            cost = 120;
          } else if (amendment === 'sulfur') {
            newSoil = { ...current, pH: Math.max(4.0, current.pH - 0.5) };
            cost = 100;
          } else {
            // subsoiler — reduces compaction 18 points, costs fuel money
            newSoil = { ...current, compaction: Math.max(0, current.compaction - 18) };
            cost = 200;
          }
          if (s.money < cost) return {};
          return {
            money: s.money - cost,
            parcels: s.parcels.map((p) =>
              p.id === parcelId ? { ...p, soil: newSoil } : p,
            ),
          };
        });
      },
```

- [ ] **Step 11 — Implement plantCoverCrop action**

```typescript
      plantCoverCrop: (parcelId, coverCropId) => {
        set((s) => {
          const parcel = s.parcels.find((p) => p.id === parcelId);
          if (!parcel || !parcel.owned || parcel.plantedCrop) return {};
          const cropType = CROP_TYPES.find((ct) => ct.id === coverCropId);
          if (!cropType) return {};
          if (s.money < cropType.seedCost * parcel.hectares) return {};
          const coverCrop: PlantedCrop = {
            cropId: coverCropId,
            parcelId,
            plantedDay: s.day,
            hectares: parcel.hectares,
            fertilized: false,
          };
          return {
            money: s.money - cropType.seedCost * parcel.hectares,
            parcels: s.parcels.map((p) =>
              p.id === parcelId ? { ...p, plantedCrop: coverCrop } : p,
            ),
          };
        });
      },
```

- [ ] **Step 12 — Handle cover crop harvest (apply soil bonus instead of inventory)**

Cover crops mature like normal crops but give no inventory. In `advanceDay`, in the section that processes mature crops, find where `harvestAmount` is called. Add a check before the harvest:

```typescript
const isCoverCrop = !!cropType?.coverCrop;
if (isCoverCrop) {
  // Cover crop matures: apply soil benefits, no inventory
  const coverBenefits = COVER_CROP_BENEFITS[crop.cropId] ?? {};
  updatedParcel = {
    ...updatedParcel,
    plantedCrop: null,
    cropHistory: [...(updatedParcel.cropHistory ?? []).slice(-3), crop.cropId],
    soil: {
      ...(updatedParcel.soil ?? SOIL_DEFAULTS),
      nitrogen:      Math.min(100, (updatedParcel.soil?.nitrogen ?? 65) + (coverBenefits.nitrogen ?? 0)),
      organicMatter: Math.min(10,  (updatedParcel.soil?.organicMatter ?? 4.5) + (coverBenefits.organicMatter ?? 0)),
      compaction:    Math.max(0,   (updatedParcel.soil?.compaction ?? 20) - (coverBenefits.compactionReduction ?? 0)),
      microbialLife: Math.min(100, (updatedParcel.soil?.microbialLife ?? 70) + (coverBenefits.microbialLife ?? 0)),
    },
  };
  summary.push({ id: `cover_${parcelId}_${s.day}`, type: 'info', message: `Cover crop matured on ${updatedParcel.name} — soil restored.` });
  continue; // skip normal harvest path
}
```

Add `COVER_CROP_BENEFITS` constant near the top of the store (or in a separate data file — the store is fine since it's small):

```typescript
const COVER_CROP_BENEFITS: Record<string, {
  nitrogen?: number;
  organicMatter?: number;
  compactionReduction?: number;
  microbialLife?: number;
}> = {
  rye:       { compactionReduction: 8, organicMatter: 0.4 },
  clover:    { nitrogen: 20, organicMatter: 2.0 },
  mustard:   { microbialLife: 10 },
  buckwheat: { microbialLife: 10, organicMatter: 0.5 },
};
```

- [ ] **Step 13 — Save migration: bump key and initialise soil on old parcels**

Find the `persist` config in the store. Change:
```typescript
name: 'granja-tycoon-save-v4',
```
To:
```typescript
name: 'granja-tycoon-save-v5',
```

Find the `onRehydrateStorage` callback (or add one if not present). After rehydration, patch any parcel missing `soil`:

```typescript
onRehydrateStorage: () => (state) => {
  if (!state) return;
  // v4 → v5 migration: initialise soil from legacy fertility
  state.parcels = state.parcels.map((p) => ({
    ...p,
    soil: p.soil ?? {
      ...SOIL_DEFAULTS,
      nitrogen: Math.round((p.fertility / 25) * 100),
    },
    cropHistory: p.cropHistory ?? [],
  }));
},
```

- [ ] **Step 14 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 15 — Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(soil): extend LandParcel with SoilStats, wire advanceSoilStats, add amendment + cover crop actions, v5 migration"
```

---

## Task 5: Cover crop definitions in data/cropTypes.ts

**File:** `data/cropTypes.ts`

- [ ] **Step 1 — Add coverCrop flag to CropType interface**

Find:
```typescript
export interface CropType {
  id: string;
```

Add `coverCrop?: boolean;` after `droughtTolerance: number;`:

```typescript
  droughtTolerance: number;
  coverCrop?: boolean; // true = no harvest revenue; matures into soil benefits
}
```

- [ ] **Step 2 — Add 4 cover crop entries to CROP_TYPES array**

Append after the last existing entry:

```typescript
  // ── Cover Crops (no harvest revenue) ──────────────────────────────────────
  { id: 'rye',       name: 'Winter Rye',   tier: 'D', growthDays: 60,  basePrice: 0, seedCost: 40,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['autumn','winter'], peakSeason: 'winter', fertilityDrain: 0, frostKillTemp: -20, heatStressTemp: 30, droughtTolerance: 0.8, coverCrop: true },
  { id: 'clover',    name: 'Red Clover',   tier: 'D', growthDays: 45,  basePrice: 0, seedCost: 35,  waterNeed: 2, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer'], peakSeason: 'summer', fertilityDrain: 0, frostKillTemp: -10, heatStressTemp: 32, droughtTolerance: 0.5, coverCrop: true },
  { id: 'mustard',   name: 'White Mustard',tier: 'D', growthDays: 40,  basePrice: 0, seedCost: 30,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer','autumn'], peakSeason: 'summer', fertilityDrain: 0, frostKillTemp: -5, heatStressTemp: 35, droughtTolerance: 0.6, coverCrop: true },
  { id: 'buckwheat', name: 'Buckwheat',    tier: 'D', growthDays: 35,  basePrice: 0, seedCost: 25,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer'], peakSeason: 'summer', fertilityDrain: 0, frostKillTemp: -1, heatStressTemp: 40, droughtTolerance: 0.7, coverCrop: true },
```

- [ ] **Step 3 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4 — Commit**

```bash
git add data/cropTypes.ts
git commit -m "feat(soil): add 4 cover crop definitions (rye, clover, mustard, buckwheat)"
```

---

## Task 6: Soil UI — "Soil" sub-tab in tierras.tsx

**File:** `app/(tabs)/tierras.tsx`

Add a "Soil" sub-tab to the parcel detail modal. It shows 5 stat bars with colour coding and a "Cover Crops" button for fallow parcels.

- [ ] **Step 1 — Read tierras.tsx to find the parcel detail modal structure**

Use smart_outline or read the file to locate:
- The parcel detail modal (look for `parcelModalVisible` or similar)
- The existing sub-tab pattern inside it
- The closing `</Modal>` or `</View>` of the detail panel

- [ ] **Step 2 — Add import for soil engine functions**

Find the crops import line:
```typescript
import { ... } from '../../engine/crops';
```

Add `SoilStats, SOIL_DEFAULTS, computeSoilYieldModifier` to it.

Also add `applySoilAmendment, plantCoverCrop` to the `useGameStore()` destructure.

- [ ] **Step 3 — Add SOIL_BAR_COLORS constant**

Near the top of the file (with other constants):

```typescript
const SOIL_BAR_COLORS = {
  good: '#4caf50',
  warn: '#ffa726',
  bad:  '#ef5350',
};

function soilStatColor(value: number, low: number, high: number, invert = false): string {
  const pct = (value - low) / (high - low); // 0 = low end, 1 = high end
  const good = invert ? pct < 0.3 : pct > 0.6;
  const bad  = invert ? pct > 0.7 : pct < 0.3;
  return good ? SOIL_BAR_COLORS.good : bad ? SOIL_BAR_COLORS.bad : SOIL_BAR_COLORS.warn;
}
```

- [ ] **Step 4 — Add SoilTab component inside the screen (before the return)**

```tsx
function SoilTab({ parcel, onAmendment, onCoverCrop }: {
  parcel: LandParcel;
  onAmendment: (type: 'lime' | 'sulfur' | 'subsoiler') => void;
  onCoverCrop: (cropId: string) => void;
}) {
  const soil = parcel.soil ?? SOIL_DEFAULTS;
  const modifier = computeSoilYieldModifier(soil);

  const stats: { label: string; value: number; min: number; max: number; invert?: boolean; unit?: string }[] = [
    { label: 'Nitrogen',      value: soil.nitrogen,      min: 0,   max: 100, unit: '' },
    { label: 'Organic Matter',value: soil.organicMatter,  min: 0,   max: 10,  unit: '%' },
    { label: 'Compaction',    value: soil.compaction,     min: 0,   max: 100, invert: true },
    { label: 'pH',            value: soil.pH,             min: 4.0, max: 8.5, unit: '' },
    { label: 'Microbial Life',value: soil.microbialLife,  min: 0,   max: 100 },
  ];

  return (
    <View style={{ padding: S.md }}>
      <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginBottom: S.sm }}>
        Soil yield modifier: {modifier >= 1 ? '+' : ''}{Math.round((modifier - 1) * 100)}%
      </Text>

      {stats.map((s) => {
        const pct = Math.max(0, Math.min(1, (s.value - s.min) / (s.max - s.min)));
        const barPct = s.invert ? 1 - pct : pct;
        const color = soilStatColor(s.value, s.min, s.max, s.invert);
        return (
          <View key={s.label} style={{ marginBottom: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>{s.label}</Text>
              <Text style={{ color: C.text, fontSize: F.size.xs }}>
                {s.value.toFixed(s.unit === '%' ? 1 : 0)}{s.unit ?? ''}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: C.bgCard, borderRadius: 3, marginTop: 3 }}>
              <View style={{ width: `${barPct * 100}%` as any, height: 6, borderRadius: 3, backgroundColor: color }} />
            </View>
          </View>
        );
      })}

      {/* Amendments */}
      <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginTop: S.md, marginBottom: S.xs, fontWeight: '600' }}>
        Amendments
      </Text>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center' }}
          onPress={() => onAmendment('lime')}
        >
          <Text style={{ color: C.text, fontSize: F.size.xs }}>🪨 Lime</Text>
          <Text style={{ color: C.textFaint, fontSize: 10 }}>pH +0.5 · $120</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center' }}
          onPress={() => onAmendment('sulfur')}
        >
          <Text style={{ color: C.text, fontSize: F.size.xs }}>🟡 Sulfur</Text>
          <Text style={{ color: C.textFaint, fontSize: 10 }}>pH −0.5 · $100</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center' }}
          onPress={() => onAmendment('subsoiler')}
        >
          <Text style={{ color: C.text, fontSize: F.size.xs }}>⚙️ Subsoil</Text>
          <Text style={{ color: C.textFaint, fontSize: 10 }}>Compact −18 · $200</Text>
        </TouchableOpacity>
      </View>

      {/* Cover crops (only if fallow) */}
      {!parcel.plantedCrop && (
        <>
          <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginTop: S.md, marginBottom: S.xs, fontWeight: '600' }}>
            Cover Crops
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {[
              { id: 'rye',       label: '🌾 Rye',       hint: 'Compact −8' },
              { id: 'clover',    label: '🍀 Clover',     hint: 'N +20, OM +2%' },
              { id: 'mustard',   label: '🌼 Mustard',    hint: 'Pest −15%' },
              { id: 'buckwheat', label: '🌿 Buckwheat',  hint: 'Microbes +10' },
            ].map((cc) => (
              <TouchableOpacity
                key={cc.id}
                style={{ backgroundColor: C.bgCard, borderRadius: R.md, padding: S.sm, alignItems: 'center', minWidth: 80 }}
                onPress={() => onCoverCrop(cc.id)}
              >
                <Text style={{ color: C.text, fontSize: F.size.xs }}>{cc.label}</Text>
                <Text style={{ color: C.textFaint, fontSize: 10 }}>{cc.hint}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
```

- [ ] **Step 5 — Add 'soil' tab to the parcel detail modal**

Find the existing sub-tab bar inside the parcel detail modal (look for `{ id: 'crop'` or similar tab entries). Add a soil tab entry:

```typescript
{ id: 'soil', label: '🌱 Soil' },
```

And add the tab content alongside the existing tab content blocks:

```tsx
{activeParcelTab === 'soil' && selectedParcel && (
  <SoilTab
    parcel={selectedParcel}
    onAmendment={(type) => {
      applySoilAmendment(selectedParcel.id, type);
    }}
    onCoverCrop={(cropId) => {
      plantCoverCrop(selectedParcel.id, cropId);
      setParcelModalVisible(false);
    }}
  />
)}
```

- [ ] **Step 6 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7 — Commit**

```bash
git add "app/(tabs)/tierras.tsx"
git commit -m "feat(soil): add Soil sub-tab to parcel detail with stat bars, amendments, cover crops"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| 5 soil dimensions on each parcel | 1, 4 |
| computeSoilYieldModifier — stacked multipliers | 1 |
| Daily soil tick — nitrogen depletion, OM, compaction, pH drift, microbial | 2, 4 |
| harvestAmount uses soil instead of fertility | 3, 4 |
| cropHistory tracked (last 4 crops) | 4 |
| Cover crops (rye, clover, mustard, buckwheat) with soil benefits | 4, 5 |
| Lime / sulfur / subsoiler amendments | 4, 6 |
| Save migration v4→v5, fertility→nitrogen | 4 |
| Soil tab UI with stat bars, colour coding | 6 |
| Amendment actions in parcel detail | 6 |
| Cover crop planting from parcel detail | 6 |

> **Note:** `machineryUsedToday`, `pesticideAppliedToday`, `manureAppliedToday` flags in `SoilTickParams` are wired as `false` for now. They will be set per-parcel in Phase 1c (pest resistance plan) when per-parcel machinery/spray tracking is added.
