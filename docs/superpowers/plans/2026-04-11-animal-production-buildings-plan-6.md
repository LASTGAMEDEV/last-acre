# Animal Production Buildings — Plan 6: Silage Pit & Biogas Toggle

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate silage pit buildings (fill with grass → substitute for hay when hay runs out) and add a biogas mode toggle (sell income to grid vs. convert to on-farm fuel), giving players two new resource-management levers.

**Architecture:** Three new GameState fields (`silageLevel`, `silageCapacity`, `biogasMode`) plus two new actions (`fillSilagePit`, `setBiogasMode`). Silage substitution is a two-line insert into the existing hay-shortfall path in `advanceDay`. Biogas toggle replaces the single income branch with an if/else. UI adds a `SilageSection` component and a biogas toggle button to the existing `HenilAndBuildingsSection` in `gestion.tsx`. Pattern is identical to Plans 3–4: inline `state.buildings.includes()` checks, derived `silageCapacity` synced in `buyBuilding`/`onRehydrateStorage`/`performPrestige`.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `npx tsc --noEmit` for verification.

---

## Plans 7+ (not in this plan)

- **Plan 7:** Hatchery auto-spawn (incubation queue, daily hatch in `advanceDay`, egg allocation UI)
- **Plan 8:** Milk quality grading (SCC from hygiene → Grade A/B/C multiplier on milk sales), animal welfare score (hygiene + feed + density + health → Grade A/B product flag)

---

## Architectural Notes

- **`silageCapacity`** is derived from owned silage pit buildings:
  - `bld_silage_pit_s` → 5,000 kg; `bld_silage_pit_m` → 15,000 kg; `bld_silage_pit_l` → 40,000 kg
  - Multiple pits stack. Pattern identical to `slurryCapacity`.
- **`fillSilagePit(kgGrass)`** takes grass from `state.inventory['grass']` (the harvest inventory, not `animalInventory`) and adds it to `silageLevel`. Grass → silage is 1:1 by weight. Capped at `silageCapacity`.
- **Silage substitution in `advanceDay`** happens INSIDE the existing hay shortfall branch (where `hayAvail < hayKg`). Declare `let newSilageLevel = state.silageLevel ?? 0` before the feed block; subtract silage used from it; include it in the final `set()`.
- **`biogasMode: 'income' | 'fuel'`** — default `'income'`. In `'fuel'` mode, biogas replaces income with free fuel: `Math.round(biogasAnimalCount * 0.3)` litres added to `currentFuel` (the existing `let currentFuel` variable in `advanceDay`, which is included in the final `set({ fuel: Math.min(getFuelCapacity(...), currentFuel + ...) })`).
- **No new `partialize` actions** needed — `fillSilagePit` and `setBiogasMode` must be added to the exclusion list to avoid localStorage serialization.

---

## File Map

| File | Change |
|------|--------|
| `store/useGameStore.ts` | Task 1: 3 new fields + 2 new actions + `buyBuilding` sync<br>Task 2: silage substitution in `advanceDay` hay block<br>Task 3: biogas toggle in `advanceDay` biogas block<br>Task 5: `onRehydrateStorage` + `performPrestige` |
| `app/(tabs)/gestion.tsx` | Task 4: `SilageSection` component + biogas toggle button |

---

## Task 1: GameState fields + `fillSilagePit` + `setBiogasMode` actions + `buyBuilding` sync

**Files:** Modify `store/useGameStore.ts`

### Step 1: Add 3 fields to the `GameState` interface

Find the line `slurryCapacity: number;` in the interface (added in Plan 3). Immediately after it, add:

```typescript
  // Silage pit (Plan 6)
  silageLevel: number;      // current kg of silage stored
  silageCapacity: number;   // derived: sum of silage pit capacities

  // Biogas mode (Plan 6)
  biogasMode: 'income' | 'fuel'; // 'income' = sell to grid; 'fuel' = use on-farm
```

### Step 2: Add 2 action signatures to the `GameState` interface

Find `spreadSlurry: () => void;` in the interface (line ~720). After it, add:

```typescript
  fillSilagePit: (kgGrass: number) => void;
  setBiogasMode: (mode: 'income' | 'fuel') => void;
```

### Step 3: Initialize in `makeInitialState`

Find `slurryLevel: 0,` and `slurryCapacity: 0,` in `makeInitialState` (line ~933). After them, add:

```typescript
    silageLevel: 0,
    silageCapacity: 0,
    biogasMode: 'income' as const,
```

### Step 4: Update `buyBuilding` to sync `silageCapacity`

Find the `buyBuilding` action. After the existing `slurryCapacity` reduce block (which ends with `}, 0);`), add:

```typescript
        const silageCapacity = newBuildings.reduce((cap: number, bid: string) => {
          if (bid === 'bld_silage_pit_s') return cap + 5000;
          if (bid === 'bld_silage_pit_m') return cap + 15000;
          if (bid === 'bld_silage_pit_l') return cap + 40000;
          return cap;
        }, 0);
```

Then add `silageCapacity,` to the `set({...})` call in `buyBuilding` (alongside `sickBayCapacity,` and `slurryCapacity,`).

### Step 5: Implement `fillSilagePit` action

Find `spreadSlurry: () => {` in the action implementations. After the closing `},` of `spreadSlurry`, add:

```typescript
      fillSilagePit: (kgGrass) => {
        const state = get();
        if ((state.silageCapacity ?? 0) <= 0) return;
        const grassAvail = state.inventory['grass'] ?? 0;
        const space = (state.silageCapacity ?? 0) - (state.silageLevel ?? 0);
        const toFill = Math.min(kgGrass, grassAvail, space);
        if (toFill <= 0) return;
        set({
          inventory: { ...state.inventory, grass: Math.max(0, grassAvail - toFill) },
          silageLevel: (state.silageLevel ?? 0) + toFill,
        });
      },
```

### Step 6: Implement `setBiogasMode` action

After `fillSilagePit`, add:

```typescript
      setBiogasMode: (mode) => {
        set({ biogasMode: mode });
      },
```

### Step 7: Add both new actions to the `partialize` exclusion list

Find the partialize destructure block (around line 5570):
```typescript
designateAsSire, removeFromSirePen, spreadSlurry,
```

Change it to:
```typescript
designateAsSire, removeFromSirePen, spreadSlurry, fillSilagePit, setBiogasMode,
```

### Step 8: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors.

### Step 9: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): silageLevel/silageCapacity/biogasMode state, fillSilagePit, setBiogasMode actions"
```

---

## Task 2: `advanceDay` silage hay substitution

**Files:** Modify `store/useGameStore.ts`

Read the hay deduction block in `advanceDay` (search `pestHayLoss` or `hayAvail`). The block is around line 3069 and looks like:

```typescript
if (hayKg > 0) {
  const hayAvail = Math.max(0, (animalInventory['hay'] ?? 0) - pestHayLoss);
  if (hayAvail >= hayKg) {
    animalInventory = { ...animalInventory, hay: Math.round((hayAvail - hayKg) * 10) / 10 };
    newHayMissed = Math.max(0, newHayMissed - 1);
  } else {
    animalInventory = { ...animalInventory, hay: 0 };
    newHayMissed = Math.min(7, newHayMissed + 1);
    summary.push({ id: 'feed_hay_empty', ... });
  }
} else {
  newHayMissed = Math.max(0, newHayMissed - 1);
}
```

### Step 1: Declare `newSilageLevel` before the feed deduction block

Find `let newHayMissed = state.hayMissedDays ?? 0;` (around line 2682). On the line directly after it, add:

```typescript
        let newSilageLevel = state.silageLevel ?? 0;
```

### Step 2: Replace the hay-shortfall else-branch with silage substitution

Find the `else {` branch of `if (hayAvail >= hayKg)`. Replace the entire else branch:

**Before (current code):**
```typescript
  } else {
    animalInventory = { ...animalInventory, hay: 0 };
    newHayMissed = Math.min(7, newHayMissed + 1);
    summary.push({
      id: 'feed_hay_empty',
      icon: '🌾',
      title: 'Hay stock depleted',
      detail: 'Hay-eating animals are underfed — grow grass and process it in the Henil',
      severity: 'warning',
    });
  }
```

**After (with silage fallback):**
```typescript
  } else {
    // Try silage as a fallback for the shortfall
    const hayShortfall = hayKg - hayAvail;
    const silageForFeed = Math.min(newSilageLevel, hayShortfall);
    const totalFed = hayAvail + silageForFeed;
    animalInventory = { ...animalInventory, hay: 0 };
    newSilageLevel = Math.max(0, newSilageLevel - silageForFeed);
    if (totalFed >= hayKg) {
      // Silage fully covered the shortfall
      newHayMissed = Math.max(0, newHayMissed - 1);
      summary.push({
        id: 'feed_silage_used',
        icon: '🌿',
        title: 'Silage used as hay substitute',
        detail: `${Math.round(silageForFeed)} kg silage fed to ruminants`,
        severity: 'info' as const,
      });
    } else {
      // Even silage couldn't cover it
      newHayMissed = Math.min(7, newHayMissed + 1);
      summary.push({
        id: 'feed_hay_empty',
        icon: '🌾',
        title: 'Hay and silage stock depleted',
        detail: 'Ruminants are underfed — grow grass and fill the Henil or Silage Pit',
        severity: 'warning' as const,
      });
    }
  }
```

### Step 3: Include `newSilageLevel` in the final `set()` call

Find the final `set({` call at the end of `advanceDay` (search for `slurryLevel: newSlurryLevel` — it's already there from Plan 3). Add alongside it:

```typescript
          silageLevel: newSilageLevel,
```

### Step 4: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

### Step 5: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): silage pit substitutes for hay when hay stock is empty in advanceDay"
```

---

## Task 3: `advanceDay` biogas mode toggle

**Files:** Modify `store/useGameStore.ts`

Find the biogas income block (search `hasBiogasUpgrader`). It currently reads:

```typescript
const hasBiogasUpgrader = (state.buildings ?? []).includes('bld_biogas_upgrader');
let biogasIncome = 0;
if (hasBiogasUpgrader) {
  const biogasAnimalCount = animals.filter((a: OwnedAnimal) =>
    ['vaca', 'bufalo', 'cabra', 'cerdo', 'oveja'].includes(a.typeId)
  ).length;
  biogasIncome = Math.round(biogasAnimalCount * 0.8);
  if (biogasIncome > 0) {
    summary.push({
      id: `biogas_income_${newDay}`,
      icon: '⚡',
      title: `Biogas income +$${biogasIncome}`,
      detail: `${biogasAnimalCount} animals producing biogas`,
      severity: 'info',
    });
  }
}
```

Note: `biogasIncome` is added to `money` in the final `set()` call. `currentFuel` is a `let` variable in scope (declared at line ~2687) that feeds into the final `fuel: Math.min(getFuelCapacity(state.buildings), currentFuel + fuelFromReturnLoads)` call.

### Step 1: Replace the biogas block with a mode-aware version

Replace the entire block above with:

```typescript
const hasBiogasUpgrader = (state.buildings ?? []).includes('bld_biogas_upgrader');
let biogasIncome = 0;
if (hasBiogasUpgrader) {
  const biogasAnimalCount = animals.filter((a: OwnedAnimal) =>
    ['vaca', 'bufalo', 'cabra', 'cerdo', 'oveja'].includes(a.typeId)
  ).length;
  if (biogasAnimalCount > 0) {
    if ((state.biogasMode ?? 'income') === 'fuel') {
      // Fuel mode: convert biogas to on-farm fuel instead of money
      const biogasFuelLitres = Math.round(biogasAnimalCount * 0.3);
      currentFuel += biogasFuelLitres;
      summary.push({
        id: `biogas_fuel_${newDay}`,
        icon: '⛽',
        title: `Biogas fuel +${biogasFuelLitres} L`,
        detail: `${biogasAnimalCount} animals producing biogas → free fuel`,
        severity: 'info' as const,
      });
    } else {
      // Income mode: sell biogas to grid
      biogasIncome = Math.round(biogasAnimalCount * 0.8);
      if (biogasIncome > 0) {
        summary.push({
          id: `biogas_income_${newDay}`,
          icon: '⚡',
          title: `Biogas income +$${biogasIncome}`,
          detail: `${biogasAnimalCount} animals producing biogas`,
          severity: 'info' as const,
        });
      }
    }
  }
}
```

**Important:** `currentFuel += biogasFuelLitres` modifies the existing `let currentFuel` variable in advanceDay scope. The existing final set() call already uses this variable: `fuel: Math.min(getFuelCapacity(state.buildings), currentFuel + fuelFromReturnLoads)`. No change to the set() call needed.

### Step 2: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

### Step 3: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): biogas mode toggle — income vs on-farm fuel in advanceDay"
```

---

## Task 4: UI — `SilageSection` + biogas toggle in `gestion.tsx`

**Files:** Modify `app/(tabs)/gestion.tsx`

Read `gestion.tsx` to find: `HenilAndBuildingsSection`, the existing `SlurrySection` usage, and what is already destructured from `useGameStore`.

### Step 1: Add new destructured values to `HenilAndBuildingsSection`

Find the `useGameStore()` destructure in `HenilAndBuildingsSection`. Add the new fields:

```typescript
    slurryLevel, slurryCapacity, spreadSlurry, attachments,
    silageLevel, silageCapacity, fillSilagePit,
    biogasMode, setBiogasMode, buildings,
```

Note: `buildings` may already be destructured here (it was added for `hasHenil`). Only add fields that aren't already present.

### Step 2: Add `SilageSection` component before `HenilSection`

Find the `// ── Slurry Section` comment (before `function SlurrySection`). Add a `SilageSection` component directly before it:

```typescript
// ── Silage Section ────────────────────────────────────────────────────────────
function SilageSection({
  silageLevel,
  silageCapacity,
  fillSilagePit,
  grassInStock,
}: {
  silageLevel: number;
  silageCapacity: number;
  fillSilagePit: (kg: number) => void;
  grassInStock: number;
}) {
  if (silageCapacity <= 0) return null;
  const fillPct = Math.min(1, silageLevel / silageCapacity);
  const barColor = fillPct >= 0.9 ? '#4caf50' : fillPct >= 0.5 ? '#8bc34a' : '#ff9800';
  const space = silageCapacity - silageLevel;
  const canFill = grassInStock > 0 && space > 0;
  return (
    <View style={{ backgroundColor: '#1a2e1a', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>🌿 Silage Pit</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {silageLevel.toLocaleString()} / {silageCapacity.toLocaleString()} kg
        </Text>
      </View>
      {canFill && (
        <TouchableOpacity
          style={{ backgroundColor: '#388e3c', borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' }}
          onPress={() => fillSilagePit(Math.floor(Math.min(grassInStock, space)))}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>
            Fill with Grass ({Math.floor(Math.min(grassInStock, space))} kg available)
          </Text>
        </TouchableOpacity>
      )}
      {!canFill && space > 0 && (
        <Text style={{ color: '#888', fontSize: 11, marginTop: 6 }}>No grass in stock to fill pit</Text>
      )}
      {space <= 0 && (
        <Text style={{ color: '#4caf50', fontSize: 11, marginTop: 6 }}>Pit full — spread or wait for winter feed draw</Text>
      )}
    </View>
  );
}
```

### Step 3: Add biogas toggle component before `HenilSection`

After `SilageSection`, add:

```typescript
// ── Biogas Toggle ─────────────────────────────────────────────────────────────
function BiogasToggle({
  biogasMode,
  setBiogasMode,
}: {
  biogasMode: 'income' | 'fuel';
  setBiogasMode: (mode: 'income' | 'fuel') => void;
}) {
  return (
    <View style={{ backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>⚡ Biogas Upgrader</Text>
        <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
          {biogasMode === 'income' ? 'Selling to grid · $0.80/animal/day' : 'On-farm fuel · 0.3 L/animal/day'}
        </Text>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: biogasMode === 'income' ? '#1565c0' : '#2e7d32', borderRadius: 6, padding: 8, minWidth: 70, alignItems: 'center' }}
        onPress={() => setBiogasMode(biogasMode === 'income' ? 'fuel' : 'income')}
      >
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
          {biogasMode === 'income' ? '💰 Income' : '⛽ Fuel'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Step 4: Render both new components in `HenilAndBuildingsSection`

In `HenilAndBuildingsSection`, find where `<SlurrySection ... />` is rendered. Add the two new sections alongside it. The order should be: `SilageSection`, then `SlurrySection`, then `BiogasToggle` (before `ProductionBuildingsSection`):

```typescript
          <SilageSection
            silageLevel={silageLevel ?? 0}
            silageCapacity={silageCapacity ?? 0}
            fillSilagePit={fillSilagePit}
            grassInStock={Math.floor(inventory['grass'] ?? 0)}
          />
          <SlurrySection
            slurryLevel={slurryLevel ?? 0}
            slurryCapacity={slurryCapacity ?? 0}
            spreadSlurry={spreadSlurry}
            hasSlurryTanker={(attachments ?? []).some((a: OwnedAttachment) =>
              a.typeId === 'att_slurry_tanker_s' || a.typeId === 'att_slurry_tanker_l'
            )}
          />
          {(buildings ?? []).includes('bld_biogas_upgrader') && (
            <BiogasToggle
              biogasMode={biogasMode ?? 'income'}
              setBiogasMode={setBiogasMode}
            />
          )}
```

Note: `inventory` is already destructured in `HenilAndBuildingsSection` (it's used for grass stock display). Verify it's there; add it if not.

### Step 5: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Fix any type errors. Common issue: `OwnedAttachment` import may need adding if not already imported.

### Step 6: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add "app/(tabs)/gestion.tsx"
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(ui): SilageSection fill bar, BiogasToggle income/fuel switch in gestion tab"
```

---

## Task 5: `onRehydrateStorage` + `performPrestige` reset

**Files:** Modify `store/useGameStore.ts`

### Step 1: Extend `onRehydrateStorage`

Find `onRehydrateStorage` (around line 5551). After the existing `state.slurryLevel = state.slurryLevel ?? 0;` line, add:

```typescript
        state.silageCapacity = (b.includes('bld_silage_pit_s') ? 5000 : 0) +
                                (b.includes('bld_silage_pit_m') ? 15000 : 0) +
                                (b.includes('bld_silage_pit_l') ? 40000 : 0);
        state.silageLevel    = state.silageLevel ?? 0;
        state.biogasMode     = state.biogasMode ?? 'income';
```

### Step 2: Extend `performPrestige` reset

Find `performPrestige` (around line 5184). In the `set({...})` call, find `slurryLevel: 0, slurryCapacity: 0,` (added in Plan 3). After it, add:

```typescript
          silageLevel: 0,
          silageCapacity: 0,
          biogasMode: 'income',
```

### Step 3: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

### Step 4: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): rehydrate and prestige-reset Plan 6 silage and biogas fields"
```

---

## Dependency Order

- Task 1 must complete before Tasks 2, 3, 4 (they reference the new fields and actions)
- Tasks 2 and 3 are independent of each other (different blocks in `advanceDay`)
- Task 4 depends on Task 1 (needs `fillSilagePit`, `setBiogasMode` actions in store)
- Task 5 depends on Task 1 (needs the fields to exist)
- Implement: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

## Known Challenges

1. **`newSilageLevel` in final `set()`** — The final `set()` in `advanceDay` is large (lines ~3440–3500). Search for `slurryLevel: newSlurryLevel` to find the right place to add `silageLevel: newSilageLevel,`. They should be adjacent.
2. **`currentFuel` already declared as `let`** — The `currentFuel += biogasFuelLitres` line in Task 3 modifies this variable in place. The existing `fuel: Math.min(getFuelCapacity(state.buildings), currentFuel + fuelFromReturnLoads)` in the final set() will automatically include the biogas-added fuel. No double-counting: the fuel cap via `getFuelCapacity` prevents overflow.
3. **`inventory` in `HenilAndBuildingsSection`** — Task 4 uses `inventory['grass']` for the fill button. The existing `grassInStock` variable in the component already reads `inventory['grass']`. Reuse it instead of re-reading inventory if it's already computed.
4. **`biogasMode` type union** — TypeScript may require `as const` on the initial value `'income' as const` in `makeInitialState`. Use that pattern if TypeScript infers `string` instead of the union.
5. **`partialize` line** — The exclusion list in the `partialize` callback is a single destructure line that grows with each plan. Add `fillSilagePit` and `setBiogasMode` exactly where `spreadSlurry` is (same line or next), following the alphabetical-ish grouping pattern.
