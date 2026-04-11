# Animal Production Buildings — Plan 5: Wool Scouring, Smokehouse & Cream Separator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate three already-purchasable building categories — wool scouring (+30% wool sale price), smokehouse (+40% meat sale price), and cream separator (splits milk collection into milk + cream) — giving players meaningful return on these investments.

**Architecture:** Two sell-side price multipliers added to the existing `sellAnimalProduct` action in `store/useGameStore.ts`; cream split added to `collectAnimalProduction`. Smokehouse is implemented as an instant price bonus (no processing queue — YAGNI; queue mechanics are Plan 6). New building data added to `data/buildingTypes.ts`; `cream` product added to `data/animalProducts.ts`. No new GameState fields — all checks are inline `state.buildings.includes()` calls following the Plan 3–4 pattern.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `npx tsc --noEmit` for verification.

---

## Plans 6+ (not in this plan)

- **Plan 6:** Silage pit mechanics (fill action `fillSilagePit()`, `silageLevel`/`silageCapacity` state, winter hay substitution for ruminants in `advanceDay`), hatchery auto-spawn (incubation queue, daily hatching, auto-spawn chick animals), biogas biomethane toggle (sell-to-grid vs fuel-machinery player choice)
- **Plan 7:** Milk quality grading (SCC from hygiene → Grade A/B/C), animal welfare score (hygiene + feed + density + health), farm lab, carbon tracker

---

## Architectural Notes

- **`sellAnimalProduct(productType, units)`** — the existing sell action handles all animal product inventory sales. Both new price bonuses (wool scouring, smokehouse) are applied as multipliers in the existing `revenue` calculation, after `gradeMultiplier` and `coopBonus`.
- **`collectAnimalProduction(animalId)`** — collects daily output from one animal. For milk-producing animals (`animalType.productionType === 'milk'`), if cream separator is owned, 10% of collected units become `cream` instead of `milk`. `cream` is stored in the existing `animalInventory: Record<string, number>` (arbitrary keys allowed).
- **`ANIMAL_PRODUCTS`** in `data/animalProducts.ts` drives the `sellAnimalProduct` lookup. Adding `cream` here makes it sellable via the existing action with no further changes.
- **No new GameState fields** — no `onRehydrateStorage` or `performPrestige` changes needed.

---

## File Map

| File | Change |
|------|--------|
| `data/buildingTypes.ts` | Task 1: append 6 new building entries (smokehouse s/m/l, wool scouring s/m/l) |
| `data/animalProducts.ts` | Task 1: append `cream` product entry |
| `store/useGameStore.ts` | Task 2: wool scouring + smokehouse multipliers in `sellAnimalProduct`<br>Task 3: cream split in `collectAnimalProduction` |

---

## Task 1: Add smokehouse + wool scouring building data and cream product

**Files:**
- Modify: `data/buildingTypes.ts`
- Modify: `data/animalProducts.ts`

### Step 1: Read the end of `data/buildingTypes.ts`

Find the last entry in the `BUILDING_TYPES` array (currently `bld_queen_rearing_unit`). The entries use this shape:
```typescript
{ id: string, name: string, category: BuildingCategory, cost: number, maintenancePerDay: number, capacity?: number, buildingTier?: string, effectLabel: string }
```

### Step 2: Append 6 new building entries after `bld_queen_rearing_unit`

```typescript
  // ── Processing Buildings ───────────────────────────────────────────────────
  { id: 'bld_smokehouse_s',      name: 'Small Smokehouse',      category: 'production' as const, cost: 12000, maintenancePerDay: 5,  capacity: 20,  buildingTier: 'small',  effectLabel: 'Cures & smokes meat · +40% sale price on all meat products' },
  { id: 'bld_smokehouse_m',      name: 'Medium Smokehouse',     category: 'production' as const, cost: 28000, maintenancePerDay: 10, capacity: 50,  buildingTier: 'medium', effectLabel: 'Cures & smokes meat · +40% sale price on all meat products' },
  { id: 'bld_smokehouse_l',      name: 'Large Smokehouse',      category: 'production' as const, cost: 60000, maintenancePerDay: 20, capacity: 150, buildingTier: 'large',  effectLabel: 'Cures & smokes meat · +40% sale price on all meat products' },
  { id: 'bld_wool_scouring_s',   name: 'Small Wool Scouring',   category: 'production' as const, cost: 8000,  maintenancePerDay: 3,  buildingTier: 'small',  effectLabel: 'Washes raw wool before sale · +30% sale price on all wool' },
  { id: 'bld_wool_scouring_m',   name: 'Medium Wool Scouring',  category: 'production' as const, cost: 18000, maintenancePerDay: 6,  buildingTier: 'medium', effectLabel: 'Washes raw wool before sale · +30% sale price on all wool' },
  { id: 'bld_wool_scouring_l',   name: 'Large Wool Scouring',   category: 'production' as const, cost: 40000, maintenancePerDay: 14, buildingTier: 'large',  effectLabel: 'Washes raw wool before sale · +30% sale price on all wool' },
```

These go inside the array, after the last existing entry and before the closing `];`.

### Step 3: Add `cream` to `data/animalProducts.ts`

The file currently looks like:
```typescript
export const ANIMAL_PRODUCTS: AnimalProductInfo[] = [
  { productType: 'eggs',  name: 'Eggs',  unit: 'ud', basePrice: 3.50 },
  { productType: 'milk',  name: 'Milk',  unit: 'L',  basePrice: 0.90 },
  { productType: 'honey', name: 'Honey', unit: 'kg', basePrice: 25.0 },
  { productType: 'wool',  name: 'Wool',  unit: 'kg', basePrice: 42.0 },
  { productType: 'meat',  name: 'Meat',  unit: 'kg', basePrice: 14.0 },
];
```

Append `cream` as the last entry before `];`:
```typescript
  { productType: 'cream', name: 'Cream', unit: 'L',  basePrice: 4.50 },
```

Cream base price $4.50/L (5× milk base price, reflecting fat value).

### Step 4: TypeScript check

```bash
node_modules\.bin\tsc --noEmit
```

Use: `cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"`

Expected: no errors.

### Step 5: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add data/buildingTypes.ts data/animalProducts.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(data): add smokehouse and wool scouring building types; add cream product"
```

---

## Task 2: Wool scouring + smokehouse sell price multipliers in `sellAnimalProduct`

**Files:**
- Modify: `store/useGameStore.ts`

Find `sellAnimalProduct` in `store/useGameStore.ts` (around line 4033). The current revenue calculation near the end of the action is:

```typescript
const gradeMultiplier = grade === 'A' ? 1.10 : grade === 'C' ? 0.75 : 1.00;
const { ANIMAL_PRODUCTS } = require('../data/animalProducts');
const product = ANIMAL_PRODUCTS.find((p: any) => p.productType === productType);
if (!product) return;
const inStock = state.animalInventory[productType] ?? 0;
const toSell = Math.min(units, inStock);
if (toSell <= 0) return;
const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
const livePrice = (state.animalPrices ?? {})[productType] ?? product.basePrice;
const revenue = Math.round(sellRevenue(toSell, livePrice) * coopBonus * prestigeBonus * gradeMultiplier);
```

### Step 1: Add wool scouring and smokehouse multipliers

Replace the `const revenue = ...` line with:

```typescript
const hasWoolScouring = productType === 'wool' && (state.buildings ?? []).some((bid: string) =>
  bid === 'bld_wool_scouring_s' || bid === 'bld_wool_scouring_m' || bid === 'bld_wool_scouring_l'
);
const woolScouringBonus = hasWoolScouring ? 1.30 : 1.0;

const hasSmokehouse = productType === 'meat' && (state.buildings ?? []).some((bid: string) =>
  bid === 'bld_smokehouse_s' || bid === 'bld_smokehouse_m' || bid === 'bld_smokehouse_l'
);
const smokehouseBonus = hasSmokehouse ? 1.40 : 1.0;

const revenue = Math.round(sellRevenue(toSell, livePrice) * coopBonus * prestigeBonus * gradeMultiplier * woolScouringBonus * smokehouseBonus);
```

Everything else in the action (`set({ money: ..., animalInventory: ..., salesLog: ..., totalRevenue: ... })`) stays unchanged.

### Step 2: TypeScript check

```bash
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors.

### Step 3: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): wool scouring +30% and smokehouse +40% sale price multipliers"
```

---

## Task 3: Cream separator splits milk collection into milk + cream

**Files:**
- Modify: `store/useGameStore.ts`

Find `collectAnimalProduction` in `store/useGameStore.ts` (around line 4007). The current implementation is:

```typescript
collectAnimalProduction: (animalId) => {
  const state = get();
  const animal = state.animals.find(a => a.id === animalId);
  if (!animal) return;
  const { ANIMAL_TYPES } = require('../data/animalTypes');
  const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
  const { collectProduction } = require('../engine/animals');
  const { units, nextDay } = collectProduction(
    animal,
    animalType,
    state.day,
    state.grainMissedDays ?? 0,
    state.hayMissedDays ?? 0,
  );
  if (units <= 0 || !animalType.productionType) return;
  // Granero: +20% animal production (improved feeding and shelter)
  const graneroBonus = hasGranero(state.buildings) ? 1.2 : 1.0;
  set({
    animals: state.animals.map(a => a.id === animalId ? { ...a, lastProductionDay: nextDay } : a),
    animalInventory: {
      ...state.animalInventory,
      [animalType.productionType]: (state.animalInventory[animalType.productionType] ?? 0) + Math.round(units * graneroBonus),
    },
  });
},
```

### Step 1: Add cream separator split

Replace the `const graneroBonus = ...` and `set({ ... })` section with:

```typescript
  // Granero: +20% animal production (improved feeding and shelter)
  const graneroBonus = hasGranero(state.buildings) ? 1.2 : 1.0;
  const totalUnits = Math.round(units * graneroBonus);

  // Cream separator: 10% of milk output becomes cream (remaining 90% stays as milk)
  const hasCreamSeparator = (state.buildings ?? []).includes('bld_cream_separator');
  const creamUnits = (hasCreamSeparator && animalType.productionType === 'milk')
    ? Math.floor(totalUnits * 0.1)
    : 0;
  const primaryUnits = totalUnits - creamUnits;

  const updatedInventory: Record<string, number> = {
    ...state.animalInventory,
    [animalType.productionType]: (state.animalInventory[animalType.productionType] ?? 0) + primaryUnits,
  };
  if (creamUnits > 0) {
    updatedInventory['cream'] = (state.animalInventory['cream'] ?? 0) + creamUnits;
  }

  set({
    animals: state.animals.map(a => a.id === animalId ? { ...a, lastProductionDay: nextDay } : a),
    animalInventory: updatedInventory,
  });
```

Key points:
- Only `productionType === 'milk'` triggers the split (covers vaca, cabra, bufalo — all have `productionType: 'milk'`)
- `creamUnits = Math.floor(totalUnits * 0.1)` — floor so cream is always whole units; no rounding error possible
- `primaryUnits = totalUnits - creamUnits` — primary milk is exactly `totalUnits - cream` (no double-counting)
- Cream stored under key `'cream'` in `animalInventory` (same `Record<string, number>` — any string key is valid)
- `sellAnimalProduct('cream', n)` already works because `cream` is now in `ANIMAL_PRODUCTS`

### Step 2: TypeScript check

```bash
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: no errors. If TypeScript complains about `updatedInventory['cream']` — the type is already `Record<string, number>` so string indexing is valid.

### Step 3: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): cream separator splits milk collection — 10% cream, 90% milk"
```

---

## Dependency Order

- Task 1 (data) must complete before Tasks 2 and 3 (which reference building IDs from that data)
- Tasks 2 and 3 are independent of each other — implement in any order after Task 1

## Known Challenges

1. **`as const` on `category`** — `buildingTypes.ts` may or may not require `as const` on the `category` field. Look at existing entries; if they use `category: 'production'` without `as const`, omit it from the new entries.
2. **`graneroBonus` refactor in Task 3** — The existing code calls `Math.round(units * graneroBonus)` inline. Task 3 extracts this into `const totalUnits`. Make sure the original single-line `set()` call is fully replaced, not left alongside the new code.
3. **Cream and the price fluctuation system** — `state.animalPrices` is updated each day by a dynamic pricing block. `cream` won't have a dynamic price (it's not seeded in the fluctuation system). The `livePrice = (state.animalPrices ?? {})[productType] ?? product.basePrice` fallback in `sellAnimalProduct` already handles this — it falls back to `product.basePrice` ($4.50) for cream. No change needed.
4. **Goat milk and buffalo milk** — These animals have `productionType: 'milk'` in `ANIMAL_TYPES`, so they also produce cream when the separator is owned. This is the correct behaviour (cream can be extracted from any dairy milk).
