# Design Spec: Random Events & NPC Competitor Farms

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Two systems that add unpredictability and competitive pressure to Granja Tycoon:

1. **Random Events** — short-lived gameplay events that fire each day (8% chance) and directly affect farm operations: weather extremes, pest outbreaks, equipment failures, market surges, animal illness, and windfalls.
2. **NPC Competitor Farms** — simulated rival farms that apply sell pressure to the market and bid against the player at auction.

Architecture follows Approach B: pure engine functions in `engine/`, static definitions in `data/`, thin store integration.

---

## Save Version

Storage key bumps from `granja-tycoon-save-v4` → `granja-tycoon-save-v5`. Old saves are wiped (no migration). This is required because `InsuranceType` changes are not backwards-compatible.

---

## 1. Data Files

### `data/randomEvents.ts`

Defines all event templates. Pattern mirrors `data/newsEventTemplates.ts`.

```typescript
export type GameEventType =
  | 'weather_frost'
  | 'weather_heatwave'
  | 'weather_hailstorm'
  | 'pest_outbreak'
  | 'market_surge'
  | 'equipment_failure'
  | 'animal_illness'
  | 'windfall';

export interface GameEventTemplate {
  id: string;
  type: GameEventType;
  icon: string;
  title: string;
  description: string;
  durationDays: number;
  weight: number;      // relative probability weight
  modifier?: number;   // yield/price multiplier where applicable
}

export const RANDOM_EVENT_TEMPLATES: GameEventTemplate[] = [
  // Weather extremes
  { id: 'e01', type: 'weather_frost',     icon: '🧊', title: 'Sudden Frost',        description: 'An unexpected frost damages exposed crops.',            durationDays: 3,  weight: 10, modifier: 0.50 },
  { id: 'e02', type: 'weather_heatwave',  icon: '🥵', title: 'Heatwave',             description: 'Extreme heat stresses crops and reduces yield.',        durationDays: 5,  weight: 8,  modifier: 0.65 },
  { id: 'e03', type: 'weather_hailstorm', icon: '🌨️', title: 'Hailstorm',            description: 'Hail batters several parcels, cutting yields.',         durationDays: 2,  weight: 6,  modifier: 0.40 },
  // Pest / disease
  { id: 'e04', type: 'pest_outbreak',     icon: '🦗', title: 'Pest Outbreak',        description: 'A pest surge hits your fields and lowers crop value.',   durationDays: 7,  weight: 12, modifier: 0.50 },
  // Market
  { id: 'e05', type: 'market_surge',      icon: '📈', title: 'Demand Shock',         description: 'A sudden surge in demand spikes a crop\'s price.',      durationDays: 4,  weight: 10, modifier: 1.60 },
  // Equipment
  { id: 'e06', type: 'equipment_failure', icon: '⚙️', title: 'Equipment Failure',    description: 'A machine breaks down and needs repair.',               durationDays: 0,  weight: 8  },
  // durationDays: 0 — equipment_failure does not create a timed GameEvent in activeEvents.
  // Instead it creates a MachineRepair entry directly. The event is shown in the day summary only.
  // Animal
  { id: 'e07', type: 'animal_illness',    icon: '🐄', title: 'Animal Illness',       description: 'One of your animals falls ill regardless of hardiness.', durationDays: 5,  weight: 6  },
  // Windfall
  { id: 'e08', type: 'windfall',          icon: '🍀', title: 'Government Subsidy',   description: 'A surprise subsidy boosts your cash reserves.',         durationDays: 1,  weight: 5,  modifier: 1.0 },
  { id: 'e09', type: 'windfall',          icon: '🌱', title: 'Bumper Soil Conditions', description: 'Exceptional soil conditions boost fertility on your plots.', durationDays: 7, weight: 4, modifier: 1.25 },
  { id: 'e10', type: 'windfall',          icon: '🎯', title: 'Lucky Harvest Bonus',  description: 'Exceptional conditions grant a surprise yield bonus.',   durationDays: 5,  weight: 4,  modifier: 1.30 },
];
```

### `data/npcFarms.ts`

Starting definitions for NPC farms. Initialized into `npcFarms` state on new game.

```typescript
export interface NPCFarmDefinition {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[];  // cropIds they favor
  sellIntervalDays: number;  // tier 1=10, tier 2=6, tier 3=3
  startingWealth: number;
}

export const NPC_FARM_DEFINITIONS: NPCFarmDefinition[] = [
  { id: 'npc_rivera',  name: 'Rivera Ranch',       tier: 1, specialization: ['wheat', 'corn'],             sellIntervalDays: 10, startingWealth: 5000  },
  { id: 'npc_golden',  name: 'Golden Valley Co.',  tier: 2, specialization: ['soy', 'sunflower'],          sellIntervalDays: 6,  startingWealth: 15000 },
  { id: 'npc_sierra',  name: 'Sierra Agro',        tier: 3, specialization: ['cotton', 'rice', 'sugarbeet'], sellIntervalDays: 3, startingWealth: 40000 },
  { id: 'npc_verde',   name: 'Verde Fields',       tier: 1, specialization: ['barley', 'oats'],            sellIntervalDays: 10, startingWealth: 4000  },
  { id: 'npc_altavista', name: 'Altavista Farms',  tier: 2, specialization: ['potatoes', 'rapeseed'],      sellIntervalDays: 6,  startingWealth: 12000 },
];
```

### `data/insuranceTypes.ts` — updated

`InsuranceType` changes:
- Remove: `'sequia'`, `'helada'`
- Add: `'clima'`, `'maquinaria'`
- Keep: `'plaga'`, `'incendio'`

New plans:

| Type | Name | Icon | Premium/day | Coverage | Triggers |
|---|---|---|---|---|---|
| `clima` | Weather Insurance | 🌦️ | $30 | 70% | `weather_frost`, `weather_heatwave`, `weather_hailstorm`, drought, frost, hail |
| `plaga` | Pest Insurance | 🐛 | $10 | 60% | `pest_outbreak`, pest, disease |
| `incendio` | Fire Insurance | 🔥 | $28 | 85% | fire |
| `maquinaria` | Machinery Insurance | ⚙️ | $25 | 75% | `equipment_failure` |

---

## 2. Engine Files

### `engine/events.ts`

Pure functions only. No store access.

```typescript
// Roll for a new event. Returns null if no event fires or type already active.
export function rollEvent(day: number, activeEvents: GameEvent[]): GameEventTemplate | null

// Yield modifier from active weather/pest events for a given parcel+crop.
// Returns a multiplier (e.g. 0.5 for frost). Returns 1.0 if no relevant events.
export function getHarvestModifier(activeEvents: GameEvent[], parcelId: string, cropId: string): number

// Production modifier for an animal from active illness events.
export function getProductionModifier(activeEvents: GameEvent[], animalId: string): number

// Price modifier for a crop from active market_surge or pest_outbreak events.
export function getPriceModifier(activeEvents: GameEvent[], cropId: string): number

// Repair cost based on machine type value. Scales with machine tier.
export function calcRepairCost(machine: OwnedMachine): number

// Repair duration in days based on available workers.
// No mechanic: 5 days · mechanic: 3 days · engineer: 2 days
export function calcRepairDays(workers: OwnedWorker[]): number
```

Event rolling uses weighted random selection. `affectedIds` semantics by event type:

| Event type | `affectedIds` content |
|---|---|
| `weather_frost`, `weather_heatwave`, `weather_hailstorm` | 1–3 random owned parcel IDs |
| `pest_outbreak` | single cropId (the affected crop type) |
| `market_surge` | single cropId (the benefiting crop) |
| `equipment_failure` | single machine ID (but event not stored in `activeEvents` — see MachineRepair) |
| `animal_illness` | single animal ID |
| `windfall` | empty |

`pest_outbreak` applies **both** a price modifier (−50% for affected cropId via `getPriceModifier`) and a yield modifier (−50% for any parcel planted with that cropId via `getHarvestModifier`). The `affectedIds[0]` is the cropId in both cases.

### `engine/competitors.ts`

Pure functions only.

```typescript
// Volume of a crop sold by an NPC this tick. Scales with tier and wealth.
export function npcSellVolume(farm: NPCFarm, day: number): number

// Bid an NPC will place on an auction parcel. Based on tier + wealth.
// Returns 0 if NPC wealth is too low to compete.
export function npcAuctionBid(farm: NPCFarm, parcelValue: number): number

// Build initial runtime NPCFarm[] from definitions (sets nextSellDay = sellIntervalDays).
export function initNpcFarms(): NPCFarm[]
```

---

## 3. State Changes (`store/useGameStore.ts`)

### New interfaces

```typescript
export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  description: string;
  icon: string;
  expiresDay: number;    // day on which this event expires (0 = immediate/one-shot)
  affectedIds?: string[]; // parcel IDs, animal IDs, machine IDs, or crop IDs
  modifier?: number;
}

export interface MachineRepair {
  id: string;
  machineId: string;
  startDay: number | null;  // null = not yet started (machine broken, awaiting player action)
  readyDay: number | null;  // null until startRepair() called
  cost: number;
  insurancePaid: number;    // amount covered by maquinaria insurance (0 if not insured)
}

export interface NPCFarm {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[];
  sellIntervalDays: number;
  nextSellDay: number;
  wealth: number;
}
```

### New `GameState` fields

```typescript
activeEvents: GameEvent[];
machineRepairs: MachineRepair[];
npcFarms: NPCFarm[];
```

### New actions

```typescript
startRepair: (machineId: string) => void;
// Charges cost - insurancePaid, sets startDay = day, computes readyDay.
// No-op if machine already has an active repair in progress.
```

### `advanceDay()` additions (in order)

1. **Tick down active events** — decrement `expiresDay`, remove expired ones
2. **Roll new event** (8% chance) — call `rollEvent()`, create `GameEvent`, push to `activeEvents`
3. **Handle event side effects:**
   - `equipment_failure` → create `MachineRepair` entry with `startDay: null`
   - `animal_illness` → call `treatAnimal` equivalent (mark animal sick)
   - `windfall` (subsidy) → add money directly
   - `market_surge` → apply price modifier to relevant crop
   - Weather/pest events affect harvest via engine hooks (no immediate action needed)
4. **Insurance check** — if event type maps to an active insurance policy, create an `InsuranceClaim`
5. **Check machine repairs** — for each `MachineRepair` where `readyDay !== null && day >= readyDay`, clear the repair entry (machine restored)
6. **NPC sells** — for each `NPCFarm` where `nextSellDay <= day`: call `npcSellVolume()`, push a `sellPressure` entry, update `nextSellDay`, grow `wealth` slightly
7. **NPC auction bids** — when resolving auction lots, call `npcAuctionBid()` for each NPC farm and use the highest as the competing bid (replaces current random NPC bid logic)

### Engine hook integration

- `harvestCrop()` and `harvestAllReady()` — multiply yield by `getHarvestModifier(activeEvents, parcelId, cropId)`
- `collectAnimalProduction()` and `collectAllProduction()` — multiply output by `getProductionModifier(activeEvents, animalId)`
- Price display and sell revenue — apply `getPriceModifier(activeEvents, cropId)` on top of news event modifiers
- `getMachineYieldBonus()` helper — if machine has an active `MachineRepair` with `startDay !== null` (repair in progress), return `bonus * 0.5`; if `startDay === null` (broken, not started), return `bonus * 0.5` as well

---

## 4. UI Changes

### Notification banner (`components/EventBanner.tsx` — new)

- Shown at the top of every tab when `activeEvents.length > 0`
- Displays the most severe active event with icon + title
- Tappable to expand full event list
- Each event shows days remaining

### Economy tab (`economia.tsx`)

- Existing news feed retained
- New "Active Events" section below it: icon · title · days remaining · severity color

### Machinery tab (`maquinaria.tsx`)

- Broken machines show ⚠️ badge
- "Repair" button shows cost and estimated days
- If repair is in progress: shows "Repairing — N days left" (no button)
- If no mechanic hired: repair cost is higher, repair takes 5 days (shown in button label)

### Office tab (`oficina.tsx`)

Internal tab bar gains two new tabs:

| Tab | Content |
|---|---|
| `banking` | existing |
| `contracts` | existing |
| `reputation` | existing |
| `insurance` | `InsuranceSection` — content moved from `seguros.tsx`. Shows `clima`, `plaga`, `incendio`, `maquinaria` plans. |
| `competitors` | `CompetitorsSection` — NPC farm list with name, tier badge, specialty crop icons, wealth level (low/medium/high), and current sell pressure indicator |

### Tab bar (`_layout.tsx`)

- `seguros` tab removed from main tab bar
- Tab count: 10 → 9

---

## 5. Insurance Interaction Summary

| Event type | Insurance triggered | Payout basis |
|---|---|---|
| `weather_frost`, `weather_heatwave`, `weather_hailstorm` | `clima` | estimated crop loss × 70% |
| `pest_outbreak` | `plaga` | estimated crop loss × 60% |
| `equipment_failure` | `maquinaria` | repair cost × 75% |
| `market_surge`, `animal_illness`, `windfall` | none | — |

---

## 6. Files Changed / Created

| File | Change |
|---|---|
| `data/randomEvents.ts` | **new** |
| `data/npcFarms.ts` | **new** |
| `data/insuranceTypes.ts` | modified — add `clima`, `maquinaria`; remove `sequia`, `helada` |
| `engine/events.ts` | **new** |
| `engine/competitors.ts` | **new** |
| `store/useGameStore.ts` | new interfaces, new state fields, `startRepair` action, `advanceDay` additions, engine hook integration, storage key → `v5` |
| `components/EventBanner.tsx` | **new** |
| `app/(tabs)/oficina.tsx` | add `insurance` + `competitors` internal tabs |
| `app/(tabs)/economia.tsx` | add Active Events section |
| `app/(tabs)/maquinaria.tsx` | add repair UI |
| `app/(tabs)/seguros.tsx` | removed from tab bar (file can be deleted) |
| `app/(tabs)/_layout.tsx` | remove `seguros` tab |
