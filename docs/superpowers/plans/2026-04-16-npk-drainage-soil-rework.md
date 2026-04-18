# NPK + Drainage Soil Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phosphorus, Potassium, and Drainage to `SoilStats`; replace the flat `fertilized: boolean` model with per-nutrient `appliedN/P/K` bonuses on `PlantedCrop`; wire P/K soil drain into the harvest tick; add NPK shop products; update the soil UI.

**Architecture:** All soil math stays in `engine/crops.ts` (pure functions). `SoilTickParams` receives new drain fields so `advanceSoilStats` handles P/K drain at harvest. The store extends `PlantedCrop`, updates `plantCrop`/`fertilizeCrop` call sites, adds `applySoilNPK` action, and bumps the save key v4→v5 with a migration. `tierras.tsx` adds three new bars to the Soil sub-tab and replaces the fertilizer boolean toggle with a 5-option NPK selector.

**Tech Stack:** TypeScript · React Native 0.81.5 · Expo 54 · Zustand 5. No test suite — verify each task with `node_modules\.bin\tsc --noEmit` from the project root.

---

## File Map

| File | Change |
|------|--------|
| `engine/crops.ts` | Extend `SoilStats`; update `SOIL_DEFAULTS`; update `SoilTickParams`; update `advanceSoilStats`; update `computeSoilYieldModifier`; update `harvestAmount` |
| `data/cropTypes.ts` | Add `phosphorusDrain`, `potassiumDrain` to `CropType` interface + all 29 crop definitions |
| `store/useGameStore.ts` | Update `PlantedCrop` type; update `plantCrop`, `plantCropBatch`, `fertilizeCrop`, all `fertilized` read sites; add `applySoilNPK`; add new products; add drain in `advanceSoilStats` call; save migration v4→v5 |
| `app/(tabs)/tierras.tsx` | Add P/K/drainage bars to Soil sub-tab; replace fertilizer toggle with NPK product selector in planting modal |

---

## Task 1: Extend engine/crops.ts

**File:** `engine/crops.ts`

- [ ] **Step 1: Add phosphorus, potassium, drainage to SoilStats and SOIL_DEFAULTS**

Replace lines 66–80 (the `SoilStats` interface and `SOIL_DEFAULTS` export):

```typescript
export interface SoilStats {
  nitrogen: number;       // 0–100, optimal 60–80
  organicMatter: number;  // 0–10, optimal 4–7
  compaction: number;     // 0–100, optimal 0–25 (lower = better)
  pH: number;             // 4.0–8.5, optimal 6.0–7.0
  microbialLife: number;  // 0–100, optimal 60–100
  phosphorus: number;     // 0–100, optimal 40–70
  potassium: number;      // 0–100, optimal 40–70
  drainage: number;       // 0–100, optimal 60–100 (lower = waterlogged)
}

export const SOIL_DEFAULTS: SoilStats = {
  nitrogen: 65,
  organicMatter: 4.5,
  compaction: 20,
  pH: 6.5,
  microbialLife: 70,
  phosphorus: 60,
  potassium: 60,
  drainage: 65,
};
```

- [ ] **Step 2: Add P, K, drainage modifiers to computeSoilYieldModifier**

Replace the entire `computeSoilYieldModifier` function (lines 86–118):

```typescript
export function computeSoilYieldModifier(soil: SoilStats): number {
  // Nitrogen: optimal 60–80
  const nMod =
    soil.nitrogen < 40
      ? 0.6 + (soil.nitrogen / 40) * 0.4
      : soil.nitrogen > 90
      ? 0.85
      : 1.0 + Math.max(0, Math.min((soil.nitrogen - 60) / 200, 0.10));

  // Organic matter: optimal ≥ 4%
  const omMod =
    soil.organicMatter < 2
      ? 0.75 + (soil.organicMatter / 2) * 0.25
      : 1.0 + Math.max(0, Math.min((soil.organicMatter - 4) / 40, 0.05));

  // Compaction: 0 = best, 100 = worst
  const compMod =
    soil.compaction > 50
      ? 1.0 - ((soil.compaction - 50) / 50) * 0.30
      : 1.0;

  // pH: optimal 6.0–7.0
  const pHDev = Math.max(0, Math.abs(soil.pH - 6.5) - 1.0);
  const pHMod = Math.max(0.80, 1.0 - pHDev * 0.20);

  // Microbial life
  const microMod =
    soil.microbialLife < 30
      ? 0.85 + (soil.microbialLife / 30) * 0.15
      : Math.max(1.0, 1.0 + Math.min((soil.microbialLife - 60) / 400, 0.05));

  // Phosphorus: optimal 40–70
  const pMod =
    soil.phosphorus < 20
      ? 0.60 + (soil.phosphorus / 20) * 0.40
      : soil.phosphorus < 40
      ? 1.0
      : soil.phosphorus <= 70
      ? 1.0 + ((soil.phosphorus - 40) / 30) * 0.08
      : Math.max(1.05, 1.08 - ((soil.phosphorus - 70) / 30) * 0.03);

  // Potassium: optimal 40–70
  const kMod =
    soil.potassium < 20
      ? 0.65 + (soil.potassium / 20) * 0.35
      : soil.potassium < 40
      ? 1.0
      : 1.0 + Math.min((soil.potassium - 40) / 30 * 0.06, 0.06);

  // Drainage: 60+ = good, below 40 = waterlogging penalty
  const drainMod =
    soil.drainage < 20
      ? 0.60
      : soil.drainage < 40
      ? 0.60 + ((soil.drainage - 20) / 20) * 0.30
      : soil.drainage < 60
      ? 0.90 + ((soil.drainage - 40) / 20) * 0.10
      : 1.0;

  return Math.max(0.3, nMod * omMod * compMod * pHMod * microMod * pMod * kMod * drainMod);
}
```

- [ ] **Step 3: Update harvestAmount to use appliedN/P/K instead of fertilized boolean**

Replace lines 33–62 (the `harvestAmount` function):

```typescript
export function harvestAmount(
  crop: PlantedCrop,
  cropType: CropType,
  soil: SoilStats,
  climateModifier: number,
  hasWeeds: boolean,
  machineYieldBonus: number,
  frostDamage = 0,
  droughtStress = 0,
): number {
  const soilMod      = computeSoilYieldModifier(soil);
  const fertilizerMod = (crop.appliedN ?? 1.0) * (crop.appliedP ?? 1.0) * (crop.appliedK ?? 1.0);
  const weedMod      = hasWeeds ? 0.75 : 1.0;
  const frostMod     = Math.max(0, 1 - frostDamage * 0.7);
  const droughtMod   = Math.max(0, 1 - droughtStress * 0.8);

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

- [ ] **Step 4: Update PlantedCrop interface**

Replace lines 17–27 (the `PlantedCrop` interface):

```typescript
export interface PlantedCrop {
  cropId: string;
  parcelId: string;
  plantedDay: number;
  hectares: number;
  appliedN?: number;       // yield multiplier from N fertilizer (e.g. 1.15); undefined = 1.0
  appliedP?: number;       // yield multiplier from P fertilizer (e.g. 1.10); undefined = 1.0
  appliedK?: number;       // yield multiplier from K fertilizer (e.g. 1.08); undefined = 1.0
  frostDamage?: number;
  droughtStress?: number;
  moistureLevel?: number;
}
```

- [ ] **Step 5: Add P/K drain fields to SoilTickParams and update advanceSoilStats**

Replace lines 120–206 (the `SoilTickParams` interface and `advanceSoilStats` function):

```typescript
export interface SoilTickParams {
  activeCropId: string | null;
  harvestedToday: boolean;
  machineryUsedToday: boolean;
  heavyRainToday: boolean;
  pesticideAppliedToday: boolean;
  manureAppliedToday: boolean;
  subsoilerUsedToday: boolean;
  weatherEvent?: string;        // NEW: today's weather event id for drainage tick
  cropPhosphorusDrain: number;  // NEW: from CropType; 0 if fallow
  cropPotassiumDrain: number;   // NEW: from CropType; 0 if fallow
  hectares: number;             // NEW: parcel hectares for scaling drain
}

export function advanceSoilStats(
  soil: SoilStats,
  params: SoilTickParams,
  cropNitrogenDemand: number,
): SoilStats {
  let { nitrogen, organicMatter, compaction, pH, microbialLife, phosphorus, potassium, drainage } = soil;

  // ── Nitrogen ──
  if (params.activeCropId) {
    nitrogen -= cropNitrogenDemand / 90;
  }
  if (params.heavyRainToday) {
    nitrogen -= 1.5;
  }
  if (params.harvestedToday) {
    nitrogen -= cropNitrogenDemand * 0.5;
  }
  if (!params.activeCropId) {
    nitrogen += 0.1;
  }

  // ── Organic Matter ──
  if (params.activeCropId) organicMatter -= 0.004;
  if (!params.activeCropId) organicMatter += 0.003;
  if (params.manureAppliedToday) organicMatter += 0.5;

  // ── Compaction ──
  if (params.machineryUsedToday) compaction += 2;
  if (!params.activeCropId && !params.machineryUsedToday) compaction -= 0.5;
  if (params.subsoilerUsedToday) compaction -= 18;

  // ── pH ──
  if (params.heavyRainToday) pH -= 0.005;

  // ── Microbial Life ──
  if (params.pesticideAppliedToday) microbialLife -= 10;
  const microTarget = Math.min(100, organicMatter * 12);
  microbialLife += (microTarget - microbialLife) * 0.01;

  // ── Phosphorus ── (drains at harvest only)
  if (params.harvestedToday) {
    phosphorus -= params.cropPhosphorusDrain * params.hectares * 0.1;
  }

  // ── Potassium ── (drains at harvest only)
  if (params.harvestedToday) {
    potassium -= params.cropPotassiumDrain * params.hectares * 0.1;
  }

  // ── Drainage ── (recovers naturally; drops on heavy rain)
  if (params.weatherEvent === 'heavy_rain') {
    drainage -= 12;
  } else if (params.weatherEvent === 'drought') {
    drainage += 2;
  } else {
    // Natural recovery toward 65
    if (drainage < 65) drainage += 0.3;
  }

  return {
    nitrogen:     Math.max(0, Math.min(100, nitrogen)),
    organicMatter: Math.max(0, Math.min(10, organicMatter)),
    compaction:   Math.max(0, Math.min(100, compaction)),
    pH:           Math.max(4.0, Math.min(8.5, pH)),
    microbialLife: Math.max(0, Math.min(100, microbialLife)),
    phosphorus:   Math.max(0, Math.min(100, phosphorus)),
    potassium:    Math.max(0, Math.min(100, potassium)),
    drainage:     Math.max(0, Math.min(100, drainage)),
  };
}
```

- [ ] **Step 6: TypeScript check**

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1 | head -30"
```

Expected: errors in `store/useGameStore.ts` and `app/(tabs)/tierras.tsx` about missing fields — those are expected and resolved in later tasks. Zero errors in `engine/crops.ts` itself.

- [ ] **Step 7: Commit**

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add engine/crops.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(soil): add phosphorus, potassium, drainage to SoilStats + update all engine functions"
```

---

## Task 2: Add phosphorusDrain and potassiumDrain to all crops

**File:** `data/cropTypes.ts`

- [ ] **Step 1: Add fields to the CropType interface**

Find the `CropType` interface. Add two fields after `fertilityDrain`:

```typescript
  fertilityDrain: number;
  phosphorusDrain: number;   // P drained from soil per harvest
  potassiumDrain: number;    // K drained from soil per harvest
```

- [ ] **Step 2: Add values to all 29 crop definitions**

Replace the entire `CROP_TYPES` array. Each crop gets `phosphorusDrain` and `potassiumDrain` appended after its existing `droughtTolerance`:

```typescript
export const CROP_TYPES: CropType[] = [
  // ── Tier D — Basic / forage ───────────────────────────────────────────────
  { id: 'grass',        name: 'Grass / Hierba',  tier: 'D', growthDays: 7,   basePrice: 0.10, seedCost: 60,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 350,  seasons: ['spring','summer','autumn'],          peakSeason: 'summer',  fertilityDrain: 0,  frostKillTemp: -8,  heatStressTemp: 40, droughtTolerance: 0.6, phosphorusDrain: 1, potassiumDrain: 2 },
  { id: 'alfalfa',      name: 'Alfalfa',          tier: 'D', growthDays: 30,  basePrice: 6,    seedCost: 90,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring','summer','autumn'],          peakSeason: 'summer',  fertilityDrain: 0,  frostKillTemp: -5,  heatStressTemp: 40, droughtTolerance: 0.7, phosphorusDrain: 2, potassiumDrain: 3 },
  { id: 'barley',       name: 'Barley',           tier: 'D', growthDays: 65,  basePrice: 9,    seedCost: 140,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring','autumn'],                   peakSeason: 'spring',  fertilityDrain: 1,  frostKillTemp: -6,  heatStressTemp: 32, droughtTolerance: 0.5, phosphorusDrain: 3, potassiumDrain: 3 },
  { id: 'oats',         name: 'Oats',             tier: 'D', growthDays: 70,  basePrice: 9,    seedCost: 140,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 480,  seasons: ['spring','autumn'],                   peakSeason: 'spring',  fertilityDrain: 1,  frostKillTemp: -5,  heatStressTemp: 32, droughtTolerance: 0.4, phosphorusDrain: 3, potassiumDrain: 3 },
  // ── Tier C ────────────────────────────────────────────────────────────────
  { id: 'wheat',        name: 'Wheat',            tier: 'C', growthDays: 75,  basePrice: 16,   seedCost: 210,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 600,  seasons: ['spring','autumn'],                   peakSeason: 'summer',  fertilityDrain: 1,  frostKillTemp: -12, heatStressTemp: 32, droughtTolerance: 0.4, phosphorusDrain: 4, potassiumDrain: 4 },
  { id: 'corn',         name: 'Corn',             tier: 'C', growthDays: 85,  basePrice: 15,   seedCost: 200,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 700,  seasons: ['spring','summer'],                   peakSeason: 'autumn',  fertilityDrain: 2,  frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.3, phosphorusDrain: 5, potassiumDrain: 6 },
  { id: 'sorghum',      name: 'Sorghum',          tier: 'C', growthDays: 80,  basePrice: 14,   seedCost: 180,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 640,  seasons: ['spring','summer'],                   peakSeason: 'autumn',  fertilityDrain: 1,  frostKillTemp: -2,  heatStressTemp: 40, droughtTolerance: 0.8, phosphorusDrain: 3, potassiumDrain: 4 },
  { id: 'rice',         name: 'Rice',             tier: 'C', growthDays: 90,  basePrice: 18,   seedCost: 250,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'kg', baseYield: 560,  seasons: ['summer'],                            peakSeason: 'autumn',  fertilityDrain: 2,  frostKillTemp: -1,  heatStressTemp: 35, droughtTolerance: 0.1, phosphorusDrain: 4, potassiumDrain: 4 },
  // ── Tier B — Root crops & legumes ────────────────────────────────────────
  { id: 'potatoes',     name: 'Potatoes',         tier: 'B', growthDays: 80,  basePrice: 22,   seedCost: 580,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 720,  seasons: ['spring','autumn'],                   peakSeason: 'autumn',  fertilityDrain: 2,  frostKillTemp: -3,  heatStressTemp: 30, droughtTolerance: 0.4, phosphorusDrain: 9, potassiumDrain: 10 },
  { id: 'sugarbeet',    name: 'Sugar Beet',       tier: 'B', growthDays: 100, basePrice: 26,   seedCost: 520,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'L',  baseYield: 700,  seasons: ['spring','summer'],                   peakSeason: 'autumn',  fertilityDrain: 2,  frostKillTemp: -3,  heatStressTemp: 34, droughtTolerance: 0.5, phosphorusDrain: 8, potassiumDrain: 9 },
  { id: 'soy',          name: 'Soybean',          tier: 'B', growthDays: 100, basePrice: 38,   seedCost: 570,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 480,  seasons: ['spring','summer'],                   peakSeason: 'autumn',  fertilityDrain: 0,  frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5, phosphorusDrain: 2, potassiumDrain: 3 },
  { id: 'sugarcane',    name: 'Sugar Cane',       tier: 'B', growthDays: 120, basePrice: 26,   seedCost: 480,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'L',  baseYield: 800,  seasons: ['spring','summer'],                   peakSeason: 'spring',  fertilityDrain: 2,  frostKillTemp: -1,  heatStressTemp: 45, droughtTolerance: 0.3, phosphorusDrain: 7, potassiumDrain: 9 },
  // ── Tier A — Oil & fibre ──────────────────────────────────────────────────
  { id: 'sunflower',    name: 'Sunflower',        tier: 'A', growthDays: 95,  basePrice: 65,   seedCost: 1150, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 380,  seasons: ['spring','summer'],                   peakSeason: 'summer',  fertilityDrain: 1,  frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.8, phosphorusDrain: 5, potassiumDrain: 9 },
  { id: 'rapeseed',     name: 'Rapeseed',         tier: 'A', growthDays: 100, basePrice: 68,   seedCost: 1200, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 380,  seasons: ['spring','autumn'],                   peakSeason: 'spring',  fertilityDrain: 1,  frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4, phosphorusDrain: 5, potassiumDrain: 5 },
  { id: 'canola',       name: 'Canola',           tier: 'A', growthDays: 95,  basePrice: 70,   seedCost: 1280, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 370,  seasons: ['spring','autumn'],                   peakSeason: 'spring',  fertilityDrain: 1,  frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4, phosphorusDrain: 5, potassiumDrain: 5 },
  { id: 'cotton',       name: 'Cotton',           tier: 'A', growthDays: 110, basePrice: 85,   seedCost: 1650, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 330,  seasons: ['summer'],                            peakSeason: 'autumn',  fertilityDrain: 2,  frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.5, phosphorusDrain: 6, potassiumDrain: 7 },
  // ── Tier B — Fruits & vegetables ─────────────────────────────────────────
  { id: 'grapes',       name: 'Grapes',           tier: 'B', growthDays: 120, basePrice: 45,   seedCost: 800,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring','summer'],                   peakSeason: 'autumn',  fertilityDrain: 1,  frostKillTemp: -3,  heatStressTemp: 38, droughtTolerance: 0.4, phosphorusDrain: 6, potassiumDrain: 8 },
  { id: 'tomatoes',     name: 'Tomatoes',         tier: 'B', growthDays: 60,  basePrice: 30,   seedCost: 450,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 650,  seasons: ['spring','summer'],                   peakSeason: 'summer',  fertilityDrain: 2,  frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.4, phosphorusDrain: 7, potassiumDrain: 7 },
  { id: 'strawberries', name: 'Strawberries',     tier: 'B', growthDays: 50,  basePrice: 40,   seedCost: 600,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring'],                            peakSeason: 'spring',  fertilityDrain: 2,  frostKillTemp: -2,  heatStressTemp: 32, droughtTolerance: 0.3, phosphorusDrain: 6, potassiumDrain: 7 },
  // ── Tier A — Orchard ──────────────────────────────────────────────────────
  { id: 'olives',       name: 'Olives',           tier: 'A', growthDays: 150, basePrice: 80,   seedCost: 1800, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 280,  seasons: ['spring','autumn'],                   peakSeason: 'autumn',  fertilityDrain: 1,  frostKillTemp: -8,  heatStressTemp: 42, droughtTolerance: 0.7, phosphorusDrain: 4, potassiumDrain: 5 },
  { id: 'almonds',      name: 'Almonds',          tier: 'A', growthDays: 130, basePrice: 90,   seedCost: 2200, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 320,  seasons: ['spring','summer'],                   peakSeason: 'summer',  fertilityDrain: 1,  frostKillTemp: -3,  heatStressTemp: 42, droughtTolerance: 0.6, phosphorusDrain: 5, potassiumDrain: 6 },
  // ── Tier S — Premium specialty ────────────────────────────────────────────
  { id: 'saffron',      name: 'Saffron',          tier: 'S', growthDays: 180, basePrice: 500,  seedCost: 6000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 140,  seasons: ['autumn'],                            peakSeason: 'autumn',  fertilityDrain: 1,  frostKillTemp: -8,  heatStressTemp: 35, droughtTolerance: 0.5, phosphorusDrain: 4, potassiumDrain: 5 },
  { id: 'vanilla',      name: 'Vanilla',          tier: 'S', growthDays: 200, basePrice: 420,  seedCost: 7000, waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 175,  seasons: ['spring','summer'],                   peakSeason: 'summer',  fertilityDrain: 1,  frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5, phosphorusDrain: 4, potassiumDrain: 5 },
  { id: 'lavender',     name: 'Lavender',         tier: 'S', growthDays: 150, basePrice: 220,  seedCost: 5000, waterNeed: 2, fertilizerBonus: 1.3, unit: 'L',  baseYield: 280,  seasons: ['spring','summer'],                   peakSeason: 'summer',  fertilityDrain: 1,  frostKillTemp: -8,  heatStressTemp: 38, droughtTolerance: 0.7, phosphorusDrain: 3, potassiumDrain: 4 },
  { id: 'ginseng',      name: 'Ginseng',          tier: 'S', growthDays: 240, basePrice: 380,  seedCost: 9000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 240,  seasons: ['spring'],                            peakSeason: 'autumn',  fertilityDrain: 1,  frostKillTemp: -5,  heatStressTemp: 30, droughtTolerance: 0.4, phosphorusDrain: 4, potassiumDrain: 5 },
  // ── Cover crops (no harvest revenue) ─────────────────────────────────────
  { id: 'rye',          name: 'Winter Rye',       tier: 'D', growthDays: 60,  basePrice: 0,    seedCost: 40,   waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0,    seasons: ['autumn','winter'],                   peakSeason: 'winter', fertilityDrain: 0,  frostKillTemp: -20, heatStressTemp: 30, droughtTolerance: 0.8, phosphorusDrain: 0, potassiumDrain: 0, coverCrop: true },
  { id: 'clover',       name: 'Red Clover',       tier: 'D', growthDays: 45,  basePrice: 0,    seedCost: 35,   waterNeed: 2, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0,    seasons: ['spring','summer'],                   peakSeason: 'summer', fertilityDrain: 0,  frostKillTemp: -10, heatStressTemp: 32, droughtTolerance: 0.5, phosphorusDrain: 0, potassiumDrain: 0, coverCrop: true },
  { id: 'mustard',      name: 'White Mustard',    tier: 'D', growthDays: 40,  basePrice: 0,    seedCost: 30,   waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0,    seasons: ['spring','summer','autumn'],          peakSeason: 'summer', fertilityDrain: 0,  frostKillTemp: -5,  heatStressTemp: 35, droughtTolerance: 0.6, phosphorusDrain: 0, potassiumDrain: 0, coverCrop: true },
  { id: 'buckwheat',    name: 'Buckwheat',        tier: 'D', growthDays: 35,  basePrice: 0,    seedCost: 25,   waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0,    seasons: ['spring','summer'],                   peakSeason: 'summer', fertilityDrain: 0,  frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.7, phosphorusDrain: 0, potassiumDrain: 0, coverCrop: true },
];
```

- [ ] **Step 3: TypeScript check**

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1 | grep \"cropTypes\|CropType\" | head -10"
```

Expected: zero errors in `data/cropTypes.ts`.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add data/cropTypes.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(soil): add phosphorusDrain and potassiumDrain to all 29 CropType definitions"
```

---

## Task 3: Update PlantedCrop call sites in the store

**File:** `store/useGameStore.ts`

This task removes all reads of `crop.fertilized` and `crop.appliedFertilizerBonus`, and updates `plantCrop`/`plantCropBatch`/`fertilizeCrop` to use the new NPK fields.

- [ ] **Step 1: Update the plantCrop action signature and body**

Find `plantCrop: (parcelId, cropId, hectares, fertilized) =>` (around line 3827). Replace the entire action:

```typescript
      plantCrop: (parcelId, cropId, hectares, npkProductId?: string) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.owned || parcel.plantedCrop) return;
        if (!parcel.tilled) return;
        const cropType = CROP_TYPES.find(c => c.id === cropId);
        if (!cropType) return;
        const currentSeason = getSeason(state.day);
        if (!cropType.seasons.includes(currentSeason) && !parcel.greenhouse) return;

        // Resolve NPK bonus from product
        const NPK_PRODUCTS: Record<string, { n: number; p: number; k: number; cost: number }> = {
          npk_nitrogen:    { n: 1.15, p: 1.0,  k: 1.0,  cost: 90 },
          npk_phosphorus:  { n: 1.0,  p: 1.10, k: 1.0,  cost: 110 },
          npk_potassium:   { n: 1.0,  p: 1.0,  k: 1.08, cost: 100 },
          npk_blend:       { n: 1.10, p: 1.08, k: 1.07, cost: 220 },
        };
        const npk = npkProductId ? NPK_PRODUCTS[npkProductId] : null;
        const npkCostPerHa = npk ? (hasBiodigestor(state.buildings) ? 0 : npk.cost) : 0;
        const coopSeedDiscount = state.cooperative?.member ? 0.90 : 1.0;
        const seedCost = (cropType.seedCost * hectares * coopSeedDiscount) + (npkCostPerHa * hectares);
        if (state.money < seedCost) return;

        const plantedCrop: PlantedCrop = {
          cropId,
          parcelId,
          plantedDay: state.day,
          hectares,
          appliedN: npk?.n,
          appliedP: npk?.p,
          appliedK: npk?.k,
        };
        set({
          money: state.money - seedCost,
          parcels: state.parcels.map(p => p.id === parcelId ? { ...p, plantedCrop } : p),
          firstMissionStep: state.firstMissionStep === 0 ? 1 : state.firstMissionStep,
        });
      },
```

- [ ] **Step 2: Update the plantCrop action type signature in GameState**

Find the `plantCrop` type declaration (around line 663):

```typescript
// BEFORE:
  plantCrop: (parcelId: string, cropId: string, hectares: number, fertilized: boolean) => void;
// AFTER:
  plantCrop: (parcelId: string, cropId: string, hectares: number, npkProductId?: string) => void;
```

- [ ] **Step 3: Update plantCropBatch**

Find `plantCropBatch: (cropId, fertilized) =>` (around line 5041). Replace:

```typescript
      plantCropBatch: (cropId, npkProductId?: string) => {
        const state = get();
        const crop = CROP_TYPES.find(c => c.id === cropId);
        if (!crop) return;
        const idleParcels = state.parcels.filter(
          p => p.owned && !p.plantedCrop && p.tilled
        );
        if (idleParcels.length === 0) return;

        const NPK_PRODUCTS: Record<string, { n: number; p: number; k: number; cost: number }> = {
          npk_nitrogen:   { n: 1.15, p: 1.0,  k: 1.0,  cost: 90 },
          npk_phosphorus: { n: 1.0,  p: 1.10, k: 1.0,  cost: 110 },
          npk_potassium:  { n: 1.0,  p: 1.0,  k: 1.08, cost: 100 },
          npk_blend:      { n: 1.10, p: 1.08, k: 1.07, cost: 220 },
        };
        const npk = npkProductId ? NPK_PRODUCTS[npkProductId] : null;
        const npkCostPerHa = npk ? (hasBiodigestor(state.buildings) ? 0 : npk.cost) : 0;
        const coopDiscount = state.cooperative?.member ? 0.90 : 1.0;
        const totalCost = idleParcels.reduce(
          (sum, p) => sum + Math.round((crop.seedCost * coopDiscount + npkCostPerHa) * p.hectares),
          0,
        );
        if (state.money < totalCost) return;

        const plantDay = state.day;
        set({
          money: state.money - totalCost,
          parcels: state.parcels.map(p => {
            if (!idleParcels.some(ip => ip.id === p.id)) return p;
            return {
              ...p,
              plantedCrop: {
                cropId,
                parcelId: p.id,
                plantedDay: plantDay,
                hectares: p.hectares,
                appliedN: npk?.n,
                appliedP: npk?.p,
                appliedK: npk?.k,
              },
              tilled: false,
            };
          }),
        });
      },
```

Also update the type declaration for `plantCropBatch` (around line 650):
```typescript
// BEFORE:
  plantCropBatch: (cropId: string, fertilized: boolean) => void;
// AFTER:
  plantCropBatch: (cropId: string, npkProductId?: string) => void;
```

- [ ] **Step 4: Update fertilizeCrop action (mid-growth top-dressing)**

Find `fertilizeCrop: (parcelId, productId) =>` (around line 5294). Replace the body:

```typescript
      fertilizeCrop: (parcelId, productId) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.plantedCrop) return;
        // Already has a full NPK blend applied — no stacking
        if (parcel.plantedCrop.appliedN && parcel.plantedCrop.appliedP && parcel.plantedCrop.appliedK) return;

        const NPK_PRODUCTS: Record<string, { n: number; p: number; k: number }> = {
          npk_nitrogen:   { n: 1.15, p: 1.0,  k: 1.0  },
          npk_phosphorus: { n: 1.0,  p: 1.10, k: 1.0  },
          npk_potassium:  { n: 1.0,  p: 1.0,  k: 1.08 },
          npk_blend:      { n: 1.10, p: 1.08, k: 1.07 },
        };
        const npk = NPK_PRODUCTS[productId];
        if (!npk) return;

        const cost = (() => {
          const costs: Record<string, number> = {
            npk_nitrogen: 90, npk_phosphorus: 110, npk_potassium: 100, npk_blend: 220,
          };
          return (costs[productId] ?? 0) * parcel.hectares;
        })();
        if (state.money < cost) return;

        set({
          money: state.money - cost,
          parcels: state.parcels.map(p =>
            p.id === parcelId
              ? {
                  ...p,
                  fertility: Math.min(25, p.fertility + 2),
                  plantedCrop: {
                    ...p.plantedCrop!,
                    appliedN: Math.max(p.plantedCrop!.appliedN ?? 1.0, npk.n),
                    appliedP: Math.max(p.plantedCrop!.appliedP ?? 1.0, npk.p),
                    appliedK: Math.max(p.plantedCrop!.appliedK ?? 1.0, npk.k),
                  },
                }
              : p
          ),
        });
      },
```

- [ ] **Step 5: Search for any remaining reads of fertilized/appliedFertilizerBonus**

```bash
grep -n "\.fertilized\|appliedFertilizerBonus\|fertilized:" "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/store/useGameStore.ts"
```

For each remaining occurrence, replace `crop.fertilized ? (crop.appliedFertilizerBonus ?? cropType.fertilizerBonus) : 1.0` with `(crop.appliedN ?? 1.0) * (crop.appliedP ?? 1.0) * (crop.appliedK ?? 1.0)`. For any `plantedCrop: { ..., fertilized }` constructions, replace `fertilized` with nothing (the field no longer exists).

- [ ] **Step 6: TypeScript check**

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1 | head -30"
```

Expected: zero errors (or only errors in tierras.tsx if it still reads `fertilized`).

- [ ] **Step 7: Commit**

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(soil): replace fertilized boolean with appliedN/P/K in PlantedCrop + update all call sites"
```

---

## Task 4: Wire P/K drain, add applySoilNPK, save migration

**File:** `store/useGameStore.ts`

- [ ] **Step 1: Update the advanceSoilStats call in advanceDay to pass new SoilTickParams fields**

Find the `tickParams` block (around line 3155):

```typescript
// BEFORE:
          const tickParams: SoilTickParams = {
            activeCropId: p.plantedCrop?.cropId ?? null,
            harvestedToday: false,
            machineryUsedToday: ...,
            heavyRainToday: (todayWeather?.event === 'heavy_rain' || todayWeather?.event === 'rain'),
            ...
          };
          ...
          soil: advanceSoilStats(p.soil ?? SOIL_DEFAULTS, tickParams, nitrogenDemand),
```

Replace with (add the three new fields):

```typescript
          const nitrogenDemand = cropType?.fertilityDrain ?? 0;
          const tickParams: SoilTickParams = {
            activeCropId: p.plantedCrop?.cropId ?? null,
            harvestedToday: false,
            machineryUsedToday: (state.machines ?? []).some(m => m.assignedParcelId === p.id),
            heavyRainToday: (todayWeather?.event === 'heavy_rain' || todayWeather?.event === 'rain'),
            pesticideAppliedToday: false,
            manureAppliedToday: false,
            subsoilerUsedToday: false,
            weatherEvent: todayWeather?.event,          // NEW
            cropPhosphorusDrain: cropType?.phosphorusDrain ?? 0,  // NEW
            cropPotassiumDrain:  cropType?.potassiumDrain  ?? 0,  // NEW
            hectares: p.hectares,                        // NEW
          };
```

- [ ] **Step 2: Add applySoilNPK action**

Find the `applySoilAmendment` action. Add the new action immediately after it:

```typescript
      applySoilNPK: (parcelId: string, productId: string) => {
        const state = get();
        const parcel = state.parcels.find(p => p.id === parcelId);
        if (!parcel || !parcel.owned) return;

        const NPK_AMENDMENTS: Record<string, { n: number; p: number; k: number; cost: number }> = {
          npk_nitrogen:   { n: 20, p: 0,  k: 0,  cost: 90  },
          npk_phosphorus: { n: 0,  p: 20, k: 0,  cost: 110 },
          npk_potassium:  { n: 0,  p: 0,  k: 20, cost: 100 },
          npk_blend:      { n: 10, p: 12, k: 12, cost: 220 },
        };
        const amendment = NPK_AMENDMENTS[productId];
        if (!amendment) return;

        const totalCost = amendment.cost * parcel.hectares;
        if (state.money < totalCost) return;

        const currentSoil = parcel.soil ?? SOIL_DEFAULTS;
        set({
          money: state.money - totalCost,
          parcels: state.parcels.map(p =>
            p.id === parcelId
              ? {
                  ...p,
                  soil: {
                    ...currentSoil,
                    nitrogen:   Math.min(100, currentSoil.nitrogen   + amendment.n),
                    phosphorus: Math.min(100, currentSoil.phosphorus + amendment.p),
                    potassium:  Math.min(100, currentSoil.potassium  + amendment.k),
                  },
                }
              : p
          ),
        });
      },
```

Also add to the `GameState` type (near the other action type declarations):
```typescript
  applySoilNPK: (parcelId: string, productId: string) => void;
```

- [ ] **Step 3: Add drainage tile to applySoilAmendment**

Find `applySoilAmendment` action. Add `drainage_tile` to the amendments map inside it:

```typescript
        const AMENDMENTS: Record<string, Partial<SoilStats>> = {
          lime:          { pH: Math.min(8.5, (parcel.soil?.pH ?? 6.5) + 0.5) },
          sulfur:        { pH: Math.max(4.0, (parcel.soil?.pH ?? 6.5) - 0.5) },
          subsoiler:     { compaction: Math.max(0, (parcel.soil?.compaction ?? 20) - 18) },
          drainage_tile: { drainage: Math.min(100, (parcel.soil?.drainage ?? 65) + 15) },  // NEW
        };
```

- [ ] **Step 4: Bump save key and add migration**

Find the persist config `name: 'granja-tycoon-save-v4'`. Change to `'granja-tycoon-save-v5'`.

Find the `migrate` function (or the `version` field in persist options). Update or add the migration:

```typescript
        migrate: (persistedState: any, version: number) => {
          if (version < 5) {
            // v4 → v5: add phosphorus, potassium, drainage to soil; map fertilized → appliedN
            persistedState.parcels = (persistedState.parcels ?? []).map((p: any) => ({
              ...p,
              soil: {
                nitrogen:     p.soil?.nitrogen     ?? 65,
                organicMatter: p.soil?.organicMatter ?? 4.5,
                compaction:   p.soil?.compaction   ?? 20,
                pH:           p.soil?.pH           ?? 6.5,
                microbialLife: p.soil?.microbialLife ?? 70,
                phosphorus:   60,   // new field
                potassium:    60,   // new field
                drainage:     65,   // new field
              },
              plantedCrop: p.plantedCrop ? {
                cropId:       p.plantedCrop.cropId,
                parcelId:     p.plantedCrop.parcelId,
                plantedDay:   p.plantedCrop.plantedDay,
                hectares:     p.plantedCrop.hectares,
                appliedN:     p.plantedCrop.fertilized ? 1.3 : undefined,
                appliedP:     undefined,
                appliedK:     undefined,
                frostDamage:  p.plantedCrop.frostDamage,
                droughtStress: p.plantedCrop.droughtStress,
                moistureLevel: p.plantedCrop.moistureLevel,
              } : null,
            }));
          }
          return persistedState;
        },
        version: 5,
```

- [ ] **Step 5: TypeScript check**

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1 | head -20"
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(soil): add applySoilNPK action, drainage tile amendment, P/K drain tick, save migration v4→v5"
```

---

## Task 5: Update tierras.tsx UI

**File:** `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Add P, K, drainage bars to the SoilTab component**

Find the `stats` array inside `SoilTab` (the one with `{ label: 'Nitrogen', value: soil.nitrogen, ... }`). Add three entries after the existing five:

```typescript
    { label: 'Nitrogen',       value: soil.nitrogen,      min: 0,   max: 100 },
    { label: 'Organic Matter', value: soil.organicMatter,  min: 0,   max: 10,  unit: '%' },
    { label: 'Compaction',     value: soil.compaction,     min: 0,   max: 100, invert: true },
    { label: 'pH',             value: soil.pH,             min: 4.0, max: 8.5 },
    { label: 'Microbial Life', value: soil.microbialLife,  min: 0,   max: 100 },
    { label: 'Phosphorus',     value: soil.phosphorus,     min: 0,   max: 100 },
    { label: 'Potassium',      value: soil.potassium,      min: 0,   max: 100 },
    { label: 'Drainage',       value: soil.drainage,       min: 0,   max: 100 },
```

- [ ] **Step 2: Add NPK amendment buttons to SoilTab**

Find where `lime`, `sulfur`, `subsoiler` amendment buttons are rendered inside `SoilTab`. Add NPK and drainage buttons alongside them (or in a new row). Find the existing amendment buttons array and extend it:

```typescript
          { id: 'lime'          as const, label: '🧪 Lime',     hint: 'pH +0.5 · $150/ha' },
          { id: 'sulfur'        as const, label: '⚗️ Sulfur',   hint: 'pH −0.5 · $120/ha' },
          { id: 'subsoiler'     as const, label: '⚙️ Subsoil',  hint: 'Compact −18 · $200/ha' },
          { id: 'npk_nitrogen'  as const, label: '🌿 Urea (N)', hint: 'N +20 · $90/ha' },
          { id: 'npk_phosphorus'as const, label: '🦴 Phosphate',hint: 'P +20 · $110/ha' },
          { id: 'npk_potassium' as const, label: '🪨 Potash (K)',hint: 'K +20 · $100/ha' },
          { id: 'npk_blend'     as const, label: '🌱 NPK Blend',hint: 'N+10 P+12 K+12 · $220/ha' },
          { id: 'drainage_tile' as const, label: '💧 Drain Tile',hint: 'Drainage +15 · $400/ha' },
```

Update the `onAmendment` handler call to also handle the new product IDs. The `onAmendment` prop from `SoilTab` currently calls `applySoilAmendment`. NPK products call `applySoilNPK` instead. Update the handler in the parent:

```typescript
// Find where onAmendment is wired up (the prop passed to SoilTab):
onAmendment={(type) => {
  if (['npk_nitrogen','npk_phosphorus','npk_potassium','npk_blend'].includes(type)) {
    applySoilNPK(parcel.id, type);
  } else {
    applySoilAmendment(parcel.id, type as any);
  }
}}
```

Also destructure `applySoilNPK` from `useGameStore()` wherever `applySoilAmendment` is destructured.

- [ ] **Step 3: Replace the fertilizer Yes/No toggle in the planting modal with an NPK selector**

Find the planting modal section that renders the fertilizer toggle (look for text like "Fertilize?" or a Switch/boolean toggle). Replace it with:

```tsx
{/* NPK Fertilizer Selector */}
<View style={{ marginBottom: 12 }}>
  <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>Fertilizer at planting</Text>
  {[
    { id: undefined,          label: 'None',          hint: '+$0',        color: '#555' },
    { id: 'npk_nitrogen',     label: 'N – Urea',      hint: '+$90/ha',    color: '#4caf50' },
    { id: 'npk_phosphorus',   label: 'P – Phosphate', hint: '+$110/ha',   color: '#ff9800' },
    { id: 'npk_potassium',    label: 'K – Potash',    hint: '+$100/ha',   color: '#9c27b0' },
    { id: 'npk_blend',        label: 'NPK Blend',     hint: '+$220/ha',   color: '#2196f3' },
  ].map(opt => (
    <TouchableOpacity
      key={opt.id ?? 'none'}
      onPress={() => setSelectedNpk(opt.id ?? null)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: selectedNpk === (opt.id ?? null) ? opt.color : '#333',
        backgroundColor: selectedNpk === (opt.id ?? null) ? opt.color + '22' : 'transparent',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 13 }}>{opt.label}</Text>
        <Text style={{ color: '#888', fontSize: 11 }}>{opt.hint}</Text>
      </View>
      {selectedNpk === (opt.id ?? null) && (
        <Text style={{ color: opt.color, fontSize: 16 }}>✓</Text>
      )}
    </TouchableOpacity>
  ))}
</View>
```

Add `const [selectedNpk, setSelectedNpk] = useState<string | null>(null);` near the other planting modal state. Update the plant button press to pass `selectedNpk ?? undefined` as the `npkProductId` argument to `plantCrop`.

- [ ] **Step 4: TypeScript check**

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1 | head -20"
```

Expected: zero errors.

- [ ] **Step 5: Start dev server and verify visually**

```bash
cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon"
CI=1 npx expo start --web
```

Open `http://localhost:8081/(tabs)/tierras`. Verify:
- Soil tab shows 8 bars (the original 5 + Phosphorus, Potassium, Drainage)
- Amendment buttons include the 4 NPK options and Drainage Tile
- Planting modal shows 5-option NPK selector (None / N / P / K / Blend)
- Selecting an NPK option and planting deducts cost correctly

- [ ] **Step 6: Commit**

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add "app/(tabs)/tierras.tsx"
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(ui): NPK + drainage bars in soil tab; NPK product selector in planting modal"
```

---

## Self-Review Checklist

- [ ] `SoilStats` has all 8 fields; `SOIL_DEFAULTS` initialises all 8
- [ ] `computeSoilYieldModifier` multiplies all 8 modifiers
- [ ] `harvestAmount` uses `appliedN * appliedP * appliedK` (not `fertilized`)
- [ ] `SoilTickParams` has `weatherEvent`, `cropPhosphorusDrain`, `cropPotassiumDrain`, `hectares`
- [ ] `advanceSoilStats` drains P/K on `harvestedToday`; ticks drainage on `weatherEvent`
- [ ] All 29 crops have `phosphorusDrain` and `potassiumDrain` (cover crops = 0)
- [ ] `plantCrop`, `plantCropBatch`, `fertilizeCrop` all use `npkProductId` — no remaining reads of `fertilized`
- [ ] `applySoilNPK` added to store + type declaration
- [ ] `drainage_tile` handled in `applySoilAmendment`
- [ ] Save key is `granja-tycoon-save-v5`; migration maps old `fertilized: true` → `appliedN: 1.3`
- [ ] `tierras.tsx` shows 8 soil bars and 5-option NPK planting selector
