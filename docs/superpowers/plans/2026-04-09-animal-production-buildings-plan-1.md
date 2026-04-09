# Animal Production Buildings — Plan 1: Production Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one dedicated production building per animal species (milking parlour, shearing shed, egg house, butchery, honey extraction) with throughput-based contractor fallback, hygiene tracking, certification tiers, animal welfare scores, milk quality grading, and full UI across animales/gestion/tienda tabs.

**Architecture:** A new `ProductionBuildingState[]` array in GameState stores per-instance building state (hygiene, workers, equipment, certification) separate from the existing `buildings: string[]` simple ownership list. A new `engine/productionBuildings.ts` file holds all pure calculation functions. `advanceDay` runs a production-buildings loop after the existing animal production section. Quality grades are stored in `milkGrades: Record<string, 'A'|'B'|'C'>` and applied at sell time.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `npx tsc --noEmit` for verification at each task.

---

## Plans 2–4 (not in this plan)

- **Plan 2:** Breeding & veterinary infrastructure (quarantine pen, calving pen, sire pen, vet room, sick bay, CCTV, weigh crate, cattle crush)
- **Plan 3:** Feed, waste & species-specific buildings (silage pit, feed mill, slurry tank + tanker, species buildings for poultry/sheep/pig/dairy/bees)
- **Plan 4:** Processing extensions (smokehouse, curing cellar, cold store) + monitoring (farm lab, carbon tracker)

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `data/buildingTypes.ts` | Extend `BuildingCategory`, `BuildingType`; add `BUILDING_CATEGORY_LABELS['production']`; add 30 production building entries; add `EquipmentItem` interface + `PRODUCTION_EQUIPMENT` export |
| Modify | `store/useGameStore.ts` | Add `ProductionBuildingState` interface; add 4 new `GameState` fields; update `makeInitialState`; add 5 store actions; extend `advanceDay` |
| Create | `engine/productionBuildings.ts` | All pure calculation functions — contractor fee, hygiene decay, welfare score, milk grade, certification progress, inspector roll |
| Modify | `app/(tabs)/animales.tsx` | Welfare badge per species, building status line, milk grade indicator for dairy |
| Modify | `app/(tabs)/gestion.tsx` | New `ProductionBuildingsSection` component |
| Modify | `app/(tabs)/tienda.tsx` | Add `'production'` category to shop; `purchaseProductionBuilding` call; equipment sub-section |

---

## Task 1: Extend `data/buildingTypes.ts`

**Files:**
- Modify: `data/buildingTypes.ts`

- [ ] **Step 1: Extend `BuildingCategory`, `BuildingType`, and `BUILDING_CATEGORY_LABELS`**

Find the top of `data/buildingTypes.ts`. Replace the existing type and interface with:

```typescript
export type BuildingCategory =
  | 'animal'
  | 'silo'
  | 'industrial'
  | 'lab'
  | 'upgrade'
  | 'production';

export interface BuildingType {
  id: string;
  name: string;
  category: BuildingCategory;
  cost: number;
  maintenancePerDay: number;
  capacity?: number;        // animal slots OR storage kg/L (existing buildings)
  effectLabel: string;
  // Production building fields (only set on category === 'production')
  animalTypeId?: string;        // which species this building serves
  dailyCapacity?: number;       // animals processed per day at this tier
  buildingTier?: 'small' | 'medium' | 'large';
  equipmentSlotCount?: number;  // 2 or 3
}
```

Also find `BUILDING_CATEGORY_LABELS` (exported from this file) and add the production entry:

```typescript
export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  animal: 'Animal Housing',
  silo: 'Storage',
  industrial: 'Industrial',
  lab: 'Laboratory',
  upgrade: 'Upgrades',
  production: 'Production Buildings',   // ← add this line
};
```

- [ ] **Step 2: Add `EquipmentItem` interface and `PRODUCTION_EQUIPMENT` array**

Add after the `BUILDING_TYPES` array (at the bottom of the file):

```typescript
// ── Production Equipment ───────────────────────────────────────────────────

export interface EquipmentItem {
  id: string;
  name: string;
  cost: number;
  /** Building type id prefix this equipment fits — matches any tier (s/m/l). */
  applicableBuildingPrefixes: string[];
  effectLabel: string;
  slot: 1 | 2 | 3;
}

export const PRODUCTION_EQUIPMENT: EquipmentItem[] = [
  // ── Milking buildings (parlour, goat stand, buffalo dairy) ─────────────
  {
    id: 'eq_auto_cluster',
    name: 'Automatic Cluster Unit',
    cost: 8000,
    applicableBuildingPrefixes: ['bld_milking_parlour', 'bld_goat_milking_stand', 'bld_buffalo_dairy'],
    effectLabel: '+20% throughput · −1 worker required',
    slot: 1,
  },
  {
    id: 'eq_milk_analyser',
    name: 'Inline Milk Analyser',
    cost: 12000,
    applicableBuildingPrefixes: ['bld_milking_parlour', 'bld_goat_milking_stand', 'bld_buffalo_dairy'],
    effectLabel: 'Detects mastitis early · +10 effective hygiene for SCC',
    slot: 2,
  },
  {
    id: 'eq_refrigerated_pipe',
    name: 'Refrigerated Pipe',
    cost: 9000,
    applicableBuildingPrefixes: ['bld_milking_parlour', 'bld_buffalo_dairy'],
    effectLabel: 'Replaces need for a separate milk cooling tank',
    slot: 3,
  },
  // ── Shearing shed ──────────────────────────────────────────────────────
  {
    id: 'eq_electric_shears',
    name: 'Electric Shears',
    cost: 5000,
    applicableBuildingPrefixes: ['bld_shearing_shed'],
    effectLabel: '2× shearing speed',
    slot: 1,
  },
  {
    id: 'eq_wool_press',
    name: 'Wool Press',
    cost: 7000,
    applicableBuildingPrefixes: ['bld_shearing_shed'],
    effectLabel: 'Bales wool — required to ship via export trailer',
    slot: 2,
  },
  {
    id: 'eq_lanolin_extractor',
    name: 'Lanolin Extractor',
    cost: 6000,
    applicableBuildingPrefixes: ['bld_shearing_shed'],
    effectLabel: 'Captures lanolin as a sellable byproduct',
    slot: 3,
  },
  // ── Egg collection buildings ───────────────────────────────────────────
  {
    id: 'eq_auto_belt',
    name: 'Automatic Belt Collector',
    cost: 6000,
    applicableBuildingPrefixes: ['bld_egg_collection_house', 'bld_duck_egg_house', 'bld_quail_egg_station'],
    effectLabel: 'Faster collection · −1 worker required',
    slot: 1,
  },
  {
    id: 'eq_egg_grader',
    name: 'Egg Grading Machine',
    cost: 9000,
    applicableBuildingPrefixes: ['bld_egg_collection_house', 'bld_duck_egg_house', 'bld_quail_egg_station'],
    effectLabel: 'Identifies premium eggs at 1.3× price',
    slot: 2,
  },
  {
    id: 'eq_uv_sanitiser',
    name: 'UV Sanitiser',
    cost: 5000,
    applicableBuildingPrefixes: ['bld_egg_collection_house'],
    effectLabel: 'Reduces contamination events · −0.5 daily hygiene decay',
    slot: 3,
  },
  // ── Butchery buildings ─────────────────────────────────────────────────
  {
    id: 'eq_vacuum_packer',
    name: 'Vacuum Packer',
    cost: 7000,
    applicableBuildingPrefixes: ['bld_pig_butchery', 'bld_rabbit_butchery'],
    effectLabel: '5-day shelf life on fresh meat — removes same-day sale pressure',
    slot: 1,
  },
  {
    id: 'eq_bone_saw',
    name: 'Bone Saw',
    cost: 5000,
    applicableBuildingPrefixes: ['bld_pig_butchery', 'bld_rabbit_butchery'],
    effectLabel: 'Unlocks bone meal byproduct per cull',
    slot: 2,
  },
  {
    id: 'eq_smoke_unit',
    name: 'Smoke Unit',
    cost: 12000,
    applicableBuildingPrefixes: ['bld_pig_butchery'],
    effectLabel: 'Smoked pork at 1.4× price',
    slot: 3,
  },
  // ── Honey extraction suite ─────────────────────────────────────────────
  {
    id: 'eq_uncapping_machine',
    name: 'Uncapping Machine',
    cost: 8000,
    applicableBuildingPrefixes: ['bld_honey_extraction_suite'],
    effectLabel: 'Raises honey yield from 40% to 65%',
    slot: 1,
  },
  {
    id: 'eq_centrifugal_extractor',
    name: 'Centrifugal Extractor',
    cost: 12000,
    applicableBuildingPrefixes: ['bld_honey_extraction_suite'],
    effectLabel: 'Raises honey yield from 65% to 100%',
    slot: 2,
  },
  {
    id: 'eq_wax_press',
    name: 'Wax Press',
    cost: 6000,
    applicableBuildingPrefixes: ['bld_honey_extraction_suite'],
    effectLabel: 'Captures beeswax as a sellable byproduct',
    slot: 3,
  },
];
```

- [ ] **Step 3: Add 30 primary production building entries to `BUILDING_TYPES`**

Append the following at the end of the `BUILDING_TYPES` array (inside the `]`), before the closing bracket.

> **Note:** Animal type IDs below use the Spanish IDs from the codebase (`vaca`, `cabra`, `bufalo`). Before committing, verify the IDs for pig, sheep, chicken, duck, quail, rabbit, bee by reading `data/animalTypes.ts` and replacing `cerdo`, `oveja`, `gallina`, `pato`, `codorniz`, `conejo`, `abeja` if they differ.

```typescript
  // ── Production Buildings ───────────────────────────────────────────────

  // Milking Parlour (cow)
  { id: 'bld_milking_parlour_s', name: 'Small Milking Parlour', category: 'production', cost: 15000, maintenancePerDay: 5, animalTypeId: 'vaca', dailyCapacity: 12, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '12 cows/day · 4 stalls' },
  { id: 'bld_milking_parlour_m', name: 'Medium Milking Parlour', category: 'production', cost: 38000, maintenancePerDay: 10, animalTypeId: 'vaca', dailyCapacity: 30, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '30 cows/day · 10 stalls' },
  { id: 'bld_milking_parlour_l', name: 'Large Milking Parlour', category: 'production', cost: 85000, maintenancePerDay: 20, animalTypeId: 'vaca', dailyCapacity: 60, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '60 cows/day · 20 stalls' },

  // Goat Milking Stand (goat)
  { id: 'bld_goat_milking_stand_s', name: 'Small Goat Milking Stand', category: 'production', cost: 10000, maintenancePerDay: 4, animalTypeId: 'cabra', dailyCapacity: 18, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '18 goats/day · 6 stalls' },
  { id: 'bld_goat_milking_stand_m', name: 'Medium Goat Milking Stand', category: 'production', cost: 25000, maintenancePerDay: 8, animalTypeId: 'cabra', dailyCapacity: 45, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '45 goats/day · 15 stalls' },
  { id: 'bld_goat_milking_stand_l', name: 'Large Goat Milking Stand', category: 'production', cost: 60000, maintenancePerDay: 16, animalTypeId: 'cabra', dailyCapacity: 90, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '90 goats/day · 30 stalls' },

  // Buffalo Dairy (buffalo)
  { id: 'bld_buffalo_dairy_s', name: 'Small Buffalo Dairy', category: 'production', cost: 18000, maintenancePerDay: 6, animalTypeId: 'bufalo', dailyCapacity: 10, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '10 buffalo/day · 4 stalls' },
  { id: 'bld_buffalo_dairy_m', name: 'Medium Buffalo Dairy', category: 'production', cost: 45000, maintenancePerDay: 12, animalTypeId: 'bufalo', dailyCapacity: 25, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '25 buffalo/day · 10 stalls' },
  { id: 'bld_buffalo_dairy_l', name: 'Large Buffalo Dairy', category: 'production', cost: 110000, maintenancePerDay: 25, animalTypeId: 'bufalo', dailyCapacity: 50, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '50 buffalo/day · 20 stalls' },

  // Shearing Shed (sheep)
  { id: 'bld_shearing_shed_s', name: 'Small Shearing Shed', category: 'production', cost: 12000, maintenancePerDay: 4, animalTypeId: 'oveja', dailyCapacity: 15, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '15 sheep/day' },
  { id: 'bld_shearing_shed_m', name: 'Medium Shearing Shed', category: 'production', cost: 30000, maintenancePerDay: 8, animalTypeId: 'oveja', dailyCapacity: 38, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '38 sheep/day' },
  { id: 'bld_shearing_shed_l', name: 'Large Shearing Shed', category: 'production', cost: 70000, maintenancePerDay: 16, animalTypeId: 'oveja', dailyCapacity: 75, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '75 sheep/day' },

  // Egg Collection House (chicken)
  { id: 'bld_egg_collection_house_s', name: 'Small Egg Collection House', category: 'production', cost: 8000, maintenancePerDay: 3, animalTypeId: 'gallina', dailyCapacity: 80, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '80 chickens/day' },
  { id: 'bld_egg_collection_house_m', name: 'Medium Egg Collection House', category: 'production', cost: 20000, maintenancePerDay: 6, animalTypeId: 'gallina', dailyCapacity: 200, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '200 chickens/day' },
  { id: 'bld_egg_collection_house_l', name: 'Large Egg Collection House', category: 'production', cost: 50000, maintenancePerDay: 14, animalTypeId: 'gallina', dailyCapacity: 400, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '400 chickens/day' },

  // Duck Egg House (duck)
  { id: 'bld_duck_egg_house_s', name: 'Small Duck Egg House', category: 'production', cost: 8000, maintenancePerDay: 3, animalTypeId: 'pato', dailyCapacity: 60, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '60 ducks/day' },
  { id: 'bld_duck_egg_house_m', name: 'Medium Duck Egg House', category: 'production', cost: 20000, maintenancePerDay: 6, animalTypeId: 'pato', dailyCapacity: 150, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '150 ducks/day' },
  { id: 'bld_duck_egg_house_l', name: 'Large Duck Egg House', category: 'production', cost: 50000, maintenancePerDay: 14, animalTypeId: 'pato', dailyCapacity: 300, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '300 ducks/day' },

  // Quail Egg Station (quail)
  { id: 'bld_quail_egg_station_s', name: 'Small Quail Egg Station', category: 'production', cost: 8000, maintenancePerDay: 3, animalTypeId: 'codorniz', dailyCapacity: 120, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '120 quail/day' },
  { id: 'bld_quail_egg_station_m', name: 'Medium Quail Egg Station', category: 'production', cost: 20000, maintenancePerDay: 6, animalTypeId: 'codorniz', dailyCapacity: 300, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '300 quail/day' },
  { id: 'bld_quail_egg_station_l', name: 'Large Quail Egg Station', category: 'production', cost: 50000, maintenancePerDay: 14, animalTypeId: 'codorniz', dailyCapacity: 600, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '600 quail/day' },

  // Pig Butchery (pig)
  { id: 'bld_pig_butchery_s', name: 'Small Pig Butchery', category: 'production', cost: 14000, maintenancePerDay: 5, animalTypeId: 'cerdo', dailyCapacity: 8, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '8 pigs per cull session · +30% meat yield' },
  { id: 'bld_pig_butchery_m', name: 'Medium Pig Butchery', category: 'production', cost: 35000, maintenancePerDay: 10, animalTypeId: 'cerdo', dailyCapacity: 20, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '20 pigs per session · +30% meat yield' },
  { id: 'bld_pig_butchery_l', name: 'Large Pig Butchery', category: 'production', cost: 80000, maintenancePerDay: 22, animalTypeId: 'cerdo', dailyCapacity: 40, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '40 pigs per session · +30% meat yield' },

  // Rabbit Butchery (rabbit)
  { id: 'bld_rabbit_butchery_s', name: 'Small Rabbit Butchery', category: 'production', cost: 10000, maintenancePerDay: 4, animalTypeId: 'conejo', dailyCapacity: 12, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '12 rabbits per session · +30% meat yield' },
  { id: 'bld_rabbit_butchery_m', name: 'Medium Rabbit Butchery', category: 'production', cost: 25000, maintenancePerDay: 7, animalTypeId: 'conejo', dailyCapacity: 30, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '30 rabbits per session · +30% meat yield' },
  { id: 'bld_rabbit_butchery_l', name: 'Large Rabbit Butchery', category: 'production', cost: 60000, maintenancePerDay: 15, animalTypeId: 'conejo', dailyCapacity: 60, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '60 rabbits per session · +30% meat yield' },

  // Honey Extraction Suite (bee)
  { id: 'bld_honey_extraction_suite_s', name: 'Small Honey Extraction Suite', category: 'production', cost: 12000, maintenancePerDay: 4, animalTypeId: 'abeja', dailyCapacity: 5, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '5 hives per harvest · 40% yield without equipment' },
  { id: 'bld_honey_extraction_suite_m', name: 'Medium Honey Extraction Suite', category: 'production', cost: 30000, maintenancePerDay: 8, animalTypeId: 'abeja', dailyCapacity: 12, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '12 hives per harvest · 40% yield without equipment' },
  { id: 'bld_honey_extraction_suite_l', name: 'Large Honey Extraction Suite', category: 'production', cost: 70000, maintenancePerDay: 16, animalTypeId: 'abeja', dailyCapacity: 25, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '25 hives per harvest · 40% yield without equipment' },
```

- [ ] **Step 4: TypeScript check**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit
```

Expected: 0 errors. If `BUILDING_CATEGORY_LABELS` has a TypeScript error about missing `production` key, add it as shown in Step 1.

- [ ] **Step 5: Commit**

```bash
git add data/buildingTypes.ts
git commit -m "feat(buildings): add production building types, equipment items, extend BuildingCategory"
```

---

## Task 2: `ProductionBuildingState` interface + GameState fields

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add `ProductionBuildingState` interface**

Find the block of exported interfaces (near `OwnedTrailer`, `DeliveryCargo`, etc.) and add after `AuctionPickup`:

```typescript
export interface ProductionBuildingState {
  id: string;                    // unique instance id e.g. 'pb_1711234567'
  buildingTypeId: string;        // e.g. 'bld_milking_parlour_s'
  animalTypeId: string;          // e.g. 'vaca'
  hygiene: number;               // 0–100
  capacity: number;              // daily throughput (animals/day) — copied from BuildingType.dailyCapacity at purchase time
  certificationTier: 'basic' | 'certified' | 'organic';
  certDaysAtThreshold: number;   // consecutive days meeting cert hygiene requirement
  certInspectionsPassed: number; // inspections passed at current tier level
  equipmentSlots: string[];      // installed equipment item ids (max = equipmentSlotCount)
  assignedWorkerIds: string[];   // worker ids assigned to this building
  lastDeepCleanSeason: string;   // season key of last deep clean e.g. 'spring_1'
}

// Note: state.cooperative?.member already exists in GameState (used by sellCrop) — no new field needed.
```

- [ ] **Step 2: Add new fields to `GameState`**

Find the `GameState` interface. Add these four fields after `deliveryJobs`:

```typescript
  // Production buildings
  productionBuildings: ProductionBuildingState[];
  animalWelfareScores: Record<string, number>;   // animalTypeId → 0–100
  milkGrades: Record<string, 'A' | 'B' | 'C'>;  // animalTypeId → grade (dairy species only)
  lastSyntheticInputDay: number;                  // day last pesticide/chemical fertilizer was used
```

- [ ] **Step 3: Add actions to `GameState`**

Find the actions section at the bottom of `GameState` (the block with `setSoundEnabled`, `advanceDay`, etc.) and add:

```typescript
  purchaseProductionBuilding: (buildingTypeId: string) => void;
  assignWorkerToBuilding: (buildingId: string, workerId: string) => void;
  unassignWorkerFromBuilding: (buildingId: string, workerId: string) => void;
  installEquipment: (buildingId: string, equipmentItemId: string) => void;
  performDeepClean: (buildingId: string, useContractor: boolean) => void;
```

- [ ] **Step 4: Update `makeInitialState`**

Find `makeInitialState` and add the four new fields:

```typescript
  productionBuildings: [],
  animalWelfareScores: {},
  milkGrades: {},
  lastSyntheticInputDay: -999,
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (the 5 new actions will show "not implemented" errors until Task 4 — that's fine at this stage since they're in the interface; TypeScript won't error until the store implementation is checked).

- [ ] **Step 6: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(buildings): add ProductionBuildingState interface and GameState fields"
```

---

## Task 3: Create `engine/productionBuildings.ts`

**Files:**
- Create: `engine/productionBuildings.ts`

- [ ] **Step 1: Create the engine file**

Create `engine/productionBuildings.ts` with the following content:

```typescript
import { ProductionBuildingState } from '../store/useGameStore';

// ── Hygiene decay rates per species (points lost per day) ─────────────────

export const HYGIENE_DECAY_RATES: Record<string, number> = {
  vaca:     3,    // dairy — wet environment, fastest
  cabra:    3,
  bufalo:   3,
  cerdo:    4,    // pigs — highest waste output
  gallina:  2,    // poultry
  pato:     2,
  codorniz: 2,
  oveja:    1.5,  // sheep — slower
  conejo:   2,
  abeja:    0.5,  // bees — minimal
};

// ── Species → production building type id prefix ──────────────────────────

export const PRODUCTION_BUILDING_PREFIX: Record<string, string> = {
  vaca:     'bld_milking_parlour',
  cabra:    'bld_goat_milking_stand',
  bufalo:   'bld_buffalo_dairy',
  oveja:    'bld_shearing_shed',
  gallina:  'bld_egg_collection_house',
  pato:     'bld_duck_egg_house',
  codorniz: 'bld_quail_egg_station',
  cerdo:    'bld_pig_butchery',
  conejo:   'bld_rabbit_butchery',
  abeja:    'bld_honey_extraction_suite',
};

// ── Dairy species ─────────────────────────────────────────────────────────

export const DAIRY_SPECIES = new Set(['vaca', 'cabra', 'bufalo']);

// ── Effective daily capacity (accounts for auto cluster unit) ─────────────

export function effectiveCapacity(building: ProductionBuildingState): number {
  const hasAutoCluster = building.equipmentSlots.includes('eq_auto_cluster');
  return building.capacity * (hasAutoCluster ? 1.2 : 1.0);
}

// ── Worker manning check ──────────────────────────────────────────────────
// Large buildings need 2 workers; auto cluster counts as +1 worker equivalent.

export function isManned(building: ProductionBuildingState, buildingTier: 'small' | 'medium' | 'large'): boolean {
  const hasAutoCluster = building.equipmentSlots.includes('eq_auto_cluster');
  const effectiveWorkers = building.assignedWorkerIds.length + (hasAutoCluster ? 1 : 0);
  const required = buildingTier === 'large' ? 2 : 1;
  return effectiveWorkers >= required;
}

// ── Contractor fee ────────────────────────────────────────────────────────
// unprocessedFraction: 0–1, fraction of herd not covered by building today.
// dailyProductionValue: total $ value the full herd produced today.

export function contractorFee(
  unprocessedFraction: number,
  dailyProductionValue: number,
  isCoopMember: boolean,
): number {
  if (unprocessedFraction <= 0 || dailyProductionValue <= 0) return 0;
  const rate = isCoopMember ? 0.06 : 0.12;
  return Math.round(unprocessedFraction * dailyProductionValue * rate);
}

// ── Hygiene daily decay ───────────────────────────────────────────────────

export function hygieneDecay(
  animalTypeId: string,
  herdSize: number,
  capacity: number,
  hasCleanerWorker: boolean,
  hasUVSanitiser: boolean,
): number {
  const base = HYGIENE_DECAY_RATES[animalTypeId] ?? 2;
  const overcrowdMod = herdSize > capacity * 1.2 ? 1.5 : 1.0;
  const cleanerReduction = hasCleanerWorker ? 1.5 : 0;
  const uvReduction = hasUVSanitiser ? 0.5 : 0;
  return Math.max(0, base * overcrowdMod - cleanerReduction - uvReduction);
}

// ── Animal welfare score ──────────────────────────────────────────────────
// feedRatio7Day: 0–1 (1.0 = fully fed every day in the last 7 days)

export function welfareScore(
  hygiene: number,
  feedRatio7Day: number,
  herdSize: number,
  capacity: number,
  sickCount: number,
  totalCount: number,
): number {
  const densityScore = totalCount === 0
    ? 100
    : Math.max(0, 100 * (1 - Math.max(0, (herdSize - capacity) / Math.max(capacity, 1))));
  const healthScore = totalCount === 0
    ? 100
    : 100 * ((totalCount - sickCount) / totalCount);
  return Math.round(
    hygiene * 0.30 +
    feedRatio7Day * 100 * 0.30 +
    densityScore * 0.20 +
    healthScore * 0.20,
  );
}

// ── Milk quality grade ────────────────────────────────────────────────────

export function milkGrade(hygiene: number, hasMilkAnalyser: boolean): 'A' | 'B' | 'C' {
  const effective = hygiene + (hasMilkAnalyser ? 10 : 0);
  if (effective >= 80) return 'A';
  if (effective >= 60) return 'B';
  return 'C';
}

export function milkGradeMultiplier(grade: 'A' | 'B' | 'C'): number {
  if (grade === 'A') return 1.10;
  if (grade === 'B') return 1.00;
  return 0.75;  // Grade C: local market only; export/city gates enforced separately
}

// ── Butterfat percentage ──────────────────────────────────────────────────
// qualityGeneAvg: average quality gene across the dairy herd (0.5–1.5 range from AnimalGenes)
// Baseline 3.5% × quality gene + TMR bonus

export function butterfatPercent(qualityGeneAvg: number, hasTMRWagon: boolean): number {
  return 3.5 * qualityGeneAvg + (hasTMRWagon ? 0.3 : 0);
}

export function butterfatProcessingBonus(bf: number): number {
  if (bf >= 4.2) return 0.15;  // +15% processing yield
  if (bf >= 3.8) return 0.08;  // +8% processing yield
  return 0;
}

// ── Inspector event rolls ─────────────────────────────────────────────────

export function shouldInspect(hygiene: number): boolean {
  let chance: number;
  if (hygiene >= 60)      chance = 0.02;
  else if (hygiene >= 40) chance = 0.08;
  else if (hygiene >= 20) chance = 0.20;
  else                    chance = 0.35;
  return Math.random() < chance;
}

export function inspectionPassed(hygiene: number): boolean {
  return hygiene >= 60;
}

export function inspectorFine(hygiene: number): number {
  if (hygiene < 20)  return 800;
  if (hygiene < 40)  return 500;
  return 200;
}

// ── Certification progress ────────────────────────────────────────────────
// Returns the updated cert state for the building after one day.
// lastSyntheticInputDay: day the player last applied pesticide/chemical fertilizer.

export function certificationProgress(
  building: ProductionBuildingState,
  day: number,
  lastSyntheticInputDay: number,
  inspectionHappenedAndPassed: boolean,
): Pick<ProductionBuildingState, 'certificationTier' | 'certDaysAtThreshold' | 'certInspectionsPassed'> {
  const { certificationTier, certDaysAtThreshold, certInspectionsPassed, hygiene } = building;

  const newInspectionsPassed = certInspectionsPassed + (inspectionHappenedAndPassed ? 1 : 0);

  if (certificationTier === 'basic') {
    const atThreshold = hygiene >= 60;
    const newDays = atThreshold ? certDaysAtThreshold + 1 : 0;
    const upgrade = newDays >= 30 && newInspectionsPassed >= 1;
    return {
      certificationTier: upgrade ? 'certified' : 'basic',
      certDaysAtThreshold: upgrade ? 0 : newDays,
      certInspectionsPassed: upgrade ? 0 : newInspectionsPassed,
    };
  }

  if (certificationTier === 'certified') {
    const noSynthetic = day - lastSyntheticInputDay > 60;
    const atThreshold = hygiene >= 80 && noSynthetic;
    const newDays = atThreshold ? certDaysAtThreshold + 1 : 0;
    const upgrade = newDays >= 60 && newInspectionsPassed >= 2;
    return {
      certificationTier: upgrade ? 'organic' : 'certified',
      certDaysAtThreshold: upgrade ? 0 : newDays,
      certInspectionsPassed: upgrade ? 0 : newInspectionsPassed,
    };
  }

  // Already organic — maintain or drop back if hygiene falls for 7+ days
  const noSynthetic = day - lastSyntheticInputDay > 60;
  const maintaining = hygiene >= 80 && noSynthetic;
  const newDays = maintaining ? certDaysAtThreshold : certDaysAtThreshold - 1;
  const drop = newDays <= -7;
  return {
    certificationTier: drop ? 'certified' : 'organic',
    certDaysAtThreshold: drop ? 0 : newDays,
    certInspectionsPassed: newInspectionsPassed,
  };
}

// ── Season key helper (used for deep clean tracking) ─────────────────────

export function seasonKey(day: number): string {
  const year = Math.floor((day - 1) / 360) + 1;
  const dayOfYear = ((day - 1) % 360) + 1;
  if (dayOfYear <= 90)  return `spring_${year}`;
  if (dayOfYear <= 180) return `summer_${year}`;
  if (dayOfYear <= 270) return `autumn_${year}`;
  return `winter_${year}`;
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add engine/productionBuildings.ts
git commit -m "feat(buildings): add productionBuildings engine with contractor fee, hygiene, welfare, SCC, cert logic"
```

---

## Task 4: Store actions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add import at top of useGameStore.ts**

Find the engine imports (e.g. `import { ... } from '../engine/animals'`) and add:

```typescript
import {
  PRODUCTION_BUILDING_PREFIX,
  DAIRY_SPECIES,
  effectiveCapacity,
  isManned,
  milkGrade,
  seasonKey,
} from '../engine/productionBuildings';
import { PRODUCTION_EQUIPMENT, EquipmentItem } from '../data/buildingTypes';
```

- [ ] **Step 2: Add the five store actions**

Find the last store action in the `create()` block (e.g. `dispatchDelivery`) and add the five new actions after it:

```typescript
      purchaseProductionBuilding: (buildingTypeId) => {
        const state = get();
        const bt = BUILDING_TYPES.find(b => b.id === buildingTypeId);
        if (!bt || bt.category !== 'production') return;
        if (state.money < bt.cost) return;
        // Only one production building per species
        if (state.productionBuildings.some(pb => pb.animalTypeId === bt.animalTypeId)) return;
        const newBuilding: ProductionBuildingState = {
          id: `pb_${Date.now()}`,
          buildingTypeId,
          animalTypeId: bt.animalTypeId!,
          hygiene: 100,
          certificationTier: 'basic',
          certDaysAtThreshold: 0,
          certInspectionsPassed: 0,
          equipmentSlots: [],
          assignedWorkerIds: [],
          lastDeepCleanSeason: seasonKey(state.day),
          capacity: bt.dailyCapacity ?? 10,
        };
        set({
          money: state.money - bt.cost,
          productionBuildings: [...state.productionBuildings, newBuilding],
        });
      },

      assignWorkerToBuilding: (buildingId, workerId) => {
        const state = get();
        const pb = state.productionBuildings.find(b => b.id === buildingId);
        if (!pb) return;
        if (pb.assignedWorkerIds.includes(workerId)) return;
        // A worker can only be assigned to one production building
        const alreadyAssigned = state.productionBuildings.some(b =>
          b.id !== buildingId && b.assignedWorkerIds.includes(workerId)
        );
        if (alreadyAssigned) return;
        set({
          productionBuildings: state.productionBuildings.map(b =>
            b.id === buildingId
              ? { ...b, assignedWorkerIds: [...b.assignedWorkerIds, workerId] }
              : b
          ),
        });
      },

      unassignWorkerFromBuilding: (buildingId, workerId) => {
        const state = get();
        set({
          productionBuildings: state.productionBuildings.map(b =>
            b.id === buildingId
              ? { ...b, assignedWorkerIds: b.assignedWorkerIds.filter(id => id !== workerId) }
              : b
          ),
        });
      },

      installEquipment: (buildingId, equipmentItemId) => {
        const state = get();
        const pb = state.productionBuildings.find(b => b.id === buildingId);
        if (!pb) return;
        const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        if (!bt) return;
        const maxSlots = bt.equipmentSlotCount ?? 2;
        if (pb.equipmentSlots.length >= maxSlots) return;
        if (pb.equipmentSlots.includes(equipmentItemId)) return;
        const eq: EquipmentItem | undefined = PRODUCTION_EQUIPMENT.find(e => e.id === equipmentItemId);
        if (!eq) return;
        // Check this equipment fits this building type
        const fits = eq.applicableBuildingPrefixes.some(prefix =>
          pb.buildingTypeId.startsWith(prefix)
        );
        if (!fits) return;
        if (state.money < eq.cost) return;
        set({
          money: state.money - eq.cost,
          productionBuildings: state.productionBuildings.map(b =>
            b.id === buildingId
              ? { ...b, equipmentSlots: [...b.equipmentSlots, equipmentItemId] }
              : b
          ),
        });
      },

      performDeepClean: (buildingId, useContractor) => {
        const state = get();
        const pb = state.productionBuildings.find(b => b.id === buildingId);
        if (!pb) return;
        const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        if (!bt) return;
        const contractorCost = bt.buildingTier === 'large' ? 400
          : bt.buildingTier === 'medium' ? 250 : 150;
        if (useContractor) {
          if (state.money < contractorCost) return;
          set({
            money: state.money - contractorCost,
            productionBuildings: state.productionBuildings.map(b =>
              b.id === buildingId
                ? { ...b, hygiene: 85, lastDeepCleanSeason: seasonKey(state.day) }
                : b
            ),
          });
        } else {
          // Worker deep clean: immediate (2-day task is UX simplification)
          set({
            productionBuildings: state.productionBuildings.map(b =>
              b.id === buildingId
                ? { ...b, hygiene: 95, lastDeepCleanSeason: seasonKey(state.day) }
                : b
            ),
          });
        }
      },
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(buildings): add purchaseProductionBuilding, assignWorker, installEquipment, performDeepClean actions"
```

---

## Task 5: `advanceDay` integration

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add remaining engine imports**

Ensure the import added in Task 4 Step 1 includes all functions used in this task. Update it to:

```typescript
import {
  PRODUCTION_BUILDING_PREFIX,
  DAIRY_SPECIES,
  effectiveCapacity,
  isManned,
  contractorFee,
  hygieneDecay,
  welfareScore,
  milkGrade,
  shouldInspect,
  inspectionPassed,
  inspectorFine,
  certificationProgress,
  seasonKey,
} from '../engine/productionBuildings';
```

- [ ] **Step 2: Add production buildings processing loop to `advanceDay`**

Inside the `advanceDay` action, search for the section that accumulates daily animal production into `animalInventory` (search for `grainMissedDays` or `hayMissedDays` — the section just below it calculates daily animal product output). Insert the following block **after** the existing animal production section and **before** the final `set()` call.

The block references `newDay` (already declared in `advanceDay`) and `summary` (the `DaySummaryEvent[]` array built up during `advanceDay` — it is declared near the top of the function, search for `const summary`). Also references `state.animals`, `state.productionBuildings`, and `state.cooperative`.

```typescript
        // ── Production buildings processing ───────────────────────────────
        const isCoopMember = state.cooperative?.member ?? false;
        let productionBuildingContractorFees = 0;
        let productionBuildingMoneyDelta = 0; // for carbon credits etc. (future)
        const newProductionBuildings = state.productionBuildings.map(pb => {
          const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
          if (!bt) return pb;

          const herdSize = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId).length;
          const sickCount = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId && a.sick).length;
          const effCap = effectiveCapacity(pb);
          const manned = isManned(pb, bt.buildingTier ?? 'small');

          // Contractor fee: unmanned building = full fee; partial coverage = proportional fee
          const unprocessedFraction = !manned
            ? 1.0
            : Math.max(0, (herdSize - effCap) / Math.max(herdSize, 1));

          if (unprocessedFraction > 0 && herdSize > 0) {
            const productPrice = (state.animalPrices ?? {})[pb.animalTypeId] ?? 1;
            const dailyValue = herdSize * productPrice;
            const fee = contractorFee(unprocessedFraction, dailyValue, isCoopMember);
            if (fee > 0) {
              productionBuildingContractorFees += fee;
              const bt2 = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
              summary.push({
                id: `contractor_fee_${pb.animalTypeId}`,
                icon: '🚚',
                title: `Contractor processing ${bt2?.name ?? pb.animalTypeId} — $${fee}`,
                detail: manned ? 'Building at capacity — upgrade to process full herd' : 'Building unmanned — assign a farmhand',
                severity: 'warning',
              });
            }
          }

          // Hygiene decay
          const hasCleanerWorker = pb.assignedWorkerIds.some(wid =>
            (state.workers ?? []).find((w: OwnedWorker) => w.id === wid)?.typeId === 'farmhand'
          );
          const hasUVSanitiser = pb.equipmentSlots.includes('eq_uv_sanitiser');
          const decay = hygieneDecay(pb.animalTypeId, herdSize, effCap, hasCleanerWorker, hasUVSanitiser);
          const newHygiene = Math.max(0, Math.min(100, pb.hygiene - decay));

          // Inspector event
          let fine = 0;
          let inspectPassed = false;
          let inspectHappened = false;
          if (shouldInspect(newHygiene)) {
            inspectHappened = true;
            inspectPassed = inspectionPassed(newHygiene);
            if (!inspectPassed) {
              fine = inspectorFine(newHygiene);
              productionBuildingContractorFees += fine;
              newHygiene = Math.max(0, newHygiene - 10); // hygiene penalty on failed inspection
              summary.push({
                id: `inspect_fail_${pb.id}`,
                icon: '🔍',
                title: `Inspector failed ${bt.name} — $${fine} fine`,
                detail: 'Hygiene −10. Improve sanitation to avoid repeat visits.',
                severity: 'danger',
              });
            } else {
              summary.push({
                id: `inspect_pass_${pb.id}`,
                icon: '🔍',
                title: `Inspector passed ${bt.name}`,
                severity: 'good',
              });
            }
          }

          // Season end deep clean prompt
          const currentSeason = seasonKey(newDay);
          const prevSeason = seasonKey(newDay - 1);
          if (currentSeason !== prevSeason && pb.lastDeepCleanSeason !== prevSeason) {
            summary.push({
              id: `deep_clean_${pb.id}`,
              icon: '🧹',
              title: `${bt.name} needs a deep clean`,
              detail: 'Assign a farmhand or pay a contractor ($150–$400) in the Management tab',
              severity: 'warning',
            });
            // Hygiene penalty for skipping
            return {
              ...pb,
              hygiene: Math.min(newHygiene, 40),
              ...certificationProgress({ ...pb, hygiene: Math.min(newHygiene, 40) }, newDay, state.lastSyntheticInputDay, false),
            };
          }

          // Certification progress
          const newCert = certificationProgress(
            { ...pb, hygiene: newHygiene },
            newDay,
            state.lastSyntheticInputDay,
            inspectHappened && inspectPassed,
          );

          if (newCert.certificationTier !== pb.certificationTier) {
            const emoji = newCert.certificationTier === 'organic' ? '🌿' : newCert.certificationTier === 'certified' ? '✅' : '⬇️';
            summary.push({
              id: `cert_change_${pb.id}`,
              icon: emoji,
              title: `${bt.name} is now ${newCert.certificationTier} certified`,
              severity: newCert.certificationTier === 'basic' ? 'warning' : 'good',
            });
          }

          return {
            ...pb,
            hygiene: newHygiene,
            ...newCert,
          };
        });

        // Welfare scores — recalculate per species
        const newWelfareScores: Record<string, number> = { ...state.animalWelfareScores };
        const newMilkGrades: Record<string, 'A' | 'B' | 'C'> = { ...state.milkGrades };

        for (const pb of newProductionBuildings) {
          const herdSize = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId).length;
          const sickCount = (state.animals ?? []).filter(a => a.typeId === pb.animalTypeId && a.sick).length;
          const effCap = effectiveCapacity(pb);
          const feedRatio = pb.animalTypeId === 'vaca' || pb.animalTypeId === 'bufalo' || pb.animalTypeId === 'cabra' || pb.animalTypeId === 'oveja'
            ? Math.max(0, 1 - (state.hayMissedDays ?? 0) / 7)
            : Math.max(0, 1 - (state.grainMissedDays ?? 0) / 7);

          newWelfareScores[pb.animalTypeId] = welfareScore(
            pb.hygiene, feedRatio, herdSize, effCap, sickCount, herdSize
          );

          // Milk grade (dairy only)
          if (DAIRY_SPECIES.has(pb.animalTypeId)) {
            const hasMilkAnalyser = pb.equipmentSlots.includes('eq_milk_analyser');
            newMilkGrades[pb.animalTypeId] = milkGrade(pb.hygiene, hasMilkAnalyser);
          }
        }
        // ── End production buildings processing ───────────────────────────
```

- [ ] **Step 3: Add the new state fields to the final `set()` call in `advanceDay`**

Find the large `set({ ... })` call at the end of `advanceDay`. Add these entries to it:

```typescript
          productionBuildings: newProductionBuildings,
          animalWelfareScores: newWelfareScores,
          milkGrades: newMilkGrades,
          money: /* existing money expression */ - productionBuildingContractorFees,
```

For the `money` line: find the existing `money:` expression in the final `set()` call (e.g. `money: finalMoney + showPrizeMoney + deliveryRevenue - deliveryRepairCost`) and append `- productionBuildingContractorFees` at the end.

- [ ] **Step 4: Apply milk grade multiplier and Grade C gate in `sellAnimalProduct`**

Find the `sellAnimalProduct` action in `store/useGameStore.ts`. Locate the top of the action body (after `const state = get();`) and add the milk grade lookup before the revenue calculation:

```typescript
        // Milk grade multiplier — dairy products only
        const DAIRY_PRODUCT_SPECIES: Record<string, string> = {
          milk: 'vaca',
          goat_milk: 'cabra',
          buffalo_milk: 'bufalo',
        };
        const speciesForProduct = DAIRY_PRODUCT_SPECIES[productType];
        const grade = speciesForProduct
          ? ((state.milkGrades ?? {})[speciesForProduct] ?? 'B')
          : null;

        // Grade C milk is rejected by city and export markets
        if (grade === 'C') {
          const activeMarket = state.selectedMarket ?? 'local';
          if (activeMarket === 'city' || activeMarket === 'export') {
            // Do not block silently — return without selling; UI shows grade badge as explanation
            return;
          }
        }

        const gradeMultiplier = grade === 'A' ? 1.10 : grade === 'C' ? 0.75 : 1.00;
```

Then find the line in `sellAnimalProduct` that calculates `revenue` (the final dollar amount before `set()`) and multiply it by `gradeMultiplier`:

```typescript
        // Wrap the existing revenue calculation:
        const revenue = Math.round(baseRevenue * gradeMultiplier);
        // (replace whatever the existing line is — ensure gradeMultiplier is applied last)
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(buildings): wire production buildings into advanceDay — contractor fees, hygiene, welfare, certification, inspector events"
```

---

## Task 6: `animales.tsx` — welfare badge + building status + milk grade

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [ ] **Step 1: Add imports**

At the top of `animales.tsx`, add:

```typescript
import { PRODUCTION_BUILDING_PREFIX, DAIRY_SPECIES } from '../../engine/productionBuildings';
import { BUILDING_TYPES } from '../../data/buildingTypes';
```

- [ ] **Step 2: Pull new state fields from the store**

Find the `useGameStore()` destructure in `AnimalesScreen` and add:

```typescript
  productionBuildings, animalWelfareScores, milkGrades,
```

- [ ] **Step 3: Add `WelfareBadge` inline component**

Add this component above `AnimalesScreen` (or inline as a helper):

```typescript
function WelfareBadge({ score }: { score: number | undefined }) {
  if (score === undefined) return null;
  const color = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#ef5350';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>Welfare {score} — {label}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Add `BuildingStatusLine` inline component**

```typescript
function BuildingStatusLine({
  animalTypeId,
  productionBuildings,
}: {
  animalTypeId: string;
  productionBuildings: import('../../store/useGameStore').ProductionBuildingState[];
}) {
  const pb = productionBuildings.find(b => b.animalTypeId === animalTypeId);
  const prefix = PRODUCTION_BUILDING_PREFIX[animalTypeId];
  if (!pb) {
    return (
      <Text style={{ color: '#ff9800', fontSize: 11 }}>
        🏗 No production building — contractor covering (12% fee)
      </Text>
    );
  }
  const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
  const manned = pb.assignedWorkerIds.length > 0;
  const certEmoji = pb.certificationTier === 'organic' ? '🌿' : pb.certificationTier === 'certified' ? '✅' : '';
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: '#81c784', fontSize: 11 }}>
        🏛 {bt?.name ?? pb.buildingTypeId} {certEmoji}
        {!manned ? ' ⚠ Unmanned' : ''}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: '#aaa', fontSize: 11 }}>Hygiene</Text>
        <View style={{ flex: 1, height: 4, backgroundColor: '#333', borderRadius: 2, maxWidth: 80 }}>
          <View style={{
            width: `${pb.hygiene}%`,
            height: 4,
            borderRadius: 2,
            backgroundColor: pb.hygiene >= 60 ? '#4caf50' : pb.hygiene >= 40 ? '#ff9800' : '#ef5350',
          }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>{Math.round(pb.hygiene)}%</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Add `MilkGradeBadge` inline component**

```typescript
function MilkGradeBadge({ animalTypeId, milkGrades }: { animalTypeId: string; milkGrades: Record<string, 'A' | 'B' | 'C'> }) {
  if (!DAIRY_SPECIES.has(animalTypeId)) return null;
  const grade = milkGrades[animalTypeId] ?? 'B';
  const color = grade === 'A' ? '#4caf50' : grade === 'B' ? '#ff9800' : '#ef5350';
  return (
    <Text style={{ color, fontSize: 11, fontWeight: 'bold' }}>
      Milk Grade {grade}{grade === 'C' ? ' ⚠ city/export blocked' : ''}
    </Text>
  );
}
```

- [ ] **Step 6: Render badges per species**

Find the section in `AnimalesScreen` where animal species or individual animals are rendered (look for where `ANIMAL_TYPES` are grouped or where individual animal cards are shown). For each species group header (or at the top of the herd section per species), add:

```typescript
<WelfareBadge score={animalWelfareScores?.[animalType.id]} />
<BuildingStatusLine animalTypeId={animalType.id} productionBuildings={productionBuildings ?? []} />
<MilkGradeBadge animalTypeId={animalType.id} milkGrades={milkGrades ?? {}} />
```

> **Integration note:** The exact position depends on how species are currently grouped. If animals are shown as a flat list, add the badges above the first animal card of each species (check `animalType.id` to detect species changes as you iterate).

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/animales.tsx
git commit -m "feat(buildings): welfare badge, building status, and milk grade indicators in animales tab"
```

---

## Task 7: `gestion.tsx` — Production Buildings section

**Files:**
- Modify: `app/(tabs)/gestion.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { BUILDING_TYPES, PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';
import { ProductionBuildingState } from '../../store/useGameStore';
```

- [ ] **Step 2: Add `ProductionBuildingsSection` component**

Add this component above (or in the same file as) the main screen component. It follows the same `DashboardSection` pattern used elsewhere in gestion.tsx:

```typescript
function ProductionBuildingsSection() {
  const {
    productionBuildings,
    workers,
    money,
    assignWorkerToBuilding,
    unassignWorkerFromBuilding,
    installEquipment,
    performDeepClean,
  } = useGameStore();

  const farmhands = (workers ?? []).filter((w: any) => w.typeId === 'farmhand');

  if (!productionBuildings || productionBuildings.length === 0) {
    return (
      <View style={{ backgroundColor: '#16213e', borderRadius: 10, margin: 8, padding: 14 }}>
        <Text style={{ color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>Production Buildings</Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          No production buildings built yet. Buy them in the Shop to stop paying contractor fees.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#16213e', borderRadius: 10, margin: 8, padding: 14 }}>
      <Text style={{ color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>Production Buildings</Text>
      {productionBuildings.map((pb: ProductionBuildingState) => {
        const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
        if (!bt) return null;
        const certColor = pb.certificationTier === 'organic' ? '#4caf50' : pb.certificationTier === 'certified' ? '#2196f3' : '#9e9e9e';
        const certLabel = pb.certificationTier === 'organic' ? '🌿 Organic' : pb.certificationTier === 'certified' ? '✅ Certified' : 'Basic';
        const availableWorkers = farmhands.filter((w: any) => !pb.assignedWorkerIds.includes(w.id));
        const maxSlots = bt.equipmentSlotCount ?? 2;
        const availableEquipment = PRODUCTION_EQUIPMENT.filter(eq =>
          eq.applicableBuildingPrefixes.some(prefix => pb.buildingTypeId.startsWith(prefix)) &&
          !pb.equipmentSlots.includes(eq.id)
        );

        return (
          <View key={pb.id} style={{ borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 10 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ color: '#e8d5a3', fontWeight: 'bold' }}>{bt.name}</Text>
              <Text style={{ color: certColor, fontSize: 12 }}>{certLabel}</Text>
            </View>

            {/* Hygiene bar */}
            <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 3 }}>Hygiene</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1, height: 8, backgroundColor: '#2a2a4a', borderRadius: 4 }}>
                <View style={{
                  width: `${pb.hygiene}%`, height: 8, borderRadius: 4,
                  backgroundColor: pb.hygiene >= 80 ? '#4caf50' : pb.hygiene >= 60 ? '#ff9800' : pb.hygiene >= 40 ? '#ff5722' : '#ef5350',
                }} />
              </View>
              <Text style={{ color: '#aaa', fontSize: 11, width: 32 }}>{Math.round(pb.hygiene)}%</Text>
            </View>

            {/* Cert progress hint */}
            {pb.certificationTier === 'basic' && (
              <Text style={{ color: '#aaa', fontSize: 10, marginBottom: 6 }}>
                To Certified: {Math.max(0, 30 - pb.certDaysAtThreshold)}d at hygiene ≥60 + 1 inspection
              </Text>
            )}

            {/* Workers */}
            <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Workers assigned: {pb.assignedWorkerIds.length}</Text>
            {pb.assignedWorkerIds.map((wid, idx) => {
              const w = (workers ?? []).find((x: any) => x.id === wid);
              return (
                <View key={wid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: '#81c784', fontSize: 12 }}>👷 Farmhand #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => unassignWorkerFromBuilding(pb.id, wid)}>
                    <Text style={{ color: '#ef5350', fontSize: 12 }}>Unassign</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {availableWorkers.length > 0 && (
              <TouchableOpacity
                style={{ backgroundColor: '#1e3a5f', borderRadius: 6, padding: 6, alignItems: 'center', marginBottom: 8 }}
                onPress={() => assignWorkerToBuilding(pb.id, availableWorkers[0].id)}
              >
                <Text style={{ color: '#90caf9', fontSize: 12 }}>+ Assign Farmhand</Text>
              </TouchableOpacity>
            )}

            {/* Equipment slots */}
            <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
              Equipment: {pb.equipmentSlots.length}/{maxSlots} slots used
            </Text>
            {pb.equipmentSlots.map(eqId => {
              const eq = PRODUCTION_EQUIPMENT.find(e => e.id === eqId);
              return (
                <Text key={eqId} style={{ color: '#81c784', fontSize: 11, marginBottom: 2 }}>
                  ✓ {eq?.name ?? eqId}
                </Text>
              );
            })}
            {pb.equipmentSlots.length < maxSlots && availableEquipment.length > 0 && (
              <Text style={{ color: '#aaa', fontSize: 10, marginTop: 2 }}>
                Buy equipment in the Shop to fill remaining slots
              </Text>
            )}

            {/* Deep clean */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: pb.hygiene > 80 ? '#2a2a4a' : '#1b5e20', borderRadius: 6, padding: 8, alignItems: 'center' }}
                onPress={() => performDeepClean(pb.id, false)}
                disabled={pb.hygiene > 80}
              >
                <Text style={{ color: pb.hygiene > 80 ? '#555' : '#a5d6a7', fontSize: 12 }}>
                  {pb.hygiene > 80 ? '✓ Clean' : '🧹 Deep Clean (Worker)'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: money < 150 ? '#2a2a4a' : '#3e1f00', borderRadius: 6, padding: 8, alignItems: 'center' }}
                onPress={() => performDeepClean(pb.id, true)}
                disabled={money < 150}
              >
                <Text style={{ color: money < 150 ? '#555' : '#ffcc80', fontSize: 12 }}>
                  🧹 Contractor ($150–$400)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 3: Render `ProductionBuildingsSection` in the main gestion screen**

Find where `DashboardSection` or `HenilSection` is rendered in `GestionScreen`. Add `<ProductionBuildingsSection />` after it:

```typescript
<HenilSection />
<ProductionBuildingsSection />
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/gestion.tsx
git commit -m "feat(buildings): ProductionBuildingsSection in gestion tab — hygiene, workers, equipment, deep clean"
```

---

## Task 8: `tienda.tsx` — shop entries

**Files:**
- Modify: `app/(tabs)/tienda.tsx`

- [ ] **Step 1: Add imports**

Find the imports section at the top of `tienda.tsx`. Add:

```typescript
import { PRODUCTION_EQUIPMENT } from '../../data/buildingTypes';
```

Ensure `purchaseProductionBuilding` and `installEquipment` are destructured from `useGameStore()` in the buildings tab component.

- [ ] **Step 2: Add `'production'` to `BUILDING_CATEGORY_ORDER`**

Find `BUILDING_CATEGORY_ORDER` in `tienda.tsx`:

```typescript
const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ['animal', 'silo', 'industrial', 'lab', 'upgrade'];
```

Replace with:

```typescript
const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ['animal', 'production', 'silo', 'industrial', 'lab', 'upgrade'];
```

- [ ] **Step 3: Handle production building purchase in the buildings tab**

Find the `BuildingsTab` component (or wherever `buyBuilding` is called for each building card). The existing code calls `buyBuilding(building.id)` for every building. For production buildings, call `purchaseProductionBuilding` instead:

```typescript
const handleBuyBuilding = (buildingId: string) => {
  const bt = BUILDING_TYPES.find(b => b.id === buildingId);
  if (bt?.category === 'production') {
    purchaseProductionBuilding(buildingId);
  } else {
    buyBuilding(buildingId);
  }
};
```

Update all button `onPress` handlers in the buildings tab to call `handleBuyBuilding(building.id)` instead of `buyBuilding(building.id)`.

Also add an "already owned" indicator for production buildings — they can only be owned once per species:

```typescript
const ownedProductionSpecies = new Set(
  (productionBuildings ?? []).map(pb => pb.animalTypeId)
);
// When rendering a production building card, check:
const alreadyOwned = bt.category === 'production' && ownedProductionSpecies.has(bt.animalTypeId ?? '');
```

Disable the buy button and show "Owned" if `alreadyOwned`.

- [ ] **Step 4: Add equipment section to the production buildings category**

In the section that renders `'production'` category buildings, add an "Equipment" subsection below the building cards. This shows equipment purchasable for production buildings you already own:

```typescript
{/* Equipment for owned production buildings */}
{(productionBuildings ?? []).length > 0 && (
  <View style={{ marginTop: 12 }}>
    <Text style={{ color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>
      Building Equipment
    </Text>
    {PRODUCTION_EQUIPMENT.map(eq => {
      // Find if the player owns a building this equipment fits
      const fitsOwnedBuilding = (productionBuildings ?? []).find(pb =>
        eq.applicableBuildingPrefixes.some(prefix => pb.buildingTypeId.startsWith(prefix))
      );
      if (!fitsOwnedBuilding) return null;
      const alreadyInstalled = fitsOwnedBuilding.equipmentSlots.includes(eq.id);
      const bt = BUILDING_TYPES.find(b => b.id === fitsOwnedBuilding.buildingTypeId);
      const maxSlots = bt?.equipmentSlotCount ?? 2;
      const slotsFull = fitsOwnedBuilding.equipmentSlots.length >= maxSlots;
      const canAfford = money >= eq.cost;
      return (
        <View key={eq.id} style={{ backgroundColor: '#0d1b2a', borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 }}>{eq.name}</Text>
          <Text style={{ color: '#aaa', fontSize: 11, marginVertical: 4 }}>{eq.effectLabel}</Text>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
            For: {bt?.name ?? fitsOwnedBuilding.buildingTypeId}
          </Text>
          {alreadyInstalled ? (
            <Text style={{ color: '#4caf50', fontSize: 12 }}>✓ Installed</Text>
          ) : slotsFull ? (
            <Text style={{ color: '#aaa', fontSize: 12 }}>All equipment slots full</Text>
          ) : (
            <TouchableOpacity
              style={{ backgroundColor: canAfford ? '#1e3a5f' : '#2a2a4a', borderRadius: 6, padding: 8, alignItems: 'center' }}
              onPress={() => installEquipment(fitsOwnedBuilding.id, eq.id)}
              disabled={!canAfford}
            >
              <Text style={{ color: canAfford ? '#90caf9' : '#555', fontSize: 13 }}>
                Install — ${eq.cost.toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    })}
  </View>
)}
```

- [ ] **Step 5: Destructure new actions and state in the buildings tab**

Find the `useGameStore()` call inside the buildings tab (or the main component). Add:

```typescript
  purchaseProductionBuilding, installEquipment, productionBuildings,
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/tienda.tsx"
git commit -m "feat(buildings): production buildings and equipment purchasable in tienda shop"
```

---

## Task 9: Final integration check + spec coverage

**Files:**
- No new files

- [ ] **Step 1: Full TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Fix any remaining type errors before proceeding.

- [ ] **Step 2: Verify spec coverage for Plan 1**

Walk through the spec sections and confirm each is covered:

| Spec section | Covered by |
|---|---|
| Contractor fallback (12%, co-op 6%) | Task 4 `purchaseProductionBuilding` + Task 5 `advanceDay` |
| Throughput-based capacity | Task 3 `effectiveCapacity` + Task 4 `purchaseProductionBuilding` |
| Worker requirement | Task 3 `isManned` + Task 5 `advanceDay` contractor fee |
| Equipment slots | Task 1 `PRODUCTION_EQUIPMENT` + Task 4 `installEquipment` |
| Hygiene decay + thresholds | Task 3 `hygieneDecay` + Task 5 `advanceDay` |
| Seasonal deep clean | Task 4 `performDeepClean` + Task 5 `advanceDay` season prompt |
| Inspector events | Task 3 `shouldInspect`/`inspectionPassed`/`inspectorFine` + Task 5 |
| Certification tiers | Task 3 `certificationProgress` + Task 5 |
| Animal welfare score | Task 3 `welfareScore` + Task 5 + Task 6 badge |
| Milk grade (SCC) | Task 3 `milkGrade`/`milkGradeMultiplier` + Task 5 + Task 6 badge + sell gate |
| Butterfat % | Task 3 `butterfatPercent`/`butterfatProcessingBonus` (applied in Plan 3 when TMR wagon is added) |
| animales.tsx UI | Task 6 |
| gestion.tsx UI | Task 7 |
| tienda.tsx shop | Task 8 |

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat(buildings): Plan 1 complete — production buildings core system"
```
