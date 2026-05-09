# Spec 05: Land Leasing & Sharecropping

**Tier:** 2 — Economic & Business Depth  
**Status:** Draft  
**Dependencies:** Existing land/parcel system, economy system, crop system. Integration with Spec 04 (subsidies).

---

## 1. Objective

Introduce **land tenancy** as a core scaling mechanism. Real young farmers rarely buy land outright — they rent, sharecrop, or lease long-term. This spec creates a land market where players can expand operations without massive capital outlay, but at the cost of recurring obligations, split profits, or landlord interference. It transforms land from a simple "save up and buy" commodity into a strategic relationship.

---

## 2. Design Principles

1. **Risk transfer, not free expansion:** Cash rent = high risk (bad year = you still owe rent). Sharecropping = lower risk but capped upside. No free lunch.
2. **Landlord personality matters:** Different landlords have different terms, renewal likelihood, and meddling levels. Some are absentee investors; others visit weekly.
3. **Soil quality is priced in:** Degraded land is cheap to rent — a "fixer-upper" strategy. Premium land commands premium rent.
4. **Subsidy ambiguity is real:** CAP payments on rented land create negotiation tension. Who gets the subsidy? The contract says.
5. **Short-term leases enable experimentation:** Try quinoa on a 1-year lease without betting the farm.

---

## 3. Data Model

### 3.1 Tenancy System

```ts
// types/land.ts (extends existing)
export type TenancyType = 'owned' | 'cashRent' | 'sharecrop';

export interface Tenancy {
  type: TenancyType;
  landlordId: string | null; // null if owned
  leaseId: string | null;
  
  // Visual distinction
  canSellParcel: boolean;    // false for rented/sharecropped
  canMortgageParcel: boolean; // false for rented/sharecropped
  canBuildPermanent: boolean; // false unless long-term lease (>5 years)
}
```

### 3.2 Lease Agreement

```ts
// types/leases.ts
export interface LeaseAgreement {
  id: string;
  parcelId: string;
  landlordId: string;
  
  // Terms
  tenancyType: 'cashRent' | 'sharecrop';
  durationYears: number;
  startDay: number;
  endDay: number;
  
  // Financial terms
  annualRentPerHa: number;        // cash rent only
  totalAnnualRent: number;        // pre-calculated
  paymentSchedule: 'upfront' | 'split' | 'harvestBased'; // upfront = Jan, split = 50/50 Jan/Jun
  
  // Sharecropping terms
  yieldSplitFarmer: number;       // 0.50, 0.60, etc.
  yieldSplitLandlord: number;     // remainder
  inputResponsibility: 'farmer' | 'landlord' | 'shared';
  subsidyAllocation: 'farmer' | 'landlord' | 'split';
  
  // Quality adjustments
  soilImprovementClause: boolean; // if true, tenant gets rent reduction for improving soil
  soilDegradationPenalty: boolean; // if true, tenant pays penalty for degrading soil
  
  // Renewal
  autoRenewal: boolean;
  renewalNoticeDays: number;      // days before end to give notice
  rentEscalationPercent: number;  // annual rent increase
  
  // State
  status: 'draft' | 'active' | 'terminating' | 'expired' | 'breached';
  terminationReason?: string;
  daysInArrears: number;
}
```

### 3.3 Landlord Types

```ts
export interface Landlord {
  id: string;
  name: string;
  type: 'absenteeInvestor' | 'elderlyLocal' | 'familyTrust' | 'municipality' | 'cooperative';
  
  // Personality traits (affect negotiation & events)
  traits: {
    rentFlexibility: number;      // 0–1, likelihood to accept counter-offer
    meddlingFrequency: number;    // 0–1, how often they "suggest" changes
    patience: number;             // 0–1, grace period for late rent
    soilConsciousness: number;    // 0–1, cares about soil degradation
    longTermVision: number;       // 0–1, prefers long leases vs short
  };
  
  // Portfolio
  ownedParcelIds: string[];
  typicalLeaseDuration: number;
  typicalRentPremium: number;     // multiplier over market rate
}
```

---

## 4. Static Data (`data/landlordTypes.ts`)

```ts
export const landlordArchetypes: Record<Landlord['type'], Partial<Landlord>> = {
  absenteeInvestor: {
    traits: {
      rentFlexibility: 0.2,
      meddlingFrequency: 0.1,
      patience: 0.3,
      soilConsciousness: 0.2,
      longTermVision: 0.7,
    },
    typicalLeaseDuration: 5,
    typicalRentPremium: 1.15, // +15% over market
  },
  
  elderlyLocal: {
    traits: {
      rentFlexibility: 0.6,
      meddlingFrequency: 0.5,
      patience: 0.8,
      soilConsciousness: 0.7,
      longTermVision: 0.3,
    },
    typicalLeaseDuration: 2,
    typicalRentPremium: 0.85, // below market, but fussy
  },
  
  familyTrust: {
    traits: {
      rentFlexibility: 0.1,
      meddlingFrequency: 0.2,
      patience: 0.5,
      soilConsciousness: 0.5,
      longTermVision: 0.8,
    },
    typicalLeaseDuration: 7,
    typicalRentPremium: 1.0,
  },
  
  municipality: {
    traits: {
      rentFlexibility: 0.0,
      meddlingFrequency: 0.0,
      patience: 0.1,
      soilConsciousness: 0.4,
      longTermVision: 0.5,
    },
    typicalLeaseDuration: 3,
    typicalRentPremium: 0.70, // cheap, but bureaucratic
  },
  
  cooperative: {
    traits: {
      rentFlexibility: 0.5,
      meddlingFrequency: 0.3,
      patience: 0.6,
      soilConsciousness: 0.8,
      longTermVision: 0.6,
    },
    typicalLeaseDuration: 4,
    typicalRentPremium: 0.90,
  },
};
```

### 4.1 Market Rent Calculator

```ts
export function calculateMarketRent(
  parcel: LandParcel,
  region: string,
  demandFactor: number, // 0.5–2.0 based on local competition
): { cashRentPerHa: number; sharecropStandardSplit: number } {
  // Base rent by soil health index
  const soilHealthIndex = (
    parcel.soil.nitrogen + parcel.soil.organicMatter + parcel.soil.ph * 10 +
    parcel.soil.microbialLife + parcel.soil.drainage
  ) / 5;
  
  const baseRent = soilHealthIndex * 8; // €/ha/year — rough heuristic
  
  // Regional adjustment
  const regionalMultiplier = {
    'galicia': 0.8,
    'castile': 1.0,
    'andalucia': 1.2,
    'catalonia': 1.4,
  }[region] || 1.0;
  
  // Water access premium
  const waterPremium = parcel.irrigation ? 1.3 : 1.0;
  
  const cashRentPerHa = baseRent * regionalMultiplier * waterPremium * demandFactor;
  
  // Sharecropping: better land = landlord demands better split
  const sharecropStandardSplit = soilHealthIndex > 70 ? 0.55 : 0.50; // farmer gets 45% or 50%
  
  return { cashRentPerHa, sharecropStandardSplit };
}
```

---

## 5. Engine Logic (`engine/leases.ts`)

### 5.1 Lease Validation

```ts
export interface LeaseValidation {
  canSign: boolean;
  reason?: string;
  warnings: string[];
  annualCost: number;
  farmerShareEstimate: number; // expected net for sharecropping
}

export function validateLease(
  player: PlayerState,
  parcel: LandParcel,
  landlord: Landlord,
  proposedTerms: Partial<LeaseAgreement>,
  marketRates: { cashRentPerHa: number; sharecropStandardSplit: number },
): LeaseValidation {
  const warnings: string[] = [];
  
  // Cash flow check
  if (proposedTerms.tenancyType === 'cashRent') {
    const annualCost = proposedTerms.annualRentPerHa! * parcel.sizeHa;
    if (annualCost > player.money * 0.5) {
      warnings.push(`Rent consumes 50%+ of cash reserves. Risky if harvest fails.`);
    }
  }
  
  // Sharecrop with input responsibility
  if (proposedTerms.tenancyType === 'sharecrop' && proposedTerms.inputResponsibility === 'farmer') {
    warnings.push(`You pay all input costs but only keep ${Math.round(proposedTerms.yieldSplitFarmer! * 100)}% of yield. Ensure margins work.`);
  }
  
  // Landlord traits
  if (landlord.traits.soilConsciousness > 0.6 && parcel.soil.compaction > 50) {
    warnings.push(`${landlord.name} is soil-conscious. High compaction may trigger penalties.`);
  }
  
  // Subsidy check
  if (proposedTerms.subsidyAllocation === 'landlord') {
    warnings.push(`Landlord claims CAP subsidies. You lose ~€${Math.round(marketRates.cashRentPerHa * 0.8)}/ha in subsidy income.`);
  }
  
  return {
    canSign: true,
    warnings,
    annualCost: proposedTerms.tenancyType === 'cashRent' ? proposedTerms.annualRentPerHa! * parcel.sizeHa : 0,
    farmerShareEstimate: proposedTerms.tenancyType === 'sharecrop'
      ? marketRates.cashRentPerHa * parcel.sizeHa * proposedTerms.yieldSplitFarmer!
      : 0,
  };
}
```

### 5.2 Harvest Resolution for Sharecropping

```ts
export function resolveSharecropHarvest(
  harvestValue: number,
  lease: LeaseAgreement,
  inputCosts: number,
): { farmerShare: number; landlordShare: number; farmerNet: number } {
  const grossFarmerShare = harvestValue * lease.yieldSplitFarmer;
  const grossLandlordShare = harvestValue * lease.yieldSplitLandlord;
  
  // Input cost settlement
  let farmerNet: number;
  if (lease.inputResponsibility === 'farmer') {
    farmerNet = grossFarmerShare - inputCosts;
  } else if (lease.inputResponsibility === 'landlord') {
    // Landlord deducted from their share, farmer gets clean split
    farmerNet = grossFarmerShare;
  } else {
    // Shared 50/50
    farmerNet = grossFarmerShare - (inputCosts * 0.5);
  }
  
  return {
    farmerShare: grossFarmerShare,
    landlordShare: grossLandlordShare,
    farmerNet,
  };
}
```

### 5.3 Lease Renewal & Termination

```ts
export function shouldAutoRenew(
  lease: LeaseAgreement,
  landlord: Landlord,
  parcel: LandParcel,
  daysInArrears: number,
): boolean {
  if (!lease.autoRenewal) return false;
  if (daysInArrears > landlord.traits.patience * 30) return false; // evicted for non-payment
  if (lease.soilDegradationPenalty && parcel.soil.organicMatter < 30) return false; // degraded
  
  // Meddling landlords may refuse renewal if they don't like your crops
  if (landlord.traits.meddlingFrequency > 0.6 && Math.random() < 0.2) return false;
  
  return true;
}

export function calculateTerminationPenalty(
  lease: LeaseAgreement,
  day: number,
): number {
  if (day > lease.endDay) return 0; // natural expiry
  
  const remainingYears = (lease.endDay - day) / 365;
  if (lease.tenancyType === 'cashRent') {
    return lease.totalAnnualRent * remainingYears * 0.25; // 25% of remaining rent
  }
  
  // Sharecropping: penalty based on expected yield
  return lease.totalAnnualRent * remainingYears * 0.15;
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface LeaseActions {
  // Discovery
  refreshLandMarket(): void; // generates new available parcels
  
  // Negotiation
  proposeLeaseTerms(parcelId: string, terms: Partial<LeaseAgreement>): void;
  counterOffer(leaseId: string, adjustedTerms: Partial<LeaseAgreement>): void;
  
  // Execution
  signLease(leaseId: string): void;
  terminateLease(leaseId: string): void; // pays penalty
  
  // Management
  payRent(leaseId: string): void;
  requestRenewal(leaseId: string): void;
  acceptRenewal(leaseId: string, newTerms: Partial<LeaseAgreement>): void;
  
  // Landlord events
  respondToLandlordRequest(leaseId: string, accept: boolean): void;
}
```

### 6.2 Land Market Generation

```ts
function generateLandMarket(state: GameState): LeasableParcel[] {
  // 3–7 parcels available at any time
  const count = 3 + Math.floor(Math.random() * 5);
  const available: LeasableParcel[] = [];
  
  for (let i = 0; i < count; i++) {
    const sizeHa = [2, 5, 10, 15, 25, 50][Math.floor(Math.random() * 6)];
    const soilHealth = Math.random() > 0.7 ? 'degraded' : Math.random() > 0.5 ? 'average' : 'good';
    const landlordType = ['absenteeInvestor', 'elderlyLocal', 'familyTrust', 'municipality', 'cooperative'][Math.floor(Math.random() * 5)] as Landlord['type'];
    
    available.push({
      id: `market-${state.day}-${i}`,
      sizeHa,
      soilHealth,
      landlordType,
      askingRentPerHa: calculateMarketRent(/* ... */).cashRentPerHa * (0.9 + Math.random() * 0.3),
      durationOffered: landlordArchetypes[landlordType].typicalLeaseDuration!,
      specialConditions: Math.random() > 0.8 ? ['subsidyToLandlord', 'soilImprovementRequired', 'cropRestrictionWheatOnly'][Math.floor(Math.random() * 3)] : undefined,
    });
  }
  
  return available;
}
```

### 6.3 `advanceDay()` Integration

```ts
function tickLeases(state: GameState, day: number): void {
  const dayOfYear = ((day - 1) % 365) + 1;
  
  state.leases.forEach(lease => {
    if (lease.status !== 'active') return;
    
    // Rent due dates
    if (lease.paymentSchedule === 'upfront' && dayOfYear === 1) {
      if (state.money >= lease.totalAnnualRent) {
        state.money -= lease.totalAnnualRent;
        lease.daysInArrears = 0;
      } else {
        lease.daysInArrears += 1;
        state.notifications.push({
          day,
          type: 'lease',
          message: `Rent overdue for ${lease.parcelId}! Day ${lease.daysInArrears} in arrears.`,
          urgent: true,
        });
      }
    }
    
    // Eviction check
    const landlord = getLandlord(lease.landlordId);
    if (lease.daysInArrears > landlord.traits.patience * 30) {
      lease.status = 'breached';
      lease.terminationReason = 'nonPayment';
      state.parcels.find(p => p.id === lease.parcelId)!.tenancy.type = 'owned'; // revert? No — revert to landlord
      state.parcels.find(p => p.id === lease.parcelId)!.tenancy.type = 'cashRent'; // Actually, remove from player control
      state.parcels = state.parcels.filter(p => p.id !== lease.parcelId); // Or mark as inactive
      state.notifications.push({
        day,
        type: 'disaster',
        message: `EVICTED from ${lease.parcelId} for non-payment!`,
        urgent: true,
      });
    }
    
    // Renewal notice window
    const daysUntilEnd = lease.endDay - day;
    if (daysUntilEnd === lease.renewalNoticeDays && !lease.renewalRequested) {
      state.notifications.push({
        day,
        type: 'lease',
        message: `Lease for ${lease.parcelId} expires in ${lease.renewalNoticeDays} days. Request renewal?`,
        urgent: true,
      });
    }
    
    // Landlord meddling events
    if (Math.random() < landlord.traits.meddlingFrequency / 365) {
      state.pendingLandlordRequests.push({
        leaseId: lease.id,
        day,
        request: generateMeddlingRequest(landlord, lease),
        expiresDay: day + 14,
      });
    }
  });
  
  // Refresh land market quarterly
  if (dayOfYear % 90 === 0) {
    state.landMarket = generateLandMarket(state);
  }
}
```

---

## 7. UI/UX Design

### 7.1 Tierras Tab — Parcel Ownership Indicator

In parcel list/map view, add ownership badge:
```
Field 7 — 12 ha 🌾 Wheat (growing)
[OWNED] or [RENT €185/ha] or [SHARE 50/50]
```

### 7.2 New Screen: Land Market

Accessible from Tierras tab or world map:

```
┌─────────────────────────────────────────┐
│  🏘️ LAND MARKET                        │
│  Refreshes: Day 90, 180, 270, 360      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 8 ha | Degraded soil            │   │
│  │ Owner: Doña Carmen (elderly)   │   │
│  │ Cash rent: €340/ha (below mkt) │   │
│  │ Sharecrop: 55/45 (you get 45%) │   │
│  │ Condition: Keep hedgerows tidy │   │
│  │ [Rent] [Sharecrop] [Inspect]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 25 ha | Good soil, irrigated   │   │
│  │ Owner: Inversiones del Sur SL  │   │
│  │ Cash rent: €620/ha             │   │
│  │ 5-year minimum | +5%/year      │   │
│  │ ⚠️ Subsidy goes to landlord    │   │
│  │ [Negotiate] [Sign]             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Refresh Market] (costs €50 listing)  │
└─────────────────────────────────────────┘
```

### 7.3 Lease Detail / Management Modal

```
┌─────────────────────────────────────────┐
│  LEASE: Field 12 (15 ha)               │
│                                         │
│  Type: Cash Rent                        │
│  Landlord: Doña Carmen                  │
│  Annual rent: €4,650 (paid Jan 1)      │
│  Term: Day 120 – Day 1,945 (5 years)   │
│  Auto-renewal: ON                       │
│                                         │
│  SOIL PROTECTION CLAUSE                 │
│  Organic matter must stay >30          │
│  Current: 42 ✅                         │
│                                         │
│  NEXT PAYMENT: Day 366 (€4,650)        │
│  Days in arrears: 0                     │
│                                         │
│  [Request Renewal] [Terminate (€1,160 penalty)] │
└─────────────────────────────────────────┘
```

### 7.4 Sharecrop Harvest Modal

After harvest on a sharecropped parcel:
```
┌─────────────────────────────────────────┐
│  HARVEST SETTLEMENT: Field 3           │
│                                         │
│  Gross harvest value: €8,400           │
│  Your share (50%): €4,200              │
│  Input costs (you paid): €1,800        │
│  ─────────────────────────────          │
│  YOUR NET: €2,400                      │
│                                         │
│  Landlord share: €4,200                │
│  (Transferred automatically)           │
└─────────────────────────────────────────┘
```

### 7.5 Landlord Event Modal

```
┌─────────────────────────────────────────┐
│  📨 MESSAGE FROM DOÑA CARMEN           │
│                                         │
│  "I see you're planting sunflowers      │
│   again. My father always said this     │
│   field wants wheat. Would you          │
│   consider barley instead?              │
│   I'll reduce rent 5% if you do."       │
│                                         │
│  [Accept −5% rent, plant barley]       │
│  [Decline (relationship −10)]          │
│  [Ignore (may affect renewal)]         │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Land** (`store/useGameStore.ts`) | Parcels gain `tenancy` field. Rented parcels cannot be sold/mortgaged. |
| **Economy** | Rent payments are major fixed costs. Cash flow planning becomes essential. |
| **Subsidies** (Spec 04) | `subsidyAllocation` in lease determines who gets CAP. Default: farmer for cash rent, split for sharecrop. |
| **Crops** | Landlord may restrict crops ("no corn — too thirsty"). Sharecropped harvest triggers split modal. |
| **Soil** (Spec 01) | Soil improvement clauses reward good stewardship. Degradation penalties punish abuse. |
| **World Map** | Available lease parcels appear on map with price tags. |
| **Banking** | Banks may require lease agreements as collateral proof for expansion loans. |

---

## 9. Files to Create / Modify

### New Files
```
types/leases.ts                # LeaseAgreement, Landlord, LeasableParcel
data/landlordTypes.ts          # Landlord archetypes and personalities
engine/leases.ts               # Rent calculator, sharecrop resolution, renewal logic
components/LandMarket.tsx      # Land market browsing screen
components/LeaseDetail.tsx     # Lease management modal
components/SharecropSettlement.tsx # Harvest split modal
components/LandlordEvent.tsx   # Meddling landlord pop-up
```

### Modified Files
```
store/useGameStore.ts          # Tenancy state, lease array, land market, payment processing
app/(tabs)/tierras.tsx         # Ownership badges, lease filter, land market entry
app/(tabs)/oficina.tsx         # Lease obligations in financial overview
app/(tabs)/economia.tsx        # Rent as fixed cost in annual breakdown
engine/crops.ts                # Harvest resolution checks tenancy type for sharecrop split
```

---

## 10. Balance Notes

- **Early game:** A 10ha cash rent at €300/ha = €3,000/year fixed cost. With organic transition (Spec 03) + subsidies (Spec 04), this is manageable but tight.
- **Sharecropping as training wheels:** 50/50 sharecrop with landlord paying inputs = zero risk, zero capital, but capped at ~€2,000/year on 10ha. Good for learning without bankruptcy.
- **Scaling path:** Year 1–2 = sharecrop. Year 3–5 = cash rent. Year 6+ = buy.
- **Degraded land arbitrage:** Cheap rent on compacted/saline land. Player invests in restoration (Spec 01), gets yield boost, pays low rent. Soil improvement clause gives rent reduction.
- **Eviction is devastating:** Losing leased land mid-season = crop forfeiture. Late rent payment should feel genuinely scary.

---

## 11. Open Questions

1. **Permanent buildings on leased land:** Can the player build silos, irrigation, or greenhouses on rented parcels? If yes, who owns them at lease end? (Suggested: allow with 5+ year leases; buildings revert to landlord or must be dismantled.)
2. **Lease negotiation mini-game:** Should counter-offers be a simple form, or a dialogue-tree negotiation with personality-based responses?
3. **Family land:** Should the player start with a "family parcel" that's owned but comes with implicit obligations (visit parents, maintain traditional crops)?
4. **Purchase option:** Should long-term leases include a right-to-buy clause (€X/ha after 10 years)? Common in real farm transitions.

---

*Ready for review. Once approved, we move to Spec 06: Storage Quality Decay.*
