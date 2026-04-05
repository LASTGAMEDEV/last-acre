# Realistic Animal Production — Design Spec
**Date:** 2026-04-05
**Status:** Approved

---

## Overview

Replace the current flat `days × rate` animal production model with a realistic livestock management layer consisting of four interlocking systems:

1. **Feed system** — animals require specific feed; consumption deducted each day advance
2. **Hay production** — new Grass crop + Henil building to produce hay
3. **Lactation cycles** — cows and goats only produce milk after giving birth
4. **Seasonal production curves** — all animals have season-aware output multipliers

---

## 1. Feed System

### Feed Types

| Feed | Consumed by | Source |
|------|-------------|--------|
| `grain` | Chickens, ducks, quail, turkeys, pigs, rabbits | Wheat or corn (already in game) |
| `hay` | Cows, buffalo, horses, goats, sheep, alpacas | Grass crop → Henil building |
| *(none)* | Bees | Self-sufficient, forage naturally |

### Daily Consumption per Mature Animal

| Animal | Feed | kg/day |
|--------|------|--------|
| Chicken | grain | 0.12 |
| Duck | grain | 0.18 |
| Quail | grain | 0.03 |
| Turkey | grain | 0.25 |
| Cow | hay | 15 |
| Buffalo | hay | 18 |
| Horse | hay | 9 |
| Goat | hay | 2 |
| Sheep | hay | 1.8 |
| Alpaca | hay | 1.6 |
| Pig | grain (or any harvested crop) | 2.5 |
| Rabbit | grain | 0.18 |

Immature animals (below maturity threshold) consume **50% feed** — they're smaller and not yet producing.

### Pig Omnivore Rule

Pigs consume from `animalInventory['grain']` first. If grain is depleted, they draw from any harvested crop in inventory, converted 1:1 by weight (e.g. 2.5 kg corn, carrots, or potatoes substitutes for 2.5 kg grain). This makes pigs the most forgiving animals to keep fed.

### Production Penalty

Penalty is calculated based on the rolling **7-day feed ratio** (days fed / 7):

| Feed ratio | Production modifier |
|------------|-------------------|
| ≥ 80% | ×1.0 (no penalty) |
| 50–79% | ×0.7 (−30%) |
| < 50% | ×0.4 (−60%), sick chance ×2 |

A new field `feedMissedDays: number` is added to `OwnedAnimal` to track consecutive missed days for penalty calculation.

### Worker Automation

An **animal keeper** or **zootech** worker automatically deducts feed from stock each day advance — the player does not need to take any action. However, **feed stock must still be maintained by the player**. If stock runs out, animals go underfed regardless of having a worker. Without a worker, feeding must be triggered manually via a "Feed All" button in the animals tab.

### Winter Feed Surcharge

In Winter (days 271–365 of each year), all animals consume **+15% feed** (animals burn more energy staying warm). This stacks with the seasonal production reduction — Winter hurts on both ends.

---

## 2. Hay Production

### Grass — New Crop

| Property | Value |
|----------|-------|
| `id` | `'grass'` |
| Name | Grass / Hierba |
| Growth time | 7 days |
| Harvest yield | 40 kg wet grass per parcel |
| Base sell price | $0.05/kg (very low — incentivises drying) |
| Season | Grows in Spring, Summer, Autumn; does not grow in Winter |

Grass uses the existing crop/field system with no special changes.

### Henil (Hay Drying Barn) — New Building

| Property | Value |
|----------|-------|
| `id` | `'henil'` |
| Name | Henil |
| Tier | 2 (same as establo) |
| Cost | $1,200 |
| Batch capacity | 200 kg wet grass per batch |
| Drying time | 3 days |
| Conversion ratio | 40 kg wet grass → 25 kg hay (~62%, realistic water loss) |
| Max concurrent batches | 2 |

### State

```typescript
henilQueue: Array<{
  batchId: string;
  wetGrassKg: number;
  startDay: number;
  readyDay: number;   // startDay + 3
}>
```

When `currentDay >= readyDay`, the batch completes and `Math.floor(wetGrassKg * 0.625)` kg of hay is added to `animalInventory['hay']`.

Hay is stored in the existing `animalInventory` record under key `'hay'`.

### Sizing Guide (for documentation/tooltip)

A player with 2 cows (30 kg hay/day) needs ~1 parcel of grass every 3–4 days to stay fed. Scaling reference: 10 cows ≈ 5 grass parcels in rotation plus 2–3 Henil batches running continuously.

---

## 3. Lactation Cycles

### New Fields on `OwnedAnimal`

```typescript
lactationStartDay?: number;    // day she last gave birth (cows & goats only)
lactationState?: 'lactating' | 'dry';
```

Only populated for `typeId` in `['cow', 'goat']`.

### Cycle Parameters

| Species | Lactating period | Dry period | Can breed after |
|---------|-----------------|------------|----------------|
| Cow | 305 days | 60 days | Day 30 of dry period |
| Goat | 200 days | 45 days | Day 20 of dry period |

### Milk Production Gate

Cows and goats produce **zero milk** when `lactationState === 'dry'` or when `lactationStartDay` is undefined (not yet freshened via breeding — only possible for animals born in-game from a non-freshened mother).

### Breeding Trigger

When a cow/goat successfully breeds and the offspring is born:
- `lactationStartDay` resets to `currentDay`
- `lactationState` set to `'lactating'`

The breed action already exists (`breedAnimal`); lactation reset is added as a side-effect.

### New Arrivals

Cows and goats bought from the market arrive already freshened:
```typescript
lactationStartDay = currentDay - randomInt(30, 150)
lactationState = 'lactating'
```

This ensures newly purchased animals are immediately productive.

### UI

The animal card replaces the generic maturity bar for cows/goats with a **lactation progress bar**:
- `'lactating'`: green bar — "Lactating (day 88 / 305)"
- `'dry'`: orange bar — "Dry period (32 days left)"
- Breed button remains hidden during dry period until breed-eligible day

---

## 4. Seasonal Production Curves

The year is 365 days. Season boundaries:
- Spring: days 1–90 (of current year cycle)
- Summer: days 91–180
- Autumn: days 181–270
- Winter: days 271–365

Season is calculated as `(currentDay - 1) % 365` to handle multi-year games.

### Production Multipliers

| Animal | Spring | Summer | Autumn | Winter |
|--------|--------|--------|--------|--------|
| Chicken, quail | 1.15 | 1.00 | 0.85 | 0.65 |
| Duck | 1.10 | 1.00 | 0.90 | 0.70 |
| Turkey | 1.00 | 1.00 | 1.10 | 0.80 |
| Cow, buffalo | 1.15 | 0.95 | 0.90 | 0.80 |
| Goat, sheep, alpaca | 1.20 | 1.00 | 0.85 | 0.75 |
| Pig, rabbit | 1.00 | 1.00 | 1.05 | 0.90 |
| Horse | 1.00 | 1.00 | 1.00 | 1.00 |
| Bee | 1.20 | 1.40 | 0.30 | 0.00 |

Bees produce nothing in Winter. This makes hive investment a strong Spring/Summer play with zero Winter return — players must plan cash flow accordingly.

### Application

The seasonal multiplier is applied as the final factor in `collectProduction()` after all other modifiers (genes, traits, age decay, feed penalty):

```
finalUnits = daysPassed × rate × ageMod × productiveMod × geneProdMod × feedMod × seasonMod
```

For lactating species, the lactation gate is checked before any multiplier calculation.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `engine/animals.ts` | Add `collectProduction` seasonal + feed + lactation logic; update `OwnedAnimal` interface |
| `data/animalTypes.ts` | Add `feedType` and `feedKgPerDay` fields to `AnimalType` |
| `data/cropTypes.ts` | Add `grass` crop |
| `data/buildingTypes.ts` | Add `henil` building |
| `store/useGameStore.ts` | Add `henilQueue`, feed deduction in `advanceDay`, `addToHenil` action, lactation state transitions, `feedAllAnimals` action |
| `app/(tabs)/animales.tsx` | Feed stock display, lactation bar, "Feed All" manual button (shown when no worker), seasonal modifier tooltip |
| `app/(tabs)/gestion.tsx` | Henil queue UI (days remaining per batch, add-to-queue button) |

---

## 6. Out of Scope

- Animal price fluctuation (separate backlog item)
- New enclosure building for grass/hay storage
- Feed market fluctuation (hay/grain prices stay fixed for now)
- Horses producing any output (still null productionType)
