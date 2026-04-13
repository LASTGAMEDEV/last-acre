# Compound Realism Stack — Design Spec

**Date:** 2026-04-13
**Status:** Approved for planning
**Goal:** Add mechanics no other farming game has — a living soil system, a shared regional water commons, evolving pest resistance, crop rotation pressure, and an external world (banks, government, buyers, co-ops) that reacts to how well you farm.

---

## Overview

Two phases, each independently shippable.

**Phase 1 — Soil & Ecosystem Engine:** Adds complexity to things the player already does (planting, irrigating, spraying). All four systems interlock — bad decisions in one compound into problems in the others.

**Phase 2 — Industry & Regulatory Pressure:** Makes the outside world react to your farm's health. Banks, government, buyers, and co-ops all respond to the state of your operation.

Integration principle: nothing is removed. Both phases extend existing systems.

---

## Phase 1: Soil & Ecosystem Engine

### 1.1 Multi-Dimension Soil

**What changes:** Each `Parcel` gains 5 new numeric fields replacing the existing single `fertility` value.

| Field | Range | Optimal | Description |
|---|---|---|---|
| `nitrogen` | 0–100 | 60–80 | Primary plant nutrient. Depleted by crops, restored by legumes and fertilizer. Lost to runoff in heavy rain. |
| `organicMatter` | 0–10 | 4–7% | Backbone of soil health. Built by cover crops and manure. Decays slowly under intensive cropping. |
| `compaction` | 0–100 | 0–25 | 0 = loose, 100 = compacted. Raised by heavy machinery. Lowered by fallow and subsoiler attachment. |
| `pH` | 4.0–8.5 | 6.0–7.0 | Drifts slowly with fertilizer type. Corrected with lime (raises pH) or sulfur (lowers pH). |
| `microbialLife` | 0–100 | 60–100 | Amplifies organic matter benefits. Killed by heavy pesticide use. Recovers slowly without pesticide pressure. |

**Migration:** The existing `fertility` field maps to `nitrogen` on save load (v5 save key bump required).

**Yield calculation:**
Each stat outside its optimal range applies a multiplier. Multipliers stack multiplicatively. A perfectly managed parcel can yield up to +20% above baseline. A neglected parcel can fall to 30–40% of baseline.

| Stat | Penalty trigger | Max penalty |
|---|---|---|
| nitrogen | < 40 or > 90 | –40% |
| organicMatter | < 2% | –25% |
| compaction | > 50 | –30% |
| pH | outside 5.5–7.5 | –20% |
| microbialLife | < 30 | –15% |

**What changes each stat per day:**

- `nitrogen`: –(cropNitrogenDemand / growthDays) per day while crop is growing; +25 when soy/alfalfa harvested; +15 per fertilizer application; –8 on heavy rain days
- `organicMatter`: –0.02%/day during active crop; +3% when cover crop completes; +1% per manure spreading event
- `compaction`: +2 per machinery operation on parcel; –1/day during fallow; –15 per subsoiler pass
- `pH`: +0.02/application of high-N synthetic fertilizer; –0.02/application of organic matter; corrected by lime/sulfur amendments (+/–0.5 per application, max 2 applications/season)
- `microbialLife`: follows organicMatter trend with 1-season lag; –10 per pesticide application; +5/day when organicMatter > 5% and no pesticide used that season

**New shop items:**
- Lime (bag) — raises pH +0.5
- Sulfur amendment — lowers pH –0.5
- Subsoiler attachment (machinery) — removes compaction
- Soil analysis kit (one-time tool) — reveals exact stat values (before purchase, player sees only rough ranges: Low / Medium / High)

**UI:** Parcel detail view gains a "Soil" sub-tab. Five stats shown as coloured bar indicators (red/amber/green). Tooltip per stat explains what causes it and how to fix it. Parcels with consecutive same-crop history show a red tint in the field view; healthy-rotation parcels show a faint green glow.

---

### 1.2 Regional Water Table

**The aquifer:** A single `aquiferLevel` (0–100%) stored in global game state. It represents the regional groundwater supply shared by the player and all NPC farms.

**Recharge:** Each day, aquifer gains:
- `rainfallRecharge`: proportional to today's precipitation (weather system feed-in)
- Season modifier: spring +0.3/day base, summer +0.05/day, autumn +0.2/day, winter +0.4/day

**Draw:** Each irrigated player parcel draws `irrigationDraw` per day (varies by crop water need). NPC farms draw a simulated aggregate based on their total crop area and current season.

**Effect on irrigation efficiency:**

| Aquifer Level | Irrigation Efficiency | Cost Modifier |
|---|---|---|
| 70–100% | 100% | 1× |
| 40–70% | 100% | 1.2× (pumping deeper) |
| 20–40% | 70% | 1.5× |
| 0–20% | 0% (fails) | — |

**Grid water:**
When aquifer drops below 70%, a "Buy Water" option unlocks on each parcel's irrigation controls and on a regional water panel in the Weather screen.

| Aquifer Level | Grid Water Price Multiplier |
|---|---|
| 40–70% | 1.5× base irrigation cost |
| 20–40% | 2.5× |
| 0–20% | 4× (crisis pricing) |

Two tiers:
- **Basic connection** — always available, capped at a daily volume limit per farm
- **Priority contract** — purchasable infrastructure upgrade, removes daily cap, locks in a fixed price for the current season

**Player tools to reduce aquifer dependency:**
- **Rainwater harvesting tank** (new building) — captures rainfall into a private reserve; supplements irrigation without drawing from aquifer
- **Drip irrigation upgrade** (machinery) — 40% less aquifer draw per parcel it operates on
- **Drought-resistant crop variants** (genetics system) — lower per-day water need
- **Fallow rotation** — idle parcels draw nothing

**Visibility:** Aquifer level displayed on the Weather/Climate screen as a ground cross-section diagram with a water level line. Regional news event fires at 30%: *"Regional water authority issues drought warning."* Phase 2 hook: government restriction event at 15%.

---

### 1.3 Pest Resistance Evolution

**The concept:** Each crop family has 2–3 associated pest/disease threats. Each threat tracks a farm-wide `resistanceLevel` (0–100) for the primary treatment used against it.

**Resistance effects:**

| Resistance Level | Treatment Effectiveness | Cost Modifier |
|---|---|---|
| 0–30 | 100% | 1× |
| 31–60 | 75% | 1.3× |
| 61–80 | 50% | 1.75× |
| 81–100 | 20% | 2.5× |

**What raises resistance:**
- Each pesticide application of the same type: +3
- Using the same treatment class 3+ times in a row: +5 instead of +3
- High pest pressure season (warm + wet forecast): +1/day passive buildup

**What lowers resistance:**
- Not using that treatment for a full season: –8
- Rotating to a different treatment class: –5
- Fallow on all affected parcel types that season: –12

**Livestock antibiotic resistance:** Follows the same model. Antibiotic use on animals tracks a separate `antibioticResistance` level per species. High resistance → disease outbreak probability increases, vet costs spike. Alternatives: probiotics, housing quality upgrades, genetic hardiness traits.

**Biological controls (new shop items):**
- Beneficial insect release — no resistance buildup, slower acting, effective against aphids and mites
- Pheromone traps — disrupts pest breeding cycles, reduces pest pressure passively
- Companion planting buffs — certain crop combinations reduce adjacent parcel pest pressure

Biological control effectiveness scales with `microbialLife` — healthy soil makes them work better.

**UI:** Pest pressure indicator on each crop parcel card. "Resistance Report" sub-tab in the Office screen showing all tracked threats and their resistance levels, with a colour-coded risk rating and a suggested rotation plan.

---

### 1.4 Crop Rotation Pressure

Each parcel tracks `cropHistory: string[]` — the last 4 crop IDs planted on it.

**Consecutive same-crop penalties:**

| Pattern | Yield Modifier | Additional Effect |
|---|---|---|
| Same crop 2 seasons in a row | –15% | Pest pressure +10% |
| Same crop 3+ seasons in a row | –30% | Pest pressure +25%, nitrogen –20 extra on harvest |
| Rotation broken | Baseline restored | Pest pressure normalises over 1 season |
| Legume in rotation (soy, alfalfa) | +10% next crop | Nitrogen +25 |

**Cover crops:**
New planting option — no harvest revenue, but restores soil stats. Player selects a cover crop during a fallow season. Costs seeds + one machinery pass.

| Cover crop | Primary benefit |
|---|---|
| Rye | Compaction –8, weed suppression |
| Clover | Nitrogen +20, organic matter +2% |
| Mustard | Pest pressure –15% (biofumigant) |
| Buckwheat | pH moderation, microbial life +10 |

Cover crops count as a rotation break — they reset the consecutive-same-crop counter.

**UI:** Parcel field view — red tint overlay on consecutive-same-crop parcels with tooltip explaining the penalty. Green glow on parcels with healthy 3+ crop rotation. Crop history visible in parcel detail "Soil" tab.

---

## Phase 2: Industry & Regulatory Pressure

### 2.1 Bank Credit Scoring

The bank calculates a `creditScore` (300–850, displayed as a tier: Poor / Fair / Good / Excellent) updated at the start of each season using a 3-year rolling window.

**Score inputs:**

| Factor | Weight | Description |
|---|---|---|
| Average profit margin | 30% | Net income / total revenue, rolling 3 years |
| Soil health trend | 20% | Average soil stats across all parcels, improving or degrading |
| Debt-to-asset ratio | 20% | Total loans / estimated farm value |
| Missed contract deliveries | 15% | Recurring contract misses and failures |
| Aquifer usage | 15% | Flagged as environmental risk if consistently above regional average |

**Score effects on loans:**

| Tier | Interest Rate | Max Loan | Covenant |
|---|---|---|---|
| Poor (300–499) | +4% above base | 50% of normal ceiling | Bank may refuse |
| Fair (500–649) | +2% above base | 75% of normal ceiling | None |
| Good (650–749) | Base rate | Normal ceiling | None |
| Excellent (750–850) | –1.5% below base | 125% of normal ceiling | None |

**Covenants:** At Poor credit, approved loans may include conditions — e.g. "maintain average nitrogen above 40 or loan is recalled." Breach triggers a 30-day cure period before penalty.

---

### 2.2 Government Policy Cycles

A policy event fires every 60–90 in-game days. Events are not random — they are triggered by actual game state thresholds.

| Policy Event | Trigger Condition | Effect |
|---|---|---|
| Drought subsidy | Aquifer < 30% for 20+ days | Government pays per fallowed parcel per season |
| Pesticide restriction | Regional resistance avg > 70 | Specific treatment class banned for 1 season |
| Organic certification opens | Farm avg soil health > 65 for 2 seasons | Crops sold with organic label earn +35% premium |
| Water rationing order | Aquifer < 15% | Grid water purchases capped for all farms |
| Carbon credit program | Cover crops planted + low pesticide use | Earn tradeable credits, sell on commodity exchange |
| Import flood | Global event (random, rare) | Domestic grain/commodity prices crash 25–40% for 2 seasons |
| Environmental audit | Nitrate runoff (high nitrogen + heavy rain repeated) | Fine + mandatory buffer zone requirement on riverine parcels |

Policy events are announced 7 days in advance via a news event, giving the player time to adjust.

---

### 2.3 Buyer Evolution

Recurring contract buyers (from the recurring contracts system) gain lifecycle events that fire based on relationship tier and game state.

| Event | Trigger | Effect |
|---|---|---|
| Buyer upgrades standards | Preferred tier reached | Buyer now requires avg soil score > 55 or organic cert to renew |
| Buyer bankruptcy | Regional economic downturn event | Contract cancelled, outstanding payment lost, buyer removed |
| Buyer consolidation | Two buyers of same category | One contract cancelled, surviving buyer offers larger order with tougher terms |
| Premium buyer unlocks | Farm reputation > 70 + 15 total deliveries | New high-value buyer appears (export processor, specialty food brand) |
| Buyer price squeeze | Market oversupply event | Buyer requests 10% price reduction — accept or lose contract |

---

### 2.4 Co-op Mechanics

**Structure:** Three co-ops exist in the game, each specialising in a crop category.

| Co-op | Crops | Membership Fee |
|---|---|---|
| Grain Growers Collective | Wheat, corn, barley, oats, soy | $2,000/season |
| Dairy & Livestock Union | Grass, alfalfa, animals | $1,500/season |
| Specialty Producers Guild | Lavender, saffron, vanilla, grapes, almonds | $3,000/season |

**Benefits of membership:**
- Price floor guarantee on co-op crops (floor = 80% of 90-day rolling average price)
- Bulk seed/fertilizer discount: 15% off all purchases
- Shared equipment pool access (co-op harvester, co-op spray rig — no ownership cost)

**Obligations:**
- Deliver 60% of your annual production of co-op crops to the co-op each season
- Meet minimum quality standard: average soil nitrogen > 35, no missed deliveries in prior season
- Bound by co-op policy votes each season (terms can shift: floor %, delivery %, fee)

**The tradeoff:**
Price floor protects against crashes but caps upside — the remaining 40% of production can be sold freely. Direct conflict with recurring buyer contracts: player cannot commit the same crops to both a co-op and a private buyer simultaneously. Co-op delivery obligation takes priority; private contracts must be structured around it.

**Co-op health:**
Co-op has its own financial health (0–100%). A drought year where members underdeliver reduces co-op health, which can lower the price floor or raise fees the following season. If health drops below 20%, co-op suspends benefits for one season. If below 10% for two seasons, co-op dissolves.

**Joining/leaving:**
Player can join at the start of any season. Leaving mid-season incurs a penalty (forfeiture of remaining season benefits + 50% of annual membership fee). Only one co-op at a time.

**UI:** New "Co-ops" sub-tab in the Office screen. Shows all three co-ops with current floor prices, health status, membership terms, and a join/leave action. Active membership shown in the HUD alongside reputation.

---

## Data Model Changes

### Parcel (extended)
```typescript
// New fields added to existing Parcel interface
nitrogen: number;          // 0–100, replaces fertility
organicMatter: number;     // 0–10
compaction: number;        // 0–100
pH: number;                // 4.0–8.5
microbialLife: number;     // 0–100
cropHistory: string[];     // last 4 crop IDs
```

### GameState (new top-level fields)
```typescript
aquiferLevel: number;                    // 0–100
aquiferPriorityContract: boolean;        // grid water priority upgrade
pestResistance: Record<string, number>;  // threatId → 0–100
antibioticResistance: Record<string, number>; // speciesId → 0–100
creditScore: number;                     // 300–850
coopMembership: string | null;           // co-op id or null
coopHealth: Record<string, number>;      // coopId → 0–100
activePolicies: PolicyEvent[];           // currently active government policies
```

### Save version
Bump storage key from `granja-tycoon-save-v4` to `granja-tycoon-save-v5`. Migration function maps `parcel.fertility` → `parcel.nitrogen` and initialises all new parcel fields to healthy defaults.

---

## Phased Delivery

| Phase | Systems | Key files touched |
|---|---|---|
| 1a | Multi-dimension soil | `engine/crops.ts`, `store/useGameStore.ts`, `app/(tabs)/tierras.tsx` |
| 1b | Aquifer + grid water | `engine/climate.ts`, `store/useGameStore.ts`, `app/(tabs)/clima.tsx` |
| 1c | Pest resistance | `engine/crops.ts`, new `engine/pests.ts`, `store/useGameStore.ts`, `app/(tabs)/tierras.tsx` |
| 1d | Crop rotation | `engine/crops.ts`, `store/useGameStore.ts`, `app/(tabs)/tierras.tsx` |
| 2a | Credit scoring | `engine/banking.ts`, `store/useGameStore.ts`, `app/(tabs)/oficina.tsx` |
| 2b | Government policies | new `engine/policies.ts`, `store/useGameStore.ts`, `components/DaySummaryModal.tsx` |
| 2c | Buyer evolution | `engine/contracts.ts`, `store/useGameStore.ts`, `app/(tabs)/economia.tsx` |
| 2d | Co-op mechanics | new `engine/coops.ts`, `store/useGameStore.ts`, `app/(tabs)/oficina.tsx` |

---

## Out of Scope

- Multiplayer / real-time co-op with other human players
- Visual farm map redesign (soil stats shown in existing parcel detail, not as a new map layer)
- Full weather simulation rewrite (aquifer recharge feeds from existing weather system)
- `applyDisasterGrace` for recurring contracts during aquifer crisis — deferred to the climate depth plan
