# Animal Production Buildings — Design Spec
**Date:** 2026-04-09
**Status:** Approved

---

## Overview

Every animal species gets a dedicated production building that unlocks full output, throughput-based capacity, quality grading, and a deep infrastructure layer covering breeding, feed, waste, veterinary, and processing. The system is anchored by a contractor fallback pattern consistent with the existing transport system: missing a building means a mobile contractor covers production at a daily fee, not a hard block.

---

## 1. Core Mechanic — Contractor Fallback

If a player owns animals but not the required production building, a mobile contractor covers production automatically each `advanceDay`. The contractor fee is calculated per unprocessed animal (those that exceed building throughput capacity) and deducted from `state.money` directly.

- **Contractor rate:** 12% fee applied to the revenue that would have been earned from unprocessed animals. Calculated as: `unprocessedAnimals × (dailyProductionPerAnimal × currentMarketPrice × 0.12)`, using the player's currently selected market and today's price.
- **Co-op member fallback:** 6% fee if cooperative membership is active (uses co-op regional facility)
- No production is blocked — animals always produce, the question is who processes them and at what cost
- Contractor fee appears in the day summary modal as a line item per species

---

## 2. Primary Production Buildings

One building per species. Each has throughput-based capacity (not a head-count cap), worker requirements, equipment slots, and hygiene tracking.

### 2.1 Building Definitions

| Animal | Building | Base Capacity | Processing Time Per Animal |
|---|---|---|---|
| Cow | Milking Parlour | 12 cows/day (4 stalls) | Slowest |
| Goat | Goat Milking Stand | 18 goats/day (6 stalls) | Moderate |
| Buffalo | Buffalo Dairy | 10 buffalo/day (4 stalls) | Slowest |
| Sheep | Shearing Shed | 15 sheep/day | Moderate (seasonal) |
| Chicken | Egg Collection House | 80 chickens/day | Fast |
| Duck | Duck Egg House | 60 ducks/day | Fast |
| Quail | Quail Egg Station | 120 quail/day | Fastest |
| Pig | Pig Butchery | Per-cull event, 8 pigs/session | Per-event |
| Rabbit | Rabbit Butchery | Per-cull event, 12 rabbits/session | Per-event |
| Bee | Honey Extraction Suite | Per-harvest event | Periodic |

**Throughput model:** Each building has a daily processing capacity. Animals that exceed capacity on a given day are covered by the contractor at the 12% rate. The overflow count = `max(0, herdSize - dailyCapacity)`.

For butchery buildings (pig, rabbit), capacity applies per cull session rather than daily. If you cull more animals than the session capacity, overflow animals are processed by a contractor butcher.

### 2.2 Building Upgrades

Each primary production building has three tiers — Small, Medium, Large — purchased as separate buildings (not in-place upgrades, to match existing building system):

| Tier | Capacity Multiplier | Cost Range |
|---|---|---|
| Small (default) | 1× base | $8,000–$18,000 |
| Medium | 2.5× base | $22,000–$45,000 |
| Large | 5× base | $55,000–$110,000 |

### 2.3 Worker Requirement

Each production building requires at least one assigned farmhand worker to operate. Without an assigned worker:
- Building is treated as unmanned
- Full contractor fee applies regardless of building ownership
- Day summary shows "Milking Parlour unmanned — contractor covering"

A single worker can cover one small or medium building. Large buildings require two workers for full throughput; one worker reduces effective capacity by 40%.

### 2.4 Equipment Slots

Each building has 2–3 purchasable equipment slots. Equipment is bought separately from the building and installed via the building management screen.

| Building | Slot 1 | Slot 2 | Slot 3 |
|---|---|---|---|
| Milking Parlour | Automatic cluster unit (faster throughput, −1 worker requirement) | Inline milk analyser (detects mastitis early, reduces sick days) | Refrigerated pipe (replaces need for separate cooling tank building) |
| Goat Milking Stand | Automatic cluster unit | Milk analyser | — |
| Buffalo Dairy | Automatic cluster unit | Inline milk analyser | Refrigerated pipe |
| Shearing Shed | Electric shears (2× shearing speed) | Wool press (bales wool, required for export shipment) | Lanolin extractor (captures lanolin as sellable byproduct) |
| Egg Collection House | Automatic belt collector (faster, −1 worker requirement) | Egg grading machine (identifies premium eggs at 1.3× price) | UV sanitiser (reduces contamination events) |
| Duck Egg House | Automatic belt collector | Egg grading machine | — |
| Quail Egg Station | Automatic belt collector | Egg grading machine | — |
| Pig Butchery | Vacuum packer (5-day shelf life on fresh pork, removes same-day sale pressure) | Bone saw (unlocks bone meal byproduct per cull) | Smoke unit (produces smoked pork at 1.4× price) |
| Rabbit Butchery | Vacuum packer | Bone saw (bone meal byproduct) | — |
| Honey Extraction Suite | Uncapping machine (raises yield from 40% → 65%) | Centrifugal extractor (raises yield from 65% → 100%) | Wax press (captures beeswax as sellable byproduct) |

---

## 3. Building Hygiene System

Every primary production building tracks a **hygiene score (0–100)** updated each `advanceDay`.

### 3.1 Daily Degradation

Hygiene degrades daily by an amount based on species and herd density:

| Species | Base Daily Decay | Notes |
|---|---|---|
| Dairy (cow, goat, buffalo) | 3 points/day | Fastest — wet environment |
| Pig | 4 points/day | Fastest — high waste output |
| Poultry (chicken, duck, quail) | 2 points/day | Moderate |
| Sheep | 1.5 points/day | Slower |
| Rabbit | 2 points/day | Moderate |
| Bee | 0.5 points/day | Minimal |

Overcrowding modifier: if herd size exceeds building capacity by more than 20%, decay rate increases by 50%.

An assigned cleaner worker (or farmhand with cleaning task) reduces daily decay by 1.5 points/day. UV sanitiser equipment reduces decay by 0.5 points/day.

### 3.2 Hygiene Thresholds

| Score | Effect |
|---|---|
| 80–100 | Full production, certification eligible |
| 60–79 | Minor quality penalty (SCC rises, egg grade drops one level), no fines |
| 40–59 | Significant quality downgrade, animal welfare score drops, disease risk +20% |
| 20–39 | Inspector event triggered, fine $200–$500 |
| 0–19 | Production halved, animals start getting sick each day |

### 3.3 Seasonal Deep Clean

At the end of each season a 2-day worker task appears for each production building:
- Assign a farmhand to complete it → hygiene resets to 95
- Pay a cleaning contractor ($150–$400 depending on building size) → hygiene resets to 85
- Skip entirely → hygiene hard-resets to 40 regardless of daily maintenance, and the next inspector visit is a guaranteed fail

### 3.4 Inspector Events

Random inspector visits are generated in `advanceDay` with a base probability of 3% per day, modified upward when hygiene is low:
- Hygiene 60+: 2% chance
- Hygiene 40–59: 8% chance
- Hygiene 20–39: 20% chance
- Hygiene below 20: 35% chance

**Pass** (hygiene ≥ 60 at time of visit): certification progress advances, no fine.
**Fail** (hygiene < 60): fine $200–$800 scaled to severity, hygiene penalty −10 points.

---

## 4. Certification Tiers

Each production building earns a certification tier through sustained hygiene and passed inspections. Certification is per-building (a farm can have a certified milking parlour and a basic shearing shed simultaneously).

| Tier | Requirements | Market Unlock |
|---|---|---|
| Basic | Own the building | Contractor fee removed |
| Certified | Hygiene ≥ 60 for 30 consecutive days + 1 passed inspection | City market +15% price premium on products from this species |
| Organic Certified | Hygiene ≥ 80 for 60 consecutive days + 2 passed inspections + no synthetic inputs (pesticides, chemical fertiliser) used on feed crops | Dedicated organic export channel at 1.6× base price |

Certification is lost if hygiene drops below its required floor for 7 consecutive days.

---

## 5. Animal Welfare Score

Each species has an independent **welfare score (0–100)** recalculated each `advanceDay`.

### 5.1 Calculation

```
welfareScore = (hygiene × 0.30) + (feedRatio7Day × 0.30) + (densityScore × 0.20) + (healthScore × 0.20)
```

- **hygiene**: building hygiene score (0–100)
- **feedRatio7Day**: 7-day average feed sufficiency ratio (already tracked in `grainMissedDays`/`hayMissedDays`)
- **densityScore**: 100 × (1 − max(0, (herdSize − buildingCapacity) / buildingCapacity)) — 100 if under capacity, 0 if double capacity
- **healthScore**: 100 × (healthyAnimalCount / totalAnimalCount)

### 5.2 Welfare Effects

| Score | Effect |
|---|---|
| 80–100 | Grade A product designation, +10% price at city/export |
| 60–79 | Standard grade, no modifier |
| 50–59 | Grade B designation, −10% price |
| Below 50 | Export terminal rejects shipments from this species |
| Below 40 | Organic certification ineligible |
| Below 30 | Animal show entries rejected for this species |

### 5.3 UI

Welfare score displayed as a colour-coded badge per species in `animales.tsx`. Tapping the badge opens a breakdown sheet showing all four factor scores and what to improve.

---

## 6. Breeding Infrastructure

### 6.1 Quarantine Pen

- Single building covering all species
- Any animal arriving on the farm (auction, dealer, return load) spends 14 days in quarantine before joining the main herd
- Without quarantine pen: new arrivals go straight to the herd with a 15% chance of introducing disease to the entire pen
- With quarantine pen: new arrivals are isolated; disease introduction chance drops to 2%
- Quarantine status shown in `animales.tsx` as a pending count ("3 animals in quarantine — 8 days remaining")

### 6.2 Calving / Farrowing Pen

- Covers cows, goats, buffalo, and pigs
- Capacity: number of simultaneous births the pen can support
- Without pen: newborn mortality 25%
- With pen (within capacity): newborn mortality 5%
- Overflow above capacity uses the higher mortality rate
- With pregnancy scanner installed: due dates appear on the calendar and pen auto-reserves space

### 6.3 Sire Animal vs. AI Service

Players choose their breeding method per species:

**Keep a sire on-farm:**
- Requires **Sire Pen** building (reinforced housing, $6,000–$15,000 depending on species)
- Daily feed cost for the sire animal
- Occasional aggression/escape random event
- Unlimited breeding attempts once built
- Offspring genetics quality scales with sire's own genetic score — better sire = better offspring

**AI service:**
- Pay per breeding attempt ($25–$80 depending on species)
- No building required
- AI stock has fixed mid-tier genetics — no improvement over time
- Available from day 1 as the default option

### 6.4 Pregnancy Scanner

- Equipment item (not a full building) — installed in the vet room or calving pen
- Without it: player does not know when animals are due; calving pen space cannot be pre-reserved
- With it: due dates appear on the calendar, pen capacity warnings trigger 3 days before a surge, litter/calf count confirmed early

---

## 7. Feed & Waste Infrastructure

### 7.1 Feed Production Buildings

**Silage Pit**
- Fermented grass stored in an open bunker
- Cheaper to produce than dried hay (no henil drying required)
- Fills the same hay role for ruminants in winter
- Spoilage risk if uncovered (weather event can contaminate a pit — requires tarpaulin equipment slot)
- Complements the existing henil system; players can use either or both

**Feed Mill**
- Grinds harvested grain (wheat, corn) into animal feed on-farm
- Reduces daily feed purchase cost by ~35% for players who grow their own grain
- Requires grain input from inventory; outputs feed directly to feed stock
- Processes at a daily rate based on mill size (S/M/L tiers)

**TMR Feed Wagon**
- Tractor-mounted implement (attachment, same system as cultivator/planter/sprayer)
- Mixes silage + grain + supplements into one balanced ration
- Assigned as a daily tractor job to the animal building
- Improves feed conversion ratio for cattle: same feed input → 15% more milk/weight gain

### 7.2 Slurry & Waste Buildings

**Slurry Storage Tank**
- Required once dairy or pig herd exceeds 15 animals combined
- Without it: environmental inspector events generate fines $300–$600
- With it: slurry accumulates safely; must be emptied periodically (overflow triggers fine)
- Slurry empties onto fields via the slurry tanker implement (see below) for free soil fertility boost

**Slurry Tanker (Tractor Implement)**
- New attachment type added to `machineTypes.ts` and `attachmentTypes.ts`
- Fills from the slurry storage tank (fill action in the machinery tab)
- Attached to any tractor; assigned as a field job to selected parcels
- Job resolution in `advanceDay`: parcels receive a soil fertility bonus (same scale as commercial fertiliser but free)
- Cannot be used on parcels with crops less than 7 days from harvest (contamination risk)

**Slurry Treatment System**
- Upgrade to the slurry storage tank
- Processes slurry into high-grade liquid fertiliser
- Treated fertiliser sells to NPC buyers or the commodity exchange as a new product type

**Composting Bay**
- Processes solid manure + crop waste into compost over 14 days
- Output: compost bags — sellable or spreadable on fields (soil fertility boost)
- Required input for Organic Certification (demonstrates closed-loop waste management)

**Rendering / Incinerator**
- Legal disposal method for dead animals
- Without it: each animal death triggers a disposal callout fee ($50–$150 per animal)
- With it: fixed daily operating cost ($8/day); dead animals render into bone meal and tallow — both sellable via the commodity exchange

**Biogas Upgrader**
- Extension to the existing biodigester building
- Converts biogas output to biomethane
- Biomethane can be sold to the grid for daily passive income OR used to fuel machinery (player choice via a toggle)
- Income rate scales with herd size (more animals → more slurry → more biogas)

**Pest Control Station**
- One station covers the entire farm
- Without it: 1–2% of stored feed inventory lost daily to rodents and insects
- With it: feed loss negligible (0.1%)
- Requires annual restocking event (consumable bait — purchasable from the shop)

---

## 8. Veterinary & Health Infrastructure

### 8.1 On-Farm Vet Room

- Enables routine treatments (vaccination, pregnancy testing, foot trimming) in-house
- Requires an assigned vet worker to operate
- Without it: every vet visit is a callout fee ($80–$200 per event)
- With it: assigned vet worker handles routine events automatically each day; callout fee eliminated for standard treatments
- Emergency events (serious disease outbreak) still trigger a specialist callout regardless

### 8.2 Medicine Cabinet

- Temperature-controlled drug storage unit
- Without it: medicines spoil at 3× the normal rate; bulk stocking not possible
- With it: medicines maintain shelf life; bulk purchase discounts available from the shop
- Required for Organic Certification application (demonstrates controlled antibiotic use records)

### 8.3 Isolation / Sick Bay

- Separate housing for animals already in the herd that fall ill
- Without it: sick animals remain in the main pen; disease spreads at the existing rate
- With it: infected animals are automatically moved (if a vet worker is assigned); spread rate drops to near zero
- Capacity: 10% of main herd size (small); upgradeable

### 8.4 Cattle Crush / Handling System

- Safe restraint facility for vet work, ear tagging, weighing cattle
- Without it: all cattle treatments take 2 days instead of 1 and cost 40% more in vet fees
- With it: treatments resolved same day at standard cost
- Also required to use the weigh crate

### 8.5 Weigh Crate

- Monitors individual animal weights
- Without it: player estimates sale readiness by eye; risk of selling 10–15% underweight
- With it: optimal sale weight flagged per animal in `animales.tsx`; selling at optimal weight gives a 5% price bonus

### 8.6 CCTV / Calving Monitor

- 24-hour camera coverage across all animal buildings
- Detects calving, sick animals, and predator events overnight without a night worker
- Reduces worker slot requirement: one fewer farmhand needed across all animal buildings
- Predator events detected before significant losses (alerts player at start of next day with animals still saveable)

---

## 9. Species-Specific Buildings

### 9.1 Poultry (Chickens, Ducks, Quail)

**Hatchery**
- Incubate eggs on-farm to produce replacement chicks/ducklings
- Incubation period: 21 days (chickens/ducks), 17 days (quail)
- Without it: buy replacement birds from the market
- With it: flock is self-renewing at zero purchase cost; egg allocation split between production and incubation is player-controlled

**Brooder House**
- Heated housing for day-old chicks and ducklings
- Without it: 30% mortality in young birds from cold exposure
- With it: mortality drops to 3%
- Shared across all poultry species; capacity based on building size

**Artificial Lighting System**
- Extension installed in the egg collection building
- Without it: laying drops 60% in winter (chickens and ducks respond to daylight hours)
- With it: year-round consistent production regardless of season
- Ducks are slightly less sensitive than chickens; quail are minimally affected

### 9.2 Sheep

**Sheep Dip / Foot Bath**
- Prevents footrot and sheep scab
- Annual dipping event generated each autumn in `advanceDay`
- Without it: lameness event frequency 3× higher; scab outbreak can spread across the entire flock
- With it: lameness events rare; no scab risk

**Wool Store**
- Stores baled wool clips until market prices are favourable
- Same concept as grain silo but for wool
- Without it: wool must be sold immediately after shearing
- With it: wool held up to 90 days; player can wait for price peaks

### 9.3 Pigs

**Weaner Accommodation**
- Separate, warmer housing for newly weaned piglets (weaned at day 28)
- Without it: 25% post-weaning mortality
- With it: mortality drops to 4%
- Capacity linked to farrowing pen output

**Finishing Unit**
- Dedicated grow-out pens for pigs approaching slaughter weight
- Improves daily weight gain and feed conversion ratio
- Without it: standard growth rate to slaughter weight
- With it: 15% faster time to optimal slaughter weight; 10% better feed conversion

### 9.4 Dairy (Cows, Goats, Buffalo)

**Milk Cooling Tank**
- Stores fresh milk on-farm before transport or sale
- Without it: milk must be sold or dispatched same day or it spoils
- With it: milk holds up to 3 days; player can batch shipments and wait for better prices
- Replaced by the refrigerated pipe equipment slot in the milking parlour (if that slot is filled, separate cooling tank not needed)

**Pasteurisation Unit**
- Required to sell milk direct to city supermarket buyers (a specific buyer type unlocked at city market)
- Without it: raw milk only — local market and own processing building
- With it: pasteurised milk opens the full city market direct-sale channel at standard city price

**Cream Separator**
- Splits fresh milk into cream and skim milk on-farm
- Without it: whole milk only; cream and butter require sending milk to the processing building
- With it: cream produced daily as a separate inventory item; skim milk remains for other uses or sale
- Cream can be sold directly, sent to processing, or used in on-farm curing cellar

### 9.5 Bees

**Apiary Shelter**
- Protects hives from wind and winter conditions
- Without it: winter colony collapse rate 20% per hive per winter
- With it: collapse rate drops to 4%

**Queen Rearing Unit**
- Breed replacement queen bees on-farm
- Without it: dead colonies replaced by buying queens from the market ($120 each)
- With it: queens produced in 16 days at near-zero cost; excess queens sellable

**Pollination Contracts**
- Rent hives to neighbouring NPC farms during blossom season (spring/early summer)
- Generates a flat daily income per hive rented out for the contract duration
- Hives on pollination contract do not produce honey during that period (trade-off)
- Contract offers appear in the existing contracts system in `oficina.tsx`
- NPC farms with orchards or high-value flowering crops generate higher-value contracts

---

## 10. Processing Extensions

### 10.1 Smokehouse

- Cures and smokes meat outputs from the pig and rabbit butcheries
- Input: fresh pork, rabbit meat, duck meat
- Output: smoked product with 1.4× base price and 5-day shelf life (vs same-day for fresh)
- Processing time: 2 days per batch
- Removes same-day sale pressure; allows stockpiling smoked goods for price peaks

### 10.2 Curing Cellar

- Ages cured meats and hard cheeses over weeks
- Input: fresh or smoked meat, hard cheeses from processing building
- Price scales with aging duration:
  - 7 days: 1.3×
  - 14 days: 1.6×
  - 30 days: 2.0×
  - 60 days: 2.8× (premium aged product)
- Capacity limited by cellar size; player manages rotation of aging batches
- Connects to existing `productInventory` with new aged product item IDs

### 10.3 On-Farm Cold Store

- Refrigerated warehouse for all perishable products
- Without it: dairy and fresh meat must be sold or dispatched same day
- With it: perishables hold up to 5 days; player can batch deliveries and wait for better city/export prices
- Capacity upgradeable (S/M/L)
- Connects to the transport system: DispatchModal checks cold store stock when building a refrigerated cargo load

### 10.4 Wool Scouring Unit

- Washes raw wool before baling for sale
- Without it: wool sold at raw greasy price (base)
- With it: clean wool at 1.3× base price
- Processing time: 1 day per clip
- Wastewater from scouring requires slurry treatment system or triggers an environmental fine

---

## 11. Monitoring & Data

### 11.1 Farm Lab

- On-farm testing for milk (SCC, butterfat %), feed quality, soil composition
- Without it: each test requires sending a sample to an external lab ($30–$80 per test, results in 3 days)
- With it: instant on-farm results at no per-test cost; unlocks per-animal production data for use in breeding decisions
- Milk SCC tested daily when lab is present — feeds directly into the hygiene/quality grading system
- Soil tests available on demand; feed analysis runs weekly

### 11.2 Carbon Tracker

- Measures daily farm emissions from: herd (methane), machinery (diesel), buildings (energy use)
- Emission score calculated per day; rolling 30-day average displayed in `oficina.tsx`
- **Low carbon score** (below threshold): qualifies for carbon credit income — daily passive payment deposited into `state.money`
- **High emissions**: risk of a carbon tax random event (triggered when score exceeds threshold for 30+ days)
- Reducing emissions: smaller herd, electric machinery, biogas upgrader, composting all reduce the score
- Carbon credits stackable with organic certification for a premium "sustainable farm" export channel (future feature hook)

---

## 12. Milk Quality Grading

Two quality metrics tracked per dairy species (cows, goats, buffalo):

### 12.1 Somatic Cell Count (SCC)

- Driven by building hygiene score
- High hygiene (80+): low SCC → Grade A milk
- Medium hygiene (60–79): moderate SCC → Grade B milk (−10% price)
- Low hygiene (below 60): high SCC → Grade C milk (−25% price); city and export markets reject Grade C
- Inline milk analyser equipment detects mastitis (the primary SCC driver) early; adds 3 hygiene-equivalent points to SCC calculation

### 12.2 Butterfat Percentage

- Driven by feed quality (TMR wagon gives +0.3% butterfat) and animal genetics. The existing `quality` gene in the animal genetics system is repurposed as the butterfat/production-quality gene for dairy animals — no new gene slot required.
- Higher butterfat (3.8%+): processing premium when milk is sent to the processing building for cheese or butter
- Premium scales: 3.5–3.8% = standard, 3.8–4.2% = +8% processing yield, 4.2%+ = +15% processing yield
- Displayed per herd in `animales.tsx` alongside welfare score

---

## 13. Data Model Changes

### 13.1 New GameState Fields

```typescript
productionBuildings: Record<string, ProductionBuildingState>;
// key = building instance id

animalWelfareScores: Record<string, number>;
// key = animal type id (e.g. 'cow'), value = 0–100

slurryLevel: number;          // current litres in slurry storage tank
slurryCapacity: number;       // max capacity (scales with tank size)
carbonScore: number;          // rolling 30-day emission score
carbonCreditsEarned: number;  // lifetime carbon credits income
```

### 13.2 New Interface

```typescript
export interface ProductionBuildingState {
  buildingId: string;           // matches building type id
  animalTypeId: string;         // which species this serves
  hygiene: number;              // 0–100
  certificationTier: 'basic' | 'certified' | 'organic';
  certDaysAtThreshold: number;  // consecutive days meeting cert requirement
  equipmentSlots: string[];     // installed equipment item ids
  assignedWorkerIds: string[];  // workers assigned to this building
  lastDeepCleanSeason: string;  // season key of last deep clean
  capacity: number;             // current daily throughput (animals/day)
}
```

### 13.3 New Building Type IDs

All new buildings added to `data/buildingTypes.ts`:

**Primary production:**
`bld_milking_parlour_s`, `bld_milking_parlour_m`, `bld_milking_parlour_l`
`bld_goat_milking_stand_s/m/l`, `bld_buffalo_dairy_s/m/l`
`bld_shearing_shed_s/m/l`, `bld_egg_collection_house_s/m/l`
`bld_duck_egg_house_s/m/l`, `bld_quail_egg_station_s/m/l`
`bld_pig_butchery_s/m/l`, `bld_rabbit_butchery_s/m/l`
`bld_honey_extraction_suite_s/m/l`

**Breeding:**
`bld_quarantine_pen`, `bld_calving_farrowing_pen_s/m/l`, `bld_sire_pen`

**Feed & waste:**
`bld_silage_pit_s/m/l`, `bld_feed_mill_s/m/l`, `bld_slurry_tank_s/m/l`
`bld_slurry_treatment`, `bld_composting_bay`, `bld_rendering_incinerator`
`bld_biogas_upgrader`, `bld_pest_control_station`

**Veterinary:**
`bld_vet_room`, `bld_medicine_cabinet`, `bld_isolation_sick_bay_s/m`
`bld_cattle_crush`, `bld_weigh_crate`, `bld_cctv_monitor`

**Species-specific:**
`bld_hatchery_s/m/l`, `bld_brooder_house_s/m/l`, `bld_lighting_system`
`bld_sheep_dip`, `bld_wool_store_s/m/l`, `bld_weaner_accommodation_s/m/l`
`bld_finishing_unit_s/m/l`, `bld_milk_cooling_tank_s/m/l`
`bld_pasteurisation_unit`, `bld_cream_separator`
`bld_apiary_shelter`, `bld_queen_rearing_unit`

**Processing:**
`bld_smokehouse_s/m/l`, `bld_curing_cellar_s/m/l`
`bld_cold_store_s/m/l`, `bld_wool_scouring_unit`

**Monitoring:**
`bld_farm_lab`, `bld_carbon_tracker`

### 13.4 New Attachment Type

`att_slurry_tanker_s`, `att_slurry_tanker_l` — added to `data/attachmentTypes.ts`.
Fill action added to machinery tab. Field job type: `'spread_slurry'` — resolved in `advanceDay` alongside existing tractor jobs.

---

## 14. advanceDay Integration

The following logic runs each `advanceDay` for each species with owned animals:

1. **Contractor fee check:** for each species, calculate `unprocessedCount = max(0, herdSize - effectiveCapacity)`. If `unprocessedCount > 0`, calculate contractor fee and deduct from `state.money`.
2. **Hygiene decay:** apply daily decay per species + overcrowding modifier. Clamp to 0.
3. **SCC / quality grade update:** recalculate milk grade based on current hygiene.
4. **Welfare score update:** recalculate per species from hygiene, feed ratio, density, health.
5. **Slurry accumulation:** add daily slurry output per dairy/pig animal to `slurryLevel`. If level exceeds capacity, trigger inspector event.
6. **Pest feed loss:** if no pest control station, deduct 1–2% from feed inventory.
7. **Carbon score update:** add daily emissions from herd and machinery to rolling 30-day average.
8. **Pollination contract income:** if active contract and hives rented, deposit daily income.
9. **Biogas income:** if biogas upgrader present and sell-to-grid toggle on, deposit daily income.
10. **Inspector event roll:** per-building probability check; resolve pass/fail.
11. **Deep clean prompt:** at season end, generate task card per building.

---

## 15. UI Changes

### animales.tsx
- Welfare score badge per species (colour-coded: green ≥ 80, amber 60–79, red < 60)
- Tapping badge opens a 4-factor breakdown sheet
- Milk grade indicator (Grade A/B/C) per dairy species
- Butterfat % display per dairy species
- Quarantine count badge ("3 in quarantine — 8 days remaining")
- Optimal sale weight flag per animal (if weigh crate owned)
- Building status per species (owned / contractor / unmanned warning)

### gestion.tsx
- New "Buildings" section alongside existing Henil section
- Per-building cards: hygiene bar, certification badge, assigned workers, equipment slots, deep clean task
- Slurry level indicator with "spread now" shortcut (opens tractor job assignment)

### maquinaria.tsx
- Slurry tanker appears in attachments list
- "Fill from slurry tank" action in attachment detail
- `spread_slurry` job type in the tractor jobs workflow

### oficina.tsx
- Carbon score widget in the stats section
- Pollination contract offers in contracts list
- Inspector event history

### tienda.tsx
- New building category sections for all new building types
- Equipment items purchasable per building slot
- Slurry tanker attachment in machinery section

---

## 16. Out of Scope

- Multiplayer / shared buildings between players
- Per-animal individual welfare tracking (score is per species/herd, not per animal)
- Fully animated milking/shearing sequences
- Carbon trading marketplace (carbon tracker collects credits, future spec handles trading)
