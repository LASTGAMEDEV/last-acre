
# Government Subsidies & CAP Payments

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-05-11-hedgerows-biodiversity-design.md` (EFA count), `2026-04-19-selling-channels-design.md` (income tracking)

---

## 1. Executive Summary

European agriculture — particularly Spanish farming — runs significantly on EU Common Agricultural Policy (CAP) subsidies. This spec adds an annual subsidy system paid each Spring that can represent 30–50% of early-game income, making the economy feel authentically European.

Three components stack: an unconditional basic payment per hectare, a greening bonus requiring crop diversification and ecological compliance, and a young farmer supplement for the first 5 years. Voluntary Agri-Environment Schemes (AES) offer extra income in exchange for 5-year commitments with real violation penalties.

Payment timing is Spring (game simplification — real Spanish CAP payments arrive November/December).

---

## 2. Subsidy Components

### 2a. Basic Payment Scheme

Paid every Spring day (day `n × 365`, starting at day 365). Unconditional — just own land.

```
basicPayment = ownedHectares × €180/ha/year
```

Each parcel = 2 ha. Leased parcels count at 50% (simplified — real entitlement rules are complex). The €180/ha rate is a simplified model of Spain's BISS (Basic Income Support for Sustainability).

### 2b. Greening Payment (Eco-Schemes)

An additional **30% on top of the basic payment**, all-or-nothing — requires meeting ALL three conditions simultaneously:

| Condition | Requirement |
|-----------|-------------|
| Crop diversification | ≥ 3 different crop types harvested this calendar year |
| Ecological Focus Area | ≥ 2 EFA units from mature hedgerows/buffers/strips (see hedgerows spec) |
| No straw burning | No burning event declared this year |

```ts
const greeningQualified = cropDiversityMet && efaMet && noburn;
const greeningPayment = greeningQualified ? basicPayment * 0.30 : 0;
```

If any single condition fails: €0 greening. No partial credit.

### 2c. Young Farmer Supplement

Automatically applied for the first 5 in-game years (days 1–1825). No registration needed.

```
youngFarmerBonus = basicPayment × 0.25
```

This models the EU Young Farmer top-up (real rate ~25% in Spain). It disappears abruptly at year 6 — players who relied on it need to have diversified income by then.

### 2d. Agri-Environment Schemes (AES)

Voluntary 5-year commitments for additional per-hectare payments. Player enrolls per parcel or whole farm at any Spring. Obligations are checked annually at payment time.

| Scheme ID | Name | Annual Payment | Obligation |
|-----------|------|---------------|------------|
| `aes_cover` | Cover Crop Scheme | €60/ha enrolled | Plant cover crops on enrolled parcels every winter |
| `aes_wetland` | Wetland Maintenance | €120/ha enrolled | Don't cultivate or drain flagged wet parcels |
| `aes_corridor` | Wildlife Corridor | €80/ha enrolled | Maintain hedgerows, no herbicide within 3m of hedge |
| `aes_lowpest` | Reduced Pesticide | €90/ha enrolled | No synthetic pesticides on enrolled parcels |

**Violation:** If an obligation is broken in the year:
- That year's AES payment is withheld
- Repayment of all prior years' payments for that scheme + **20% penalty**
- Scheme terminated; cannot re-enroll for 3 years

```ts
if (aesViolation) {
  const repayment = enrollment.totalPaidSoFar * 1.20;
  money -= repayment;
  addNewsEvent(`⚠️ AES violation: ${scheme.name} — repaying €${repayment} (prior payments + 20% penalty)`);
}
```

---

## 3. State Additions

```ts
// Added to GameState:
cropsGrownThisYear: string[];         // unique crop IDs harvested since last Spring, reset annually
aesEnrollments: AESEnrollment[];
subsidyLog: SubsidyPayment[];

interface AESEnrollment {
  id: string;
  schemeId: string;
  enrolledDay: number;
  enrolledParcels: string[];   // parcel IDs in this enrollment
  enrolledHa: number;
  endDay: number;              // 5 years = enrolledDay + 1825
  totalPaidSoFar: number;      // for violation repayment calculation
  status: 'active' | 'violated' | 'completed';
}

interface SubsidyPayment {
  day: number;
  basic: number;
  greening: number;
  youngFarmer: number;
  aes: number;
  total: number;
  greeningQualified: boolean;
  greeningFailReasons: string[];   // e.g. ['crop_diversity', 'efa'] if failed
}
```

---

## 4. Crop Diversification Tracking

```ts
// In harvest action — add crop to this-year set:
if (!state.cropsGrownThisYear.includes(cropId)) {
  state.cropsGrownThisYear.push(cropId);
}

// Reset each Spring before payment:
state.cropsGrownThisYear = [];
```

Cover crops do **not** count toward the 3-crop diversification requirement — only cash crops that are actually harvested count.

---

## 5. Payment Calculation

Called once per year on Spring day (day % 365 === 0, starting at day 365):

```ts
function calculateAnnualSubsidy(state: GameState): SubsidyPayment {
  const ownedHa = state.parcels.filter(p => p.owned).length * 2;
  const leasedHa = state.activeLeases.length * 2 * 0.5;  // 50% for leased
  const totalHa = ownedHa + leasedHa;

  const basic = totalHa * 180;

  const diversityMet = state.cropsGrownThisYear.length >= 3;
  const efaMet = getEFACount(state.hedgerows) >= 2;
  const noburn = !state.strawBurnedThisYear;
  const greeningQualified = diversityMet && efaMet && noburn;
  const greening = greeningQualified ? basic * 0.30 : 0;

  const youngFarmer = state.day <= 1825 ? basic * 0.25 : 0;

  const aes = calculateAESPayments(state);

  return { basic, greening, youngFarmer, aes, total: basic + greening + youngFarmer + aes,
           greeningQualified, greeningFailReasons: buildFailReasons(diversityMet, efaMet, noburn) };
}
```

---

## 6. UI — Office Screen: Subsidies Tab

```
CAP Subsidies — Year 3

Next Payment: Spring (in 87 days)   Projected: €5,502

This Year So Far
  Crops grown: Wheat ✅ Sunflower ✅ Potatoes ✅ Corn ✅  (4 of 3 needed ✅)
  EFA units:   3 ✅  (hedgerow + buffer strip + pollinator)
  Straw burn:  None ✅

Payment Breakdown
  Basic payment (22 ha):    €3,960
  Greening (+30%):          €1,188 ✅
  Young farmer (+25%):      €990   (expires Year 6)
  AES — Cover crops:        €480
  ─────────────────────────────────
  Total:                   €6,618

Active AES Schemes
  Cover Crop — 8ha — €480/yr — ends Year 8   [View obligations]
  Wildlife Corridor — 4ha — €320/yr          [View obligations]
  [Enroll in new scheme →]

Payment History
  Year 2: €5,280  ✅ Greening qualified
  Year 1: €4,420  ❌ Greening missed (only 2 crops)
```

---

## 7. DaySummaryModal Integration

On Spring payment day:
> *"💶 CAP annual payment received: €6,618"*
> *"  Basic: €3,960 · Greening: €1,188 · Young Farmer: €990 · AES: €480"*

If greening missed:
> *"⚠️ Greening payment withheld (−€1,188) — missing: crop diversity (only 2 crops grown this year)"*

Young farmer expiry warning at year 5 Spring:
> *"⏳ Young Farmer bonus expires next year — plan accordingly"*

---

## 8. Implementation Order

### Phase 1 — Data
1. Add `cropsGrownThisYear`, `aesEnrollments`, `subsidyLog`, `strawBurnedThisYear` to `GameState`
2. Define AES scheme constants and obligation check functions

### Phase 2 — Logic
3. `engine/subsidies.ts` — `calculateAnnualSubsidy()`, `calculateAESPayments()`, `checkAESObligations()`
4. `advanceDay()` Spring trigger: run subsidy calculation, credit money, log payment
5. Harvest action: push crop ID to `cropsGrownThisYear`
6. AES obligation checks: spray on enrolled parcel → violation; cover crop not planted → violation
7. AES enrollment action with 5-year commitment

### Phase 3 — UI
8. Subsidies sub-tab in Office screen
9. Greening progress tracker (live crop count, EFA count, burn status)
10. AES enrollment flow + obligation viewer
11. DaySummaryModal subsidy events

---

## 9. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Payment timing | Spring — game simplification (real payments arrive Nov/Dec Spain) |
| 2 | Rates | ~€180/ha base — simplified Spanish BISS approximation, not exact |
| 3 | Greening binary | All-or-nothing — simpler, more dramatic than partial compliance |
| 4 | Young farmer automatic | No registration — thematic early-game reward |
| 5 | AES violation penalty | Repayment of all prior payments + 20% — real consequence |
| 6 | Cover crops excluded from diversity | Must harvest a cash crop to count — prevents gaming with cover crops only |
| 7 | Leased land at 50% | Real entitlement rules are very complex — this is a fair simplification |

---

## 10. Out of Scope

- Degressivity / payment cap for large farms
- Coupled support for specific crops
- National reserve / new entrant scheme
- Carbon farming payments
- Cross-compliance inspection events (animal welfare, record-keeping)

---

## 11. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/subsidies.ts` |
| **Modify** | `types/index.ts` (AESEnrollment, SubsidyPayment, GameState), `store/useGameStore.ts` (Spring trigger + harvest crop tracking + AES enrollment + violation checks), `app/(tabs)/oficina.tsx` (Subsidies sub-tab) |
