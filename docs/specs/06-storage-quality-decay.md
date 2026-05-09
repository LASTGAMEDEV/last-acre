# Spec 06: Storage Quality Decay

**Tier:** 2 — Economic & Business Depth  
**Status:** Draft  
**Dependencies:** Existing inventory system, building system, electricity system, market system. Integration with Spec 01 (soil/crop quality).

---

## 1. Objective

Transform storage from an **infinite-quality black hole** into a **logistics puzzle** where the gap between harvest and sale/processing is filled with meaningful tension. Grain moisture, pest pressure, temperature hotspots, and quality degradation create urgency: you cannot simply stockpile forever. The player must actively manage drying, aeration, pest control, and turnover timing — or watch premium harvests decay into feed-grade losses.

---

## 2. Design Principles

1. **Quality is perishable, not binary:** A "premium" harvest doesn't stay premium by default. It decays on a curve.
2. **Prevention is cheaper than cure:** Drying at harvest costs fuel. Fumigating a full-blown infestation costs more and may downgrade quality.
3. **Scale creates complexity:** Small farms store in sacks (easy to manage). Large farms need silos, aeration, and temperature monitoring.
4. **Visible consequences:** Moldy grain looks different. Hot spots glow red. Pest damage shows as weight loss. The UI must make decay visceral.
5. **Connects harvest → storage → market → processing:** A weak link anywhere degrades the whole chain.

---

## 3. Data Model

### 3.1 Stored Crop Batch

```ts
// types/storage.ts
export interface StoredCropBatch {
  id: string;
  cropId: string;
  parcelId: string;           // source parcel (for traceability)
  harvestDay: number;
  quantityKg: number;
  
  // Quality at harvest (inherited from soil + harvest conditions)
  baseQuality: number;        // 0–100
  currentQuality: number;     // 0–100, decays over time
  qualityGrade: 'premium' | 'standard' | 'feed' | 'waste';
  
  // Storage physics
  moisturePercent: number;    // 8–35% typical for grain
  temperatureC: number;       // current temp of batch
  pestInfestation: number;    // 0–100 (weevil/mite population proxy)
  moldSeverity: number;       // 0–100
  
  // Storage location
  facilityId: string | null;  // null = outdoor/bag storage (worst)
  storageType: 'bag' | 'silo' | 'coldStorage' | 'hermeticBag';
  
  // Audit trail
  dryingHistory: DryingRecord[];
  fumigationHistory: FumigationRecord[];
  temperatureLog: { day: number; tempC: number }[];
}

export interface DryingRecord {
  day: number;
  method: 'sun' | 'mechanical' | 'continuousFlow';
  moistureBefore: number;
  moistureAfter: number;
  fuelLiters: number;
  electricityKwh: number;
  cost: number;
}

export interface FumigationRecord {
  day: number;
  method: 'phosphine' | 'coldTreatment' | 'diatomaceousEarth';
  effectiveness: number;
  cost: number;
  organicCompliant: boolean;
}
```

### 3.2 Storage Facility

```ts
export interface StorageFacility {
  id: string;
  name: string;
  type: 'flatWarehouse' | 'silo' | 'coldStorage' | 'hermeticSilo';
  capacityKg: number;
  currentLoadKg: number;
  
  // Climate control
  hasAeration: boolean;
  hasTemperatureMonitoring: boolean;
  hasAutoAeration: boolean;
  targetTemperatureC: number | null;
  
  // Physics
  ambientTemperatureC: number; // current internal temp
  ambientHumidityPercent: number;
  insulationFactor: number;    // 0–1, how well it buffers external weather
  
  // Status
  batches: string[]; // batch IDs
  hotSpots: HotSpot[];
  maintenanceDueDay: number;
}

export interface HotSpot {
  batchId: string;
  location: 'center' | 'wall' | 'base' | 'top';
  temperatureC: number;
  severity: 'warning' | 'critical' | 'emergency';
  daysActive: number;
}
```

### 3.3 Quality Grade Thresholds

```ts
export const qualityGrades = {
  premium: { min: 85, priceMultiplier: 1.3 },
  standard: { min: 60, priceMultiplier: 1.0 },
  feed: { min: 30, priceMultiplier: 0.45 },
  waste: { min: 0, priceMultiplier: 0.0 },
};
```

---

## 4. Static Data (`data/storagePhysics.ts`)

```ts
export const storagePhysics = {
  // Moisture equilibrium: grain absorbs/desorbs moisture based on air RH
  equilibriumMoisture: {
    wheat: { coefficients: [0.15, 0.25, 0.35, 0.45] }, // at 20%, 40%, 60%, 80% RH
    corn: { coefficients: [0.14, 0.24, 0.34, 0.44] },
    barley: { coefficients: [0.16, 0.26, 0.36, 0.46] },
    rice: { coefficients: [0.13, 0.23, 0.33, 0.43] },
  },
  
  // Safe storage moisture (below this = minimal degradation)
  safeMoisture: {
    grain: 14.0,
    oilseed: 12.0,
    legume: 15.0,
    forage: 18.0,
  },
  
  // Mold growth thresholds
  mold: {
    minMoisture: 15.0,      // no mold below this
    minTemperature: 10,      // no mold below this
    optimalTemp: 25,         // fastest growth
    growthRate: 2.5,         // severity + per day at optimal
    spoilageThreshold: 50,   // batch becomes unmarketable
  },
  
  // Pest biology (simplified weevil model)
  pests: {
    minTemp: 15,
    optimalTemp: 28,
    maxTemp: 35,
    minMoisture: 12,
    reproductionRate: 0.08,  // population multiplier per day at optimal
    damagePerDay: 0.3,       // quality loss per day at heavy infestation
    weightLossPerDay: 0.5,   // kg lost per 1000kg per day at infestation 80+
  },
  
  // Temperature
  hotSpot: {
    triggerTemp: 35,
    criticalTemp: 45,
    combustionTemp: 60,      // very rare but real
    spreadRate: 0.5,         // temp increase per day if unchecked
  },
  
  // Quality decay (per day, base rate)
  qualityDecay: {
    premium: { rate: 0.2, coldStorageMultiplier: 0.2 },
    standard: { rate: 0.15, coldStorageMultiplier: 0.15 },
    feed: { rate: 0.05, coldStorageMultiplier: 0.1 },
  },
  
  // Drying
  drying: {
    sunDrying: { capacityKgPerDay: 500, moistureReduction: 2.0, cost: 0, weatherDependent: true },
    mechanicalBatch: { capacityKgPerDay: 3000, moistureReduction: 4.0, fuelPerTon: 8, costPerTon: 12 },
    continuousFlow: { capacityKgPerDay: 15000, moistureReduction: 6.0, fuelPerTon: 6, costPerTon: 8 },
  },
};
```

---

## 5. Engine Logic (`engine/storage.ts`)

### 5.1 Daily Storage Tick

```ts
export function tickStorageBatch(
  batch: StoredCropBatch,
  facility: StorageFacility | null,
  ambientWeather: { tempC: number; humidityPercent: number },
  day: number,
): StorageBatchDeltas {
  const deltas: StorageBatchDeltas = {
    moistureChange: 0,
    tempChange: 0,
    pestGrowth: 0,
    moldGrowth: 0,
    qualityLoss: 0,
    weightLoss: 0,
    newHotSpot: null,
  };
  
  const physics = storagePhysics;
  
  // 1. Temperature equilibrium
  const targetTemp = facility?.targetTemperatureC ?? ambientWeather.tempC;
  const insulation = facility?.insulationFactor ?? 0.1; // bags have no insulation
  const tempDiff = targetTemp - batch.temperatureC;
  deltas.tempChange = tempDiff * insulation * 0.3; // gradual equilibration
  
  // 2. Moisture equilibrium
  const cropType = getCropType(batch.cropId);
  const equilibriumMoisture = interpolateEquilibriumMoisture(
    cropType,
    facility?.ambientHumidityPercent ?? ambientWeather.humidityPercent
  );
  const moistureDiff = equilibriumMoisture - batch.moisturePercent;
  deltas.moistureChange = moistureDiff * 0.05 * (1 - (facility?.insulationFactor ?? 0));
  
  // 3. Mold growth
  if (batch.moisturePercent > physics.mold.minMoisture && batch.temperatureC > physics.mold.minTemperature) {
    const tempFactor = Math.max(0, 1 - Math.abs(batch.temperatureC - physics.mold.optimalTemp) / 15);
    const moistureFactor = (batch.moisturePercent - physics.mold.minMoisture) / 10;
    deltas.moldGrowth = physics.mold.growthRate * tempFactor * moistureFactor;
  }
  
  // 4. Pest growth
  if (batch.temperatureC > physics.pests.minTemp && batch.temperatureC < physics.pests.maxTemp && batch.moisturePercent > physics.pests.minMoisture) {
    const tempFactor = 1 - Math.abs(batch.temperatureC - physics.pests.optimalTemp) / 13;
    const populationFactor = 1 + (batch.pestInfestation / 100); // exponential
    deltas.pestGrowth = physics.pests.reproductionRate * tempFactor * populationFactor;
    deltas.qualityLoss += physics.pests.damagePerDay * (batch.pestInfestation / 100);
    
    if (batch.pestInfestation > 80) {
      deltas.weightLoss = (physics.pests.weightLossPerDay / 100) * batch.quantityKg;
    }
  }
  
  // 5. Quality decay from time + mold
  const baseDecay = physics.qualityDecay[batch.qualityGrade]?.rate ?? 0.1;
  const coldMultiplier = facility?.type === 'coldStorage' ? 0.2 : 1.0;
  deltas.qualityLoss += baseDecay * coldMultiplier;
  deltas.qualityLoss += (batch.moldSeverity / 100) * 0.5; // mold destroys quality
  
  // 6. Hot spot detection (silos only)
  if (facility?.type === 'silo' && batch.quantityKg > 10000) {
    const moldHeat = batch.moldSeverity * 0.2;
    const pestHeat = batch.pestInfestation * 0.15;
    const localizedTemp = batch.temperatureC + moldHeat + pestHeat;
    
    if (localizedTemp > physics.hotSpot.triggerTemp && Math.random() < 0.1) {
      deltas.newHotSpot = {
        batchId: batch.id,
        location: 'center',
        temperatureC: localizedTemp,
        severity: localizedTemp > physics.hotSpot.criticalTemp ? 'critical' : 'warning',
        daysActive: 1,
      };
    }
  }
  
  return deltas;
}
```

### 5.2 Dryer Operation

```ts
export function runGrainDryer(
  batch: StoredCropBatch,
  method: 'sun' | 'mechanical' | 'continuousFlow',
  targetMoisture: number,
  fuelPrice: number,
  electricityPrice: number,
  weather: WeatherEvent,
): { success: boolean; batches: DryingRecord[]; cost: number } {
  const config = storagePhysics.drying[method];
  
  if (method === 'sun' && weather.precipitationMm > 0) {
    return { success: false, batches: [], cost: 0 }; // can't sun-dry in rain
  }
  
  const tons = batch.quantityKg / 1000;
  const passesNeeded = Math.ceil((batch.moisturePercent - targetMoisture) / config.moistureReduction);
  const records: DryingRecord[] = [];
  let totalCost = 0;
  let currentMoisture = batch.moisturePercent;
  
  for (let i = 0; i < passesNeeded; i++) {
    const moistureBefore = currentMoisture;
    currentMoisture = Math.max(targetMoisture, currentMoisture - config.moistureReduction);
    const fuelLiters = config.fuelPerTon * tons;
    const cost = (fuelLiters * fuelPrice) + (config.costPerTon * tons);
    totalCost += cost;
    
    records.push({
      day: 0, // filled by store
      method,
      moistureBefore,
      moistureAfter: currentMoisture,
      fuelLiters,
      electricityKwh: method === 'continuousFlow' ? tons * 15 : 0,
      cost,
    });
  }
  
  return { success: true, batches: records, cost: totalCost };
}
```

### 5.3 Fumigation

```ts
export function runFumigation(
  batch: StoredCropBatch,
  method: 'phosphine' | 'coldTreatment' | 'diatomaceousEarth',
  organicCertified: boolean,
): { effectiveness: number; cost: number; qualityImpact: number } {
  if (organicCertified && method === 'phosphine') {
    return { effectiveness: 0, cost: 0, qualityImpact: 0 }; // blocked
  }
  
  const configs = {
    phosphine: { effectiveness: 0.95, costPerTon: 8, qualityImpact: -1 },
    coldTreatment: { effectiveness: 0.85, costPerTon: 25, qualityImpact: 0 },
    diatomaceousEarth: { effectiveness: 0.70, costPerTon: 12, qualityImpact: -0.5 },
  };
  
  const config = configs[method];
  const tons = batch.quantityKg / 1000;
  
  return {
    effectiveness: config.effectiveness * (1 - batch.pestInfestation / 200), // harder to kill heavy infestations
    cost: config.costPerTon * tons,
    qualityImpact: config.qualityImpact,
  };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface StorageActions {
  // Harvest integration
  storeHarvest(batch: StoredCropBatch, facilityId: string | null): void;
  
  // Drying
  scheduleDrying(batchId: string, method: 'sun' | 'mechanical' | 'continuousFlow', targetMoisture: number): void;
  
  // Pest control
  applyFumigation(batchId: string, method: 'phosphine' | 'coldTreatment' | 'diatomaceousEarth'): void;
  
  // Temperature management
  enableAeration(facilityId: string): void;
  enableColdStorage(facilityId: string, targetTemp: number): void;
  
  // Hot spot response
  aerateHotSpot(facilityId: string, hotSpotId: string): void;
  emergencyUnload(facilityId: string, batchId: string): void; // sell immediately at degraded price
  
  // Daily tick
  tickAllStorage(weather: WeatherEvent): void;
}
```

### 6.2 Harvest Flow Integration

When a crop is harvested, it does NOT go directly to the abstract `inventory`. It becomes a `StoredCropBatch`:

```ts
function harvestCrop(state: GameState, parcelId: string): void {
  const parcel = state.parcels.find(p => p.id === parcelId)!;
  const crop = parcel.currentCrop!;
  const yieldKg = calculateYield(parcel); // existing engine
  const quality = calculateHarvestQuality(parcel); // existing + soil health
  
  // Harvest moisture depends on weather
  const harvestMoisture = crop.baseHarvestMoisture + (state.weather.humidityPercent / 20);
  
  const batch: StoredCropBatch = {
    id: `batch-${state.day}-${parcelId}`,
    cropId: crop.cropId,
    parcelId,
    harvestDay: state.day,
    quantityKg: yieldKg,
    baseQuality: quality,
    currentQuality: quality,
    qualityGrade: quality > 85 ? 'premium' : 'standard',
    moisturePercent: harvestMoisture,
    temperatureC: state.weather.tempC,
    pestInfestation: 5, // minimal baseline
    moldSeverity: 0,
    facilityId: null,
    storageType: 'bag',
    dryingHistory: [],
    fumigationHistory: [],
    temperatureLog: [],
  };
  
  state.storageBatches.push(batch);
  
  // If auto-store-to-silo is enabled and space exists
  const bestFacility = findBestStorageFacility(state, batch);
  if (bestFacility) {
    batch.facilityId = bestFacility.id;
    batch.storageType = bestFacility.type === 'coldStorage' ? 'coldStorage' : 'silo';
    bestFacility.batches.push(batch.id);
    bestFacility.currentLoadKg += yieldKg;
  } else {
    state.notifications.push({
      day: state.day,
      type: 'storage',
      message: `Harvest stored in bags (no silo space). Monitor moisture!`,
      urgent: harvestMoisture > 16,
    });
  }
}
```

### 6.3 Selling Integration

When selling from storage, the batch's `currentQuality` and `qualityGrade` determine price:

```ts
function sellFromStorage(state: GameState, batchId: string, amountKg: number, marketTier: string): void {
  const batch = state.storageBatches.find(b => b.id === batchId)!;
  const grade = batch.qualityGrade;
  const multiplier = qualityGrades[grade].priceMultiplier;
  
  const basePrice = getMarketPrice(batch.cropId, marketTier);
  const finalPrice = basePrice * multiplier * (batch.currentQuality / 100);
  
  // Moldy batches may be rejected entirely by premium buyers
  if (batch.moldSeverity > 30 && marketTier === 'export') {
    state.notifications.push({
      day: state.day,
      type: 'market',
      message: `Export buyer rejected ${batch.cropId} — mold severity ${batch.moldSeverity}%`,
      urgent: true,
    });
    return;
  }
  
  state.money += (amountKg / 1000) * finalPrice;
  batch.quantityKg -= amountKg;
  
  if (batch.quantityKg <= 0) {
    removeBatch(state, batchId);
  }
}
```

---

## 7. UI/UX Design

### 7.1 New Tab: Storage / Silos

```
┌─────────────────────────────────────────┐
│  🏚️ STORAGE & SILOS                     │
│                                         │
│  SILO 1 (50t capacity)                 │
│  [████████████░░░░░░░░░░] 62% full     │
│  Temp: 18°C ✅ | Aeration: ON          │
│                                         │
│  └─ Wheat batch #1042 (12,400 kg)      │
│     Grade: STANDARD ↓ (was Premium)    │
│     Moisture: 15.2% ⚠️                 │
│     Pests: 12% | Mold: 3%              │
│     [Dry to 14%] [Fumigate] [Sell]    │
│                                         │
│  BAG STORAGE (outdoor)                 │
│  └─ Corn batch #1045 (2,100 kg)        │
│     🔥 HOT SPOT DETECTED (42°C)        │
│     [Emergency unload] [Aerate]        │
│                                         │
│  [Build new silo] [Buy cold storage]   │
└─────────────────────────────────────────┘
```

### 7.2 Drying Modal

```
┌─────────────────────────────────────────┐
│  DRY: Wheat batch #1042                │
│  Current: 15.2% | Target: 14.0%        │
│                                         │
│  Sun drying:     0€ | 3 days | weather │
│  Mechanical:    45€ | 6 hours | fuel   │
│  Continuous:   120€ | 2 hours | fuel   │
│                                         │
│  [Queue in dryer] [Cancel]             │
└─────────────────────────────────────────┘
```

### 7.3 Quality Grade Icons

| Grade | Icon | Color | Meaning |
|-------|------|-------|---------|
| Premium | ⭐⭐⭐ | Gold | Top price, export eligible |
| Standard | ⭐⭐ | Blue | Normal market price |
| Feed | ⭐ | Brown | 45% price, animal feed only |
| Waste | ✕ | Gray | Unsellable, compost or discard |

### 7.4 Notifications

```
🔥 CRITICAL: Hot spot in Silo 2 (48°C)
   Corn batch #1041 is self-heating. Aerate immediately
   or emergency unload to prevent combustion.

🐛 WARNING: Pest infestation 65% in bag storage
   Weevils detected. Fumigate or quality will drop
   to FEED grade in ~8 days.

💧 ADVISORY: Wheat moisture 16.8% — above safe
   storage. Mold risk in 4 days. Consider drying.
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Harvest** (`engine/crops.ts`) | Harvest creates `StoredCropBatch` with initial moisture based on weather. Quality inherited from soil health (Spec 01). |
| **Buildings** (`data/buildingTypes.ts`) | Silos, cold storage units, grain dryers become buildable/purchasable structures with capacity and features. |
| **Electricity** | Cold storage and continuous dryers consume significant power. Auto-aeration requires electricity. |
| **Market** | Selling price = base × `qualityGrade.multiplier` × (`currentQuality` / 100). Export buyers reject moldy grain. |
| **Processing** | Processing input quality is capped by storage batch quality. Moldy grain ruins artisan products. |
| **Organic** (Spec 03) | Phosphine fumigation is organic-non-compliant. Cold treatment or diatomaceous earth required. |
| **Weather** | Ambient temperature and humidity drive storage physics. Sun drying blocked by rain. |

---

## 9. Files to Create / Modify

### New Files
```
types/storage.ts               # StoredCropBatch, StorageFacility, HotSpot
data/storagePhysics.ts         # Equilibrium curves, pest biology, decay rates
engine/storage.ts              # Daily tick, dryer operation, fumigation
components/StorageDashboard.tsx # Main storage tab UI
components/DryingModal.tsx     # Dryer queue and scheduling
components/QualityBadge.tsx    # Grade icon component
components/HotSpotAlert.tsx    # Emergency notification UI
```

### Modified Files
```
store/useGameStore.ts          # storageBatches array, storage actions, harvest flow update
engine/crops.ts                # Harvest output creates StoredCropBatch instead of raw inventory
app/(tabs)/economia.tsx        # Storage losses shown in P&L
app/(tabs)/mercado.tsx         # Selling pulls from batches with quality modifiers
data/buildingTypes.ts          # Add silo, cold storage, grain dryer buildings
```

---

## 10. Balance Notes

- **Early game:** Harvest 2–5 tons. Store in bags. Sun-drying is free but weather-dependent. Mechanical drying is unaffordable. Player learns to sell quickly or lose quality.
- **Mid game (first silo):** 50t capacity changes everything. Can hold grain for price rallies. But silos need monitoring — first hot spot teaches the player about aeration.
- **Late game:** Cold storage + temperature monitoring + auto-aeration = near-zero losses. The player has graduated from survival logistics to optimization.
- **Quality cliff:** Premium → Standard happens gradually. Standard → Feed happens faster. Feed → Waste is sudden (mold bloom). Creates "sell now or risk disaster" tension.
- **Spontaneous combustion:** Extremely rare (requires >20t wet grain + weeks of neglect). But the one time it happens, the player never ignores hot spots again.

---

## 11. Open Questions

1. **Traceability depth:** Should processing recipes trace back to specific parcel/batch ("Single Origin Olive Oil, Field 7, Harvest Day 842") for premium artisan branding?
2. **Mixed storage:** Can multiple crop types share a silo? (Realistically no, but gameplay-wise maybe yes with cleaning cost between batches?)
3. **Hermetic bags:** Should hermetic storage (Oxygen-free bags) be an affordable early-game alternative to silos for small batches?
4. **Aeration physics:** Should silo aeration be a simple ON/OFF, or should players manage fan speed based on grain moisture and ambient humidity (deeper simulation)?

---

*Ready for review. Once approved, we move to Tier 3 — Spec 07: Pollination System.*
