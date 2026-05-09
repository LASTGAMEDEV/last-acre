# Spec 07: Pollination System (Make the Colmena Actually Matter)

**Tier:** 3 — System Interconnections  
**Status:** Draft  
**Dependencies:** Existing animal/building system (`data/buildingTypes.ts`, `data/animalTypes.ts`), crop system, pesticide system, weather system. Integrates with Spec 01 (soil/crop quality), Spec 03 (organic compliance).

---

## 1. Objective

Transform the existing **colmena (beehive)** from a decorative building into a **living, productive system** that creates tangible interdependencies across the farm. Bees provide pollination bonuses to nearby crops, produce honey as a sellable commodity, and are vulnerable to the player's own pesticide decisions. Suddenly, pest management and animal management are linked: spray too much near the hives and you kill your pollinators, crashing yields on dependent crops. This is the flagship "system interconnection" feature.

---

## 2. Design Principles

1. **Proximity matters:** Hive placement is strategic. Too far from dependent crops = wasted potential. Too close to spray zones = dead bees.
2. **Bees are livestock, not buildings:** They have health, productivity, disease, and reproduction. They need active management.
3. **Pollination is invisible but visible:** Players see the yield bonus at harvest, and see bee activity indicators during flowering. The cause-effect loop must be clear.
4. **Honey is a real product:** Seasonal, floral-source-dependent, with its own quality grades and market premiums.
5. **Swarming is opportunity + risk:** A swarm is a free hive if you catch it. If you don't, it's a lost colony and angry neighbors.

---

## 3. Data Model

### 3.1 Beehive Entity

```ts
// types/bees.ts
export interface Beehive {
  id: string;
  buildingId: string;         // links to placed colmena building
  parcelId: string;           // placed on/near this parcel
  
  // Colony health
  colonyStrength: number;     // 0–100 (frames of bees proxy)
  queenAgeMonths: number;     // queens decline after 24 months
  queenQuality: 'poor' | 'fair' | 'good' | 'excellent';
  
  // Disease & stress
  varroaInfestation: number;  // 0–100 (mite load)
  pesticideExposureDays: number; // days since last exposure
  pesticideImpact: number;    // 0–100, temporary productivity reduction
  
  // Production
  honeyStoredKg: number;
  waxStoredKg: number;
  propolisStoredKg: number;
  
  // Seasonal state
  floweringCalendar: FloweringPeriod[]; // what they're foraging now
  dailyForagePotential: number; // 0–100 based on nearby crops
  
  // Swarming
  swarmLikelihood: number;    // 0–1, calculated from colony strength + season
  hasSwarmedThisSeason: boolean;
  swarmRiskDate: number | null; // predicted swarm day
  
  // Management
  lastInspectionDay: number;
  daysSinceInspection: number;
  treatmentsApplied: TreatmentRecord[];
}

export interface FloweringPeriod {
  cropId: string;
  startDay: number;
  endDay: number;
  nectarValue: number;        // 0–10 (honey production potential)
  pollenValue: number;        // 0–10 (colony nutrition)
}

export interface TreatmentRecord {
  day: number;
  type: 'varroaOxalic' | 'varroaFormic' | 'varroaThymol' | 'antibiotics';
  effectiveness: number;
  organicCompliant: boolean;
}
```

### 3.2 Crop Pollination Profile

Extend `data/cropTypes.ts`:

```ts
export interface CropPollinationProfile {
  dependency: 'none' | 'low' | 'medium' | 'high' | 'essential';
  yieldBonusPercent: number;      // max bonus at full pollination
  floweringDays: number;          // how long they provide forage
  nectarValue: number;            // 0–10
  pollenValue: number;            // 0–10
  attractsBees: boolean;          // some crops provide forage without needing pollination
}

// Examples:
const pollinationProfiles: Record<string, CropPollinationProfile> = {
  wheat: { dependency: 'none', yieldBonusPercent: 0, floweringDays: 10, nectarValue: 3, pollenValue: 2, attractsBees: true },
  corn: { dependency: 'none', yieldBonusPercent: 0, floweringDays: 7, nectarValue: 4, pollenValue: 5, attractsBees: true },
  sunflower: { dependency: 'high', yieldBonusPercent: 25, floweringDays: 21, nectarValue: 9, pollenValue: 6, attractsBees: true },
  almond: { dependency: 'essential', yieldBonusPercent: 40, floweringDays: 14, nectarValue: 8, pollenValue: 7, attractsBees: true },
  apple: { dependency: 'high', yieldBonusPercent: 30, floweringDays: 10, nectarValue: 6, pollenValue: 4, attractsBees: true },
  tomato: { dependency: 'medium', yieldBonusPercent: 15, floweringDays: 30, nectarValue: 5, pollenValue: 3, attractsBees: true },
  canola: { dependency: 'low', yieldBonusPercent: 8, floweringDays: 28, nectarValue: 10, pollenValue: 8, attractsBees: true },
  pumpkin: { dependency: 'essential', yieldBonusPercent: 35, floweringDays: 14, nectarValue: 7, pollenValue: 5, attractsBees: true },
};
```

### 3.3 Pollination Zone

```ts
export interface PollinationZone {
  hiveId: string;
  centerParcelId: string;
  affectedParcelIds: string[];
  radiusParcels: number;      // 1–3 parcels depending on hive strength
  currentEffectiveness: number; // 0–1, reduced by pesticide exposure
}
```

---

## 4. Static Data (`data/beeTypes.ts`)

```ts
export const beeSpecies = {
  europeanHoneyBee: {
    id: 'europeanHoneyBee',
    name: 'European Honey Bee',
    nameEs: 'Abeja melífera europea',
    baseForagingRadiusKm: 3,
    colonyMaxStrength: 100,
    optimalTempC: { min: 15, max: 35 },
    flightMinTemp: 12,
    swarmSeason: { startDay: 120, endDay: 180 }, // May–June
    honeyPerHiveMaxKg: 45,
    waxPerHiveMaxKg: 2,
  },
};

export const beeDiseaseProfiles = {
  varroa: {
    name: 'Varroa destructor',
    growthRate: 0.03,         // +3% per day untreated in warm weather
    damageThreshold: 30,      // above this, colony decline accelerates
    colonyDamage: 0.5,        // strength loss per day above threshold
    treatments: {
      oxalicAcid: { effectiveness: 0.85, organic: true, temperatureReq: '<12°C' },
      formicAcid: { effectiveness: 0.80, organic: true, temperatureReq: '15–30°C' },
      thymol: { effectiveness: 0.75, organic: true, temperatureReq: '>15°C' },
      syntheticAmitraz: { effectiveness: 0.95, organic: false, temperatureReq: 'any' },
    },
  },
};

export const pesticideToxicity = {
  neonicotinoid: { beeDeathRate: 0.4, recoveryDays: 21, organicBanned: true },
  pyrethroid: { beeDeathRate: 0.15, recoveryDays: 14, organicBanned: false },
  organophosphate: { beeDeathRate: 0.25, recoveryDays: 18, organicBanned: true },
  biological: { beeDeathRate: 0.02, recoveryDays: 3, organicBanned: false },
  copperSulfur: { beeDeathRate: 0.0, recoveryDays: 0, organicBanned: false },
};
```

---

## 5. Engine Logic (`engine/bees.ts`)

### 5.1 Pollination Bonus Calculation

```ts
export function computePollinationBonus(
  crop: CropType,
  parcel: LandParcel,
  nearbyHives: Beehive[],
  day: number,
): number {
  const profile = crop.pollination;
  if (profile.dependency === 'none') return 0;
  
  // Is the crop currently flowering?
  const growthProgress = parcel.cropGrowthDays / crop.growthDays;
  const isFlowering = growthProgress >= 0.3 && growthProgress <= 0.6; // middle third
  if (!isFlowering) return 0;
  
  // Sum hive contributions
  let totalPollinationService = 0;
  nearbyHives.forEach(hive => {
    if (hive.pesticideImpact > 80) return; // bees too sick to forage
    if (hive.colonyStrength < 20) return; // too weak
    
    const distance = getDistance(parcel.id, hive.parcelId); // in parcel units
    const maxRadius = 1 + (hive.colonyStrength / 50); // 1–3 parcels
    if (distance > maxRadius) return;
    
    const distanceFactor = 1 - (distance / maxRadius) * 0.5; // 100% at center, 50% at edge
    const healthFactor = (hive.colonyStrength / 100) * (1 - hive.pesticideImpact / 200);
    
    totalPollinationService += distanceFactor * healthFactor;
  });
  
  // Diminishing returns: 1 strong hive = good, 5 hives ≠ 5x bonus
  const effectiveService = Math.min(totalPollinationService, 2.5);
  const coverageRatio = Math.min(effectiveService / getRequiredHivesForFullCoverage(crop), 1.0);
  
  return profile.yieldBonusPercent * coverageRatio;
}

function getRequiredHivesForFullCoverage(crop: CropType): number {
  const map = { none: 0, low: 0.5, medium: 1.0, high: 1.5, essential: 2.0 };
  return map[crop.pollination.dependency];
}
```

### 5.2 Honey Production

```ts
export function computeHoneyProduction(
  hive: Beehive,
  nearbyCrops: CropType[],
  weather: WeatherEvent,
  day: number,
): { honeyKg: number; waxKg: number; colonyGrowth: number } {
  const species = beeSpecies.europeanHoneyBee;
  
  // Weather gate
  if (weather.tempC < species.flightMinTemp || weather.precipitationMm > 5 || weather.windKmH > 40) {
    return { honeyKg: 0, waxKg: 0, colonyGrowth: -0.1 }; // bad weather = slight decline
  }
  
  // Forage quality
  let totalNectar = 0;
  let totalPollen = 0;
  nearbyCrops.forEach(crop => {
    const isFlowering = isCropFlowering(crop, day);
    if (isFlowering) {
      totalNectar += crop.pollination.nectarValue;
      totalPollen += crop.pollination.pollenValue;
    }
  });
  
  const forageScore = Math.min((totalNectar + totalPollen) / 10, 1.0);
  
  // Colony capacity
  const strengthFactor = hive.colonyStrength / species.colonyMaxStrength;
  const queenFactor = hive.queenQuality === 'excellent' ? 1.2 : hive.queenQuality === 'poor' ? 0.7 : 1.0;
  const pesticideFactor = Math.max(0, 1 - hive.pesticideImpact / 100);
  const varroaFactor = Math.max(0, 1 - hive.varroaInfestation / 100);
  
  const dailyHoney = (species.honeyPerHiveMaxKg / 120) * forageScore * strengthFactor * queenFactor * pesticideFactor * varroaFactor;
  const dailyWax = dailyHoney * 0.04;
  
  // Colony growth: positive if forage is good and healthy, negative if stressed
  const colonyGrowth = (forageScore * 0.3) - (hive.varroaInfestation / 200) - (hive.pesticideImpact / 300);
  
  return {
    honeyKg: dailyHoney,
    waxKg: dailyWax,
    colonyGrowth,
  };
}
```

### 5.3 Swarming Logic

```ts
export function computeSwarmRisk(
  hive: Beehive,
  day: number,
): number {
  const species = beeSpecies.europeanHoneyBee;
  const isSwarmSeason = day >= species.swarmSeason.startDay && day <= species.swarmSeason.endDay;
  if (!isSwarmSeason) return 0;
  
  let risk = 0;
  
  if (hive.colonyStrength > 80) risk += 0.4;
  else if (hive.colonyStrength > 60) risk += 0.2;
  
  if (hive.queenAgeMonths > 18) risk += 0.2; // old queen = swarm instinct
  if (hive.honeyStoredKg > species.honeyPerHiveMaxKg * 0.8) risk += 0.15; // crowded
  if (hive.daysSinceInspection > 14) risk += 0.1; // unmanaged
  
  // Reduce risk if split/prevented recently
  if (hive.hasSwarmedThisSeason) risk = 0;
  
  return Math.min(risk, 0.95);
}

export function resolveSwarmEvent(
  hive: Beehive,
  swarmRisk: number,
): { didSwarm: boolean; newHiveId?: string; lostStrength: number } {
  if (Math.random() > swarmRisk) {
    return { didSwarm: false, lostStrength: 0 };
  }
  
  // Colony splits
  const lostStrength = 40 + Math.floor(Math.random() * 20); // lose 40–60% of bees
  hive.colonyStrength -= lostStrength;
  hive.hasSwarmedThisSeason = true;
  
  // 30% chance player can catch the swarm (if they have empty hive equipment)
  const catchable = Math.random() < 0.3;
  
  return {
    didSwarm: true,
    newHiveId: catchable ? `swarm-${Date.now()}` : undefined,
    lostStrength,
  };
}
```

### 5.4 Pesticide Impact

```ts
export function applyPesticideToHive(
  hive: Beehive,
  pesticideType: string,
  distanceMeters: number,
): void {
  const toxicity = pesticideToxicity[pesticideType as keyof typeof pesticideToxicity];
  if (!toxicity) return;
  
  // Distance attenuation: within 500m = full effect, 500m–2km = half, >2km = none
  const distanceFactor = distanceMeters < 500 ? 1.0 : distanceMeters < 2000 ? 0.5 : 0;
  if (distanceFactor === 0) return;
  
  const impact = toxicity.beeDeathRate * distanceFactor * 100;
  hive.pesticideImpact = Math.min(100, hive.pesticideImpact + impact);
  hive.pesticideExposureDays = toxicity.recoveryDays;
  
  // Immediate colony loss
  hive.colonyStrength = Math.max(0, hive.colonyStrength - (impact * 0.5));
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface BeeActions {
  // Hive management
  placeHive(parcelId: string): void; // builds colmena
  inspectHive(hiveId: string): void; // reveals varroa, queen status
  treatHive(hiveId: string, treatment: TreatmentRecord['type']): void;
  replaceQueen(hiveId: string, quality: Beehive['queenQuality']): void; // costs €25–€60
  
  // Production
  harvestHoney(hiveId: string): void; // moves honey to inventory
  harvestWax(hiveId: string): void;
  
  // Swarming
  catchSwarm(swarmId: string, parcelId: string): void; // requires empty hive equipment
  preventSwarm(hiveId: string): void; // split colony early, costs equipment
  
  // Pesticide integration (called by spray actions)
  notifyPesticideSpray(parcelId: string, pesticideType: string): void;
  
  // Daily tick
  tickBeehives(weather: WeatherEvent): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickBeehives(state: GameState, weather: WeatherEvent, day: number): void {
  state.beehives.forEach(hive => {
    // 1. Pesticide recovery
    if (hive.pesticideExposureDays > 0) {
      hive.pesticideExposureDays -= 1;
      hive.pesticideImpact = Math.max(0, hive.pesticideImpact - (hive.pesticideImpact / hive.pesticideExposureDays));
    }
    
    // 2. Varroa growth
    if (weather.tempC > 20) {
      hive.varroaInfestation = Math.min(100, hive.varroaInfestation + beeDiseaseProfiles.varroa.growthRate * 100);
    }
    if (hive.varroaInfestation > beeDiseaseProfiles.varroa.damageThreshold) {
      hive.colonyStrength = Math.max(0, hive.colonyStrength - beeDiseaseProfiles.varroa.colonyDamage);
    }
    
    // 3. Queen aging
    hive.queenAgeMonths += 1 / 30;
    if (hive.queenAgeMonths > 24 && hive.queenQuality !== 'poor') {
      hive.queenQuality = 'poor'; // old queen = reduced productivity
    }
    
    // 4. Honey production
    const nearbyCrops = getNearbyCrops(state.parcels, hive.parcelId, 3);
    const production = computeHoneyProduction(hive, nearbyCrops, weather, day);
    hive.honeyStoredKg += production.honeyKg;
    hive.waxStoredKg += production.waxKg;
    hive.colonyStrength = Math.min(100, hive.colonyStrength + production.colonyGrowth);
    
    // 5. Swarm check
    const swarmRisk = computeSwarmRisk(hive, day);
    if (swarmRisk > 0.3 && !hive.hasSwarmedThisSeason) {
      state.notifications.push({
        day,
        type: 'bees',
        message: `Hive ${hive.id} is preparing to swarm! Inspect and split soon.`,
        urgent: swarmRisk > 0.6,
      });
    }
    
    if (Math.random() < swarmRisk / 365) { // daily roll
      const swarm = resolveSwarmEvent(hive, 1.0); // force since we passed the roll
      if (swarm.didSwarm) {
        state.newsEvents.push({
          day,
          headline: swarm.newHiveId ? 'Swarm Caught!' : 'Hive Swarmed',
          body: swarm.newHiveId 
            ? `A swarm from hive ${hive.id} was caught and placed in a new hive.`
            : `Hive ${hive.id} has swarmed. Colony strength reduced by ${swarm.lostStrength}%.`,
          type: swarm.newHiveId ? 'positive' : 'negative',
        });
      }
    }
    
    // 6. Inspection reminder
    hive.daysSinceInspection += 1;
    if (hive.daysSinceInspection > 21 && hive.varroaInfestation > 20) {
      state.notifications.push({
        day,
        type: 'bees',
        message: `Hive ${hive.id} needs inspection. Varroa may be building up.`,
        urgent: false,
      });
    }
  });
}
```

---

## 7. UI/UX Design

### 7.1 Animales Tab — Beehive Sub-Tab

```
┌─────────────────────────────────────────┐
│  🐝 BEEHIVES (3 active)                 │
│                                         │
│  HIVE #1 — Field Edge                   │
│  [████████████░░░░░░] Strength: 82%    │
│  Queen: Good (18 months)               │
│  Varroa: 12% ✅                        │
│  Honey: 12.4 kg | Wax: 0.8 kg          │
│  ⚠️ SWARM RISK: 45% (inspect soon)     │
│                                         │
│  [Inspect] [Treat Varroa] [Harvest]   │
│  [Replace Queen] [Prevent Swarm]      │
│                                         │
│  HIVE #2 — Orchard                      │
│  [████████░░░░░░░░░░] Strength: 45%    │
│  🚨 PESTICIDE IMPACT: 65%              │
│  Recovery: 8 days remaining            │
│  Honey: 3.1 kg                         │
│                                         │
│  [Inspect] [Wait for recovery]        │
└─────────────────────────────────────────┘
```

### 7.2 Map Overlay — Pollination Radius

Toggle on world map / tierras map:
- Circles around hives showing effective foraging radius (1–3 parcels)
- Green tint on parcels receiving full pollination
- Yellow tint on parcels receiving partial pollination
- Red X on parcels where pesticide was recently sprayed within radius

### 7.3 Pesticide Spray Warning

When player selects pesticide on a parcel near hives:
```
┌─────────────────────────────────────────┐
│  ⚠️ BEE HAZARD                          │
│                                         │
│  2 hives within 1.2 km of this parcel  │
│  Neonicotinoid will:                    │
│  • Kill ~40% of foraging bees           │
│  • Reduce hive productivity for 21 days │
│  • Reduce pollination bonus on:         │
│    - Sunflower (Field 3): −25% yield   │
│    - Apple (Field 5): −30% yield       │
│                                         │
│  Alternative: Biological control        │
│  • Only 2% bee mortality                │
│  • 3-day recovery                       │
│                                         │
│  [Use Biological] [Spray Anyway] [Cancel]│
└─────────────────────────────────────────┘
```

### 7.4 Honey Inventory & Market

Honey becomes a tradable product:
```
┌─────────────────────────────────────────┐
│  🍯 HONEY INVENTORY                     │
│                                         │
│  Spring multifloral — 8.2 kg           │
│  Source: Canola, apple blossom         │
│  Quality: 78 (Standard)                │
│  Market price: €14/kg                  │
│                                         │
│  Summer sunflower — 4.1 kg             │
│  Source: Sunflower, lavender           │
│  Quality: 91 (Premium)                 │
│  Market price: €22/kg                  │
│                                         │
│  [Sell] [Process into cosmetics]       │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Crops** (`engine/crops.ts`) | Yield formula adds `computePollinationBonus()` during flowering period. Essential crops (almond, pumpkin) fail without bees. |
| **Pesticides** | Every spray action calls `notifyPesticideSpray()` which checks hive proximity and applies `pesticideImpact`. |
| **Buildings** | Colmena becomes a managed entity, not just a static building. Requires inspections like livestock. |
| **Weather** | Bee flight blocked by rain, wind, cold. Honey production zero on bad weather days. |
| **Organic** (Spec 03) | Organic farms must use organic varroa treatments (oxalic/formic/thymol). Synthetic amitraz = decertification risk. |
| **Storage** (Spec 06) | Harvested honey is a stored batch with quality decay (crystallization over time). |
| **Market** | Honey sold as artisan product with floral-source premiums. Wax used in cosmetics/pharmaceuticals processing. |
| **Animals** | Bee health parallels livestock health — disease, productivity, breeding (swarming). |

---

## 9. Files to Create / Modify

### New Files
```
types/bees.ts                  # Beehive, FloweringPeriod, TreatmentRecord
data/beeTypes.ts               # Species profiles, disease data, pesticide toxicity
data/cropPollination.ts        # Pollination profiles for each crop (or extend cropTypes.ts)
engine/bees.ts                 # Pollination bonus, honey production, swarm logic, pesticide impact
components/BeehiveManager.tsx  # Animal tab sub-screen
components/PollinationMap.tsx  # Radius overlay on farm map
components/HoneyInventory.tsx  # Honey-specific storage/selling UI
components/SwarmAlert.tsx      # Swarm warning modal
```

### Modified Files
```
store/useGameStore.ts          # Beehive state, actions, advanceDay tick
engine/crops.ts                # Yield formula adds pollination bonus phase
data/buildingTypes.ts          # Colmena gains active management properties
data/cropTypes.ts              # Add `pollination` profile to each crop
app/(tabs)/animales.tsx        # Add Beehive sub-tab alongside herd
app/(tabs)/tierras.tsx         # Pollination radius overlay toggle
```

---

## 10. Balance Notes

- **Early game (1–2 hives):** Place near high-value dependent crops (sunflower, tomato). Pollination bonus (+15–25%) pays for the hive in one season. Bee management is light — inspect monthly.
- **Mid game (5–10 hives):** Varroa becomes a real threat if ignored. Pesticide scheduling now requires bee-awareness. Honey becomes a steady side income (€500–€1,500/year).
- **Late game (20+ hives):** Professional apiary operation. Swarm management is a seasonal rhythm. Honey is a major product line. Organic honey commands 3× conventional price.
- **Trap:** Player sprays neonicotinoid on 50ha of corn (doesn't need bees), forgetting the 3 hives nearby. Loses 40% colony strength, misses sunflower pollination window, loses €3,000 in yield. Lesson learned.

---

## 11. Open Questions

1. **Native pollinators:** Should wild bees/bumblebees provide a baseline pollination bonus (e.g., +5%) even without managed hives? This makes hives an accelerator, not a gate.
2. **Migratory beekeeping:** Should players be able to load hives on trucks and move them to almond orchards for 2-week pollination contracts (real Spanish practice)?
3. **Hive products beyond honey:** Should propolis, royal jelly, and bee venom be unlockable products for cosmetics/pharma processing?
4. **Winter mortality:** Should hives have a winter survival check (feeding, insulation) or do we assume Mediterranean climate = mild winters?

---

*Ready for review. Once approved, we move to Spec 08: Manure Management & Composting.*
