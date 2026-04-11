# Animal Production Buildings — Plan 3: Feed, Waste & Species-Specific Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add feed/waste infrastructure (slurry tank, pest control, rendering, biogas), species-specific buildings (hatchery, brooder, lighting, sheep dip, wool store, weaner accommodation, finishing unit, milk cooling, pasteurisation, cream separator, apiary shelter, queen rearing), slurry tanker attachment, and full `advanceDay` + sell integration for all mechanical effects.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `npx tsc --noEmit` for verification.

---

## Plans 4+ (not in this plan)

- **Plan 4:** Feed production (silage pit mechanics, feed mill grain→feed conversion, TMR feed wagon tractor job), processing (smokehouse, curing cellar, cold store, wool scouring), monitoring (farm lab, carbon tracker), full slurry tanker tractor-job integration (`spread_slurry` operation in `advanceDay` tractor loop)
- Pollination contracts, biogas upgrader → biomethane sale/use toggle, cream separator products

---

## Architectural Notes

- **Slurry system:** Accumulation tracked as `slurryLevel: number` + `slurryCapacity: number` in GameState. `slurryCapacity` is derived from owned slurry tanks. Spreading is a standalone `spreadSlurry()` action (not a tractor job in Plan 3) — requires owning a slurry tanker attachment.
- **Slurry tanker attachment:** Added to `data/attachmentTypes.ts` with `operation: 'spread_slurry'`. Not integrated into the tractor job system in Plan 3 — only used as a prerequisite check for the `spreadSlurry()` action.
- **Derived flags:** Unlike Plan 2 (which stored 5 boolean flags), Plan 3's species-specific buildings are checked inline via `state.buildings.includes()` in `advanceDay`. Only `slurryLevel` and `slurryCapacity` are stored state.
- **Pasteurisation:** Blocks city-market milk sales if `!buildings.includes('bld_pasteurisation_unit')`. Local market sales unaffected.
- **Parcel fertility:** `LandParcel.fertility` is a 1–25 integer. `spreadSlurry()` increments all owned parcels by +1 (clamped at 25).

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `data/buildingTypes.ts` | 37 new building entries + extend `BuildingCategory` if needed |
| Modify | `data/attachmentTypes.ts` | Extend `operation` union; add 2 slurry tanker entries |
| Modify | `store/useGameStore.ts` | `slurryLevel`/`slurryCapacity` fields; `spreadSlurry` action; `buyBuilding` sync; 5 `advanceDay` blocks; `sellAnimalProduct` pasteurisation gate; rehydration + prestige reset |
| Modify | `app/(tabs)/gestion.tsx` | Slurry level indicator + Spread Slurry button |
| Modify | `app/(tabs)/tienda.tsx` | New building category sections + slurry tanker in attachments |

---

## Task 1: Extend `data/buildingTypes.ts`

**Files:** Modify `data/buildingTypes.ts`

Read the file first to understand the current structure and find the end of the BUILDING_TYPES array.

- [ ] **Step 1: Append feed & waste buildings after the last current entry (`bld_cctv_monitor`)**

```typescript
  // ── Feed & Waste Infrastructure ───────────────────────────────────────────
  { id: 'bld_silage_pit_s',           name: 'Small Silage Pit',                  category: 'production', cost: 6000,  maintenancePerDay: 3,  capacity: 5000,  buildingTier: 'small',  effectLabel: 'Stores 5,000 kg silage · winter hay alternative for ruminants' },
  { id: 'bld_silage_pit_m',           name: 'Medium Silage Pit',                 category: 'production', cost: 14000, maintenancePerDay: 6,  capacity: 15000, buildingTier: 'medium', effectLabel: 'Stores 15,000 kg silage · winter hay alternative for ruminants' },
  { id: 'bld_silage_pit_l',           name: 'Large Silage Pit',                  category: 'production', cost: 32000, maintenancePerDay: 12, capacity: 40000, buildingTier: 'large',  effectLabel: 'Stores 40,000 kg silage · winter hay alternative for ruminants' },
  { id: 'bld_feed_mill_s',            name: 'Small Feed Mill',                   category: 'production', cost: 18000, maintenancePerDay: 8,  buildingTier: 'small',  effectLabel: 'Grinds grain to feed on-farm · reduces feed purchase cost ~35%' },
  { id: 'bld_feed_mill_m',            name: 'Medium Feed Mill',                  category: 'production', cost: 40000, maintenancePerDay: 16, buildingTier: 'medium', effectLabel: 'Grinds grain to feed on-farm · reduces feed purchase cost ~35%' },
  { id: 'bld_feed_mill_l',            name: 'Large Feed Mill',                   category: 'production', cost: 85000, maintenancePerDay: 30, buildingTier: 'large',  effectLabel: 'Grinds grain to feed on-farm · reduces feed purchase cost ~35%' },
  { id: 'bld_slurry_tank_s',          name: 'Small Slurry Tank',                 category: 'production', cost: 8000,  maintenancePerDay: 3,  capacity: 5000,  buildingTier: 'small',  effectLabel: 'Stores 5,000 L slurry safely · prevents environmental fines' },
  { id: 'bld_slurry_tank_m',          name: 'Medium Slurry Tank',                category: 'production', cost: 18000, maintenancePerDay: 5,  capacity: 15000, buildingTier: 'medium', effectLabel: 'Stores 15,000 L slurry safely · prevents environmental fines' },
  { id: 'bld_slurry_tank_l',          name: 'Large Slurry Tank',                 category: 'production', cost: 40000, maintenancePerDay: 10, capacity: 40000, buildingTier: 'large',  effectLabel: 'Stores 40,000 L slurry safely · prevents environmental fines' },
  { id: 'bld_slurry_treatment',       name: 'Slurry Treatment System',           category: 'production', cost: 25000, maintenancePerDay: 10, effectLabel: 'Processes slurry into high-grade liquid fertiliser · sellable output' },
  { id: 'bld_composting_bay',         name: 'Composting Bay',                    category: 'production', cost: 10000, maintenancePerDay: 4,  effectLabel: 'Converts manure + crop waste to compost over 14 days · required for Organic Certification' },
  { id: 'bld_rendering_incinerator',  name: 'Rendering / Incinerator',           category: 'production', cost: 15000, maintenancePerDay: 8,  effectLabel: 'Legal disposal at $8/day · no per-death callout fee · bone meal + tallow output' },
  { id: 'bld_biogas_upgrader',        name: 'Biogas Upgrader',                   category: 'production', cost: 30000, maintenancePerDay: 12, effectLabel: 'Converts biogas to biomethane · passive income scales with herd size' },
  { id: 'bld_pest_control_station',   name: 'Pest Control Station',              category: 'production', cost: 4000,  maintenancePerDay: 2,  effectLabel: 'Eliminates 1–2% daily feed loss to rodents and insects' },
  // ── Species-Specific Buildings ────────────────────────────────────────────
  { id: 'bld_hatchery_s',             name: 'Small Hatchery',                    category: 'production', cost: 12000, maintenancePerDay: 5,  capacity: 50,   buildingTier: 'small',  effectLabel: 'Incubates 50 eggs · self-renewing flock at zero purchase cost' },
  { id: 'bld_hatchery_m',             name: 'Medium Hatchery',                   category: 'production', cost: 28000, maintenancePerDay: 10, capacity: 150,  buildingTier: 'medium', effectLabel: 'Incubates 150 eggs · self-renewing flock at zero purchase cost' },
  { id: 'bld_hatchery_l',             name: 'Large Hatchery',                    category: 'production', cost: 60000, maintenancePerDay: 18, capacity: 400,  buildingTier: 'large',  effectLabel: 'Incubates 400 eggs · self-renewing flock at zero purchase cost' },
  { id: 'bld_brooder_house_s',        name: 'Small Brooder House',               category: 'production', cost: 8000,  maintenancePerDay: 4,  capacity: 50,   buildingTier: 'small',  effectLabel: 'Heated housing for chicks · mortality 3% (vs 30%)' },
  { id: 'bld_brooder_house_m',        name: 'Medium Brooder House',              category: 'production', cost: 18000, maintenancePerDay: 8,  capacity: 150,  buildingTier: 'medium', effectLabel: 'Heated housing for chicks · mortality 3% (vs 30%)' },
  { id: 'bld_brooder_house_l',        name: 'Large Brooder House',               category: 'production', cost: 38000, maintenancePerDay: 16, capacity: 400,  buildingTier: 'large',  effectLabel: 'Heated housing for chicks · mortality 3% (vs 30%)' },
  { id: 'bld_lighting_system',        name: 'Poultry Lighting System',           category: 'production', cost: 9000,  maintenancePerDay: 3,  effectLabel: 'Year-round consistent egg production · prevents 60% winter laying drop' },
  { id: 'bld_sheep_dip',              name: 'Sheep Dip / Foot Bath',             category: 'production', cost: 7000,  maintenancePerDay: 2,  effectLabel: 'Annual autumn dip · lameness events rare · eliminates scab outbreak risk' },
  { id: 'bld_wool_store_s',           name: 'Small Wool Store',                  category: 'production', cost: 10000, maintenancePerDay: 3,  capacity: 500,  buildingTier: 'small',  effectLabel: 'Stores 500 kg baled wool · sell at price peaks instead of immediately' },
  { id: 'bld_wool_store_m',           name: 'Medium Wool Store',                 category: 'production', cost: 22000, maintenancePerDay: 6,  capacity: 2000, buildingTier: 'medium', effectLabel: 'Stores 2,000 kg baled wool · sell at price peaks instead of immediately' },
  { id: 'bld_wool_store_l',           name: 'Large Wool Store',                  category: 'production', cost: 48000, maintenancePerDay: 12, capacity: 8000, buildingTier: 'large',  effectLabel: 'Stores 8,000 kg baled wool · sell at price peaks instead of immediately' },
  { id: 'bld_weaner_accommodation_s', name: 'Small Weaner Accommodation',        category: 'production', cost: 10000, maintenancePerDay: 4,  capacity: 20,   buildingTier: 'small',  effectLabel: '20 weaners · post-weaning mortality 4% (vs 25%)' },
  { id: 'bld_weaner_accommodation_m', name: 'Medium Weaner Accommodation',       category: 'production', cost: 22000, maintenancePerDay: 8,  capacity: 50,   buildingTier: 'medium', effectLabel: '50 weaners · post-weaning mortality 4% (vs 25%)' },
  { id: 'bld_weaner_accommodation_l', name: 'Large Weaner Accommodation',        category: 'production', cost: 48000, maintenancePerDay: 16, capacity: 120,  buildingTier: 'large',  effectLabel: '120 weaners · post-weaning mortality 4% (vs 25%)' },
  { id: 'bld_finishing_unit_s',       name: 'Small Finishing Unit',              category: 'production', cost: 14000, maintenancePerDay: 6,  capacity: 20,   buildingTier: 'small',  effectLabel: 'Grow-out pens for 20 pigs · +10% sale value at optimal weight' },
  { id: 'bld_finishing_unit_m',       name: 'Medium Finishing Unit',             category: 'production', cost: 30000, maintenancePerDay: 12, capacity: 50,   buildingTier: 'medium', effectLabel: 'Grow-out pens for 50 pigs · +10% sale value at optimal weight' },
  { id: 'bld_finishing_unit_l',       name: 'Large Finishing Unit',              category: 'production', cost: 65000, maintenancePerDay: 22, capacity: 120,  buildingTier: 'large',  effectLabel: 'Grow-out pens for 120 pigs · +10% sale value at optimal weight' },
  { id: 'bld_milk_cooling_tank_s',    name: 'Small Milk Cooling Tank',           category: 'production', cost: 12000, maintenancePerDay: 4,  capacity: 500,  buildingTier: 'small',  effectLabel: 'Holds 500 L milk up to 3 days · batch shipments for better prices' },
  { id: 'bld_milk_cooling_tank_m',    name: 'Medium Milk Cooling Tank',          category: 'production', cost: 28000, maintenancePerDay: 8,  capacity: 2000, buildingTier: 'medium', effectLabel: 'Holds 2,000 L milk up to 3 days · batch shipments for better prices' },
  { id: 'bld_milk_cooling_tank_l',    name: 'Large Milk Cooling Tank',           category: 'production', cost: 60000, maintenancePerDay: 16, capacity: 6000, buildingTier: 'large',  effectLabel: 'Holds 6,000 L milk up to 3 days · batch shipments for better prices' },
  { id: 'bld_pasteurisation_unit',    name: 'Pasteurisation Unit',               category: 'production', cost: 35000, maintenancePerDay: 12, effectLabel: 'Required for city supermarket milk sales · opens direct-sale channel' },
  { id: 'bld_cream_separator',        name: 'Cream Separator',                   category: 'production', cost: 18000, maintenancePerDay: 5,  effectLabel: 'Splits milk into cream + skim milk · cream sold as separate product' },
  { id: 'bld_apiary_shelter',         name: 'Apiary Shelter',                    category: 'production', cost: 8000,  maintenancePerDay: 3,  effectLabel: 'Protects hives from winter · colony collapse 4% (vs 20%) per winter' },
  { id: 'bld_queen_rearing_unit',     name: 'Queen Rearing Unit',                category: 'production', cost: 14000, maintenancePerDay: 5,  effectLabel: 'Breed replacement queens on-farm in 16 days · excess queens sellable' },
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add data/buildingTypes.ts
git commit -m "feat(data): add feed/waste and species-specific building types (Plan 3)"
```

---

## Task 2: Extend `data/attachmentTypes.ts`

**Files:** Modify `data/attachmentTypes.ts`

Read the file first to understand the `AttachmentType` interface and existing entries.

- [ ] **Step 1: Extend the `operation` type union**

Find the `operation` field type in the `AttachmentType` interface:
```typescript
operation: 'till' | 'plant' | 'spray';
```
Change to:
```typescript
operation: 'till' | 'plant' | 'spray' | 'spread_slurry';
```

- [ ] **Step 2: Append 2 slurry tanker entries to the attachments array**

After the last existing entry, append:

```typescript
  {
    id: 'att_slurry_tanker_s',
    name: 'Small Slurry Tanker',
    cost: 12000,
    operation: 'spread_slurry',
    size: 'small',
    haPerDay: 8,
    compatibleTractorSizes: ['small', 'medium', 'large'],
  },
  {
    id: 'att_slurry_tanker_l',
    name: 'Large Slurry Tanker',
    cost: 28000,
    operation: 'spread_slurry',
    size: 'large',
    haPerDay: 20,
    compatibleTractorSizes: ['large'],
  },
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors (if `TractorJob.operation` has an exhaustive check somewhere, add `'spread_slurry'` to its union too — search for `operation:` in `store/useGameStore.ts`).

- [ ] **Step 4: Commit**

```bash
git add data/attachmentTypes.ts
git commit -m "feat(data): add slurry tanker attachment type"
```

---

## Task 3: GameState slurry fields + `spreadSlurry` action + `buyBuilding` sync

**Files:** Modify `store/useGameStore.ts`

Read the file to find: `GameState` interface, `makeInitialState`, `buyBuilding`, and the `partialize` exclusion list.

- [ ] **Step 1: Add 2 new fields to `GameState` interface**

After the Plan 2 fields (`sirePenAnimalIds`, `hasCCTV`, `sickBayCapacity`), add:

```typescript
  // Feed & Waste infrastructure (Plan 3)
  slurryLevel: number;          // current litres in slurry tank
  slurryCapacity: number;       // derived: sum of capacity from owned slurry tank buildings
```

- [ ] **Step 2: Add `spreadSlurry` action signature**

```typescript
  spreadSlurry: () => void;
```

- [ ] **Step 3: Initialize in `makeInitialState`**

```typescript
  slurryLevel: 0,
  slurryCapacity: 0,
```

- [ ] **Step 4: Update `buyBuilding` to sync `slurryCapacity`**

Find `buyBuilding`. In the final `set()` call where derived flags are already computed (from Plan 2), add `slurryCapacity` computation alongside `sickBayCapacity`. Add this alongside the existing `sickBayCapacity` reduce:

```typescript
const slurryCapacity = newBuildings.reduce((cap, bid) => {
  if (bid === 'bld_slurry_tank_s') return cap + 5000;
  if (bid === 'bld_slurry_tank_m') return cap + 15000;
  if (bid === 'bld_slurry_tank_l') return cap + 40000;
  return cap;
}, 0);
```

Add `slurryCapacity` to the `set({...})` call.

- [ ] **Step 5: Implement `spreadSlurry` action**

After `removeFromSirePen`, add:

```typescript
spreadSlurry: () => {
  const state = get();
  if (state.slurryLevel <= 0) return;
  const hasSlurryTanker = (state.attachments ?? []).some(
    (a: OwnedAttachment) => a.typeId === 'att_slurry_tanker_s' || a.typeId === 'att_slurry_tanker_l'
  );
  if (!hasSlurryTanker) return;
  // Apply +1 soil fertility to all owned parcels (clamped at 25)
  const newParcels = (state.parcels ?? []).map((p: LandParcel) => {
    if (!p.owned) return p;
    return { ...p, fertility: Math.min(25, p.fertility + 1) };
  });
  set({ parcels: newParcels, slurryLevel: 0 });
},
```

Note: `OwnedAttachment` and `LandParcel` are already defined in this file. Use whatever types are in scope.

- [ ] **Step 6: Add `spreadSlurry` to `partialize` exclusion list**

Find the `partialize` destructure (where all actions are excluded from localStorage). Add `spreadSlurry` to the destructure list alongside the other actions.

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): slurry level/capacity state, spreadSlurry action, buyBuilding sync"
```

---

## Task 4: `advanceDay` — slurry accumulation, pest feed loss, disposal fee, biogas income

**Files:** Modify `store/useGameStore.ts`

Read `advanceDay` to understand: where the feed deduction happens (search `hayMissedDays`), where animal deaths are handled (search `diedIds`), and where production buildings are processed (search `productionBuildings`).

### Block A — Slurry accumulation (add AFTER production buildings processing, before weigh crate)

Daily slurry output by species (litres per animal per day):
- `vaca`: 35, `bufalo`: 30, `cabra`: 12, `cerdo`: 8, `oveja`: 5, all others: 0

```typescript
// ── Slurry accumulation ───────────────────────────────────────────────────
const SLURRY_LITRES_PER_DAY: Record<string, number> = {
  vaca: 35, bufalo: 30, cabra: 12, cerdo: 8, oveja: 5,
};
const hasSlurryTank = (state.buildings ?? []).some(bid =>
  bid === 'bld_slurry_tank_s' || bid === 'bld_slurry_tank_m' || bid === 'bld_slurry_tank_l'
);
const newSlurryCapacity = hasSlurryTank
  ? (state.buildings ?? []).reduce((cap, bid) => {
      if (bid === 'bld_slurry_tank_s') return cap + 5000;
      if (bid === 'bld_slurry_tank_m') return cap + 15000;
      if (bid === 'bld_slurry_tank_l') return cap + 40000;
      return cap;
    }, 0)
  : 0;
const dailySlurryProduced = animals.reduce((total: number, a: OwnedAnimal) => {
  return total + (SLURRY_LITRES_PER_DAY[a.typeId] ?? 0);
}, 0);
const dairyPigCount = animals.filter((a: OwnedAnimal) =>
  ['vaca', 'bufalo', 'cabra', 'cerdo'].includes(a.typeId)
).length;
let newSlurryLevel = state.slurryLevel ?? 0;
let slurryFine = 0;
if (dailySlurryProduced > 0) {
  if (!hasSlurryTank && dairyPigCount > 15 && Math.random() < 0.03) {
    // No tank + large dairy/pig herd: environmental fine
    slurryFine = 400;
    summary.push({
      id: `slurry_fine_${newDay}`,
      icon: '⚠️',
      title: 'Environmental fine — no slurry storage',
      detail: `$${slurryFine} fine. Build a Slurry Tank to avoid these.`,
      severity: 'warning',
    });
  }
  if (hasSlurryTank) {
    newSlurryLevel = Math.min(newSlurryCapacity, newSlurryLevel + dailySlurryProduced);
    if (newSlurryLevel >= newSlurryCapacity) {
      slurryFine = 300;
      summary.push({
        id: `slurry_overflow_${newDay}`,
        icon: '⚠️',
        title: 'Slurry tank full — overflow fine',
        detail: `$${slurryFine} fine. Spread slurry to free capacity.`,
        severity: 'warning',
      });
    }
  }
}
```

Include `slurryFine` in the final money deduction at the end of `advanceDay`.

### Block B — Pest control feed loss (add JUST BEFORE the existing feed deduction block)

```typescript
// ── Pest control: feed loss ───────────────────────────────────────────────
const hasPestControl = (state.buildings ?? []).includes('bld_pest_control_station');
if (!hasPestControl) {
  const lossRate = 0.015; // 1.5% daily loss without pest control
  const currentHay = (state.animalInventory ?? {})['hay'] ?? 0;
  if (currentHay > 0) {
    const hayLoss = Math.floor(currentHay * lossRate);
    if (hayLoss > 0) {
      // Deduct from animalInventory hay
      // Use the same pattern as the existing hay deduction in advanceDay
    }
  }
}
```

> **IMPORTANT:** Read the existing feed deduction block carefully. The grain inventory is stored across multiple grain product IDs (trigo, maiz, cebada). The hay is stored in `animalInventory['hay']`. Only deduct hay in this block (grain loss from pests is negligible). Use the same `set()` pattern for inventory updates — do NOT call a separate `set()` here; instead add the pest hay loss to the existing inventory calculation in that same block, or accumulate a `pestHayLoss` variable before the existing feed block and subtract it there.

Simplest approach: declare `let pestHayLoss = 0` before the feed block. Set it in the pest control check. Then in the existing hay inventory deduction, subtract an extra `pestHayLoss` from the hay available.

### Block C — Animal disposal fee (add after the `diedIds` filter, where death summary events are generated)

```typescript
// ── Animal disposal ───────────────────────────────────────────────────────
const hasRenderer = (state.buildings ?? []).includes('bld_rendering_incinerator');
if (diedIds.length > 0 && !hasRenderer) {
  const disposalFee = diedIds.length * 80;
  summary.push({
    id: `disposal_fee_${newDay}`,
    icon: '💀',
    title: `${diedIds.length} animal${diedIds.length > 1 ? 's' : ''} died — disposal fee`,
    detail: `$${disposalFee} callout fee. Build a Rendering Unit to avoid this.`,
    severity: 'warning',
  });
  // Include disposalFee in final money deduction
}
```

Accumulate `disposalFee` and include in the final `set({ money: state.money - ... })` call.

### Block D — Biogas income (add at the end of `advanceDay`, just before the final `set()`)

```typescript
// ── Biogas upgrader income ────────────────────────────────────────────────
const hasBiogasUpgrader = (state.buildings ?? []).includes('bld_biogas_upgrader');
let biogasIncome = 0;
if (hasBiogasUpgrader) {
  // Income scales with dairy + pig herd (more animals → more slurry → more biogas)
  const biogasAnimals = animals.filter((a: OwnedAnimal) =>
    ['vaca', 'bufalo', 'cabra', 'cerdo', 'oveja'].includes(a.typeId)
  ).length;
  biogasIncome = Math.round(biogasAnimals * 0.8); // $0.80/animal/day, ~$16/day at 20 animals
  if (biogasIncome > 0) {
    summary.push({
      id: `biogas_income_${newDay}`,
      icon: '⚡',
      title: `Biogas income +$${biogasIncome}`,
      detail: `${biogasAnimals} animals producing biogas`,
      severity: 'info',
    });
  }
}
```

Add `biogasIncome` to the final money calculation (add it, not subtract it).

- [ ] **TypeScript check:** `npx tsc --noEmit`

- [ ] **Commit:**
```bash
git add store/useGameStore.ts
git commit -m "feat(store): advanceDay slurry accumulation, pest feed loss, disposal fee, biogas income"
```

---

## Task 5: `advanceDay` — species-specific building effects

**Files:** Modify `store/useGameStore.ts`

Read `advanceDay` to find: the production buildings loop (where poultry `dailyProductionValue` is calculated), the existing winter/season logic (search `seasonKey`), and the sickness/death processing block.

### Block A — Poultry lighting: winter production value penalty

Find the production buildings `advanceDay` loop where `dailyProductionValue` is computed for each building. For poultry species (`gallina`, `pato`, `codorniz`), apply a winter multiplier when the lighting system is absent.

The season is winter when `seasonKey(newDay) === 'winter'`. Add this inside the loop, just after `dailyProductionValue` is set:

```typescript
// Poultry lighting: winter production penalty
const POULTRY_SPECIES = new Set(['gallina', 'pato', 'codorniz']);
if (POULTRY_SPECIES.has(pb.animalTypeId)) {
  const isWinter = seasonKey(newDay) === 'winter';
  const hasLighting = (state.buildings ?? []).includes('bld_lighting_system');
  if (isWinter && !hasLighting) {
    dailyProductionValue = Math.round(dailyProductionValue * 0.4);
  }
}
```

### Block B — Brooder mortality: young poultry death risk (add inside the sickness/death pass)

Find the section where animal deaths are processed. After the 14-day sickness death filter, add a daily mortality pass for young poultry:

```typescript
// ── Brooder house: young poultry mortality ────────────────────────────────
const BROODER_SPECIES = new Set(['gallina', 'pato', 'codorniz']);
const hasBrooder = (state.buildings ?? []).some(bid =>
  bid === 'bld_brooder_house_s' || bid === 'bld_brooder_house_m' || bid === 'bld_brooder_house_l'
);
animals = animals.filter((a: OwnedAnimal) => {
  if (!BROODER_SPECIES.has(a.typeId)) return true;
  const agedays = newDay - a.bornDay;
  if (agedays > 14) return true; // no longer a chick
  const mortalityRate = hasBrooder ? 0.005 : 0.03; // 0.5% vs 3% per day
  if (Math.random() < mortalityRate) {
    diedIds.push(a.id);
    return false;
  }
  return true;
});
```

### Block C — Sheep dip: autumn lameness event

Find where seasonal events are processed (search for `seasonKey` or the autumn/season-end block). Add a sheep dip check each autumn:

```typescript
// ── Sheep dip: autumn lameness event ──────────────────────────────────────
const prevSeason = seasonKey(newDay - 1);
const currentSeason = seasonKey(newDay);
if (currentSeason === 'autumn' && prevSeason !== 'autumn') {
  // Season just changed to autumn — run annual sheep dip check
  const hasSheepDip = (state.buildings ?? []).includes('bld_sheep_dip');
  const sheep = animals.filter((a: OwnedAnimal) => a.typeId === 'oveja' && !a.sick);
  sheep.forEach((s: OwnedAnimal) => {
    const lamenessChance = hasSheepDip ? 0.01 : 0.1; // 1% vs 10% per sheep
    if (Math.random() < lamenessChance) {
      animals = animals.map((a: OwnedAnimal) =>
        a.id === s.id ? { ...a, sick: true, sicknessDay: newDay } : a
      );
      newSickIds.push(s.id);
    }
  });
}
```

### Block D — Weaner accommodation: young pig mortality

After the brooder mortality block, add:

```typescript
// ── Weaner accommodation: post-weaning pig mortality ─────────────────────
const hasWeanerAccom = (state.buildings ?? []).some(bid =>
  bid === 'bld_weaner_accommodation_s' || bid === 'bld_weaner_accommodation_m' || bid === 'bld_weaner_accommodation_l'
);
animals = animals.filter((a: OwnedAnimal) => {
  if (a.typeId !== 'cerdo') return true;
  const agedays = newDay - a.bornDay;
  if (agedays < 28 || agedays > 56) return true; // only weaners (28–56 days)
  const mortalityRate = hasWeanerAccom ? 0.003 : 0.02; // 0.3% vs 2% per day
  if (Math.random() < mortalityRate) {
    diedIds.push(a.id);
    return false;
  }
  return true;
});
```

### Block E — Finishing unit: pig sale bonus in `sellAnimal`

Find `sellAnimal`. After the existing weigh-crate bonus (`optimalBonus`), add a finishing unit bonus for pigs:

```typescript
const hasFinishingUnit = (state.buildings ?? []).some(bid =>
  bid === 'bld_finishing_unit_s' || bid === 'bld_finishing_unit_m' || bid === 'bld_finishing_unit_l'
);
const finishingBonus = hasFinishingUnit && animal.typeId === 'cerdo' ? 1.10 : 1.0;
const value = Math.round(baseValue * optimalBonus * finishingBonus);
```

- [ ] **TypeScript check:** `npx tsc --noEmit`

- [ ] **Commit:**
```bash
git add store/useGameStore.ts
git commit -m "feat(store): species effects — poultry lighting, brooder, sheep dip, weaner accommodation, finishing unit"
```

---

## Task 6: `sellAnimalProduct` — pasteurisation city market gate

**Files:** Modify `store/useGameStore.ts`

Find `sellAnimalProduct`. Look for where the city market is checked (search `'city'` near the sellAnimalProduct action). The spec says: without `bld_pasteurisation_unit`, milk cannot be sold to city supermarket buyers.

- [ ] **Step 1: Add pasteurisation gate**

After the existing Grade C milk city/export block (from Plan 1), add:

```typescript
// Pasteurisation gate: milk requires pasteurisation for city market
const MILK_PRODUCTS = new Set(['milk']);
if (MILK_PRODUCTS.has(productType) && marketType === 'city') {
  const hasPasteurisation = (state.buildings ?? []).includes('bld_pasteurisation_unit');
  if (!hasPasteurisation) {
    // Block city market sale — redirect to local
    // Return early or show an error — match the existing pattern for blocked sales
    return;
  }
}
```

> **IMPORTANT:** Read the existing `sellAnimalProduct` code to understand what `productType` and `marketType` are called. Also check if there's already a city-market gate pattern to follow. Return early (same as the Grade C gate) so it's consistent.

- [ ] **Step 2: TypeScript check:** `npx tsc --noEmit`

- [ ] **Step 3: Commit:**
```bash
git add store/useGameStore.ts
git commit -m "feat(store): pasteurisation required for city market milk sales"
```

---

## Task 7: `gestion.tsx` — slurry indicator + Spread Slurry button

**Files:** Modify `app/(tabs)/gestion.tsx`

Read `gestion.tsx` to understand existing structure and where the production buildings section is rendered.

- [ ] **Step 1: Add `slurryLevel`, `slurryCapacity`, `spreadSlurry` to useGameStore destructure**

- [ ] **Step 2: Add `SlurrySection` component before the main screen component**

```typescript
function SlurrySection({
  slurryLevel,
  slurryCapacity,
  spreadSlurry,
  hasSlurryTanker,
}: {
  slurryLevel: number;
  slurryCapacity: number;
  spreadSlurry: () => void;
  hasSlurryTanker: boolean;
}) {
  if (slurryCapacity <= 0) return null;
  const fillPct = Math.min(1, slurryLevel / slurryCapacity);
  const barColor = fillPct >= 0.9 ? '#f44336' : fillPct >= 0.7 ? '#ff9800' : '#4caf50';
  return (
    <View style={{ backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Slurry Tank</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 8, marginRight: 8 }}>
          <View style={{ width: `${Math.round(fillPct * 100)}%`, backgroundColor: barColor, borderRadius: 4, height: 8 }} />
        </View>
        <Text style={{ color: '#aaa', fontSize: 11 }}>
          {slurryLevel.toLocaleString()} / {slurryCapacity.toLocaleString()} L
        </Text>
      </View>
      {hasSlurryTanker && slurryLevel > 0 && (
        <TouchableOpacity
          style={{ backgroundColor: '#2e7d32', borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' }}
          onPress={spreadSlurry}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Spread on Fields (+1 fertility all owned parcels)</Text>
        </TouchableOpacity>
      )}
      {!hasSlurryTanker && slurryLevel > 0 && (
        <Text style={{ color: '#ff9800', fontSize: 11, marginTop: 6 }}>Buy a Slurry Tanker attachment to spread slurry</Text>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Render `SlurrySection` in the management screen**

Find where `ProductionBuildingsSection` or the main content area is rendered. Add `SlurrySection` near the top of the management content, before production buildings:

```typescript
<SlurrySection
  slurryLevel={slurryLevel ?? 0}
  slurryCapacity={slurryCapacity ?? 0}
  spreadSlurry={spreadSlurry}
  hasSlurryTanker={(attachments ?? []).some((a: OwnedAttachment) =>
    a.typeId === 'att_slurry_tanker_s' || a.typeId === 'att_slurry_tanker_l'
  )}
/>
```

Note: `attachments` must be destructured from `useGameStore`. Add it if not already present.

- [ ] **Step 4: TypeScript check:** `npx tsc --noEmit`

- [ ] **Step 5: Commit:**
```bash
git add "app/(tabs)/gestion.tsx"
git commit -m "feat(ui): slurry level indicator and spread button in gestion tab"
```

---

## Task 8: `tienda.tsx` — new building categories + slurry tanker

**Files:** Modify `app/(tabs)/tienda.tsx`

Read `tienda.tsx` to understand: how `BUILDING_CATEGORY_ORDER` is defined, how `handleBuyBuilding` works (from Plan 2), and how attachments are displayed/purchasable.

The new buildings all use `category: 'production'` — they'll appear in the existing production buildings section. No new category is needed.

- [ ] **Step 1: Verify production buildings section shows all new buildings**

The existing production buildings section in `tienda.tsx` should already show all `category: 'production'` buildings. Check that the "already owned" check works for the new buildings (they have no `animalTypeId`, so the Plan 2 routing already sends them through `buyBuilding`). If there's a filter that limits which production buildings appear, make sure the new ones aren't excluded.

- [ ] **Step 2: Add slurry tanker to attachments section**

Find where attachments are displayed/purchasable in `tienda.tsx`. The slurry tanker attachment should appear there alongside existing cultivators, planters, and sprayers.

Check if there's a filter on `operation` type for displayed attachments. If so, add `'spread_slurry'` to the filter. If attachments are shown without filtering by operation type, no change needed.

- [ ] **Step 3: TypeScript check:** `npx tsc --noEmit`

- [ ] **Step 4: Commit:**
```bash
git add "app/(tabs)/tienda.tsx"
git commit -m "feat(ui): ensure new Plan 3 buildings and slurry tanker visible in shop"
```

---

## Task 9: Rehydration + prestige reset

**Files:** Modify `store/useGameStore.ts`

- [ ] **Step 1: Extend `onRehydrateStorage`**

Find the existing `onRehydrateStorage` callback (added in Plan 2 Task 9). Add slurry capacity recomputation:

```typescript
const b = state.buildings ?? [];
// ... existing Plan 2 lines ...
state.slurryCapacity = (b.includes('bld_slurry_tank_s') ? 5000 : 0) +
                       (b.includes('bld_slurry_tank_m') ? 15000 : 0) +
                       (b.includes('bld_slurry_tank_l') ? 40000 : 0);
// slurryLevel is stored as-is (it's not derived)
state.slurryLevel = state.slurryLevel ?? 0;
```

- [ ] **Step 2: Add to `performPrestige` reset**

Find `performPrestige` and add:

```typescript
slurryLevel: 0,
slurryCapacity: 0,
```

- [ ] **Step 3: TypeScript check:** `npx tsc --noEmit`

- [ ] **Step 4: Commit:**
```bash
git add store/useGameStore.ts
git commit -m "feat(store): rehydrate and prestige-reset Plan 3 slurry fields"
```

---

## Dependency Order

- Tasks 1 and 2 are independent (data-only)
- Task 3 depends on Tasks 1 and 2 (needs building IDs and attachment type)
- Tasks 4 and 5 depend on Task 3 (need slurryLevel/slurryCapacity in GameState)
- Task 6 is independent (only touches sellAnimalProduct)
- Tasks 7 and 8 depend on Task 3 (need spreadSlurry action)
- Task 9 depends on Task 3 (needs the fields to exist)

## Known Challenges

1. **`summary.push` variable name** — In Plan 2 the summary array was called `summary`. Verify the actual variable name in `advanceDay` before using it.
2. **`newSickIds` scope** — The sheep dip block uses `newSickIds`. Verify this array exists in `advanceDay` scope at the point where the autumn block is inserted.
3. **`sellAnimalProduct` parameter names** — Read the action signature to get the exact parameter names for product type and market type before implementing Task 6.
4. **`OwnedAttachment` type** — May require import in `gestion.tsx`. Check what imports are needed.
5. **`disposalFee` + `slurryFine` accumulation** — These must be included in the final `set({ money: ... })` call at the end of `advanceDay`. Find the existing money deduction pattern and add these two new terms.
