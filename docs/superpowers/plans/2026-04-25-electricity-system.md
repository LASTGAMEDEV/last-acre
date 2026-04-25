# Electricity System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a farm-wide electricity infrastructure layer — buildings draw power, a monthly grid bill is charged, players invest in renewables (solar/wind/biogas/CHP/batteries) to cut costs, and outages/lightning create survival challenges.

**Architecture:** `data/electricityTypes.ts` holds all static config; `engine/electricity.ts` holds pure calculation functions; `store/useGameStore.ts` gains an `electricity: ElectricityState` field wired into `advanceDay()` with a full daily tick; `app/(tabs)/gestion.tsx` gains an `⚡ Power` sub-tab. Save key bumps v7 → v8.

**Tech Stack:** React Native 0.81.5 · Expo 54 · TypeScript 5.9.2 · Zustand 5 · React 19

**Read before starting:** `granja-tycoon/CLAUDE.md` — critical web compatibility rules (Zustand ESM fix, partialize, no pointerEvents on tabs, bump save key).

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| **Create** | `data/electricityTypes.ts` | Static config: grid tiers, generator specs, building power draws, solar/wind output tables, costs |
| **Create** | `engine/electricity.ts` | Pure functions: generation calc, demand sum, billing, battery charge/discharge, degradation, outage roll |
| **Modify** | `store/useGameStore.ts` | `ElectricityState` interface, initial state, 13 actions, import new types, wire tick in `advanceDay()`, bump save key to v8 |
| **Modify** | `app/(tabs)/gestion.tsx` | Add `'electricity'` to `OfficeTab` union + `TABS` array + `ElectricitySection` component |
| **Modify** | `granja-tycoon/CLAUDE.md` | Update save key reference v7→v8 |

---

## Scope Notes

- **Off-peak scheduling**: Base rate uses a fixed daily average (no per-building schedule toggle — future feature).
- **Load shedding**: Computed and surfaced in a list in the UI; no drag-to-reorder.
- **Heat recovery**: `heatRecoveryActive` boolean is set when biogas/CHP + heat pipe network are built; actual fuel cost reductions are stubbed (fuel costs are not a current game mechanic — hook ready for future).
- **Renewable grant delay**: Implemented as a 3-day pending grant (`pendingGrants` array in `ElectricityState`); money arrives in advanceDay when `dueDay <= newDay`.
- **`bld_biodigestor`**: The existing building generates income separately (existing system unchanged). `electricity.biogasPlantBuilt` is a separate electricity-specific investment.

---

## Task 1: Create data/electricityTypes.ts

**Files:**
- Create: `granja-tycoon/data/electricityTypes.ts`

- [ ] **Step 1: Create the file**

```typescript
// data/electricityTypes.ts
import type { Season } from '../engine/climate';
import type { WeatherEvent } from '../engine/climate';

export type GridTier = 'basic' | 'standard' | 'industrial' | 'heavy';
export type GeneratorModel = '25kw' | '50kw' | '100kw';

export interface GridTierConfig {
  id: GridTier;
  label: string;
  maxImportKw: number;
  upgradeCost: number;
}

export const GRID_TIER_CONFIG: Record<GridTier, GridTierConfig> = {
  basic:      { id: 'basic',      label: 'Basic',            maxImportKw:    50, upgradeCost:      0 },
  standard:   { id: 'standard',   label: 'Standard',         maxImportKw:   150, upgradeCost:  8_000 },
  industrial: { id: 'industrial', label: 'Industrial',       maxImportKw:   400, upgradeCost: 25_000 },
  heavy:      { id: 'heavy',      label: 'Heavy Industrial', maxImportKw: 1_000, upgradeCost: 80_000 },
};

export const GRID_TIER_ORDER: GridTier[] = ['basic', 'standard', 'industrial', 'heavy'];

export interface GeneratorConfig {
  model: GeneratorModel;
  label: string;
  outputKw: number;
  purchaseCost: number;
  tankCapacityLitres: number;
}

export const GENERATOR_CONFIG: Record<GeneratorModel, GeneratorConfig> = {
  '25kw':  { model: '25kw',  label: '25 kW',  outputKw:  25, purchaseCost:  5_000, tankCapacityLitres: 200 },
  '50kw':  { model: '50kw',  label: '50 kW',  outputKw:  50, purchaseCost: 10_000, tankCapacityLitres: 400 },
  '100kw': { model: '100kw', label: '100 kW', outputKw: 100, purchaseCost: 18_000, tankCapacityLitres: 800 },
};

// Building power draws in kW (per active day)
export const BUILDING_POWER_DRAWS: Partial<Record<string, number>> = {
  bld_gallinero_s:      2,
  bld_gallinero_m:      3,
  bld_gallinero_l:      5,
  bld_establo_s:        2,
  bld_establo_m:        4,
  bld_establo_l:        6,
  bld_caballeriza_s:    2,
  bld_caballeriza_m:    3,
  bld_caballeriza_l:    5,
  bld_pocilga:          2,
  bld_pocilga_m:        3,
  bld_pocilga_l:        5,
  bld_corral:           2,
  bld_corral_m:         3,
  bld_corral_l:         5,
  bld_colmena:          0.5,
  bld_colmena_m:        1,
  bld_colmena_l:        2,
  bld_conejera:         1,
  bld_conejera_m:       2,
  bld_conejera_l:       3,
  bld_greenhouse_s:     5,
  bld_greenhouse_m:    12,
  bld_greenhouse_l:    22,
  bld_silo_s:           0.5,
  bld_silo_m:           1,
  bld_silo_l:           1.5,
  bld_silo_xl:          2,
  bld_almacen:          1,
  bld_cold_storage:     8,
  bld_taller:           3,
  bld_granero:          1,
  bld_agua:            12,
  bld_biodigestor:      2,
  bld_secadero:         6,
  bld_oficina:          2,
  bld_shelter:          1,
  bld_henil:            1,
  bld_bodega:           5,
  bld_molino:          18,
  bld_prensa:          14,
  bld_lacteo:          22,
  bld_procesadora:     15,
  bld_seed_lab_1:       4,
  bld_seed_lab_2:       6,
  bld_seed_lab_3:       8,
  bld_research_station: 10,
  bld_hydroponic_lab:  15,
  bld_smart_irrigation: 12,
  bld_solar_array:      0,   // generation source, not a load
  bld_export_terminal:  5,
  bld_fuel_tank_s:      0,
  bld_fuel_tank_l:      0,
};

// Solar sun multipliers by weather event
export const SOLAR_WEATHER_MULT: Record<WeatherEvent, number> = {
  perfect:    1.0,
  sunny:      1.0,
  drought:    1.0,
  wind:       0.8,
  frost:      0.7,
  cloudy:     0.35,
  fog:        0.3,
  rain:       0.2,
  hail:       0.2,
  heavy_rain: 0.1,
};

// Solar season multipliers
export const SOLAR_SEASON_MULT: Record<Season, number> = {
  summer: 1.0,
  spring: 0.8,
  autumn: 0.7,
  winter: 0.6,
};

// Wind multipliers by weather event
export const WIND_WEATHER_MULT: Record<WeatherEvent, number> = {
  wind:       1.2,
  heavy_rain: 0.8,
  hail:       0.8,
  rain:       0.6,
  cloudy:     0.5,
  frost:      0.5,
  perfect:    0.3,
  sunny:      0.3,
  fog:        0.2,
  drought:    0.1,
};

export const SOLAR_KW_PER_PANEL       = 0.4;
export const SOLAR_COST_PER_PANEL     = 300;
export const SOLAR_GRANT_PCT          = 0.15;
export const SOLAR_DEGRADE_PER_YEAR   = 1.5;   // % per year
export const SOLAR_SERVICE_INTERVAL_Y = 3;
export const SOLAR_SERVICE_COST       = 200;

export const WIND_KW_PER_TURBINE       = 5;
export const WIND_COST_PER_TURBINE     = 2_000;
export const WIND_GRANT_PCT            = 0.15;
export const WIND_DEGRADE_PER_YEAR     = 1.0;   // % per year
export const WIND_SERVICE_INTERVAL_Y   = 2;
export const WIND_SERVICE_COST         = 300;

export const BATTERY_KWH_PER_BANK      = 50;
export const BATTERY_COST_PER_BANK     = 8_000;
export const BATTERY_ROUNDTRIP_EFF     = 0.85;
export const BATTERY_REPLACE_YEARS     = 7;
export const BATTERY_SERVICE_COST      = 500;

export const BIOGAS_KW_PER_ANIMAL_UNIT = 0.8;
export const BIOGAS_MIN_ANIMAL_UNITS   = 10;
export const BIOGAS_BUILD_COST         = 8_000;

export const BIOMASS_OUTPUT_KW         = 15;
export const BIOMASS_BUILD_COST        = 12_000;
export const BIOMASS_FUEL_SEASON_DAYS  = 90;

export const HEAT_PIPE_BUILD_COST      = 5_000;

export const GRID_RATE_BASE            = 0.14;  // $/kWh
export const GENERATOR_FUEL_L_PER_KWH = 0.3;
export const SURGE_PROTECTOR_COST      = 500;

// Pending grant type
export interface PendingGrant {
  amount: number;
  dueDay: number;
  label: string;
}
```

- [ ] **Step 2: Verify TypeScript**

Run from `granja-tycoon/`: `npx tsc --noEmit 2>&1 | head -20`

Expected: 0 errors (the file has no imports that could fail if engine/climate exports are correct — if you see "Module not found" errors on `../engine/climate`, verify that `WeatherEvent` and `Season` are exported from `engine/climate.ts`).

- [ ] **Step 3: Commit**

```bash
cd granja-tycoon
git add data/electricityTypes.ts
git commit -m "feat(electricity): add electricityTypes.ts — static config, building power draws, solar/wind tables"
```

---

## Task 2: Create engine/electricity.ts

**Files:**
- Create: `granja-tycoon/engine/electricity.ts`

- [ ] **Step 1: Create the file**

```typescript
// engine/electricity.ts
import type { WeatherEvent, Season } from './climate';
import type { GeneratorModel } from '../data/electricityTypes';
import {
  SOLAR_KW_PER_PANEL, SOLAR_WEATHER_MULT, SOLAR_SEASON_MULT, SOLAR_DEGRADE_PER_YEAR,
  WIND_KW_PER_TURBINE, WIND_WEATHER_MULT, WIND_DEGRADE_PER_YEAR,
  BATTERY_ROUNDTRIP_EFF, BATTERY_KWH_PER_BANK,
  BIOGAS_KW_PER_ANIMAL_UNIT, BIOGAS_MIN_ANIMAL_UNITS,
  BIOMASS_OUTPUT_KW,
  BUILDING_POWER_DRAWS,
  GENERATOR_FUEL_L_PER_KWH,
  GRID_TIER_ORDER,
} from '../data/electricityTypes';
import type { GridTier } from '../data/electricityTypes';

const DAYS_PER_YEAR = 360;

export function calcSolarOutput(
  panelCount: number,
  healthPct: number,
  weather: WeatherEvent,
  season: Season,
): number {
  if (panelCount === 0) return 0;
  return (
    panelCount
    * SOLAR_KW_PER_PANEL
    * (healthPct / 100)
    * (SOLAR_WEATHER_MULT[weather] ?? 0.5)
    * SOLAR_SEASON_MULT[season]
  );
}

export function calcWindOutput(
  turbineCount: number,
  healthPct: number,
  weather: WeatherEvent,
): number {
  if (turbineCount === 0) return 0;
  return (
    turbineCount
    * WIND_KW_PER_TURBINE
    * (healthPct / 100)
    * (WIND_WEATHER_MULT[weather] ?? 0.3)
  );
}

export function calcBiogasOutput(totalAnimalUnits: number, built: boolean): number {
  if (!built || totalAnimalUnits < BIOGAS_MIN_ANIMAL_UNITS) return 0;
  return totalAnimalUnits * BIOGAS_KW_PER_ANIMAL_UNIT;
}

export function calcBiomassOutput(built: boolean, fuelDaysRemaining: number): number {
  if (!built || fuelDaysRemaining <= 0) return 0;
  return BIOMASS_OUTPUT_KW;
}

export function calcGeneratorOutput(model: GeneratorModel | null, active: boolean): number {
  if (!model || !active) return 0;
  return model === '25kw' ? 25 : model === '50kw' ? 50 : 100;
}

export function calcGeneratorFuelBurn(model: GeneratorModel): number {
  const outputKw = model === '25kw' ? 25 : model === '50kw' ? 50 : 100;
  return outputKw * GENERATOR_FUEL_L_PER_KWH;
}

export function calcTotalDemand(buildingIds: string[]): number {
  return buildingIds.reduce((sum, id) => sum + (BUILDING_POWER_DRAWS[id] ?? 0), 0);
}

// Returns [kwhUsedFromBattery, newChargeKwh]
export function dischargeForDeficit(
  deficitKwh: number,
  chargeKwh: number,
  healthPct: number,
): [number, number] {
  if (deficitKwh <= 0 || chargeKwh <= 0) return [0, chargeKwh];
  const usable = chargeKwh * (healthPct / 100);
  const used = Math.min(deficitKwh, usable);
  return [used, Math.max(0, chargeKwh - used)];
}

export function chargeFromSurplus(
  surplusKwh: number,
  chargeKwh: number,
  maxCapacityKwh: number,
): number {
  if (surplusKwh <= 0) return chargeKwh;
  return Math.min(maxCapacityKwh, chargeKwh + surplusKwh * BATTERY_ROUNDTRIP_EFF);
}

export function calcGridRateForSeason(base: number, season: Season): number {
  const mult: Record<Season, number> = { winter: 1.2, summer: 0.9, spring: 1.0, autumn: 1.05 };
  return base * mult[season];
}

// Fractional health lost per day from degradation
export function solarDegradationPerDay(): number {
  return SOLAR_DEGRADE_PER_YEAR / DAYS_PER_YEAR;
}

export function windDegradationPerDay(): number {
  return WIND_DEGRADE_PER_YEAR / DAYS_PER_YEAR;
}

export function rollOutage(weather: WeatherEvent): boolean {
  if (weather === 'wind')       return Math.random() < 0.25;
  if (weather === 'heavy_rain') return Math.random() < 0.10;
  if (weather === 'hail')       return Math.random() < 0.05;
  return false;
}

export function rollOutageDuration(): number {
  return Math.floor(Math.random() * 3) + 1;
}

export function rollLightningDamage(weather: WeatherEvent, surgeProtected: boolean): boolean {
  if (weather !== 'wind' && weather !== 'hail') return false;
  if (surgeProtected) return false;
  return Math.random() < 0.03;
}

export function nextGridTier(current: GridTier): GridTier | null {
  const idx = GRID_TIER_ORDER.indexOf(current);
  return idx < GRID_TIER_ORDER.length - 1 ? GRID_TIER_ORDER[idx + 1] : null;
}

export function prevGridTier(current: GridTier): GridTier | null {
  const idx = GRID_TIER_ORDER.indexOf(current);
  return idx > 0 ? GRID_TIER_ORDER[idx - 1] : null;
}
```

- [ ] **Step 2: Verify TypeScript**

Run from `granja-tycoon/`: `npx tsc --noEmit 2>&1 | head -20`

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd granja-tycoon
git add engine/electricity.ts
git commit -m "feat(electricity): add electricity.ts engine — pure generation, billing, battery, outage functions"
```

---

## Task 3: Add ElectricityState to store — interface, initial state, actions (save v8)

**Files:**
- Modify: `granja-tycoon/store/useGameStore.ts`

This task adds the `ElectricityState` interface, wires it into `GameState`, sets initial state, adds all electricity actions, and bumps the save key to v8. The advanceDay tick is wired in Task 4.

- [ ] **Step 1: Add static imports at the top of the file**

First, find the existing climate import (around line 47):
```typescript
import { getSeason, generateForecast, applyDailyWeather } from '../engine/climate';
```
Add `WeatherEvent` to it:
```typescript
import { getSeason, generateForecast, applyDailyWeather, WeatherEvent } from '../engine/climate';
```

Then find the block of imports near the top of `store/useGameStore.ts` (around line 53–59 where workers engine imports are). Add below the last existing import:

```typescript
import {
  GridTier, GeneratorModel, GeneratorConfig,
  GRID_TIER_CONFIG, GRID_TIER_ORDER, GENERATOR_CONFIG,
  BATTERY_KWH_PER_BANK, BATTERY_COST_PER_BANK,
  SOLAR_COST_PER_PANEL, SOLAR_GRANT_PCT, SOLAR_SERVICE_COST,
  WIND_COST_PER_TURBINE, WIND_GRANT_PCT, WIND_SERVICE_COST,
  BIOGAS_BUILD_COST, BIOMASS_BUILD_COST, BIOMASS_FUEL_SEASON_DAYS,
  HEAT_PIPE_BUILD_COST, SURGE_PROTECTOR_COST, BATTERY_SERVICE_COST,
  PendingGrant,
} from '../data/electricityTypes';
import {
  calcSolarOutput, calcWindOutput, calcBiogasOutput, calcBiomassOutput,
  calcGeneratorOutput, calcGeneratorFuelBurn, calcTotalDemand,
  dischargeForDeficit, chargeFromSurplus, calcGridRateForSeason,
  solarDegradationPerDay, windDegradationPerDay,
  rollOutage, rollOutageDuration, rollLightningDamage,
  nextGridTier, prevGridTier,
} from '../engine/electricity';
```

- [ ] **Step 2: Add the ElectricityState interface**

Find the `export interface DaySummaryEvent` block (around line 468). Just before it, add:

```typescript
export interface ElectricityState {
  gridTier: GridTier;
  gridRateBase: number;

  solarPanelCount: number;
  solarPanelHealth: number;       // 0–100
  solarLastServiceDay: number;

  windTurbineCount: number;
  windTurbineHealth: number;      // 0–100
  windLastServiceDay: number;

  biogasPlantBuilt: boolean;
  biomassCHPBuilt: boolean;
  biomassFuelDaysRemaining: number;
  heatPipeNetworkBuilt: boolean;

  batteryBankCount: number;
  batteryChargeKwh: number;
  batteryHealthPercent: number;
  batteryLastServiceDay: number;

  generatorModel: GeneratorModel | null;
  generatorFuelLitres: number;
  generatorActive: boolean;

  currentMonthKwhImported: number;
  currentMonthBillEstimate: number;
  lastMonthBill: number;
  billDueDay: number;
  billHistory: number[];         // last 12 monthly bills

  outageActive: boolean;
  outageEndDay: number | null;

  solarGrantClaimed: boolean;
  windGrantClaimed: boolean;
  pendingGrants: PendingGrant[];

  surgeProtectedBuildings: string[];
  damagedSources: Array<'solar' | 'wind' | 'battery'>;
}
```

- [ ] **Step 3: Add electricity to GameState interface**

Find the `interface GameState` (or `type GameState`) definition. Add after the last state field (before the actions):

```typescript
  electricity: ElectricityState;
```

- [ ] **Step 4: Add electricity initial state**

Find the `create<GameState>()(persist(...` block and the initial state object (the large object with `day: 1, money: ...`). Add after the last existing state field:

```typescript
    electricity: {
      gridTier: 'basic',
      gridRateBase: 0.14,
      solarPanelCount: 0,
      solarPanelHealth: 100,
      solarLastServiceDay: 0,
      windTurbineCount: 0,
      windTurbineHealth: 100,
      windLastServiceDay: 0,
      biogasPlantBuilt: false,
      biomassCHPBuilt: false,
      biomassFuelDaysRemaining: 0,
      heatPipeNetworkBuilt: false,
      batteryBankCount: 0,
      batteryChargeKwh: 0,
      batteryHealthPercent: 100,
      batteryLastServiceDay: 0,
      generatorModel: null,
      generatorFuelLitres: 0,
      generatorActive: false,
      currentMonthKwhImported: 0,
      currentMonthBillEstimate: 0,
      lastMonthBill: 0,
      billDueDay: 31,
      billHistory: [],
      outageActive: false,
      outageEndDay: null,
      solarGrantClaimed: false,
      windGrantClaimed: false,
      pendingGrants: [],
      surgeProtectedBuildings: [],
      damagedSources: [],
    },
```

- [ ] **Step 5: Add electricity actions to the GameActions interface**

Find the `interface GameActions` block. Add the following action signatures:

```typescript
  upgradeGridTier: () => void;
  buySolarPanels: (count: number) => void;
  buyWindTurbines: (count: number) => void;
  buildBiogasPlant: () => void;
  buildBiomassCHP: () => void;
  loadBiomassStraw: () => void;
  buildHeatPipeNetwork: () => void;
  buyBatteryBanks: (count: number) => void;
  buyGenerator: (model: GeneratorModel) => void;
  refuelGenerator: (litres: number) => void;
  toggleGenerator: () => void;
  serviceEquipment: (type: 'solar' | 'wind' | 'battery') => void;
  addSurgeProtector: (buildingId: string) => void;
```

- [ ] **Step 6: Implement the electricity actions**

Find the section where worker actions are implemented (around `hireConsultant:`, near the end of the store). After the last worker action, add all the electricity action implementations:

```typescript
      upgradeGridTier: () => {
        const state = get();
        const el = state.electricity;
        const next = nextGridTier(el.gridTier);
        if (!next) return;
        const cost = GRID_TIER_CONFIG[next].upgradeCost;
        if (state.money < cost) return;
        set({ money: state.money - cost, electricity: { ...el, gridTier: next } });
      },

      buySolarPanels: (count) => {
        const state = get();
        const el = state.electricity;
        const cost = count * SOLAR_COST_PER_PANEL;
        if (state.money < cost) return;
        const isFirst = el.solarPanelCount === 0 && !el.solarGrantClaimed;
        const grantAmount = isFirst ? Math.round(cost * SOLAR_GRANT_PCT) : 0;
        const pendingGrants: PendingGrant[] = isFirst
          ? [...el.pendingGrants, { amount: grantAmount, dueDay: state.day + 3, label: 'Solar renewable grant' }]
          : el.pendingGrants;
        set({
          money: state.money - cost,
          electricity: {
            ...el,
            solarPanelCount: el.solarPanelCount + count,
            solarGrantClaimed: isFirst ? true : el.solarGrantClaimed,
            pendingGrants,
          },
        });
      },

      buyWindTurbines: (count) => {
        const state = get();
        const el = state.electricity;
        const cost = count * WIND_COST_PER_TURBINE;
        if (state.money < cost) return;
        const isFirst = el.windTurbineCount === 0 && !el.windGrantClaimed;
        const grantAmount = isFirst ? Math.round(cost * WIND_GRANT_PCT) : 0;
        const pendingGrants: PendingGrant[] = isFirst
          ? [...el.pendingGrants, { amount: grantAmount, dueDay: state.day + 3, label: 'Wind renewable grant' }]
          : el.pendingGrants;
        set({
          money: state.money - cost,
          electricity: {
            ...el,
            windTurbineCount: el.windTurbineCount + count,
            windGrantClaimed: isFirst ? true : el.windGrantClaimed,
            pendingGrants,
          },
        });
      },

      buildBiogasPlant: () => {
        const state = get();
        const el = state.electricity;
        if (el.biogasPlantBuilt || state.money < BIOGAS_BUILD_COST) return;
        set({ money: state.money - BIOGAS_BUILD_COST, electricity: { ...el, biogasPlantBuilt: true } });
      },

      buildBiomassCHP: () => {
        const state = get();
        const el = state.electricity;
        if (el.biomassCHPBuilt || state.money < BIOMASS_BUILD_COST) return;
        set({ money: state.money - BIOMASS_BUILD_COST, electricity: { ...el, biomassCHPBuilt: true } });
      },

      loadBiomassStraw: () => {
        const state = get();
        const el = state.electricity;
        if (!el.biomassCHPBuilt) return;
        set({ electricity: { ...el, biomassFuelDaysRemaining: BIOMASS_FUEL_SEASON_DAYS } });
      },

      buildHeatPipeNetwork: () => {
        const state = get();
        const el = state.electricity;
        if (el.heatPipeNetworkBuilt || state.money < HEAT_PIPE_BUILD_COST) return;
        set({ money: state.money - HEAT_PIPE_BUILD_COST, electricity: { ...el, heatPipeNetworkBuilt: true } });
      },

      buyBatteryBanks: (count) => {
        const state = get();
        const el = state.electricity;
        // Requires Electrical Engineer cert on a farm mechanic
        const hasElecCert = (state.workers ?? []).some((w: Worker) =>
          w.role === 'farm_mechanic' &&
          w.certifications.some(c => c.id === 'fm_electrical' && c.passed)
        );
        if (!hasElecCert) return;
        const cost = count * BATTERY_COST_PER_BANK;
        if (state.money < cost) return;
        set({ money: state.money - cost, electricity: { ...el, batteryBankCount: el.batteryBankCount + count } });
      },

      buyGenerator: (model) => {
        const state = get();
        const el = state.electricity;
        const cost = GENERATOR_CONFIG[model].purchaseCost;
        if (state.money < cost) return;
        set({ money: state.money - cost, electricity: { ...el, generatorModel: model } });
      },

      refuelGenerator: (litres) => {
        const state = get();
        const el = state.electricity;
        if (!el.generatorModel) return;
        const cap = GENERATOR_CONFIG[el.generatorModel].tankCapacityLitres;
        set({ electricity: { ...el, generatorFuelLitres: Math.min(cap, el.generatorFuelLitres + litres) } });
      },

      toggleGenerator: () => {
        const state = get();
        const el = state.electricity;
        if (!el.generatorModel) return;
        set({ electricity: { ...el, generatorActive: !el.generatorActive } });
      },

      serviceEquipment: (type) => {
        const state = get();
        const el = state.electricity;
        // Requires Electrical Engineer cert for solar/wind/battery
        const hasElecCert = (state.workers ?? []).some((w: Worker) =>
          w.role === 'farm_mechanic' &&
          w.certifications.some(c => c.id === 'fm_electrical' && c.passed)
        );
        if (!hasElecCert) return;
        const cost = type === 'solar' ? SOLAR_SERVICE_COST : type === 'wind' ? WIND_SERVICE_COST : BATTERY_SERVICE_COST;
        if (state.money < cost) return;
        const damagedSources = el.damagedSources.filter(s => s !== type);
        const patch =
          type === 'solar'   ? { solarPanelHealth: 95,  solarLastServiceDay: state.day, damagedSources }
        : type === 'wind'    ? { windTurbineHealth: 95,  windLastServiceDay: state.day, damagedSources }
        :                      { batteryHealthPercent: 95, batteryLastServiceDay: state.day, damagedSources };
        set({ money: state.money - cost, electricity: { ...el, ...patch } });
      },

      addSurgeProtector: (buildingId) => {
        const state = get();
        const el = state.electricity;
        if (el.surgeProtectedBuildings.includes(buildingId)) return;
        if (state.money < SURGE_PROTECTOR_COST) return;
        set({
          money: state.money - SURGE_PROTECTOR_COST,
          electricity: { ...el, surgeProtectedBuildings: [...el.surgeProtectedBuildings, buildingId] },
        });
      },
```

- [ ] **Step 7: Bump save key from v7 to v8**

Find: `name: 'granja-tycoon-save-v7'`

Replace with: `name: 'granja-tycoon-save-v8'`

- [ ] **Step 8: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: 0 errors. Fix any "Property 'electricity' does not exist" errors by ensuring the `electricity` field is in both the `GameState` interface AND the initial state object.

- [ ] **Step 9: Commit**

```bash
cd granja-tycoon
git add store/useGameStore.ts
git commit -m "feat(electricity): add ElectricityState, initial state, 13 actions, save key v8"
```

---

## Task 4: Wire electricity tick into advanceDay()

**Files:**
- Modify: `granja-tycoon/store/useGameStore.ts`

This task inserts the daily electricity computation block into `advanceDay()` and adds `electricity` + bill deduction to the final `set({})`.

- [ ] **Step 1: Locate the insertion point**

In `advanceDay()`, find:
```typescript
        let coopMoneyDelta = 0;
```
(around line 4089 in the original file — the coop money delta section)

The electricity block must be inserted AFTER all the coop logic and BEFORE the final `set({...})`. Find the line that reads:
```typescript
        set({
          day: newDay,
          money: finalMoney + showPrizeMoney + ...
```

Insert the electricity block immediately before this `set({` call.

- [ ] **Step 2: Add electricityBillDeduction variable near finalMoney**

Find the `let finalMoney = ...` declaration (around line 3499). After it, add:
```typescript
        let electricityBillDeduction = 0;
```

- [ ] **Step 3: Insert the electricity tick block**

Just before the final `set({` call, add the following block. (The `summary` variable is already defined earlier in `advanceDay` as `const summary: DaySummaryEvent[] = []`. The `todayWeather` variable is also already defined.)

```typescript
        // ── Electricity tick ──────────────────────────────────────────────────
        {
          const el = state.electricity ?? ({} as ElectricityState);
          const todayEvent = (todayWeather?.event ?? 'sunny') as WeatherEvent;
          const season = getSeason(newDay);

          // Resolve pending grants
          const resolvedGrants = (el.pendingGrants ?? []).filter(g => g.dueDay <= newDay);
          const remainingGrants = (el.pendingGrants ?? []).filter(g => g.dueDay > newDay);
          for (const g of resolvedGrants) {
            finalMoney += g.amount;
            summary.push({
              id: `grant_${g.dueDay}`,
              icon: '💰',
              title: `${g.label} arrived: +$${g.amount.toLocaleString()}`,
              severity: 'good',
            });
          }

          // Outage: check if current outage has ended
          let outageActive = el.outageActive ?? false;
          let outageEndDay: number | null = el.outageEndDay ?? null;
          if (outageActive && outageEndDay !== null && newDay >= outageEndDay) {
            outageActive = false;
            outageEndDay = null;
            summary.push({ id: `outage_end_${newDay}`, icon: '⚡', title: 'Power restored — grid outage has ended.', severity: 'info' });
          }

          // Roll for new outage (only if not already in outage)
          if (!outageActive && rollOutage(todayEvent)) {
            const duration = rollOutageDuration();
            outageActive = true;
            outageEndDay = newDay + duration;
            summary.push({ id: `outage_start_${newDay}`, icon: '⚡', title: `Grid outage! Power cut for ~${duration} day(s). Activate diesel generator if available.`, severity: 'danger' });
          }

          // Generation sources
          const totalAnimals = (state.animals ?? []).length;
          const solarKw   = calcSolarOutput(el.solarPanelCount ?? 0, el.solarPanelHealth ?? 100, todayEvent, season);
          const windKw    = calcWindOutput(el.windTurbineCount ?? 0, el.windTurbineHealth ?? 100, todayEvent);
          const biogasKw  = calcBiogasOutput(totalAnimals, el.biogasPlantBuilt ?? false);
          const biomassKw = calcBiomassOutput(el.biomassCHPBuilt ?? false, el.biomassFuelDaysRemaining ?? 0);
          const genKw     = calcGeneratorOutput(el.generatorModel ?? null, el.generatorActive ?? false);
          const totalGenKw = solarKw + windKw + biogasKw + biomassKw + genKw;

          // Total demand from owned buildings
          const totalDemandKw = calcTotalDemand(state.buildings ?? []);

          // Battery charge/discharge
          let batteryChargeKwh = el.batteryChargeKwh ?? 0;
          const maxBatteryKwh  = (el.batteryBankCount ?? 0) * BATTERY_KWH_PER_BANK;

          let netKw = totalGenKw - totalDemandKw;
          if (netKw > 0 && maxBatteryKwh > 0) {
            batteryChargeKwh = chargeFromSurplus(netKw, batteryChargeKwh, maxBatteryKwh);
          } else if (netKw < 0 && batteryChargeKwh > 0) {
            const [used, newCharge] = dischargeForDeficit(-netKw, batteryChargeKwh, el.batteryHealthPercent ?? 100);
            batteryChargeKwh = newCharge;
            netKw += used;
          }

          // Grid import (0 if outage, capped by tier)
          const deficitKw    = Math.max(0, -netKw);
          const maxImportKw  = GRID_TIER_CONFIG[el.gridTier ?? 'basic']?.maxImportKw ?? 50;
          const actualImportKw = outageActive ? 0 : Math.min(deficitKw, maxImportKw);

          // Daily kWh accumulated for monthly bill
          const gridRateToday = calcGridRateForSeason(el.gridRateBase ?? 0.14, season);
          const dailyKwhImported = actualImportKw;
          const newMonthKwh = (el.currentMonthKwhImported ?? 0) + dailyKwhImported;
          const newBillEstimate = newMonthKwh * gridRateToday;

          // Monthly billing every 30 days
          let lastMonthBill = el.lastMonthBill ?? 0;
          let billDueDay    = el.billDueDay ?? (newDay + 30);
          let billHistory   = [...(el.billHistory ?? [])];
          let gridTier      = el.gridTier ?? 'basic';
          let resetMonthAccumulator = false;

          if (newDay === billDueDay - 3 && newBillEstimate > 1) {
            summary.push({
              id: `elec_warn_${newDay}`,
              icon: '⚡',
              title: `Electricity bill ~$${Math.round(newBillEstimate)} due in 3 days`,
              severity: 'warning',
            });
          }

          if (newDay >= billDueDay) {
            const bill = Math.round(newBillEstimate);
            if (bill > 0) {
              if (finalMoney >= bill) {
                electricityBillDeduction = bill;
                summary.push({ id: `elec_bill_${newDay}`, icon: '⚡', title: `Electricity bill paid: $${bill.toLocaleString()}`, severity: 'info' });
              } else {
                const downgraded = prevGridTier(gridTier);
                if (downgraded) {
                  gridTier = downgraded;
                  summary.push({ id: `elec_nopower_${newDay}`, icon: '⚡', title: `Can't pay electricity bill ($${bill}) — grid downgraded to ${GRID_TIER_CONFIG[gridTier].label}`, severity: 'danger' });
                }
              }
            }
            lastMonthBill = Math.round(newBillEstimate);
            billHistory   = [...billHistory.slice(-11), lastMonthBill];
            billDueDay    = newDay + 30;
            resetMonthAccumulator = true;
          }

          // Degradation
          let solarPanelHealth  = Math.max(0, (el.solarPanelHealth  ?? 100) - solarDegradationPerDay());
          let windTurbineHealth = Math.max(0, (el.windTurbineHealth ?? 100) - windDegradationPerDay());

          // Grid rate fluctuation: tiny daily drift
          let gridRateBase = (el.gridRateBase ?? 0.14) * (1 + (Math.random() - 0.5) * 0.002);
          gridRateBase = Math.max(0.10, Math.min(0.22, gridRateBase));

          // Lightning damage
          let damagedSources = [...(el.damagedSources ?? [])];
          if (rollLightningDamage(todayEvent, (el.surgeProtectedBuildings ?? []).includes('solar_array'))) {
            if ((el.solarPanelCount ?? 0) > 0 && !damagedSources.includes('solar')) {
              damagedSources.push('solar');
              solarPanelHealth = 0;
              summary.push({ id: `lightning_solar_${newDay}`, icon: '⚡', title: 'Lightning struck the solar array — repairs needed (Electrical Engineer)', severity: 'danger' });
            }
          }
          if (rollLightningDamage(todayEvent, (el.surgeProtectedBuildings ?? []).includes('wind_turbines'))) {
            if ((el.windTurbineCount ?? 0) > 0 && !damagedSources.includes('wind')) {
              damagedSources.push('wind');
              windTurbineHealth = 0;
              summary.push({ id: `lightning_wind_${newDay}`, icon: '⚡', title: 'Lightning struck the wind turbines — repairs needed (Electrical Engineer)', severity: 'danger' });
            }
          }

          // Biomass fuel countdown
          const biomassFuelDaysRemaining = (el.biomassCHPBuilt && (el.biomassFuelDaysRemaining ?? 0) > 0)
            ? (el.biomassFuelDaysRemaining ?? 0) - 1
            : (el.biomassFuelDaysRemaining ?? 0);
          if (el.biomassCHPBuilt && biomassFuelDaysRemaining === 0 && (el.biomassFuelDaysRemaining ?? 0) === 1) {
            summary.push({ id: `biomass_empty_${newDay}`, icon: '⚡', title: 'Biomass CHP fuel exhausted — load straw to resume power', severity: 'warning' });
          }

          // Generator fuel burn
          let generatorFuelLitres = el.generatorFuelLitres ?? 0;
          if ((el.generatorActive ?? false) && el.generatorModel) {
            generatorFuelLitres = Math.max(0, generatorFuelLitres - calcGeneratorFuelBurn(el.generatorModel));
            if (generatorFuelLitres === 0 && (el.generatorFuelLitres ?? 0) > 0) {
              summary.push({ id: `gen_empty_${newDay}`, icon: '⚡', title: 'Generator fuel empty — generator shut down', severity: 'warning' });
            }
          }
          const generatorActive = (el.generatorActive ?? false) && generatorFuelLitres > 0;

          const newElectricity: ElectricityState = {
            gridTier,
            gridRateBase,
            solarPanelCount:          el.solarPanelCount ?? 0,
            solarPanelHealth,
            solarLastServiceDay:      el.solarLastServiceDay ?? 0,
            windTurbineCount:         el.windTurbineCount ?? 0,
            windTurbineHealth,
            windLastServiceDay:       el.windLastServiceDay ?? 0,
            biogasPlantBuilt:         el.biogasPlantBuilt ?? false,
            biomassCHPBuilt:          el.biomassCHPBuilt ?? false,
            biomassFuelDaysRemaining,
            heatPipeNetworkBuilt:     el.heatPipeNetworkBuilt ?? false,
            batteryBankCount:         el.batteryBankCount ?? 0,
            batteryChargeKwh,
            batteryHealthPercent:     el.batteryHealthPercent ?? 100,
            batteryLastServiceDay:    el.batteryLastServiceDay ?? 0,
            generatorModel:           el.generatorModel ?? null,
            generatorFuelLitres,
            generatorActive,
            currentMonthKwhImported:  resetMonthAccumulator ? 0 : newMonthKwh,
            currentMonthBillEstimate: resetMonthAccumulator ? 0 : newBillEstimate,
            lastMonthBill,
            billDueDay,
            billHistory,
            outageActive,
            outageEndDay,
            solarGrantClaimed:        el.solarGrantClaimed ?? false,
            windGrantClaimed:         el.windGrantClaimed ?? false,
            pendingGrants:            remainingGrants,
            surgeProtectedBuildings:  el.surgeProtectedBuildings ?? [],
            damagedSources,
          };

          // Assign to a variable accessible in the set() call below
          (state as any).__newElectricity = newElectricity;
        }
        // End electricity tick
```

- [ ] **Step 4: Update the final set() call**

Find the `money: finalMoney + showPrizeMoney + ...` line in the final `set({})`. Update it to subtract the electricity bill:

Change:
```typescript
          money: finalMoney + showPrizeMoney + deliveryRevenue - deliveryRepairCost - productionBuildingContractorFees - slurryFine - disposalFee + biogasIncome + (moneyAfterDrilling - state.money) + coopMoneyDelta,
```

To:
```typescript
          money: finalMoney + showPrizeMoney + deliveryRevenue - deliveryRepairCost - productionBuildingContractorFees - slurryFine - disposalFee + biogasIncome + (moneyAfterDrilling - state.money) + coopMoneyDelta - electricityBillDeduction,
```

Then add `electricity: (state as any).__newElectricity ?? state.electricity,` to the set() object alongside the other state fields.

**Important note on the `(state as any).__newElectricity` pattern:** This is a workaround to pass data from a block scope to the `set()` call. The cleaner approach is to declare `let newElectricity: ElectricityState | undefined;` before the electricity block, assign it inside the block, then use it in `set()`. Use whichever approach works cleanly in the existing code structure.

**Preferred approach (use this instead):**

Before the electricity block, declare:
```typescript
        let newElectricity: ElectricityState = state.electricity;
```

Remove `(state as any).__newElectricity = newElectricity;` from inside the block, and instead just assign directly:
```typescript
          newElectricity = { /* ...the full object... */ };
```

Then in set():
```typescript
          electricity: newElectricity,
```

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: 0 errors. Common issues:
- `WeatherEvent` not imported — check that `WeatherEvent` is imported from `'../engine/climate'` at the top of the store (it's imported via `WeatherDay` but `WeatherEvent` itself may need a separate import)
- `ElectricityState` used before declaration — move the interface definition earlier in the file if needed

Fix any errors, then verify 0 errors.

- [ ] **Step 6: Commit**

```bash
cd granja-tycoon
git add store/useGameStore.ts
git commit -m "feat(electricity): wire electricity daily tick into advanceDay — generation, billing, outages, degradation"
```

---

## Task 5: Add Electricity sub-tab to gestion.tsx

**Files:**
- Modify: `granja-tycoon/app/(tabs)/gestion.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/(tabs)/gestion.tsx`, add imports alongside the existing store/type imports:

```typescript
import type { ElectricityState } from '../../store/useGameStore';
import {
  GRID_TIER_CONFIG, GRID_TIER_ORDER, GENERATOR_CONFIG,
  SOLAR_COST_PER_PANEL, WIND_COST_PER_TURBINE,
  BIOGAS_BUILD_COST, BIOMASS_BUILD_COST, HEAT_PIPE_BUILD_COST,
  BATTERY_COST_PER_BANK, BATTERY_KWH_PER_BANK,
  SURGE_PROTECTOR_COST,
} from '../../data/electricityTypes';
import {
  calcSolarOutput, calcWindOutput, calcBiogasOutput,
  calcBiomassOutput, calcGeneratorOutput, calcTotalDemand,
  nextGridTier,
} from '../../engine/electricity';
```

- [ ] **Step 2: Add 'electricity' to OfficeTab and TABS**

Find:
```typescript
type OfficeTab = 'dashboard' | 'office' | 'calendar' | 'settings' | 'guide' | 'seeds' | 'henil';
```

Replace with:
```typescript
type OfficeTab = 'dashboard' | 'office' | 'calendar' | 'settings' | 'guide' | 'seeds' | 'henil' | 'electricity';
```

Find the TABS array and add the electricity tab:
```typescript
  { id: 'electricity', label: '⚡ Power' },
```

(Insert it after `'henil'` and before `'settings'`.)

- [ ] **Step 3: Add the tab render in GestionScreen**

Find:
```typescript
      {tab === 'henil'     && <HenilSection />}
```

After it, add:
```typescript
      {tab === 'electricity' && <ElectricitySection />}
```

- [ ] **Step 4: Implement ElectricitySection**

Add this component before the `export default function GestionScreen()` function:

```typescript
function ElectricitySection() {
  const { electricity, buildings, animals, workers, day, money,
    upgradeGridTier, buySolarPanels, buyWindTurbines,
    buildBiogasPlant, buildBiomassCHP, loadBiomassStraw,
    buildHeatPipeNetwork, buyBatteryBanks, buyGenerator,
    refuelGenerator, toggleGenerator, serviceEquipment,
  } = useGameStore();

  const el = electricity;
  const [solarQty, setSolarQty] = React.useState('10');
  const [windQty, setWindQty] = React.useState('1');
  const [batteryQty, setBatteryQty] = React.useState('1');

  const season = getSeason(day);
  const todayWeather = useGameStore(s => s.todayWeather);
  const weatherEvent = (todayWeather?.event ?? 'sunny') as any;

  const solarKw   = calcSolarOutput(el.solarPanelCount, el.solarPanelHealth, weatherEvent, season);
  const windKw    = calcWindOutput(el.windTurbineCount, el.windTurbineHealth, weatherEvent);
  const biogasKw  = calcBiogasOutput(animals.length, el.biogasPlantBuilt);
  const biomassKw = calcBiomassOutput(el.biomassCHPBuilt, el.biomassFuelDaysRemaining);
  const genKw     = calcGeneratorOutput(el.generatorModel, el.generatorActive);
  const totalGen  = solarKw + windKw + biogasKw + biomassKw + genKw;
  const totalDemand = calcTotalDemand(buildings);

  const hasElecCert = (workers ?? []).some((w: any) =>
    w.role === 'farm_mechanic' && w.certifications?.some((c: any) => c.id === 'fm_electrical' && c.passed)
  );
  const nextTier = nextGridTier(el.gridTier);
  const billDaysLeft = Math.max(0, el.billDueDay - day);

  const pct = totalDemand > 0 ? Math.min(100, (totalGen / totalDemand) * 100) : 100;
  const genBarColor = pct >= 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      {/* OVERVIEW */}
      <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>⚡ Overview</Text>

      {el.outageActive && (
        <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>
            ⚠️ Grid outage active{el.outageEndDay ? ` — restores day ${el.outageEndDay}` : ''}
          </Text>
        </View>
      )}

      {/* Generation vs Demand bar */}
      <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <Text style={{ fontWeight: '600', marginBottom: 4 }}>
          Generation: {totalGen.toFixed(1)} kW / Demand: {totalDemand.toFixed(1)} kW
        </Text>
        <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, pct)}%` as any, backgroundColor: genBarColor, borderRadius: 6 }} />
        </View>
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {pct >= 100 ? '✅ Self-sufficient' : `Grid import: ${(totalDemand - totalGen).toFixed(1)} kW`}
        </Text>
      </View>

      {/* Grid & billing summary */}
      <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <Text style={{ fontWeight: '600' }}>Grid: {GRID_TIER_CONFIG[el.gridTier].label} ({GRID_TIER_CONFIG[el.gridTier].maxImportKw} kW max)</Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>Rate: ${el.gridRateBase.toFixed(3)}/kWh</Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>
          Month bill estimate: ${Math.round(el.currentMonthBillEstimate).toLocaleString()} — due in {billDaysLeft} day{billDaysLeft !== 1 ? 's' : ''}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 13 }}>Last month: ${el.lastMonthBill.toLocaleString()}</Text>
        {el.batteryBankCount > 0 && (
          <Text style={{ color: '#6b7280', fontSize: 13 }}>
            Battery: {el.batteryChargeKwh.toFixed(1)} / {(el.batteryBankCount * BATTERY_KWH_PER_BANK).toFixed(0)} kWh ({el.batteryHealthPercent.toFixed(0)}% health)
          </Text>
        )}
      </View>

      {/* GENERATION SOURCES */}
      <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>🔆 Generation Sources</Text>

      {/* Solar */}
      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>☀️ Solar Panels — {el.solarPanelCount} panels ({solarKw.toFixed(1)} kW today)</Text>
        {el.solarPanelCount > 0 && (
          <Text style={elStyles.cardSub}>Health: {el.solarPanelHealth.toFixed(1)}%{el.damagedSources.includes('solar') ? '  ⚠️ DAMAGED' : ''}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <TextInput
            style={elStyles.input}
            value={solarQty}
            onChangeText={setSolarQty}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[elStyles.btn, money < (parseInt(solarQty) || 0) * SOLAR_COST_PER_PANEL && elStyles.btnDisabled]}
            onPress={() => buySolarPanels(parseInt(solarQty) || 0)}
          >
            <Text style={elStyles.btnText}>Buy ({(parseInt(solarQty) || 0)} × $300 = ${((parseInt(solarQty) || 0) * SOLAR_COST_PER_PANEL).toLocaleString()})</Text>
          </TouchableOpacity>
          {el.solarPanelCount > 0 && (
            <TouchableOpacity
              style={[elStyles.btn, (!hasElecCert || money < 200) && elStyles.btnDisabled]}
              onPress={() => serviceEquipment('solar')}
            >
              <Text style={elStyles.btnText}>Service ($200){!hasElecCert ? ' 🔒' : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Wind */}
      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🌬️ Wind Turbines — {el.windTurbineCount} turbines ({windKw.toFixed(1)} kW today)</Text>
        {el.windTurbineCount > 0 && (
          <Text style={elStyles.cardSub}>Health: {el.windTurbineHealth.toFixed(1)}%{el.damagedSources.includes('wind') ? '  ⚠️ DAMAGED' : ''}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <TextInput
            style={elStyles.input}
            value={windQty}
            onChangeText={setWindQty}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[elStyles.btn, money < (parseInt(windQty) || 0) * WIND_COST_PER_TURBINE && elStyles.btnDisabled]}
            onPress={() => buyWindTurbines(parseInt(windQty) || 0)}
          >
            <Text style={elStyles.btnText}>Buy ({(parseInt(windQty) || 0)} × $2,000 = ${((parseInt(windQty) || 0) * WIND_COST_PER_TURBINE).toLocaleString()})</Text>
          </TouchableOpacity>
          {el.windTurbineCount > 0 && (
            <TouchableOpacity
              style={[elStyles.btn, (!hasElecCert || money < 300) && elStyles.btnDisabled]}
              onPress={() => serviceEquipment('wind')}
            >
              <Text style={elStyles.btnText}>Service ($300){!hasElecCert ? ' 🔒' : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Biogas */}
      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🐄 Biogas Plant — {biogasKw.toFixed(1)} kW</Text>
        <Text style={elStyles.cardSub}>
          {el.biogasPlantBuilt
            ? `${animals.length} animals → ${biogasKw.toFixed(1)} kW${animals.length < 10 ? ' (need 10+ animals)' : ''}`
            : 'Not built — requires 10+ animals to be viable'}
        </Text>
        {!el.biogasPlantBuilt && (
          <TouchableOpacity
            style={[elStyles.btn, money < BIOGAS_BUILD_COST && elStyles.btnDisabled, { marginTop: 6 }]}
            onPress={buildBiogasPlant}
          >
            <Text style={elStyles.btnText}>Build ($8,000)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Biomass CHP */}
      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🌾 Biomass CHP — {biomassKw.toFixed(1)} kW</Text>
        <Text style={elStyles.cardSub}>
          {el.biomassCHPBuilt
            ? `Fuel: ${el.biomassFuelDaysRemaining} days remaining`
            : 'Not built — burns straw for 15 kW constant output'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {!el.biomassCHPBuilt && (
            <TouchableOpacity
              style={[elStyles.btn, money < BIOMASS_BUILD_COST && elStyles.btnDisabled]}
              onPress={buildBiomassCHP}
            >
              <Text style={elStyles.btnText}>Build ($12,000)</Text>
            </TouchableOpacity>
          )}
          {el.biomassCHPBuilt && (
            <TouchableOpacity style={elStyles.btn} onPress={loadBiomassStraw}>
              <Text style={elStyles.btnText}>Load Straw (90 days)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Battery */}
      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>🔋 Battery Banks — {el.batteryBankCount} × 50 kWh</Text>
        <Text style={elStyles.cardSub}>
          {el.batteryBankCount > 0
            ? `${el.batteryChargeKwh.toFixed(0)} / ${(el.batteryBankCount * 50).toFixed(0)} kWh charged (${el.batteryHealthPercent.toFixed(0)}% health)`
            : 'Stores surplus generation for later use'}
        </Text>
        <Text style={elStyles.cardSub}>Requires Electrical Engineer cert{hasElecCert ? ' ✅' : ' 🔒'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <TextInput
            style={elStyles.input}
            value={batteryQty}
            onChangeText={setBatteryQty}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[elStyles.btn, (!hasElecCert || money < (parseInt(batteryQty) || 0) * BATTERY_COST_PER_BANK) && elStyles.btnDisabled]}
            onPress={() => buyBatteryBanks(parseInt(batteryQty) || 0)}
          >
            <Text style={elStyles.btnText}>Buy (${((parseInt(batteryQty) || 0) * BATTERY_COST_PER_BANK).toLocaleString()})</Text>
          </TouchableOpacity>
          {el.batteryBankCount > 0 && (
            <TouchableOpacity
              style={[elStyles.btn, (!hasElecCert || money < 500) && elStyles.btnDisabled]}
              onPress={() => serviceEquipment('battery')}
            >
              <Text style={elStyles.btnText}>Service ($500){!hasElecCert ? ' 🔒' : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Generator */}
      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>⛽ Diesel Generator — {genKw.toFixed(0)} kW</Text>
        <Text style={elStyles.cardSub}>
          {el.generatorModel
            ? `${GENERATOR_CONFIG[el.generatorModel].label} · ${el.generatorFuelLitres.toFixed(0)}L fuel · ${el.generatorActive ? '🟢 Running' : '⚫ Off'}`
            : 'Not purchased — emergency backup power'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {!el.generatorModel && (['25kw', '50kw', '100kw'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[elStyles.btn, money < GENERATOR_CONFIG[m].purchaseCost && elStyles.btnDisabled]}
              onPress={() => buyGenerator(m)}
            >
              <Text style={elStyles.btnText}>{GENERATOR_CONFIG[m].label} (${GENERATOR_CONFIG[m].purchaseCost.toLocaleString()})</Text>
            </TouchableOpacity>
          ))}
          {el.generatorModel && (
            <>
              <TouchableOpacity style={elStyles.btn} onPress={() => refuelGenerator(100)}>
                <Text style={elStyles.btnText}>Refuel +100L</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[elStyles.btn, el.generatorFuelLitres === 0 && elStyles.btnDisabled]}
                onPress={toggleGenerator}
              >
                <Text style={elStyles.btnText}>{el.generatorActive ? 'Stop' : 'Start'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* GRID & BILLING */}
      <Text style={[styles.sectionTitle, { marginBottom: 8, marginTop: 4 }]}>🔌 Grid & Billing</Text>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>Grid Connection: {GRID_TIER_CONFIG[el.gridTier].label}</Text>
        <Text style={elStyles.cardSub}>Max import: {GRID_TIER_CONFIG[el.gridTier].maxImportKw} kW · Rate: ${el.gridRateBase.toFixed(3)}/kWh</Text>
        {nextTier && (
          <TouchableOpacity
            style={[elStyles.btn, money < GRID_TIER_CONFIG[nextTier].upgradeCost && elStyles.btnDisabled, { marginTop: 6 }]}
            onPress={upgradeGridTier}
          >
            <Text style={elStyles.btnText}>
              Upgrade to {GRID_TIER_CONFIG[nextTier].label} (${GRID_TIER_CONFIG[nextTier].upgradeCost.toLocaleString()})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={elStyles.card}>
        <Text style={elStyles.cardTitle}>Monthly Bill</Text>
        <Text style={elStyles.cardSub}>This month: {el.currentMonthKwhImported.toFixed(0)} kWh imported · ~${Math.round(el.currentMonthBillEstimate).toLocaleString()}</Text>
        <Text style={elStyles.cardSub}>Bill due in {billDaysLeft} day{billDaysLeft !== 1 ? 's' : ''}</Text>
        <Text style={elStyles.cardSub}>Last month: ${el.lastMonthBill.toLocaleString()}</Text>
        {el.billHistory.length > 1 && (
          <Text style={elStyles.cardSub}>
            History: {el.billHistory.slice(-6).map(b => `$${b}`).join(' · ')}
          </Text>
        )}
      </View>

      {/* Heat pipe network */}
      {(el.biogasPlantBuilt || el.biomassCHPBuilt) && (
        <View style={elStyles.card}>
          <Text style={elStyles.cardTitle}>🌡️ Heat Recovery Network</Text>
          <Text style={elStyles.cardSub}>
            {el.heatPipeNetworkBuilt
              ? '✅ Active — biogas/CHP heat piped to processing buildings'
              : 'Pipes biogas/CHP heat to dairy, brewery, smokehouse — reduces fuel costs'}
          </Text>
          {!el.heatPipeNetworkBuilt && (
            <TouchableOpacity
              style={[elStyles.btn, money < HEAT_PIPE_BUILD_COST && elStyles.btnDisabled, { marginTop: 6 }]}
              onPress={buildHeatPipeNetwork}
            >
              <Text style={elStyles.btnText}>Build Heat Pipe Network ($5,000)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const elStyles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  cardSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 48,
    backgroundColor: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
});
```

**Note:** The `getSeason` function is already imported in `gestion.tsx` or available. If it's not already imported, add `import { getSeason } from '../../engine/climate';` to the imports. Also add `TextInput` to the React Native imports if it's not already there.

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -40`

Fix any errors. Common issues:
- `TextInput` not imported from `react-native` — add it to the existing import
- `getSeason` not imported — add it
- `styles.sectionTitle` might not exist — if it doesn't, replace with a local style: `{ fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 12 }`

- [ ] **Step 6: Commit**

```bash
cd granja-tycoon
git add app/\(tabs\)/gestion.tsx
git commit -m "feat(electricity): add Electricity sub-tab to gestion.tsx — overview, generation sources, billing"
```

---

## Task 6: Final cleanup — update CLAUDE.md and verify

**Files:**
- Modify: `granja-tycoon/CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md save key references**

In `granja-tycoon/CLAUDE.md`, find all three occurrences of `granja-tycoon-save-v7` and replace them with `granja-tycoon-save-v8`.

The three locations are:
1. Architecture section (Zustand store description)
2. Critical Web Compatibility Rules section (partialize note)
3. Internal IDs vs Display Strings section (storage key list)

- [ ] **Step 2: Full TypeScript check**

Run from `granja-tycoon/`: `npx tsc --noEmit`

Expected: 0 errors. Fix any remaining errors before proceeding.

- [ ] **Step 3: Browser smoke test**

Start the web dev server:
```bash
npx expo start --web --no-dev --non-interactive &
sleep 8
curl -s http://localhost:8081 | head -5
```

Expected: HTML page returned (confirms the bundle compiles).

Stop the server:
```bash
pkill -f "expo start" 2>/dev/null || true
```

- [ ] **Step 4: Final commit**

```bash
cd granja-tycoon
git add CLAUDE.md
git commit -m "docs: update save key reference to v8 in CLAUDE.md"
```

---

## Spec Coverage Check

| Spec section | Covered by |
|-------------|-----------|
| Grid connection tiers + max import | Tasks 1 (GRID_TIER_CONFIG), 3 (upgradeGridTier), 5 (UI) |
| Grid rates + seasonal fluctuation | Tasks 2 (calcGridRateForSeason), 4 (daily rate drift) |
| Energy price volatility | Task 4 (daily gridRateBase drift ±0.2%) |
| Charlie energy crisis warning | Not wired — Charlie events are a follow-up (post-MVP) |
| Building power draws | Task 1 (BUILDING_POWER_DRAWS) |
| Solar panels | Tasks 1, 2, 3, 4, 5 |
| Wind turbines | Tasks 1, 2, 3, 4, 5 |
| Biogas plant | Tasks 1, 2, 3, 4, 5 |
| Biomass CHP | Tasks 1, 2, 3, 4, 5 |
| Battery banks (+ Electrical Engineer cert) | Tasks 1, 2, 3, 4, 5 |
| Emergency diesel generator | Tasks 1, 3, 4, 5 |
| Monthly billing | Tasks 2, 4 |
| Bill warning 3 days before | Task 4 |
| Grid downgrade on non-payment | Task 4 |
| Load shedding priority | Not yet — UI shows generation gap but no per-building shed tracking (follow-up) |
| Power outages | Tasks 2, 4 |
| Storm/lightning damage | Tasks 2, 4 |
| Surge protectors | Tasks 1, 3 |
| Equipment degradation + service | Tasks 2, 4, 3 (serviceEquipment action), 5 (UI) |
| Electrical Engineer cert required | Task 3 (buyBatteryBanks, serviceEquipment check) |
| Heat recovery | Tasks 1, 3 (buildHeatPipeNetwork), 5 (UI show flag) |
| Government renewable grants | Task 3 (buySolarPanels/buyWindTurbines grant logic), Task 4 (pendingGrants resolution) |
| Electricity management UI | Task 5 |
| Save key bump | Task 3 (v7→v8) |

**Follow-up (post-MVP):**
- Per-building load shedding tracking and UI priority reordering
- Charlie energy crisis events (wire into randomEvents system)
- Off-peak scheduling toggle per building
- Heat recovery cost reductions (requires fuel cost system integration)
- Digestate fertiliser production from biogas plant
