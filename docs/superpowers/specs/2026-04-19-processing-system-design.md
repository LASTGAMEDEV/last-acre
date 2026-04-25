# Processing System Design
**Date:** 2026-04-19  
**Status:** Approved  
**Save key:** granja-tycoon-save-v6 (same bump as workers + electricity)

---

## Overview

The processing system lets players transform raw farm outputs into finished goods sold at higher margins through the farm shop and other channels. Everything is artisan-scale — the guiding rule is: *"Could a farm make this with the right equipment and sell it at their own shop?"* Think Clarkson's Diddly Squat Farm Shop, not an industrial processing plant.

Processing is organised into four stages:
- **Stage 1 — Basic Equipment:** preparation and conditioning (drying, grading, pasteurising)
- **Stage 2 — Processing Rooms:** first transformation (milling, pressing, butchery, preserving)
- **Stage 3 — Craft Production:** finished goods requiring combined inputs (baking, brewing, cheesemaking)
- **Stage 4 — Premium & Aged:** time-intensive high-value products (cave cheese, spirits, cured meats)

---

## Buildings

Each building is a discrete structure the player builds on their farm. Buildings are unlocked in tier order; you cannot build Tier 2 without first having Tier 1. Higher tiers cost more but increase batch size, unlock additional recipes, and raise the quality ceiling.

### Tier Effects
| Tier | Batch multiplier | Quality ceiling | Additional recipes |
|------|-----------------|-----------------|-------------------|
| 1    | 1×              | 70              | Base set          |
| 2    | 2×              | 85              | Mid-tier recipes  |
| 3    | 4×              | 100             | Premium recipes   |

### Stage 1 — Basic Equipment

| Building | Inputs | Outputs | Notes |
|----------|--------|---------|-------|
| Grain Dryer & Store | Cereals (wheat, barley, oats, corn, rye, sorghum) | Dried stored grain | Sell direct or forward to mill/malting |
| Malting Floor | Barley, rye, wheat | Malted grain | Required for brewing and distilling |
| Feed Mixer | Grain + soy + alfalfa | Compound animal feed | Saleable to other farms |
| Milk Pasteuriser | Raw milk (cow, goat, sheep, buffalo) | Pasteurised milk | Required before all dairy processing |
| Licensed Abattoir | Livestock (cattle, pigs, sheep, poultry, rabbits) | Carcasses, hides, fat, bones | Requires Butcher worker + hygiene licence |
| Egg Washer & Grader | Raw eggs | Graded packed eggs | Graded eggs command premium shop price |
| Drying Rack & Kiln | Lavender, saffron, vanilla, ginseng, herbs, tomatoes, fruit | Dried herbs, dried saffron threads, cured vanilla, dried fruit | Sells direct or feeds Tinning Room |
| Fibre Prep | Raw cotton, raw wool | Cleaned cotton lint, scoured wool | Feeds textile workshop |

### Stage 2 — Processing Rooms

| Building | Inputs | Outputs |
|----------|--------|---------|
| Stone Flour Mill | Dried wheat, oats, rye, barley | Stoneground flour |
| Olive Press | Olives | Extra virgin olive oil, pomace, brine |
| Nut Roaster & Press | Almonds | Roasted almonds, almond flour, almond butter |
| Dairy Room | Pasteurised milk | Butter, cream, yoghurt, sour cream, crème fraîche |
| Cheese Room | Pasteurised milk | Fresh soft cheese, curds (feeds Cheese Ageing Room) |
| Farm Butchery | Carcasses | Retail cuts, mince, sausages |
| Lard & Bone Meal Room | Animal fat, bones | Cooking lard, bone meal fertiliser |
| Fruit Press | Apples, pears, grapes, strawberries | Fresh pressed juice, must (for wine/cider) |
| Tomato Kitchen | Tomatoes | Tomato paste, passata, sundried tomatoes |
| Preserving Kitchen | Strawberries, grapes, tomatoes, herbs | Jams, chutneys, pickles, sauces |
| Tinning & Packaging Room | Dried saffron, dried herbs, lavender, vanilla, ginseng | Saffron tins, dried herb tins, gift-boxed vanilla pods, branded spice sets |
| Small Still | Lavender, herbs | Lavender essential oil, herbal waters |
| Honey Room | Raw honey, beeswax | Filtered honey, creamed honey, infused honey |
| Wax Workshop | Beeswax, tallow | Candles, beeswax wraps, wood polish, basic soap |
| Wool & Fibre Workshop | Clean wool, cotton, flax | Yarn, undyed wool, linen thread |
| Small Leather Workshop | Hides | Tanned leather, small leather goods |

### Stage 3 — Craft Production

| Building | Inputs | Outputs |
|----------|--------|---------|
| Farm Bakery | Flour + eggs + butter | Bread, scones, pastries, shortbread |
| Pasta Workshop | Flour + eggs | Fresh pasta, dried pasta |
| Ice Cream Churner | Cream + milk + eggs + flavours | Artisan ice cream, gelato |
| Cheese Ageing Room | Fresh curds (from Cheese Room) | Hard cheese, aged cheese (months–years) |
| Curing & Smoking Room | Cuts + salt + spices + wood chips | Smoked bacon, ham, sausages, salami |
| Farm Winery | Grape must + yeast | Table wine, rosé, sparkling wine |
| Micro-Brewery | Malted grain + hops + water | Craft ales, stouts, lagers |
| Cider House | Pressed juice + yeast | Still cider, sparkling cider, fruit wine |
| Small Batch Distillery | Malted grain, molasses, fruit wine | Gin, vodka, new make spirit |
| Infused Oil Kitchen | Olive oil + garlic / herbs / chilli | Infused olive oils, dressings |
| Vinegar Barrel Room | Wine, cider, malt | Wine vinegar, cider vinegar |
| Infusion & Extract Kitchen | Vanilla, saffron, ginseng | Vanilla extract, saffron water, ginseng tincture |

### Stage 4 — Premium & Aged

| Building | Inputs | Outputs | Minimum age |
|----------|--------|---------|-------------|
| Cave-Aged Cheese | Aged cheese (from Ageing Room) | Parmesan-style, cheddar, blue | 12–36 months |
| Wine Cellar | Farm winery output | Barrel-aged wine, reserve bottles | 6–24 months |
| Spirit Maturation Casks | Small batch distillery output | Aged whisky, brandy, rum | 3–12 years |
| Bottle-Conditioned Ales | Micro-brewery output | Bottle-conditioned ales, gift-boxed | 4–12 weeks |
| Long-Cured Meats | Curing room output | Aged prosciutto, dry-cured ham | 6–18 months |
| Aged Balsamic | Vinegar + oak barrels | 5yr, 10yr aged balsamic vinegar | 5–10 years |

---

## Quality System

Every processed good carries a quality score from 0–100.

### Score calculation
```
finalQuality = clamp(inputQuality × inputWeight + buildingBonus + workerBonus, 0, qualityCeiling)
```

- **inputQuality** — weighted average of all input goods' quality scores
- **inputWeight** — 0.6 (inputs account for 60% of base score; you cannot rescue bad inputs)
- **buildingBonus** — Tier 1: +0, Tier 2: +10, Tier 3: +20
- **workerBonus** — worker's skill level in that production area: 0–20 points
- **qualityCeiling** — hard cap imposed by building tier (70 / 85 / 100)

### Quality tiers (display labels)
| Score | Label |
|-------|-------|
| 0–39  | Poor |
| 40–59 | Standard |
| 60–74 | Good |
| 75–89 | Premium |
| 90–100 | Artisan |

### Quality and price
Sell price scales linearly with quality score. A 90-quality saffron tin sells for ~2.5× a 50-quality one. Quality is stored per batch, not per unit.

---

## Processing Time

Processing is time-based — batches take real in-game days to complete. Workers are assigned to a building and work continuously; the batch completes when its timer expires on `advanceDay()`.

| Stage | Typical duration |
|-------|-----------------|
| Stage 1 | 0–2 days (grading, drying quick crops) |
| Stage 2 | 1–5 days |
| Stage 3 | 2–14 days |
| Stage 4 | 30 days – 10 years (expressed in game-days) |

Aged products (Stage 4) run passively in storage. The player does not need to interact with them after loading the batch — they simply mature over time and become available when ready.

---

## Spoilage & Shelf Life

Every processed good has a shelf life. Once the shelf life expires the good is lost. Value decays gradually in the final quarter of shelf life — the player sees a warning at 25% remaining and the item shows reduced value. Cold storage (a purchasable building upgrade) multiplies shelf life by a configurable factor per category.

### Shelf life categories

| Category | Base shelf life | Cold storage multiplier | Notes |
|----------|----------------|------------------------|-------|
| Fresh dairy (milk, cream, yoghurt) | 3 days | 4× | |
| Fresh meat (retail cuts, mince) | 2 days | 5× | |
| Fresh baked goods (bread, pastries) | 2 days | 2× | |
| Fresh pasta | 4 days | 3× | |
| Ice cream / gelato | 7 days | 8× | Must be frozen |
| Fresh juice | 3 days | 4× | |
| Eggs (graded) | 21 days | 2× | |
| Pasteurised bottled milk | 10 days | 3× | |
| Hard cheese (aged) | 60 days | 2× | Improves in quality up to optimal age |
| Soft cheese | 14 days | 3× | |
| Sausages (fresh) | 5 days | 4× | |
| Smoked / cured meats | 90 days | 2× | |
| Long-cured meats (prosciutto etc.) | 365 days | 1.5× | |
| Butter | 30 days | 3× | |
| Flour | 180 days | 1× | No cold storage benefit |
| Dried herbs / saffron / spices | 365 days | 1× | |
| Saffron tins / packaged spices | 730 days | 1× | |
| Jams, pickles, chutneys | 365 days | 1× | |
| Tomato paste / passata | 365 days | 1× | |
| Olive oil | 540 days | 1× | |
| Infused oils | 180 days | 1.5× | |
| Wine / cider / beer | 180 days | 1.5× | Stage 4 aged wines: 1825 days |
| Spirits (bottled) | 1825 days | 1× | |
| Aged spirits (in cask) | No expiry while in cask | — | Removed from cask = bottled |
| Vinegar | 730 days | 1× | |
| Honey | 1825 days | 1× | |
| Candles / wax goods | 730 days | 1× | |
| Yarn / leather goods | 1825 days | 1× | |
| Animal feed (compound) | 90 days | 1× | |

### Value decay curve
At 100%–25% shelf life remaining: full value.  
At 25%–0%: value scales linearly from 100% → 40% of sell price.  
At 0%: item is destroyed, removed from inventory, event logged.

---

## Workers

Each processing building requires at least one assigned worker from the **processing department**. A building without a worker produces nothing. Worker skill in the relevant production area determines the worker bonus applied to the quality formula.

### Processing worker roles

| Role | Buildings |
|------|-----------|
| Grain Handler | Grain Dryer & Store, Malting Floor, Feed Mixer |
| Dairy Hand | Milk Pasteuriser, Dairy Room |
| Cheesemaker | Cheese Room, Cheese Ageing Room, Cave-Aged Cheese |
| Butcher | Licensed Abattoir, Farm Butchery |
| Charcutier | Curing & Smoking Room, Long-Cured Meats |
| Baker | Farm Bakery, Pasta Workshop |
| Press Operator | Olive Press, Nut Roaster & Press, Fruit Press |
| Preserve Maker | Tomato Kitchen, Preserving Kitchen, Tinning & Packaging Room |
| Brewer | Micro-Brewery, Bottle-Conditioned Ales |
| Winemaker | Farm Winery, Wine Cellar |
| Cider Maker | Cider House |
| Distiller | Small Batch Distillery, Spirit Maturation Casks |
| Herbalist | Small Still, Drying Rack & Kiln, Infusion & Extract Kitchen |
| Honey & Wax Worker | Honey Room, Wax Workshop |
| Textile Worker | Wool & Fibre Workshop, Fibre Prep |
| Leatherworker | Small Leather Workshop |
| Ice Cream Maker | Ice Cream Churner |
| Packager | Tinning & Packaging Room (secondary) |

Each role has its own skill tree branch within the processing department, consistent with the workers spec. A worker can be reassigned between buildings that share the same role. Cross-role assignment is not allowed — a Baker cannot run the Cheese Room.

The Licensed Abattoir additionally requires the worker to hold a **Slaughter Licence** (a certification purchased through the same certification system defined in the workers spec).

---

## Processing State (TypeScript)

```typescript
interface ProcessingBatch {
  id: string;
  buildingId: string;
  recipeId: string;
  startDay: number;
  completionDay: number;
  inputSnapshot: Record<string, number>; // itemId → quantity consumed
  outputItemId: string;
  outputQuantity: number;
  quality: number; // 0–100, computed at batch start
}

interface ProcessedItem {
  itemId: string;
  quantity: number;
  quality: number;         // 0–100
  producedDay: number;
  expiryDay: number;       // producedDay + shelfLife (modified by cold storage)
}

interface ProcessingBuilding {
  id: string;
  buildingTypeId: string;
  tier: 1 | 2 | 3;
  assignedWorkerIds: string[];
  activeBatchId?: string;
  hasColdStorage: boolean;
}

interface ProcessingState {
  buildings: ProcessingBuilding[];
  activeBatches: ProcessingBatch[];
  processedInventory: ProcessedItem[]; // replaces flat Record<string,number>
}
```

`processedInventory` changes from a flat `Record<string, number>` to `ProcessedItem[]` so each batch tracks its own quality and expiry independently. The existing `processedInventory` key in the store is replaced; save key bumps to v6.

---

## Data: Recipes

Each recipe is a static definition:

```typescript
interface Recipe {
  id: string;
  name: string;
  buildingTypeId: string;
  minBuildingTier: 1 | 2 | 3;
  inputs: { itemId: string; quantity: number }[];
  outputItemId: string;
  baseOutputQuantity: number;  // at Tier 1, ×2 at Tier 2, ×4 at Tier 3
  processingDays: number;
  electricityKwhPerDay: number;
}
```

---

## Data: Processed Item Definitions

```typescript
interface ProcessedItemDef {
  id: string;
  name: string;
  unit: string;
  basePrice: number;           // at quality 50
  shelfLifeDays: number;
  coldStorageMultiplier: number;
  agingImproves: boolean;      // true for cheese, wine, spirits, balsamic
  optimalAgeDays?: number;     // day at which quality peaks if agingImproves
}
```

---

## Electricity Integration

All processing buildings draw power. If power is cut (load shedding or outage) a building pauses its active batch — the batch timer freezes and resumes when power returns. Refrigerated storage loses cold-storage benefits during outages, accelerating spoilage of affected items.

Each building's `electricityKwhPerDay` is defined per recipe. Stage 4 passive aging uses minimal standby power (0.5–2 kWh/day per unit of storage).

---

## advanceDay() Integration

On each tick:
1. Advance all active batch timers; complete any where `completionDay <= currentDay`
2. Move completed batches into `processedInventory` as `ProcessedItem` entries
3. For each `ProcessedItem`, check if `currentDay >= expiryDay`; destroy expired items and log event
4. Apply value decay warning flags for items within 25% of expiry
5. Advance Stage 4 aging timers; apply quality improvement curve for items where `agingImproves === true`

---

## Integration with Other Systems

- **Workers spec:** Processing roles are a sub-department of the existing `processing` WorkerDepartment. Skill tree branches map to the roles table above.
- **Electricity spec:** Buildings draw power per the `electricityKwhPerDay` field. Outages pause batches and degrade cold storage.
- **Selling channels spec (TBD):** Processed goods flow into the farm shop, buyer contracts, and spot sales.
- **Breeds spec:** Higher-quality animal breeds produce higher base-quality milk, meat, eggs — directly improving processed good quality ceilings via the input quality factor.
- **Price engine spec:** Processed good base prices are indexed to commodity prices where applicable (e.g. flour price tracks wheat price).
