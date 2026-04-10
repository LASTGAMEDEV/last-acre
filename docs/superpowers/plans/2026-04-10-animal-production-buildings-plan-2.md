# Animal Production Buildings — Plan 2: Breeding & Veterinary Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add quarantine pen, calving/farrowing pen, sire pen, pregnancy scanner, vet room, medicine cabinet, sick bay, cattle crush, weigh crate, and CCTV monitor — with full `advanceDay` integration and UI indicators.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `npx tsc --noEmit` for verification.

---

## Plans 3–4 (not in this plan)

- **Plan 3:** Feed, waste, slurry tanker, species-specific buildings (silage pit, feed mill, slurry tank + tanker, hatchery, brooder, poultry lighting, sheep dip, wool store, weaner accommodation, finishing unit, milk cooling tank, pasteurisation, cream separator, apiary shelter, queen rearing)
- **Plan 4:** Processing extensions (smokehouse, curing cellar, cold store, wool scouring) + monitoring (farm lab, carbon tracker)

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `data/buildingTypes.ts` | Append 12 new building entries + 1 equipment item |
| Modify | `engine/animals.ts` | Add 3 optional fields to `OwnedAnimal`; add `OPTIMAL_SLAUGHTER_WEIGHTS`; add `isAtOptimalWeight()` |
| Modify | `store/useGameStore.ts` | 5 new GameState fields; 2 new actions; `buyBuilding` derived-flag sync; 5 `advanceDay` blocks; `sellAnimal` bonus; `purchaseProductionBuilding` routing; rehydration + prestige reset |
| Modify | `app/(tabs)/animales.tsx` | QuarantineBadge, IsolationBadge, OptimalWeightBadge; sire designation button; quarantine count header |
| Modify | `engine/productionBuildings.ts` | `isManned` accepts optional `hasCCTV` parameter |
| Modify | `app/(tabs)/tienda.tsx` | Route non-animal-type production buildings through `buyBuilding` |

---

## Task 1: Extend `data/buildingTypes.ts`

**Files:**
- Modify: `data/buildingTypes.ts`

- [ ] **Step 1: Append 12 new building entries to `BUILDING_TYPES`**

Append after the last production building (`bld_honey_extraction_suite_l`):

```typescript
  // ── Breeding Infrastructure ────────────────────────────────────────────────
  { id: 'bld_quarantine_pen',       name: 'Quarantine Pen',                      category: 'production', cost: 8000,  maintenancePerDay: 4,  capacity: 10,  effectLabel: 'New arrivals isolated 14 days · disease intro risk 2% (vs 15%)' },
  { id: 'bld_calving_pen_s',        name: 'Small Calving / Farrowing Pen',       category: 'production', cost: 12000, maintenancePerDay: 5,  capacity: 2,   buildingTier: 'small',  effectLabel: '2 simultaneous births · newborn mortality 5% (vs 25%)' },
  { id: 'bld_calving_pen_m',        name: 'Medium Calving / Farrowing Pen',      category: 'production', cost: 28000, maintenancePerDay: 10, capacity: 5,   buildingTier: 'medium', effectLabel: '5 simultaneous births · newborn mortality 5% (vs 25%)' },
  { id: 'bld_calving_pen_l',        name: 'Large Calving / Farrowing Pen',       category: 'production', cost: 60000, maintenancePerDay: 18, capacity: 10,  buildingTier: 'large',  effectLabel: '10 simultaneous births · newborn mortality 5% (vs 25%)' },
  { id: 'bld_sire_pen',             name: 'Sire Pen',                            category: 'production', cost: 15000, maintenancePerDay: 6,  capacity: 4,   effectLabel: 'Enables free on-farm breeding using designated sires' },
  // ── Veterinary & Health Infrastructure ────────────────────────────────────
  { id: 'bld_vet_room',             name: 'Vet Room',                            category: 'production', cost: 22000, maintenancePerDay: 8,  effectLabel: 'Eliminates callout fee for routine vet events · vet worker handles auto-treatments' },
  { id: 'bld_medicine_cabinet',     name: 'Medicine Cabinet',                    category: 'production', cost: 9000,  maintenancePerDay: 2,  effectLabel: 'Medicines maintain shelf life · enables bulk purchase discounts' },
  { id: 'bld_isolation_sick_bay_s', name: 'Small Sick Bay',                      category: 'production', cost: 14000, maintenancePerDay: 5,  capacity: 5,   buildingTier: 'small',  effectLabel: '5 animals isolated · disease spread near zero when vet assigned' },
  { id: 'bld_isolation_sick_bay_m', name: 'Medium Sick Bay',                     category: 'production', cost: 30000, maintenancePerDay: 10, capacity: 15,  buildingTier: 'medium', effectLabel: '15 animals isolated · disease spread near zero when vet assigned' },
  { id: 'bld_cattle_crush',         name: 'Cattle Crush',                        category: 'production', cost: 10000, maintenancePerDay: 3,  effectLabel: 'Cattle treatments same day at standard cost · required for Weigh Crate' },
  { id: 'bld_weigh_crate',          name: 'Weigh Crate',                         category: 'production', cost: 8000,  maintenancePerDay: 2,  effectLabel: 'Flags optimal slaughter weight · +5% sale bonus · requires Cattle Crush' },
  { id: 'bld_cctv_monitor',         name: 'CCTV Monitor',                        category: 'production', cost: 12000, maintenancePerDay: 3,  effectLabel: 'Overnight surveillance · −1 worker requirement across all animal buildings' },
```

- [ ] **Step 2: Append `eq_pregnancy_scanner` to `PRODUCTION_EQUIPMENT`**

```typescript
  {
    id: 'eq_pregnancy_scanner',
    name: 'Pregnancy Scanner',
    cost: 9500,
    applicableBuildingPrefixes: ['bld_calving_pen'],
    effectLabel: 'Due dates appear in calendar · pen capacity warning 3 days before birth',
    slot: 1,
  },
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add data/buildingTypes.ts
git commit -m "feat(data): add breeding + veterinary building types and pregnancy scanner equipment"
```

---

## Task 2: Extend `engine/animals.ts`

**Files:**
- Modify: `engine/animals.ts`

Read `engine/animals.ts` first to understand the existing `OwnedAnimal` interface and animal type definitions.

- [ ] **Step 1: Add three optional fields to `OwnedAnimal`**

Find the `OwnedAnimal` interface and add after the existing optional fields:

```typescript
  quarantineUntilDay?: number;    // day quarantine ends; undefined = not in quarantine
  inIsolation?: boolean;          // true = moved to sick bay; excluded from disease spread
  optimalWeightReached?: boolean; // true = within 5% of optimal slaughter weight
```

- [ ] **Step 2: Add `OPTIMAL_SLAUGHTER_WEIGHTS` constant**

Find where existing animal constants are defined (e.g. `LACTATION_PARAMS`) and add after them:

```typescript
/**
 * Optimal slaughter weight expressed as a multiplier of the animal's maturityDays.
 * An animal is "at optimal weight" when its age is within 5% of targetAge.
 */
export const OPTIMAL_SLAUGHTER_WEIGHTS: Partial<Record<string, { targetAgeMultiplier: number }>> = {
  vaca:   { targetAgeMultiplier: 1.6 },
  cerdo:  { targetAgeMultiplier: 1.1 },
  oveja:  { targetAgeMultiplier: 1.2 },
  cabra:  { targetAgeMultiplier: 1.3 },
  bufalo: { targetAgeMultiplier: 1.8 },
};
```

- [ ] **Step 3: Add `isAtOptimalWeight` pure function**

```typescript
/**
 * Returns true if the animal is within 5% of its optimal slaughter age.
 * Only meaningful for beef/pork/lamb/goat/buffalo species.
 */
export function isAtOptimalWeight(
  animal: OwnedAnimal,
  animalType: { id: string; maturityDays: number },
  currentDay: number,
): boolean {
  const spec = OPTIMAL_SLAUGHTER_WEIGHTS[animalType.id];
  if (!spec) return false;
  const targetAge = animalType.maturityDays * spec.targetAgeMultiplier;
  const age = currentDay - animal.bornDay;
  return Math.abs(age - targetAge) / targetAge <= 0.05;
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add engine/animals.ts
git commit -m "feat(engine): extend OwnedAnimal with quarantine/isolation/optimalWeight; add isAtOptimalWeight"
```

---

## Task 3: New `GameState` fields + actions in `useGameStore.ts`

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add 5 new fields to `GameState` interface**

After `lastSyntheticInputDay`, add:

```typescript
  // Breeding & Veterinary infrastructure (Plan 2)
  sirePenAnimalIds: string[];         // animals designated as sires
  vetRoomOwned: boolean;              // derived from buildings.includes('bld_vet_room')
  medicineCabinetOwned: boolean;      // derived from buildings.includes('bld_medicine_cabinet')
  hasCCTV: boolean;                   // derived from buildings.includes('bld_cctv_monitor')
  sickBayCapacity: number;            // sum of capacity from owned sick bay buildings
```

- [ ] **Step 2: Add action signatures to `GameState`**

```typescript
  designateAsSire: (animalId: string) => void;
  removeFromSirePen: (animalId: string) => void;
```

- [ ] **Step 3: Initialize in `makeInitialState`**

```typescript
  sirePenAnimalIds: [],
  vetRoomOwned: false,
  medicineCabinetOwned: false,
  hasCCTV: false,
  sickBayCapacity: 0,
```

- [ ] **Step 4: Add action implementations**

Find the `buyBuilding` action. After the existing `set({ buildings: [...state.buildings, buildingId] })` call (or wherever buildings are updated), replace that `set()` to also sync derived flags:

```typescript
      buyBuilding: (buildingId) => {
        const state = get();
        const bt = BUILDING_TYPES.find(b => b.id === buildingId);
        if (!bt) return;
        if (state.money < bt.cost) return;
        if (state.buildings.includes(buildingId)) return;
        const newBuildings = [...state.buildings, buildingId];
        const sickBayCapacity = newBuildings.reduce((cap, bid) => {
          if (bid === 'bld_isolation_sick_bay_s') return cap + 5;
          if (bid === 'bld_isolation_sick_bay_m') return cap + 15;
          return cap;
        }, 0);
        set({
          money: state.money - bt.cost,
          buildings: newBuildings,
          vetRoomOwned:          newBuildings.includes('bld_vet_room'),
          medicineCabinetOwned:  newBuildings.includes('bld_medicine_cabinet'),
          hasCCTV:               newBuildings.includes('bld_cctv_monitor'),
          sickBayCapacity,
        });
      },
```

> **IMPORTANT:** Read the existing `buyBuilding` action first — it may have additional logic (maintenance cost, capacity checks, etc.). Preserve all existing logic; only add the derived-flag updates and use the pattern above as a template.

Add `designateAsSire` and `removeFromSirePen` implementations after `buyBuilding`:

```typescript
      designateAsSire: (animalId) => {
        const state = get();
        const animal = (state.animals ?? []).find((a: OwnedAnimal) => a.id === animalId);
        if (!animal || animal.sex !== 'male') return;
        if (!state.buildings.includes('bld_sire_pen')) return;
        const maxSires = BUILDING_TYPES.find(b => b.id === 'bld_sire_pen')?.capacity ?? 4;
        if ((state.sirePenAnimalIds ?? []).length >= maxSires) return;
        if ((state.sirePenAnimalIds ?? []).includes(animalId)) return;
        set({ sirePenAnimalIds: [...(state.sirePenAnimalIds ?? []), animalId] });
      },

      removeFromSirePen: (animalId) => {
        const state = get();
        set({ sirePenAnimalIds: (state.sirePenAnimalIds ?? []).filter(id => id !== animalId) });
      },
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): sire pen / vet room / sick bay / CCTV state fields and actions"
```

---

## Task 4: `advanceDay` — quarantine graduation + sick bay isolation

**Files:**
- Modify: `store/useGameStore.ts`

Find `advanceDay`. The two blocks below must be inserted **before** the existing sickness roll (search for `// Veterinary events` or `sick: true` in the animal map).

- [ ] **Step 1: Add quarantine graduation block**

```typescript
        // ── Quarantine graduation ─────────────────────────────────────────────
        animals = animals.map((a: OwnedAnimal) => {
          if (!a.quarantineUntilDay) return a;
          if (newDay < a.quarantineUntilDay) return a;
          // Period over — 2% residual disease risk even with pen
          const escaped = Math.random() < 0.02;
          return {
            ...a,
            quarantineUntilDay: undefined,
            ...(escaped ? { sick: true, sicknessDay: newDay } : {}),
          };
        });
```

- [ ] **Step 2: Add sick bay auto-isolation block**

```typescript
        // ── Sick bay auto-isolation ───────────────────────────────────────────
        const hasVetWorker = (state.workers ?? []).some((w: OwnedWorker) => w.typeId === 'vet' || (w.typeId as string) === 'vet');
        const sickBayCap = state.sickBayCapacity ?? 0;
        if (sickBayCap > 0 && hasVetWorker) {
          let isolatedCount = animals.filter((a: OwnedAnimal) => a.inIsolation).length;
          animals = animals.map((a: OwnedAnimal) => {
            if (!a.sick) return { ...a, inIsolation: false };
            if (a.inIsolation) return a;
            if (isolatedCount >= sickBayCap) return a;
            isolatedCount++;
            return { ...a, inIsolation: true };
          });
        }
```

- [ ] **Step 3: Modify the existing sickness roll to skip isolated animals**

Find the existing `.map` that applies `sick: true` to healthy animals. Add an early return for isolated animals:

```typescript
          if (a.inIsolation) return a; // isolated — cannot contract illness from spread
```

Add this line at the top of the `.map` callback, before the sickness-chance calculation.

- [ ] **Step 4: Modify the existing death filter to treat isolated animals**

Find where animals are filtered out after `sicknessDay + 14`. Add treatment logic for isolated animals:

```typescript
        // Auto-treat animals in sick bay (vet handles them)
        if (sickBayCap > 0 && hasVetWorker) {
          animals = animals.map((a: OwnedAnimal) => {
            if (a.sick && a.inIsolation) {
              return { ...a, sick: false, sicknessDay: undefined, inIsolation: false };
            }
            return a;
          });
        }
```

And protect isolated animals from the death filter by checking `a.inIsolation`:

```typescript
        animals = animals.filter((a: OwnedAnimal) => {
          if (a.sick && a.sicknessDay !== undefined && newDay - a.sicknessDay >= 14) {
            if (a.inIsolation && sickBayCap > 0 && hasVetWorker) return true; // treated, kept
            diedIds.push(a.id);
            return false;
          }
          return true;
        });
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): advanceDay quarantine graduation and sick-bay isolation pass"
```

---

## Task 5: `advanceDay` — quarantine on arrival, calving pen, sire genetics, CCTV, weigh crate, vet room

**Files:**
- Modify: `store/useGameStore.ts`
- Modify: `engine/productionBuildings.ts`

### 5a — `buyAnimal`: quarantine on arrival

Find the `buyAnimal` action. In the `newAnimal` object construction, add quarantine fields:

```typescript
        const hasQuarantinePen = state.buildings.includes('bld_quarantine_pen');
        const arrivedSick = !hasQuarantinePen && Math.random() < 0.15;
        const newAnimal: OwnedAnimal = {
          // ... existing fields ...
          sick: arrivedSick,
          sicknessDay: arrivedSick ? state.day : undefined,
          quarantineUntilDay: hasQuarantinePen ? state.day + 14 : undefined,
        };
```

Apply the same pattern to the auction resolution block in `advanceDay` (search for `auctionAnimalAdditions.push` or similar):

```typescript
        const hasQuarantinePen = (state.buildings ?? []).includes('bld_quarantine_pen');
        const arrivedSick = !hasQuarantinePen && Math.random() < 0.15;
        // When constructing newAnimal for auction arrivals:
        // sick: arrivedSick,
        // sicknessDay: arrivedSick ? newDay : undefined,
        // quarantineUntilDay: hasQuarantinePen ? newDay + 14 : undefined,
```

### 5b — `breedAnimal`: calving pen mortality + sire genetics

Find the `breedAnimal` action. After the offspring is constructed but before it's added to `state.animals`:

```typescript
        // Calving pen mortality reduction
        const CALVING_SPECIES = new Set(['vaca', 'cabra', 'bufalo', 'cerdo']);
        if (CALVING_SPECIES.has(offspring.typeId)) {
          const calvingCap = ['bld_calving_pen_s', 'bld_calving_pen_m', 'bld_calving_pen_l']
            .reduce((cap, bid) => {
              const bt = BUILDING_TYPES.find(b => b.id === bid);
              return state.buildings.includes(bid) ? cap + (bt?.capacity ?? 0) : cap;
            }, 0);
          const mortalityChance = calvingCap > 0 ? 0.05 : 0.25;
          if (Math.random() < mortalityChance) {
            // Offspring did not survive — skip adding to animals array
            set({ breedingPairs: nextPairs });
            return;
          }
        }
```

For sire genetics — find where `breedGenes(motherGenes, fatherGenes)` is called. Modify the father gene selection to prefer a sire pen animal:

```typescript
        // Prefer sire pen animal if available
        const hasSirePen = state.buildings.includes('bld_sire_pen');
        const sirePenIds = state.sirePenAnimalIds ?? [];
        const sirePenMale = (state.animals ?? []).find(
          (a: OwnedAnimal) => sirePenIds.includes(a.id) && a.typeId === offspring.typeId
        );
        const fatherGenes = hasSirePen && sirePenMale
          ? sirePenMale.genes
          : existingFatherGenes; // use whatever father genes were already resolved
        // Then call: breedGenes(motherGenes, fatherGenes)
```

> **Note:** Read the existing `breedAnimal` action to understand how fatherGenes are currently resolved. Only change the source of `fatherGenes` — don't change the `breedGenes` call itself.

### 5c — CCTV worker reduction in `engine/productionBuildings.ts`

Modify `isManned` to accept an optional `hasCCTV` parameter:

```typescript
export function isManned(
  building: ProductionBuildingState,
  tier: 'small' | 'medium' | 'large',
  hasCCTV = false,
): boolean {
  const required = Math.max(1, (tier === 'large' ? 2 : 1) - (hasCCTV ? 1 : 0));
  return building.assignedWorkerIds.length >= required;
}
```

In `advanceDay` production buildings loop, pass `state.hasCCTV`:

```typescript
          const manned = isManned(pb, bt.buildingTier ?? 'small', state.hasCCTV ?? false);
```

### 5d — Weigh Crate: flag optimal-weight animals in `advanceDay`

After the production buildings processing block (just before milestone checks), add:

```typescript
        // ── Weigh Crate: flag optimal slaughter weight ─────────────────────
        const hasWeighCrate = state.buildings.includes('bld_weigh_crate') &&
          state.buildings.includes('bld_cattle_crush');
        if (hasWeighCrate) {
          animals = animals.map((a: OwnedAnimal) => {
            const animalType = ANIMAL_TYPES.find((t: any) => t.id === a.typeId);
            if (!animalType) return a;
            const atOptimal = isAtOptimalWeight(a, animalType, newDay);
            if (atOptimal === (a.optimalWeightReached ?? false)) return a;
            return { ...a, optimalWeightReached: atOptimal };
          });
        }
```

Add import at top of file:

```typescript
import { isAtOptimalWeight } from '../engine/animals';
```

### 5e — Vet Room: zero-cost routine treatment

In the existing vet treatment block in `advanceDay` (where sick animals are treated), add a conditional to skip the callout fee when `state.vetRoomOwned`:

```typescript
          // Vet room eliminates routine callout cost
          const treatCost = state.vetRoomOwned ? 0 : existingTreatCostCalculation;
          vetTreatmentCost += treatCost;
```

> **Note:** Read the existing vet treatment block to understand how `vetTreatmentCost` is calculated. Only wrap the per-treatment cost with the `vetRoomOwned` check.

### 5f — Pregnancy Scanner: due-date warning in `advanceDay`

After the quarantine graduation block (Task 4, Block A), add:

```typescript
        // ── Pregnancy scanner: due-date warnings ─────────────────────────
        const hasPregScanner = (state.productionBuildings ?? []).some(pb =>
          pb.buildingTypeId.startsWith('bld_calving_pen') &&
          pb.equipmentSlots.includes('eq_pregnancy_scanner')
        );
        if (hasPregScanner) {
          const imminentBirths = animals.filter((a: OwnedAnimal) => {
            if (a.sex !== 'female') return false;
            const animalType = ANIMAL_TYPES.find(t => t.id === a.typeId);
            if (!animalType) return false;
            const gestDays = (animalType as any).gestationDays ?? ((animalType as any).breedingDays ?? 0) * 2;
            if (gestDays === 0) return false;
            const dueDay = a.lastBreedDay + gestDays;
            return dueDay >= newDay && dueDay <= newDay + 3;
          });
          if (imminentBirths.length > 0) {
            summary.push({
              id: `preg_scanner_warning_${newDay}`,
              icon: '🤰',
              title: `${imminentBirths.length} animal${imminentBirths.length > 1 ? 's' : ''} due to give birth within 3 days`,
              detail: 'Check calving pen capacity in Management',
              severity: 'warning',
            });
          }
        }
```

- [ ] **TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add store/useGameStore.ts engine/productionBuildings.ts
git commit -m "feat(store): quarantine arrival, calving pen mortality, sire genetics, CCTV manning, weigh crate, vet room fee, pregnancy scanner"
```

---

## Task 6: `sellAnimal` weigh-crate +5% bonus

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Find `sellAnimal` and add the bonus**

Find where `value` (the sale price) is calculated in `sellAnimal`. Wrap it with:

```typescript
        const weighCrateFunctional = state.buildings.includes('bld_weigh_crate') &&
          state.buildings.includes('bld_cattle_crush');
        const optimalBonus = weighCrateFunctional && (animal.optimalWeightReached ?? false) ? 1.05 : 1.0;
        const value = Math.round(baseValue * optimalBonus);
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): +5% sale bonus for animals at optimal weigh-crate weight"
```

---

## Task 7: UI badges in `animales.tsx`

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { isAtOptimalWeight } from '../../engine/animals';
```

- [ ] **Step 2: Add `designateAsSire`, `removeFromSirePen`, `sirePenAnimalIds` to useGameStore destructure**

- [ ] **Step 3: Add three inline badge components** (after existing badge components, before the main screen):

```typescript
function QuarantineBadge({ animal, day }: { animal: OwnedAnimal; day: number }) {
  if (!animal.quarantineUntilDay || animal.quarantineUntilDay <= day) return null;
  const remaining = animal.quarantineUntilDay - day;
  return (
    <Text style={{ color: '#ff9800', fontSize: 10 }}>
      🔒 In quarantine — {remaining} day{remaining !== 1 ? 's' : ''} remaining
    </Text>
  );
}

function IsolationBadge({ animal }: { animal: OwnedAnimal }) {
  if (!animal.inIsolation) return null;
  return (
    <Text style={{ color: '#29b6f6', fontSize: 10 }}>🏥 In sick bay (isolated)</Text>
  );
}

function OptimalWeightBadge({ animal }: { animal: OwnedAnimal }) {
  if (!animal.optimalWeightReached) return null;
  return (
    <Text style={{ color: '#66bb6a', fontSize: 10, fontWeight: 'bold' }}>⚖ Optimal weight — +5% sale bonus</Text>
  );
}
```

- [ ] **Step 4: Add farm-level quarantine count header**

Before the FlatList of animals (find the ScrollView or list), add:

```typescript
        {(() => {
          const inQ = (animals ?? []).filter((a: OwnedAnimal) => a.quarantineUntilDay && a.quarantineUntilDay > day);
          if (inQ.length === 0) return null;
          const minR = Math.min(...inQ.map((a: OwnedAnimal) => a.quarantineUntilDay! - day));
          return (
            <View style={{ backgroundColor: '#3e2723', borderRadius: 8, marginHorizontal: 8, marginBottom: 6, padding: 10 }}>
              <Text style={{ color: '#ff9800', fontWeight: 'bold', fontSize: 12 }}>
                🔒 {inQ.length} animal{inQ.length !== 1 ? 's' : ''} in quarantine — {minR} day{minR !== 1 ? 's' : ''} remaining (soonest)
              </Text>
            </View>
          );
        })()}
```

- [ ] **Step 5: Render badges per animal row**

In the per-animal render (inside `renderItem` or `FlatList`), add after existing sick/trait indicators:

```typescript
              <QuarantineBadge animal={item} day={day} />
              <IsolationBadge animal={item} />
              <OptimalWeightBadge animal={item} />
```

- [ ] **Step 6: Add Sire designation button**

In the per-animal expanded detail (or after the sell button row), add:

```typescript
              {item.sex === 'male' && (buildings ?? []).includes('bld_sire_pen') && (
                <TouchableOpacity
                  style={{ backgroundColor: (sirePenAnimalIds ?? []).includes(item.id) ? '#4a148c' : '#1b5e20', borderRadius: 6, padding: 6, marginTop: 4 }}
                  onPress={() =>
                    (sirePenAnimalIds ?? []).includes(item.id)
                      ? removeFromSirePen(item.id)
                      : designateAsSire(item.id)
                  }
                >
                  <Text style={{ color: '#fff', fontSize: 11 }}>
                    {(sirePenAnimalIds ?? []).includes(item.id) ? '♂ Remove from Sire Pen' : '♂ Designate as Sire'}
                  </Text>
                </TouchableOpacity>
              )}
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add "app/(tabs)/animales.tsx"
git commit -m "feat(ui): quarantine, isolation and optimal-weight badges; sire designation in animales tab"
```

---

## Task 8: Shop routing fix in `tienda.tsx`

**Files:**
- Modify: `app/(tabs)/tienda.tsx`

The new breeding/vet buildings have no `animalTypeId`. The current `handleBuyBuilding` routes any `'production'` category building to `purchaseProductionBuilding`, which creates a `ProductionBuildingState` (inappropriate for non-species buildings). Fix the routing:

- [ ] **Step 1: Update `handleBuyBuilding`**

```typescript
const handleBuyBuilding = (buildingId: string) => {
  const bt = BUILDING_TYPES.find(b => b.id === buildingId);
  if (bt?.category === 'production' && bt.animalTypeId) {
    // Species-specific production buildings → production building state
    purchaseProductionBuilding(buildingId);
  } else {
    // All other buildings (including vet/breeding/infrastructure) → generic buildings[]
    buyBuilding(buildingId);
  }
};
```

- [ ] **Step 2: Update "already owned" check for non-species buildings**

The existing `alreadyOwned` check only applies to species production buildings. Add a second check for the generic `buildings` array:

```typescript
const alreadyOwned =
  (bt?.category === 'production' && bt.animalTypeId && ownedProductionSpecies.has(bt.animalTypeId ?? '')) ||
  (bt?.category === 'production' && !bt.animalTypeId && (buildings ?? []).includes(buildingId));
```

- [ ] **Step 3: Destructure `buildings` from useGameStore**

Add `buildings` to the destructure if not already present.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/tienda.tsx"
git commit -m "feat(ui): route non-species production buildings through buyBuilding in shop"
```

---

## Task 9: Rehydration + prestige reset

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add rehydration logic**

Find the Zustand `persist` configuration (search for `onRehydrateStorage` or `storage:`). In the `onRehydrateStorage` callback (create one if it doesn't exist), add derived-flag recomputation:

```typescript
onRehydrateStorage: () => (state) => {
  if (!state) return;
  const b = state.buildings ?? [];
  state.vetRoomOwned         = b.includes('bld_vet_room');
  state.medicineCabinetOwned = b.includes('bld_medicine_cabinet');
  state.hasCCTV              = b.includes('bld_cctv_monitor');
  state.sickBayCapacity      = (b.includes('bld_isolation_sick_bay_s') ? 5 : 0) +
                                (b.includes('bld_isolation_sick_bay_m') ? 15 : 0);
  state.sirePenAnimalIds     = state.sirePenAnimalIds ?? [];
},
```

- [ ] **Step 2: Add fields to `performPrestige` reset**

Find `performPrestige` action and add the five fields to its reset object:

```typescript
  sirePenAnimalIds: [],
  vetRoomOwned: false,
  medicineCabinetOwned: false,
  hasCCTV: false,
  sickBayCapacity: 0,
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): rehydrate and prestige-reset Plan 2 derived flags"
```

---

## Dependency Order

Tasks 1 and 2 are independent — can be done in parallel.
Task 3 depends on Task 1 (needs building IDs).
Task 4 depends on Tasks 2 and 3.
Task 5 depends on Tasks 1, 2, 3, and 4.
Task 6 depends on Tasks 2 and 5.
Task 7 depends on Tasks 2, 3, and 5.
Task 8 depends on Task 1.
Task 9 depends on Task 3.

## Known Challenges

1. **`breedAnimal` complexity** — read this action carefully before modifying; it has multiple code paths (pair-based, direct, etc.)
2. **`buyBuilding` existing logic** — may have maintenance cost checks; preserve all existing logic
3. **`vet` worker type** — `'vet'` may not exist in the `WorkerRole` union; use `(w.typeId as string) === 'vet'` cast if needed, and check existing worker types in `data/workerTypes.ts`
4. **`OwnedAnimal.inIsolation`** — after Task 2 adds this field, remove any `(a as any).inIsolation` casts in earlier Tasks
