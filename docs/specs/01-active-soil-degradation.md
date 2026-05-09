# Spec 01: Active Soil Degradation & Restoration

**Tier:** 1 — High-Impact Realism Gaps  
**Status:** Draft  
**Dependencies:** Existing soil system (`engine/crops.ts`, `data/cropTypes.ts`), weather system (`engine/climate.ts`), machinery system (`engine/machinery.ts`), irrigation system.

---

## 1. Objective

Transform soil from a "manage once, harvest forever" state into a **dynamic, living system** where daily player decisions (tillage timing, irrigation rates, fertilizer doses, cover cropping) create compounding consequences over 2–3 seasons. Poor practices must visibly degrade yields; restorative practices must slowly rebuild soil health.

---

## 2. Design Principles

1. **Consequence, not complexity:** Every new mechanic must clearly link a player action → a soil change → a yield impact. No hidden math.
2. **Reversibility (with effort):** All degradation can be fixed, but restoration takes time and money. No permanent ruin.
3. **Layer on existing dimensions:** We already track N, OM, compaction, pH, microbial life, P, K, drainage. We add **salinity** and make all 9 dimensions respond dynamically to gameplay.
4. **Engine purity:** All calculation logic lives in `engine/` as pure functions. The store only calls them and applies state updates.

---

## 3. Data Model Changes

### 3.1 New Type: `SoilHealth` (extends existing)

```ts
// types/soil.ts (NEW FILE — extract from useGameStore.ts)
export interface SoilHealth {
  nitrogen: number;        // 0–100
  organicMatter: number;   // 0–100
  compaction: number;      // 0–100 (0 = loose, 100 = concrete)
  ph: number;              // 4.0–9.0
  microbialLife: number;   // 0–100
  phosphorus: number;      // 0–100
  potassium: number;       // 0–100
  drainage: number;        // 0–100
  salinity: number;        // 0–100 (NEW — electrical conductivity proxy)
}

export interface SoilDegradationFlags {
  // Track recent events that affect degradation rates
  daysSinceLastTillage: number;
  daysSinceHeavyMachinery: number;
  daysWithCoverCrop: number;
  totalIrrigationThisSeason: number;     // mm applied
  totalFertilizerNThisSeason: number;    // kg/ha N applied
  timesSubsoiled: number;                // lifetime count
  erosionEventsThisYear: number;
}
```

### 3.2 LandParcel Extension

```ts
// In LandParcel type (extract to types/land.ts)
interface LandParcel {
  id: string;
  name: string;
  sizeHa: number;
  soil: SoilHealth;
  degradation: SoilDegradationFlags;
  // ... existing fields
}
```

> **Migration note:** Existing saves lack `salinity` and `degradation` flags. On load, `salinity` initializes to a regional baseline (see §5.3), and `degradation` flags initialize to safe defaults.

---

## 4. Engine Logic (`engine/soilDegradation.ts`)

All functions are pure: `(currentState, action/weather, constants) => deltas`.

### 4.1 Compaction from Wet Tillage

**Trigger:** Whenever heavy machinery operates on a parcel where `soil.drainage < 40` OR `weather.precipitation > 10mm` in the last 48h.

```ts
export function computeCompactionDelta(
  parcel: LandParcel,
  machineryWeightClass: 'light' | 'medium' | 'heavy',
  soilMoisture: number, // 0–100, derived from recent rain + irrigation
): number {
  const baseImpact = { light: 1, medium: 3, heavy: 8 }[machineryWeightClass];
  const moistureMultiplier = soilMoisture > 60 ? 2.5 : soilMoisture > 40 ? 1.5 : 1.0;
  return Math.min(baseImpact * moistureMultiplier, 15); // cap single-event delta
}
```

**Recovery:** Natural recovery is `−0.3 / day` if no machinery touches the parcel. Subsoiling gives `−25` instantly but costs fuel, requires a subsoiler attachment, and destroys any growing crop.

**Yield impact:** `compaction > 50` reduces root penetration → `yield *= (1 - (compaction - 50) * 0.004)`. At 80 compaction, yield is −12%.

### 4.2 Salinization from Over-Irrigation

**Trigger:** Cumulative irrigation minus effective drainage over a season.

```ts
export function computeSalinityDelta(
  currentSalinity: number,
  irrigationMm: number,
  drainageIndex: number, // 0–100
  evapotranspirationMm: number,
  regionalSalinity: number, // baseline in water source
): number {
  const netWaterBalance = irrigationMm - evapotranspirationMm;
  const drainageEfficiency = drainageIndex / 100;
  
  // Salts accumulate when irrigation > ET and drainage is poor
  if (netWaterBalance > 0) {
    const accumulation = (netWaterBalance * (1 - drainageEfficiency) * regionalSalinity) / 200;
    return Math.min(accumulation, 2.0); // max +2/day
  }
  
  // Leaching: if heavy rain or intentional leaching irrigation, salinity drops
  return netWaterBalance < -15 ? -1.5 : -0.1;
}
```

**Restoration:**
- **Leaching irrigation:** Apply 150mm in one pass (massive water cost, possible water quota hit). Salinity `−20`.
- **Gypsum application:** New amendment in `data/amendments.ts`. Costs €80/ton, apply 2–5 t/ha. Salinity `−15`, +5% drainage improvement (one-time).

**Yield impact:** `salinity > 30` reduces yield linearly. At 60 salinity, yield −25%. At 80, only salt-tolerant crops (barley, sugar beet) can survive.

### 4.3 Acidification from Over-Fertilization

**Trigger:** Excess nitrogen application beyond crop uptake.

```ts
export function computeAcidificationDelta(
  currentPh: number,
  nAppliedKgHa: number,
  nUptakeKgHa: number,
  organicMatter: number,
): number {
  const surplus = Math.max(0, nAppliedKgHa - nUptakeKgHa);
  // Higher OM buffers pH better
  const bufferCapacity = 0.5 + (organicMatter / 200); // 0.5–1.0
  const phDrop = (surplus * 0.015) / bufferCapacity;
  return -phDrop; // negative = lower pH
}
```

**Restoration:** Lime application (already partially exists). Extend amendments:
- **Agricultural lime (CaCO₃):** +0.3 pH, €45/ton, 3 t/ha typical dose.
- **Dolomitic lime:** +0.25 pH, +5 magnesium, slower acting.
- **Wood ash:** +0.2 pH, +2 K, free if you have biomass boiler waste.

**Yield impact:** pH outside crop optimum (see `cropTypes.ts` per-crop range) reduces nutrient availability via a lookup curve. Example: wheat optimum 6.0–7.0. At pH 5.0, N/P/K availability −30%.

### 4.4 Erosion from Bare Fields

**Trigger:** Parcel has no growing crop, no cover crop, and no crop residue for >14 days, combined with weather risk.

```ts
export interface ErosionRisk {
  windErosion: number;  // 0–100
  waterErosion: number; // 0–100
}

export function computeErosionRisk(
  parcel: LandParcel,
  weather: WeatherEvent,
  slopePercent: number, // NEW field on LandParcel (0–15 typical)
): ErosionRisk {
  const isBare = parcel.degradation.daysWithCoverCrop === 0 && !parcel.currentCrop;
  if (!isBare) return { windErosion: 0, waterErosion: 0 };

  const coverMultiplier = isBare ? 1.0 : 0.1;
  const slopeMultiplier = 1 + (slopePercent / 10);
  
  const windRisk = weather.windKmH > 30 
    ? Math.min(100, weather.windKmH * slopeMultiplier * coverMultiplier)
    : 0;
    
  const waterRisk = weather.precipitationMm > 20
    ? Math.min(100, weather.precipitationMm * slopeMultiplier * coverMultiplier * (1 - parcel.soil.drainage/100))
    : 0;
    
  return { windErosion: windRisk, waterErosion: waterRisk };
}
```

**Damage application:**
- Wind erosion: `−0.5 OM / day` when risk > 70.
- Water erosion: `−1.0 OM / day`, `−0.3 N / day`, `−0.2 P / day` when risk > 70.
- If OM drops below 20: compaction `+0.2 / day` (structural collapse).

**Prevention:**
- Cover crops (existing): resets `daysWithCoverCrop` to 90+.
- Reduced tillage / no-till (see Spec 02): reduces erosion multiplier by 60%.
- Hedgerows (Spec 12): wind erosion `−40%` in adjacent parcels.
- Contour plowing (new tillage option): water erosion `−30%` on slopes >5%.

---

## 5. Store Integration

### 5.1 New Actions (in `useGameStore.ts` or split into `store/soilActions.ts`)

```ts
interface SoilActions {
  // Called by machinery operations
  applyMachineryCompaction(parcelId: string, weightClass: 'light' | 'medium' | 'heavy'): void;
  
  // Called by irrigation system
  applyIrrigation(parcelId: string, mm: number): void;
  
  // Called by fertilization
  applyFertilizer(parcelId: string, nKgHa: number, pKgHa: number, kKgHa: number): void;
  
  // Player-initiated restoration
  applySubsoiling(parcelId: string): void; // costs fuel, destroys crop
  applyLeachingIrrigation(parcelId: string): void; // 150mm water
  applyGypsum(parcelId: string, tons: number): void;
  applyLime(parcelId: string, type: 'agricultural' | 'dolomitic' | 'woodAsh', tons: number): void;
  
  // Called by advanceDay()
  tickSoilDegradation(): void;
}
```

### 5.2 `advanceDay()` Integration

Add a new phase in the daily tick (order matters):

```ts
// Inside advanceDay()
function tickSoilDegradation(state: GameState, weather: WeatherEvent): void {
  state.parcels.forEach(parcel => {
    // 1. Salinity tick
    const etMm = calculateET(parcel.currentCrop, weather); // from climate engine
    const salinityDelta = computeSalinityDelta(
      parcel.soil.salinity,
      parcel.degradation.totalIrrigationThisSeason,
      parcel.soil.drainage,
      etMm,
      getRegionalWaterSalinity(state.region)
    );
    parcel.soil.salinity = clamp(parcel.soil.salinity + salinityDelta, 0, 100);
    
    // 2. Acidification tick (from cumulative N surplus)
    if (parcel.currentCrop) {
      const nUptake = getCropNUptake(parcel.currentCrop);
      const acidDelta = computeAcidificationDelta(
        parcel.soil.ph,
        parcel.degradation.totalFertilizerNThisSeason,
        nUptake,
        parcel.soil.organicMatter
      );
      parcel.soil.ph = clamp(parcel.soil.ph + acidDelta, 4.0, 9.0);
    }
    
    // 3. Erosion tick
    const erosion = computeErosionRisk(parcel, weather, parcel.slopePercent);
    if (erosion.windErosion > 70) {
      parcel.soil.organicMatter = Math.max(0, parcel.soil.organicMatter - 0.5);
    }
    if (erosion.waterErosion > 70) {
      parcel.soil.organicMatter = Math.max(0, parcel.soil.organicMatter - 1.0);
      parcel.soil.nitrogen = Math.max(0, parcel.soil.nitrogen - 0.3);
      parcel.soil.phosphorus = Math.max(0, parcel.soil.phosphorus - 0.2);
    }
    
    // 4. Compaction natural recovery
    if (parcel.degradation.daysSinceHeavyMachinery > 7) {
      parcel.soil.compaction = Math.max(0, parcel.soil.compaction - 0.3);
    }
    
    // 5. Decrement counters
    parcel.degradation.daysSinceLastTillage += 1;
    parcel.degradation.daysSinceHeavyMachinery += 1;
    if (parcel.currentCrop?.isCoverCrop) {
      parcel.degradation.daysWithCoverCrop += 1;
    } else {
      parcel.degradation.daysWithCoverCrop = 0;
    }
  });
}
```

### 5.3 Regional Baselines

Add `region` to `GameState` (or derive from map position). Different regions start with different salinity baselines:

| Region | Salinity Baseline | Drainage Characteristic |
|--------|------------------|------------------------|
| Northern Spain (Galicia) | 5 | High rainfall, leached |
| Central Plateau (Castile) | 15 | Semi-arid, irrigation-dependent |
| Mediterranean coast | 25 | High ET, saline aquifers common |
| Guadalquivir valley | 35 | Historic irrigation, drainage issues |

---

## 6. UI/UX Design

### 6.1 Tierras (Fields) Screen — Soil Tab Enhancement

Current soil tab shows 8 stat bars. Expand to 9 bars with **dynamic color coding**:

```
Salinity  [████████░░░░░░░░░░░░] 40  ⚠️ RISING (+2/week)
```

- Green: Safe range for current crop
- Yellow: Suboptimal, yield penalty active
- Red: Critical, severe penalty or crop failure risk
- Trend arrow (↗ ↘ →) based on 7-day moving average

### 6.2 New Modal: Soil Health Report

Accessible from parcel detail view. Shows:

1. **Degradation Timeline:** Mini chart of last 90 days for each dimension.
2. **Active Risks:**
   - "Compaction rising — last heavy machinery 3 days ago on wet soil"
   - "Salinity increasing — consider leaching irrigation"
3. **Recommended Actions:** Contextual buttons:
   - If compaction > 50 && no crop: "Subsoil (€X fuel, destroys crop)"
   - If salinity > 30: "Leach irrigation (150mm water)" or "Apply gypsum"
   - If pH < crop optimum: "Apply lime (+0.3 pH)"
   - If erosion risk high: "Plant cover crop" or "Install hedgerow" (future)

### 6.3 Harvest & Operations Warnings

Before player confirms high-impact actions, show non-blocking warnings:

- **Tillage after rain:** "Soil is wet (drainage 35%). Plowing now will cause +8 compaction. Continue?"
- **Heavy irrigation on drained soil:** "Drainage is good — no salinity risk."
- **Heavy irrigation on poor drainage:** "Warning: Poor drainage + high irrigation = salinity buildup."

### 6.4 World Map / Parcel List View

Add a **Soil Health overlay** toggle on the map:
- Color parcels by overall soil health index (weighted average)
- Red parcels = urgent attention
- This gives a strategic "territory health" view for players with many fields.

---

## 7. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Machinery** (`engine/machinery.ts`) | Every job now reports `weightClass` to `applyMachineryCompaction()`. Jobs on wet soil show warning. |
| **Irrigation** (existing in store) | `applyIrrigation()` now accumulates to `totalIrrigationThisSeason` and triggers salinity calculation. |
| **Weather** (`engine/climate.ts`) | Erosion risk uses `precipitationMm` and `windKmH`. ET calculation needed for salinity. |
| **Crops** (`engine/crops.ts`) | Yield formula must read all 9 soil dimensions (adding salinity tolerance per crop). `cropTypes.ts` needs `salinityTolerance` field. |
| **Economy** | Restoration actions have costs (fuel, water, amendments). Subsoiling destroys crops = lost revenue. |
| **Processing** | Lower soil health → lower crop quality → lower processing quality input. Chain reaction. |
| **Spec 02 (Tillage)** | Tillage choice directly sets `daysSinceLastTillage`, erosion multiplier, and machinery weight class. |
| **Spec 12 (Hedgerows)** | Adjacent hedgerows reduce wind erosion risk. |

---

## 8. Files to Create / Modify

### New Files
```
engine/soilDegradation.ts      # Pure calculation functions
types/soil.ts                  # Extracted soil types
types/land.ts                  # LandParcel with degradation flags
data/amendments.ts             # Extend with gypsum, lime types
data/regionBaselines.ts        # Regional salinity & drainage defaults
```

### Modified Files
```
store/useGameStore.ts          # Add soil actions, tickSoilDegradation in advanceDay()
data/cropTypes.ts              # Add salinityTolerance, pH optimum range per crop
engine/crops.ts                # Yield formula reads salinity, pH penalty, compaction
engine/climate.ts              # Export ET calculation for salinity engine
app/(tabs)/tierras.tsx         # Soil tab UI updates, trend arrows, warnings
components/SoilHealthReport.tsx # New modal component
components/SoilBar.tsx         # Enhanced with color coding and trend arrow
```

---

## 9. Balance Notes

- **Pacing:** Degradation should be noticeable in ~10 days, problematic in ~30, catastrophic in ~90. Players need time to react.
- **Early game:** Starting parcels have decent soil (health index 60–75). Newly bought cheap land can have degraded soil (health 30–50) as a "fixer-upper" challenge.
- **Late game:** Precision ag (Spec 10) gives grid-level soil data, making optimization satisfying.
- **Never punitive:** Always show the player *why* soil is degrading and *what* to do. No hidden dice rolls.

---

## 10. Open Questions

1. **Slope data:** Do we add `slopePercent` to every `LandParcel`, or derive from world map terrain layer?
2. **ET calculation:** Does `engine/climate.ts` already export evapotranspiration, or do we need to add it?
3. **Water quota:** Should leaching irrigation count against a regional water quota / pumping limit?
4. **Visual feedback:** Do we want bare-field erosion visible (brown dust particles in wind, muddy runoff in rain) as atmospheric effects?

---

*Ready for review. Once approved, we move to Spec 02: Tillage System Choice.*
