# Spec 03: Organic Certification & Transition Period

**Tier:** 1 — High-Impact Realism Gaps  
**Status:** Draft  
**Dependencies:** Spec 01 (soil amendments), Spec 02 (tillage / mechanical weed control), market system (`engine/market.ts`), contract system (`engine/contracts.ts`), crop system.

---

## 1. Objective

Model the **strategic risk/reward arc of organic transition** — one of the most consequential decisions real farmers make. The player must survive a 3-year "valley of death" where yields drop, input costs shift, and premium prices are still out of reach, in exchange for eventual access to high-margin organic markets. One mistake (a single synthetic spray) resets the clock for 3 years. This is a genuine long-term bet, not a toggle.

---

## 2. Design Principles

1. **Farm-wide commitment, parcel-level compliance:** Organic certification applies to the whole farm, but every parcel is audited. One slip anywhere risks everything.
2. **The valley of death is real:** Transition is financially painful. Early-game players should struggle to afford it. It must feel like a strategic pivot, not an upgrade.
3. **Premium prices are earned, not given:** Only after full certification. During transition, you sell at conventional prices with lower yields = genuine hardship.
4. **Consequence is memorable:** Decertification is devastating (3-year ban). The UI must make compliance status viscerally clear before every input application.
5. **No hidden checks:** Player always knows which inputs are organic-compliant and which risk decertification.

---

## 3. Data Model

### 3.1 Organic Certification State

```ts
// types/organic.ts
export type OrganicStatus = 
  | 'conventional'      // Default
  | 'applicationPending' // Paid fee, waiting inspection
  | 'inTransition'      // 3-year transition period
  | 'certifiedOrganic'; // Full certification

export interface OrganicCertification {
  status: OrganicStatus;
  applicationDay: number | null;
  transitionStartDay: number | null;
  certificationDay: number | null;
  transitionYearsCompleted: number; // 0, 1, 2, 3
  
  // Compliance tracking
  lastInspectionDay: number;
  nextInspectionDay: number;
  inspectionHistory: InspectionRecord[];
  complianceViolations: ComplianceViolation[];
  
  // Decertification lockout
  decertifiedUntilDay: number | null; // if decertified, can't reapply until this day
  
  // Market access
  organicBuyersUnlocked: boolean;
  organicContractsAvailable: boolean;
}

export interface InspectionRecord {
  day: number;
  result: 'pass' | 'warning' | 'fail';
  parcelId: string | null; // null = whole-farm document audit
  notes: string[];
}

export interface ComplianceViolation {
  day: number;
  parcelId: string;
  violation: 'syntheticPesticide' | 'syntheticFertilizer' | 'gmoSeed' | 'missingRecords';
  inputName: string;
  autoDecertify: boolean; // true for pesticide/fertilizer, false for records
}
```

### 3.2 Input Classification (extends existing data)

Every input in the game needs an `organicCompliance` flag:

```ts
// types/inputs.ts (new — or extend existing data files)
export interface InputCompliance {
  organicAllowed: boolean;
  organicAlternativeId?: string; // e.g., "syntheticNPK" → "organicCompost"
  complianceCategory: 'seed' | 'fertilizer' | 'pesticide' | 'amendment' | 'herbicide';
}
```

**Banned for organic:**
- Synthetic NPK fertilizers (urea, ammonium nitrate, superphosphate)
- Synthetic pesticides/herbicides (glyphosate, neonicotinoids)
- GMO seeds
- Growth hormones (for animals)
- Antibiotics as growth promoters

**Allowed for organic:**
- Organic compost, manure, green manure
- Lime, gypsum, rock phosphate
- Biological pest control (beneficial insects, BT bacteria)
- Mechanical weed control (flaming, hoeing)
- Non-GMO / organic-certified seeds
- Copper/sulfur fungicides (restricted — annual limit)

---

## 4. Static Data (`data/organicRules.ts`)

```ts
export const organicRules = {
  transitionPeriodDays: 1095, // 3 years
  reapplicationBanDays: 1095,  // 3 years after decertification
  
  // Inspection schedule
  inspections: {
    initialInspectionDelay: 30,     // days after application
    transitionInspectionInterval: 180, // every 6 months during transition
    certifiedInspectionInterval: 365,  // annual once certified
    surpriseInspectionChance: 0.05,    // 5% per day during transition
  },
  
  // Yield penalties during transition (crop-specific overrides in cropTypes.ts)
  defaultYieldPenalty: 0.30,        // -30% yield
  transitionYearModifiers: {
    1: 0.60,  // Year 1: 60% of conventional yield
    2: 0.75,  // Year 2: 75%
    3: 0.85,  // Year 3: 85%
  },
  
  // Price premiums after certification
  premiumMultipliers: {
    localMarket: 1.35,    // +35%
    cityMarket: 1.60,     // +60%
    exportMarket: 2.00,   // +100%
    csaSubscription: 1.80, // +80% (see Spec 13)
  },
  
  // Application costs
  applicationFee: 2500,
  annualInspectionFee: 800,
  
  // Volume restrictions: organic buyers want smaller lots, higher quality
  maxLotSizeOrganic: 50, // tons (vs 200 conventional)
};

export const decertificationRules = {
  // Automatic immediate decertification
  autoFail: ['syntheticPesticide', 'syntheticFertilizer', 'gmoSeed'],
  // Warning first, fail on repeat
  warningFirst: ['missingRecords'],
  // Restricted inputs with annual limits
  restrictedAnnualLimits: {
    copperFungicide: 6,     // kg/ha/year
    sulfurFungicide: 20,    // kg/ha/year
  },
};
```

### 4.1 Crop-Specific Organic Overrides

Extend `data/cropTypes.ts`:

```ts
export interface CropType {
  // ... existing fields
  organic: {
    yieldPenaltyPercent: number;    // override default if crop is harder/easier
    premiumMultiplier: number;       // some crops command higher organic premiums
    organicSeedCostMultiplier: number; // organic seeds cost more
    isGmoAvailable: boolean;         // if false, no temptation
  };
}

// Example:
{
  id: 'tomato',
  organic: {
    yieldPenaltyPercent: 20,    // tomatoes handle organic well
    premiumMultiplier: 2.2,     // organic tomatoes = gold
    organicSeedCostMultiplier: 2.5,
    isGmoAvailable: false,
  }
}
```

---

## 5. Engine Logic (`engine/organic.ts`)

### 5.1 Yield Modifier

```ts
export function computeOrganicYieldModifier(
  crop: CropType,
  certification: OrganicCertification,
  day: number,
): number {
  if (certification.status === 'conventional' || certification.status === 'applicationPending') {
    return 1.0;
  }
  
  if (certification.status === 'inTransition') {
    const daysInTransition = day - (certification.transitionStartDay || day);
    const year = Math.min(3, Math.floor(daysInTransition / 365) + 1);
    const baseModifier = organicRules.transitionYearModifiers[year as 1 | 2 | 3];
    const cropPenalty = crop.organic.yieldPenaltyPercent / 100;
    return baseModifier * (1 - cropPenalty);
  }
  
  if (certification.status === 'certifiedOrganic') {
    // No penalty once certified
    return 1.0;
  }
  
  return 1.0;
}
```

### 5.2 Price Premium

```ts
export function computeOrganicPriceMultiplier(
  crop: CropType,
  marketTier: 'local' | 'city' | 'export',
  certification: OrganicCertification,
): number {
  if (certification.status !== 'certifiedOrganic') {
    return 1.0; // No premium during transition!
  }
  
  const basePremium = organicRules.premiumMultipliers[marketTier];
  const cropPremium = crop.organic.premiumMultiplier;
  
  // Average the market tier premium with crop-specific premium
  return (basePremium + cropPremium) / 2;
}
```

### 5.3 Inspection Resolution

```ts
export interface InspectionResult {
  passed: boolean;
  grade: 'excellent' | 'satisfactory' | 'minorIssues' | 'fail';
  violations: ComplianceViolation[];
  cost: number;
}

export function runInspection(
  certification: OrganicCertification,
  parcels: LandParcel[],
  inventory: Inventory,
  day: number,
  randomSeed: number, // for deterministic "randomness" if needed
): InspectionResult {
  const violations: ComplianceViolation[] = [];
  
  // Check every parcel for banned inputs in application history
  parcels.forEach(parcel => {
    const recentApplications = parcel.inputHistory?.filter(
      h => day - h.day <= 365 // check last year
    ) || [];
    
    recentApplications.forEach(app => {
      const input = getInputById(app.inputId);
      if (!input.organicAllowed) {
        violations.push({
          day: app.day,
          parcelId: parcel.id,
          violation: input.complianceCategory === 'pesticide' ? 'syntheticPesticide' : 'syntheticFertilizer',
          inputName: input.name,
          autoDecertify: true,
        });
      }
    });
  });
  
  // Document check
  const hasCompleteRecords = certification.inspectionHistory.length > 0 || day - certification.applicationDay! < 60;
  if (!hasCompleteRecords && Math.random() > 0.7) {
    violations.push({
      day,
      parcelId: parcels[0]?.id || 'farm',
      violation: 'missingRecords',
      inputName: 'Documentation',
      autoDecertify: false,
    });
  }
  
  const autoFails = violations.filter(v => v.autoDecertify);
  const passed = autoFails.length === 0;
  
  return {
    passed,
    grade: passed 
      ? (violations.length === 0 ? 'excellent' : 'minorIssues')
      : 'fail',
    violations,
    cost: organicRules.annualInspectionFee,
  };
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface OrganicActions {
  // Phase 1: Apply for certification
  applyForOrganicCertification(): void; // Deducts €2,500, sets status to 'applicationPending'
  
  // Phase 2: Inspector initial visit (triggered automatically after 30 days)
  completeInitialInspection(): void; // Sets status to 'inTransition', records start day
  
  // Phase 3: Annual inspections (auto-triggered)
  runAnnualInspection(): void;
  
  // Violation handling
  recordComplianceViolation(violation: ComplianceViolation): void;
  
  // Decertification
  decertifyFarm(reason: string): void; // Resets to conventional, sets 3-year ban
  
  // UI helper
  checkInputCompliance(inputId: string, parcelId?: string): { allowed: boolean; reason?: string };
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickOrganicCertification(state: GameState, day: number): void {
  const cert = state.organicCertification;
  
  if (cert.status === 'applicationPending' && day - cert.applicationDay! >= 30) {
    // Auto-trigger initial inspection
    const result = runInspection(cert, state.parcels, state.inventory, day, day);
    cert.inspectionHistory.push({ day, result: result.passed ? 'pass' : 'fail', parcelId: null, notes: result.violations.map(v => v.violation) });
    
    if (result.passed) {
      cert.status = 'inTransition';
      cert.transitionStartDay = day;
    } else {
      // Application denied — refund half, can reapply in 90 days
      state.money += 1250;
      cert.status = 'conventional';
      cert.applicationDay = null;
    }
  }
  
  if (cert.status === 'inTransition') {
    // Scheduled inspections every 180 days
    if (day - cert.lastInspectionDay >= 180) {
      const result = runInspection(cert, state.parcels, state.inventory, day, day);
      cert.inspectionHistory.push({ day, result: result.passed ? 'pass' : 'fail', parcelId: null, notes: [] });
      cert.lastInspectionDay = day;
      
      if (!result.passed) {
        handleInspectionFailure(state, result);
      }
    }
    
    // Surprise inspections (5% chance)
    if (Math.random() < organicRules.inspections.surpriseInspectionChance) {
      const result = runInspection(cert, state.parcels, state.inventory, day, day);
      if (!result.passed) {
        handleInspectionFailure(state, result);
      }
    }
    
    // Check transition completion
    const daysInTransition = day - cert.transitionStartDay!;
    cert.transitionYearsCompleted = Math.floor(daysInTransition / 365);
    
    if (daysInTransition >= organicRules.transitionPeriodDays) {
      cert.status = 'certifiedOrganic';
      cert.certificationDay = day;
      cert.organicBuyersUnlocked = true;
      cert.organicContractsAvailable = true;
      state.newsEvents.push({
        day,
        headline: 'Farm Achieves Organic Certification!',
        body: 'After three years of transition, your farm is now certified organic. Premium markets are now open.',
        type: 'achievement',
      });
    }
  }
  
  if (cert.status === 'certifiedOrganic' && day - cert.lastInspectionDay >= 365) {
    // Annual recertification inspection
    const result = runInspection(cert, state.parcels, state.inventory, day, day);
    cert.lastInspectionDay = day;
    if (!result.passed) {
      handleInspectionFailure(state, result);
    }
  }
}

function handleInspectionFailure(state: GameState, result: InspectionResult): void {
  const autoFails = result.violations.filter(v => v.autoDecertify);
  
  if (autoFails.length > 0) {
    // DECERTIFICATION
    const cert = state.organicCertification;
    const previousStatus = cert.status;
    
    cert.status = 'conventional';
    cert.decertifiedUntilDay = state.day + organicRules.reapplicationBanDays;
    cert.organicBuyersUnlocked = false;
    cert.organicContractsAvailable = false;
    cert.transitionStartDay = null;
    cert.transitionYearsCompleted = 0;
    
    // Penalty: existing organic contracts are void
    state.contracts = state.contracts.filter(c => {
      if (c.requiresOrganic) {
        state.money -= c.penalty || 0;
        return false;
      }
      return true;
    });
    
    state.newsEvents.push({
      day: state.day,
      headline: previousStatus === 'certifiedOrganic' ? 'ORGANIC CERTIFICATION REVOKED' : 'Organic Transition Failed',
      body: `Violation detected: ${autoFails[0].inputName} on ${autoFails[0].parcelId}. 3-year ban from reapplication.`,
      type: 'disaster',
    });
  }
}
```

---

## 7. UI/UX Design

### 7.1 Oficina Tab — Organic Sub-Tab

New sub-tab in the Office screen: **"Organic"**

```
┌─────────────────────────────────────────┐
│  🌿 ORGANIC CERTIFICATION              │
│                                         │
│  Status: IN TRANSITION — Year 2 of 3   │
│  [████████████░░░░░░░░░░░░] 67%        │
│                                         │
│  Next inspection: Day 842 (in 18 days) │
│  Last inspection: PASSED (Day 660)     │
│                                         │
│  ⚠️ YIELD PENALTY ACTIVE               │
│  Current modifier: −25%                │
│                                         │
│  [View Compliance Log]                 │
│  [Apply for Certification] (locked)    │
└─────────────────────────────────────────┘
```

**If certified:**
```
┌─────────────────────────────────────────┐
│  ✅ CERTIFIED ORGANIC                   │
│  Certified since: Day 1,200             │
│  Annual inspection: Day 1,560           │
│                                         │
│  💰 ORGANIC PREMIUMS ACTIVE             │
│  Export market: +100%                   │
│  City market: +60%                      │
│                                         │
│  🚫 DECERTIFICATION RISK                │
│  Zero tolerance for synthetic inputs    │
└─────────────────────────────────────────┘
```

### 7.2 Input Application Warnings

When player attempts to apply ANY input while `status === 'inTransition' || status === 'certifiedOrganic'`:

**Blocking modal for banned inputs:**
```
┌─────────────────────────────────────────┐
│  🚨 ORGANIC COMPLIANCE WARNING         │
│                                         │
│  Glyphosate is NOT organic-compliant.  │
│                                         │
│  Applying this will:                    │
│  ❌ FAIL next inspection                │
│  ❌ DECERTIFY your farm                 │
│  ❌ Ban reapplication for 3 years       │
│  ❌ Void all organic contracts          │
│                                         │
│  [Cancel]  [Apply Anyway (DANGER)]     │
└─────────────────────────────────────────┘
```

**Non-blocking info for allowed inputs:**
```
✅ Organic compliant — Copper sulfate (limit: 4.2/6 kg/ha this year)
```

### 7.3 Market UI — Organic Filter

In the selling/market screens:
- Toggle: "Show organic buyers only" (unlocked after certification)
- Organic buyers show green leaf icon 🌿
- Organic contracts show higher prices but stricter terms

### 7.4 Parcel-Level Compliance Indicators

In Tierras list/map view:
- Small green dot = organic-compliant inputs only (last 365 days)
- Small amber dot = transition period, no violations yet
- Small red dot = violation risk detected (recent banned input)
- Red skull = parcel triggered decertification

---

## 8. Market & Contract Integration

### 8.1 Organic Buyers

New buyer types in `data/marketRegions.ts` or contract templates:

```ts
{
  id: 'organicCooperative',
  name: 'Cooperativa Ecológica del Norte',
  requiresOrganic: true,
  basePriceMultiplier: 1.8,
  minQuality: 75,
  maxQuantityPerContract: 30, // tons
  paymentTerms: 'net30',
  loyaltyBonus: 0.05, // +5% per renewal
}
```

### 8.2 Organic Contracts

- Only available when `organicContractsAvailable === true`
- Higher prices (+60–100%)
- Lower volume caps (max 50t vs 200t conventional)
- Strict quality gates (no blemishes, specific size grades)
- **Decertification clause:** If farm loses certification, contract is void + penalty (€5,000–€20,000 depending on contract value)

### 8.3 CSA Integration (Spec 13 Prep)

CSA subscriptions (Spec 13) require organic certification for premium tiers:
- "Conventional box" = standard price
- "Organic box" = +80% price, only available if certified

---

## 9. Files to Create / Modify

### New Files
```
types/organic.ts               # Certification types, violations, inspection records
data/organicRules.ts           # Transition durations, premiums, inspection schedule
engine/organic.ts              # Yield modifier, price premium, inspection engine
components/OrganicDashboard.tsx # Office sub-tab UI
components/ComplianceWarning.tsx # Pre-application modal
components/OrganicMarketBadge.tsx # Leaf icon + premium display
```

### Modified Files
```
store/useGameStore.ts          # Organic state, actions, advanceDay integration
engine/crops.ts                # Yield formula calls computeOrganicYieldModifier
engine/market.ts               # Price formula calls computeOrganicPriceMultiplier
engine/contracts.ts            # Organic contract eligibility, decertification penalties
data/cropTypes.ts              # Add organic{} block to each crop
data/seedTypes.ts              # Flag organic vs GMO vs conventional seeds
data/fertilizerTypes.ts        # Flag synthetic vs organic fertilizers
data/pesticideTypes.ts         # Flag synthetic vs biological pesticides
app/(tabs)/oficina.tsx         # Add Organic sub-tab
app/(tabs)/mercado.tsx         # Organic buyer filter, premium display
app/(tabs)/tierras.tsx         # Compliance dot indicators on parcels
```

---

## 10. Balance Notes

- **Early game (years 1–2):** Organic transition is suicide. You're losing 30% yield with no premium. Only viable if you have significant savings or subsidy income (Spec 04).
- **Mid game (year 3–5):** The valley of death. Cash flow is tight. One bad harvest + transition penalty = bankruptcy risk.
- **Late game (year 6+):** If you survive, organic premiums + CSA subscriptions + export contracts create a high-margin, low-volume business model.
- **Risk curve:** Conventional = consistent, predictable. Organic = volatile, high reward, catastrophic if you slip.
- **Strategic variant:** Some players may "farm conventionally" for 5 years to build capital, THEN transition to organic for late-game prestige and profit.

---

## 11. Open Questions

1. **Partial decertification:** Should decertification affect the whole farm, or can we allow "parcel-level organic" for diversified farms? (Real EU regs are whole-farm, but parcel-level might be more forgiving gameplay.)
2. **Record-keeping mini-game:** Should players actively maintain an input log, or is compliance auto-checked from store history? (Auto-check is simpler; manual log-keeping adds realism but may feel tedious.)
3. **Organic seed supply:** Should organic seeds have limited availability (seasonal, only from certain suppliers) to create supply-chain tension?
4. **Animal products:** Should organic certification extend to animal products (organic milk, eggs, meat) with separate feed requirements? (This connects to Spec 09 — Feed Ration Balancing.)

---

*Ready for review. Once approved, we move to Tier 2 — Spec 04: Government Subsidies / CAP Payments.*
