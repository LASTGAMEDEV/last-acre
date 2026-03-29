# Crop Genetics (Seed Lab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Seed Lab building where players hybridize crop seeds across generations, with 4 genes (yield, drought, growth, quality) that modify harvest output and processing.

**Architecture:** Three layers — (1) Data: new types (`SeedGenes`, `SeedEntry`, `HybridJob`) and building (`bld_seed_lab_1/2/3`) in existing data files; (2) Store: new state + actions + modifications to `harvestCrop`, `processProduct`, `advanceDay`; (3) UI: Seed Lab sub-tab in `granja.tsx`, seed picker in `tierras.tsx` planting modal.

**Tech Stack:** React Native, Zustand 5, TypeScript. Gene math mirrors `engine/animals.ts` (`breedGenes` pattern). No new engine files needed.

---

## File Structure

**Modify:**
- `data/buildingTypes.ts` — add `'lab'` to `BuildingCategory`, add 3 Seed Lab building entries
- `store/useGameStore.ts` — new interfaces, new state, new actions, modified `harvestCrop`/`processProduct`/`advanceDay`
- `app/(tabs)/granja.tsx` — add `'seedlab'` sub-tab and full Seed Lab screen
- `app/(tabs)/tierras.tsx` — add seed picker to planting modal

---

### Task 1: New types and Seed Lab building

**Files:**
- Modify: `data/buildingTypes.ts`
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add `'lab'` to `BuildingCategory` in `data/buildingTypes.ts`**

Find:
```typescript
export type BuildingCategory = 'animal' | 'silo' | 'industrial';
```
Replace with:
```typescript
export type BuildingCategory = 'animal' | 'silo' | 'industrial' | 'lab';
```

- [ ] **Step 2: Add Seed Lab buildings to `BUILDING_TYPES` array**

At the end of the `BUILDING_TYPES` array, add:
```typescript
// ── Seed Lab ──────────────────────────────────────────────────────────────
{
  id: 'bld_seed_lab_1',
  name: 'Seed Lab (Level 1)',
  category: 'lab',
  cost: 5000,
  maintenancePerDay: 5,
  effectLabel: '1 hybridization slot · 14-day cycles',
},
{
  id: 'bld_seed_lab_2',
  name: 'Seed Lab (Level 2)',
  category: 'lab',
  cost: 15000,
  maintenancePerDay: 12,
  effectLabel: '2 hybridization slots · 10-day cycles',
},
{
  id: 'bld_seed_lab_3',
  name: 'Seed Lab (Level 3)',
  category: 'lab',
  cost: 40000,
  maintenancePerDay: 25,
  effectLabel: '3 hybridization slots · 7-day cycles',
},
```

- [ ] **Step 3: Add `SeedGenes`, `SeedEntry`, `HybridJob` interfaces to `store/useGameStore.ts`**

After the `FuturesPosition` interface (around line 131), add:

```typescript
export interface SeedGenes {
  yield:    number; // multiplies harvest output (0.5–1.5)
  drought:  number; // divides weather penalty severity (0.5–1.5)
  growth:   number; // divides effective growthDays (0.5–1.5)
  quality:  number; // multiplies processed output (0.5–1.5)
}

export interface SeedEntry {
  id: string;
  cropId: string;
  generation: number;
  genes: SeedGenes;
  createdDay: number;
  quantity: number; // each unit plants one parcel
}

export interface HybridJob {
  id: string;
  cropId: string;
  parentAId: string;
  parentBId: string;
  startDay: number;
  readyDay: number;
  cost: number;
}
```

- [ ] **Step 4: Add `seedEntryId` to `LandParcel`**

Find the `LandParcel` interface. Add after `irrigated: boolean`:
```typescript
seedEntryId?: string; // SeedEntry id used when this parcel was planted
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

Expected: same 4 pre-existing errors, no new ones.

- [ ] **Step 6: Commit**

```bash
git add "data/buildingTypes.ts" "store/useGameStore.ts"
git commit -m "feat(crop-genetics): add SeedGenes types and Seed Lab buildings"
```

---

### Task 2: Store state and new actions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add new state fields to `GameState` interface**

In the `GameState` interface, add:
```typescript
seedVault: SeedEntry[];
hybridJobs: HybridJob[];
cropQualityMap: Record<string, number>; // cropId → quality gene from last harvested seed
```

- [ ] **Step 2: Add initial values**

In the initial state object (near `processedInventory: {}` etc.), add:
```typescript
seedVault: [],
hybridJobs: [],
cropQualityMap: {},
```

- [ ] **Step 3: Add action signatures to `GameState` interface**

```typescript
startHybridization: (cropId: string, parentAId: string, parentBId: string) => void;
selectSeedForParcel: (parcelId: string, seedEntryId: string | null) => void;
```

- [ ] **Step 4: Implement `startHybridization`**

Add in the store's `create(...)` block (near other crop actions):

```typescript
startHybridization: (cropId, parentAId, parentBId) => {
  const state = get();

  // Check lab exists
  const labLevel = state.buildings.includes('bld_seed_lab_3') ? 3
    : state.buildings.includes('bld_seed_lab_2') ? 2
    : state.buildings.includes('bld_seed_lab_1') ? 1
    : 0;
  if (labLevel === 0) return;

  // Check slot availability
  const maxSlots = labLevel;
  const activeJobs = state.hybridJobs.length;
  if (activeJobs >= maxSlots) return;

  const parentA = state.seedVault.find(s => s.id === parentAId);
  const parentB = state.seedVault.find(s => s.id === parentBId);
  if (!parentA || !parentB) return;
  if (parentA.cropId !== cropId || parentB.cropId !== cropId) return;
  if (parentA.quantity < 1 || parentB.quantity < 1) return;

  const generation = Math.max(parentA.generation, parentB.generation) + 1;
  const cost = Math.min(200 * generation, 2000);
  if (state.money < cost) return;

  const durationDays = labLevel === 3 ? 7 : labLevel === 2 ? 10 : 14;

  const job: HybridJob = {
    id: `hybrid_${Date.now()}`,
    cropId,
    parentAId,
    parentBId,
    startDay: state.day,
    readyDay: state.day + durationDays,
    cost,
  };

  // Consume one batch from each parent
  const nextVault = state.seedVault
    .map(s => s.id === parentAId || s.id === parentBId ? { ...s, quantity: s.quantity - 1 } : s)
    .filter(s => s.quantity > 0);

  set({
    money: state.money - cost,
    hybridJobs: [...state.hybridJobs, job],
    seedVault: nextVault,
  });
},
```

- [ ] **Step 5: Implement `selectSeedForParcel`**

```typescript
selectSeedForParcel: (parcelId, seedEntryId) => {
  set(state => ({
    parcels: state.parcels.map(p =>
      p.id === parcelId ? { ...p, seedEntryId: seedEntryId ?? undefined } : p
    ),
  }));
},
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add "store/useGameStore.ts"
git commit -m "feat(crop-genetics): add seedVault, hybridJobs state and startHybridization action"
```

---

### Task 3: Modify advanceDay, harvestCrop, and processProduct

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Settle completed hybrid jobs in `advanceDay()`**

In `advanceDay()`, near where futures are settled (search for `futures.map`), add seed job settlement. After the futures settlement block:

```typescript
// ── Seed Lab: settle completed hybrid jobs ──────────────────────
const completedJobs = state.hybridJobs.filter(j => newDay >= j.readyDay);
let nextSeedVault = [...(state.seedVault ?? [])];
for (const job of completedJobs) {
  const parentA = state.seedVault.find(s => s.id === job.parentAId) ??
    { genes: { yield: 1, drought: 1, growth: 1, quality: 1 } };
  const parentB = state.seedVault.find(s => s.id === job.parentBId) ??
    { genes: { yield: 1, drought: 1, growth: 1, quality: 1 } };

  const clamp = (v: number) => Math.min(1.5, Math.max(0.5, v));
  const mutate = (a: number, b: number) => clamp((a + b) / 2 + (Math.random() - 0.5) * 0.12);

  const offspringGenes: SeedGenes = {
    yield:   mutate(parentA.genes.yield,   parentB.genes.yield),
    drought: mutate(parentA.genes.drought, parentB.genes.drought),
    growth:  mutate(parentA.genes.growth,  parentB.genes.growth),
    quality: mutate(parentA.genes.quality, parentB.genes.quality),
  };

  const generation = Math.max(
    (state.seedVault.find(s => s.id === job.parentAId)?.generation ?? 1),
    (state.seedVault.find(s => s.id === job.parentBId)?.generation ?? 1),
  ) + 1;

  const newEntry: SeedEntry = {
    id: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    cropId: job.cropId,
    generation,
    genes: offspringGenes,
    createdDay: newDay,
    quantity: 3,
  };
  nextSeedVault.push(newEntry);
}
const nextHybridJobs = state.hybridJobs.filter(j => newDay < j.readyDay);
```

Then include `seedVault: nextSeedVault, hybridJobs: nextHybridJobs` in the final `set({...})` call at the end of `advanceDay`.

- [ ] **Step 2: Apply seed genes in `harvestCrop()`**

In `harvestCrop()`, after the `const parcel = ...` and `const cropType = ...` lookups, add:

```typescript
// Seed genes for this parcel
const seedEntry = parcel.seedEntryId
  ? state.seedVault.find(s => s.id === parcel.seedEntryId)
  : undefined;
const seedGenes = seedEntry?.genes ?? { yield: 1, drought: 1, growth: 1, quality: 1 };
```

Then modify the `effectiveGrowthDays` line to include the growth gene:
```typescript
// Old:
const effectiveGrowthDays = Math.round(cropType.growthDays * speedBonus);
// New:
const effectiveGrowthDays = Math.round(cropType.growthDays * speedBonus / seedGenes.growth);
```

Then modify the `climateModifier` block to apply drought resistance. Find:
```typescript
const waterScale = (cropType.waterNeed ?? 3) / 5;
const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
```
Replace with:
```typescript
const waterScale = (cropType.waterNeed ?? 3) / 5;
const rawClimateDelta = (baseClimate - 1.0) * waterScale;
// Drought gene reduces penalty when weather is bad (delta < 0); no effect on bonuses
const droughtScale = rawClimateDelta < 0 ? 1.0 / seedGenes.drought : 1.0;
const climateModifier = 1.0 + rawClimateDelta * droughtScale;
```

Then multiply `units` by the yield gene. Find:
```typescript
const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod), siloCapacity - totalInventory);
```
Replace with:
```typescript
const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod * seedGenes.yield), siloCapacity - totalInventory);
```

After computing `units`, update `cropQualityMap` and consume the seed:
```typescript
// Update quality map and consume seed batch
const nextCropQualityMap = { ...state.cropQualityMap };
if (seedEntry) {
  nextCropQualityMap[crop.cropId] = seedGenes.quality;
}
const nextSeedVaultAfterHarvest = seedEntry
  ? state.seedVault.map(s => s.id === parcel.seedEntryId ? { ...s, quantity: s.quantity - 1 } : s).filter(s => s.quantity > 0)
  : state.seedVault;
```

Then include in `set({...})`:
```typescript
cropQualityMap: nextCropQualityMap,
seedVault: nextSeedVaultAfterHarvest,
parcels: state.parcels.map(p => p.id === parcelId
  ? { ...p, plantedCrop: null, lastCropId: crop.cropId, fertility: newFertility, seedEntryId: undefined }
  : p
),
```

- [ ] **Step 3: Apply quality gene in `processProduct()`**

In `processProduct()`, in the `crop` branch, find:
```typescript
[recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + Math.round(recipe.outputAmount * batches * wBonuses.processingOutputMult),
```
Replace with:
```typescript
[recipe.outputProductId]: (state.processedInventory[recipe.outputProductId] ?? 0) + Math.round(recipe.outputAmount * batches * wBonuses.processingOutputMult * (state.cropQualityMap[recipe.input.itemId] ?? 1.0)),
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "store/useGameStore.ts"
git commit -m "feat(crop-genetics): apply seed genes to harvest (yield, drought, growth) and processing (quality)"
```

---

### Task 4: Seed Lab UI in granja.tsx

**Files:**
- Modify: `app/(tabs)/granja.tsx`

- [ ] **Step 1: Add `'seedlab'` to the tab type and TABS array**

Find:
```typescript
type FarmTab = 'fields' | 'animals' | 'machinery' | 'workers';

const TABS: { id: FarmTab; label: string }[] = [
  { id: 'fields',    label: '🌾 Fields' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'machinery', label: '🚜 Machinery' },
  { id: 'workers',   label: '👨‍🌾 Workers' },
];
```
Replace with:
```typescript
type FarmTab = 'fields' | 'animals' | 'machinery' | 'workers' | 'seedlab';

const TABS: { id: FarmTab; label: string }[] = [
  { id: 'fields',    label: '🌾 Fields' },
  { id: 'animals',   label: '🐄 Animals' },
  { id: 'machinery', label: '🚜 Machinery' },
  { id: 'workers',   label: '👨‍🌾 Workers' },
  { id: 'seedlab',   label: '🌱 Seed Lab' },
];
```

- [ ] **Step 2: Add imports**

Add to the top of `granja.tsx`:
```typescript
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useGameStore, SeedEntry, SeedGenes, HybridJob } from '../../store/useGameStore';
import { CROP_TYPES } from '../../data/cropTypes';
import ScreenHeader from '../../components/ScreenHeader';
```

Note: `granja.tsx` currently only imports `React`, `useState`, `View`, `Text`, `TouchableOpacity`, `StyleSheet` and the 4 sub-screens. Keep those and add the new imports.

- [ ] **Step 3: Add `SeedLabScreen` component**

Add this component above the `GranjaScreen` function:

```typescript
function geneGrade(v: number): string {
  if (v >= 1.4) return 'S';
  if (v >= 1.2) return 'A';
  if (v >= 1.0) return 'B';
  if (v >= 0.8) return 'C';
  return 'D';
}

function GeneChips({ genes }: { genes: SeedGenes }) {
  const items = [
    { key: 'yield',   label: 'Yld', color: '#81c784' },
    { key: 'drought', label: 'Drt', color: '#64b5f6' },
    { key: 'growth',  label: 'Grw', color: '#ce93d8' },
    { key: 'quality', label: 'Qlt', color: '#ffcc80' },
  ] as const;
  return (
    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
      {items.map(item => {
        const g = geneGrade(genes[item.key]);
        return (
          <Text key={item.key} style={{ color: item.color, fontSize: 10, backgroundColor: item.color + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
            {item.label} {g}
          </Text>
        );
      })}
    </View>
  );
}

function SeedLabScreen() {
  const {
    buildings, money, day, seedVault, hybridJobs,
    startHybridization,
  } = useGameStore();

  const labLevel = buildings.includes('bld_seed_lab_3') ? 3
    : buildings.includes('bld_seed_lab_2') ? 2
    : buildings.includes('bld_seed_lab_1') ? 1
    : 0;
  const maxSlots = labLevel;
  const durationDays = labLevel === 3 ? 7 : labLevel === 2 ? 10 : 14;

  const [selCrop, setSelCrop] = useState<string>(CROP_TYPES[0].id);
  const [selParentA, setSelParentA] = useState<string | null>(null);
  const [selParentB, setSelParentB] = useState<string | null>(null);

  const cropSeeds = seedVault.filter(s => s.cropId === selCrop);
  const validParents = selParentA && selParentB && selParentA !== selParentB;
  const parentA = selParentA ? seedVault.find(s => s.id === selParentA) : undefined;
  const parentB = selParentB ? seedVault.find(s => s.id === selParentB) : undefined;

  const generation = parentA && parentB ? Math.max(parentA.generation, parentB.generation) + 1 : 1;
  const cost = Math.min(200 * generation, 2000);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="🌱 Seed Lab" />

      {/* Lab status */}
      {labLevel === 0 ? (
        <View style={slStyles.lockedCard}>
          <Text style={slStyles.lockedTitle}>🏗️ Seed Lab not built</Text>
          <Text style={slStyles.lockedSub}>Purchase in the Store → Buildings to unlock hybridization.</Text>
        </View>
      ) : (
        <Text style={slStyles.statusBadge}>
          ✅ Seed Lab Lv{labLevel} · {hybridJobs.length}/{maxSlots} slots · {durationDays}d cycles
        </Text>
      )}

      {/* New hybridization form */}
      {labLevel > 0 && hybridJobs.length < maxSlots && (
        <View style={slStyles.card}>
          <Text style={slStyles.cardTitle}>🧪 New Hybridization</Text>

          {/* Crop picker */}
          <Text style={slStyles.label}>Crop</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {CROP_TYPES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[slStyles.cropChip, selCrop === c.id && slStyles.cropChipActive]}
                onPress={() => { setSelCrop(c.id); setSelParentA(null); setSelParentB(null); }}
              >
                <Text style={[slStyles.cropChipText, selCrop === c.id && slStyles.cropChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {cropSeeds.length < 2 ? (
            <Text style={slStyles.emptyText}>Need at least 2 seed batches for this crop to hybridize.</Text>
          ) : (
            <>
              <Text style={slStyles.label}>Parent A</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {cropSeeds.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[slStyles.seedChip, selParentA === s.id && slStyles.seedChipActive]}
                    onPress={() => setSelParentA(selParentA === s.id ? null : s.id)}
                  >
                    <Text style={slStyles.seedChipGen}>Gen {s.generation}</Text>
                    <GeneChips genes={s.genes} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={slStyles.label}>Parent B</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {cropSeeds.filter(s => s.id !== selParentA).map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[slStyles.seedChip, selParentB === s.id && slStyles.seedChipActive]}
                    onPress={() => setSelParentB(selParentB === s.id ? null : s.id)}
                  >
                    <Text style={slStyles.seedChipGen}>Gen {s.generation}</Text>
                    <GeneChips genes={s.genes} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {validParents && parentA && parentB && (() => {
                const clamp = (v: number) => Math.min(1.5, Math.max(0.5, v));
                const pred: SeedGenes = {
                  yield:   clamp((parentA.genes.yield   + parentB.genes.yield)   / 2),
                  drought: clamp((parentA.genes.drought + parentB.genes.drought) / 2),
                  growth:  clamp((parentA.genes.growth  + parentB.genes.growth)  / 2),
                  quality: clamp((parentA.genes.quality + parentB.genes.quality) / 2),
                };
                return (
                  <View style={slStyles.prediction}>
                    <Text style={slStyles.predLabel}>Predicted offspring (avg):</Text>
                    <GeneChips genes={pred} />
                    <Text style={slStyles.predSub}>Ready in {durationDays} days · Cost ${cost.toLocaleString()}</Text>
                  </View>
                );
              })()}

              <TouchableOpacity
                style={[slStyles.hybBtn, (!validParents || money < cost) && slStyles.hybBtnDisabled]}
                disabled={!validParents || money < cost}
                onPress={() => {
                  if (selParentA && selParentB) {
                    startHybridization(selCrop, selParentA, selParentB);
                    setSelParentA(null);
                    setSelParentB(null);
                  }
                }}
              >
                <Text style={slStyles.hybBtnText}>
                  {money < cost ? `Need $${cost.toLocaleString()}` : `Start Hybridization — $${cost.toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Active jobs */}
      <Text style={slStyles.sectionLabel}>Active Jobs ({hybridJobs.length}/{maxSlots})</Text>
      <View style={slStyles.card}>
        {hybridJobs.length === 0 ? (
          <Text style={slStyles.emptyText}>No active jobs.</Text>
        ) : (
          hybridJobs.map(job => {
            const cropDef = CROP_TYPES.find(c => c.id === job.cropId);
            const total = job.readyDay - job.startDay;
            const elapsed = day - job.startDay;
            const pct = Math.min(100, Math.round((elapsed / total) * 100));
            const daysLeft = job.readyDay - day;
            return (
              <View key={job.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={slStyles.jobName}>{cropDef?.name ?? job.cropId} Hybrid</Text>
                  <Text style={slStyles.jobDays}>{daysLeft}d left</Text>
                </View>
                <View style={slStyles.progressBg}>
                  <View style={[slStyles.progressFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Seed Vault */}
      <Text style={slStyles.sectionLabel}>Seed Vault ({seedVault.length})</Text>
      <View style={[slStyles.card, { marginBottom: 32 }]}>
        {seedVault.length === 0 ? (
          <Text style={slStyles.emptyText}>No seeds yet. Complete a hybridization job to get started.</Text>
        ) : (
          seedVault.map(s => {
            const cropDef = CROP_TYPES.find(c => c.id === s.cropId);
            return (
              <View key={s.id} style={slStyles.vaultRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={slStyles.vaultName}>{cropDef?.name ?? s.cropId}</Text>
                    <View style={slStyles.genBadge}>
                      <Text style={slStyles.genBadgeText}>Gen {s.generation}</Text>
                    </View>
                  </View>
                  <GeneChips genes={s.genes} />
                </View>
                <Text style={slStyles.vaultQty}>{s.quantity}x</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const slStyles = StyleSheet.create({
  lockedCard:      { margin: 12, backgroundColor: '#16213e', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  lockedTitle:     { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  lockedSub:       { color: '#888', fontSize: 11 },
  statusBadge:     { color: '#66bb6a', fontSize: 11, fontWeight: 'bold', marginHorizontal: 12, marginBottom: 8 },
  card:            { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginHorizontal: 12, marginBottom: 10 },
  cardTitle:       { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13, marginBottom: 10 },
  sectionLabel:    { color: '#888', fontSize: 11, fontWeight: 'bold', marginHorizontal: 12, marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  label:           { color: '#888', fontSize: 11, marginBottom: 4 },
  emptyText:       { color: '#555', fontSize: 11 },
  cropChip:        { backgroundColor: '#0a1628', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6 },
  cropChipActive:  { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  cropChipText:    { color: '#888', fontSize: 11 },
  cropChipTextActive: { color: '#e8d5a3', fontWeight: 'bold' },
  seedChip:        { backgroundColor: '#0a1628', borderRadius: 8, padding: 8, marginRight: 6, minWidth: 80 },
  seedChipActive:  { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  seedChipGen:     { color: '#888', fontSize: 10, marginBottom: 4 },
  prediction:      { backgroundColor: '#0a1628', borderRadius: 8, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#66bb6a' },
  predLabel:       { color: '#66bb6a', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  predSub:         { color: '#888', fontSize: 10, marginTop: 6 },
  hybBtn:          { backgroundColor: '#1b5e20', borderRadius: 8, padding: 10, alignItems: 'center' },
  hybBtnDisabled:  { backgroundColor: '#333' },
  hybBtnText:      { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  progressBg:      { height: 6, backgroundColor: '#0a1628', borderRadius: 3, marginTop: 6 },
  progressFill:    { height: 6, backgroundColor: '#66bb6a', borderRadius: 3 },
  jobName:         { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  jobDays:         { color: '#66bb6a', fontSize: 11, fontWeight: 'bold' },
  vaultRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  vaultName:       { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  genBadge:        { backgroundColor: '#ffd70033', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  genBadgeText:    { color: '#ffd700', fontSize: 10, fontWeight: 'bold' },
  vaultQty:        { color: '#888', fontSize: 12, fontWeight: 'bold' },
});
```

- [ ] **Step 4: Render `SeedLabScreen` in `GranjaScreen`**

In `GranjaScreen`'s return JSX, after the `{tab === 'workers' && <TrabajadoresScreen />}` line, add:

```typescript
{tab === 'seedlab'   && <SeedLabScreen />}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/granja.tsx"
git commit -m "feat(crop-genetics): add Seed Lab UI with hybridization form, job tracker, and vault"
```

---

### Task 5: Seed picker in planting modal (tierras.tsx)

**Files:**
- Modify: `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Pull seed data and action from store**

Find the `useGameStore` destructure in `TierrasScreen`. Add:

```typescript
const { ..., seedVault, selectSeedForParcel } = useGameStore();
```

- [ ] **Step 2: Add `selectedSeedId` state**

Near the existing `useState` calls:
```typescript
const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
```

- [ ] **Step 3: Add seed picker section to the planting modal**

The planting modal is the `Modal` component shown when `plantingParcel !== null`. Inside the modal body, after the crop selection list and before the "Plant" button, add:

```typescript
{/* Seed selection */}
{(() => {
  const cropId = /* the currently selected cropId from the planting modal's state */;
  const availableSeeds = seedVault.filter(s => s.cropId === cropId);
  if (availableSeeds.length === 0) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>🌱 Seed (optional)</Text>
      <TouchableOpacity
        style={{ backgroundColor: !selectedSeedId ? '#0f3460' : '#16213e', borderRadius: 6, padding: 7, marginBottom: 4, borderWidth: !selectedSeedId ? 1 : 0, borderColor: '#4fc3f7' }}
        onPress={() => setSelectedSeedId(null)}
      >
        <Text style={{ color: !selectedSeedId ? '#e8d5a3' : '#888', fontSize: 11 }}>Base seeds (no bonus)</Text>
      </TouchableOpacity>
      {availableSeeds.map(s => (
        <TouchableOpacity
          key={s.id}
          style={{ backgroundColor: selectedSeedId === s.id ? '#0f3460' : '#16213e', borderRadius: 6, padding: 7, marginBottom: 4, borderWidth: selectedSeedId === s.id ? 1 : 0, borderColor: '#4fc3f7' }}
          onPress={() => setSelectedSeedId(s.id)}
        >
          <Text style={{ color: '#e8d5a3', fontSize: 11 }}>Gen {s.generation} · Yld {geneGrade(s.genes.yield)} / Drt {geneGrade(s.genes.drought)} / Grw {geneGrade(s.genes.growth)} / Qlt {geneGrade(s.genes.quality)}</Text>
          <Text style={{ color: '#888', fontSize: 10 }}>{s.quantity} batch{s.quantity !== 1 ? 'es' : ''} available</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
})()}
```

Note: Find the correct variable name for the selected crop in the planting modal. In `tierras.tsx` there is a `plantingParcel` state. The modal likely shows crops to plant on it. Read the file to find the exact variable names and insert the seed picker in the right place.

- [ ] **Step 4: Call `selectSeedForParcel` when planting**

Find the "Plant" / "Confirm plant" button's `onPress` handler in the planting modal. After `plantCrop(...)` is called, add:

```typescript
if (selectedSeedId && plantingParcel) {
  selectSeedForParcel(plantingParcel.id, selectedSeedId);
}
setSelectedSeedId(null);
```

Also reset `selectedSeedId` when the modal is closed/cancelled.

- [ ] **Step 5: Add `geneGrade` helper to tierras.tsx**

The file doesn't have `geneGrade`. Add at the top (after imports):
```typescript
function geneGrade(v: number): string {
  if (v >= 1.4) return 'S';
  if (v >= 1.2) return 'A';
  if (v >= 1.0) return 'B';
  if (v >= 0.8) return 'C';
  return 'D';
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/tierras.tsx"
git commit -m "feat(crop-genetics): add seed picker to planting modal"
```
