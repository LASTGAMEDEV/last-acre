# Water System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full water infrastructure system — hydrogeologist surveys, well drilling, pump installation, parcel pipe connections, shared aquifer depletion/recharge, and grid water fallback.

**Architecture:** Pure engine functions live in `engine/water.ts`. State (`aquiferLevel`, `wells`, `gridWaterActive`, `gridWaterDailyRate`) and all actions go in `store/useGameStore.ts`. The water tick is appended to `advanceDay()`. The UI lives in two places: a new `agua.tsx` screen (global overview) embedded as a sub-tab in `granja.tsx`, and a new "Water" section inside the parcel detail in `tierras.tsx`.

**Tech Stack:** TypeScript · React Native 0.81.5 · Expo 54 · Zustand 5. No test suite — verify each task with `node_modules\.bin\tsc --noEmit` from the project root.

---

## File Map

| File | Action |
|------|---------|
| `engine/water.ts` | Create — all types, constants, and pure functions |
| `data/workerTypes.ts` | Modify — add `hydrogeologist` entry |
| `store/useGameStore.ts` | Modify — `Well`, `DrillSpot` types; `aquiferLevel`, `wells`, `gridWaterActive`, `gridWaterDailyRate` state; 6 new actions; water tick in `advanceDay()` |
| `app/(tabs)/agua.tsx` | Create — global aquifer panel + well list + grid water toggle |
| `app/(tabs)/granja.tsx` | Modify — add `water` sub-tab that renders `AguaScreen` |
| `app/(tabs)/_layout.tsx` | Modify — register `agua` as hidden screen |
| `app/(tabs)/tierras.tsx` | Modify — add "Water" section to parcel detail |

---

## Task 1: Create `engine/water.ts`

**File:** `engine/water.ts`

- [ ] **Step 1: Create the file with types, constants, and all pure functions**

```typescript
import { LandParcel } from '../store/useGameStore';
import { Season } from './climate';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WellStatus =
  | 'surveying'      // hydrogeologist assigned, not done yet
  | 'survey_ready'   // survey results ready, awaiting player choice
  | 'drilling'       // drilling team hired, in progress
  | 'failed'         // drilling attempt hit dry rock
  | 'active'         // well operational
  | 'dry';           // aquifer too depleted to pump

export interface DrillSpot {
  id: string;
  successProbability: number;   // 0.0–1.0
  approxDepthMin: number;       // metres
  approxDepthMax: number;
  estimatedCostMin: number;     // $
  estimatedCostMax: number;
}

export interface Well {
  id: string;
  parcelId: string;
  status: WellStatus;
  surveyCompletesDay?: number;
  surveySpots?: DrillSpot[];
  chosenSpotId?: string;
  drillingCompletesDay?: number;
  actualDepth?: number;
  actualCost?: number;
  flowRateTarget: number;       // L/hr — specified by player at drilling time
  pumpTier?: 1 | 2 | 3;
  connectedParcelIds: string[];
}

export type PumpTier = 1 | 2 | 3;

export const PUMP_SPECS: Record<PumpTier, { maxFlowRate: number; cost: number; label: string }> = {
  1: { maxFlowRate: 5_000,  cost: 3_500,  label: 'Small (5,000 L/hr)' },
  2: { maxFlowRate: 15_000, cost: 8_000,  label: 'Medium (15,000 L/hr)' },
  3: { maxFlowRate: 30_000, cost: 18_000, label: 'Large (30,000 L/hr)' },
};

// ─── Pure functions ───────────────────────────────────────────────────────────

/** Total L/hr required to irrigate the given parcels based on their current crop waterNeed. */
export function calcParcelWaterDemand(
  parcelIds: string[],
  parcels: LandParcel[],
  cropTypes: { id: string; waterNeed: number }[],
): number {
  return parcelIds.reduce((total, id) => {
    const parcel = parcels.find(p => p.id === id);
    if (!parcel) return total;
    const cropId = parcel.plantedCrop?.cropId;
    const cropType = cropTypes.find(c => c.id === cropId);
    const waterNeed = cropType?.waterNeed ?? 3;
    return total + parcel.hectares * waterNeed * 1_000;
  }, 0);
}

/** Minimum PumpTier that covers the demand. */
export function pumpTierForDemand(demandLhr: number): PumpTier {
  if (demandLhr <= 5_000)  return 1;
  if (demandLhr <= 15_000) return 2;
  return 3;
}

/** Effective flow rate accounting for aquifer depletion. Scales to 0 below 50% aquifer. */
export function wellFlowRate(well: Well, aquiferLevel: number): number {
  if (well.status !== 'active' || !well.pumpTier) return 0;
  const maxFlow = PUMP_SPECS[well.pumpTier].maxFlowRate;
  const flowScale = aquiferLevel >= 50 ? 1.0 : aquiferLevel / 50;
  return maxFlow * flowScale;
}

export interface AquiferTickParams {
  totalFarmDemandLhr: number;
  npcDailyDraw: number;
  weatherEvent: string;
  season: Season;
}

/** Daily aquifer tick — pure, no side effects. Returns new aquifer level (0–100). */
export function advanceAquifer(level: number, params: AquiferTickParams): number {
  let next = level;
  const totalDraw = (params.totalFarmDemandLhr + params.npcDailyDraw) / 100_000;
  next -= totalDraw;
  if (params.weatherEvent === 'rain')       next += 1.5;
  if (params.weatherEvent === 'heavy_rain') next += 3.5;
  if (params.weatherEvent === 'drought')    next -= 0.5;
  if (params.season === 'spring')           next += 0.2;
  return Math.max(0, Math.min(100, next));
}

/** Generate 2–4 randomised drilling spots for a parcel. */
export function generateSurveySpots(parcelId: string, day: number): DrillSpot[] {
  const count = 2 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, (_, i) => {
    const successProb = 0.35 + Math.random() * 0.60;
    const depthMin = 20 + Math.floor(Math.random() * 100);
    const depthMax = depthMin + 10 + Math.floor(Math.random() * 40);
    const costPerMetre = 180 + Math.floor(Math.random() * 120);
    return {
      id: `spot_${parcelId}_${day}_${i}`,
      successProbability: Math.round(successProb * 100) / 100,
      approxDepthMin: depthMin,
      approxDepthMax: depthMax,
      estimatedCostMin: depthMin * costPerMetre,
      estimatedCostMax: depthMax * (costPerMetre + 50),
    };
  });
}

/** One-time pipe installation cost based on parcel index proximity. */
export function pipeCost(wellParcelIdx: number, targetParcelIdx: number): number {
  const distance = Math.abs(wellParcelIdx - targetParcelIdx) * 50; // metres
  return Math.max(400, distance * 8);
}
```

- [ ] **Step 2: Verify TypeScript**

  Run from `granja-tycoon/`:
  ```bash
  node_modules\.bin\tsc --noEmit
  ```
  Expected: no errors. The only likely issue is the circular import from `LandParcel` — if that occurs, move the `LandParcel` import to a type-only import: `import type { LandParcel } from '../store/useGameStore';`

- [ ] **Step 3: Commit**

  ```bash
  git add engine/water.ts
  git commit -m "feat: add engine/water.ts — types, PUMP_SPECS, aquifer tick, survey spots"
  ```

---

## Task 2: Add hydrogeologist worker

**File:** `data/workerTypes.ts`

- [ ] **Step 1: Extend `WorkerRole` union and add `hydrogeologist` entry**

  In `data/workerTypes.ts`, add `'hydrogeologist'` to the `WorkerRole` union type (line 4–15):

  ```typescript
  export type WorkerRole =
    | 'field_worker'
    | 'agronomist'
    | 'botanist'
    | 'animal_keeper'
    | 'zootechnician'
    | 'mechanic'
    | 'engineer'
    | 'processor'
    | 'supervisor'
    | 'vet'
    | 'truck_driver'
    | 'hydrogeologist';
  ```

  Then add at the end of `WORKER_TYPES` array (after the `truck_driver` entry, before the closing `]`):

  ```typescript
  // ── Water ────────────────────────────────────────────────────────────────────
  {
    id: 'hydrogeologist',
    name: 'Hydrogeologist',
    icon: '🔍',
    dailyWage: 280,
    maxCount: 1,
    department: null,
    tier: 'standalone',
    description: 'Surveys parcels for well placement. Assign to a parcel to begin survey (5–10 days). One parcel at a time.',
  },
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add data/workerTypes.ts
  git commit -m "feat: add hydrogeologist worker type"
  ```

---

## Task 3: Add water types and state to the store

**File:** `store/useGameStore.ts`

- [ ] **Step 1: Import water types at the top of the store file**

  After the existing imports block (around line 20–30), add:

  ```typescript
  import { Well, DrillSpot, advanceAquifer, generateSurveySpots, wellFlowRate, pipeCost } from '../engine/water';
  export type { Well, DrillSpot };
  ```

- [ ] **Step 2: Add water fields to `GameState`**

  Find the `GameState` interface (it starts with `money: number;`). Add these four fields after `cooperative`:

  ```typescript
  aquiferLevel: number;        // 0–100 (% of total capacity)
  wells: Well[];
  gridWaterActive: boolean;
  gridWaterDailyRate: number;  // $ per irrigated hectare per day
  ```

- [ ] **Step 3: Add water action signatures to `GameActions`**

  Find the `GameActions` interface. Add after `setGridWater` or near the end:

  ```typescript
  assignHydrogeologist: (parcelId: string) => void;
  startDrilling: (wellId: string, spotId: string, targetFlowRate: number) => void;
  installPump: (wellId: string, pumpTier: 1 | 2 | 3) => void;
  connectParcel: (wellId: string, parcelId: string) => void;
  disconnectParcel: (wellId: string, parcelId: string) => void;
  setGridWater: (active: boolean) => void;
  ```

- [ ] **Step 4: Add initial state values**

  Find the `initialState` object (the big object literal passed to `create(...)`). Add after the `cooperative` field:

  ```typescript
  aquiferLevel: 75,
  wells: [] as Well[],
  gridWaterActive: false,
  gridWaterDailyRate: 12,
  ```

- [ ] **Step 5: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add store/useGameStore.ts
  git commit -m "feat: add water state fields and action signatures to game store"
  ```

---

## Task 4: Implement water store actions

**File:** `store/useGameStore.ts`

Add these six actions inside the store's `set`/`get` block, near other standalone actions (e.g. after `buyBeneficialInsects` or before the end of the action list).

- [ ] **Step 1: Add `assignHydrogeologist`**

  ```typescript
  assignHydrogeologist: (parcelId) => {
    const state = get();
    // Require hired hydrogeologist
    const hasHydro = (state.workers ?? []).some(w => w.typeId === 'hydrogeologist');
    if (!hasHydro) return;
    // Only one active survey at a time
    const busySurvey = (state.wells ?? []).some(w => w.status === 'surveying');
    if (busySurvey) return;
    const surveyDays = 5 + Math.floor(Math.random() * 6); // 5–10 days
    const newWell: Well = {
      id: `well_${Date.now()}`,
      parcelId,
      status: 'surveying',
      surveyCompletesDay: state.day + surveyDays,
      flowRateTarget: 0,
      connectedParcelIds: [],
    };
    set({ wells: [...(state.wells ?? []), newWell] });
  },
  ```

- [ ] **Step 2: Add `startDrilling`**

  ```typescript
  startDrilling: (wellId, spotId, targetFlowRate) => {
    const state = get();
    const well = (state.wells ?? []).find(w => w.id === wellId);
    if (!well || well.status !== 'survey_ready') return;
    const spot = well.surveySpots?.find(s => s.id === spotId);
    if (!spot) return;
    // Estimate cost to verify budget (use midpoint estimate)
    const estCost = (spot.estimatedCostMin + spot.estimatedCostMax) / 2;
    if (state.money < estCost) return;
    const drillingDays = 5 + Math.floor(Math.random() * 3); // 5–7 days
    set({
      wells: (state.wells ?? []).map(w =>
        w.id === wellId
          ? { ...w, status: 'drilling', chosenSpotId: spotId, flowRateTarget: targetFlowRate, drillingCompletesDay: state.day + drillingDays }
          : w
      ),
    });
  },
  ```

- [ ] **Step 3: Add `installPump`**

  ```typescript
  installPump: (wellId, pumpTier) => {
    const state = get();
    const well = (state.wells ?? []).find(w => w.id === wellId);
    if (!well || well.status !== 'active') return;
    if (well.pumpTier) return; // already installed
    const { PUMP_SPECS } = require('../engine/water');
    const pumpCost = PUMP_SPECS[pumpTier].cost;
    if (state.money < pumpCost) return;
    set({
      money: state.money - pumpCost,
      wells: (state.wells ?? []).map(w =>
        w.id === wellId ? { ...w, pumpTier } : w
      ),
    });
  },
  ```

- [ ] **Step 4: Add `connectParcel`**

  ```typescript
  connectParcel: (wellId, parcelId) => {
    const state = get();
    const well = (state.wells ?? []).find(w => w.id === wellId);
    if (!well || well.status !== 'active' || !well.pumpTier) return;
    if (well.connectedParcelIds.includes(parcelId)) return;
    const wellParcelIdx = (state.parcels ?? []).findIndex(p => p.id === well.parcelId);
    const targetIdx     = (state.parcels ?? []).findIndex(p => p.id === parcelId);
    const cost = pipeCost(wellParcelIdx, targetIdx);
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      wells: (state.wells ?? []).map(w =>
        w.id === wellId
          ? { ...w, connectedParcelIds: [...w.connectedParcelIds, parcelId] }
          : w
      ),
      parcels: (state.parcels ?? []).map(p =>
        p.id === parcelId ? { ...p, irrigated: true } : p
      ),
    });
  },
  ```

- [ ] **Step 5: Add `disconnectParcel`**

  ```typescript
  disconnectParcel: (wellId, parcelId) => {
    const state = get();
    set({
      wells: (state.wells ?? []).map(w =>
        w.id === wellId
          ? { ...w, connectedParcelIds: w.connectedParcelIds.filter(id => id !== parcelId) }
          : w
      ),
      parcels: (state.parcels ?? []).map(p =>
        p.id === parcelId ? { ...p, irrigated: false } : p
      ),
    });
  },
  ```

- [ ] **Step 6: Add `setGridWater`**

  ```typescript
  setGridWater: (active) => {
    const state = get();
    set({ gridWaterActive: active });
  },
  ```

- [ ] **Step 7: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add store/useGameStore.ts
  git commit -m "feat: add water actions (assignHydrogeologist, startDrilling, installPump, connectParcel, disconnectParcel, setGridWater)"
  ```

---

## Task 5: Wire water tick into `advanceDay()`

**File:** `store/useGameStore.ts`

The `advanceDay()` action has a large sequential body. Find the comment `// ── Pest & Disease tick` or, if pest isn't implemented yet, find the end of the weather block. Add the following block after the weather block and before the final `set({...})` call.

- [ ] **Step 1: Add the water tick block**

  ```typescript
  // ── Water system tick ──────────────────────────────────────────────────────

  // 1. Advance survey / drilling timers
  let updatedWells = (state.wells ?? []).map(well => {
    if (well.status === 'surveying' && newDay >= (well.surveyCompletesDay ?? Infinity)) {
      const spots = generateSurveySpots(well.parcelId, newDay);
      summary.push({
        id: `survey_${well.id}`,
        icon: '🔍',
        title: 'Hydrogeologist survey complete',
        detail: `${spots.length} drilling spots found. Check the Water tab.`,
        severity: 'info',
      });
      return { ...well, status: 'survey_ready' as const, surveySpots: spots };
    }
    if (well.status === 'drilling' && newDay >= (well.drillingCompletesDay ?? Infinity)) {
      const spot = well.surveySpots?.find(s => s.id === well.chosenSpotId);
      if (!spot) return well;
      const success = Math.random() < spot.successProbability;
      if (success) {
        const depth = spot.approxDepthMin + Math.floor(Math.random() * (spot.approxDepthMax - spot.approxDepthMin + 1));
        const costPerMetre = 180 + Math.floor(Math.random() * 121);
        const actualCost = depth * costPerMetre;
        summary.push({
          id: `drill_ok_${well.id}`,
          icon: '💧',
          title: 'Well drilled successfully',
          detail: `${depth}m deep. Final cost: $${actualCost.toLocaleString()}. Install a pump to activate.`,
          severity: 'success',
        });
        // Deduct drilling cost from money (handled after wells update below)
        return { ...well, status: 'active' as const, actualDepth: depth, actualCost };
      } else {
        summary.push({
          id: `drill_fail_${well.id}`,
          icon: '🪨',
          title: 'Drilling failed — dry rock',
          detail: 'The team hit dry rock. Try a different spot or commission a new survey.',
          severity: 'warning',
        });
        return { ...well, status: 'failed' as const };
      }
    }
    return well;
  });

  // Deduct any just-completed drilling costs
  let moneyAfterDrilling = state.money;
  updatedWells = updatedWells.map(well => {
    if (well.status === 'active' && well.actualCost !== undefined && !well.pumpTier) {
      // Only deduct once (if no pumpTier yet, the well just finished drilling this tick)
      const prevWell = (state.wells ?? []).find(w => w.id === well.id);
      if (prevWell?.status === 'drilling') {
        moneyAfterDrilling -= well.actualCost;
      }
    }
    return well;
  });

  // 2. Calculate farm pump demand and NPC draw
  const activePumpDemand = updatedWells
    .filter(w => w.status === 'active' && w.pumpTier)
    .reduce((sum, w) => sum + wellFlowRate(w, state.aquiferLevel), 0);

  const npcDailyDraw = 5 + Math.random() * 15;

  // 3. Advance aquifer
  const newAquifer = advanceAquifer(state.aquiferLevel ?? 75, {
    totalFarmDemandLhr: (state.gridWaterActive ?? false) ? 0 : activePumpDemand,
    npcDailyDraw,
    weatherEvent: todayWeather?.event ?? 'sunny',
    season,
  });

  // 4. Warn when aquifer drops below 20%
  if (newAquifer < 20 && (state.aquiferLevel ?? 75) >= 20) {
    summary.push({
      id: `aquifer_low_${newDay}`,
      icon: '⚠️',
      title: 'Aquifer critically low',
      detail: 'Underground water reserves are running low. Enable grid water in the Water tab.',
      severity: 'warning',
    });
  }

  // 5. Grid water cost
  const irrigatedHa = (state.parcels ?? [])
    .filter(p => p.owned && p.irrigated)
    .reduce((sum, p) => sum + p.hectares, 0);
  const gridWaterCost = (state.gridWaterActive ?? false) ? irrigatedHa * (state.gridWaterDailyRate ?? 12) : 0;
  if (gridWaterCost > 0) moneyAfterDrilling -= gridWaterCost;
  ```

- [ ] **Step 2: Merge water state into the final `set({...})` call**

  The `advanceDay()` action ends with a large `set({...})` call. Find it and add:

  ```typescript
  wells: updatedWells,
  aquiferLevel: newAquifer,
  money: moneyAfterDrilling,   // replace the existing money field if it's already computed
  ```

  (If money is already being computed by other systems in that `set` call, replace the `money` assignment — or if it's an accumulation pattern, subtract `gridWaterCost` and `drillingCosts` from it.)

- [ ] **Step 3: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add store/useGameStore.ts
  git commit -m "feat: wire water system tick into advanceDay — survey/drill timers, aquifer, grid water cost"
  ```

---

## Task 6: Create `app/(tabs)/agua.tsx`

**File:** `app/(tabs)/agua.tsx`

- [ ] **Step 1: Create the screen**

  ```typescript
  import React, { useState } from 'react';
  import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
  import { useGameStore } from '../../store/useGameStore';
  import { PUMP_SPECS, pumpTierForDemand, wellFlowRate } from '../../engine/water';
  import { CROP_TYPES } from '../../data/cropTypes';
  import { C, S, F } from '../../constants/theme';

  function AquiferBar({ level }: { level: number }) {
    const color = level >= 50 ? '#4caf50' : level >= 20 ? '#ff9800' : '#f44336';
    return (
      <View style={{ marginVertical: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: C.text, fontWeight: 'bold' }}>Aquifer Level</Text>
          <Text style={{ color, fontWeight: 'bold' }}>{level.toFixed(1)}%</Text>
        </View>
        <View style={{ height: 16, backgroundColor: C.surface, borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ width: `${level}%`, height: '100%', backgroundColor: color, borderRadius: 8 }} />
        </View>
        {level < 20 && (
          <Text style={{ color: '#f44336', fontSize: 12, marginTop: 4 }}>
            ⚠️ Critically low — enable grid water to protect irrigation
          </Text>
        )}
      </View>
    );
  }

  function WellCard({ well }: { well: ReturnType<typeof useGameStore>['wells'][0] }) {
    const { installPump, startDrilling, money } = useGameStore();
    const statusLabels: Record<string, string> = {
      surveying: '🔍 Surveying...',
      survey_ready: '📋 Survey Ready',
      drilling: '⛏️ Drilling...',
      failed: '❌ Failed',
      active: well.pumpTier ? '✅ Active' : '⚙️ Needs Pump',
      dry: '🏜️ Dry',
    };
    return (
      <View style={[S.card, { marginBottom: 8 }]}>
        <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>
          Well — Parcel {well.parcelId}
        </Text>
        <Text style={{ color: C.faint, fontSize: 13, marginBottom: 4 }}>
          {statusLabels[well.status] ?? well.status}
        </Text>
        {well.status === 'active' && !well.pumpTier && (
          <View style={{ gap: 6 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>Install Pump:</Text>
            {([1, 2, 3] as const).map(tier => (
              <TouchableOpacity
                key={tier}
                style={[S.btn, { opacity: money >= PUMP_SPECS[tier].cost ? 1 : 0.5 }]}
                onPress={() => installPump(well.id, tier)}
                disabled={money < PUMP_SPECS[tier].cost}
              >
                <Text style={S.btnText}>{PUMP_SPECS[tier].label} — ${PUMP_SPECS[tier].cost.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {well.status === 'active' && well.pumpTier && (
          <Text style={{ color: C.faint, fontSize: 12 }}>
            Pump: {PUMP_SPECS[well.pumpTier].label} · Connected: {well.connectedParcelIds.length} parcels
          </Text>
        )}
      </View>
    );
  }

  export default function AguaScreen() {
    const {
      aquiferLevel, wells, gridWaterActive, gridWaterDailyRate,
      parcels, setGridWater,
    } = useGameStore();

    const irrigatedHa = parcels.filter(p => p.owned && p.irrigated).reduce((s, p) => s + p.hectares, 0);
    const gridCostToday = gridWaterActive ? irrigatedHa * (gridWaterDailyRate ?? 12) : 0;

    return (
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 12, paddingTop: 16 }}>
          <Text style={[F.h2, { marginBottom: 8 }]}>💧 Water</Text>

          {/* Aquifer */}
          <View style={[S.card, { marginBottom: 12 }]}>
            <AquiferBar level={aquiferLevel ?? 75} />
          </View>

          {/* Grid water toggle */}
          <View style={[S.card, { marginBottom: 12 }]}>
            <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>Grid Water</Text>
            <Text style={{ color: C.faint, fontSize: 12, marginBottom: 8 }}>
              Fallback supply — bypasses aquifer. Cost: ${gridWaterDailyRate ?? 12}/ha/day
              {irrigatedHa > 0 && ` · ${irrigatedHa} ha irrigated = $${gridCostToday.toFixed(0)}/day`}
            </Text>
            <TouchableOpacity
              style={[S.btn, { backgroundColor: gridWaterActive ? '#f44336' : C.accent }]}
              onPress={() => setGridWater(!gridWaterActive)}
            >
              <Text style={S.btnText}>{gridWaterActive ? 'Disable Grid Water' : 'Enable Grid Water'}</Text>
            </TouchableOpacity>
          </View>

          {/* Wells */}
          <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8 }}>
            Wells ({(wells ?? []).length})
          </Text>
          {(wells ?? []).length === 0 && (
            <Text style={{ color: C.faint, fontSize: 13 }}>
              No wells yet. Hire a Hydrogeologist and assign them to a parcel in the Fields tab to begin a survey.
            </Text>
          )}
          {(wells ?? []).map(w => <WellCard key={w.id} well={w} />)}
        </View>
      </ScrollView>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/(tabs)/agua.tsx
  git commit -m "feat: add agua.tsx — aquifer panel, grid water toggle, well cards"
  ```

---

## Task 7: Add Water sub-tab to `granja.tsx`

**File:** `app/(tabs)/granja.tsx`

- [ ] **Step 1: Import AguaScreen and add Water tab**

  At the top of `granja.tsx`, add:

  ```typescript
  import AguaScreen from './agua';
  ```

  Find the `FarmTab` type and `TABS` array. Add the water tab:

  ```typescript
  type FarmTab = 'fields' | 'animals' | 'machinery' | 'workers' | 'seedlab' | 'water';

  const TABS: { id: FarmTab; label: string }[] = [
    { id: 'fields',    label: '🌾 Fields' },
    { id: 'animals',   label: '🐄 Animals' },
    { id: 'machinery', label: '🚜 Machinery' },
    { id: 'workers',   label: '👨‍🌾 Workers' },
    { id: 'seedlab',   label: '🌱 Seed Lab' },
    { id: 'water',     label: '💧 Water' },
  ];
  ```

  Find the section that renders based on `activeTab`. It will look something like:
  ```typescript
  {activeTab === 'fields' && <TierrasScreen />}
  {activeTab === 'animals' && <AnimalesScreen />}
  // etc.
  ```
  Add:
  ```typescript
  {activeTab === 'water' && <AguaScreen />}
  ```

- [ ] **Step 2: Register `agua` in `_layout.tsx`**

  In `app/(tabs)/_layout.tsx`, add inside `<Tabs>` after the other hidden screens:

  ```tsx
  <Tabs.Screen name="agua" options={{ href: null }} />
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/(tabs)/granja.tsx app/(tabs)/_layout.tsx
  git commit -m "feat: add Water sub-tab to Farm screen"
  ```

---

## Task 8: Add Water section to parcel detail in `tierras.tsx`

**File:** `app/(tabs)/tierras.tsx`

The parcel detail view in `tierras.tsx` has sub-tabs (Soil, Pests, etc.). Add a "Water" section.

- [ ] **Step 1: Import water engine and add water detail to parcel view**

  At the top of `tierras.tsx`, add:

  ```typescript
  import { wellFlowRate, PUMP_SPECS, pipeCost } from '../../engine/water';
  ```

  Find the parcel detail section where sub-tabs like "Soil" are rendered. Add a new "Water" sub-tab option and its content:

  ```typescript
  // In the parcel detail sub-tab selector (wherever Soil/Crop tabs are toggled):
  // Add 'water' as an option

  // In the water sub-tab content:
  function WaterParcelSection({ parcel }: { parcel: LandParcel }) {
    const { wells, aquiferLevel, assignHydrogeologist, connectParcel, disconnectParcel, workers } = useGameStore();

    const connectedWell = (wells ?? []).find(w => w.connectedParcelIds.includes(parcel.id) || w.parcelId === parcel.id);
    const hasHydro = (workers ?? []).some(w => w.typeId === 'hydrogeologist');
    const busySurvey = (wells ?? []).some(w => w.status === 'surveying');

    return (
      <View style={{ gap: 8 }}>
        {/* Current water source */}
        <View style={S.card}>
          <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 4 }}>Water Source</Text>
          {connectedWell ? (
            <Text style={{ color: C.faint, fontSize: 13 }}>
              Well — {connectedWell.status === 'active' && connectedWell.pumpTier
                ? `Active (${wellFlowRate(connectedWell, aquiferLevel ?? 75).toFixed(0)} L/hr effective)`
                : connectedWell.status}
            </Text>
          ) : parcel.irrigated ? (
            <Text style={{ color: '#4caf50', fontSize: 13 }}>Grid water (enabled farm-wide)</Text>
          ) : (
            <Text style={{ color: C.faint, fontSize: 13 }}>No water source connected</Text>
          )}
        </View>

        {/* Survey / connect actions */}
        {!connectedWell && (
          <View style={S.card}>
            {hasHydro && !busySurvey ? (
              <TouchableOpacity
                style={S.btn}
                onPress={() => assignHydrogeologist(parcel.id)}
              >
                <Text style={S.btnText}>🔍 Start Hydrogeologist Survey</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: C.faint, fontSize: 12 }}>
                {!hasHydro
                  ? 'Hire a Hydrogeologist (Workers tab) to survey this parcel for well spots.'
                  : 'Hydrogeologist is currently busy with another survey.'}
              </Text>
            )}
          </View>
        )}

        {/* Connect to existing well */}
        {!connectedWell && (wells ?? []).filter(w => w.status === 'active' && w.pumpTier).length > 0 && (
          <View style={S.card}>
            <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 6 }}>Connect to Existing Well</Text>
            {(wells ?? []).filter(w => w.status === 'active' && w.pumpTier).map(w => {
              const parcels_arr = useGameStore.getState().parcels;
              const wellIdx = parcels_arr.findIndex(p => p.id === w.parcelId);
              const targetIdx = parcels_arr.findIndex(p => p.id === parcel.id);
              const cost = pipeCost(wellIdx, targetIdx);
              return (
                <TouchableOpacity key={w.id} style={[S.btn, { marginBottom: 4 }]} onPress={() => connectParcel(w.id, parcel.id)}>
                  <Text style={S.btnText}>Connect via pipe — ${cost.toLocaleString()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Disconnect */}
        {connectedWell && connectedWell.parcelId !== parcel.id && (
          <TouchableOpacity
            style={[S.btn, { backgroundColor: '#666' }]}
            onPress={() => disconnectParcel(connectedWell.id, parcel.id)}
          >
            <Text style={S.btnText}>Disconnect from well</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Test in browser**

  ```bash
  npx expo start --web
  ```

  Navigate to Farm → Water. Verify:
  - Aquifer bar shows a percentage
  - Grid water toggle enables/disables and shows daily cost preview
  - Farm → Fields → tap a parcel → Water tab shows "No water source connected" and survey/connect options
  - Hiring a hydrogeologist (Workers tab) enables the "Start Survey" button on a parcel
  - Advancing days while survey is active eventually triggers a "Survey complete" day summary event

- [ ] **Step 4: Commit**

  ```bash
  git add app/(tabs)/tierras.tsx
  git commit -m "feat: add Water section to parcel detail in tierras.tsx"
  ```
