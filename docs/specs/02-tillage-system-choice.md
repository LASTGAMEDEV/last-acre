# Spec 02: Tillage System Choice

**Tier:** 1 — High-Impact Realism Gaps  
**Status:** Draft  
**Dependencies:** Spec 01 (Active Soil Degradation), machinery system (`engine/machinery.ts`), weed system, fuel system.

---

## 1. Objective

Introduce **tillage as a meaningful strategic decision** rather than an invisible default. The player must choose how to prepare each parcel before planting, with real tradeoffs between fuel costs, soil health, weed pressure, and machinery requirements. This is one of the most consequential decisions real farmers make — it should feel consequential here too.

---

## 2. Design Principles

1. **One choice, many consequences:** Tillage is not cosmetic. It links fuel, soil, weeds, and machinery into one decision.
2. **Equipment-gated:** No-till and reduced tillage require specific implements. You can't just "choose no-till" without the right planter.
3. **Parcel-scoped:** Each parcel has its own tillage history. You can experiment with conventional on one field and no-till on another.
4. **Visible over time:** Soil differences emerge over 1–3 seasons, rewarding long-term consistency.

---

## 3. Data Model

### 3.1 New Type: `TillageSystem`

```ts
// types/tillage.ts
export type TillageSystem = 'conventional' | 'reduced' | 'noTill';

export interface TillageConfig {
  id: TillageSystem;
  name: string;
  nameEs: string;              // "Laboreo convencional", "Laboreo reducido", "Siembra directa"
  fuelLitersPerHa: number;
  laborHoursPerHa: number;
  machineryRequired: MachineRequirement[];
  
  // Soil effects (applied once per tillage operation)
  soilEffects: {
    compactionDelta: number;   // +8 conventional, +3 reduced, -2 no-till (loosened by roots)
    omDelta: number;           // -3 conventional, -1 reduced, +0.5 no-till
    microbialLifeDelta: number; // -5 conventional, -2 reduced, +1 no-till
  };
  
  // Weed effects
  weedEffects: {
    initialWeedSuppression: number; // 0–100, applied at tillage time
    ongoingWeedMultiplier: number;  // multiplier on weed growth rate
  };
  
  // Erosion effects
  erosionMultiplier: number;   // 1.0 conventional, 0.6 reduced, 0.15 no-till
  
  // Visual / flavor
  description: string;
  suitableForSlope: 'all' | 'gentle' | 'flat'; // no-till preferred on slopes
}
```

### 3.2 LandParcel Extension

```ts
interface LandParcel {
  // ... existing fields
  tillage: {
    currentSystem: TillageSystem;
    timesTilledThisWay: number;  // cumulative count
    lastTillageDay: number;      // game day of last tillage
    consecutiveSeasons: number;  // how many seasons this system has been used
  };
}
```

> **Migration:** Existing saves initialize with `currentSystem: 'conventional'` (safe default), `timesTilledThisWay: 1`, `lastTillageDay: 0`, `consecutiveSeasons: 1`.

---

## 4. Static Data (`data/tillageTypes.ts`)

```ts
import { TillageConfig } from '../types/tillage';

export const tillageTypes: Record<TillageSystem, TillageConfig> = {
  conventional: {
    id: 'conventional',
    name: 'Conventional Tillage',
    nameEs: 'Laboreo convencional',
    fuelLitersPerHa: 45,
    laborHoursPerHa: 3.5,
    machineryRequired: [
      { type: 'tractor', minPowerHp: 120, attachment: 'moldboardPlow' },
      { type: 'tractor', minPowerHp: 100, attachment: 'discHarrow' },
    ],
    soilEffects: {
      compactionDelta: 8,
      omDelta: -3,
      microbialLifeDelta: -5,
    },
    weedEffects: {
      initialWeedSuppression: 85,  // buries most weeds
      ongoingWeedMultiplier: 0.7,  // fewer surviving weeds
    },
    erosionMultiplier: 1.0,
    description: 'Deep inversion plowing. Clean seedbed, high fuel, destroys soil structure.',
    suitableForSlope: 'flat',
  },
  
  reduced: {
    id: 'reduced',
    name: 'Reduced Tillage',
    nameEs: 'Laboreo reducido',
    fuelLitersPerHa: 28,
    laborHoursPerHa: 2.0,
    machineryRequired: [
      { type: 'tractor', minPowerHp: 90, attachment: 'chiselPlow' },
      { type: 'tractor', minPowerHp: 80, attachment: 'discHarrow' },
    ],
    soilEffects: {
      compactionDelta: 3,
      omDelta: -1,
      microbialLifeDelta: -2,
    },
    weedEffects: {
      initialWeedSuppression: 55,
      ongoingWeedMultiplier: 0.9,
    },
    erosionMultiplier: 0.6,
    description: 'Shallow tillage. Moderate fuel, preserves some structure, some weeds survive.',
    suitableForSlope: 'gentle',
  },
  
  noTill: {
    id: 'noTill',
    name: 'No-Till',
    nameEs: 'Siembra directa',
    fuelLitersPerHa: 8,
    laborHoursPerHa: 0.8,
    machineryRequired: [
      { type: 'tractor', minPowerHp: 120, attachment: 'noTillPlanter' },
    ],
    soilEffects: {
      compactionDelta: -2,       // roots and earthworms loosen soil over time
      omDelta: 0.5,
      microbialLifeDelta: 1,
    },
    weedEffects: {
      initialWeedSuppression: 10, // only chemical or mechanical control
      ongoingWeedMultiplier: 1.4, // weeds grow faster without burial
    },
    erosionMultiplier: 0.15,
    description: 'Zero soil disturbance. Very low fuel, builds organic matter, requires specialized planter and weed control.',
    suitableForSlope: 'all',
  },
};
```

---

## 5. Engine Logic (`engine/tillage.ts`)

### 5.1 Tillage Operation Validation

```ts
export interface TillageValidation {
  canTillage: boolean;
  reason?: string;           // "Missing no-till planter"
  fuelCost: number;          // liters needed
  laborCost: number;         // hours needed
  estimatedDuration: number; // minutes (for UI)
  warnings: string[];        // non-blocking: "Soil is wet — compaction will be higher"
}

export function validateTillageOperation(
  parcel: LandParcel,
  system: TillageSystem,
  ownedMachines: Machine[],
  contractorAvailable: boolean,
  weather: WeatherEvent,
): TillageValidation {
  const config = tillageTypes[system];
  const warnings: string[] = [];
  
  // Check machinery
  const hasRequiredEquipment = config.machineryRequired.every(req => 
    ownedMachines.some(m => m.type === req.type && m.powerHp >= req.minPowerHp && m.attachments.includes(req.attachment))
  );
  
  if (!hasRequiredEquipment && !contractorAvailable) {
    return {
      canTillage: false,
      reason: `Missing: ${config.machineryRequired.map(r => r.attachment).join(', ')}`,
      fuelCost: 0, laborCost: 0, estimatedDuration: 0, warnings,
    };
  }
  
  // Wet soil warning (Spec 01 integration)
  const soilMoisture = estimateSoilMoisture(parcel, weather);
  if (soilMoisture > 60) {
    warnings.push(`Soil is wet (${soilMoisture}%). Compaction will be ${Math.round(soilMoisture / 10)}% higher.`);
  }
  
  // Slope warning
  if (parcel.slopePercent > 8 && system === 'conventional') {
    warnings.push(`Steep slope (${parcel.slopePercent}%). Conventional tillage increases erosion risk heavily.`);
  }
  
  const fuelCost = config.fuelLitersPerHa * parcel.sizeHa;
  const laborCost = config.laborHoursPerHa * parcel.sizeHa;
  
  return {
    canTillage: true,
    fuelCost,
    laborCost,
    estimatedDuration: (laborCost * 60) / 1.5, // assumes 1.5 workers
    warnings,
  };
}
```

### 5.2 Apply Tillage Effects

```ts
export interface TillageResult {
  soilDeltas: Partial<SoilHealth>;
  weedSuppression: number;
  erosionMultiplier: number;
  fuelConsumed: number;
  omCost: number; // € cost
}

export function applyTillage(
  parcel: LandParcel,
  system: TillageSystem,
  fuelPricePerLiter: number,
  laborPricePerHour: number,
  soilMoisture: number,
): TillageResult {
  const config = tillageTypes[system];
  
  // Moisture amplifies compaction (Spec 01)
  const moistureMultiplier = soilMoisture > 60 ? 1.5 : soilMoisture > 40 ? 1.2 : 1.0;
  
  return {
    soilDeltas: {
      compaction: config.soilEffects.compactionDelta * moistureMultiplier,
      organicMatter: config.soilEffects.omDelta,
      microbialLife: config.soilEffects.microbialLifeDelta,
    },
    weedSuppression: config.weedEffects.initialWeedSuppression,
    erosionMultiplier: config.erosionMultiplier,
    fuelConsumed: config.fuelLitersPerHa * parcel.sizeHa,
    omCost: (config.fuelLitersPerHa * fuelPricePerLiter + config.laborHoursPerHa * laborPricePerHour) * parcel.sizeHa,
  };
}
```

### 5.3 Long-term Bonuses / Penalties

```ts
export function computeTillageLongTermBonus(
  parcel: LandParcel,
): { yieldModifier: number; fuelSavingsPercent: number } {
  const { currentSystem, consecutiveSeasons } = parcel.tillage;
  
  if (currentSystem === 'noTill' && consecutiveSeasons >= 3) {
    // Well-established no-till: better water infiltration, earthworm activity
    return {
      yieldModifier: 1 + (Math.min(consecutiveSeasons, 10) * 0.008), // up to +8%
      fuelSavingsPercent: 80,
    };
  }
  
  if (currentSystem === 'conventional' && consecutiveSeasons >= 3) {
    // Compaction buildup hurts
    return {
      yieldModifier: 1 - (Math.min(consecutiveSeasons, 10) * 0.005), // up to -5%
      fuelSavingsPercent: 0,
    };
  }
  
  return { yieldModifier: 1.0, fuelSavingsPercent: 0 };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface TillageActions {
  // Player selects tillage system before planting (or between harvest and planting)
  setParcelTillageSystem(parcelId: string, system: TillageSystem): void;
  
  // Executes the tillage operation
  executeTillage(parcelId: string, system: TillageSystem): void;
  
  // Hire contractor for tillage (if missing equipment)
  hireTillageContractor(parcelId: string, system: TillageSystem): void;
}
```

### 6.2 State Machine for Parcel

A parcel can only be tilled when it is:
- **Empty** (after harvest, before planting), OR
- **Stubble** (recently harvested, crop residue present)

```ts
type ParcelTillageState = 'notNeeded' | 'needed' | 'completed';

// In LandParcel:
interface LandParcel {
  // ...
  tillageState: ParcelTillageState;
  residueCover: number; // 0–100, percent of soil covered by previous crop residue
}
```

**Flow:**
1. Harvest crop → parcel enters `tillageState: 'needed'`
2. Player chooses system + executes → `tillageState: 'completed'`
3. Plant crop → resets to `tillageState: 'notNeeded'` until next harvest

### 6.3 `advanceDay()` Integration

```ts
function tickTillageEffects(state: GameState): void {
  state.parcels.forEach(parcel => {
    if (parcel.tillage.currentSystem === 'noTill') {
      // Residue builds up over time
      parcel.residueCover = Math.min(100, parcel.residueCover + 2);
    } else {
      // Conventional/reduced tillage buries residue
      parcel.residueCover = Math.max(0, parcel.residueCover - 10);
    }
    
    // Consecutive seasons counter
    // (Incremented when planting after tillage in the same system)
  });
}
```

---

## 7. UI/UX Design

### 7.1 Tierras Screen — Tillage Card

When a parcel is in `tillageState: 'needed'`, show a prominent **Tillage Action Card**:

```
┌─────────────────────────────────────────┐
│  🚜 PREPARE SOIL FOR PLANTING          │
│                                         │
│  [Conventional]  [Reduced]  [No-Till]  │
│                                         │
│  Conventional Tillage                   │
│  Fuel: 180 L  |  Cost: €216            │
│  ⚠️ Will add +8 compaction             │
│  ✅ Low weed pressure                   │
│  ❌ High erosion risk on slope         │
│                                         │
│  [Execute]  [Hire Contractor €340]     │
└─────────────────────────────────────────┘
```

**Selection UI:**
- Three large tappable cards with icons
- Selected card expands to show full stats comparison
- Gray out options where machinery is missing, with "Rent/Buy" or "Hire Contractor" fallback
- Show small bar chart comparing fuel cost, compaction impact, weed risk

### 7.2 Tillage Comparison Modal

Accessible from the tillage card or via an info button:

| Factor | Conventional | Reduced | No-Till |
|--------|-------------|---------|---------|
| Fuel/ha | 45 L | 28 L | 8 L |
| Compaction | +8 | +3 | −2 |
| OM change | −3 | −1 | +0.5 |
| Weed suppression | 85% | 55% | 10% |
| Erosion risk | High | Medium | Very Low |
| Machinery needed | Plow + disc | Chisel + disc | No-till planter |
| Long-term (3+ yrs) | Yield −5% | Neutral | Yield +8% |

### 7.3 Planting Flow Integration

When player taps "Plant" on an empty parcel:
1. If `tillageState === 'needed'`: **Block planting** with modal: "You must prepare this soil first. Choose tillage system."
2. If `tillageState === 'completed'`: Proceed to crop selection.
3. Optional shortcut: "Plant with default tillage" setting in settings (default: conventional).

### 7.4 Parcel List Indicators

Add a small tillage icon next to parcel names in list view:
- 🚜 = Conventional
- ⤵️ = Reduced  
- 🌱 = No-till
- ❓ = Needs tillage (pulsing amber dot)

---

## 8. Weed System Integration

Tillage choice feeds directly into the existing weed system:

```ts
// In weed growth calculation (engine/weeds.ts or within crops.ts)
function calculateWeedPressure(
  parcel: LandParcel,
  baseWeedRate: number,
): number {
  const config = tillageTypes[parcel.tillage.currentSystem];
  
  let pressure = baseWeedRate * config.weedEffects.ongoingWeedMultiplier;
  
  // No-till without herbicide = weed explosion
  if (parcel.tillage.currentSystem === 'noTill' && !parcel.lastHerbicideApplication) {
    pressure *= 2.0;
  }
  
  // Residue cover suppresses weeds slightly even in no-till
  pressure *= (1 - (parcel.residueCover / 300)); // max 33% suppression
  
  return pressure;
}
```

**Herbicide button** appears prominently for no-till parcels: "Weed pressure is high. Apply herbicide? (€X, organic compliance risk)"

---

## 9. Machinery System Integration

### 9.1 New Machine Types / Attachments

Add to `data/machineTypes.ts`:

```ts
{
  id: 'moldboardPlow',
  name: 'Moldboard Plow',
  type: 'attachment',
  requiredPowerHp: 120,
  price: 4500,
  maintenancePerHa: 12,
},
{
  id: 'chiselPlow',
  name: 'Chisel Plow',
  type: 'attachment',
  requiredPowerHp: 90,
  price: 3200,
  maintenancePerHa: 8,
},
{
  id: 'noTillPlanter',
  name: 'No-Till Planter with Coulters',
  type: 'attachment',
  requiredPowerHp: 120,
  price: 18500, // expensive!
  maintenancePerHa: 15,
  description: 'Required for zero-tillage planting. Cuts through residue.',
}
```

### 9.2 Contractor Fallback

If player lacks equipment, show contractor hire:
- Conventional: €120/ha
- Reduced: €95/ha
- No-till: €70/ha (but fewer contractors offer it — 60% availability)

---

## 10. Organic Certification Integration (Spec 03 Prep)

Tillage choice affects organic compliance:
- **Conventional tillage:** Organic compliant (physical weed control).
- **Reduced tillage:** Organic compliant.
- **No-till + herbicide:** **Non-compliant** for organic. Must use mechanical weed control (flame weeder, roller crimper) or cover crop termination.

Add a toggle in the no-till card: "Use mechanical weed control only (organic compliant, +15% labor cost)"

---

## 11. Files to Create / Modify

### New Files
```
types/tillage.ts               # TillageSystem, TillageConfig
data/tillageTypes.ts           # Static tillage definitions
engine/tillage.ts              # Validation, application, long-term bonus functions
components/TillageSelector.tsx # Three-card selection UI
components/TillageReport.tsx   # Comparison modal
```

### Modified Files
```
store/useGameStore.ts          # Tillage actions, tillageState machine, residue tracking
data/machineTypes.ts           # Add moldboardPlow, chiselPlow, noTillPlanter
engine/crops.ts                # Yield formula reads tillage long-term bonus
engine/weeds.ts                # Weed pressure uses tillage multiplier
app/(tabs)/tierras.tsx         # Tillage card in parcel detail, planting flow gate
app/(tabs)/maquinaria.tsx      # Show tillage attachments in machinery shop
```

---

## 12. Balance Notes

- **Early game:** Conventional is the default (equipment is cheaper). No-till planter is a €18,500 investment — a meaningful mid-game goal.
- **Mid game (year 2–3):** Reduced tillage is the comfortable middle path.
- **Late game:** No-till pays off in fuel savings (+80% after 3 seasons), yield bonus (+8%), and erosion protection.
- **Skill expression:** Sloped parcels heavily favor no-till. Flat, high-value vegetable plots might still justify conventional for the weed control.
- **Never forced:** Player can conventional-till forever if they manage compaction with subsoiling. It's suboptimal but viable.

---

## 13. Open Questions

1. **Cover crop termination:** Should no-till players be able to "plant" cover crops that are terminated mechanically (roller crimper) before cash crop planting? This is a real no-till workflow.
2. **Tillage timing:** Should tillage be a day-consuming operation (blocks the tractor for N hours), or instant like current actions?
3. **Residue visualization:** Do we want visual residue cover on the parcel map view (straw-colored overlay)?

---

*Ready for review. Once approved, we move to Spec 03: Organic Certification & Transition Period.*
