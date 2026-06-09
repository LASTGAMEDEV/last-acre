# Phase 3.1 — Engine Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three feature modules (family, reputation, neighbors) as pure engine logic, action factories, and tick modules — no UI. All three plug into the tick pipeline established by Phase 3.0 and are verifiable via TypeScript and console inspection before any UI is built.

**Architecture:** Each Phase 3 system lives in its own `features/<name>/` folder. Pure engine logic (`*Engine.ts`) takes state in and returns state out — no Zustand imports. Actions use the `ActionFactory<T>` pattern from `store/actions/types.ts`. Ticks implement `GameTick` from `simulation/tickContext.ts` and are added to `DAILY_TICKS` in `simulation/advanceDay.ts`. New state fields are added to `types/domain/gameState.ts` and `store/initialState.ts`. Save key bumped via `store/persistConfig.ts`.

**Prerequisite:** Phase 3.0 Architecture Stabilization must be complete. This plan assumes:
- `simulation/advanceDay.ts` exists with a `DAILY_TICKS: GameTick[]` pipeline
- `simulation/tickContext.ts` exports `TickContext` and `GameTick`
- `store/actions/types.ts` exports `ActionFactory`, `GameSet`, `GameGet`
- `types/domain/gameState.ts` exports `GameState`
- `store/initialState.ts` exports `makeInitialState()`
- `store/persistConfig.ts` exports `SAVE_STORAGE_KEY` and `SAVE_VERSION`

**Tech Stack:** TypeScript 5.9 · Zustand 5 · Expo Router · React Native. No test suite — verify with `npx tsc --noEmit` and console smoke tests.

---

## Non-Negotiable Rules

- Do not modify `store/useGameStore.ts` directly for new logic. All new state/actions go through the architecture established in Phase 3.0.
- Do not use `require()` inside function bodies. Top-level ES imports only.
- Do not use `as any` or `// @ts-ignore`.
- Do not commit with TypeScript errors.
- Do not add gameplay features beyond what is spec'd in `docs/superpowers/specs/2026-06-03-phase3-full-life-simulation-design.md`.

---

## TickContext Pattern

Phase 3.0 introduced `TickContext`. This plan writes ticks that read merged state defensively:

```typescript
// At the top of each tick, get the latest merged state
const state = (ctx as any).pendingState
  ? { ...ctx.state, ...(ctx as any).pendingState }
  : ctx.state;
```

Each tick returns an updated context. How updates are flushed to Zustand (`set`) is handled by `finalizeDayTick` in Phase 3.0. Phase 3.1 ticks only return updated context — they never call `set` or `get` directly.

---

## File Map

| Action | File |
|--------|------|
| Create | `data/lifeEvents.ts` |
| Create | `data/neighborData.ts` |
| Create | `features/family/familyTypes.ts` |
| Create | `features/family/familyEngine.ts` |
| Create | `features/family/familyActions.ts` |
| Create | `features/family/familyTick.ts` |
| Create | `features/reputation/reputationTypes.ts` |
| Create | `features/reputation/reputationEngine.ts` |
| Create | `features/reputation/reputationTick.ts` |
| Create | `features/neighbors/neighborTypes.ts` |
| Create | `features/neighbors/neighborEngine.ts` |
| Create | `features/neighbors/neighborTick.ts` |
| Modify | `types/domain/gameState.ts` |
| Modify | `store/initialState.ts` |
| Modify | `store/persistConfig.ts` |
| Modify | `store/useGameStore.ts` |
| Modify | `simulation/advanceDay.ts` |

---

## Task 1: Life Event Data (`data/lifeEvents.ts`)

**Files:**
- Create: `data/lifeEvents.ts`

- [ ] **Create `data/lifeEvents.ts`**

```typescript
// data/lifeEvents.ts

export type LifeEventType =
  | 'meet_someone'
  | 'marriage_proposal'
  | 'pregnancy'
  | 'child_born'
  | 'child_school_event'
  | 'farm_interest_drop'
  | 'farm_interest_reveal'
  | 'illness_farmer'
  | 'illness_family'
  | 'county_fair'
  | 'neighbor_interaction'
  | 'sibling_friction'
  | 'sibling_buyout'
  | 'sibling_coowner_decision';

export type LifeEventChoiceEffect = {
  type:
    | 'none'
    | 'set_spouse_pending'
    | 'add_child'
    | 'update_member_health'
    | 'update_farm_interest'
    | 'update_neighbor_relationship';
  memberId?: string;
  neighborId?: string;
  delta?: number;
};

export type LifeEventChoice = {
  id: string;
  label: string;
  description: string;
  effect: LifeEventChoiceEffect;
  hasCost?: boolean;
  reputationDelta?: number;
};

export type LifeEventTemplate = {
  id: string;
  type: LifeEventType;
  tier: 'major' | 'minor';
  headline: string;
  narrativeTemplate: string;
  choices: LifeEventChoice[];
};

export type LifeEventGate = {
  templateId: string;
  minFarmerAge: number;
  maxFarmerAge: number;
  dailyChance: number;
  condition:
    | 'no_spouse'
    | 'has_spouse_pending'
    | 'has_spouse_married'
    | 'always'
    | 'has_young_children'
    | 'has_teen_children'
    | 'dynasty_handoff_pending';
};

export const LIFE_EVENT_GATES: LifeEventGate[] = [
  { templateId: 'meet_someone',             minFarmerAge: 20, maxFarmerAge: 32, dailyChance: 0.003,  condition: 'no_spouse' },
  { templateId: 'marriage_proposal',        minFarmerAge: 22, maxFarmerAge: 40, dailyChance: 0.008,  condition: 'has_spouse_pending' },
  { templateId: 'pregnancy',                minFarmerAge: 25, maxFarmerAge: 40, dailyChance: 0.004,  condition: 'has_spouse_married' },
  { templateId: 'child_school_event',       minFarmerAge: 30, maxFarmerAge: 60, dailyChance: 0.002,  condition: 'has_young_children' },
  { templateId: 'farm_interest_drop',       minFarmerAge: 35, maxFarmerAge: 55, dailyChance: 0.003,  condition: 'has_teen_children' },
  { templateId: 'illness_farmer',           minFarmerAge: 25, maxFarmerAge: 80, dailyChance: 0.001,  condition: 'always' },
  { templateId: 'illness_family',           minFarmerAge: 25, maxFarmerAge: 80, dailyChance: 0.001,  condition: 'has_spouse_married' },
  { templateId: 'county_fair',              minFarmerAge: 20, maxFarmerAge: 80, dailyChance: 0.003,  condition: 'always' },
  { templateId: 'neighbor_interaction',     minFarmerAge: 20, maxFarmerAge: 80, dailyChance: 0.0015, condition: 'always' },
  { templateId: 'sibling_coowner_decision', minFarmerAge: 20, maxFarmerAge: 80, dailyChance: 0,      condition: 'dynasty_handoff_pending' },
];

export const LIFE_EVENT_TEMPLATES: LifeEventTemplate[] = [
  {
    id: 'meet_someone',
    type: 'meet_someone',
    tier: 'major',
    headline: 'Someone catches your eye at the county fair',
    narrativeTemplate: "You've been talking for an hour. She knows more about soil drainage than most people you've met. You get the feeling this isn't the last time you'll see her.",
    choices: [
      { id: 'pursue',  label: 'Ask to meet again',                 description: 'Begin a relationship', effect: { type: 'set_spouse_pending' } },
      { id: 'slow',    label: 'Exchange numbers, see what happens', description: 'Slow start',           effect: { type: 'set_spouse_pending' } },
      { id: 'decline', label: 'Politely decline',                  description: 'Focus on the farm',    effect: { type: 'none' } },
    ],
  },
  {
    id: 'marriage_proposal',
    type: 'marriage_proposal',
    tier: 'major',
    headline: 'Will you propose?',
    narrativeTemplate: "You've known {memberName} for a while now. The farm feels like it could use a partner.",
    choices: [
      { id: 'propose', label: 'Propose marriage', description: 'A wedding this season', hasCost: true, effect: { type: 'none' }, reputationDelta: 5 },
      { id: 'wait',    label: 'Not quite yet',    description: 'Give it more time',                   effect: { type: 'none' } },
    ],
  },
  {
    id: 'pregnancy',
    type: 'pregnancy',
    tier: 'major',
    headline: 'Your family is growing',
    narrativeTemplate: "The news comes on a quiet morning. A child changes the rhythm of everything.",
    choices: [
      { id: 'welcome', label: 'Wonderful news',  description: 'Welcome the child', effect: { type: 'add_child' } },
      { id: 'prepare', label: 'Start preparing', description: 'Same outcome',      effect: { type: 'add_child' } },
    ],
  },
  {
    id: 'child_school_event',
    type: 'child_school_event',
    tier: 'minor',
    headline: "{memberName}'s school has an agricultural programme",
    narrativeTemplate: "The school is running a week-long farm visit. {memberName} is excited.",
    choices: [
      { id: 'enroll', label: 'Enroll them',    description: 'Farm interest +8', hasCost: true, effect: { type: 'update_farm_interest', delta: 8 } },
      { id: 'skip',   label: 'Skip this time', description: 'No change',                       effect: { type: 'none' } },
    ],
  },
  {
    id: 'farm_interest_drop',
    type: 'farm_interest_drop',
    tier: 'minor',
    headline: "{memberName} seems less interested in the farm lately",
    narrativeTemplate: "Friends, music, other plans — the farm feels less exciting to {memberName} this year.",
    choices: [
      { id: 'engage', label: 'Give them more responsibility', description: 'Farm interest −5, chance to recover', effect: { type: 'update_farm_interest', delta: -5 } },
      { id: 'space',  label: 'Give them space',              description: 'Farm interest −10',                   effect: { type: 'update_farm_interest', delta: -10 } },
    ],
  },
  {
    id: 'illness_farmer',
    type: 'illness_farmer',
    tier: 'major',
    headline: 'You fall ill',
    narrativeTemplate: "Three days in bed. The farm does not stop for illness.",
    choices: [
      { id: 'treat', label: 'See a doctor',    description: 'Health −5, cost deducted', hasCost: true, effect: { type: 'update_member_health', delta: -5 } },
      { id: 'rest',  label: 'Rest and recover', description: 'Health −15, no cost',                   effect: { type: 'update_member_health', delta: -15 } },
    ],
  },
  {
    id: 'illness_family',
    type: 'illness_family',
    tier: 'major',
    headline: '{memberName} is unwell',
    narrativeTemplate: "It started as a cough and has not improved. Medical care is not cheap.",
    choices: [
      { id: 'treat', label: 'Get medical treatment', description: 'Health −5, cost deducted', hasCost: true, effect: { type: 'update_member_health', delta: -5 } },
      { id: 'wait',  label: 'Wait and see',          description: 'Health −20, no cost',                    effect: { type: 'update_member_health', delta: -20 } },
    ],
  },
  {
    id: 'county_fair',
    type: 'county_fair',
    tier: 'minor',
    headline: 'The county fair is this weekend',
    narrativeTemplate: "Every farm in the area will have something on show.",
    choices: [
      { id: 'compete',  label: 'Enter livestock',            description: 'Reputation +6 if win',        effect: { type: 'none' }, reputationDelta: 6 },
      { id: 'sell',     label: 'Sell surplus animals',       description: '+15% price on sold animals',  effect: { type: 'none' } },
      { id: 'network',  label: 'Socialise with neighbours',  description: 'Neighbour relationships +5',  effect: { type: 'none' }, reputationDelta: 3 },
      { id: 'skip',     label: 'Skip this year',             description: 'No cost, no gain',            effect: { type: 'none' } },
    ],
  },
  {
    id: 'neighbor_interaction',
    type: 'neighbor_interaction',
    tier: 'minor',
    headline: 'A neighbouring farm needs help',
    narrativeTemplate: "One of the farms nearby is struggling with a harvest. A hand now could mean a favour later.",
    choices: [
      { id: 'help',   label: 'Lend a hand', description: 'Relationship +10 with that farm', effect: { type: 'update_neighbor_relationship', delta: 10 }, reputationDelta: 4 },
      { id: 'ignore', label: 'Too busy',    description: 'No change',                       effect: { type: 'none' } },
    ],
  },
  {
    id: 'sibling_friction',
    type: 'sibling_friction',
    tier: 'major',
    headline: '{memberName} disagrees with your decision',
    narrativeTemplate: "Your co-owner has a different view on how the farm should be run.",
    choices: [
      { id: 'agree',     label: 'Agree with them',   description: 'Co-owner relationship +5',  effect: { type: 'none' } },
      { id: 'negotiate', label: 'Find a compromise', description: 'No relationship change',     effect: { type: 'none' } },
      { id: 'override',  label: 'Override them',     description: 'Co-owner relationship −8',  effect: { type: 'none' } },
    ],
  },
  {
    id: 'sibling_buyout',
    type: 'sibling_buyout',
    tier: 'major',
    headline: '{memberName} wants out',
    narrativeTemplate: "The relationship has been strained for too long. {memberName} has proposed a buyout.",
    choices: [
      { id: 'buy_them_out', label: 'Buy their share',    description: 'Full ownership, pay market rate', hasCost: true, effect: { type: 'none' } },
      { id: 'sell_to_them', label: 'Sell your share',    description: 'Exit co-ownership',               effect: { type: 'none' } },
      { id: 'renegotiate',  label: 'Renegotiate terms',  description: 'Relationship resets to 30',        effect: { type: 'none' } },
    ],
  },
  {
    id: 'sibling_coowner_decision',
    type: 'sibling_coowner_decision',
    tier: 'major',
    headline: 'Multiple heirs want the farm',
    narrativeTemplate: "More than one of your children is ready to take over. Who leads, and what happens to the others?",
    choices: [
      { id: 'coown',     label: 'Share ownership', description: 'Two heirs co-own the farm together', effect: { type: 'none' } },
      { id: 'sole_heir', label: 'Choose one heir', description: 'Others stay as skilled workers',      effect: { type: 'none' } },
    ],
  },
];
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "lifeEvents"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add data/lifeEvents.ts
git commit -m "feat(phase3): add life event types, gates, and template catalogue"
```

---

## Task 2: Neighbor Data (`data/neighborData.ts`)

**Files:**
- Create: `data/neighborData.ts`

- [ ] **Create `data/neighborData.ts`**

```typescript
// data/neighborData.ts

export type NeighborId =
  | 'caldwells' | 'petrovs' | 'greens' | 'hendersons'
  | 'obriens' | 'rodriguezes' | 'millers' | 'kowalskis';

export type NeighborProfile = {
  id: NeighborId;
  displayName: string;
  archetype: string;
  description: string;
  startingLandHectares: number;
  startingCash: number;
  startingDebt: number;
  productivityBase: number;
  leverageAggressiveness: number;
  stressRatio: number;
  bankruptRatio: number;
};

export const NEIGHBOR_PROFILES: Record<NeighborId, NeighborProfile> = {
  caldwells:   { id: 'caldwells',   displayName: 'The Caldwells',   archetype: 'Large conventional, over-leveraged',  description: 'The biggest farm in the county. High debt, expanded in boom years.',                   startingLandHectares: 300, startingCash: 15000, startingDebt: 80000, productivityBase: 1.10, leverageAggressiveness: 0.9, stressRatio: 3.0, bankruptRatio: 6.0 },
  petrovs:     { id: 'petrovs',     displayName: 'The Petrovs',     archetype: 'Traditional mixed, conservative',     description: 'Old-fashioned and careful. Low debt, steady. Will outlast most.',                    startingLandHectares: 80,  startingCash: 12000, startingDebt: 5000,  productivityBase: 0.90, leverageAggressiveness: 0.1, stressRatio: 1.5, bankruptRatio: 3.5 },
  greens:      { id: 'greens',      displayName: 'The Greens',      archetype: 'Small progressive, early adopter',    description: 'Idealistic and struggling early. Their organic pivot will eventually pay off.',     startingLandHectares: 40,  startingCash: 6000,  startingDebt: 8000,  productivityBase: 0.85, leverageAggressiveness: 0.4, stressRatio: 2.0, bankruptRatio: 5.0 },
  hendersons:  { id: 'hendersons',  displayName: 'The Hendersons',  archetype: 'Grain specialists, futures traders',  description: 'Big grain operation. Live and die by commodity prices.',                              startingLandHectares: 150, startingCash: 20000, startingDebt: 25000, productivityBase: 1.05, leverageAggressiveness: 0.6, stressRatio: 2.5, bankruptRatio: 5.5 },
  obriens:     { id: 'obriens',     displayName: "The O'Briens",    archetype: 'Dairy-focused, old-school',           description: 'Three generations of dairy. Resistant to tech but deeply reliable.',                startingLandHectares: 90,  startingCash: 10000, startingDebt: 12000, productivityBase: 0.95, leverageAggressiveness: 0.2, stressRatio: 1.8, bankruptRatio: 4.0 },
  rodriguezes: { id: 'rodriguezes', displayName: 'The Rodriguezes', archetype: 'Entrepreneurial, agritourism',        description: 'Big ambitions and borrowed money. Agritourism pivot will make them formidable.',    startingLandHectares: 30,  startingCash: 4000,  startingDebt: 15000, productivityBase: 0.80, leverageAggressiveness: 0.7, stressRatio: 2.8, bankruptRatio: 6.0 },
  millers:     { id: 'millers',     displayName: 'The Millers',     archetype: 'Elderly couple, no heirs',            description: 'Debt-free and winding down. No children. Their land needs a new owner.',            startingLandHectares: 60,  startingCash: 18000, startingDebt: 0,     productivityBase: 0.85, leverageAggressiveness: 0.0, stressRatio: 1.2, bankruptRatio: 3.0 },
  kowalskis:   { id: 'kowalskis',   displayName: 'The Kowalskis',   archetype: 'Specialty crops, farmers market',     description: 'Small but nimble. Early CSA adopters. A co-op partnership could benefit both.',     startingLandHectares: 25,  startingCash: 5000,  startingDebt: 6000,  productivityBase: 0.90, leverageAggressiveness: 0.3, stressRatio: 1.6, bankruptRatio: 4.0 },
};

export const NEIGHBOR_IDS: NeighborId[] = [
  'caldwells', 'petrovs', 'greens', 'hendersons',
  'obriens', 'rodriguezes', 'millers', 'kowalskis',
];

export const OPERATING_COST_PER_HECTARE = 8;
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "neighborData"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add data/neighborData.ts
git commit -m "feat(phase3): add 8 neighbor farm profiles and archetypes"
```

---

## Task 3: Family Feature — Types (`features/family/familyTypes.ts`)

**Files:**
- Create: `features/family/familyTypes.ts`

- [ ] **Create `features/family/familyTypes.ts`**

```typescript
// features/family/familyTypes.ts

import type { NeighborId } from '../../data/neighborData';

export type FarmRole =
  | 'livestock_manager'
  | 'crop_assistant'
  | 'machinery_operator'
  | 'office_manager'
  | 'general_help';

export type PersonalityTraits = {
  ambitious: boolean;
  traditional: boolean;
  techSavvy: boolean;
  entrepreneurial: boolean;
  contentious: boolean;
};

export type FamilyMember = {
  id: string;
  firstName: string;
  relation: 'spouse' | 'child';
  birthYear: number;
  age: number;
  health: number;
  personality: PersonalityTraits;
  farmInterest: number;
  farmRole?: FarmRole;
  relationshipWithFarmer: number;
  isAlive: boolean;
  isMarried?: boolean;
};

export type CoOwnerState = {
  sibling: FamilyMember;
  playerOwnershipShare: number;
  relationship: number;
  frictionEventsPerYear: number;
  frictionEventsFiredThisYear: number;
};

export type PendingLifeEvent = {
  id: string;
  templateId: string;
  memberId?: string;
  neighborId?: NeighborId;
  calendarYear: number;
};

export type FamilyState = {
  spouse?: FamilyMember;
  children: FamilyMember[];
  pendingLifeEvents: PendingLifeEvent[];
  coOwner?: CoOwnerState;
  familyStartYear?: number;
  hasSpousePending: boolean;
  lastCountyFairYear: number;
};

export type FamilyRoleEffects = {
  animalCareMultiplier: number;
  cropSpeedMultiplier: number;
  machineryMaintenanceMultiplier: number;
  loanRateMultiplier: number;
  generalMultiplier: number;
};

export const INITIAL_FAMILY_STATE: FamilyState = {
  spouse: undefined,
  children: [],
  pendingLifeEvents: [],
  coOwner: undefined,
  familyStartYear: undefined,
  hasSpousePending: false,
  lastCountyFairYear: 0,
};
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "familyTypes"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add features/family/familyTypes.ts
git commit -m "feat(phase3): add family feature types and initial state"
```

---

## Task 4: Family Feature — Engine (`features/family/familyEngine.ts`)

**Files:**
- Create: `features/family/familyEngine.ts`

- [ ] **Create `features/family/familyEngine.ts`**

```typescript
// features/family/familyEngine.ts
// Pure functions only. No Zustand imports.

import { FIRST_NAMES, LAST_NAMES } from '../../data/farmerNames';
import { LIFE_EVENT_GATES, LIFE_EVENT_TEMPLATES } from '../../data/lifeEvents';
import {
  FamilyState, FamilyMember, FamilyRoleEffects, CoOwnerState,
  PendingLifeEvent, FarmRole, PersonalityTraits,
} from './familyTypes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function makePendingEventId(templateId: string, day: number): string {
  return `${templateId}-${day}-${Math.random().toString(36).slice(2, 6)}`;
}

export function farmerAgeFromBirthYear(birthYear: number, calendarYear: number): number {
  return calendarYear - birthYear;
}

export function createFamilyMember(
  relation: 'spouse' | 'child',
  calendarYear: number,
  options: Partial<{ birthYear: number; farmInterestBase: number }> = {}
): FamilyMember {
  const birthYear = options.birthYear ?? (
    relation === 'spouse' ? calendarYear - randomInt(22, 32) : calendarYear
  );
  return {
    id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    firstName: randomFrom(FIRST_NAMES),
    relation,
    birthYear,
    age: calendarYear - birthYear,
    health: 100,
    personality: {
      ambitious:       Math.random() < 0.4,
      traditional:     Math.random() < 0.4,
      techSavvy:       Math.floor(birthYear / 10) * 10 >= 1980,
      entrepreneurial: Math.random() < 0.35,
      contentious:     Math.random() < 0.25,
    },
    farmInterest: options.farmInterestBase ?? randomInt(20, 65),
    farmRole: undefined,
    relationshipWithFarmer: randomInt(60, 90),
    isAlive: true,
    isMarried: relation === 'spouse' ? false : undefined,
  };
}

export function ageFamilyMembers(family: FamilyState): FamilyState {
  return {
    ...family,
    spouse:   family.spouse ? { ...family.spouse, age: family.spouse.age + 1 } : undefined,
    children: family.children.map(c => ({ ...c, age: c.age + 1 })),
  };
}

export function computeFamilyRoleEffects(family: FamilyState): FamilyRoleEffects {
  const effects: FamilyRoleEffects = {
    animalCareMultiplier:           1.0,
    cropSpeedMultiplier:            1.0,
    machineryMaintenanceMultiplier: 1.0,
    loanRateMultiplier:             1.0,
    generalMultiplier:              1.0,
  };

  const members = [family.spouse, ...family.children].filter(
    (m): m is FamilyMember => m !== undefined && m.isAlive
  );

  for (const m of members) {
    switch (m.farmRole) {
      case 'livestock_manager':  effects.animalCareMultiplier           = Math.min(effects.animalCareMultiplier * 1.15, 2.0);   break;
      case 'crop_assistant':     effects.cropSpeedMultiplier            = Math.min(effects.cropSpeedMultiplier * 1.2, 2.0);     break;
      case 'machinery_operator': effects.machineryMaintenanceMultiplier = Math.max(effects.machineryMaintenanceMultiplier * 0.85, 0.4); break;
      case 'office_manager':     effects.loanRateMultiplier             = Math.max(effects.loanRateMultiplier * 0.95, 0.6);     break;
      case 'general_help':       effects.generalMultiplier              = Math.min(effects.generalMultiplier * 1.05, 1.3);      break;
    }
  }

  return effects;
}

// ── Life Event Generation ─────────────────────────────────────────────────────

function getEligibleGates(
  family: FamilyState,
  farmerAge: number,
  calendarYear: number,
  dynastyHandoffPending: boolean
) {
  return LIFE_EVENT_GATES.filter(gate => {
    if (farmerAge < gate.minFarmerAge || farmerAge > gate.maxFarmerAge) return false;
    switch (gate.condition) {
      case 'no_spouse':              return !family.spouse && !family.hasSpousePending;
      case 'has_spouse_pending':     return family.hasSpousePending && !family.spouse?.isMarried;
      case 'has_spouse_married':     return !!family.spouse?.isMarried;
      case 'has_young_children':     return family.children.some(c => c.age >= 8 && c.age <= 14);
      case 'has_teen_children':      return family.children.some(c => c.age >= 15 && c.age <= 17);
      case 'dynasty_handoff_pending':
        return dynastyHandoffPending && family.children.filter(c => c.farmInterest >= 60).length >= 2;
      case 'always':
        if (gate.templateId === 'county_fair') return calendarYear > family.lastCountyFairYear;
        return true;
      default: return false;
    }
  });
}

export function advanceFamilyDay(
  family: FamilyState,
  currentDay: number,
  calendarYear: number,
  prevCalendarYear: number,
  farmerBirthYear: number,
  dynastyHandoffPending: boolean,
  rand: number
): { family: FamilyState; newEvent: PendingLifeEvent | null } {
  let updated = family;
  const isNewYear = calendarYear > prevCalendarYear;

  if (isNewYear) {
    updated = ageFamilyMembers(updated);

    // Annual farm interest drift
    updated = {
      ...updated,
      children: updated.children.map(child => {
        if (child.age < 6 || child.age > 22) return child;
        const delta = child.age < 15 ? randomInt(0, 3) : child.age <= 17 ? -randomInt(0, 2) : 0;
        return { ...child, farmInterest: Math.max(0, Math.min(100, child.farmInterest + delta)) };
      }),
    };

    // Guaranteed heir nudge
    const hasHeir = updated.children.some(c => c.age >= 18 && c.farmInterest >= 60);
    if (!hasHeir) {
      const eligible = updated.children.filter(c => c.age < 18);
      if (eligible.length > 0) {
        const top = [...eligible].sort((a, b) => b.farmInterest - a.farmInterest)[0];
        const yearsLeft = Math.max(1, 18 - top.age);
        const needed = Math.max(0, 60 - top.farmInterest);
        if (needed > 0 && needed / yearsLeft > 3) {
          updated = {
            ...updated,
            children: updated.children.map(c =>
              c.id === top.id
                ? { ...c, farmInterest: Math.min(100, c.farmInterest + Math.ceil(needed / yearsLeft)) }
                : c
            ),
          };
        }
      }
    }

    // Farm interest reveal at 18
    const revealed = updated.children.filter(c => c.age === 18);
    if (revealed.length > 0 && updated.pendingLifeEvents.length === 0) {
      const event: PendingLifeEvent = {
        id: makePendingEventId('farm_interest_reveal', currentDay),
        templateId: 'farm_interest_reveal',
        memberId: revealed[0].id,
        calendarYear,
      };
      return { family: { ...updated, pendingLifeEvents: [event] }, newEvent: event };
    }
  }

  // Don't generate new events if queue is non-empty
  if (updated.pendingLifeEvents.length > 0) return { family: updated, newEvent: null };

  const farmerAge = farmerAgeFromBirthYear(farmerBirthYear, calendarYear);
  const gates = getEligibleGates(updated, farmerAge, calendarYear, dynastyHandoffPending);

  for (const gate of gates) {
    // Triggered events (dailyChance === 0) always fire when eligible
    const shouldFire = gate.dailyChance === 0 || rand < gate.dailyChance;
    if (!shouldFire) continue;

    let memberId: string | undefined;
    if (gate.condition === 'has_young_children') {
      const pool = updated.children.filter(c => c.age >= 8 && c.age <= 14);
      memberId = pool[Math.floor(Math.random() * pool.length)]?.id;
    } else if (gate.condition === 'has_teen_children') {
      const pool = updated.children.filter(c => c.age >= 15 && c.age <= 17);
      memberId = pool[Math.floor(Math.random() * pool.length)]?.id;
    } else if (gate.condition === 'has_spouse_married') {
      memberId = updated.spouse?.id;
    }

    const event: PendingLifeEvent = {
      id: makePendingEventId(gate.templateId, currentDay),
      templateId: gate.templateId,
      memberId,
      calendarYear,
    };

    return {
      family: {
        ...updated,
        pendingLifeEvents: [event],
        lastCountyFairYear: gate.templateId === 'county_fair' ? calendarYear : updated.lastCountyFairYear,
      },
      newEvent: event,
    };
  }

  return { family: updated, newEvent: null };
}

export function applyLifeEventChoice(
  family: FamilyState,
  eventId: string,
  choiceId: string,
  calendarYear: number,
  cost: number
): { family: FamilyState; cashDelta: number; reputationDelta: number } {
  const event = family.pendingLifeEvents.find(e => e.id === eventId);
  if (!event) return { family, cashDelta: 0, reputationDelta: 0 };

  const template = LIFE_EVENT_TEMPLATES.find(t => t.id === event.templateId);
  if (!template) return { family, cashDelta: 0, reputationDelta: 0 };

  const choice = template.choices.find(c => c.id === choiceId);
  if (!choice) return { family, cashDelta: 0, reputationDelta: 0 };

  let updated: FamilyState = {
    ...family,
    pendingLifeEvents: family.pendingLifeEvents.filter(e => e.id !== eventId),
  };

  switch (choice.effect.type) {
    case 'set_spouse_pending':
      updated = { ...updated, hasSpousePending: true };
      break;
    case 'add_child': {
      const child = createFamilyMember('child', calendarYear);
      updated = { ...updated, children: [...updated.children, child] };
      break;
    }
    case 'update_member_health': {
      const delta = choice.effect.delta ?? 0;
      const applyHealth = (m: FamilyMember) =>
        m.id === event.memberId ? { ...m, health: Math.max(0, Math.min(100, m.health + delta)) } : m;
      updated = {
        ...updated,
        children: updated.children.map(applyHealth),
        spouse: updated.spouse ? applyHealth(updated.spouse) : undefined,
      };
      break;
    }
    case 'update_farm_interest': {
      const delta = choice.effect.delta ?? 0;
      updated = {
        ...updated,
        children: updated.children.map(c =>
          c.id === event.memberId
            ? { ...c, farmInterest: Math.max(0, Math.min(100, c.farmInterest + delta)) }
            : c
        ),
      };
      break;
    }
    case 'none':
    default:
      break;
  }

  if (event.templateId === 'marriage_proposal' && choiceId === 'propose') {
    const newSpouse = createFamilyMember('spouse', calendarYear);
    updated = {
      ...updated,
      spouse: { ...newSpouse, isMarried: true },
      hasSpousePending: false,
      familyStartYear: calendarYear,
    };
  }

  return { family: updated, cashDelta: -cost, reputationDelta: choice.reputationDelta ?? 0 };
}

// ── Co-Ownership ──────────────────────────────────────────────────────────────

export function initiateCoOwnership(
  family: FamilyState,
  siblingId: string,
  playerOwnershipShare: number
): FamilyState {
  const sibling = family.children.find(c => c.id === siblingId);
  if (!sibling) return family;
  return {
    ...family,
    coOwner: {
      sibling,
      playerOwnershipShare,
      relationship: 70,
      frictionEventsPerYear: sibling.personality.contentious ? 4 : 2,
      frictionEventsFiredThisYear: 0,
    },
  };
}

export function maybeGenerateFrictionEvent(
  family: FamilyState,
  currentDay: number,
  calendarYear: number
): { family: FamilyState; frictionEvent: PendingLifeEvent | null } {
  if (!family.coOwner) return { family, frictionEvent: null };

  const resetFamily = { ...family, coOwner: { ...family.coOwner, frictionEventsFiredThisYear: 0 } };

  if (family.coOwner.relationship < 20 && family.pendingLifeEvents.length === 0) {
    const buyout: PendingLifeEvent = {
      id: makePendingEventId('sibling_buyout', currentDay),
      templateId: 'sibling_buyout',
      memberId: family.coOwner.sibling.id,
      calendarYear,
    };
    return { family: { ...resetFamily, pendingLifeEvents: [buyout] }, frictionEvent: buyout };
  }

  return { family: resetFamily, frictionEvent: null };
}

export function applyFrictionChoice(family: FamilyState, choiceId: string): FamilyState {
  if (!family.coOwner) return family;
  const delta = choiceId === 'agree' ? 5 : choiceId === 'negotiate' ? 0 : -8;
  return {
    ...family,
    coOwner: {
      ...family.coOwner,
      relationship: Math.max(0, Math.min(100, family.coOwner.relationship + delta)),
      frictionEventsFiredThisYear: family.coOwner.frictionEventsFiredThisYear + 1,
    },
  };
}

export function resolveBuyout(
  family: FamilyState,
  choiceId: 'buy_them_out' | 'sell_to_them' | 'renegotiate'
): FamilyState {
  if (!family.coOwner) return family;
  if (choiceId === 'renegotiate') return { ...family, coOwner: { ...family.coOwner, relationship: 30 } };
  return { ...family, coOwner: undefined };
}
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "familyEngine"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add features/family/familyEngine.ts
git commit -m "feat(phase3): add family engine pure functions"
```

---

## Task 5: Family Feature — Actions (`features/family/familyActions.ts`)

**Files:**
- Create: `features/family/familyActions.ts`

- [ ] **Create `features/family/familyActions.ts`**

```typescript
// features/family/familyActions.ts

import type { ActionFactory } from '../../store/actions/types';
import type { FarmRole } from './familyTypes';
import type { NeighborId } from '../../data/neighborData';
import { LIFE_EVENT_TEMPLATES } from '../../data/lifeEvents';
import {
  applyLifeEventChoice, initiateCoOwnership,
  applyFrictionChoice, resolveBuyout, createFamilyMember,
} from './familyEngine';
import { addCommunityStandingDelta } from '../reputation/reputationEngine';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { updateNeighborRelationship } from '../neighbors/neighborEngine';

/** Era-calibrated cost for events that have hasCost: true */
function computeLifeEventCost(templateId: string, choiceId: string, calendarYear: number): number {
  switch (templateId) {
    case 'marriage_proposal':
      if (choiceId !== 'propose') return 0;
      if (calendarYear < 1980) return 2000;
      if (calendarYear < 1990) return 6000;
      if (calendarYear < 2000) return 14000;
      if (calendarYear < 2010) return 22000;
      return 32000;
    case 'illness_farmer':
    case 'illness_family':
      if (choiceId !== 'treat') return 0;
      if (calendarYear < 1980) return 300;
      if (calendarYear < 1995) return 800;
      if (calendarYear < 2010) return 2500;
      return 5000;
    case 'child_school_event':
      if (choiceId !== 'enroll') return 0;
      return calendarYear < 1990 ? 200 : calendarYear < 2005 ? 400 : 800;
    default:
      return 0;
  }
}

export interface FamilyActions {
  makeLifeEventChoice: (eventId: string, choiceId: string) => void;
  setFamilyMemberRole: (memberId: string, role: FarmRole | undefined) => void;
  initiateCoOwnershipAction: (siblingId: string, playerShare: number) => void;
  applyFrictionChoiceAction: (choiceId: string) => void;
  resolveBuyoutAction: (choiceId: 'buy_them_out' | 'sell_to_them' | 'renegotiate') => void;
  completeGameSetup: (farmName: string, farmerFirstName: string, backstory: 'first_gen' | 'inherited' | 'established') => void;
}

export const createFamilyActions: ActionFactory<FamilyActions> = (set, get) => ({
  makeLifeEventChoice: (eventId, choiceId) => {
    const state = get();
    const calYear = gameDayToCalendarYear(state.day);
    const event = state.family.pendingLifeEvents.find(e => e.id === eventId);
    const template = event ? LIFE_EVENT_TEMPLATES.find(t => t.id === event.templateId) : undefined;
    const choice = template?.choices.find(c => c.id === choiceId);
    const cost = choice?.hasCost ? computeLifeEventCost(event!.templateId, choiceId, calYear) : 0;

    const { family: newFamily, cashDelta, reputationDelta } = applyLifeEventChoice(
      state.family, eventId, choiceId, calYear, cost
    );

    const newReputation = reputationDelta !== 0
      ? addCommunityStandingDelta(state.reputation, reputationDelta)
      : state.reputation;

    // Handle neighbor relationship updates (county_fair network, neighbor_interaction)
    let newNeighbors = state.neighbors;
    if (event?.neighborId && choice?.effect.type === 'update_neighbor_relationship') {
      const delta = choice.effect.delta ?? 0;
      newNeighbors = updateNeighborRelationship(state.neighbors, event.neighborId as NeighborId, delta);
    }

    set({ family: newFamily, reputation: newReputation, neighbors: newNeighbors, money: state.money + cashDelta });
  },

  setFamilyMemberRole: (memberId, role) => {
    set(state => {
      const update = (m: typeof state.family.children[0]) =>
        m.id === memberId ? { ...m, farmRole: role } : m;
      return {
        family: {
          ...state.family,
          spouse:   state.family.spouse ? update(state.family.spouse) : undefined,
          children: state.family.children.map(update),
        },
      };
    });
  },

  initiateCoOwnershipAction: (siblingId, playerShare) => {
    set(state => ({ family: initiateCoOwnership(state.family, siblingId, playerShare) }));
  },

  applyFrictionChoiceAction: (choiceId) => {
    set(state => ({ family: applyFrictionChoice(state.family, choiceId) }));
  },

  resolveBuyoutAction: (choiceId) => {
    const state = get();
    const buyoutCost = choiceId === 'buy_them_out' && state.family.coOwner
      ? Math.floor(state.family.coOwner.sibling.skills?.crops ?? 50 * 500 * (1 - state.family.coOwner.playerOwnershipShare / 100))
      : 0;
    set({
      family: resolveBuyout(state.family, choiceId),
      money: state.money - buyoutCost,
    });
  },

  completeGameSetup: (farmName, farmerFirstName, backstory) => {
    const assets = {
      first_gen:   { money: 8000,  repScore: 5  + Math.floor(Math.random() * 11) },
      inherited:   { money: 22000, repScore: 20 + Math.floor(Math.random() * 16) },
      established: { money: 45000, repScore: 35 + Math.floor(Math.random() * 21) },
    }[backstory];

    set(state => ({
      farmName,
      money: assets.money,
      reputation: {
        ...state.reputation,
        score: assets.repScore,
        tier: assets.repScore >= 40 ? 'respected' : assets.repScore >= 20 ? 'local' : 'unknown',
      },
      dynasty: {
        ...state.dynasty,
        currentFarmer: { ...state.dynasty.currentFarmer, firstName: farmerFirstName },
      },
      gameSetupComplete: true,
    }));
  },
});
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep -E "familyActions|familyEngine"
```
Expected: no errors. (If you see missing `skills` on FamilyMember, remove that property access in `resolveBuyoutAction` — it was a placeholder; use `50` as a flat constant instead.)

- [ ] **Commit**
```bash
git add features/family/familyActions.ts
git commit -m "feat(phase3): add family action factory"
```

---

## Task 6: Family Feature — Tick (`features/family/familyTick.ts`)

**Files:**
- Create: `features/family/familyTick.ts`

- [ ] **Create `features/family/familyTick.ts`**

```typescript
// features/family/familyTick.ts

import type { GameTick } from '../../simulation/tickContext';
import { getTickState, patchTickState } from '../../simulation/tickContext';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { advanceFamilyDay, maybeGenerateFrictionEvent } from './familyEngine';

export const familyTick: GameTick = (ctx) => {
  const state      = getTickState(ctx);
  const calYear    = gameDayToCalendarYear(ctx.newDay);
  const prevCalYear = gameDayToCalendarYear(ctx.newDay - 1);
  const isNewYear  = calYear > prevCalYear;

  const { family: newFamily } = advanceFamilyDay(
    state.family,
    ctx.newDay,
    calYear,
    prevCalYear,
    state.dynasty.currentFarmer.birthYear,
    state.dynasty.pendingHandoff,
    Math.random()
  );

  let familyFinal = newFamily;
  if (isNewYear && newFamily.coOwner) {
    const { family: withFriction } = maybeGenerateFrictionEvent(newFamily, ctx.newDay, calYear);
    familyFinal = withFriction;
  }

  return patchTickState(ctx, { family: familyFinal });
};
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "familyTick"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add features/family/familyTick.ts
git commit -m "feat(phase3): add family tick module"
```

---

## Task 7: Reputation Feature — Types + Engine + Tick

**Files:**
- Create: `features/reputation/reputationTypes.ts`
- Create: `features/reputation/reputationEngine.ts`
- Create: `features/reputation/reputationTick.ts`

- [ ] **Create `features/reputation/reputationTypes.ts`**

```typescript
// features/reputation/reputationTypes.ts

export type ReputationTier = 'unknown' | 'local' | 'respected' | 'renowned' | 'legendary';

export type ReputationFactors = {
  animalWelfare: number;
  environmentalPractice: number;
  communityStanding: number;
  productQuality: number;
  financialReliability: number;
  historicalConduct: number;
};

export type ReputationState = {
  score: number;
  tier: ReputationTier;
  factors: ReputationFactors;
  communityStandingDelta: number;
};

export type TierEffects = {
  auctionPriceMultiplier: number;
  loanInterestMultiplier: number;
  csaAutoWaitlist: boolean;
  organicPremiumMultiplier: number;
  workersApplyProactively: boolean;
  landSellersApproach: boolean;
  legacyScoreMultiplier: number;
};

export const INITIAL_REPUTATION_STATE: ReputationState = {
  score: 0,
  tier: 'unknown',
  factors: {
    animalWelfare:         50,
    environmentalPractice: 30,
    communityStanding:     50,
    productQuality:        50,
    financialReliability:  70,
    historicalConduct:     50,
  },
  communityStandingDelta: 0,
};
```

- [ ] **Create `features/reputation/reputationEngine.ts`**

```typescript
// features/reputation/reputationEngine.ts
// Pure functions only. No Zustand imports.

import { ReputationState, ReputationTier, ReputationFactors, TierEffects } from './reputationTypes';

export type ReputationInputs = {
  avgAnimalHealth: number;
  organicHectareFraction: number;
  hasHedgerows: boolean;
  hasComposting: boolean;
  avgStorageQuality: number;
  hasUnresolvedDefault: boolean;
  debtToIncomeRatio: number;
  survivedCrisis: boolean;
  communityStandingDelta: number;
};

const TIER_THRESHOLDS: { tier: ReputationTier; min: number }[] = [
  { tier: 'legendary',  min: 80 },
  { tier: 'renowned',   min: 60 },
  { tier: 'respected',  min: 40 },
  { tier: 'local',      min: 20 },
  { tier: 'unknown',    min: 0  },
];

export function scoreToTier(score: number): ReputationTier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return 'unknown';
}

const WEIGHTS = {
  animalWelfare:         0.15,
  environmentalPractice: 0.20,
  communityStanding:     0.20,
  productQuality:        0.20,
  financialReliability:  0.15,
  historicalConduct:     0.10,
};

export function advanceReputationWeek(
  reputation: ReputationState,
  inputs: ReputationInputs
): ReputationState {
  const newCommunity = Math.max(0, Math.min(100,
    reputation.factors.communityStanding + inputs.communityStandingDelta
  ));

  const financial = inputs.hasUnresolvedDefault
    ? Math.max(0, 40 - inputs.debtToIncomeRatio * 5)
    : inputs.debtToIncomeRatio > 5 ? 30
    : inputs.debtToIncomeRatio > 3 ? 50
    : inputs.debtToIncomeRatio > 1 ? 70
    : 90;

  const newFactors: ReputationFactors = {
    animalWelfare:         Math.max(0, Math.min(100, inputs.avgAnimalHealth)),
    environmentalPractice: Math.min(100, inputs.organicHectareFraction * 60 + (inputs.hasHedgerows ? 20 : 0) + (inputs.hasComposting ? 20 : 0)),
    communityStanding:     newCommunity,
    productQuality:        Math.max(0, Math.min(100, inputs.avgStorageQuality)),
    financialReliability:  financial,
    historicalConduct:     inputs.survivedCrisis
      ? Math.min(100, reputation.factors.historicalConduct + 5)
      : reputation.factors.historicalConduct,
  };

  const rawScore =
    newFactors.animalWelfare         * WEIGHTS.animalWelfare +
    newFactors.environmentalPractice * WEIGHTS.environmentalPractice +
    newFactors.communityStanding     * WEIGHTS.communityStanding +
    newFactors.productQuality        * WEIGHTS.productQuality +
    newFactors.financialReliability  * WEIGHTS.financialReliability +
    newFactors.historicalConduct     * WEIGHTS.historicalConduct;

  const delta    = Math.max(-3, Math.min(3, rawScore - reputation.score));
  const newScore = Math.max(0, Math.min(100, reputation.score + delta));

  return { score: newScore, tier: scoreToTier(newScore), factors: newFactors, communityStandingDelta: 0 };
}

export function addCommunityStandingDelta(rep: ReputationState, delta: number): ReputationState {
  return { ...rep, communityStandingDelta: rep.communityStandingDelta + delta };
}

export function getTierEffects(tier: ReputationTier): TierEffects {
  switch (tier) {
    case 'legendary':  return { auctionPriceMultiplier: 1.2,  loanInterestMultiplier: 0.85, csaAutoWaitlist: true,  organicPremiumMultiplier: 1.2,  workersApplyProactively: true,  landSellersApproach: true,  legacyScoreMultiplier: 1.5 };
    case 'renowned':   return { auctionPriceMultiplier: 1.1,  loanInterestMultiplier: 0.92, csaAutoWaitlist: true,  organicPremiumMultiplier: 1.15, workersApplyProactively: true,  landSellersApproach: false, legacyScoreMultiplier: 1.0 };
    case 'respected':  return { auctionPriceMultiplier: 1.05, loanInterestMultiplier: 0.99, csaAutoWaitlist: false, organicPremiumMultiplier: 1.0,  workersApplyProactively: true,  landSellersApproach: false, legacyScoreMultiplier: 1.0 };
    case 'local':      return { auctionPriceMultiplier: 1.05, loanInterestMultiplier: 1.0,  csaAutoWaitlist: false, organicPremiumMultiplier: 1.0,  workersApplyProactively: false, landSellersApproach: false, legacyScoreMultiplier: 1.0 };
    default:           return { auctionPriceMultiplier: 1.0,  loanInterestMultiplier: 1.0,  csaAutoWaitlist: false, organicPremiumMultiplier: 1.0,  workersApplyProactively: false, landSellersApproach: false, legacyScoreMultiplier: 1.0 };
  }
}
```

- [ ] **Create `features/reputation/reputationTick.ts`**

```typescript
// features/reputation/reputationTick.ts

import type { GameTick } from '../../simulation/tickContext';
import { getTickState, patchTickState } from '../../simulation/tickContext';
import { advanceReputationWeek } from './reputationEngine';

export const reputationTick: GameTick = (ctx) => {
  if (ctx.newDay % 7 !== 0) return ctx;

  const state = getTickState(ctx);

  const animals      = (state.animals ?? []) as any[];
  const parcels      = (state.parcels ?? []) as any[];
  const loans        = (state.loans   ?? []) as any[];
  const owned        = parcels.filter((p: any) => p.owned);
  const totalHa      = owned.reduce((s: number, p: any) => s + (p.hectares ?? 0), 0);
  const organicHa    = owned.filter((p: any) => p.organicStatus === 'organic').reduce((s: number, p: any) => s + (p.hectares ?? 0), 0);
  const storage      = (state as any).storageItems ?? [];
  const totalDebt    = loans.filter((l: any) => !l.paid).reduce((s: number, l: any) => s + (l.amount ?? 0), 0);
  const annualIncome = totalHa * 40;

  const newReputation = advanceReputationWeek(state.reputation, {
    avgAnimalHealth:        animals.length > 0 ? animals.reduce((s: number, a: any) => s + (a.health ?? 80), 0) / animals.length : 100,
    organicHectareFraction: totalHa > 0 ? organicHa / totalHa : 0,
    hasHedgerows:           ((state as any).hedgerows?.length ?? 0) > 0,
    hasComposting:          ((state as any).compostPiles?.length ?? 0) > 0,
    avgStorageQuality:      storage.length > 0 ? storage.reduce((s: number, i: any) => s + (i.quality ?? 80), 0) / storage.length : 100,
    hasUnresolvedDefault:   loans.some((l: any) => l.defaulted && !l.paid),
    debtToIncomeRatio:      annualIncome > 0 ? totalDebt / annualIncome : 0,
    survivedCrisis:         !(state as any).bankrupt,
    communityStandingDelta: state.reputation.communityStandingDelta,
  });

  return patchTickState(ctx, { reputation: newReputation });
};
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep -E "reputation"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add features/reputation/
git commit -m "feat(phase3): add reputation types, engine, and tick module"
```

---

## Task 8: Neighbors Feature — Types + Engine + Tick

**Files:**
- Create: `features/neighbors/neighborTypes.ts`
- Create: `features/neighbors/neighborEngine.ts`
- Create: `features/neighbors/neighborTick.ts`

- [ ] **Create `features/neighbors/neighborTypes.ts`**

```typescript
// features/neighbors/neighborTypes.ts

import type { NeighborId } from '../../data/neighborData';

export type NeighborStatus = 'thriving' | 'struggling' | 'bankrupt' | 'sold';

export type NeighborFarm = {
  id: NeighborId;
  status: NeighborStatus;
  cash: number;
  debt: number;
  landHectares: number;
  landValue: number;
  relationship: number;
  strugglingYears: number;
  events: string[];
};

export type NeighborState = {
  caldwells:   NeighborFarm;
  petrovs:     NeighborFarm;
  greens:      NeighborFarm;
  hendersons:  NeighborFarm;
  obriens:     NeighborFarm;
  rodriguezes: NeighborFarm;
  millers:     NeighborFarm;
  kowalskis:   NeighborFarm;
};

export type NeighborLandOpportunity = {
  neighborId: NeighborId;
  type: 'auction' | 'direct_sale' | 'partnership';
  hectares: number;
  pricePerHectare: number;
  playerHasPriority: boolean;
  description: string;
};
```

- [ ] **Create `features/neighbors/neighborEngine.ts`**

```typescript
// features/neighbors/neighborEngine.ts
// Pure functions only. No Zustand imports.

import { NEIGHBOR_PROFILES, NEIGHBOR_IDS, OPERATING_COST_PER_HECTARE, NeighborId } from '../../data/neighborData';
import { getHistoricalBaseline } from '../../data/historicalPrices';
import { NeighborFarm, NeighborState, NeighborStatus, NeighborLandOpportunity } from './neighborTypes';
import type { ReputationTier } from '../reputation/reputationTypes';

function buildInitialFarm(id: NeighborId): NeighborFarm {
  const p = NEIGHBOR_PROFILES[id];
  return {
    id,
    status: 'thriving',
    cash: p.startingCash,
    debt: p.startingDebt,
    landHectares: p.startingLandHectares,
    landValue: 220,
    relationship: Math.floor(Math.random() * 51) + 20,
    strugglingYears: 0,
    events: [],
  };
}

export const INITIAL_NEIGHBOR_STATE: NeighborState = {
  caldwells:   buildInitialFarm('caldwells'),
  petrovs:     buildInitialFarm('petrovs'),
  greens:      buildInitialFarm('greens'),
  hendersons:  buildInitialFarm('hendersons'),
  obriens:     buildInitialFarm('obriens'),
  rodriguezes: buildInitialFarm('rodriguezes'),
  millers:     buildInitialFarm('millers'),
  kowalskis:   buildInitialFarm('kowalskis'),
};

const COMMODITY_MAP: Record<NeighborId, string> = {
  caldwells: 'wheat', petrovs: 'beef', greens: 'wheat', hendersons: 'wheat',
  obriens: 'milk', rodriguezes: 'beef', millers: 'wheat', kowalskis: 'wheat',
};

function historicalLandValue(year: number): number {
  if (year <= 1975) return 220;
  if (year <= 1980) return 500;
  if (year <= 1986) return 800;
  if (year <= 1990) return 560;
  if (year <= 2000) return 650;
  if (year <= 2008) return 900;
  if (year <= 2010) return 800;
  if (year <= 2020) return 1800;
  return 3200;
}

function deriveStatus(cash: number, debt: number, income: number, stress: number, bankrupt: number): NeighborStatus {
  if (cash < 0 && debt / Math.max(income, 1) > bankrupt) return 'bankrupt';
  if (debt / Math.max(income, 1) > stress || cash < 0) return 'struggling';
  return 'thriving';
}

function simulateYear(farm: NeighborFarm, calYear: number, multipliers: Record<string, number>): NeighborFarm {
  if (farm.status === 'bankrupt' || farm.status === 'sold') return farm;

  const profile  = NEIGHBOR_PROFILES[farm.id];
  const fuelMult = multipliers['fuel_cost'] ?? 1;
  const cropMult = multipliers['all_crop_prices'] ?? 1;
  const price    = getHistoricalBaseline(COMMODITY_MAP[farm.id], calYear) * cropMult;
  const income   = farm.landHectares * profile.productivityBase * price;
  const rate     = 0.07 + ((multipliers['loan_rate'] ?? 1) - 1) * 0.15;
  const expenses = farm.landHectares * OPERATING_COST_PER_HECTARE * fuelMult + farm.debt * rate;
  let cash = farm.cash + income - expenses;

  const isBoom = cropMult > 1.2;
  let { debt, landHectares } = farm;
  if (isBoom && profile.leverageAggressiveness > 0.5) {
    const newDebt = landHectares * 20 * profile.leverageAggressiveness;
    debt += newDebt;
    landHectares += newDebt / historicalLandValue(calYear);
  } else {
    const paydown = Math.max(0, cash * 0.3);
    cash -= paydown;
    debt = Math.max(0, debt - paydown);
  }

  const newStatus = deriveStatus(cash, debt, income, profile.stressRatio, profile.bankruptRatio);
  return {
    ...farm,
    cash,
    debt,
    landHectares,
    landValue: historicalLandValue(calYear),
    status: newStatus,
    strugglingYears: newStatus === 'struggling' ? farm.strugglingYears + 1 : 0,
  };
}

export function advanceNeighborYear(
  neighbors: NeighborState,
  calYear: number,
  multipliers: Record<string, number>,
  reputationTier: ReputationTier
): { neighbors: NeighborState; landOpportunities: NeighborLandOpportunity[] } {
  const updated: Partial<NeighborState> = {};
  const opps: NeighborLandOpportunity[] = [];

  for (const id of NEIGHBOR_IDS) {
    const farm = neighbors[id];
    const sim  = simulateYear(farm, calYear, multipliers);
    updated[id] = sim;

    if (farm.status !== 'bankrupt' && sim.status === 'bankrupt') {
      opps.push({
        neighborId: id, type: 'auction',
        hectares: Math.floor(sim.landHectares * 0.6),
        pricePerHectare: sim.landValue * 0.7,
        playerHasPriority: reputationTier !== 'unknown',
        description: `${NEIGHBOR_PROFILES[id].displayName} has gone bankrupt. Their land goes to auction.`,
      });
      updated[id] = { ...sim, events: [...sim.events, `bankrupt-${calYear}`] };
    }

    if ((id === 'millers' || id === 'petrovs') && sim.strugglingYears >= 2) {
      opps.push({
        neighborId: id, type: 'direct_sale',
        hectares: sim.landHectares,
        pricePerHectare: sim.landValue * 0.9,
        playerHasPriority: false,
        description: `${NEIGHBOR_PROFILES[id].displayName} has approached you about selling their land.`,
      });
    }

    if ((id === 'kowalskis' || id === 'greens') && sim.relationship >= 50 && sim.status !== 'bankrupt') {
      if (!sim.events.includes(`partnership-offered-${calYear}`)) {
        opps.push({
          neighborId: id, type: 'partnership', hectares: 0, pricePerHectare: 0,
          playerHasPriority: false,
          description: `${NEIGHBOR_PROFILES[id].displayName} has proposed a shared equipment co-op.`,
        });
        updated[id] = { ...(updated[id] ?? sim), events: [...sim.events, `partnership-offered-${calYear}`] };
      }
    }
  }

  return { neighbors: updated as NeighborState, landOpportunities: opps };
}

export function updateNeighborRelationship(
  neighbors: NeighborState,
  id: NeighborId,
  delta: number
): NeighborState {
  const farm = neighbors[id];
  return { ...neighbors, [id]: { ...farm, relationship: Math.max(0, Math.min(100, farm.relationship + delta)) } };
}
```

- [ ] **Create `features/neighbors/neighborTick.ts`**

```typescript
// features/neighbors/neighborTick.ts

import type { GameTick } from '../../simulation/tickContext';
import { getTickState, patchTickState } from '../../simulation/tickContext';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { advanceNeighborYear } from './neighborEngine';

export const neighborTick: GameTick = (ctx) => {
  const calYear     = gameDayToCalendarYear(ctx.newDay);
  const prevCalYear = gameDayToCalendarYear(ctx.newDay - 1);
  if (calYear === prevCalYear) return ctx;  // only runs on year rollover

  const state = getTickState(ctx);

  const { neighbors: newNeighbors, landOpportunities } = advanceNeighborYear(
    state.neighbors,
    calYear,
    state.timeline.effectMultipliers,
    state.reputation.tier
  );

  const existing = (state.pendingLandOpportunities ?? []) as typeof landOpportunities;
  const merged = [
    ...existing.filter(o => !landOpportunities.find(n => n.neighborId === o.neighborId)),
    ...landOpportunities,
  ];

  return patchTickState(ctx, { neighbors: newNeighbors, pendingLandOpportunities: merged });
};
```

- [ ] **Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep -E "neighbor"
```
Expected: no errors.

- [ ] **Commit**
```bash
git add features/neighbors/
git commit -m "feat(phase3): add neighbor types, engine, and tick module"
```

---

## Task 9: Add New State Fields to `types/domain/gameState.ts` and `store/initialState.ts`

**Files:**
- Modify: `types/domain/gameState.ts`
- Modify: `store/initialState.ts`

- [ ] **Step 1: Add imports and fields to `types/domain/gameState.ts`**

Find the `GameState` interface in `types/domain/gameState.ts`. Add these imports at the top:

```typescript
import type { FamilyState } from '../../features/family/familyTypes';
import type { ReputationState } from '../../features/reputation/reputationTypes';
import type { NeighborState, NeighborLandOpportunity } from '../../features/neighbors/neighborTypes';
import type { FamilyActions } from '../../features/family/familyActions';
```

Add these fields to the `GameState` interface:

```typescript
  // Phase 3
  family: FamilyState;
  reputation: ReputationState;
  neighbors: NeighborState;
  pendingLandOpportunities: NeighborLandOpportunity[];
  gameSetupComplete: boolean;
```

Add `FamilyActions` to the action union type at the bottom of `GameState` (where other action interfaces are merged in).

- [ ] **Step 2: Add initial values to `store/initialState.ts`**

Find the imports at the top of `store/initialState.ts`. Add:

```typescript
import { INITIAL_FAMILY_STATE } from '../features/family/familyTypes';
import { INITIAL_REPUTATION_STATE } from '../features/reputation/reputationTypes';
import { INITIAL_NEIGHBOR_STATE } from '../features/neighbors/neighborEngine';
```

In `makeInitialState()`, add these fields to the returned object:

```typescript
    family: INITIAL_FAMILY_STATE,
    reputation: INITIAL_REPUTATION_STATE,
    neighbors: INITIAL_NEIGHBOR_STATE,
    pendingLandOpportunities: [],
    gameSetupComplete: false,
```

- [ ] **Step 3: Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Commit**
```bash
git add types/domain/gameState.ts store/initialState.ts
git commit -m "feat(phase3): add family, reputation, and neighbor state fields to GameState"
```

---

## Task 10: Bump Save Key (`store/persistConfig.ts`) and Wire Actions (`store/useGameStore.ts`)

**Files:**
- Modify: `store/persistConfig.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Bump save key in `store/persistConfig.ts`**

```bash
grep -n "SAVE_STORAGE_KEY\|SAVE_VERSION" granja-tycoon/store/persistConfig.ts
```

Change:
```typescript
export const SAVE_STORAGE_KEY = 'granja-tycoon-save-v12';
export const SAVE_VERSION = 8;
```

To:
```typescript
export const SAVE_STORAGE_KEY = 'granja-tycoon-save-v13';
export const SAVE_VERSION = 9;
```

Update the `migrate` function to add Phase 3 defaults on upgrade:
```typescript
export function migrate(persistedState: any, version: number) {
  if (version < 9) {
    return {
      ...persistedState,
      family: INITIAL_FAMILY_STATE,
      reputation: INITIAL_REPUTATION_STATE,
      neighbors: INITIAL_NEIGHBOR_STATE,
      pendingLandOpportunities: [],
      gameSetupComplete: false,
    };
  }
  return persistedState;
}
```

Add the missing imports to `store/persistConfig.ts`:
```typescript
import { INITIAL_FAMILY_STATE } from '../features/family/familyTypes';
import { INITIAL_REPUTATION_STATE } from '../features/reputation/reputationTypes';
import { INITIAL_NEIGHBOR_STATE } from '../features/neighbors/neighborEngine';
```

- [ ] **Step 2: Wire family actions into `store/useGameStore.ts`**

Find where other action factories are spread in `useGameStore.ts` (search for `...createSettingsActions` or `...createBankingActions`). Add:

```typescript
import { createFamilyActions } from '../features/family/familyActions';
```

In the store's action spread:
```typescript
...createFamilyActions(set, get),
```

- [ ] **Step 3: Add new actions to the partialize exclusion list in `store/persistConfig.ts`**

Find `partializeGameState`. Add to the destructured exclusion list:
```typescript
makeLifeEventChoice, setFamilyMemberRole, initiateCoOwnershipAction,
applyFrictionChoiceAction, resolveBuyoutAction, completeGameSetup,
```

- [ ] **Step 4: Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Commit**
```bash
git add store/persistConfig.ts store/useGameStore.ts
git commit -m "feat(phase3): bump save key to v13, wire family actions into store"
```

---

## Task 11: Wire Ticks into `advanceGameDay` (`simulation/advanceDay.ts`)

**Files:**
- Modify: `simulation/advanceDay.ts`

**Context:** `advanceGameDay` is a plain function — no `DAILY_TICKS` array exists yet. Wire the three Phase 3 ticks by constructing a `TickContext` inside `advanceGameDay`, running them in sequence, and merging their `pendingState` into the existing `set()` call.

- [ ] **Step 1: Add imports at the top of `simulation/advanceDay.ts`**

Find the existing import block. Add:

```typescript
import { TickContext, getTickState, patchTickState } from './tickContext';
import { familyTick }     from '../features/family/familyTick';
import { reputationTick } from '../features/reputation/reputationTick';
import { neighborTick }   from '../features/neighbors/neighborTick';
```

- [ ] **Step 2: Find the dynasty block end in `advanceGameDay`**

```bash
grep -n "newDynasty\|INITIAL_DYNASTY_STATE" granja-tycoon/simulation/advanceDay.ts | tail -10
```

Identify the last line that sets `newDynasty` (after the `isNewYear` block closes).

- [ ] **Step 3: Add Phase 3 tick runner immediately after the dynasty block**

```typescript
        // ── Phase 3 Ticks ─────────────────────────────────────────────────────
        // Construct a TickContext seeded with today's already-computed values,
        // run the three Phase 3 ticks, then extract their state patches below.
        let phase3Ctx: TickContext = {
          previousState: state,
          pendingState: {
            day:      newDay,
            timeline: newTimeline,
            dynasty:  newDynasty,
          },
          newDay,
          summary: [],
        };
        phase3Ctx = familyTick(phase3Ctx);
        phase3Ctx = reputationTick(phase3Ctx);
        phase3Ctx = neighborTick(phase3Ctx);
        const phase3Patch = phase3Ctx.pendingState;
```

- [ ] **Step 4: Merge phase3Patch into the final `set()` call**

Find the large `set({...})` call at the end of `advanceGameDay` (the one that contains `day: newDay`, `timeline: newTimeline`, `dynasty: newDynasty`). Add the Phase 3 fields to it:

```typescript
          // Phase 3 state — spread from tick pipeline output
          ...(phase3Patch.family               ? { family:                    phase3Patch.family }               : {}),
          ...(phase3Patch.reputation           ? { reputation:                phase3Patch.reputation }           : {}),
          ...(phase3Patch.neighbors            ? { neighbors:                 phase3Patch.neighbors }            : {}),
          ...(phase3Patch.pendingLandOpportunities ? { pendingLandOpportunities: phase3Patch.pendingLandOpportunities } : {}),
```

- [ ] **Step 5: Verify TypeScript**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 6: Smoke test**

```bash
cd granja-tycoon && npx expo start --web
```

Open app. Advance to day 365. In browser console, inspect the Zustand store:

- `family.pendingLifeEvents` — empty array or one event
- `reputation.score` — non-zero after 7 days
- `neighbors.caldwells.cash` — different from starting value after 360 days
- `gameSetupComplete` — false (starting screen not built yet)

- [ ] **Commit**
```bash
git add simulation/advanceDay.ts
git commit -m "feat(phase3): wire family, reputation, and neighbor ticks into advanceGameDay"
```

---

## Task 12: Verification Checklist

- [ ] **TypeScript clean**
```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **Lint clean**
```bash
cd granja-tycoon && npx expo lint -- features/family features/reputation features/neighbors data/lifeEvents.ts data/neighborData.ts
```

- [ ] **Family: event fires correctly**
Start app, advance ~400 days from 1970. The farmer is ~31, single. Within a few hundred days `family.pendingLifeEvents` should receive a `meet_someone` event. Add a temporary log in `familyTick.ts`:
```typescript
if (ctx.newDay % 30 === 0) console.log('[family]', state.family.pendingLifeEvents.length, 'events pending');
```
Remove after verifying.

- [ ] **Reputation: score updates weekly**
Advance 7 days. `reputation.score` should have moved from 0 into the 30–50 range with a basic farm.

- [ ] **Neighbors: all 8 farms track correctly**
Advance 360 days (one full year). Check `neighbors.caldwells`, `neighbors.millers` etc. — `cash`, `debt`, and `landValue` should all differ from starting values.

- [ ] **Save key updated**
Browser DevTools → Application → Local Storage. Key `granja-tycoon-save-v13` should exist. Key `granja-tycoon-save-v12` should not.

- [ ] **Final commit**
```bash
git add -A
git commit -m "feat(phase3.1): engine layer complete — family, reputation, neighbor ticks wired"
```
