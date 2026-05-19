# Living History System — Design Spec
**Date:** 2026-05-19  
**Project:** Granja Tycoon  
**Status:** Approved for implementation planning

---

## Overview

The Living History System transforms Granja Tycoon from a farming simulator into a multi-generational dynasty game played against real history. Starting in 1970, the player farms through real historical events — oil crises, disease outbreaks, technological revolutions, regulatory changes — with exact real-world dates. The farm passes through multiple generations of a family, each inheriting the accumulated knowledge, assets, and debts of those who came before.

This system is the most significant design change in the game's history. It touches every existing engine and adds five new ones.

---

## Core Principles

- **Everything is gradual** — events have ramp-up, peak, and ramp-down phases. History doesn't flip switches; it turns dials.
- **No artificial limits** — no energy bars, no daily action caps. Health is consequence, not a gate.
- **Full player agency** — every personal life decision is a player choice. The game narrates, the player decides.
- **Fictional brand names** — placeholder names throughout, architected for easy swap to real brands when licensed.
- **Soft fail only** — players lose assets in crises but never reach a hard game-over state.
- **Real historical data** — commodity prices from USDA/World Bank data, real event dates, real cost curves.

---

## Architecture

**Pattern:** Engine modules with pure functions, called from the existing `advanceDay` loop in `useGameStore.ts`. State slices added to `useGameStore`. All new logic lives in engine files. Historical data lives in a static typed file.

**New files:**
```
granja-tycoon/
  engines/
    timelineEngine.ts       # Phase 1
    dynastyEngine.ts        # Phase 2
    familyEngine.ts         # Phase 3
    reputationEngine.ts     # Phase 3
    neighborEngine.ts       # Phase 3
  data/
    historicalEvents.ts     # Phase 1 — static event database
    historicalPrices.ts     # Phase 1 — commodity price curves by year
```

**advanceDay call order** (added after existing engine calls):
1. `timelineEngine.advanceDay()` — fire events, apply/update effect curves
2. `dynastyEngine.advanceDay()` — age farmer, check health thresholds
3. `familyEngine.advanceDay()` — process personal life event calendar
4. `reputationEngine.advanceWeek()` — recalculate reputation score (called once per 7 days)
5. `neighborEngine.advanceDay()` — simulate neighbor farm states

---

## Phase 1 — Historical Timeline Engine

### Historical Event Database (`data/historicalEvents.ts`)

Every event is a typed object:

```typescript
type HistoricalEvent = {
  id: string                   // "1973-oil-crisis"
  date: string                 // "1973-10-17" — exact ISO date
  category: EventCategory      // 'economic' | 'technology' | 'regulation' |
                               //  'disease' | 'weather' | 'genetics' | 'product'
  tier: 'major' | 'minor'     // major = newspaper modal, minor = toast banner
  headline: string             // "OPEC Oil Embargo Announced"
  narrative: string            // hand-written scene (major) or template (minor)
  effects: EventEffect[]
  unlocks?: UnlockGate[]       // products/engines that become available
  rampUpDays: number
  peakDays: number
  rampDownDays: number         // 0 = permanent change
}

type EventEffect = {
  target: string               // 'fuel_cost' | 'wheat_price' | 'loan_rate' | etc.
  multiplier?: number          // 1.4 = +40%
  absolute?: number            // flat change (interest rate +6%)
}

type UnlockGate = {
  type: 'product' | 'engine' | 'mechanic'
  id: string
}
```

### Sample Event Database (subset — full database: 300–500 events, 1970–present)

| Date | Tier | Event | Key Effects |
|---|---|---|---|
| 1970-12-02 | minor | EPA founded | Pesticide regulation unlocked |
| 1972-06-14 | major | DDT banned | DDT-class products removed from store |
| 1973-10-17 | major | OPEC oil embargo | Fuel +40%, 8-month ramp |
| 1974-09-01 | minor | Glyphosate herbicide launched | New herbicide tier unlocked |
| 1975-01-01 | minor | Embryo transfer commercial use | Advanced animal genetics unlocked |
| 1977-09-01 | minor | First GPS satellite launched | (precursor; GPS farming unlocks 1995) |
| 1980-01-04 | major | USSR grain embargo | Wheat export price −25%, 12 months |
| 1981-06-20 | major | Prime rate 21% | Loan interest peaks, bank terms tighten |
| 1983-01-01 | minor | First commercial BST approved | Dairy yield boost product unlocked |
| 1984-01-01 | minor | CSA movement begins | CSA engine activates |
| 1986-10-01 | major | Farm debt crisis peak | Land value −30%, foreclosure events |
| 1988-06-01 | major | North American drought | Crop yield penalty, 4-month peak |
| 1990-01-01 | minor | Organic certification standards | Organic cert engine activates |
| 1992-01-01 | major | EU CAP MacSharry reform | CAP subsidies engine activates |
| 1993-07-01 | major | Great Midwest Flood | Soil erosion events, crop losses |
| 1994-05-18 | minor | First GMO crop approved | GMO seed tier 1 unlocked |
| 1995-01-01 | minor | GPS guidance for agriculture | Precision ag engine activates |
| 1996-03-20 | major | BSE/Mad cow crisis | Beef price −45%, 18-month decline |
| 1996-09-01 | minor | Roundup-Ready soybeans | Herbicide-tolerant seed tier unlocked |
| 1999-12-31 | minor | Y2K preparation | Equipment audit event, one-time cost |
| 2000-01-01 | major | Digital/internet era | Online market access unlocked |
| 2001-02-20 | major | Foot and mouth outbreak | Livestock movement restrictions, 6 months |
| 2003-08-01 | major | European heat wave | Drought conditions, yield −30% |
| 2005-01-01 | minor | Ethanol boom begins | Corn price surge begins |
| 2007-01-01 | major | Global food price crisis | All commodity prices surge |
| 2008-09-15 | major | Financial crisis | Bank lending tightens, land values drop |
| 2008-01-01 | minor | Genomic SNP testing | Animal genetics engine upgrade unlocked |
| 2012-06-01 | major | US drought | Worst drought since 1956, yield penalties |
| 2015-03-01 | minor | Drone technology for farming | Crop monitoring drone unlocked |
| 2020-03-11 | major | COVID-19 pandemic | Supply chain disruption, labor shortage |
| 2022-02-24 | major | Ukraine war / grain crisis | Wheat price surge, fertiliser +60% |
| 2022-06-01 | minor | Precision fermentation proteins | Lab protein alternative market opens |

### Existing Engine Historical Gating

Before their activation date, `advanceDay` skips calling these engines entirely:

| Engine | Activation Date | Historical Basis |
|---|---|---|
| `organicCert` | 1990-01-01 | US OFPA / EU organic standards |
| `capSubsidies` | 1992-01-01 | MacSharry CAP reform |
| `csaEngine` | 1984-01-01 | CSA movement origin |
| `hedgerowEngine` EFA rules | 1992-01-01 | EU Habitats Directive |
| GPS / precision ag | 1995-01-01 | Commercial GPS farming |
| Advanced animal genomics | 2008-01-01 | Commercial SNP chips |
| Drone monitoring | 2015-01-01 | Commercial agricultural drones |

### Historical Commodity Prices (`data/historicalPrices.ts`)

A year-indexed lookup table for real historical prices (USDA / World Bank data). Every year from 1970 to present has baseline prices for: wheat, corn, soybeans, milk, beef, pork, lamb, wool, diesel fuel. The price engine uses these as the base before applying event multipliers.

### Technology Adoption Curve

When a technology unlocks, it follows a price curve:
- **Year 0** (first year available): launch premium — 2× the eventual steady price
- **Years 1–3**: early adopter price — 1.5× steady
- **Years 4+**: mainstream price — steady

Early adopters gain productivity advantage for years before competitors catch up. The decision of *when* to adopt is a strategic one.

### UI: Persistent HUD Strip

Appears at the top of every screen. Contains:
- Farmer portrait icon + name + age
- Health bar (visual only, no number)
- Current year (prominent, always visible)
- Current season
- Reputation tier badge
- Farm name
- Legacy score

Tapping the strip opens the Carácter sub-tab in Legado.

### UI: Event Presentation

- **Major events** → full-screen newspaper modal with masthead, headline, narrative text, and effect summary. Player must dismiss to continue. Era-appropriate styling (1970s looks like a broadsheet; 2000s looks like a website).
- **Minor events** → toast banner slides in from top for 6 seconds, then fades. Shows icon, date, headline, and one-line effect. Non-blocking.

---

## Phase 2 — Dynasty Engine

### State

```typescript
type DynastyState = {
  farmName: string              // "Hartwell Family Farm" — permanent across all generations
  legacyScore: number           // accumulates permanently, never resets
  currentFarmer: Farmer
  ancestors: AncestorRecord[]
  knowledgeBank: KnowledgeEntry[]
}

type Farmer = {
  id: string
  firstName: string
  familyName: string
  birthYear: number
  health: number                // 0–100
  skills: FarmerSkills
  unlockedKnowledge: string[]
  mentorId?: string             // set during mentor phase after early handoff
  isRetired: boolean
}

type FarmerSkills = {
  crops: number                 // 0–100, earned through doing
  livestock: number
  machinery: number
  finance: number
  technology: number            // era-weighted starting value by birth decade
}

type AncestorRecord = {
  farmer: Farmer
  startYear: number
  endYear: number
  cause: 'voluntary_handoff' | 'health_decline' | 'death'
  legacyContribution: number
  memorableEvents: string[]     // IDs of historical events during their tenure
}

type KnowledgeEntry = {
  id: string                    // "organic-mastery"
  name: string
  description: string
  earnedBy: string              // what action/condition earned it
  effect: KnowledgeEffect       // passive bonus for all future generations
}
```

### Farmer Aging & Health

- On January 1 each in-game year, farmer's age increments
- Health begins natural decline at age 60 (−0.5/year), accelerating at 70 (−1.5/year)
- Illness/injury events are procedural personal events that temporarily reduce health
- Recovery time scales with age: 25-year-old recovers from illness in 7 days; 65-year-old takes 45 days
- When health drops below 25 and trajectory shows no recovery: handoff event fires
  - If farmer is < 72: retirement scene, mentor phase begins
  - If farmer is ≥ 72 or health collapses suddenly: death scene, immediate handoff

### Generational Handoff

**Voluntary (early):** Player initiates from Legado → Carácter tab once an eligible heir exists (family member with farmInterest ≥ 60 and age ≥ 18).
- Retired farmer stays alive as mentor for 3–5 in-game years
- Mentor provides passive +15% to their strongest skill domain
- A personal event fires when mentor eventually passes — a major narrative moment

**Health-driven (late):** Automatic when health threshold is crossed. Less preparation time for the heir means harder early years.

### Knowledge Inheritance

Knowledge is earned by doing — both successes and failures teach. Examples:

| Action | Knowledge Unlocked | Dynasty Effect |
|---|---|---|
| 3 full seasons certified organic | "Organic Mastery" | New gen starts organic cert 1 year faster |
| Survive bankruptcy and recover | "Crisis Resilience" | Loan terms 10% better permanently |
| Win 5 auctions | "Auction Eye" | Better price signals at auction |
| Adopt a technology in launch year | "Early Adopter" | Next technology adoption −20% cost |
| Expand farm by 100+ acres | "Land Builder" | Land negotiation prices −5% |
| Raise 3+ children | "Family Legacy" | Children's farm interest +10 base |

All knowledge is additive — it never degrades. A fourth-generation farmer carries every lesson their ancestors learned.

**Era-appropriate skill starting values by birth decade:**

| Birth Decade | Technology Bonus | Notes |
|---|---|---|
| 1940s | +0 | Pre-digital baseline |
| 1950s | +5 | Mechanisation era |
| 1960s | +10 | Green revolution |
| 1970s | +15 | Early computerisation |
| 1980s | +25 | Home computer era |
| 1990s | +35 | Internet era |
| 2000s+ | +50 | Digital native |

### Legacy Score

Accumulates from:
- Land owned at handoff
- Debt-free years
- Crises survived without asset loss
- Knowledge entries unlocked
- Reputation tier reached
- Children who continued farming
- Generations completed

Displayed on the family tree next to each ancestor's entry.

---

## Phase 3 — Family Engine

### State

```typescript
type FamilyState = {
  spouse?: FamilyMember
  children: FamilyMember[]
  pendingLifeEvent?: LifeEvent
}

type FamilyMember = {
  id: string
  firstName: string
  relation: 'spouse' | 'child'
  birthYear: number
  age: number
  health: number
  personality: PersonalityTraits
  skills: FarmerSkills
  farmInterest: number          // 0–100; revealed at age ~18
  farmRole?: FarmRole
  relationshipWithFarmer: number  // 0–100
  siblingRelationships: Record<string, number>  // id → relationship score
  isAlive: boolean
}

type PersonalityTraits = {
  ambitious: boolean
  traditional: boolean
  techSavvy: boolean            // weighted by birth decade
  entrepreneurial: boolean
  contentious: boolean          // affects sibling co-ownership friction
}

type FarmRole = 
  | 'livestock_manager'   // animal care at full efficiency even if farmer is injured
  | 'crop_assistant'      // planting/harvest speed +20%
  | 'machinery_operator'  // equipment maintenance cost −15%
  | 'office_manager'      // loan terms improve, subsidy processing faster
  | 'general_help'        // small all-round buff
```

### Personal Life Event Calendar

Events fire probabilistically based on age and era. Player makes a choice at every major moment.

**Life stage events:**

- **Age 20–30:** Meeting someone → pursue? → relationship develops → marriage proposal → accept?
- **Age 25–35 (if married):** Pregnancy event → start family now? → child born with randomised name, personality, skills
- **Children age 8–14:** Start helping with farm tasks; interests emerge; school events
- **Children age 18–22:** Farm interest revealed; join farm or leave; if join, pick role
- **Children age 25–35:** Their own life events (marriage, children — grandchildren to the player's farmer)
- **Inheritance moment:** Eligible heir(s) identified; handoff decision point

### Family Costs

All costs are era-accurate (historically calibrated):

**Recurring annual costs (auto-deducted):**
- Per child (0–11): school fees + clothing + food
- Per child (12–17): higher school fees + allowance + activities
- Per child (18–22, if at university): tuition — major cost, historically calibrated (cheap 1970s; expensive 2000s+)
- Household baseline: food, utilities, home maintenance regardless of family size
- Healthcare per family member: scales with age and era

**One-time event costs (player sees cost before deciding):**
- Wedding: historically calibrated (1973: ~$2,000 / 1998: ~$18,000 / 2015: ~$32,000)
- Family vacation: optional event, player chooses to accept or decline
- Medical emergency: treatment cost shown; declining to treat accelerates health decline
- Children's extracurricular activities: small recurring cost; children with activities develop skills faster

### Family Farm Contributions

When a family member takes a farm role, they provide a daily passive effect even when the farmer is injured or ill. Spouse + children stack — a fully-staffed family farm is significantly more resilient than a solo operation.

If no family and no hired workers, injury/illness causes significant efficiency loss.

### Guaranteed Heir Rule

At least one child will always have farmInterest ≥ 60 by age 18 — guaranteed by the family engine's randomisation. This ensures dynasty continuity in all playthroughs. If only one child qualifies, they inherit automatically. If multiple qualify, the player chooses or splits.

### Sibling Co-Ownership

When 2+ children have farmInterest ≥ 60 at inheritance:
- High mutual relationship → one becomes lead (player chooses); other is high-skill NPC partner
- Low relationship or contentious personality → split proposed
  - Split: farm divides into two entities sharing infrastructure; friction events fire periodically
  - Buy-out event can fire later if one sibling wants full control
  - Negotiate: player-led conversation event to determine terms

---

## Phase 3 — Reputation Engine

### State

```typescript
type ReputationState = {
  score: number                 // 0–100, recalculates weekly (not daily — performance + realism)
  tier: ReputationTier
  factors: ReputationFactors
}

type ReputationTier = 'unknown' | 'local' | 'respected' | 'renowned' | 'legendary'

type ReputationFactors = {
  animalWelfare: number
  environmentalPractice: number
  communityStanding: number
  productQuality: number
  financialReliability: number
  historicalConduct: number     // how you handled crises
}
```

### Reputation Effects by Tier

| Tier | Unlocks / Bonuses |
|---|---|
| unknown | Default market prices, standard loan terms |
| local | Auction prices +5%, basic bank terms |
| respected | Premium buyers unlocked, workers apply to you, bank interest −1% |
| renowned | CSA auto-waitlist, organic premium +15%, lighter inspections |
| legendary | Land sellers approach you first, knowledge bonus ×1.5, legacy score multiplier |

Reputation builds slowly (years) and damages faster (months). Surviving a crisis with obligations met raises it. Loan default or neglect-caused disease outbreak drops it sharply.

---

## Phase 3 — Neighbor Farms

Three NPC neighbor farms simulate in the background, reacting to the same historical events the player experiences.

**The Caldwells** — large conventional operation
- Thrives in 1970s, over-leverages in boom years
- Vulnerable to 1980s debt crisis; may go bankrupt
- Bankruptcy: land goes to auction, player has priority bid
- Survival: becomes large corporate farm by 2000s, competes at auction

**The Petrovs** — mixed livestock/arable, traditional and conservative
- Rarely expands, steady through crises
- Possible marriage event (child of Petrovs meets player's child)
- Land available at fair price if they retire with no heir

**The Greens** — small progressive early-adopter
- Goes organic early (~1985), struggles until organic premium matures
- Competes for CSA buyers and premium market slots
- Potential partnership: shared equipment co-op, joint market selling

Neighbors don't require player management. Their state (thriving / struggling / bankrupt / sold) creates land acquisition opportunities and competitive context.

---

## UI Design

### Persistent HUD Strip (all screens)
- Farmer portrait icon + first name + age
- Health bar (visual, no number) — added Phase 2
- Year (prominent, always visible)
- Season indicator
- Reputation tier badge — added Phase 3
- Farm name
- Legacy score — added Phase 2
- Tapping opens Legado → Carácter (Legado tab added Phase 2)

Phase 1 shows: year + farmer name + age only. Full HUD active by end of Phase 3.

### Event Presentation
- **Major:** Full-screen newspaper modal. Masthead, date, headline, narrative paragraph, effect summary box, dismiss button. Era-appropriate styling.
- **Minor:** Toast banner, top of screen, 6 seconds, non-blocking. Icon + date + headline + one-line effect.

### Legado Tab (new top-level tab, beside existing tabs)
Four sub-tabs:
- **Familia** — spouse and children cards with roles, relationship scores, family cost total
- **Árbol** — visual family tree, all ancestors with years, key events, legacy contribution
- **Crónica** — archive of all historical events that fired in this playthrough, in chronological order
- **Carácter** — current farmer's full profile: skills, knowledge bank, health, age, biography

### Life Event Decision Card
- Slides up as a modal over whatever screen the player is on
- Shows year, event title, narrative text (2–4 sentences)
- 2–3 choice buttons, plain language, no UI jargon
- Footer: "Your choice shapes your story — no wrong answer"

### Starting Screen (new)
On first game start: farm name entry → backstory selection (First-generation / Inherited farm / Established family farm) → farmer first name entry → game begins in 1970 with appropriate starting assets.

---

## Build Phases

### Phase 1 — Historical Timeline Foundation
- `data/historicalEvents.ts` — initial 100-event database (1970–2000), expandable
- `data/historicalPrices.ts` — commodity price curves
- `timelineEngine.ts` — event firing, gradual effect curves, unlock gates
- Retroactive engine gating (existing engines skip before their activation date)
- Technology adoption curve applied to all unlockable products
- Persistent HUD strip (year + farmer name + age only in Phase 1)
- Newspaper modal + toast banner UI components
- Store gating: shop hides items not yet historically available

### Phase 2 — Dynasty System
- `dynastyEngine.ts` — aging, health, handoff, mentor phase
- Dynasty state slice in `useGameStore`
- Knowledge bank — earn and accumulate entries
- Knowledge inheritance — new farmer starts with bonuses
- Era-appropriate skill starting values
- Legacy score system
- Family tree UI (Árbol sub-tab) — ancestors only, no living family yet
- Carácter sub-tab — full farmer profile view

### Phase 3 — Full Life Simulation
- `familyEngine.ts` — spouse, children, personal life events, roles, costs
- `reputationEngine.ts` — reputation score, tier effects
- `neighborEngine.ts` — 3 NPC farms, background simulation
- Full Legado tab with all 4 sub-tabs active
- Life event decision cards
- Starting screen with farm name + backstory selection
- Family cost system wired to cash flow
- Sibling co-ownership mechanics
- Procedural era-appropriate personal events

---

## Machinery Evolution by Decade

Machinery available in the store changes fundamentally each decade — not just price, but capability:

| Era | What's Available | What's Not |
|---|---|---|
| 1970s | 2WD tractors, no cab, basic diesel, manual hydraulics, no ROPS (early) | Enclosed cab, 4WD, any electronics |
| 1980s | Enclosed cab standard, 4WD unlocks mid-decade, early onboard computers | GPS, electronic linkage, yield monitors |
| 1990s | GPS receivers, electronic linkage control, yield monitors, precision sprayers | Auto-steer, variable rate, telematics |
| 2000s | Auto-steer, variable rate application, telematics, precision planting | Fully autonomous functions, drone integration |
| 2010s+ | Drone crop monitoring, autonomous headland turns, real-time data sync | (frontier) |

Early decades have fewer equipment options but also lower costs. The decision of when to upgrade is meaningful — cutting-edge 1985 equipment is expensive; waiting until 1990 gets you better tech cheaper but you lose 5 years of productivity.

---

## Information Access Evolution

How the player receives market prices and event information changes with each era. Earlier eras mean farming partially blind — you can't react to price moves you don't know about yet.

| Era | Information Source | Price Delay | Market Screen |
|---|---|---|---|
| 1970–1979 | Weekly farming newspaper + radio | 3–7 days | Weekly snapshot only |
| 1980–1984 | Telephone market lines | 1 day | Daily update, call costs money |
| 1985–1994 | Fax machine (purchasable) | Same day | Daily printed sheet |
| 1995–1999 | Dial-up internet (purchasable) | Near real-time | Live prices with refresh |
| 2000–2007 | Broadband | Real-time | Live prices, weather, news |
| 2008+ | Smartphone integration | Real-time + push | Price alerts, instant event news |

Adopting information technology early is a strategic advantage. A farmer who buys a fax machine in 1986 can react to market moves their neighbours won't see until next week.

Weather forecasting follows the same arc: 1970s = look at the sky + almanac; 1980s = TV evening forecast; 1990s = 3-day forecast available; 2000s = 10-day forecast online; 2010s = hourly smartphone alerts with field-level precision.

---

## Climate Drift (Slow-Burn Background Change)

Not a single event — a gradual shift in conditions across decades that no newspaper announces. Players who farm into the 2000s and 2020s will notice:

- **1970s–1980s**: baseline "normal" weather patterns, predictable seasons
- **1990s**: slightly more erratic summers, occasional unexpected late frosts
- **2000s**: drought frequency increases, growing seasons begin shifting, new pest species appear at the farm's latitude
- **2010s–2020s**: irrigation becomes necessary in some years where it wasn't before, extreme weather events more frequent, crop viability zones shift northward

Policy events respond to climate: EU water restrictions fire in drought years, drought subsidy programs become available, carbon farming payments unlock post-2020. Players who adapt early (investing in irrigation, switching varieties) weather the shift better than those who don't notice it happening.

---

## Land Value Appreciation

Land is the most important long-term asset in the game. Real historical land values:

- 1970: ~$200–400/acre (generic baseline)
- 1980: ~$800/acre (boom years)
- 1986: crashes ~40% (debt crisis)
- 1990s: slow recovery
- 2000s: steady climb
- 2008: brief dip
- 2020s: $5,000–10,000+/acre

Selling land in a crisis locks in a generational loss. Holding through crashes and leaving land to heirs is how dynasty wealth builds. Players who buy a neighbour's distressed land in 1986 and hold it to 2020 will see enormous appreciation — creating a compelling reason to survive crises rather than fold.

Land value is tracked per parcel and displayed in the land management screen with a historical graph showing its value over the dynasty's ownership period.

---

## Crop Insurance

A purchasable annual product, historically accurate:

- **1970s**: basic privately-offered crop insurance, expensive and limited coverage
- **1980s**: government-backed programs expand significantly post-debt-crisis
- **1990s**: multi-peril crop insurance becomes standard practice; subsidised premiums
- **2000s+**: sophisticated products covering yield, revenue, and margin; highly subsidised

Each year the player decides whether to purchase insurance for each crop type. Premium scales with coverage level. A drought or disease event without insurance = full loss. With insurance = partial compensation. The decision has real financial stakes every season.

---

## County Fair / Agricultural Show (Annual Event)

Fires every summer as a recurring event. Player chooses how much to engage:

**What you can do at the fair:**
- Enter livestock in breed competitions — prizes + reputation boost + prestige
- Browse equipment vendors (occasionally at show-day discounts)
- Sell surplus animals directly at premium prices
- Network with neighbours (affects neighbor relationships, may trigger personal life events)
- Enter crop produce competitions (storage quality + reputation)

The county fair is also a personal life event location — meeting a future spouse, children making friends with the Petrov kids, a chance encounter that leads somewhere. It grounds the game in farming community life and gives every year a social anchor even in quiet historical periods.

---

## Crop Variety Unlock Tree

Ties directly into the genetics engine. Available seed varieties change decade by decade:

| Era | Crop Variety Tier | Key Traits |
|---|---|---|
| 1970s | Basic hybrids | Modest yields, limited disease resistance |
| 1980s | Improved hybrids | Better disease resistance, more consistent yield |
| Early 1990s | Pre-GMO herbicide-tolerant | Reduced herbicide cost, still conventional |
| Late 1990s | First-generation GM | Single trait stacking (herbicide OR insect resistance) |
| 2000s | Stacked GM traits | Herbicide + insect resistance combined, yield premium |
| 2010s | Drought-tolerant varieties | Resilience to the increasing drought pattern |
| 2020s | Precision-bred varieties | CRISPR-adjacent, specific trait targeting |

Each variety tier has higher base yield potential but also higher seed cost. Adopting GM varieties requires the player to accept the GMO unlock event and purchase compatible herbicide lines — a bundle decision with both cost and yield implications.

---

## Farm Yearbook / Memory Archive (Emotional & Viral Hook)

Located in the Legado tab alongside Árbol and Crónica. The Yearbook auto-captures a record at key moments:

**Auto-captured moments:**
- First tractor purchase
- First crop harvest
- Wedding
- Birth of each child
- First generational handoff
- Major crisis events (debt, disease, drought)
- Reaching each reputation tier
- Legacy score milestones

Each capture stores: the year, farmer name and age, a one-line auto-generated caption ("James Hartwell, age 41, survives the 1986 debt crisis with the farm intact"), and the farm's financial snapshot at that moment.

**The Yearbook view**: a scrollable timeline of cards, one per captured moment, spanning the full dynasty. Visually era-styled (1970s card looks different from a 2010s card). Tapping any card shows the full context.

**Shareable legacy card**: a generated image showing the family tree, farm name, years spanned, legacy score, and 3 notable moments. Designed for social sharing — this is the mechanic that gets players posting about the game.

---

## Tutorial / Era Onboarding

Context delivered without being condescending:

**Grandparent advisor NPC**: at game start, your farmer's parent (the previous generation who is handing over the farm) serves as an in-game voice during the early years. They explain history through dialogue, not tooltips. When the 1973 oil crisis fires: *"Your father sets down the newspaper. 'Son, this embargo is going to hit us hard. Everything that runs on diesel just got 40% more expensive overnight.'"* The grandparent figure eventually retires from the advisor role (a personal event) and is replaced by the player's own experience.

**Decade primer**: optional 2-sentence context card when entering a new decade. Dismissable, never forced. *"Welcome to the 1980s. Interest rates are at historic highs and land prices are about to fall sharply — how you manage debt in the next few years will define the farm's future."*

**First-event tooltip**: the very first major historical event in a playthrough gets a small "why this matters" note appended below the narrative — one sentence linking the historical event to the player's farm specifically.

---

## Agritourism & Farm Diversification

New revenue streams that unlock historically as consumer culture changes:

| Era | Opportunity | Unlock Condition |
|---|---|---|
| 1980s | Farm shop (direct selling) | Reputation ≥ local + storage quality engine active |
| 1990s | Pick-your-own (fruit/veg) | Appropriate crops planted + reputation ≥ respected |
| 1990s | Farm B&B | Farmhouse upgrade + reputation ≥ respected |
| 2000s | Farmers market stall | Any surplus produce + reputation ≥ local |
| 2010s+ | Agritourism events (school visits, open days) | Reputation ≥ renowned |

Each diversification stream requires upfront investment and ongoing attention but provides income that's decoupled from commodity price swings — making it a valuable hedge in volatile historical periods. A farm with a B&B weathers the 2008 crisis differently from one that's 100% commodity dependent.

---

## Historical Worker Cost Gating

The existing worker system gets historically calibrated labour costs and availability:

| Era | Labour Situation | Cost Level |
|---|---|---|
| 1970s | Abundant local farm labour, low wages | Very cheap |
| 1980s | Rural depopulation begins, labour tightens | Moderate |
| 1990s | Seasonal migrant worker programmes expand | Moderate, seasonal availability |
| 2000s | Labour increasingly scarce, wages rising | Expensive |
| 2010s–2020s | Acute shortage post-Brexit/COVID in EU markets | Very expensive, reliability issues |

Historical events affect workers directly: the 1986 farm crisis means desperate workers available cheaply; post-2020 labour shortages mean experienced workers command premium wages and may be unavailable at harvest. Automation (machinery unlocks) becomes increasingly attractive as labour costs rise — a natural economic pressure that mirrors real farming history.

---

## Save System Architecture

Multi-generational gameplay requires robust save design:

- **Autosave on every major decision** — life event choices, generational handoffs, major purchases, crisis responses. A phone call mid-choice doesn't lose progress.
- **Cloud save** — players will play this game for months or years. Cloud sync is non-negotiable. Saves on session end and on major decisions.
- **Legacy snapshots** — at every generational handoff, a full game snapshot is preserved separately. Players can return to any past generation's starting point and try a different path without overwriting their main save. Displayed in the Árbol tab as "replay from here" option.
- **No permadeath** — consistent with the soft-fail philosophy. You can always continue.
- **Session-based progression** — the farm does not run while the player is offline. Time only advances when the player actively plays. This keeps the experience intentional and avoids the anxiety of idle games.

---

## Open Questions / Future Considerations

- Real brand name licensing: architecture is ready for swap (all product IDs are string keys)
- Event database expansion: designed for continuous addition; each update can add new historical events
- Localization: farm name, farmer names, and event text are all in string fields ready for i18n
- Multiplayer/co-op: co-ownership mechanic could extend to two real players in a future phase
