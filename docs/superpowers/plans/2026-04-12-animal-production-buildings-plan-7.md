# Animal Production Buildings — Plan 7: Hatchery Auto-Spawn (Incubation Queue)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the hatchery buildings — players place eggs into an incubation queue and after a species-specific number of days, chicks automatically spawn in `advanceDay`.

**Architecture:** An `IncubationBatch` interface (modelled after `HenilBatch`) holds queued eggs. A `queueEggsForIncubation(typeId, quantity)` action deducts eggs from `animalInventory['eggs']` and creates a batch with a `readyDay`. In `advanceDay`, ready batches spawn `OwnedAnimal` chicks (80% hatch rate, random sex, `randomGenes()`) and are removed from the queue. `hatcheryCapacity` is a derived field (same pattern as `slurryCapacity`) synced in `buyBuilding`, `onRehydrateStorage`, and `performPrestige`. The `IncubationSection` UI mirrors the `SlurrySection`/`SilageSection` pattern.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `node_modules\.bin\tsc --noEmit` for verification.

---

## Plans 8+ (not in this plan)

- **Plan 8:** Milk quality grading (SCC from hygiene → Grade A/B/C multiplier on milk sales), animal welfare score (hygiene + feed + density + health → Grade A/B product flag)

---

## Architectural Notes

- **`IncubationBatch` interface** (add before `GameState`, after `HenilBatch` at line 457):
  ```typescript
  export interface IncubationBatch {
    batchId: string;
    typeId: string;      // 'gallina' | 'pato' | 'codorniz'
    eggCount: number;
    startDay: number;
    readyDay: number;    // startDay + INCUBATION_DAYS[typeId]
  }
  ```
- **`INCUBATION_DAYS` lookup** — inline constant used in both `queueEggsForIncubation` and `advanceDay`:
  ```typescript
  const INCUBATION_DAYS: Record<string, number> = { gallina: 21, pato: 28, codorniz: 17 };
  ```
- **Hatch rate:** 80% of eggs → `Math.round(batch.eggCount * 0.80)` chicks. This is separate from brooder-house daily mortality (which already exists in `advanceDay` for chicks age ≤ 14).
- **Hatch block placement in `advanceDay`:** Insert AFTER the brooder mortality block (line ~1825) so newly hatched chicks are not subjected to brooder mortality on their birth day.
- **Sex:** `Math.random() < 0.5 ? 'male' : 'female'` — same as `breedAnimal`.
- **Genes:** `randomGenes()` — same as `buyAnimal`. Already imported at line 4.
- **Animal ID:** `animal_hatch_${newDay}_${batch.batchId}_${i}` — unique because `batchId` encodes the queue time and `i` is the chick index.
- **Enclosure capacity:** Intentionally NOT checked on hatch (natural event; player must manage capacity). Matches existing breeding behaviour.
- **Eggs are generic:** `animalInventory['eggs']` holds one pool regardless of species. The player specifies which species they want to hatch. This is an intentional gameplay abstraction.
- **`hatcheryCapacity`** — derived from owned hatchery buildings:
  - `bld_hatchery_s` → 50 eggs; `bld_hatchery_m` → 150 eggs; `bld_hatchery_l` → 400 eggs
  - Multiple buildings stack. Pattern identical to `slurryCapacity`.
- **`incubationQueue`** is persisted state (not excluded from partialize). Only the action `queueEggsForIncubation` is excluded.

---

## File Map

| File | Change |
|------|--------|
| `store/useGameStore.ts` | Task 1: `IncubationBatch` interface + `incubationQueue` + `hatcheryCapacity` fields + `makeInitialState`<br>Task 2: `queueEggsForIncubation` action + `buyBuilding` sync + partialize<br>Task 3: `advanceDay` hatch block<br>Task 5: `onRehydrateStorage` + `performPrestige` |
| `app/(tabs)/gestion.tsx` | Task 4: `IncubationSection` component |

---

## Task 1: `IncubationBatch` interface + GameState fields + `makeInitialState`

**Files:** Modify `store/useGameStore.ts`

### Step 1: Add `IncubationBatch` interface

Find `export interface HenilBatch {` (line 452). Immediately after its closing `}` (line 457), add:

```typescript
export interface IncubationBatch {
  batchId: string;
  typeId: string;      // 'gallina' | 'pato' | 'codorniz'
  eggCount: number;
  startDay: number;
  readyDay: number;    // startDay + INCUBATION_DAYS[typeId]
}
```

### Step 2: Add 2 fields to the `GameState` interface

Find `slurryCapacity: number;` in the `GameState` interface (line ~542). After the three silage/biogas fields that follow it (added by Plan 6), add:

```typescript
  // Hatchery (Plan 7)
  incubationQueue: IncubationBatch[];
  hatcheryCapacity: number;   // derived: sum of hatchery building capacities
```

### Step 3: Add the `queueEggsForIncubation` action signature

Find `setBiogasMode: (mode: 'income' | 'fuel') => void;` in the `GameState` interface (added by Plan 6). After it, add:

```typescript
  queueEggsForIncubation: (typeId: string, quantity: number) => void;
```

### Step 4: Initialize in `makeInitialState`

Find `silageCapacity: 0,` and `biogasMode: 'income' as const,` in `makeInitialState` (added by Plan 6). After them, add:

```typescript
    incubationQueue: [] as IncubationBatch[],
    hatcheryCapacity: 0,
```

### Step 5: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors.

### Step 6: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): IncubationBatch interface, incubationQueue and hatcheryCapacity GameState fields"
```

---

## Task 2: `queueEggsForIncubation` action + `buyBuilding` sync + `partialize`

**Files:** Modify `store/useGameStore.ts`

### Step 1: Add `hatcheryCapacity` reduce block in `buyBuilding`

Find the `buyBuilding` action. After the existing `silageCapacity` reduce block (added by Plan 6, which ends with `}, 0);`), add:

```typescript
        const hatcheryCapacity = newBuildings.reduce((cap: number, bid: string) => {
          if (bid === 'bld_hatchery_s') return cap + 50;
          if (bid === 'bld_hatchery_m') return cap + 150;
          if (bid === 'bld_hatchery_l') return cap + 400;
          return cap;
        }, 0);
```

Then add `hatcheryCapacity,` to the `set({...})` call in `buyBuilding` (alongside `sickBayCapacity,`, `slurryCapacity,`, and `silageCapacity,`).

### Step 2: Implement `queueEggsForIncubation` action

Find `setBiogasMode: (mode) => {` in the action implementations (added by Plan 6). After its closing `},`, add:

```typescript
      queueEggsForIncubation: (typeId, quantity) => {
        const state = get();
        const INCUBATION_DAYS: Record<string, number> = { gallina: 21, pato: 28, codorniz: 17 };
        if (!INCUBATION_DAYS[typeId]) return; // unsupported species
        const cap = state.hatcheryCapacity ?? 0;
        if (cap <= 0) return; // no hatchery built
        const eggsInQueue = (state.incubationQueue ?? []).reduce(
          (sum: number, b: IncubationBatch) => sum + b.eggCount, 0
        );
        const space = cap - eggsInQueue;
        const eggsAvail = state.animalInventory['eggs'] ?? 0;
        const toQueue = Math.min(quantity, eggsAvail, space);
        if (toQueue <= 0) return;
        const newBatch: IncubationBatch = {
          batchId: `hatch_${state.day}_${typeId}_${Date.now()}`,
          typeId,
          eggCount: toQueue,
          startDay: state.day,
          readyDay: state.day + INCUBATION_DAYS[typeId],
        };
        set({
          animalInventory: {
            ...state.animalInventory,
            eggs: Math.max(0, eggsAvail - toQueue),
          },
          incubationQueue: [...(state.incubationQueue ?? []), newBatch],
        });
      },
```

### Step 3: Add `queueEggsForIncubation` to the `partialize` exclusion list

Find the partialize destructure block (around line 5606). It ends with `...spreadSlurry, fillSilagePit, setBiogasMode,`. Add `queueEggsForIncubation,` alongside them:

```typescript
designateAsSire, removeFromSirePen, spreadSlurry, fillSilagePit, setBiogasMode, queueEggsForIncubation,
```

### Step 4: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors.

### Step 5: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): queueEggsForIncubation action, hatcheryCapacity sync in buyBuilding"
```

---

## Task 3: `advanceDay` hatch block

**Files:** Modify `store/useGameStore.ts`

### Step 1: Declare `let newIncubationQueue` before the hatch block

Find `let newSilageLevel = state.silageLevel ?? 0;` (added by Plan 6, line ~2696). Immediately after it, add:

```typescript
        let newIncubationQueue = [...(state.incubationQueue ?? [])];
```

### Step 2: Add the hatch block after the brooder mortality section

Find the closing `}` of the brooder mortality block (line ~1825, ends right before `// ── Weaner accommodation`). Immediately after that closing `}`, add the following block:

```typescript
        // ── Hatchery: incubation queue hatching ───────────────────────────────
        {
          const INCUBATION_DAYS: Record<string, number> = { gallina: 21, pato: 28, codorniz: 17 };
          const HATCH_RATE = 0.80;
          const readyBatches = newIncubationQueue.filter(
            (b: IncubationBatch) => b.readyDay <= newDay
          );
          newIncubationQueue = newIncubationQueue.filter(
            (b: IncubationBatch) => b.readyDay > newDay
          );
          for (const batch of readyBatches) {
            const chickCount = Math.round(batch.eggCount * HATCH_RATE);
            if (chickCount <= 0) continue;
            const newChicks: OwnedAnimal[] = [];
            for (let i = 0; i < chickCount; i++) {
              newChicks.push({
                id: `animal_hatch_${newDay}_${batch.batchId}_${i}`,
                typeId: batch.typeId,
                sex: Math.random() < 0.5 ? 'male' : 'female',
                bornDay: newDay,
                lastProductionDay: newDay,
                lastBreedDay: newDay,
                sick: false,
                genes: randomGenes(),
              });
            }
            animals = [...animals, ...newChicks];
            summary.push({
              id: `hatch_${newDay}_${batch.batchId}`,
              icon: '🐣',
              title: `${chickCount} ${batch.typeId === 'gallina' ? 'chick' : batch.typeId === 'pato' ? 'duckling' : 'quail chick'}${chickCount > 1 ? 's' : ''} hatched`,
              detail: `from ${batch.eggCount} eggs placed ${newDay - batch.startDay} days ago`,
              severity: 'info' as const,
            });
          }
        }
```

**Important:** `animals` is the mutable `let` variable already in `advanceDay` scope. `randomGenes` is imported at line 4 of the file. The `IncubationBatch` type is the interface added in Task 1 — no additional import needed.

### Step 3: Include `incubationQueue` in the final `set()` call

Find the final `set({` call in `advanceDay`. Search for `silageLevel: newSilageLevel,` (added by Plan 6). Add alongside it:

```typescript
          incubationQueue: newIncubationQueue,
```

### Step 4: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors.

### Step 5: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): hatchery incubation queue hatches chicks in advanceDay"
```

---

## Task 4: `IncubationSection` UI in `gestion.tsx`

**Files:** Modify `app/(tabs)/gestion.tsx`

Read `app/(tabs)/gestion.tsx` first to confirm what is already destructured from `useGameStore` in `HenilAndBuildingsSection`.

### Step 1: Add new destructured values to `HenilAndBuildingsSection`

Find the `useGameStore()` destructure in `HenilAndBuildingsSection`. Add if not present:

```typescript
    incubationQueue, hatcheryCapacity, queueEggsForIncubation,
```

### Step 2: Add the `IncubationSection` component

Find the `// ── Silage Section` comment (before `function SilageSection`). Add a new `IncubationSection` component BEFORE it:

```typescript
// ── Incubation Section ───────────────────────────────────────────────────────
const POULTRY_HATCH_CONFIG = [
  { typeId: 'gallina', label: 'Chicken',    icon: '🐓', days: 21 },
  { typeId: 'pato',    label: 'Duck',       icon: '🦆', days: 28 },
  { typeId: 'codorniz',label: 'Quail',      icon: '🪶', days: 17 },
] as const;

function IncubationSection({
  incubationQueue,
  hatcheryCapacity,
  queueEggsForIncubation,
  eggsInStock,
  currentDay,
}: {
  incubationQueue: IncubationBatch[];
  hatcheryCapacity: number;
  queueEggsForIncubation: (typeId: string, quantity: number) => void;
  eggsInStock: number;
  currentDay: number;
}) {
  if (hatcheryCapacity <= 0) return null;

  const eggsInQueue = incubationQueue.reduce((sum, b) => sum + b.eggCount, 0);
  const space = hatcheryCapacity - eggsInQueue;
  const fillPct = Math.min(1, eggsInQueue / hatcheryCapacity);
  const barColor = fillPct >= 0.9 ? '#e65100' : fillPct >= 0.5 ? '#f57c00' : '#ffa726';

  return (
    <View style={{ backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🥚 Hatchery</Text>

      {/* Capacity bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {eggsInQueue} / {hatcheryCapacity} eggs
        </Text>
      </View>

      {/* Add-eggs rows */}
      {POULTRY_HATCH_CONFIG.map(({ typeId, label, icon, days }) => {
        const canAdd = eggsInStock > 0 && space > 0;
        const toAdd = Math.min(eggsInStock, space);
        return (
          <View key={typeId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#ddd', fontSize: 12 }}>{icon} {label} <Text style={{ color: '#888' }}>({days}d)</Text></Text>
            {canAdd ? (
              <TouchableOpacity
                style={{ backgroundColor: '#37474f', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 }}
                onPress={() => queueEggsForIncubation(typeId, toAdd)}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>+ {toAdd} eggs</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#555', fontSize: 11 }}>
                {eggsInStock <= 0 ? 'No eggs' : 'Hatchery full'}
              </Text>
            )}
          </View>
        );
      })}

      {/* Active batches */}
      {incubationQueue.length > 0 && (
        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Incubating:</Text>
          {incubationQueue.map(batch => {
            const cfg = POULTRY_HATCH_CONFIG.find(c => c.typeId === batch.typeId);
            const daysLeft = batch.readyDay - currentDay;
            return (
              <Text key={batch.batchId} style={{ color: '#ccc', fontSize: 11, marginBottom: 2 }}>
                {cfg?.icon ?? '🥚'} {batch.eggCount} {cfg?.label ?? batch.typeId} eggs — hatches in {daysLeft}d
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}
```

### Step 3: Add `IncubationBatch` import to `gestion.tsx`

Find the import line at the top of `gestion.tsx` that imports from `../../store/useGameStore`. It likely imports `OwnedAttachment` and other types. Add `IncubationBatch` to that import:

```typescript
import { ..., IncubationBatch } from '../../store/useGameStore';
```

### Step 4: Render `IncubationSection` in `HenilAndBuildingsSection`

Find where `<SilageSection ... />` is rendered (added by Plan 6). Add `<IncubationSection ... />` directly BEFORE it:

```typescript
          <IncubationSection
            incubationQueue={incubationQueue ?? []}
            hatcheryCapacity={hatcheryCapacity ?? 0}
            queueEggsForIncubation={queueEggsForIncubation}
            eggsInStock={animalInventory['eggs'] ?? 0}
            currentDay={day}
          />
          <SilageSection
            silageLevel={silageLevel ?? 0}
            silageCapacity={silageCapacity ?? 0}
            fillSilagePit={fillSilagePit}
            grassInStock={Math.floor(inventory['grass'] ?? 0)}
          />
```

Note: `animalInventory` and `day` must be destructured in `HenilAndBuildingsSection`. Check if they are already there; add them if not.

### Step 5: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Fix any type errors. Common issue: `IncubationBatch` may need to be exported from `useGameStore.ts` (it already uses `export interface IncubationBatch` per Task 1).

### Step 6: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add "app/(tabs)/gestion.tsx"
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(ui): IncubationSection — queue eggs to hatchery, show active batches in gestion tab"
```

---

## Task 5: `onRehydrateStorage` + `performPrestige` reset

**Files:** Modify `store/useGameStore.ts`

### Step 1: Extend `onRehydrateStorage`

Find `state.biogasMode = state.biogasMode ?? 'income';` in `onRehydrateStorage` (added by Plan 6). Immediately after it, add:

```typescript
        state.hatcheryCapacity = (b.includes('bld_hatchery_s') ? 50 : 0) +
                                  (b.includes('bld_hatchery_m') ? 150 : 0) +
                                  (b.includes('bld_hatchery_l') ? 400 : 0);
        state.incubationQueue  = state.incubationQueue ?? [];
```

Note: In `onRehydrateStorage`, `b` is the variable holding the buildings array (same `b` used for slurry/silage above). Verify its name from the existing block.

### Step 2: Extend `performPrestige`

Find `biogasMode: 'income',` in the `performPrestige` `set({...})` call (added by Plan 6). After it, add:

```typescript
          hatcheryCapacity: 0,
          incubationQueue: [],
```

### Step 3: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors.

### Step 4: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): rehydrate and prestige-reset Plan 7 hatchery fields"
```

---

## Dependency Order

- Task 1 must complete before all others (defines the types and fields)
- Task 2 depends on Task 1 (references `IncubationBatch`)
- Task 3 depends on Task 1 and Task 2 (uses `IncubationBatch` type + `newIncubationQueue` in set)
- Task 4 depends on Task 1 and Task 2 (uses `IncubationBatch` type + `queueEggsForIncubation`)
- Task 5 depends on Task 1 (`hatcheryCapacity` and `incubationQueue` must exist in GameState)
- Implement: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

## Known Challenges

1. **`randomGenes` in hatch block** — Already imported at line 4 of `useGameStore.ts` (`import { OwnedAnimal, ..., randomGenes, ... } from '../engine/animals'`). Use it directly.
2. **Plural summary message** — `chick${chickCount > 1 ? 's' : ''}` only covers "chick/chicks". The plan uses a ternary with the species name to produce "chick/chicks", "duckling/ducklings", "quail chick/quail chicks".
3. **`IncubationBatch` type in `advanceDay`** — Since the interface is defined in the same file, no additional import is needed. TypeScript will resolve it.
4. **`INCUBATION_DAYS` duplication** — The constant is defined inline in both `queueEggsForIncubation` (Task 2) and the hatch block (Task 3). This is intentional (keeps each block self-contained). YAGNI.
5. **`incubationQueue` in `partialize`** — Only the action `queueEggsForIncubation` is excluded. The queue data itself (`incubationQueue: IncubationBatch[]`) is persisted state and must NOT be in the exclusion list.
6. **UI `day` field** — `day` must be destructured in `HenilAndBuildingsSection` to pass as `currentDay` to `IncubationSection`. It is likely already there; check before adding.
