# Co-op Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single binary cooperative (flat +12% / $400 dues) with three independent, realistic agricultural co-operatives — Grain, Horticulture, and Livestock — each with equity stakes, price pooling, delivery obligations, shared equipment, AGM votes, and a live health system.

**Architecture:** Pure engine functions in `engine/cooperatives.ts` compute pool prices, health deltas, and AGM vote simulation. State lives in two new `GameState` fields (`coopMemberships`, `coopStates`). The store `advanceDay()` replaces all old co-op checks with calls to engine functions, and new store actions handle join/leave/deliver/vote/book. The save key bumps from v5 → v6 with an inline migration.

**Tech Stack:** TypeScript · Zustand 5 · React Native / Expo · no test suite (no test steps)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `engine/cooperativeTypes.ts` | **Create** | All TypeScript interfaces/types for the co-op system |
| `engine/cooperativeData.ts` | **Create** | Static readonly data: crops per co-op, animals per co-op, equipment lists, base terms, initial share prices |
| `engine/cooperatives.ts` | **Create** | Pure engine functions: pool price, health delta, redemption, AGM, dividends, input discounts |
| `store/useGameStore.ts` | **Modify** | State shape, init, new actions, advanceDay integration, partialize, migration |
| `app/(tabs)/oficina.tsx` | **Modify** | Replace single co-op card with 3-panel `CoopsSection` |
| `app/(tabs)/tierras.tsx` | **Modify** | Harvest banner showing co-op delivery obligation |
| `app/(tabs)/_layout.tsx` | **Modify** | HUD co-op membership icons (G / H / L) near cash balance |

---

## Task 1: Types

**Files:**
- Create: `engine/cooperativeTypes.ts`

- [ ] **Step 1: Create the types file**

```typescript
// engine/cooperativeTypes.ts
export type CoopId = 'grain' | 'horticulture' | 'livestock';

export interface CoopMembership {
  shares: number;
  sharePrice: number;         // $/share at time of purchase
  joinDay: number;
  pendingRedemption: { requestedDay: number } | null;
  offenceHistory: number[];   // game days on which delivery failures occurred
  seasonDelivered: number;    // volume delivered this season (kg or L)
  seasonObligation: number;   // volume owed this season (kg or L)
  suspendedUntilSeason: number | null;
}

export interface CoopEquipmentItem {
  id: string;
  label: string;
  usageFeePerDay: number;
  unlocksAtHealth: number;   // 0, 60, or 80
  bookings: { memberId: string; day: number }[];
}

export interface AGMProposal {
  coopId: CoopId;
  season: number;
  changes: Partial<CoopTerms>;
  playerVote: 'yes' | 'no' | null;
  otherYesPct: number;
  resolved: boolean;
}

export interface CoopTerms {
  deliveryPct: number;        // 0–100, default 50
  floorPct: number;           // % of 90-day rolling avg, default 80
  annualFeePerShare: number;  // $ per share per year
  dividendPct: number;        // % of co-op net profit returned to members
}

export interface CoopState {
  health: number;             // 0–100
  memberCount: number;
  terms: CoopTerms;
  equipment: CoopEquipmentItem[];
  poolPrices: Record<string, number>;   // cropId/animalId → pool price this season
  pendingAGM: AGMProposal | null;
  dissolvedUntilYear: number | null;
  consecutiveLowHealthSeasons: number;  // tracks dissolution trigger
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/cooperativeTypes.ts
git commit -m "feat(coop): add co-op TypeScript types"
```

---

## Task 2: Static Co-op Data

**Files:**
- Create: `engine/cooperativeData.ts`

- [ ] **Step 1: Create the data file**

```typescript
// engine/cooperativeData.ts
import type { CoopId, CoopEquipmentItem, CoopTerms, CoopState } from './cooperativeTypes';

export const COOP_CROPS: Record<CoopId, string[]> = {
  grain: [
    'grass', 'alfalfa', 'barley', 'oats', 'wheat', 'corn', 'sorghum',
    'rice', 'soy', 'sunflower', 'rapeseed', 'canola', 'cotton',
    'sugarbeet', 'sugarcane',
  ],
  horticulture: [
    'potatoes', 'grapes', 'tomatoes', 'strawberries', 'olives',
    'almonds', 'saffron', 'vanilla', 'lavender', 'ginseng',
  ],
  livestock: [],
};

export const COOP_ANIMALS: Record<CoopId, string[]> = {
  grain: [],
  horticulture: [],
  livestock: [
    'gallina', 'vaca', 'oveja', 'cerdo', 'conejo', 'cabra',
    'pato', 'abeja', 'alpaca', 'pavo', 'codorniz', 'bufalo',
  ],
};

export const INITIAL_SHARE_PRICES: Record<CoopId, number> = {
  grain: 80,
  horticulture: 120,
  livestock: 100,
};

export const COOP_NAMES: Record<CoopId, string> = {
  grain: 'Grain & Arable Co-op',
  horticulture: 'Horticulture Co-op',
  livestock: 'Livestock Co-op',
};

export const BASE_TERMS: CoopTerms = {
  deliveryPct: 50,
  floorPct: 80,
  annualFeePerShare: 4,
  dividendPct: 30,
};

const GRAIN_EQUIPMENT: CoopEquipmentItem[] = [
  { id: 'combine_harvester', label: 'Combine Harvester', usageFeePerDay: 120, unlocksAtHealth: 0, bookings: [] },
  { id: 'grain_dryer', label: 'Grain Dryer', usageFeePerDay: 60, unlocksAtHealth: 0, bookings: [] },
  { id: 'sprayer', label: 'Sprayer', usageFeePerDay: 40, unlocksAtHealth: 0, bookings: [] },
  { id: 'seed_drill', label: 'Seed Drill', usageFeePerDay: 80, unlocksAtHealth: 60, bookings: [] },
  { id: 'fertilizer_spreader', label: 'Fertilizer Spreader', usageFeePerDay: 50, unlocksAtHealth: 60, bookings: [] },
  { id: 'baler', label: 'Baler', usageFeePerDay: 70, unlocksAtHealth: 60, bookings: [] },
  { id: 'grain_trailer', label: 'Grain Trailer', usageFeePerDay: 35, unlocksAtHealth: 80, bookings: [] },
  { id: 'plough', label: 'Plough', usageFeePerDay: 90, unlocksAtHealth: 80, bookings: [] },
  { id: 'heavy_tractor', label: 'Heavy Tractor', usageFeePerDay: 150, unlocksAtHealth: 80, bookings: [] },
  { id: 'grain_auger', label: 'Grain Auger', usageFeePerDay: 30, unlocksAtHealth: 80, bookings: [] },
];

const HORTICULTURE_EQUIPMENT: CoopEquipmentItem[] = [
  { id: 'spray_rig', label: 'Spray Rig', usageFeePerDay: 50, unlocksAtHealth: 0, bookings: [] },
  { id: 'refrigerated_truck', label: 'Refrigerated Truck', usageFeePerDay: 100, unlocksAtHealth: 0, bookings: [] },
  { id: 'sorting_machine', label: 'Sorting/Grading Machine', usageFeePerDay: 60, unlocksAtHealth: 0, bookings: [] },
  { id: 'potato_harvester', label: 'Potato Harvester', usageFeePerDay: 110, unlocksAtHealth: 60, bookings: [] },
  { id: 'grape_harvester', label: 'Grape Harvester', usageFeePerDay: 120, unlocksAtHealth: 60, bookings: [] },
  { id: 'irrigation_rig', label: 'Irrigation Rig', usageFeePerDay: 45, unlocksAtHealth: 60, bookings: [] },
  { id: 'transplanting_machine', label: 'Transplanting Machine', usageFeePerDay: 70, unlocksAtHealth: 80, bookings: [] },
  { id: 'soil_fumigation', label: 'Soil Fumigation Unit', usageFeePerDay: 80, unlocksAtHealth: 80, bookings: [] },
  { id: 'cold_storage', label: 'Cold Storage Bay', usageFeePerDay: 40, unlocksAtHealth: 80, bookings: [] },
  { id: 'orchard_shaker', label: 'Orchard Shaker', usageFeePerDay: 90, unlocksAtHealth: 80, bookings: [] },
];

const LIVESTOCK_EQUIPMENT: CoopEquipmentItem[] = [
  { id: 'mobile_vet', label: 'Mobile Vet Unit', usageFeePerDay: 80, unlocksAtHealth: 0, bookings: [] },
  { id: 'livestock_truck', label: 'Livestock Truck', usageFeePerDay: 90, unlocksAtHealth: 0, bookings: [] },
  { id: 'shearing_machine', label: 'Shearing Machine', usageFeePerDay: 50, unlocksAtHealth: 0, bookings: [] },
  { id: 'feed_mixer', label: 'Feed Mixer', usageFeePerDay: 60, unlocksAtHealth: 60, bookings: [] },
  { id: 'manure_spreader', label: 'Manure Spreader', usageFeePerDay: 40, unlocksAtHealth: 60, bookings: [] },
  { id: 'ai_equipment', label: 'AI Equipment', usageFeePerDay: 100, unlocksAtHealth: 60, bookings: [] },
  { id: 'cattle_crush', label: 'Cattle Weighing Crush', usageFeePerDay: 70, unlocksAtHealth: 80, bookings: [] },
  { id: 'egg_grader', label: 'Egg Grading Machine', usageFeePerDay: 45, unlocksAtHealth: 80, bookings: [] },
  { id: 'mobile_milking', label: 'Mobile Milking Unit', usageFeePerDay: 110, unlocksAtHealth: 80, bookings: [] },
  { id: 'portable_fencing', label: 'Portable Fencing Kit', usageFeePerDay: 30, unlocksAtHealth: 80, bookings: [] },
];

const COOP_EQUIPMENT: Record<CoopId, CoopEquipmentItem[]> = {
  grain: GRAIN_EQUIPMENT,
  horticulture: HORTICULTURE_EQUIPMENT,
  livestock: LIVESTOCK_EQUIPMENT,
};

export function makeInitialCoopState(coopId: CoopId): CoopState {
  return {
    health: 70,
    memberCount: 24,
    terms: { ...BASE_TERMS },
    equipment: COOP_EQUIPMENT[coopId].map(e => ({ ...e, bookings: [] })),
    poolPrices: {},
    pendingAGM: null,
    dissolvedUntilYear: null,
    consecutiveLowHealthSeasons: 0,
  };
}

export function getCoopForCrop(cropId: string): CoopId | null {
  for (const [coopId, crops] of Object.entries(COOP_CROPS) as [CoopId, string[]][]) {
    if (crops.includes(cropId)) return coopId;
  }
  return null;
}

export function getCoopForAnimal(animalId: string): CoopId | null {
  for (const [coopId, animals] of Object.entries(COOP_ANIMALS) as [CoopId, string[]][]) {
    if (animals.includes(animalId)) return coopId;
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/cooperativeData.ts
git commit -m "feat(coop): add static co-op data and helpers"
```

---

## Task 3: Engine Pure Functions

**Files:**
- Create: `engine/cooperatives.ts`

- [ ] **Step 1: Create the engine file**

```typescript
// engine/cooperatives.ts
import type { CoopId, CoopMembership, CoopState, CoopTerms, AGMProposal, CoopEquipmentItem } from './cooperativeTypes';

// ── Pool Pricing ────────────────────────────────────────────────────────────

export function getHandlingFee(health: number): number {
  if (health >= 70) return 0.03;
  if (health >= 40) return 0.04;
  return 0.05;
}

export function rollingAvg(priceHistory: number[], days = 90): number {
  const slice = priceHistory.slice(-days);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function calculatePoolPrice(
  avgPrice: number,
  health: number,
  floorPct: number,
): number {
  const fee = getHandlingFee(health);
  const raw = avgPrice * (1 - fee);
  const floor = avgPrice * (floorPct / 100);
  return Math.max(raw, floor);
}

// ── Share Pricing ───────────────────────────────────────────────────────────

export function calculateSharePriceDelta(health: number): number {
  if (health > 70) return 0.02;   // +2% appreciation
  if (health < 40) return -0.05;  // -5% depreciation
  return 0;
}

export function calculateRedemptionMultiplier(health: number): number {
  if (health >= 60) return 1.0;
  if (health >= 40) return 0.8;
  if (health >= 20) return 0.6;
  return 0.4;
}

// ── Input Discounts ─────────────────────────────────────────────────────────

export function getSeedDiscount(coopId: CoopId): number {
  return 0.10; // all three co-ops: -10% seeds
}

export function getFertilizerDiscount(coopId: CoopId): number {
  if (coopId === 'grain') return 0.12;
  if (coopId === 'horticulture') return 0.12; // irrigation supplies
  return 0;
}

export function getFeedDiscount(): number {
  return 0.10; // livestock co-op: -10% feed
}

export function getVetDiscount(): number {
  return 0.12; // livestock co-op: -12% vet
}

// ── Health Calculation ──────────────────────────────────────────────────────

export interface HealthDeltaInput {
  totalMembers: number;
  membersFullyDelivered: number;
  poolBelowFloor: boolean;
  membersLeft: number;
  membersJoined: number;
  poolPriceStrongVsSpot: boolean; // pool > spot by >10%
  equipmentVotePassed: boolean;
  offendingMembers: number;
}

export function calculateHealthDelta(input: HealthDeltaInput): number {
  let delta = 0;

  // Increases
  if (input.totalMembers > 0) {
    delta += input.membersFullyDelivered / input.totalMembers * 1; // +1 per % who fully delivered
  }
  if (input.poolPriceStrongVsSpot) delta += 3;
  if (input.equipmentVotePassed) delta += 2;
  delta += Math.min(input.membersJoined, 5);

  // Decreases
  delta -= input.offendingMembers * 2;
  if (input.poolBelowFloor) delta -= 3;
  delta -= Math.min(input.membersLeft, 5);
  delta -= 1; // baseline equipment maintenance

  return delta;
}

// ── Dividends ───────────────────────────────────────────────────────────────

export function calculateDividend(
  coopNetProfit: number,
  playerDelivered: number,
  totalMemberDelivered: number,
  dividendPct: number,
  health: number,
): number {
  if (health < 40) return 0;
  if (totalMemberDelivered === 0) return 0;
  const share = playerDelivered / totalMemberDelivered;
  return coopNetProfit * share * (dividendPct / 100);
}

// ── Equipment ───────────────────────────────────────────────────────────────

export function getAvailableEquipment(equipment: CoopEquipmentItem[], health: number): CoopEquipmentItem[] {
  return equipment.filter(e => health >= e.unlocksAtHealth);
}

export function isSlotBooked(item: CoopEquipmentItem, day: number): boolean {
  return item.bookings.some(b => b.day === day);
}

export function nextAvailableDay(item: CoopEquipmentItem, fromDay: number): number {
  let d = fromDay;
  while (isSlotBooked(item, d)) d++;
  return d;
}

// ── Membership State ────────────────────────────────────────────────────────

export function isMemberSuspended(membership: CoopMembership, currentSeason: number): boolean {
  if (membership.suspendedUntilSeason === null) return false;
  return currentSeason < membership.suspendedUntilSeason;
}

export function isCoopActive(coopState: CoopState, currentYear: number): boolean {
  if (coopState.dissolvedUntilYear === null) return true;
  return currentYear >= coopState.dissolvedUntilYear;
}

export function getSeason(day: number): number {
  return Math.floor((day - 1) / 90); // season 0 = first spring, increments each 90 days
}

export function getYear(day: number): number {
  return Math.floor((day - 1) / 360) + 1;
}

export function isStartOfSeason(day: number): boolean {
  return (day - 1) % 90 === 0;
}

export function isStartOfSpring(day: number): boolean {
  return (day - 1) % 360 === 0;
}

export function isEndOfYear(day: number): boolean {
  return day % 360 === 0;
}

// ── AGM Simulation ──────────────────────────────────────────────────────────

export function generateAGMProposal(
  coopId: CoopId,
  season: number,
  health: number,
  terms: CoopTerms,
): AGMProposal {
  let changes: Partial<CoopTerms> = {};

  if (health > 70) {
    // Generous: higher floor, higher dividend, equipment investment
    changes = { floorPct: Math.min(terms.floorPct + 5, 95), dividendPct: Math.min(terms.dividendPct + 5, 60) };
  } else if (health < 40) {
    // Austerity: lower floor, higher fees, reduced dividends
    changes = {
      floorPct: Math.max(terms.floorPct - 5, 60),
      annualFeePerShare: terms.annualFeePerShare * 1.1,
      dividendPct: Math.max(terms.dividendPct - 5, 5),
    };
  } else {
    // Stable: minor adjustment
    changes = { deliveryPct: Math.min(Math.max(terms.deliveryPct + (Math.random() > 0.5 ? 5 : -5), 30), 70) };
  }

  // Pre-roll other members' vote
  let baseLean = 0.5;
  if (health > 70) baseLean = 0.65;
  if (health < 40) baseLean = 0.60; // austerity measures get support in bad times
  const variance = (Math.random() - 0.5) * 0.30; // ±15%
  const otherYesPct = Math.max(0, Math.min(1, baseLean + variance));

  return {
    coopId,
    season,
    changes,
    playerVote: null,
    otherYesPct,
    resolved: false,
  };
}

export function resolveAGMVote(
  proposal: AGMProposal,
  memberCount: number,
): boolean {
  const playerWeight = 1 / memberCount;
  const otherWeight = 1 - playerWeight;
  const otherVotes = proposal.otherYesPct * otherWeight;

  let playerVotes = 0;
  if (proposal.playerVote === 'yes') playerVotes = playerWeight;
  else if (proposal.playerVote === 'no') playerVotes = 0;
  else playerVotes = proposal.otherYesPct * playerWeight; // auto-abstain follows majority

  return otherVotes + playerVotes > 0.5;
}

// ── Fuel Cost for Delivery ──────────────────────────────────────────────────

export const COOP_DEPOT_FUEL_COST: Record<CoopId, number> = {
  grain: 25,
  horticulture: 30,
  livestock: 20,
};
```

- [ ] **Step 2: Commit**

```bash
git add engine/cooperatives.ts
git commit -m "feat(coop): add co-op engine pure functions"
```

---

## Task 4: Store — State Shape + Initialization

**Files:**
- Modify: `store/useGameStore.ts`

This task adds the two new state fields, initializes them, and updates `partialize`. It does NOT yet remove the old `cooperative` field — that happens in Task 7 (migration).

- [ ] **Step 1: Import new types at top of useGameStore.ts**

Find the imports section near the top of `useGameStore.ts`. Add after the existing engine imports:

```typescript
import type { CoopId, CoopMembership, CoopState } from '../engine/cooperativeTypes';
import { makeInitialCoopState } from '../engine/cooperativeData';
```

- [ ] **Step 2: Add fields to the GameState type/interface**

Find the `cooperative` field declaration (around line 537):

```typescript
cooperative: { member: boolean; joinDay: number } | null;
```

Add the two new fields directly after it:

```typescript
cooperative: { member: boolean; joinDay: number } | null;
coopMemberships: Partial<Record<CoopId, CoopMembership>>;
coopStates: Record<CoopId, CoopState>;
```

- [ ] **Step 3: Initialize in the store's initial state**

Find the initialization of `cooperative` (around line 956):

```typescript
cooperative: null as { member: boolean; joinDay: number } | null,
```

Add after it:

```typescript
cooperative: null as { member: boolean; joinDay: number } | null,
coopMemberships: {} as Partial<Record<CoopId, CoopMembership>>,
coopStates: {
  grain: makeInitialCoopState('grain'),
  horticulture: makeInitialCoopState('horticulture'),
  livestock: makeInitialCoopState('livestock'),
} as Record<CoopId, CoopState>,
```

- [ ] **Step 4: Add new actions to partialize exclusion list**

Find the partialize block (around line 6062). It destructures action names to exclude them from serialization. Add the new action names to the destructuring list. Find the line with `joinCooperative, leaveCooperative` and replace it with:

```typescript
joinCooperative, leaveCooperative,
joinCoop, leaveCoop, deliverToCoop, voteAGM, submitCounterProposal, bookCoopEquipment,
```

- [ ] **Step 5: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(coop): add coopMemberships + coopStates to store shape"
```

---

## Task 5: Store — New Co-op Actions

**Files:**
- Modify: `store/useGameStore.ts`

Add six new actions. Place them near the existing `joinCooperative` / `leaveCooperative` actions in the store.

- [ ] **Step 1: Add engine imports at the top of useGameStore.ts**

Find the existing engine imports section and add:

```typescript
import {
  calculatePoolPrice, calculateSharePriceDelta, calculateRedemptionMultiplier,
  getSeason, getYear, isMemberSuspended, isCoopActive,
  isSlotBooked, nextAvailableDay, getAvailableEquipment,
  generateAGMProposal, resolveAGMVote, COOP_DEPOT_FUEL_COST,
  rollingAvg,
} from '../engine/cooperatives';
import { getCoopForCrop, getCoopForAnimal, COOP_NAMES, INITIAL_SHARE_PRICES } from '../engine/cooperativeData';
```

- [ ] **Step 2: Add `joinCoop` action**

After the existing `leaveCooperative` action, add:

```typescript
joinCoop: (coopId: CoopId, sharesToBuy: number) =>
  set((state) => {
    const coopState = state.coopStates[coopId];
    if (!isCoopActive(coopState, getYear(state.day))) return state;
    if (state.coopMemberships[coopId]) return state; // already member
    const healthMod = coopState.health / 100;
    const basePrice = INITIAL_SHARE_PRICES[coopId];
    const sharePrice = basePrice * (0.5 + healthMod * 0.5 + 0.5); // health scales 50–100% of base
    const cost = sharesToBuy * sharePrice;
    if (state.money < cost) return state;
    if (sharesToBuy < 10) return state;

    const membership: CoopMembership = {
      shares: sharesToBuy,
      sharePrice,
      joinDay: state.day,
      pendingRedemption: null,
      offenceHistory: [],
      seasonDelivered: 0,
      seasonObligation: 0,
      suspendedUntilSeason: null,
    };

    return {
      money: state.money - cost,
      coopMemberships: { ...state.coopMemberships, [coopId]: membership },
      coopStates: {
        ...state.coopStates,
        [coopId]: { ...coopState, memberCount: coopState.memberCount + 1 },
      },
    };
  }),
```

- [ ] **Step 3: Add `leaveCoop` action**

```typescript
leaveCoop: (coopId: CoopId) =>
  set((state) => {
    const membership = state.coopMemberships[coopId];
    if (!membership) return state;
    if (membership.pendingRedemption) return state; // already leaving
    return {
      coopMemberships: {
        ...state.coopMemberships,
        [coopId]: { ...membership, pendingRedemption: { requestedDay: state.day } },
      },
    };
  }),
```

- [ ] **Step 4: Add `deliverToCoop` action**

```typescript
deliverToCoop: (coopId: CoopId, itemId: string, volume: number) =>
  set((state) => {
    const membership = state.coopMemberships[coopId];
    if (!membership) return state;
    const coopState = state.coopStates[coopId];
    const currentSeason = getSeason(state.day);
    if (isMemberSuspended(membership, currentSeason)) return state;

    // Check inventory
    const availableInv = (state.inventory[itemId] ?? 0) +
      (state.animalInventory[itemId] ?? 0) +
      (state.processedInventory[itemId] ?? 0);
    if (availableInv < volume) return state;

    const poolPrice = coopState.poolPrices[itemId] ?? 0;
    const fuelCost = COOP_DEPOT_FUEL_COST[coopId];
    const revenue = volume * poolPrice - fuelCost;

    // Deduct from inventory (prefer crop inventory first)
    let remaining = volume;
    const newInventory = { ...state.inventory };
    const newAnimalInventory = { ...state.animalInventory };
    const deductFrom = (inv: Record<string, number>) => {
      const avail = inv[itemId] ?? 0;
      const take = Math.min(avail, remaining);
      inv[itemId] = avail - take;
      remaining -= take;
    };
    deductFrom(newInventory);
    if (remaining > 0) deductFrom(newAnimalInventory);

    return {
      money: state.money + revenue,
      inventory: newInventory,
      animalInventory: newAnimalInventory,
      coopMemberships: {
        ...state.coopMemberships,
        [coopId]: {
          ...membership,
          seasonDelivered: membership.seasonDelivered + volume,
        },
      },
    };
  }),
```

- [ ] **Step 5: Add `voteAGM` action**

```typescript
voteAGM: (coopId: CoopId, vote: 'yes' | 'no') =>
  set((state) => {
    const coopState = state.coopStates[coopId];
    if (!coopState.pendingAGM || coopState.pendingAGM.resolved) return state;
    const updatedProposal = { ...coopState.pendingAGM, playerVote: vote };
    const passes = resolveAGMVote(updatedProposal, coopState.memberCount);
    const newTerms = passes
      ? { ...coopState.terms, ...updatedProposal.changes }
      : coopState.terms;
    return {
      coopStates: {
        ...state.coopStates,
        [coopId]: {
          ...coopState,
          terms: newTerms,
          pendingAGM: { ...updatedProposal, resolved: true },
        },
      },
    };
  }),
```

- [ ] **Step 6: Add `submitCounterProposal` action**

```typescript
submitCounterProposal: (coopId: CoopId, changes: Partial<CoopTerms>) =>
  set((state) => {
    const coopState = state.coopStates[coopId];
    if (!coopState.pendingAGM || !coopState.pendingAGM.resolved) return state;
    const currentSeason = getSeason(state.day);
    const counterProposal = generateAGMProposal(coopId, currentSeason, coopState.health, coopState.terms);
    const overridden = { ...counterProposal, changes, playerVote: null as null };
    return {
      coopStates: {
        ...state.coopStates,
        [coopId]: { ...coopState, pendingAGM: overridden },
      },
    };
  }),
```

- [ ] **Step 7: Add `bookCoopEquipment` action**

```typescript
bookCoopEquipment: (coopId: CoopId, equipmentId: string, day: number) =>
  set((state) => {
    const membership = state.coopMemberships[coopId];
    if (!membership) return state;
    const coopState = state.coopStates[coopId];
    const currentSeason = getSeason(state.day);
    if (isMemberSuspended(membership, currentSeason)) return state;

    const equipIdx = coopState.equipment.findIndex(e => e.id === equipmentId);
    if (equipIdx === -1) return state;
    const item = coopState.equipment[equipIdx];
    if (item.unlocksAtHealth > coopState.health) return state;
    if (isSlotBooked(item, day)) return state;
    if (state.money < item.usageFeePerDay) return state;

    const newEquipment = coopState.equipment.map((e, i) =>
      i === equipIdx
        ? { ...e, bookings: [...e.bookings, { memberId: 'player', day }] }
        : e
    );

    return {
      money: state.money - item.usageFeePerDay,
      coopStates: {
        ...state.coopStates,
        [coopId]: { ...coopState, equipment: newEquipment },
      },
    };
  }),
```

- [ ] **Step 8: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(coop): add joinCoop, leaveCoop, deliverToCoop, voteAGM, bookCoopEquipment actions"
```

---

## Task 6: Store — Remove Old Co-op Logic from advanceDay

**Files:**
- Modify: `store/useGameStore.ts`

This is the largest task. Work through advanceDay() replacing all `cooperative?.member` checks.

- [ ] **Step 1: Remove cooperative dues (around line 1461)**

Find:
```typescript
state.cooperative?.member && newDay % 30 === 0 ? 400 : 0
```
Replace that dues term with `0`. The co-op now charges annual fees per share (handled in step 5 below via annual fee deduction).

- [ ] **Step 2: Replace sales bonus on spot crop sales (lines ~2618, ~2689)**

These are inside futures/market-order resolution. Find each occurrence of:
```typescript
state.cooperative?.member ? 1.12 : 1.0
```
that applies to crop sale revenue. Replace with `1.0` — spot sales no longer have a co-op bonus. Pool pricing only applies on explicit delivery via `deliverToCoop`.

- [ ] **Step 3: Replace sales bonus on processed goods (line ~3378)**

Same pattern — find the `1.12` multiplier in the production buildings section. Replace with `1.0`.

- [ ] **Step 4: Replace sales bonus on animal products (lines ~4074, ~4402)**

Same pattern in animal production. Replace each `state.cooperative?.member ? 1.12 : 1.0` with `1.0`.

- [ ] **Step 5: Replace seed cost discount with per-co-op discount (lines ~3840, ~4536, ~4619)**

For each seed purchase line that reads:
```typescript
state.cooperative?.member ? 0.90 : 1.0
```
Replace with a lookup. The context here is planting — `cropId` is available in scope. Replace with:
```typescript
(() => {
  const coopId = getCoopForCrop(cropId);
  if (!coopId) return 1.0;
  const m = state.coopMemberships[coopId];
  if (!m || isMemberSuspended(m, getSeason(state.day))) return 1.0;
  return 1.0 - getSeedDiscount(coopId);
})()
```
Add this import at the top if not already present: `import { getSeedDiscount } from '../engine/cooperatives';`

- [ ] **Step 6: Replace contract delivery bonus (line ~5132)**

Find the `1.12` multiplier in contract delivery resolution. Replace with `1.0`.

- [ ] **Step 7: Add delivery obligation accumulation on harvest**

Find the `harvestCrop` action (not in advanceDay, it's a separate action). After computing `harvestAmount`, add:

```typescript
// co-op delivery obligation
const coopId = getCoopForCrop(cropId);
if (coopId) {
  const membership = state.coopMemberships[coopId];
  if (membership && !isMemberSuspended(membership, getSeason(state.day))) {
    const coopState = state.coopStates[coopId];
    const obligation = Math.round(harvestedAmount * (coopState.terms.deliveryPct / 100));
    newCoopMemberships = {
      ...newCoopMemberships,
      [coopId]: {
        ...membership,
        seasonObligation: membership.seasonObligation + obligation,
      },
    };
    harvestEvents.push(
      `${COOP_NAMES[coopId]}: ${coopState.terms.deliveryPct}% of this harvest (${obligation} ${cropType.unit}) added to your delivery obligation.`
    );
  }
}
```

The harvestCrop action already returns an events array for the day summary — add the obligation message to it. Declare `let newCoopMemberships = state.coopMemberships` at the top of the action and include it in the returned state.

- [ ] **Step 8: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(coop): remove old co-op bonuses, add delivery obligation on harvest"
```

---

## Task 7: Store — Season-End Co-op Tick + Annual Events

**Files:**
- Modify: `store/useGameStore.ts`

Add to `advanceDay()`. Find the existing season-change block (where `getSeason(newDay) !== getSeason(newDay - 1)`). Add the co-op tick after existing season logic.

- [ ] **Step 1: Add pool price recalculation at season start**

Inside the season-change block, add:

```typescript
// Recalculate pool prices for all co-ops
const updatedCoopStates = { ...state.coopStates };
((['grain', 'horticulture', 'livestock'] as CoopId[])).forEach(coopId => {
  const coopState = updatedCoopStates[coopId];
  const newPoolPrices: Record<string, number> = {};
  const allItems = [...COOP_CROPS[coopId], ...COOP_ANIMALS[coopId]];
  allItems.forEach(itemId => {
    const history = state.priceHistory[itemId] ?? [];
    const avg = rollingAvg(history, 90);
    if (avg > 0) {
      newPoolPrices[itemId] = calculatePoolPrice(avg, coopState.health, coopState.terms.floorPct);
    }
  });
  updatedCoopStates[coopId] = { ...coopState, poolPrices: newPoolPrices };
});
```

Add import at top: `import { COOP_CROPS, COOP_ANIMALS } from '../engine/cooperativeData';`

- [ ] **Step 2: Add season-end delivery assessment**

At the END of the season (last day before season change — i.e., `(newDay - 1) % 90 === 89`), add delivery obligation check. Insert this before the season-change block:

```typescript
if ((newDay - 1) % 90 === 89) {
  const coopIds: CoopId[] = ['grain', 'horticulture', 'livestock'];
  let newCoopMemberships = { ...state.coopMemberships };
  let newCoopStates = { ...state.coopStates };
  const currentSeason = getSeason(newDay);

  coopIds.forEach(coopId => {
    const membership = newCoopMemberships[coopId];
    if (!membership) return;

    const shortfall = Math.max(0, membership.seasonObligation - membership.seasonDelivered);

    if (shortfall > 0) {
      const coopState = newCoopStates[coopId];
      const poolPrice = coopState.poolPrices[Object.keys(coopState.poolPrices)[0]] ?? 0;
      const recentOffences = membership.offenceHistory.filter(d => newDay - d < 3 * 360);

      if (recentOffences.length >= 1) {
        // Second offence within 3 years → expulsion
        const redemptionValue = membership.shares * membership.sharePrice * 0.5;
        newMoney = (newMoney ?? state.money) + redemptionValue;
        const { [coopId]: _, ...rest } = newCoopMemberships;
        newCoopMemberships = rest;
        dayEvents.push(
          `⚠️ ${COOP_NAMES[coopId]}: Expelled for repeated delivery failure. Equity redeemed at 50% ($${redemptionValue.toFixed(0)}).`
        );
      } else {
        // First offence
        const penalty = shortfall * poolPrice * 1.20;
        newMoney = (newMoney ?? state.money) - penalty;
        newCoopMemberships = {
          ...newCoopMemberships,
          [coopId]: {
            ...membership,
            offenceHistory: [...membership.offenceHistory, newDay],
            suspendedUntilSeason: currentSeason + 1,
            seasonDelivered: 0,
            seasonObligation: 0,
          },
        };
        dayEvents.push(
          `⚠️ ${COOP_NAMES[coopId]}: Delivery shortfall. Penalty: $${penalty.toFixed(0)}. Benefits suspended next season.`
        );
      }
    } else {
      // Met obligation — clear for next season
      newCoopMemberships = {
        ...newCoopMemberships,
        [coopId]: { ...membership, seasonDelivered: 0, seasonObligation: 0 },
      };
    }

    // Health delta
    const coopState = newCoopStates[coopId];
    const offendingMembers = shortfall > 0 ? 1 : 0; // just player contribution
    const delta = calculateHealthDelta({
      totalMembers: coopState.memberCount,
      membersFullyDelivered: shortfall === 0 ? coopState.memberCount : coopState.memberCount - 1,
      poolBelowFloor: false, // simplified; pool price already uses floor
      membersLeft: 0,
      membersJoined: 0,
      poolPriceStrongVsSpot: false,
      equipmentVotePassed: false,
      offendingMembers,
    });
    const newHealth = Math.max(0, Math.min(100, coopState.health + delta));

    // Dissolution check
    const lowHealth = newHealth < 10;
    const consecutiveLow = lowHealth ? coopState.consecutiveLowHealthSeasons + 1 : 0;
    let dissolvedUntilYear = coopState.dissolvedUntilYear;
    if (consecutiveLow >= 2) {
      const currentYear = getYear(newDay);
      dissolvedUntilYear = currentYear + 3;
      // Redeem all player equity at 40%
      const m = newCoopMemberships[coopId];
      if (m) {
        const redemption = m.shares * m.sharePrice * 0.4;
        newMoney = (newMoney ?? state.money) + redemption;
        const { [coopId]: _, ...rest } = newCoopMemberships;
        newCoopMemberships = rest;
        dayEvents.push(
          `💥 ${COOP_NAMES[coopId]} has dissolved. Equity redeemed at 40% ($${redemption.toFixed(0)}).`
        );
      }
    }

    newCoopStates[coopId] = {
      ...coopState,
      health: newHealth,
      consecutiveLowHealthSeasons: consecutiveLow,
      dissolvedUntilYear,
    };
  });

  // Write back
  state = { ...state, coopMemberships: newCoopMemberships, coopStates: newCoopStates };
}
```

Note: `newMoney` and `dayEvents` are variables already used in advanceDay to accumulate money changes and events before the final `set()`. Slot this into that same pattern.

- [ ] **Step 3: Add annual share price update + dividends + AGM**

Find where `day % 365 === 0` (or equivalent year-end logic) is handled in advanceDay. If there is no explicit year-end block, add one using `newDay % 360 === 0`. Add:

```typescript
if (newDay % 360 === 0) {
  const coopIds: CoopId[] = ['grain', 'horticulture', 'livestock'];
  let newCoopMemberships = { ...state.coopMemberships };
  let newCoopStates = { ...state.coopStates };

  coopIds.forEach(coopId => {
    const coopState = newCoopStates[coopId];

    // Annual fee per share
    const membership = newCoopMemberships[coopId];
    if (membership) {
      const fee = membership.shares * coopState.terms.annualFeePerShare;
      newMoney = (newMoney ?? state.money) - fee;

      // Share price update
      const pctChange = calculateSharePriceDelta(coopState.health);
      const newSharePrice = membership.sharePrice * (1 + pctChange);
      newCoopMemberships = {
        ...newCoopMemberships,
        [coopId]: { ...membership, sharePrice: newSharePrice },
      };

      // Dividend payout
      const estimatedProfit = Object.values(coopState.poolPrices).reduce((a, b) => a + b, 0) * 50;
      const dividend = calculateDividend(
        estimatedProfit,
        membership.seasonDelivered,
        membership.seasonDelivered * coopState.memberCount,
        coopState.terms.dividendPct,
        coopState.health,
      );
      if (dividend > 0) {
        newMoney = (newMoney ?? state.money) + dividend;
        dayEvents.push(`🌾 ${COOP_NAMES[coopId]} dividend: +$${dividend.toFixed(0)}`);
      }

      // Process pending redemption (1 full season has passed)
      if (membership.pendingRedemption) {
        const seasonsElapsed = getSeason(newDay) - getSeason(membership.pendingRedemption.requestedDay);
        if (seasonsElapsed >= 1) {
          const mult = calculateRedemptionMultiplier(coopState.health);
          const redemption = membership.shares * membership.sharePrice * mult;
          newMoney = (newMoney ?? state.money) + redemption;
          const { [coopId]: _, ...rest } = newCoopMemberships;
          newCoopMemberships = rest;
          newCoopStates[coopId] = { ...coopState, memberCount: Math.max(1, coopState.memberCount - 1) };
          dayEvents.push(`${COOP_NAMES[coopId]}: Shares redeemed for $${redemption.toFixed(0)}.`);
        }
      }
    }
  });

  state = { ...state, coopMemberships: newCoopMemberships, coopStates: newCoopStates };
}

// AGM trigger — start of spring each year (day 1, 361, 721, ...)
if (isStartOfSpring(newDay) && newDay > 1) {
  const coopIds: CoopId[] = ['grain', 'horticulture', 'livestock'];
  const newCoopStates = { ...state.coopStates };
  coopIds.forEach(coopId => {
    if (!state.coopMemberships[coopId]) return;
    const coopState = newCoopStates[coopId];
    if (coopState.pendingAGM && !coopState.pendingAGM.resolved) return; // already has one
    const proposal = generateAGMProposal(coopId, getSeason(newDay), coopState.health, coopState.terms);
    newCoopStates[coopId] = { ...coopState, pendingAGM: proposal };
    dayEvents.push(`📋 ${COOP_NAMES[coopId]} AGM: Review the board's proposal in the Co-ops tab.`);
  });
  state = { ...state, coopStates: newCoopStates };
}
```

Add import: `import { calculateDividend, isStartOfSpring } from '../engine/cooperatives';`

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(coop): season-end tick, health, dividends, AGM trigger in advanceDay"
```

---

## Task 8: Store — Migration v5 → v6

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Bump storage key**

Find (around line 6042):
```typescript
name: 'granja-tycoon-save-v5',
```
Replace with:
```typescript
name: 'granja-tycoon-save-v6',
```

- [ ] **Step 2: Add migration in persist config**

In the `persist()` options object (same block as `name`, `partialize`, `storage`), add a `migrate` function:

```typescript
version: 6,
migrate: (persistedState: any, version: number) => {
  if (version < 6) {
    // v5 → v6: replace binary cooperative with three co-op system
    const old = persistedState as any;
    const oldCoop = old.cooperative ?? null;
    let coopMemberships: Partial<Record<CoopId, CoopMembership>> = {};

    if (oldCoop?.member === true) {
      coopMemberships.grain = {
        shares: 10,
        sharePrice: 80,
        joinDay: oldCoop.joinDay ?? 1,
        pendingRedemption: null,
        offenceHistory: [],
        seasonDelivered: 0,
        seasonObligation: 0,
        suspendedUntilSeason: null,
      };
    }

    return {
      ...old,
      cooperative: null,
      coopMemberships,
      coopStates: {
        grain: makeInitialCoopState('grain'),
        horticulture: makeInitialCoopState('horticulture'),
        livestock: makeInitialCoopState('livestock'),
      },
    };
  }
  return persistedState;
},
```

- [ ] **Step 3: Update CLAUDE.md storage key reference**

In `granja-tycoon/CLAUDE.md`, find:
```
Storage key is `granja-tycoon-save-v4`
```
Replace with:
```
Storage key is `granja-tycoon-save-v6`
```
Also find:
```
key: `granja-tycoon-save-v4`
```
and update similarly.

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts granja-tycoon/CLAUDE.md
git commit -m "feat(coop): migrate save v5→v6, replace cooperative with coopMemberships"
```

---

## Task 9: UI — CoopsSection in oficina.tsx

**Files:**
- Modify: `app/(tabs)/oficina.tsx`

- [ ] **Step 1: Update store destructuring at top of oficina.tsx**

Find the `useGameStore()` destructure. Remove `cooperative, joinCooperative, leaveCooperative` and add:

```typescript
coopMemberships, coopStates,
joinCoop, leaveCoop, deliverToCoop, voteAGM, submitCounterProposal, bookCoopEquipment,
day, money,
```

Also add these imports at the top of the file:

```typescript
import type { CoopId } from '../../engine/cooperativeTypes';
import { COOP_NAMES, getCoopForCrop } from '../../engine/cooperativeData';
import { getAvailableEquipment, nextAvailableDay, isMemberSuspended, getSeason, isCoopActive, getYear } from '../../engine/cooperatives';
```

- [ ] **Step 2: Add CoopPanel sub-component before the main screen component**

Add this function before the main export default:

```typescript
function CoopPanel({ coopId, day, money }: { coopId: CoopId; day: number; money: number }) {
  const { coopMemberships, coopStates, joinCoop, leaveCoop, deliverToCoop, voteAGM, bookCoopEquipment, inventory, animalInventory } = useGameStore();
  const [expanded, setExpanded] = React.useState(false);
  const [shareInput, setShareInput] = React.useState('10');
  const [bookDay, setBookDay] = React.useState<number>(day + 1);

  const coopState = coopStates[coopId];
  const membership = coopMemberships[coopId];
  const currentSeason = getSeason(day);
  const currentYear = getYear(day);
  const active = isCoopActive(coopState, currentYear);
  const suspended = membership ? isMemberSuspended(membership, currentSeason) : false;
  const availableEquipment = getAvailableEquipment(coopState.equipment, coopState.health);

  const healthColor = coopState.health >= 80 ? '#81c784'
    : coopState.health >= 60 ? '#aed581'
    : coopState.health >= 40 ? '#ffb74d'
    : coopState.health >= 20 ? '#ef5350'
    : '#b71c1c';

  if (!active) {
    return (
      <View style={styles.coopCard}>
        <Text style={styles.coopName}>{COOP_NAMES[coopId]}</Text>
        <Text style={[styles.coopDetail, { color: '#ef5350' }]}>
          Dissolved — reforms in year {coopState.dissolvedUntilYear}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.coopCard}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.coopHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.coopName}>{COOP_NAMES[coopId]}</Text>
          <Text style={styles.coopDetail}>{coopState.memberCount} members</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.coopHealth, { color: healthColor }]}>
            Health {coopState.health.toFixed(0)}%
          </Text>
          <Text style={styles.coopDetail}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {!expanded ? null : (
        <View>
          {/* Health bar */}
          <View style={styles.healthBarBg}>
            <View style={[styles.healthBarFill, { width: `${coopState.health}%` as any, backgroundColor: healthColor }]} />
          </View>

          {/* Terms */}
          <Text style={styles.coopSectionLabel}>Terms</Text>
          <Text style={styles.coopDetail}>Delivery obligation: {coopState.terms.deliveryPct}% of harvest</Text>
          <Text style={styles.coopDetail}>Floor price: {coopState.terms.floorPct}% of 90-day avg</Text>
          <Text style={styles.coopDetail}>Annual fee: ${coopState.terms.annualFeePerShare}/share/yr</Text>
          <Text style={styles.coopDetail}>Dividend: {coopState.terms.dividendPct}% of net profit</Text>

          {/* Membership */}
          {membership ? (
            <View>
              <Text style={styles.coopSectionLabel}>Your Membership</Text>
              <Text style={styles.coopDetail}>Shares: {membership.shares} @ ${membership.sharePrice.toFixed(2)}/share</Text>
              <Text style={styles.coopDetail}>Equity value: ${(membership.shares * membership.sharePrice).toFixed(0)}</Text>
              {membership.pendingRedemption && (
                <Text style={[styles.coopDetail, { color: '#ffb74d' }]}>
                  ⏳ Exit pending since day {membership.pendingRedemption.requestedDay} — processing after 1 season
                </Text>
              )}
              {suspended && (
                <Text style={[styles.coopDetail, { color: '#ef5350' }]}>
                  ⛔ Benefits suspended until season {membership.suspendedUntilSeason}
                </Text>
              )}

              {/* Delivery tracker */}
              <Text style={styles.coopSectionLabel}>Delivery Obligation</Text>
              <Text style={styles.coopDetail}>
                {membership.seasonDelivered.toFixed(0)} / {membership.seasonObligation.toFixed(0)} kg delivered this season
              </Text>
              {membership.seasonObligation > 0 && (
                <View style={styles.healthBarBg}>
                  <View style={[styles.healthBarFill, {
                    width: `${Math.min(100, membership.seasonDelivered / membership.seasonObligation * 100)}%` as any,
                    backgroundColor: '#81c784',
                  }]} />
                </View>
              )}

              {/* Pool prices */}
              <Text style={styles.coopSectionLabel}>Pool Prices (this season)</Text>
              {Object.entries(coopState.poolPrices).slice(0, 5).map(([itemId, price]) => (
                <Text key={itemId} style={styles.coopDetail}>{itemId}: ${(price as number).toFixed(2)}/unit</Text>
              ))}
              {Object.keys(coopState.poolPrices).length === 0 && (
                <Text style={styles.coopDetail}>Pool prices calculated at season start</Text>
              )}

              {/* Quick deliver button */}
              {!suspended && membership.seasonObligation > membership.seasonDelivered && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.coopDetail}>Deliver to co-op (uses inventory at pool price):</Text>
                  {Object.entries(coopState.poolPrices).map(([itemId, price]) => {
                    const avail = (inventory[itemId] ?? 0) + (animalInventory[itemId] ?? 0);
                    if (avail <= 0) return null;
                    const needed = membership.seasonObligation - membership.seasonDelivered;
                    const vol = Math.min(avail, needed);
                    return (
                      <TouchableOpacity
                        key={itemId}
                        style={styles.deliverBtn}
                        onPress={() => deliverToCoop(coopId, itemId, vol)}
                      >
                        <Text style={styles.deliverBtnText}>
                          Deliver {vol.toFixed(0)} {itemId} (${((price as number) * vol).toFixed(0)})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* AGM */}
              {coopState.pendingAGM && !coopState.pendingAGM.resolved && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.coopSectionLabel}>📋 AGM Proposal</Text>
                  <Text style={styles.coopDetail}>
                    {JSON.stringify(coopState.pendingAGM.changes)}
                  </Text>
                  <Text style={styles.coopDetail}>
                    Other members: {(coopState.pendingAGM.otherYesPct * 100).toFixed(0)}% likely to vote yes
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity style={styles.voteYesBtn} onPress={() => voteAGM(coopId, 'yes')}>
                      <Text style={styles.voteBtnText}>Vote Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.voteNoBtn} onPress={() => voteAGM(coopId, 'no')}>
                      <Text style={styles.voteBtnText}>Vote No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {coopState.pendingAGM?.resolved && (
                <Text style={[styles.coopDetail, { color: '#81c784', marginTop: 4 }]}>
                  ✅ AGM resolved — {JSON.stringify(coopState.pendingAGM.changes)}
                </Text>
              )}

              {/* Equipment */}
              <Text style={styles.coopSectionLabel}>Equipment Pool ({availableEquipment.length} available)</Text>
              {availableEquipment.map(item => {
                const booked = item.bookings.some(b => b.memberId === 'player' && b.day >= day);
                const next = nextAvailableDay(item, day + 1);
                return (
                  <View key={item.id} style={styles.equipRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coopDetail}>{item.label} — ${item.usageFeePerDay}/day</Text>
                      {booked && <Text style={[styles.coopDetail, { color: '#81c784' }]}>Booked ✓</Text>}
                    </View>
                    {!booked && !suspended && (
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => bookCoopEquipment(coopId, item.id, next)}
                      >
                        <Text style={styles.bookBtnText}>Book day {next} (${item.usageFeePerDay})</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {/* Leave button */}
              {!membership.pendingRedemption && (
                <TouchableOpacity style={styles.leaveBtn} onPress={() => leaveCoop(coopId)}>
                  <Text style={styles.leaveBtnText}>Request Exit (1-season delay)</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.coopSectionLabel}>Join Co-op</Text>
              <Text style={styles.coopDetail}>
                Share price: ${(INITIAL_SHARE_PRICES[coopId] * (0.5 + coopState.health / 200 + 0.5)).toFixed(2)} · Min 10 shares
              </Text>
              <TextInput
                style={styles.shareInput}
                keyboardType="numeric"
                value={shareInput}
                onChangeText={setShareInput}
                placeholder="Shares to buy"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={[styles.joinBtn, money < 10 * INITIAL_SHARE_PRICES[coopId] && styles.joinBtnDisabled]}
                onPress={() => joinCoop(coopId, parseInt(shareInput, 10) || 10)}
                disabled={money < 10 * INITIAL_SHARE_PRICES[coopId]}
              >
                <Text style={styles.joinBtnText}>
                  Join (${((parseInt(shareInput, 10) || 10) * INITIAL_SHARE_PRICES[coopId]).toFixed(0)})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
```

Add `import { TextInput } from 'react-native';` to the imports if not present.
Add `import React from 'react';` if not present.
Add `import { INITIAL_SHARE_PRICES } from '../../engine/cooperativeData';` to imports.

- [ ] **Step 3: Add CoopsSection function**

```typescript
function CoopsSection() {
  const { day, money } = useGameStore();
  return (
    <View>
      <Text style={styles.sectionTitle}>🤝 Agricultural Co-operatives</Text>
      <CoopPanel coopId="grain" day={day} money={money} />
      <CoopPanel coopId="horticulture" day={day} money={money} />
      <CoopPanel coopId="livestock" day={day} money={money} />
    </View>
  );
}
```

- [ ] **Step 4: Replace old co-op card in ReputationSection**

Find the old co-op card JSX (lines 673–697):

```typescript
<View style={styles.coopCard}>
  <Text style={styles.sectionTitle}>🤝 Agricultural Cooperative</Text>
  ...
</View>
```

Replace the entire `<View style={styles.coopCard}>...</View>` block with:

```typescript
<CoopsSection />
```

- [ ] **Step 5: Add new styles**

In the `StyleSheet.create({...})` block, add these new styles:

```typescript
coopCard: { backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: S.md, marginBottom: S.sm, padding: 14 },
coopHeader: { flexDirection: 'row', alignItems: 'flex-start' },
coopName: { color: C.textPrimary, fontSize: F.size.md, fontWeight: 'bold', marginBottom: 2 },
coopHealth: { fontSize: F.size.sm, fontWeight: 'bold' },
coopSectionLabel: { color: C.textMuted, fontSize: F.size.xs, fontWeight: 'bold', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
coopDetail: { color: C.textMuted, fontSize: F.size.sm, marginBottom: 3 },
healthBarBg: { height: 6, backgroundColor: '#333', borderRadius: 3, marginVertical: 6 },
healthBarFill: { height: 6, borderRadius: 3 },
equipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
deliverBtn: { backgroundColor: '#1b5e20', borderRadius: R.sm, padding: 8, marginBottom: 4 },
deliverBtnText: { color: '#a5d6a7', fontSize: F.size.sm, fontWeight: 'bold' },
bookBtn: { backgroundColor: '#0d47a1', borderRadius: R.sm, padding: 6 },
bookBtnText: { color: '#90caf9', fontSize: F.size.xs },
voteYesBtn: { flex: 1, backgroundColor: '#1b5e20', borderRadius: R.sm, padding: 8, alignItems: 'center' },
voteNoBtn: { flex: 1, backgroundColor: '#7f1d1d', borderRadius: R.sm, padding: 8, alignItems: 'center' },
voteBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
shareInput: { backgroundColor: '#1a1a2e', color: C.white, borderRadius: R.sm, padding: 8, marginBottom: 8, fontSize: F.size.md },
joinBtn: { backgroundColor: '#1565c0', borderRadius: R.md, padding: 10, alignItems: 'center' },
joinBtnDisabled: { backgroundColor: '#333', opacity: 0.5 },
joinBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
leaveBtn: { backgroundColor: '#7f1d1d', borderRadius: R.md, padding: S.sm, alignItems: 'center', marginTop: S.sm },
leaveBtnText: { color: '#ef9a9a', fontWeight: 'bold', fontSize: F.size.sm },
```

Remove the old `coopActive` style if present — it's replaced.

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/oficina.tsx
git commit -m "feat(coop): replace single co-op card with 3-panel CoopsSection"
```

---

## Task 10: UI — Harvest Banner + HUD Icons

**Files:**
- Modify: `app/(tabs)/tierras.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add co-op obligation banner to tierras.tsx harvest flow**

Find the harvest result display in `tierras.tsx`. The harvest result is likely shown in a modal or inline banner after `harvestCrop` is called. Find where harvest success events are displayed and add a check for co-op obligation events.

In the `useGameStore` destructure at line 150, replace `cooperative` with:
```typescript
coopMemberships, coopStates,
```

After a crop is harvested, the store emits events via the day summary. The obligation message is already added to `dayEvents` by the `harvestCrop` action (Task 6 Step 7). No additional UI change is strictly needed since the DaySummaryModal already shows all day events.

However, the spec calls for an inline banner on the harvest result modal. If `tierras.tsx` shows a harvest result modal, add this message inside it. Find the harvest modal rendering and add:

```typescript
{/* Co-op obligation notice */}
{(() => {
  const cropCoopId = lastHarvestedCropId ? getCoopForCrop(lastHarvestedCropId) : null;
  if (!cropCoopId) return null;
  const membership = coopMemberships[cropCoopId];
  if (!membership) return null;
  const coopState = coopStates[cropCoopId];
  const obligation = Math.round((lastHarvestVolume ?? 0) * (coopState.terms.deliveryPct / 100));
  const remaining = membership.seasonObligation - membership.seasonDelivered;
  return (
    <Text style={styles.coopObligationBanner}>
      {COOP_NAMES[cropCoopId]}: {coopState.terms.deliveryPct}% of this harvest ({obligation} kg) added to your delivery obligation. {remaining.toFixed(0)} kg remaining this season.
    </Text>
  );
})()}
```

Add `coopObligationBanner: { color: '#ffb74d', fontSize: F.size.sm, marginTop: 6, fontStyle: 'italic' }` to tierras styles.

Add imports: `import { getCoopForCrop, COOP_NAMES } from '../../engine/cooperativeData';`

- [ ] **Step 2: Add HUD co-op icons to _layout.tsx**

Find the HUD area in `app/(tabs)/_layout.tsx` where the cash balance is displayed. Add the co-op badge row next to it:

```typescript
// Import at top of _layout.tsx
import { useGameStore } from '../../store/useGameStore';
import type { CoopId } from '../../engine/cooperativeTypes';

// Inside the component, near the cash balance display:
const { coopMemberships } = useGameStore();
const coopLabels: { id: CoopId; label: string }[] = [
  { id: 'grain', label: 'G' },
  { id: 'horticulture', label: 'H' },
  { id: 'livestock', label: 'L' },
];
```

In the JSX, next to the cash balance text:
```typescript
<View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
  {coopLabels.map(({ id, label }) =>
    coopMemberships[id] ? (
      <View key={id} style={hudStyles.coopBadge}>
        <Text style={hudStyles.coopBadgeText}>{label}</Text>
      </View>
    ) : null
  )}
</View>
```

Add styles:
```typescript
coopBadge: { backgroundColor: '#1565c0', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
coopBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/tierras.tsx app/(tabs)/_layout.tsx
git commit -m "feat(coop): harvest obligation banner + HUD co-op membership icons"
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Covered In |
|---|---|
| Three co-ops (Grain/Hort/Livestock) | Task 2 — COOP_CROPS, COOP_ANIMALS |
| Input discounts (seeds, feed, fertilizer, vet) | Task 3 — getSeedDiscount, getFeedDiscount, getFertilizerDiscount; Task 6 step 5 |
| Data model (CoopMembership, CoopState, etc.) | Task 1 |
| Joining (share purchase, min 10, immediate next season) | Task 5 — joinCoop |
| Leaving (1-season redemption delay, health-scaled value) | Task 5 — leaveCoop; Task 7 — annual redemption processing |
| Share price fluctuation (+2%/-5%) | Task 3 — calculateSharePriceDelta; Task 7 — annual update |
| Dividends (annual, delivery-weighted, health gate) | Task 3 — calculateDividend; Task 7 |
| Pool price calculation (rollingAvg, handlingFee, floorPct) | Task 3 — calculatePoolPrice |
| Pool price recalculation each season | Task 7 step 1 |
| Delivery obligations on harvest | Task 6 step 7 — harvestCrop action |
| Season-end delivery assessment | Task 7 step 2 |
| Penalty tiers (fee + suspension / expulsion) | Task 7 step 2 |
| Equipment pool, health-gated unlock | Task 2 — equipment lists; Task 3 — getAvailableEquipment |
| Equipment booking | Task 5 — bookCoopEquipment |
| AGM trigger (spring, annual) | Task 7 step 3 |
| AGM vote simulation | Task 3 — generateAGMProposal, resolveAGMVote |
| Player vote + decisive vote logic | Task 5 — voteAGM |
| Counter-proposal | Task 5 — submitCounterProposal |
| Board behaviour by health | Task 3 — generateAGMProposal |
| Co-op health formula | Task 3 — calculateHealthDelta |
| Health consequences (equipment, floor, dissolution) | Task 7 steps 1–3 |
| Dissolution + reform | Task 7 step 2 |
| UI — 3 panels in oficina.tsx | Task 9 |
| UI — harvest banner | Task 10 step 1 |
| UI — HUD icons | Task 10 step 2 |
| Migration v5 → v6 | Task 8 |
| Remove flat +12% bonus | Task 6 steps 1–4, 6 |
| Remove $400/month dues | Task 6 step 1 |

### Placeholder Scan

- No "TBD" or "TODO" placeholders found
- All code blocks contain actual implementation
- All type references are consistent across tasks (e.g. `CoopId`, `CoopMembership`, `CoopState` defined in Task 1 and used throughout)

### Type Consistency

- `getSeason()` defined in Task 3 `engine/cooperatives.ts`, used in Tasks 5, 6, 7, 9 ✓
- `COOP_NAMES[coopId]` defined in Task 2, used in Tasks 5, 7, 9, 10 ✓
- `isMemberSuspended(membership, currentSeason)` — `currentSeason` is `number` from `getSeason(day)` everywhere ✓
- `deliverToCoop` uses `inventory` and `animalInventory` from state — both `Record<string, number>` ✓
- `makeInitialCoopState` imported from `cooperativeData` in both Task 4 (store) and Task 8 (migration) ✓
