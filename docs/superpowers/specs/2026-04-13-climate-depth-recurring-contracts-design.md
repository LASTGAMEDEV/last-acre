# Climate Depth & Recurring Contracts — Design Spec
**Date:** 2026-04-13
**Status:** Approved

---

## Overview

Two independent systems that add realism depth to Granja Tycoon:

1. **Climate Depth** — temperature layer + multi-day weather streaks + probabilistic forecast accuracy. Frost can kill crops, drought depletes soil moisture, and the 7-day forecast degrades in accuracy as it looks further ahead. All existing mitigation tools (irrigation, insurance, forecast) gain real weight.

2. **Recurring Contracts** — persistent buyer relationships with 4 tiers (New → Regular → Preferred → Exclusive). Consistent on-time delivery unlocks better price bonuses, larger order sizes, and disaster grace periods. Two consecutive missed deliveries cancels the contract and drops the tier.

These systems are independent and can be implemented in any order.

---

## System 1: Climate Depth

### Goals
- Weather events last multiple days (streaks), not just single-day multipliers
- Each day has a min/max temperature that scales frost and heat damage
- 7-day forecast shows probability that degrades with distance — day 7 is ~45% accurate
- Crops accumulate frost damage or drought stress over consecutive bad days
- Existing irrigation, insurance, and forecast tools become genuinely useful

### Data Model Changes

#### `WeatherDay` — 4 new fields
```ts
type WeatherDay = {
  event: WeatherEvent      // existing
  minTemp: number          // NEW: Celsius
  maxTemp: number          // NEW: Celsius
  probability: number      // NEW: 0.0–1.0 forecast accuracy
  streakDay?: number       // NEW: which day of streak this is (1–7)
}
```

#### `CropType` — 3 new fields
```ts
frostKillTemp: number      // min temp that kills crop (e.g. -5°C for corn, -12°C for winter wheat)
heatStressTemp: number     // max temp causing stress (e.g. 36°C)
droughtTolerance: number   // 0–1 (sunflower = 0.8, rice = 0.1)
```

#### `PlantedCrop` — 3 new fields
```ts
frostDamage: number        // 0–1 accumulated frost damage
droughtStress: number      // 0–1 accumulated drought stress
moistureLevel: number      // 0–1 soil moisture (default 0.7)
```

### Temperature Ranges by Season

| Season | Min range | Max range |
|--------|-----------|-----------|
| 🌸 Spring | −3°C to 15°C | 8°C to 25°C |
| ☀️ Summer | 10°C to 22°C | 25°C to 40°C |
| 🍂 Autumn | 0°C to 15°C | 10°C to 25°C |
| ❄️ Winter | −15°C to 5°C | −5°C to 12°C |

Temperature is drawn from the seasonal range and then adjusted by event type:
- `frost` → forces `minTemp < 0`
- `drought` → forces `maxTemp > 32`
- `perfect` → `minTemp` 15–22, `maxTemp` 22–28
- Other events → moderate ranges within season

### Multi-Day Streak Durations

| Event | Duration | Damage type |
|-------|----------|-------------|
| 🧊 Frost | 1–5 days (avg 2) | Frost accumulation |
| ☀️ Drought | 3–14 days (avg 7) | Moisture depletion |
| 🌧️ Heavy rain | 1–3 days | Waterlogging (−yield) |
| 💨 Hail | 1–2 days | Immediate yield loss |
| 🌤️ Perfect | 1–4 days | Yield bonus (capped +40%) |
| All others | 1 day | Existing multiplier only |

Streaks are generated at forecast creation time. Each day in a streak references `streakDay` (1-based) and the total streak length for UI display.

### Probabilistic Forecast

| Forecast day | Accuracy | Behaviour |
|---|---|---|
| Today | 100% | Deterministic |
| +1 day | 95% | Nearly certain |
| +2 days | 85% | Very likely |
| +3–4 days | 70% | Probable |
| +5–6 days | 55% | Uncertain |
| +7 days | 45% | Rough estimate |

When a forecast day arrives, roll against its stored `probability`. On failure, re-draw weather from the current season's weighted distribution. The forecast tile shows its probability percentage. Low-confidence tiles (≤55%) display a visual indicator of uncertainty.

### Frost Damage Model

Frost damage accumulates on `PlantedCrop.frostDamage` each day the event type is `frost`:

| Min temperature | Damage added per day |
|---|---|
| 0°C to −2°C | +5% |
| −2°C to −5°C | +15% |
| −5°C to −10°C | +30% |
| Below −10°C | +50% |

**Kill thresholds by crop category:**

| Crop category | `frostKillTemp` |
|---|---|
| Winter wheat, kale | −12°C |
| Root vegetables | −6°C |
| Corn, soy, sunflower | −4°C |
| Fruits, grapes | −3°C |
| Herbs, basil, vanilla | −1°C |
| Lavender, saffron | −8°C |

**Seedling vulnerability:** Crops in their first 10 days of growth are treated as having `frostKillTemp + 3°C` (more vulnerable). Crops ready for harvest are treated as `frostKillTemp − 2°C` (slightly hardier).

**Damage outcomes:**
- `frostDamage` 0–0.49 → yield penalty: `× (1 − frostDamage × 0.7)`
- `frostDamage` 0.5–0.99 → heavy loss, red warning shown on parcel
- `frostDamage ≥ 1.0` → crop killed, parcel cleared, insurance claim triggered if policy active

### Drought & Soil Moisture Model

`moistureLevel` starts at 0.7. It changes each day:

| Condition | Moisture change |
|---|---|
| Rain | +15% to +20% |
| Heavy rain | +25% |
| Drought | −8% |
| Sunny | −3% |
| Drip irrigation assigned | Caps loss at −1%/day |
| Sprinkler/pivot assigned | Reduces normal loss by 70% |

`droughtStress` accumulates when `moistureLevel < 0.3`:

| Moisture level | Stress added per day |
|---|---|
| 20–30% | +2% |
| 10–20% | +5% |
| Below 10% | +10% |

Stress accumulation is multiplied by `(1 − cropType.droughtTolerance)`. A sunflower (tolerance 0.8) accumulates 80% less stress. Rice (tolerance 0.1) accumulates 90% of the full stress rate.

**Drought outcome:** Yield penalty `× (1 − droughtStress × 0.8)`. No hard kill — drought stress alone never destroys a crop entirely.

### Harvest Formula Change

The existing harvest formula gains two new multipliers at the end:

```
yield = hectares × baseYield
      × fertilityMod × fertilizerMod × weedMod
      × climateModifier × machineYieldBonus
      × (1 − frostDamage × 0.7)        ← NEW
      × (1 − droughtStress × 0.8)      ← NEW
```

### Forecast UI Changes

- Each forecast tile shows: event icon, min/max temp, probability %
- Frost streak tiles: red border, streak counter ("day 2/3")
- Probability ≤55%: tile visually dimmed/uncertain
- Parcel overlay: warning icon when frost is forecast within 3 days and a vulnerable crop is in the ground
- Clima screen: existing 7-day forecast updated with temp ranges and probabilities

### Mitigation (nothing new to build)

| Tool | Effect |
|---|---|
| 7-day forecast | See streaks early, harvest before frost |
| Irrigation machinery | Concrete moisture protection during drought |
| Weather insurance | Auto-triggers on frost kill / drought claim |
| Crop selection | Cold-tolerant crops survive winters |

---

## System 2: Recurring Contracts

### Goals
- Buyers are persistent entities with a relationship tier that grows with consistent delivery
- 4 tiers: New, Regular, Preferred, Exclusive — each with better bonuses and larger order caps
- Two consecutive missed deliveries cancels the contract and drops the tier one level
- Disaster grace periods protect player relationships when weather insurance triggers
- 8 unique buyers with different crop preferences, order frequencies, and unlock conditions

### Data Model Changes

#### New type: `BuyerTier`
```ts
type BuyerTier = 'new' | 'regular' | 'preferred' | 'exclusive'
```

#### New type: `Buyer`
```ts
type Buyer = {
  id: string
  name: string
  emoji: string
  cropIds: string[]          // accepted crop IDs (or 'any' / 'organic')
  tier: BuyerTier
  deliveryStreak: number     // consecutive on-time deliveries
  totalDeliveries: number    // all-time count (used for tier gates)
  missedInARow: number       // resets on success; 2 = cancel + tier drop
  unlockedDay: number        // day player can first sign with this buyer
  requiresReputation?: number
  requiresCertification?: 'certified' | 'organic'
}
```

#### New type: `RecurringContract`
```ts
type RecurringContract = {
  id: string
  buyerId: string
  cropId: string
  amountPerDelivery: number   // kg
  frequencyDays: 7 | 14 | 30
  priceBonus: number          // 0.20–0.40
  nextDeliveryDay: number
  deliveryWindowDays: number  // days to fulfill each cycle
  durationSeasons: number     // 1–4 seasons
  startDay: number
  endDay: number
  active: boolean
  graceDaysRemaining: number  // extended when insurance triggers
}
```

#### `useGameStore` additions
```ts
buyers: Buyer[]               // initialized with 8 buyers at game start
recurringContracts: RecurringContract[]
```

### Relationship Tier Rules

| Tier | Unlock gate | Price bonus | Max order | Window | Grace period |
|---|---|---|---|---|---|
| 🆕 New | Starting tier | +20% | 500 kg | 7 days | 0 days |
| ⭐ Regular | 3 on-time deliveries | +27% | 1,500 kg | 5 days | 3 days |
| 🌟 Preferred | 8 total deliveries | +33% | 4,000 kg | 4 days | 7 days |
| 💎 Exclusive | 15 total deliveries | +40% | Unlimited | 3 days | 14 days |

**Tier upgrades:** Check on every successful delivery. `totalDeliveries` is the gate — it never decreases.

**Tier downgrades:** Only on contract cancellation (2 consecutive misses). Tier drops one level. If already New, stays New.

**Partial delivery:** ≥80% of `amountPerDelivery` counts as on-time (paid for quantity delivered, streak continues). <80% = missed.

### Delivery Lifecycle

```
Window opens (nextDeliveryDay set)
  → Player delivers crop before window closes
    → On time: streak +1, totalDeliveries +1, check tier upgrade, schedule next window
  → Window closes without delivery (or <80%)
    → missedInARow +1, deliveryStreak = 0
    → If graceDaysRemaining > 0: extend window by grace days, don't count as miss
    → If missedInARow >= 2: cancel contract, buyer.tier drops one level, missedInARow = 0
```

### Disaster Grace Period

When a weather insurance claim resolves (frost kill, drought loss, hail damage):
- All active `RecurringContract`s receive `graceDaysRemaining += buyer.tier's grace days`
- Grace requires an active insurance policy on the affected crop type
- During grace: window extension only — no streak protection, no free delivery

### The 8 Buyers

| Buyer | Crops | Frequency | Unlocks | Notes |
|---|---|---|---|---|
| 🥖 Local Bakery | Wheat, Corn | Weekly | Day 1 | Starter buyer, forgiving |
| 🍽️ City Restaurant | Lavender, Saffron, Vanilla | Biweekly | Rep 40 | Premium crops only |
| 🏭 Export Processor | Bulk grains | Monthly | Rep 60 | Large volumes |
| 🥛 Dairy Distributor | Milk, Cheese, Butter | Weekly | First dairy building | Milk grade affects accepted qty |
| 🌿 Organic Market | Any organic-certified crop | Weekly | First organic cert | Cancels if certification drops |
| 🛒 Regional Supermarket | Mixed (seasonal) | Biweekly | Day 30 | Lowest penalty, accepts variety |
| 🍺 Distillery | Barley, Corn, Sugarbeet | Monthly | Rep 50 | Accepts low-grade excess |
| 🐾 Pet Food Co. | Any crop | Weekly | Day 1 | Safety net — reduced tier bonuses: New +15%, Regular +20%, Preferred +25%, Exclusive +30% |

**Special rule — Organic Market:** If the building supplying the crop loses its organic certification, the contract is immediately cancelled (no warning period). This makes certification maintenance high-stakes.

**Special rule — Dairy Distributor:** `amountPerDelivery` is adjusted each cycle based on current milk grade. Grade A = full amount accepted. Grade B = 85%. Grade C = 60%.

### UI Integration

**Economy screen → new "Supply" sub-tab** (alongside Market / Auto-Sell / Stats / Futures / Orders):
- Buyers list with tier badge, streak pips, and active contract status
- "Sign contract" flow: choose crop, amount, frequency, duration → confirm
- Active contract card: streak bar, next delivery countdown, stock check, grace status

**Calendar screen:** Recurring delivery deadlines appear as markers alongside seasonal events.

**HUD warning strip:** Existing warning strip gets a new entry type: `"⚠️ Delivery due in Xd — [Buyer Name]"` when within 3 days of a delivery window closing.

**Notification on window open:** Day-of notification when a new delivery window opens so the player knows to start stocking.

---

## Implementation Notes

### Climate — engine/climate.ts changes
- `generateForecast()` adds temperature draw + streak generation + probability assignment
- `applyDailyWeather()` updates `moistureLevel`, accumulates `frostDamage` and `droughtStress` on all planted crops
- `advanceDay()` in store triggers both updates

### Climate — engine/crops.ts changes
- `calculateHarvestYield()` multiplies by `(1 − frostDamage × 0.7) × (1 − droughtStress × 0.8)`
- Auto-kill: if `frostDamage ≥ 1.0`, remove crop from parcel and trigger insurance check

### Contracts — engine/contracts.ts additions
- `initBuyers()` — creates the 8 buyer objects at game start
- `checkRecurringDeliveries(day)` — called from `advanceDay()`; checks open windows, applies grace, cancels if 2 misses
- `deliverToRecurringContract(contractId, amount)` — handles partial delivery logic, streak update, tier check
- `applyDisasterGrace(claimedCropType)` — called when insurance resolves, extends windows

### Contracts — New store state
- `buyers: Buyer[]` — initialized on new game, persisted
- `recurringContracts: RecurringContract[]` — active + historical contracts

---

## Out of Scope (this spec)

- Growing degree day system (crop ripeness affected by temperature accumulation) — future spec
- Worker fatigue from weather events — future spec
- Buyer NPC dialogue / personality flavor — future spec
- More than 8 buyers — designed to be extendable, not in this pass
