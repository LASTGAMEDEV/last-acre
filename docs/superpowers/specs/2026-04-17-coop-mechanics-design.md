# Co-op Mechanics — Design Spec

## Overview

Expand the existing single co-op (binary member/non-member, flat +12% bonus) into three independent, realistic agricultural co-operatives — one per product category. The player can join all three simultaneously. Each co-op operates as a genuine member-owned organisation with equity stakes, price pooling, delivery obligations, shared equipment, seasonal AGM votes, and a health system that reacts to member behaviour and market conditions.

The flat +12% sales bonus and $400/month dues are removed entirely and replaced by the systems below.

---

## Co-op Definitions

Three co-ops exist in the game world, each covering a distinct product category.

### Grain & Arable Co-op
**Crops:** Grass, Alfalfa, Barley, Oats, Wheat, Corn, Sorghum, Rice, Soy, Sunflower, Rapeseed, Canola, Cotton, Sugarbeet, Sugarcane
**Input discounts:** Seeds -10%, Fuel/diesel -8%, Fertilizer -12%, Pesticides -10%

### Horticulture Co-op
**Crops:** Potatoes, Grapes, Tomatoes, Strawberries, Olives, Almonds, Saffron, Vanilla, Lavender, Ginseng
**Input discounts:** Seeds -10%, Fuel/diesel -8%, Sprays/pesticides -10%, Irrigation supplies -12%

### Livestock Co-op
**Animals:** Chickens, Cows, Sheep, Pigs, Rabbits, Goats, Ducks, Bees, Alpacas, Turkeys, Quail, Buffalo
**Input discounts:** Feed -10%, Fuel/diesel -8%, Veterinary supplies -12%, Bedding/misc -8%

Cover crops (Rye, Clover, Mustard, Buckwheat) are excluded — they have no sale price and carry no delivery obligation.

---

## Data Model

### Replacing `cooperative`

The existing `cooperative: { member: boolean; joinDay: number } | null` field is removed. Replaced by:

```typescript
export type CoopId = 'grain' | 'horticulture' | 'livestock';

export interface CoopMembership {
  shares: number;                          // equity units owned
  sharePrice: number;                      // $/share at time of purchase (fluctuates on exit)
  joinDay: number;
  pendingRedemption: { requestedDay: number } | null;  // 1-season delay on exit
  offenceHistory: number[];                // game days on which delivery failures occurred
  seasonDelivered: number;                 // volume delivered this season (kg or L)
  seasonObligation: number;               // volume owed this season (kg or L)
  suspendedUntilSeason: number | null;    // season number when suspension lifts
}

export interface CoopEquipmentItem {
  id: string;
  label: string;
  usageFeePerDay: number;
  unlocksAtHealth: number;               // 0, 60, or 80
  bookings: { memberId: string; day: number }[];
}

export interface AGMProposal {
  coopId: CoopId;
  season: number;                        // game season number
  changes: Partial<CoopTerms>;           // proposed new values
  playerVote: 'yes' | 'no' | null;
  otherYesPct: number;                   // pre-rolled probabilistic result from other members
  resolved: boolean;
}

export interface CoopTerms {
  deliveryPct: number;                   // 0–100, default 50
  floorPct: number;                      // % of 90-day rolling avg, default 80
  annualFeePerShare: number;             // $ per share per year
  dividendPct: number;                   // % of co-op net profit returned to members
}

export interface CoopState {
  health: number;                        // 0–100
  memberCount: number;
  terms: CoopTerms;
  equipment: CoopEquipmentItem[];
  poolPrices: Record<string, number>;    // cropId/productId → pool price this season
  pendingAGM: AGMProposal | null;
  dissolvedUntilYear: number | null;     // game year when co-op can reform
}
```

### GameState additions

```typescript
coopMemberships: Partial<Record<CoopId, CoopMembership>>;
coopStates: Record<CoopId, CoopState>;
```

---

## Membership & Equity

### Joining
- Player buys shares at the current share price (share price = base value × health modifier)
- Minimum purchase: 10 shares
- Share price per co-op at game start: Grain $80/share · Horticulture $120/share · Livestock $100/share
- No limit to how many co-ops the player joins simultaneously
- Joining takes effect immediately at the start of the next season

### Leaving
- Player requests exit — `pendingRedemption` is set to the current day
- Redemption processes after 1 full season (co-op needs time to find liquidity)
- Redemption value = shares × current share price × health modifier:
  - Health ≥ 60%: 100% of current share price
  - Health 40–59%: 80%
  - Health 20–39%: 60%
  - Health < 20%: 40%
- During pending redemption period, all benefits remain active and obligations still apply

### Share Price Fluctuation
Share price updates at the end of each season:
- Base appreciation: +2% per season if health > 70%
- Depreciation: -5% per season if health < 40%
- Flat if health 40–70%

### Dividends
Paid annually at end of year (day 365, 730, etc.):
- Co-op net profit = total pool revenue − handling costs − equipment maintenance − member input subsidies
- Player dividend = net profit × (player's season delivery volume / total member delivery volume) × (dividendPct / 100)
- If co-op health < 40%, no dividend is paid that year

---

## Price Pooling

Replaces the flat +12% sales bonus for all co-op crops and animal products.

### Pool Price Calculation (per crop/product, per season)
```
poolPrice = rollingAvg90d × (1 - handlingFee) × floorMultiplier
```
- `rollingAvg90d`: weighted average market price over the last 90 game days
- `handlingFee`: 3% if health ≥ 70%, 4% if health 40–69%, 5% if health < 40%
- `floorMultiplier`: if calculated pool price < (rollingAvg90d × floorPct/100), the co-op tops it up to the floor from reserves — this drains co-op reserves and reduces health if sustained

Non-co-op crops still sell at spot price. Pool price can be better or worse than spot — that tension is the core co-op tradeoff.

---

## Delivery Obligations

### Tracking
When the player harvests a co-op crop, the game adds `harvest volume × (deliveryPct / 100)` to `seasonObligation`. A running indicator shows in the co-op panel and on the harvest banner:
> "50% of this harvest (340 kg) is owed to the Grain Co-op. Deliver before end of autumn."

### Delivery Mechanic
- Manual — player initiates delivery via the transport/logistics screen (same as any buyer delivery)
- Co-op appears as a destination with fuel cost calculated from farm to co-op depot
- Player pays transport cost; co-op pays pool price on receipt
- `seasonDelivered` increments as deliveries arrive

### Season-End Assessment
At the end of each season, the game checks `seasonDelivered` vs `seasonObligation`:
- Met (≥ 100%): no action, record cleared for next season
- Shortfall: penalty applied (see below)

### Penalty Tiers
**First offence (or no offence in past 3 years):**
- Short delivery fee = shortfall volume × pool price × 1.20
- Benefits suspended for the following season (`suspendedUntilSeason` set)
- `offenceHistory` records the day

**Second offence within 3 years:**
- Expelled from co-op
- Equity redeemed immediately at 50% of current share price (breach of contract penalty)
- Locked out for 2 years

During suspension: no pool pricing (sell at spot), no equipment access, no input discounts, no dividend eligibility.

---

## Equipment Pool

### Booking
- Book equipment 1–7 days in advance via co-op equipment tab
- Pay usage fee at booking (non-refundable)
- If slot is taken, earliest available day is shown automatically
- No-show forfeits the usage fee
- Booking conflict delays operations 1–3 days — can cause missed harvest windows

### Equipment by Co-op & Health Threshold

**Grain & Arable Co-op**
| Threshold | Equipment |
|---|---|
| 0% (start) | Combine harvester, Grain dryer, Sprayer |
| 60% | Seed drill, Fertilizer spreader, Baler |
| 80% | Grain trailer, Plough, Heavy tractor, Grain auger |

**Horticulture Co-op**
| Threshold | Equipment |
|---|---|
| 0% (start) | Spray rig, Refrigerated truck, Sorting/grading machine |
| 60% | Potato harvester, Grape harvester, Irrigation rig |
| 80% | Transplanting machine, Soil fumigation unit, Cold storage bay, Orchard shaker |

**Livestock Co-op**
| Threshold | Equipment |
|---|---|
| 0% (start) | Mobile vet unit, Livestock truck, Shearing machine |
| 60% | Feed mixer, Manure spreader, AI equipment |
| 80% | Cattle weighing crush, Egg grading machine, Mobile milking unit, Portable fencing kit |

Each threshold tier adds one physical unit of each equipment type at unlock (e.g. at 60%, one seed drill is added to the pool — a second requires reaching 80%).

---

## AGM & Policy Votes

### Timing
Once per year at the start of spring, each co-op the player is a member of triggers an AGM notification. Player has 7 days to vote before the AGM auto-resolves.

### Voteable Items
Each AGM presents one board proposal. Items that can be proposed:
- Delivery obligation % (±5%)
- Floor price guarantee % (±5%)
- Annual fee per share (±10%)
- Dividend payout % (±5%)
- Equipment investment (unlock next tier 1 season early, costs co-op reserves)

### Vote Simulation
- `otherYesPct` is pre-rolled when the proposal is generated, based on:
  - Co-op health > 70%: other members lean yes on generous proposals, no on austerity
  - Co-op health < 40%: other members lean yes on austerity, no on generous proposals
  - Random variance: ±15%
- Player's vote weight = 1 / memberCount (realistic — one member one vote)
- If adding/removing player's vote changes the outcome (result within 1/memberCount of 50%), player vote is decisive
- Result announced via day summary event; takes effect next season

### Player Counter-Proposal
Player can submit one alternative motion per AGM (e.g. propose a smaller fee increase than the board's proposal). Goes to a second vote immediately after the board's vote resolves. Same simulation rules apply.

### Board Behaviour by Health
- Health > 70%: proposes generous terms (higher floor, higher dividend, equipment investment)
- Health 40–70%: proposes stable terms (minor adjustments)
- Health < 40%: proposes austerity (lower floor, higher fees, reduced dividends, no equipment investment)

---

## Co-op Health

Health (0–100) updates at the end of each season.

### Increases
- Members meeting delivery obligations: +1 per % of members who fully delivered
- Strong pool prices (pool price > spot price by > 10%): +3
- Equipment investment votes passing: +2
- Net new members joining: +1 per new member (capped at +5/season)

### Decreases
- Short deliveries: -2 per offending member
- Pool price below floor (co-op topping up from reserves): -3 per season this occurs
- Members leaving: -1 per departing member (capped at -5/season)
- Equipment maintenance: -1 per season (baseline cost of running the pool)

### Health Consequences
| Health | Effect |
|---|---|
| 80–100% | Full equipment pool, best floor price, maximum dividends, share price appreciating |
| 60–79% | Mid equipment pool, standard terms |
| 40–59% | Starting equipment only, floor price reduced by 10%, no share appreciation |
| 20–39% | All member benefits suspended for one season, share price depreciating |
| 10–19% | Co-op at risk of dissolution — warning issued to all members |
| < 10% for 2 consecutive seasons | Co-op dissolved |

### Dissolution
- All memberships end; equity redeemed at 40% of last share price
- Co-op marked `dissolvedUntilYear = currentYear + 3` (rebuilds independently)
- Player locked out until that year; co-op reforms with reset health (50%) and base terms

---

## UI

### Co-ops Sub-Tab (oficina.tsx)
Replaces the existing single co-op card. Three panels, one per co-op, collapsible.

Each panel shows:
- Co-op name, health bar (colour-coded), member count
- Current terms: floor %, delivery %, annual fee, dividend %
- Membership section: share count, current share price, total equity value, pending redemption status
- Season delivery tracker: "Delivered 340 kg / 680 kg owed" progress bar + season deadline
- Equipment pool: available equipment list, usage fee, Book button, next available day if booked
- AGM section: upcoming AGM date, or active proposal with Yes / No buttons and current vote projection
- Join button (non-member) or Leave button (member, triggers redemption flow)

### Harvest Banner (tierras.tsx)
When harvesting a co-op crop:
> "[Co-op name]: 50% of this harvest ([X] kg) added to your delivery obligation. [Y] kg remaining this season."

### Delivery Action (tierras.tsx / oficina.tsx)
Since no dedicated transport screen exists yet, co-op delivery is triggered via a "Deliver to Co-op" button in the co-op panel (oficina.tsx) or directly from the harvest result modal (tierras.tsx). The action deducts fuel cost based on a fixed co-op depot distance and increments `seasonDelivered`. When the transportation system plan is implemented, co-op delivery becomes a proper transport job.

### HUD
Small co-op membership icons (G / H / L) displayed next to cash balance when active. Tapping opens the relevant co-op panel in oficina.tsx.

---

## Migration

Save key bumps from `granja-tycoon-save-v5` to `granja-tycoon-save-v6`.

Migration maps old state:
- `cooperative: { member: true }` → `coopMemberships.grain = { shares: 10, sharePrice: 80, joinDay: state.cooperative.joinDay, pendingRedemption: null, offenceHistory: [], seasonDelivered: 0, seasonObligation: 0, suspendedUntilSeason: null }`
- `cooperative: null` → `coopMemberships: {}`
- Initialise `coopStates` for all three co-ops with default health (70%), base terms, and starting equipment pool

---

## Out of Scope

- Multiplayer / real co-op with other human players
- Player founding a new co-op
- Co-op political drama between named NPC members
- International co-op federation mechanics
