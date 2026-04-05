# Realistic Animal Production — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `days × rate` animal production model with a realistic livestock layer: per-animal feed requirements (grain/hay), a Henil building that converts grass to hay, lactation cycles for cows and goats, and seasonal production multipliers for all species.

**Architecture:** Feed is tracked as global missed-days counters per feed type (`grainMissedDays`, `hayMissedDays`) in the store — no per-animal field needed. Lactation state is computed from a single `lactationStartDay` field on `OwnedAnimal`. Seasonal multipliers live in a lookup table in `engine/animals.ts`. All new logic threads into the existing `collectProduction` function via additional optional parameters.

**Tech Stack:** TypeScript, Zustand 5, React Native 0.81.5 / Expo 54. No new libraries required.

---

## File Map

| File | What changes |
|------|-------------|
| `data/animalTypes.ts` | Add `feedType: 'grain' \| 'hay' \| null` and `feedKgPerDay: number` to `AnimalType`; fill values for all 13 animals |
| `data/cropTypes.ts` | Update existing `grass` entry: `growthDays` 20→7, `basePrice` 5→0.10, remove `'winter'` from `seasons` |
| `data/buildingTypes.ts` | Add `'bld_henil'` building |
| `engine/animals.ts` | Add `lactationStartDay?` to `OwnedAnimal`; add lactation helpers, seasonal multiplier table, feed penalty function, `GRAIN_CROP_IDS`, feed-need helpers; update `collectProduction` and `canBreed` |
| `store/useGameStore.ts` | Add `henilQueue`, `grainMissedDays`, `hayMissedDays`, `animalsManuallyFed` to `GameState`; add `addToHenil`, `feedAnimals` actions; update `buyAnimal`, `breedAnimal`; update `advanceDay` |
| `app/(tabs)/animales.tsx` | Feed stock display, lactation progress bar, "Feed Animals" manual button |
| `app/(tabs)/gestion.tsx` | Henil queue section (active batches + "Start Batch" button) |

---

## Task 1: AnimalType — add feed fields

**Files:**
- Modify: `data/animalTypes.ts`

- [ ] **Step 1: Update the `AnimalType` interface**

Open `data/animalTypes.ts`. Replace the existing `AnimalType` interface with:

```typescript
export interface AnimalType {
  id: string;
  name: string;
  buyCost: number;
  maturityDays: number;
  maxPriceAge: number;
  maxSellPrice: number;
  productionType: 'eggs' | 'milk' | 'wool' | 'meat' | 'honey' | null;
  productionRate: number;
  breedingDays: number;
  enclosureType: string;
  feedType: 'grain' | 'hay' | null;   // null = self-sufficient (bees)
  feedKgPerDay: number;               // daily consumption at full maturity
}
```

- [ ] **Step 2: Fill feed fields in `ANIMAL_TYPES` array**

Replace the existing `ANIMAL_TYPES` array with this complete version (all 13 animals, only feed fields added — everything else unchanged):

```typescript
export const ANIMAL_TYPES: AnimalType[] = [
  { id: 'gallina',  name: 'Chicken',  buyCost: 80,   maturityDays: 20,  maxPriceAge: 365,  maxSellPrice: 150,  productionType: 'eggs',  productionRate: 1,    breedingDays: 30,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.12 },
  { id: 'vaca',     name: 'Cow',      buyCost: 800,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 2000, productionType: 'milk',  productionRate: 20,   breedingDays: 270, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 15   },
  { id: 'oveja',    name: 'Sheep',    buyCost: 300,  maturityDays: 60,  maxPriceAge: 548,  maxSellPrice: 700,  productionType: 'wool',  productionRate: 0.05, breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8  },
  { id: 'cerdo',    name: 'Pig',      buyCost: 200,  maturityDays: 45,  maxPriceAge: 180,  maxSellPrice: 600,  productionType: 'meat',  productionRate: 0,    breedingDays: 115, enclosureType: 'pocilga',     feedType: 'grain', feedKgPerDay: 2.5  },
  { id: 'conejo',   name: 'Rabbit',   buyCost: 50,   maturityDays: 15,  maxPriceAge: 180,  maxSellPrice: 120,  productionType: 'meat',  productionRate: 0,    breedingDays: 30,  enclosureType: 'conejera',    feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'cabra',    name: 'Goat',     buyCost: 250,  maturityDays: 45,  maxPriceAge: 548,  maxSellPrice: 600,  productionType: 'milk',  productionRate: 5,    breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 2    },
  { id: 'caballo',  name: 'Horse',    buyCost: 2000, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 8000, productionType: null,    productionRate: 0,    breedingDays: 330, enclosureType: 'caballeriza', feedType: 'hay',   feedKgPerDay: 9    },
  { id: 'pato',     name: 'Duck',     buyCost: 60,   maturityDays: 25,  maxPriceAge: 365,  maxSellPrice: 130,  productionType: 'eggs',  productionRate: 0.7,  breedingDays: 45,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'abeja',    name: 'Bee',      buyCost: 150,  maturityDays: 7,   maxPriceAge: 180,  maxSellPrice: 200,  productionType: 'honey', productionRate: 0.1,  breedingDays: 0,   enclosureType: 'colmena',     feedType: null,    feedKgPerDay: 0    },
  { id: 'alpaca',   name: 'Alpaca',   buyCost: 600,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 1500, productionType: 'wool',  productionRate: 0.08, breedingDays: 240, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.6  },
  { id: 'pavo',     name: 'Turkey',   buyCost: 120,  maturityDays: 60,  maxPriceAge: 180,  maxSellPrice: 380,  productionType: 'meat',  productionRate: 0,    breedingDays: 120, enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.25 },
  { id: 'codorniz', name: 'Quail',    buyCost: 25,   maturityDays: 12,  maxPriceAge: 120,  maxSellPrice: 65,   productionType: 'eggs',  productionRate: 1.2,  breedingDays: 20,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.03 },
  { id: 'bufalo',   name: 'Buffalo',  buyCost: 2800, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 9000, productionType: 'milk',  productionRate: 10,   breedingDays: 300, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 18   },
];
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors related to `animalTypes.ts`. (There may be errors about missing feed fields in usages — those will be fixed in later tasks.)

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add data/animalTypes.ts
git commit -m "feat(animals): add feedType and feedKgPerDay to AnimalType"
```

---

## Task 2: Grass crop update + Henil building

**Files:**
- Modify: `data/cropTypes.ts`
- Modify: `data/buildingTypes.ts`

- [ ] **Step 1: Update the grass crop entry in `data/cropTypes.ts`**

Find the `grass` entry (it's the first entry in `CROP_TYPES`):
```typescript
{ id: 'grass', name: 'Grass', tier: 'D', growthDays: 20, basePrice: 5, ...
```

Replace it with:
```typescript
{ id: 'grass', name: 'Grass / Hierba', tier: 'D', growthDays: 7, basePrice: 0.10, seedCost: 60, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 350, seasons: ['spring', 'summer', 'autumn'], peakSeason: 'summer', fertilityDrain: 0 },
```

Key changes: `growthDays` 20→7, `basePrice` 5→0.10, removed `'winter'` from `seasons`.

- [ ] **Step 2: Add the Henil building to `data/buildingTypes.ts`**

Find the end of the `BUILDING_TYPES` array (before the closing `]`). Add this entry as the last item:

```typescript
  // ── Henil (Hay Drying Barn) ──────────────────────────────────────────────
  {
    id: 'bld_henil',
    name: 'Henil (Hay Barn)',
    category: 'animal' as BuildingCategory,
    cost: 1200,
    maintenancePerDay: 1,
    capacity: 700,      // max kg wet grass per batch
    effectLabel: 'Converts wet grass → hay · 3-day drying · up to 2 active batches',
  },
```

- [ ] **Step 3: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add data/cropTypes.ts data/buildingTypes.ts
git commit -m "feat(animals): add henil building; update grass crop (7d growth, low price)"
```

---

## Task 3: Engine — OwnedAnimal + lactation helpers

**Files:**
- Modify: `engine/animals.ts`

- [ ] **Step 1: Add `lactationStartDay` to `OwnedAnimal` and add `GRAIN_CROP_IDS`**

In `engine/animals.ts`, add `lactationStartDay` to the `OwnedAnimal` interface and add the `GRAIN_CROP_IDS` constant. Add both near the top of the file, after the existing imports:

```typescript
export const GRAIN_CROP_IDS = ['wheat', 'corn', 'barley', 'oats', 'sorghum'];
```

Then in the `OwnedAnimal` interface, add one field after `grandparentIds`:

```typescript
export interface OwnedAnimal {
  id: string;
  typeId: string;
  sex: 'male' | 'female';
  bornDay: number;
  lastProductionDay: number;
  lastBreedDay: number;
  sick: boolean;
  sicknessDay?: number;
  traits?: AnimalTrait[];
  genes?: AnimalGenes;
  parentIds?: [string, string];
  grandparentIds?: [string, string, string, string];
  lactationStartDay?: number;  // day she last gave birth (cows & goats only)
}
```

- [ ] **Step 2: Add lactation constants and helpers**

After the existing `inheritTrait` function at the bottom of `engine/animals.ts`, add:

```typescript
// ─── Lactation ─────────────────────────────────────────────────────────────

export const LACTATION_PARAMS: Record<string, { lactatingDays: number; dryDays: number; breedAfterDryDay: number }> = {
  vaca:  { lactatingDays: 305, dryDays: 60,  breedAfterDryDay: 30 },
  cabra: { lactatingDays: 200, dryDays: 45,  breedAfterDryDay: 20 },
};

/** Returns 'lactating', 'dry', or 'none' (non-dairy species). */
export function getLactationState(
  animal: OwnedAnimal,
  typeId: string,
  currentDay: number,
): 'lactating' | 'dry' | 'none' {
  const params = LACTATION_PARAMS[typeId];
  if (!params) return 'none';
  if (!animal.lactationStartDay) return 'dry'; // never freshened
  const daysSince = currentDay - animal.lactationStartDay;
  if (daysSince < params.lactatingDays) return 'lactating';
  return 'dry';
}

/** Days remaining in current lactation window (0 if dry or non-dairy). */
export function lactationDaysRemaining(
  animal: OwnedAnimal,
  typeId: string,
  currentDay: number,
): number {
  const params = LACTATION_PARAMS[typeId];
  if (!params || !animal.lactationStartDay) return 0;
  const daysSince = currentDay - animal.lactationStartDay;
  return Math.max(0, params.lactatingDays - daysSince);
}

/** Days remaining in current dry period (0 if lactating or non-dairy). */
export function dryDaysRemaining(
  animal: OwnedAnimal,
  typeId: string,
  currentDay: number,
): number {
  const params = LACTATION_PARAMS[typeId];
  if (!params || !animal.lactationStartDay) return 0;
  const daysSince = currentDay - animal.lactationStartDay;
  if (daysSince < params.lactatingDays) return 0;
  const dryDaysSoFar = daysSince - params.lactatingDays;
  return Math.max(0, params.dryDays - dryDaysSoFar);
}
```

- [ ] **Step 3: Update `canBreed` to respect lactation for dairy animals**

Replace the existing `canBreed` function:

```typescript
export function canBreed(animal: OwnedAnimal, animalType: AnimalType, currentDay: number): boolean {
  if (!isMature(animal, animalType, currentDay)) return false;
  if (animalType.breedingDays === 0) return false;

  const params = LACTATION_PARAMS[animalType.id];
  if (params) {
    // Dairy animals: can only breed during dry period, after min dry days
    if (!animal.lactationStartDay) {
      // Never freshened — allow first breed using existing breedingDays cooldown
      return currentDay - animal.lastBreedDay >= animalType.breedingDays;
    }
    const daysSince = currentDay - animal.lactationStartDay;
    const dryDaysPassed = daysSince - params.lactatingDays;
    return dryDaysPassed >= params.breedAfterDryDay;
  }

  // Non-dairy: original logic
  return currentDay - animal.lastBreedDay >= animalType.breedingDays;
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add engine/animals.ts
git commit -m "feat(animals): add lactationStartDay, GRAIN_CROP_IDS, lactation helpers, updated canBreed"
```

---

## Task 4: Engine — Seasonal multipliers + feed penalty + updated `collectProduction`

**Files:**
- Modify: `engine/animals.ts`

- [ ] **Step 1: Add seasonal multiplier table and helpers**

After the lactation section added in Task 3, append:

```typescript
// ─── Seasonal production multipliers ───────────────────────────────────────
// Index: [spring=0, summer=1, autumn=2, winter=3]

const SEASONAL_MULTIPLIERS: Record<string, [number, number, number, number]> = {
  gallina:  [1.15, 1.00, 0.85, 0.65],
  codorniz: [1.15, 1.00, 0.85, 0.65],
  pato:     [1.10, 1.00, 0.90, 0.70],
  pavo:     [1.00, 1.00, 1.10, 0.80],
  vaca:     [1.15, 0.95, 0.90, 0.80],
  bufalo:   [1.15, 0.95, 0.90, 0.80],
  cabra:    [1.20, 1.00, 0.85, 0.75],
  oveja:    [1.20, 1.00, 0.85, 0.75],
  alpaca:   [1.20, 1.00, 0.85, 0.75],
  cerdo:    [1.00, 1.00, 1.05, 0.90],
  conejo:   [1.00, 1.00, 1.05, 0.90],
  caballo:  [1.00, 1.00, 1.00, 1.00],
  abeja:    [1.20, 1.40, 0.30, 0.00],
};

/** Returns the seasonal production multiplier for a given animal and game day. */
export function getSeasonMultiplier(typeId: string, currentDay: number): number {
  const dayOfYear = (currentDay - 1) % 365;
  const idx = dayOfYear < 90 ? 0 : dayOfYear < 180 ? 1 : dayOfYear < 270 ? 2 : 3;
  return SEASONAL_MULTIPLIERS[typeId]?.[idx] ?? 1.0;
}
```

- [ ] **Step 2: Add feed penalty helper**

Append after the seasonal section:

```typescript
// ─── Feed penalty ───────────────────────────────────────────────────────────

/**
 * Returns a production multiplier based on how many of the last 7 days feed was missed.
 *   0–1 missed → ×1.0 (≥ 86% fed, above the 80% threshold)
 *   2–3 missed → ×0.7 (50–79% fed range)
 *   4–7 missed → ×0.4 (< 50% fed)
 */
export function getFeedPenalty(missedDays: number): number {
  const clamped = Math.min(7, Math.max(0, missedDays));
  if (clamped <= 1) return 1.0;
  if (clamped <= 3) return 0.7;
  return 0.4;
}

/**
 * Returns feed needed (kg) per simulated day for the given animals.
 * Returns separate totals for grain, hay, and the pig-specific grain portion
 * (pigs can substitute other crops for their grain share).
 */
export function computeFeedNeeded(
  animals: OwnedAnimal[],
  animalTypes: AnimalType[],
  currentDay: number,
  isWinter: boolean,
): { grainKg: number; hayKg: number; pigGrainKg: number } {
  const winterMult = isWinter ? 1.15 : 1.0;
  let grainKg = 0;
  let hayKg = 0;
  let pigGrainKg = 0;

  for (const animal of animals) {
    const type = animalTypes.find(t => t.id === animal.typeId);
    if (!type || !type.feedType) continue;
    const matFactor = isMature(animal, type, currentDay) ? 1.0 : 0.5;
    const daily = type.feedKgPerDay * matFactor * winterMult;
    if (type.feedType === 'grain') {
      grainKg += daily;
      if (type.id === 'cerdo') pigGrainKg += daily;
    } else if (type.feedType === 'hay') {
      hayKg += daily;
    }
  }
  return { grainKg, hayKg, pigGrainKg };
}
```

- [ ] **Step 3: Update `collectProduction` to include lactation, seasonal, and feed modifiers**

Replace the existing `collectProduction` function entirely:

```typescript
export function collectProduction(
  animal: OwnedAnimal,
  animalType: AnimalType,
  currentDay: number,
  grainMissedDays = 0,
  hayMissedDays = 0,
): { units: number; nextDay: number } {
  if (animal.sick) return { units: 0, nextDay: animal.lastProductionDay };

  const femaleOnly = animalType.productionType === 'eggs' || animalType.productionType === 'milk';
  if (femaleOnly && animal.sex === 'male') {
    return { units: 0, nextDay: animal.lastProductionDay };
  }

  if (!isMature(animal, animalType, currentDay) || animalType.productionRate === 0) {
    return { units: 0, nextDay: animal.lastProductionDay };
  }

  // Lactation gate: dairy animals produce zero milk outside lactation window
  if (animalType.productionType === 'milk') {
    const lactState = getLactationState(animal, animalType.id, currentDay);
    if (lactState !== 'lactating') return { units: 0, nextDay: currentDay };
  }

  const daysPassed = currentDay - animal.lastProductionDay;

  // Age decay
  const age = currentDay - animal.bornDay;
  const ageMod = age <= animalType.maxPriceAge
    ? 1.0
    : Math.max(0.2, 1.0 - ((age - animalType.maxPriceAge) / animalType.maxPriceAge) * 0.8);

  const productiveMod = (animal.traits ?? []).includes('productive') ? 1.20 : 1.0;
  const geneProdMod = animal.genes?.production ?? 1.0;

  // Feed penalty (bees: feedType null → no penalty)
  const missedDaysForType = animalType.feedType === 'hay' ? hayMissedDays
    : animalType.feedType === 'grain' ? grainMissedDays
    : 0;
  const feedMod = getFeedPenalty(missedDaysForType);

  // Seasonal multiplier
  const seasonMod = getSeasonMultiplier(animalType.id, currentDay);

  return {
    units: daysPassed * animalType.productionRate * ageMod * productiveMod * geneProdMod * feedMod * seasonMod,
    nextDay: currentDay,
  };
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `engine/animals.ts`. There may be errors in the store about the new `feedType` field — those are fixed in Task 5+.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add engine/animals.ts
git commit -m "feat(animals): seasonal multipliers, feed penalty, lactation gate in collectProduction"
```

---

## Task 5: Store — New state fields

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add `HenilBatch` interface**

Near the top of `store/useGameStore.ts`, after the other interfaces (search for `export interface GameState` — add just before it):

```typescript
export interface HenilBatch {
  batchId: string;
  wetGrassKg: number;
  startDay: number;
  readyDay: number;  // startDay + 3
}
```

- [ ] **Step 2: Add new fields to `GameState`**

Inside the `GameState` interface, find the `// Settings` comment block. Add the four new fields just before it:

```typescript
  // Animal feed tracking
  henilQueue: HenilBatch[];
  grainMissedDays: number;   // 0–7 rolling: how many of last 7 days grain was short
  hayMissedDays: number;     // 0–7 rolling: how many of last 7 days hay was short
  animalsManuallyFed: boolean; // true if player tapped Feed All this day (no-worker path)
```

- [ ] **Step 3: Add initial values in `create()`**

Search for where the store's initial state is defined (look for `day: 1,` or `money:` near a `create(` call). Add the four new fields to the initial state object:

```typescript
  henilQueue: [],
  grainMissedDays: 0,
  hayMissedDays: 0,
  animalsManuallyFed: false,
```

- [ ] **Step 4: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors from these additions.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add store/useGameStore.ts
git commit -m "feat(animals): add henilQueue, feed tracking fields to GameState"
```

---

## Task 6: Store — `addToHenil` and `feedAnimals` actions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add `addToHenil` and `feedAnimals` to the `GameState` interface**

In `GameState`, find the `// Actions` comment. Add these two action signatures:

```typescript
  addToHenil: () => void;
  feedAnimals: () => void;
```

- [ ] **Step 2: Implement `addToHenil`**

Find the `buyAnimal:` action in the store implementation. Add the following action nearby (before or after `buyAnimal`):

```typescript
      addToHenil: () => {
        const state = get();
        if (!state.buildings.includes('bld_henil')) return;
        const activeCount = (state.henilQueue ?? []).filter(b => b.readyDay > state.day).length;
        if (activeCount >= 2) return; // max 2 concurrent batches
        const grassAvailable = state.inventory['grass'] ?? 0;
        if (grassAvailable <= 0) return;
        const batchKg = Math.min(grassAvailable, 700); // 700 kg batch cap
        const batch: HenilBatch = {
          batchId: `henil_${Date.now()}`,
          wetGrassKg: batchKg,
          startDay: state.day,
          readyDay: state.day + 3,
        };
        set({
          henilQueue: [...(state.henilQueue ?? []), batch],
          inventory: { ...state.inventory, grass: grassAvailable - batchKg },
        });
      },
```

- [ ] **Step 3: Implement `feedAnimals`**

Add this action immediately after `addToHenil`:

```typescript
      feedAnimals: () => {
        // Manual feeding button — only available when no animal worker.
        // Sets flag so advanceDay knows animals were fed today.
        const state = get();
        const hasAnimalWorker = (state.workers ?? []).some(
          (w: any) => w.typeId === 'animal_keeper' || w.typeId === 'zootechnician'
        );
        if (hasAnimalWorker) return; // worker handles it automatically
        set({ animalsManuallyFed: true });
      },
```

- [ ] **Step 4: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add store/useGameStore.ts
git commit -m "feat(animals): add addToHenil and feedAnimals store actions"
```

---

## Task 7: Store — `buyAnimal` + `breedAnimal` lactation updates

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Update `buyAnimal` to freshen cows and goats on purchase**

Find the `buyAnimal` action (around line 2817). The current code creates `newAnimal` with `bornDay: state.day`. Replace the `newAnimal` construction block with:

```typescript
        // Dairy animals (cows & goats) arrive already freshened — mid-lactation adult
        const isDairy = typeId === 'vaca' || typeId === 'cabra';
        const freshenOffset = isDairy ? Math.floor(Math.random() * 120 + 30) : 0;
        // born far enough in the past to be mature + freshened
        const newBornDay = isDairy
          ? state.day - animalType.maturityDays - freshenOffset - 10
          : state.day;

        const newAnimal: OwnedAnimal = {
          id: `animal_${Date.now()}`,
          typeId,
          sex,
          bornDay: newBornDay,
          lastProductionDay: state.day,
          lastBreedDay: state.day,
          sick: false,
          genes: randomGenes(),
          ...(isDairy && sex === 'female' ? { lactationStartDay: state.day - freshenOffset } : {}),
        };
```

Keep the `set(...)` call at the end of `buyAnimal` unchanged.

- [ ] **Step 2: Update `breedAnimal` to reset lactation on birth**

Find the `breedAnimal` action (around line 2874). Find the `set(...)` call at the end of the action. It currently does:

```typescript
        set({
          breedingPairs: nextPairs,
          animals: [
            ...state.animals.map((a: OwnedAnimal) => a.id === animalId ? { ...a, lastBreedDay: state.day } : a),
            offspring,
          ],
        });
```

Replace with:

```typescript
        const isDairy = animal.typeId === 'vaca' || animal.typeId === 'cabra';
        set({
          breedingPairs: nextPairs,
          animals: [
            ...state.animals.map((a: OwnedAnimal) => {
              if (a.id !== animalId) return a;
              return {
                ...a,
                lastBreedDay: state.day,
                // Reset lactation: giving birth starts a new lactation window
                ...(isDairy ? { lactationStartDay: state.day } : {}),
              };
            }),
            offspring,
          ],
        });
```

- [ ] **Step 3: Update `collectAnimalProduction` to pass feed missed days**

Find the `collectAnimalProduction` action (around line 3057). Replace the `collectProduction` call:

```typescript
        const { units, nextDay } = collectProduction(animal, animalType, state.day);
```

With:

```typescript
        const { units, nextDay } = collectProduction(
          animal,
          animalType,
          state.day,
          state.grainMissedDays ?? 0,
          state.hayMissedDays ?? 0,
        );
```

- [ ] **Step 4: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add store/useGameStore.ts
git commit -m "feat(animals): freshen dairy animals on buy; lactation reset on breed; feed penalty in collect"
```

---

## Task 8: Store — `advanceDay` feed deduction + henil processing

**Files:**
- Modify: `store/useGameStore.ts`

This is the most complex task. It adds feed deduction and henil processing to the `advanceDay` function.

- [ ] **Step 1: Add imports at the top of `advanceDay` body**

Inside the `advanceDay` action, near the top where other `require` calls live (search for `const { ANIMAL_TYPES } = require('../data/animalTypes')`), add:

```typescript
        const { computeFeedNeeded, GRAIN_CROP_IDS, getFeedPenalty } = require('../engine/animals');
        const { ANIMAL_TYPES: AT } = require('../data/animalTypes');
```

(Note: if `ANIMAL_TYPES` is already imported as a different local name in `advanceDay`, use that name below instead of `AT`.)

- [ ] **Step 2: Find the animal sickness section**

Search for the comment `// Veterinary events` inside `advanceDay` (around line 1501). The feed deduction block goes **immediately before** this comment.

- [ ] **Step 3: Add the feed deduction block**

Insert the following block immediately before `// Veterinary events`:

```typescript
        // ── Feed deduction ────────────────────────────────────────────────────
        {
          const hasAnimalWorker = (state.workers ?? []).some(
            (w: any) => w.typeId === 'animal_keeper' || w.typeId === 'zootechnician'
          );
          // isWinter: day-of-year 271–365
          const dayOfYear = (newDay - 1) % 365;
          const isWinter = dayOfYear >= 270;
          const { grainKg, hayKg, pigGrainKg } = computeFeedNeeded(animals, AT, newDay, isWinter);

          let newGrainMissed = state.grainMissedDays ?? 0;
          let newHayMissed = state.hayMissedDays ?? 0;

          const shouldFeed = hasAnimalWorker || state.animalsManuallyFed;

          if (shouldFeed && (grainKg > 0 || hayKg > 0)) {
            // ── Grain deduction ──
            if (grainKg > 0) {
              const grainAvail = GRAIN_CROP_IDS.reduce(
                (s: number, id: string) => s + (harvestInventory[id] ?? 0), 0
              );
              if (grainAvail >= grainKg) {
                // Deduct from grain crops in order
                let remaining = grainKg;
                for (const id of GRAIN_CROP_IDS) {
                  if (remaining <= 0) break;
                  const avail = harvestInventory[id] ?? 0;
                  const take = Math.min(avail, remaining);
                  harvestInventory = { ...harvestInventory, [id]: avail - take };
                  remaining -= take;
                }
                newGrainMissed = Math.max(0, newGrainMissed - 1);
              } else {
                // Try pig fallback: any non-grain, non-grass crop covers pig shortfall
                const shortfall = grainKg - grainAvail;
                // Consume all grain first
                for (const id of GRAIN_CROP_IDS) {
                  if ((harvestInventory[id] ?? 0) > 0) {
                    harvestInventory = { ...harvestInventory, [id]: 0 };
                  }
                }
                if (shortfall <= pigGrainKg) {
                  // Only pigs are short — try fallback crops
                  let pigRemaining = shortfall;
                  const fallbackIds = Object.keys(harvestInventory).filter(
                    (id: string) => !GRAIN_CROP_IDS.includes(id) && id !== 'grass' && (harvestInventory[id] ?? 0) > 0
                  );
                  for (const id of fallbackIds) {
                    if (pigRemaining <= 0) break;
                    const avail = harvestInventory[id] ?? 0;
                    const take = Math.min(avail, pigRemaining);
                    harvestInventory = { ...harvestInventory, [id]: avail - take };
                    pigRemaining -= take;
                  }
                  if (pigRemaining <= 0) {
                    newGrainMissed = Math.max(0, newGrainMissed - 1);
                  } else {
                    newGrainMissed = Math.min(7, newGrainMissed + 1);
                  }
                } else {
                  newGrainMissed = Math.min(7, newGrainMissed + 1);
                }
              }
            } else {
              newGrainMissed = Math.max(0, newGrainMissed - 1); // no grain animals
            }

            // ── Hay deduction ──
            if (hayKg > 0) {
              const hayAvail = animalInventory['hay'] ?? 0;
              if (hayAvail >= hayKg) {
                animalInventory = { ...animalInventory, hay: Math.round((hayAvail - hayKg) * 10) / 10 };
                newHayMissed = Math.max(0, newHayMissed - 1);
              } else {
                animalInventory = { ...animalInventory, hay: 0 };
                newHayMissed = Math.min(7, newHayMissed + 1);
                if (hayKg > 0) {
                  summary.push({
                    id: 'feed_hay_empty',
                    icon: '🌾',
                    title: 'Hay stock depleted',
                    detail: 'Hay-eating animals are underfed — grow grass and process it in the Henil',
                    severity: 'warning',
                  });
                }
              }
            } else {
              newHayMissed = Math.max(0, newHayMissed - 1); // no hay animals
            }
          } else if (grainKg > 0 || hayKg > 0) {
            // No worker and player didn't tap Feed All
            newGrainMissed = Math.min(7, newGrainMissed + 1);
            newHayMissed = Math.min(7, newHayMissed + 1);
            if (!hasAnimalWorker) {
              summary.push({
                id: 'feed_not_fed',
                icon: '🐄',
                title: 'Animals not fed today',
                detail: 'Tap "Feed Animals" before advancing day, or hire an animal keeper',
                severity: 'warning',
              });
            }
          }

          // Apply doubled sick chance for underfed animals (handled in sickness section below
          // by passing missedDays into the sickness roll — we store them for later use)
          // Store on locals for use in sickness section:
          // These are set into state at end of advanceDay via the set() call below.
          // (Declare them in outer scope so the sickness section can reference them.)
        }
```

**Important:** After this block, in the `set({...})` call at the end of `advanceDay`, add:

```typescript
          grainMissedDays: newGrainMissed,
          hayMissedDays: newHayMissed,
          animalsManuallyFed: false,   // reset each day
```

Because these locals are declared inside the block `{ ... }` with `let`, you need to declare `let newGrainMissed` and `let newHayMissed` in the **outer** `advanceDay` scope (before the block), not inside the block. Refactor the block accordingly: declare `let newGrainMissed = state.grainMissedDays ?? 0;` and `let newHayMissed = state.hayMissedDays ?? 0;` before the block, then the block mutates them.

- [ ] **Step 4: Add henil batch processing to `advanceDay`**

Search for the `// Milestone checks` comment in `advanceDay` (around line 2510). Add the following block **before** it:

```typescript
        // ── Henil: process ready batches ──────────────────────────────────────
        const readyBatches = (state.henilQueue ?? []).filter(b => b.readyDay <= newDay);
        if (readyBatches.length > 0) {
          const hayProduced = readyBatches.reduce(
            (sum: number, b: HenilBatch) => sum + Math.floor(b.wetGrassKg * 0.625), 0
          );
          animalInventory = {
            ...animalInventory,
            hay: (animalInventory['hay'] ?? 0) + hayProduced,
          };
          summary.push({
            id: `henil_ready_${newDay}`,
            icon: '🌿',
            title: `Henil: ${hayProduced.toLocaleString()} kg hay ready`,
            detail: `${readyBatches.length} batch${readyBatches.length > 1 ? 'es' : ''} dried`,
            severity: 'good',
          });
        }
        const updatedHenilQueue = (state.henilQueue ?? []).filter(b => b.readyDay > newDay);
```

Then in the final `set({...})` call, add:

```typescript
          henilQueue: updatedHenilQueue,
          animalInventory: { ...animalInventory },
          inventory: harvestInventory,
```

(The `animalInventory` and `inventory`/`harvestInventory` keys likely already exist in the `set()` call — update their values to use the locally-mutated versions.)

- [ ] **Step 5: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -40
```

Fix any compilation errors. Common issues: `HenilBatch` might need to be imported/referenced at the top of the file — ensure it's accessible in `advanceDay`. The `GRAIN_CROP_IDS` const is already typed as `string[]`, so array methods should work.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add store/useGameStore.ts
git commit -m "feat(animals): feed deduction and henil processing in advanceDay"
```

---

## Task 9: UI — `animales.tsx` feed stock, lactation bar, Feed button

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [ ] **Step 1: Add new store values to the destructure**

Find the `useGameStore()` destructure at the top of `AnimalesScreen`. Add:

```typescript
    workers, grainMissedDays, hayMissedDays, addToHenil, feedAnimals, henilQueue, day,
```

(Note: `day` may already be present. Only add what's missing.)

- [ ] **Step 2: Compute derived feed values**

After the `useGameStore()` call, add:

```typescript
  const hasAnimalWorker = (workers ?? []).some(
    (w: any) => w.typeId === 'animal_keeper' || w.typeId === 'zootechnician'
  );
  const grainStock = ['wheat', 'corn', 'barley', 'oats', 'sorghum'].reduce(
    (sum, id) => sum + (animalInventory[id] ?? 0), 0
  );
  const hayStock = animalInventory['hay'] ?? 0;
```

- [ ] **Step 3: Add "Feed Animals" button and feed stock display**

Find the `{/* Animal Product Inventory */}` section in the JSX (or wherever the animal products are displayed). Add a feed stock card and conditional Feed button **just above** the animal product inventory:

```tsx
          {/* Feed Stock */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Feed Stock</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#aaa', fontSize: 11 }}>🌾 Grain</Text>
                <Text style={{ color: grainStock < 5 ? '#ef5350' : '#81c784', fontWeight: 'bold' }}>
                  {Math.floor(grainStock).toLocaleString()} kg
                </Text>
                {grainMissedDays > 0 && (
                  <Text style={{ color: '#ff9800', fontSize: 10 }}>⚠ {grainMissedDays}/7 days underfed</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#aaa', fontSize: 11 }}>🌿 Hay</Text>
                <Text style={{ color: hayStock < 10 ? '#ef5350' : '#81c784', fontWeight: 'bold' }}>
                  {Math.floor(hayStock).toLocaleString()} kg
                </Text>
                {hayMissedDays > 0 && (
                  <Text style={{ color: '#ff9800', fontSize: 10 }}>⚠ {hayMissedDays}/7 days underfed</Text>
                )}
              </View>
            </View>
            {!hasAnimalWorker && (
              <TouchableOpacity
                style={{ backgroundColor: '#1b5e20', borderRadius: 6, padding: 10, alignItems: 'center' }}
                onPress={feedAnimals}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Feed Animals Today</Text>
                <Text style={{ color: '#a5d6a7', fontSize: 11 }}>Hire an animal keeper to automate this</Text>
              </TouchableOpacity>
            )}
            {hasAnimalWorker && (
              <Text style={{ color: '#66bb6a', fontSize: 11 }}>✓ Animal worker feeds automatically</Text>
            )}
          </View>
```

- [ ] **Step 4: Add lactation progress bar to cow/goat animal cards**

Find where the individual animal card is rendered (look for the `maturity` display or `isMature` call in the JSX). Import the lactation helpers at the top of the file:

```typescript
import { getLactationState, lactationDaysRemaining, dryDaysRemaining, LACTATION_PARAMS } from '../../engine/animals';
```

Then, inside the animal card render, find where maturity progress is shown. Add the following block inside each animal card, conditionally shown for dairy animals:

```tsx
                {/* Lactation bar (cows & goats only) */}
                {(animal.typeId === 'vaca' || animal.typeId === 'cabra') && (() => {
                  const lactState = getLactationState(animal, animal.typeId, day);
                  const params = LACTATION_PARAMS[animal.typeId]!;
                  if (lactState === 'lactating') {
                    const daysLeft = lactationDaysRemaining(animal, animal.typeId, day);
                    const pct = Math.round((1 - daysLeft / params.lactatingDays) * 100);
                    return (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: '#aaa', fontSize: 10 }}>
                          🥛 Lactating — {daysLeft}d remaining
                        </Text>
                        <View style={{ height: 4, backgroundColor: '#1a2a1a', borderRadius: 2, marginTop: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#66bb6a', width: `${pct}%` as any }} />
                        </View>
                      </View>
                    );
                  } else {
                    const daysLeft = dryDaysRemaining(animal, animal.typeId, day);
                    return (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: '#ff9800', fontSize: 10 }}>
                          🌾 Dry period — {daysLeft > 0 ? `${daysLeft}d left` : 'ready to breed'}
                        </Text>
                        <View style={{ height: 4, backgroundColor: '#1a2a1a', borderRadius: 2, marginTop: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#ff9800', width: `${Math.round((1 - daysLeft / params.dryDays) * 100)}%` as any }} />
                        </View>
                      </View>
                    );
                  }
                })()}
```

- [ ] **Step 5: Add seasonal multiplier tooltip to animal card**

Inside the animal card (near where production rate or traits are shown), add a seasonal indicator:

```tsx
                {/* Seasonal multiplier */}
                {(() => {
                  const mod = getSeasonMultiplier(animal.typeId, day);
                  if (mod === 1.0) return null;
                  const label = mod > 1.0 ? `+${Math.round((mod - 1) * 100)}% seasonal bonus` : `${Math.round((1 - mod) * 100)}% seasonal penalty`;
                  const color = mod > 1.0 ? '#66bb6a' : '#ef5350';
                  return <Text style={{ color, fontSize: 10, marginTop: 2 }}>🌤 {label}</Text>;
                })()}
```

Add `getSeasonMultiplier` to the import from `'../../engine/animals'`.

- [ ] **Step 6: Verify compilation and check UI renders**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/animales.tsx"
git commit -m "feat(animals): feed stock display, lactation bar, seasonal tooltip in animales tab"
```

---

## Task 10: UI — `gestion.tsx` Henil queue section

**Files:**
- Modify: `app/(tabs)/gestion.tsx`

- [ ] **Step 1: Add henil fields to the store destructure**

Find the `useGameStore()` destructure in `GestionScreen`. Add:

```typescript
    henilQueue, addToHenil, day, inventory, buildings,
```

(Some of these may already exist — only add what's missing.)

- [ ] **Step 2: Compute henil state**

After the `useGameStore()` call, add:

```typescript
  const hasHenil = (buildings ?? []).includes('bld_henil');
  const grassInStock = inventory['grass'] ?? 0;
  const activeBatches = (henilQueue ?? []).filter((b: any) => b.readyDay > day);
  const canStartBatch = hasHenil && grassInStock > 0 && activeBatches.length < 2;
```

- [ ] **Step 3: Add Henil section to JSX**

Find a good spot in the `gestion.tsx` JSX — after the season goals section or before the settings section. Add:

```tsx
          {/* Henil (Hay Drying Barn) */}
          {hasHenil && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌿 Henil</Text>
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
                Wet grass → hay · 3-day drying · 62.5% yield
              </Text>

              {activeBatches.length === 0 && (
                <Text style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>No active batches.</Text>
              )}
              {activeBatches.map((batch: any) => {
                const daysLeft = batch.readyDay - day;
                const hayYield = Math.floor(batch.wetGrassKg * 0.625);
                return (
                  <View key={batch.batchId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a2a1a' }}>
                    <Text style={{ color: '#ccc', fontSize: 12 }}>
                      {batch.wetGrassKg.toLocaleString()} kg grass
                    </Text>
                    <Text style={{ color: '#66bb6a', fontSize: 12 }}>
                      → {hayYield.toLocaleString()} kg hay
                    </Text>
                    <Text style={{ color: daysLeft <= 1 ? '#66bb6a' : '#888', fontSize: 12 }}>
                      {daysLeft === 0 ? 'Ready!' : `${daysLeft}d left`}
                    </Text>
                  </View>
                );
              })}

              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: canStartBatch ? '#1b5e20' : '#1a1a2e',
                  borderRadius: 6, padding: 10, alignItems: 'center',
                  opacity: canStartBatch ? 1 : 0.5,
                }}
                onPress={canStartBatch ? addToHenil : undefined}
                disabled={!canStartBatch}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {activeBatches.length >= 2 ? 'Queue Full (2/2)' : grassInStock <= 0 ? 'No Grass in Stock' : `Start Batch (${Math.floor(grassInStock)} kg grass)`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!hasHenil && (
            <View style={[styles.sectionCard, { opacity: 0.6 }]}>
              <Text style={styles.sectionTitle}>🌿 Henil</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>Build a Henil to convert grass into hay for your animals.</Text>
            </View>
          )}
```

- [ ] **Step 4: Verify compilation**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add "app/(tabs)/gestion.tsx"
git commit -m "feat(animals): Henil queue UI in gestion tab"
```

---

## Final verification

- [ ] **Full TypeScript check**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Smoke test checklist (manual)**
  - Buy a cow → arrives as mature adult with lactation bar showing green
  - Advance 1 day without feeding (no worker) → warning appears in day summary
  - Tap "Feed Animals" then advance → no warning
  - Plant grass, harvest it, go to Gestion → Start Batch button enabled
  - Advance 3 days → Henil batch completes, hay appears in animalInventory
  - Advance into Winter → bee production drops to 0, chicken production shows penalty
  - Breed a cow → lactation bar resets to day 0

- [ ] **Final commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add -A
git commit -m "feat(animals): realistic production — feed system, lactation cycles, seasonal multipliers, henil"
```
