# Genetics System Design

**Date:** 2026-03-30

## Overview

Two parallel genetics systems — Crop Genetics (new) and Animal Genetics (UI improvements on existing engine). Both use a 4-gene model graded D→S, accessed via inline sub-tabs in their natural home screens.

---

## 1. Crop Genetics

### Seed Lab Building

- New building: `bld_seed_lab` added to `data/buildingTypes.ts`
- Cost: $5,000. Unlocks 1 hybridization slot. Can be upgraded (Level 2 = 2 slots, $15,000; Level 3 = 3 slots, $40,000).
- Accessible via a new **"🌱 Seed Lab"** sub-tab added to `app/(tabs)/granja.tsx`

### Seed Genes

Each crop harvest optionally carries a `SeedGenes` object:

```typescript
interface SeedGenes {
  yield:      number; // multiplies harvest output (0.5–1.5)
  drought:    number; // reduces weather penalty (0.5–1.5)
  growth:     number; // divides growthDays (0.5–1.5)
  quality:    number; // multiplies processed product output (0.5–1.5)
}
```

Grade scale (same as animals): D < 0.8, C 0.8–1.0, B 1.0–1.2, A 1.2–1.4, S ≥ 1.4.

Fresh-purchased seeds always start at 1.0 (base grade B) with no `SeedGenes` attached.

### Seed Vault

A new store slice: `seedVault: SeedEntry[]` where:

```typescript
interface SeedEntry {
  id: string;
  cropId: string;
  generation: number;    // 1 = first hybrid, increments each hybridization
  genes: SeedGenes;
  createdDay: number;
  quantity: number;      // batches available (each batch plants 1 parcel)
}
```

### Hybridization Jobs

```typescript
interface HybridJob {
  id: string;
  cropId: string;
  parentAId: string;   // SeedEntry id
  parentBId: string;   // SeedEntry id
  startDay: number;
  readyDay: number;    // startDay + 14
  cost: number;        // $200 base
}
```

- Duration: 14 days fixed (Level 2 lab: 10d, Level 3: 7d)
- Offspring genes = average of both parents + small mutation (±0.06 per gene, clamped 0.5–1.5), same formula as `breedGenes()` in `engine/animals.ts`
- Generation = max(parentA.generation, parentB.generation) + 1
- Cost: $200 × generation (so Gen 2 = $400, Gen 3 = $600, capped at $2,000)
- Jobs stored in store: `hybridJobs: HybridJob[]`, settled each `advanceDay()`

### How Seeds Are Used

- When planting a parcel, if a `SeedEntry` exists for that crop, player can select it from a dropdown
- `LandParcel` gets an optional `seedEntryId?: string` field
- At harvest, `SeedGenes` modifiers are applied: yield × genes.yield, growthDays × (1/genes.growth), weather penalty × (1/genes.drought)
- Processed output × genes.quality when sent to processing
- After harvest, the parcel's seed entry is consumed (quantity -1); if quantity reaches 0, entry is removed

### Seed Lab UI (new file: `app/(tabs)/granja.tsx` Seed Lab sub-tab)

Sections:
1. **Build prompt** — if `bld_seed_lab` not built, show CTA linking to Store
2. **Active hybridization form** — crop chip picker, Parent A / Parent B selectors (from seed vault), predicted offspring grades preview, "Start Hybridization" button with cost
3. **Active jobs** — progress bar per job, days remaining
4. **Seed Vault** — list of available seed entries with generation badge and gene grades

---

## 2. Animal Genetics

### Engine (already exists in `engine/animals.ts`)

- `AnimalGenes` interface: `{ production, hardiness, growth, value }` each 0.5–1.5
- `randomGenes()`, `breedGenes()`, `geneScore()` all implemented
- `OwnedAnimal` already has `genes?: AnimalGenes`

### New Store Fields

```typescript
breedingPairs: Record<string, string>  // femaleId → maleId (pending breed assignment)
```

- When `advanceDay()` triggers breeding for a female, it checks `breedingPairs` first; if set, uses that male's genes. Otherwise picks a random male of same type.
- After offspring is born, the pair is cleared.

### Animal Genetics UI (changes to `app/(tabs)/animales.tsx`)

Each animal card gets an expanded genetics panel (shown when card is tapped):

**Gene display:**
- 4 gene bars (production, hardiness, growth, value) with numeric value and letter grade
- Overall grade badge (avg of 4 genes)

**Breeding panel (females only):**
- List of available males of the same type, each showing their 4 gene grades
- Selected male shows offspring prediction (avg genes with ±mutation range)
- "Set Breeding Pair" button — saves to `breedingPairs` in store
- Currently assigned partner shown with a 🧬 icon

**Lineage panel:**
- 3-generation tree: self ← parents ← grandparents
- Each ancestor shows name + avg gene grade
- Ancestors stored on `OwnedAnimal`:

```typescript
interface OwnedAnimal {
  // existing fields...
  parentIds?: [string, string];       // [motherId, fatherId] at birth
  grandparentIds?: [string, string, string, string]; // [MM, MF, FM, FF]
}
```

- On breeding, store records parent IDs on offspring. Grandparents copied from parents' `parentIds`.
- Animals without parent data show "Unknown lineage"

---

## 3. Store Changes Summary

**New state:**
- `seedVault: SeedEntry[]`
- `hybridJobs: HybridJob[]`
- `breedingPairs: Record<string, string>`

**Modified state:**
- `LandParcel` → add `seedEntryId?: string`
- `OwnedAnimal` → add `parentIds?: [string, string]`, `grandparentIds?: [string, string, string, string]`

**New actions:**
- `startHybridization(cropId, parentAId, parentBId): void`
- `selectSeedForParcel(parcelId, seedEntryId): void`
- `setBreedingPair(femaleId, maleId): void`
- `clearBreedingPair(femaleId): void`

**Modified actions:**
- `advanceDay()` — settle completed hybrid jobs, apply seed genes at harvest, use `breedingPairs` on animal breeding

---

## 4. Data File Changes

- `data/buildingTypes.ts` — add `bld_seed_lab` (L1/L2/L3 variants)
- `store/useGameStore.ts` — new state + actions above

---

## 5. New UI Files

- Seed Lab content rendered inside `app/(tabs)/granja.tsx` as a new `'seedlab'` sub-tab
- Animal genetics panel rendered inside `app/(tabs)/animales.tsx` as an expandable section per animal card

---

## Out of Scope

- Cross-species breeding
- Gene trait display in the planting modal (future)
- Seed trading/auction (future)
- Genetic disease / inbreeding penalties (future)
