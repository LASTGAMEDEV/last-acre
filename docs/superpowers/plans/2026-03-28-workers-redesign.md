# Workers Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Expand Workers from 3 auto-action roles to 9 roles (8 tiered + vet standalone) across 4 departments, each with meaningful passive bonuses.

**Architecture:** Rewrite `data/workerTypes.ts` to add department/tier/requiresBasicId fields, then apply computed bonus multipliers in `advanceDay()` and `processProduct()`, then rebuild the UI with department-grouped cards.

**Tech Stack:** TypeScript · Zustand · React Native

---

## File Map

| File | What changes |
|------|-------------|
| `data/workerTypes.ts` | Full rewrite — 9 roles, new fields |
| `store/useGameStore.ts` | `OwnedWorker` type, `hireWorker` guard, bonus math in `advanceDay()` and `processProduct()` |
| `app/(tabs)/trabajadores.tsx` | Full UI rewrite — department layout |

---

## Task 1: Rewrite `data/workerTypes.ts`

**Files:**
- Modify: `data/workerTypes.ts`

- [x] **Step 1: Replace the entire file with the new roster**

```typescript
export type WorkerDepartment = 'fields' | 'animals' | 'machinery' | 'processing';
export type WorkerTier = 'basic' | 'specialist' | 'standalone';

export type WorkerRole =
  | 'field_worker'
  | 'agronomist'
  | 'animal_keeper'
  | 'zootechnician'
  | 'mechanic'
  | 'engineer'
  | 'processor'
  | 'supervisor'
  | 'vet';

export interface WorkerType {
  id: WorkerRole;
  name: string;
  icon: string;
  dailyWage: number;
  maxCount: number;
  description: string;
  department: WorkerDepartment | null;  // null for standalone (vet)
  tier: WorkerTier;
  requiresBasicId?: WorkerRole;  // specialist unlock requirement
}

export const WORKER_TYPES: WorkerType[] = [
  // ── Fields ──────────────────────────────────────────────────────────────
  {
    id: 'field_worker',
    name: 'Field Worker',
    icon: '👨‍🌾',
    dailyWage: 50,
    maxCount: 5,
    department: 'fields',
    tier: 'basic',
    description: 'Auto-harvests ready plots · +5% crop yield per worker',
  },
  {
    id: 'agronomist',
    name: 'Agronomist',
    icon: '🌱',
    dailyWage: 120,
    maxCount: 2,
    department: 'fields',
    tier: 'specialist',
    requiresBasicId: 'field_worker',
    description: '+15% crop yield · crops grow 1 day faster',
  },

  // ── Animals ─────────────────────────────────────────────────────────────
  {
    id: 'animal_keeper',
    name: 'Animal Keeper',
    icon: '🤠',
    dailyWage: 40,
    maxCount: 3,
    department: 'animals',
    tier: 'basic',
    description: 'Auto-collects animal products · +8% production per keeper',
  },
  {
    id: 'zootechnician',
    name: 'Zootechnician',
    icon: '🐄',
    dailyWage: 100,
    maxCount: 2,
    department: 'animals',
    tier: 'specialist',
    requiresBasicId: 'animal_keeper',
    description: '+25% animal production · −30% sickness chance',
  },

  // ── Machinery ────────────────────────────────────────────────────────────
  {
    id: 'mechanic',
    name: 'Mechanic',
    icon: '🔧',
    dailyWage: 70,
    maxCount: 2,
    department: 'machinery',
    tier: 'basic',
    description: '−20% machine maintenance cost per mechanic',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    icon: '⚙️',
    dailyWage: 150,
    maxCount: 1,
    department: 'machinery',
    tier: 'specialist',
    requiresBasicId: 'mechanic',
    description: '−40% machine maintenance · +10% machine yield bonus',
  },

  // ── Processing ───────────────────────────────────────────────────────────
  {
    id: 'processor',
    name: 'Processor',
    icon: '🏭',
    dailyWage: 60,
    maxCount: 3,
    department: 'processing',
    tier: 'basic',
    description: '+10% processing output per worker',
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    icon: '📋',
    dailyWage: 130,
    maxCount: 1,
    department: 'processing',
    tier: 'specialist',
    requiresBasicId: 'processor',
    description: '+25% processing output · auto-processes 1 batch/day',
  },

  // ── Standalone ───────────────────────────────────────────────────────────
  {
    id: 'vet',
    name: 'Veterinarian',
    icon: '👨‍⚕️',
    dailyWage: 80,
    maxCount: 2,
    department: null,
    tier: 'standalone',
    description: 'Auto-treats all sick animals each day',
  },
];
```

- [x] **Step 2: Commit**

```bash
git add data/workerTypes.ts
git commit -m "feat(workers): rewrite worker types with 9 roles, departments, and tier system"
```

---

## Task 2: Update `OwnedWorker` type and `hireWorker` guard

**Files:**
- Modify: `store/useGameStore.ts` (lines ~124–128 for type, ~2069–2084 for actions)

- [x] **Step 1: Update `OwnedWorker` type and `hireWorker` signature (around lines 124 and 301)**

Find:
```typescript
export interface OwnedWorker {
  id: string;
  typeId: 'field_worker' | 'animal_keeper' | 'vet';
  hiredDay: number;
}
```

Replace with:
```typescript
export interface OwnedWorker {
  id: string;
  typeId: WorkerRole;
  hiredDay: number;
}
```

Also find the `hireWorker` declaration in the `GameState` interface (around line 301) and update its signature:

```typescript
// Before:
hireWorker: (typeId: 'field_worker' | 'animal_keeper' | 'vet') => void;
// After:
hireWorker: (typeId: WorkerRole) => void;
```

Also add the import at the top of the file (find the existing workerTypes import and update it):
```typescript
import { WorkerRole } from '../data/workerTypes';
```
If there's no existing import for workerTypes, add it near the other data imports. If `WorkerRole` is already imported via a `require()` inside functions, add it as a top-level import instead.

- [x] **Step 2: Update `hireWorker` action (around line 2069)**

Find the `hireWorker` action and replace its body:

```typescript
hireWorker: (typeId) => {
  const state = get();
  const { WORKER_TYPES: WT } = require('../data/workerTypes');
  const workerType = WT.find((t: any) => t.id === typeId);
  if (!workerType) return;

  // Specialist unlock check
  if (workerType.requiresBasicId) {
    const hasBasic = (state.workers ?? []).some((w: OwnedWorker) => w.typeId === workerType.requiresBasicId);
    if (!hasBasic) return;
  }

  const currentCount = (state.workers ?? []).filter((w: OwnedWorker) => w.typeId === typeId).length;
  if (currentCount >= workerType.maxCount) return;
  if (state.money < workerType.dailyWage) return;

  const worker: OwnedWorker = { id: `worker_${Date.now()}`, typeId, hiredDay: state.day };
  set({ money: state.money - workerType.dailyWage, workers: [...(state.workers ?? []), worker] });
},
```

- [x] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(workers): expand OwnedWorker type and add specialist unlock guard to hireWorker"
```

---

## Task 3: Add `getWorkerBonuses` helper

**Files:**
- Modify: `store/useGameStore.ts` — add helper function before the `create()` call

- [x] **Step 1: Add the helper function**

Find the section of top-level helper functions (near `getDailyMaintenance`, `getMachineYieldBonus`, etc.) and add this function:

```typescript
function getWorkerBonuses(workers: OwnedWorker[]) {
  const fieldWorkerCount = workers.filter(w => w.typeId === 'field_worker').length;
  const agronomistCount  = workers.filter(w => w.typeId === 'agronomist').length;
  const keeperCount      = workers.filter(w => w.typeId === 'animal_keeper').length;
  const zootechCount     = workers.filter(w => w.typeId === 'zootechnician').length;
  const mechanicCount    = workers.filter(w => w.typeId === 'mechanic').length;
  const engineerCount    = workers.filter(w => w.typeId === 'engineer').length;
  const processorCount   = workers.filter(w => w.typeId === 'processor').length;
  const supervisorCount  = workers.filter(w => w.typeId === 'supervisor').length;

  return {
    // Fields
    cropYieldMultiplier:    1 + (fieldWorkerCount * 0.05) + (agronomistCount * 0.15),
    cropGrowthReduction:    agronomistCount > 0 ? 1 : 0,
    // Animals
    animalProductionMult:   1 + (keeperCount * 0.08) + (zootechCount * 0.25),
    sicknessBonusReduction: zootechCount > 0 ? 0.3 : 0,
    // Machinery
    maintenanceMult:        engineerCount > 0 ? 0.6 : Math.max(0.6, 1 - mechanicCount * 0.2),
    machineYieldBonus:      engineerCount > 0 ? 0.1 : 0,
    // Processing
    processingOutputMult:   1 + (processorCount * 0.10) + (supervisorCount * 0.25),
    autoProcessEnabled:     supervisorCount > 0,
  };
}
```

- [x] **Step 2: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(workers): add getWorkerBonuses helper"
```

---

## Task 4: Apply worker bonuses in `advanceDay()`

**Files:**
- Modify: `store/useGameStore.ts` — multiple points inside `advanceDay()`

- [x] **Step 1: Compute bonuses at the top of `advanceDay()`**

At the top of the `advanceDay` action body (right after `const state = get();` or after `const newDay = state.day + 1;`), add:

```typescript
const workerBonuses = getWorkerBonuses(state.workers ?? []);
```

- [x] **Step 2: Apply maintenance multiplier (around line 583)**

Find:
```typescript
const maintenanceCost = getDailyMaintenance(state.machines, state.buildings);
```

Replace with:
```typescript
const maintenanceCost = Math.round(getDailyMaintenance(state.machines, state.buildings) * workerBonuses.maintenanceMult);
```

- [x] **Step 3: Apply sickness reduction (around line 924)**

Find:
```typescript
const sickChance = (a.traits ?? []).includes('hardy') ? 0.006 : 0.015;
```

Replace with:
```typescript
const baseSickChance = (a.traits ?? []).includes('hardy') ? 0.006 : 0.015;
const sickChance = baseSickChance * (1 - workerBonuses.sicknessBonusReduction);
```

- [x] **Step 4: Apply animal production multiplier (around line 1165–1168)**

Find:
```typescript
const { units, nextDay } = collectProd(a, animalType, newDay);
if (units <= 0) return a;
const key = animalType.productionType;
return { ...a, lastProductionDay: nextDay, _autoCollect: { key, units: Math.round(units * graneroBonus) } };
```

Replace with:
```typescript
const { units, nextDay } = collectProd(a, animalType, newDay);
if (units <= 0) return a;
const key = animalType.productionType;
return { ...a, lastProductionDay: nextDay, _autoCollect: { key, units: Math.round(units * graneroBonus * workerBonuses.animalProductionMult) } };
```

- [x] **Step 5: Apply crop yield multiplier and growth reduction in field worker harvest (around line 1194–1205)**

Find the growth check line inside the field worker harvest block:
```typescript
if (newDay < p.plantedCrop.plantedDay + Math.round(cropType.growthDays * speedBonusW)) return p;
```

Replace with:
```typescript
if (newDay < p.plantedCrop.plantedDay + Math.max(1, Math.round(cropType.growthDays * speedBonusW) - workerBonuses.cropGrowthReduction)) return p;
```

Then find the line that computes `rawUnits`:
```typescript
const rawUnits = harvestAmt(p.plantedCrop, cropType, p.fertility, climateModifier, p.hasWeeds, yieldBonusW);
const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * irrigationBonus * rotationMod * soilMod), siloCapacity - siloTotal);
```

Replace with:
```typescript
const machineYieldWithEngineer = yieldBonusW + workerBonuses.machineYieldBonus;
const rawUnits = harvestAmt(p.plantedCrop, cropType, p.fertility, climateModifier, p.hasWeeds, machineYieldWithEngineer);
const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * irrigationBonus * rotationMod * soilMod * workerBonuses.cropYieldMultiplier), siloCapacity - siloTotal);
```

- [x] **Step 6: Add supervisor auto-process logic**

After the field worker harvest block (around line 1215, after the `__workerInventory` side effect), add a new block for supervisor auto-processing:

```typescript
// Supervisor auto-process: 1 batch of highest-stock recipe per day
if (workerBonuses.autoProcessEnabled) {
  const { PROCESSING_RECIPES: AUTO_RECIPES, PROCESSED_PRODUCTS: AUTO_PRODUCTS } = require('../data/processingTypes');
  const currentInventory = (autoSellFinalInventory as any).__workerInventory ?? autoSellFinalInventory;
  const currentAnimalInv = (animals as any).__newAnimalInventory ?? state.animalInventory;

  // Find eligible recipes (building owned, at least 1 batch available)
  const eligible = AUTO_RECIPES.filter((r: any) => {
    if (!state.buildings.includes(r.requiredBuilding)) return false;
    const stock = r.input.source === 'crop'
      ? (currentInventory[r.input.itemId] ?? 0)
      : (currentAnimalInv[r.input.itemId] ?? 0);
    return stock >= r.input.amount;
  });

  if (eligible.length > 0) {
    // Pick the recipe with the most input stock
    const best = eligible.reduce((prev: any, cur: any) => {
      const prevStock = prev.input.source === 'crop'
        ? (currentInventory[prev.input.itemId] ?? 0)
        : (currentAnimalInv[prev.input.itemId] ?? 0);
      const curStock = cur.input.source === 'crop'
        ? (currentInventory[cur.input.itemId] ?? 0)
        : (currentAnimalInv[cur.input.itemId] ?? 0);
      return curStock > prevStock ? cur : prev;
    });

    const outputAmount = Math.round(best.outputAmount * workerBonuses.processingOutputMult);

    if (best.input.source === 'crop') {
      (autoSellFinalInventory as any).__workerInventory = {
        ...(currentInventory),
        [best.input.itemId]: (currentInventory[best.input.itemId] ?? 0) - best.input.amount,
      };
    } else {
      (animals as any).__newAnimalInventory = {
        ...currentAnimalInv,
        [best.input.itemId]: (currentAnimalInv[best.input.itemId] ?? 0) - best.input.amount,
      };
    }

    // Add to processedInventory via a temp field — resolved in set() below
    (autoSellFinalInventory as any).__supervisorProcess = {
      productId: best.outputProductId,
      amount: outputAmount,
    };
  }
}
```

Then in the `set({...})` call at the end of `advanceDay()`, find where `processedInventory` is set (or add it if not present). Look for the big `set({` call at the end of `advanceDay` and add:

```typescript
// After computing processedInventory to set:
const supervisorProcess: { productId: string; amount: number } | undefined =
  (autoSellFinalInventory as any).__supervisorProcess;
const processedInventoryForSet = supervisorProcess
  ? {
      ...state.processedInventory,
      [supervisorProcess.productId]: (state.processedInventory[supervisorProcess.productId] ?? 0) + supervisorProcess.amount,
    }
  : state.processedInventory;
```

And in the `set({...})` object, use `processedInventory: processedInventoryForSet`.

> **Note:** Search for `processedInventory` in the `set({` call at the end of `advanceDay()`. If it's not currently being set there (it may not be, since processing is done via a separate action), just add `processedInventory: processedInventoryForSet` to the set object.

- [x] **Step 7: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(workers): apply worker passive bonuses in advanceDay (yield, sickness, maintenance, auto-process)"
```

---

## Task 5: Apply processing output multiplier in `processProduct()`

**Files:**
- Modify: `store/useGameStore.ts` — `processProduct` action (~line 1803)

- [x] **Step 1: Read worker bonuses inside `processProduct` and apply multiplier**

Find the `processProduct` action. Inside it, after `const state = get();`, add:

```typescript
const wBonuses = getWorkerBonuses(state.workers ?? []);
```

Then find both places where output is written. For the crop-input branch, find:
```typescript
[recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + recipe.outputAmount * batches,
```
Replace with:
```typescript
[recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + Math.round(recipe.outputAmount * batches * wBonuses.processingOutputMult),
```

Do the same for the animal-input branch (same pattern, same replacement).

- [x] **Step 2: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(workers): apply processing output multiplier in processProduct action"
```

---

## Task 6: Rewrite the Workers UI

**Files:**
- Modify: `app/(tabs)/trabajadores.tsx`

- [x] **Step 1: Replace the entire file**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore, OwnedWorker } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { WORKER_TYPES, WorkerType, WorkerRole } from '../../data/workerTypes';

const DEPARTMENTS: { id: string; label: string; icon: string; basicId: WorkerRole; specialistId: WorkerRole }[] = [
  { id: 'fields',      label: 'Fields',      icon: '🌾', basicId: 'field_worker',  specialistId: 'agronomist'     },
  { id: 'animals',     label: 'Animals',     icon: '🐄', basicId: 'animal_keeper', specialistId: 'zootechnician'  },
  { id: 'machinery',   label: 'Machinery',   icon: '⚙️', basicId: 'mechanic',      specialistId: 'engineer'       },
  { id: 'processing',  label: 'Processing',  icon: '🏭', basicId: 'processor',     specialistId: 'supervisor'     },
];

const DEPT_ICONS: Record<string, string> = {
  fields: '🌾', animals: '🐄', machinery: '⚙️', processing: '🏭',
};

export default function TrabajadoresScreen() {
  const { money, workers, day, hireWorker, fireWorker } = useGameStore();
  const activeWorkers: OwnedWorker[] = workers ?? [];

  const totalDailyWage = activeWorkers.reduce((s, w) => {
    const wt = WORKER_TYPES.find(t => t.id === w.typeId);
    return s + (wt?.dailyWage ?? 0);
  }, 0);

  function countOf(typeId: WorkerRole) {
    return activeWorkers.filter(w => w.typeId === typeId).length;
  }

  function isSpecialistLocked(wt: WorkerType): boolean {
    if (!wt.requiresBasicId) return false;
    return countOf(wt.requiresBasicId) === 0;
  }

  function renderCard(wt: WorkerType) {
    const count = countOf(wt.id);
    const atMax = count >= wt.maxCount;
    const canAfford = money >= wt.dailyWage;
    const locked = wt.tier === 'specialist' && isSpecialistLocked(wt);
    const isSpecialist = wt.tier === 'specialist';

    return (
      <View key={wt.id} style={[styles.card, isSpecialist && styles.cardSpecialist, locked && styles.cardLocked]}>
        <Text style={styles.cardIcon}>{wt.icon}</Text>
        <Text style={[styles.cardName, isSpecialist && styles.cardNameSpecialist]}>{wt.name}</Text>
        <Text style={styles.cardDesc}>{wt.description}</Text>
        <Text style={styles.cardWage}>${wt.dailyWage}/day</Text>
        {locked && (
          <Text style={styles.lockNote}>
            Requires 1 {WORKER_TYPES.find(t => t.id === wt.requiresBasicId)?.name}
          </Text>
        )}
        <View style={styles.cardBottom}>
          <Text style={styles.cardCount}>{count}/{wt.maxCount}</Text>
          <TouchableOpacity
            style={[styles.hireBtn, (atMax || !canAfford || locked) && styles.hireBtnDisabled]}
            onPress={() => hireWorker(wt.id)}
            disabled={atMax || !canAfford || locked}
          >
            <Text style={styles.hireBtnText}>
              {atMax ? 'Max' : locked ? 'Locked' : !canAfford ? 'No funds' : '+ Hire'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const vetType = WORKER_TYPES.find(t => t.id === 'vet')!;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Staff" />

      {totalDailyWage > 0 && (
        <View style={styles.wageBanner}>
          <Text style={styles.wageText}>
            💼 {activeWorkers.length} staff · ${totalDailyWage}/day total wages
          </Text>
        </View>
      )}

      {/* Department sections */}
      {DEPARTMENTS.map(dept => {
        const basicType = WORKER_TYPES.find(t => t.id === dept.basicId)!;
        const specialistType = WORKER_TYPES.find(t => t.id === dept.specialistId)!;
        return (
          <View key={dept.id} style={styles.deptSection}>
            <Text style={styles.deptLabel}>{dept.icon} {dept.label}</Text>
            <View style={styles.cardRow}>
              {renderCard(basicType)}
              {renderCard(specialistType)}
            </View>
          </View>
        );
      })}

      {/* Standalone: Vet */}
      <View style={styles.deptSection}>
        <Text style={styles.deptLabel}>🏥 Veterinary</Text>
        <View style={styles.cardRow}>
          {renderCard(vetType)}
        </View>
      </View>

      {/* Active staff */}
      <Text style={styles.sectionLabel}>Active Staff ({activeWorkers.length})</Text>
      {activeWorkers.length === 0 ? (
        <Text style={styles.empty}>No staff hired yet.</Text>
      ) : (
        <View style={styles.staffList}>
          {activeWorkers.map((worker: OwnedWorker) => {
            const wt = WORKER_TYPES.find(t => t.id === worker.typeId);
            if (!wt) return null;
            const daysEmployed = day - worker.hiredDay;
            const deptIcon = wt.department ? DEPT_ICONS[wt.department] : '🏥';
            return (
              <View key={worker.id} style={styles.staffCard}>
                <Text style={styles.staffIcon}>{wt.icon}</Text>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{deptIcon} {wt.name}</Text>
                  <Text style={styles.staffDays}>Hired {daysEmployed}d ago · ${wt.dailyWage}/day</Text>
                </View>
                <TouchableOpacity style={styles.fireBtn} onPress={() => fireWorker(worker.id)}>
                  <Text style={styles.fireBtnText}>Fire</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#1a1a2e' },
  sectionLabel:      { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 16, marginBottom: 6 },
  empty:             { color: '#555', padding: 16 },

  wageBanner:        { backgroundColor: '#1e2a3a', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 10 },
  wageText:          { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },

  deptSection:       { marginTop: 16, paddingHorizontal: 8 },
  deptLabel:         { color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 8, paddingHorizontal: 4 },

  cardRow:           { flexDirection: 'row', gap: 8 },
  card:              { flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 12 },
  cardSpecialist:    { backgroundColor: '#1a2744', borderWidth: 1, borderColor: '#2d4a8a' },
  cardLocked:        { opacity: 0.55 },
  cardIcon:          { fontSize: 26, marginBottom: 4 },
  cardName:          { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  cardNameSpecialist:{ color: '#7eb8f7' },
  cardDesc:          { color: '#888', fontSize: 11, marginBottom: 4, lineHeight: 15 },
  cardWage:          { color: '#81c784', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  lockNote:          { color: '#666', fontSize: 10, fontStyle: 'italic', marginBottom: 4 },
  cardBottom:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardCount:         { color: '#666', fontSize: 11 },
  hireBtn:           { backgroundColor: '#1565c0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  hireBtnDisabled:   { backgroundColor: '#333' },
  hireBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  staffList:         { paddingHorizontal: 12 },
  staffCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8 },
  staffIcon:         { fontSize: 22, marginRight: 12 },
  staffInfo:         { flex: 1 },
  staffName:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  staffDays:         { color: '#888', fontSize: 11, marginTop: 2 },
  fireBtn:           { backgroundColor: '#b71c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  fireBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
```

- [x] **Step 2: Commit**

```bash
git add "app/(tabs)/trabajadores.tsx"
git commit -m "feat(workers): rewrite workers UI with department sections and tier cards"
```

---

## Task 7: Manual verification

- [x] **Start the dev server**

```bash
CI=1 npx expo start --web
```

Open `http://localhost:8081/(tabs)/trabajadores` (or navigate to the Staff tab).

- [x] **Check: department layout renders** — 4 department sections (Fields, Animals, Machinery, Processing) + 1 Veterinary section, each with 2 cards side by side (except Vet which has 1).

- [x] **Check: specialist cards are locked initially** — Agronomist, Zootechnician, Engineer, Supervisor should show 55% opacity and "Locked" hire button.

- [x] **Check: hire a Field Worker** — Hire 1 Field Worker. Agronomist card should become active (full opacity, hire button enabled). Wage banner updates.

- [x] **Check: fire the Field Worker** — Agronomist card locks again. The hired Agronomist (if any) remains hired but the hire button locks.

- [x] **Check: advance a day** — Verify in Day Summary modal that maintenance costs reflect any mechanic discount. If you have animals and hired Zootechnician, verify no unusual crashes.

- [x] **Check: processing output** — Hire a Processor. Process a recipe. Output should be 10% higher than the base `outputAmount`.

- [x] **Commit final verification note**

```bash
git commit --allow-empty -m "chore: workers redesign verified manually"
```
