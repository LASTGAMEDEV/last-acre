# Spec 11: Night Operations

**Tier:** 4 — Atmosphere & World  
**Status:** Draft  
**Dependencies:** Existing worker system, machinery system, electricity system, crop system, reputation system. Integrates with Spec 06 (harvest moisture/quality).

---

## 1. Objective

Add a **time-of-day layer** to farming operations, transforming the current "always daytime" abstraction into a world where 4 AM grain harvests, night-shift baling, and noise ordinances are real strategic considerations. Early morning harvest captures grain at optimal moisture. Night shifts extend operational capacity but cost more and tire workers. Floodlights consume electricity. Neighbors complain about tractors at midnight. This is atmosphere with teeth — it deepens the simulation without adding complexity for complexity's sake.

---

## 2. Design Principles

1. **Time blocks, not real-time:** A 24-hour day is abstracted into 5 operational blocks. Players schedule operations into blocks, not individual minutes.
2. **Morning is golden:** Early morning (4–8 AM) offers the best harvest conditions for grain. This creates a natural "race against the heat" during summer harvest.
3. **Night is expensive:** Higher wages, lighting costs, fatigue accumulation, and reputation risk. Night work is a deliberate choice, not a default.
4. **Fatigue is cumulative:** Workers on consecutive night shifts become accidents waiting to happen. Rest days matter.
5. **Atmosphere is gameplay:** The transition from dark fields with headlights to dawn mists to midday heat should be visible and consequential.

---

## 3. Data Model

### 3.1 Time Block System

```ts
// types/time.ts
export type TimeBlock = 'earlyMorning' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface DaySchedule {
  day: number;
  blocks: Record<TimeBlock, ScheduledOperation[]>;
}

export interface ScheduledOperation {
  id: string;
  type: 'harvest' | 'plant' | 'tillage' | 'spray' | 'bale' | 'transport' | 'irrigation' | 'manureSpreading';
  parcelId: string | null;
  machineryIds: string[];
  workerIds: string[];
  durationBlocks: number; // how many time blocks it occupies
  requiresLighting: boolean;
  noiseLevelDb: number;   // at source
  
  // Conditions
  weatherDependent: boolean;
  cancelledDueToWeather: boolean;
}

export const timeBlockConfig: Record<TimeBlock, { startHour: number; endHour: number; name: string; nameEs: string }> = {
  earlyMorning: { startHour: 4, endHour: 8, name: 'Early Morning', nameEs: 'Madrugada' },
  morning: { startHour: 8, endHour: 12, name: 'Morning', nameEs: 'Mañana' },
  afternoon: { startHour: 12, endHour: 18, name: 'Afternoon', nameEs: 'Tarde' },
  evening: { startHour: 18, endHour: 22, name: 'Evening', nameEs: 'Atardecer' },
  night: { startHour: 22, endHour: 4, name: 'Night', nameEs: 'Noche' },
};
```

### 3.2 Shift Schedule

```ts
export interface ShiftAssignment {
  workerId: string;
  shiftType: 'day' | 'evening' | 'night' | 'rotating';
  blockStart: TimeBlock;
  blockEnd: TimeBlock;
  
  // Tracking
  consecutiveNights: number;
  consecutiveDaysWorked: number;
  totalNightShiftsThisMonth: number;
  fatigueLevel: number; // 0–100
  
  // Pay
  baseWagePerDay: number;
  shiftPremiumPercent: number;
  actualWagePerDay: number;
}
```

### 3.3 Lighting Setup

```ts
export interface LightingSetup {
  parcelId: string | null; // null = yard/road lighting
  
  tractorHeadlights: boolean;
  tractorHeadlightLux: number;
  
  fieldFloodlights: boolean;
  floodlightCount: number;
  floodlightWattsEach: number;
  totalLightingWatts: number;
  
  // Derived
  adequateForOperation: boolean; // meets minimum lux for safe machinery operation
  electricityCostPerBlock: number;
}
```

### 3.4 Noise & Ordinance

```ts
export interface NoiseOrdinance {
  region: string;
  weekdayLimitDb: number;     // at property boundary
  weekendLimitDb: number;
  nightLimitDb: number;       // stricter after 22:00
  earlyMorningLimitDb: number; // sometimes stricter 4–6 AM
  
  penalties: {
    firstWarning: boolean;
    fineAmount: number;
    reputationHit: number;
    escalationAfterWarnings: number; // 3rd warning = bigger fine
  };
}

export interface NoiseEvent {
  day: number;
  block: TimeBlock;
  operationType: string;
  machineryId: string;
  noiseAtSourceDb: number;
  noiseAtBoundaryDb: number;
  distanceToTownM: number;
  ordinanceExceeded: boolean;
  complaintFiled: boolean;
}
```

---

## 4. Static Data (`data/timeEffects.ts`)

```ts
export const timeBlockEffects: Record<TimeBlock, {
  harvestMoistureModifier: number; // multiplier on grain moisture at harvest
  harvestTempModifier: number;     // grain temperature
  workerWageMultiplier: number;
  lightingRequired: boolean;
  noiseMultiplier: number;
  accidentRiskMultiplier: number;
}> = {
  earlyMorning: {
    harvestMoistureModifier: 0.85,  // coolest time = lowest moisture
    harvestTempModifier: 0.80,
    workerWageMultiplier: 1.30,     // early start premium
    lightingRequired: true,         // before sunrise
    noiseMultiplier: 0.8,           // less noticeable
    accidentRiskMultiplier: 1.3,    // fatigue + darkness
  },
  morning: {
    harvestMoistureModifier: 0.95,
    harvestTempModifier: 0.95,
    workerWageMultiplier: 1.0,
    lightingRequired: false,
    noiseMultiplier: 1.0,
    accidentRiskMultiplier: 1.0,
  },
  afternoon: {
    harvestMoistureModifier: 1.05,  // heat = higher moisture loss... wait, actually heat = lower moisture in grain? No — grain moisture is lowest in afternoon due to evaporation. But for HAY, afternoon is bad.
    harvestTempModifier: 1.1,
    workerWageMultiplier: 1.0,
    lightingRequired: false,
    noiseMultiplier: 1.0,
    accidentRiskMultiplier: 1.0,
  },
  evening: {
    harvestMoistureModifier: 1.0,
    harvestTempModifier: 1.05,
    workerWageMultiplier: 1.15,     // overtime
    lightingRequired: true,
    noiseMultiplier: 1.2,           // more noticeable as town quiets down
    accidentRiskMultiplier: 1.1,
  },
  night: {
    harvestMoistureModifier: 0.90,  // cool again
    harvestTempModifier: 0.85,
    workerWageMultiplier: 1.50,     // night premium
    lightingRequired: true,
    noiseMultiplier: 1.5,           // very noticeable
    accidentRiskMultiplier: 1.6,    // darkness + fatigue
  },
};

export const machineryNoiseLevels: Record<string, number> = {
  tractorSmall: 72,
  tractorLarge: 78,
  combine: 82,
  baler: 75,
  sprayer: 68,
  harvester: 80,
  grainDryer: 70,
  pump: 65,
};

export const lightingRequirements: Record<string, { minLux: number; recommendedLux: number }> = {
  harvest: { minLux: 50, recommendedLux: 100 },
  tillage: { minLux: 30, recommendedLux: 75 },
  spray: { minLux: 100, recommendedLux: 200 }, // precision needed
  transport: { minLux: 20, recommendedLux: 50 },
  manureSpreading: { minLux: 25, recommendedLux: 60 },
};
```

---

## 5. Engine Logic (`engine/timeOperations.ts`)

### 5.1 Harvest Quality by Time Block

```ts
export function calculateHarvestConditions(
  crop: CropType,
  weather: WeatherEvent,
  timeBlock: TimeBlock,
  lighting: LightingSetup,
): HarvestConditions {
  const effects = timeBlockEffects[timeBlock];
  
  // Grain moisture: cooler = higher moisture content in morning dew, BUT for grain
  // the key is harvesting before heat builds up to avoid moisture re-absorption
  // Actually: grain is typically harvested at 13-15% moisture. Early morning harvest 
  // when dew is present can raise moisture to 18-20%, requiring drying.
  // BUT: in hot climates, afternoon harvest = grain too hot = storage risk.
  // Let's model: early morning = slight moisture increase from dew, but grain temp is ideal.
  // Afternoon = lower moisture but higher grain temp.
  
  let moistureModifier = 1.0;
  let grainTempC = weather.tempC;
  
  if (crop.category === 'grain') {
    if (timeBlock === 'earlyMorning') {
      moistureModifier = 1.08; // dew
      grainTempC = Math.min(weather.tempC, 18); // cool grain
    } else if (timeBlock === 'afternoon') {
      moistureModifier = 0.95; // dried out
      grainTempC = weather.tempC + 5; // hot grain in combine
    } else if (timeBlock === 'night') {
      moistureModifier = 0.98;
      grainTempC = weather.tempC - 3;
    }
  } else if (crop.category === 'forage') {
    // Hay/silage: morning cut = higher moisture (good for silage, bad for hay)
    if (timeBlock === 'earlyMorning') moistureModifier = 1.15;
    if (timeBlock === 'afternoon') moistureModifier = 0.85; // ideal for hay drying
  }
  
  // Lighting penalty: inadequate lighting reduces work speed and safety
  let workSpeedPercent = 100;
  if (effects.lightingRequired && !lighting.adequateForOperation) {
    workSpeedPercent = 60; // slow down in poor light
  }
  
  return {
    moistureModifier,
    grainTempC,
    workSpeedPercent,
    lightingAdequate: !effects.lightingRequired || lighting.adequateForOperation,
  };
}
```

### 5.2 Worker Fatigue & Wages

```ts
export function calculateShiftWage(
  baseWage: number,
  timeBlock: TimeBlock,
  workerFatigue: number,
  consecutiveNights: number,
): { grossWage: number; fatigueIncrease: number; accidentRisk: number } {
  const effects = timeBlockEffects[timeBlock];
  let wage = baseWage * effects.workerWageMultiplier;
  
  // Fatigue premium: extremely tired workers get mandatory rest or hazard pay
  if (workerFatigue > 70) wage *= 1.2; // hazard pay
  
  // Fatigue accumulation
  let fatigueIncrease = 10;
  if (timeBlock === 'night') fatigueIncrease = 25;
  if (timeBlock === 'earlyMorning') fatigueIncrease = 20;
  if (consecutiveNights > 2) fatigueIncrease *= 1.5;
  
  // Accident risk
  let accidentRisk = effects.accidentRiskMultiplier;
  if (workerFatigue > 50) accidentRisk += 0.3;
  if (workerFatigue > 80) accidentRisk += 0.5;
  if (consecutiveNights > 3) accidentRisk += 0.4;
  
  return { grossWage: wage, fatigueIncrease, accidentRisk };
}

export function recoverFatigue(worker: WorkerState, restBlocks: number): number {
  // Day off = full recovery. Sleep between shifts = partial recovery
  const recoveryPerBlock = 15;
  return Math.max(0, worker.fatigue - (restBlocks * recoveryPerBlock));
}
```

### 5.3 Noise Propagation & Ordinance

```ts
export function calculateNoiseAtBoundary(
  noiseAtSourceDb: number,
  distanceToBoundaryM: number,
  terrain: 'flat' | 'hilly' | 'forested',
): number {
  // Inverse square law approximation + terrain attenuation
  const distanceAttenuation = 20 * Math.log10(distanceToBoundaryM / 1);
  const terrainAttenuation = { flat: 0, hilly: 3, forested: 6 }[terrain];
  return noiseAtSourceDb - distanceAttenuation - terrainAttenuation;
}

export function checkNoiseComplaint(
  operation: ScheduledOperation,
  timeBlock: TimeBlock,
  distanceToTownM: number,
  dayOfWeek: number, // 0 = Sunday
  ordinance: NoiseOrdinance,
): { compliant: boolean; complaintChance: number; fineRisk: boolean } {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const limit = timeBlock === 'night' || timeBlock === 'earlyMorning' 
    ? ordinance.nightLimitDb 
    : isWeekend ? ordinance.weekendLimitDb : ordinance.weekdayLimitDb;
  
  const maxNoise = Math.max(...operation.machineryIds.map(id => machineryNoiseLevels[id] || 70));
  const noiseAtTown = calculateNoiseAtBoundary(maxNoise, distanceToTownM, 'flat');
  
  const excessDb = noiseAtTown - limit;
  const compliant = excessDb <= 0;
  
  // Complaint chance increases with excess and how quiet the town is
  const baseComplaintChance = timeBlock === 'night' ? 0.3 : 0.1;
  const complaintChance = compliant ? 0 : Math.min(0.9, baseComplaintChance + (excessDb / 10));
  
  return {
    compliant,
    complaintChance,
    fineRisk: !compliant && timeBlock === 'night',
  };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface TimeOperationActions {
  // Scheduling
  scheduleOperation(operation: ScheduledOperation): void;
  cancelOperation(operationId: string): void;
  rescheduleOperation(operationId: string, newBlock: TimeBlock): void;
  
  // Shift management
  assignWorkerShift(workerId: string, shiftType: 'day' | 'evening' | 'night' | 'rotating'): void;
  giveWorkerRestDay(workerId: string): void;
  
  // Lighting
  toggleTractorHeadlights(tractorId: string, on: boolean): void;
  installFieldFloodlights(parcelId: string, count: number): void;
  
  // Day resolution
  resolveDaySchedule(day: number): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function resolveDaySchedule(state: GameState, day: number): void {
  const schedule = state.daySchedule;
  const dayOfWeek = day % 7;
  const ordinance = state.noiseOrdinance;
  const distanceToTown = state.distanceToNearestTownM;
  
  (Object.keys(schedule.blocks) as TimeBlock[]).forEach(block => {
    const operations = schedule.blocks[block];
    
    operations.forEach(op => {
      // Check lighting
      if (timeBlockEffects[block].lightingRequired) {
        const lighting = getLightingForParcel(state, op.parcelId);
        if (!lighting.adequateForOperation) {
          state.notifications.push({
            day,
            type: 'safety',
            message: `${op.type} on ${op.parcelId} cancelled: inadequate lighting for ${block}.`,
            urgent: true,
          });
          op.cancelledDueToWeather = true; // reusing field for "cancelled"
          return;
        }
        
        // Pay electricity
        state.money -= lighting.electricityCostPerBlock;
        state.electricity.consumedKwh += lighting.totalLightingWatts / 1000 * 4; // 4 hours per block
      }
      
      // Check noise
      const noiseCheck = checkNoiseComplaint(op, block, distanceToTown, dayOfWeek, ordinance);
      if (!noiseCheck.compliant && Math.random() < noiseCheck.complaintChance) {
        state.reputation -= ordinance.penalties.reputationHit;
        state.notifications.push({
          day,
          type: 'reputation',
          message: `Noise complaint filed for ${op.type} during ${block}! Town council warning issued.`,
          urgent: noiseCheck.fineRisk,
        });
        
        if (noiseCheck.fineRisk) {
          state.money -= ordinance.penalties.fineAmount;
          state.newsEvents.push({
            day,
            headline: 'Noise Fine Imposed',
            body: `€${ordinance.penalties.fineAmount} fine for night-time machinery operation near town.`,
            type: 'negative',
          });
        }
      }
      
      // Worker fatigue & wages
      op.workerIds.forEach(workerId => {
        const worker = state.workers.find(w => w.id === workerId)!;
        const shift = calculateShiftWage(worker.baseWage, block, worker.fatigue, worker.consecutiveNights);
        
        worker.fatigue = Math.min(100, worker.fatigue + shift.fatigueIncrease);
        worker.totalPay += shift.grossWage;
        state.money -= shift.grossWage;
        
        if (block === 'night') {
          worker.consecutiveNights += 1;
        } else {
          worker.consecutiveNights = 0;
          worker.fatigue = recoverFatigue(worker, 2); // rest between day shifts
        }
        
        // Accident check
        if (Math.random() < shift.accidentRisk * 0.01) {
          state.notifications.push({
            day,
            type: 'accident',
            message: `Worker ${worker.name} injured during night operation! Medical costs and downtime incurred.`,
            urgent: true,
          });
          worker.injured = true;
          worker.daysInjured = 7 + Math.floor(Math.random() * 14);
          state.money -= 1500; // medical costs
        }
      });
      
      // Apply harvest quality modifiers
      if (op.type === 'harvest' && op.parcelId) {
        const parcel = state.parcels.find(p => p.id === op.parcelId)!;
        const conditions = calculateHarvestConditions(
          getCropType(parcel.currentCrop!.cropId),
          state.weather,
          block,
          getLightingForParcel(state, op.parcelId)
        );
        
        parcel.harvestMoistureModifier = conditions.moistureModifier;
        parcel.harvestGrainTemp = conditions.grainTempC;
        parcel.workSpeedPercent = conditions.workSpeedPercent;
      }
    });
  });
  
  // Reset schedule for next day
  state.daySchedule = createEmptySchedule(day + 1);
}
```

---

## 7. UI/UX Design

### 7.1 New Screen: Daily Schedule Board

```
┌─────────────────────────────────────────┐
│  📅 DAY 245 SCHEDULE                    │
│  Weather: Clear, 32°C / 18°C            │
│  Sunrise: 06:42 | Sunset: 21:15         │
│                                         │
│  ┌─────────────┬─────────────┬────────┐ │
│  │ EARLY MORN  │ 04:00–08:00 │  🌙   │ │
│  │ [Harvest F3] [Harvest F7] │       │ │
│  │ 💡 Lights ON | 👥 4 workers│       │ │
│  │ 💰 +€48 wage premium       │       │ │
│  ├─────────────┼─────────────┼───────┤ │
│  │ MORNING     │ 08:00–12:00 │  ☀️   │ │
│  │ [Plant F12] [Spray F5]    │       │ │
│  │ 👥 6 workers               │       │ │
│  ├─────────────┼─────────────┼───────┤ │
│  │ AFTERNOON   │ 12:00–18:00 │  ☀️   │ │
│  │ [Transport] [Manure F2]   │       │ │
│  ├─────────────┼─────────────┼───────┤ │
│  │ EVENING     │ 18:00–22:00 │  🌅   │ │
│  │ [Bale F8]                 │       │ │
│  │ 💡 Lights ON | ⚠️ noise   │       │ │
│  ├─────────────┼─────────────┼───────┤ │
│  │ NIGHT       │ 22:00–04:00 │  🌙   │ │
│  │ [Irrigation F1–F4]        │       │ │
│  │ ⚠️ 65% complaint risk     │       │ │
│  │ 🔇 Consider postponing    │       │ │
│  └─────────────┴─────────────┴───────┘ │
│                                         │
│  [Auto-schedule optimal] [Clear all]   │
└─────────────────────────────────────────┘
```

### 7.2 Worker Shift Board

```
┌─────────────────────────────────────────┐
│  👷 WORKER SHIFTS                        │
│                                         │
│  María García — Tractor operator        │
│  Current shift: NIGHT (block 4+5)      │
│  Consecutive nights: 3 ⚠️               │
│  Fatigue: 78% 🔴                        │
│  Accident risk: ELEVATED                │
│                                         │
│  [Move to day shift] [Give rest day]   │
│  [Dismiss (€2,400 severance)]          │
│                                         │
│  José Ruiz — Farm hand                  │
│  Current shift: DAY (block 2+3)        │
│  Fatigue: 22% ✅                        │
│  [Move to evening] [Move to night]     │
└─────────────────────────────────────────┘
```

### 7.3 Lighting Control Panel

```
┌─────────────────────────────────────────┐
│  💡 FIELD LIGHTING                       │
│                                         │
│  Tractor #1 headlights: ON              │
│  Tractor #2 headlights: ON              │
│  Combine #1 lights: ON                  │
│                                         │
│  Field 3 floodlights: 4 × 400W = 1,600W│
│  Field 7 floodlights: 2 × 400W =   800W│
│  ─────────────────────────────────────  │
│  Total power: 2,400W                   │
│  Cost per 4h block: €3.84              │
│                                         │
│  [Install floodlights on Field 12]     │
│  Cost: €1,200 (4 × 400W LED)           │
└─────────────────────────────────────────┘
```

### 7.4 Noise Warning Modal

```
┌─────────────────────────────────────────┐
│  🔊 NOISE ORDINANCE WARNING             │
│                                         │
│  Operation: Baling — Field 8            │
│  Time: 23:00 (Night block)              │
│  Machinery: Tractor (78 dB) + Baler    │
│  Distance to town: 850 m                │
│                                         │
│  Estimated noise at town boundary: 61 dB│
│  Night limit: 55 dB                     │
│  EXCESS: +6 dB                          │
│                                         │
│  Risk assessment:                       │
│  • Complaint chance: 65%               │
│  • Fine if complained: €500            │
│  • Reputation hit: −8                  │
│                                         │
│  [Reschedule to morning] [Proceed]     │
│  [Add sound barrier (€3,000)]          │
└─────────────────────────────────────────┘
```

### 7.5 Harvest Time Advisor

```
┌─────────────────────────────────────────┐
│  🌾 HARVEST TIMING ADVISOR              │
│  Crop: Wheat — Field 3                  │
│  Current moisture: 16.2%                │
│                                         │
│  ┌──────────────┬──────────┬──────────┐ │
│  │ Time         │ Moisture │ Grain Temp│ │
│  ├──────────────┼──────────┼──────────┤ │
│  │ Early Morning│ 17.5%   │ 18°C ✅  │ │
│  │ Morning      │ 15.8%   │ 24°C ✅  │ │
│  │ Afternoon    │ 14.2%   │ 34°C ⚠️  │ │
│  │ Evening      │ 15.0%   │ 28°C ✅  │ │
│  │ Night        │ 14.8%   │ 22°C ✅  │ │
│  └──────────────┴──────────┴──────────┘ │
│                                         │
│  💡 RECOMMENDATION:                     │
│  Start at 06:00 for optimal moisture    │
│  and temperature balance.               │
│  Requires: tractor headlights           │
│                                         │
│  [Schedule for 06:00] [Schedule 14:00] │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Workers** (`engine/workers.ts`) | Shift assignments, fatigue accumulation, night premiums, accident risk. Rest days become a management decision. |
| **Machinery** | Headlights required for night/early morning. Noise levels vary by machine type. |
| **Electricity** | Field floodlights consume power. Large night operations = noticeable grid draw. |
| **Crops / Harvest** (Spec 06) | Harvest time block affects grain moisture and temperature at intake. Early morning = slight dew moisture but cool grain. Afternoon = dry but hot grain = storage risk. |
| **Reputation** | Noise complaints reduce town reputation. Consistent violations = harder to get workers, lower CSA subscriptions. |
| **Weather** | Sunrise/sunset times vary seasonally. Summer = long days, minimal lighting needed. Winter = short days, almost all work requires lights. |
| **Storage** | Hot grain harvested in afternoon needs cooling before storage or risks condensation = mold. |
| **Economy** | Night shift premiums (1.5×) and lighting costs add up. The player must weigh these against better harvest timing. |

---

## 9. Files to Create / Modify

### New Files
```
types/time.ts                  # TimeBlock, DaySchedule, ScheduledOperation, ShiftAssignment
data/timeEffects.ts            # Per-block modifiers, machinery noise, lighting requirements
engine/timeOperations.ts       # Harvest conditions, fatigue/wages, noise propagation
components/DayScheduleBoard.tsx # Daily schedule UI
components/ShiftBoard.tsx      # Worker shift assignment
components/LightingPanel.tsx   # Light control + cost
components/NoiseWarning.tsx    # Ordinance warning modal
components/HarvestTimeAdvisor.tsx # Optimal harvest timing
```

### Modified Files
```
store/useGameStore.ts          # Day schedule, shift assignments, fatigue tracking, noise events
app/(tabs)/gestion.tsx         # Add Schedule Board
app/(tabs)/trabajadores.tsx    # Add Shift Board
engine/crops.ts                # Harvest uses time-block moisture/temp modifiers
```

---

## 10. Balance Notes

- **Early game:** 1–2 workers, small parcels. Time-of-day barely matters. Player learns scheduling exists but isn't pressured.
- **Mid game:** 30ha grain harvest = 3–4 days of racing against weather. Early morning starts (4 AM) let you cut 10% more before heat builds up. Night baling after rain = faster hay quality recovery. First noise complaint teaches town relations.
- **Late game:** 200+ ha, multiple crews, 24-hour operations during harvest window. Fatigue management is critical. Lighting infrastructure (€15,000+) pays for itself by extending operational hours.
- **The tradeoff:** Morning harvest = better quality but requires early start premium. Afternoon harvest = cheaper labor but hotter grain = dryer fuel costs or storage risk. No universally optimal time — depends on grain price, labor cost, dryer availability, and weather forecast.
- **Seasonal rhythm:** Summer harvest = frantic scheduling puzzle. Winter = minimal field work, workers recover. Natural pacing.

---

## 11. Open Questions

1. **Day length modeling:** Should we model actual sunrise/sunset by season and latitude (e.g., Spanish summer = 15-hour days, winter = 9-hour days), or keep fixed 5-block days year-round?
2. **Autonomous night operation:** Should late-game autonomous tractors be able to operate at night with zero fatigue risk but high capital cost?
3. **Hay vs. grain timing:** Should we model hay cutting/moisture differently (cut in morning = higher moisture = better for silage, worse for hay)?
4. **Community events:** Should town festivals or religious holidays (e.g., local feria) create absolute noise bans for certain days?

---

*Ready for review. Once approved, we move to Spec 12: Hedgerows & Biodiversity Buffers.*
