# Random Events & NPC Competitor Farms — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a random event system that fires daily gameplay shocks (weather, pests, equipment failure, windfalls) and NPC competitor farms that apply sell pressure and auction competition.

**Architecture:** New pure-function engine files (`engine/events.ts`, `engine/competitors.ts`) + static data files (`data/randomEvents.ts`, `data/npcFarms.ts`) + thin store integration following the existing news-event pattern. Insurance extended with `clima` (replaces sequia/helada) and `maquinaria`. Save key bumped v5 → v6.

**Tech Stack:** React Native · Expo · TypeScript · Zustand 5 · no test suite (verify via dev server at `http://localhost:8081/(tabs)/tierras`)

**Spec:** `docs/superpowers/specs/2026-03-30-random-events-npc-farms-design.md`

---

## Task 1: Update `data/insuranceTypes.ts`

**Files:**
- Modify: `data/insuranceTypes.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
export type InsuranceType = 'clima' | 'plaga' | 'incendio' | 'maquinaria';

export interface InsurancePlan {
  type: InsuranceType;
  name: string;
  icon: string;
  description: string;
  premiumPerDay: number;
  coveragePercent: number;
  triggerEvents: string[];
}

export const INSURANCE_PLANS: InsurancePlan[] = [
  {
    type: 'clima',
    name: 'Weather Insurance',
    icon: '🌦️',
    description: 'Covers crop destruction from all extreme weather: drought, frost, hail, and heatwave. Reimburses the estimated value of the lost harvest.',
    premiumPerDay: 30,
    coveragePercent: 0.70,
    triggerEvents: ['drought', 'frost', 'hail', 'weather_frost', 'weather_heatwave', 'weather_hailstorm'],
  },
  {
    type: 'plaga',
    name: 'Pest Insurance',
    icon: '🐛',
    description: 'Pays compensation for pest or disease events on your plots, including random pest outbreak events.',
    premiumPerDay: 10,
    coveragePercent: 0.60,
    triggerEvents: ['pest', 'disease', 'pest_outbreak'],
  },
  {
    type: 'incendio',
    name: 'Fire Insurance',
    icon: '🔥',
    description: 'Covers total crop destruction by fire. Higher coverage as it is the most catastrophic event.',
    premiumPerDay: 28,
    coveragePercent: 0.85,
    triggerEvents: ['fire'],
  },
  {
    type: 'maquinaria',
    name: 'Machinery Insurance',
    icon: '⚙️',
    description: 'Covers repair costs from equipment failure events. Payout scales with the repair cost.',
    premiumPerDay: 25,
    coveragePercent: 0.75,
    triggerEvents: ['equipment_failure'],
  },
];
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon"
git add data/insuranceTypes.ts
git commit -m "feat: replace sequia/helada insurance with unified clima, add maquinaria"
```

---

## Task 2: Create `data/randomEvents.ts`

**Files:**
- Create: `data/randomEvents.ts`

- [ ] **Step 1: Create the file**

```typescript
export type GameEventType =
  | 'weather_frost'
  | 'weather_heatwave'
  | 'weather_hailstorm'
  | 'pest_outbreak'
  | 'market_surge'
  | 'equipment_failure'
  | 'animal_illness'
  | 'windfall_subsidy'
  | 'windfall_soil'
  | 'windfall_harvest';

export interface GameEventTemplate {
  id: string;
  type: GameEventType;
  icon: string;
  title: string;
  description: string;
  durationDays: number; // 0 = one-shot (equipment_failure creates a MachineRepair instead)
  weight: number;       // relative probability
  modifier?: number;    // yield/price multiplier where applicable
}

export const RANDOM_EVENT_TEMPLATES: GameEventTemplate[] = [
  // ── Weather extremes ────────────────────────────────────────────────────────
  {
    id: 'e01', type: 'weather_frost',     icon: '🧊',
    title: 'Sudden Frost',
    description: 'An unexpected frost damages exposed crops.',
    durationDays: 3, weight: 10, modifier: 0.50,
  },
  {
    id: 'e02', type: 'weather_heatwave',  icon: '🥵',
    title: 'Heatwave',
    description: 'Extreme heat stresses crops and reduces yield.',
    durationDays: 5, weight: 8, modifier: 0.65,
  },
  {
    id: 'e03', type: 'weather_hailstorm', icon: '🌨️',
    title: 'Hailstorm',
    description: 'Hail batters several parcels, cutting yields.',
    durationDays: 2, weight: 6, modifier: 0.40,
  },
  // ── Pest / disease ──────────────────────────────────────────────────────────
  {
    id: 'e04', type: 'pest_outbreak',     icon: '🦗',
    title: 'Pest Outbreak',
    description: 'A pest surge hits your fields. Crop value and yield reduced for affected crop.',
    durationDays: 7, weight: 12, modifier: 0.50,
  },
  // ── Market ──────────────────────────────────────────────────────────────────
  {
    id: 'e05', type: 'market_surge',      icon: '📈',
    title: 'Demand Shock',
    description: "A sudden surge in demand spikes a crop's price.",
    durationDays: 4, weight: 10, modifier: 1.60,
  },
  // ── Equipment ───────────────────────────────────────────────────────────────
  {
    id: 'e06', type: 'equipment_failure', icon: '⚙️',
    title: 'Equipment Failure',
    description: 'A machine breaks down and needs repair. Machine runs at half bonus until fixed.',
    durationDays: 0, weight: 8,
    // durationDays 0: does NOT push to activeEvents — creates a MachineRepair entry instead
  },
  // ── Animal ──────────────────────────────────────────────────────────────────
  {
    id: 'e07', type: 'animal_illness',    icon: '🐄',
    title: 'Animal Illness',
    description: 'One of your animals falls ill regardless of hardiness.',
    durationDays: 5, weight: 6,
  },
  // ── Windfall ────────────────────────────────────────────────────────────────
  {
    id: 'e08', type: 'windfall_subsidy',  icon: '🍀',
    title: 'Government Subsidy',
    description: 'A surprise government subsidy boosts your cash reserves.',
    durationDays: 1, weight: 5, modifier: 2500, // modifier = flat cash amount
  },
  {
    id: 'e09', type: 'windfall_soil',     icon: '🌱',
    title: 'Bumper Soil Conditions',
    description: 'Exceptional soil conditions boost yield on your planted plots.',
    durationDays: 7, weight: 4, modifier: 1.25,
  },
  {
    id: 'e10', type: 'windfall_harvest',  icon: '🎯',
    title: 'Lucky Harvest Bonus',
    description: 'Exceptional conditions grant a surprise yield bonus on all plots.',
    durationDays: 5, weight: 4, modifier: 1.30,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/randomEvents.ts
git commit -m "feat: add random event templates data file"
```

---

## Task 3: Create `data/npcFarms.ts`

**Files:**
- Create: `data/npcFarms.ts`

- [ ] **Step 1: Create the file**

```typescript
export interface NPCFarmDefinition {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[]; // cropIds they favor
  sellIntervalDays: number;
  startingWealth: number;
}

export const NPC_FARM_DEFINITIONS: NPCFarmDefinition[] = [
  {
    id: 'npc_rivera',
    name: 'Rivera Ranch',
    tier: 1,
    specialization: ['wheat', 'corn'],
    sellIntervalDays: 10,
    startingWealth: 5000,
  },
  {
    id: 'npc_golden',
    name: 'Golden Valley Co.',
    tier: 2,
    specialization: ['soy', 'sunflower'],
    sellIntervalDays: 6,
    startingWealth: 15000,
  },
  {
    id: 'npc_sierra',
    name: 'Sierra Agro',
    tier: 3,
    specialization: ['cotton', 'rice', 'sugarbeet'],
    sellIntervalDays: 3,
    startingWealth: 40000,
  },
  {
    id: 'npc_verde',
    name: 'Verde Fields',
    tier: 1,
    specialization: ['barley', 'oats'],
    sellIntervalDays: 10,
    startingWealth: 4000,
  },
  {
    id: 'npc_altavista',
    name: 'Altavista Farms',
    tier: 2,
    specialization: ['potatoes', 'rapeseed'],
    sellIntervalDays: 6,
    startingWealth: 12000,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/npcFarms.ts
git commit -m "feat: add NPC farm definitions data file"
```

---

## Task 4: Create `engine/events.ts`

**Files:**
- Create: `engine/events.ts`

- [ ] **Step 1: Create the file**

```typescript
import { RANDOM_EVENT_TEMPLATES, GameEventTemplate, GameEventType } from '../data/randomEvents';
import { MACHINE_TYPES } from '../data/machineTypes';

// Minimal interfaces needed — avoid circular import from store
export interface ActiveEvent {
  type: GameEventType;
  affectedIds?: string[];
  modifier?: number;
}

export interface RepairWorker {
  typeId: string;
}

export interface RepairableMachine {
  id: string;
  typeId: string;
}

/**
 * Roll for a new random event. Returns null if no event fires.
 * Avoids creating a duplicate of an already-active event type.
 */
export function rollEvent(
  activeEventTypes: GameEventType[],
): GameEventTemplate | null {
  if (Math.random() >= 0.08) return null;
  const activeSet = new Set(activeEventTypes);
  const available = RANDOM_EVENT_TEMPLATES.filter(t => !activeSet.has(t.type));
  if (available.length === 0) return null;
  const totalWeight = available.reduce((s, t) => s + t.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const t of available) {
    rand -= t.weight;
    if (rand <= 0) return t;
  }
  return available[available.length - 1];
}

/**
 * Compute the harvest yield multiplier from active events for a given parcel + crop.
 * Returns 1.0 if no active events affect this harvest.
 */
export function getHarvestModifier(
  activeEvents: ActiveEvent[],
  parcelId: string,
  cropId: string,
): number {
  let mod = 1.0;
  for (const e of activeEvents) {
    if (
      (e.type === 'weather_frost' || e.type === 'weather_hailstorm' || e.type === 'weather_heatwave') &&
      e.affectedIds?.includes(parcelId)
    ) {
      mod *= e.modifier ?? 0.5;
    }
    if (e.type === 'pest_outbreak' && e.affectedIds?.[0] === cropId) {
      mod *= 0.5;
    }
    if (
      (e.type === 'windfall_soil' || e.type === 'windfall_harvest') &&
      e.modifier && e.modifier > 1
    ) {
      mod *= e.modifier;
    }
  }
  return mod;
}

/**
 * Compute the production multiplier for an animal from active illness events.
 * Returns 0.0 if the animal is targeted by an illness event, 1.0 otherwise.
 */
export function getProductionModifier(
  activeEvents: ActiveEvent[],
  animalId: string,
): number {
  for (const e of activeEvents) {
    if (e.type === 'animal_illness' && e.affectedIds?.includes(animalId)) {
      return 0.0;
    }
  }
  return 1.0;
}

/**
 * Repair cost = 25% of the machine's purchase cost.
 */
export function calcRepairCost(machine: RepairableMachine): number {
  const t = MACHINE_TYPES.find(mt => mt.id === machine.typeId);
  return Math.round((t?.cost ?? 5000) * 0.25);
}

/**
 * Repair duration in days based on worker availability.
 * engineer → 2 days · mechanic → 3 days · no mechanic → 5 days
 */
export function calcRepairDays(workers: RepairWorker[]): number {
  if (workers.some(w => w.typeId === 'engineer')) return 2;
  if (workers.some(w => w.typeId === 'mechanic')) return 3;
  return 5;
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/events.ts
git commit -m "feat: add events engine — rollEvent, harvest/production modifiers, repair helpers"
```

---

## Task 5: Create `engine/competitors.ts`

**Files:**
- Create: `engine/competitors.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NPC_FARM_DEFINITIONS } from '../data/npcFarms';

export interface NPCFarmRuntime {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[];
  sellIntervalDays: number;
  nextSellDay: number;
  wealth: number;
}

/**
 * Build the initial runtime NPCFarm array from static definitions.
 * Called once in makeInitialState().
 */
export function initNpcFarms(): NPCFarmRuntime[] {
  return NPC_FARM_DEFINITIONS.map(def => ({
    id: def.id,
    name: def.name,
    tier: def.tier,
    specialization: def.specialization,
    sellIntervalDays: def.sellIntervalDays,
    nextSellDay: def.sellIntervalDays, // first sell on day = interval
    wealth: def.startingWealth,
  }));
}

/**
 * Volume of crop units an NPC dumps this tick.
 * Scales with tier (base 300/600/900) and wealth (log scale).
 */
export function npcSellVolume(farm: NPCFarmRuntime): number {
  const base = farm.tier * 300;
  const wealthScale = Math.log10(Math.max(10, farm.wealth)) / 4;
  return Math.round(base * wealthScale * (0.8 + Math.random() * 0.4));
}

/**
 * Bid amount an NPC will place on an auction parcel.
 * Returns 0 if the NPC can't afford to compete.
 */
export function npcAuctionBid(farm: NPCFarmRuntime, parcelValue: number): number {
  if (farm.wealth < parcelValue * 0.3) return 0;
  const aggression = farm.tier * 0.15;
  return Math.round(parcelValue * (0.5 + aggression + Math.random() * 0.2));
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/competitors.ts
git commit -m "feat: add competitors engine — initNpcFarms, npcSellVolume, npcAuctionBid"
```

---

## Task 6: Add new interfaces + state fields to `store/useGameStore.ts`

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add imports at the top of the file**

After the existing import block (around line 19), add:

```typescript
import { GameEventType } from '../data/randomEvents';
import { NPCFarmRuntime, initNpcFarms } from '../engine/competitors';
```

- [ ] **Step 2: Add three new exported interfaces** after the `HybridJob` interface (around line 166)

```typescript
export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  description: string;
  icon: string;
  expiresDay: number;    // day this event expires; 0 = already expired/one-shot
  affectedIds?: string[]; // parcel IDs, animal ID, crop ID — depends on type
  modifier?: number;
}

export interface MachineRepair {
  id: string;
  machineId: string;
  startDay: number | null;  // null = broken, player hasn't started repair yet
  readyDay: number | null;  // null until startRepair() is called
  cost: number;
  insurancePaid: number;
}

export type NPCFarm = NPCFarmRuntime;
```

- [ ] **Step 3: Add new fields to the `GameState` interface** — add these three lines inside `GameState` after the `breedingPairs` line (around line 284):

```typescript
  activeEvents: GameEvent[];
  machineRepairs: MachineRepair[];
  npcFarms: NPCFarm[];
```

- [ ] **Step 4: Add new action to `GameState`** — add after `selectSeedForParcel` (around line 344):

```typescript
  startRepair: (machineId: string) => void;
```

- [ ] **Step 5: Add new fields to `makeInitialState()`** — add these three lines inside `makeInitialState()` after `cropQualityMap`:

```typescript
    activeEvents: [] as GameEvent[],
    machineRepairs: [] as MachineRepair[],
    npcFarms: initNpcFarms(),
```

- [ ] **Step 6: Bump the storage key** — find `granja-tycoon-save-v5` and change it to `granja-tycoon-save-v6`:

Old:
```typescript
      name: 'granja-tycoon-save-v5',
```
New:
```typescript
      name: 'granja-tycoon-save-v6',
```

- [ ] **Step 7: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add GameEvent/MachineRepair/NPCFarm types, state fields, bump save to v6"
```

---

## Task 7: Update `getMachineYieldBonus` to respect broken machines

**Files:**
- Modify: `store/useGameStore.ts`

The existing `getMachineYieldBonus` helper (line ~22) ignores broken machines. Update it to halve the yield bonus contribution of machines that have an active repair.

- [ ] **Step 1: Update the helper signature and body**

Find:
```typescript
function getMachineYieldBonus(machines: OwnedMachine[]): number {
  return machines.reduce((bonus, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return t ? bonus * t.yieldBonus : bonus;
  }, 1.0);
}
```

Replace with:
```typescript
function getMachineYieldBonus(machines: OwnedMachine[], repairingIds?: Set<string>): number {
  return machines.reduce((bonus, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    if (!t) return bonus;
    // Broken or under repair: halve the bonus above baseline (1.0)
    const yb = repairingIds?.has(m.id)
      ? 1 + (t.yieldBonus - 1) * 0.5
      : t.yieldBonus;
    return bonus * yb;
  }, 1.0);
}
```

- [ ] **Step 2: Pass `repairingIds` at each call site in `advanceDay` and `harvestCrop`**

There are three places that call `getMachineYieldBonus`. Search for all occurrences:

```
getMachineYieldBonus(state.machines)
```

Each call needs to pass the broken-machine set. You will compute this set once per operation:

```typescript
const repairingIds = new Set(
  (state.machineRepairs ?? [])
    .filter(r => r.readyDay === null || r.readyDay > state.day)
    .map(r => r.machineId)
);
```

Then call: `getMachineYieldBonus(state.machines, repairingIds)`

There are two occurrences inside `advanceDay` (field worker auto-harvest block) and one in `harvestCrop`. Update each one. For `harvestCrop`, compute `repairingIds` at the top of the action body before it is used.

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: halve machine yield bonus for machines under repair"
```

---

## Task 8: Update `advanceDay` — fix climate insurance + add random event roll

**Files:**
- Modify: `store/useGameStore.ts`

**Part A — Fix clima insurance** (replaces old sequia/helada block around line 796):

- [ ] **Step 1: Replace the weather insurance block**

Find this block:
```typescript
        if (todayWeather && ['frost', 'hail', 'drought'].includes(todayWeather.event)) {
          const isdrought = todayWeather.event === 'drought';
          const coverType: InsuranceType = isdrought ? 'sequia' : 'helada';
          const plan = INSURANCE_PLANS.find(pl => pl.type === coverType)!;
          const insured = hasActiveInsurance(state.insurances, coverType);
```

Replace with:
```typescript
        if (todayWeather && ['frost', 'hail', 'drought'].includes(todayWeather.event)) {
          const climaPlan = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
          const insured = hasActiveInsurance(state.insurances, 'clima');
```

Then find the two remaining references to `coverType` inside this same block and replace them:
- `type: coverType,` → `type: 'clima' as InsuranceType,`
- `plan.coveragePercent` → `climaPlan.coveragePercent`

**Part B — Add random event roll** after the news event block (after the `if (newNewsEvent)` summary push, around line 600):

- [ ] **Step 2: Add random event roll + side-effect handling**

```typescript
        // ── Random events ────────────────────────────────────────────────────
        const { rollEvent, getHarvestModifier: _hm, getProductionModifier: _pm, calcRepairCost, calcRepairDays } = require('../engine/events');
        const { RANDOM_EVENT_TEMPLATES } = require('../data/randomEvents');

        let activeEvents: GameEvent[] = (state.activeEvents ?? [])
          .map(e => e)
          .filter(e => e.expiresDay > newDay);

        let machineRepairs: MachineRepair[] = [...(state.machineRepairs ?? [])];

        // Complete any repairs that are ready
        machineRepairs = machineRepairs.filter(r => {
          if (r.readyDay !== null && newDay >= r.readyDay) {
            summary.push({
              id: `repair_done_${r.machineId}`,
              icon: '🔧',
              title: 'Machine repair complete',
              detail: 'Machine is back to full capacity',
              severity: 'good',
            });
            return false; // remove from list
          }
          return true;
        });

        // Roll for a new random event (8% chance)
        const activeEventTypes = activeEvents.map((e: GameEvent) => e.type);
        const newEventTemplate = rollEvent(activeEventTypes);

        if (newEventTemplate) {
          const ownedParcels = state.parcels.filter(p => p.owned && p.plantedCrop);
          const allOwnedParcels = state.parcels.filter(p => p.owned);
          const cropIds = [...new Set(ownedParcels.map(p => p.plantedCrop!.cropId))];
          const { CROP_TYPES: CT } = require('../data/cropTypes');

          let affectedIds: string[] = [];

          // Determine affectedIds by event type
          if (['weather_frost', 'weather_heatwave', 'weather_hailstorm'].includes(newEventTemplate.type)) {
            // Pick 1–3 random owned parcels
            const shuffled = [...allOwnedParcels].sort(() => Math.random() - 0.5);
            affectedIds = shuffled.slice(0, Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1))).map(p => p.id);
          } else if (newEventTemplate.type === 'pest_outbreak') {
            // Pick a random planted crop type
            if (cropIds.length > 0) {
              affectedIds = [cropIds[Math.floor(Math.random() * cropIds.length)]];
            }
          } else if (newEventTemplate.type === 'market_surge') {
            // Pick any random crop (not just planted)
            const allCropIds = CT.map((c: any) => c.id);
            affectedIds = [allCropIds[Math.floor(Math.random() * allCropIds.length)]];
          } else if (newEventTemplate.type === 'equipment_failure') {
            // Pick a random owned machine — but DON'T push to activeEvents
            const healthyMachines = state.machines.filter(
              m => !machineRepairs.some(r => r.machineId === m.id)
            );
            if (healthyMachines.length > 0) {
              const broken = healthyMachines[Math.floor(Math.random() * healthyMachines.length)];
              affectedIds = [broken.id];
              const cost = calcRepairCost(broken);
              const insurancePaid = hasActiveInsurance(state.insurances, 'maquinaria')
                ? Math.round(cost * (INSURANCE_PLANS.find(pl => pl.type === 'maquinaria')!.coveragePercent))
                : 0;
              if (insurancePaid > 0) {
                newClaims.push({
                  id: `claim_maquinaria_${newDay}_${broken.id}`,
                  day: newDay,
                  type: 'maquinaria' as InsuranceType,
                  payout: insurancePaid,
                  description: `${MACHINE_TYPES.find((mt: any) => mt.id === broken.typeId)?.name ?? broken.typeId} breakdown repair`,
                });
              }
              machineRepairs.push({
                id: `repair_${newDay}_${broken.id}`,
                machineId: broken.id,
                startDay: null,
                readyDay: null,
                cost,
                insurancePaid,
              });
              summary.push({
                id: `event_${newEventTemplate.id}_${newDay}`,
                icon: newEventTemplate.icon,
                title: newEventTemplate.title,
                detail: insurancePaid > 0
                  ? `Repair cost: $${cost.toLocaleString()} · Insurance covers $${insurancePaid.toLocaleString()}`
                  : `Repair cost: $${cost.toLocaleString()} · Go to Machinery tab to start repair`,
                severity: 'danger',
              });
            }
          } else if (newEventTemplate.type === 'animal_illness') {
            // Pick a random healthy animal
            const healthy = state.animals.filter((a: any) => !a.sick);
            if (healthy.length > 0) {
              const target = healthy[Math.floor(Math.random() * healthy.length)];
              affectedIds = [target.id];
            }
          }

          // Handle windfall events
          if (newEventTemplate.type === 'windfall_subsidy') {
            const amount = newEventTemplate.modifier ?? 2500;
            moneyDelta += amount;
            summary.push({
              id: `event_windfall_${newDay}`,
              icon: newEventTemplate.icon,
              title: newEventTemplate.title,
              detail: `+$${amount.toLocaleString()} cash bonus`,
              severity: 'good',
            });
          }

          // Push to activeEvents (skip equipment_failure — handled above)
          if (newEventTemplate.type !== 'equipment_failure' && newEventTemplate.durationDays > 0) {
            // For market_surge: also apply price modifier immediately (like news events)
            if (newEventTemplate.type === 'market_surge' && affectedIds.length > 0) {
              prices = prices.map(p =>
                p.cropId === affectedIds[0]
                  ? { ...p, price: Math.max(1, p.price * (newEventTemplate.modifier ?? 1.6)) }
                  : p
              );
            }
            // For pest_outbreak: apply price modifier immediately
            if (newEventTemplate.type === 'pest_outbreak' && affectedIds.length > 0) {
              prices = prices.map(p =>
                p.cropId === affectedIds[0]
                  ? { ...p, price: Math.max(1, p.price * 0.5) }
                  : p
              );
              // Insurance check
              if (hasActiveInsurance(state.insurances, 'plaga')) {
                const plagaPlanForEvent = INSURANCE_PLANS.find(pl => pl.type === 'plaga')!;
                const ownedHa = ownedParcels
                  .filter(p => p.plantedCrop?.cropId === affectedIds[0])
                  .reduce((s: number, p: any) => s + p.hectares, 0);
                if (ownedHa > 0) {
                  const compensation = Math.round(150 * ownedHa * plagaPlanForEvent.coveragePercent);
                  newClaims.push({
                    id: `claim_plaga_event_${newDay}`,
                    day: newDay,
                    type: 'plaga' as InsuranceType,
                    payout: compensation,
                    description: `Pest outbreak on ${affectedIds[0]} — ${ownedHa}ha affected`,
                  });
                  moneyDelta += compensation;
                }
              }
              // Weather extreme insurance check (frost/hail/heatwave)
            } else if (
              ['weather_frost', 'weather_hailstorm', 'weather_heatwave'].includes(newEventTemplate.type) &&
              affectedIds.length > 0
            ) {
              if (hasActiveInsurance(state.insurances, 'clima')) {
                const climaPlanForEvent = INSURANCE_PLANS.find(pl => pl.type === 'clima')!;
                for (const parcelId of affectedIds) {
                  const p = state.parcels.find(pr => pr.id === parcelId);
                  if (p?.plantedCrop) {
                    const cropVal = estimateCropValue(p, prices);
                    const payout = Math.round(cropVal * climaPlanForEvent.coveragePercent);
                    if (payout > 0) {
                      newClaims.push({
                        id: `claim_clima_event_${newDay}_${parcelId}`,
                        day: newDay,
                        type: 'clima' as InsuranceType,
                        payout,
                        description: `${newEventTemplate.title} on ${p.name}`,
                      });
                      moneyDelta += payout;
                    }
                  }
                }
              }
            }

            const newEvent: GameEvent = {
              id: `event_${newEventTemplate.id}_${newDay}`,
              type: newEventTemplate.type,
              title: newEventTemplate.title,
              description: newEventTemplate.description,
              icon: newEventTemplate.icon,
              expiresDay: newDay + newEventTemplate.durationDays,
              affectedIds: affectedIds.length > 0 ? affectedIds : undefined,
              modifier: newEventTemplate.modifier,
            };
            activeEvents = [...activeEvents, newEvent];

            if (newEventTemplate.type !== 'windfall_subsidy') {
              summary.push({
                id: `event_summary_${newDay}_${newEventTemplate.id}`,
                icon: newEventTemplate.icon,
                title: newEventTemplate.title,
                detail: newEventTemplate.description,
                severity: ['weather_frost','weather_heatwave','weather_hailstorm','pest_outbreak','animal_illness'].includes(newEventTemplate.type)
                  ? 'danger'
                  : ['market_surge','windfall_soil','windfall_harvest'].includes(newEventTemplate.type)
                  ? 'good'
                  : 'info',
              });
            }
          }
        }
```

> **Note:** The `moneyDelta` variable is already declared earlier in `advanceDay` (around the auction section). Move your random event block to run after `moneyDelta` is declared. If it isn't declared yet at the point you're inserting, use `let moneyDelta = ...` from the existing auction block and restructure so that the random event roll happens after `let moneyDelta = 0;` is in scope. The simplest approach: insert the entire random event block right before the `// Auction: AI bidding + resolve` comment where `let moneyDelta = 0;` is first declared — the block can reference `moneyDelta` because it runs in the same function scope. Actually look at the code: `let moneyDelta = 0` is at line ~1010. Insert the random event block just before that line (which means after the `newClaims` array is also declared at line ~794). Move the random event roll to after the fire event block (after line ~883) where `newClaims` already exists, and before the `let moneyDelta = 0` line at ~1010 — adding `moneyDelta += amount` for windfall is fine since you'll declare it as `let moneyDelta = 0` right after the random events block.

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add random event roll to advanceDay, clima insurance fix"
```

---

## Task 9: Update `advanceDay` — NPC sells, auction NPC bids, update `set()`

**Files:**
- Modify: `store/useGameStore.ts`

**Part A — NPC sells** (insert after the sell pressure block, around line 641):

- [ ] **Step 1: Add NPC sell logic after `const sellPressures = activePressures;`**

```typescript
        // ── NPC competitor sells ─────────────────────────────────────────────
        const { npcSellVolume, npcAuctionBid: _npcBid } = require('../engine/competitors');
        let npcFarms: NPCFarm[] = [...(state.npcFarms ?? [])];
        npcFarms = npcFarms.map(farm => {
          if (farm.nextSellDay > newDay) return farm;
          // Pick a random specialty crop
          const cropId = farm.specialization[Math.floor(Math.random() * farm.specialization.length)];
          const volume = npcSellVolume(farm);
          // Apply sell pressure (uses existing sellPressures mechanism)
          const { computeSellPressureModifier, sellPressureDuration } = require('../engine/market');
          const pressureMod = computeSellPressureModifier(volume);
          const duration = sellPressureDuration(volume);
          if (pressureMod < 1.0) {
            sellPressures.push({
              cropId,
              modifier: pressureMod,
              expiresDay: newDay + duration,
            });
          }
          // Grow NPC wealth slightly each sell cycle
          return {
            ...farm,
            nextSellDay: newDay + farm.sellIntervalDays,
            wealth: Math.round(farm.wealth * 1.02 + volume * 0.5),
          };
        });
```

**Part B — NPC auction bids** (update the auction block around line 1025):

- [ ] **Step 2: Replace the AI bidding logic in the auction block**

Find:
```typescript
          const daysLeft = lot.endDay - newDay;
          const aiBidChance = daysLeft <= 3 ? 0.5 : daysLeft <= 7 ? 0.25 : 0.1;
          if (Math.random() < aiBidChance) {
            const increment = 1.05 + Math.random() * 0.12;
            const aiBid = Math.ceil(lot.currentBid * increment);
            return {
              ...lot,
              currentBid: aiBid,
              bids: [...lot.bids, { day: newDay, amount: aiBid, isPlayer: false }],
            };
          }
```

Replace with:
```typescript
          const daysLeft = lot.endDay - newDay;
          const aiBidChance = daysLeft <= 3 ? 0.5 : daysLeft <= 7 ? 0.25 : 0.1;
          if (Math.random() < aiBidChance) {
            // Use NPC farm bids: pick highest bid from eligible NPCs
            const { npcAuctionBid } = require('../engine/competitors');
            const parcelValue = lot.parcel.pricePerHa * lot.parcel.hectares;
            const npcBids = npcFarms
              .map(farm => npcAuctionBid(farm, parcelValue))
              .filter(bid => bid > lot.currentBid);
            const aiBid = npcBids.length > 0
              ? Math.max(...npcBids)
              : Math.ceil(lot.currentBid * (1.05 + Math.random() * 0.12));
            return {
              ...lot,
              currentBid: aiBid,
              bids: [...lot.bids, { day: newDay, amount: aiBid, isPlayer: false }],
            };
          }
```

**Part C — Update `set()` call** (around line 1451):

- [ ] **Step 3: Add the three new state fields to the `set({...})` call**

Find:
```typescript
          sellPressures,
          processedInventory: processedInventoryForSet,
          seedVault: nextSeedVault,
          hybridJobs: nextHybridJobs,
        });
```

Replace with:
```typescript
          sellPressures,
          processedInventory: processedInventoryForSet,
          seedVault: nextSeedVault,
          hybridJobs: nextHybridJobs,
          activeEvents,
          machineRepairs,
          npcFarms,
        });
```

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add NPC sells + NPC auction bids to advanceDay"
```

---

## Task 10: Add `startRepair` action + update `harvestCrop` + update `partialize`

**Files:**
- Modify: `store/useGameStore.ts`

**Part A — `startRepair` action** (add after `clearBreedingPair` action, around line 2441):

- [ ] **Step 1: Add the `startRepair` action**

```typescript
      startRepair: (machineId) => {
        const state = get();
        const repair = (state.machineRepairs ?? []).find(
          r => r.machineId === machineId && r.startDay === null
        );
        if (!repair) return; // no pending repair for this machine
        const { calcRepairDays } = require('../engine/events');
        const repairDays = calcRepairDays(state.workers ?? []);
        const totalCost = Math.max(0, repair.cost - repair.insurancePaid);
        if (state.money < totalCost) return;
        set({
          money: state.money - totalCost,
          machineRepairs: (state.machineRepairs ?? []).map(r =>
            r.machineId === machineId && r.startDay === null
              ? { ...r, startDay: state.day, readyDay: state.day + repairDays }
              : r
          ),
        });
      },
```

**Part B — Update `harvestCrop`** to apply random event harvest modifier (around line 1563):

- [ ] **Step 2: Update the `units` calculation in `harvestCrop`**

Find:
```typescript
        const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod * seedGenes.yield), siloCapacity - totalInventory);
```

Replace with:
```typescript
        const { getHarvestModifier } = require('../engine/events');
        const repairingIdsHarvest = new Set(
          (state.machineRepairs ?? [])
            .filter(r => r.readyDay === null || r.readyDay > state.day)
            .map(r => r.machineId)
        );
        const yieldBonusWithRepair = getMachineYieldBonus(state.machines, repairingIdsHarvest);
        const randomEventMod = getHarvestModifier(
          state.activeEvents ?? [],
          parcelId,
          crop.cropId
        );
        const units = Math.min(
          Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod * seedGenes.yield * randomEventMod),
          siloCapacity - totalInventory
        );
```

> Also update the `yieldBonus` variable earlier in `harvestCrop` (around line 1549) to use `yieldBonusWithRepair` instead of `getMachineYieldBonus(state.machines)`. The `rawUnits` call on line ~1551 uses `yieldBonus` — change that argument to `yieldBonusWithRepair`.

**Part C — Update `partialize`** to exclude `startRepair`:

- [ ] **Step 3: Add `startRepair` to the destructure list in `partialize`**

Find:
```typescript
          startHybridization, selectSeedForParcel,
```

Replace with:
```typescript
          startHybridization, selectSeedForParcel, startRepair,
```

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add startRepair action, apply event harvest modifier in harvestCrop"
```

---

## Task 11: Create `components/EventBanner.tsx`

**Files:**
- Create: `components/EventBanner.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore, GameEvent } from '../store/useGameStore';

function severityColor(type: string): string {
  if (['weather_frost','weather_heatwave','weather_hailstorm','pest_outbreak','animal_illness','equipment_failure'].includes(type))
    return '#ef5350';
  if (['market_surge','windfall_subsidy','windfall_soil','windfall_harvest'].includes(type))
    return '#66bb6a';
  return '#ffb74d';
}

export default function EventBanner() {
  const activeEvents = useGameStore(s => s.activeEvents ?? []);
  const machineRepairs = useGameStore(s => s.machineRepairs ?? []);
  const day = useGameStore(s => s.day);
  const [expanded, setExpanded] = useState(false);

  const pendingRepairs = machineRepairs.filter(r => r.startDay === null);
  const inProgressRepairs = machineRepairs.filter(r => r.startDay !== null && r.readyDay !== null);

  const totalBadge = activeEvents.length + pendingRepairs.length + inProgressRepairs.length;
  if (totalBadge === 0) return null;

  const mostSevere = activeEvents[0];

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.bar} onPress={() => setExpanded(e => !e)}>
        <Text style={styles.barIcon}>{mostSevere?.icon ?? '⚙️'}</Text>
        <Text style={styles.barText} numberOfLines={1}>
          {mostSevere ? mostSevere.title : pendingRepairs.length > 0 ? 'Machine needs repair' : 'Repair in progress'}
          {totalBadge > 1 ? ` +${totalBadge - 1} more` : ''}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {activeEvents.map((e: GameEvent) => (
            <View key={e.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>{e.icon}</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: severityColor(e.type) }]}>{e.title}</Text>
                <Text style={styles.eventDetail}>
                  {e.description} · {e.expiresDay - day}d remaining
                </Text>
              </View>
            </View>
          ))}
          {pendingRepairs.map(r => (
            <View key={r.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>⚙️</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: '#ef5350' }]}>Machine broken</Text>
                <Text style={styles.eventDetail}>
                  Repair cost: ${r.cost.toLocaleString()}
                  {r.insurancePaid > 0 ? ` (insurance covers $${r.insurancePaid.toLocaleString()})` : ''}
                  {' '}· Go to Machinery tab
                </Text>
              </View>
            </View>
          ))}
          {inProgressRepairs.map(r => (
            <View key={r.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>🔧</Text>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: '#ffb74d' }]}>Repair in progress</Text>
                <Text style={styles.eventDetail}>
                  Ready in {Math.max(0, (r.readyDay ?? 0) - day)}d
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#333' },
  bar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 8 },
  barIcon:     { fontSize: 16 },
  barText:     { flex: 1, color: '#ffb74d', fontSize: 12, fontWeight: 'bold' },
  chevron:     { color: '#666', fontSize: 11 },
  list:        { maxHeight: 200, paddingHorizontal: 12, paddingBottom: 8 },
  eventRow:    { flexDirection: 'row', gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#222' },
  eventIcon:   { fontSize: 18, width: 24 },
  eventInfo:   { flex: 1 },
  eventTitle:  { fontSize: 12, fontWeight: 'bold' },
  eventDetail: { fontSize: 11, color: '#888', marginTop: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/EventBanner.tsx
git commit -m "feat: add EventBanner component — shows active events and machine repairs"
```

---

## Task 12: Add EventBanner to the main layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Import EventBanner**

Add to the import block at the top:
```typescript
import EventBanner from '../../components/EventBanner';
```

- [ ] **Step 2: Add `<EventBanner />` between `<GameHUD />` and `<Tabs>`**

Find:
```typescript
      {/* Persistent status bar */}
      <GameHUD />

      <Tabs
```

Replace with:
```typescript
      {/* Persistent status bar */}
      <GameHUD />
      <EventBanner />

      <Tabs
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: add EventBanner to main tab layout"
```

---

## Task 13: Add Insurance + Competitors sections to `oficina.tsx`

**Files:**
- Modify: `app/(tabs)/oficina.tsx`

- [ ] **Step 1: Add imports at the top of `oficina.tsx`**

```typescript
import { INSURANCE_PLANS, InsuranceType } from '../../data/insuranceTypes';
import { CROP_TYPES } from '../../data/cropTypes';
```

(These may already be imported. Check and skip if present.)

- [ ] **Step 2: Add `InsuranceSection` component** — copy the entire body of `seguros.tsx`'s `SegurosScreen` into `oficina.tsx` as a named function component. Add it before the `// ── Main Screen ──` comment:

```typescript
// ── Insurance Section ────────────────────────────────────────────────────────
function InsuranceSection() {
  const {
    day, money, insurances, insuranceClaims,
    buyInsurance, cancelInsurance,
  } = useGameStore();

  const totalPremiumPerDay = insurances
    .filter(p => p.active)
    .reduce((s, p) => {
      const plan = INSURANCE_PLANS.find(pl => pl.type === p.type);
      return s + (plan?.premiumPerDay ?? 0);
    }, 0);

  const totalPayouts = insuranceClaims.reduce((s, c) => s + c.payout, 0);
  const recentClaims = [...insuranceClaims].reverse().slice(0, 20);

  function getPolicyForType(type: InsuranceType) {
    return insurances.find(p => p.type === type && p.active) ?? null;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      {/* Summary */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#888', fontSize: 11 }}>Daily premium</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>${totalPremiumPerDay}/day</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#888', fontSize: 11 }}>Total paid out</Text>
          <Text style={{ color: '#81c784', fontSize: 16, fontWeight: 'bold' }}>${totalPayouts.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Available policies</Text>
      {INSURANCE_PLANS.map(plan => {
        const activePolicy = getPolicyForType(plan.type);
        const active = activePolicy !== null;
        return (
          <View key={plan.type} style={{ backgroundColor: active ? '#0f3460' : '#16213e', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: active ? 1 : 0, borderColor: '#4fc3f7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 24 }}>{plan.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#e8d5a3', fontSize: 14, fontWeight: 'bold' }}>{plan.name}</Text>
                <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{plan.description}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>Premium</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>${plan.premiumPerDay}/day</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>Coverage</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{Math.round(plan.coveragePercent * 100)}%</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>Status</Text>
                <Text style={{ color: active ? '#66bb6a' : '#888', fontSize: 13, fontWeight: 'bold' }}>{active ? '✅ Active' : '—'}</Text>
              </View>
            </View>
            {active ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#888', fontSize: 11 }}>
                  Since day {activePolicy!.startDay} · ${plan.premiumPerDay * (day - activePolicy!.startDay)} paid
                </Text>
                <TouchableOpacity
                  onPress={() => cancelInsurance(activePolicy!.id)}
                  style={{ backgroundColor: '#c62828', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => money >= plan.premiumPerDay && buyInsurance(plan.type)}
                style={{ backgroundColor: money >= plan.premiumPerDay ? '#1565c0' : '#333', borderRadius: 6, padding: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  Activate — ${plan.premiumPerDay}/day
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {recentClaims.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Recent claims</Text>
          {recentClaims.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#222' }}>
              <Text style={{ color: '#ccc', fontSize: 12 }}>Day {c.day} · {c.description}</Text>
              <Text style={{ color: '#81c784', fontSize: 12, fontWeight: 'bold' }}>+${c.payout.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Competitors Section ──────────────────────────────────────────────────────
function CompetitorsSection() {
  const { npcFarms = [], sellPressures = [], day } = useGameStore();

  function wealthLabel(wealth: number): string {
    if (wealth < 10000) return 'Low';
    if (wealth < 30000) return 'Medium';
    return 'High';
  }

  function wealthColor(wealth: number): string {
    if (wealth < 10000) return '#66bb6a';
    if (wealth < 30000) return '#ffb74d';
    return '#ef5350';
  }

  function activePressure(farm: any): string | null {
    for (const crop of farm.specialization) {
      const sp = sellPressures.find((s: any) => s.cropId === crop && s.expiresDay >= day);
      if (sp) return crop;
    }
    return null;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
        Competitor farms apply sell pressure to the market and bid at auction.
      </Text>
      {npcFarms.map((farm: any) => {
        const pressure = activePressure(farm);
        return (
          <View key={farm.id} style={{ backgroundColor: '#16213e', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#e8d5a3', fontSize: 14, fontWeight: 'bold' }}>{farm.name}</Text>
                <View style={{ backgroundColor: farm.tier === 3 ? '#c62828' : farm.tier === 2 ? '#f57f17' : '#1b5e20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Tier {farm.tier}</Text>
                </View>
              </View>
              <Text style={{ color: wealthColor(farm.wealth), fontSize: 12, fontWeight: 'bold' }}>
                {wealthLabel(farm.wealth)} wealth
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {farm.specialization.map((cropId: string) => {
                const crop = CROP_TYPES.find(c => c.id === cropId);
                return (
                  <View key={cropId} style={{ backgroundColor: '#0f3460', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#ccc', fontSize: 11 }}>{crop?.name ?? cropId}</Text>
                  </View>
                );
              })}
            </View>
            {pressure && (
              <Text style={{ color: '#ef9a9a', fontSize: 11 }}>
                ⚠️ Currently pushing {CROP_TYPES.find(c => c.id === pressure)?.name ?? pressure} — price depressed
              </Text>
            )}
            <Text style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
              Sells every {farm.sellIntervalDays}d · next in {Math.max(0, farm.nextSellDay - day)}d
            </Text>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 3: Update `OfficeTab` type and tab bar** in `oficina.tsx`

Find:
```typescript
type OfficeTab = 'banking' | 'contracts' | 'reputation' | 'milestones';
```

Replace with:
```typescript
type OfficeTab = 'banking' | 'contracts' | 'reputation' | 'milestones' | 'insurance' | 'competitors';
```

Find the tab definitions array:
```typescript
          { id: 'banking',    label: '🏦 Bank' },
          { id: 'contracts',  label: '📋 Contracts' },
          { id: 'reputation', label: '⭐ Farm' },
          { id: 'milestones', label: '🏆 Goals' },
```

Replace with:
```typescript
          { id: 'banking',     label: '🏦 Bank' },
          { id: 'contracts',   label: '📋 Contracts' },
          { id: 'reputation',  label: '⭐ Farm' },
          { id: 'milestones',  label: '🏆 Goals' },
          { id: 'insurance',   label: '🌦️ Insurance' },
          { id: 'competitors', label: '🏭 Rivals' },
```

Find:
```typescript
        {activeTab === 'banking'    && <BankingSection />}
        {activeTab === 'contracts'  && <ContractsSection />}
        {activeTab === 'reputation' && <ReputationSection />}
        {activeTab === 'milestones' && <MilestonesSection />}
```

Replace with:
```typescript
        {activeTab === 'banking'     && <BankingSection />}
        {activeTab === 'contracts'   && <ContractsSection />}
        {activeTab === 'reputation'  && <ReputationSection />}
        {activeTab === 'milestones'  && <MilestonesSection />}
        {activeTab === 'insurance'   && <InsuranceSection />}
        {activeTab === 'competitors' && <CompetitorsSection />}
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/oficina.tsx
git commit -m "feat: add Insurance and Competitors tabs to Office screen"
```

---

## Task 14: Add repair UI to `maquinaria.tsx`

**Files:**
- Modify: `app/(tabs)/maquinaria.tsx`

- [ ] **Step 1: Add `machineRepairs` and `startRepair` to the store destructure at the top of the screen**

Find the `useGameStore()` call in `maquinaria.tsx` and add `machineRepairs` and `startRepair`:

```typescript
  const { ..., machineRepairs = [], startRepair } = useGameStore();
```

- [ ] **Step 2: Add repair status to each machine card**

In the machine list render, for each machine item, add a repair status block. Insert after the machine name/stats and before the sell button (pattern varies by file — find where machine cards are rendered and add):

```typescript
  // Inside the machine card render, after existing stats:
  const repair = machineRepairs.find(r => r.machineId === machine.id);
  const isBroken = repair !== undefined;
  const repairInProgress = repair?.startDay !== null;
```

Then render conditionally:

```typescript
  {isBroken && !repairInProgress && (
    <View style={{ backgroundColor: '#2d1b1b', borderRadius: 8, padding: 10, marginTop: 8 }}>
      <Text style={{ color: '#ef5350', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
        ⚠️ Machine broken — running at 50% yield
      </Text>
      <Text style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>
        Repair cost: ${repair!.cost.toLocaleString()}
        {repair!.insurancePaid > 0 ? ` (insurance covers $${repair!.insurancePaid.toLocaleString()})` : ''}
        {' '}· Net: ${Math.max(0, repair!.cost - repair!.insurancePaid).toLocaleString()}
      </Text>
      <TouchableOpacity
        onPress={() => startRepair(machine.id)}
        style={{
          backgroundColor: money >= Math.max(0, repair!.cost - repair!.insurancePaid) ? '#1565c0' : '#333',
          borderRadius: 6, padding: 8, alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
          Start Repair — {day => day} days
        </Text>
      </TouchableOpacity>
    </View>
  )}
  {isBroken && repairInProgress && (
    <View style={{ backgroundColor: '#1b2d1b', borderRadius: 8, padding: 10, marginTop: 8 }}>
      <Text style={{ color: '#ffb74d', fontSize: 12, fontWeight: 'bold' }}>
        🔧 Repair in progress — {Math.max(0, (repair!.readyDay ?? 0) - day)} days remaining
      </Text>
      <Text style={{ color: '#888', fontSize: 11 }}>Machine running at 50% yield until complete</Text>
    </View>
  )}
```

> **Note on repair days display:** To show the estimated repair days in the "Start Repair" button before starting, compute it inline: `const repDays = workers.some(w => w.typeId === 'engineer') ? 2 : workers.some(w => w.typeId === 'mechanic') ? 3 : 5;` where `workers` comes from `useGameStore`.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/maquinaria.tsx
git commit -m "feat: add machine repair UI to Machinery tab"
```

---

## Task 15: Delete `seguros.tsx` and verify

**Files:**
- Delete: `app/(tabs)/seguros.tsx` (already hidden via `href: null` in `_layout.tsx`)

- [ ] **Step 1: Delete the file**

```bash
rm "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/app/(tabs)/seguros.tsx"
```

- [ ] **Step 2: Start the dev server and verify**

```bash
cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon"
CI=1 npx expo start --web
```

Open `http://localhost:8081/(tabs)/tierras` and verify:

- [ ] Advance Day several times — check day summary shows no TypeScript errors in console
- [ ] Check Office tab → Insurance sub-tab shows 4 plans (clima, plaga, incendio, maquinaria)
- [ ] Check Office tab → Rivals sub-tab shows 5 NPC farms
- [ ] Advance ~10 days — EventBanner should eventually appear when a random event fires
- [ ] If a machine failure event fires → go to Machinery tab → "Machine broken" banner should show → click Start Repair

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: remove seguros standalone tab — insurance moved to Office"
```

---

## Self-Review Notes

- Storage key: spec said v4→v5 but store was already at v5 — plan correctly bumps to **v6**
- `seguros` was already `href: null` — no `_layout.tsx` change needed beyond deleting the file
- `moneyDelta` scoping in Task 8: the random event block must run after `let moneyDelta = 0` is declared at the auction section (~line 1010). Insert after the fire event block and before the field events block. Ensure `newClaims` array is in scope (declared at ~line 794).
- `getMachineYieldBonus` is called in three places — Task 7 updates all three
- The `windfall_subsidy` modifier is a flat cash amount (2500), not a multiplier — handled specially in Task 8
- `MACHINE_TYPES` is imported at the top of the store as a named import — use the existing import, don't add a duplicate
