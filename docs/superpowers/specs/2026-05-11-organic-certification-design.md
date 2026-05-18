
# Organic Certification & Transition Period

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-19-selling-channels-design.md` (selling channels), `2026-04-16-pest-disease-cycles-design.md` (pesticide tracking), `2026-05-11-cap-subsidies-design.md` (AES reduced pesticide scheme)

---

## 1. Executive Summary

The organic certification arc is a high-risk, high-reward long game. The player commits parcels to a 3-year transition under EU Regulation 2018/848, suffering yield reductions and receiving no premium prices during transition — the "valley of death." After year 3, certified status unlocks the organic selling channel (1.8–2.5× commodity prices). One deliberate synthetic input use = immediate decertification for 3 years. Accidental neighbour spray drift can be appealed with a documentation window — matching real EU procedure.

---

## 2. Certification States

Per-parcel certification status:

| State | ID | Description |
|-------|----|-------------|
| Conventional | `'conventional'` | Default — all inputs permitted |
| Transition Year 1 | `'transition_1'` | No synthetic inputs; yield penalty −35% |
| Transition Year 2 | `'transition_2'` | No synthetic inputs; yield penalty −25% |
| Transition Year 3 | `'transition_3'` | No synthetic inputs; yield penalty −15% |
| Certified Organic | `'organic'` | Premium channel unlocked; −8% permanent yield |
| Decertified | `'decertified'` | 3-year lockout; must restart transition after |

```ts
// Added to Parcel type:
organicStatus: 'conventional' | 'transition_1' | 'transition_2' | 'transition_3' | 'organic' | 'decertified';
organicTransitionStartDay?: number;
lastDecertifiedDay?: number;
pendingContaminationAppeal?: ContaminationAppeal;
```

---

## 3. Transition Process

### 3a. Application

In Office → Certifications tab:
- Application fee: **€300 flat** + **€50/ha enrolled**
- First inspection: next Spring
- On inspection pass: parcel enters `transition_1`

Player can enroll individual parcels — no requirement to convert the whole farm at once.

### 3b. Annual Advancement

Each Spring inspection, parcels in transition advance one step if no violations occurred in the past year:

```
transition_1 → transition_2  (365 days, zero violations)
transition_2 → transition_3  (365 days, zero violations)
transition_3 → organic       (365 days, zero violations)
```

### 3c. Yield Penalties

Applied in `harvestYield()` as an additional multiplier, representing soil biology adjusting to organic management:

| Status | Yield Multiplier |
|--------|-----------------|
| `transition_1` | × 0.65 (−35%) |
| `transition_2` | × 0.75 (−25%) |
| `transition_3` | × 0.85 (−15%) |
| `organic` | × 0.92 (−8% permanent) |

Real research: EU-wide meta-analysis shows organic yields average 19–25% below conventional at certification; the permanent −8% reflects optimised certified organic systems with good soil health practices.

### 3d. Organic Practice Bonuses

Good soil management partially offsets transition yield penalties:

| Practice | Bonus |
|----------|-------|
| Cover crop present at planting | +5% |
| `organicMatter > 0.6` | +8% |
| `microbialLife > 0.7` | +6% |
| No synthetic fertilizer for 2+ years | +4% |

A well-managed organic parcel in year 3 can approach conventional yields. By year 5–7 post-certification, organic + healthy soil can match or exceed degraded conventional fields.

---

## 4. Prohibited Inputs

During any transition or certified state, these actions on an enrolled parcel trigger a violation:

| Input | Severity |
|-------|----------|
| Synthetic pesticide (spray operation) | **Critical** — immediate decertification |
| Synthetic NPK fertilizer | **Critical** — immediate decertification |
| Conventional herbicide | **Critical** — immediate decertification |

### 4a. Player-Caused Violation

If the player applies a prohibited input to an enrolled parcel:
1. `organicStatus → 'decertified'`, `lastDecertifiedDay = currentDay`
2. Any active organic contracts terminated
3. News event: *"🚫 Decertified! Synthetic input used on [Parcel] — organic certification lost for 3 years"*
4. Cannot re-enter transition until `currentDay - lastDecertifiedDay >= 1095`

### 4b. Neighbour Spray Drift — Appeal Mechanic

If an NPC field event sprays pesticide adjacent to a certified/transition parcel, there is a **15% chance of drift contamination**. This fires a different event from a player violation:

```
🌬️ Pesticide drift detected on [Parcel] from neighbouring field.
This may not be your fault. Document the incident within 7 days
to preserve your certification.
[Document incident →]  [Dismiss]
```

**Appeal window:** 7 in-game days. If the player taps "Document incident" before the window expires:
- A `ContaminationAppeal` is created on the parcel
- Annual inspection will review it — certification is preserved if no other violations
- The news event resolves: *"📋 Contamination appeal filed. Certification maintained pending annual inspection."*

**If appeal window expires without action:**
- Treated as a player violation — immediate decertification
- This is intentional: real farmers must act quickly to protect their status

```ts
interface ContaminationAppeal {
  detectedDay: number;
  appealDeadlineDay: number;   // detectedDay + 7
  filed: boolean;
}
```

In `advanceDay()`: if `pendingContaminationAppeal` exists and `currentDay > appealDeadlineDay` and `!filed`, trigger decertification.

---

## 5. Organic Selling Channel

Once a parcel is `'organic'`, its harvested goods are tagged `organic: true` in inventory and can be sold through the organic channel:

| Commodity | Organic Price Multiplier |
|-----------|-------------------------|
| Grains (wheat, barley, corn, etc.) | × 1.8 |
| Vegetables & fruit | × 2.2 |
| Specialty crops (saffron, vanilla, lavender) | × 2.5 |
| Honey (from certified organic management) | × 2.0 |

Organic goods can only be sold via the organic channel — they cannot be mixed with conventional goods or sold at commodity markets at the organic premium. If the player sells them at a regular market, they sell at standard price.

---

## 6. Organic Inputs (New Shop Items)

Required alternatives to prohibited synthetic inputs:

| Input | Cost | Effect | Notes |
|-------|------|--------|-------|
| Compost (purchased) | €80/ha | +0.3 N-equivalent, slow release 30 days | Permitted in EU organic |
| Biocontrol — predatory insects | €120/ha | −30% pest infestation chance for 14 days | Ladybird larvae, parasitic wasps |
| Copper fungicide | €90/ha | Treats fungal disease | Permitted in EU organic (restricted use) |
| Neem extract | €70/ha | Reduces insect pest pressure −20% | Permitted in EU organic |
| Certified organic seeds | Seed cost +40% | Required to maintain certification on replanting | Must use if saving own seed isn't possible |

---

## 7. UI — Office Screen: Certifications Tab

```
Organic Certification

Farm Overview: 3 of 8 parcels certified or in transition

Parcel Status
  North Field    🌿 Organic (Year 2)         Revenue +82% vs conventional
  East Slope     🔄 Transition Y2  184d left  [────────────░░░░]
  River Parcel   🔄 Transition Y1  334d left  [██░░░░░░░░░░░░░░]
  South Flat     🌾 Conventional              [Enroll →]
  West Block     🚫 Decertified   685/1095d   [Locked until Year 6]

[+ Enroll new parcel — €300 + €50/ha]

Organic Income This Season: €4,820
Conventional equivalent:    €2,190
Organic premium:           +€2,630 (+120%)

Projected ROI crossover: Year 5 (based on current yields)
```

**Parcel card badge** in Fields screen:
- `🌿 Organic` green badge
- `🔄 T1 / T2 / T3` amber badge during transition
- `🚫 Decertified` red badge

---

## 8. Implementation Order

### Phase 1 — Data
1. Add `organicStatus`, `organicTransitionStartDay`, `lastDecertifiedDay`, `pendingContaminationAppeal` to `Parcel`
2. Add `ContaminationAppeal` type
3. Add organic inputs to shop

### Phase 2 — Logic
4. `engine/organicCert.ts` — `getOrganicYieldMod()`, `getOrganicPracticeBonuses()`, `checkViolation()`
5. `advanceDay()` Spring: advance transition states; check appeal expiry
6. Spray/fertilize actions: if parcel enrolled, block and warn — or decertify if player overrides
7. Drift contamination: 15% check on NPC adjacent spray events; fire appeal mechanic
8. `advanceDay()` appeal deadline: auto-decertify if appeal window missed
9. Harvest action: tag goods `organic: true` if parcel is `'organic'`

### Phase 3 — UI
10. Certifications tab in Office screen
11. Parcel badges in Fields screen
12. Drift contamination news event with 7-day appeal action
13. Organic price labels in selling UI
14. Violation warning when player tries to spray enrolled parcel

---

## 9. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Per-parcel (not whole-farm) | Gradual transition is realistic and more strategic |
| 2 | 3-year transition | EU standard (Reg. 2018/848) — non-negotiable |
| 3 | Player violation = instant | No appeal — deliberate misuse has no recourse |
| 4 | Drift appeal mechanic | 7-day window — matches real urgency to document third-party contamination |
| 5 | Permanent −8% yield | Organic systems are not yield-maximised — this is accurate |
| 6 | Organic input costs | Higher than synthetic equivalents — captures the real cost premium |
| 7 | Organic price multipliers | Fixed (not market-variable) — simpler for now |

---

## 10. Out of Scope

- Organic livestock certification (separate system)
- Biodynamic / Demeter certification
- Third-party certifier choice (CAAE, Ecológica España, etc.)
- PDO/PGI geographical indication labels
- On-farm compost production (handled in manure/composting spec)

---

## 11. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/organicCert.ts` |
| **Modify** | `types/index.ts` (Parcel organic fields + ContaminationAppeal), `engine/crops.ts` (organic yield multipliers), `store/useGameStore.ts` (advanceDay Spring advancement + appeal check + spray violation check + harvest tagging), `app/(tabs)/oficina.tsx` (Certifications tab), Fields parcel cards (organic status badge) |
