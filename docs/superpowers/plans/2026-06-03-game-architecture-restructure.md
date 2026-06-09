# Game Architecture Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Granja Tycoon so Phase 3 and future endgame systems can be added as focused modules instead of increasing the size and risk of `store/useGameStore.ts`.

**Architecture:** Keep one persisted Zustand store initially, but convert it into a thin composition shell. Move domain types, initial state, persistence, actions, selectors, and daily simulation orchestration into focused modules while preserving player saves and web compatibility.

**Tech Stack:** React Native 0.81.5, Expo 54, Expo Router, TypeScript 5.9.2, Zustand 5, AsyncStorage, synchronous tick-based simulation.

---

## Why This Plan Exists

The current game is maintainable in small bursts but risky for endgame-scale development. The main issue is not React Native, Expo, Zustand, or the existing engine modules. The issue is that `store/useGameStore.ts` has become the central owner of too many responsibilities.

Current hotspot:

- `store/useGameStore.ts` is about 10,226 lines.
- `advanceDay()` starts around line 1594 and runs until around line 6139.
- The store exports many domain types used by UI and engine modules.
- Several engine files import types from the store, reversing the intended dependency direction.
- New features have been added by appending blocks to `advanceDay()`, which keeps short-term implementation easy but makes long-term maintenance harder.

This plan does not change gameplay. It creates a safer architecture so later systems can be added without repeatedly touching a giant store method.

---

## Claude Review Request

Claude reviewed this plan and approved Phase 3.0 with two required changes, now incorporated:

1. `TickContext` must use `pendingState` accumulation and a single `set()` in `finalizeDayTick`, instead of allowing every tick to call `set()`.
2. The medium-risk action extraction task must be split into individual action-group tasks, each with its own verification and commit.

Claude's greenlight:

```text
Approve the plan with two required changes before executing:
1. Change TickContext to use pendingState accumulation + single set() in finalizeDayTick (not per-tick set() calls)
2. Split Task 7 into individual sub-tasks per action group, each with its own commit
Everything else is solid. Give Codex those two changes and greenlight Phase 3.0.
```

Claude should still answer these questions if the plan changes again before execution:

1. Is this stabilization worth doing before Phase 3 implementation?
2. Should this be treated as `Phase 3.0 Architecture Stabilization`?
3. Should the current `docs/ai-coding-rules.md` rule that says not to restructure `advanceDay()` be amended for this approved stabilization only?
4. Is the proposed module structure too large, too small, or right-sized?
5. Which task should be done first if Claude wants a lower-risk version of the plan?

Recommended answer if Claude agrees:

```text
Yes. Add Phase 3.0 before Phase 3 feature implementation. New Phase 3 systems must enter through tick modules and feature actions, not through new giant blocks inside useGameStore.ts.
```

---

## Non-Negotiable Guardrails

These rules must be preserved throughout the restructure:

- Do not remove Zustand `partialize`.
- Do not persist action functions.
- Do not change `metro.config.js` `unstable_enablePackageExports: false`.
- Do not remove `GestureHandlerRootView`.
- Do not add `pointerEvents="box-none"` to the `<Tabs>` wrapper.
- Do not rename save-critical IDs: crop IDs, animal enclosure types, insurance types, building IDs, machine IDs, product IDs, route names, or stored enum values.
- Do not convert this into multiple persisted Zustand stores during this plan.
- Do not add gameplay features while doing this restructure.
- Do not change formulas, prices, balances, event probabilities, or progression rules unless a moved function is proven to be broken.
- Do not use dynamic `require()` when moving code. Prefer static ES imports.
- Do not use `as any` or `// @ts-ignore` to silence type errors.
- Do not commit with TypeScript errors.

Current save key found in code:

```text
granja-tycoon-save-v12
```

The store persist config currently has:

```text
name: 'granja-tycoon-save-v12'
version: 8
```

This mismatch should be discussed by Claude. The restructure itself should not bump the save key unless stored state shape changes. Pure file moves and action extraction should not require a save key bump.

---

## Target Architecture

Target structure:

```text
store/
  useGameStore.ts
  createGameStore.ts
  initialState.ts
  persistConfig.ts
  selectors.ts
  actions/
    animalActions.ts
    auctionActions.ts
    bankingActions.ts
    cropActions.ts
    electricityActions.ts
    landActions.ts
    machineryActions.ts
    mapActions.ts
    processingActions.ts
    settingsActions.ts
    soilActions.ts
    workerActions.ts

simulation/
  advanceDay.ts
  tickContext.ts
  tickPipeline.ts
  ticks/
    animalTick.ts
    auctionTick.ts
    coopTick.ts
    cropTick.ts
    electricityTick.ts
    eventTick.ts
    financeTick.ts
    landTick.ts
    marketTick.ts
    processingTick.ts
    sellingChannelsTick.ts
    soilTick.ts
    timelineTick.ts
    waterTick.ts
    weatherTick.ts
    workerTick.ts

types/
  domain/
    animals.ts
    auctions.ts
    economy.ts
    electricity.ts
    gameState.ts
    land.ts
    machinery.ts
    processing.ts
    uiEvents.ts
```

Optional later structure after this plan:

```text
features/
  family/
    familyTypes.ts
    familyActions.ts
    familyTick.ts
    FamilySection.tsx
  reputation/
    reputationTypes.ts
    reputationTick.ts
  neighbors/
    neighborTypes.ts
    neighborTick.ts
  annualPlanning/
    annualPlanningTypes.ts
    annualPlanningTick.ts
    AnnualPlanningSection.tsx
```

Do not create the optional `features/` Phase 3 folders during this stabilization unless Claude explicitly approves.

---

## Dependency Direction

The intended dependency direction:

```text
app/components -> store -> simulation -> engine/data/types
app/components -> data/types/engine helpers
engine -> data/types only
types -> no store imports
data -> no store imports
```

Forbidden dependency directions:

```text
engine -> store
types -> store
data -> store
simulation -> app/components
store actions -> app/components
```

Current known violations to fix:

```text
engine/crops.ts imports LandParcel from store/useGameStore
engine/water.ts imports LandParcel from store/useGameStore
engine/productionBuildings.ts imports ProductionBuildingState from store/useGameStore
engine/pollination.ts imports LandParcel from store/useGameStore
UI files import domain types from store/useGameStore
```

---

## Refactor Strategy

Use the strangler pattern:

1. Extract types first.
2. Extract initial state and persistence second.
3. Extract actions by domain third.
4. Extract daily simulation orchestration fourth.
5. Split the daily tick into modules fifth.
6. Add tests or verification harnesses once modules exist.

Do not attempt to split everything in one pass. Each task should compile independently.

---

## Behavior Preservation Strategy

For every task:

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
TypeScript: 0 errors
ESLint: 0 errors, warnings acceptable only if pre-existing
```

Manual smoke test after major milestones:

```bash
npx expo start --web
```

Verify:

- App loads on web.
- Advance Day button still works.
- A crop can be planted.
- A day can advance after planting.
- A ready crop can be harvested.
- A crop can be sold.
- Settings export/import still uses the correct save key.
- No buttons silently stop working after reload.

Because there is no test suite today, this plan includes creating a small simulation verification harness before large `advanceDay()` work.

---

## Task 1: Add Architecture Stabilization Notes To Coding Rules

**Purpose:** Make sure future agents know this restructure is approved and does not conflict with the existing "do not restructure advanceDay" rule.

**Files:**

- Modify: `docs/ai-coding-rules.md`

- [ ] **Step 1: Add a temporary architecture exception**

Add this section near the existing `What NOT to Do` section:

```markdown
## Approved Architecture Stabilization Exception

The normal rule is: do not rewrite or restructure `advanceDay()`.

Exception: if the active plan is `docs/superpowers/plans/2026-06-03-game-architecture-restructure.md`, agents may extract `advanceDay()` into simulation modules as long as:

- gameplay behavior is preserved
- `partialize` is preserved
- the save key is not changed unless stored state shape changes
- TypeScript passes after every task
- no new gameplay features are added during the restructure
- extracted ticks keep the same execution order as the original method
```

- [ ] **Step 2: Run verification**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
0 TypeScript errors
```

- [ ] **Step 3: Commit**

```bash
git add docs/ai-coding-rules.md docs/superpowers/plans/2026-06-03-game-architecture-restructure.md
git commit -m "docs: add architecture stabilization plan"
```

---

## Task 2: Move Domain Types Out Of The Store

**Purpose:** Stop `store/useGameStore.ts` from being the source of truth for domain types.

**Files:**

- Create: `types/domain/land.ts`
- Create: `types/domain/animals.ts`
- Create: `types/domain/machinery.ts`
- Create: `types/domain/auctions.ts`
- Create: `types/domain/economy.ts`
- Create: `types/domain/processing.ts`
- Create: `types/domain/electricity.ts`
- Create: `types/domain/uiEvents.ts`
- Create: `types/domain/gameState.ts`
- Modify: `store/useGameStore.ts`
- Modify: engine files that import types from `store/useGameStore`
- Modify: UI files that import types from `store/useGameStore`

- [ ] **Step 1: Create `types/domain/land.ts`**

Move `LandParcel` from `store/useGameStore.ts` into `types/domain/land.ts`.

The new file should import only from `engine`, `data`, or other `types` files. It must not import from `store`.

```ts
import type { PlantedCrop, SoilStats, SoilType } from '../../engine/crops';

export interface LandParcel {
  id: string;
  name: string;
  fertility: number;
  soil: SoilStats;
  cropHistory: string[];
  hectares: number;
  pricePerHa: number;
  owned: boolean;
  hasWeeds: boolean;
  plantedCrop: PlantedCrop | null;
  lastCropId?: string;
  greenhouse: boolean;
  irrigated: boolean;
  tilled: boolean;
  seedEntryId?: string;
  soilType?: SoilType;
  diseased?: boolean;
  diseasedDay?: number;
  pestState?: import('../../engine/pests').PestState;
  linkedColmenaId?: string;
  pesticideSprayedDay?: number;
  soilAnalysis?: import('../../engine/precision').SoilAnalysis;
  precisionApplied: boolean;
  yieldHistory: import('../../engine/precision').YieldEntry[];
  weedDetectedDay?: number;
  soilWetUntilDay?: number;
  bareDayCtr?: number;
  recentIrrigationDays?: number[];
  soilSalinity?: number;
  topsoilErosion?: number;
  tillageSystem?: 'conventional' | 'reduced' | 'notill';
  tillageSystemSince?: number;
  notillSeasons?: number;
  residueCoverage?: boolean;
  weedFlushSeason?: boolean;
  waterwayAdjacent?: boolean;
  organicStatus?: 'conventional' | 'transition_1' | 'transition_2' | 'transition_3' | 'organic' | 'decertified';
  organicTransitionStartDay?: number;
  lastDecertifiedDay?: number;
  pendingContaminationAppeal?: import('../../engine/organicCert').ContaminationAppeal;
  compostNPKReleaseRemaining?: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    daysLeft: number;
  };
}
```

- [ ] **Step 2: Create remaining domain type files**

Move these interfaces/types from `store/useGameStore.ts`:

```text
types/domain/animals.ts:
  ShowEntry
  ShowResult

types/domain/machinery.ts:
  OwnedMachine
  OwnedAttachment
  OwnedTrailer
  DeliveryCargo
  ReturnOrder
  DeliveryJob
  TractorJob
  HarvestJob
  MachineRepair

types/domain/auctions.ts:
  AuctionPickup
  AuctionBid
  AuctionLot
  AuctionCategory
  AuctionListing

types/domain/economy.ts:
  FuturesPosition
  MarketOrder
  PriceAlert
  SeasonGoal
  InsurancePolicy
  InsuranceClaim
  RivalNewsItem

types/domain/processing.ts:
  ProductionBuildingState
  HenilBatch
  IncubationBatch

types/domain/electricity.ts:
  ElectricityState

types/domain/uiEvents.ts:
  GameEvent
  FieldEvent
  DaySummaryEvent
  FairEvent
```

Use the exact existing property names. Do not rename fields.

- [ ] **Step 3: Create `types/domain/gameState.ts`**

Move the `GameState` interface from `store/useGameStore.ts` into `types/domain/gameState.ts`.

Import the domain types from the new files. Preserve every state field and every action signature.

- [ ] **Step 4: Re-export types from `store/useGameStore.ts` temporarily**

To avoid updating every UI import in one massive change, add temporary re-exports:

```ts
export type { GameState } from '../types/domain/gameState';
export type { LandParcel } from '../types/domain/land';
export type { AuctionListing, AuctionCategory } from '../types/domain/auctions';
export type { OwnedMachine, OwnedAttachment, OwnedTrailer, TractorJob, HarvestJob, DeliveryJob, DeliveryCargo } from '../types/domain/machinery';
export type { DaySummaryEvent, FieldEvent, GameEvent } from '../types/domain/uiEvents';
export type { ProductionBuildingState, HenilBatch, IncubationBatch } from '../types/domain/processing';
export type { FuturesPosition, SeasonGoal } from '../types/domain/economy';
```

These re-exports are allowed only during the transition. Later tasks should update UI imports to use `types/domain/*` directly.

- [ ] **Step 5: Fix engine imports**

Change engine imports:

```text
engine/crops.ts:
  from '../store/useGameStore'
  to '../types/domain/land'

engine/water.ts:
  from '../store/useGameStore'
  to '../types/domain/land'

engine/productionBuildings.ts:
  from '../store/useGameStore'
  to '../types/domain/processing'

engine/pollination.ts:
  from '../store/useGameStore'
  to '../types/domain/land'
```

- [ ] **Step 6: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 7: Commit**

```bash
git add types/domain store/useGameStore.ts engine/crops.ts engine/water.ts engine/productionBuildings.ts engine/pollination.ts
git commit -m "refactor: move domain types out of game store"
```

---

## Task 3: Extract Initial State

**Purpose:** Move initial state creation out of the store file without changing any values.

**Files:**

- Create: `store/initialState.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Create `store/initialState.ts`**

Move these functions/constants from `store/useGameStore.ts`:

```text
FIELD_NAMES
SOIL_DISTRIBUTION
randomSoilType
generateParcelsFromMap
generateInitialPrices
generateInitialListings
makeInitialState
```

Export:

```ts
export function makeInitialState(): Omit<GameState, keyof GameActions>
```

If separating `GameActions` is not done yet, export:

```ts
export function makeInitialState()
```

and let TypeScript infer the return type for this task only.

- [ ] **Step 2: Replace local references**

In `store/useGameStore.ts`, replace the local `makeInitialState()` definition with:

```ts
import { makeInitialState } from './initialState';
```

Keep existing calls:

```text
...makeInitialState()
set(makeInitialState())
const fresh = makeInitialState()
const initial = makeInitialState()
```

- [ ] **Step 3: Remove dynamic requires while moving**

In `generateInitialPrices()`, replace dynamic `require()` calls with static imports:

```ts
import { COMMODITY_BASELINES } from '../data/prices';
import { ANIMAL_PRODUCTS } from '../data/animalProducts';
import { PROCESSED_PRODUCTS } from '../data/processingTypes';
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 5: Commit**

```bash
git add store/initialState.ts store/useGameStore.ts
git commit -m "refactor: extract game initial state"
```

---

## Task 4: Extract Persist Config And Action Exclusion

**Purpose:** Make save behavior explicit and safer to modify.

**Files:**

- Create: `store/persistConfig.ts`
- Modify: `store/useGameStore.ts`
- Modify: `components/office/SettingsSection.tsx` if constants are shared

- [ ] **Step 1: Create `store/persistConfig.ts`**

Move persistence config out of `useGameStore.ts`.

The file should export:

```ts
export const SAVE_STORAGE_KEY = 'granja-tycoon-save-v12';
export const SAVE_VERSION = 8;
export function partializeGameState(state: GameState): Partial<GameState>;
export function repairHydratedState(state: GameState | undefined): void;
export const gamePersistConfig = {
  name: SAVE_STORAGE_KEY,
  version: SAVE_VERSION,
  migrate,
  storage,
  partialize: partializeGameState,
  onRehydrateStorage,
};
```

Important:

- `partializeGameState` must exclude every action function currently excluded by `partialize`.
- `repairHydratedState` must preserve all existing `onRehydrateStorage` repair logic.
- Do not change the save key in this task.
- Do not change the save version in this task.

- [ ] **Step 2: Use shared save key in Settings**

In `components/office/SettingsSection.tsx`, replace hardcoded save key strings with:

```ts
import { SAVE_STORAGE_KEY } from '../../store/persistConfig';
```

Then use:

```ts
await AsyncStorage.getItem(SAVE_STORAGE_KEY);
await AsyncStorage.setItem(SAVE_STORAGE_KEY, raw);
```

- [ ] **Step 3: Wire store to config**

In `store/useGameStore.ts`, replace inline persist options with:

```ts
import { gamePersistConfig } from './persistConfig';

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...makeInitialState(),
      // actions
    }),
    gamePersistConfig,
  ),
);
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 5: Commit**

```bash
git add store/persistConfig.ts store/useGameStore.ts components/office/SettingsSection.tsx
git commit -m "refactor: extract game persistence config"
```

---

## Task 5: Add Store Action Factory Pattern

**Purpose:** Prepare for action extraction without changing behavior.

**Files:**

- Create: `store/actions/types.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Create action factory types**

Create `store/actions/types.ts`:

```ts
import type { StoreApi } from 'zustand';
import type { GameState } from '../../types/domain/gameState';

export type GameSet = StoreApi<GameState>['setState'];
export type GameGet = StoreApi<GameState>['getState'];

export type ActionFactory<TActions> = (set: GameSet, get: GameGet) => TActions;
```

- [ ] **Step 2: Create one tiny action module first**

Create `store/actions/settingsActions.ts`:

```ts
import type { ActionFactory } from './types';

export interface SettingsActions {
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
}

export const createSettingsActions: ActionFactory<SettingsActions> = (set) => ({
  setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
  setHapticEnabled: (enabled: boolean) => set({ hapticEnabled: enabled }),
  setMusicEnabled: (enabled: boolean) => set({ musicEnabled: enabled }),
});
```

- [ ] **Step 3: Replace settings actions in store**

In `store/useGameStore.ts`, import:

```ts
import { createSettingsActions } from './actions/settingsActions';
```

Add it near the top of the action spread:

```ts
...createSettingsActions(set, get),
```

Remove the inline `setSoundEnabled`, `setHapticEnabled`, and `setMusicEnabled` definitions from the store action object.

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 5: Commit**

```bash
git add store/actions store/useGameStore.ts
git commit -m "refactor: introduce store action factories"
```

---

## Task 6: Extract Low-Risk Action Groups

**Purpose:** Shrink the store by moving actions that have limited cross-system dependencies.

**Files:**

- Create: `store/actions/mapActions.ts`
- Create: `store/actions/settingsActions.ts` if not already created
- Create: `store/actions/workerActions.ts`
- Create: `store/actions/bankingActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract map actions**

Move these actions into `store/actions/mapActions.ts`:

```text
selectMapField
savePanZoom
buyMapField
scoutMapField
```

Use the original implementation exactly.

- [ ] **Step 2: Extract worker actions**

Move these actions into `store/actions/workerActions.ts`:

```text
hireWorker
fireWorker
postVacancy
closePosting
hireApplicant
approveRequest
denyRequest
chooseBranch
startCertStudy
setWorkerNightShift
hireConsultant
setWorkerShiftPreference
```

Use the original implementation exactly.

- [ ] **Step 3: Extract banking actions**

Move these actions into `store/actions/bankingActions.ts`:

```text
requestLoan
repayLoan
depositSavings
withdrawSavings
renegotiateLoan
takeBankruptcyLoan
clearBankruptcy
openTimeDeposit
closeTimeDeposit
```

Use the original implementation exactly.

- [ ] **Step 4: Wire action factories**

In `store/useGameStore.ts`, add:

```ts
...createMapActions(set, get),
...createWorkerActions(set, get),
...createBankingActions(set, get),
```

Remove the inline versions.

- [ ] **Step 5: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 6: Commit**

```bash
git add store/actions store/useGameStore.ts
git commit -m "refactor: extract low-risk store actions"
```

---

## Task 7A: Extract Land And Soil Actions

**Purpose:** Continue shrinking the store while staying away from the day tick. This task extracts only land, soil, water, lease, certification, and parcel-management actions.

**Files:**

- Create: `store/actions/landActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract land and soil actions**

Move:

```text
buyParcel
installIrrigation
applySoilAmendment
applySoilNPK
plantCoverCrop
clearWeeds
linkParcelToColmena
orderSoilAnalysis
applyPrecisionInputs
applyCompost
fertilizeCrop
applyLime
applyGypsum
applyLeachingFlush
applySubsoiling
setTillageSystem
installHedgerow
enrollAES
startOrganicTransition
fileContaminationAppeal
signLease
cancelLease
assignHydrogeologist
startDrilling
installPump
connectParcel
disconnectParcel
setGridWater
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createLandActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/landActions.ts store/useGameStore.ts
git commit -m "refactor: extract land store actions"
```

---

## Task 7B: Extract Crop And Market Actions

**Purpose:** Move crop, harvest, seed, futures, market order, and auto-sell actions into a focused action module.

**Files:**

- Create: `store/actions/cropActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract crop and market actions**

Move:

```text
plantCrop
harvestCrop
sellCrop
harvestAllReady
sellSeedBatch
buyMarketSeed
plantCropBatch
startHybridization
selectSeedForParcel
addPriceAlert
removePriceAlert
placeMarketOrder
cancelMarketOrder
setSelectedMarket
openFuture
setAutoSell
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createCropActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/cropActions.ts store/useGameStore.ts
git commit -m "refactor: extract crop and market store actions"
```

---

## Task 7C: Extract Animal Actions

**Purpose:** Move livestock, breeding, feed, animal product, animal show, and animal infrastructure actions into a focused action module.

**Files:**

- Create: `store/actions/animalActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract animal actions**

Move:

```text
buyAnimal
addToHenil
feedAnimals
saveRation
sellAnimal
collectAnimalProduction
collectAllProduction
sellAnimalProduct
breedAnimal
cullAnimal
treatAnimal
setBreedingPair
clearBreedingPair
designateAsSire
removeFromSirePen
spreadSlurry
fillSilagePit
setBiogasMode
queueEggsForIncubation
enterAnimalShow
withdrawAnimalShow
upgradeAnimalGene
cureDisease
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createAnimalActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/animalActions.ts store/useGameStore.ts
git commit -m "refactor: extract animal store actions"
```

---

## Task 7D: Extract Machinery And Delivery Actions

**Purpose:** Move machinery purchase, repair, contractor, job assignment, fuel, trailer, and delivery actions into a focused action module.

**Files:**

- Create: `store/actions/machineryActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract machinery and delivery actions**

Move:

```text
buyMachine
buyAttachment
buyTrailer
hitchTrailer
assignJob
assignHarvestJob
hireContractor
dispatchDelivery
startRepair
buyFuel
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createMachineryActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/machineryActions.ts store/useGameStore.ts
git commit -m "refactor: extract machinery store actions"
```

---

## Task 7E: Extract Processing And Production Building Actions

**Purpose:** Move processing, production building, equipment, deep clean, compost, and batch actions into a focused action module.

**Files:**

- Create: `store/actions/processingActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract processing and production building actions**

Move:

```text
processProduct
sellProcessed
buyProcessingBuilding
upgradeProcessingBuilding
assignWorkerToProcessingBuilding
unassignWorkerFromProcessingBuilding
installColdStorage
purchaseProductionBuilding
assignWorkerToBuilding
unassignWorkerFromBuilding
installEquipment
performDeepClean
startCompostBatch
turnCompostBatch
waterCompostBatch
collectCompostBatch
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createProcessingActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/processingActions.ts store/useGameStore.ts
git commit -m "refactor: extract processing store actions"
```

---

## Task 7F: Extract Auction Actions

**Purpose:** Move listing, withdrawal, and bidding actions into a focused auction action module.

**Files:**

- Create: `store/actions/auctionActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract auction actions**

Move:

```text
listItem
withdrawListing
placeBid
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createAuctionActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/auctionActions.ts store/useGameStore.ts
git commit -m "refactor: extract auction store actions"
```

---

## Task 7G: Extract Electricity Actions

**Purpose:** Move electricity infrastructure, generation, battery, generator, service, and surge protection actions into a focused action module.

**Files:**

- Create: `store/actions/electricityActions.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Extract electricity actions**

Move:

```text
upgradeGridTier
buySolarPanels
buyWindTurbines
buildBiogasPlant
buildBiomassCHP
loadBiomassStraw
buildHeatPipeNetwork
buyBatteryBanks
buyGenerator
refuelGenerator
toggleGenerator
serviceEquipment
addSurgeProtector
```

- [ ] **Step 2: Wire action factory**

In `store/useGameStore.ts`, add:

```ts
...createElectricityActions(set, get),
```

Remove the inline versions.

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add store/actions/electricityActions.ts store/useGameStore.ts
git commit -m "refactor: extract electricity store actions"
```

---

## Task 7H: Verify Medium-Risk Action Extraction As A Set

**Purpose:** Run a final verification pass after all medium-risk action modules have been extracted through individual commits.

**Files:**

- Verify: `store/actions/*.ts`
- Verify: `store/useGameStore.ts`

- [ ] **Step 1: Confirm action modules exist**

Run:

```bash
Get-ChildItem store/actions -Filter *.ts | Select-Object Name
```

Expected:

```text
animalActions.ts
auctionActions.ts
bankingActions.ts
cropActions.ts
electricityActions.ts
landActions.ts
machineryActions.ts
mapActions.ts
processingActions.ts
settingsActions.ts
types.ts
workerActions.ts
```

- [ ] **Step 2: Run final verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 3: Commit if verification documentation changed**

Only commit if this task modifies docs or helper scripts:

```bash
git add docs scripts package.json package-lock.json
git commit -m "chore: document action extraction verification"
```

---

## Task 8: Create Simulation Verification Harness

**Purpose:** Add a small safety net before extracting the day tick.

**Files:**

- Create: `scripts/verify-simulation.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add script**

Create `scripts/verify-simulation.mjs`.

The script should:

- import the TypeScript modules through the project toolchain if available, or run after TypeScript compilation checks only
- verify that `makeInitialState()` returns required baseline fields
- verify that action keys exist on the store
- verify that `advanceDay` increments `day` once

If direct importing TypeScript from Node is not viable without adding dependencies, keep this as a documented manual harness and do not add dependencies.

Preferred minimal `package.json` script:

```json
{
  "scripts": {
    "verify:types": "tsc --noEmit"
  }
}
```

Do not install a test framework in this task unless Claude approves.

- [ ] **Step 2: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 3: Commit**

```bash
git add scripts package.json package-lock.json
git commit -m "chore: add simulation verification entrypoint"
```

If no script is added because no dependency-free harness is viable, commit only a note in this plan or skip this task after Claude approval.

---

## Task 9: Extract `advanceDay()` Into `simulation/advanceDay.ts`

**Purpose:** Move the giant method out of the store while preserving exact behavior.

**Files:**

- Create: `simulation/advanceDay.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Create `simulation/advanceDay.ts`**

Move the body of the current inline `advanceDay` action into:

```ts
import type { GameGet, GameSet } from '../store/actions/types';

export function advanceGameDay(set: GameSet, get: GameGet): void {
  const state = get();
  const newDay = state.day + 1;

  // Original advanceDay body goes here unchanged.
}
```

All imports used by the moved body should be static ES imports at the top of `simulation/advanceDay.ts`.

- [ ] **Step 2: Replace store action**

In `store/useGameStore.ts`, replace inline `advanceDay` with:

```ts
advanceDay: () => advanceGameDay(set, get),
```

- [ ] **Step 3: Keep `advanceDays` in store initially**

Do not move `advanceDays` yet. It can continue to call:

```ts
get().advanceDay();
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 5: Manual smoke test**

Run:

```bash
npx expo start --web
```

Verify:

```text
App loads.
Advance Day works.
Day Summary still appears.
No buttons silently fail after browser reload.
```

- [ ] **Step 6: Commit**

```bash
git add simulation/advanceDay.ts store/useGameStore.ts
git commit -m "refactor: extract advance day orchestrator"
```

---

## Task 10: Introduce Tick Context And Pipeline Without Splitting Ticks Yet

**Purpose:** Create the future shape while keeping behavior centralized for one more commit. Per Claude review, ticks must accumulate changes in `pendingState`; they must not call `set()` directly. Only `finalizeDayTick` performs the final Zustand write.

**Files:**

- Create: `simulation/tickContext.ts`
- Create: `simulation/tickPipeline.ts`
- Modify: `simulation/advanceDay.ts`

- [ ] **Step 1: Create tick context**

Create `simulation/tickContext.ts`:

```ts
import type { GameSet } from '../store/actions/types';
import type { GameState } from '../types/domain/gameState';
import type { DaySummaryEvent } from '../types/domain/uiEvents';

export type PendingGameState = Partial<GameState>;

export interface TickContext {
  /**
   * Immutable snapshot from the start of advanceDay().
   * Use this for old-state comparisons.
   */
  previousState: GameState;

  /**
   * Accumulated next-state patch.
   * Ticks read/write this instead of calling set().
   */
  pendingState: PendingGameState;

  newDay: number;
  summary: DaySummaryEvent[];
}

export interface FinalizeTickContext extends TickContext {
  set: GameSet;
}

export type GameTick = (ctx: TickContext) => TickContext;
export type FinalizeGameTick = (ctx: FinalizeTickContext) => FinalizeTickContext;

export function getTickState(ctx: TickContext): GameState {
  return {
    ...ctx.previousState,
    ...ctx.pendingState,
  };
}

export function patchTickState(ctx: TickContext, patch: PendingGameState): TickContext {
  return {
    ...ctx,
    pendingState: {
      ...ctx.pendingState,
      ...patch,
    },
  };
}
```

Rules:

- Regular ticks receive `TickContext`, not `set`.
- Regular ticks must return a new context with updated `pendingState`.
- Regular ticks must use `getTickState(ctx)` when they need the latest accumulated state.
- Regular ticks must use `patchTickState(ctx, patch)` or equivalent object spreading to add changes.
- Regular ticks must not call Zustand `set()`.
- `finalizeDayTick` is the only tick allowed to call `set()`.

- [ ] **Step 2: Create pipeline**

Create `simulation/tickPipeline.ts`:

```ts
import type { FinalizeGameTick, FinalizeTickContext, GameTick, TickContext } from './tickContext';

export function runTickPipeline(initialContext: TickContext, ticks: GameTick[]): TickContext {
  return ticks.reduce((ctx, tick) => tick(ctx), initialContext);
}

export function runFinalTick(context: TickContext, set: FinalizeTickContext['set'], finalizeTick: FinalizeGameTick): FinalizeTickContext {
  return finalizeTick({
    ...context,
    set,
  });
}
```

- [ ] **Step 3: Do not split logic yet**

Keep the existing `advanceGameDay()` implementation as-is. This task only introduces the types and helper for future extraction.

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 5: Commit**

```bash
git add simulation/tickContext.ts simulation/tickPipeline.ts simulation/advanceDay.ts
git commit -m "refactor: introduce daily tick pipeline types"
```

---

## Task 11: Split `advanceGameDay()` Into Tick Modules By Original Order

**Purpose:** Convert the day tick from one huge function into ordered modules.

**Files:**

- Create files under `simulation/ticks/`
- Modify: `simulation/advanceDay.ts`

Important:

Each tick must preserve original execution order. Do not improve formulas. Do not rebalance. Do not reorder systems unless Claude approves.

Claude-approved tick mutation rule:

```text
Ticks accumulate changes into ctx.pendingState.
Ticks do not call set().
finalizeDayTick performs exactly one set(ctx.pendingState) at the end.
```

Recommended first extraction order:

```text
timelineTick
weatherTick
marketTick
workerTick
financeTick
eventTick
auctionTick
cropTick
soilTick
animalTick
processingTick
waterTick
coopTick
electricityTick
sellingChannelsTick
finalizeDayTick
```

- [ ] **Step 1: Extract timeline tick**

Move only the historical timeline and dynasty year rollover block into:

```text
simulation/ticks/timelineTick.ts
```

Export:

```ts
import type { GameTick } from '../tickContext';
import { getTickState, patchTickState } from '../tickContext';

export const timelineTick: GameTick = (ctx) => {
  const state = getTickState(ctx);

  // moved original logic computes patch fields from state + ctx.newDay

  return patchTickState(ctx, {
    // updated fields needed by later ticks
  });
};
```

If the moved block creates intermediate variables used much later, put them in `TickContext` explicitly rather than relying on closure variables.

- [ ] **Step 2: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
0 TypeScript errors
```

- [ ] **Step 3: Extract weather tick**

Move weather selection, forecast deviation, `applyDailyWeather`, weather summary, and seasonal weather event logic into:

```text
simulation/ticks/weatherTick.ts
```

- [ ] **Step 4: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Continue one tick per commit**

For each tick file:

1. Move one coherent block.
2. Preserve original order.
3. Run `npx tsc --noEmit`.
4. Run web smoke test after every 3 to 4 tick moves.
5. Commit.

Commit pattern:

```bash
git add simulation/ticks simulation/advanceDay.ts
git commit -m "refactor: extract weather daily tick"
```

- [ ] **Step 6: Create finalize tick**

Create `simulation/ticks/finalizeDayTick.ts`:

```ts
import type { FinalizeGameTick } from '../tickContext';

export const finalizeDayTick: FinalizeGameTick = (ctx) => {
  ctx.set(ctx.pendingState);
  return ctx;
};
```

This must remain the only daily tick that calls Zustand `set()`. If a future tick needs a state update, it must add to `pendingState`.

- [ ] **Step 7: Final pipeline shape**

When all ticks are extracted, `advanceGameDay()` should look like:

```ts
import { runTickPipeline } from './tickPipeline';
import { timelineTick } from './ticks/timelineTick';
import { weatherTick } from './ticks/weatherTick';
import { marketTick } from './ticks/marketTick';
import { workerTick } from './ticks/workerTick';
import { financeTick } from './ticks/financeTick';
import { eventTick } from './ticks/eventTick';
import { auctionTick } from './ticks/auctionTick';
import { cropTick } from './ticks/cropTick';
import { soilTick } from './ticks/soilTick';
import { animalTick } from './ticks/animalTick';
import { processingTick } from './ticks/processingTick';
import { waterTick } from './ticks/waterTick';
import { coopTick } from './ticks/coopTick';
import { electricityTick } from './ticks/electricityTick';
import { sellingChannelsTick } from './ticks/sellingChannelsTick';
import { finalizeDayTick } from './ticks/finalizeDayTick';
import type { GameGet, GameSet } from '../store/actions/types';
import type { GameTick } from './tickContext';

const DAILY_TICKS: GameTick[] = [
  timelineTick,
  weatherTick,
  marketTick,
  workerTick,
  financeTick,
  eventTick,
  auctionTick,
  cropTick,
  soilTick,
  animalTick,
  processingTick,
  waterTick,
  coopTick,
  electricityTick,
  sellingChannelsTick,
];

export function advanceGameDay(set: GameSet, get: GameGet): void {
  const state = get();
  if (state.bankrupt) return;

  const result = runTickPipeline(
    {
      previousState: state,
      pendingState: {},
      newDay: state.day + 1,
      summary: [],
    },
    DAILY_TICKS,
  );

  finalizeDayTick({
    ...result,
    set,
  });
}
```

Claude may choose a different context shape if needed. The important requirement is that Phase 3 systems can be inserted as new ticks.

- [ ] **Step 8: Search for forbidden per-tick set usage**

Run:

```bash
rg "\\bset\\(" simulation/ticks -n
```

Expected:

```text
Only simulation/ticks/finalizeDayTick.ts contains set(...)
```

- [ ] **Step 9: Final verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
npx expo start --web
```

Manual checks:

```text
Advance Day works.
advanceDays still works.
Day Summary still appears.
Weather changes.
Prices update.
Workers tick.
Crops grow.
Animals tick.
Auctions resolve.
Electricity/water/co-op screens still render.
Save reload keeps buttons working.
```

- [ ] **Step 10: Commit**

```bash
git add simulation store/useGameStore.ts
git commit -m "refactor: split daily simulation into ordered ticks"
```

---

## Task 12: Update UI Imports Away From Store Types

**Purpose:** Finish decoupling UI domain types from the store file.

**Files:**

- Modify UI files under `app/` and `components/`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Replace type imports**

Examples:

Before:

```ts
import { useGameStore, LandParcel, FieldEvent } from '../../store/useGameStore';
```

After:

```ts
import { useGameStore } from '../../store/useGameStore';
import type { LandParcel } from '../../types/domain/land';
import type { FieldEvent } from '../../types/domain/uiEvents';
```

Update all UI files that import domain types from `store/useGameStore`.

- [ ] **Step 2: Remove temporary re-exports**

After all UI imports are updated, remove temporary domain type re-exports from `store/useGameStore.ts`.

Keep exports that are intentionally store-specific:

```ts
export const useGameStore = ...
```

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 4: Commit**

```bash
git add app components store/useGameStore.ts types/domain
git commit -m "refactor: decouple UI type imports from store"
```

---

## Task 13: Remove Dynamic Requires From Store And Simulation

**Purpose:** Align the code with the existing web compatibility rule: no `require()` imports.

**Files:**

- Modify: `store/useGameStore.ts`
- Modify: `simulation/**/*.ts`
- Modify: affected components

- [ ] **Step 1: Find dynamic requires**

Run:

```bash
rg "require\\(" store simulation app components engine -n
```

Expected current known locations include:

```text
store/useGameStore.ts
components/CustomTabBar.tsx
components/ops/CompostScreen.tsx
```

- [ ] **Step 2: Replace with static imports**

For each `require()`:

Before:

```ts
const { ANIMAL_TYPES } = require('../data/animalTypes');
```

After:

```ts
import { ANIMAL_TYPES } from '../data/animalTypes';
```

If name conflicts occur, use import aliases:

```ts
import { ANIMAL_TYPES as ANIMAL_TYPES_FOR_AUCTIONS } from '../data/animalTypes';
```

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
rg "require\\(" store simulation app components engine -n
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
No require() results, unless a specific exception is documented by Claude
```

- [ ] **Step 4: Commit**

```bash
git add store simulation app components engine
git commit -m "refactor: replace dynamic requires with static imports"
```

---

## Task 14: Add Phase 3 Extension Points

**Purpose:** Make it obvious where Phase 3 systems should go.

**Files:**

- Create: `simulation/ticks/phase3ExtensionPoint.ts`
- Modify: `simulation/advanceDay.ts`
- Modify: `docs/ai-coding-rules.md`

- [ ] **Step 1: Create empty extension tick**

Create:

```ts
import type { GameTick } from '../tickContext';

export const phase3ExtensionPointTick: GameTick = (ctx) => ctx;
```

- [ ] **Step 2: Add it to pipeline**

Place it after timeline/dynasty and before broad economic simulation, unless Claude recommends another position:

```ts
timelineTick,
phase3ExtensionPointTick,
weatherTick,
marketTick,
```

- [ ] **Step 3: Document future Phase 3 ticks**

Add to `docs/ai-coding-rules.md`:

```markdown
## Phase 3 Tick Rule

Family, Reputation, Neighbor Farms, and Annual Planning must be implemented as tick modules under `simulation/ticks/` or feature-specific tick modules called from the tick pipeline. Do not add large new Phase 3 blocks directly inside `store/useGameStore.ts`.
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npx expo lint
```

Expected:

```text
0 TypeScript errors
0 ESLint errors
```

- [ ] **Step 5: Commit**

```bash
git add simulation docs/ai-coding-rules.md
git commit -m "refactor: add phase 3 simulation extension point"
```

---

## Suggested Phase 3 Shape After This Plan

Once the stabilization is complete, Phase 3 should not say:

```text
Add three new blocks to advanceDay in useGameStore.ts.
```

It should say:

```text
Create:
  features/family/familyTypes.ts
  features/family/familyEngine.ts
  features/family/familyActions.ts
  features/family/familyTick.ts

Create:
  features/reputation/reputationTypes.ts
  features/reputation/reputationEngine.ts
  features/reputation/reputationTick.ts

Create:
  features/neighbors/neighborTypes.ts
  features/neighbors/neighborEngine.ts
  features/neighbors/neighborTick.ts

Create:
  features/annualPlanning/annualPlanningTypes.ts
  features/annualPlanning/annualPlanningEngine.ts
  features/annualPlanning/annualPlanningActions.ts
  features/annualPlanning/annualPlanningTick.ts
```

Then add the ticks to the pipeline:

```ts
const DAILY_TICKS: GameTick[] = [
  timelineTick,
  familyTick,
  reputationTick,
  neighborTick,
  annualPlanningTick,
  weatherTick,
  marketTick,
  // existing ticks
];
```

This makes Phase 3 removable, testable, and reviewable.

---

## What Success Looks Like

After this plan:

- `store/useGameStore.ts` is a store composition file, not the whole game.
- Domain types live in `types/domain`.
- Engine files do not import from `store`.
- `makeInitialState` lives outside the store.
- Persist config lives outside the store.
- Actions are grouped by domain.
- `advanceDay` is delegated to `simulation/advanceDay.ts`.
- Daily systems are ordered tick modules.
- Phase 3 systems can be added without expanding the store.
- Web compatibility rules remain intact.
- Existing saves still load.
- Buttons still work after hydration.

Target file size goals:

```text
store/useGameStore.ts: under 1,500-2,000 lines
simulation/advanceDay.ts: under 250 lines
each tick module: ideally under 500 lines
each action module: ideally under 700 lines
```

These are guidelines, not hard blockers. The real goal is clear ownership and safe change boundaries.

---

## Risks

Main risks:

- Accidentally changing tick order.
- Accidentally dropping a field from `partialize`.
- Accidentally changing save shape.
- Accidentally creating circular imports.
- Accidentally changing behavior while moving code.
- Extracting too much at once and making review impossible.

Mitigations:

- One domain or tick per commit.
- TypeScript after every extraction.
- Web smoke test after major milestones.
- No gameplay changes.
- Keep temporary type re-exports until UI imports are updated.
- Preserve save key unless stored state shape changes.
- Ask Claude before any save version/key bump.

---

## Recommended Implementation Order

If Claude wants the safest possible path:

1. Task 1: Update coding rules exception.
2. Task 2: Move domain types.
3. Task 3: Extract initial state.
4. Task 4: Extract persist config.
5. Task 5: Add action factory pattern.
6. Task 6: Extract low-risk actions.
7. Tasks 7A-7G: Extract each medium-risk action group as its own commit.
8. Task 7H: Verify medium-risk action extraction as a set.
9. Stop and review.
10. Task 9: Move `advanceDay` wholesale to `simulation/advanceDay.ts`.
11. Stop and review.
12. Task 10: Add tick pipeline types with `pendingState` accumulation.
13. Task 11: Split one tick at a time, with only `finalizeDayTick` calling `set()`.
14. Task 12-14: Cleanup and Phase 3 extension points.

If Claude wants a smaller prerequisite before Phase 3:

```text
Minimum Phase 3.0:
1. Move domain types out of store.
2. Extract persist config.
3. Move advanceDay wholesale into simulation/advanceDay.ts.
4. Add `TickContext` with `pendingState` accumulation.
5. Add a Phase 3 tick insertion point.
```

That minimum version is less complete but still prevents Phase 3 from expanding `useGameStore.ts`.

---

## Self-Review

Spec coverage:

- Addresses store size risk.
- Addresses `advanceDay` risk.
- Addresses engine dependency direction.
- Addresses UI type coupling.
- Preserves save and web compatibility guardrails.
- Gives Claude explicit review questions.
- Gives Phase 3 a safe future shape.

Placeholder scan:

- No implementation task uses `TBD`.
- Any open decision is explicitly assigned to Claude review.

Type consistency:

- `GameSet`, `GameGet`, `GameTick`, `FinalizeGameTick`, `TickContext`, and `FinalizeTickContext` are defined before use.
- `TickContext` uses `previousState` plus `pendingState`; regular ticks do not receive `set`.
- `finalizeDayTick` is the only daily tick that receives `set`.
- `types/domain/*` paths are used consistently.
- `simulation/ticks/*` paths are used consistently.

---

## Execution Handoff

Plan complete and saved to:

```text
docs/superpowers/plans/2026-06-03-game-architecture-restructure.md
```

Two execution options:

1. Subagent-Driven (recommended): dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution: execute tasks in this session using executing-plans, batch execution with checkpoints.

Do not execute this plan until Claude reviews it and the user approves the stabilization scope.
