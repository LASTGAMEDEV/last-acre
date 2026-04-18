# Pest & Disease Cycles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seasonal pest and disease outbreaks that spread silently between adjacent parcels, with severity-based yield loss, crop consultant scouting, chemical/biological treatment options, and beneficial insect passive suppression.

**Architecture:** Pure logic lives in `engine/pests.ts`. `LandParcel` gains `pestState?`. `GameState` gains `beneficialInsectsActive` and `cropConsultantParcelIds`. Three new actions (`treatPest`, `buyBeneficialInsects`, `assignCropConsultant`) plus a `crop_consultant` worker type. The pest tick is appended to `advanceDay()`. UI adds pest indicators to parcel cards and a treatment row to parcel detail in `tierras.tsx`.

**Note on existing `diseased` field:** `LandParcel` already has `diseased?: boolean` / `diseasedDay?: number` (a simplified crop blight system). The new `pestState` system replaces this for new infections — the `blight` pest type in `PEST_CONFIG` is the richer version. Keep the old fields in the interface for save compatibility but stop writing to them in new code.

**Tech Stack:** TypeScript · React Native 0.81.5 · Expo 54 · Zustand 5. No test suite — verify with `node_modules\.bin\tsc --noEmit`.

---

## File Map

| File | Action |
|------|---------|
| `engine/pests.ts` | Create — `PestType`, `PEST_CONFIG`, `baseOutbreakChance`, `pickPestType`, `tickPestSeverity`, `pestYieldModifier`, `shouldSpread` |
| `data/workerTypes.ts` | Modify — add `crop_consultant` to `WorkerRole` and `WORKER_TYPES` |
| `store/useGameStore.ts` | Modify — extend `LandParcel` with `pestState`; add `beneficialInsectsActive`, `cropConsultantParcelIds` to state; add `treatPest`, `buyBeneficialInsects`, `assignCropConsultant` actions; wire pest tick into `advanceDay()` |
| `app/(tabs)/tierras.tsx` | Modify — pest indicator icon on parcel cards; "Pests" row in parcel detail with severity bar and treatment button |
| `engine/crops.ts` | Modify — multiply `pestYieldModifier` into `harvestAmount()` |

---

## Task 1: Create `engine/pests.ts`

**File:** `engine/pests.ts`

- [ ] **Step 1: Create the file**

  ```typescript
  import { Season } from './climate';

  export type PestType = 'fungal' | 'insect' | 'nematode' | 'blight';

  export const PEST_CONFIG: Record<PestType, {
    label: string;
    spreadRate: number;
    growthRate: number;
    treatment: 'fungicide' | 'insecticide' | 'nematicide';
    seasonRisk: Partial<Record<Season, number>>;
    susceptibleCrops: string[];
  }> = {
    fungal: {
      label: 'Fungal Disease',
      spreadRate: 0.15,
      growthRate: 0.8,
      treatment: 'fungicide',
      seasonRisk: { spring: 1.5, autumn: 1.3, winter: 1.2, summer: 0.7 },
      susceptibleCrops: ['wheat', 'potatoes', 'grapes', 'tomatoes', 'strawberries'],
    },
    insect: {
      label: 'Insect Pest',
      spreadRate: 0.25,
      growthRate: 0.6,
      treatment: 'insecticide',
      seasonRisk: { spring: 1.2, summer: 2.0, autumn: 1.0, winter: 0.1 },
      susceptibleCrops: ['corn', 'cotton', 'soy', 'sunflower', 'rapeseed'],
    },
    nematode: {
      label: 'Root Nematodes',
      spreadRate: 0.08,
      growthRate: 0.4,
      treatment: 'nematicide',
      seasonRisk: { spring: 1.0, summer: 1.5, autumn: 1.0, winter: 0.5 },
      susceptibleCrops: ['potatoes', 'sugarbeet', 'sugarcane', 'carrots', 'ginseng'],
    },
    blight: {
      label: 'Crop Blight',
      spreadRate: 0.20,
      growthRate: 1.0,
      treatment: 'fungicide',
      seasonRisk: { spring: 1.0, summer: 0.8, autumn: 1.5, winter: 0.3 },
      susceptibleCrops: ['potatoes', 'tomatoes', 'rice', 'corn'],
    },
  };

  export interface PestState {
    type: PestType;
    severity: number;     // 0.0–10.0; ≥7 = visible without consultant; ≥10 = max damage
    detectedDay?: number; // undefined = undetected
  }

  /** Daily probability of a new infestation starting on a clean parcel. */
  export function baseOutbreakChance(
    cropId: string,
    season: Season,
    weatherEvent: string,
    cropHistory: string[],
    beneficialInsectsActive: boolean,
  ): number {
    let chance = 0.004;

    const maxSeasonMult = Math.max(
      ...Object.values(PEST_CONFIG).map(p => p.seasonRisk[season] ?? 1.0)
    );
    chance *= maxSeasonMult;

    if (weatherEvent === 'heavy_rain' || weatherEvent === 'rain') chance *= 1.4;

    const uniqueCrops = new Set(cropHistory).size;
    if (uniqueCrops >= 3)      chance *= 0.5;
    else if (uniqueCrops === 2) chance *= 0.75;

    if (beneficialInsectsActive) chance *= 0.5;

    return Math.min(chance, 0.15);
  }

  /** Pick the most likely pest type for the given crop and season. */
  export function pickPestType(cropId: string, season: Season): PestType {
    // Find which pest types list this crop as susceptible
    const susceptible = (Object.entries(PEST_CONFIG) as [PestType, typeof PEST_CONFIG[PestType]][])
      .filter(([, cfg]) => cfg.susceptibleCrops.includes(cropId))
      .map(([type, cfg]) => ({ type, risk: cfg.seasonRisk[season] ?? 1.0 }));

    if (susceptible.length === 0) {
      // Default weighted random by season risk
      const all = (Object.entries(PEST_CONFIG) as [PestType, typeof PEST_CONFIG[PestType]][])
        .map(([type, cfg]) => ({ type, risk: cfg.seasonRisk[season] ?? 1.0 }));
      return weightedPick(all);
    }
    return weightedPick(susceptible);
  }

  function weightedPick(options: { type: PestType; risk: number }[]): PestType {
    const total = options.reduce((s, o) => s + o.risk, 0);
    let r = Math.random() * total;
    for (const opt of options) {
      r -= opt.risk;
      if (r <= 0) return opt.type;
    }
    return options[options.length - 1].type;
  }

  /** Grow severity by one tick. Returns new severity (clamped to 10). */
  export function tickPestSeverity(
    pestState: PestState,
    config: typeof PEST_CONFIG[PestType],
    beneficialInsectsActive: boolean,
  ): number {
    const growth = config.growthRate * (beneficialInsectsActive ? 0.5 : 1.0);
    return Math.min(10, pestState.severity + growth);
  }

  /** Yield multiplier based on severity (1.0 at mild, 0.40 at critical). */
  export function pestYieldModifier(severity: number): number {
    if (severity <= 2) return 1.0;
    if (severity <= 5) return 0.85;
    if (severity <= 8) return 0.65;
    return 0.40;
  }

  /** Returns true if the infestation should spread to an adjacent parcel today. */
  export function shouldSpread(
    severity: number,
    spreadRate: number,
    beneficialInsectsActive: boolean,
  ): boolean {
    if (severity < 3) return false;
    const rate = spreadRate * (severity / 10) * (beneficialInsectsActive ? 0.4 : 1.0);
    return Math.random() < rate;
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add engine/pests.ts
  git commit -m "feat: add engine/pests.ts — PEST_CONFIG, outbreak chance, spread, severity tick, yield modifier"
  ```

---

## Task 2: Add `crop_consultant` worker

**File:** `data/workerTypes.ts`

- [ ] **Step 1: Extend `WorkerRole` and `WORKER_TYPES`**

  Add `'crop_consultant'` to the `WorkerRole` union (after `'hydrogeologist'` if that was added, else after `'truck_driver'`):

  ```typescript
  | 'crop_consultant'
  ```

  Add entry to `WORKER_TYPES` array:

  ```typescript
  {
    id: 'crop_consultant',
    name: 'Crop Consultant',
    icon: '🔬',
    dailyWage: 180,
    maxCount: 2,
    department: 'fields',
    tier: 'specialist',
    requiresBasicId: 'field_worker',
    description: 'Scouts assigned parcels daily. Reports pest outbreaks at severity ≥ 1.5 — before visible crop damage appears.',
  },
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add data/workerTypes.ts
  git commit -m "feat: add crop_consultant worker type"
  ```

---

## Task 3: Extend store state and types

**File:** `store/useGameStore.ts`

- [ ] **Step 1: Import pest engine and export PestState**

  After the existing engine imports, add:

  ```typescript
  import {
    PestState, PEST_CONFIG, baseOutbreakChance, pickPestType,
    tickPestSeverity, shouldSpread,
  } from '../engine/pests';
  export type { PestState };
  ```

- [ ] **Step 2: Add `pestState` to `LandParcel`**

  In the `LandParcel` interface (around line 144–165), add after the existing `diseasedDay?` line:

  ```typescript
  pestState?: PestState; // new per-parcel pest/disease state
  ```

- [ ] **Step 3: Add pest state fields to `GameState`**

  Find the `GameState` interface. Add after `wells` or near the cooperative fields:

  ```typescript
  beneficialInsectsActive: boolean;
  cropConsultantParcelIds: string[];
  ```

- [ ] **Step 4: Add action signatures to `GameActions`**

  ```typescript
  treatPest: (parcelId: string, productId: string) => void;
  buyBeneficialInsects: () => void;
  assignCropConsultant: (parcelIds: string[]) => void;
  ```

- [ ] **Step 5: Set initial values**

  In the initial state object, add:

  ```typescript
  beneficialInsectsActive: false,
  cropConsultantParcelIds: [] as string[],
  ```

- [ ] **Step 6: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add store/useGameStore.ts
  git commit -m "feat: extend store with pest state fields and action signatures"
  ```

---

## Task 4: Implement pest store actions

**File:** `store/useGameStore.ts`

- [ ] **Step 1: Add `treatPest`**

  ```typescript
  treatPest: (parcelId, productId) => {
    const state = get();
    const parcel = (state.parcels ?? []).find(p => p.id === parcelId);
    if (!parcel?.pestState) return;

    const TREATMENT_MAP: Record<string, PestType[]> = {
      fungicide:   ['fungal', 'blight'],
      insecticide: ['insect'],
      nematicide:  ['nematode'],
    };
    const { PRODUCT_TYPES } = require('../data/productTypes');
    const product = PRODUCT_TYPES.find((p: any) => p.id === productId);
    if (!product) return;
    const treatable = TREATMENT_MAP[product.category] ?? [];
    if (!treatable.includes(parcel.pestState.type)) return;

    const inStock = (state.productInventory ?? {})[productId] ?? 0;
    if (inStock <= 0) return;

    set({
      parcels: (state.parcels ?? []).map(p =>
        p.id === parcelId ? { ...p, pestState: undefined } : p
      ),
      productInventory: { ...(state.productInventory ?? {}), [productId]: inStock - 1 },
    });
  },
  ```

- [ ] **Step 2: Add `buyBeneficialInsects`**

  ```typescript
  buyBeneficialInsects: () => {
    const state = get();
    const cost = 2400;
    if (state.money < cost || state.beneficialInsectsActive) return;
    set({ money: state.money - cost, beneficialInsectsActive: true });
  },
  ```

- [ ] **Step 3: Add `assignCropConsultant`**

  ```typescript
  assignCropConsultant: (parcelIds) => {
    // Consultant covers up to 20 ha total
    const state = get();
    const totalHa = parcelIds.reduce((sum, id) => {
      const p = (state.parcels ?? []).find(lp => lp.id === id);
      return sum + (p?.hectares ?? 0);
    }, 0);
    if (totalHa > 20) return;
    set({ cropConsultantParcelIds: parcelIds });
  },
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add store/useGameStore.ts
  git commit -m "feat: add treatPest, buyBeneficialInsects, assignCropConsultant actions"
  ```

---

## Task 5: Wire pest tick into `advanceDay()`

**File:** `store/useGameStore.ts`

Add the pest tick block inside `advanceDay()`. Place it after the soil tick but before the final `set({...})`.

- [ ] **Step 1: Add the pest tick block**

  ```typescript
  // ── Pest & Disease tick ──────────────────────────────────────────────────────

  let pestParcels = parcels; // 'parcels' is the local working array in advanceDay

  // 1. Tick existing infestations and attempt new outbreaks
  pestParcels = pestParcels.map(p => {
    if (!p.owned || !p.plantedCrop) return p;

    const cropId = p.plantedCrop.cropId;
    let pestState = p.pestState;

    // New outbreak on clean parcel
    if (!pestState) {
      const chance = baseOutbreakChance(
        cropId,
        season,
        todayWeather?.event ?? 'sunny',
        p.cropHistory ?? [],
        state.beneficialInsectsActive ?? false,
      );
      if (Math.random() < chance) {
        const pestType = pickPestType(cropId, season);
        pestState = { type: pestType, severity: 0.5 };
      }
    }

    // Grow existing infestation
    if (pestState) {
      const config = PEST_CONFIG[pestState.type];
      const newSeverity = tickPestSeverity(pestState, config, state.beneficialInsectsActive ?? false);
      pestState = { ...pestState, severity: newSeverity };

      // Auto-detect when severe enough to see with naked eye
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

  // 2. Spread to adjacent parcels
  const infested = pestParcels.filter(p => p.pestState && p.pestState.severity >= 3);
  for (const source of infested) {
    const config = PEST_CONFIG[source.pestState!.type];
    if (!shouldSpread(source.pestState!.severity, config.spreadRate, state.beneficialInsectsActive ?? false)) continue;

    const sourceIdx = pestParcels.findIndex(p => p.id === source.id);
    const candidates = pestParcels.filter((p, idx) =>
      Math.abs(idx - sourceIdx) <= 2 && !p.pestState && p.plantedCrop && p.owned
    );
    if (candidates.length === 0) continue;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    pestParcels = pestParcels.map(p =>
      p.id === target.id
        ? { ...p, pestState: { type: source.pestState!.type, severity: 0.3 } }
        : p
    );
  }

  // 3. Crop consultant early detection
  for (const parcelId of (state.cropConsultantParcelIds ?? [])) {
    const p = pestParcels.find(lp => lp.id === parcelId);
    if (!p?.pestState || p.pestState.detectedDay) continue;
    if (p.pestState.severity >= 1.5) {
      pestParcels = pestParcels.map(lp =>
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

  // Assign pest-updated parcels back
  parcels = pestParcels;
  ```

  **Note:** In `advanceDay()`, the local mutable parcels array is typically named `parcels` (or `newParcels`). Check the actual variable name at the top of `advanceDay()` and use it consistently. The pattern of re-assigning (`parcels = pestParcels`) works because the final `set({...})` uses that variable.

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add store/useGameStore.ts
  git commit -m "feat: wire pest tick into advanceDay — outbreaks, spread, consultant detection"
  ```

---

## Task 6: Integrate pest modifier into `harvestAmount()`

**File:** `engine/crops.ts`

- [ ] **Step 1: Import pestYieldModifier**

  At the top of `engine/crops.ts`, add:

  ```typescript
  import { pestYieldModifier } from './pests';
  ```

- [ ] **Step 2: Apply pest modifier in `harvestAmount()`**

  Find `harvestAmount()`. It returns a number computed from various modifiers. Add `pestYieldModifier` to the chain. The function receives a `parcel` argument — access `parcel.pestState?.severity ?? 0`:

  ```typescript
  const pestMod = pestYieldModifier(parcel?.pestState?.severity ?? 0);
  ```

  Multiply it into the final return (alongside the existing modifiers):

  ```typescript
  return baseYield * soilMod * fertMod * climateMod * machineMod * pestMod;
  // (exact chain depends on current implementation — just add * pestMod at the end)
  ```

  If `harvestAmount()` doesn't currently receive the full `LandParcel`, you may need to add `pestSeverity: number` as a parameter and pass it from the store's harvest call site instead:

  ```typescript
  // In harvestAmount signature: add pestSeverity = 0 default parameter
  export function harvestAmount(..., pestSeverity = 0): number {
    const pestMod = pestYieldModifier(pestSeverity);
    // ...
  }
  // In store harvest call site, pass: parcel.pestState?.severity ?? 0
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add engine/crops.ts
  git commit -m "feat: apply pestYieldModifier in harvestAmount"
  ```

---

## Task 7: Add pest UI to `tierras.tsx`

**File:** `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Import pest types and add indicator to parcel cards**

  At the top, add:

  ```typescript
  import { PEST_CONFIG } from '../../engine/pests';
  import type { PestState } from '../../engine/pests';
  ```

  Find the parcel card component (the touchable list item for each parcel). Add a pest badge after the existing crop/status indicators:

  ```typescript
  {parcel.pestState?.detectedDay && (
    <Text style={{
      color: parcel.pestState.severity >= 7 ? '#f44336' : '#ff9800',
      fontSize: 11,
      fontWeight: 'bold',
    }}>
      🐛 {PEST_CONFIG[parcel.pestState.type].label}
      {parcel.pestState.severity >= 7 ? ' (severe)' : ' (detected)'}
    </Text>
  )}
  ```

- [ ] **Step 2: Add Pests row to parcel detail**

  Find the parcel detail section. Add a "Pests" row (can be a section alongside Soil, similar pattern to how other sub-tabs are structured):

  ```typescript
  function PestsSection({ parcel }: { parcel: LandParcel }) {
    const { treatPest, productInventory, buyBeneficialInsects, beneficialInsectsActive, money } = useGameStore();
    const { PRODUCT_TYPES } = require('../../data/productTypes');
    const pest = parcel.pestState;

    if (!pest || !pest.detectedDay) {
      return (
        <View style={S.card}>
          <Text style={{ color: C.faint, fontSize: 13 }}>No active infestation detected.</Text>
          {!(beneficialInsectsActive ?? false) && (
            <TouchableOpacity
              style={[S.btn, { marginTop: 8, opacity: money >= 2400 ? 1 : 0.5 }]}
              onPress={() => buyBeneficialInsects()}
              disabled={money < 2400}
            >
              <Text style={S.btnText}>🪲 Buy Beneficial Insects — $2,400 (farm-wide)</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const config = PEST_CONFIG[pest.type];
    const severityColor = pest.severity >= 7 ? '#f44336' : pest.severity >= 5 ? '#ff9800' : '#ffeb3b';
    const severityLabel = pest.severity >= 8 ? 'Critical' : pest.severity >= 5 ? 'Severe' : pest.severity >= 3 ? 'Moderate' : 'Mild';

    // Find available treatments in inventory
    const TREATMENT_MAP: Record<string, string[]> = {
      fungicide:   ['fungal', 'blight'],
      insecticide: ['insect'],
      nematicide:  ['nematode'],
    };
    const availableProducts = PRODUCT_TYPES.filter((p: any) => {
      const treatable = TREATMENT_MAP[p.category] ?? [];
      return treatable.includes(pest.type) && ((productInventory ?? {})[p.id] ?? 0) > 0;
    });

    return (
      <View style={[S.card, { gap: 8 }]}>
        <Text style={{ color: C.text, fontWeight: 'bold' }}>🐛 {config.label}</Text>

        {/* Severity bar */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: C.faint, fontSize: 12 }}>Severity</Text>
            <Text style={{ color: severityColor, fontSize: 12, fontWeight: 'bold' }}>
              {pest.severity.toFixed(1)} / 10 — {severityLabel}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: C.surface, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${pest.severity * 10}%`, height: '100%', backgroundColor: severityColor, borderRadius: 4 }} />
          </View>
        </View>

        <Text style={{ color: C.faint, fontSize: 12 }}>
          Requires: {config.treatment}
        </Text>

        {availableProducts.length > 0 ? (
          availableProducts.map((p: any) => (
            <TouchableOpacity key={p.id} style={S.btn} onPress={() => treatPest(parcel.id, p.id)}>
              <Text style={S.btnText}>Apply {p.name} (×{(productInventory ?? {})[p.id]})</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ color: '#f44336', fontSize: 12 }}>
            No {config.treatment} in inventory. Buy some in the Shop.
          </Text>
        )}
      </View>
    );
  }
  ```

  Wire `PestsSection` into the parcel detail view (in the same section where other detail rows appear).

- [ ] **Step 3: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 4: Test in browser**

  ```bash
  npx expo start --web
  ```

  Verify:
  - Advancing many days without treatment eventually shows a "Severe [Pest] on [Parcel]" event
  - Opening an infested parcel shows the pest row with severity bar and treatment button
  - Applying treatment (if item in inventory) clears the pest state
  - Parcel card shows 🐛 badge when pest is detected

- [ ] **Step 5: Commit**

  ```bash
  git add app/(tabs)/tierras.tsx
  git commit -m "feat: add pest indicators to parcel cards and Pests section to parcel detail"
  ```

---

## Task 8: Add nematicide and beneficial insects to shop products

**File:** `data/productTypes.ts`

- [ ] **Step 1: Verify existing products**

  Check that `fungicide` and `insecticide` entries already exist in `PRODUCT_TYPES`. If they don't, add them.

  Add the following new entries:

  ```typescript
  // In PRODUCT_TYPES array:
  {
    id: 'nematicide_basic',
    name: 'Nematicide',
    category: 'nematicide',
    description: 'Clears root nematode infestations',
    cost: 180,
    unit: 'bottle',
  },
  ```

  (The `beneficial_insects` product is handled by the `buyBeneficialInsects()` action directly — it's a one-time farm purchase, not a product consumed from inventory.)

- [ ] **Step 2: Verify TypeScript**

  ```bash
  node_modules\.bin\tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add data/productTypes.ts
  git commit -m "feat: add nematicide product to shop"
  ```
