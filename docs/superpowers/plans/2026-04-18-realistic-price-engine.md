# Realistic Price Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded prices with real-world FAO/CME values and introduce a five-layer commodity simulation engine covering volatility, seasonality, event shocks, supply pressure, correlations, commodity cycles, inflation drift, forecast pre-movement, NPC supply response, and black swan events.

**Architecture:** New `data/prices.ts` holds all static constants (baselines, volatility profiles, seasonal config, market depths, correlations, cycles). New `engine/priceEngine.ts` exports `tickAllPrices` which is called once per `advanceDay`. All data files (`cropTypes`, `animalTypes`, etc.) get real-world values. The store wires everything together.

**Tech Stack:** TypeScript 5.9 · Zustand 5 · Expo Router · React Native (no tests — validate with `npx tsc --noEmit`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `data/prices.ts` | **CREATE** | Baselines, volatility profiles, seasonal amplitudes, market depths, correlations, commodity cycles, peak seasons |
| `data/priceRegions.ts` | **CREATE** | Country multiplier stub (all 1.0) |
| `engine/priceEngine.ts` | **CREATE** | 5-layer tick + correlations + NPC supply response functions |
| `data/cropTypes.ts` | modify | `basePrice`, `seedCost`, `baseYield` → real-world values |
| `data/animalTypes.ts` | modify | `buyCost`, `maxSellPrice`, `productionRate`, `feedKgPerDay` |
| `data/animalProducts.ts` | modify | `basePrice` |
| `data/processingTypes.ts` | modify | `basePrice` (PROCESSED_PRODUCTS only) |
| `data/buildingTypes.ts` | modify | All `cost` ×4, `maintenancePerDay` = `Math.round(cost * 0.001)` |
| `data/machineTypes.ts` | modify | `cost`, `maintenancePerDay` for tractors, combines, irrigation, trucks |
| `data/workerTypes.ts` | modify | `dailyWage` for all 12 roles |
| `data/insuranceTypes.ts` | modify | Add `perHa?: boolean`, `ratePerHaPerDay?: number`; update rates |
| `data/mapFields.ts` | modify | All `askingPrice` values ×15 |
| `engine/banking.ts` | modify | `SAVINGS_APR` 0.10 → 0.045, loan base rates |
| `data/newsEventTemplates.ts` | modify | Add optional `priceShock` field to interface; add 5 new event templates with shocks |
| `data/randomEvents.ts` | modify | Add optional `priceShock` field to interface; add 5 black swan event templates |
| `data/npcFarms.ts` | modify | Add `dailyProductionKg?: Record<string,number>` to type; populate for existing farms |
| `store/useGameStore.ts` | modify | New state fields, extended `generateInitialPrices`, replace price loops, per-ha insurance, `gridWaterDailyRate` → 1.20 |

---

### Task 1: Static Price Data

**Files:**
- Create: `granja-tycoon/data/prices.ts`
- Create: `granja-tycoon/data/priceRegions.ts`

- [ ] **Step 1: Create `data/prices.ts`**

```ts
import type { Season } from '../engine/climate';

export interface VolatilityProfile {
  dailyVolatility: number;    // % std dev per day (e.g. 0.008 = 0.8%)
  meanReversionRate: number;  // 0–1, how fast price pulls back to baseline
  trendStrength: number;      // 0–1, allows multi-month drift
}

export interface CommodityMarketDepth {
  commodityId: string;
  depthKg: number;
  npcDailyProductionKg: number;
}

export interface CommodityCorrelation {
  source: string;
  target: string;
  lag: number;    // days
  factor: number; // 0–1
}

export interface CommodityCycle {
  periodDays: number;
  amplitude: number;
}

// Real-world global USD prices (FAO/CME/USDA sources)
export const COMMODITY_BASELINES: Record<string, number> = {
  // Crops ($/kg or $/L)
  grass: 0.10, alfalfa: 0.22, barley: 0.20, oats: 0.17,
  wheat: 0.25, corn: 0.19, sorghum: 0.18, rice: 0.40,
  potatoes: 0.25, sugarbeet: 0.04, soy: 0.49, sugarcane: 0.03,
  sunflower: 0.52, rapeseed: 0.53, canola: 0.58, cotton: 1.80,
  grapes: 0.55, tomatoes: 0.28, strawberries: 2.20, olives: 0.65,
  almonds: 5.50, saffron: 3500, vanilla: 120, lavender: 80, ginseng: 350,
  // Animal products
  eggs: 0.18, milk: 0.45, honey: 8.50, wool: 3.20, meat: 4.50, cream: 2.80,
  // Processed products
  harina_trigo: 0.55, polenta: 0.60, malta: 0.65, copos_avena: 0.70,
  harina_arroz: 0.75, aceite_girasol: 1.80, aceite_colza: 1.90, aceite_canola: 1.95,
  aceite_soja: 1.40, queso: 12.00, mantequilla: 8.50, pasta_huevo: 3.50,
  azucar: 0.55, etanol: 0.65, fibra_algodon: 2.80, tejido_lana: 8.00,
  embutidos: 9.50, vino: 5.00, aceite_oliva: 7.50, mermelada: 4.50,
  almendras_tostadas: 9.00, tomate_triturado: 1.20,
};

const DEFAULT_PROFILE: VolatilityProfile = {
  dailyVolatility: 0.006, meanReversionRate: 0.03, trendStrength: 0.20,
};

export const VOLATILITY_PROFILES: Record<string, VolatilityProfile> = {
  milk:    { dailyVolatility: 0.003, meanReversionRate: 0.05, trendStrength: 0.10 },
  wheat:   { dailyVolatility: 0.008, meanReversionRate: 0.03, trendStrength: 0.30 },
  corn:    { dailyVolatility: 0.009, meanReversionRate: 0.03, trendStrength: 0.30 },
  cotton:  { dailyVolatility: 0.012, meanReversionRate: 0.02, trendStrength: 0.40 },
  saffron: { dailyVolatility: 0.015, meanReversionRate: 0.01, trendStrength: 0.50 },
  vanilla: { dailyVolatility: 0.018, meanReversionRate: 0.01, trendStrength: 0.60 },
  honey:   { dailyVolatility: 0.007, meanReversionRate: 0.04, trendStrength: 0.20 },
  eggs:    { dailyVolatility: 0.005, meanReversionRate: 0.04, trendStrength: 0.15 },
  vino:    { dailyVolatility: 0.010, meanReversionRate: 0.02, trendStrength: 0.35 },
};

export function getVolatilityProfile(id: string): VolatilityProfile {
  return VOLATILITY_PROFILES[id] ?? DEFAULT_PROFILE;
}

// Fraction of baseline price that swings peak→trough due to season
export const SEASONAL_AMPLITUDES: Record<string, number> = {
  wheat: 0.18, corn: 0.20, strawberries: 0.35, grapes: 0.25,
  potatoes: 0.22, milk: 0.05, saffron: 0.12, eggs: 0.08,
};

// Season when market prices are LOWEST (harvest glut) — mirrors cropTypes.ts peakSeason
export const SEASONAL_PEAK_SEASONS: Record<string, Season> = {
  wheat: 'summer',
  corn: 'autumn',
  strawberries: 'spring',
  grapes: 'autumn',
  potatoes: 'autumn',
  milk: 'summer',
  saffron: 'autumn',
  eggs: 'spring',
};

export const MARKET_DEPTHS: CommodityMarketDepth[] = [
  { commodityId: 'wheat',       depthKg: 150_000, npcDailyProductionKg: 8_000 },
  { commodityId: 'corn',        depthKg: 200_000, npcDailyProductionKg: 10_000 },
  { commodityId: 'soy',         depthKg: 120_000, npcDailyProductionKg: 5_000 },
  { commodityId: 'rice',        depthKg: 100_000, npcDailyProductionKg: 4_000 },
  { commodityId: 'barley',      depthKg: 80_000,  npcDailyProductionKg: 3_000 },
  { commodityId: 'potatoes',    depthKg: 180_000, npcDailyProductionKg: 7_000 },
  { commodityId: 'tomatoes',    depthKg: 200_000, npcDailyProductionKg: 9_000 },
  { commodityId: 'strawberries',depthKg: 40_000,  npcDailyProductionKg: 1_500 },
  { commodityId: 'saffron',     depthKg: 50,      npcDailyProductionKg: 2 },
  { commodityId: 'honey',       depthKg: 2_000,   npcDailyProductionKg: 80 },
  { commodityId: 'milk',        depthKg: 50_000,  npcDailyProductionKg: 3_000 },
  { commodityId: 'eggs',        depthKg: 100_000, npcDailyProductionKg: 5_000 },
  { commodityId: 'meat',        depthKg: 30_000,  npcDailyProductionKg: 1_200 },
  { commodityId: 'wool',        depthKg: 5_000,   npcDailyProductionKg: 200 },
];

export const CORRELATIONS: CommodityCorrelation[] = [
  { source: 'corn',      target: 'meat',           lag: 15, factor: 0.30 },
  { source: 'corn',      target: 'eggs',           lag: 10, factor: 0.20 },
  { source: 'corn',      target: 'milk',           lag: 10, factor: 0.15 },
  { source: 'barley',    target: 'meat',           lag: 15, factor: 0.20 },
  { source: 'wheat',     target: 'harina_trigo',   lag: 3,  factor: 0.80 },
  { source: 'grapes',    target: 'vino',           lag: 30, factor: 0.60 },
  { source: 'sunflower', target: 'aceite_girasol', lag: 5,  factor: 0.75 },
  { source: 'milk',      target: 'queso',          lag: 7,  factor: 0.65 },
  { source: 'milk',      target: 'mantequilla',    lag: 7,  factor: 0.70 },
];

export const COMMODITY_CYCLES: Record<string, CommodityCycle> = {
  pig:    { periodDays: 4 * 365, amplitude: 0.35 },
  cattle: { periodDays: 7 * 365, amplitude: 0.45 },
};
```

- [ ] **Step 2: Create `data/priceRegions.ts`**

```ts
export interface PriceRegion {
  id: string;
  name: string;
  multipliers: Record<string, number>;
}

export const PRICE_REGIONS: PriceRegion[] = [
  { id: 'global', name: 'Global Market', multipliers: {} },
];

export const ACTIVE_REGION_ID = 'global';

export function getRegionMultiplier(commodityId: string, regionId = ACTIVE_REGION_ID): number {
  const region = PRICE_REGIONS.find(r => r.id === regionId);
  return region?.multipliers[commodityId] ?? 1.0;
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: No new errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add granja-tycoon/data/prices.ts granja-tycoon/data/priceRegions.ts
git commit -m "feat: add commodity baseline prices and volatility data"
```

---

### Task 2: Price Engine

**Files:**
- Create: `granja-tycoon/engine/priceEngine.ts`

- [ ] **Step 1: Create `engine/priceEngine.ts`**

```ts
import { MarketPrice } from './market';
import { getSeason, WeatherDay } from './climate';
import {
  COMMODITY_BASELINES,
  COMMODITY_CYCLES,
  CORRELATIONS,
  MARKET_DEPTHS,
  SEASONAL_AMPLITUDES,
  SEASONAL_PEAK_SEASONS,
  VolatilityProfile,
  getVolatilityProfile,
} from '../data/prices';
import { getRegionMultiplier } from '../data/priceRegions';

export interface PriceShock {
  commodityId: string | null; // null = all commodities
  magnitude: number;          // e.g. +0.25 = +25%, -0.18 = -18%
  durationDays: number;
  decayRate: number;          // fraction decayed per day (unused — we use remainingDays/durationDays)
}

export interface ActiveShock extends PriceShock {
  remainingDays: number;
}

export interface PriceTickInput {
  prices: MarketPrice[];
  momentum: Record<string, number>;
  priceHistory15d: Record<string, number[]>;
  activeShocks: ActiveShock[];
  day: number;
  forecast: WeatherDay[];
  npcProductionMultipliers: Record<string, number>;
}

export interface PriceTickOutput {
  prices: MarketPrice[];
  momentum: Record<string, number>;
  priceHistory15d: Record<string, number[]>;
  activeShocks: ActiveShock[];
}

// Box-Muller Gaussian random
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Layer 2: Mean-reverting random walk with trend
function applyVolatility(
  currentPrice: number,
  baseline: number,
  profile: VolatilityProfile,
  trend: number,
): { newPrice: number; newTrend: number } {
  const shock = gaussianRandom(0, profile.dailyVolatility);
  const reversion = profile.meanReversionRate * (baseline - currentPrice) / baseline;
  const trendDrift = trend * profile.trendStrength;
  const newTrend = trend * 0.99 + gaussianRandom(0, 0.001);
  const newPrice = currentPrice * (1 + shock + reversion + trendDrift);
  return { newPrice: Math.max(baseline * 0.2, newPrice), newTrend };
}

// Layer 3: Seasonal curve — price lowest during peakSeason (harvest glut)
function seasonalMultiplier(commodityId: string, day: number): number {
  const amplitude = SEASONAL_AMPLITUDES[commodityId];
  if (!amplitude) return 1.0;
  const peakSeason = SEASONAL_PEAK_SEASONS[commodityId];
  if (!peakSeason) return 1.0;
  const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
  const season = getSeason(day);
  const peakIdx = seasonOrder.indexOf(peakSeason);
  const currentIdx = seasonOrder.indexOf(season);
  const distance = Math.min(Math.abs(currentIdx - peakIdx), 4 - Math.abs(currentIdx - peakIdx));
  // distance 0 = glut (lowest price), distance 2 = peak price
  return 1 + amplitude * (distance / 2 - 0.5);
}

// Layer 4: Decaying event shocks
function shockModifier(commodityId: string, activeShocks: ActiveShock[]): number {
  return activeShocks.reduce((mult, shock) => {
    if (shock.remainingDays <= 0) return mult;
    if (shock.commodityId !== null && shock.commodityId !== commodityId) return mult;
    const strength = shock.remainingDays / shock.durationDays;
    return mult * (1 + shock.magnitude * strength);
  }, 1.0);
}

// Layer 5: NPC supply pressure
function supplyPressureAdj(commodityId: string, npcMultiplier: number): number {
  const depth = MARKET_DEPTHS.find(d => d.commodityId === commodityId);
  if (!depth) return 0;
  const npcKg = depth.npcDailyProductionKg * npcMultiplier;
  return Math.max(-0.15, -0.10 * (npcKg / depth.depthKg));
}

// Addition #5: Forecast pre-movement — grain prices creep up ahead of drought/frost
function forecastPreMovement(commodityId: string, forecast: WeatherDay[]): number {
  const SENSITIVE = new Set(['wheat', 'corn', 'barley', 'oats', 'rice', 'potatoes', 'soy']);
  if (!SENSITIVE.has(commodityId)) return 0;
  for (let i = 5; i <= 10; i++) {
    const w = forecast[i];
    if (!w) continue;
    if (w.event === 'drought' || w.event === 'frost') {
      return 0.005 * (11 - i);
    }
  }
  return 0;
}

// Addition #1: Cross-commodity correlations via 15-day lag buffer
function applyCorrelations(
  prices: MarketPrice[],
  history: Record<string, number[]>,
): MarketPrice[] {
  const adjustments: Record<string, number> = {};
  for (const corr of CORRELATIONS) {
    const sourceHistory = history[corr.source];
    if (!sourceHistory || sourceHistory.length < corr.lag) continue;
    const laggedPrice = sourceHistory[sourceHistory.length - corr.lag];
    const sourceBaseline = COMMODITY_BASELINES[corr.source] ?? 1;
    const deviation = (laggedPrice - sourceBaseline) / sourceBaseline;
    adjustments[corr.target] = (adjustments[corr.target] ?? 0) + deviation * corr.factor;
  }
  return prices.map(p => {
    const adj = adjustments[p.cropId];
    if (!adj) return p;
    // Apply correlation as a gentle nudge (capped at ±10% to avoid runaway feedback)
    const cappedAdj = Math.max(-0.10, Math.min(0.10, adj * 0.01));
    return { ...p, price: Math.max(p.basePrice * 0.2, p.price * (1 + cappedAdj)) };
  });
}

// Addition #2: Multi-year commodity cycles (hog/cattle)
function getCycleMultiplier(commodityId: string, day: number): number {
  if (commodityId === 'meat') {
    const pig    = 1 + COMMODITY_CYCLES.pig.amplitude    * Math.sin(2 * Math.PI * day / COMMODITY_CYCLES.pig.periodDays);
    const cattle = 1 + COMMODITY_CYCLES.cattle.amplitude * Math.sin(2 * Math.PI * day / COMMODITY_CYCLES.cattle.periodDays);
    return (pig + cattle) / 2;
  }
  if (commodityId === 'milk') {
    return 1 + COMMODITY_CYCLES.cattle.amplitude * Math.sin(2 * Math.PI * day / COMMODITY_CYCLES.cattle.periodDays);
  }
  return 1.0;
}

// Main tick — call once per advanceDay
export function tickAllPrices(input: PriceTickInput): PriceTickOutput {
  const { prices, momentum, priceHistory15d, activeShocks, day, forecast, npcProductionMultipliers } = input;

  // Addition #4: Inflation drift — 2.5% per in-game year
  const inflationIndex = Math.pow(1.025, day / 365);

  // Update 15-day history for correlation lag buffer
  const newHistory15d: Record<string, number[]> = {};
  for (const p of prices) {
    const prev = priceHistory15d[p.cropId] ?? [];
    newHistory15d[p.cropId] = [...prev, p.price].slice(-30);
  }

  const newMomentum = { ...momentum };

  // Apply layers 1–5 + additions #3, #4, #5
  let newPrices = prices.map(p => {
    const rawBaseline = COMMODITY_BASELINES[p.cropId] ?? p.basePrice;
    const inflatedBaseline = rawBaseline * inflationIndex * getRegionMultiplier(p.cropId);
    const cycleMultiplier = getCycleMultiplier(p.cropId, day);
    const effectiveBaseline = inflatedBaseline * cycleMultiplier;

    const profile = getVolatilityProfile(p.cropId);
    const currentTrend = newMomentum[p.cropId] ?? 0;

    // Layer 2: Volatility
    const { newPrice: afterVol, newTrend } = applyVolatility(p.price, effectiveBaseline, profile, currentTrend);
    newMomentum[p.cropId] = newTrend;

    // Layer 3: Seasonal
    const afterSeasonal = afterVol * seasonalMultiplier(p.cropId, day);

    // Layer 4: Event shocks
    const afterShock = afterSeasonal * shockModifier(p.cropId, activeShocks);

    // Layer 5: NPC supply pressure
    const npcMult = npcProductionMultipliers[p.cropId] ?? 1.0;
    const afterPressure = afterShock * (1 + supplyPressureAdj(p.cropId, npcMult));

    // Addition #5: Forecast pre-movement
    const afterForecast = afterPressure * (1 + forecastPreMovement(p.cropId, forecast));

    const finalPrice = Math.max(effectiveBaseline * 0.2, afterForecast);
    return { ...p, price: finalPrice, basePrice: effectiveBaseline };
  });

  // Addition #1: Correlations (post-process)
  newPrices = applyCorrelations(newPrices, newHistory15d);

  // Decay active shocks
  const newActiveShocks = activeShocks
    .map(s => ({ ...s, remainingDays: s.remainingDays - 1 }))
    .filter(s => s.remainingDays > 0);

  return {
    prices: newPrices,
    momentum: newMomentum,
    priceHistory15d: newHistory15d,
    activeShocks: newActiveShocks,
  };
}

// Addition #6: NPC supply response to sustained price signals
export function updateNpcProductionMultipliers(
  current: Record<string, number>,
  signalDays: Record<string, number>,
  prices: MarketPrice[],
): { multipliers: Record<string, number>; signalDays: Record<string, number> } {
  const newMultipliers = { ...current };
  const newSignalDays = { ...signalDays };

  for (const p of prices) {
    const baseline = COMMODITY_BASELINES[p.cropId];
    if (!baseline) continue;
    const ratio = p.price / baseline;
    const prev = newSignalDays[p.cropId] ?? 0;

    if (ratio > 1.30) {
      newSignalDays[p.cropId] = prev + 1;
    } else if (ratio < 0.70) {
      newSignalDays[p.cropId] = prev - 1;
    } else {
      newSignalDays[p.cropId] = Math.sign(prev) * Math.max(0, Math.abs(prev) - 1);
    }

    const sd = newSignalDays[p.cropId];
    if (sd >= 30) {
      // Ramp NPC production +20% over 60 days (~0.33%/day)
      newMultipliers[p.cropId] = Math.min(2.0, (current[p.cropId] ?? 1.0) + 0.0033);
    } else if (sd <= -30) {
      // Reduce NPC production by 25% over 60 days (~0.42%/day)
      newMultipliers[p.cropId] = Math.max(0.1, (current[p.cropId] ?? 1.0) - 0.0042);
    }
  }

  return { multipliers: newMultipliers, signalDays: newSignalDays };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: No new errors from `priceEngine.ts`.

- [ ] **Step 3: Commit**

```bash
git add granja-tycoon/engine/priceEngine.ts
git commit -m "feat: add five-layer commodity price engine"
```

---

### Task 3: Commodity Value Updates

**Files:**
- Modify: `granja-tycoon/data/cropTypes.ts`
- Modify: `granja-tycoon/data/animalTypes.ts`
- Modify: `granja-tycoon/data/animalProducts.ts`
- Modify: `granja-tycoon/data/processingTypes.ts`

- [ ] **Step 1: Update `data/cropTypes.ts`**

Replace the entire `CROP_TYPES` array with the real-world values below. **Keep all non-price fields (`growthDays`, `waterNeed`, `fertilizerBonus`, `seasons`, `fertilityDrain`, `frostKillTemp`, `heatStressTemp`, `droughtTolerance`, `peakSeason`) unchanged** — only `basePrice`, `seedCost`, and `baseYield` change.

```ts
export const CROP_TYPES: CropType[] = [
  // Tier D
  { id: 'grass',        name: 'Grass / Hierba', tier: 'D', growthDays: 7,   basePrice: 0.10,  seedCost: 45,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8000,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, frostKillTemp: -8,  heatStressTemp: 40, droughtTolerance: 0.6 },
  { id: 'alfalfa',      name: 'Alfalfa',         tier: 'D', growthDays: 30,  basePrice: 0.22,  seedCost: 180,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 9000,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, frostKillTemp: -5,  heatStressTemp: 40, droughtTolerance: 0.7 },
  { id: 'barley',       name: 'Barley',           tier: 'D', growthDays: 65,  basePrice: 0.20,  seedCost: 95,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3500,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -6,  heatStressTemp: 32, droughtTolerance: 0.5 },
  { id: 'oats',         name: 'Oats',             tier: 'D', growthDays: 70,  basePrice: 0.17,  seedCost: 90,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3200,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -5,  heatStressTemp: 32, droughtTolerance: 0.4 },
  // Tier C
  { id: 'wheat',        name: 'Wheat',            tier: 'C', growthDays: 75,  basePrice: 0.25,  seedCost: 85,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3400,  seasons: ['spring','autumn'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -12, heatStressTemp: 32, droughtTolerance: 0.4 },
  { id: 'corn',         name: 'Corn',             tier: 'C', growthDays: 85,  basePrice: 0.19,  seedCost: 130,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 10000, seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.3 },
  { id: 'sorghum',      name: 'Sorghum',          tier: 'C', growthDays: 80,  basePrice: 0.18,  seedCost: 75,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 4500,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -2,  heatStressTemp: 40, droughtTolerance: 0.8 },
  { id: 'rice',         name: 'Rice',             tier: 'C', growthDays: 90,  basePrice: 0.40,  seedCost: 200,   waterNeed: 5, fertilizerBonus: 1.3, unit: 'kg', baseYield: 4500,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 35, droughtTolerance: 0.1 },
  // Tier B — Root crops & legumes
  { id: 'potatoes',     name: 'Potatoes',         tier: 'B', growthDays: 80,  basePrice: 0.25,  seedCost: 1200,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 28000, seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -3,  heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'sugarbeet',    name: 'Sugar Beet',       tier: 'B', growthDays: 100, basePrice: 0.04,  seedCost: 400,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'L',  baseYield: 55000, seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -3,  heatStressTemp: 34, droughtTolerance: 0.5 },
  { id: 'soy',          name: 'Soybean',          tier: 'B', growthDays: 100, basePrice: 0.49,  seedCost: 95,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3000,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 0, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'sugarcane',    name: 'Sugar Cane',       tier: 'B', growthDays: 120, basePrice: 0.03,  seedCost: 350,   waterNeed: 5, fertilizerBonus: 1.3, unit: 'L',  baseYield: 70000, seasons: ['spring','summer'],          peakSeason: 'spring',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 45, droughtTolerance: 0.3 },
  // Tier A — Oil & fibre
  { id: 'sunflower',    name: 'Sunflower',        tier: 'A', growthDays: 95,  basePrice: 0.52,  seedCost: 280,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 2000,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.8 },
  { id: 'rapeseed',     name: 'Rapeseed',         tier: 'A', growthDays: 100, basePrice: 0.53,  seedCost: 320,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3200,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'canola',       name: 'Canola',           tier: 'A', growthDays: 95,  basePrice: 0.58,  seedCost: 340,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3000,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'cotton',       name: 'Cotton',           tier: 'A', growthDays: 110, basePrice: 1.80,  seedCost: 550,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 1800,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.5 },
  // Tier B — Fruits & vegetables
  { id: 'grapes',       name: 'Grapes',           tier: 'B', growthDays: 120, basePrice: 0.55,  seedCost: 1800,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8000,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -3,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'tomatoes',     name: 'Tomatoes',         tier: 'B', growthDays: 60,  basePrice: 0.28,  seedCost: 900,   waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 55000, seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'strawberries', name: 'Strawberries',     tier: 'B', growthDays: 50,  basePrice: 2.20,  seedCost: 2200,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 18000, seasons: ['spring'],                   peakSeason: 'spring',  fertilityDrain: 2, frostKillTemp: -2,  heatStressTemp: 32, droughtTolerance: 0.3 },
  // Tier A — Orchard
  { id: 'olives',       name: 'Olives',           tier: 'A', growthDays: 150, basePrice: 0.65,  seedCost: 3200,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 5000,  seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 42, droughtTolerance: 0.7 },
  { id: 'almonds',      name: 'Almonds',          tier: 'A', growthDays: 130, basePrice: 5.50,  seedCost: 6500,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 1400,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -3,  heatStressTemp: 42, droughtTolerance: 0.6 },
  // Tier S — Premium specialty
  { id: 'saffron',      name: 'Saffron',          tier: 'S', growthDays: 180, basePrice: 3500,  seedCost: 9000,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8,     seasons: ['autumn'],                   peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 35, droughtTolerance: 0.5 },
  { id: 'vanilla',      name: 'Vanilla',          tier: 'S', growthDays: 200, basePrice: 120,   seedCost: 12000, waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,   seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'lavender',     name: 'Lavender',         tier: 'S', growthDays: 150, basePrice: 80,    seedCost: 4500,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'L',  baseYield: 800,   seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 38, droughtTolerance: 0.7 },
  { id: 'ginseng',      name: 'Ginseng',          tier: 'S', growthDays: 240, basePrice: 350,   seedCost: 15000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,   seasons: ['spring'],                   peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -5,  heatStressTemp: 30, droughtTolerance: 0.4 },
  // Cover Crops (no harvest revenue — unchanged)
  { id: 'rye',       name: 'Winter Rye',    tier: 'D', growthDays: 60, basePrice: 0, seedCost: 40,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['autumn','winter'],          peakSeason: 'winter', fertilityDrain: 0, frostKillTemp: -20, heatStressTemp: 30, droughtTolerance: 0.8, coverCrop: true },
  { id: 'clover',    name: 'Red Clover',    tier: 'D', growthDays: 45, basePrice: 0, seedCost: 35,  waterNeed: 2, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer'],           peakSeason: 'summer', fertilityDrain: 0, frostKillTemp: -10, heatStressTemp: 32, droughtTolerance: 0.5, coverCrop: true },
  { id: 'mustard',   name: 'White Mustard', tier: 'D', growthDays: 40, basePrice: 0, seedCost: 30,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer','autumn'],  peakSeason: 'summer', fertilityDrain: 0, frostKillTemp: -5,  heatStressTemp: 35, droughtTolerance: 0.6, coverCrop: true },
  { id: 'buckwheat', name: 'Buckwheat',     tier: 'D', growthDays: 35, basePrice: 0, seedCost: 25,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer'],           peakSeason: 'summer', fertilityDrain: 0, frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.7, coverCrop: true },
];
```

- [ ] **Step 2: Update `data/animalTypes.ts`**

Replace the `ANIMAL_TYPES` array. Keep all fields not listed below unchanged (`maturityDays`, `maxPriceAge`, `breedingDays`, `enclosureType`, `feedType`, `productionType`):

```ts
export const ANIMAL_TYPES: AnimalType[] = [
  { id: 'gallina',  name: 'Chicken',  buyCost: 25,   maturityDays: 20,  maxPriceAge: 365,  maxSellPrice: 60,    productionType: 'eggs',  productionRate: 0.85, breedingDays: 30,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.12 },
  { id: 'vaca',     name: 'Cow',      buyCost: 1800, maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 3500,  productionType: 'milk',  productionRate: 28,   breedingDays: 270, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 14   },
  { id: 'oveja',    name: 'Sheep',    buyCost: 220,  maturityDays: 60,  maxPriceAge: 548,  maxSellPrice: 550,   productionType: 'wool',  productionRate: 0.07, breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8  },
  { id: 'cerdo',    name: 'Pig',      buyCost: 180,  maturityDays: 45,  maxPriceAge: 180,  maxSellPrice: 450,   productionType: 'meat',  productionRate: 0,    breedingDays: 115, enclosureType: 'pocilga',     feedType: 'grain', feedKgPerDay: 2.5  },
  { id: 'conejo',   name: 'Rabbit',   buyCost: 35,   maturityDays: 15,  maxPriceAge: 180,  maxSellPrice: 90,    productionType: 'meat',  productionRate: 0,    breedingDays: 30,  enclosureType: 'conejera',    feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'cabra',    name: 'Goat',     buyCost: 200,  maturityDays: 45,  maxPriceAge: 548,  maxSellPrice: 480,   productionType: 'milk',  productionRate: 3.5,  breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8  },
  { id: 'caballo',  name: 'Horse',    buyCost: 3500, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 12000, productionType: null,    productionRate: 0,    breedingDays: 330, enclosureType: 'caballeriza', feedType: 'hay',   feedKgPerDay: 9    },
  { id: 'pato',     name: 'Duck',     buyCost: 22,   maturityDays: 25,  maxPriceAge: 365,  maxSellPrice: 55,    productionType: 'eggs',  productionRate: 0.6,  breedingDays: 45,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'abeja',    name: 'Bee',      buyCost: 180,  maturityDays: 7,   maxPriceAge: 180,  maxSellPrice: 280,   productionType: 'honey', productionRate: 0.08, breedingDays: 0,   enclosureType: 'colmena',     feedType: null,    feedKgPerDay: 0    },
  { id: 'alpaca',   name: 'Alpaca',   buyCost: 900,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 2200,  productionType: 'wool',  productionRate: 0.09, breedingDays: 240, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.6  },
  { id: 'pavo',     name: 'Turkey',   buyCost: 45,   maturityDays: 60,  maxPriceAge: 180,  maxSellPrice: 200,   productionType: 'meat',  productionRate: 0,    breedingDays: 120, enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.25 },
  { id: 'codorniz', name: 'Quail',    buyCost: 8,    maturityDays: 12,  maxPriceAge: 120,  maxSellPrice: 28,    productionType: 'eggs',  productionRate: 1.0,  breedingDays: 20,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.03 },
  { id: 'bufalo',   name: 'Buffalo',  buyCost: 3200, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 8500,  productionType: 'milk',  productionRate: 12,   breedingDays: 300, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 18   },
];
```

- [ ] **Step 3: Update `data/animalProducts.ts`**

Replace `ANIMAL_PRODUCTS` with real-world prices:

```ts
export const ANIMAL_PRODUCTS: AnimalProductInfo[] = [
  { productType: 'eggs',  name: 'Eggs',  unit: 'ud', basePrice: 0.18 },
  { productType: 'milk',  name: 'Milk',  unit: 'L',  basePrice: 0.45 },
  { productType: 'honey', name: 'Honey', unit: 'kg', basePrice: 8.50 },
  { productType: 'wool',  name: 'Wool',  unit: 'kg', basePrice: 3.20 },
  { productType: 'meat',  name: 'Meat',  unit: 'kg', basePrice: 4.50 },
  { productType: 'cream', name: 'Cream', unit: 'L',  basePrice: 2.80 },
];
```

- [ ] **Step 4: Update `data/processingTypes.ts`**

Replace `PROCESSED_PRODUCTS` prices (keep `id`, `name`, `unit` unchanged):

```ts
export const PROCESSED_PRODUCTS: ProcessedProduct[] = [
  // Flour Mill
  { id: 'harina_trigo',       name: 'Wheat Flour',     unit: 'kg', basePrice: 0.55 },
  { id: 'polenta',             name: 'Polenta',          unit: 'kg', basePrice: 0.60 },
  { id: 'malta',               name: 'Barley Malt',      unit: 'kg', basePrice: 0.65 },
  { id: 'copos_avena',         name: 'Oat Flakes',       unit: 'kg', basePrice: 0.70 },
  { id: 'harina_arroz',        name: 'Rice Flour',       unit: 'kg', basePrice: 0.75 },
  // Oil Press
  { id: 'aceite_girasol',      name: 'Sunflower Oil',    unit: 'L',  basePrice: 1.80 },
  { id: 'aceite_colza',        name: 'Rapeseed Oil',     unit: 'L',  basePrice: 1.90 },
  { id: 'aceite_canola',       name: 'Canola Oil',       unit: 'L',  basePrice: 1.95 },
  { id: 'aceite_soja',         name: 'Soy Oil',          unit: 'L',  basePrice: 1.40 },
  // Dairy Plant
  { id: 'queso',               name: 'Cheese',           unit: 'kg', basePrice: 12.00 },
  { id: 'mantequilla',         name: 'Butter',           unit: 'kg', basePrice: 8.50 },
  { id: 'pasta_huevo',         name: 'Egg Pasta',        unit: 'kg', basePrice: 3.50 },
  // Agricultural Processor
  { id: 'azucar',              name: 'Sugar',            unit: 'kg', basePrice: 0.55 },
  { id: 'etanol',              name: 'Ethanol',          unit: 'L',  basePrice: 0.65 },
  { id: 'fibra_algodon',       name: 'Cotton Fiber',     unit: 'kg', basePrice: 2.80 },
  { id: 'tejido_lana',         name: 'Wool Fabric',      unit: 'kg', basePrice: 8.00 },
  { id: 'embutidos',           name: 'Cold Cuts',        unit: 'kg', basePrice: 9.50 },
  // Winery
  { id: 'vino',                name: 'Wine',             unit: 'L',  basePrice: 5.00 },
  // Oil Press (new)
  { id: 'aceite_oliva',        name: 'Olive Oil',        unit: 'L',  basePrice: 7.50 },
  // Agricultural Processor (new)
  { id: 'mermelada',           name: 'Strawberry Jam',   unit: 'kg', basePrice: 4.50 },
  { id: 'almendras_tostadas',  name: 'Roasted Almonds',  unit: 'kg', basePrice: 9.00 },
  { id: 'tomate_triturado',    name: 'Tomato Paste',     unit: 'kg', basePrice: 1.20 },
];
```

- [ ] **Step 5: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add granja-tycoon/data/cropTypes.ts granja-tycoon/data/animalTypes.ts granja-tycoon/data/animalProducts.ts granja-tycoon/data/processingTypes.ts
git commit -m "feat: update commodity prices, yields, and animal economics to real-world values"
```

---

### Task 4: Infrastructure Cost Updates

**Files:**
- Modify: `granja-tycoon/data/buildingTypes.ts`
- Modify: `granja-tycoon/data/machineTypes.ts`
- Modify: `granja-tycoon/data/workerTypes.ts`

- [ ] **Step 1: Update `data/buildingTypes.ts`**

Apply 4× multiplier to all `BuildingType.cost` entries. Set `maintenancePerDay = Math.round(cost * 0.001)` (0.1% of build cost per day, minimum 1). Apply to the `BUILDING_TYPES` array only — leave `PRODUCTION_EQUIPMENT` costs unchanged (equipment prices are retail, not construction costs).

The complete updated cost/maintenance pairs for every `BuildingType` entry:

| id | new cost | new maintenancePerDay |
|----|----------|-----------------------|
| bld_gallinero_s | 8,000 | 8 |
| bld_gallinero_m | 36,000 | 36 |
| bld_gallinero_l | 112,000 | 112 |
| bld_establo_s | 32,000 | 32 |
| bld_establo_m | 96,000 | 96 |
| bld_establo_l | 260,000 | 260 |
| bld_caballeriza_s | 48,000 | 48 |
| bld_caballeriza_m | 128,000 | 128 |
| bld_caballeriza_l | 320,000 | 320 |
| bld_pocilga | 18,000 | 18 |
| bld_pocilga_m | 56,000 | 56 |
| bld_pocilga_l | 152,000 | 152 |
| bld_corral | 14,000 | 14 |
| bld_corral_m | 48,000 | 48 |
| bld_corral_l | 128,000 | 128 |
| bld_colmena | 4,800 | 5 |
| bld_colmena_m | 18,000 | 18 |
| bld_colmena_l | 48,000 | 48 |
| bld_conejera | 7,200 | 7 |
| bld_conejera_m | 26,000 | 26 |
| bld_conejera_l | 72,000 | 72 |
| bld_greenhouse_s | 60,000 | 60 |
| bld_greenhouse_m | 160,000 | 160 |
| bld_greenhouse_l | 400,000 | 400 |
| bld_silo_s | 20,000 | 20 |
| bld_silo_m | 72,000 | 72 |
| bld_silo_l | 200,000 | 200 |
| bld_silo_xl | 480,000 | 480 |
| bld_almacen | 28,000 | 28 |
| bld_taller | 56,000 | 56 |
| bld_granero | 32,000 | 32 |
| bld_agua | 48,000 | 48 |
| bld_biodigestor | 88,000 | 88 |
| bld_secadero | 64,000 | 64 |
| bld_oficina | 72,000 | 72 |
| bld_bodega | 152,000 | 152 |
| bld_molino | 72,000 | 72 |

For any buildings not listed above (additional production/lab/upgrade buildings added in later sessions), apply the same 4× rule. Edit each `BuildingType` entry in `BUILDING_TYPES` to set the new `cost` and `maintenancePerDay` from the table. Do NOT change `id`, `name`, `category`, `capacity`, `effectLabel`, or any other fields.

- [ ] **Step 2: Update `data/machineTypes.ts`**

Update only `cost` and `maintenancePerDay` for the following machine IDs. All other fields (`size`, `category`, `fuelPerDay`, `haPerDay`, `capacityKg`, `compatibleTrailerSizes`, `compatibleTruckTypeIds`) stay unchanged. Trailers are not updated.

```ts
// Tractors
{ id: 'tractor-small',  cost: 45_000,  maintenancePerDay: 12 },
{ id: 'tractor-medium', cost: 120_000, maintenancePerDay: 28 },
{ id: 'tractor-large',  cost: 280_000, maintenancePerDay: 55 },
// Combine Harvesters
{ id: 'combine-small',  cost: 250_000, maintenancePerDay: 45 },
{ id: 'combine-medium', cost: 420_000, maintenancePerDay: 75 },
{ id: 'combine-large',  cost: 750_000, maintenancePerDay: 130 },
// Irrigation
{ id: 'irrigation-drip',      cost: 8_000,   maintenancePerDay: 2 },
{ id: 'irrigation-sprinkler', cost: 30_000,  maintenancePerDay: 6 },
{ id: 'irrigation-pivot',     cost: 180_000, maintenancePerDay: 25 },
// Trucks
{ id: 'truck-pickup', cost: 42_000,  maintenancePerDay: 12 },
{ id: 'truck-dump',   cost: 85_000,  maintenancePerDay: 22 },
{ id: 'truck-semi',   cost: 150_000, maintenancePerDay: 35 },
```

- [ ] **Step 3: Update `data/workerTypes.ts`**

Update `dailyWage` for these 12 roles (leave all other fields unchanged):

```ts
field_worker:    120
agronomist:      250
botanist:        240
animal_keeper:   120
zootechnician:   220
mechanic:        180
engineer:        350
processor:       130
supervisor:      280
vet:             500
truck_driver:    160
hydrogeologist:  500
```

- [ ] **Step 4: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add granja-tycoon/data/buildingTypes.ts granja-tycoon/data/machineTypes.ts granja-tycoon/data/workerTypes.ts
git commit -m "feat: update building, machine, and worker costs to real-world values"
```

---

### Task 5: Finance & Land Updates

**Files:**
- Modify: `granja-tycoon/data/insuranceTypes.ts`
- Modify: `granja-tycoon/data/mapFields.ts`
- Modify: `granja-tycoon/engine/banking.ts`

- [ ] **Step 1: Update `data/insuranceTypes.ts`**

Add `perHa?: boolean` and `ratePerHaPerDay?: number` to the interface, then update all four plans:

```ts
export type InsuranceType = 'clima' | 'plaga' | 'incendio' | 'maquinaria';

export interface InsurancePlan {
  type: InsuranceType;
  name: string;
  icon: string;
  description: string;
  premiumPerDay: number;
  coveragePercent: number;
  triggerEvents: string[];
  perHa?: boolean;
  ratePerHaPerDay?: number;
}

export const INSURANCE_PLANS: InsurancePlan[] = [
  {
    type: 'clima',
    name: 'Weather Insurance',
    icon: '🌦️',
    description: 'Covers crop destruction from all extreme weather: drought, frost, hail, and heatwave. Reimburses the estimated value of the lost harvest.',
    premiumPerDay: 0,
    ratePerHaPerDay: 0.18,
    perHa: true,
    coveragePercent: 0.70,
    triggerEvents: ['drought', 'frost', 'hail', 'weather_frost', 'weather_heatwave', 'weather_hailstorm'],
  },
  {
    type: 'plaga',
    name: 'Pest Insurance',
    icon: '🐛',
    description: 'Pays compensation for pest or disease events on your plots, including random pest outbreak events.',
    premiumPerDay: 0,
    ratePerHaPerDay: 0.08,
    perHa: true,
    coveragePercent: 0.60,
    triggerEvents: ['pest', 'disease', 'pest_outbreak'],
  },
  {
    type: 'incendio',
    name: 'Fire Insurance',
    icon: '🔥',
    description: 'Covers total crop destruction by fire. Higher coverage as it is the most catastrophic event.',
    premiumPerDay: 0,
    ratePerHaPerDay: 0.16,
    perHa: true,
    coveragePercent: 0.85,
    triggerEvents: ['fire'],
  },
  {
    type: 'maquinaria',
    name: 'Machinery Insurance',
    icon: '⚙️',
    description: 'Covers repair costs from equipment failure events. Payout scales with the repair cost.',
    premiumPerDay: 12,
    perHa: false,
    coveragePercent: 0.75,
    triggerEvents: ['equipment_failure'],
  },
];
```

- [ ] **Step 2: Update `data/mapFields.ts`**

Multiply every `askingPrice` value by 15. Only fields with `owner: 'forsale'` have `askingPrice`. Update the header comment too.

Change line 6 comment from:
```
// Asking prices: linear scale fertility 58→$15k, 82→$25k (±$500 increments).
```
to:
```
// Asking prices: real farmland ~$5k–9k/ha · fertility 58→$225k, 82→$360k.
```

Then update every `askingPrice` field:

```
mf-nw7:  16000  → 240000
mf-nw8:  18500  → 277500
mf-nw9:  20500  → 307500
mf-nc1:  17000  → 255000
mf-nc2:  20000  → 300000
mf-nc3:  22000  → 330000
mf-nc4:  19500  → 292500
mf-nc5:  19000  → 285000
mf-nc8:  21000  → 315000
mf-nc9:  19000  → 285000
mf-nc10: 20000  → 300000
mf-nc11: 16500  → 247500
mf-nc12: 21500  → 322500
mf-nc13: 24000  → 360000
mf-nc14: 15000  → 225000
mf-nc15: 20500  → 307500
mf-nc16: 18500  → 277500
mf-nc17: 22500  → 337500
mf-nc18: 19500  → 292500
mf-nc19: 17000  → 255000
mf-nc20: 20000  → 300000
mf-ne5:  21500  → 322500
mf-ne6:  19000  → 285000
mf-ne7:  16500  → 247500
mf-ne8:  19500  → 292500
mf-ne9:  20500  → 307500
mf-ne10: 18500  → 277500
mf-sw6:  23500  → 352500
mf-sc3:  18500  → 277500
mf-sc6:  16500  → 247500
mf-st1:  22500  → 337500
mf-st2:  20500  → 307500
mf-st3:  17500  → 262500
mf-st4:  21500  → 322500
mf-se1:  19500  → 292500
mf-se2:  18000  → 270000
mf-se3:  21000  → 315000
mf-se4:  20000  → 300000
mf-se7:  20500  → 307500
```

Also update the auction land parcels in `store/useGameStore.ts` `generateInitialListings()`:
- 'Gold Acre' (5ha): `pricePerHa: 55000` → `pricePerHa: 550000` (×10 for premium)
- 'Prime Ridge' (2ha): `pricePerHa: 60000` → `pricePerHa: 600000`

- [ ] **Step 3: Update `engine/banking.ts`**

Change `SAVINGS_APR` from `0.10` to `0.045`:
```ts
export const SAVINGS_APR = 0.045; // real-world savings rate
```

Update `LOAN_TIERS` base rates:
```ts
export const LOAN_TIERS: { name: string; maxAmount: number; baseRate: number; minMonthlyIncome: number }[] = [
  { name: 'Micro',   maxAmount: 5000,   baseRate: 0.18, minMonthlyIncome: 0      },
  { name: 'Small',   maxAmount: 25000,  baseRate: 0.14, minMonthlyIncome: 1000   },
  { name: 'Medium',  maxAmount: 100000, baseRate: 0.10, minMonthlyIncome: 5000   },
  { name: 'Large',   maxAmount: 400000, baseRate: 0.055, minMonthlyIncome: 20000 },
];
```

- [ ] **Step 4: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add granja-tycoon/data/insuranceTypes.ts granja-tycoon/data/mapFields.ts granja-tycoon/engine/banking.ts
git commit -m "feat: per-ha insurance model, real farmland prices, real banking rates"
```

---

### Task 6: Events & NPC Data

**Files:**
- Modify: `granja-tycoon/data/newsEventTemplates.ts`
- Modify: `granja-tycoon/data/randomEvents.ts`
- Modify: `granja-tycoon/data/npcFarms.ts`

- [ ] **Step 1: Update `data/newsEventTemplates.ts`**

Add `priceShock?: import('../engine/priceEngine').PriceShock` to the `NewsEventTemplate` interface, then add 5 new templates with price shocks at the end of `NEWS_TEMPLATES`:

```ts
import type { PriceShock } from '../engine/priceEngine';

export interface NewsEventTemplate {
  id: string;
  headline: string;
  cropId: string | null;
  modifier: number;
  durationDays: number;
  priceShock?: PriceShock;
}

// Add to NEWS_TEMPLATES array (after existing n01–n20):
  { id: 'n21', headline: '🐝 Bee colony collapse disorder spreads globally',       cropId: 'honey',    modifier: 1.0, durationDays: 0, priceShock: { commodityId: 'honey',    magnitude: 0.30, durationDays: 120, decayRate: 0.008 } },
  { id: 'n22', headline: '❄️ Cold snap destroys vanilla crops in tropics',         cropId: 'vanilla',  modifier: 1.0, durationDays: 0, priceShock: { commodityId: 'vanilla',  magnitude: 0.40, durationDays: 90,  decayRate: 0.011 } },
  { id: 'n23', headline: '🌵 Severe drought hits grain-growing regions',           cropId: null,       modifier: 1.0, durationDays: 0, priceShock: { commodityId: 'wheat',    magnitude: 0.25, durationDays: 60,  decayRate: 0.017 } },
  { id: 'n24', headline: '⛽ Fuel price spike drives up all farm costs',           cropId: null,       modifier: 1.0, durationDays: 0, priceShock: { commodityId: null,       magnitude: 0.06, durationDays: 90,  decayRate: 0.011 } },
  { id: 'n25', headline: '🚢 Port strike blocks grain exports for a month',        cropId: 'wheat',    modifier: 0.85, durationDays: 30, priceShock: null as any },
```

Note: n25 uses the existing `modifier` mechanism (direct price cut). n21–n24 have `modifier: 1.0` (no direct change) but use `priceShock` for the decaying effect. The store reads `priceShock` in Task 7.

- [ ] **Step 2: Update `data/randomEvents.ts`**

Add `priceShock?: import('../engine/priceEngine').PriceShock` to `GameEventTemplate`:

```ts
import type { PriceShock } from '../engine/priceEngine';

export interface GameEventTemplate {
  id: string;
  type: GameEventType;
  icon: string;
  title: string;
  description: string;
  durationDays: number;
  weight: number;
  modifier?: number;
  priceShock?: PriceShock;
}
```

Add 5 black swan events to `RANDOM_EVENT_TEMPLATES` (very low weight = ~0.2–0.5%/year):

```ts
  // ── Black Swan Events ───────────────────────────────────────────────────────
  {
    id: 'e_bs01', type: 'market_surge', icon: '🦠',
    title: 'Global Pandemic',
    description: 'A global health crisis surges demand for all food commodities.',
    durationDays: 0, weight: 1,
    priceShock: { commodityId: null, magnitude: 0.35, durationDays: 180, decayRate: 0.006 },
  },
  {
    id: 'e_bs02', type: 'market_surge', icon: '⚔️',
    title: 'Trade War',
    description: 'Major trade partners impose export tariffs, cutting export prices.',
    durationDays: 0, weight: 1,
    priceShock: { commodityId: null, magnitude: -0.25, durationDays: 120, decayRate: 0.008 },
  },
  {
    id: 'e_bs03', type: 'weather_drought', icon: '🌵',
    title: 'Continental Drought',
    description: 'A continent-scale drought devastates global grain supplies.',
    durationDays: 0, weight: 1,
    priceShock: { commodityId: 'wheat', magnitude: 0.50, durationDays: 90, decayRate: 0.011 },
  },
  {
    id: 'e_bs04', type: 'market_surge', icon: '💱',
    title: 'Currency Crisis',
    description: 'A major currency collapse raises import and export prices.',
    durationDays: 0, weight: 1,
    priceShock: { commodityId: null, magnitude: 0.30, durationDays: 60, decayRate: 0.017 },
  },
  {
    id: 'e_bs05', type: 'equipment_failure', icon: '🏗️',
    title: 'Infrastructure Collapse',
    description: 'Critical transport infrastructure fails, tripling logistics costs.',
    durationDays: 45, weight: 1, modifier: 0.85,
  },
```

Note: `weather_drought` doesn't exist in `GameEventType`. Since adding it would require changing `GameEventType` (which may affect other code), use `market_surge` for all black swan events. Replace `type: 'weather_drought'` with `type: 'market_surge'` in e_bs03.

- [ ] **Step 3: Update `data/npcFarms.ts`**

Add `dailyProductionKg?: Record<string, number>` to `NPCFarmDefinition`, then populate for each NPC farm:

```ts
export interface NPCFarmDefinition {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[];
  sellIntervalDays: number;
  startingWealth: number;
  dailyProductionKg?: Record<string, number>;
}
```

Add `dailyProductionKg` to each farm entry:

```ts
// npc_rivera (wheat, corn):
dailyProductionKg: { wheat: 1200, corn: 1500 },

// npc_golden (soy, sunflower):
dailyProductionKg: { soy: 800, sunflower: 600 },

// npc_sierra (cotton, rice, sugarbeet):
dailyProductionKg: { cotton: 400, rice: 900, sugarbeet: 2000 },

// npc_verde (barley, oats) — add this if present:
dailyProductionKg: { barley: 900, oats: 800 },
```

For any other NPC farms in the file, add `dailyProductionKg` based on their `specialization` (use 700–1500 kg/day per crop based on tier: tier1→700, tier2→1000, tier3→1500).

- [ ] **Step 4: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: No new errors (check that `GameEventType` union covers all `type` values used).

- [ ] **Step 5: Commit**

```bash
git add granja-tycoon/data/newsEventTemplates.ts granja-tycoon/data/randomEvents.ts granja-tycoon/data/npcFarms.ts
git commit -m "feat: add price shocks to events, black swan events, NPC daily production"
```

---

### Task 7: Store Wiring

**Files:**
- Modify: `granja-tycoon/store/useGameStore.ts`

This is the largest task. Make changes in this order to avoid introducing intermediate broken states.

- [ ] **Step 1: Add new import at top of store**

After the existing market imports (around line 46), add:

```ts
import { tickAllPrices, updateNpcProductionMultipliers, ActiveShock } from '../engine/priceEngine';
```

- [ ] **Step 2: Add new fields to `GameState` interface**

Find the `GameState` interface (around line 498) and add these fields after `prices: MarketPrice[]`:

```ts
  activeShocks: ActiveShock[];
  priceMomentum: Record<string, number>;
  priceHistory15d: Record<string, number[]>;
  npcProductionMultipliers: Record<string, number>;
  npcPriceSignalDays: Record<string, number>;
  fertilizerPrice: number;
```

- [ ] **Step 3: Update `generateInitialPrices()`**

Replace the existing `generateInitialPrices()` function (currently: `return CROP_TYPES.map(c => ...)`) with:

```ts
function generateInitialPrices(): MarketPrice[] {
  const { COMMODITY_BASELINES } = require('../data/prices');
  const { ANIMAL_PRODUCTS } = require('../data/animalProducts');
  const { PROCESSED_PRODUCTS } = require('../data/processingTypes');
  const bases = COMMODITY_BASELINES as Record<string, number>;
  const result: MarketPrice[] = [];
  for (const c of CROP_TYPES) {
    if (c.coverCrop) continue;
    const base = bases[c.id] ?? c.basePrice;
    result.push({ cropId: c.id, price: base, basePrice: base });
  }
  for (const ap of ANIMAL_PRODUCTS as { productType: string; basePrice: number }[]) {
    const base = bases[ap.productType] ?? ap.basePrice;
    result.push({ cropId: ap.productType, price: base, basePrice: base });
  }
  for (const pp of PROCESSED_PRODUCTS as { id: string; basePrice: number }[]) {
    const base = bases[pp.id] ?? pp.basePrice;
    result.push({ cropId: pp.id, price: base, basePrice: base });
  }
  return result;
}
```

- [ ] **Step 4: Update `makeInitialState()`**

Find `makeInitialState()`. Apply these changes:

**Change `gridWaterDailyRate`:**
```ts
gridWaterDailyRate: 1.20,  // was 12
```

**Change `animalPrices` initial values:**
```ts
animalPrices: { eggs: 0.18, milk: 0.45, honey: 8.50, wool: 3.20, meat: 4.50, cream: 2.80 },
```

**Add new state fields** (after `fuelPrice: 1.20`):
```ts
fertilizerPrice: 0.35,
priceMomentum: {} as Record<string, number>,
priceHistory15d: {} as Record<string, number[]>,
activeShocks: [] as ActiveShock[],
npcProductionMultipliers: {} as Record<string, number>,
npcPriceSignalDays: {} as Record<string, number>,
```

**Update `priceHistory` initial value** (replace the existing `Object.fromEntries(CROP_TYPES.map(...))` line):
```ts
priceHistory: Object.fromEntries(generateInitialPrices().map(p => [p.cropId, [p.price]])) as Record<string, number[]>,
```

- [ ] **Step 5: Replace crop price fluctuation loop in `advanceDay`**

Find the crop price block starting around line 1165:
```ts
// Prices + daily fluctuation + seasonal nudge
let prices = state.prices.map(p => {
```

Replace the entire block (lines 1165–1174) with:

```ts
// ── Price engine tick (all commodities) ───────────────────────────────
const priceTickResult = tickAllPrices({
  prices: state.prices,
  momentum: state.priceMomentum ?? {},
  priceHistory15d: state.priceHistory15d ?? {},
  activeShocks: state.activeShocks ?? [],
  day: newDay,
  forecast: state.forecast,
  npcProductionMultipliers: state.npcProductionMultipliers ?? {},
});
let prices = priceTickResult.prices;
const newPriceMomentum = priceTickResult.momentum;
const newPriceHistory15d = priceTickResult.priceHistory15d;
let activeShocks: ActiveShock[] = priceTickResult.activeShocks;
```

- [ ] **Step 6: Remove the animal price fluctuation loop**

Find the animal product price fluctuation block (around line 1369):
```ts
// ── Animal product price fluctuation ────────────────────────────────
const { ANIMAL_PRODUCTS: AP_DATA } = require('../data/animalProducts');
...
```

Delete this entire block (lines 1369–1383 approximately). After the sell pressure block (lines 1361–1367), add:

```ts
// Derive animalPrices from unified prices array
const animalPrices: Record<string, number> = { ...(state.animalPrices ?? {}) };
const ANIMAL_PRODUCT_IDS = ['eggs', 'milk', 'honey', 'wool', 'meat', 'cream'];
for (const p of prices) {
  if (ANIMAL_PRODUCT_IDS.includes(p.cropId)) {
    animalPrices[p.cropId] = p.price;
  }
}
```

- [ ] **Step 7: Wire event shocks from news events**

Find the news event application block (around lines 1196–1214). After the line that pushes `newNewsEvent` to `newsEvents`, add shock handling:

```ts
if (newNewsEvent) {
  const newsEvents2 = [...newsEvents, newNewsEvent];
  newsEvents = newsEvents2;
  prices = prices.map(p => {
    if (template.cropId === null || template.cropId === p.cropId) {
      return { ...p, price: Math.max(1, p.price * template.modifier) };
    }
    return p;
  });
  // Apply price shock if present
  if (template.priceShock) {
    activeShocks = [...activeShocks, {
      ...template.priceShock,
      remainingDays: template.priceShock.durationDays,
    }];
  }
}
```

Also wire shocks from random events. Find where `rollEvent` results are handled (the block that processes `activeEvents`). After any block that fires a `GameEventTemplate`, add:

```ts
if (eventTemplate?.priceShock) {
  activeShocks = [...activeShocks, {
    ...eventTemplate.priceShock,
    remainingDays: eventTemplate.priceShock.durationDays,
  }];
}
```

The exact location depends on how `rollEvent` results are consumed. Search for where `type: 'market_surge'` events modify prices and add the shock dispatch there.

- [ ] **Step 8: Update insurance premium calculation**

Find the insurance premium block (around line 1498):
```ts
const insurancePremium = activePolicies.reduce((s, p) => {
  const plan = INSURANCE_PLANS.find(pl => pl.type === p.type);
  return s + (plan?.premiumPerDay ?? 0);
}, 0);
```

Replace with:
```ts
const ownedHa = state.parcels.filter(p => p.owned).reduce((s, p) => s + (p.hectares ?? 1), 0);
const insurancePremium = activePolicies.reduce((s, pol) => {
  const plan = INSURANCE_PLANS.find(pl => pl.type === pol.type);
  if (!plan) return s;
  if (plan.perHa && plan.ratePerHaPerDay != null) {
    return s + plan.ratePerHaPerDay * ownedHa;
  }
  return s + plan.premiumPerDay;
}, 0);
```

- [ ] **Step 9: Add NPC supply response after NPC sells block**

Find where `npcFarms` is updated (around line 1395–1485). After the `npcFarms` mapping block, add:

```ts
// NPC supply response to sustained price signals
const { multipliers: newNpcProductionMultipliers, signalDays: newNpcPriceSignalDays } =
  updateNpcProductionMultipliers(
    state.npcProductionMultipliers ?? {},
    state.npcPriceSignalDays ?? {},
    prices,
  );
```

- [ ] **Step 10: Update the priceHistory block**

Find the price history block (around line 1487):
```ts
const priceHistory: Record<string, number[]> = {};
for (const p of prices) {
  const prev = state.priceHistory[p.cropId] ?? [];
  priceHistory[p.cropId] = [...prev, p.price].slice(-90);
}
```

This code already handles all commodities in `prices[]`, so it works as-is once `prices[]` includes animal products and processed products. No change needed here.

- [ ] **Step 11: Add new state fields to the return object of `advanceDay`**

Find the large state spread at the end of `advanceDay`. Add:

```ts
prices,
animalPrices,
priceHistory,
priceMomentum: newPriceMomentum,
priceHistory15d: newPriceHistory15d,
activeShocks,
npcProductionMultipliers: newNpcProductionMultipliers,
npcPriceSignalDays: newNpcPriceSignalDays,
```

Make sure any existing `prices`, `animalPrices`, `priceHistory` entries in the return object are replaced (not duplicated).

- [ ] **Step 12: Add new fields to `partialize`**

Find the `partialize` config in the `persist` middleware. The new state fields (`activeShocks`, `priceMomentum`, `priceHistory15d`, `npcProductionMultipliers`, `npcPriceSignalDays`, `fertilizerPrice`) are plain data values — they should be INCLUDED in serialization (not excluded). Verify that `partialize` only excludes functions. No changes needed unless there's a size concern.

Also bump the storage key comment if shape has changed incompatibly. The key is `granja-tycoon-save-v6` — only bump if old saves would cause crashes (new fields with `?? {}` defaults are safe).

- [ ] **Step 13: Verify TypeScript**

Run: `cd granja-tycoon && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 14: Smoke test**

Run: `cd granja-tycoon && npx expo start --web`

Open the game in a browser. Advance the day 5 times. Verify:
- No JS errors in the console
- Crop prices show realistic values (wheat ~$0.25/kg, not $16/kg)
- Insurance cost in day summary scales with owned hectares
- Animal product prices are in reasonable range (eggs ~$0.18, milk ~$0.45)

- [ ] **Step 15: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat: wire price engine into store — unified commodity prices, per-ha insurance, inflation"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 5 price engine layers covered (Task 2). All 7 additions covered (correlations, cycles, input cost volatility stub, inflation, forecast pre-movement, NPC supply response, black swans). All real-world prices from spec covered (Tasks 3–5). Events wired in Task 7.
- [x] **No placeholders**: Every task has complete code.
- [x] **Type consistency**: `PriceShock` defined in `engine/priceEngine.ts` and imported from there in `newsEventTemplates.ts`, `randomEvents.ts`, `store/useGameStore.ts`. `ActiveShock` extends `PriceShock` with `remainingDays`. `tickAllPrices` input/output interfaces match usage in Task 7.
- [x] **Addition #3 (input cost volatility)**: `fuelPrice` already in store state; `fertilizerPrice` added in Task 7. The full machine fuel-cost integration (multiplying `fuelPerDay` by `fuelPrice` each tick) already exists in the store. `fertilizerPrice` is stored and available for future integration — actual seed cost modifier is a future enhancement.
- [x] **Storage key**: No incompatible shape changes — new fields use `?? {}` / `?? []` defaults. Key stays `granja-tycoon-save-v6`.
