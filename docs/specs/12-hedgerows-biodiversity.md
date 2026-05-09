# Spec 12: Hedgerows & Biodiversity Buffers

**Tier:** 4 — Atmosphere & World  
**Status:** Draft  
**Dependencies:** Existing land/parcel system, pest system. Integrates with Spec 01 (soil/erosion), Spec 04 (subsidies/greening), Spec 07 (pollination).

---

## 1. Objective

Transform the farm from a grid of productive rectangles into a **landscape with ecological structure**. Hedgerows, buffer strips, and pollinator corridors create tangible gameplay benefits — pest control, wind protection, subsidy compliance, and bee support — while costing productive land area. The player must decide whether to maximize every square meter for crops or sacrifice margin for long-term resilience and regulatory compliance. This connects directly to real EU greening requirements and gives the farm visual character.

---

## 2. Design Principles

1. **Land is the cost:** Every hedgerow and buffer strip consumes hectares that could grow crops. The player feels the tradeoff in their P&L.
2. **Benefits compound over time:** New hedgerows are sticks in the ground. Mature hedgerows (5+ years) are ecological powerhouses. Patience is rewarded.
3. **Compliance is mandatory, beauty is optional:** Buffer strips along waterways are required for CAP greening. Hedgerows are voluntary but lucrative.
4. **Visual identity:** The farm map should look different based on ecological choices — geometric monoculture vs. patchwork with hedgerows and flower margins.
5. **Biodiversity is a score, not a binary:** More diverse farms score higher, unlocking better subsidies, premium buyers, and tourism potential.

---

## 3. Data Model

### 3.1 Environmental Feature

```ts
// types/environment.ts
export type EnvironmentalFeatureType = 'hedgerow' | 'bufferStrip' | 'pollinatorStrip' | 'beetleBank' | 'wildflowerMargin' | 'riparianZone' | 'agroforestryRow';

export interface EnvironmentalFeature {
  id: string;
  type: EnvironmentalFeatureType;
  name: string;
  
  // Geometry
  parcelId: string;           // primary parcel
  adjacentParcelIds: string[]; // hedgerows sit between parcels
  lengthM: number;
  widthM: number;
  areaHa: number;
  
  // Location
  position: 'northEdge' | 'southEdge' | 'eastEdge' | 'westEdge' | 'internal' | 'waterway';
  
  // Age & health
  plantedDay: number;
  ageYears: number;
  healthPercent: number;      // 0–100
  maturityPercent: number;    // 0–100, affects benefit strength
  
  // Composition
  speciesComposition: SpeciesEntry[];
  nativeSpeciesRatio: number; // 0–1, higher = better ecological value
  
  // Management
  lastMaintainedDay: number;
  maintenanceNeeds: 'none' | 'trimming' | 'replanting' | 'pestControl';
  
  // Status
  status: 'planned' | 'planted' | 'mature' | 'degraded' | 'removing';
}

export interface SpeciesEntry {
  speciesId: string;
  name: string;
  nameEs: string;
  type: 'shrub' | 'tree' | 'grass' | 'wildflower' | 'legume';
  proportion: number;         // % of feature
  benefit: 'windbreak' | 'nectar' | 'berries' | 'nesting' | 'nitrogenFix' | 'erosionControl';
}
```

### 3.2 Biodiversity Metrics

```ts
export interface FarmBiodiversity {
  beneficialInsectIndex: number;  // 0–100, pest control potential
  pollinatorIndex: number;        // 0–100, bee/wild bee support
  birdSpeciesCount: number;       // 0–50
  mammalHabitatScore: number;     // 0–100
  soilBiodiversityIndex: number;  // 0–100, earthworms, microbes
  
  // Composite
  overallBiodiversityScore: number; // 0–100
  ecologicalFocusAreaHa: number;    // CAP EFA calculation
}
```

### 3.3 Feature Effects by Type

```ts
export const featureEffects: Record<EnvironmentalFeatureType, {
  baseAreaHaPer100m: number;
  establishmentCostPerHa: number;
  annualMaintenanceCostPerHa: number;
  yearsToMaturity: number;
  
  // EFA weighting (CAP greening)
  efaWeightFactor: number;      // multiplier for EFA hectare equivalence
  
  // Gameplay effects (at maturity)
  windErosionReductionPercent: number; // on downwind parcels
  pestSuppressionPercent: number;      // within influence radius
  pollinatorBoostPercent: number;      // within influence radius
  runoffReductionPercent: number;      // on adjacent parcels
  reputationBonus: number;
  
  // Land cost
  productiveLandLostHa: number;  // how much crop area is sacrificed
}> = {
  hedgerow: {
    baseAreaHaPer100m: 0.05,      // 5m wide × 100m = 0.05 ha
    establishmentCostPerHa: 2800,
    annualMaintenanceCostPerHa: 150,
    yearsToMaturity: 5,
    efaWeightFactor: 1.5,         // CAP counts hedgerows at 1.5×
    windErosionReductionPercent: 40,
    pestSuppressionPercent: 15,
    pollinatorBoostPercent: 10,
    runoffReductionPercent: 20,
    reputationBonus: 2,
    productiveLandLostHa: 0.05,
  },
  
  bufferStrip: {
    baseAreaHaPer100m: 0.10,      // 10m wide
    establishmentCostPerHa: 800,
    annualMaintenanceCostPerHa: 50,
    yearsToMaturity: 1,
    efaWeightFactor: 1.0,
    windErosionReductionPercent: 10,
    pestSuppressionPercent: 5,
    pollinatorBoostPercent: 5,
    runoffReductionPercent: 60,   // major nutrient trap
    reputationBonus: 1,
    productiveLandLostHa: 0.10,
  },
  
  pollinatorStrip: {
    baseAreaHaPer100m: 0.06,      // 6m wide
    establishmentCostPerHa: 1200,
    annualMaintenanceCostPerHa: 200,
    yearsToMaturity: 1,
    efaWeightFactor: 1.0,
    windErosionReductionPercent: 5,
    pestSuppressionPercent: 0,
    pollinatorBoostPercent: 35,
    runoffReductionPercent: 15,
    reputationBonus: 3,
    productiveLandLostHa: 0.06,
  },
  
  beetleBank: {
    baseAreaHaPer100m: 0.03,      // 3m wide raised bank
    establishmentCostPerHa: 1500,
    annualMaintenanceCostPerHa: 80,
    yearsToMaturity: 2,
    efaWeightFactor: 0.8,
    windErosionReductionPercent: 0,
    pestSuppressionPercent: 25,
    pollinatorBoostPercent: 5,
    runoffReductionPercent: 10,
    reputationBonus: 1,
    productiveLandLostHa: 0.03,
  },
  
  wildflowerMargin: {
    baseAreaHaPer100m: 0.06,
    establishmentCostPerHa: 1000,
    annualMaintenanceCostPerHa: 180,
    yearsToMaturity: 1,
    efaWeightFactor: 1.0,
    windErosionReductionPercent: 5,
    pestSuppressionPercent: 5,
    pollinatorBoostPercent: 30,
    runoffReductionPercent: 10,
    reputationBonus: 2,
    productiveLandLostHa: 0.06,
  },
  
  riparianZone: {
    baseAreaHaPer100m: 0.15,      // 15m mandatory near water
    establishmentCostPerHa: 1200,
    annualMaintenanceCostPerHa: 100,
    yearsToMaturity: 3,
    efaWeightFactor: 1.2,
    windErosionReductionPercent: 5,
    pestSuppressionPercent: 5,
    pollinatorBoostPercent: 15,
    runoffReductionPercent: 75,   // maximum nutrient trapping
    reputationBonus: 3,
    productiveLandLostHa: 0.15,
  },
  
  agroforestryRow: {
    baseAreaHaPer100m: 0.08,      // 8m wide tree rows
    establishmentCostPerHa: 3500,
    annualMaintenanceCostPerHa: 200,
    yearsToMaturity: 8,
    efaWeightFactor: 1.0,
    windErosionReductionPercent: 50,
    pestSuppressionPercent: 10,
    pollinatorBoostPercent: 15,
    runoffReductionPercent: 30,
    reputationBonus: 4,
    productiveLandLostHa: 0.08,
  },
};
```

---

## 4. Static Data (`data/environmentSpecies.ts`)

```ts
export const hedgerowSpecies = [
  { id: 'hawthorn', name: 'Hawthorn', nameEs: 'Espino albar', type: 'shrub', benefits: ['windbreak', 'nesting', 'berries'], native: true, growthRate: 'medium' },
  { id: 'blackthorn', name: 'Blackthorn', nameEs: 'Endrino', type: 'shrub', benefits: ['windbreak', 'nesting', 'berries'], native: true, growthRate: 'medium' },
  { id: 'holmOak', name: 'Holm Oak', nameEs: 'Encina', type: 'tree', benefits: ['windbreak', 'erosionControl'], native: true, growthRate: 'slow' },
  { id: 'corkOak', name: 'Cork Oak', nameEs: 'Alcornoque', type: 'tree', benefits: ['windbreak', 'erosionControl'], native: true, growthRate: 'slow' },
  { id: 'wildRose', name: 'Dog Rose', nameEs: 'Rosa canina', type: 'shrub', benefits: ['nectar', 'nesting', 'berries'], native: true, growthRate: 'fast' },
  { id: 'broom', name: 'Spanish Broom', nameEs: 'Retama', type: 'shrub', benefits: ['windbreak', 'nectar', 'nitrogenFix'], native: true, growthRate: 'fast' },
];

export const pollinatorSpecies = [
  { id: 'cornflower', name: 'Cornflower', nameEs: 'Aciano', bloomPeriod: 'spring', nectarValue: 8 },
  { id: 'poppy', name: 'Poppy', nameEs: 'Amapola', bloomPeriod: 'spring', nectarValue: 7 },
  { id: 'phacelia', name: 'Phacelia', nameEs: 'Fácida', bloomPeriod: 'summer', nectarValue: 10 },
  { id: 'borage', name: 'Borage', nameEs: 'Borraja', bloomPeriod: 'summer', nectarValue: 9 },
  { id: 'clover', name: 'Red Clover', nameEs: 'Trébol rojo', bloomPeriod: 'spring-summer', nectarValue: 7, nitrogenFix: true },
  { id: 'wildMustard', name: 'Wild Mustard', nameEs: 'Mostaza silvestre', bloomPeriod: 'winter-spring', nectarValue: 6 },
];
```

---

## 5. Engine Logic (`engine/environment.ts`)

### 5.1 Feature Maturity & Benefits

```ts
export function calculateFeatureBenefits(
  feature: EnvironmentalFeature,
): FeatureBenefits {
  const config = featureEffects[feature.type];
  const maturityFactor = Math.min(1.0, feature.ageYears / config.yearsToMaturity);
  const healthFactor = feature.healthPercent / 100;
  
  return {
    windErosionReduction: config.windErosionReductionPercent * maturityFactor * healthFactor,
    pestSuppression: config.pestSuppressionPercent * maturityFactor * healthFactor,
    pollinatorBoost: config.pollinatorBoostPercent * maturityFactor * healthFactor,
    runoffReduction: config.runoffReductionPercent * maturityFactor * healthFactor,
    efaEquivalentHa: feature.areaHa * config.efaWeightFactor * healthFactor,
    reputationBonus: config.reputationBonus * maturityFactor,
  };
}
```

### 5.2 Parcel-Level Effect Aggregation

```ts
export function calculateParcelEnvironmentalEffects(
  parcel: LandParcel,
  allFeatures: EnvironmentalFeature[],
): ParcelEnvironmentalEffects {
  const adjacentFeatures = allFeatures.filter(f => 
    f.parcelId === parcel.id || f.adjacentParcelIds.includes(parcel.id)
  );
  
  let windReduction = 0;
  let pestSuppression = 0;
  let pollinatorBoost = 0;
  let runoffReduction = 0;
  
  adjacentFeatures.forEach(feature => {
    const benefits = calculateFeatureBenefits(feature);
    const distanceFactor = getDistanceFactor(feature, parcel);
    
    windReduction = Math.max(windReduction, benefits.windErosionReduction * distanceFactor);
    pestSuppression += benefits.pestSuppression * distanceFactor;
    pollinatorBoost += benefits.pollinatorBoost * distanceFactor;
    runoffReduction = Math.max(runoffReduction, benefits.runoffReduction * distanceFactor);
  });
  
  return {
    windErosionReductionPercent: Math.min(80, windReduction),
    pestSuppressionPercent: Math.min(60, pestSuppression),
    pollinatorBoostPercent: Math.min(100, pollinatorBoost),
    runoffReductionPercent: Math.min(90, runoffReduction),
  };
}

function getDistanceFactor(feature: EnvironmentalFeature, parcel: LandParcel): number {
  if (feature.parcelId === parcel.id || feature.adjacentParcelIds.includes(parcel.id)) {
    return feature.position === 'internal' ? 1.0 : 0.8;
  }
  // Features within 2 parcels still have partial effect
  return 0.3;
}
```

### 5.3 Buffer Strip Compliance Check

```ts
export function checkBufferStripCompliance(
  parcel: LandParcel,
  features: EnvironmentalFeature[],
  waterwayDistanceM: number,
): { compliant: boolean; requiredWidthM: number; actualWidthM: number; missingHa: number } {
  // EU rules: 5m minimum buffer along waterways, many regions require 10m
  const requiredWidthM = waterwayDistanceM < 50 ? 10 : 5;
  
  const bufferFeatures = features.filter(f => 
    f.type === 'bufferStrip' && 
    f.parcelId === parcel.id && 
    f.position === 'waterway'
  );
  
  const actualWidthM = bufferFeatures.reduce((max, f) => Math.max(max, f.widthM), 0);
  const bufferArea = bufferFeatures.reduce((sum, f) => sum + f.areaHa, 0);
  const requiredArea = (parcel.sizeHa * 10000) * (requiredWidthM / Math.sqrt(parcel.sizeHa * 10000)) / 10000; // rough
  
  return {
    compliant: actualWidthM >= requiredWidthM,
    requiredWidthM,
    actualWidthM,
    missingHa: Math.max(0, requiredArea - bufferArea),
  };
}
```

### 5.4 Farm Biodiversity Score

```ts
export function calculateFarmBiodiversity(
  features: EnvironmentalFeature[],
  parcels: LandParcel[],
  beehives: Beehive[],
  totalFarmAreaHa: number,
): FarmBiodiversity {
  const matureFeatures = features.filter(f => f.status === 'mature' || f.ageYears >= 3);
  
  // Beneficial insects: beetle banks + hedgerows + pollinator strips
  const insectHabitat = matureFeatures.filter(f => 
    ['beetleBank', 'hedgerow', 'pollinatorStrip'].includes(f.type)
  ).reduce((sum, f) => sum + f.areaHa, 0);
  const beneficialInsectIndex = Math.min(100, (insectHabitat / totalFarmAreaHa) * 400);
  
  // Pollinators: pollinator strips + beehives
  const pollinatorHabitat = matureFeatures.filter(f => 
    ['pollinatorStrip', 'wildflowerMargin'].includes(f.type)
  ).reduce((sum, f) => sum + f.areaHa, 0);
  const hiveBonus = beehives.length * 5;
  const pollinatorIndex = Math.min(100, (pollinatorHabitat / totalFarmAreaHa) * 500 + hiveBonus);
  
  // Birds: hedgerows + riparian + agroforestry
  const birdHabitat = matureFeatures.filter(f => 
    ['hedgerow', 'riparianZone', 'agroforestryRow'].includes(f.type)
  ).reduce((sum, f) => sum + f.areaHa, 0);
  const birdSpeciesCount = Math.min(50, Math.floor(birdHabitat * 2));
  
  // Soil biodiversity: organic matter + mature hedgerows
  const avgOM = parcels.reduce((sum, p) => sum + p.soil.organicMatter, 0) / parcels.length;
  const soilBiodiversityIndex = Math.min(100, avgOM * 1.5 + (insectHabitat / totalFarmAreaHa) * 100);
  
  // EFA
  const efaHa = features.reduce((sum, f) => {
    const benefits = calculateFeatureBenefits(f);
    return sum + benefits.efaEquivalentHa;
  }, 0);
  
  const overall = (beneficialInsectIndex + pollinatorIndex + Math.min(100, birdSpeciesCount * 2) + soilBiodiversityIndex) / 4;
  
  return {
    beneficialInsectIndex,
    pollinatorIndex,
    birdSpeciesCount,
    mammalHabitatScore: birdHabitat * 3, // simplified
    soilBiodiversityIndex,
    overallBiodiversityScore: overall,
    ecologicalFocusAreaHa: efaHa,
  };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface EnvironmentActions {
  // Planting
  plantEnvironmentalFeature(
    type: EnvironmentalFeatureType,
    parcelId: string,
    position: string,
    lengthM: number,
    speciesIds: string[]
  ): void;
  
  // Maintenance
  maintainFeature(featureId: string): void;
  removeFeature(featureId: string): void;
  
  // Biodiversity
  conductBiodiversitySurvey(): void; // reveals current scores
  
  // Daily tick
  tickEnvironmentalFeatures(day: number): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickEnvironmentalFeatures(state: GameState, day: number): void {
  state.environmentalFeatures.forEach(feature => {
    // Age increment
    const daysSincePlanting = day - feature.plantedDay;
    feature.ageYears = daysSincePlanting / 365;
    feature.maturityPercent = Math.min(100, (feature.ageYears / featureEffects[feature.type].yearsToMaturity) * 100);
    
    // Status transitions
    if (feature.maturityPercent >= 100 && feature.status === 'planted') {
      feature.status = 'mature';
      state.notifications.push({
        day,
        type: 'environment',
        message: `${feature.name} has reached maturity! Full ecological benefits now active.`,
        urgent: false,
      });
    }
    
    // Health degradation without maintenance
    const maintenanceInterval = feature.type === 'hedgerow' ? 730 : 365; // 2 years / 1 year
    if (day - feature.lastMaintainedDay > maintenanceInterval) {
      feature.healthPercent = Math.max(0, feature.healthPercent - 0.1);
      if (feature.healthPercent < 50 && Math.random() < 0.01) {
        state.notifications.push({
          day,
          type: 'environment',
          message: `${feature.name} is degrading. Maintenance needed.`,
          urgent: false,
        });
      }
    }
    
    // Maintenance recovery
    if (day === feature.lastMaintainedDay) {
      feature.healthPercent = Math.min(100, feature.healthPercent + 20);
    }
  });
  
  // Recalculate biodiversity score monthly
  if (day % 30 === 0) {
    const totalArea = state.parcels.reduce((sum, p) => sum + p.sizeHa, 0);
    state.biodiversity = calculateFarmBiodiversity(
      state.environmentalFeatures,
      state.parcels,
      state.beehives,
      totalArea
    );
  }
}
```

---

## 7. UI/UX Design

### 7.1 Tierras Tab — Environmental Overlay

Toggle "Ecological View" on farm map:

```
┌─────────────────────────────────────────┐
│  🌿 ECOLOGICAL VIEW                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  F1  F2  F3  F4                 │   │
│  │  ════╪════╪════                 │   │
│  │  F5  F6│ F7 │F8                 │   │
│  │  ────┼────┼────                 │   │
│  │  F9  F10 F11 F12                │   │
│  │       💧 River                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Legend:                                │
│  ═══ Hedge (mature)  ─── Buffer strip  │
│  ▓▓▓ Pollinator strip  💧 Waterway     │
│                                         │
│  Field 7: Pest suppression +15%        │
│  Field 3: Wind erosion −40%            │
│  [Plant new feature] [Manage existing] │
└─────────────────────────────────────────┘
```

### 7.2 Feature Planting Modal

```
┌─────────────────────────────────────────┐
│  PLANT: Hedgerow                         │
│  Location: Between Field 3 and Field 7   │
│  Length: 200 m | Width: 5 m              │
│  Area lost: 0.10 ha                      │
│                                         │
│  Species composition:                    │
│  [Hawthorn 40%] [Blackthorn 30%]        │
│  [Dog Rose 20%] [Spanish Broom 10%]     │
│                                         │
│  Cost: €560 (plants + labor)             │
│  Annual maintenance: €15                 │
│  Time to maturity: 5 years               │
│                                         │
│  Expected benefits at maturity:          │
│  • Wind erosion reduction: 40%           │
│  • Pest suppression: 15%                 │
│  • Pollinator boost: 10%                 │
│  • EFA credit: 0.15 ha equivalent        │
│  • Reputation: +2                        │
│                                         │
│  [Plant] [Cancel]                        │
└─────────────────────────────────────────┘
```

### 7.3 Biodiversity Dashboard

```
┌─────────────────────────────────────────┐
│  🦋 FARM BIODIVERSITY SCORE: 62/100     │
│                                         │
│  Beneficial insects  [████████░░] 74   │
│  Pollinators         [██████░░░░] 58   │
│  Bird species        [█████░░░░░] 12   │
│  Soil biodiversity   [███████░░░] 68   │
│                                         │
│  ECOLOGICAL FOCUS AREA                  │
│  Current: 4.2 ha                        │
│  Required: 2.25 ha ✅                   │
│  Surplus: +1.95 ha                      │
│                                         │
│  BUFFER STRIP COMPLIANCE                │
│  Waterway-adjacent parcels: 3           │
│  Compliant: 3 ✅                        │
│                                         │
│  [View detailed report]                 │
└─────────────────────────────────────────┘
```

### 7.4 Greening Compliance Tooltip

When viewing CAP greening status:
```
┌─────────────────────────────────────────┐
│  GREENING: EFA 4.2 ha / 2.25 required  │
│                                         │
│  Breakdown:                             │
│  • Hedgerows: 1.8 ha (×1.5 = 2.7)     │
│  • Buffer strips: 1.5 ha (×1.0 = 1.5)  │
│  ─────────────────────────────────────  │
│  Total EFA equivalent: 4.2 ha ✅       │
│                                         │
│  💡 Tip: Planting pollinator strips     │
│     on Field 12 edge would add 0.3 ha  │
│     and boost bee activity.             │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Subsidies** (Spec 04) | Environmental features provide EFA hectares for greening payments. Buffer strips required for cross-compliance. |
| **Pollination** (Spec 07) | Pollinator strips and hedgerows boost `pollinatorIndex`, increasing hive productivity and crop pollination bonuses. |
| **Soil/Erosion** (Spec 01) | Hedgerows reduce wind erosion on downwind parcels. Buffer strips reduce nutrient runoff, preventing leaching fines. |
| **Pests** | Beetle banks and hedgerows increase `beneficialInsectIndex`, suppressing pest pressure on adjacent fields. |
| **Reputation** | Biodiversity score affects town perception, CSA subscriptions, and premium buyer interest. |
| **Land** | Every feature consumes productive hectares. Player sees immediate yield reduction but long-term resilience gain. |
| **Machinery** | Internal hedgerows may block large machinery. Narrow equipment or specific access gates needed. |
| **Atmosphere** | Farm map visually transforms from monoculture grid to diverse landscape with hedgerows and flower margins. |

---

## 9. Files to Create / Modify

### New Files
```
types/environment.ts           # EnvironmentalFeature, FarmBiodiversity, feature effects
data/environmentSpecies.ts     # Hedgerow shrubs, pollinator wildflowers
engine/environment.ts          # Benefit calculations, compliance checks, biodiversity score
components/EcologicalMap.tsx   # Farm map overlay with features
components/FeaturePlanter.tsx  # Planting modal with species selection
components/BiodiversityDashboard.tsx # Score breakdown
components/GreeningTooltip.tsx # EFA compliance detail
```

### Modified Files
```
store/useGameStore.ts          # environmentalFeatures array, biodiversity score, tick integration
app/(tabs)/tierras.tsx         # Add Ecological View toggle
app/(tabs)/oficina.tsx         # Biodiversity score in reputation/greening section
engine/soilDegradation.ts      # Wind erosion reduced by adjacent hedgerows
engine/weeds.ts                # Pest suppression from beetle banks/hedgerows
engine/bees.ts                 # Pollinator boost from wildflower margins
```

---

## 10. Balance Notes

- **Early game:** Planting a 200m hedgerow costs €560 and loses 0.1ha. On a 10ha farm, that's 1% of productive land. The wind erosion benefit isn't felt immediately. Early hedgerows are an act of faith.
- **Year 3–5:** Hedgerows mature. Pest suppression becomes noticeable (fewer spray applications). Pollinator strips boost honey production. Buffer strips unlock full greening payments.
- **Late game:** 5+ km of hedgerows, beetle banks every 200m, riparian zones on all waterways. The farm looks like a traditional Spanish mosaic landscape (dehesa/mosaic). Biodiversity score 80+ unlocks agri-tourism and premium organic buyers.
- **The machinery conflict:** Internal hedgerows block 24m combines. Player must choose: remove hedgerow for efficiency, or buy smaller equipment and accept lower throughput. Real tradeoff.
- **Visual payoff:** After 5 in-game years, two farms should look completely different on the map — one a geometric grid, the other a patchwork with green corridors.

---

## 11. Open Questions

1. **Agroforestry products:** Should mature agroforestry rows produce harvestable products (cork from cork oak, firewood, chestnuts, fruit) after 10+ years?
2. **Wildlife damage:** Should high biodiversity occasionally attract wildlife that damages crops (wild boar, deer, birds)? A "too much of a good thing" tension.
3. **Hedgerow trimming:** Should overgrown hedgerows shade adjacent crops and reduce yield by 5–10% until trimmed?
4. **Community planting:** Should the player be able to coordinate with neighbors to create landscape-scale hedgerow networks for bigger biodiversity bonuses?

---

*Ready for review. Once approved, we move to the final spec: Spec 13: Community Supported Agriculture (CSA).*