# Spec 08: Manure Management & Composting

**Tier:** 3 — System Interconnections  
**Status:** Draft  
**Dependencies:** Existing animal system (`data/animalTypes.ts`, `engine/animals.ts`), soil system, electricity system. Integrates with Spec 01 (soil amendments), Spec 03 (organic compliance), Spec 04 (agri-environment subsidies).

---

## 1. Objective

Close the nutrient loop and transform animal waste from an invisible abstraction into a **tangible resource management challenge**. Manure accumulates, must be stored, can be composted into valuable fertilizer, or converted into biogas for electricity. Poor management = environmental fines, nutrient runoff penalties, and wasted potential. Good management = free fertilizer, reduced input costs, renewable energy, and improved soil health. This connects animals → soil → electricity into one coherent cycle.

---

## 2. Design Principles

1. **Waste is a resource:** Manure has real value as fertilizer and energy. The player should feel clever for using it, not just relieved for disposing of it.
2. **Storage is finite and risky:** Manure lagoons fill up. Overflow = €5,000+ fine. This creates time pressure.
3. **Composting is active, not passive:** Good compost requires turning, moisture management, and C:N balancing. Set-and-forget = mediocre compost.
4. **Scale determines solution:** Small farms (2 cows) = bucket and wheelbarrow. Large farms (200 pigs) = lagoon + tractor spreader + biogas plant.
5. **Odor and neighbor relations:** Poor manure management reduces reputation (connects to existing reputation system).

---

## 3. Data Model

### 3.1 Manure Inventory

```ts
// types/manure.ts
export interface ManureInventory {
  solid: {
    volumeM3: number;
    dryMatterPercent: number;
    nutrients: NutrientContent;
    storageCapacityM3: number;
    daysAccumulated: number;
  };
  liquid: {
    volumeM3: number;
    dryMatterPercent: number;
    nutrients: NutrientContent;
    storageCapacityM3: number;
    daysAccumulated: number;
  };
}

export interface NutrientContent {
  nitrogenKg: number;        // Total N
  phosphorusKg: number;      // P₂O₅ equivalent
  potassiumKg: number;       // K₂O equivalent
  organicMatterKg: number;
}
```

### 3.2 Compost Batch

```ts
export interface CompostBatch {
  id: string;
  name: string;
  startDay: number;
  
  // Ingredients
  ingredients: CompostIngredient[];
  totalVolumeM3: number;
  totalWeightKg: number;
  
  // Physics
  carbonNitrogenRatio: number; // target 25–30:1
  moisturePercent: number;     // target 50–60%
  temperatureC: number;        // thermophilic = 55–65°C
  
  // Progress
  maturityPercent: number;     // 0–100
  turningCount: number;
  lastTurnedDay: number;
  daysSinceTurned: number;
  
  // Quality
  finalNutrients: NutrientContent;
  weedSeedKillRate: number;    // % of weed seeds destroyed by heat
  pathogenKillRate: number;    // % of pathogens destroyed
  
  // Status
  status: 'active' | 'curing' | 'mature' | 'applied';
}

export interface CompostIngredient {
  type: 'manureSolid' | 'manureLiquid' | 'cropResidue' | 'straw' | 'woodChips' | 'greenWaste' | 'foodWaste';
  weightKg: number;
  carbonKg: number;
  nitrogenKg: number;
  moisturePercent: number;
}
```

### 3.3 Biogas Digester

```ts
export interface BiogasDigester {
  id: string;
  buildingId: string;
  capacityM3: number;          // total reactor volume
  currentLoadM3: number;       // current substrate volume
  
  // Operation
  dailyInputM3: number;
  hydraulicRetentionTime: number; // days
  operatingTemp: 'mesophilic' | 'thermophilic'; // 35°C vs 55°C
  
  // Outputs
  dailyBiogasM3: number;
  methanePercent: number;      // 50–65%
  dailyElectricityKwh: number;
  dailyHeatKwh: number;
  digestateOutputM3: number;
  
  // Economics
  electricitySoldToGrid: boolean;
  gridPricePerKwh: number;
  
  // Maintenance
  lastMaintenanceDay: number;
  efficiency: number;          // 0–1, degrades without maintenance
}
```

---

## 4. Static Data (`data/manureTypes.ts`)

```ts
export const manureProductionRates: Record<string, { solidKgPerDay: number; liquidLitersPerDay: number }> = {
  dairyCow: { solidKgPerDay: 55, liquidLitersPerDay: 45 },
  beefCow: { solidKgPerDay: 40, liquidLitersPerDay: 20 },
  pig: { solidKgPerDay: 2.5, liquidLitersPerDay: 8 },
  sheep: { solidKgPerDay: 2.0, liquidLitersPerDay: 1.5 },
  chicken: { solidKgPerDay: 0.15, liquidLitersPerDay: 0 }, // mostly solid
  horse: { solidKgPerDay: 25, liquidLitersPerDay: 10 },
};

export const nutrientContent = {
  dairyCowSolid: { nPercent: 0.5, pPercent: 0.25, kPercent: 0.55, omPercent: 18 },
  dairyCowLiquid: { nPercent: 0.35, pPercent: 0.10, kPercent: 0.40, omPercent: 2 },
  pigSolid: { nPercent: 0.65, pPercent: 0.55, kPercent: 0.45, omPercent: 22 },
  pigLiquid: { nPercent: 0.50, pPercent: 0.35, kPercent: 0.35, omPercent: 3 },
  chickenManure: { nPercent: 1.2, pPercent: 0.80, kPercent: 0.60, omPercent: 25 },
  sheepManure: { nPercent: 0.70, pPercent: 0.30, kPercent: 0.60, omPercent: 20 },
};

export const compostPhysics = {
  optimalCNRatio: { min: 25, max: 30 },
  optimalMoisture: { min: 45, max: 60 },
  thermophilicTarget: 60, // °C
  curingTemp: 40,         // °C
  
  maturityRates: {
    unturned: 0.3,        // % per day
    turnedWeekly: 0.8,
    turnedBiweekly: 0.6,
    turnedMonthly: 0.4,
  },
  
  turningBenefits: {
    oxygenBoost: 15,      // % oxygen replenishment
    tempRedistribution: true,
    moistureRedistribution: true,
  },
  
  ingredientProperties: {
    straw: { carbonPercent: 45, nitrogenPercent: 0.6, moisturePercent: 12, bulkDensity: 50 },
    cropResidue: { carbonPercent: 40, nitrogenPercent: 1.2, moisturePercent: 30, bulkDensity: 80 },
    woodChips: { carbonPercent: 50, nitrogenPercent: 0.2, moisturePercent: 20, bulkDensity: 150 },
    greenWaste: { carbonPercent: 35, nitrogenPercent: 2.5, moisturePercent: 70, bulkDensity: 200 },
    foodWaste: { carbonPercent: 30, nitrogenPercent: 3.0, moisturePercent: 80, bulkDensity: 300 },
  },
};

export const biogasYields = {
  dairyCowLiquid: { biogasM3PerTon: 25, methanePercent: 55 },
  pigLiquid: { biogasM3PerTon: 28, methanePercent: 60 },
  chickenManure: { biogasM3PerTon: 35, methanePercent: 58 },
  cropResidue: { biogasM3PerTon: 15, methanePercent: 52 },
};
```

---

## 5. Engine Logic (`engine/manure.ts`)

### 5.1 Daily Manure Production

```ts
export function calculateDailyManure(
  animals: OwnedAnimal[],
  feedQuality: 'poor' | 'standard' | 'premium', // affects manure volume/nutrients
): { solidKg: number; liquidLiters: number; nutrients: NutrientContent } {
  let solidKg = 0;
  let liquidLiters = 0;
  let n = 0, p = 0, k = 0, om = 0;
  
  animals.forEach(animal => {
    const rate = manureProductionRates[animal.typeId];
    if (!rate) return;
    
    const feedMultiplier = { poor: 0.8, standard: 1.0, premium: 1.2 }[feedQuality];
    const animalSolid = rate.solidKgPerDay * feedMultiplier;
    const animalLiquid = rate.liquidLitersPerDay * feedMultiplier;
    
    solidKg += animalSolid;
    liquidLiters += animalLiquid;
    
    // Nutrients
    const nutrientKey = `${animal.typeId}Solid` as keyof typeof nutrientContent;
    const solidNutrients = nutrientContent[nutrientKey];
    if (solidNutrients) {
      n += (animalSolid * solidNutrients.nPercent) / 100;
      p += (animalSolid * solidNutrients.pPercent) / 100;
      k += (animalSolid * solidNutrients.kPercent) / 100;
      om += (animalSolid * solidNutrients.omPercent) / 100;
    }
    
    const liquidKey = `${animal.typeId}Liquid` as keyof typeof nutrientContent;
    const liquidNutrients = nutrientContent[liquidKey];
    if (liquidNutrients) {
      n += (animalLiquid * liquidNutrients.nPercent) / 100;
      p += (animalLiquid * liquidNutrients.pPercent) / 100;
      k += (animalLiquid * liquidNutrients.kPercent) / 100;
      om += (animalLiquid * liquidNutrients.omPercent) / 100;
    }
  });
  
  return {
    solidKg,
    liquidLiters,
    nutrients: { nitrogenKg: n, phosphorusKg: p, potassiumKg: k, organicMatterKg: om },
  };
}
```

### 5.2 Compost Maturity Tick

```ts
export function tickCompostBatch(
  batch: CompostBatch,
  weather: WeatherEvent,
  day: number,
): CompostDeltas {
  const deltas: CompostDeltas = {
    maturityChange: 0,
    moistureChange: 0,
    temperatureChange: 0,
    cnRatioChange: 0,
  };
  
  const physics = compostPhysics;
  
  // Maturity rate depends on turning frequency
  let baseMaturity = physics.maturityRates.unturned;
  if (batch.daysSinceTurned <= 7) baseMaturity = physics.maturityRates.turnedWeekly;
  else if (batch.daysSinceTurned <= 14) baseMaturity = physics.maturityRates.turnedBiweekly;
  else if (batch.daysSinceTurned <= 30) baseMaturity = physics.maturityRates.turnedMonthly;
  
  // C:N ratio penalty
  const cnOptimal = (physics.optimalCNRatio.min + physics.optimalCNRatio.max) / 2;
  const cnDeviation = Math.abs(batch.carbonNitrogenRatio - cnOptimal) / cnOptimal;
  const cnMultiplier = Math.max(0.3, 1 - cnDeviation);
  
  // Moisture penalty
  const moisOptimal = (physics.optimalMoisture.min + physics.optimalMoisture.max) / 2;
  const moisDeviation = Math.abs(batch.moisturePercent - moisOptimal) / moisOptimal;
  const moisMultiplier = Math.max(0.3, 1 - moisDeviation);
  
  // Temperature physics
  if (batch.status === 'active') {
    // Thermophilic phase: microbes generate heat
    const biologicalHeat = baseMaturity * 2; // simplified
    const heatLoss = (batch.temperatureC - weather.tempC) * 0.05;
    deltas.temperatureChange = biologicalHeat - heatLoss;
    
    if (batch.temperatureC > 55 && batch.temperatureC < 70) {
      // Optimal pathogen/weed seed kill zone
      batch.weedSeedKillRate = Math.min(99, batch.weedSeedKillRate + 0.5);
      batch.pathogenKillRate = Math.min(99, batch.pathogenKillRate + 0.5);
    }
    
    // Transition to curing when maturity > 70%
    if (batch.maturityPercent > 70) {
      batch.status = 'curing';
    }
  } else if (batch.status === 'curing') {
    // Cooling phase
    deltas.temperatureChange = (weather.tempC - batch.temperatureC) * 0.1;
    deltas.maturityChange = baseMaturity * 0.5; // slower in curing
    
    if (batch.maturityPercent >= 95) {
      batch.status = 'mature';
      // Final nutrient calculation
      batch.finalNutrients = calculateCompostNutrients(batch);
    }
  }
  
  // Moisture loss
  const evaporation = Math.max(0, batch.temperatureC - 30) * 0.02;
  const rainGain = weather.precipitationMm * 0.5;
  deltas.moistureChange = rainGain - evaporation;
  
  deltas.maturityChange += baseMaturity * cnMultiplier * moisMultiplier;
  
  return deltas;
}
```

### 5.3 Biogas Production

```ts
export function calculateBiogasProduction(
  digester: BiogasDigester,
  inputSubstrate: { type: string; volumeM3: number; dryMatterPercent: number },
  ambientTemp: number,
): { biogasM3: number; electricityKwh: number; heatKwh: number; digestateM3: number } {
  const yieldData = biogasYields[inputSubstrate.type as keyof typeof biogasYields];
  if (!yieldData) return { biogasM3: 0, electricityKwh: 0, heatKwh: 0, digestateM3: 0 };
  
  const tonsDryMatter = (inputSubstrate.volumeM3 * inputSubstrate.dryMatterPercent) / 100;
  const rawBiogas = tonsDryMatter * yieldData.biogasM3PerTon;
  
  // Temperature efficiency
  const targetTemp = digester.operatingTemp === 'mesophilic' ? 35 : 55;
  const tempEfficiency = Math.max(0.3, 1 - Math.abs(ambientTemp - targetTemp) / 30);
  
  // Maintenance efficiency
  const maintenanceEfficiency = digester.efficiency;
  
  const biogasM3 = rawBiogas * tempEfficiency * maintenanceEfficiency;
  const methaneM3 = biogasM3 * (yieldData.methanePercent / 100);
  
  // Energy conversion: 1 m³ methane ≈ 10 kWh thermal
  const thermalKwh = methaneM3 * 10;
  const electricityKwh = thermalKwh * 0.35; // 35% electrical efficiency
  const heatKwh = thermalKwh * 0.45; // 45% heat recovery
  
  return {
    biogasM3,
    electricityKwh,
    heatKwh,
    digestateM3: inputSubstrate.volumeM3 * 0.9, // 90% remains as digestate
  };
}
```

### 5.4 Nutrient Application

```ts
export function calculateManureNutrientAvailability(
  nutrients: NutrientContent,
  applicationMethod: 'broadcast' | 'incorporated' | 'injected',
  soilTemp: number,
): NutrientContent {
  // Incorporation reduces ammonia volatilization
  const volatilizationLoss = { broadcast: 0.35, incorporated: 0.15, injected: 0.05 }[applicationMethod];
  
  // Mineralization rate depends on soil temperature
  const mineralizationRate = Math.min(1.0, soilTemp / 25);
  
  return {
    nitrogenKg: nutrients.nitrogenKg * (1 - volatilizationLoss) * mineralizationRate,
    phosphorusKg: nutrients.phosphorusKg * 0.8, // P is mostly stable
    potassiumKg: nutrients.potassiumKg * 0.85,
    organicMatterKg: nutrients.organicMatterKg,
  };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface ManureActions {
  // Production & storage
  cleanBarn(animalBuildingId: string): void; // moves manure from barn to storage
  expandManureStorage(type: 'solid' | 'liquid', capacityM3: number): void;
  
  // Composting
  createCompostBatch(name: string, ingredients: CompostIngredient[]): void;
  turnCompost(batchId: string): void; // costs labor/fuel
  adjustCompostMoisture(batchId: string, addWaterOrDry: boolean): void;
  harvestCompost(batchId: string): void; // moves mature compost to inventory
  
  // Application
  applyManure(parcelId: string, type: 'solid' | 'liquid' | 'compost', amountKg: number): void;
  
  // Biogas
  buildBiogasDigester(sizeM3: number): void;
  loadDigester(digesterId: string, volumeM3: number): void;
  harvestDigestate(digesterId: string): void;
  sellElectricityToGrid(kwh: number): void;
  
  // Daily tick
  tickManureAndCompost(weather: WeatherEvent): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickManureSystem(state: GameState, weather: WeatherEvent, day: number): void {
  // 1. Daily production
  const production = calculateDailyManure(state.animals, state.feedQuality);
  state.manureInventory.solid.volumeM3 += production.solidKg / 600; // approximate bulk density
  state.manureInventory.liquid.volumeM3 += production.liquidLiters / 1000;
  accumulateNutrients(state.manureInventory, production.nutrients);
  
  // 2. Overflow check
  if (state.manureInventory.solid.volumeM3 > state.manureInventory.solid.storageCapacityM3) {
    const overflow = state.manureInventory.solid.volumeM3 - state.manureInventory.solid.storageCapacityM3;
    state.manureInventory.solid.volumeM3 = state.manureInventory.solid.storageCapacityM3;
    state.reputation -= 2;
    state.notifications.push({
      day,
      type: 'manure',
      message: `Solid manure storage overflow! ${overflow.toFixed(1)}m³ spilled. Reputation hit.`,
      urgent: true,
    });
    
    // Repeated overflow = fine
    if (state.manureInventory.solid.daysAccumulated > 7) {
      state.money -= 5000;
      state.newsEvents.push({
        day,
        headline: 'Environmental Fine for Manure Mismanagement',
        body: 'Local authorities fined €5,000 for improper manure storage.',
        type: 'negative',
      });
    }
  }
  
  // 3. Compost ticks
  state.compostBatches.forEach(batch => {
    if (batch.status === 'applied') return;
    const deltas = tickCompostBatch(batch, weather, day);
    batch.maturityPercent = Math.min(100, batch.maturityPercent + deltas.maturityChange);
    batch.moisturePercent = Math.max(0, Math.min(100, batch.moisturePercent + deltas.moistureChange));
    batch.temperatureC = Math.max(weather.tempC, batch.temperatureC + deltas.temperatureChange);
    batch.daysSinceTurned += 1;
  });
  
  // 4. Biogas production
  state.biogasDigesters.forEach(digester => {
    const production = calculateBiogasProduction(digester, {
      type: 'dairyCowLiquid', // simplified — should track actual input mix
      volumeM3: digester.dailyInputM3,
      dryMatterPercent: 8,
    }, weather.tempC);
    
    digester.dailyBiogasM3 = production.biogasM3;
    digester.dailyElectricityKwh = production.electricityKwh;
    digester.dailyHeatKwh = production.heatKwh;
    
    state.electricity.generatedKwh += production.electricityKwh;
    state.electricity.heatKwh += production.heatKwh;
    
    if (digester.electricitySoldToGrid) {
      state.money += production.electricityKwh * digester.gridPricePerKwh;
    }
  });
  
  // 5. Odor events
  const totalManure = state.manureInventory.solid.volumeM3 + state.manureInventory.liquid.volumeM3;
  if (totalManure > 100 && weather.tempC > 25 && Math.random() < 0.05) {
    state.reputation -= 1;
    state.notifications.push({
      day,
      type: 'manure',
      message: 'Neighbors complaining about manure odor. Consider composting or faster application.',
      urgent: false,
    });
  }
}
```

---

## 7. UI/UX Design

### 7.1 New Tab: Manure & Compost

Accessible from main navigation or nested under Gestion/Animales:

```
┌─────────────────────────────────────────┐
│  💩 MANURE & COMPOST                    │
│                                         │
│  STORAGE                                │
│  Solid: 28/40 m³ [████████████░░░░░░]  │
│  Liquid: 145/200 m³ [██████░░░░░░░░░░] │
│  ⚠️ Liquid lagoon 72% full              │
│                                         │
│  NUTRIENTS IN STORAGE                   │
│  N: 420 kg | P: 180 kg | K: 350 kg     │
│  OM: 2,400 kg                           │
│                                         │
│  COMPOST PILES (3 active)               │
│  ┌─────────────────────────────────┐   │
│  │ Pile A — 45 days old            │   │
│  │ C:N 28 ✅ | Moisture 52% ✅    │   │
│  │ Temp: 58°C 🔥 thermophilic     │   │
│  │ Maturity: 62%                   │   │
│  │ Last turned: 5 days ago         │   │
│  │ [Turn] [Check]                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  BIOGAS DIGESTER                        │
│  Production today: 18.5 kWh            │
│  Grid sales: +€1.85                     │
│  Digestate: 2.1 m³ ready               │
│  [Harvest digestate]                    │
└─────────────────────────────────────────┘
```

### 7.2 Compost Creation Modal

```
┌─────────────────────────────────────────┐
│  START NEW COMPOST BATCH                │
│                                         │
│  Add ingredients:                       │
│  [Solid manure: 500 kg]  C:N ~15       │
│  + [Straw: 300 kg]  C:N ~75            │
│  + [Crop residue: 200 kg]  C:N ~33     │
│  ─────────────────────────────────      │
│  Estimated C:N ratio: 26.5 ✅           │
│  Estimated moisture: 55% ✅             │
│  Estimated volume: 2.1 m³               │
│  Time to mature: ~60 days               │
│                                         │
│  [Start Composting]                     │
└─────────────────────────────────────────┘
```

### 7.3 Application Warning

```
┌─────────────────────────────────────────┐
│  ⚠️ NITRATE LEACHING RISK               │
│                                         │
│  You're about to apply 4,000 kg of      │
│  liquid manure to Field 3.              │
│                                         │
│  Rain forecast: 45mm in next 3 days     │
│  Soil drainage: 35% (poor)              │
│                                         │
│  Risk: N runoff into waterways          │
│  Potential fine: €2,000–€8,000         │
│                                         │
│  [Wait for dry spell] [Reduce rate]    │
│  [Apply anyway (DANGER)]               │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Animals** (`engine/animals.ts`) | Every animal produces daily manure. Feed quality affects manure volume. |
| **Soil** (Spec 01) | Manure/compost application adds OM, N, P, K. Over-application = nitrate leaching fines + salinization risk. |
| **Buildings** | Barns accumulate manure until cleaned. Biogas digester is a buildable structure. |
| **Electricity** | Biogas digester generates kWh. Surplus sold to grid. Heat used for drying grain (Spec 06). |
| **Organic** (Spec 03) | Organic farms MUST compost manure before application (raw manure restrictions). Synthetic biogas additives banned. |
| **Subsidies** (Spec 04) | Biogas plants qualify for renewable energy subsidies. Cover crop program (agri-env) provides C-rich compost ingredients. |
| **Reputation** | Poor manure management = odor complaints = reputation loss = harder to get contracts. |
| **Processing** | Digestate is a stable, low-odor fertilizer. Compost is premium soil amendment for organic operations. |

---

## 9. Files to Create / Modify

### New Files
```
types/manure.ts                # ManureInventory, CompostBatch, BiogasDigester
data/manureTypes.ts            # Production rates, nutrient content, compost physics, biogas yields
engine/manure.ts               # Production, compost tick, biogas calculation, nutrient availability
components/ManureDashboard.tsx # Main management UI
components/CompostCreator.tsx  # Batch creation modal
components/BiogasMonitor.tsx   # Digester production dashboard
components/NutrientWarning.tsx # Leaching/fine warning modal
```

### Modified Files
```
store/useGameStore.ts          # Manure state, compost batches, digesters, tick integration
engine/animals.ts              # Add manure production to daily animal tick
app/(tabs)/gestion.tsx         # Add Manure & Compost section
app/(tabs)/animales.tsx        # Barn cleaning action in animal building cards
data/buildingTypes.ts          # Add biogas digester, compost turner, manure spreader
```

---

## 10. Balance Notes

- **Small farm (5 cows):** 275kg solid + 225L liquid per day. Wheelbarrow to compost pile. No biogas needed. Free fertilizer worth ~€1,500/year.
- **Medium farm (50 pigs):** 125kg solid + 400L liquid per day. Need lagoon + tractor spreader. Composting is viable but labor-intensive.
- **Large farm (200 pigs + 30 cows):** 7,000L liquid per day. Biogas digester becomes essential — not just for energy, but for odor control and digestate management. €80,000 investment, pays back in 4–5 years via electricity sales + fertilizer savings.
- **The compost quality game:** Perfect C:N (26:1) + weekly turning + optimal moisture = mature compost in 45 days worth €80/m³. Neglected pile = immature sludge worth €15/m³ after 90 days. Active management is rewarded.
- **Organic synergy:** Organic farms can't use synthetic fertilizer, so manure/compost becomes the ONLY nitrogen source. Manure management goes from "nice to have" to "existential necessity."

---

## 11. Open Questions

1. **Anaerobic digestion detail:** Should we model digester pH, ammonia inhibition, and co-digestion (adding crop residue to boost biogas)? Or keep it simplified to input volume → output kWh?
2. **Seasonal restrictions:** Many EU regions ban winter manure application (Nov–Feb) to prevent runoff. Should we enforce this?
3. **Composting methods:** Should we offer windrow (cheap, slow) vs. in-vessel (expensive, fast) vs. vermicomposting (worm-based, premium product)?
4. **Separating solid/liquid:** Should players be able to invest in a screw press separator to extract solids from slurry (better for composting)?

---

*Ready for review. Once approved, we move to Spec 09: Feed Ration Balancing.*
