# Water System — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Goal

Add a full water infrastructure system: hire a hydrogeologist to survey parcels for drilling spots, hire a drilling team to sink a well at a chosen spot, buy a pump sized to your field demand, connect parcels via pipes, and draw from a shared underground aquifer that depletes with all farm usage and refills with rain. When the aquifer runs critically low, the player manually switches to paid grid water as a fallback.

---

## Architecture

New state lives in `store/useGameStore.ts`: `aquiferLevel`, `wells[]`, `waterPipes[]`, `gridWaterActive`, `gridWaterDailyRate`. New engine file `engine/water.ts` holds pure functions (demand calc, aquifer tick, flow rate scaling). New worker type `hydrogeologist` added to `data/workerTypes.ts`. Daily tick wired into `advanceDay()`. UI added as a new "Water" sub-tab in `tierras.tsx` (parcel detail view) and a global aquifer panel in `clima.tsx` or a new `agua.tsx` tab.

---

## Game Flow

```
1. Hire hydrogeologist → assign to parcel → wait 5–10 days
2. Survey report: 2–4 drilling spots, each with success %, approx depth, cost estimate
3. Calculate water demand: select which parcels connect + planned crops → required L/hr
4. Choose a drilling spot → hire drilling team → wait 5–7 days
5. Outcome: success (well installed, actual depth billed) or failure (dry rock, lose drilling cost)
6. Buy pump sized to demand (3 tiers) → attach to well
7. Connect other parcels to well → one-time pipe installation cost (scales with distance)
8. Well draws from shared aquifer daily; flow rate scales down as aquifer depletes below 50%
9. Warning when aquifer < 20% → player manually enables grid water (daily cost)
10. No water source → irrigated parcels lose moisture → droughtStress builds
```

---

## Data Model

### New types

```typescript
// engine/water.ts

export type WellStatus =
  | 'surveying'      // hydrogeologist assigned, not done
  | 'survey_ready'   // survey results available, awaiting player choice
  | 'drilling'       // drilling team hired, in progress
  | 'failed'         // drilling attempt failed (dry rock)
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
  surveyCompletesDay?: number;      // day survey finishes
  surveySpots?: DrillSpot[];        // populated when survey_ready
  chosenSpotId?: string;            // which spot the player picked
  drillingCompletesDay?: number;    // day drilling finishes
  actualDepth?: number;             // revealed on completion
  actualCost?: number;              // billed on completion
  flowRateTarget: number;           // L/hr the player specified (pre-drilling demand)
  pumpTier?: 1 | 2 | 3;            // installed pump size
  connectedParcelIds: string[];     // parcels piped to this well
}

export type PumpTier = 1 | 2 | 3;

export const PUMP_SPECS: Record<PumpTier, { maxFlowRate: number; cost: number; label: string }> = {
  1: { maxFlowRate: 5_000,  cost: 3_500,  label: 'Small (5,000 L/hr)' },
  2: { maxFlowRate: 15_000, cost: 8_000,  label: 'Medium (15,000 L/hr)' },
  3: { maxFlowRate: 30_000, cost: 18_000, label: 'Large (30,000 L/hr)' },
};
```

### GameState additions

```typescript
  aquiferLevel: number;        // 0–100 (percentage of total capacity)
  wells: Well[];
  gridWaterActive: boolean;    // player manually enabled
  gridWaterDailyRate: number;  // $ per irrigated hectare per day
```

### Existing fields unchanged

- `LandParcel.irrigated: boolean` — still the per-parcel irrigation flag; now means "this parcel has a connected water source and irrigation is on"
- `PlantedCrop.moistureLevel` — still the crop-level moisture; depletes when no water source

---

## Engine: `engine/water.ts`

### `calcParcelWaterDemand(parcelIds, parcels, cropTypes)`

Returns total L/hr required to irrigate a set of parcels based on their planted (or planned) crops and `waterNeed` values.

```typescript
export function calcParcelWaterDemand(
  parcelIds: string[],
  parcels: LandParcel[],
  cropTypes: CropType[],
): number {
  return parcelIds.reduce((total, id) => {
    const parcel = parcels.find(p => p.id === id);
    if (!parcel) return total;
    const cropId = parcel.plantedCrop?.cropId;
    const cropType = cropTypes.find(c => c.id === cropId);
    const waterNeed = cropType?.waterNeed ?? 3; // default if fallow
    return total + parcel.hectares * waterNeed * 1_000; // L/hr per ha
  }, 0);
}
```

### `pumpTierForDemand(demandLhr)`

Returns the minimum `PumpTier` that covers the demand.

```typescript
export function pumpTierForDemand(demandLhr: number): PumpTier {
  if (demandLhr <= 5_000)  return 1;
  if (demandLhr <= 15_000) return 2;
  return 3;
}
```

### `wellFlowRate(well, aquiferLevel)`

Returns effective flow rate accounting for aquifer depletion.

```typescript
export function wellFlowRate(well: Well, aquiferLevel: number): number {
  if (well.status !== 'active' || !well.pumpTier) return 0;
  const maxFlow = PUMP_SPECS[well.pumpTier].maxFlowRate;
  // Flow scales linearly from 100% at aquifer ≥ 50% to 0% at aquifer = 0%
  const flowScale = aquiferLevel >= 50 ? 1.0 : aquiferLevel / 50;
  return maxFlow * flowScale;
}
```

### `advanceAquifer(aquiferLevel, params)`

Daily aquifer tick — pure function.

```typescript
export interface AquiferTickParams {
  totalFarmDemandLhr: number;   // your farm's active pump demand
  npcDailyDraw: number;         // simulated rival draw (generated in advanceDay)
  weatherEvent: string;         // today's weather event
  season: Season;
}

export function advanceAquifer(level: number, params: AquiferTickParams): number {
  let next = level;

  // Depletion from all pumping (convert L/hr to % of 10M-litre aquifer)
  const totalDraw = (params.totalFarmDemandLhr + params.npcDailyDraw) / 100_000;
  next -= totalDraw;

  // Refill from rain
  if (params.weatherEvent === 'rain')       next += 1.5;
  if (params.weatherEvent === 'heavy_rain') next += 3.5;
  if (params.weatherEvent === 'drought')    next -= 0.5; // extra evaporation

  // Season: spring snowmelt bonus
  if (params.season === 'spring') next += 0.2;

  return Math.max(0, Math.min(100, next));
}
```

### `generateSurveySpots(parcelId, seed)`

Returns 2–4 randomised drilling spots for a parcel. Seed ensures reproducibility.

```typescript
export function generateSurveySpots(parcelId: string, day: number): DrillSpot[] {
  // 2–4 spots with varied risk/depth profiles
  const count = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
  return Array.from({ length: count }, (_, i) => {
    const successProb = 0.35 + Math.random() * 0.60; // 35%–95%
    const depthMin = 20 + Math.floor(Math.random() * 100); // 20–120m
    const depthMax = depthMin + 10 + Math.floor(Math.random() * 40);
    const costPerMetre = 180 + Math.floor(Math.random() * 120); // $180–$300/m
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
```

---

## Store Actions

| Action | Description |
|--------|-------------|
| `assignHydrogeologist(parcelId)` | Creates a `Well` with `status: 'surveying'`, sets `surveyCompletesDay` |
| `reviewSurvey(wellId)` | Called when player opens survey results; transitions to `survey_ready` if not already shown |
| `startDrilling(wellId, spotId, targetFlowRate)` | Validates budget, sets `chosenSpotId`, `flowRateTarget`, `status: 'drilling'`, `drillingCompletesDay` |
| `installPump(wellId, pumpTier)` | Deducts pump cost, sets `well.pumpTier`; well becomes `active` |
| `connectParcel(wellId, parcelId)` | Calculates pipe cost from well parcel distance; deducts cost; adds to `connectedParcelIds` |
| `disconnectParcel(wellId, parcelId)` | Removes parcel from `connectedParcelIds`; sets parcel `irrigated: false` |
| `setGridWater(active)` | Toggles `gridWaterActive`; if true, all irrigated parcels stay irrigated regardless of aquifer |

---

## advanceDay() Integration

After the existing weather block, add:

```typescript
// ── Water system tick ──────────────────────────────────────────────────────

// 1. Advance survey / drilling timers
state.wells.forEach(well => {
  if (well.status === 'surveying' && newDay >= well.surveyCompletesDay!) {
    well.status = 'survey_ready';
    well.surveySpots = generateSurveySpots(well.parcelId, newDay);
    summary.push({ id: `survey_${well.id}`, icon: '🔍', title: 'Survey complete', detail: `Hydrogeologist found ${well.surveySpots.length} drilling spots on parcel.`, severity: 'info' });
  }
  if (well.status === 'drilling' && newDay >= well.drillingCompletesDay!) {
    const spot = well.surveySpots!.find(s => s.id === well.chosenSpotId)!;
    const success = Math.random() < spot.successProbability;
    if (success) {
      const depth = spot.approxDepthMin + Math.floor(Math.random() * (spot.approxDepthMax - spot.approxDepthMin));
      const costPerMetre = 180 + Math.floor(Math.random() * 120);
      well.actualDepth = depth;
      well.actualCost = depth * costPerMetre;
      well.status = 'active'; // pump still needed
      summary.push({ id: `drill_ok_${well.id}`, icon: '💧', title: 'Well drilled successfully', detail: `${depth}m deep. Final cost: $${well.actualCost.toLocaleString()}. Install a pump to activate.`, severity: 'success' });
      // Deduct cost
    } else {
      well.status = 'failed';
      summary.push({ id: `drill_fail_${well.id}`, icon: '🪨', title: 'Drilling failed', detail: 'The team hit dry rock. Try a different spot or a new survey.', severity: 'warning' });
    }
  }
});

// 2. Calculate farm water demand and NPC draw
const activePumpDemand = state.wells
  .filter(w => w.status === 'active' && w.pumpTier)
  .reduce((sum, w) => sum + wellFlowRate(w, state.aquiferLevel), 0);

const npcDailyDraw = 5 + Math.random() * 15; // 5–20 units/day passive rival draw

// 3. Advance aquifer
const newAquifer = advanceAquifer(state.aquiferLevel, {
  totalFarmDemandLhr: state.gridWaterActive ? 0 : activePumpDemand,
  npcDailyDraw,
  weatherEvent: todayWeather?.event ?? 'sunny',
  season,
});

// 4. Warn if aquifer critically low
if (newAquifer < 20 && state.aquiferLevel >= 20) {
  summary.push({ id: `aquifer_low_${newDay}`, icon: '⚠️', title: 'Aquifer critically low', detail: 'Underground water is running low. Consider enabling grid water in the Water tab.', severity: 'warning' });
}

// 5. Update irrigated status for connected parcels
// If no active well and no grid water → parcels lose irrigation
```

---

## Grid Water Cost

```
dailyCost = gridWaterDailyRate × totalIrrigatedHectares
gridWaterDailyRate = $12/ha/day (base, can fluctuate ±20% seasonally)
```

Charged in `advanceDay()` when `gridWaterActive === true`.

---

## Pipe Installation Cost

```
pipeDistance = |parcelIndex(well) - parcelIndex(target)| × 50m (approx)
installCost = pipeDistance × $8/m   (min $400)
```

Calculated in `connectParcel` using a simple parcel proximity estimate.

---

## NPC Rival Draw

To avoid complex NPC simulation: each day, rivals draw a random `5–20` aquifer units. During drought the draw scales up (+50%) as rivals pump harder. During heavy rain it scales down (−50%). This simulates a contested aquifer without tracking individual rival farms.

---

## UI

### tierras.tsx — Parcel detail: new "Water" sub-tab

Shows for each parcel:
- Current water source (well name / grid / none)
- Well status (surveying / survey ready / drilling / active)
- If `survey_ready`: shows spot cards with success %, depth estimate, cost estimate + "Start Drilling" button
- If `active`: shows flow rate, pump tier, connected parcels
- Buttons: "Connect to well", "Disconnect"

### New `agua.tsx` tab (or sub-tab in `clima.tsx`)

Global water overview:
- Aquifer level bar (0–100%)
- Today's draw (your farm vs rivals estimated)
- Grid water toggle + daily cost preview
- List of all wells with status badges
- Hydrogeologist assignment button

---

## Worker Type: Hydrogeologist

Add to `data/workerTypes.ts`:

```typescript
{
  id: 'hydrogeologist',
  name: 'Hydrogeologist',
  wage: 280,           // $/day (specialist)
  hireCost: 500,
  effect: 'Surveys parcels for well placement. Assign to a parcel to begin survey (5–10 days).',
}
```

A hydrogeologist can only be assigned to one parcel at a time. After the survey completes they become unassigned and available for the next parcel.

---

## Files Changed

| File | Change |
|------|--------|
| `engine/water.ts` | New file: `Well`, `DrillSpot`, `PUMP_SPECS`, `calcParcelWaterDemand`, `pumpTierForDemand`, `wellFlowRate`, `advanceAquifer`, `generateSurveySpots` |
| `data/workerTypes.ts` | Add `hydrogeologist` worker type |
| `store/useGameStore.ts` | Add `aquiferLevel`, `wells`, `gridWaterActive`, `gridWaterDailyRate` to state; add all water actions; wire into `advanceDay()` |
| `app/(tabs)/agua.tsx` | New tab: global aquifer panel + well list + grid water toggle |
| `app/(tabs)/tierras.tsx` | Add "Water" sub-tab to parcel detail with survey/drilling/pipe UI |
| `app/(tabs)/_layout.tsx` | Add `agua` tab to the tab bar |

---

## Out of Scope

- Rainwater collection tanks
- Water quality / treatment
- Underground pipe visualisation / map
- Water rights / regulatory permits
