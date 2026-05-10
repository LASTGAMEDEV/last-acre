
# Feed Ration Balancing

**Date:** 2026-05-10  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-05-realistic-animal-production-design.md` (animal production system), `2026-04-09-animal-production-buildings-design.md` (feed mill)

---

## 1. Executive Summary

Transform animal feeding from a binary "fed / not fed" system into a nutritional optimization puzzle. Each of 12 animal species has its own protein, energy, and roughage requirements. Players design custom feed rations by mixing available ingredients. Ration quality determines production tier: deficient rations cause production penalties and increased sick chance; optimal rations unlock full production; premium rations give a production bonus.

**Also fixes:** The unimplemented TODO at `useGameStore.ts:2312` — "apply doubled sick chance for underfed animals using `grainMissedDays` / `hayMissedDays`." This spec replaces the missed-days system with a proper nutritional deficit system.

---

## 2. Nutritional Requirements Per Species

Each animal type gets a `nutritionProfile` added to its `AnimalType` definition:

```ts
interface NutritionProfile {
  minProteinPct: number;      // % protein in diet — minimum for any production
  optProteinPct: number;      // % protein — full production
  premiumProteinPct: number;  // % protein — production bonus
  minEnergyMJPerDay: number;  // MJ/day minimum
  optEnergyMJPerDay: number;  // MJ/day for full production
  minRoughagePct: number;     // % of diet from hay/silage/pasture; 0 for monogastrics
  needsMinerals: boolean;     // if true, mineral_premix required for premium tier
}
```

| Species | Min protein% | Opt protein% | Premium protein% | Min roughage% | Needs minerals |
|---------|-------------|--------------|-----------------|---------------|----------------|
| `gallina` (chicken) | 14 | 16 | 18 | 0 | Yes |
| `vaca` (dairy cow) | 13 | 16 | 18 | 40 | Yes |
| `oveja` (sheep) | 9 | 11 | 13 | 35 | No |
| `cerdo` (pig) | 13 | 16 | 18 | 0 | No |
| `conejo` (rabbit) | 13 | 15 | 17 | 25 | No |
| `cabra` (goat) | 12 | 15 | 17 | 30 | No |
| `caballo` (horse) | 8 | 10 | 12 | 55 | No |
| `pato` (duck) | 13 | 15 | 17 | 0 | No |
| `alpaca` | 9 | 11 | 13 | 30 | No |
| `pavo` (turkey) | 16 | 19 | 22 | 0 | Yes |
| `codorniz` (quail) | 17 | 20 | 23 | 0 | Yes |
| `bufalo` (buffalo) | 12 | 14 | 16 | 40 | Yes |

**Roughage note:** For ruminants (vaca, oveja, cabra, bufalo, alpaca) and horses, roughage is digestively necessary — even a protein-adequate ration fails if roughage falls below the minimum.

---

## 3. Feed Ingredients

### 3a. Ingredients From Existing Inventory

These are already in the game's inventory system. Their nutritional values are read directly:

| Ingredient | Source | Protein % | Energy MJ/kg | Roughage % |
|-----------|--------|-----------|-------------|-----------|
| `corn` | Crop harvest / market | 8.5 | 13.5 | 0 |
| `wheat` | Crop harvest / market | 12.5 | 12.5 | 0 |
| `barley` | Crop harvest / market | 11.0 | 12.0 | 3 |
| `oats` | Crop harvest / market | 10.5 | 11.5 | 8 |
| `sorghum` | Crop harvest / market | 9.0 | 13.0 | 0 |
| `soy` | Crop harvest / market | 36.0 | 13.0 | 0 |
| `hay` | `animalInventory['hay']` | 10.0 | 8.5 | 100 |
| `silage` | `silageLevel` | 7.0 | 10.5 | 60 |

**Pasture:** Animals in open enclosures (corral, caballeriza) with `irrigated` parcels adjacent get a free 2 kg pasture/day (protein 18%, energy 10.0 MJ/kg, 100% roughage). Non-irrigated pasture = 1 kg/day. Pasture access is automatic — no inventory deduction.

### 3b. New Purchasable Supplements

Two new items added to `animalInventory` and purchasable in Shop → Animals:

| Item | Price/kg | Protein % | Energy | Roughage % | Special |
|------|---------|-----------|--------|-----------|---------|
| `protein_meal` | $0.85/kg | 45 | 12.0 | 0 | Soy/canola meal concentrate |
| `mineral_premix` | $2.40/kg | 0 | 0 | 0 | Required for premium tier on flagged species |

`mineral_premix` is used in very small amounts: 0.01–0.03 kg/animal/day. If `needsMinerals: true` and ration contains `mineral_premix`, the premium production tier is reachable. Without it, production is capped at optimal tier regardless of protein/energy.

### 3c. Nutritional Values Table (Static Data)

```ts
// engine/nutrition.ts
export const FEED_NUTRITION: Record<string, { proteinPct: number; energyMJPerKg: number; roughagePct: number }> = {
  corn:           { proteinPct: 8.5,  energyMJPerKg: 13.5, roughagePct: 0   },
  wheat:          { proteinPct: 12.5, energyMJPerKg: 12.5, roughagePct: 0   },
  barley:         { proteinPct: 11.0, energyMJPerKg: 12.0, roughagePct: 3   },
  oats:           { proteinPct: 10.5, energyMJPerKg: 11.5, roughagePct: 8   },
  sorghum:        { proteinPct: 9.0,  energyMJPerKg: 13.0, roughagePct: 0   },
  soy:            { proteinPct: 36.0, energyMJPerKg: 13.0, roughagePct: 0   },
  hay:            { proteinPct: 10.0, energyMJPerKg: 8.5,  roughagePct: 100 },
  silage:         { proteinPct: 7.0,  energyMJPerKg: 10.5, roughagePct: 60  },
  protein_meal:   { proteinPct: 45.0, energyMJPerKg: 12.0, roughagePct: 0   },
  mineral_premix: { proteinPct: 0,    energyMJPerKg: 0,    roughagePct: 0   },
};
```

---

## 4. Ration Design

### 4a. Per-Species Saved Ration

```ts
interface FeedRation {
  animalTypeId: string;
  ingredients: Array<{
    ingredientId: string;  // 'corn', 'hay', 'soy', etc.
    pct: number;           // % of total diet by weight (must sum to ~100)
  }>;
  mineralPremixKgPerAnimalPerDay: number;  // 0 if not included
}
```

`savedRations: Record<string, FeedRation>` stored in `GameState`. One ration per animal species — applies to all animals of that type. Default: the current flat grain+hay mix (auto-generated from existing `feedKgPerDay` data to prevent save migration issues).

### 4b. Ration Analysis

```ts
interface RationAnalysis {
  proteinPct: number;
  energyMJPerDay: number;  // computed per animal based on feedKgPerDay
  roughagePct: number;
  hasMinerals: boolean;
  tier: 'deficient' | 'adequate' | 'optimal' | 'premium';
  costPerAnimalPerDay: number;
  issues: string[];  // human-readable problems, e.g. "Protein too low (12% < 14% minimum)"
}
```

`analyzeRation(ration, animalType, availableIngredients): RationAnalysis` in `engine/nutrition.ts`.

**Tier determination:**
```
if protein < minProteinPct OR energy < minEnergyMJPerDay OR roughage < minRoughagePct:
  tier = 'deficient'
elif protein >= premiumProteinPct AND energy >= optEnergyMJPerDay AND (needsMinerals → hasMinerals):
  tier = 'premium'
elif protein >= optProteinPct AND energy >= optEnergyMJPerDay:
  tier = 'optimal'
else:
  tier = 'adequate'
```

### 4c. Preset Rations

Each species has 3 auto-generated presets the player can one-tap apply:

- **Cheapest:** Solves a simple LP: minimize cost per kg subject to meeting minimum protein, energy, and roughage requirements. Uses cheapest available ingredients first.
- **Optimal:** Hits `optProteinPct` + `optEnergyMJPerDay` using a balanced mix. Tends to rely on mid-tier grain + some soy.
- **Premium:** Hits `premiumProteinPct` + includes `mineral_premix` where needed. Most expensive.

Presets are computed at display time based on current inventory prices and availability — not hardcoded.

---

## 5. Production Effects

### 5a. Ration Outcome Modifiers

Applied during `advanceDay()` animal production:

| Tier | Production modifier | Sick chance modifier |
|------|--------------------|--------------------|
| `deficient` | ×0.65 (−35%) | ×2.5 (implements TODO at line 2312) |
| `adequate` | ×0.90 (−10%) | ×1.0 |
| `optimal` | ×1.00 (baseline) | ×1.0 |
| `premium` | ×1.08 (+8%) | ×0.85 (slight health benefit) |

**Deficient ration notification** (fires once per week if ongoing): *"⚠️ Your [chickens] are malnourished — protein too low (11% vs 14% minimum). Production is reduced 35%."*

### 5b. Feed Deduction

The existing grain + hay deduction loop (`advanceDay` around line 3819) is replaced:
- Read the saved ration for each species group
- Calculate total kg of each ingredient needed: `kgPerAnimal × count × ingredientPct`
- Deduct from inventory in priority order
- If any ingredient is unavailable: substitute with whatever is available and recalculate the ration tier (shortage = likely deficient)

### 5c. Removing `grainMissedDays` / `hayMissedDays`

These fields are superseded by the ration system. Keep them in state for backwards compatibility (old save migration) but stop using them for production effects. Their values become permanently 0 once the ration system is active.

---

## 6. Ration Designer UI

### 6a. Location

New sub-tab **"Nutrition"** in the Farm tab → Animals screen:

```
[Animals] [Nutrition] [Breeding] ...
```

### 6b. Species Picker

List of owned species (no entry for unowned animals). Tap to open that species' ration designer.

### 6c. Ration Designer Panel

```
🐔 Chickens — Feed Ration Designer
────────────────────────────────────────────────
  Current ration:  Corn 60% · Hay 30% · Soy 10%

  Protein:    ████████░░  14.7%  ✅ Meets minimum (14%)
  Energy:     █████████░  11.3 MJ  ✅ Adequate
  Roughage:   ░░░░░░░░░░  0%  ✅ OK (monogastric)
  Minerals:   ✅ Included

  Tier:  OPTIMAL  →  Full production

  Cost:  $0.09 / chicken / day
  ─────────────────────────────────────────────
  [Cheapest $0.06] [Optimal $0.09] [Premium $0.14]
  ─────────────────────────────────────────────
  INGREDIENTS
  Corn         [────────────────────] 60%  ✓ In stock (840 kg)
  Wheat        [────────────────────]  0%  ✓ In stock
  Soy          [────────────────────] 10%  ✓ In stock (220 kg)
  Hay          [────────────────────] 30%  ✓ In stock (1,200 kg)
  Barley       [────────────────────]  0%
  Protein Meal [────────────────────]  0%  ✗ Not in stock
  ─────────────────────────────────────────────
  Mineral premix: [ON] 0.02 kg/day  (adds $0.05/day)
  ─────────────────────────────────────────────
  [Save Ration]   [Reset to Default]
```

Sliders for each ingredient are drag-adjustable. Protein/Energy/Roughage indicators update live. The tier chip and cost update live. "Save Ration" persists to `savedRations`.

### 6d. Issues List

If tier is `deficient`, a red banner appears:
```
⚠️ Issues:
• Protein too low: 11.2% (need ≥14%)
• Roughage adequate ✅
• Energy adequate ✅
```

### 6e. Cost Comparison Card

Below the designer, a small card shows daily cost for all owned animals of this species:
```
60 chickens × $0.09/day = $5.40/day   vs.   cheapest viable: $3.60/day
```

---

## 7. Pasture Integration

### 7a. Auto-Pasture Detection

Animals in `corral` and `caballeriza` enclosures are assumed to have pasture access. Pasture contribution is automatically added to ration analysis:

```ts
function getPastureKgPerDay(animalTypeId: string, state: GameState): number {
  const hasOwnedParcels = state.parcels.some(p => p.owned && !p.plantedCrop);
  if (!hasOwnedParcels) return 0;
  const hasIrrigation = state.parcels.some(p => p.owned && p.irrigated && !p.plantedCrop);
  return hasIrrigation ? 2.0 : 1.0;  // kg/animal/day
}
```

Pasture is free (no inventory deduction). Shown in the designer as a gray locked row: *"Pasture: +1.0 kg/day (automatic, based on owned idle parcels)"*

### 7b. Seasonal Pasture

In winter, pasture contribution drops to 0.3 kg/day (frost). Summer peak: +20% bonus (lush grass). These modifiers apply automatically and don't require player action.

---

## 8. Homegrown vs. Purchased Comparison

### 8a. Grow-Your-Own Benefit

The ration designer shows a "Grow Your Own" panel when ingredients are being purchased from the market:

```
💡 Growing 5ha of Soy would save ~$1,200/year in feed costs
   (currently buying 8 kg/day at $0.49/kg)
```

This is a read-only suggestion — no action required from the spec. It simply reads current market price of grain crops vs. their estimated self-grown cost.

---

## 9. State Changes

### 9a. New GameState fields

```ts
savedRations: Record<string, FeedRation>;  // keyed by animalTypeId; default = {}
```

### 9b. AnimalType additions (`data/animalTypes.ts`)

```ts
interface AnimalType {
  // ... existing fields ...
  nutritionProfile: NutritionProfile;
}
```

### 9c. New inventory items

Two new keys in `animalInventory`:
- `'protein_meal'`: purchasable supplement
- `'mineral_premix'`: purchasable supplement

### 9d. Save key

No bump needed — `savedRations` defaults to `{}` (ration system uses computed defaults from existing `feedKgPerDay`).

### 9e. Remove

- `grainMissedDays` and `hayMissedDays` remain in state (backwards compat) but are set to 0 each day — no longer used for production effects.

---

## 10. Implementation Order

### Phase 1 — Data
1. Define `NutritionProfile` and `FeedRation` interfaces in `types/index.ts`
2. Add `nutritionProfile` to each animal type in `data/animalTypes.ts` (12 profiles from §2)
3. Create `engine/nutrition.ts` with `FEED_NUTRITION` table, `analyzeRation()`, preset generators
4. Add `savedRations: {}` to initial `GameState`
5. Add `protein_meal` and `mineral_premix` to Shop animal products

### Phase 2 — Store Logic
6. Add `saveRation(animalTypeId, ration: FeedRation)` store action
7. Rewrite feed deduction block in `advanceDay()`:
   - Read `savedRations[animalTypeId]` for each species group
   - Deduct ingredients by ration proportions
   - Compute `RationAnalysis` per species group
   - Apply production modifier and sick chance modifier
   - Fire weekly deficiency notification if applicable
8. Neutralize `grainMissedDays` / `hayMissedDays` (set to 0, stop mutating based on feed shortage)
9. Add pasture auto-detection to ration analysis
10. Add seasonal pasture modifier

### Phase 3 — UI
11. Add "Nutrition" sub-tab to Farm → Animals screen
12. Build `NutritionTab.tsx` — species picker → ration panel
13. Build `RationDesigner.tsx` — sliders, live indicators, preset buttons, cost display
14. Add "Grow Your Own" suggestion card
15. Update DaySummaryModal to include deficient-tier warning if applicable

---

## 11. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Granularity | Per animal species (12 profiles) |
| 2 | Life stage tracking | No — single profile per species (adult). Growth stage excluded. |
| 3 | Preset generation | Computed at display time from current prices, not hardcoded |
| 4 | Pasture | Auto-detected from owned idle parcels; free, seasonal |
| 5 | grainMissedDays removal | Kept in state (save compat), zeroed out — ration system takes over |
| 6 | Premium gate (minerals) | Only gallina, vaca, pavo, codorniz, bufalo need mineral_premix for premium |

---

## 12. Out of Scope

- Life stage rations (calf vs. adult cow)
- TMR (total mixed ration) mixing equipment
- Feed inventory spoilage / storage time
- Rumen pH simulation
- Amino acid tracking (just protein %)
- Per-animal custom rations (one ration per species)

---

## 13. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/nutrition.ts`, `components/farm/NutritionTab.tsx`, `components/farm/RationDesigner.tsx` |
| **Modify** | `types/index.ts` (NutritionProfile, FeedRation, GameState), `data/animalTypes.ts` (nutritionProfile per type), `store/useGameStore.ts` (rewrite feed deduction, add saveRation action), `app/(tabs)/animales.tsx` or Farm Animals screen (new sub-tab) |
| **Remove logic** | `grainMissedDays` / `hayMissedDays` production effects (state fields remain for migration) |
