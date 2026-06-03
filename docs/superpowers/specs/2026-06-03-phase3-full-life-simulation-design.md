# Living History System — Phase 3: Full Life Simulation
**Date:** 2026-06-03
**Project:** Granja Tycoon
**Status:** Approved for implementation planning

---

## Overview

Phase 3 completes the Living History System by adding three new engines — Family, Reputation, and Neighbor Farms — along with all associated UI. Together these transform the game from a multi-generational dynasty into a fully lived experience: the farmer has a family whose costs, relationships, and farm interest evolve over decades; the farm's reputation with the community determines access to premium markets and better loan terms; and eight neighboring farms simulate financially in the background, creating land acquisition opportunities and competitive context.

---

## Architecture

**Pattern:** Three new pure-function engine files, each called from the existing `advanceDay` loop in `useGameStore.ts`. Three new state slices added to the store. All new logic lives in engine files. No engine calls another engine directly — all interaction is through shared store state.

**New engine files:**
```
engine/
  familyEngine.ts       # spouse, children, life events, farm roles, co-ownership
  reputationEngine.ts   # weekly score recalc, tier assignment, tier effects
  neighborEngine.ts     # 8 NPC farm financial simulations, land opportunities
```

**New data files:**
```
data/
  lifeEvents.ts         # life event catalogue with probabilities and age gates
  neighborData.ts       # 8 neighbor farm profiles and financial archetypes
```

**advanceDay call order** (added after existing dynasty call):
1. `familyEngine.advanceDay()` — age members, generate life events, apply family roles
2. `reputationEngine.advanceWeek()` — fires only on `day % 7 === 0`
3. `neighborEngine.advanceYear()` — fires only on calendar year rollover (same gate as dynasty)

**Save key bump:** `granja-tycoon-save-v12` → `granja-tycoon-save-v13`

---

## Phase 3 — Family Engine (`engine/familyEngine.ts`)

### State

```typescript
type FamilyState = {
  spouse?: FamilyMember
  children: FamilyMember[]
  pendingLifeEvents: LifeEvent[]    // queue — shown one at a time, player works through them
  coOwner?: CoOwnerState            // set at inheritance when sibling co-owns
  familyStartYear?: number          // calendar year farmer married
}

type FamilyMember = {
  id: string
  firstName: string
  relation: 'spouse' | 'child'
  birthYear: number
  age: number
  health: number                    // 0–100
  personality: PersonalityTraits
  skills: FarmerSkills
  farmInterest: number              // 0–100; grows/declines from birth through adulthood
  farmRole?: FarmRole
  relationshipWithFarmer: number    // 0–100
  isAlive: boolean
}

type PersonalityTraits = {
  ambitious: boolean
  traditional: boolean
  techSavvy: boolean                // weighted by birth decade
  entrepreneurial: boolean
  contentious: boolean              // affects sibling co-ownership friction frequency
}

type FarmRole =
  | 'livestock_manager'             // animal care at full efficiency even if farmer is injured
  | 'crop_assistant'                // planting/harvest speed +20%
  | 'machinery_operator'            // equipment maintenance cost −15%
  | 'office_manager'                // loan terms improve, subsidy processing faster
  | 'general_help'                  // small all-round buff

type CoOwnerState = {
  sibling: FamilyMember
  ownershipShare: number            // 0–100 (player's %)
  relationship: number              // 0–100; drops when player overrides too often
  frictionEventsPerYear: number     // 2–4 depending on contentious personality
}

type LifeEvent = {
  id: string
  type: LifeEventType
  year: number
  involvedMemberId?: string         // which family member this event is about
  choices: LifeEventChoice[]
  reputationDeltas?: Record<string, number>  // per choice
}

type LifeEventChoice = {
  id: string
  label: string
  description: string
  effect: LifeEventEffect
  reputationDelta?: number          // community standing change
  cost?: number                     // shown to player before confirming
}
```

### Life Event Generation

Events generate probabilistically based on farmer age and era. Only one event generates per day. If `pendingLifeEvents.length > 0`, no new event generates until the queue clears — preventing event flooding during fast-advance.

**Age-gated probabilities:**

| Event | Condition | Daily chance |
|---|---|---|
| Meet someone | Age 20–32, no spouse | 0.3% |
| Marriage proposal | Met someone 180+ days ago | 0.8% |
| Pregnancy | Married, age 25–40 | 0.4% |
| Child school event | Child age 8–14 | 0.2% |
| Farm interest milestone | Child's interest crosses a threshold | Triggered |
| Farm interest drop | Child age 15–17 or university decision | 0.3% |
| Farm interest reveal | Child turns 18 | 100% (guaranteed) |
| Illness (family member) | Any member, scales with age | 0.1–0.5% |
| County fair encounter | Annual summer event | 100% (annual) |
| Neighbor interaction event | Based on neighbor relationship | 0.15% |
| Sibling friction event | coOwner exists | 2–4 per year |
| Co-owner buy-out event | coOwner relationship < 20 | Triggered |

### Child Farm Interest

- Base interest set at birth (0–100, weighted by `dynasty.knowledgeBank` family-legacy entries and era)
- Grows annually through farm engagement events (harvest helping, county fair, school agricultural programs)
- Can drop at key life stages: teen years (15–17 have "lost interest" event possibility), university tuition decision
- At age 18, `farmInterest` is the accumulated result of years of growth/decline — not a sudden reveal
- **Guaranteed heir rule:** at least one child's interest trajectory is seeded to reach ≥ 60 by age 18

### Sibling Co-Ownership

When 2+ children have `farmInterest ≥ 60` at inheritance, a special decision card fires:
- Player designates the lead heir (their character)
- The co-owning sibling becomes a `CoOwnerState` with their own skill profile
- Co-owner provides passive farm buffs based on their skills (same as farm roles)
- Co-owner generates friction `LifeEvent`s at a rate of 2–4 per in-game year
- Each friction event is a decision card: **agree** / **negotiate** / **override**
- Overriding drops `coOwner.relationship`
- When `coOwner.relationship < 20`, a buy-out event fires — player can buy out, be bought out, or negotiate a new split

### Family Costs

All costs are event-driven — they appear as part of the event card that triggers them. The player sees the cost before it is deducted. Declining a medical treatment is allowed but accelerates the member's health decline.

**Cost examples (era-calibrated):**
- Wedding: ~$2,000 (1973), ~$18,000 (1998), ~$32,000 (2015)
- Child university tuition: cheap in 1970s, expensive post-2000
- Medical emergency: scales with severity and era
- Family vacation: optional event, player accepts or declines

### Family Farm Contributions

When a family member has a `farmRole`, they provide a passive daily multiplier even when the farmer is injured or ill. Spouse + children stack. A fully-staffed family farm is significantly more resilient than a solo operation.

---

## Phase 3 — Reputation Engine (`engine/reputationEngine.ts`)

### State

```typescript
type ReputationState = {
  score: number                     // 0–100, recalculates weekly
  tier: ReputationTier
  factors: ReputationFactors
  communityStandingDelta: number    // pending delta from life events, flushed on weekly recalc
}

type ReputationTier = 'unknown' | 'local' | 'respected' | 'renowned' | 'legendary'

type ReputationFactors = {
  animalWelfare: number             // derived: sick/neglected animals drop this
  environmentalPractice: number     // derived: organic cert, hedgerows, composting
  communityStanding: number         // event-driven: rises/falls from life event choices
  productQuality: number            // derived: storage quality scores, processing grade
  financialReliability: number      // derived: loan defaults, on-time payments
  historicalConduct: number         // derived: crisis decisions — sold land, defaulted, or recovered
}
```

### Weekly Recalculation

Each factor is scored 0–100. The combined score is a weighted average:

| Factor | Weight |
|---|---|
| Animal welfare | 15% |
| Environmental practice | 20% |
| Community standing | 20% |
| Product quality | 20% |
| Financial reliability | 15% |
| Historical conduct | 10% |

Score moves slowly — maximum ±3 points per week. Crossing a tier threshold takes years.

**Tier thresholds:** unknown 0–19, local 20–39, respected 40–59, renowned 60–79, legendary 80–100.

### Starting Reputation

Seeded at game start based on backstory selection (randomized within range):
- **First-generation:** 5–15 (unknown tier)
- **Inherited farm:** 20–35 (local tier)
- **Established family farm:** 35–55 (local to respected)

### Community Standing

The only event-driven factor. Life event decision cards carry an optional `reputationDelta` per choice (e.g. lending equipment to struggling Petrovs: +8 community, refusing: 0). Deltas accumulate in `communityStandingDelta` and flush into the factor on the next weekly recalc.

### Tier Effects

Tier effects wire directly into existing systems by reading `reputation.tier` in the store:

| Tier | Effects |
|---|---|
| unknown | Default market prices, standard loan terms |
| local | Auction prices +5%, basic bank terms |
| respected | Premium buyers unlocked, workers apply proactively, loan interest −1% |
| renowned | CSA auto-waitlist, organic premium +15%, lighter subsidy inspections |
| legendary | Land sellers approach player first, knowledge bonus ×1.5, legacy score multiplier |

---

## Phase 3 — Neighbor Engine (`engine/neighborEngine.ts`)

### State

```typescript
type NeighborState = {
  caldwells: NeighborFarm
  petrovs: NeighborFarm
  greens: NeighborFarm
  hendersons: NeighborFarm
  obriens: NeighborFarm
  rodriguezes: NeighborFarm
  millers: NeighborFarm
  kowalskis: NeighborFarm
}

type NeighborFarm = {
  id: string
  status: 'thriving' | 'struggling' | 'bankrupt' | 'sold'
  cash: number
  debt: number
  landHectares: number
  landValue: number                 // tracks real historical land value curve
  relationship: number              // 0–100 with player's farm; randomized 20–70 at start
  events: string[]                  // IDs of notable events in their history
}
```

### Annual Simulation

Each neighbor runs a simplified income/expense calculation per year:
- `income = landHectares × productivityMultiplier × historicalCommodityBaseline`
- `expenses = (debt × interestRate) + (landHectares × operatingCostPerHa)`
- `cash += income - expenses`
- `status` derives from `cash` and `debt / income` ratio

Historical events apply to neighbors the same way they apply to the player — the 1973 oil embargo raises their operating costs, the 1986 debt crisis drops their land value and tightens their cash.

### The Eight Farms

| Farm | Archetype | Profile | Key Historical Events |
|---|---|---|---|
| **Caldwells** | Large conventional, over-leveraged | High debt, big land | Bankruptcy risk 1986; land goes to auction with player priority bid |
| **Petrovs** | Traditional mixed, conservative | Low debt, steady | Land available at fair price if they retire with no heir; marriage event possible |
| **Greens** | Small progressive, early adopter | Struggles early, grows | Goes organic ~1985; competes for CSA buyers; potential equipment co-op |
| **Hendersons** | Grain specialists, futures traders | Mid-size, volatile | Compete at auction; futures market rivalry |
| **O'Briens** | Dairy-focused, old-school | Steady, tech-resistant | Slow to modernise; sell equipment cheaply when upgrading |
| **Rodriguezes** | Entrepreneurial, agritourism | Started small 1980s | Compete for CSA/premium buyers |
| **Millers** | Elderly couple, no heirs | Small, debt-free | Proactively approach player to sell land when status reaches 'struggling' |
| **Kowalskis** | Specialty crops, farmers market | Small, niche | Early CSA adopters; potential co-op partnership |

### Relationship System

- Starting relationship per farm: randomized 20–70 at game start
- Rises through: lending help, co-op partnerships, positive life event choices involving that farm
- Drops through: outbidding at auction, competing for same market slot, overriding during friction events (co-owner only)
- Relationship gates events: Petrov marriage event requires `relationship ≥ 60`; equipment co-op with Greens requires `relationship ≥ 50`

### Land Opportunities

Generated as events when a neighbor's status changes:
- **Bankruptcy** → land auction fires; player has priority bid if reputation ≥ local
- **No heir + struggling** → direct sale offer at fair price (Millers, Petrovs)
- **Partnership** → equipment co-op reduces machinery costs for both parties

---

## UI Design

### Starting Screen (`components/StartingScreen.tsx`)

Dark/modern style consistent with existing navy UI theme. Single-page flow:
1. Farm name text input
2. Backstory selection — three chips: **First-generation** / **Inherited** / **Established**
3. Farmer name text input
4. "BEGIN YOUR LEGACY →" button

Shown when `gameSetupComplete === false`. Sets initial farm state based on backstory:

| Backstory | Cash | Land | Debt | Reputation seed |
|---|---|---|---|---|
| First-generation | $8,000 | 20 ha | $0 | 5–15 |
| Inherited | $22,000 | 50 ha | $12,000 | 20–35 |
| Established | $45,000 | 100 ha | $30,000 | 35–55 |

### Life Event Decision Card (`components/LifeEventModal.tsx`)

Modal with portrait style. Shown when `family.pendingLifeEvents.length > 0`. Blocks interaction until dismissed.

Structure:
- Farmer portrait icon (top left) + year tag + event title
- Divider
- Narrative text (2–4 sentences, first person)
- 2–3 choice buttons showing label, description, and cost (if any)
- Queue indicator: "📋 N more events waiting" (shown when queue > 1)
- Footer: "Your choice shapes your story — no wrong answer"

**Event queuing:** When multiple events fire during a fast-advance skip, they queue in `pendingLifeEvents`. The modal shows one at a time. The player cannot advance days while the queue is non-empty.

### Legado Tab — New Sub-tabs

Two sub-tabs added alongside existing Carácter + Árbol:

**Familia sub-tab** (`components/legado/FamiliaSection.tsx`) — card list style:
- Annual family cost banner at top (total cost + member count)
- One card per family member: avatar, name, age, relation
  - Spouse: role badge + relationship bar
  - Children: farm interest bar (gold) + relationship bar (green)
  - Co-owner (if present): ownership split + relationship bar with friction warning if low
- Empty state: "Start a family to see your household here"

**Crónica sub-tab** (`components/legado/CronicaSection.tsx`) — scrollable chronological archive:
- All historical events + all family life events that fired in this playthrough
- Grouped by decade
- Each entry: year, category icon, headline/title, one-line summary
- Visual distinction between world events (newspaper icon) and personal events (family icon)

### HUD Strip Update (`components/GameHUD.tsx`)

Reputation tier badge added as a small chip in HUD Row 1, positioned between year badge and farmer chip:
- `UNKNOWN` / `LOCAL` / `RESPECTED` / `RENOWNED` / `LEGENDARY`
- Color: muted green at low tiers, brightens as tier rises
- No tap action (tier is informational)

---

## File Map

| Action | Path |
|---|---|
| Create | `engine/familyEngine.ts` |
| Create | `engine/reputationEngine.ts` |
| Create | `engine/neighborEngine.ts` |
| Create | `data/lifeEvents.ts` |
| Create | `data/neighborData.ts` |
| Create | `components/LifeEventModal.tsx` |
| Create | `components/StartingScreen.tsx` |
| Create | `components/legado/FamiliaSection.tsx` |
| Create | `components/legado/CronicaSection.tsx` |
| Modify | `store/useGameStore.ts` |
| Modify | `app/(tabs)/legado.tsx` |
| Modify | `app/(tabs)/_layout.tsx` |
| Modify | `app/_layout.tsx` |
| Modify | `components/GameHUD.tsx` |
| Modify | `components/office/SettingsSection.tsx` |

---

## Implementation Strategy

**Two sub-plans (Option B — engines first, UI second):**

**Sub-plan A — Engine layer:**
All three engine files + data files + store slices + advanceDay wiring. No UI. Verification via console logs and store state inspection. Covers: `familyEngine.ts`, `reputationEngine.ts`, `neighborEngine.ts`, `lifeEvents.ts`, `neighborData.ts`, store slice additions, save key bump, SettingsSection update.

**Sub-plan B — UI layer:**
All UI components built on top of verified engine logic. Covers: `LifeEventModal.tsx`, `StartingScreen.tsx`, `FamiliaSection.tsx`, `CronicaSection.tsx`, Legado tab update, layout mounts, HUD update.

---

## Open Questions / Future

- Agritourism revenue streams (farm shop, pick-your-own, B&B) — spec'd in living-history design doc, not in Phase 3 scope
- Yearbook / shareable legacy card — spec'd in living-history design doc, Phase 4 candidate
- Full co-ownership friction mechanics are in scope; multiplayer co-ownership (two real players) is Phase 5+
- Grandparent advisor NPC (mentor narrative voice for early years) — Phase 4 candidate
