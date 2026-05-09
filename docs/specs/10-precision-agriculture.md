# Spec 10: Precision Agriculture / Soil Testing Lab

**Tier:** 3 — System Interconnections  
**Status:** Draft  
**Dependencies:** Existing soil system, machinery system, crop system, weed system. Integrates with Spec 01 (soil amendments), Spec 04 (subsidies / environmental scoring).

---

## 1. Objective

Introduce **precision agriculture** as a late-game efficiency layer that rewards players who have scaled beyond survival. Instead of treating each parcel as a uniform rectangle, the farm is divided into management zones with distinct soil properties, yield potential, and weed pressure. Grid sampling, variable-rate application, yield mapping, and spot spraying give the player data-driven tools to cut input costs by 20–30%, boost yields on underperforming zones, and build a multi-year understanding of their land. This is how modern farms actually operate — and it should feel like a satisfying upgrade from "spray and pray" to "measure and manage."

---

## 2. Design Principles

1. **Data as a crop:** Soil maps and yield data are accumulated assets. The more years of data, the better the decisions.
2. **Granularity creates opportunity:** A parcel that averages pH 6.5 might hide zones at pH 5.2 and 7.1. Uniform application wastes money on both extremes.
3. **Technology gates the depth:** Basic grid sampling (2×2 zones) is affordable early. RTK-GPS variable-rate application requires expensive equipment. Drone weed mapping is mid-tier.
4. **Visual payoff:** Color-coded zone maps, yield heatmaps, and prescription overlays must make the player feel like they're looking at a real farm data dashboard.
5. **Diminishing returns on small farms:** Precision ag shines at 50+ hectares. On a 5-hectare farm, it's overkill. The game should naturally gate this behind scale.

---

## 3. Data Model

### 3.1 Soil Zone

```ts
// types/precisionAg.ts
export interface SoilZone {
  id: string;
  parcelId: string;
  zoneIndex: number;          // 0 to (gridSize^2 - 1)
  row: number;
  col: number;
  
  // Geometry
  sizeHa: number;
  centerLat: number;
  centerLng: number;
  
  // True soil values (hidden until sampled)
  trueSoil: SoilHealth;       // actual values, may differ from parcel average
  
  // Known values (revealed by sampling)
  sampledSoil: Partial<SoilHealth> | null;
  sampleConfidence: number;   // 0–100, higher with denser sampling
  lastSampledDay: number | null;
  
  // Yield history
  yieldHistory: ZoneYieldRecord[];
  
  // Weed pressure
  weedDetected: boolean;
  weedCoveragePercent: number;
  lastWeedSurveyDay: number | null;
  
  // Elevation / topography
  elevationM: number;
  slopePercent: number;
  aspect: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
}

export interface ZoneYieldRecord {
  year: number;
  cropId: string;
  yieldKgPerHa: number;
  moisturePercent: number;
  qualityGrade: string;
}
```

### 3.2 Soil Lab Report

```ts
export interface SoilLabReport {
  id: string;
  parcelId: string;
  sampledDay: number;
  gridSize: number;           // 2, 3, or 4 (zones per side)
  samplingDepthCm: number;    // 0–30 typical
  
  // Per-zone results
  zoneResults: ZoneLabResult[];
  
  // Recommendations
  recommendations: LabRecommendation[];
  cost: number;
  turnaroundDays: number;
  status: 'pending' | 'ready' | 'archived';
}

export interface ZoneLabResult {
  zoneId: string;
  pH: number;
  nitrogenMgKg: number;
  phosphorusMgKg: number;
  potassiumMgKg: number;
  organicMatterPercent: number;
  cationExchangeCapacity: number;
  texture: 'sand' | 'loamySand' | 'sandyLoam' | 'loam' | 'siltyLoam' | 'clayLoam' | 'clay';
}

export interface LabRecommendation {
  zoneId: string;
  inputType: 'lime' | 'gypsum' | 'nitrogen' | 'phosphorus' | 'potassium' | 'compost';
  rateKgPerHa: number;
  expectedCostPerHa: number;
  expectedYieldImprovementPercent: number;
}
```

### 3.3 Prescription Map

```ts
export interface PrescriptionMap {
  id: string;
  parcelId: string;
  type: 'fertilizer' | 'lime' | 'seed' | 'herbicide';
  createdDay: number;
  basedOnReportId: string;
  
  // Per-zone application rates
  zoneRates: ZonePrescriptionRate[];
  
  // Comparison to flat-rate
  flatRateKgPerHa: number;
  totalInputKg: number;
  totalInputCost: number;
  savingsVsFlatRate: number;      // € saved
  savingsPercent: number;
  
  // Application
  applied: boolean;
  appliedDay: number | null;
  machineryUsed: string | null;
}

export interface ZonePrescriptionRate {
  zoneId: string;
  rateKgPerHa: number;
  rateVsFlatPercent: number;      // +20%, -15%, etc.
  reason: string;                 // "pH 5.2: lime required"
}
```

### 3.4 Weed Detection Map

```ts
export interface WeedDetectionMap {
  id: string;
  parcelId: string;
  surveyDay: number;
  method: 'drone' | 'satellite' | 'tractorCamera' | 'manual';
  
  zones: {
    zoneId: string;
    weedCoveragePercent: number;
    primaryWeedSpecies: string;
    sprayRecommended: boolean;
    sprayRateLitersPerHa: number;
  }[];
  
  totalSprayAreaHa: number;       // only zones with weeds
  totalSprayVolumeLiters: number;
  savingsVsBroadcastPercent: number;
}
```

---

## 4. Static Data (`data/precisionAgEquipment.ts`)

```ts
export const precisionAgEquipment = {
  soilSampling: {
    manualProbe: { costPerSample: 15, zonesPerDay: 8, accuracy: 0.85 },
    automatedSampler: { cost: 12000, zonesPerDay: 40, accuracy: 0.95, maintenancePerYear: 800 },
  },
  
  variableRateApplicator: {
    basicVRA: { cost: 8500, accuracy: 0.80, sections: 4 }, // 4-section boom
    advancedVRA: { cost: 28000, accuracy: 0.95, sections: 16, rtkGps: true },
    seedVRA: { cost: 15000, accuracy: 0.90 },
  },
  
  yieldMonitor: {
    basic: { cost: 6000, accuracy: 0.90, dataResolution: 'perPass' },
    advanced: { cost: 18000, accuracy: 0.98, dataResolution: 'perZone', moistureSensor: true },
  },
  
  weedDetection: {
    drone: { cost: 3500, flightTimeMin: 25, coverageHaPerFlight: 15, accuracy: 0.88 },
    tractorCamera: { cost: 9000, realTime: true, accuracy: 0.92 },
    satellite: { costPerScan: 200, coverage: 'unlimited', accuracy: 0.75, frequency: 'weekly' },
  },
};

export const labTurnaroundDays = {
  basic: 14,
  express: 7,
  premium: 3, // costs 2x
};
```

---

## 5. Engine Logic (`engine/precisionAg.ts`)

### 5.1 Zone Generation

```ts
export function generateSoilZones(
  parcel: LandParcel,
  gridSize: number, // 2, 3, or 4
): SoilZone[] {
  const zones: SoilZone[] = [];
  const zoneSizeHa = parcel.sizeHa / (gridSize * gridSize);
  
  // Create true soil values with spatial variation around parcel average
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const variation = () => (Math.random() - 0.5) * 30; // ±15% variation
      
      zones.push({
        id: `${parcel.id}-z-${row}-${col}`,
        parcelId: parcel.id,
        zoneIndex: row * gridSize + col,
        row,
        col,
        sizeHa: zoneSizeHa,
        centerLat: 0, // populated from parcel geometry
        centerLng: 0,
        trueSoil: {
          nitrogen: clamp(parcel.soil.nitrogen + variation(), 0, 100),
          organicMatter: clamp(parcel.soil.organicMatter + variation(), 0, 100),
          compaction: clamp(parcel.soil.compaction + variation() * 0.5, 0, 100),
          ph: clamp(parcel.soil.ph + variation() / 20, 4.0, 9.0),
          microbialLife: clamp(parcel.soil.microbialLife + variation(), 0, 100),
          phosphorus: clamp(parcel.soil.phosphorus + variation(), 0, 100),
          potassium: clamp(parcel.soil.potassium + variation(), 0, 100),
          drainage: clamp(parcel.soil.drainage + variation() * 0.3, 0, 100),
          salinity: clamp((parcel.soil.salinity || 15) + variation() * 0.4, 0, 100),
        },
        sampledSoil: null,
        sampleConfidence: 0,
        lastSampledDay: null,
        yieldHistory: [],
        weedDetected: false,
        weedCoveragePercent: 0,
        lastWeedSurveyDay: null,
        elevationM: parcel.elevationM + (Math.random() - 0.5) * 5,
        slopePercent: clamp(parcel.slopePercent + (Math.random() - 0.5) * 4, 0, 25),
        aspect: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)] as SoilZone['aspect'],
      });
    }
  }
  
  return zones;
}
```

### 5.2 Soil Sampling

```ts
export function sampleSoilZones(
  zones: SoilZone[],
  method: 'manualProbe' | 'automatedSampler',
  density: 'standard' | 'intensive', // 1 sample per zone vs 3 per zone
  day: number,
): SoilLabReport {
  const equipment = precisionAgEquipment.soilSampling[method];
  const samplesPerZone = density === 'intensive' ? 3 : 1;
  const totalSamples = zones.length * samplesPerZone;
  const cost = totalSamples * equipment.costPerSample + (method === 'automatedSampler' ? 0 : 0);
  
  const zoneResults: ZoneLabResult[] = zones.map(zone => {
    // Sampled value = true value + noise based on accuracy
    const noise = () => (Math.random() - 0.5) * (1 - equipment.accuracy) * 20;
    
    return {
      zoneId: zone.id,
      pH: clamp(zone.trueSoil.ph + noise() / 10, 4.0, 9.0),
      nitrogenMgKg: clamp(zone.trueSoil.nitrogen * 5 + noise() * 5, 0, 500),
      phosphorusMgKg: clamp(zone.trueSoil.phosphorus * 3 + noise() * 3, 0, 300),
      potassiumMgKg: clamp(zone.soil.potassium * 4 + noise() * 4, 0, 400),
      organicMatterPercent: clamp(zone.trueSoil.organicMatter / 5 + noise() / 5, 0, 20),
      cationExchangeCapacity: 10 + (zone.trueSoil.organicMatter / 10) + noise(),
      texture: inferTexture(zone.trueSoil.drainage, zone.trueSoil.organicMatter),
    };
  });
  
  // Generate recommendations
  const recommendations = generateRecommendations(zones, zoneResults);
  
  return {
    id: `report-${day}-${zones[0].parcelId}`,
    parcelId: zones[0].parcelId,
    sampledDay: day,
    gridSize: Math.sqrt(zones.length),
    samplingDepthCm: 30,
    zoneResults,
    recommendations,
    cost,
    turnaroundDays: labTurnaroundDays.basic,
    status: 'pending',
  };
}
```

### 5.3 Variable-Rate Prescription

```ts
export function createVariableRatePrescription(
  report: SoilLabReport,
  targetCrop: CropType,
  inputType: 'nitrogen' | 'phosphorus' | 'potassium' | 'lime',
  flatRateKgPerHa: number,
): PrescriptionMap {
  const zoneRates: ZonePrescriptionRate[] = [];
  let totalInputKg = 0;
  let totalFlatRateKg = 0;
  
  report.zoneResults.forEach(zoneResult => {
    const zone = getZoneById(zoneResult.zoneId);
    let rateKgPerHa = flatRateKgPerHa;
    let reason = 'Standard rate';
    
    switch (inputType) {
      case 'nitrogen': {
        const nRequirement = targetCrop.soilNeeds.nitrogenMin;
        const nAvailable = zoneResult.nitrogenMgKg * 0.5; // simplistic availability factor
        const deficit = Math.max(0, nRequirement - nAvailable);
        rateKgPerHa = deficit * 2; // kg N per ha
        reason = deficit > 20 ? `N deficit: ${deficit.toFixed(0)} mg/kg` : 'Adequate N';
        break;
      }
      case 'lime': {
        const pHDeficit = Math.max(0, targetCrop.soilNeeds.phOptimum - zoneResult.pH);
        rateKgPerHa = pHDeficit * 1500; // kg lime per pH unit
        reason = pHDeficit > 0.5 ? `pH ${zoneResult.pH.toFixed(1)}: lime required` : 'pH adequate';
        break;
      }
      case 'phosphorus': {
        const pRequirement = targetCrop.soilNeeds.phosphorusMin;
        const deficit = Math.max(0, pRequirement - zoneResult.phosphorusMgKg);
        rateKgPerHa = deficit * 3;
        reason = deficit > 10 ? `P deficit: ${deficit.toFixed(0)} mg/kg` : 'P adequate';
        break;
      }
    }
    
    rateKgPerHa = Math.max(0, rateKgPerHa);
    const vsFlat = flatRateKgPerHa > 0 ? ((rateKgPerHa - flatRateKgPerHa) / flatRateKgPerHa) * 100 : 0;
    
    zoneRates.push({ zoneId: zoneResult.zoneId, rateKgPerHa, rateVsFlatPercent: vsFlat, reason });
    totalInputKg += rateKgPerHa * zone.sizeHa;
    totalFlatRateKg += flatRateKgPerHa * zone.sizeHa;
  });
  
  const inputCostPerKg = getInputCost(inputType);
  const totalCost = totalInputKg * inputCostPerKg;
  const flatRateCost = totalFlatRateKg * inputCostPerKg;
  
  return {
    id: `rx-${report.id}-${inputType}`,
    parcelId: report.parcelId,
    type: inputType === 'lime' ? 'lime' : 'fertilizer',
    createdDay: report.sampledDay,
    basedOnReportId: report.id,
    zoneRates,
    flatRateKgPerHa,
    totalInputKg,
    totalInputCost: totalCost,
    savingsVsFlatRate: flatRateCost - totalCost,
    savingsPercent: flatRateCost > 0 ? ((flatRateCost - totalCost) / flatRateCost) * 100 : 0,
    applied: false,
    appliedDay: null,
    machineryUsed: null,
  };
}
```

### 5.4 Spot Spray Map

```ts
export function createSpotSprayMap(
  zones: SoilZone[],
  weedDetectionMethod: 'drone' | 'tractorCamera' | 'satellite',
  herbicideType: string,
): WeedDetectionMap {
  const equipment = precisionAgEquipment.weedDetection[weedDetectionMethod];
  const zoneData = zones.map(zone => {
    // Detection accuracy
    const detectedCoverage = clamp(zone.weedCoveragePercent + (Math.random() - 0.5) * (1 - equipment.accuracy) * 20, 0, 100);
    const sprayThreshold = 15; // % coverage before spraying
    const sprayRecommended = detectedCoverage > sprayThreshold;
    
    return {
      zoneId: zone.id,
      weedCoveragePercent: detectedCoverage,
      primaryWeedSpecies: zone.weedDetected ? 'unknown' : 'none',
      sprayRecommended,
      sprayRateLitersPerHa: sprayRecommended ? 150 : 0,
    };
  });
  
  const sprayZones = zoneData.filter(z => z.sprayRecommended);
  const sprayArea = sprayZones.reduce((sum, z) => sum + getZoneById(z.zoneId).sizeHa, 0);
  const totalArea = zones.reduce((sum, z) => sum + z.sizeHa, 0);
  
  return {
    id: `weedmap-${Date.now()}`,
    parcelId: zones[0].parcelId,
    surveyDay: 0,
    method: weedDetectionMethod,
    zones: zoneData,
    totalSprayAreaHa: sprayArea,
    totalSprayVolumeLiters: sprayZones.reduce((sum, z) => sum + z.sprayRateLitersPerHa * getZoneById(z.zoneId).sizeHa, 0),
    savingsVsBroadcastPercent: ((totalArea - sprayArea) / totalArea) * 100,
  };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface PrecisionAgActions {
  // Soil sampling
  orderSoilSampling(parcelId: string, gridSize: number, density: 'standard' | 'intensive', method: 'manualProbe' | 'automatedSampler'): void;
  receiveLabReport(reportId: string): void; // after turnaround days
  
  // Prescription maps
  generatePrescriptionMap(reportId: string, inputType: string, flatRateKgPerHa: number): void;
  applyPrescriptionMap(mapId: string, machineryId: string): void;
  
  // Yield mapping
  enableYieldMonitoring(harvesterId: string): void;
  recordYieldData(parcelId: string, zones: ZoneYieldRecord[]): void;
  
  // Weed detection
  surveyWeeds(parcelId: string, method: 'drone' | 'tractorCamera' | 'satellite'): void;
  applySpotSpray(mapId: string, machineryId: string): void;
  
  // Zone management
  regenerateZones(parcelId: string, gridSize: number): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickPrecisionAg(state: GameState, day: number): void {
  // Process pending lab reports
  state.soilLabReports.forEach(report => {
    if (report.status === 'pending' && day >= report.sampledDay + report.turnaroundDays) {
      report.status = 'ready';
      
      // Reveal sampled values to zones
      report.zoneResults.forEach(result => {
        const zone = state.soilZones.find(z => z.id === result.zoneId);
        if (zone) {
          zone.sampledSoil = {
            ph: result.pH,
            nitrogen: result.nitrogenMgKg / 5,
            phosphorus: result.phosphorusMgKg / 3,
            potassium: result.potassiumMgKg / 4,
            organicMatter: result.organicMatterPercent * 5,
          };
          zone.sampleConfidence = 85;
          zone.lastSampledDay = day;
        }
      });
      
      state.notifications.push({
        day,
        type: 'precisionAg',
        message: `Soil lab report ready for ${report.parcelId}. ${report.recommendations.length} recommendations.`,
        urgent: false,
      });
    }
  });
  
  // Yield monitor recording during harvest
  state.parcels.forEach(parcel => {
    if (parcel.status === 'harvesting' && parcel.yieldMonitorEnabled) {
      const zones = state.soilZones.filter(z => z.parcelId === parcel.id);
      zones.forEach(zone => {
        const zoneYield = calculateZoneYield(parcel, zone); // varies by zone soil
        zone.yieldHistory.push({
          year: Math.floor(day / 365) + 1,
          cropId: parcel.currentCrop!.cropId,
          yieldKgPerHa: zoneYield,
          moisturePercent: parcel.harvestMoisture,
          qualityGrade: parcel.harvestQualityGrade,
        });
      });
    }
  });
}
```

---

## 7. UI/UX Design

### 7.1 Tierras Tab — Zone Map Overlay

Toggle "Precision View" on parcel map:

```
┌─────────────────────────────────────────┐
│  FIELD 7 — 16 ha (4×4 zones)           │
│  [🌡️ pH] [🌾 N] [💧 P] [⚡ K] [📈 Yield]│
│                                         │
│  ┌───┬───┬───┬───┐                     │
│  │7.1│6.8│6.5│6.2│  pH view            │
│  ├───┼───┼───┼───┤  🟢 >6.5  🟡 6.0–6.5│
│  │7.0│6.9│6.4│6.1│  🔴 <6.0            │
│  ├───┼───┼───┼───┤                     │
│  │6.8│6.7│6.3│5.9│                     │
│  ├───┼───┼───┼───┤                     │
│  │6.9│6.6│6.2│5.8│                     │
│  └───┴───┴───┴───┘                     │
│                                         │
│  Zone 3,2: pH 5.8 🔴                    │
│  Recommend: 1,200 kg/ha lime           │
│  [Create prescription map]              │
└─────────────────────────────────────────┘
```

### 7.2 Lab Report Viewer

```
┌─────────────────────────────────────────┐
│  SOIL LAB REPORT — Field 7              │
│  Sampled: Day 452 | Grid: 4×4 | Depth: 30cm│
│                                         │
│  ┌──────┬─────┬─────┬─────┬──────────┐ │
│  │ Zone │ pH  │ N   │ P   │ Texture  │ │
│  ├──────┼─────┼─────┼─────┼──────────┤ │
│  │ 0,0  │ 7.1 │ 45  │ 22  │ Loam     │ │
│  │ 0,1  │ 6.8 │ 38  │ 18  │ Sandy L. │ │
│  │ ...  │ ... │ ... │ ... │ ...      │ │
│  │ 3,3  │ 5.8 │ 28  │ 15  │ Clay     │ │ 🔴
│  └──────┴─────┴─────┴─────┴──────────┘ │
│                                         │
│  RECOMMENDATIONS (8)                    │
│  • Lime zones 3,2 and 3,3: 1,200 kg/ha │
│  • Reduce N in zones 0,0–1,1: −30 kg/ha│
│  • Add P in zones 2,3–3,3: +25 kg/ha   │
│                                         │
│  [Generate VRA map for lime]            │
│  [Generate VRA map for NPK]             │
│  [Archive report]                       │
└─────────────────────────────────────────┘
```

### 7.3 Prescription Map Viewer

```
┌─────────────────────────────────────────┐
│  PRESCRIPTION: Lime — Field 7           │
│  Based on: Report #452                  │
│                                         │
│  FLAT RATE COMPARISON                   │
│  Uniform: 800 kg/ha × 16 ha = 12,800 kg│
│  Cost: €1,920                           │
│                                         │
│  VARIABLE RATE                          │
│  Total: 9,400 kg                        │
│  Cost: €1,410                           │
│  💰 SAVINGS: €510 (26.6%)              │
│                                         │
│  ZONE BREAKDOWN                         │
│  🟢 Zones 0,0–1,1: 0 kg/ha (pH >6.5)   │
│  🟡 Zones 1,2–2,1: 600 kg/ha           │
│  🔴 Zones 2,3–3,3: 1,200 kg/ha         │
│                                         │
│  [Apply with Tractor #2 + VRA spreader]│
└─────────────────────────────────────────┘
```

### 7.4 Yield History Map

```
┌─────────────────────────────────────────┐
│  YIELD HISTORY — Field 7 (Corn)         │
│  3-year average: 9,200 kg/ha           │
│                                         │
│  ┌───┬───┬───┬───┐                     │
│  │11k│10k│ 9k│ 7k│  Zone 3,3 consistently│
│  ├───┼───┼───┼───┤  underperforming      │
│  │10k│10k│ 8k│ 7k│  (compaction 78%)     │
│  ├───┼───┼───┼───┤                     │
│  │ 9k│ 9k│ 8k│ 6k│                     │
│  ├───┼───┼───┼───┤                     │
│  │ 9k│ 8k│ 7k│ 6k│                     │
│  └───┴───┴───┴───┘                     │
│                                         │
│  [Subsoil zone 3,3] [View soil report] │
└─────────────────────────────────────────┘
```

### 7.5 Spot Spray Interface

```
┌─────────────────────────────────────────┐
│  SPOT SPRAY: Field 3 (Wheat)            │
│  Weed survey: Drone | Day 467           │
│                                         │
│  DETECTED WEEDS                         │
│  Total coverage: 23% of field           │
│  Spray only infested zones: 4.2 ha      │
│  vs. broadcast: 15 ha                   │
│  💰 Herbicide savings: 72%              │
│  🌿 Environmental score: +15            │
│                                         │
│  [Generate spray path] [Apply now]     │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Soil** (Spec 01) | Zone-level soil values are the foundation. Precision ag reveals the spatial variation that uniform amendment misses. |
| **Machinery** | VRA spreaders, yield monitors, and tractor cameras are equipment purchases. GPS accuracy affects prescription quality. |
| **Crops** | Yield mapping records per-zone harvest data. Zone yield history identifies consistently good/bad areas for rotation decisions. |
| **Weeds** | Spot spraying reduces herbicide use by 50–80%. Connects drone/tractor camera investment to input cost savings. |
| **Subsidies** (Spec 04) | Reduced fertilizer/herbicide use improves environmental score, which may unlock agri-environment scheme bonuses. |
| **Economy** | Input cost savings (20–30%) are the primary ROI. Equipment pays for itself over 3–5 years on large farms. |
| **Organic** (Spec 03) | Spot spraying with mechanical weeders or approved herbicides is essential for organic weed management at scale. |
| **Storage** (Spec 06) | Yield monitor data includes moisture per zone, enabling targeted drying decisions. |

---

## 9. Files to Create / Modify

### New Files
```
types/precisionAg.ts           # SoilZone, SoilLabReport, PrescriptionMap, WeedDetectionMap
data/precisionAgEquipment.ts   # Equipment costs, accuracy stats
engine/precisionAg.ts          # Zone generation, sampling, prescription, spot spray
components/ZoneMap.tsx         # Color-coded grid overlay on parcel
components/LabReportViewer.tsx # Report table + recommendations
components/PrescriptionViewer.tsx # VRA comparison + application
components/YieldHistoryMap.tsx # Multi-year heatmap
components/SpotSprayPlanner.tsx # Weed detection + spray path
```

### Modified Files
```
store/useGameStore.ts          # soilZones array, lab reports, prescription maps, yield history
app/(tabs)/tierras.tsx         # Add "Precision View" toggle, zone overlays
app/(tabs)/maquinaria.tsx      # Add precision ag equipment to shop
engine/crops.ts                # Yield calculation uses zone soil if precision ag enabled
engine/weeds.ts                # Spot spray reduces herbicide application area
```

---

## 10. Balance Notes

- **Small farm (<20 ha):** Precision ag is overkill. Zone maps show variation but VRA equipment costs don't justify savings. Manual soil sampling (€200) still useful for understanding your land.
- **Medium farm (20–80 ha):** First VRA spreader (€8,500) pays back in 2–3 years via input savings. Yield monitor reveals that "Field 5" is actually two fields with different potential.
- **Large farm (80+ ha):** RTK-GPS + 16-section boom + drone fleet. The farm becomes a data operation. Spot spraying alone saves €3,000+/year in herbicides.
- **Skill expression:** Advanced players will maintain 5-year yield databases, identify persistent low-yield zones, and either fix them (subsoil, drainage) or retire them to agri-environment schemes.
- **The compaction revelation:** Yield maps often reveal that the worst-performing zone is the headland where machinery turns. This teaches field traffic management.

---

## 11. Open Questions

1. **Zone shape:** Square grid (simpler) vs. management zones based on soil similarity (more realistic but harder to visualize)?
2. **Remote sensing detail:** Should satellite imagery provide NDVI (vegetation health) maps that predict yield before harvest?
3. **Autonomous machinery:** Late-game unlock for self-driving tractors that apply prescriptions overnight without labor?
4. **Data export:** Should players be able to "export" yield data as a CSV (easter egg for real agronomists)?

---

*Ready for review. Once approved, we move to Tier 4 — Spec 11: Night Operations.*
