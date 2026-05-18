
# Land Leasing & Sharecropping

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** Land purchase system (existing), `2026-05-11-hedgerows-biodiversity-design.md` (tenant improvements), reputation system (existing)

---

## 1. Executive Summary

Currently players can only access land by purchasing it outright — a high capital barrier early in the game. This spec adds leasing and sharecropping as alternative routes to farm more land: cash rent (pay per season, keep all yield), sharecropping (no upfront cost, split each harvest with the landowner), and short-term 1-season contracts for low-commitment experimentation.

A key realistic mechanic: improvements installed on leased land (hedgerows, organic transition work, soil investments) belong to the landowner when the lease ends. Players can negotiate **tenant improvement compensation** at lease end, or pre-negotiate an improvement clause upfront — mirroring the real disincentive that prevents tenant farmers from investing in land they don't own.

---

## 2. Lease Types

### 2a. Cash Rent

Pay a fixed fee per season (90 days) in advance. Keep 100% of yield.

```
cashRentCost = leasedHa × €120/ha/season
```

Default term: 4 seasons (1 year). Auto-renews unless cancelled. Early cancellation penalty: 1 season's rent forfeited.

### 2b. Sharecropping

No upfront payment. At each harvest, a percentage of the harvest value is paid to the landowner immediately.

```ts
const landOwnerShare = agreement.landOwnerSharePct;  // 0.35–0.50
const playerRevenue = harvestValue * (1 - landOwnerShare);
```

Default split: **35% landowner / 65% player**. Better land or worse reputation shifts toward 50/50. NPC terms are set at signing and fixed for the lease duration.

### 2c. Short-Term (1 Season)

90-day, no-commitment option. Higher per-season rate:

```
shortTermRate = cashRent × 1.4  // 40% premium over annual rate
```

No auto-renewal. No cancellation penalty. Good for crop trials without capital commitment.

---

## 3. Data Model

```ts
interface LeaseAgreement {
  id: string;
  parcelId: string;
  npcId: string;
  npcName: string;
  leaseType: 'cash_rent' | 'sharecrop' | 'short_term';
  startDay: number;
  endDay: number;
  cashRentPerSeason?: number;
  landOwnerSharePct?: number;       // for sharecrop
  autoRenew: boolean;
  improvementClause?: ImprovementClause;  // pre-negotiated, if any
  status: 'active' | 'expired' | 'terminated';
}

interface ImprovementClause {
  guaranteedCompensationPct: number;  // e.g. 0.70 = 70% of depreciated value guaranteed
  additionalRentPct: number;           // extra rent for the clause, e.g. 0.10 = +10% rent
}

interface TenantImprovement {
  id: string;
  parcelId: string;
  leaseId: string;
  type: 'hedgerow' | 'organic_transition' | 'soil_amendment' | 'infrastructure';
  installDay: number;
  installCost: number;
  description: string;  // e.g. "Mixed hedgerow — north edge"
}

// Added to GameState:
activeLeases: LeaseAgreement[];
availableLeases: AvailableLease[];       // NPC offers, refreshed each Spring
tenantImprovements: TenantImprovement[]; // improvements on leased parcels
pendingCompensationNegotiations: CompensationNegotiation[];

interface AvailableLease {
  parcelId: string;
  npcId: string;
  npcName: string;
  leaseType: 'cash_rent' | 'sharecrop' | 'short_term';
  termsPerSeason: number;
  landOwnerSharePct?: number;
  availableUntilDay: number;  // offer expires at season end
  improvementClauseAvailable: boolean;  // some NPCs offer it, some don't
}
```

---

## 4. Tenant Improvements

### 4a. Tracking

Any improvement installed on a leased parcel is automatically recorded as a `TenantImprovement`:

- Hedgerow/buffer/pollinator strip installation → `type: 'hedgerow'`
- Organic transition enrollment fee paid → `type: 'organic_transition'`
- Corrective soil inputs (lime, gypsum, subsoiling) → `type: 'soil_amendment'`

When the player installs an improvement on a leased parcel, a notice appears:
> *"This parcel is leased. [Improvement] will remain with the land if your lease ends. Consider negotiating an improvement clause with [NPC Name] first."*

Player can proceed or cancel. This is an informational warning only — no hard block.

### 4b. Depreciation

Improvement value depreciates over time. Compensation is based on depreciated value:

```ts
function depreciatedValue(improvement: TenantImprovement, currentDay: number): number {
  const ageYears = (currentDay - improvement.installDay) / 365;
  const depreciationRate = 0.15;  // 15% per year
  const factor = Math.max(0, 1 - ageYears * depreciationRate);
  return improvement.installCost * factor;
}
```

A hedgerow installed 3 years ago is worth 55% of its original cost. A new one this season is worth 85% (one year's depreciation).

---

## 5. Compensation Negotiation

### 5a. At Lease End

When a lease expires (or the player chooses not to renew), if there are tracked tenant improvements on the parcel, a compensation negotiation is triggered:

```
📋 Lease ending: [Parcel Name]

You have made improvements worth €2,840 (depreciated) to this land:
  • Mixed hedgerow — north edge    €400 → €340 (year 1)
  • Soil liming × 3 seasons         €360 → €306 (year 2)
  • Organic transition fee          €250 → €175 (year 3)

Negotiate compensation with [NPC Name]?
[Negotiate →]  [Walk away — improvements stay]
```

### 5b. NPC Negotiation Outcome

The NPC's offer is based on:
- **Reputation modifier:** rep > 70 → offers 60–80% of depreciated value; rep 40–70 → 30–55%; rep < 40 → refuses outright
- **Improvement age:** older = lower offer
- **NPC personality:** some NPCs are more generous (flagged at data level)

```ts
function npcCompensationOffer(
  totalDepreciated: number,
  reputation: number,
  npc: NPCLandowner
): number | null {  // null = refusal
  if (reputation < 40 && !npc.generous) return null;
  const basePct = reputation > 70 ? 0.65 : reputation > 40 ? 0.40 : 0.20;
  return totalDepreciated * basePct * npc.generosityMult;
}
```

**Player options:**
- **Accept** — receive offered amount, improvements stay, amicable ending
- **Counter** — request a higher percentage; NPC accepts or rejects (if rejected, original offer stands for 3 more days)
- **Walk away** — improvements stay, no compensation

### 5c. Pre-Negotiated Improvement Clause

When signing a lease, if the NPC offers an improvement clause, the player can add it:

- Guarantees **70% of depreciated value** at lease end, no negotiation needed
- Costs an additional **+10% on the rent** for the duration of the lease

This trades ongoing cash for certainty. Good choice for long leases where you plan to invest heavily.

```ts
// At lease end with improvement clause:
const compensation = totalDepreciated * agreement.improvementClause.guaranteedCompensationPct;
money += compensation;
addNewsEvent(`💶 Tenant improvement clause settled: received €${compensation} for improvements on [Parcel]`);
```

---

## 6. Available Leases & NPC Pool

A small pool of NPC-owned parcels offers leases each year. Refreshes each Spring.

```ts
// NPCs offering leases — defined in data:
interface NPCLandowner {
  id: string;
  name: string;
  generous: boolean;          // willing to compensate even at low reputation
  generosityMult: number;     // 0.8–1.2 multiplier on compensation offers
  prefersLongTerm: boolean;   // may refuse short-term leases
}
```

Better farm reputation unlocks better terms (lower cash rent, better sharecrop splits, more NPCs willing to offer improvement clauses).

---

## 7. Lease Mechanics

### 7a. Sharecrop Deduction at Harvest

```ts
// In harvest action:
const agreement = activeLeases.find(l => l.parcelId === parcel.id && l.leaseType === 'sharecrop');
if (agreement) {
  const ownerCut = harvestValue * agreement.landOwnerSharePct;
  state.money -= ownerCut;
  addNewsEvent(`💰 Sharecrop: paid €${ownerCut} to ${agreement.npcName} (${agreement.landOwnerSharePct * 100}% share)`);
}
```

### 7b. Cash Rent Payment

Deducted at lease signing (first season) and at every 90-day renewal. If insufficient funds:
- 7-day grace period
- If unpaid after grace: lease terminated, parcel locked

Notification 30 days before expiry: *"📋 Lease on [Parcel] expires in 30 days — renew or harvest remaining crops."*

### 7c. Crop Grace Period at Expiry

If a lease expires and a crop is planted and < 30 days from harvest: player gets a 30-day grace period to complete the harvest. After that, parcel locks to the player.

### 7d. CAP Subsidies on Leased Land

Leased parcels count at **50%** toward CAP basic payment calculations. AES schemes cannot be enrolled on leased parcels (5-year commitment requires ownership or long-term secure tenure — real EU rule).

---

## 8. UI — Office Screen: Land Tab

```
Land Management

Owned Parcels — 6 parcels (12 ha)
  [View in Fields →]

Active Leases — 3 parcels
  Martinez Farm   4ha  Cash Rent  €480/season  ↻ auto  Expires 45d  [Renew] [Cancel]
  River Lot       2ha  Sharecrop  35% share            Expires 180d [View] [Cancel]
  North Block     2ha  Short-term €168/season          Expires 22d  [Don't renew]
  ⚠️ Tenant improvements on Martinez Farm (€860 depreciated) — lease ending soon [Negotiate now →]

Available Leases (refreshes in 87 days)
  Sánchez Plot    2ha  Cash Rent    €240/season  + improvement clause available  [Accept]
  Valley Fields   4ha  Sharecrop    40% share                                    [Accept]
  Old Hermitage   2ha  Short-term   €142/season                                  [Accept]
```

---

## 9. Implementation Order

### Phase 1 — Data
1. Add `LeaseAgreement`, `AvailableLease`, `TenantImprovement`, `ImprovementClause`, `CompensationNegotiation` types
2. Add `activeLeases`, `availableLeases`, `tenantImprovements`, `pendingCompensationNegotiations` to `GameState`
3. Define NPC landowner pool in static data

### Phase 2 — Logic
4. Lease sign action — deduct cash rent, activate parcel for player use, handle improvement clause
5. Sharecrop deduction in harvest action
6. Improvement tracking: auto-record `TenantImprovement` when player installs on leased parcel
7. `advanceDay()`: lease expiry/renewal/payment, crop grace period, 30-day expiry notification
8. NPC lease offer refresh each Spring
9. Compensation negotiation flow: `npcCompensationOffer()`, accept/counter/walk-away
10. Improvement clause auto-settlement at lease end

### Phase 3 — UI
11. Land tab in Office screen
12. Lease expiry notification in DaySummaryModal
13. Improvement warning on install
14. Compensation negotiation modal
15. Parcel card lease badge (leased vs owned, sharecrop indicator)

---

## 10. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Improvements stay with land | Yes — realistic disincentive; compensation mechanic addresses the fairness concern |
| 2 | Improvement clause cost | +10% rent — real trade-off between security and cash flow |
| 3 | Depreciation rate | 15%/year — a hedgerow has ~6 year useful life from landlord's perspective |
| 4 | Reputation gates negotiation | Below rep 40 → NPC won't compensate (you've been a bad tenant) |
| 5 | AES on leased land | Blocked — 5-year commitment incompatible with insecure tenure (real EU rule) |
| 6 | CAP at 50% for leased | Simplified — real entitlement rules are complex |
| 7 | Crop grace at expiry | 30 days — enough to finish any reasonable harvest |

---

## 11. Out of Scope

- Multi-year sharecropping equity building
- Lease-to-own arrangements
- Co-operative land pooling
- Compulsory purchase / land reform events
- Negotiating lease price at signing (fixed NPC rates for simplicity)

---

## 12. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | None |
| **Modify** | `types/index.ts` (all lease types + GameState), initial parcel/NPC data, `store/useGameStore.ts` (sign lease + harvest sharecrop + advanceDay expiry + improvement tracking + negotiation actions), `app/(tabs)/oficina.tsx` (Land tab), Fields parcel cards (lease badge + improvement warning) |
