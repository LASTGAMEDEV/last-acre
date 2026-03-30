# Machinery Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace passive machine yield/speed bonuses with a functional machine-gating system where tractors+attachments are required to till/plant/spray, combines to harvest, and trucks to transport — otherwise hire a contractor for a flat $/ha fee.

**Architecture:** New `data/attachmentTypes.ts` and `engine/machinery.ts` hold data and pure logic. The store gains `attachments`, `tractorJobs`, `harvestJobs`, and `trailers` state arrays plus new actions (`assignJob`, `assignHarvestJob`, `hireContractor`, `buyAttachment`, `buyTrailer`, `hitchTrailer`). `advanceDay` processes jobs to completion. UI gets a `ContractorModal`, a revamped `maquinaria.tsx` with Fleet/Attachments/Jobs sub-tabs, context-sensitive operation buttons on parcel cards in `tierras.tsx`, and a Machinery sub-tab split from Buildings in `tienda.tsx`.

**Tech Stack:** React Native + Expo, TypeScript, Zustand 5 (persist middleware), inline `require()` already present in store for engine modules.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `data/attachmentTypes.ts` | **Create** | AttachmentType interface + 9-entry catalog (3 ops × 3 sizes) |
| `data/machineTypes.ts` | **Modify** | Remove yieldBonus/speedBonus/requires; add haPerDay/capacityKg/compatibleTrailerSizes/compatibleTruckCategories; replace all 10 entries with 13 new ones |
| `engine/machinery.ts` | **Create** | Pure functions: calcJobDays, getContractorCost, canAssignJob, getTransportCapacityKg |
| `store/useGameStore.ts` | **Modify** | New interfaces + state + actions + advanceDay job processing; remove getMachineYieldBonus/getMachineSpeedBonus; bump save key v6→v7 |
| `components/ContractorModal.tsx` | **Create** | Shared modal: op name, parcels, cost breakdown, confirm/cancel |
| `app/(tabs)/tienda.tsx` | **Modify** | Add 'machinery' sub-tab (tractors, combines, trucks, trailers, attachments) alongside existing buildings |
| `app/(tabs)/maquinaria.tsx` | **Modify** | Redesign: Fleet / Attachments / Jobs sub-tabs |
| `app/(tabs)/tierras.tsx` | **Modify** | Context-sensitive operation buttons per parcel state |

---

## Task 1: Create data/attachmentTypes.ts

**Files:**
- Create: `data/attachmentTypes.ts`

- [ ] **Step 1: Create the file**

```typescript
export interface AttachmentType {
  id: string;
  name: string;
  cost: number;
  operation: 'till' | 'plant' | 'spray';
  size: 'small' | 'medium' | 'large';
  haPerDay: number;
  compatibleTractorSizes: ('small' | 'medium' | 'large')[];
}

export const ATTACHMENT_TYPES: AttachmentType[] = [
  // Cultivators (Till)
  { id: 'cultivator-small',  name: 'Small Cultivator',  cost: 5000,  operation: 'till',  size: 'small',  haPerDay: 2,  compatibleTractorSizes: ['small', 'medium'] },
  { id: 'cultivator-medium', name: 'Medium Cultivator', cost: 11000, operation: 'till',  size: 'medium', haPerDay: 5,  compatibleTractorSizes: ['medium', 'large'] },
  { id: 'cultivator-large',  name: 'Large Cultivator',  cost: 25000, operation: 'till',  size: 'large',  haPerDay: 12, compatibleTractorSizes: ['large'] },
  // Planters
  { id: 'planter-small',     name: 'Small Planter',     cost: 6500,  operation: 'plant', size: 'small',  haPerDay: 4,  compatibleTractorSizes: ['small', 'medium'] },
  { id: 'planter-medium',    name: 'Medium Planter',    cost: 15000, operation: 'plant', size: 'medium', haPerDay: 10, compatibleTractorSizes: ['medium', 'large'] },
  { id: 'planter-large',     name: 'Large Planter',     cost: 32000, operation: 'plant', size: 'large',  haPerDay: 22, compatibleTractorSizes: ['large'] },
  // Sprayers
  { id: 'sprayer-small',     name: 'Small Sprayer',     cost: 4000,  operation: 'spray', size: 'small',  haPerDay: 6,  compatibleTractorSizes: ['small', 'medium'] },
  { id: 'sprayer-medium',    name: 'Medium Sprayer',    cost: 9500,  operation: 'spray', size: 'medium', haPerDay: 15, compatibleTractorSizes: ['medium', 'large'] },
  { id: 'sprayer-large',     name: 'Large Sprayer',     cost: 22000, operation: 'spray', size: 'large',  haPerDay: 35, compatibleTractorSizes: ['large'] },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/attachmentTypes.ts
git commit -m "feat: add attachment types catalog (cultivator/planter/sprayer in 3 sizes)"
```

---

## Task 2: Update data/machineTypes.ts

**Files:**
- Modify: `data/machineTypes.ts`

- [ ] **Step 1: Read the current file**

Read `data/machineTypes.ts` fully before editing.

- [ ] **Step 2: Replace the entire file contents**

Replace with:

```typescript
export interface MachineType {
  id: string;
  name: string;
  cost: number;
  size: 'small' | 'medium' | 'large';
  category: 'tractor' | 'harvester' | 'truck' | 'trailer' | 'irrigation';
  maintenancePerDay: number;
  haPerDay?: number;           // harvesters
  capacityKg?: number;         // trucks (0 = needs trailer) and trailers
  compatibleTrailerSizes?: ('small' | 'medium' | 'large')[];  // trucks only
  compatibleTruckCategories?: string[];  // trailers: which truck ids can tow this
}

export const MACHINE_TYPES: MachineType[] = [
  // ── Tractors ─────────────────────────────────────────────────────────────
  { id: 'tractor-small',  name: 'Small Tractor',  cost: 18000,  size: 'small',  category: 'tractor',    maintenancePerDay: 4 },
  { id: 'tractor-medium', name: 'Medium Tractor', cost: 48000,  size: 'medium', category: 'tractor',    maintenancePerDay: 9 },
  { id: 'tractor-large',  name: 'Large Tractor',  cost: 120000, size: 'large',  category: 'tractor',    maintenancePerDay: 20 },
  // ── Combine Harvesters ───────────────────────────────────────────────────
  { id: 'combine-small',  name: 'Small Combine',  cost: 85000,  size: 'small',  category: 'harvester',  maintenancePerDay: 15, haPerDay: 4 },
  { id: 'combine-medium', name: 'Medium Combine', cost: 175000, size: 'medium', category: 'harvester',  maintenancePerDay: 28, haPerDay: 10 },
  { id: 'combine-large',  name: 'Large Combine',  cost: 340000, size: 'large',  category: 'harvester',  maintenancePerDay: 50, haPerDay: 22 },
  // ── Irrigation Systems ───────────────────────────────────────────────────
  { id: 'irrigation-drip',      name: 'Drip System',      cost: 8500,  size: 'small',  category: 'irrigation', maintenancePerDay: 2,  haPerDay: 1 },
  { id: 'irrigation-sprinkler', name: 'Sprinkler Array',  cost: 28000, size: 'medium', category: 'irrigation', maintenancePerDay: 5,  haPerDay: 3 },
  { id: 'irrigation-pivot',     name: 'Center Pivot',     cost: 95000, size: 'large',  category: 'irrigation', maintenancePerDay: 12, haPerDay: 8 },
  // ── Trucks ───────────────────────────────────────────────────────────────
  { id: 'truck-pickup', name: 'Pickup',     cost: 28000, size: 'small',  category: 'truck', maintenancePerDay: 5,  capacityKg: 0,      compatibleTrailerSizes: ['small', 'medium'] },
  { id: 'truck-dump',   name: 'Dump Truck', cost: 43000, size: 'medium', category: 'truck', maintenancePerDay: 10, capacityKg: 10000 },
  { id: 'truck-semi',   name: 'Semi Truck', cost: 72000, size: 'large',  category: 'truck', maintenancePerDay: 18, capacityKg: 0,      compatibleTrailerSizes: ['medium', 'large'] },
  // ── Trailers (separate from machines array — stored in trailers[]) ────────
  // Note: trailers use MachineType for their catalog entry but are owned via OwnedTrailer[]
  { id: 'trailer-small',    name: 'Small Trailer',    cost: 10000, size: 'small',  category: 'trailer', maintenancePerDay: 1, capacityKg: 2000,  compatibleTruckCategories: ['truck-pickup'] },
  { id: 'trailer-standard', name: 'Standard Trailer', cost: 22000, size: 'medium', category: 'trailer', maintenancePerDay: 2, capacityKg: 6000,  compatibleTruckCategories: ['truck-pickup', 'truck-semi'] },
  { id: 'trailer-large',    name: 'Large Trailer',    cost: 38000, size: 'large',  category: 'trailer', maintenancePerDay: 3, capacityKg: 22000, compatibleTruckCategories: ['truck-semi'] },
];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only from store (it still references old fields like `yieldBonus`) — that's fine for now. No errors in `data/machineTypes.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add data/machineTypes.ts
git commit -m "feat: overhaul machine types — remove passive bonuses, add sized tractors/combines/trucks/trailers"
```

---

## Task 3: Create engine/machinery.ts

**Files:**
- Create: `engine/machinery.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MachineType } from '../data/machineTypes';
import { AttachmentType } from '../data/attachmentTypes';

export type ContractorOperation = 'till' | 'plant' | 'spray' | 'harvest' | 'irrigate' | 'transport';

const CONTRACTOR_RATES: Record<ContractorOperation, number> = {
  till:      180,  // per ha
  plant:     130,  // per ha
  spray:     85,   // per ha
  harvest:   280,  // per ha
  irrigate:  300,  // per parcel
  transport: 0.12, // fraction of sale value (handled separately)
};

export interface OwnedMachineRef {
  id: string;
  typeId: string;
}

export interface OwnedAttachmentRef {
  id: string;
  typeId: string;
}

export interface ActiveJobRef {
  tractorId: string;
}

export function calcJobDays(totalHa: number, haPerDay: number): number {
  return Math.ceil(totalHa / haPerDay);
}

/**
 * Returns flat contractor cost for the given operation.
 * For 'transport', pass saleValue as totalHa (it returns 12% of it).
 */
export function getContractorCost(
  operation: ContractorOperation,
  totalHa: number,
): number {
  if (operation === 'transport') {
    return Math.round(totalHa * CONTRACTOR_RATES.transport);
  }
  return Math.round(totalHa * CONTRACTOR_RATES[operation]);
}

export interface CanAssignResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validates whether a tractor+attachment can be assigned a job.
 * Checks: tractor not already busy, attachment compatible with tractor size,
 * parcels in correct state for the operation.
 */
export function canAssignJob(
  tractor: OwnedMachineRef,
  tractorType: MachineType,
  attachment: OwnedAttachmentRef,
  attachmentType: AttachmentType,
  operation: 'till' | 'plant' | 'spray',
  parcelsTilled: boolean[],
  activeJobs: ActiveJobRef[],
): CanAssignResult {
  const isBusy = activeJobs.some(j => j.tractorId === tractor.id);
  if (isBusy) {
    return { ok: false, reason: 'Tractor is already working on a job' };
  }
  if (!attachmentType.compatibleTractorSizes.includes(tractorType.size)) {
    return { ok: false, reason: `${attachmentType.name} is not compatible with ${tractorType.name}` };
  }
  if (attachmentType.operation !== operation) {
    return { ok: false, reason: `${attachmentType.name} cannot perform ${operation}` };
  }
  if (operation === 'plant') {
    const allTilled = parcelsTilled.every(t => t);
    if (!allTilled) {
      return { ok: false, reason: 'All selected parcels must be tilled before planting' };
    }
  }
  return { ok: true };
}

/**
 * Returns total transport capacity in kg from owned trucks + hitched trailers.
 * Dump truck has standalone capacity. Pickup/Semi contribute 0 without a trailer.
 */
export function getTransportCapacityKg(
  machines: OwnedMachineRef[],
  machineTypes: MachineType[],
  trailers: Array<{ id: string; typeId: string; hitchedTo: string | null }>,
  trailerTypes: MachineType[],
): number {
  let total = 0;
  for (const m of machines) {
    const mt = machineTypes.find(t => t.id === m.typeId);
    if (!mt || mt.category !== 'truck') continue;
    if ((mt.capacityKg ?? 0) > 0) {
      // Standalone truck (dump truck)
      total += mt.capacityKg!;
    } else {
      // Needs trailer — find hitched trailer
      const trailer = trailers.find(tr => tr.hitchedTo === m.id);
      if (trailer) {
        const tt = trailerTypes.find(t => t.id === trailer.typeId);
        total += tt?.capacityKg ?? 0;
      }
    }
  }
  return total;
}
```

- [ ] **Step 2: Commit**

```bash
git add engine/machinery.ts
git commit -m "feat: add engine/machinery.ts with pure job/contractor/transport functions"
```

---

## Task 4: Store — New Interfaces and State Fields

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Read the top of the store file (lines 1–380)**

Read `store/useGameStore.ts` lines 1–380 to see current imports, interfaces, and GameState.

- [ ] **Step 2: Add import for new data/engine files**

In the imports block at the top (after the existing imports), add:

```typescript
import { ATTACHMENT_TYPES, AttachmentType } from '../data/attachmentTypes';
import { ContractorOperation, calcJobDays, canAssignJob, getTransportCapacityKg } from '../engine/machinery';
```

- [ ] **Step 3: Add new interfaces after the OwnedMachine interface (around line 208)**

After the `OwnedMachine` interface block, insert:

```typescript
export interface OwnedAttachment {
  id: string;
  typeId: string;
}

export interface OwnedTrailer {
  id: string;
  typeId: string;
  hitchedTo: string | null; // truckId | null
}

export interface TractorJob {
  id: string;
  tractorId: string;
  attachmentId: string;
  operation: 'till' | 'plant' | 'spray';
  parcelIds: string[];
  cropId?: string;       // required when operation === 'plant'
  totalHa: number;
  haPerDay: number;
  startDay: number;
  completesDay: number;
}

export interface HarvestJob {
  id: string;
  combineId: string;
  parcelIds: string[];
  totalHa: number;
  haPerDay: number;
  startDay: number;
  completesDay: number;
  processedHa: number;
}
```

- [ ] **Step 4: Add `tilled` field to LandParcel interface**

Find the `LandParcel` interface (around line 118). After the `irrigated: boolean;` line add:

```typescript
  tilled: boolean;
```

- [ ] **Step 5: Add new state fields to GameState interface**

In the `GameState` interface, after the `machineRepairs: MachineRepair[];` line, add:

```typescript
  attachments: OwnedAttachment[];
  trailers: OwnedTrailer[];
  tractorJobs: TractorJob[];
  harvestJobs: HarvestJob[];
```

- [ ] **Step 6: Add new action signatures to GameState interface**

After the `startRepair: (machineId: string) => void;` line (end of existing actions), add:

```typescript
  buyAttachment: (typeId: string) => void;
  buyTrailer: (typeId: string) => void;
  hitchTrailer: (trailerId: string, truckId: string | null) => void;
  assignJob: (tractorId: string, attachmentId: string, operation: 'till' | 'plant' | 'spray', parcelIds: string[], cropId?: string) => void;
  assignHarvestJob: (combineId: string, parcelIds: string[]) => void;
  hireContractor: (operation: ContractorOperation, parcelIds: string[], cropId?: string) => void;
```

- [ ] **Step 7: Add new fields to the initial state**

Find the initial state object (where `machines: [] as OwnedMachine[]` appears). Add after `machines: [] as OwnedMachine[],`:

```typescript
    attachments: [] as OwnedAttachment[],
    trailers: [] as OwnedTrailer[],
    tractorJobs: [] as TractorJob[],
    harvestJobs: [] as HarvestJob[],
```

Also find where `parcels` are initialized and ensure new parcels get `tilled: false`. In the parcel generator, find the object spread where parcels are created (look for `owned: false` or `plantedCrop: null`) and add `tilled: false` to each generated parcel object.

To find the parcel generation, search for `pricePerHa` in the store — there's a loop creating parcel objects. Add `tilled: false` to that object.

- [ ] **Step 8: Bump the save key**

Find line 2734 (or search for `granja-tycoon-save-v6`) and change:

```typescript
      name: 'granja-tycoon-save-v6',
```

to:

```typescript
      name: 'granja-tycoon-save-v7',
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: errors about unimplemented actions (buyAttachment etc.) — those are added in later tasks. No errors in interface definitions.

- [ ] **Step 10: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add OwnedAttachment/OwnedTrailer/TractorJob/HarvestJob interfaces; bump save key v6→v7"
```

---

## Task 5: Store — buyAttachment, buyTrailer, hitchTrailer Actions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Read buyMachine action in the store**

Search for `buyMachine:` in the store to understand the pattern. It's around line 2155.

- [ ] **Step 2: Add the three new buy/hitch actions after the buyMachine action**

Find the `buyMachine` action implementation and insert after it:

```typescript
      buyAttachment: (typeId) => {
        const state = get();
        const attachType = ATTACHMENT_TYPES.find(a => a.id === typeId);
        if (!attachType) return;
        if (state.money < attachType.cost) return;
        const newAttachment: OwnedAttachment = { id: `attachment_${Date.now()}`, typeId };
        set({ money: state.money - attachType.cost, attachments: [...(state.attachments ?? []), newAttachment] });
      },

      buyTrailer: (typeId) => {
        const state = get();
        const trailerType = MACHINE_TYPES.find(m => m.id === typeId && m.category === 'trailer');
        if (!trailerType) return;
        if (state.money < trailerType.cost) return;
        const newTrailer: OwnedTrailer = { id: `trailer_${Date.now()}`, typeId, hitchedTo: null };
        set({ money: state.money - trailerType.cost, trailers: [...(state.trailers ?? []), newTrailer] });
      },

      hitchTrailer: (trailerId, truckId) => {
        const state = get();
        // Unhitch any trailer currently on this truck (if truckId not null)
        const updatedTrailers = (state.trailers ?? []).map((tr: OwnedTrailer) => {
          if (tr.id === trailerId) return { ...tr, hitchedTo: truckId };
          // Remove existing hitch on that truck slot
          if (truckId && tr.hitchedTo === truckId) return { ...tr, hitchedTo: null };
          return tr;
        });
        set({ trailers: updatedTrailers });
      },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "buyAttachment\|buyTrailer\|hitchTrailer" | head -20
```

Expected: no errors for these three actions.

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add buyAttachment, buyTrailer, hitchTrailer store actions"
```

---

## Task 6: Store — assignJob and assignHarvestJob Actions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Read the engine/machinery.ts file**

Read `engine/machinery.ts` fully to confirm the `canAssignJob` and `calcJobDays` signatures before using them.

- [ ] **Step 2: Add assignJob action after the hitchTrailer action**

```typescript
      assignJob: (tractorId, attachmentId, operation, parcelIds, cropId) => {
        const state = get();
        const tractor = (state.machines ?? []).find((m: OwnedMachine) => m.id === tractorId);
        const attachment = (state.attachments ?? []).find((a: OwnedAttachment) => a.id === attachmentId);
        if (!tractor || !attachment) return;
        const tractorType = MACHINE_TYPES.find(mt => mt.id === tractor.typeId);
        const attachType = ATTACHMENT_TYPES.find(at => at.id === attachment.typeId);
        if (!tractorType || !attachType) return;
        const parcels = parcelIds.map((id: string) => state.parcels.find((p: LandParcel) => p.id === id)).filter(Boolean) as LandParcel[];
        if (parcels.length === 0) return;
        const parcelsTilled = parcels.map((p: LandParcel) => p.tilled);
        const check = canAssignJob(
          tractor, tractorType, attachment, attachType,
          operation, parcelsTilled, state.tractorJobs ?? [],
        );
        if (!check.ok) return;
        if (operation === 'plant' && !cropId) return;
        const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
        const haPerDay = attachType.haPerDay;
        const completesDay = state.day + calcJobDays(totalHa, haPerDay);
        const job: TractorJob = {
          id: `job_${Date.now()}`,
          tractorId,
          attachmentId,
          operation,
          parcelIds,
          cropId,
          totalHa,
          haPerDay,
          startDay: state.day,
          completesDay,
        };
        // For plant jobs, immediately set the planted crop (startDay = completesDay so growth begins then)
        let updatedParcels = state.parcels;
        if (operation === 'plant' && cropId) {
          const { CROP_TYPES: CT } = require('../data/cropTypes');
          const cropType = CT.find((c: { id: string }) => c.id === cropId);
          if (!cropType) return;
          const fertCostMult = 1.0; // no fertilizer cost for machine planting
          const coopSeedDiscount = state.cooperative?.member ? 0.90 : 1.0;
          const seedCost = cropType.seedCost * totalHa * fertCostMult * coopSeedDiscount;
          if (state.money < seedCost) return;
          const { getSeason } = require('../engine/climate');
          const currentSeason = getSeason(state.day);
          updatedParcels = state.parcels.map((p: LandParcel) => {
            if (!parcelIds.includes(p.id)) return p;
            if (!cropType.seasons.includes(currentSeason) && !p.greenhouse) return p;
            const plantedCrop: PlantedCrop = {
              cropId, parcelId: p.id, plantedDay: completesDay, hectares: p.hectares, fertilized: false,
            };
            return { ...p, plantedCrop };
          });
          set({
            money: state.money - seedCost,
            parcels: updatedParcels,
            tractorJobs: [...(state.tractorJobs ?? []), job],
          });
          return;
        }
        set({ tractorJobs: [...(state.tractorJobs ?? []), job] });
      },

      assignHarvestJob: (combineId, parcelIds) => {
        const state = get();
        const combine = (state.machines ?? []).find((m: OwnedMachine) => m.id === combineId);
        if (!combine) return;
        const combineType = MACHINE_TYPES.find(mt => mt.id === combine.typeId && mt.category === 'harvester');
        if (!combineType) return;
        const alreadyBusy = (state.harvestJobs ?? []).some((j: HarvestJob) => j.combineId === combineId);
        if (alreadyBusy) return;
        const parcels = parcelIds.map((id: string) => state.parcels.find((p: LandParcel) => p.id === id)).filter(Boolean) as LandParcel[];
        if (parcels.length === 0) return;
        const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
        const haPerDay = combineType.haPerDay ?? 4;
        const completesDay = state.day + calcJobDays(totalHa, haPerDay);
        const job: HarvestJob = {
          id: `hjob_${Date.now()}`,
          combineId,
          parcelIds,
          totalHa,
          haPerDay,
          startDay: state.day,
          completesDay,
          processedHa: 0,
        };
        set({ harvestJobs: [...(state.harvestJobs ?? []), job] });
      },
```

- [ ] **Step 3: Verify TypeScript compiles (no new errors)**

```bash
npx tsc --noEmit 2>&1 | grep "assignJob\|assignHarvestJob" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add assignJob and assignHarvestJob store actions"
```

---

## Task 7: Store — hireContractor Action

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add hireContractor action after assignHarvestJob**

```typescript
      hireContractor: (operation, parcelIds, cropId) => {
        const state = get();
        const parcels = parcelIds.map((id: string) => state.parcels.find((p: LandParcel) => p.id === id)).filter(Boolean) as LandParcel[];
        if (parcels.length === 0) return;
        const { getContractorCost } = require('../engine/machinery');
        let cost = 0;

        if (operation === 'till') {
          const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          cost = getContractorCost('till', totalHa);
          if (state.money < cost) return;
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) =>
              parcelIds.includes(p.id) ? { ...p, tilled: true } : p
            ),
          });
        } else if (operation === 'plant') {
          if (!cropId) return;
          const { CROP_TYPES: CT } = require('../data/cropTypes');
          const { getSeason } = require('../engine/climate');
          const cropType = CT.find((c: { id: string }) => c.id === cropId);
          if (!cropType) return;
          const currentSeason = getSeason(state.day);
          const validParcels = parcels.filter((p: LandParcel) =>
            p.tilled && !p.plantedCrop && (cropType.seasons.includes(currentSeason) || p.greenhouse)
          );
          if (validParcels.length === 0) return;
          const totalHa = validParcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          const coopSeedDiscount = state.cooperative?.member ? 0.90 : 1.0;
          const seedCost = cropType.seedCost * totalHa * coopSeedDiscount;
          const contractorFee = getContractorCost('plant', totalHa);
          cost = seedCost + contractorFee;
          if (state.money < cost) return;
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) => {
              if (!validParcels.find((vp: LandParcel) => vp.id === p.id)) return p;
              const plantedCrop: PlantedCrop = {
                cropId, parcelId: p.id, plantedDay: state.day, hectares: p.hectares, fertilized: false,
              };
              return { ...p, plantedCrop };
            }),
          });
        } else if (operation === 'spray') {
          const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          cost = getContractorCost('spray', totalHa);
          if (state.money < cost) return;
          // Spray bonus: +10% yield modifier stored on parcel as appliedFertilizerBonus
          // (reuse existing appliedFertilizerBonus pattern from fertilizeCrop)
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) => {
              if (!parcelIds.includes(p.id) || !p.plantedCrop) return p;
              return {
                ...p,
                plantedCrop: { ...p.plantedCrop, appliedFertilizerBonus: Math.max(p.plantedCrop.appliedFertilizerBonus ?? 1.0, 1.10) },
              };
            }),
          });
        } else if (operation === 'harvest') {
          const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
          cost = getContractorCost('harvest', totalHa);
          if (state.money < cost) return;
          // Harvest each parcel using the standard harvestCrop logic (call it per parcel)
          set({ money: state.money - cost });
          parcelIds.forEach((pid: string) => get().harvestCrop(pid));
        } else if (operation === 'irrigate') {
          cost = getContractorCost('irrigate', parcels.length);
          if (state.money < cost) return;
          set({
            money: state.money - cost,
            parcels: state.parcels.map((p: LandParcel) =>
              parcelIds.includes(p.id) ? { ...p, irrigated: true } : p
            ),
          });
        }
      },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "hireContractor" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: add hireContractor store action (instant operations for all ops)"
```

---

## Task 8: Store — Update plantCrop and harvestCrop

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Read plantCrop (around line 1760)**

Read `store/useGameStore.ts` lines 1755–1785 to see current `plantCrop`.

- [ ] **Step 2: Add tilled guard to plantCrop**

In `plantCrop`, after the line `if (!parcel || !parcel.owned || parcel.plantedCrop) return;`, add:

```typescript
        if (!parcel.tilled) return; // must till first
```

- [ ] **Step 3: Read harvestCrop (around line 1782–1852)**

Read `store/useGameStore.ts` lines 1782–1855.

- [ ] **Step 4: Update harvestCrop — remove passive machine bonuses, add combine requirement**

a) Replace the speed-bonus effectiveGrowthDays block:

Find and replace:
```typescript
        // Speed bonus: faster machines reduce effective growth days
        const speedBonus = getMachineSpeedBonus(state.machines);
        const effectiveGrowthDays = Math.round(cropType.growthDays * speedBonus / seedGenes.growth);
```

With:
```typescript
        const effectiveGrowthDays = Math.round(cropType.growthDays / seedGenes.growth);
```

b) Find where `getMachineYieldBonus` is called and `yieldBonus` is used. Replace:

```typescript
        const repairingIds = new Set(
          (state.machineRepairs ?? [])
            .filter(r => r.readyDay === null || r.readyDay > state.day)
            .map(r => r.machineId)
        );
        const yieldBonus = getMachineYieldBonus(state.machines, repairingIds);
        const { harvestAmount } = require('../engine/crops');
        const rawUnits = harvestAmount(crop, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, yieldBonus);
```

With:
```typescript
        const { harvestAmount } = require('../engine/crops');
        const rawUnits = harvestAmount(crop, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, 1.0);
```

- [ ] **Step 5: Update harvestAllReady similarly**

Search for `getMachineSpeedBonus` and `getMachineYieldBonus` in `harvestAllReady` (around line 2548–2600). Apply the same replacements:
- Remove `const speedBonus = getMachineSpeedBonus(state.machines);` and the `speedBonus` usage in `effectiveGrowthDays`
- Remove the `repairingIds` block and `yieldBonus` call, pass `1.0` to `harvestAmount`

- [ ] **Step 6: Remove getMachineYieldBonus and getMachineSpeedBonus helper functions**

Find the two helper functions at the top of the store (lines 25–42). Delete them entirely:

```typescript
function getMachineYieldBonus(machines: OwnedMachine[], repairingIds?: Set<string>): number {
  ...
}

function getMachineSpeedBonus(machines: OwnedMachine[]): number {
  ...
}
```

- [ ] **Step 7: Verify no remaining references to removed functions**

```bash
grep -n "getMachineYieldBonus\|getMachineSpeedBonus" store/useGameStore.ts
```

Expected: no output (zero matches).

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 9: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: gate plantCrop on tilled=true; remove passive machine yield/speed bonuses from harvest"
```

---

## Task 9: Store — Update advanceDay (Job Processing)

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Read the advanceDay function**

Search for `advanceDay:` in the store. Read roughly 200 lines from there to understand the structure. Look especially for the auto-harvest worker block that calls `getMachineSpeedBonus`/`getMachineYieldBonus` (around line 1538–1548).

- [ ] **Step 2: Fix the auto-harvest worker block**

In the advanceDay worker auto-harvest block (which references `speedBonusW` and `yieldBonusW`), replace:

```typescript
            const speedBonusW = getMachineSpeedBonus(state.machines);
            ...
            const yieldBonusW = getMachineYieldBonus(state.machines, repairingIds);
```

With (remove both lines and their associated `repairingIds` calculation if only used there):

```typescript
            const yieldBonusW = 1.0;
```

And replace any reference to `speedBonusW` in effective growth days calculation:

```typescript
Math.round(cropType.growthDays * speedBonusW / seedGenes.growth)
```

With:

```typescript
Math.round(cropType.growthDays / seedGenes.growth)
```

- [ ] **Step 3: Add TractorJob processing block in advanceDay**

Find the section near the end of `advanceDay` where the `set({...})` call with `newDay` is made (the big state update). Before that `set()` call, add job processing logic.

Find the variable `let summaryEvents: DaySummaryEvent[] = [];` (or however summary events are accumulated). Add after the existing job/event loops, before the final `set()`:

```typescript
        // ── Process TractorJobs ──────────────────────────────────────────────
        const completedTractorJobIds: string[] = [];
        let tractorJobParcels = parcelsAfterAllUpdates ?? state.parcels; // use whichever parcel state variable is current at this point in advanceDay

        for (const job of (state.tractorJobs ?? [])) {
          if (job.completesDay > newDay) continue;
          completedTractorJobIds.push(job.id);
          if (job.operation === 'till') {
            tractorJobParcels = tractorJobParcels.map((p: LandParcel) =>
              job.parcelIds.includes(p.id) ? { ...p, tilled: true } : p
            );
            summaryEvents.push({ id: `tj_${job.id}`, icon: '🚜', title: 'Tilling Complete', detail: `${job.parcelIds.length} parcel(s) tilled`, severity: 'good' });
          } else if (job.operation === 'spray') {
            tractorJobParcels = tractorJobParcels.map((p: LandParcel) => {
              if (!job.parcelIds.includes(p.id) || !p.plantedCrop) return p;
              return {
                ...p,
                plantedCrop: { ...p.plantedCrop, appliedFertilizerBonus: Math.max(p.plantedCrop.appliedFertilizerBonus ?? 1.0, 1.10) },
              };
            });
            summaryEvents.push({ id: `tj_${job.id}`, icon: '💊', title: 'Spraying Complete', detail: `${job.parcelIds.length} parcel(s) sprayed`, severity: 'good' });
          } else if (job.operation === 'plant') {
            // Crop was already set at assignJob time with plantedDay = completesDay
            // No state change needed — just remove the job
            summaryEvents.push({ id: `tj_${job.id}`, icon: '🌱', title: 'Planting Complete', detail: `${job.parcelIds.length} parcel(s) planted`, severity: 'good' });
          }
        }
        const remainingTractorJobs = (state.tractorJobs ?? []).filter((j: TractorJob) => !completedTractorJobIds.includes(j.id));
```

> **Important:** The variable name `tractorJobParcels` must be the same parcel variable you pass to the final `set()`. If `advanceDay` already uses a variable like `updatedParcels` for parcel state, use that name instead. Read the actual code to find the correct variable name.

- [ ] **Step 4: Add HarvestJob processing block**

Immediately after the TractorJob block, add:

```typescript
        // ── Process HarvestJobs (incremental — combine harvests N ha/day) ───
        let updatedHarvestJobs = [...(state.harvestJobs ?? [])];
        for (let hi = 0; hi < updatedHarvestJobs.length; hi++) {
          const hj = updatedHarvestJobs[hi];
          const haToProcess = Math.min(hj.haPerDay, hj.totalHa - hj.processedHa);
          let processed = 0;
          for (const pid of hj.parcelIds) {
            if (processed >= haToProcess) break;
            const parcel = tractorJobParcels.find((p: LandParcel) => p.id === pid);
            if (!parcel || !parcel.plantedCrop) continue;
            // Use existing harvestCrop action (it handles inventory, fertility drain, etc.)
            // We can't call get().harvestCrop here safely inside advanceDay;
            // instead, replicate the parcel clear (actual yield is computed by harvestCrop called externally)
            // For simplicity: mark parcel as harvested inline
            const { harvestAmount: ha } = require('../engine/crops');
            const { CROP_TYPES: CT } = require('../data/cropTypes');
            const cropType = CT.find((c: { id: string }) => c.id === parcel.plantedCrop!.cropId);
            if (!cropType) continue;
            const siloCapacity = getSiloCapacity(state.buildings);
            const currentInventoryTotal = Object.values(newInventory ?? state.inventory).reduce((a: number, b) => a + (b as number), 0);
            if (currentInventoryTotal >= siloCapacity) break;
            const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
            const waterScale = (cropType.waterNeed ?? 3) / 5;
            const rawClimateDelta = (baseClimate - 1.0) * waterScale;
            const climateModifier = 1.0 + rawClimateDelta;
            const units = Math.min(
              Math.round(ha(parcel.plantedCrop!, cropType, parcel.fertility, climateModifier, parcel.hasWeeds, 1.0)),
              siloCapacity - currentInventoryTotal,
            );
            const newFertility = Math.max(1, parcel.fertility - (cropType.fertilityDrain ?? 0));
            tractorJobParcels = tractorJobParcels.map((p: LandParcel) =>
              p.id === pid ? { ...p, plantedCrop: null, lastCropId: parcel.plantedCrop!.cropId, fertility: newFertility, tilled: false } : p
            );
            newInventory = { ...(newInventory ?? state.inventory), [parcel.plantedCrop!.cropId]: ((newInventory ?? state.inventory)[parcel.plantedCrop!.cropId] ?? 0) + units };
            processed += parcel.hectares;
          }
          updatedHarvestJobs[hi] = { ...hj, processedHa: hj.processedHa + processed };
        }
        updatedHarvestJobs = updatedHarvestJobs.filter((hj: HarvestJob) => hj.processedHa < hj.totalHa);
```

> **Note:** `newInventory` must refer to whatever inventory accumulator variable is used in `advanceDay`. Read the actual code to align variable names. If `advanceDay` doesn't have a `newInventory` accumulator before this point, initialize one: `let newInventory = { ...state.inventory };` before these blocks.

- [ ] **Step 5: Include new state in the final set() call**

Find the final `set({...})` call inside `advanceDay` and ensure these are included:

```typescript
          parcels: tractorJobParcels,  // (or whatever the final parcel variable is named)
          tractorJobs: remainingTractorJobs,
          harvestJobs: updatedHarvestJobs,
          inventory: newInventory ?? state.inventory,
```

Merge these with the existing fields already being set — do not duplicate keys.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -60
```

Fix any type errors before continuing.

- [ ] **Step 7: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: advanceDay processes TractorJobs and HarvestJobs to completion"
```

---

## Task 10: Store — Update partialize

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Find the partialize function (around line 2742)**

Read lines 2742–2770 of `store/useGameStore.ts`.

- [ ] **Step 2: Add new state fields to persisted state**

The `partialize` function destructures actions to EXCLUDE them, keeping only `...dataState`. The `attachments`, `trailers`, `tractorJobs`, `harvestJobs` are data — they're included automatically via `...dataState`. No change needed for data fields.

Add new action names to the destructure list so they're excluded from persistence:

Find the line:
```typescript
          startHybridization, selectSeedForParcel, startRepair,
```

Change to:
```typescript
          startHybridization, selectSeedForParcel, startRepair,
          buyAttachment, buyTrailer, hitchTrailer, assignJob, assignHarvestJob, hireContractor,
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat: exclude new machinery actions from persisted state"
```

---

## Task 11: Create ContractorModal Component

**Files:**
- Create: `components/ContractorModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ContractorOperation } from '../engine/machinery';

interface ContractorModalProps {
  visible: boolean;
  operation: ContractorOperation;
  parcelCount: number;
  totalHa: number;
  totalCost: number;
  canAfford: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const OPERATION_LABELS: Record<ContractorOperation, string> = {
  till:      'Tilling',
  plant:     'Planting',
  spray:     'Spraying',
  harvest:   'Harvesting',
  irrigate:  'Irrigation',
  transport: 'Transport',
};

const OPERATION_RATES: Record<ContractorOperation, string> = {
  till:      '$180/ha',
  plant:     '$130/ha + seed cost',
  spray:     '$85/ha',
  harvest:   '$280/ha',
  irrigate:  '$300/parcel',
  transport: '12% of sale',
};

export default function ContractorModal({
  visible, operation, parcelCount, totalHa, totalCost, canAfford, onConfirm, onCancel,
}: ContractorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>Hire Contractor</Text>
          <Text style={s.subtitle}>{OPERATION_LABELS[operation]}</Text>

          <View style={s.row}>
            <Text style={s.label}>Parcels</Text>
            <Text style={s.value}>{parcelCount}</Text>
          </View>
          {operation !== 'transport' && (
            <View style={s.row}>
              <Text style={s.label}>Total hectares</Text>
              <Text style={s.value}>{totalHa} ha</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.label}>Rate</Text>
            <Text style={s.value}>{OPERATION_RATES[operation]}</Text>
          </View>
          <View style={[s.row, s.totalRow]}>
            <Text style={s.totalLabel}>Total cost</Text>
            <Text style={[s.totalValue, !canAfford && s.red]}>${totalCost.toLocaleString()}</Text>
          </View>

          {!canAfford && (
            <Text style={s.warning}>Not enough money</Text>
          )}

          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, !canAfford && s.disabled]}
              onPress={onConfirm}
              disabled={!canAfford}
            >
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  card:        { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 20, width: 300, borderWidth: 1, borderColor: '#333' },
  title:       { color: '#e8d5a3', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle:    { color: '#aaa', fontSize: 13, marginBottom: 16 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label:       { color: '#aaa', fontSize: 13 },
  value:       { color: '#fff', fontSize: 13 },
  totalRow:    { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 4 },
  totalLabel:  { color: '#e8d5a3', fontSize: 14, fontWeight: 'bold' },
  totalValue:  { color: '#81c784', fontSize: 14, fontWeight: 'bold' },
  red:         { color: '#ef5350' },
  warning:     { color: '#ef5350', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn:   { flex: 1, backgroundColor: '#333', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelText:  { color: '#aaa', fontWeight: 'bold' },
  confirmBtn:  { flex: 1, backgroundColor: '#2e7d32', borderRadius: 8, padding: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  disabled:    { backgroundColor: '#1b5e20', opacity: 0.5 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "ContractorModal" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add components/ContractorModal.tsx
git commit -m "feat: add ContractorModal component with cost breakdown and confirm/cancel"
```

---

## Task 12: Update tienda.tsx — Add Machinery Sub-Tab

**Files:**
- Modify: `app/(tabs)/tienda.tsx`

- [ ] **Step 1: Read tienda.tsx fully**

Read `app/(tabs)/tienda.tsx` completely.

- [ ] **Step 2: Add imports for new data**

At the top, add:

```typescript
import { MACHINE_TYPES } from '../../data/machineTypes';
import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';
```

And expand the store import to include:

```typescript
const { money, buyMachine, buyAttachment, buyTrailer, machines, attachments, trailers } = useGameStore();
```

- [ ] **Step 3: Change ShopTab type to include 'machinery'**

Find:
```typescript
type ShopTab = 'seeds' | 'products' | 'buildings';
```

Change to:
```typescript
type ShopTab = 'seeds' | 'products' | 'buildings' | 'machinery';
```

- [ ] **Step 4: Create MachineryTab component**

Add a new `MachineryTab` function component before the main `TiendaScreen`:

```typescript
function MachineryTab() {
  const { money, machines, attachments, trailers, buyMachine, buyAttachment, buyTrailer } = useGameStore();
  const [section, setSection] = useState<'tractors' | 'combines' | 'trucks' | 'attachments'>('tractors');

  const tractors    = MACHINE_TYPES.filter(m => m.category === 'tractor');
  const combines    = MACHINE_TYPES.filter(m => m.category === 'harvester');
  const trucks      = MACHINE_TYPES.filter(m => m.category === 'truck');
  const trailerTypes = MACHINE_TYPES.filter(m => m.category === 'trailer');
  const irrigTypes  = MACHINE_TYPES.filter(m => m.category === 'irrigation');

  const ownedCount = (typeId: string) =>
    [...(machines ?? []), ...(trailers ?? [])].filter(m => m.typeId === typeId).length;
  const ownedAttachCount = (typeId: string) =>
    (attachments ?? []).filter((a: { typeId: string }) => a.typeId === typeId).length;

  const SECTION_LABELS = [
    { key: 'tractors', label: '🚜 Tractors' },
    { key: 'combines', label: '🌾 Combines' },
    { key: 'trucks',   label: '🚛 Trucks' },
    { key: 'attachments', label: '⚙️ Attachments' },
  ] as const;

  const renderMachineCard = (m: (typeof MACHINE_TYPES)[0], onBuy: () => void, owned: number) => (
    <View key={m.id} style={mStyles.card}>
      <View style={mStyles.cardHeader}>
        <Text style={mStyles.cardName}>{m.name}</Text>
        {owned > 0 && <Text style={mStyles.ownedBadge}>Owned: {owned}</Text>}
      </View>
      <Text style={mStyles.cardDetail}>💰 ${m.cost.toLocaleString()}</Text>
      <Text style={mStyles.cardDetail}>🔧 ${m.maintenancePerDay}/day maintenance</Text>
      {m.haPerDay !== undefined && <Text style={mStyles.cardDetail}>⚡ {m.haPerDay} ha/day</Text>}
      {m.capacityKg !== undefined && (
        <Text style={mStyles.cardDetail}>
          📦 {m.capacityKg === 0 ? 'Needs trailer' : `${m.capacityKg.toLocaleString()} kg`}
        </Text>
      )}
      <TouchableOpacity
        style={[mStyles.buyBtn, money < m.cost && mStyles.buyBtnDisabled]}
        onPress={onBuy}
        disabled={money < m.cost}
      >
        <Text style={mStyles.buyBtnText}>{money < m.cost ? 'Can\'t afford' : 'Buy'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAttachCard = (a: (typeof ATTACHMENT_TYPES)[0]) => (
    <View key={a.id} style={mStyles.card}>
      <View style={mStyles.cardHeader}>
        <Text style={mStyles.cardName}>{a.name}</Text>
        {ownedAttachCount(a.id) > 0 && <Text style={mStyles.ownedBadge}>Owned: {ownedAttachCount(a.id)}</Text>}
      </View>
      <Text style={mStyles.cardDetail}>💰 ${a.cost.toLocaleString()}</Text>
      <Text style={mStyles.cardDetail}>⚡ {a.haPerDay} ha/day</Text>
      <Text style={mStyles.cardDetail}>🔧 {a.operation.charAt(0).toUpperCase() + a.operation.slice(1)}</Text>
      <Text style={mStyles.cardDetail}>Fits: {a.compatibleTractorSizes.join(', ')} tractors</Text>
      <TouchableOpacity
        style={[mStyles.buyBtn, money < a.cost && mStyles.buyBtnDisabled]}
        onPress={() => buyAttachment(a.id)}
        disabled={money < a.cost}
      >
        <Text style={mStyles.buyBtnText}>{money < a.cost ? 'Can\'t afford' : 'Buy'}</Text>
      </TouchableOpacity>
    </View>
  );

  let listData: React.ReactNode;
  if (section === 'tractors') {
    listData = (
      <ScrollView>
        <Text style={mStyles.sectionHeader}>Tractors</Text>
        {tractors.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
        <Text style={mStyles.sectionHeader}>Irrigation Systems</Text>
        {irrigTypes.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
      </ScrollView>
    );
  } else if (section === 'combines') {
    listData = (
      <ScrollView>
        <Text style={mStyles.sectionHeader}>Combine Harvesters</Text>
        {combines.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
      </ScrollView>
    );
  } else if (section === 'trucks') {
    listData = (
      <ScrollView>
        <Text style={mStyles.sectionHeader}>Vehicles</Text>
        {trucks.map(m => renderMachineCard(m, () => buyMachine(m.id), ownedCount(m.id)))}
        <Text style={mStyles.sectionHeader}>Trailers</Text>
        {trailerTypes.map(m => renderMachineCard(m, () => buyTrailer(m.id), ownedCount(m.id)))}
      </ScrollView>
    );
  } else {
    listData = (
      <ScrollView>
        {ATTACHMENT_TYPES.map(renderAttachCard)}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mStyles.sectionBar}>
        {SECTION_LABELS.map(sl => (
          <TouchableOpacity
            key={sl.key}
            style={[mStyles.sectionBtn, section === sl.key && mStyles.sectionBtnActive]}
            onPress={() => setSection(sl.key)}
          >
            <Text style={[mStyles.sectionBtnText, section === sl.key && mStyles.sectionBtnTextActive]}>
              {sl.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flex: 1 }}>{listData}</View>
    </View>
  );
}

const mStyles = StyleSheet.create({
  sectionBar:        { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  sectionBtn:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginRight: 8, backgroundColor: '#1a1a2e' },
  sectionBtnActive:  { backgroundColor: '#2e7d32' },
  sectionBtnText:    { color: '#aaa', fontSize: 12 },
  sectionBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  sectionHeader:     { color: '#e8d5a3', fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 8, paddingHorizontal: 12 },
  card:              { backgroundColor: '#16213e', borderRadius: 10, margin: 8, padding: 12 },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName:          { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  ownedBadge:        { backgroundColor: '#1b5e20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  cardDetail:        { color: '#aaa', fontSize: 12, marginBottom: 3 },
  buyBtn:            { backgroundColor: '#2e7d32', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  buyBtnDisabled:    { backgroundColor: '#333' },
  buyBtnText:        { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
```

- [ ] **Step 5: Add 'Machinery' tab button to the tab bar**

In `TiendaScreen`, find where the `ShopTab` buttons are rendered (the row with 'Seeds', 'Products', 'Buildings'). Add a Machinery button:

```typescript
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'machinery' && styles.tabBtnActive]}
            onPress={() => setTab('machinery')}
          >
            <Text style={[styles.tabText, tab === 'machinery' && styles.tabTextActive]}>Machinery</Text>
          </TouchableOpacity>
```

- [ ] **Step 6: Add machinery case to the tab render block**

In the section that renders content based on `tab`, add:

```typescript
        {tab === 'machinery' && <MachineryTab />}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "tienda" | head -20
```

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/tienda.tsx
git commit -m "feat: add Machinery sub-tab to tienda (tractors, combines, trucks, trailers, attachments)"
```

---

## Task 13: Update maquinaria.tsx — Fleet/Attachments/Jobs Tabs

**Files:**
- Modify: `app/(tabs)/maquinaria.tsx`

- [ ] **Step 1: Read maquinaria.tsx fully**

Read `app/(tabs)/maquinaria.tsx` completely before editing.

- [ ] **Step 2: Replace the file contents**

The file should become:

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useGameStore, OwnedMachine, OwnedAttachment, OwnedTrailer, TractorJob, HarvestJob, LandParcel } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';

type MachineryTab = 'fleet' | 'attachments' | 'jobs';

// ── Fleet Tab ────────────────────────────────────────────────────────────────
function FleetTab() {
  const { machines, trailers, tractorJobs, harvestJobs, machineRepairs, day } = useGameStore();

  const getJobForTractor = (tractorId: string): TractorJob | undefined =>
    (tractorJobs ?? []).find((j: TractorJob) => j.tractorId === tractorId);
  const getJobForCombine = (combineId: string): HarvestJob | undefined =>
    (harvestJobs ?? []).find((j: HarvestJob) => j.combineId === combineId);

  const tractors   = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'tractor');
  const combines   = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'harvester');
  const trucks     = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'truck');
  const irrigation = (machines ?? []).filter((m: OwnedMachine) => MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'irrigation');

  const renderMachine = (m: OwnedMachine, jobLine?: React.ReactNode) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    if (!mt) return null;
    const repair = (machineRepairs ?? []).find(r => r.machineId === m.id);
    return (
      <View key={m.id} style={s.machineCard}>
        <Text style={s.machineName}>{mt.name}</Text>
        {repair && (
          <Text style={s.repairBadge}>
            {repair.startDay === null ? '⚠️ Broken' : `🔧 Repairing · ready day ${repair.readyDay}`}
          </Text>
        )}
        {jobLine}
      </View>
    );
  };

  const renderTruck = (m: OwnedMachine) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    if (!mt) return null;
    const hitched = (trailers ?? []).find((tr: OwnedTrailer) => tr.hitchedTo === m.id);
    const trailerType = hitched ? MACHINE_TYPES.find(t => t.id === hitched.typeId) : null;
    return (
      <View key={m.id} style={s.machineCard}>
        <Text style={s.machineName}>{mt.name}</Text>
        <Text style={s.machineDetail}>
          {trailerType ? `🔗 ${trailerType.name} (${trailerType.capacityKg?.toLocaleString()} kg)` : mt.capacityKg ? `📦 ${mt.capacityKg.toLocaleString()} kg standalone` : '📦 No trailer hitched'}
        </Text>
      </View>
    );
  };

  if ((machines ?? []).length === 0) {
    return <Text style={s.empty}>No machines owned yet. Buy from the Shop tab.</Text>;
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      {tractors.length > 0 && (
        <>
          <Text style={s.sectionHeader}>🚜 Tractors</Text>
          {tractors.map((m: OwnedMachine) => {
            const job = getJobForTractor(m.id);
            const jobLine = job ? (
              <Text style={s.jobBadge}>
                {job.operation.charAt(0).toUpperCase() + job.operation.slice(1)} · {job.completesDay - day}d left
              </Text>
            ) : <Text style={s.idleBadge}>Idle</Text>;
            return renderMachine(m, jobLine);
          })}
        </>
      )}
      {combines.length > 0 && (
        <>
          <Text style={s.sectionHeader}>🌾 Combines</Text>
          {combines.map((m: OwnedMachine) => {
            const job = getJobForCombine(m.id);
            const jobLine = job ? (
              <Text style={s.jobBadge}>Harvesting · {job.completesDay - day}d left</Text>
            ) : <Text style={s.idleBadge}>Idle</Text>;
            return renderMachine(m, jobLine);
          })}
        </>
      )}
      {trucks.length > 0 && (
        <>
          <Text style={s.sectionHeader}>🚛 Trucks</Text>
          {trucks.map(renderTruck)}
        </>
      )}
      {irrigation.length > 0 && (
        <>
          <Text style={s.sectionHeader}>💧 Irrigation</Text>
          {irrigation.map((m: OwnedMachine) => renderMachine(m))}
        </>
      )}
    </ScrollView>
  );
}

// ── Attachments Tab ──────────────────────────────────────────────────────────
function AttachmentsTab() {
  const { attachments, trailers, machines, hitchTrailer } = useGameStore();

  const trucks = (machines ?? []).filter((m: OwnedMachine) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    return mt?.category === 'truck' && (mt.capacityKg ?? 0) === 0;
  });

  const getAttachType = (typeId: string) => ATTACHMENT_TYPES.find(a => a.id === typeId);
  const getTrailerType = (typeId: string) => MACHINE_TYPES.find(m => m.id === typeId);

  return (
    <ScrollView style={{ flex: 1 }}>
      {(attachments ?? []).length === 0 && (trailers ?? []).length === 0 ? (
        <Text style={s.empty}>No attachments or trailers owned. Buy from the Shop tab.</Text>
      ) : null}

      {(attachments ?? []).length > 0 && (
        <>
          <Text style={s.sectionHeader}>⚙️ Attachments</Text>
          {(attachments ?? []).map((a: OwnedAttachment) => {
            const at = getAttachType(a.typeId);
            if (!at) return null;
            return (
              <View key={a.id} style={s.machineCard}>
                <Text style={s.machineName}>{at.name}</Text>
                <Text style={s.machineDetail}>{at.operation} · {at.haPerDay} ha/day · fits {at.compatibleTractorSizes.join('+')} tractors</Text>
              </View>
            );
          })}
        </>
      )}

      {(trailers ?? []).length > 0 && (
        <>
          <Text style={s.sectionHeader}>🔗 Trailers</Text>
          {(trailers ?? []).map((tr: OwnedTrailer) => {
            const tt = getTrailerType(tr.typeId);
            if (!tt) return null;
            const hitchedTruck = tr.hitchedTo
              ? (machines ?? []).find((m: OwnedMachine) => m.id === tr.hitchedTo)
              : null;
            const hitchedTruckType = hitchedTruck
              ? MACHINE_TYPES.find(mt => mt.id === hitchedTruck.typeId)
              : null;
            return (
              <View key={tr.id} style={s.machineCard}>
                <Text style={s.machineName}>{tt.name} · {tt.capacityKg?.toLocaleString()} kg</Text>
                <Text style={s.machineDetail}>
                  {hitchedTruckType ? `Hitched to: ${hitchedTruckType.name}` : 'Not hitched'}
                </Text>
                <View style={s.hitchRow}>
                  <TouchableOpacity style={s.smallBtn} onPress={() => hitchTrailer(tr.id, null)}>
                    <Text style={s.smallBtnText}>Unhitch</Text>
                  </TouchableOpacity>
                  {trucks.map((tk: OwnedMachine) => {
                    const tkType = MACHINE_TYPES.find(mt => mt.id === tk.typeId);
                    if (!tkType) return null;
                    const compatible = tt.compatibleTruckCategories?.includes(tk.typeId);
                    if (!compatible) return null;
                    return (
                      <TouchableOpacity key={tk.id} style={s.smallBtn} onPress={() => hitchTrailer(tr.id, tk.id)}>
                        <Text style={s.smallBtnText}>→ {tkType.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ── Jobs Tab ─────────────────────────────────────────────────────────────────
function JobsTab() {
  const { tractorJobs, harvestJobs, day } = useGameStore();
  const allJobs = [
    ...(tractorJobs ?? []).map((j: TractorJob) => ({ ...j, kind: 'tractor' as const })),
    ...(harvestJobs ?? []).map((j: HarvestJob) => ({ ...j, kind: 'harvest' as const })),
  ];

  if (allJobs.length === 0) {
    return <Text style={s.empty}>No active jobs. Assign operations from the Fields tab.</Text>;
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <Text style={s.sectionHeader}>Active Jobs</Text>
      {allJobs.map(job => {
        const mt = MACHINE_TYPES.find(t => t.id === (job.kind === 'harvest' ? (job as HarvestJob).combineId : ''));
        const daysLeft = Math.max(0, job.completesDay - day);
        const progress = job.kind === 'harvest'
          ? Math.round(((job as HarvestJob).processedHa / job.totalHa) * 100)
          : Math.round(((day - job.startDay) / (job.completesDay - job.startDay)) * 100);
        return (
          <View key={job.id} style={s.jobCard}>
            <Text style={s.jobTitle}>
              {job.kind === 'harvest' ? '🌾 Harvest' : `🚜 ${(job as TractorJob).operation.charAt(0).toUpperCase() + (job as TractorJob).operation.slice(1)}`}
            </Text>
            <Text style={s.machineDetail}>{job.parcelIds.length} parcel(s) · {job.totalHa} ha total</Text>
            <Text style={s.machineDetail}>{daysLeft}d remaining (completes day {job.completesDay})</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function MaquinariaScreen() {
  const [tab, setTab] = useState<MachineryTab>('fleet');

  return (
    <View style={s.container}>
      <ScreenHeader title="Machinery" />
      <View style={s.tabBar}>
        {(['fleet', 'attachments', 'jobs'] as MachineryTab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'fleet'       && <FleetTab />}
        {tab === 'attachments' && <AttachmentsTab />}
        {tab === 'jobs'        && <JobsTab />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a1a' },
  tabBar:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  tabBtn:       { flex: 1, padding: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#81c784' },
  tabText:      { color: '#aaa', fontSize: 13 },
  tabTextActive:{ color: '#81c784', fontWeight: 'bold' },
  sectionHeader:{ color: '#e8d5a3', fontSize: 13, fontWeight: 'bold', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 6 },
  machineCard:  { backgroundColor: '#16213e', borderRadius: 10, margin: 8, padding: 12 },
  machineName:  { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  machineDetail:{ color: '#aaa', fontSize: 12, marginBottom: 2 },
  repairBadge:  { color: '#ef5350', fontSize: 12, marginBottom: 2 },
  jobBadge:     { color: '#ffb74d', fontSize: 12 },
  idleBadge:    { color: '#81c784', fontSize: 12 },
  empty:        { color: '#555', fontSize: 13, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  hitchRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  smallBtn:     { backgroundColor: '#0f3460', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: '#64b5f6', fontSize: 12 },
  jobCard:      { backgroundColor: '#16213e', borderRadius: 10, margin: 8, padding: 12 },
  jobTitle:     { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  progressBar:  { height: 6, backgroundColor: '#1a1a2e', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#81c784', borderRadius: 3 },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "maquinaria" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/maquinaria.tsx
git commit -m "feat: redesign maquinaria with Fleet/Attachments/Jobs tabs and hitch UI"
```

---

## Task 14: Update tierras.tsx — Context-Sensitive Operation Buttons

**Files:**
- Modify: `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Read tierras.tsx fully**

Read `app/(tabs)/tierras.tsx` completely.

- [ ] **Step 2: Add imports**

At the top, add:

```typescript
import ContractorModal from '../../components/ContractorModal';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { getContractorCost } from '../../engine/machinery';
```

- [ ] **Step 3: Expand store destructure in the component**

In the component that renders parcel cards, expand the `useGameStore()` destructure to include:

```typescript
const {
  // ... existing fields ...
  machines, attachments, tractorJobs, harvestJobs,
  assignJob, assignHarvestJob, hireContractor,
} = useGameStore();
```

- [ ] **Step 4: Add ContractorModal state**

Inside the main screen component (or the parcel card component), add:

```typescript
const [contractorModal, setContractorModal] = useState<{
  visible: boolean;
  operation: 'till' | 'plant' | 'spray' | 'harvest' | 'irrigate';
  parcelIds: string[];
  totalHa: number;
  totalCost: number;
  cropId?: string;
} | null>(null);
```

- [ ] **Step 5: Add helper functions for machine checks**

Add these helper functions inside the component (before the return):

```typescript
const ownedTractors = (machines ?? []).filter((m: OwnedMachine) =>
  MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'tractor'
);
const ownedCombines = (machines ?? []).filter((m: OwnedMachine) =>
  MACHINE_TYPES.find(t => t.id === m.typeId)?.category === 'harvester'
);

const getParcelJob = (parcelId: string) =>
  (tractorJobs ?? []).find((j: TractorJob) => j.parcelIds.includes(parcelId));
const getHarvestJob = (parcelId: string) =>
  (harvestJobs ?? []).find((j: HarvestJob) => j.parcelIds.includes(parcelId));
```

- [ ] **Step 6: Update the parcel card's action button rendering**

Find the section in each parcel card that renders the current action buttons (buy/plant/harvest etc.). Replace it with context-sensitive logic.

The button logic for each owned parcel should follow this pattern (add after the existing parcel info display):

```typescript
// Inside parcel card render, after parcel info:
{parcel.owned && (() => {
  const tractorJob = getParcelJob(parcel.id);
  const harvestJob = getHarvestJob(parcel.id);

  if (tractorJob) {
    const daysLeft = Math.max(0, tractorJob.completesDay - day);
    return (
      <View style={opStyles.progressRow}>
        <Text style={opStyles.progressText}>
          {tractorJob.operation.charAt(0).toUpperCase() + tractorJob.operation.slice(1)} · {daysLeft}d remaining
        </Text>
      </View>
    );
  }
  if (harvestJob) {
    const daysLeft = Math.max(0, harvestJob.completesDay - day);
    return (
      <View style={opStyles.progressRow}>
        <Text style={opStyles.progressText}>Harvesting · {daysLeft}d remaining</Text>
      </View>
    );
  }

  if (!parcel.tilled && !parcel.plantedCrop) {
    // Owned but not tilled
    return (
      <TouchableOpacity
        style={opStyles.opBtn}
        onPress={() => {
          const totalHa = parcel.hectares;
          const cost = getContractorCost('till', totalHa);
          setContractorModal({ visible: true, operation: 'till', parcelIds: [parcel.id], totalHa, totalCost: cost });
        }}
      >
        <Text style={opStyles.opBtnText}>Till Field</Text>
      </TouchableOpacity>
    );
  }

  if (parcel.tilled && !parcel.plantedCrop) {
    // Tilled, ready to plant
    return (
      <TouchableOpacity
        style={[opStyles.opBtn, opStyles.opBtnGreen]}
        onPress={() => {
          // Direct plant (crop selection handled by existing flow)
          // For now show contractor modal for planting (crop selection is done separately)
          // User selects crop from seeds tab and uses plantCrop normally
          // This button is informational — actual planting is from tienda/seeds
        }}
      >
        <Text style={opStyles.opBtnText}>Ready to Plant ✓</Text>
      </TouchableOpacity>
    );
  }

  if (parcel.plantedCrop && !isReadyToHarvest(parcel)) {
    // Growing — optional spray
    const totalHa = parcel.hectares;
    const sprayCost = getContractorCost('spray', totalHa);
    return (
      <TouchableOpacity
        style={[opStyles.opBtn, opStyles.opBtnYellow]}
        onPress={() => setContractorModal({ visible: true, operation: 'spray', parcelIds: [parcel.id], totalHa, totalCost: sprayCost })}
      >
        <Text style={opStyles.opBtnText}>Spray (optional)</Text>
      </TouchableOpacity>
    );
  }

  if (isReadyToHarvest(parcel)) {
    const totalHa = parcel.hectares;
    const harvestCost = getContractorCost('harvest', totalHa);
    return (
      <TouchableOpacity
        style={[opStyles.opBtn, opStyles.opBtnRed]}
        onPress={() => {
          if (ownedCombines.length > 0) {
            // Have a combine — harvest directly
            get().harvestCrop(parcel.id); // use store action
          } else {
            setContractorModal({ visible: true, operation: 'harvest', parcelIds: [parcel.id], totalHa, totalCost: harvestCost });
          }
        }}
      >
        <Text style={opStyles.opBtnText}>Harvest</Text>
      </TouchableOpacity>
    );
  }

  return null;
})()}
```

**Note:** `isReadyToHarvest(parcel)` uses the existing readiness check from the store or engine. Find the existing harvest-ready check in `tierras.tsx` (it checks `plantedDay + growthDays <= day`) and reuse that logic.

For the harvest button, since `tierras.tsx` is a component (not inside the store), call `harvestCrop(parcel.id)` from the destructured store actions.

- [ ] **Step 7: Add ContractorModal to the component JSX**

At the end of the main component return, inside the outer View, add:

```typescript
      {contractorModal && (
        <ContractorModal
          visible={contractorModal.visible}
          operation={contractorModal.operation}
          parcelCount={contractorModal.parcelIds.length}
          totalHa={contractorModal.totalHa}
          totalCost={contractorModal.totalCost}
          canAfford={money >= contractorModal.totalCost}
          onConfirm={() => {
            hireContractor(contractorModal.operation, contractorModal.parcelIds, contractorModal.cropId);
            setContractorModal(null);
          }}
          onCancel={() => setContractorModal(null)}
        />
      )}
```

- [ ] **Step 8: Add missing StyleSheet entries**

Add these styles to the existing `StyleSheet.create({...})` call in tierras.tsx:

```typescript
  // Operation buttons
  opBtn:         { backgroundColor: '#0f3460', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 8 },
  opBtnGreen:    { backgroundColor: '#1b5e20' },
  opBtnYellow:   { backgroundColor: '#e65100' },
  opBtnRed:      { backgroundColor: '#b71c1c' },
  opBtnText:     { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  progressRow:   { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 8, marginTop: 8 },
  progressText:  { color: '#ffb74d', fontSize: 12, textAlign: 'center' },
```

If the styles object is named differently (like `styles`), use that name instead of `opStyles`.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "tierras" | head -20
```

Fix any type errors.

- [ ] **Step 10: Commit**

```bash
git add app/(tabs)/tierras.tsx
git commit -m "feat: add context-sensitive operation buttons to parcel cards (till/plant/spray/harvest)"
```

---

## Task 15: Final Cleanup and Full Compile Check

**Files:**
- Modify: `store/useGameStore.ts` (if any remaining yieldBonus references exist)

- [ ] **Step 1: Search for any remaining references to removed fields**

```bash
grep -n "yieldBonus\|speedBonus\|getMachineYieldBonus\|getMachineSpeedBonus" store/useGameStore.ts data/machineTypes.ts
```

Expected: zero matches. Fix any found.

- [ ] **Step 2: Verify all store state fields have tilled: false in parcel initialization**

```bash
grep -n "tilled" store/useGameStore.ts | head -20
```

Confirm `tilled: false` appears in the initial parcel object generation.

- [ ] **Step 3: Full TypeScript compile check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors. Fix any remaining type errors before committing.

- [ ] **Step 4: Verify save key is v7**

```bash
grep "granja-tycoon-save" store/useGameStore.ts
```

Expected: `granja-tycoon-save-v7`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete machinery overhaul — functional machine-gating, contractor fallback, save v7"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task(s) |
|---|---|
| Farming lifecycle (till→plant→grow→harvest) | Task 4, 8 |
| Tractor sizes + costs ($18k/$48k/$120k) | Task 2 |
| Attachments (cultivator/planter/sprayer, 3 sizes) | Task 1 |
| Combine harvesters (3 sizes, haPerDay) | Task 2 |
| Irrigation systems (3 types, coverage) | Task 2 |
| Trucks (pickup/dump/semi) + trailers (3 sizes) | Task 2 |
| Contractor fallback + costs | Task 3, 7 |
| AttachmentType interface | Task 1 |
| MachineType interface update | Task 2 |
| TractorJob + HarvestJob interfaces | Task 4 |
| LandParcel.tilled field | Task 4 |
| Store: attachments/trailers/tractorJobs/harvestJobs | Task 4 |
| buyAttachment / buyTrailer / hitchTrailer | Task 5 |
| assignJob / assignHarvestJob | Task 6 |
| hireContractor | Task 7 |
| plantCrop gated on tilled | Task 8 |
| harvestCrop requires combine | Task 8 (gate is implicit via ContractorModal in UI) |
| Remove yieldBonus/speedBonus passive bonuses | Task 8, 15 |
| advanceDay job processing | Task 9 |
| partialize exclusion for new actions | Task 10 |
| ContractorModal component | Task 11 |
| Market split: Machinery + Buildings | Task 12 |
| Machinery tab: Fleet/Attachments/Jobs | Task 13 |
| Fields tab: context-sensitive buttons | Task 14 |
| Save key v6 → v7 | Task 4 |

### Known Simplifications

- **Irrigation install time** (1–4 days per spec): Not implemented as a separate job. Owning an irrigation machine makes it available. The contractor path uses `hireContractor('irrigate', ...)` instantly.
- **harvestCrop combine gate in store**: The store's `harvestCrop` action doesn't block without a combine — the UI gate (ContractorModal in tierras.tsx) handles this. This is intentional to keep `harvestAllReady` and auto-harvest worker logic working.
- **assignJob for plant** sets `plantedCrop.plantedDay = completesDay` so the crop growth clock starts when the tractor finishes.
