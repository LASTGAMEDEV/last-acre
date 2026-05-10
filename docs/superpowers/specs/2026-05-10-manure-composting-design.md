
# Manure Management & Composting

**Date:** 2026-05-10  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-19-electricity-system-design.md` (biogas plant), `2026-04-16-npk-drainage-soil-rework-design.md` (soil NPK system), `2026-04-09-animal-production-buildings-design.md` (animal buildings)

---

## 1. Executive Summary

Close the nutrient loop. Animals produce solid manure; harvests produce crop residue; composting combines them into high-quality soil amendment. A full batch simulation tracks C:N ratio, moisture, and turning frequency. Over-application triggers environmental fines. The existing biogas plant now produces digestate as a liquid fertilizer byproduct. This connects the animal, crop, and soil systems into one closed cycle.

**What this fixes / adds:**
- Animals currently produce slurry (liquid) only; solid manure is untracked
- Harvests produce zero byproduct — crop residue disappears
- No compost loop — players must always buy external fertilizer
- Biogas plant produces electricity but wastes its digestate

---

## 2. Solid Manure Accumulation

### 2a. Which Animals Produce Solid Manure

The existing slurry system covers liquid waste from dairy cattle and pigs. Solid manure is produced by the rest:

| Animal type | kg solid manure / day | Notes |
|-------------|----------------------|-------|
| gallina (chicken) | 0.05 per bird | High N content (C:N ~8) |
| pato (duck) | 0.07 per duck | Similar to chicken |
| caballo (horse) | 8.0 per horse | High C content (C:N ~25) — good base |
| oveja (sheep) | 1.5 per sheep | Moderate N (C:N ~15) |
| conejo (rabbit) | 0.15 per rabbit | Very high N (C:N ~7) |
| cabra (goat) | 1.2 per goat | Moderate N (C:N ~12) |
| vaca / buey (cattle on straw bedding) | 15.0 per animal | If `bld_manure_store` present; else goes to slurry |

Animals in `pocilga` (pigs) continue to produce slurry only — no solid manure.

### 2b. Solid Manure Storage

```ts
// Added to GameState:
solidManureKg: number;      // current kg in storage (default 0)
solidManureCapacity: number; // derived: sum from manure store buildings
cropResidueKg: number;       // kg of crop residue available for composting (default 0)
compostInventoryKg: number;  // kg of finished compost ready to apply (default 0)
compostBatches: CompostBatch[];  // active batches in progress
digestateKg: number;         // byproduct from biogas plant (default 0)
```

**New building:** `bld_manure_store` (Manure Store)

| Building | Capacity | Cost | Maintenance/day |
|----------|----------|------|----------------|
| `bld_manure_store_s` | 2,000 kg | $4,500 | $2 |
| `bld_manure_store_m` | 8,000 kg | $12,000 | $5 |
| `bld_manure_store_l` | 25,000 kg | $28,000 | $10 |

### 2c. Overflow Fine

If `solidManureKg + dailyManureProduced > solidManureCapacity` and animal count producing solid manure > 20:
- 3% daily chance of environmental fine: $300–$800
- Notification: *"Environmental fine — solid manure overflow. Build a Manure Store."*

If no `bld_manure_store` exists at all, solid manure produced is silently discarded (no accumulation, no composting possible, no fine below 20 animals).

---

## 3. Crop Residue

### 3a. Residue Generation

Every harvest adds to `cropResidueKg`. The residue fraction is crop-dependent:

| Crop category | Residue % of harvest weight |
|---------------|---------------------------|
| Grains (wheat, barley, oats, corn, sorghum, rice) | 80% (straw, stalks, husks) |
| Oilseeds (rapeseed, canola, sunflower) | 60% (straw + pod shells) |
| Legumes (soy, alfalfa, clover) | 40% (stems, pods) |
| Root crops (potatoes, sugarbeet) | 20% (tops, tails) |
| Fruits / high-value (strawberries, grapes, almonds, etc.) | 10% (leaf litter, prunings) |
| Cover crops (rye, mustard, buckwheat) | 100% (entire plant, not sold) |

Residue is pooled generically — no per-crop-type tracking. C content varies by source but averaged to a global residue C:N of **65:1** for composting purposes.

### 3b. Residue Capacity

`cropResidueKg` is capped at **10,000 kg** regardless. Excess from large harvests is discarded with a log line: *"Excess crop residue — not enough compost capacity."* Player can build compost bays to process it faster.

---

## 4. Composting Batches

### 4a. Batch Data Structure

```ts
interface CompostBatch {
  id: string;
  startDay: number;
  manureKg: number;         // kg solid manure added
  residueKg: number;        // kg crop residue added
  cnRatio: number;          // computed at start: (residueKg * 65 + manureKg * avgManureCN) / (manureKg + residueKg)
  moistureLevel: number;    // 0–100%; player-adjustable
  turnings: number;         // 0–5; player action
  lastTurnedDay: number;    // to enforce 7-day minimum between turnings
  maturationDay: number;    // day batch will be ready (recomputed on each turn/water)
  moistureEvents: number;   // count of days moisture was out of range (45–65%)
  status: 'active' | 'ready' | 'collected';
}
```

### 4b. Starting a Batch

Player taps "New Compost Batch" in the Composting screen:
1. Select manure amount (up to `solidManureKg`)
2. Select residue amount (up to `cropResidueKg`)
3. Game computes C:N ratio preview and quality estimate
4. Confirm → deducts materials, creates batch, sets `maturationDay`

**C:N ratio per manure type** (averaged from animal mix in `animals[]`):
```
avgManureCN = weightedAvg based on kg contributed per animal type:
  gallina: 8, conejo: 7, cabra: 12, oveja: 15, caballo: 25, vaca: 18
```

**Optimal C:N target: 25:1.** Distance from 25 determines quality penalty.

### 4c. Base Maturation

```
baseDays = 45
maturationDay = startDay + baseDays − (turnings * 5) + moisturePenaltyDays
```

Where `moisturePenaltyDays` is computed at maturation from `moistureEvents`:
- Each day moisture was < 35% or > 75% adds 2 days
- Capped at +20 penalty days

Minimum maturation: 20 days (fully turned, optimal moisture from day 1).

### 4d. Player Actions on Active Batches

**Turn compost** (available once every 7 days, up to 5 total turnings):
- Costs nothing (free if player has workers assigned to compost bay; $50 contractor fee without)
- Reduces `maturationDay` by 5 days
- Resets moisture-optimal days counter (turning mixes in dry/wet zones)
- Notification: *"Compost batch turned — ready 5 days sooner"*

**Add water** (available anytime):
- Costs $15 (water charge)
- Raises `moistureLevel` by 15 (capped at 100)
- Optimal range: 45–65%. Above 75% = anaerobic risk (see §4e)

**Check status** (shows current progress):
- C:N ratio display with traffic-light indicator
- Current moisture level
- Projected quality at maturity
- Days until ready

### 4e. Batch Events

**Too dry** (`moistureLevel < 35%`): Logged per day as `moistureEvents++`. Notification once per 7 days: *"Compost batch [ID] is drying out — add water to maintain quality."*

**Too wet / anaerobic** (`moistureLevel > 80%`): Notification: *"Compost batch [ID] is waterlogged — turn it or reduce watering. Anaerobic conditions reduce quality."* Counts as `moistureEvents++` per day.

**Rain event** (game weather): Raises `moistureLevel` by 5/day during rain events if compost bay is uncovered. Covered compost bay building (`bld_compost_bay_covered`) is immune.

---

## 5. Compost Quality & Output

### 5a. Quality Score Calculation

At maturation, compute quality 0–100:

```
cnPenalty = Math.abs(batch.cnRatio - 25) * 3   // capped at 40
moisturePenalty = batch.moistureEvents * 4       // capped at 30
turningBonus = batch.turnings * 5               // up to 25 bonus

quality = Math.min(100, Math.max(10,
  100 - cnPenalty - moisturePenalty + turningBonus
))
```

| Quality range | Grade | NPK bonus |
|--------------|-------|-----------|
| 80–100 | Premium | +8 N, +6 P, +10 K per 1000 kg applied; +2 soil organic matter |
| 50–79 | Standard | +5 N, +4 P, +7 K per 1000 kg applied; +1 soil organic matter |
| 10–49 | Poor | +2 N, +2 P, +3 K per 1000 kg applied; +0 soil organic matter |

### 5b. Output Volume

```
compostOutputKg = (batch.manureKg + batch.residueKg) * 0.40
```

40% of input weight survives composting (water/CO₂ loss). Added to `compostInventoryKg`.

### 5c. Collection

When `currentDay >= batch.maturationDay`, batch status = `'ready'`. Player taps "Collect" → transfers output to `compostInventoryKg`, removes batch. Uncollected batches don't degrade but take up compost bay capacity.

---

## 6. Compost Application to Parcels

### 6a. Apply Action

In the Fields parcel view → Amendments section, new option: "Apply Compost"
- Slider: kg to apply (default 500 kg/ha)
- Shows preview: NPK added, organic matter added, cost ($0 — it's your compost!)
- Deducts from `compostInventoryKg`

### 6b. NPK Effect

Compost adds to `parcel.soil.nitrogen/phosphorus/potassium` immediately (but as slow-release: half applied immediately, half applied over next 30 days tracked via `compostNPKReleaseRemaining` per parcel).

### 6c. Over-Application Fine

If parcel nitrogen after application would exceed **150% of its optimal level** (defined in soil spec):
- Warning shown before confirmation: *"⚠️ This will cause nitrate leaching — soil N far exceeds crop needs"*
- If player confirms anyway: 15% chance of fine $200–$600 per quarter

---

## 7. Digestate (Biogas Plant)

### 7a. Production

The existing biogas plant produces electricity/income. Now it also produces `digestateKg` daily:

```
dailyDigestateKg = slurryProcessedPerDay * 0.85
```

Digestate is the liquid residue after anaerobic digestion — approximately 85% of input slurry by weight. Stored in a `digestateTank` (reuses slurry tank infrastructure — same buildings can store digestate or slurry, shared pool).

### 7b. Application

Digestate applied to parcels acts as a **fast-release liquid fertilizer**:
- Applied via tractor (new operation: `spread_digestate` — mirrors `spread_slurry`)
- Per 1000 litres applied: +4 N, +1 P, +3 K (lower than compost, no organic matter)
- No slow-release — full effect in 1 day
- Over-application risk is same as compost (150% nitrogen threshold triggers fine warning)

### 7c. Digestate vs. Slurry vs. Compost

| Type | Source | N effect | Release | Organic matter |
|------|--------|----------|---------|---------------|
| Slurry | Liquid animal waste | +3 N per 1000L | Fast (1 day) | Minimal |
| Digestate | Biogas plant output | +4 N per 1000L | Fast (1 day) | None |
| Poor compost | 10–49 quality | +2 N per 1000kg | Slow (15 days) | None |
| Standard compost | 50–79 quality | +5 N per 1000kg | Slow (30 days) | +1 OM |
| Premium compost | 80–100 quality | +8 N per 1000kg | Slow (30 days) | +2 OM |

---

## 8. Buildings

### Compost Bay (`bld_compost_bay`)

| Building | Batch capacity | Cost | Maintenance/day | Notes |
|----------|---------------|------|----------------|-------|
| `bld_compost_bay_s` | 1 batch | $3,500 | $1 | Open-air, rain raises moisture |
| `bld_compost_bay_m` | 3 batches | $9,000 | $3 | Open-air |
| `bld_compost_bay_covered` | 3 batches | $16,000 | $5 | Covered — rain-immune; faster |

Covered bay: turnings reduced to 4 days effect, moisture stays more stable (±5/day drift instead of ±10).

---

## 9. UI

### 9a. Composting Screen

New sub-tab **"Compost"** under Ops tab → Processing:

**Top summary card:**
```
Solid Manure:  1,240 kg / 2,000 kg capacity
Crop Residue:  680 kg
Compost Ready: 0 kg
Digestate:     3,200 L
```

**Active Batches section:**
Each batch shows:
- Batch ID, started Day X
- Mix bar: [manure kg] vs [residue kg] → C:N ratio chip (green if 20–30, yellow if 15–40, red otherwise)
- Moisture gauge (35–65% green)
- Progress bar: Day X of Y until ready
- Turnings count: ⚙️⚙️⚙️⚙️⚙️ (filled = done)
- [Turn] / [Water] / [Check] action buttons

**New Batch button** → opens batch-start bottom sheet (manure/residue sliders + quality preview)

### 9b. Ready Batches

When a batch is ready, it appears at the top with a "Collect" CTA. DaySummaryModal shows: *"Compost batch ready — 420 kg of Premium compost available."*

---

## 10. State Changes Summary

### New GameState fields
```ts
solidManureKg: number;          // default 0
solidManureCapacity: number;    // derived from bld_manure_store buildings
cropResidueKg: number;          // default 0
compostInventoryKg: number;     // default 0
compostBatches: CompostBatch[]; // default []
digestateKg: number;            // default 0
```

### New Parcel fields
```ts
compostNPKReleaseRemaining?: {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  daysLeft: number;
};
```

### Save key
No bump needed — all new fields have safe defaults.

---

## 11. Implementation Order

### Phase 1 — Data & Types
1. Add `CompostBatch` interface to `types/index.ts`
2. Add new global state fields to `GameState`
3. Add `compostNPKReleaseRemaining` to `Parcel` type
4. Add manure store and compost bay buildings to `data/buildingTypes.ts`
5. Add solid manure production rates to `data/animalTypes.ts` (new `solidManureKgPerDay` field)

### Phase 2 — Store Logic
6. In `advanceDay()`: accumulate `solidManureKg` from animals, `cropResidueKg` from harvests
7. In `advanceDay()`: check overflow fines
8. In `advanceDay()`: advance compost batch maturation, fire moisture events, transition ready batches
9. In `advanceDay()`: release slow compost NPK from `compostNPKReleaseRemaining`
10. In `advanceDay()`: produce digestate from biogas if `biogasPlantBuilt`
11. Add `startCompostBatch(manureKg, residueKg)` action
12. Add `turnCompostBatch(batchId)`, `waterCompostBatch(batchId)`, `collectCompostBatch(batchId)` actions
13. Add `applyCompost(parcelId, kg)` action
14. Add `spread_digestate` to machinery operations (mirrors `spread_slurry`)

### Phase 3 — UI
15. Add "Compost" sub-tab to Ops → Processing screen
16. Build `CompostScreen.tsx` with batch cards, new-batch sheet
17. Add compost apply option to Fields parcel amendment UI
18. Add digestate spread option to Machinery tab
19. Update DaySummaryModal for compost-ready events

---

## 12. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Compost complexity | Full simulation (C:N ratio, moisture, turnings) |
| 2 | Crop residue granularity | Generic `cropResidueKg` pool (no per-crop-type tracking) |
| 3 | Digestate storage | Reuse existing slurry tank buildings (shared capacity) |
| 4 | Solid manure vs slurry | Pigs remain slurry-only; all other animals gain solid manure |
| 5 | Turning cost | Free with assigned workers; $50 contractor if no workers |
| 6 | Over-application | Warning + % fine chance, not automatic fine |

---

## 13. Out of Scope

- Vermicomposting (worm farms)
- Biochar production
- Anaerobic digestate management beyond basic spread
- Per-crop-type residue with different C:N values
- Commercial compost sales
- Compost tea (liquid extract)

---

## 14. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/composting.ts`, `components/ops/CompostScreen.tsx`, `components/ops/CompostBatchCard.tsx`, `components/ops/NewBatchSheet.tsx` |
| **Modify** | `types/index.ts` (CompostBatch, GameState, Parcel), `store/useGameStore.ts` (actions + advanceDay), `data/buildingTypes.ts` (manure stores, compost bays), `data/animalTypes.ts` (solidManureKgPerDay), `app/(tabs)/ops.tsx` (new sub-tab) |
| **No change** | Slurry system, biogas output logic (digestate adds to it, doesn't replace it) |
