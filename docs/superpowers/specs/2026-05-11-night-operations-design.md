
# Night Operations & Time-Optimised Scheduling

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-19-workers-design.md` (worker system), `2026-04-09-transportation-design.md` (machinery jobs), `2026-04-13-climate-depth-recurring-contracts-design.md` (season/weather)

---

## 1. Executive Summary

Spanish farming has strong time-of-day rhythms that no farming game models properly. Irrigation runs at night to exploit cheap electricity and avoid evaporation. Summer heat drives workers into a split-shift pattern (dawn start, midday siesta, dusk return). Hay is cut early morning for optimal fermentation quality. And running noisy machinery near a village at 2 AM earns genuine complaints.

This spec adds a **daily time-window scheduling layer** that rewards matching operations to their natural time slot while imposing real costs for mismatches. It's an optional depth layer — skipping it defaults to existing behaviour with no bonus or penalty.

---

## 2. Time Windows

Each in-game day has three windows. Players can optionally assign operations to specific windows when advancing the day:

| Window | Hours | Label | Climate notes |
|--------|-------|-------|---------------|
| Dawn / Dusk | 5–8 AM + 7–9 PM | `'twilight'` | Cool, low evaporation, high humidity |
| Day | 8 AM – 7 PM | `'day'` | Hot in summer, full sun |
| Night | 9 PM – 5 AM | `'night'` | Cool, noise ordinance risk |

Default (no scheduling): all operations assigned to `'day'`. No bonus, no penalty — existing behaviour preserved.

---

## 3. Time-Optimised Operations

### 3a. Irrigation — Night Bonus (Spain Standard Practice)

Running irrigation at night (`'night'` window) saves electricity and reduces evaporation loss:

```ts
if (irrigationWindow === 'night') {
  irrigationEfficiency *= 1.25;   // 25% less water needed for same effect
  electricityCost *= 0.60;        // Spanish nocturnal electricity tariff (Valle)
}
```

This is standard Spanish agricultural practice — most drip/sprinkler systems run on timers during off-peak hours. Day irrigation wastes ~20% more water to evaporation.

### 3b. Summer Heat — Worker Productivity Split

During Summer season, workers on outdoor operations in the `'day'` window suffer heat stress:

```ts
if (season === 'summer' && workerWindow === 'day') {
  effectiveWorkerHours *= 0.70;  // 30% productivity loss in Castilian 38–42°C heat
}
if (season === 'summer' && workerWindow === 'twilight') {
  effectiveWorkerHours *= 1.00;  // Full productivity at dawn/dusk
}
```

The traditional Spanish agricultural schedule (start at 6 AM, stop at 2 PM, resume at 6 PM) is modeled by assigning workers to the twilight window in summer. Players who ignore this lose 30% of their hired labour effectiveness during peak summer harvest.

Animal feeding, processing, and administrative tasks are unaffected by heat (indoor/shade work).

### 3c. Hay / Silage Cutting — Dawn Quality Bonus

For crops harvested as hay or silage (alfalfa, clover, grass), cutting in the `'twilight'` window produces higher sugar content for better fermentation:

```ts
if (cropType === 'hay' || cropType === 'silage') {
  if (harvestWindow === 'twilight') {
    qualityBonus = 'premium';  // higher sugar → better fermented feed quality
  }
}
```

Hay cut during the hot midday sun dries too fast with less sugar retention — Standard quality at best.

### 3d. Grain Harvest — Afternoon/Dry Conditions (Spanish Climate)

For grain crops, harvest quality is driven by **moisture state** (determined by recent weather — see Storage Quality spec), not time of day. No time-window bonus for grain. The relevant mechanic is already in the Storage Quality spec.

### 3e. Night Machinery — Noise Ordinance Risk

Heavy machinery (tractors, harvesters, grain dryers) operated in the `'night'` window near a settlement triggers neighbour complaints:

```ts
if (machineOperation.window === 'night' && farm.nearSettlement) {
  reputation -= 2;
  noiseComplaintsThisYear++;
  addNewsEvent("🔊 Noise complaint: machinery operating after 9 PM near village (−2 reputation)");
}
```

**Escalation:**
| Complaints this year | Consequence |
|---------------------|-------------|
| 1–2 | Reputation hit only |
| 3 | Council Warning: −10 reputation + €500 fine |
| 5+ | Night Machinery Ban: no `'night'` machinery until reputation > 60 |

**Mitigation:** Irrigation systems run silently — no noise ordinance applies. Sound barriers (hedgerows + earthworks, flagged at game start) can raise the ordinance threshold for that farm.

---

## 4. Worker Night Shift

For large operations that need 24-hour coverage (harvest season, grain drying, animal care):

```ts
// Added to Worker type:
shiftPreference: 'day' | 'night' | 'twilight' | 'any';  // assigned by player
fatigueLevel: number;    // 0.0–1.0
consecutiveNightShifts: number;
```

| Factor | Day Shift | Night Shift |
|--------|-----------|-------------|
| Wage multiplier | × 1.0 | × 1.5 |
| Fatigue accumulation | Normal | +20%/day |
| Productivity | 100% | 90% |
| Available operations | All | All except pesticide spraying (safety reg) |

**Pesticide spraying banned at night**: EU Directive on Sustainable Use of Pesticides prohibits night spraying. If player attempts: *"⚠️ Spraying is not permitted after dark — safety and drift regulations"*.

**Fatigue:**
- At 70% fatigue: −15% productivity
- At 100%: worker calls in sick (1-day absence, still paid)
- Recovery: −15% fatigue per day off
- After 5 consecutive night shifts: mandatory 2-day rest (real workers' rights law)

---

## 5. Day Planning UI (Optional Overlay)

An optional scheduling panel appears before the day resolves when the player presses "Advance Day". Can be permanently dismissed if the player finds it too granular.

```
Tomorrow's Schedule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌅 Twilight (5–8 AM / 7–9 PM)
  ✓ Harvest alfalfa — South Field (Maria)  ⭐ Quality bonus
  ✓ Animal feeding — all buildings (Pedro)

☀️  Day (8 AM – 7 PM)
  ✓ Tractor work — East Field (auto)
  ⚠️ Worker: Pedro (summer heat −30% if outdoor)

🌙 Night (9 PM – 5 AM)
  ✓ Irrigation — all parcels (auto-timer)  💧 −25% water / −40% electricity
  ○ Grain dryer — running  ⚠️ Noise near village  [Move to day →]

[Advance Day →]  [Skip (use defaults) →]
```

"Skip" assigns everything to `'day'` with no bonus/penalty. Irrigation defaults to `'night'` automatically once the player has an irrigation system (common practice, non-controversial).

---

## 6. Defaults & Automation

To avoid micromanagement fatigue, sensible defaults kick in without planning:

| Operation | Auto-default window | Reason |
|-----------|--------------------|---------| 
| Irrigation | `'night'` | Always better — no reason to irrigate in day heat |
| Animal feeding | `'twilight'` | Animals don't care, workers prefer cool |
| Machinery | `'day'` | Default safe — no noise risk |
| Harvest | `'day'` | Player must actively choose twilight for hay bonus |
| Night shift workers | Only if player explicitly assigns | Opt-in |

Irrigation auto-defaulting to `'night'` means the water efficiency bonus is passive once the player has an irrigation system — no micromanagement needed to benefit.

---

## 7. Implementation Order

### Phase 1 — Data
1. Add `shiftPreference`, `fatigueLevel`, `consecutiveNightShifts` to `Worker` type
2. Add `nearSettlement: boolean` and `soundBarriers: boolean` to `GameState` (set at game start)
3. Define window constants and per-operation window bonuses

### Phase 2 — Logic
4. `engine/nightOps.ts` — `applyWindowBonuses()`, `checkNoiseOrdinance()`, `computeWorkerFatigue()`
5. Irrigation action: apply night efficiency bonus based on scheduled window
6. `advanceDay()`: summer heat worker penalty, fatigue accumulation/recovery, noise ordinance check, consecutive night shift enforcement
7. Harvest action: apply hay/silage twilight quality bonus
8. Pesticide spray: block if `'night'` window

### Phase 3 — UI
9. Day Planning overlay (optional, skippable, persistent dismiss option)
10. Worker card: fatigue bar + shift preference toggle
11. Irrigation: auto-night indicator with efficiency summary
12. Noise ordinance warning in DaySummaryModal
13. Summer heat warning for outdoor day workers in July/August

---

## 8. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Spanish framing | Irrigation at night, summer heat split-shift, hay at dawn — not a generic night bonus |
| 2 | Grain harvest timing | No time-of-day bonus — harvest quality is weather/moisture-driven (Storage Quality spec) |
| 3 | Planning overlay optional | Skippable — defaults preserve existing behaviour exactly |
| 4 | Irrigation auto-defaults to night | Passive bonus once irrigation exists — no micromanagement needed |
| 5 | Night spraying banned | EU regulation — hard block with clear message |
| 6 | Settlement flag static | Set at game start; not every farm is near a village |
| 7 | Fatigue consecutive limit | 5 nights max — Spanish workers' rights (Estatuto de los Trabajadores) |

---

## 9. Out of Scope

- Real-time clock simulation
- Seasonal daylight hours (earlier sunsets in winter)
- Animal circadian rhythm
- Market price differences by time of day
- Security lighting for night operations

---

## 10. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/nightOps.ts` |
| **Modify** | `types/index.ts` (Worker shift/fatigue fields, GameState settlement flags), `store/useGameStore.ts` (advanceDay fatigue + heat penalty + noise check + irrigation auto-night + spray block), Day Planning overlay (new optional UI component), Workers screen (fatigue bar + shift preference), DaySummaryModal (noise ordinance + heat events) |
