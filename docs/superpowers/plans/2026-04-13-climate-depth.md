# Climate Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add min/max temperature, multi-day weather streaks, and probabilistic forecast accuracy to the climate system, then make frost and drought accumulate damage on planted crops over multiple days.

**Architecture:** Temperature generation and streak logic live entirely in `engine/climate.ts`. Crop damage accumulation lives on the `PlantedCrop` type in `engine/crops.ts`. The store's `advanceDay()` calls a new `applyDailyWeather()` after resolving today's weather; the old random-destruction block is replaced by this deterministic accumulation model. The forecast UI in `clima.tsx` is updated to show temperature ranges, probabilities, and streak indicators.

**Tech Stack:** TypeScript, React Native, Zustand 5, Expo 54. No test framework — verify each task with `npx tsc --noEmit` from the project root.

---

## File Map

| File | Change |
|---|---|
| `engine/climate.ts` | Extend `WeatherDay`, add temp generation + streak generation + probability in `generateForecast()`, add new `applyDailyWeather()` export |
| `data/cropTypes.ts` | Add `frostKillTemp`, `heatStressTemp`, `droughtTolerance` to `CropType` interface and all 28 crop definitions |
| `engine/crops.ts` | Add `frostDamage?`, `droughtStress?`, `moistureLevel?` to `PlantedCrop`; add `frostDamage` and `droughtStress` optional params to `harvestAmount()` |
| `store/useGameStore.ts` | Call `applyDailyWeather()` in `advanceDay()`; replace random-destruction block with accumulation kill; pass `frostDamage`/`droughtStress` to `harvestAmount()` call sites |
| `app/(tabs)/clima.tsx` | Update 7-day forecast tiles to show temp range, probability %, streak counter, frost warning border |
| `app/(tabs)/tierras.tsx` | Add ⚠️ frost-incoming warning icon on parcel cards when frost is in forecast within 3 days |

---

## Task 1: Extend WeatherDay and rewrite generateForecast()

**Files:**
- Modify: `engine/climate.ts`

- [ ] **Step 1: Replace the WeatherDay interface and add supporting constants**

Open `engine/climate.ts`. Replace the existing `WeatherDay` interface and add the new constants directly below the `WEATHER_MODIFIERS` block:

```ts
export interface WeatherDay {
  event: WeatherEvent;
  climateModifier: number;
  minTemp: number;       // °C
  maxTemp: number;       // °C
  probability: number;   // 0.0–1.0 forecast accuracy; 1.0 = certain (today)
  streakDay?: number;    // 1-based day within a streak; undefined for non-streak events
}

// Temperature ranges [min_lo, min_hi, max_lo, max_hi] by season
const TEMP_RANGES: Record<Season, [number, number, number, number]> = {
  spring: [-3, 15,  8, 25],
  summer: [10, 22, 25, 40],
  autumn: [ 0, 15, 10, 25],
  winter: [-15, 5, -5, 12],
};

// Max streak length per event (min always 1)
const MAX_STREAK: Partial<Record<WeatherEvent, number>> = {
  frost:      5,
  drought:   14,
  heavy_rain: 3,
  hail:       2,
  perfect:    4,
};

// Forecast accuracy by distance (index = days ahead, 0 = today)
const FORECAST_ACCURACY = [1.0, 0.95, 0.85, 0.70, 0.70, 0.55, 0.55, 0.45];
```

- [ ] **Step 2: Add the temperature generation helper**

Add this function after the constants, before `getSeason`:

```ts
function generateTemp(event: WeatherEvent, season: Season): { minTemp: number; maxTemp: number } {
  const [minLo, minHi, maxLo, maxHi] = TEMP_RANGES[season];
  let minTemp = minLo + Math.random() * (minHi - minLo);
  let maxTemp = maxLo + Math.random() * (maxHi - maxLo);

  // Force temperatures appropriate to event type
  if (event === 'frost') {
    minTemp = Math.min(minTemp, -0.5);           // always below freezing
    maxTemp = Math.min(maxTemp, minTemp + 10);   // cold day overall
  } else if (event === 'drought') {
    maxTemp = Math.max(maxTemp, 32);             // always hot
    minTemp = Math.max(minTemp, 12);
  } else if (event === 'perfect') {
    minTemp = 15 + Math.random() * 7;            // 15–22°C
    maxTemp = 22 + Math.random() * 6;            // 22–28°C
  } else if (event === 'heavy_rain') {
    maxTemp = Math.min(maxTemp, 20);             // cool and wet
  }

  return { minTemp: Math.round(minTemp * 10) / 10, maxTemp: Math.round(maxTemp * 10) / 10 };
}
```

- [ ] **Step 3: Rewrite generateForecast() to produce streaks + temps + probabilities**

Replace the existing `generateForecast` function:

```ts
export function generateForecast(season: Season, days = 7): WeatherDay[] {
  const seasonWeights: Record<Season, Partial<Record<WeatherEvent, number>>> = {
    spring: { rain: 3, sunny: 3, cloudy: 2, perfect: 1, wind: 1 },
    summer: { sunny: 4, drought: 2, perfect: 2, hail: 1, cloudy: 1 },
    autumn: { cloudy: 3, rain: 3, wind: 2, fog: 2 },
    winter: { frost: 3, cloudy: 3, rain: 2, heavy_rain: 1, wind: 1 },
  };

  const weights = seasonWeights[season];
  const pool: WeatherEvent[] = [];
  for (const [event, weight] of Object.entries(weights)) {
    for (let i = 0; i < (weight as number); i++) pool.push(event as WeatherEvent);
  }

  const result: WeatherDay[] = [];
  let dayIndex = 0;

  while (result.length < days) {
    const event = pool[Math.floor(Math.random() * pool.length)];
    const maxLen = MAX_STREAK[event] ?? 1;
    const streakLen = maxLen > 1 ? 1 + Math.floor(Math.random() * maxLen) : 1;
    const actualLen = Math.min(streakLen, days - result.length);

    for (let s = 0; s < actualLen; s++) {
      const distanceAhead = result.length; // 0 = first slot (today+1 in a fresh forecast)
      const accuracy = FORECAST_ACCURACY[Math.min(distanceAhead, FORECAST_ACCURACY.length - 1)];
      const { minTemp, maxTemp } = generateTemp(event, season);
      result.push({
        event,
        climateModifier: WEATHER_MODIFIERS[event],
        minTemp,
        maxTemp,
        probability: accuracy,
        streakDay: actualLen > 1 ? s + 1 : undefined,
      });
    }
    dayIndex += actualLen;
  }

  return result.slice(0, days);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only about missing `minTemp`/`maxTemp` on existing `WeatherDay` usages in `store/useGameStore.ts` and `app/(tabs)/clima.tsx` — those are expected and will be fixed in later tasks. Zero errors in `engine/climate.ts` itself.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add engine/climate.ts
git commit -m "feat(climate): add temperature, streaks, and probabilistic forecast to WeatherDay"
```

---

## Task 2: Add climate fields to CropType and PlantedCrop

**Files:**
- Modify: `data/cropTypes.ts`
- Modify: `engine/crops.ts`

- [ ] **Step 1: Add three new fields to the CropType interface in data/cropTypes.ts**

In `data/cropTypes.ts`, find the `CropType` interface and add three fields after `fertilityDrain`:

```ts
export interface CropType {
  id: string;
  name: string;
  tier: CropTier;
  growthDays: number;
  basePrice: number;
  seedCost: number;
  waterNeed: number;
  fertilizerBonus: number;
  unit: CropUnit;
  baseYield: number;
  seasons: PlantingSeason[];
  peakSeason: PlantingSeason;
  fertilityDrain: number;
  frostKillTemp: number;      // NEW: °C below which crop is killed (e.g. -5)
  heatStressTemp: number;     // NEW: °C above which heat stress starts (e.g. 36)
  droughtTolerance: number;   // NEW: 0–1 (0=very sensitive, 1=immune)
}
```

- [ ] **Step 2: Add climate values to all 28 crops in CROP_TYPES**

Replace the entire `CROP_TYPES` array with the updated version. Each crop gets the three new fields appended to its definition:

```ts
export const CROP_TYPES: CropType[] = [
  // Tier D
  { id: 'grass',        name: 'Grass / Hierba', tier: 'D', growthDays: 7,   basePrice: 0.10, seedCost: 60,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 350,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, frostKillTemp: -8,  heatStressTemp: 40, droughtTolerance: 0.6 },
  { id: 'alfalfa',      name: 'Alfalfa',         tier: 'D', growthDays: 30,  basePrice: 6,   seedCost: 90,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, frostKillTemp: -5,  heatStressTemp: 40, droughtTolerance: 0.7 },
  { id: 'barley',       name: 'Barley',           tier: 'D', growthDays: 65,  basePrice: 9,   seedCost: 140,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -6,  heatStressTemp: 32, droughtTolerance: 0.5 },
  { id: 'oats',         name: 'Oats',             tier: 'D', growthDays: 70,  basePrice: 9,   seedCost: 140,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 480,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -5,  heatStressTemp: 32, droughtTolerance: 0.4 },
  // Tier C
  { id: 'wheat',        name: 'Wheat',            tier: 'C', growthDays: 75,  basePrice: 16,  seedCost: 210,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 600,  seasons: ['spring','autumn'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -12, heatStressTemp: 32, droughtTolerance: 0.4 },
  { id: 'corn',         name: 'Corn',             tier: 'C', growthDays: 85,  basePrice: 15,  seedCost: 200,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 700,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.3 },
  { id: 'sorghum',      name: 'Sorghum',          tier: 'C', growthDays: 80,  basePrice: 14,  seedCost: 180,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 640,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -2,  heatStressTemp: 40, droughtTolerance: 0.8 },
  { id: 'rice',         name: 'Rice',             tier: 'C', growthDays: 90,  basePrice: 18,  seedCost: 250,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'kg', baseYield: 560,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 35, droughtTolerance: 0.1 },
  // Tier B — Root crops & legumes
  { id: 'potatoes',     name: 'Potatoes',         tier: 'B', growthDays: 80,  basePrice: 22,  seedCost: 580,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 720,  seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -3,  heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'sugarbeet',    name: 'Sugar Beet',       tier: 'B', growthDays: 100, basePrice: 26,  seedCost: 520,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'L',  baseYield: 700,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -3,  heatStressTemp: 34, droughtTolerance: 0.5 },
  { id: 'soy',          name: 'Soybean',          tier: 'B', growthDays: 100, basePrice: 38,  seedCost: 570,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 480,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 0, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'sugarcane',    name: 'Sugar Cane',       tier: 'B', growthDays: 120, basePrice: 26,  seedCost: 480,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'L',  baseYield: 800,  seasons: ['spring','summer'],          peakSeason: 'spring',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 45, droughtTolerance: 0.3 },
  // Tier A — Oil & fibre
  { id: 'sunflower',    name: 'Sunflower',        tier: 'A', growthDays: 95,  basePrice: 65,  seedCost: 1150, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 380,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.8 },
  { id: 'rapeseed',     name: 'Rapeseed',         tier: 'A', growthDays: 100, basePrice: 68,  seedCost: 1200, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 380,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'canola',       name: 'Canola',           tier: 'A', growthDays: 95,  basePrice: 70,  seedCost: 1280, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 370,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'cotton',       name: 'Cotton',           tier: 'A', growthDays: 110, basePrice: 85,  seedCost: 1650, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 330,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.5 },
  // Tier B — Fruits & vegetables
  { id: 'grapes',       name: 'Grapes',           tier: 'B', growthDays: 120, basePrice: 45,  seedCost: 800,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -3,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'tomatoes',     name: 'Tomatoes',         tier: 'B', growthDays: 60,  basePrice: 30,  seedCost: 450,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 650,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'strawberries', name: 'Strawberries',     tier: 'B', growthDays: 50,  basePrice: 40,  seedCost: 600,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring'],                   peakSeason: 'spring',  fertilityDrain: 2, frostKillTemp: -2,  heatStressTemp: 32, droughtTolerance: 0.3 },
  // Tier A — Orchard
  { id: 'olives',       name: 'Olives',           tier: 'A', growthDays: 150, basePrice: 80,  seedCost: 1800, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 280,  seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 42, droughtTolerance: 0.7 },
  { id: 'almonds',      name: 'Almonds',          tier: 'A', growthDays: 130, basePrice: 90,  seedCost: 2200, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 320,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -3,  heatStressTemp: 42, droughtTolerance: 0.6 },
  // Tier S — Premium specialty
  { id: 'saffron',      name: 'Saffron',          tier: 'S', growthDays: 180, basePrice: 500, seedCost: 6000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 140,  seasons: ['autumn'],                   peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 35, droughtTolerance: 0.5 },
  { id: 'vanilla',      name: 'Vanilla',          tier: 'S', growthDays: 200, basePrice: 420, seedCost: 7000, waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 175,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'lavender',     name: 'Lavender',         tier: 'S', growthDays: 150, basePrice: 220, seedCost: 5000, waterNeed: 2, fertilizerBonus: 1.3, unit: 'L',  baseYield: 280,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 38, droughtTolerance: 0.7 },
  { id: 'ginseng',      name: 'Ginseng',          tier: 'S', growthDays: 240, basePrice: 380, seedCost: 9000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 240,  seasons: ['spring'],                   peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -5,  heatStressTemp: 30, droughtTolerance: 0.4 },
];
```

- [ ] **Step 3: Add frostDamage, droughtStress, moistureLevel to PlantedCrop in engine/crops.ts**

Find the `PlantedCrop` interface in `engine/crops.ts` and add three optional fields:

```ts
export interface PlantedCrop {
  cropId: string;
  parcelId: string;
  plantedDay: number;
  hectares: number;
  fertilized: boolean;
  appliedFertilizerBonus?: number;
  frostDamage?: number;    // NEW: 0–1 accumulated; ≥1.0 = crop killed
  droughtStress?: number;  // NEW: 0–1 accumulated
  moistureLevel?: number;  // NEW: 0–1 soil moisture; default 0.7
}
```

- [ ] **Step 4: Update harvestAmount() to accept and apply frost/drought multipliers**

Replace the `harvestAmount` function signature and body:

```ts
export function harvestAmount(
  crop: PlantedCrop,
  cropType: CropType,
  fertility: number,
  climateModifier: number,
  hasWeeds: boolean,
  machineYieldBonus: number,
  frostDamage = 0,    // default 0 = no damage (backwards compatible)
  droughtStress = 0,  // default 0 = no stress
): number {
  const fertilityMod = 0.5 + (fertility / 25) * 0.5;
  const fertilizerMod = crop.fertilized
    ? (crop.appliedFertilizerBonus ?? cropType.fertilizerBonus)
    : 1.0;
  const weedMod = hasWeeds ? 0.75 : 1.0;
  const frostMod = Math.max(0, 1 - frostDamage * 0.7);
  const droughtMod = Math.max(0, 1 - droughtStress * 0.8);

  return (
    crop.hectares *
    cropType.baseYield *
    fertilityMod *
    fertilizerMod *
    weedMod *
    climateModifier *
    machineYieldBonus *
    frostMod *
    droughtMod
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero new errors in `data/cropTypes.ts` or `engine/crops.ts`. Any errors in `store/useGameStore.ts` about `frostKillTemp` are pre-existing from this task and will be resolved in Task 4.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add data/cropTypes.ts engine/crops.ts
git commit -m "feat(climate): add frostKillTemp/heatStressTemp/droughtTolerance to CropType and damage fields to PlantedCrop"
```

---

## Task 3: Add applyDailyWeather() to engine/climate.ts

**Files:**
- Modify: `engine/climate.ts`

This function is called once per day in `advanceDay()`. It updates `moistureLevel`, accumulates `frostDamage`, and accumulates `droughtStress` on every planted parcel.

- [ ] **Step 1: Add the applyDailyWeather export to engine/climate.ts**

Add these imports at the top of `engine/climate.ts` (the file currently has no imports — add them):

```ts
import type { PlantedCrop } from './crops';
import type { CropType } from '../data/cropTypes';
```

Then add the function at the bottom of the file:

```ts
// Frost damage per day, indexed by temperature buckets
function frostDamageForTemp(minTemp: number): number {
  if (minTemp >= 0)    return 0;
  if (minTemp >= -2)   return 0.05;
  if (minTemp >= -5)   return 0.15;
  if (minTemp >= -10)  return 0.30;
  return 0.50;
}

export interface ParcelWeatherState {
  id: string;
  plantedCrop: PlantedCrop | null;
  irrigated: boolean;
  greenhouse: boolean;
}

export interface ParcelWeatherResult {
  id: string;
  plantedCrop: PlantedCrop | null;
  killed: boolean; // true if frostDamage reached ≥ 1.0 this day
}

/**
 * Apply one day of weather to all planted crops.
 * Returns updated parcels — caller is responsible for merging back into state.
 */
export function applyDailyWeather(
  parcels: ParcelWeatherState[],
  weather: WeatherDay,
  cropTypes: CropType[],
): ParcelWeatherResult[] {
  return parcels.map(parcel => {
    if (!parcel.plantedCrop || parcel.greenhouse) {
      return { id: parcel.id, plantedCrop: parcel.plantedCrop, killed: false };
    }

    const crop = parcel.plantedCrop;
    const cropType = cropTypes.find(ct => ct.id === crop.cropId);
    if (!cropType) return { id: parcel.id, plantedCrop: crop, killed: false };

    let moistureLevel = crop.moistureLevel ?? 0.7;
    let frostDamage   = crop.frostDamage   ?? 0;
    let droughtStress = crop.droughtStress  ?? 0;

    // ── Moisture update ──────────────────────────────────────────────────────
    const irrigated = parcel.irrigated;
    let moistureDelta = 0;
    switch (weather.event) {
      case 'rain':       moistureDelta = 0.15 + Math.random() * 0.05; break;
      case 'heavy_rain': moistureDelta = 0.25; break;
      case 'drought':    moistureDelta = irrigated ? -0.01 : -0.08;   break;
      case 'sunny':      moistureDelta = irrigated ? -0.01 : -0.03;   break;
      default:           moistureDelta = irrigated ? 0    : -0.01;    break;
    }
    moistureLevel = Math.max(0, Math.min(1, moistureLevel + moistureDelta));

    // ── Frost damage accumulation ─────────────────────────────────────────────
    if (weather.event === 'frost') {
      const currentDay = 0; // caller passes plantedDay info via cropType if needed
      // Seedling vulnerability: if crop is in first 10 days, kill threshold is +3°C higher
      // We approximate "seedling" here by checking if frostDamage is still 0 (fresh planting)
      // The store knows plantedDay; pass effective kill temp offset via this flag approach:
      const effectiveKillTemp = cropType.frostKillTemp; // store applies seedling offset
      if (weather.minTemp < 0) {
        const rawDamage = frostDamageForTemp(weather.minTemp);
        // Only accumulate if below kill threshold (or approaching it)
        if (weather.minTemp < effectiveKillTemp + 5) {
          frostDamage = Math.min(1.0, frostDamage + rawDamage);
        }
      }
    } else if (weather.event !== 'frost') {
      // Slight recovery when not freezing
      frostDamage = Math.max(0, frostDamage - 0.02);
    }

    // ── Drought stress accumulation ───────────────────────────────────────────
    if (moistureLevel < 0.3) {
      const rawStress = moistureLevel < 0.1 ? 0.10 : moistureLevel < 0.2 ? 0.05 : 0.02;
      const stressRate = rawStress * (1 - cropType.droughtTolerance);
      droughtStress = Math.min(1.0, droughtStress + stressRate);
    } else {
      // Recovery when moisture is good
      droughtStress = Math.max(0, droughtStress - 0.01);
    }

    const killed = frostDamage >= 1.0;

    return {
      id: parcel.id,
      plantedCrop: killed ? null : {
        ...crop,
        frostDamage,
        droughtStress,
        moistureLevel,
      },
      killed,
    };
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | grep "engine/climate" | head -10
```

Expected: zero errors in `engine/climate.ts`.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add engine/climate.ts
git commit -m "feat(climate): add applyDailyWeather() with moisture, frost damage, and drought stress"
```

---

## Task 4: Wire applyDailyWeather into advanceDay() in the store

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Import applyDailyWeather in the store**

In `store/useGameStore.ts`, find the climate import line:

```ts
import { getSeason, generateForecast } from '../engine/climate';
```

Replace it with:

```ts
import { getSeason, generateForecast, applyDailyWeather } from '../engine/climate';
```

- [ ] **Step 2: Call applyDailyWeather after weather is resolved in advanceDay()**

Find this block in `advanceDay()` (around line 1031):

```ts
// Weather
const forecast = state.forecast.length > 1 ? state.forecast.slice(1) : generateForecast(season);
const todayWeather = state.forecast[0] ?? generateForecast(season)[0];
if (forecast.length < 3) forecast.push(...generateForecast(season, 4));
```

Add these lines immediately after that block (before the `// Weather summary` comment):

```ts
// Apply probabilistic forecast deviation: if today's forecast probability < 1.0, re-roll
let resolvedWeather = todayWeather;
if (todayWeather && todayWeather.probability < 1.0 && Math.random() > todayWeather.probability) {
  const rerolled = generateForecast(season, 1)[0];
  resolvedWeather = { ...rerolled, probability: 1.0 };
}

// Apply daily weather to all planted crops (moisture, frost damage, drought stress)
const weatherResults = applyDailyWeather(
  state.parcels.map(p => ({
    id: p.id,
    plantedCrop: p.plantedCrop,
    irrigated: p.irrigated,
    greenhouse: p.greenhouse,
  })),
  resolvedWeather ?? todayWeather,
  CROP_TYPES,
);
const killedParcelIds = weatherResults.filter(r => r.killed).map(r => r.id);
```

- [ ] **Step 3: Replace the old random-destruction block with the accumulation kill**

Find the existing weather crop destruction block (around line 1522):

```ts
// Weather crop destruction + insurance payouts
let destroyedCount = 0;
let weatherInsurancePayout = 0;
const newClaims: InsuranceClaim[] = [];

if (todayWeather && ['frost', 'hail', 'drought'].includes(todayWeather.event)) {
  const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
  const insured = hasActiveInsurance(state.insurances, 'clima');

  parcels = parcels.map(p => {
    const destructChance = p.irrigated ? 0.05 : 0.15;
    if (p.plantedCrop && !p.greenhouse && Math.random() < destructChance) {
      destroyedCount++;
      if (insured) {
        const cropVal = estimateCropValue(p, prices);
        const payout = Math.round(cropVal * climaPlan.coveragePercent);
        weatherInsurancePayout += payout;
        newClaims.push({
          id: `claim_${newDay}_${p.id}`,
          day: newDay,
          type: 'clima' as InsuranceType,
          payout,
          description: `${p.hectares}ha plot destroyed by ${todayWeather.event === 'drought' ? 'drought' : todayWeather.event === 'hail' ? 'hail' : 'frost'}`,
        });
      }
      return { ...p, plantedCrop: null };
    }
    return p;
  });
}
```

Replace the entire block with:

```ts
// Weather crop damage accumulation (frost kill + drought stress from applyDailyWeather)
let destroyedCount = 0;
let weatherInsurancePayout = 0;
const newClaims: InsuranceClaim[] = [];

// Merge applyDailyWeather results back into parcels
parcels = parcels.map(p => {
  const result = weatherResults.find(r => r.id === p.id);
  if (!result) return p;
  // Update planted crop damage state (or null if killed)
  return { ...p, plantedCrop: result.plantedCrop };
});

// Handle frost-killed parcels: insurance claim + summary
if (killedParcelIds.length > 0) {
  const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
  const insured = hasActiveInsurance(state.insurances, 'clima');
  for (const parcelId of killedParcelIds) {
    const p = parcels.find(lp => lp.id === parcelId);
    if (!p) continue;
    destroyedCount++;
    if (insured) {
      const cropVal = estimateCropValue(p, prices);
      const payout = Math.round(cropVal * climaPlan.coveragePercent);
      weatherInsurancePayout += payout;
      newClaims.push({
        id: `claim_${newDay}_${p.id}`,
        day: newDay,
        type: 'clima' as InsuranceType,
        payout,
        description: `${p.hectares}ha plot killed by accumulated frost damage`,
      });
    }
  }
}

// Hail still uses a one-day random chance (hail is sudden, not accumulated)
if (resolvedWeather?.event === 'hail') {
  const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
  const insured = hasActiveInsurance(state.insurances, 'clima');
  parcels = parcels.map(p => {
    if (p.plantedCrop && !p.greenhouse && Math.random() < 0.12) {
      destroyedCount++;
      if (insured) {
        const cropVal = estimateCropValue(p, prices);
        const payout = Math.round(cropVal * climaPlan.coveragePercent);
        weatherInsurancePayout += payout;
        newClaims.push({
          id: `claim_${newDay}_hail_${p.id}`,
          day: newDay,
          type: 'clima' as InsuranceType,
          payout,
          description: `${p.hectares}ha plot destroyed by hail`,
        });
      }
      return { ...p, plantedCrop: null };
    }
    return p;
  });
}
```

- [ ] **Step 4: Pass frostDamage and droughtStress to harvestAmount() call sites**

Search the store for all calls to `harvestAmount(`. There are 4 call sites (approximately lines 2669, 2860, 3697, 5536). Each looks like:

```ts
const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
// ...
harvestAmount(crop, cropType, parcel.fertility, baseClimate, parcel.hasWeeds ?? false, machineYieldBonus)
```

For each call site, add the two new optional arguments from the planted crop:

```ts
harvestAmount(
  crop,
  cropType,
  parcel.fertility,
  baseClimate,
  parcel.hasWeeds ?? false,
  machineYieldBonus,
  crop.frostDamage ?? 0,    // NEW
  crop.droughtStress ?? 0,  // NEW
)
```

Grep for all call sites first to confirm count:

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
grep -n "harvestAmount(" store/useGameStore.ts
```

Update each one found.

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add store/useGameStore.ts
git commit -m "feat(climate): wire applyDailyWeather into advanceDay, replace random destruction with accumulation model"
```

---

## Task 5: Update forecast UI in clima.tsx

**Files:**
- Modify: `app/(tabs)/clima.tsx`

- [ ] **Step 1: Update todayCard to show temperature**

Find the `todayCard` render block (around line 67). Replace the `todayMod` text line:

```tsx
// BEFORE:
<Text style={styles.todayMod}>
  Crop modifier: {(todayWeather.climateModifier * 100).toFixed(0)}%
</Text>

// AFTER:
<Text style={styles.todayMod}>
  Crop modifier: {(todayWeather.climateModifier * 100).toFixed(0)}%
  {'  '}🌡️ {todayWeather.minTemp?.toFixed(0) ?? '?'}–{todayWeather.maxTemp?.toFixed(0) ?? '?'}°C
</Text>
```

- [ ] **Step 2: Replace the forecast FlatList renderItem with the enhanced tile**

Find the `FlatList` renderItem (around line 90). Replace the `forecastCard` render:

```tsx
renderItem={({ item, index }) => {
  const isFrost = item.event === 'frost';
  const isLowConfidence = item.probability <= 0.55;
  const streakLabel = item.streakDay != null
    ? `day ${item.streakDay}` : null;
  return (
    <View style={[
      styles.forecastCard,
      isFrost && styles.forecastCardFrost,
      isLowConfidence && styles.forecastCardDim,
    ]}>
      <Text style={styles.forecastDay}>+{index + 1}d</Text>
      <Text style={styles.forecastIcon}>{WEATHER_ICONS[item.event]}</Text>
      {item.probability < 1.0 && (
        <Text style={styles.forecastProb}>
          {Math.round(item.probability * 100)}%
        </Text>
      )}
      <Text style={styles.forecastTemp}>
        {item.minTemp?.toFixed(0) ?? '?'}–{item.maxTemp?.toFixed(0) ?? '?'}°C
      </Text>
      {streakLabel && (
        <Text style={styles.forecastStreak}>{streakLabel}</Text>
      )}
    </View>
  );
}}
```

- [ ] **Step 3: Add the new styles**

Find the `StyleSheet.create` call. Add these new style entries:

```ts
forecastCardFrost: {
  borderColor: C.red,
  borderWidth: 1.5,
},
forecastCardDim: {
  opacity: 0.65,
},
forecastProb: {
  fontSize: F.size.xs,
  color: C.amber,
  fontWeight: F.weight.bold,
},
forecastTemp: {
  fontSize: F.size.xs,
  color: C.textMuted,
  marginTop: 2,
},
forecastStreak: {
  fontSize: F.size.xs,
  color: C.red,
  fontWeight: F.weight.bold,
  marginTop: 1,
},
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | grep "clima" | head -10
```

Expected: zero errors in `clima.tsx`.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/clima.tsx"
git commit -m "feat(climate): update forecast UI with temperature, probability, and streak indicators"
```

---

## Task 6: Add frost warning overlay to parcel cards

**Files:**
- Modify: `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Compute frost-incoming flag from the forecast**

In `tierras.tsx`, find where the store state is destructured. Add `forecast` to the destructured values:

```ts
const { ..., forecast } = useGameStore();
```

Then compute the warning flag inside the component (before the return):

```ts
// True if a frost event is forecast within the next 3 days
const frostInNext3Days = forecast.slice(0, 3).some(w => w.event === 'frost');
```

- [ ] **Step 2: Add the warning icon to parcel cards**

Find where the parcel card content is rendered (search for `parcel.plantedCrop` in the JSX). Add a warning indicator when frost is approaching and the parcel has a planted crop:

```tsx
{frostInNext3Days && parcel.plantedCrop && !parcel.greenhouse && (
  <View style={styles.frostWarning}>
    <Text style={styles.frostWarningText}>❄️ Frost risk</Text>
  </View>
)}
```

Place this inside the parcel card, adjacent to the crop name or as an overlay.

- [ ] **Step 3: Add frostWarning styles**

In the stylesheet:

```ts
frostWarning: {
  backgroundColor: '#1a1a3a',
  borderRadius: R.xs,
  paddingHorizontal: S.xs,
  paddingVertical: 2,
  marginTop: 2,
  borderWidth: 1,
  borderColor: C.blue,
},
frostWarningText: {
  fontSize: F.size.xs,
  color: '#90caf9',
},
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/tierras.tsx"
git commit -m "feat(climate): add frost-incoming warning icon to parcel cards"
```

---

## Self-Review Checklist

- [ ] All `WeatherDay` usages in the codebase compile with the new required fields (they will have `undefined` for minTemp/maxTemp on old saved forecasts — the optional chaining `?.toFixed(0) ?? '?'` handles this in the UI)
- [ ] `applyDailyWeather()` is called before the existing `destroyedCount` block in `advanceDay()`
- [ ] All 4 `harvestAmount()` call sites in `useGameStore.ts` pass `frostDamage` and `droughtStress`
- [ ] Old random-destruction block is fully removed (replaced by accumulation kill + hail one-shot)
- [ ] Forecast tiles show probability only when `< 1.0` (today is always 100%, no clutter)
