
# Active Soil Degradation & Restoration

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-16-npk-drainage-soil-rework-design.md` (soil dimensions), `2026-05-10-precision-agriculture-design.md` (soilAnalysis), `2026-04-13-climate-depth-recurring-contracts-design.md` (WeatherEvent types)

---

## 1. Executive Summary

The game has 5 soil dimensions (N, organic matter, compaction, pH, microbial life) but they're effectively static — set once, never degrade from bad practices. This spec makes them **dynamic consequences of player decisions** over time.

Four degradation pathways are added:
- **Compaction** from running heavy machinery on wet soil
- **Salinization** from over-irrigation in dry conditions
- **Acidification** from excess NPK fertilizer over time
- **Erosion** from leaving fields bare between crops

Each has a visible degradation rate, a visible recovery path, and yield consequences that compound over 2–3 seasons. Poor farming becomes self-punishing.

---

## 2. Degradation Pathways

### 2a. Compaction (from wet-tillage)

**Wet soil detection:** The existing `WeatherEvent` types (`'rain'`, `'heavy_rain'`) and `streakDay` field are used to compute how long soil stays wet after rainfall. No new weather state needed — just a per-parcel `soilWetUntilDay` set when a rain event fires:

| Rainfall | `soilWet` Duration |
|----------|--------------------|
| Single `rain` | 2 days |
| `rain` streak (2+ days) | 3 days |
| Single `heavy_rain` | 4 days |
| `heavy_rain` streak (2–3 days) | 5–7 days |

```ts
// Set in advanceDay() when rain event fires:
parcel.soilWetUntilDay = currentDay + wetDuration(event, streakDay ?? 1);

function wetDuration(event: WeatherEvent, streakDay: number): number {
  if (event === 'heavy_rain') return Math.min(4 + streakDay, 7);
  if (event === 'rain') return streakDay >= 2 ? 3 : 2;
  return 0;
}
```

**Trigger:** Any heavy machinery operation (tractor, harvester) on a parcel where `currentDay < parcel.soilWetUntilDay`.

**Effect:** Each wet-soil machinery operation increases `soilCompaction` by **+0.08**.

**Consequence:**
- Irrigation efficiency: `× (1 - compaction × 0.5)`
- Yield modifier: `yieldModifier -= compaction × 0.3`
- At `compaction > 0.7`: plow pan forms — permanent −15% yield until subsoiling

**Recovery:**
- Natural: `compaction -= 0.01/day` when no machinery operated (worm activity, freeze-thaw). Min 0.
- Active: Subsoiling tractor operation removes **−0.4 compaction** instantly (deep ripper implement, high fuel)

**UI:** `💧` badge on parcel card while `soilWetUntilDay > currentDay`, with tooltip: *"Soil wet — machinery compaction risk"*

---

### 2b. Salinization (from over-irrigation)

**Trigger:** Irrigation on a parcel when:
- Season is Summer **or** active `drought` weather event
- AND parcel has been irrigated 5+ times in the last 30 days without a rain event to leach salts

**Effect:** Each qualifying irrigation: `soilSalinity += 0.04`

**Consequence:**
- Germination penalty: at `salinity > 0.3`, seed replanting cost +20% (seeds die)
- Yield modifier: `yieldModifier -= salinity × 0.4`
- At `salinity > 0.8`: field salt-burned — no crop growth until treated

**Recovery:**
- Natural: very slow, `−0.005/day` only if no irrigation applied
- Active: **Leaching flush** (heavy over-irrigation, wastes water, removes −0.3 salinity) or **Gypsum** (purchased input, removes −0.5 salinity)

---

### 2c. Acidification (from over-fertilization)

**Trigger:** NPK fertilizer applied on a parcel already at `soilpH < 6.0`. Each application in this state drops pH further.

**Effect:** Over-fertilization application: `soilpH -= 0.15` (beyond normal baseline −0.05/application).

**Consequence:**
- pH < 5.5: microbial activity suppressed (−20% organic matter gain rate)
- pH < 5.0: phosphorus lockup — fertilizer gives 50% less N uptake
- pH < 4.5: severe yield penalty (−40%)

**Recovery (active only):**
- Agricultural lime: `soilpH += 0.3` per application, max 2×/year
- Dolomitic lime: `soilpH += 0.3 AND organicMatter += 0.05` (premium option)

---

### 2d. Erosion (from bare fields)

**Trigger:** Parcel with no planted crop AND no cover crop for 14+ consecutive days (`bareDayCtr >= 14`).

**Effect:**
- Rain event on bare field: `topsoilErosion += 0.05`
- `drought` weather + bare field: `topsoilErosion += 0.02/day` (wind erosion)

**Consequence:**
- Permanently reduces max fertility: `fertilityMax = 25 - Math.floor(topsoilErosion × 10)`
- Organic matter gain rate halved
- At `erosion > 0.5`: yield cap permanently −20%

**Recovery:** None — topsoil loss is permanent. Prevention is the only strategy.

**Prevention:** Cover crops reset `bareDayCtr` to 0. Any planted crop resets it too.

---

## 3. Parcel State Additions

```ts
// Added to Parcel type in types/index.ts:
soilCompaction: number;       // 0.0–1.0, default 0.1
soilSalinity: number;         // 0.0–1.0, default 0.0
topsoilErosion: number;       // 0.0–1.0, default 0.0
soilWetUntilDay: number;      // day after which soil is no longer wet, default 0
bareDayCtr: number;           // consecutive days with no crop or cover, default 0
recentIrrigationDays: number[]; // rolling 30-day list of days irrigation was applied
```

Note: `soilpH` already exists from the NPK spec. `soilCompaction` may already exist as a partial field — if so, convert from static to dynamic.

---

## 4. Cover Crop Mechanic

A new crop category — planted for soil protection, never harvested for sale.

| Cover Crop | Growth Days | Effect |
|------------|-------------|--------|
| Winter rye | 30 | Resets `bareDayCtr`, `+0.01` organic matter/day |
| Clover | 45 | Resets `bareDayCtr`, `+0.008` N/day, `+0.005` microbial |
| Mustard (biofumigant) | 20 | Resets `bareDayCtr`, suppresses soil pests |

Cover crops use `category: 'cover'` in `CropType`. They have no `basePrice` and cannot be sold. They are terminated (plowed/rolled) before the next main crop using the existing "clear field" action. No new UI needed — same planting flow, just a filtered category.

---

## 5. Corrective Inputs

New purchasable inputs in Shop → Inputs:

| Input | Cost | Effect | Limit |
|-------|------|--------|-------|
| Agricultural lime | €120/ha | `soilpH += 0.3` | Max 2×/year |
| Dolomitic lime | €180/ha | `soilpH += 0.3`, `organicMatter += 0.05` | Max 2×/year |
| Gypsum | €150/ha | `soilSalinity -= 0.5` | As needed |
| Leaching flush | €80/ha | `soilSalinity -= 0.3` (water cost) | As needed |
| Subsoiling job | €200/ha | `soilCompaction -= 0.4` | As needed |

---

## 6. Yield Integration

All degradation modifiers stack multiplicatively in `engine/crops.ts` `harvestYield()`, applied after all existing modifiers (fertility, fertilizer, weeds, climate, machinery bonuses):

```ts
const degradationMod =
  (1 - parcel.soilCompaction * 0.3) *
  (1 - parcel.soilSalinity * 0.4) *
  (1 - parcel.topsoilErosion * 0.2);

yield *= degradationMod;
```

---

## 7. advanceDay() Integration

Each day per parcel:
1. **Wet soil flag:** On rain/heavy_rain event, set `soilWetUntilDay` using `wetDuration(event, streakDay)`
2. **Compaction recovery:** If no machinery today, `compaction = Math.max(0, compaction - 0.01)`
3. **Bare field tracking:** If no crop and no cover crop, `bareDayCtr++`; else reset to 0
4. **Erosion check:** If rain event and `bareDayCtr >= 14`, `topsoilErosion += 0.05`
5. **Wind erosion:** If drought weather and `bareDayCtr >= 7`, `topsoilErosion += 0.02`
6. **Irrigation tracking:** Prune `recentIrrigationDays` to last 30 days; check salinization trigger on irrigation action
7. **Acidification:** On fertilizer application, check `soilpH < 6.0` and apply extra pH drop

---

## 8. UI Indicators

Each parcel card gets a soil warning strip below the crop status:

```
[💧 Wet 3d]  [🟡 Compaction 45%]  [🔴 pH 4.8]  [⚠️ Bare 18d]
```

- Warnings appear only above threshold (compaction > 0.3, pH < 5.5, bare > 7 days, salinity > 0.2)
- Tapping a warning shows a tooltip with cause + fix
- DaySummaryModal includes degradation events: *"🌧️ Rain eroded North Field (bare 21 days) — plant a cover crop to prevent further loss"*

---

## 9. Implementation Order

### Phase 1 — State
1. Add parcel fields: `soilCompaction`, `soilSalinity`, `topsoilErosion`, `soilWetUntilDay`, `bareDayCtr`, `recentIrrigationDays`
2. Add cover crops to `cropTypes.ts` (category: `'cover'`, no `basePrice`)
3. Add corrective inputs to shop item list

### Phase 2 — Logic
4. `engine/soilDegradation.ts` — pure functions: `wetDuration()`, `applyWetTillageCompaction()`, `checkSalinization()`, `checkErosion()`, `applyNaturalRecovery()`
5. Update `advanceDay()` to call degradation checks
6. Update `harvestYield()` in `engine/crops.ts` to apply `degradationMod`
7. Wire corrective input purchases to parcel state changes
8. Check `soilWetUntilDay` in machinery operation before applying compaction penalty

### Phase 3 — UI
9. Add warning strip to parcel cards (💧 wet indicator + degradation badges)
10. Add degradation tooltip component
11. Add cover crop category to planting flow (filtered crop selector)
12. Add corrective inputs to DaySummaryModal events

---

## 10. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Wet soil duration | Scales with `WeatherEvent` type and `streakDay` — uses existing climate data, no new fields |
| 2 | Erosion permanence | Topsoil loss is permanent — forces prevention strategy, not a "neglect then fix" loop |
| 3 | Compaction machinery scope | Only heavy machinery (tractor, harvester). Manual/light work doesn't compact. |
| 4 | Cover crops | Separate `'cover'` crop category — same planting UI, never harvested |
| 5 | Warning threshold | Shown at moderate levels only — avoids overwhelming new players |
| 6 | Forecast integration | `soilWetUntilDay` naturally syncs with forecast visibility — player can plan ahead |

---

## 11. Out of Scope

- Soil texture types (clay/loam/sand)
- Subfield variability within a parcel
- Heavy metal contamination
- Soil carbon credits
- Drainage tile systems (separate water spec)

---

## 12. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/soilDegradation.ts` |
| **Modify** | `types/index.ts` (Parcel fields), `data/cropTypes.ts` (cover crop entries), `engine/crops.ts` (degradation multiplier in `harvestYield`), `store/useGameStore.ts` (advanceDay degradation logic + corrective input actions), Fields parcel cards (wet badge + warning strip) |
| **No change** | NPK system, irrigation trigger (triggers degradation but not modified internally) |
