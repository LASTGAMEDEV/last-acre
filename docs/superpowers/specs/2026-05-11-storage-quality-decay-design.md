
# Storage Quality Decay

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-19-processing-system-design.md` (processing chain), `2026-04-19-selling-channels-design.md` (quality grades + selling)

---

## 1. Executive Summary

Grain and perishables decay by completely different mechanisms. **Grain** (wheat, corn, barley, etc.) is stable for months when dry — the threat is moisture content at harvest causing mold, pest infestation over time in warm conditions, and hot-spot risk in large summer silos. **Perishables** (tomatoes, strawberries, potatoes) start degrading within days of harvest regardless of conditions and require cold chain or rapid processing/sale.

This spec adds post-harvest quality tracking that creates genuine urgency around timing decisions without making storage feel arbitrarily punishing.

---

## 2. Quality Grades

All harvestable goods carry a quality grade that multiplies their sell price:

| Grade | Sell Multiplier | Description |
|-------|----------------|-------------|
| Premium | × 1.20 | Perfect conditions — timing + weather + machinery |
| Standard | × 1.00 | Normal quality baseline |
| Low | × 0.70 | Moisture damage, minor pest activity, or overripe |
| Damaged | × 0.40 | Significant mold, heavy infestation, or long overripe |
| Condemned | × 0.00 | Unusable — mycotoxin contamination or full pest infestation |

Condemned goods incur a **€30/tonne disposal cost** (can't just be left in the silo).

---

## 3. Grain Storage (Moisture-Driven Decay)

Grains: wheat, barley, oats, corn, rice, sorghum, rye, buckwheat.

### 3a. Harvest Moisture

The single most important factor. Determined at harvest by weather conditions — not time of day (for Spanish continental climate, mid-afternoon natural drying means grain is driest in the afternoon heat, but the game abstracts this to daily weather):

| Harvest Conditions | Moisture State | Starting Quality |
|-------------------|---------------|-----------------|
| No rain in last 3 days + sunny/perfect weather | `'dry'` | Standard or Premium |
| Rain in last 1–2 days | `'wet'` | Low |
| Harvested during active rain event | `'saturated'` | Damaged |

**Premium conditions** (all must be met):
- Crop harvested within 5 days of full maturity
- `'dry'` moisture state
- Harvester machinery used (not manual)
- No disease active on parcel

### 3b. Wet/Saturated Grain Decay

Wet or saturated grain in storage develops mold rapidly:

| Moisture | Decay Rate | Effect |
|----------|-----------|--------|
| `'wet'` | −1 grade every 10 days | Mold growth at elevated moisture |
| `'saturated'` | −1 grade every 4 days | Rapid mold + mycotoxin risk |

Decay stops when grain is dried (see §3d).

At `'Condemned'`: mycotoxin contamination confirmed — disposal required. **If condemned grain is in the same silo as other batches and not removed within 7 days**, other batches in the silo downgrade by 1 grade (cross-contamination).

### 3c. Pest Infestation (Grain Weevils & Beetles)

Any grain batch stored for **60+ days** in summer conditions (Season is Summer) has a daily infestation chance:

```ts
const pestChance = season === 'summer' ? 0.008 : 0.003;  // per day
// ~40% chance by day 120 in summer, ~15% in other seasons
```

Once infested:
- Notification: *"🐛 Grain weevil activity detected in storage — treat or move within 14 days"*
- Grade drops −1 every 14 days until treated
- Infestation also generates heat (contributes to hot spot risk)

**Treatment:**
| Method | Cost | Effect |
|--------|------|--------|
| Fumigation | €200 flat | Eliminates infestation immediately |
| Cold storage building | €22,000 | Prevents infestation entirely (temperature < 10°C) |

### 3d. Hot Spot Risk

Applies to grain batches stored 90+ days during Summer with quantity > 20 tonnes in one silo:

```ts
const hotspotChance = 0.01;  // 1% per day — ~26% over a month
```

Notification: *"🌡️ Hot spot forming in [Silo] — aerate immediately or risk fire"*

If unaddressed for 7 days: **50% of silo contents condemned**. Remaining 50% drops to Damaged. Insurance claim possible if fire insurance is active.

**Prevention:**
- Aeration fan upgrade (€3,000 per silo): eliminates hot spot risk
- Cold storage building: eliminates hot spot risk

### 3e. Dry Grain Long-Term

Properly dried grain (`'dry'` or dried from `'wet'`) with no pest infestation: **no time-based decay**. It can be stored indefinitely at Standard or Premium grade. This is realistic — dry wheat in a sealed silo can last years.

---

## 4. Perishable Storage (Time-Driven Decay)

Perishables: tomatoes, potatoes, strawberries, and any other fresh produce not classified as grain or dried goods.

### 4a. Shelf Life Windows

Decay is time-driven regardless of harvest conditions:

| Storage Type | Safe Window | Decay After |
|-------------|-------------|-------------|
| Ambient (no building) | 7 days | −1 grade every 5 days |
| Cold storage building | 30 days | −1 grade every 10 days |

```ts
const perishableDecay = (batch: StoredBatch, currentDay: number, hasColdStorage: boolean) => {
  const safeWindow = hasColdStorage ? 30 : 7;
  const decayInterval = hasColdStorage ? 10 : 5;
  const daysOver = currentDay - batch.harvestDay - safeWindow;
  if (daysOver > 0) {
    const gradesLost = Math.floor(daysOver / decayInterval);
    // downgrade by gradesLost from starting grade
  }
};
```

### 4b. Premium Conditions for Perishables

| Condition | Requirement |
|-----------|-------------|
| Maturity timing | Harvested within 3 days of full maturity |
| Disease-free | No active disease on parcel at harvest |
| No extreme heat | No heat wave in last 2 days |

Premium perishables decay faster than Premium grain — the quality is fragile. A Premium strawberry batch left 14 days at ambient drops to Low.

### 4c. Cold Storage Building

Essential infrastructure for perishable farmers:

| Building | Cost | Effect |
|----------|------|--------|
| Cold store (small) | €15,000 | 20 tonne capacity, extends perishable life |
| Cold store (large) | €35,000 | 80 tonne capacity |

Operating cost: €40/day (electricity). Justified once you're growing significant volumes of perishables.

---

## 5. Inventory Tracking Change

Currently inventory is `Record<string, number>`. Quality tracking requires per-harvest batches:

```ts
interface StoredBatch {
  id: string;
  cropId: string;
  quantity: number;           // tonnes
  quality: QualityGrade;
  harvestDay: number;
  moisture: 'dry' | 'wet' | 'saturated';  // grain only; 'dry' for perishables
  infested: boolean;
  siloId?: string;            // which silo building it's stored in, if any
}

type QualityGrade = 'premium' | 'standard' | 'low' | 'damaged' | 'condemned';

// GameState change:
inventoryBatches: StoredBatch[];
// The old inventory: Record<string, number> is derived from batches for backward-compatible reads
```

Each harvest creates one batch. Processing and selling consume from batches (best quality first by default, but player can select).

---

## 6. Grain Drying

Players can dry wet/saturated grain to stop moisture decay:

| Method | Cost | Speed | Notes |
|--------|------|-------|-------|
| Co-op drying service | €18/tonne | Immediate | Off-farm, always available |
| Grain dryer building | €20,000 | 40t/day | On-farm, ongoing fuel cost |

Drying sets `batch.moisture = 'dry'`. Quality grade is NOT recovered by drying — the damage already done by mold remains. Drying only stops future decay.

---

## 7. advanceDay() Integration

For each stored batch daily:

**Grain:**
1. If `moisture !== 'dry'`: apply moisture decay schedule
2. If `harvestDay + 60 < currentDay` and `season === 'summer'`: pest infestation roll
3. If `harvestDay + 90 < currentDay` and `season === 'summer'` and `quantity > 20`: hot spot roll
4. If infested: apply 14-day grade decay
5. Cross-contamination check if condemned batch present in same silo

**Perishables:**
1. Apply time-decay based on days past safe window

**Notifications** (avoid spam — show once per active threat):
- New infestation: immediate notification
- Hot spot forming: immediate notification + 7-day countdown
- Perishable batch approaching expiry (3 days before end of safe window)

---

## 8. Selling & Processing UI

### 8a. Storage Overview (Processing screen — new Inventory sub-tab)

```
Stored Goods

🌾 Wheat
  8.4t  Harvested Day 312  [⭐ Premium]  Dry  €2,016  [Sell] [Process]
  3.2t  Harvested Day 290  [🟡 Low]     Wet  ⚠️ Drying needed  [Dry €58] [Sell €448]
  ─────────────────────────────────────────────────────────
  ⚠️ 3.2t at risk of pest infestation (Day 52/60 — summer)

🍅 Tomatoes
  6.0t  Harvested Day 318  [✅ Standard]  4 days left (ambient)  [Sell] [Process] [Cold store →]
  2.0t  Harvested Day 305  [🟡 Low]       Expired 9 days ago     [Sell €280] [Process]
```

### 8b. Batch Selection When Selling

When selling a crop type, player sees all available batches and can select which to sell:

```
Sell Wheat
  ● 8.4t [⭐ Premium ×1.20]  €2,016   ← auto-selected (best first)
  ○ 3.2t [🟡 Low ×0.70]     €448
[Sell selected →]
```

### 8c. Harvest Summary Quality Line

DaySummaryModal:
> *"🌾 Harvested 8.4t wheat — ⭐ Premium (dry conditions, timed correctly)"*
> *"🍅 Harvested 6.0t tomatoes — ✅ Standard — sell within 7 days"*
> *"🌽 Harvested 5.2t corn — 🟡 Low (wet harvest) — dry within 10 days or grade drops"*

---

## 9. Implementation Order

### Phase 1 — Data
1. Define `QualityGrade` type, `StoredBatch` type, grade multiplier constants
2. Replace `inventory: Record<string, number>` with `inventoryBatches: StoredBatch[]`
3. Backward-compatibility getter: derive `Record<string, number>` from batches for any existing reads

### Phase 2 — Logic
4. `engine/storageQuality.ts` — `checkMoistureDecay()`, `checkPestInfestation()`, `checkHotSpot()`, `checkPerishableDecay()`, `determineHarvestQuality()`
5. Harvest action: create `StoredBatch` — determine moisture and quality from conditions
6. `advanceDay()`: run all storage quality checks per batch
7. Dry action: set `batch.moisture = 'dry'`
8. Sell action: select batch, apply quality multiplier to price
9. Cross-contamination check for condemned grain in shared silo

### Phase 3 — UI
10. Inventory sub-tab in Processing screen
11. Quality badge display and batch selection in sell flow
12. DaySummaryModal quality lines
13. Storage threat notifications (infestation, hot spot, perishable expiry)

---

## 10. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Grain vs perishables | Completely separate decay mechanics — moisture-driven vs time-driven |
| 2 | Dry grain = no time decay | Realistic — properly dried grain is stable for years |
| 3 | Drying doesn't restore grade | Damage already done; drying only stops further decay |
| 4 | Premium requires harvester | Manual harvest = more damage and bruising; harvester gives cleaner quality |
| 5 | Cross-contamination | Condemned grain in a shared silo affects other batches — forces prompt action |
| 6 | Hot spot: summer + large quantity | Realistic trigger conditions; aeration fan is the obvious prevention investment |
| 7 | Afternoon harvest timing | For Spain: grain is driest in afternoon heat — daily weather abstraction avoids needing time-of-day (see Night Operations spec for that layer) |

---

## 11. Out of Scope

- Per-silo temperature sensor readings
- Grain protein content / test weight as a quality dimension
- Fermentation risk (separate silage system)
- Controlled atmosphere storage
- Insurance payout on condemned grain (links to insurance spec but not blocking)

---

## 12. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/storageQuality.ts` |
| **Modify** | `types/index.ts` (StoredBatch, QualityGrade, GameState inventory change), `store/useGameStore.ts` (harvest creates batch + advanceDay quality checks + drying + sell with batch selection), Processing screen (inventory sub-tab), DaySummaryModal (quality harvest lines) |
