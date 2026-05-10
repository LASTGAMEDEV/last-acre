
# Pollination System — Make the Colmena Matter

**Date:** 2026-05-10  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-16-pest-disease-cycles-design.md` (spray operation), `2026-04-09-animal-production-buildings-design.md` (colmena buildings), `2026-04-05-realistic-animal-production-design.md` (honey production)

---

## 1. Executive Summary

Connect the existing bee/apiary system to crop yields. Players link parcels to specific apiary buildings; linked parcels get a yield bonus on insect-pollinated crops. Pesticide spray on linked parcels reduces hive health for 14 days — forcing a real trade-off between pest control and pollination. Honey output gains seasonal modifiers. Neglected (unlinked) hives can swarm, losing 25% of their bees.

**Why it matters:** Pest management and animal management become linked. Spray too aggressively → angry bees → lower yields on your highest-value crops. Almonds, strawberries, and canola become meaningfully more profitable with an apiary.

---

## 2. Pollination Dependency Per Crop

Add a `pollinationBonus: number` field to `CropType`. This is the maximum yield multiplier bonus (as a fraction) when hive health is 1.0.

| Bonus | Crops | Reasoning |
|-------|-------|-----------|
| **0.00** | wheat, barley, oats, corn, rice, sorghum, sugarbeet, sugarcane, grass, olives, rye | Wind-pollinated — bees provide no benefit |
| **+0.05** | grapes, tomatoes, potatoes | Primarily self-pollinating; honeybees provide marginal benefit |
| **+0.10** | soy, saffron, vanilla, lavender, ginseng | Insect-pollinated but tolerant of low bee density |
| **+0.20** | sunflower, rapeseed, canola, cotton, mustard | Partial wind + insect; meaningful but not critical |
| **+0.25** | buckwheat | Strongly insect-pollinated; excellent bee forage crop |
| **+0.30** | almonds, strawberries, alfalfa, clover | Critically bee-dependent; yield severely impacted without pollinators |

**Yield formula:** At harvest, if the parcel has a linked healthy hive:
```
harvestYield *= (1 + crop.pollinationBonus × hiveHealth)
```
Where `hiveHealth` is 0.0–1.0 (see §4). If no hive is linked, no bonus applies — no penalty.

---

## 3. Parcel–Hive Linking

### 3a. The Link

Each owned parcel can be linked to at most one colmena building:

```ts
// Added to Parcel type:
linkedColmenaId?: string;  // building ID of the assigned apiary, e.g. 'bld_colmena'
```

### 3b. Capacity Constraint

Each colmena building can be linked to a limited number of parcels, based on hive count:

| Building | Hives | Max linked parcels |
|----------|-------|--------------------|
| `bld_colmena` (small) | 15 | 5 |
| `bld_colmena_m` (medium) | 40 | 12 |
| `bld_colmena_l` (large) | 100 | 30 |

Attempting to link more parcels than capacity shows an error: *"This apiary is at capacity — upgrade or add another."*

### 3c. Linking UI

**In the Animals tab → Bees section** (or a new "Apiary" card within the Animals screen):
- Shows each colmena building with its name, linked parcel count, hive health, and current honey output rate
- [Manage Links] button opens a bottom sheet listing all owned parcels with checkboxes
- Parcels already linked to another colmena are shown grayed out (can be moved)

**In the Fields parcel card:**
- Small bee icon 🐝 if linked to a hive
- "⚠️ Pesticide active" badge if spray penalty is running
- Tap the icon → opens the Apiary panel directly

---

## 4. Hive Health

`hiveHealth` is computed per colmena building at each `advanceDay()` call — it is not stored in state, just derived.

### 4a. Pesticide Penalty

When a linked parcel is sprayed (`spray` machinery operation):
- Sets `pesticideSprayedDay: number` on that parcel (day the spray was applied)
- For 14 days after spraying, that parcel is "contaminated"

```ts
// Added to Parcel type:
pesticideSprayedDay?: number;  // day pesticide was last applied
```

**Health calculation:**
```ts
function computeHiveHealth(colmenaId: string, parcels: Parcel[], currentDay: number): number {
  const linked = parcels.filter(p => p.linkedColmenaId === colmenaId);
  if (linked.length === 0) return 1.0;
  
  const contaminated = linked.filter(p => 
    p.pesticideSprayedDay !== undefined && 
    currentDay - p.pesticideSprayedDay < 14
  ).length;
  
  const contaminationRatio = contaminated / linked.length;
  return Math.max(0.2, 1.0 - contaminationRatio * 0.8);
}
```

Minimum health is **0.2** (colony survives but barely contributes). Full recovery after 14 days from last spray on any linked parcel.

### 4b. Health Display

In the Apiary card, show a health bar:
- Green (80–100%): "Healthy"
- Amber (50–79%): "Pesticide stress"
- Red (20–49%): "Colony struggling"

If any linked parcel was sprayed in the last 14 days, show: *"🚨 Pesticide detected — reducing pollination for X more days"*

---

## 5. Honey Production — Seasonal Modifiers

The current honey `productionRate: 0.08` is flat year-round. Add a seasonal multiplier applied in `advanceDay()` when collecting bee production:

| Season | Multiplier | Reason |
|--------|-----------|--------|
| Spring | ×1.2 | Peak nectar flow, colony building |
| Summer | ×1.0 | Good production, summer dearth late season |
| Autumn | ×0.7 | Declining nectar, bees building winter stores |
| Winter | ×0.0 | Bees cluster — no foraging, no production |

**Weather modifiers** (applied on top of season multiplier):

| Event | Honey modifier |
|-------|---------------|
| Rainy week (rain event active) | ×0.8 (bees can't forage in rain) |
| Heat wave | ×0.9 (flowers wilt faster) |
| Drought | ×0.7 (reduced nectar availability) |

These stack multiplicatively: spring + drought = ×1.2 × ×0.7 = ×0.84.

**Winter notification:** When season transitions to Winter, if player has bees: *"🐝 Your bees are entering winter cluster — no honey production until spring."*

---

## 6. Swarming Event

### 6a. Trigger Condition

A colmena is "neglected" if it has **0 linked parcels for 30+ consecutive days**. At each season change, neglected colmenas have a **25% chance** of a swarm event.

### 6b. Event Outcome

Swarm event fires as a news item:
> *"🐝 Swarm! A colony at [Apiary Name] has swarmed — 25% of your bees have left. Link this apiary to fields to prevent future swarms."*

Effect: 25% of bee animals (`typeId === 'abeja'`) assigned to that colmena are removed from `animals[]`. Handled via same die-off mechanism already used for bee colony collapse.

### 6c. Prevention

Linking even a single parcel to the colmena resets the neglect counter. The system rewards any use, not necessarily optimal use.

---

## 7. State Changes

### 7a. CropType additions (`data/cropTypes.ts`)

```ts
interface CropType {
  // ... existing fields ...
  pollinationBonus: number;  // 0.0–0.30; yield multiplier bonus at full hive health
}
```

Add `pollinationBonus` to every crop entry (see §2 for values). Zero-value entries still need the field for TypeScript — set `pollinationBonus: 0`.

### 7b. Parcel additions (`types/index.ts`)

```ts
// Added to Parcel type:
linkedColmenaId?: string;       // building ID of assigned apiary
pesticideSprayedDay?: number;   // day pesticide was last applied on this parcel
```

### 7c. No new global state

Hive health is computed on-the-fly in `advanceDay()` — not stored. No new global state fields. No save key bump needed (new parcel fields default to `undefined`).

### 7d. Neglect tracking

Track days-since-linked per colmena as a derived value, not stored. At each `advanceDay()`, check if colmena has any linked parcels. If not, increment a local counter (stored per-session in a transient map). Reset on first link.

Actually: since the game doesn't persist derived state between loads, track via:
```ts
colmenaNegligenceStartDay?: Record<string, number>;  // colmenaId → day it became unlinked
```
Added to GameState. Default `{}`. Set when last parcel is unlinked from a colmena; cleared when a parcel is linked.

---

## 8. UI Changes

### 8a. Animals Tab — Bees / Apiary Section

Add a dedicated **"Apiary Management"** card in the Animals screen (alongside the existing animal type groupings):

```
🐝 Apiary Management
─────────────────────────────────────────────
Small Apiary          ████████░░  Health: 78%
  Linked: North Field, East Hill, Orchard   
  ⚠️ East Hill sprayed 6 days ago          
  Honey this season: 14 kg                  
  [Manage Links]                            
─────────────────────────────────────────────
Medium Apiary         ██████████  Health: 100%
  Linked: 4 parcels (8 capacity)            
  [Manage Links]                            
```

### 8b. Manage Links Bottom Sheet

Full-screen-height bottom sheet with:
- Colmena name + capacity used/total
- List of all owned parcels with checkboxes
- Each row: parcel name, hectares, current crop, whether it's a bee-benefiting crop (🐝 icon), pesticide status
- Warning if linking would exceed capacity

### 8c. Fields Parcel Cards

Add to each parcel card:
- 🐝 icon if `linkedColmenaId` is set
- Red ⚠️ badge on the bee icon if `pesticideSprayedDay` within last 14 days
- Tapping the 🐝 icon navigates to Apiary Management filtered to that colmena

### 8d. Harvest Summary

When a pollination-benefiting crop is harvested on a linked parcel, the DaySummaryModal includes:
> *"+18% pollination bonus from apiary (sunflower)"*

---

## 9. Implementation Order

### Phase 1 — Data
1. Add `pollinationBonus: number` to `CropType` interface and all entries in `cropTypes.ts`
2. Add `linkedColmenaId?` and `pesticideSprayedDay?` to `Parcel` type
3. Add `colmenaNegligenceStartDay: Record<string, number>` to `GameState` (default `{}`)
4. Add `linkParcelToColmena(parcelId, colmenaId | null)` store action

### Phase 2 — Logic
5. Implement `computeHiveHealth(colmenaId, parcels, currentDay)` in `engine/pollination.ts`
6. In `advanceDay()` harvest block: apply `pollinationBonus × hiveHealth` to yield
7. In `advanceDay()` animal production block: apply seasonal + weather honey multipliers
8. In `advanceDay()` spray block: set `pesticideSprayedDay` on sprayed parcel if it has a linked colmena; log notification if health drops significantly
9. In `advanceDay()` season change block: check swarming conditions, fire event

### Phase 3 — UI
10. Add "Apiary Management" card to Animals screen
11. Build `ManageLinksSheet.tsx` — parcel linking bottom sheet
12. Add 🐝 icon + pesticide badge to Fields parcel cards
13. Update DaySummaryModal to include pollination bonus line in harvest events

---

## 10. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Spatial radius | Player-assigned linking — no map needed |
| 2 | Swarming mechanic | Simple penalty event (25% bee loss), no catching action |
| 3 | Tomatoes/grapes bonus | +5% (honeybees marginally helpful for these crops) |
| 4 | Hive health storage | Derived on-the-fly, not stored in state |
| 5 | No pollination = no penalty | Missing pollination = missed bonus only, not a yield debuff |
| 6 | Winter honey | ×0 multiplier — no production during winter cluster |

---

## 11. Out of Scope

- Queen bee management (queen replacement, queen rearing)
- Varroa mite disease mechanic
- Multiple bee breeds / genetics
- Cross-pollination between neighboring farms (co-op feature)
- Manual swarm-catching action
- Beekeeper worker specialty bonus

---

## 12. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/pollination.ts`, `components/animals/ApiaryManagementCard.tsx`, `components/animals/ManageLinksSheet.tsx` |
| **Modify** | `data/cropTypes.ts` (add `pollinationBonus`), `types/index.ts` (Parcel + GameState), `store/useGameStore.ts` (action + advanceDay), `app/(tabs)/animales.tsx` or Animals screen (add apiary card), Fields parcel cards (bee icon) |
| **No change** | Honey extraction suite, honey room, wax workshop (all continue as-is) |
