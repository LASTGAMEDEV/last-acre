# Spec 09: Feed Ration Balancing

**Tier:** 3 — System Interconnections  
**Status:** Draft  
**Dependencies:** Existing animal system, crop system, market system, inventory system. Integrates with Spec 06 (storage quality), Spec 08 (manure production).

---

## 1. Objective

Transform animal feeding from a **binary "fed / not fed" toggle** into a **strategic optimization puzzle** where the player designs rations from raw ingredients, balances nutrients against costs, and decides whether to grow feed crops on farm or buy concentrate. Animal profitability becomes a math problem: the cheapest ration may cut production; the premium ration may eat margins. The player must find the sweet spot for each animal group and life stage.

---

## 2. Design Principles

1. **Nutrition is per-animal-type and per-life-stage:** Lactating dairy cows need different rations than growing calves or dry cows. One-size-fits-all = suboptimal.
2. **Ingredients have identities:** Corn from your own Field 3 is not identical to bought corn. Moisture, quality, and cost basis differ.
3. **Deficiencies hurt, excesses waste:** Low protein = lower milk. Excess protein = expensive urine. The goal is adequacy, not maximization.
4. **Homegrown vs. purchased is a land-use decision:** Growing soy uses hectares that could grow cash crops. The feed cost is opportunity cost, not just seed price.
5. **Rations are recipes:** Create once, assign to groups, tweak seasonally. Don't force daily micro-management.

---

## 3. Data Model

### 3.1 Feed Ingredient

```ts
// types/feed.ts
export interface FeedIngredient {
  id: string;
  name: string;
  category: 'grain' | 'protein' | 'forage' | 'roughage' | 'mineral' | 'supplement';
  source: 'homegrown' | 'purchased' | 'pasture';
  
  // Nutrition (per kg dry matter)
  nutrition: {
    dryMatterPercent: number;
    meMjPerKg: number;        // Metabolizable Energy (MJ/kg DM)
    crudeProteinPercent: number;
    crudeFiberPercent: number;
    starchPercent: number;
    sugarPercent: number;
    fatPercent: number;
    lysinePercent: number;    // key amino acid for pigs/poultry
    methioninePercent: number; // key for poultry
    calciumPercent: number;
    phosphorusPercent: number;
  };
  
  // Economics
  costPerKg: number;          // €/kg as-fed (includes homegrown cost basis)
  costBasis?: 'market' | 'productionCost' | 'opportunityCost';
  
  // Quality
  qualityGrade: 'premium' | 'standard' | 'feed' | 'moldy';
  moldSeverity: number;       // affects animal health
  mycotoxinRisk: number;      // 0–100, from poor storage (Spec 06)
}
```

### 3.2 Animal Nutritional Requirements

```ts
export interface NutritionalRequirements {
  animalTypeId: string;
  lifeStage: 'calf' | 'heifer' | 'lactating' | 'dry' | 'growing' | 'fattening' | 'maintenance';
  productionLevel: 'low' | 'medium' | 'high'; // e.g., high = 35L milk/day
  
  // Daily requirements (per head)
  dailyDmKg: { min: number; target: number; max: number };
  dailyMeMj: { min: number; target: number };
  crudeProteinPercent: { min: number; target: number; max: number };
  crudeFiberPercent: { min: number; target: number };
  starchPercent: { max: number }; // too much starch = acidosis
  calciumPercent: { min: number; max: number };
  phosphorusPercent: { min: number; max: number };
  
  // Ratios
  caPRatio: { min: number; max: number }; // calcium:phosphorus
  nElRatio: { min: number }; // protein:energy ratio
}
```

### 3.3 Ration Recipe

```ts
export interface RationRecipe {
  id: string;
  name: string;
  targetAnimalType: string;
  targetLifeStage: string;
  
  ingredients: RationIngredient[];
  
  // Computed totals (per kg DM)
  totalNutrition: {
    meMjPerKg: number;
    crudeProteinPercent: number;
    crudeFiberPercent: number;
    starchPercent: number;
    calciumPercent: number;
    phosphorusPercent: number;
  };
  
  // Economics
  costPerKgDm: number;
  costPerHeadPerDay: number;
  
  // Adequacy score
  adequacyScore: number;      // 0–100, how well it meets requirements
  deficiencies: string[];     // list of under-supplied nutrients
  excesses: string[];         // list of over-supplied nutrients
  
  // Production impact
  productionModifier: number; // 0.5–1.2 multiplier on milk/eggs/growth
  healthRiskModifier: number; // 1.0 = normal, >1.0 = acidosis/urodisiasis risk
  
  // Usage
  assignedToGroups: string[];
}

export interface RationIngredient {
  ingredientId: string;
  kgDmPerHeadPerDay: number;  // kg dry matter
  inclusionPercent: number;   // of total DM
}
```

### 3.4 Feeding Group

```ts
export interface FeedingGroup {
  id: string;
  name: string;
  animalIds: string[];
  animalType: string;
  lifeStage: string;
  count: number;
  
  assignedRationId: string | null;
  
  // Tracking
  dailyFeedCost: number;
  dailyDmConsumed: number;
  averageBodyCondition: number; // 1–5 scale, affects reproduction
  feedConversionRatio: number;  // kg feed / kg product
}
```

---

## 4. Static Data (`data/feedRequirements.ts`)

```ts
export const nutritionalRequirements: NutritionalRequirements[] = [
  {
    animalTypeId: 'dairyCow',
    lifeStage: 'lactating',
    productionLevel: 'high',
    dailyDmKg: { min: 18, target: 22, max: 26 },
    dailyMeMj: { min: 220, target: 280 },
    crudeProteinPercent: { min: 16, target: 18, max: 20 },
    crudeFiberPercent: { min: 18, target: 22 },
    starchPercent: { max: 30 },
    calciumPercent: { min: 0.8, max: 1.2 },
    phosphorusPercent: { min: 0.4, max: 0.6 },
    caPRatio: { min: 1.5, max: 2.5 },
    nElRatio: { min: 16 },
  },
  {
    animalTypeId: 'dairyCow',
    lifeStage: 'dry',
    productionLevel: 'low',
    dailyDmKg: { min: 10, target: 12, max: 14 },
    dailyMeMj: { min: 90, target: 110 },
    crudeProteinPercent: { min: 12, target: 13, max: 15 },
    crudeFiberPercent: { min: 25, target: 30 },
    starchPercent: { max: 20 },
    calciumPercent: { min: 0.5, max: 0.8 },
    phosphorusPercent: { min: 0.3, max: 0.4 },
    caPRatio: { min: 1.5, max: 2.5 },
    nElRatio: { min: 12 },
  },
  {
    animalTypeId: 'pig',
    lifeStage: 'growing',
    productionLevel: 'medium',
    dailyDmKg: { min: 1.5, target: 2.0, max: 2.5 },
    dailyMeMj: { min: 18, target: 24 },
    crudeProteinPercent: { min: 16, target: 18, max: 20 },
    crudeFiberPercent: { min: 5, target: 8 },
    starchPercent: { max: 50 },
    calciumPercent: { min: 0.7, max: 1.0 },
    phosphorusPercent: { min: 0.5, max: 0.7 },
    caPRatio: { min: 1.2, max: 1.8 },
    nElRatio: { min: 14 },
  },
  {
    animalTypeId: 'chicken',
    lifeStage: 'laying',
    productionLevel: 'high',
    dailyDmKg: { min: 0.1, target: 0.12, max: 0.14 },
    dailyMeMj: { min: 1.1, target: 1.3 },
    crudeProteinPercent: { min: 16, target: 18, max: 20 },
    crudeFiberPercent: { min: 3, target: 5 },
    starchPercent: { max: 40 },
    calciumPercent: { min: 3.5, max: 4.5 }, // layers need lots of Ca
    phosphorusPercent: { min: 0.35, max: 0.45 },
    caPRatio: { min: 6, max: 10 },
    nElRatio: { min: 16 },
  },
];

export const feedIngredients: FeedIngredient[] = [
  {
    id: 'cornGrain',
    name: 'Corn Grain',
    category: 'grain',
    source: 'homegrown',
    nutrition: { dryMatterPercent: 88, meMjPerKg: 13.5, crudeProteinPercent: 9, crudeFiberPercent: 3, starchPercent: 65, sugarPercent: 2, fatPercent: 4, lysinePercent: 0.25, methioninePercent: 0.18, calciumPercent: 0.03, phosphorusPercent: 0.28 },
    costPerKg: 0.22,
    qualityGrade: 'standard',
  },
  {
    id: 'soybeanMeal',
    name: 'Soybean Meal',
    category: 'protein',
    source: 'purchased',
    nutrition: { dryMatterPercent: 90, meMjPerKg: 13.0, crudeProteinPercent: 48, crudeFiberPercent: 6, starchPercent: 2, sugarPercent: 7, fatPercent: 2, lysinePercent: 2.8, methioninePercent: 0.65, calciumPercent: 0.3, phosphorusPercent: 0.7 },
    costPerKg: 0.45,
    qualityGrade: 'standard',
  },
  {
    id: 'alfalfaHay',
    name: 'Alfalfa Hay',
    category: 'forage',
    source: 'homegrown',
    nutrition: { dryMatterPercent: 90, meMjPerKg: 9.0, crudeProteinPercent: 18, crudeFiberPercent: 28, starchPercent: 2, sugarPercent: 5, fatPercent: 2, lysinePercent: 0.8, methioninePercent: 0.3, calciumPercent: 1.4, phosphorusPercent: 0.25 },
    costPerKg: 0.15,
    qualityGrade: 'standard',
  },
  {
    id: 'wheatGrain',
    name: 'Wheat Grain',
    category: 'grain',
    source: 'homegrown',
    nutrition: { dryMatterPercent: 88, meMjPerKg: 12.8, crudeProteinPercent: 13, crudeFiberPercent: 3, starchPercent: 60, sugarPercent: 2, fatPercent: 2, lysinePercent: 0.4, methioninePercent: 0.2, calciumPercent: 0.05, phosphorusPercent: 0.35 },
    costPerKg: 0.20,
    qualityGrade: 'standard',
  },
  {
    id: 'silageCorn',
    name: 'Corn Silage',
    category: 'roughage',
    source: 'homegrown',
    nutrition: { dryMatterPercent: 35, meMjPerKg: 11.0, crudeProteinPercent: 8, crudeFiberPercent: 20, starchPercent: 28, sugarPercent: 3, fatPercent: 3, lysinePercent: 0.2, methioninePercent: 0.15, calciumPercent: 0.25, phosphorusPercent: 0.22 },
    costPerKg: 0.08,
    qualityGrade: 'standard',
  },
  {
    id: 'mineralPremix',
    name: 'Mineral Premix (Dairy)',
    category: 'mineral',
    source: 'purchased',
    nutrition: { dryMatterPercent: 98, meMjPerKg: 0, crudeProteinPercent: 0, crudeFiberPercent: 0, starchPercent: 0, sugarPercent: 0, fatPercent: 0, lysinePercent: 0, methioninePercent: 0, calciumPercent: 22, phosphorusPercent: 12 },
    costPerKg: 1.20,
    qualityGrade: 'standard',
  },
];
```

---

## 5. Engine Logic (`engine/feed.ts`)

### 5.1 Ration Evaluation

```ts
export function evaluateRation(
  recipe: RationRecipe,
  requirements: NutritionalRequirements,
): { adequacyScore: number; deficiencies: string[]; excesses: string[]; productionModifier: number; healthRisk: number } {
  const deficiencies: string[] = [];
  const excesses: string[] = [];
  let adequacyScore = 100;
  
  // Check ME
  if (recipe.totalNutrition.meMjPerKg * requirements.dailyDmKg.target < requirements.dailyMeMj.target) {
    deficiencies.push('Energy (ME)');
    adequacyScore -= 20;
  }
  
  // Check protein
  if (recipe.totalNutrition.crudeProteinPercent < requirements.crudeProteinPercent.min) {
    deficiencies.push('Crude Protein');
    adequacyScore -= 25;
  } else if (recipe.totalNutrition.crudeProteinPercent > requirements.crudeProteinPercent.max) {
    excesses.push('Crude Protein (wasteful)');
    adequacyScore -= 5;
  }
  
  // Check fiber
  if (recipe.totalNutrition.crudeFiberPercent < requirements.crudeFiberPercent.min) {
    deficiencies.push('Crude Fiber (rumen health)');
    adequacyScore -= 15;
  }
  
  // Check starch (max)
  if (recipe.totalNutrition.starchPercent > requirements.starchPercent.max) {
    excesses.push('Starch (acidosis risk)');
    adequacyScore -= 10;
  }
  
  // Check Ca:P ratio
  const caP = recipe.totalNutrition.calciumPercent / recipe.totalNutrition.phosphorusPercent;
  if (caP < requirements.caPRatio.min || caP > requirements.caPRatio.max) {
    deficiencies.push('Ca:P ratio');
    adequacyScore -= 10;
  }
  
  // Production modifier: 0.6 at 0% adequacy, 1.0 at 100%, 1.05 at 110%
  const normalized = Math.max(0, Math.min(1.2, adequacyScore / 100));
  const productionModifier = 0.6 + (normalized * 0.45);
  
  // Health risk from excess starch or poor fiber
  let healthRisk = 1.0;
  if (recipe.totalNutrition.starchPercent > requirements.starchPercent.max * 1.2) healthRisk += 0.3;
  if (recipe.totalNutrition.crudeFiberPercent < requirements.crudeFiberPercent.min * 0.7) healthRisk += 0.2;
  
  return { adequacyScore, deficiencies, excesses, productionModifier, healthRisk };
}
```

### 5.2 Cost Optimizer

```ts
export function optimizeRationCost(
  requirements: NutritionalRequirements,
  availableIngredients: FeedIngredient[],
  targetAdequacy: number,
): RationRecipe | null {
  // Simplified greedy optimizer — can be replaced with LP solver later
  const sortedByCost = [...availableIngredients].sort((a, b) => a.costPerKg - b.costPerKg);
  
  let bestRecipe: RationRecipe | null = null;
  let bestCost = Infinity;
  
  // Try 50 random combinations within constraints
  for (let attempt = 0; attempt < 50; attempt++) {
    const ingredients: RationIngredient[] = [];
    let totalDm = 0;
    
    // Fill base with cheapest forage/grain
    const baseIngredient = sortedByCost[0];
    const baseKg = requirements.dailyDmKg.target * 0.5;
    ingredients.push({ ingredientId: baseIngredient.id, kgDmPerHeadPerDay: baseKg, inclusionPercent: 50 });
    totalDm += baseKg;
    
    // Add protein source if needed
    if (baseIngredient.nutrition.crudeProteinPercent < requirements.crudeProteinPercent.target) {
      const proteinSource = availableIngredients.find(i => i.category === 'protein');
      if (proteinSource) {
        const proteinKg = baseKg * 0.2;
        ingredients.push({ ingredientId: proteinSource.id, kgDmPerHeadPerDay: proteinKg, inclusionPercent: 20 });
        totalDm += proteinKg;
      }
    }
    
    // Add minerals
    const mineral = availableIngredients.find(i => i.category === 'mineral');
    if (mineral) {
      const mineralKg = totalDm * 0.02;
      ingredients.push({ ingredientId: mineral.id, kgDmPerHeadPerDay: mineralKg, inclusionPercent: 2 });
      totalDm += mineralKg;
    }
    
    // Normalize to 100%
    ingredients.forEach(ing => ing.inclusionPercent = (ing.kgDmPerHeadPerDay / totalDm) * 100);
    
    const recipe = buildRationFromIngredients(ingredients, availableIngredients, requirements);
    const evaluation = evaluateRation(recipe, requirements);
    
    if (evaluation.adequacyScore >= targetAdequacy && recipe.costPerKgDm < bestCost) {
      bestCost = recipe.costPerKgDm;
      bestRecipe = recipe;
    }
  }
  
  return bestRecipe;
}
```

### 5.3 Feed Conversion Ratio

```ts
export function calculateFeedConversionRatio(
  group: FeedingGroup,
  animalType: AnimalType,
): number {
  // kg DM consumed per kg of product
  const dailyDm = group.dailyDmConsumed / group.count;
  const dailyProductKg = animalType.dailyProductionKg * group.productionModifier; // e.g., liters milk
  
  if (animalType.category === 'dairy') {
    return dailyDm / dailyProductKg; // kg DM / kg milk
  } else if (animalType.category === 'meat') {
    const dailyGain = animalType.dailyGainKg;
    return dailyDm / dailyGain; // kg DM / kg gain
  } else if (animalType.category === 'poultry') {
    return dailyDm / (dailyProductKg / 1000); // kg DM / dozen eggs (simplified)
  }
  
  return 0;
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface FeedActions {
  // Ration design
  createRationRecipe(name: string, ingredients: RationIngredient[], target: { animalType: string; lifeStage: string }): void;
  updateRationRecipe(rationId: string, ingredients: RationIngredient[]): void;
  deleteRationRecipe(rationId: string): void;
  
  // Group management
  createFeedingGroup(name: string, animalIds: string[]): void;
  assignRationToGroup(groupId: string, rationId: string): void;
  
  // Ingredient sourcing
  buyFeedIngredient(ingredientId: string, quantityKg: number): void;
  harvestFeedCrop(parcelId: string, destination: 'feedInventory' | 'sale'): void;
  
  // Daily consumption
  consumeFeedForDay(): void; // subtracts from inventory based on group assignments
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickFeeding(state: GameState, day: number): void {
  state.feedingGroups.forEach(group => {
    if (!group.assignedRationId) {
      // No ration = default maintenance (poor production)
      group.productionModifier = 0.7;
      group.feedConversionRatio = 999;
      return;
    }
    
    const ration = state.rationRecipes.find(r => r.id === group.assignedRationId)!;
    const requirements = nutritionalRequirements.find(
      req => req.animalTypeId === group.animalType && req.lifeStage === group.lifeStage
    )!;
    
    // Check inventory sufficiency
    const canFeed = ration.ingredients.every(ing => {
      const available = state.feedInventory[ing.ingredientId] || 0;
      return available >= ing.kgDmPerHeadPerDay * group.count;
    });
    
    if (!canFeed) {
      state.notifications.push({
        day,
        type: 'feed',
        message: `Feed shortage for ${group.name}! Using emergency ration (production −30%).`,
        urgent: true,
      });
      group.productionModifier = 0.6;
      return;
    }
    
    // Consume feed
    ration.ingredients.forEach(ing => {
      const consume = ing.kgDmPerHeadPerDay * group.count;
      state.feedInventory[ing.ingredientId] = (state.feedInventory[ing.ingredientId] || 0) - consume;
    });
    
    // Apply production modifier
    group.productionModifier = ration.productionModifier;
    group.dailyFeedCost = ration.costPerHeadPerDay * group.count;
    group.dailyDmConsumed = ration.ingredients.reduce((s, i) => s + i.kgDmPerHeadPerDay, 0) * group.count;
    group.feedConversionRatio = calculateFeedConversionRatio(group, getAnimalType(group.animalType));
    
    // Health check from mycotoxins (Spec 06 integration)
    const mycotoxinExposure = ration.ingredients.reduce((sum, ing) => {
      const ingredient = getFeedIngredient(ing.ingredientId);
      return sum + (ingredient.mycotoxinRisk * ing.inclusionPercent / 100);
    }, 0);
    
    if (mycotoxinExposure > 30) {
      // Chance of health issue
      if (Math.random() < 0.05) {
        state.notifications.push({
          day,
          type: 'health',
          message: `Animals in ${group.name} showing signs of mycotoxin exposure. Check feed quality.`,
          urgent: true,
        });
      }
    }
  });
}
```

---

## 7. UI/UX Design

### 7.1 New Tab: Feed & Rations

```
┌─────────────────────────────────────────┐
│  🌾 FEED & RATIONS                       │
│                                         │
│  FEEDING GROUPS                         │
│  ┌─────────────────────────────────┐   │
│  │ Lactating Cows (12 head)        │   │
│  │ Ration: "High Production Mix"   │   │
│  │ Cost/head/day: €4.20            │   │
│  │ Adequacy: 94% ✅                │   │
│  │ Production: +8%                 │   │
│  │ FCR: 1.45 kg DM / kg milk      │   │
│  │ [Edit Group] [Change Ration]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  RATION RECIPES                         │
│  [+ New Ration]                        │
│  • High Production Mix (Dairy)         │
│  • Dry Cow Maintenance                 │
│  • Grower Pig Ration                   │
│                                         │
│  FEED INVENTORY                         │
│  Corn grain: 4,200 kg (homegrown)     │
│  Soybean meal: 850 kg (purchased)      │
│  Alfalfa hay: 1,100 kg (homegrown)     │
│  Mineral premix: 45 kg                 │
└─────────────────────────────────────────┘
```

### 7.2 Ration Designer Modal

```
┌─────────────────────────────────────────┐
│  DESIGN RATION: Lactating Dairy         │
│  Target: 22 kg DM/day | 280 MJ ME      │
│                                         │
│  INGREDIENT MIXER                       │
│  [Corn silage    ████████░░] 35% 7.7kg │
│  [Alfalfa hay    █████░░░░░] 25% 5.5kg │
│  [Corn grain     ████░░░░░░] 20% 4.4kg │
│  [Soybean meal   ███░░░░░░░] 15% 3.3kg │
│  [Mineral premix ░░░░░░░░░░] 5%  1.1kg │
│                                         │
│  NUTRITIONAL ADEQUACY                   │
│  Energy (ME)    [██████████] 102% ✅   │
│  Crude Protein  [████████░░]  94% ⚠️   │
│  Crude Fiber    [██████████] 105% ✅   │
│  Starch         [██████░░░░]  78% ✅   │
│  Ca:P Ratio     [████████░░]  96% ✅   │
│                                         │
│  COST: €3.85/head/day                   │
│  PRODUCTION IMPACT: +4%                 │
│                                         │
│  ⚠️ Protein slightly low. Add more     │
│     soybean meal or reduce milk target.│
│                                         │
│  [Save Recipe] [Auto-Optimize]         │
└─────────────────────────────────────────┘
```

### 7.3 Cost Comparison View

```
┌─────────────────────────────────────────┐
│  RATION COMPARISON: Lactating Dairy     │
│                                         │
│  Metric          Your Mix   Cheapest   │
│  ─────────────────────────────────────  │
│  Cost/day        €3.85      €2.90      │
│  Protein         16.8%      14.2%      │
│  Energy          12.8 MJ    11.5 MJ    │
│  Production      +4%        −12%       │
│  Health risk     Low        Medium     │
│  FCR             1.45       1.78       │
│                                         │
│  💡 Cheapest ration saves €0.95/day     │
│     but loses €2.40/day in milk.       │
│                                         │
│  [Apply Cheapest] [Keep Your Mix]      │
└─────────────────────────────────────────┘
```

### 7.4 Homegrown vs. Purchased Analysis

```
┌─────────────────────────────────────────┐
│  FEED SELF-SUFFICIENCY                  │
│                                         │
│  Corn:  65% homegrown | 35% purchased   │
│  Soy:    0% homegrown | 100% purchased  │
│  Hay:   90% homegrown | 10% purchased   │
│                                         │
│  Land used for feed crops: 18 ha       │
│  Opportunity cost: €4,200/year         │
│  Feed purchase savings: €8,800/year    │
│  NET BENEFIT: +€4,600/year ✅          │
│                                         │
│  [Plant more soy] [Buy soy contract]   │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Animals** (`engine/animals.ts`) | Daily production (milk/eggs/growth) multiplied by `productionModifier` from assigned ration. Health events triggered by mycotoxin exposure. |
| **Crops** (`engine/crops.ts`) | Harvested grain/forage can be routed to `feedInventory` instead of market. Feed crop quality affects ration quality. |
| **Storage** (Spec 06) | Moldy feed ingredients (`mycotoxinRisk`) reduce animal health and production. Storage quality directly impacts feed quality. |
| **Market** | Feed ingredients can be purchased. Surplus feed can be sold. Soybean meal price fluctuates with global markets. |
| **Manure** (Spec 08) | Feed quality and protein level affect manure nitrogen content. High-protein rations = more N in manure = more leaching risk if over-applied. |
| **Economy** | Feed is the #1 variable cost for animal operations. Ration design is the primary lever for profitability. |
| **Organic** (Spec 03) | Organic farms cannot use GMO soy or synthetic amino acids. Must use organic grain, pasture, and approved minerals. |
| **Contracts** | Forward contracts for feed grain reduce price volatility but lock in volume. |

---

## 9. Files to Create / Modify

### New Files
```
types/feed.ts                  # FeedIngredient, NutritionalRequirements, RationRecipe, FeedingGroup
data/feedRequirements.ts       # Requirements by species/stage, ingredient database
engine/feed.ts                 # Ration evaluation, cost optimizer, FCR calculator
components/FeedManager.tsx     # Main feed tab
components/RationDesigner.tsx  # Ingredient mixer modal
components/CostComparison.tsx  # Ration comparison view
components/FeedInventory.tsx   # Homegrown vs purchased tracking
```

### Modified Files
```
store/useGameStore.ts          # Feed inventory, ration recipes, feeding groups, consumption tick
engine/animals.ts              # Production uses ration modifier instead of fixed rate
data/cropTypes.ts              # Add feed-specific flags (silage corn, alfalfa)
app/(tabs)/animales.tsx        # Add Feed & Rations sub-tab
app/(tabs)/economia.tsx        # Feed cost breakdown in P&L
```

---

## 10. Balance Notes

- **Early game (5–10 animals):** Simple rations. Homegrown corn + purchased mineral premix. Feed cost ~€2/head/day. Not worth optimizing yet.
- **Mid game (30–50 animals):** Feed becomes the largest expense. Optimizing protein from 18% to 16.5% saves €0.40/head/day = €7,300/year. But too low = milk drop.
- **Late game (200+ animals):** Professional nutritionist mode. Multiple rations for every life stage. Homegrown soy investment pays off. FCR becomes a KPI.
- **The soybean dilemma:** Soy is the key protein source but Spain imports most of it. Growing soy uses land that could grow wheat. Buying soy exposes you to global price spikes. No right answer — it's a strategic choice.
- **Mycotoxin trap:** Player stores corn poorly (Spec 06), feeds it anyway. Cows get sick, vet bills spike, milk production crashes for 2 weeks. Teaches storage-feed-health connection.

---

## 11. Open Questions

1. **Pasture as feed ingredient:** Should grazing be modeled as a free "ingredient" with seasonal availability and energy content, or kept as a simple building bonus?
2. **Amino acid detail:** Should we model individual amino acids (lysine, methionine) for poultry/pig rations, or stick to aggregate crude protein?
3. **Feed milling:** Should players build a feed mill to mix rations on-farm (lower cost, requires equipment) vs. buying premixed feed?
4. **Byproduct feeds:** Should we include byproduct ingredients like brewer's grains, distiller's grains, or citrus pulp (real Spanish feeds)?

---

*Ready for review. Once approved, we move to Spec 10: Precision Agriculture / Soil Testing Lab.*
