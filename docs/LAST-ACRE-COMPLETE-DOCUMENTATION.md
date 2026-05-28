# Last Acre — Complete Functional Documentation

> **Generated:** 2026-05-28
> **Scope:** Game engine, mobile app, marketing websites, Kickstarter campaign, and development infrastructure.
> **Save Key:** `granja-tycoon-save-v9`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Game: Last Acre (Granja Tycoon)](#2-the-game-last-acre-granja-tycoon)
3. [Game Architecture](#3-game-architecture)
4. [Game Systems — Complete Inventory](#4-game-systems--complete-inventory)
5. [Data Models & Content](#5-data-models--content)
6. [Marketing Website (`last-acre-website`)](#6-marketing-website-last-acre-website)
7. [Studio Website (`LAST-ACRE-CORP`)](#7-studio-website-last-acre-corp)
8. [Kickstarter Campaign](#8-kickstarter-campaign)
9. [Development Infrastructure](#9-development-infrastructure)
10. [Appendix: File Inventory](#10-appendix-file-inventory)

---

## 1. Project Overview

**Last Acre** (internal codename: *Granja Tycoon*) is a solo-built mobile farming simulation tycoon game for iOS and Android. It is marketed under the studio brand **Last Game**.

The project consists of four major workstreams in this workspace:

| Workstream | Location | Description |
|------------|----------|-------------|
| **Game** | `granja-tycoon/` | Expo / React Native mobile game (3,490+ files) |
| **Marketing Site** | `last-acre-website/` | Next.js 16 devlog / changelog / feedback site |
| **Studio Site** | `LAST-ACRE-CORP/` | Next.js 16 studio + Kickstarter email capture site |
| **Campaign Docs** | `LAST-ACRE-CORP/docs/superpowers/` | Kickstarter campaign plans & design specs |

---

## 2. The Game: Last Acre (Granja Tycoon)

### 2.1 Game Concept

A deep farming simulation grounded in real agriculture, animal genetics, and market forces. The player starts with a small plot of land, limited capital, and builds an agricultural empire through planting, breeding, trading, and business strategy.

**Key differentiator:** The "neighbours mechanic" — AI neighbours compete for land in real-time auctions, creating dynamic competitive pressure unseen in other farming sims.

**Tone:** Serious, systems-driven, respects player intelligence. Not a casual clicker.

### 2.2 Platforms
- iOS
- Android
- Web (via Expo)

### 2.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo ~54.0.33 + React Native 0.81.5 |
| Router | Expo Router ~6.0.23 (file-based) |
| State | Zustand 5.0.12 + `persist` middleware (AsyncStorage) |
| Styling | React Native StyleSheet + seasonal theming |
| Animation | React Native Reanimated ~4.1.1 |
| Gestures | React Native Gesture Handler |
| Icons | @expo/vector-icons + custom SVG |
| Haptics | expo-haptics |
| Images | expo-image |
| Sharing | expo-sharing |
| Documents | expo-document-picker |
| Fonts | expo-font |
| Status Bar | expo-status-bar |

### 2.4 Navigation Structure

The game uses a **4-tab bottom navigation** with hidden sub-tab screens:

**Main Tabs:**
| Tab | Route | Badge Logic |
|-----|-------|-------------|
| 🌿 Farm | `farm` | Count of crops ready to harvest |
| ⚙️ Ops | `ops` | — |
| 📈 Market | `market` | — |
| 🏦 Office | `office` | Urgent loans + contracts due within 7 days |

**Hidden Sub-Tabs (routed within hub screens):**
- `_agua` (Water)
- `_animales` (Animals)
- `_calendario` (Calendar)
- `_clima` (Climate)
- `_maquinaria` (Machinery)
- `_procesado` (Processing)
- `_subasta` (Auction)
- `_tienda` (Shop)
- `_tierras` (Lands)
- `_trabajadores` (Workers)

**Modal Screens:**
- `modal.tsx` — Generic modal wrapper
- `world-map.tsx` — Full-screen interactive world map (slide-from-bottom)

**Persistent Overlays (rendered in TabLayout):**
- `GameHUD` — Top status bar (day, season, money)
- `FirstMission` — Onboarding mission tracker
- `EventBanner` — Active event notifications
- `MilestonePopup` — Achievement unlocks
- `DaySummaryModal` — End-of-day recap
- `TutorialModal` — Guided tutorials
- `YearEndModal` — Annual summary
- `BankruptModal` — Game-over state
- `NewspaperModal` — Major historical events
- `HistoricalToast` — Minor historical events

### 2.5 Core Game Loop

1. **Morning** — Review overnight events, weather forecast, market prices
2. **Farm Work** — Plant, tend, harvest crops; manage animals; assign workers
3. **Operations** — Process raw goods, manage machinery, generate electricity, handle water
4. **Market** — Sell crops/products, check prices, fulfill contracts, trade futures
5. **Office** — Manage finances (loans, savings), insurance, land leases, certifications, subsidies
6. **End Day** — System ticks: crops grow, animals produce, prices fluctuate, loans accrue interest, weather changes, random events fire

---

## 3. Game Architecture

### 3.1 State Management (`store/useGameStore.ts`)

A single Zustand store with `persist` middleware. The store is **10,068 lines** and contains the entire game state.

**Key state slices:**

| Slice | Description |
|-------|-------------|
| `day` | Current game day (integer) |
| `parcels` | Array of `LandParcel` — all farmable land |
| `animals` | Array of `OwnedAnimal` — all livestock |
| `inventory` | Record of crop/animal product quantities |
| `processedInventory` | Array of `ProcessingBatch` — finished goods |
| `money` | Current cash balance |
| `prices` | Array of `MarketPrice` — daily prices per crop |
| `newsEvents` | Active market-moving events |
| `sellPressure` | Active sell-pressure modifiers |
| `loans` | Active and completed loans |
| `savings` | Savings account balance |
| `timeDeposits` | Fixed-term deposits |
| `loanHistory` | Credit history for scoring |
| `creditScore` | Computed 300–850 score |
| `contracts` | Active delivery contracts |
| `recurringContracts` | Standing delivery agreements |
| `buyers` | Relationship-tracked buyers |
| `workers` | Hired staff |
| `workerRequests` | Pending worker demands |
| `jobPostings` | Open recruitment ads |
| `machines` | Owned machinery |
| `attachments` | Owned machine attachments |
| `trailers` | Owned transport trailers |
| `buildings` | Owned building IDs |
| `processingBuildings` | Production facility states |
| `seedInventory` | Owned seed entries with genes |
| `hybridJobs` | Active breeding lab jobs |
| `futuresPositions` | Commodity futures contracts |
| `marketOrders` | Limit sell orders |
| `showEntries` / `showResults` | Animal show entries & results |
| `timeline` | Historical event timeline state |
| `npcFarms` | Runtime state of AI competitors |
| `mapFields` | World map parcel data |
| `wells` / `drillSpots` | Water infrastructure |
| `electricity` | Power generation & grid state |
| `hedgerows` | Environmental buffer strips |
| `leases` | Active land lease agreements |
| `aesEnrollments` | Agri-Environment Scheme enrollments |
| `subsidyPayments` | Received subsidy history |
| `organicStatus` / `organicTransitionStartDay` | Organic certification progress |
| `contaminationAppeals` | Organic decertification appeals |
| `csaSubscribers` / `csaCommitments` | Community Supported Agriculture |
| `coopMemberships` | Cooperative memberships |
| `coopStates` | Cooperative runtime states |
| `transportJobs` / `returnOrders` | Active delivery convoys |
| `gameEvents` | Random event instances |
| `seasonGoals` | Active season challenges |
| `milestonesClaimed` | Unlocked milestone IDs |
| `tutorialStep` / `tutorialComplete` | Onboarding progress |
| `firstMissionComplete` | Tutorial mission flag |
| `musicEnabled` / `soundEnabled` / `hapticsEnabled` | Settings |
| `settings` | Difficulty, auto-save, etc. |
| `fairEvent` | Active shop discount event |
| `lastAdDay` | Ad cooldown tracking |
| `disasters` | Active natural disasters |

### 3.2 Engine Architecture (`engine/`)

37 standalone engine modules handle game logic:

| Module | Purpose |
|--------|---------|
| `animals.ts` | Animal genetics, breeding, production, welfare |
| `banking.ts` | Loans, savings, time deposits, credit scoring |
| `calendarUtils.ts` | Date ↔ game-day conversions |
| `climate.ts` | Weather generation, seasons, forecasts |
| `competitors.ts` | AI farm behaviour, auctions, market impact |
| `composting.ts` | Manure → compost → soil NPK |
| `contracts.ts` | Contract generation, delivery, buyer relationships |
| `cooperatives.ts` | Co-op economics, dividends, AGMs |
| `cooperativeData.ts` | Co-op static data (crops, animals, prices) |
| `cooperativeTypes.ts` | Co-op type definitions |
| `crops.ts` | Planting, growth, harvest, soil modifiers |
| `csa.ts` | Community Supported Agriculture box logic |
| `electricity.ts` | Solar, wind, biogas, biomass, grid demand |
| `events.ts` | Random event roll table, repair costs |
| `hedgerows.ts` | Environmental strips, pest control, pollinators |
| `leases.ts` | Land lease generation, cash rent calculation |
| `machinery.ts` | Machine assignment, contractor ops, transport |
| `market.ts` | Price fluctuations, sell pressure, revenue calc |
| `nightOps.ts` | Night-shift worker fatigue, productivity |
| `nutrition.ts` | Animal feed ration balancing |
| `organicCert.ts` | Organic transition, contamination, appeals |
| `pests.ts` | Pest outbreak, spread, yield damage |
| `pollination.ts` | Bee hive health, pollination bonuses |
| `precision.ts` | Soil analysis, yield history, precision ag |
| `priceEngine.ts` | Realistic commodity price simulation |
| `processing.ts` | Raw → processed goods, quality tiers |
| `productionBuildings.ts` | Dairy, shearing, egg, butchery, honey buildings |
| `sellingChannels.ts` | Local market, city, export, direct sales |
| `soilDegradation.ts` | Erosion, salinization, compaction, recovery |
| `sounds.ts` | Seasonal music playback |
| `storageQuality.ts` | Batch-based inventory with moisture & quality decay |
| `subsidies.ts` | AES schemes, annual subsidy calculation |
| `tillage.ts` | Conventional / reduced / no-till systems |
| `timeline.ts` | Historical event system (major/minor) |
| `water.ts` | Wells, aquifers, irrigation, drainage |
| `workers.ts` | Hiring, payroll, skills, injuries, poaching |

### 3.3 Data Layer (`data/`)

25+ static data files define game content:

| File | Content |
|------|---------|
| `cropTypes.ts` | 24 crops + 4 cover crops with tiers (D→S), growth data, soil drains |
| `animalTypes.ts` | 13 animal species with nutrition profiles |
| `workerTypes.ts` | 17 roles, skill trees, contract types, certifications |
| `machineTypes.ts` | Tractors, combines, attachments, trailers |
| `buildingTypes.ts` | 885 lines — silos, enclosures, production buildings, labs |
| `processingTypes.ts` | Recipes: flour, polenta, barley malt, oil, etc. |
| `insuranceTypes.ts` | Crop, livestock, machinery, liability plans |
| `electricityTypes.ts` | Solar panels, wind turbines, biogas, biomass, batteries |
| `prices.ts` / `historicalPrices.ts` | Baseline commodity prices |
| `historicalEvents.ts` | Real-world events that affect markets |
| `randomEvents.ts` | In-game random event templates |
| `npcFarms.ts` / `npcFarmGroups.ts` | AI competitor definitions |
| `mapFields.ts` | World map initial field layout |
| `marketRegions.ts` | Local / city / export market definitions |
| `milestones.ts` | Achievement criteria & rewards |
| `cropCalendar.ts` | Optimal planting windows |
| `newsEventTemplates.ts` | Market news headline generator |

---

## 4. Game Systems — Complete Inventory

### 4.1 Farming & Crops

**Crop Tiers:** D → C → B → A → S (increasing value/complexity)

**24 Harvestable Crops:**
- **Tier D:** Grass, Alfalfa, Barley, Oats
- **Tier C:** Wheat, Corn, Sorghum, Rice
- **Tier B:** Potatoes, Sugar Beet, Soybean, Sugar Cane, Grapes, Tomatoes, Strawberries
- **Tier A:** Sunflower, Rapeseed, Canola, Cotton, Olives, Almonds
- **Tier S:** Saffron, Vanilla, Lavender, Ginseng

**4 Cover Crops (no revenue, soil benefits):** Winter Rye, Red Clover, White Mustard, Buckwheat

**Per-Crop Attributes:**
- Growth days, base yield (kg or L per ha), base price ($/unit)
- Seed cost ($/ha), water need (1–5), fertilizer bonus
- Planting seasons, peak season (harvest glut = low prices)
- N/P/K drain per harvest, frost kill temp, heat stress temp
- Drought tolerance (0–1), pollination bonus (0–30%)

**Soil System (8 dimensions):**
| Stat | Range | Optimal | Effect |
|------|-------|---------|--------|
| Nitrogen | 0–100 | 60–80 | Yield 0.6–1.1× |
| Organic Matter | 0–10 | 4–7 | Yield 0.75–1.05× |
| Compaction | 0–100 | 0–25 | Yield −30% at max |
| pH | 4.0–8.5 | 6.0–7.0 | Yield 0.8–1.0× |
| Microbial Life | 0–100 | 60–100 | Yield 0.85–1.05× |
| Phosphorus | 0–100 | 50–80 | Yield 0.6–1.08× |
| Potassium | 0–100 | 50–80 | Yield 0.65–1.06× |
| Drainage | 0–100 | 60–100 | Yield 0.6–1.0× |

**Soil Types & Affinities:**
- Loamy (neutral), Sandy (potatoes +20%), Clay (wheat +15%, rice +20%), Chalky (grapes +20%, lavender +20%)

**Tillage Systems:**
- Conventional → Reduced → No-till (transition penalties/bonuses, weed management trade-offs)

**Soil Degradation:**
- Wet tillage compaction, salinization, erosion, natural recovery
- Bare-day counter (no crop = erosion risk)

**Pest & Disease:**
- 7 pest types with config (aphids, slugs, etc.)
- Outbreak chance based on crop, season, weather
- Spread to neighbouring parcels
- Yield modifier: 0.3–1.0 based on severity
- Pesticide spray with cooldown

**Weed System:**
- Weed detection delay, manual removal or herbicide
- Reduces yield by 25% if untreated

**Irrigation:**
- Parcel-level irrigation flag
- Water tower building required
- Electricity cost for pump operation

**Greenhouses:**
- Protect from frost, extend seasons
- Higher upfront cost, maintenance

**Seed Genetics (v9 feature):**
- 4 gene dimensions: yield, drought, growth, quality
- Each gene 0.5–1.5 multiplier
- Generational inheritance, hybrid lab jobs
- Seed inventory tracks quantity per entry

**Harvest Calculation:**
```
harvest = hectares × baseYield × soilMod × fertilizerMod × weedMod × climateMod × machineBonus × frostMod × droughtMod × degradationMod × tillageMod × organicMod × pollinationMod
```

**Storage Quality System:**
- Inventory stored as `StoredBatch` with moisture % and quality score
- Moisture determined by weather at harvest
- Quality decays over time (dry = better preservation)
- Weighted quality multiplier when selling
- Batches consumed FIFO-ish based on quality strategy

### 4.2 Animals & Genetics

**13 Animal Species:**

| Animal | Product | Maturity | Max Sell | Enclosure |
|--------|---------|----------|----------|-----------|
| Chicken | Eggs (0.85/day) | 20d | $60 | Hen house |
| Cow | Milk (28L/day) | 90d | $3,500 | Stable |
| Sheep | Wool (0.07/day) | 60d | $550 | Pen |
| Pig | Meat (breeding) | 45d | $450 | Pigsty |
| Rabbit | Meat (breeding) | 15d | $90 | Hutch |
| Goat | Milk (3.5L/day) | 45d | $480 | Pen |
| Horse | — (breeding) | 180d | $12,000 | Stable |
| Duck | Eggs (0.6/day) | 25d | $55 | Hen house |
| Bee | Honey (0.08/day) | 7d | $280 | Hive |
| Alpaca | Wool (0.09/day) | 90d | $2,200 | Pen |
| Turkey | Meat (breeding) | 60d | $200 | Hen house |
| Quail | Eggs (1.0/day) | 12d | $28 | Hen house |
| Buffalo | Milk (12L/day) | 180d | $8,500 | Stable |

**Animal Genetics (4 gene emojis: 🥚💪⚡💰):**
- Displayed as letter grades F → S
- Inherited from both parents to offspring
- Affects production rate, lifespan, resale value

**Nutrition System:**
- Min/optimal protein %, energy (MJ/day), roughage %
- Mineral requirements
- Feed types: grain, hay, or self-sufficient (bees)

**Production Buildings:**
- Milking parlour, goat stand, buffalo dairy
- Shearing shed
- Egg collection house, duck egg house, quail egg station
- Pig butchery, rabbit butchery
- Honey extraction suite
- Each building has 3 equipment slots with upgradeable machinery

**Production Building Mechanics:**
- Effective capacity, manned status, contractor fees
- Hygiene decay, welfare score, milk grade (SCC)
- Inspections with fines, certification progress
- Season key tracking

**Animal Shows:**
- Enter animals seasonally for prizes
- NPC competitors with randomized scores
- Placement-based prize money

### 4.3 Weather & Climate

**Seasons:** Spring → Summer → Autumn → Winter (90 days each)

**Weather Generation:**
- Daily temperature, precipitation, sunshine hours
- Forecast system (next 7 days)
- Seasonal music changes

**Weather Impacts:**
- Frost damage (crop kill below threshold)
- Heat stress (reduced yield above threshold)
- Drought stress (based on water need vs rainfall)
- Soil moisture tracking

**Climate Events:**
- Historical events integrated into timeline (e.g., real droughts, wars affecting commodity prices)
- Random disasters with damage/repair mechanics

### 4.4 Market & Economy

**Price Engine:**
- Base prices from `data/prices.ts`
- Daily fluctuation: ±2% random walk
- News events: up to ±30% modifiers
- Historical price baselines for realism
- NPC farm production affects supply/demand
- Sell pressure: large sales depress prices temporarily
  - >500 units = −6%
  - >1,000 units = −12%
  - >2,000 units = −20%
  - Duration: 3–7 days

**Tax:** 15% on all sales

**Selling Channels:**
- Local market (immediate, lower price)
- City market (trucking required, medium price)
- Export (trailer + long haul, highest price)
- Direct contracts (locked price, delivery obligation)
- CSA (Community Supported Agriculture — subscription boxes)

**Contracts:**
- One-time delivery contracts with deadlines
- Recurring contracts with standing buyers
- Buyer tier progression (relationship building)
- Penalties for missed deliveries
- Disaster grace periods

**Futures Trading:**
- Lock in crop prices for future delivery
- Positions tracked with quantity, lock price, delivery day
- Settlement on delivery day

**Market Orders:**
- Limit orders: set target price, auto-execute when market reaches it
- Status: active / executed / expired / cancelled

**Commodity Exchange:**
- Regional market differences
- Price alerts UI
- Profit preview & help buttons

**Buyers:**
- 10+ buyer characters with tier configs
- Relationship improves with successful deliveries
- Price bonuses at higher tiers

### 4.5 Banking & Finance

**Loan System:**

| Tier | Max Amount | Base Rate | Min Monthly Income |
|------|-----------|-----------|-------------------|
| Micro | $5,000 | 18% | $0 |
| Small | $25,000 | 14% | $1,000 |
| Medium | $100,000 | 10% | $5,000 |
| Large | $400,000 | 5.5% | $20,000 |

- Simple interest: `principal × (1 + rate × termDays/365)`
- Rate adjusted by credit score, loan amount vs income
- One renegotiation (extension) allowed per loan
- Default penalties

**Credit Score (300–850):**
- Payment history: +40 on-time, −80 late
- Debt-to-income ratio bonuses/penalties
- Rating labels: Very Poor → Poor → Fair → Good → Excellent

**Savings Account:**
- 4.5% APR (S&P 500 historical average)
- Daily interest accrual

**Time Deposits:**
- Fixed term, fixed rate
- Early withdrawal penalties

**Sale Records:**
- Categorized history: crops, animals, processed, contracts
- Used for income calculations (30d, 90d)

### 4.6 Workers & HR

**17 Worker Roles across 6 Departments:**

| Department | Roles |
|------------|-------|
| Fields | Field hand, Agronomist, Irrigation tech |
| Animals | Livestock hand, Veterinarian, AI inseminator, Farrier |
| Machinery | Tractor operator, Combine operator, Farm mechanic |
| Processing | Processing tech, Quality controller |
| Transport | Transport driver |
| Office | Farm admin, Security guard, Dept foreman |
| Standalone | Hydrogeologist, Crop consultant |

**Worker Attributes:**
- Name, age, nationality, experience years
- Tier 1–4, skill tree with unlockable nodes
- Certifications (study progress, exam fees, pass/fail)
- Contract type: permanent / seasonal / casual
- Wage per day, hire day, contract end day
- Satisfaction score with history log
- Work ethic, team player, stress threshold
- Chemistry system (good/bad relationships with other workers)
- Injury status & recovery
- Night shift capability, fatigue, consecutive night shifts
- Leave requests, study requests, pay rise demands

**Worker Mechanics:**
- Applicants generated seasonally (count based on farm reputation)
- Payroll calculated weekly
- Injury roll based on job danger
- Poaching roll (competitors steal good workers)
- Performance reviews
- Productivity modifiers: fatigue, night shift, machinery

### 4.7 Machinery & Transport

**Machine Types:**
- Tractors (various HP classes)
- Combines
- Attachments (plows, seeders, sprayers, trailers)
- Each machine has maintenance cost per day

**Contractor System:**
- Hire contractors for jobs you lack equipment for
- Job day calculation based on machinery match
- Transport capacity (kg) per truck/trailer combo

**Delivery System:**
- Trucks + trailers + driver required
- Cargo categorised: crop, animal product, animal
- Market destination: local / city / export
- Return orders for purchased inputs

**Fuel System:**
- Daily consumption tracked
- Fuel tank buildings (small +500L, large +2000L)
- Tillage fuel multipliers

### 4.8 Processing

**Processing Recipes:**
- Flour (wheat → flour)
- Polenta (corn → polenta)
- Barley malt (barley → malt)
- Oil (sunflower/rapeseed/canola/olives → oil)
- And more

**Processing Buildings:**
- Required to convert raw → processed
- Tier upgrades unlock higher throughput
- Quality tiers affect sell multiplier
- Batch tracking with completion days

**Processed Products:**
- Higher value than raw commodities
- Quality decay in storage
- Premium pricing at higher tiers

### 4.9 Buildings & Infrastructure

**Building Categories:**
- Animal enclosures (hen houses, stables, pens, etc.)
- Silos (storage capacity)
- Industrial (workshop, fuel tanks)
- Lab (seed lab, hybrid lab)
- Production (milking parlours, shearing sheds, etc.)
- Processing (mills, oil presses)
- Upgrades (taller = −25% machine maintenance)

**Key Buildings:**
- Water tower (enables irrigation)
- Biodigestor (manure → biogas)
- Grain dryer (preserve quality)
- Workshop (repair machines faster)
- Office (unlock advanced features)
- Seed lab (gene research)
- Granary (bulk storage)

### 4.10 Electricity System

**Generation Sources:**
- Solar panels (degradation ~0.05%/day)
- Wind turbines (degradation ~0.03%/day)
- Biogas generator (manure-powered)
- Biomass heater (seasonal fuel)
- Diesel generator (backup)
- Grid connection (tiered: rural → industrial → urban)

**Storage:**
- Battery banks (kWh per bank, service costs)

**Demand:**
- Irrigation pumps
- Processing buildings
- Production buildings
- Lighting, heating

**Events:**
- Grid outages (random duration)
- Lightning damage to solar
- Surge protector upgrade available

**Grants:**
- Solar grant (% of cost covered)
- Wind grant (% of cost covered)

### 4.11 Water System

**Sources:**
- Wells (drill depth, flow rate based on aquifer)
- Rainfall capture
- Irrigation districts

**Aquifer Management:**
- Depth-based flow rates
- Over-extraction lowers aquifer level
- Seasonal recharge

**Survey System:**
- Generate survey spots to find best drill locations
- Pipe cost calculated by distance

**Drainage:**
- Poor drainage → waterlogging → yield penalty
- Drainage infrastructure upgradeable

### 4.12 Auction House

**Land Auctions:**
- AI neighbours bid against player in real-time
- Parcel quality affects starting bid
- Auction history trimmed to 10 resolved lots (memory optimisation)

**Animal Auctions:**
- Sell/buy livestock
- Gene quality affects price

### 4.13 Cooperatives

**Co-op Types:**
- Crop co-ops (wheat, corn, etc.)
- Animal co-ops (dairy, wool, etc.)

**Mechanics:**
- Share price fluctuates based on pool performance
- Dividend calculation
- AGM proposals & voting
- Seed discounts for members
- Health delta tracking
- Slot booking for delivery
- Depot fuel costs
- Member suspension rules

### 4.14 Subsidies & Certification

**Agri-Environment Schemes (AES):**
- Multiple enrollment schemes
- Annual subsidy calculation
- Violation checking (e.g., hedgerow removal)
- Payment penalty for non-compliance

**Organic Certification:**
- 3-year transition period
- Yield modifier during transition
- Price premium once certified
- Contamination risk from neighbouring conventional farms
- Decertification appeals process
- Reapplication cooldown after decertification

**Other Certifications:**
- Quality certifications for buildings
- Animal welfare standards

### 4.15 Hedgerows & Environment

**Hedgerow Types:**
- Mixed native, pollinator strip, buffer strip
- Costs: planting + annual maintenance

**Benefits:**
- Pest control for adjacent parcels
- Wind protection
- Pollinator habitat (affects bee hive health)
- EFA (Ecological Focus Area) count for subsidies
- Biodiversity bonus

### 4.16 Historical Events & Timeline

**Major Events:**
- Real-world historical events (wars, economic crises, climate events)
- Displayed as newspaper modal
- Major market impact (±30%)

**Minor Events:**
- Toast notification
- Smaller market impact

**Event Tiers:**
- `major` — newspaper modal
- `minor` — historical toast

### 4.17 Random Events

**Event Types:**
- Machine breakdowns (repair cost, repair days)
- Animal disease outbreaks
- Theft / vandalism
- Unexpected weather
- Market shocks
- Worker incidents

**Event Roll Table:**
- Probability weighted by farm state
- Some events mitigated by insurance

### 4.18 World Map

**Features:**
- Interactive canvas with gesture support
- Parcel ownership visualisation
- Field panel with details
- Map legend
- Mini-map overview
- Pattern-based rendering

### 4.19 Tutorial & Onboarding

**First Mission:**
- Guided initial goals
- Step-by-step UI highlights

**Tutorial Modal:**
- Contextual help system
- Settings for music, sound, haptics

### 4.20 Save System

**Export / Import:**
- JSON save export
- Document picker import
- Share via expo-sharing

**Auto-save:**
- End of day automatic persistence
- Settings toggle

---

## 5. Data Models & Content

### 5.1 Crop Type Model
```typescript
interface CropType {
  id: string;
  name: string;
  tier: 'D' | 'C' | 'B' | 'A' | 'S';
  growthDays: number;
  basePrice: number;
  seedCost: number;
  waterNeed: number;
  fertilizerBonus: number;
  unit: 'kg' | 'L';
  baseYield: number;
  seasons: PlantingSeason[];
  peakSeason: PlantingSeason;
  fertilityDrain: number;
  phosphorusDrain: number;
  potassiumDrain: number;
  frostKillTemp: number;
  heatStressTemp: number;
  droughtTolerance: number;
  coverCrop?: boolean;
  pollinationBonus: number;
}
```

### 5.2 Land Parcel Model
```typescript
interface LandParcel {
  id: string;
  name: string;
  soil: SoilStats;
  cropHistory: string[];
  hectares: number;
  pricePerHa: number;
  owned: boolean;
  hasWeeds: boolean;
  plantedCrop: PlantedCrop | null;
  greenhouse: boolean;
  irrigated: boolean;
  tilled: boolean;
  soilType?: SoilType;
  diseased?: boolean;
  pestState?: PestState;
  linkedColmenaId?: string;
  soilAnalysis?: SoilAnalysis;
  precisionApplied: boolean;
  yieldHistory: YieldEntry[];
  soilWetUntilDay?: number;
  bareDayCtr?: number;
  recentIrrigationDays?: number[];
  soilSalinity?: number;
  topsoilErosion?: number;
  tillageSystem?: 'conventional' | 'reduced' | 'notill';
  organicStatus?: OrganicStatus;
  compostNPKReleaseRemaining?: NPKRelease;
}
```

### 5.3 Animal Model
```typescript
interface OwnedAnimal {
  id: string;
  typeId: string;
  name?: string;
  birthDay: number;
  genes: AnimalGenes;
  enclosureId?: string;
  weight: number;
  health: number;
  happiness: number;
  productivityMod: number;
  fedToday: boolean;
  lastProductionDay?: number;
  pregnant?: boolean;
  dueDay?: number;
  showEntered?: boolean;
}
```

### 5.4 Worker Model
```typescript
interface Worker {
  id: string;
  name: string;
  age: number;
  nationality: string;
  role: WorkerRole;
  department: WorkerDepartment | null;
  experienceYears: number;
  tier: 1 | 2 | 3 | 4;
  unlockedNodeIds: string[];
  certifications: WorkerCertification[];
  contractType: ContractType;
  wagePerDay: number;
  hireDay: number;
  satisfaction: number;
  isInjured: boolean;
  workEthic: number;
  teamPlayer: number;
  goodChemistryWith: string[];
  badChemistryWith: string[];
  nightShift: boolean;
  fatigueLevel?: number;
}
```

### 5.5 Milestones

| Milestone | Reward |
|-----------|--------|
| First Harvest | Cash bonus |
| First Animal Born | Cash bonus |
| Reach $10k | Unlock new crop |
| Reach $100k | Unlock machinery |
| Organic Certified | Premium market access |
| Export First Shipment | Reputation boost |
| Win Animal Show | Trophy + cash |
| Fully Automated Farm | End-game achievement |

---

## 6. Marketing Website (`last-acre-website`)

### 6.1 Overview
A simpler, warmer-themed marketing site for Last Acre. Built with Next.js 16.2.1, React 19, Tailwind CSS v4.

### 6.2 Tech Stack
- **Framework:** Next.js 16.2.1 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4 + `@tailwindcss/typography`
- **Content:** Markdown files parsed with `gray-matter` + `remark` + `remark-html`
- **Testing:** Jest 30 + ts-jest

### 6.3 Design System (Farm Theme)
| Token | Value |
|-------|-------|
| `--color-farm-brown` | `#3d2b1f` |
| `--color-farm-brown-light` | `#5a3e28` |
| `--color-farm-green` | `#7c9a5e` |
| `--color-farm-tan` | `#b5956a` |
| `--color-farm-cream` | `#f5ede0` |
| `--color-farm-cream-dark` | `#eee5d3` |
| `--color-farm-border` | `#d4c5ae` |
| `--color-farm-text` | `#e8d5b0` |
| **Serif Font:** | Lora (Google Fonts) |
| **Sans Font:** | Inter (Google Fonts) |

### 6.4 Pages & Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/devlog` | `app/devlog/page.tsx` | Devlog post list |
| `/devlog/[slug]` | `app/devlog/[slug]/page.tsx` | Individual devlog post (SSG) |
| `/changelog` | `app/changelog/page.tsx` | Changelog list |
| `/changelog/[version]` | `app/changelog/[version]/page.tsx` | Version details (SSG) |
| `/feedback` | `app/feedback/page.tsx` | Feedback form |

### 6.5 Components

**`Hero.tsx`**
- Full-width brown background
- Title "Last Acre" in serif
- Tagline: "A solo-built farming tycoon. Every crop, every animal, every decision — yours."
- CTA button → `#screenshots`

**`Gallery.tsx`**
- 3-column screenshot grid
- Screenshots: fields, animals, economy
- Helper text pointing to `public/screenshots/`

**`Mission.tsx`**
- "Why I'm Building This" section
- Developer mission statement placeholder

**`Roadmap.tsx`**
- 3-column status cards
- Status enum: `done` | `in-progress` | `planned`
- v0.1: Core Farming Loop (done)
- v0.2: Animals & Genetics (in-progress)
- v0.3: Processing & Industry (planned)

**`SocialLinks.tsx`**
- Twitter/X, Discord, GitHub links (placeholder URLs)

**`Nav.tsx`** (Client Component)
- Fixed top nav with `usePathname`
- Links: Devlog, Changelog, Feedback, Roadmap (anchor)
- Active state highlighting

**`PostCard.tsx`**
- Left-border green card
- Title, date, excerpt
- Links to detail page

**`FeedbackForm.tsx`** (Client Component)
- Feature checkboxes (6 options)
  - Multiplayer / co-op farming
  - More crop types & varieties
  - Mobile app release
  - Story / campaign mode
  - Better graphics & animations
  - Mod support
- Free-text textarea
- Submit via **Formspree** (`xeepkrpy`)
- States: idle → submitting → success / error

### 6.6 Content Management

**Devlog posts:** `content/devlog/*.md`
- Frontmatter: `title`, `date`, `excerpt`
- Body rendered as HTML via remark

**Changelog entries:** `content/changelog/*.md`
- Same frontmatter schema
- Version slug derived from filename (e.g., `v0-2-1`)

**Current Content:**
- Devlog: "Week One — Getting Started" (2026-03-31)
- Changelog: "Animal Genetics & Memory Fix" (2026-03-31)

### 6.7 API / External Services
- **Formspree:** Feedback form submission (no backend API routes)

### 6.8 Notable Config
- `next.config.ts` transpiles 50+ ESM packages from remark ecosystem
- Static-export compatible (`generateStaticParams` on all dynamic routes)
- No `next/image` — uses raw `<img>` tags

---

## 7. Studio Website (`LAST-ACRE-CORP`)

### 7.1 Overview
A polished, dark cinematic studio website for "Last Game" with Kickstarter email capture. Built with Next.js 16.2.4, React 19, Tailwind CSS v4, Framer Motion.

### 7.2 Tech Stack
- **Framework:** Next.js 16.2.4 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **Animation:** Framer Motion 12.38.0
- **Icons:** Lucide React 1.14.0
- **Email:** Resend 6.12.2
- **Rate Limiting:** Upstash Ratelimit 2.0.8 + Upstash Redis 1.38.0
- **Testing:** Jest 30 + React Testing Library + jsdom

### 7.3 Design System (Dark Cinematic)
| Token | Value |
|-------|-------|
| `--color-bg` | `#0A0C0F` |
| `--color-surface` | `#151A20` |
| `--color-accent` | `#E8A935` (amber gold) |
| `--color-earth` | `#7C4D2A` |
| `--color-green` | `#3D7A4F` |
| `--color-cream` | `#F5EDD8` |
| `--color-muted` | `#9A8F7E` |
| **Serif Font:** | Playfair Display (700, 900) |
| **Sans Font:** | Inter (400, 500, 600) |

### 7.4 Pages & Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Studio homepage |
| `/games/last-acre` | `app/games/last-acre/page.tsx` | Dedicated game page |
| `/api/subscribe` | `app/api/subscribe/route.ts` | Email signup API |

### 7.5 Sections (Homepage)

**`Hero.tsx`**
- Full viewport, dark with earth-tone gradient + SVG grain texture overlay
- Framer Motion staggered entrance
- "Last Game presents" eyebrow
- "LAST ACRE" massive serif title (8rem / 11rem)
- Tagline: "Your land. Your legacy."
- "In Development" pulse badge
- Scroll indicator (animated bounce)

**`Features.tsx`**
- 3-card grid with scroll-triggered fade-in
- Icons from Lucide (Building2, Dna, TrendingUp)
- Build & Expand | Breed & Trade | Grow & Sell

**`Screenshots.tsx`**
- Horizontal scroll carousel (snap-x)
- 7 mobile screenshots with realistic alt text:
  1. Welcome — $3,500 start, 2 plots
  2. Power System — solar, wind, biogas
  3. Live Market — real-time prices, futures
  4. Processing — flour, polenta, malt
  5. Land Auction — bid against AI neighbours
  6. Farm Banking — credit score & loans
  7. Weather & Crop Calendar

**`Trailer.tsx`**
- YouTube embed placeholder
- Play button overlay with gradient
- TODO: `YOUR_YOUTUBE_VIDEO_ID`

**`DownloadCta.tsx`** (Email Capture)
- Amber background section (`#kickstarter` anchor)
- "Coming to Kickstarter." headline
- Email input + "Notify Me" button
- POSTs to `/api/subscribe`
- States: idle → loading → success / error

**`StudioAbout.tsx`**
- Two-column layout with scroll-triggered slide-in
- "We build games about things that matter."
- Solo dev story

**`GamesGrid.tsx`**
- Portfolio grid (1 game + 1 coming-soon slot)
- Last Acre card with emoji cover art, genre tags, platform pills
- Links to `/games/last-acre`

**`Roadmap.tsx`**
- Vertical timeline with alternating left/right cards
- Phase 1: Last Acre Mobile (iOS/Android) — In Development
- Phase 2: Last Acre 3D (PC/Console) — Planned
- Phase 3: More to come — Future

### 7.6 Game Page (`/games/last-acre`)
- Dedicated SEO metadata
- "Last Game presents" eyebrow
- Large "LAST ACRE" title
- Description: real agriculture, genetics, market forces
- "In Development" pulse badge
- Platforms section: "Coming to iOS & Android"

### 7.7 API Route (`/api/subscribe`)

**Method:** `POST`
**Body:** `{ email: string }`

**Flow:**
1. Rate limit check (Upstash Redis sliding window: 5 requests / 60s per IP)
2. Email validation (regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
3. Environment check (`RESEND_API_KEY`, `RESEND_AUDIENCE_ID`)
4. Resend `contacts.create()` call
5. Returns `{ success: true }` or error JSON

**Error Responses:**
| Status | Error |
|--------|-------|
| 400 | Invalid email |
| 429 | Too many requests |
| 500 | Server misconfigured / Resend error |

### 7.8 UI Components

**`Button.tsx`**
- Variants: `primary` (amber bg), `ghost` (border)
- Sizes: `sm`, `md`, `lg`
- Renders as `<Link>` if `href` provided, else `<button>`
- Active scale transform

**`SectionHeading.tsx`**
- Eyebrow (uppercase tracking) + Title
- Centered by default

**`AppStoreBadge.tsx`**
- Apple / Google variants
- Custom SVG icons
- Dark/light variant support

### 7.9 Nav & Footer

**`Nav.tsx`** (Client Component)
- Fixed top, transparent → blurred glass on scroll
- Desktop: Last Acre, Studio, Back on Kickstarter
- Mobile: hamburger menu with Lucide icons
- Scroll listener (passive)

**`Footer.tsx`**
- X (Twitter) and Instagram icons (custom SVG)
- Copyright: "© 2026 Last Game. All rights reserved."

### 7.10 Security Headers (next.config.ts)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 7.11 Tests

| Test File | Coverage |
|-----------|----------|
| `__tests__/api/subscribe.test.ts` | API route: validation, env checks, Resend errors, success |
| `__tests__/components/DownloadCta.test.tsx` | Component: render, success, error, network failure, POST body |
| `__tests__/lib/subscribe.test.ts` | Unit: email validation, payload builder |

**Test Framework:** Jest 30 + jsdom + React Testing Library + user-event

### 7.12 Assets
- `public/screenshots/` — 16 mobile game screenshots (PNG/JPG mix)
- `public/robots.txt` — allow-all
- `public/press-kit-readme.txt` — empty placeholder
- `public/favicon.ico`

---

## 8. Kickstarter Campaign

### 8.1 Campaign Design

**Funding Goal:** $6,000
**Duration:** 30 days
**Backers Needed:** ~300+
**Max Tier:** $20

**Budget Breakdown:**
| Item | Amount |
|------|--------|
| Development PC upgrade (GPU + RAM) | $3,200 |
| 3D & engine software licenses | $1,100 |
| Sound design & music licensing | $800 |
| QA, playtesting & misc tools | $500 |
| Kickstarter fees & payment processing | $400 |
| **Total** | **$6,000** |

### 8.2 Reward Tiers

| Tier | Price | Perks |
|------|-------|-------|
| Seedling | $5 | Digital copy + name in credits + social shoutout |
| Farmer | $10 | Digital copy + early access + credits + monthly dev update |
| Neighbour | $20 | Digital copy + early beta + in-game neighbour character + credits + monthly update |

*Neighbour tier capped at 100 backers.*

### 8.3 Campaign Page Structure
1. Banner — title + key art + "Funding now" badge
2. The Hook — neighbours mechanic as differentiator
3. What Your Pledge Funds — transparent budget table
4. The Roadmap — base game → multiplayer → 3D
5. Reward Tiers
6. About the Developer

### 8.4 Pre-Launch Marketing Plan (4 Weeks)

**Week 1:** Email signup live → personal network outreach → community lurking
**Week 2:** Reddit devlog posts → creator outreach (10 small TikTok/YouTubers)
**Week 3:** Follow-ups → Kickstarter submission for review
**Week 4:** Launch day → personal DMs → simultaneous community posts

**Target Communities:**
- r/indiegaming, r/AndroidGaming, r/iosgaming, farming sim subreddits
- Indie game Discord servers

### 8.5 Email Capture Integration
- Resend audience: "Last Acre Kickstarter Signups"
- Rate limited at 5 submissions / minute / IP
- Success message: "You're in. We'll notify you at launch."

---

## 9. Development Infrastructure

### 9.1 Claude Code Game Studios Setup

The `granja-tycoon/` directory contains a full **Claude Code Game Studios** configuration:

**Agents (48 specialized roles):**
- Game designer, gameplay programmer, economy designer
- Godot specialists, Unity specialists, Unreal specialists
- Art director, audio director, narrative director
- QA lead, producer, release manager
- And many more

**Skills (35+):**
- Architecture decision, asset audit, balance check
- Code review, design review, changelog
- Sprint plan, milestone review, playtest report
- Hotfix, gate check, launch checklist

**Hooks:**
- `detect-gaps.sh`, `log-agent.sh`, `pre-compact.sh`
- `session-start.sh`, `session-stop.sh`
- `validate-assets.sh`, `validate-commit.sh`, `validate-push.sh`

**Documentation Templates:**
- Game concept, GDD, art bible, sound bible
- Economy model, level design document
- Release checklist, post-mortem, risk register

### 9.2 Specs & Plans Index

`granja-tycoon/projects/farm-tycoon/specs.md` tracks 35+ shipped features:

**Shipped Features:**
Workers system, Futures trading, Animal genetics, Machinery overhaul, Random events & NPC farms, World map, Animal shows, Commodity exchange, Encyclopedia search, Fuel system, Onboarding rework, Price alerts UI, Profit preview & help buttons, Regional market, Save export/import, Auction house, Polish (haptics, chart, rivals), Realistic animal production, Animal production buildings, Transportation, Climate depth & recurring contracts, Compound realism stack, Design system, NPK/drainage/soil rework, Pest & disease cycles, Water system, Co-op mechanics, Animal breeds, Realistic price engine, Electricity system, Processing system, Selling channels, UI rework — navigation

**Ready to Build:**
- Precision Agriculture
- Pollination System
- Manure & Composting
- Feed Ration Balancing

### 9.3 Git Branches
- `main` / `master`
- `design-system-2026-04-13`
- `workers-system-2026-04-22`

---

## 10. Appendix: File Inventory

### Game (`granja-tycoon/`)
| Category | Count | Key Locations |
|----------|-------|---------------|
| App screens | 20 | `app/(tabs)/`, `app/modal.tsx`, `app/world-map.tsx` |
| Components | 80+ | `components/` (farm, market, office, ops, animals, ui, WorldMap) |
| Engine modules | 37 | `engine/*.ts` |
| Data files | 25 | `data/*.ts` |
| Store | 1 | `store/useGameStore.ts` (10,068 lines) |
| Hooks | 5+ | `hooks/` |
| Constants | 3 | `constants/` |
| Types | 5+ | `types/` |
| Assets | 100+ | `assets/images/` |
| Specs | 60+ | `docs/superpowers/specs/`, `docs/superpowers/plans/` |

### Marketing Site (`last-acre-website/`)
| Category | Count |
|----------|-------|
| Pages | 7 |
| Components | 8 |
| Content files | 2 |
| Tests | 1 (`lib/content.test.ts`) |

### Studio Site (`LAST-ACRE-CORP/`)
| Category | Count |
|----------|-------|
| Pages | 3 |
| Sections | 8 |
| UI components | 3 |
| Tests | 3 |
| Docs | 2 (Kickstarter plan + design) |

---

*End of Documentation*
