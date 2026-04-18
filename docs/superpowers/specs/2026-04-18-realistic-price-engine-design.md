# Realistic Price Engine — Design Spec
**Date:** 2026-04-18  
**Status:** Approved for implementation

---

## 1. Goal

Replace every hardcoded price, cost, wage, and rate in the game with real-world global values (FAO/CME commodity prices, USDA yield data, global wage surveys). Simultaneously replace the simple ±2% daily price fluctuation with a five-layer commodity simulation engine that models real market behavior. All future additions (crops, animals, buildings, machines, workers) slot into this system with no engine changes — just data.

---

## 2. Guiding Principles

- **Global baseline prices** (USD, FAO/CME/USDA sources) as the anchor for everything.
- **Every commodity fluctuates differently** — milk is stable, saffron is volatile, wheat is seasonal.
- **Prices are emergent** — they result from baseline + volatility + seasonality + events + supply pressure, not a single hardcoded number.
- **Extensible by data** — adding a new commodity means one entry in `data/prices.ts`. The engine requires no changes.
- **Country-ready** — a multiplier stub in `data/priceRegions.ts` makes future country switching a single config swap.

---

## 3. Architecture: Five-Layer Price Engine

Every call to `advanceDay()` runs all five layers in sequence for each tracked commodity price.

```
Layer 1: Global Baseline     (data/prices.ts)
    ↓
Layer 2: Volatility Model    (engine/priceEngine.ts)
    ↓
Layer 3: Seasonal Curve      (engine/priceEngine.ts)
    ↓
Layer 4: Event Shocks        (store activeShocks[])
    ↓
Layer 5: Supply Pressure     (player sales + NPC production)
    ↓
  Final price for the day
```

### Layer 1 — Global Baselines (`data/prices.ts`)

New file. Exports:
- `COMMODITY_BASELINES: Record<string, number>` — real-world USD price per kg or L for every sellable item.
- `VOLATILITY_PROFILES: Record<string, VolatilityProfile>` — per-commodity volatility config.
- `SEASONAL_AMPLITUDES: Record<string, number>` — how much a commodity swings seasonally (0–1).

```ts
interface VolatilityProfile {
  dailyVolatility: number;    // % std dev per day (e.g. 0.008 = 0.8%)
  meanReversionRate: number;  // 0–1, how fast price pulls back to baseline
  trendStrength: number;      // 0–1, allows multi-month drift
}
```

**Real-world baseline prices (global FAO/CME, USD):**

*Crops:*
| id | baseline $/unit | unit |
|----|----------------|------|
| grass | 0.10 | kg |
| alfalfa | 0.22 | kg |
| barley | 0.20 | kg |
| oats | 0.17 | kg |
| wheat | 0.25 | kg |
| corn | 0.19 | kg |
| sorghum | 0.18 | kg |
| rice | 0.40 | kg |
| potatoes | 0.25 | kg |
| sugarbeet | 0.04 | kg |
| soy | 0.49 | kg |
| sugarcane | 0.03 | kg |
| sunflower | 0.52 | kg |
| rapeseed | 0.53 | kg |
| canola | 0.58 | kg |
| cotton | 1.80 | kg |
| grapes | 0.55 | kg |
| tomatoes | 0.28 | kg |
| strawberries | 2.20 | kg |
| olives | 0.65 | kg |
| almonds | 5.50 | kg |
| saffron | 3500 | kg |
| vanilla | 120 | kg |
| lavender | 80 | L |
| ginseng | 350 | kg |

*Animal products:*
| id | baseline $/unit | unit |
|----|----------------|------|
| eggs | 0.18 | unit |
| milk | 0.45 | L |
| honey | 8.50 | kg |
| wool | 3.20 | kg |
| meat | 4.50 | kg |
| cream | 2.80 | L |

*Processed products:*
| id | baseline $/unit | unit |
|----|----------------|------|
| harina_trigo | 0.55 | kg |
| polenta | 0.60 | kg |
| malta | 0.65 | kg |
| copos_avena | 0.70 | kg |
| harina_arroz | 0.75 | kg |
| aceite_girasol | 1.80 | L |
| aceite_colza | 1.90 | L |
| aceite_canola | 1.95 | L |
| aceite_soja | 1.40 | L |
| queso | 12.00 | kg |
| mantequilla | 8.50 | kg |
| pasta_huevo | 3.50 | kg |
| azucar | 0.55 | kg |
| etanol | 0.65 | L |
| fibra_algodon | 2.80 | kg |
| tejido_lana | 8.00 | kg |
| embutidos | 9.50 | kg |
| vino | 5.00 | L |
| aceite_oliva | 7.50 | L |
| mermelada | 4.50 | kg |
| almendras_tostadas | 9.00 | kg |
| tomate_triturado | 1.20 | kg |

**Volatility profiles (representative examples):**
| commodity | dailyVol | reversion | trend |
|-----------|---------|-----------|-------|
| milk | 0.003 | 0.05 | 0.10 |
| wheat | 0.008 | 0.03 | 0.30 |
| corn | 0.009 | 0.03 | 0.30 |
| cotton | 0.012 | 0.02 | 0.40 |
| saffron | 0.015 | 0.01 | 0.50 |
| vanilla | 0.018 | 0.01 | 0.60 |
| honey | 0.007 | 0.04 | 0.20 |
| eggs | 0.005 | 0.04 | 0.15 |
| wine | 0.010 | 0.02 | 0.35 |

**Seasonal amplitudes (fraction of baseline price swing peak→trough):**
| commodity | amplitude | notes |
|-----------|-----------|-------|
| wheat | 0.18 | autumn harvest glut |
| corn | 0.20 | |
| strawberries | 0.35 | very seasonal |
| grapes | 0.25 | |
| potatoes | 0.22 | |
| milk | 0.05 | minimal |
| saffron | 0.12 | autumn only |
| eggs | 0.08 | slight summer drop |

### Layer 2 — Volatility Model (`engine/priceEngine.ts`)

```ts
// Mean-reverting random walk with trend component
function applyVolatility(
  currentPrice: number,
  baseline: number,
  profile: VolatilityProfile,
  trend: number,  // current trend momentum, stored in state
): { newPrice: number; newTrend: number } {
  const shock = gaussianRandom(0, profile.dailyVolatility);
  const reversion = profile.meanReversionRate * (baseline - currentPrice) / baseline;
  const trendDrift = trend * profile.trendStrength;
  const newTrend = trend * 0.99 + gaussianRandom(0, 0.001); // trend decays slowly
  const newPrice = currentPrice * (1 + shock + reversion + trendDrift);
  return { newPrice: Math.max(baseline * 0.2, newPrice), newTrend };
}
```

Price is bounded to minimum 20% of baseline (no commodity collapses to zero).

### Layer 3 — Seasonal Curve

```ts
function seasonalMultiplier(
  commodityId: string,
  day: number,
  peakSeason: PlantingSeason,
  amplitude: number,
): number {
  // Returns 1.0 ± amplitude, lowest during peakSeason (harvest glut)
  const season = getSeason(day);
  const seasonOrder = ['spring','summer','autumn','winter'];
  const peakIdx = seasonOrder.indexOf(peakSeason);
  const currentIdx = seasonOrder.indexOf(season);
  const distance = Math.min(
    Math.abs(currentIdx - peakIdx),
    4 - Math.abs(currentIdx - peakIdx)
  );
  // distance 0 = glut (price lowest), distance 2 = peak price
  return 1 + amplitude * (distance / 2 - 0.5);
}
```

### Layer 4 — Event Shocks

New `PriceShock` type added to event templates:

```ts
interface PriceShock {
  commodityId: string;
  magnitude: number;      // e.g. +0.25 = +25%, -0.18 = -18%
  durationDays: number;
  decayRate: number;      // fraction decayed per day (e.g. 0.03 = 3%/day)
}
```

Store holds `activeShocks: PriceShock[]`. Each day, engine applies `currentPrice *= (1 + shock.magnitude * remainingStrength)`, then `remainingStrength -= decayRate`.

**Example shocks added to existing events:**
| event | shock |
|-------|-------|
| Drought | wheat +25%, corn +20%, 60 days |
| Record harvest | wheat −20%, 45 days |
| Fuel price spike | all machine costs +15%, 90 days |
| Bee colony collapse | honey +30%, 120 days |
| Cold snap in tropics | vanilla +40%, 90 days |
| Port strike | export market blocked 30 days |
| Black swan: pandemic | all food +35%, 180 days |
| Black swan: trade war | export prices −25%, 120 days |

### Layer 5 — Supply Pressure

```ts
interface CommodityMarketDepth {
  commodityId: string;
  depthKg: number;        // kg that can be absorbed before price impact
  npcDailyProductionKg: number;  // NPC farms' daily contribution to supply
}
```

```ts
function supplyPressure(soldKg: number, npcDailyKg: number, depthKg: number): number {
  const totalSupply = soldKg + npcDailyKg;
  return Math.max(-0.15, -0.10 * (totalSupply / depthKg));
}
```

**Representative market depths:**
| commodity | depthKg | npcDailyKg |
|-----------|---------|------------|
| wheat | 150,000 | 8,000 |
| corn | 200,000 | 10,000 |
| saffron | 50 | 2 |
| honey | 2,000 | 80 |
| milk | 50,000 | 3,000 |
| eggs (units) | 100,000 | 5,000 |

### Commodity Correlations (Addition #1)

The engine applies cross-commodity multipliers after all five layers:

```ts
const CORRELATIONS: { source: string; target: string; lag: number; factor: number }[] = [
  { source: 'corn',    target: 'meat',  lag: 15, factor: 0.30 },  // feed cost → meat price
  { source: 'corn',    target: 'eggs',  lag: 10, factor: 0.20 },  // feed cost → egg price
  { source: 'corn',    target: 'milk',  lag: 10, factor: 0.15 },
  { source: 'barley',  target: 'meat',  lag: 15, factor: 0.20 },
  { source: 'wheat',   target: 'harina_trigo', lag: 3, factor: 0.80 },  // tight input→output
  { source: 'grapes',  target: 'vino',  lag: 30, factor: 0.60 },
  { source: 'sunflower', target: 'aceite_girasol', lag: 5, factor: 0.75 },
  { source: 'milk',    target: 'queso', lag: 7,  factor: 0.65 },
  { source: 'milk',    target: 'mantequilla', lag: 7, factor: 0.70 },
];
```

Stored as a 15-day rolling price buffer in the store. On each tick, lagged source prices feed into target adjustments.

### Multi-Year Commodity Cycles (Addition #2)

A `cyclePhase` per animal category tracks the hog/cattle cycle:

```ts
const COMMODITY_CYCLES = {
  pig:    { periodDays: 4 * 365, amplitude: 0.35 },  // hog cycle ~4yr
  cattle: { periodDays: 7 * 365, amplitude: 0.45 },  // cattle cycle ~7yr
};
```

Applied as a sine-wave multiplier on `meat` and `milk` base prices. NPC herd sizes also oscillate on this cycle, creating the boom/bust supply pattern.

### Input Cost Volatility (Addition #3)

Two new tracked prices in the store:
- `fuelPrice` — base $1.20/L, volatility profile similar to corn, affects `fuelPerDay` machine costs
- `fertilizerPrice` — base $0.35/kg N, tied to natural gas spot price proxy, affects `seedCost` modifier

Machine `fuelPerDay` cost each tick = `fuelPerDay × fuelPrice`. Fertilizer adds a variable surcharge to crop input costs each season.

### Inflation Drift (Addition #4)

All baselines drift upward at **2.5% per in-game year** (compounding). Applied as a multiplier on `COMMODITY_BASELINES` using `inflationIndex = 1.025 ^ (day / 365)`. Wages, land prices, and building costs inflate at the same rate.

### Forecast Pre-Movement (Addition #5)

When `forecast[]` shows drought/frost/heatwave in the next 5–10 days, affected crop baselines start creeping up by `0.5% × daysUntilEvent` per day. The player can profit from reading forecasts early — exactly like real commodity traders.

### Multi-Year Commodity Cycles + NPC Herd Dynamics (Addition #6 — NPC Supply Impact)

`npcFarms.ts` gets a `dailyProductionKg` field per commodity. NPC farms respond to price signals:
- If commodity price > 130% of baseline for 30+ days → NPC production ramps up 20% over 60 days
- If commodity price < 70% of baseline for 30+ days → NPC production drops 25% over 60 days

This creates organic boom/bust cycles even without player action.

### Black Swan Events (Addition #7)

Added to `randomEvents.ts` with very low probability (daily roll: 0.0006–0.0014, equating to 0.2–0.5% chance per in-game year):

| Event | Effect | Duration |
|-------|--------|----------|
| Pandemic | All food prices +35% | 180 days |
| Trade war | Export prices −25%, contracts frozen | 120 days |
| Major drought (continent-scale) | Grain +50%, oilseeds +40% | 90 days |
| Currency crisis | Import costs +30%, export revenue +30% | 60 days |
| Infrastructure collapse | Transport costs ×3 for all markets | 45 days |

---

## 4. Real-World Input Costs (Yields & Seed Costs)

**Updated `cropTypes.ts` values:**

| id | baseYield (kg/ha) | seedCost ($/ha) |
|----|-----------------|----------------|
| grass | 8,000 | 45 |
| alfalfa | 9,000 | 180 |
| barley | 3,500 | 95 |
| oats | 3,200 | 90 |
| wheat | 3,400 | 85 |
| corn | 10,000 | 130 |
| sorghum | 4,500 | 75 |
| rice | 4,500 | 200 |
| potatoes | 28,000 | 1,200 |
| sugarbeet | 55,000 | 400 |
| soy | 3,000 | 95 |
| sugarcane | 70,000 | 350 |
| sunflower | 2,000 | 280 |
| rapeseed | 3,200 | 320 |
| canola | 3,000 | 340 |
| cotton | 1,800 | 550 |
| grapes | 8,000 | 1,800 |
| tomatoes | 55,000 | 900 |
| strawberries | 18,000 | 2,200 |
| olives | 5,000 | 3,200 |
| almonds | 1,400 | 6,500 |
| saffron | 8 | 9,000 |
| vanilla | 500 | 12,000 |
| lavender | 800 | 4,500 |
| ginseng | 400 | 15,000 |

---

## 5. Animal Economics

**Updated `animalTypes.ts`:**

| id | buyCost | maxSellPrice | productionRate | feedKgPerDay |
|----|---------|-------------|---------------|-------------|
| gallina | 25 | 60 | 0.85 eggs/day | 0.12 |
| vaca | 1,800 | 3,500 | 28 L milk/day | 14 |
| oveja | 220 | 550 | 0.07 kg wool/day | 1.8 |
| cerdo | 180 | 450 | 0 | 2.5 |
| conejo | 35 | 90 | 0 | 0.18 |
| cabra | 200 | 480 | 3.5 L milk/day | 1.8 |
| caballo | 3,500 | 12,000 | 0 | 9 |
| pato | 22 | 55 | 0.6 eggs/day | 0.18 |
| abeja | 180 | 280 | 0.08 kg honey/day | 0 |
| alpaca | 900 | 2,200 | 0.09 kg wool/day | 1.6 |
| pavo | 45 | 200 | 0 | 0.25 |
| codorniz | 8 | 28 | 1.0 eggs/day | 0.03 |
| bufalo | 3,200 | 8,500 | 12 L milk/day | 18 |

---

## 6. Non-Commodity Prices

### Workers (global average daily wages)
| Role | dailyWage |
|------|-----------|
| field_worker | 120 |
| agronomist | 250 |
| botanist | 240 |
| animal_keeper | 120 |
| zootechnician | 220 |
| mechanic | 180 |
| engineer | 350 |
| processor | 130 |
| supervisor | 280 |
| vet | 500 |
| truck_driver | 160 |
| hydrogeologist | 500 |

### Machines (real equipment prices, USD)
| id | cost | maintenancePerDay |
|----|------|-----------------|
| tractor-small | 45,000 | 12 |
| tractor-medium | 120,000 | 28 |
| tractor-large | 280,000 | 55 |
| combine-small | 250,000 | 45 |
| combine-medium | 420,000 | 75 |
| combine-large | 750,000 | 130 |
| irrigation-drip | 8,000 | 2 |
| irrigation-sprinkler | 30,000 | 6 |
| irrigation-pivot | 180,000 | 25 |
| truck-pickup | 42,000 | 12 |
| truck-dump | 85,000 | 22 |
| truck-semi | 150,000 | 35 |

### Land
All `askingPrice` values in `mapFields.ts` increase ~15× to reflect real farmland values of **$5,000–12,000/ha**. A 30ha field costs $150,000–$280,000.

### Water
`gridWaterDailyRate`: $12/ha/day → **$1.20/ha/day** ($438/ha/year, within real irrigation range).

### Insurance (per-ha per-day rates)
| type | new rate |
|------|----------|
| clima | $0.18/ha/day |
| plaga | $0.08/ha/day |
| incendio | $0.16/ha/day |
| maquinaria | $12/day flat (covers all machines) |

Insurance cost = `rate × totalOwnedHa` (or flat for machinery).

### Banking
- `SAVINGS_APR`: 10% → **4.5%**
- Loan base rates: floor 5.5%, ceiling 18%
- Loan tiers: max amounts unchanged, income thresholds scale proportionally

---

## 7. File Change Summary

| File | Type | What changes |
|------|------|-------------|
| `data/prices.ts` | **NEW** | Baselines, volatility profiles, seasonal amplitudes, market depths, correlations |
| `engine/priceEngine.ts` | **NEW** | Five-layer simulation + correlation + cycle + forecast pre-movement |
| `data/priceRegions.ts` | **NEW** | Country multiplier stub (all 1.0) |
| `data/cropTypes.ts` | modify | `basePrice` values updated to match `COMMODITY_BASELINES` (data files keep `basePrice`; store initializes `prices[]` from them); `seedCost` + `baseYield` → real values from Section 4 |
| `data/animalTypes.ts` | modify | buyCost, maxSellPrice, productionRate, feedKgPerDay → Section 5 values |
| `data/animalProducts.ts` | modify | `basePrice` values updated to match `COMMODITY_BASELINES` |
| `data/processingTypes.ts` | modify | `basePrice` values updated to match `COMMODITY_BASELINES` |
| `data/buildingTypes.ts` | modify | `cost` scales ~3–5× current values to match real construction costs; `maintenancePerDay` scales proportionally (~0.1% of build cost per day) |
| `data/machineTypes.ts` | modify | cost, maintenancePerDay |
| `data/workerTypes.ts` | modify | dailyWage |
| `data/insuranceTypes.ts` | modify | premiumPerDay → per-ha model |
| `data/mapFields.ts` | modify | askingPrice ×15 |
| `engine/market.ts` | modify | Wire to priceEngine.ts |
| `engine/banking.ts` | modify | SAVINGS_APR, loan rates |
| `store/useGameStore.ts` | modify | `activeShocks[]`, `fuelPrice`, `fertilizerPrice`, `priceTrendMomentum: Record<string,number>`, `priceHistory15d: Record<string,number[]>` (correlation buffer), `gridWaterDailyRate` → 1.20, `advanceDay()` integration |
| `data/newsEventTemplates.ts` | modify | Add priceShock to weather/market events |
| `data/randomEvents.ts` | modify | Add priceShock + black swan events |
| `data/npcFarms.ts` | modify | dailyProductionKg per commodity |

---

## 8. Extensibility Contract

Adding a new commodity in the future requires only:
1. Entry in `COMMODITY_BASELINES` with real price
2. Entry in `VOLATILITY_PROFILES`
3. Entry in `SEASONAL_AMPLITUDES`
4. Entry in market depth table
5. The data file entry (crop/animal/product) as normal

The price engine picks it up automatically. No engine code changes needed.

---

## 9. Out of Scope

- UI changes (price charts, market indicators) — separate feature
- Futures/options contracts — separate feature
- Country switching UI — separate feature (stub in `data/priceRegions.ts` is ready)
- Storage speculation mechanics — separate feature
