# Pest & Disease Cycles — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Goal

Add seasonal pest and disease outbreaks that spread silently between adjacent parcels. Without a crop consultant scouting, the player only discovers infestations when damage is already severe. Treatment options include chemical pesticides/fungicides, beneficial insects, and crop rotation bonuses from the existing `cropHistory` system.

---

## Architecture

New engine file `engine/pests.ts` handles outbreak generation, spread, and severity ticks (pure functions). The store extends `LandParcel` with `pestState?: PestState`, adds `beneficialInsectsActive: boolean`, and wires the pest tick into `advanceDay()`. New worker type `crop_consultant` added to `data/workerTypes.ts`. UI adds pest indicators to parcel cards in `tierras.tsx`.

---

## Pest Types

```typescript
export type PestType = 'fungal' | 'insect' | 'nematode' | 'blight';

export const PEST_CONFIG: Record<PestType, {
  label: string;
  spreadRate: number;       // daily probability of spreading to adjacent parcel (0–1)
  growthRate: number;       // daily severity increase (0–10 scale)
  treatment: 'fungicide' | 'insecticide' | 'nematicide' | 'fungicide';
  seasonRisk: Partial<Record<Season, number>>;  // multiplier on base outbreak chance
  susceptibleCrops: string[];  // cropIds most at risk (2× outbreak chance)
}> = {
  fungal:   { label: 'Fungal Disease',  spreadRate: 0.15, growthRate: 0.8, treatment: 'fungicide',   seasonRisk: { spring: 1.5, autumn: 1.3, winter: 1.2, summer: 0.7 }, susceptibleCrops: ['wheat','potatoes','grapes','tomatoes','strawberries'] },
  insect:   { label: 'Insect Pest',     spreadRate: 0.25, growthRate: 0.6, treatment: 'insecticide', seasonRisk: { spring: 1.2, summer: 2.0, autumn: 1.0, winter: 0.1 }, susceptibleCrops: ['corn','cotton','soy','sunflower','rapeseed'] },
  nematode: { label: 'Root Nematodes',  spreadRate: 0.08, growthRate: 0.4, treatment: 'nematicide',  seasonRisk: { spring: 1.0, summer: 1.5, autumn: 1.0, winter: 0.5 }, susceptibleCrops: ['potatoes','sugarbeet','sugarcane','carrots','ginseng'] },
  blight:   { label: 'Crop Blight',     spreadRate: 0.20, growthRate: 1.0, treatment: 'fungicide',   seasonRisk: { spring: 1.0, summer: 0.8, autumn: 1.5, winter: 0.3 }, susceptibleCrops: ['potatoes','tomatoes','rice','corn'] },
};
```

---

## Data Model

### LandParcel extension

```typescript
// Add to LandParcel in store/useGameStore.ts
pestState?: {
  type: PestType;
  severity: number;     // 0.0–10.0; ≥7 = visible without consultant; ≥10 = max damage
  detectedDay?: number; // day consultant first reported this — undefined = undetected
};
```

### GameState additions

```typescript
  beneficialInsectsActive: boolean;   // passive suppression purchased
  cropConsultantParcelIds: string[];  // parcels currently being scouted
```

---

## Engine: `engine/pests.ts`

### `baseOutbreakChance(parcel, cropType, season, weather, cropHistory)`

Returns daily probability of a new infestation starting on a clean parcel.

```typescript
export function baseOutbreakChance(
  cropType: CropType,
  season: Season,
  weatherEvent: string,
  cropHistory: string[],  // last 4 harvested cropIds
  beneficialInsectsActive: boolean,
): number {
  let chance = 0.004; // 0.4% base per day

  // Season risk (pick highest applicable pest config — simplified)
  const maxSeasonMult = Math.max(
    ...Object.values(PEST_CONFIG).map(p => p.seasonRisk[season] ?? 1.0)
  );
  chance *= maxSeasonMult;

  // Heavy rain boosts fungal risk
  if (weatherEvent === 'heavy_rain' || weatherEvent === 'rain') chance *= 1.4;

  // Crop rotation: diverse history reduces chance
  const uniqueCrops = new Set(cropHistory).size;
  if (uniqueCrops >= 3) chance *= 0.5;
  else if (uniqueCrops === 2) chance *= 0.75;
  // monoculture (1 or 0 unique) = no reduction

  // Beneficial insects
  if (beneficialInsectsActive) chance *= 0.5;

  return Math.min(chance, 0.15); // cap at 15% daily
}
```

### `tickPestSeverity(pestState, cropType, beneficialInsectsActive)`

Grows severity each day on an infested parcel.

```typescript
export function tickPestSeverity(
  pestState: NonNullable<LandParcel['pestState']>,
  config: typeof PEST_CONFIG[PestType],
  beneficialInsectsActive: boolean,
): number {
  const growth = config.growthRate * (beneficialInsectsActive ? 0.5 : 1.0);
  return Math.min(10, pestState.severity + growth);
}
```

### `pestYieldModifier(severity)`

Returns yield multiplier based on severity.

```typescript
export function pestYieldModifier(severity: number): number {
  if (severity <= 2) return 1.0;                        // mild — no yield loss (undetected)
  if (severity <= 5) return 0.85;                       // moderate — 15% loss
  if (severity <= 8) return 0.65;                       // severe — 35% loss
  return 0.40;                                          // critical — 60% loss
}
```

### `shouldSpread(severity, spreadRate, beneficialInsectsActive)`

Returns true if infestation spreads to an adjacent parcel today.

```typescript
export function shouldSpread(
  severity: number,
  spreadRate: number,
  beneficialInsectsActive: boolean,
): boolean {
  if (severity < 3) return false; // too mild to spread
  const rate = spreadRate * (severity / 10) * (beneficialInsectsActive ? 0.4 : 1.0);
  return Math.random() < rate;
}
```

---

## Yield Integration

In `harvestAmount()` (already extended for NPK in the rework plan), multiply by `pestYieldModifier`:

```typescript
const pestMod = pestYieldModifier(parcel.pestState?.severity ?? 0);
// Add pestMod to the existing multiplier chain in harvestAmount()
```

---

## advanceDay() Integration

After the soil tick, add pest tick:

```typescript
// ── Pest & Disease tick ──────────────────────────────────────────────────

parcels = parcels.map(p => {
  if (!p.owned || !p.plantedCrop) return p;

  const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId)!;
  let pestState = p.pestState;

  // 1. Chance of new outbreak on clean parcel
  if (!pestState) {
    const chance = baseOutbreakChance(cropType, season, todayWeather?.event ?? 'sunny', p.cropHistory ?? [], state.beneficialInsectsActive);
    if (Math.random() < chance) {
      // Pick pest type — susceptible crops bias toward their worst pest
      const pestType = pickPestType(cropType, season); // helper in engine/pests.ts
      pestState = { type: pestType, severity: 0.5 };
    }
  }

  // 2. Grow existing infestation
  if (pestState) {
    const config = PEST_CONFIG[pestState.type];
    const newSeverity = tickPestSeverity(pestState, config, state.beneficialInsectsActive);
    pestState = { ...pestState, severity: newSeverity };

    // Detect if severity ≥ 7 (visible damage) and no consultant already flagged it
    if (newSeverity >= 7 && !pestState.detectedDay) {
      pestState = { ...pestState, detectedDay: newDay };
      summary.push({
        id: `pest_visible_${p.id}_${newDay}`,
        icon: '🐛',
        title: `Severe ${config.label} on ${p.name}`,
        detail: `Visible crop damage. Apply ${config.treatment} immediately.`,
        severity: 'warning',
      });
    }
  }

  return { ...p, pestState };
});

// 3. Spread to adjacent parcels
const infested = parcels.filter(p => p.pestState && p.pestState.severity >= 3);
for (const source of infested) {
  const config = PEST_CONFIG[source.pestState!.type];
  if (!shouldSpread(source.pestState!.severity, config.spreadRate, state.beneficialInsectsActive)) continue;

  // Adjacent = parcels within ±2 index positions (simple proximity)
  const sourceIdx = parcels.findIndex(p => p.id === source.id);
  const candidates = parcels.filter((p, idx) =>
    Math.abs(idx - sourceIdx) <= 2 && !p.pestState && p.plantedCrop && p.owned
  );
  if (candidates.length === 0) continue;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  parcels = parcels.map(p =>
    p.id === target.id ? { ...p, pestState: { type: source.pestState!.type, severity: 0.3 } } : p
  );
}

// 4. Crop consultant early detection
for (const parcelId of (state.cropConsultantParcelIds ?? [])) {
  const p = parcels.find(lp => lp.id === parcelId);
  if (!p?.pestState || p.pestState.detectedDay) continue;
  if (p.pestState.severity >= 1.5) {
    parcels = parcels.map(lp =>
      lp.id === parcelId
        ? { ...lp, pestState: { ...lp.pestState!, detectedDay: newDay } }
        : lp
    );
    const config = PEST_CONFIG[p.pestState.type];
    summary.push({
      id: `pest_scout_${parcelId}_${newDay}`,
      icon: '🔬',
      title: `Early ${config.label} detected on ${p.name}`,
      detail: `Consultant spotted early signs. Treat now before it spreads.`,
      severity: 'info',
    });
  }
}
```

---

## Treatment Actions

### `treatPest(parcelId, productId)`

```typescript
treatPest: (parcelId, productId) => {
  const state = get();
  const parcel = state.parcels.find(p => p.id === parcelId);
  if (!parcel?.pestState) return;

  const config = PEST_CONFIG[parcel.pestState.type];
  const inStock = state.productInventory[productId] ?? 0;
  if (inStock <= 0) return;

  // Check product matches required treatment type
  // (fungicide treats fungal/blight; insecticide treats insect; nematicide treats nematode)
  const TREATMENT_MAP: Record<string, string[]> = {
    fungicide:   ['fungal', 'blight'],
    insecticide: ['insect'],
    nematicide:  ['nematode'],
  };
  const { PRODUCT_TYPES } = require('../data/productTypes');
  const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
  if (!product) return;
  const treatable = TREATMENT_MAP[product.category] ?? [];
  if (!treatable.includes(parcel.pestState.type)) return;

  set({
    parcels: state.parcels.map(p =>
      p.id === parcelId ? { ...p, pestState: undefined } : p
    ),
    productInventory: { ...state.productInventory, [productId]: inStock - 1 },
  });
},
```

### `buyBeneficialInsects()`

One-time purchase ($2,400). Sets `beneficialInsectsActive: true` permanently. Reduces outbreak chance, spread rate, and severity growth across all parcels.

### `assignCropConsultant(parcelIds)`

Sets `cropConsultantParcelIds`. Requires a hired `crop_consultant` worker. Consultant can cover up to 20 ha total.

---

## Worker Type: Crop Consultant

```typescript
{
  id: 'crop_consultant',
  name: 'Crop Consultant',
  wage: 180,       // $/day
  hireCost: 300,
  effect: 'Scouts assigned parcels daily. Reports pest outbreaks early (severity ≥ 1.5) before visible damage occurs.',
}
```

---

## UI: tierras.tsx

### Parcel cards
- Show 🐛 icon when `pestState` exists and `detectedDay` is set
- Severity badge: mild (yellow) / severe (red)
- Without consultant: no icon shown until severity ≥ 7

### Parcel detail — new "Pests" row
- Shows pest type, severity bar, and treatment button
- If no pest: "No active infestation"
- Treatment button opens product selector (filtered to correct treatment category)

---

## Shop Products (new)

| ID | Name | Category | Effect |
|----|------|----------|--------|
| `nematicide_basic` | Nematicide | `nematicide` | Clears nematode infestation |
| `beneficial_insects` | Beneficial Insects | `biocontrol` | One-time farm-wide passive suppression |

(Fungicide and insecticide products already exist in the game.)

---

## Files Changed

| File | Change |
|------|--------|
| `engine/pests.ts` | New file: all pest types, generation, spread, severity tick, yield modifier |
| `data/workerTypes.ts` | Add `crop_consultant` |
| `store/useGameStore.ts` | Extend `LandParcel` with `pestState`; add `beneficialInsectsActive`, `cropConsultantParcelIds`; add `treatPest`, `buyBeneficialInsects`, `assignCropConsultant`; wire pest tick into `advanceDay()` |
| `app/(tabs)/tierras.tsx` | Pest indicator on parcel cards; "Pests" row in parcel detail with treatment UI |

---

## Out of Scope

- Visual field map showing spread paths
- Resistance building (pests becoming immune to chemicals)
- Quarantine zones / regulatory shutdowns
- Organic-approved treatments
