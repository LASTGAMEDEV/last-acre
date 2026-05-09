# Spec 04: Government Subsidies / CAP Payments

**Tier:** 2 — Economic & Business Depth  
**Status:** Draft  
**Dependencies:** Existing economy system, land/parcel system, crop system. Future integration with Spec 12 (hedgerows/buffers).

---

## 1. Objective

Model the **European Common Agricultural Policy (CAP / PAC)** as a core economic pillar. For Spanish farmers — especially young farmers starting out — CAP payments can represent 30–50% of early-game income. The system must feel authentically bureaucratic (applications, inspections, cross-compliance) while teaching players that subsidy strategy is as important as market strategy. Greening requirements create natural bridges to crop diversification, cover crops, and hedgerows.

---

## 2. Design Principles

1. **Subsidies are income, not bonus:** Early-game cash flow should literally depend on timely CAP applications. Missing the deadline = financial crisis.
2. **Greening as gameplay, not checkbox:** Crop diversification (≥3 crops) and ecological focus areas (EFAs) force meaningful farm planning, not just "plant monoculture everywhere."
3. **Bureaucracy is part of the fun:** Application windows, inspection risks, and payment delays create seasonal rhythm and tension.
4. **Young farmer bonus as starter juice:** Amplifies the game's existing "young farmer" narrative. First 5 years = significantly easier economics.
5. **Penalty, not prohibition:** Failing greening reduces payments by 30%, but doesn't block them entirely. Players can choose "pay reduction, ignore greening" as a valid (if expensive) strategy.

---

## 3. Data Model

### 3.1 Subsidy Program Types

```ts
// types/subsidies.ts
export type SubsidyProgramId = 
  | 'basicPayment'           // Pago Básico — per hectare
  | 'greeningPayment'        // Pago Verde — conditional on greening
  | 'youngFarmerPayment'     // Ayuda a Jóvenes Agricultores
  | 'agriEnvironmentScheme'  // Programas agroambientales (voluntary)
  | 'organicFarmingAid'      // Aid for organic conversion (connects to Spec 03)
  | 'livestockPremium';      // Per head payments for cattle/sheep

export interface SubsidyProgram {
  id: SubsidyProgramId;
  name: string;
  nameEs: string;
  description: string;
  
  // Payment structure
  paymentType: 'perHectare' | 'perHead' | 'lumpSum' | 'costReimbursement';
  baseRatePerHa: number;        // €/hectare/year
  baseRatePerHead: number;      // €/animal/year
  maxHectares: number;          // CAP caps at X hectares per farm
  
  // Timing
  applicationWindow: { openDay: number; closeDay: number }; // days of year (1-365)
  advancePaymentPercent: number; // e.g., 70% in October, 30% in December
  advancePaymentDay: number;
  balancePaymentDay: number;
  
  // Eligibility
  minHectares: number;
  maxHectares: number;
  requiresGreening: boolean;
  requiresActiveFarmer: boolean;
  maxAgeForYoungFarmer: number; // 40 in EU
  yearsSinceInstallationMax: number; // for young farmer
}
```

### 3.2 Annual Subsidy Application

```ts
export interface SubsidyApplication {
  year: number;
  programId: SubsidyProgramId;
  status: 'draft' | 'submitted' | 'underReview' | 'approved' | 'paid' | 'rejected' | 'penalized';
  
  // Claimed areas
  hectaresClaimed: number;
  parcelsClaimed: string[]; // parcel IDs
  
  // Compliance
  greeningCompliance: GreeningStatus;
  crossCompliancePass: boolean;
  penaltyPercent: number; // 0–100, deducted from payment
  
  // Payments
  advancePaid: number;
  balancePaid: number;
  totalPaid: number;
  
  // Timeline
  submittedDay: number | null;
  approvedDay: number | null;
}
```

### 3.3 Greening Status

```ts
export interface GreeningStatus {
  // Crop diversification (Art. 9)
  cropDiversification: {
    totalArableHa: number;
    mainCropHa: number;
    mainCropPercent: number;
    secondCropHa: number;
    thirdPlusCropHa: number;
    meetsRequirement: boolean; // ≥3 crops if arable > 30ha
  };
  
  // Ecological Focus Areas (EFA) (Art. 10)
  efa: {
    totalEfaHa: number;
    requiredEfaHa: number; // 5% of arable land (>15ha)
    efaElements: EfaElement[];
    meetsRequirement: boolean;
  };
  
  // Permanent grassland (Art. 11)
  permanentGrassland: {
    currentHa: number;
    referenceHa: number; // baseline year
    ratio: number; // must not fall >5% below reference
    meetsRequirement: boolean;
  };
  
  overallGreeningPass: boolean;
  penaltyPercent: number; // 30% if fail
}

export interface EfaElement {
  type: 'hedgerow' | 'bufferStrip' | 'fallowLand' | 'coverCrop' | 'agroforestry' | 'nitrogenFixingCrop';
  parcelId: string | null;
  hectares: number;
  weightFactor: number; // CAP weighting: hedgerow = 1.5x, cover crop = 0.3x, etc.
  efaEquivalent: number; // hectares * weightFactor
}
```

---

## 4. Static Data (`data/subsidyPrograms.ts`)

```ts
import { SubsidyProgram } from '../types/subsidies';

export const subsidyPrograms: SubsidyProgram[] = [
  {
    id: 'basicPayment',
    name: 'Basic Payment Scheme',
    nameEs: 'Pago Básico',
    description: 'Direct income support per hectare of agricultural land.',
    paymentType: 'perHectare',
    baseRatePerHa: 185,      // Approximate Spanish average
    maxHectares: 300,        // Degressive above this
    applicationWindow: { openDay: 60, closeDay: 120 }, // March–April
    advancePaymentPercent: 70,
    advancePaymentDay: 274,  // October 1
    balancePaymentDay: 335,  // December 1
    minHectares: 1,
    maxHectares: 9999,
    requiresGreening: false,
    requiresActiveFarmer: true,
  },
  
  {
    id: 'greeningPayment',
    name: 'Greening Payment',
    nameEs: 'Pago Verde',
    description: 'Additional payment for complying with environmental standards.',
    paymentType: 'perHectare',
    baseRatePerHa: 95,       // ~35% of basic payment
    maxHectares: 300,
    applicationWindow: { openDay: 60, closeDay: 120 },
    advancePaymentPercent: 70,
    advancePaymentDay: 274,
    balancePaymentDay: 335,
    minHectares: 1,
    maxHectares: 9999,
    requiresGreening: true,
    requiresActiveFarmer: true,
  },
  
  {
    id: 'youngFarmerPayment',
    name: 'Young Farmer Payment',
    nameEs: 'Ayuda al Joven Agricultor',
    description: 'Top-up for farmers under 40 in their first 5 years.',
    paymentType: 'perHectare',
    baseRatePerHa: 65,       // additional to basic
    maxHectares: 90,         // capped
    applicationWindow: { openDay: 60, closeDay: 120 },
    advancePaymentPercent: 100,
    advancePaymentDay: 274,
    balancePaymentDay: 274,
    minHectares: 1,
    maxHectares: 90,
    requiresGreening: false,
    requiresActiveFarmer: true,
    maxAgeForYoungFarmer: 40,
    yearsSinceInstallationMax: 5,
  },
  
  {
    id: 'agriEnvironmentScheme',
    name: 'Agri-Environment Scheme',
    nameEs: 'Programa Agroambiental',
    description: 'Voluntary payments for environmental services.',
    paymentType: 'perHectare',
    baseRatePerHa: 250,      // higher because voluntary + strict
    maxHectares: 100,
    applicationWindow: { openDay: 1, closeDay: 90 }, // Jan–March
    advancePaymentPercent: 50,
    advancePaymentDay: 180,  // June
    balancePaymentDay: 330,  // November
    minHectares: 2,
    maxHectares: 100,
    requiresGreening: false, // scheme IS the environmental action
    requiresActiveFarmer: true,
  },
  
  {
    id: 'organicFarmingAid',
    name: 'Organic Conversion Aid',
    nameEs: 'Ayuda a la Conversión a Ecológico',
    description: 'Support during the 3-year organic transition.',
    paymentType: 'perHectare',
    baseRatePerHa: 320,      // generous because transition is hard
    maxHectares: 150,
    applicationWindow: { openDay: 60, closeDay: 120 },
    advancePaymentPercent: 50,
    advancePaymentDay: 180,
    balancePaymentDay: 330,
    minHectares: 1,
    maxHectares: 150,
    requiresGreening: false,
    requiresActiveFarmer: true,
  },
];
```

### 4.1 CAP Degressivity

```ts
export function applyDepressivity(hectares: number, baseRate: number): number {
  // CAP reduces payments above certain thresholds
  if (hectares <= 50) return baseRate;
  if (hectares <= 150) return baseRate * 0.95;
  if (hectares <= 300) return baseRate * 0.80;
  return baseRate * 0.50; // heavy reduction above 300ha
}
```

---

## 5. Engine Logic (`engine/subsidies.ts`)

### 5.1 Greening Compliance Check

```ts
export function checkGreeningCompliance(
  parcels: LandParcel[],
  efaElements: EfaElement[],
  referenceGrasslandHa: number,
): GreeningStatus {
  const arableParcels = parcels.filter(p => p.type === 'arable');
  const totalArableHa = arableParcels.reduce((sum, p) => sum + p.sizeHa, 0);
  
  // Crop diversification
  const cropAreas = new Map<string, number>();
  arableParcels.forEach(p => {
    if (p.currentCrop) {
      const current = cropAreas.get(p.currentCrop.cropId) || 0;
      cropAreas.set(p.currentCrop.cropId, current + p.sizeHa);
    }
  });
  
  const sortedCrops = Array.from(cropAreas.entries()).sort((a, b) => b[1] - a[1]);
  const mainCropHa = sortedCrops[0]?.[1] || 0;
  const secondCropHa = sortedCrops[1]?.[1] || 0;
  const thirdPlusCropHa = sortedCrops.slice(2).reduce((s, [, ha]) => s + ha, 0);
  
  const cropDivMeet = totalArableHa <= 10 ? true :
    totalArableHa <= 30 ? (mainCropHa / totalArableHa) <= 0.75 :
    sortedCrops.length >= 3 && 
    (mainCropHa / totalArableHa) <= 0.75 && 
    (mainCropHa + secondCropHa) / totalArableHa <= 0.95;
  
  // EFA
  const totalEfa = efaElements.reduce((sum, e) => sum + e.efaEquivalent, 0);
  const requiredEfa = totalArableHa > 15 ? totalArableHa * 0.05 : 0;
  
  // Permanent grassland
  const currentGrassHa = parcels.filter(p => p.type === 'permanentGrassland').reduce((s, p) => s + p.sizeHa, 0);
  const grasslandRatio = referenceGrasslandHa > 0 ? currentGrassHa / referenceGrasslandHa : 1;
  
  const greeningPass = cropDivMeet && totalEfa >= requiredEfa && grasslandRatio >= 0.95;
  
  return {
    cropDiversification: {
      totalArableHa,
      mainCropHa,
      mainCropPercent: mainCropHa / totalArableHa,
      secondCropHa,
      thirdPlusCropHa,
      meetsRequirement: cropDivMeet,
    },
    efa: {
      totalEfaHa: totalEfa,
      requiredEfaHa: requiredEfa,
      efaElements,
      meetsRequirement: totalEfa >= requiredEfa,
    },
    permanentGrassland: {
      currentHa: currentGrassHa,
      referenceHa: referenceGrasslandHa,
      ratio: grasslandRatio,
      meetsRequirement: grasslandRatio >= 0.95,
    },
    overallGreeningPass: greeningPass,
    penaltyPercent: greeningPass ? 0 : 30,
  };
}
```

### 5.2 Payment Calculation

```ts
export function calculateSubsidyPayment(
  program: SubsidyProgram,
  hectaresClaimed: number,
  greeningStatus: GreeningStatus,
  isYoungFarmer: boolean,
  yearsSinceInstallation: number,
): { gross: number; penalty: number; net: number } {
  const cappedHectares = Math.min(hectaresClaimed, program.maxHectares);
  const degressiveRate = applyDepressivity(cappedHectares, program.baseRatePerHa);
  let gross = cappedHectares * degressiveRate;
  
  // Young farmer cap
  if (program.id === 'youngFarmerPayment' && yearsSinceInstallation > program.yearsSinceInstallationMax!) {
    gross = 0;
  }
  
  // Greening penalty
  let penalty = 0;
  if (program.requiresGreening || program.id === 'greeningPayment') {
    penalty = gross * (greeningStatus.penaltyPercent / 100);
  }
  
  return { gross, penalty, net: gross - penalty };
}
```

### 5.3 Agri-Environment Scheme Options

```ts
export interface AgriEnvCommitment {
  id: string;
  name: string;
  paymentPerHa: number;
  minDurationYears: number;
  requirements: {
    minHectares: number;
    maxHectares: number;
    forbiddenInputs: string[];
    requiredPractices: string[];
  };
  currentCommitment: {
    hectares: number;
    parcels: string[];
    startYear: number;
    endYear: number;
  } | null;
}

export const agriEnvironmentOptions: AgriEnvCommitment[] = [
  {
    id: 'wetlandMaintenance',
    name: 'Wetland & Pond Maintenance',
    nameEs: 'Mantenimiento de Humedales',
    paymentPerHa: 380,
    minDurationYears: 5,
    requirements: {
      minHectares: 1,
      maxHectares: 20,
      forbiddenInputs: ['syntheticPesticide', 'syntheticFertilizer'],
      requiredPractices: ['maintainWaterLevel', 'noDrainage'],
    },
    currentCommitment: null,
  },
  {
    id: 'coverCropPremium',
    name: 'Winter Cover Crop Program',
    nameEs: 'Programa de Cultivos de Cobertura',
    paymentPerHa: 180,
    minDurationYears: 3,
    requirements: {
      minHectares: 5,
      maxHectares: 100,
      forbiddenInputs: [],
      requiredPractices: ['plantCoverCropByOct15', 'noTillUntilMarch'],
    },
    currentCommitment: null,
  },
  {
    id: 'wildlifeCorridor',
    name: 'Wildlife Corridor Network',
    nameEs: 'Red de Corredores de Fauna',
    paymentPerHa: 420,
    minDurationYears: 7,
    requirements: {
      minHectares: 2,
      maxHectares: 50,
      forbiddenInputs: ['syntheticPesticide'],
      requiredPractices: ['maintainNativeVegetation', 'noMowingApr15ToJul15'],
    },
    currentCommitment: null,
  },
  {
    id: 'hedgerowRestoration',
    name: 'Traditional Hedgerow Restoration',
    nameEs: 'Restauración de Setos Tradicionales',
    paymentPerHa: 290,
    minDurationYears: 5,
    requirements: {
      minHectares: 0.5,
      maxHectares: 10,
      forbiddenInputs: [],
      requiredPractices: ['plantNativeSpecies', 'maintainHedgerowStructure'],
    },
    currentCommitment: null,
  },
];
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface SubsidyActions {
  // Annual application
  submitSubsidyApplication(year: number, programId: SubsidyProgramId, parcels: string[]): void;
  
  // Admin/inspection
  runSubsidyInspection(applicationId: string): void;
  
  // Payment processing (called in advanceDay)
  processSubsidyPayments(day: number): void;
  
  // Agri-environment
  enrollInAgriEnvScheme(schemeId: string, parcels: string[]): void;
  cancelAgriEnvScheme(schemeId: string): void; // penalties apply
  
  // Organic aid (connects to Spec 03)
  claimOrganicConversionAid(parcels: string[]): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickSubsidies(state: GameState, day: number): void {
  const year = Math.floor(day / 365) + 1;
  const dayOfYear = ((day - 1) % 365) + 1;
  
  // Check application windows
  subsidyPrograms.forEach(program => {
    const app = state.subsidyApplications.find(a => a.year === year && a.programId === program.id);
    
    // Auto-notify when window opens
    if (dayOfYear === program.applicationWindow.openDay && !app) {
      state.notifications.push({
        day,
        type: 'subsidy',
        message: `${program.nameEs} applications now open (closes day ${program.applicationWindow.closeDay})`,
        urgent: true,
      });
    }
    
    // Auto-notify 7 days before close
    if (dayOfYear === program.applicationWindow.closeDay - 7) {
      const existing = state.subsidyApplications.find(a => a.year === year && a.programId === program.id);
      if (!existing || existing.status === 'draft') {
        state.notifications.push({
          day,
          type: 'subsidy',
          message: `⚠️ ${program.nameEs} closes in 7 days!`,
          urgent: true,
        });
      }
    }
  });
  
  // Process payments
  state.subsidyApplications
    .filter(a => a.status === 'approved')
    .forEach(app => {
      const program = subsidyPrograms.find(p => p.id === app.programId)!;
      
      if (dayOfYear === program.advancePaymentDay && app.advancePaid === 0) {
        const amount = app.totalPaid * (program.advancePaymentPercent / 100);
        state.money += amount;
        app.advancePaid = amount;
        state.notifications.push({
          day,
          type: 'subsidy',
          message: `Advance payment received: €${amount.toFixed(0)} (${program.nameEs})`,
          urgent: false,
        });
      }
      
      if (dayOfYear === program.balancePaymentDay && app.balancePaid === 0) {
        const amount = app.totalPaid - app.advancePaid;
        state.money += amount;
        app.balancePaid = amount;
        state.notifications.push({
          day,
          type: 'subsidy',
          message: `Balance payment received: €${amount.toFixed(0)} (${program.nameEs})`,
          urgent: false,
        });
      }
    });
}
```

### 6.3 Application Submission Flow

```ts
function submitSubsidyApplication(state: GameState, year: number, programId: SubsidyProgramId, parcelIds: string[]): void {
  const program = subsidyPrograms.find(p => p.id === programId)!;
  const dayOfYear = ((state.day - 1) % 365) + 1;
  
  if (dayOfYear < program.applicationWindow.openDay || dayOfYear > program.applicationWindow.closeDay) {
    throw new Error('Application window closed');
  }
  
  const parcels = state.parcels.filter(p => parcelIds.includes(p.id));
  const hectares = parcels.reduce((s, p) => s + p.sizeHa, 0);
  
  // Run greening check if required
  const greening = program.requiresGreening 
    ? checkGreeningCompliance(state.parcels, state.efaElements, state.referenceGrasslandHa)
    : { overallGreeningPass: true, penaltyPercent: 0 } as GreeningStatus;
  
  const { gross, penalty, net } = calculateSubsidyPayment(
    program, hectares, greening, state.player.isYoungFarmer, state.player.yearsSinceInstallation
  );
  
  const app: SubsidyApplication = {
    year,
    programId,
    status: 'submitted',
    hectaresClaimed: hectares,
    parcelsClaimed: parcelIds,
    greeningCompliance: greening,
    crossCompliancePass: true, // TODO: cross-compliance engine
    penaltyPercent: greening.penaltyPercent,
    advancePaid: 0,
    balancePaid: 0,
    totalPaid: net,
    submittedDay: state.day,
    approvedDay: null,
  };
  
  state.subsidyApplications.push(app);
  
  // Auto-approve after 14 days (simplified; real CAP has remote sensing checks)
  // In practice, approval happens at payment time
}
```

---

## 7. UI/UX Design

### 7.1 Oficina Tab — Subsidies Sub-Tab

```
┌─────────────────────────────────────────┐
│  🏛️ SUBSIDIES & CAP PAYMENTS           │
│                                         │
│  APPLICATION WINDOW: OPEN (Day 65–120) │
│  ⏰ Closes in 48 days!                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ PAGO BÁSICO                     │   │
│  │ Claimed: 45 ha × €185 = €8,325 │   │
│  │ Status: SUBMITTED ✅            │   │
│  │ Expected payment: Dec 1         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ PAGO VERDE                      │   │
│  │ Claimed: 45 ha × €95 = €4,275  │   │
│  │ ⚠️ GREENING PENALTY APPLIED    │   │
│  │ Main crop: 82% (max 75%)        │   │
│  │ Penalty: −30% = €2,993 net      │   │
│  │ [Fix: Diversify crops →]        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ JOVEN AGRICULTOR                │   │
│  │ Claimed: 45 ha × €65 = €2,925  │   │
│  │ Years remaining: 3/5            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Manage Applications] [Agri-Env Schemes]│
└─────────────────────────────────────────┘
```

### 7.2 Greening Compliance Dashboard

```
┌─────────────────────────────────────────┐
│  🌿 GREENING COMPLIANCE                 │
│                                         │
│  CROP DIVERSIFICATION                   │
│  Total arable: 45 ha                    │
│  Wheat: 37 ha (82%) ⚠️ OVER LIMIT      │
│  Barley: 5 ha                           │
│  Sunflower: 3 ha                        │
│  ❌ NEEDS ≥3 crops under 75% main       │
│                                         │
│  ECOLOGICAL FOCUS AREAS                 │
│  Required: 2.25 ha (5% of arable)      │
│  Current: 1.8 ha (4%) ⚠️ SHORT         │
│  [Plant hedgerow] [Add buffer strip]   │
│                                         │
│  PERMANENT GRASSLAND                    │
│  Reference: 12 ha | Current: 11.8 ha   │
│  Ratio: 98% ✅                          │
└─────────────────────────────────────────┘
```

### 7.3 Agri-Environment Schemes Modal

```
┌─────────────────────────────────────────┐
│  VOLUNTARY ENVIRONMENTAL SCHEMES       │
│                                         │
│  [Wetland Maintenance]     €380/ha     │
│  5-year commitment | 1–20 ha           │
│  Status: ENROLLED (8 ha)               │
│  Next payment: June 180                 │
│                                         │
│  [Cover Crop Program]      €180/ha     │
│  3-year commitment | 5–100 ha          │
│  Status: AVAILABLE                     │
│  [Enroll parcels →]                    │
│                                         │
│  [Wildlife Corridor]       €420/ha     │
│  7-year commitment | 2–50 ha           │
│  Status: AVAILABLE                     │
└─────────────────────────────────────────┘
```

### 7.4 Payment Notification

When subsidy payments arrive:
```
💰 CAP Payment Received
Pago Básico (advance): +€5,828
Your farm has received the October advance payment.
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Land** (`store/useGameStore.ts`) | Hectares claimed = sum of `parcels.sizeHa`. Parcel type (`arable`, `permanentGrassland`) determines eligibility. |
| **Crops** (`data/cropTypes.ts`) | Crop diversification counts unique `cropId` across arable parcels. Cover crops can count as EFA. |
| **Organic** (Spec 03) | `organicFarmingAid` is a separate subsidy program. Can stack with basic payment. Organic parcels automatically qualify for agri-environment schemes. |
| **Hedgerows** (Spec 12) | Hedgerows count as EFA at 1.5x weight. Creates natural incentive to plant them. |
| **Economy** | Subsidies are the largest predictable income stream early game. Missing an application window should feel like a crisis. |
| **Contracts** | Some buyers may require CAP compliance proof. |
| **Calendar** | Application windows create seasonal urgency (March–April panic). Payment dates create cash flow rhythm. |

---

## 9. Files to Create / Modify

### New Files
```
types/subsidies.ts             # SubsidyProgram, SubsidyApplication, GreeningStatus
data/subsidyPrograms.ts        # Static CAP program definitions
data/agriEnvironmentSchemes.ts # Voluntary scheme definitions
engine/subsidies.ts            # Greening compliance, payment calculation, degressivity
components/SubsidyDashboard.tsx # Office sub-tab
components/GreeningCompliance.tsx # Compliance checker UI
components/AgriEnvModal.tsx     # Voluntary scheme enrollment
```

### Modified Files
```
store/useGameStore.ts          # Subsidy state, applications, payment processing
app/(tabs)/oficina.tsx         # Add Subsidies sub-tab
app/(tabs)/economia.tsx        # Show subsidy income in annual breakdown
app/(tabs)/tierras.tsx         # Parcel type selection affects subsidy eligibility
components/NotificationPanel.tsx # Subsidy window reminders
```

---

## 10. Balance Notes

- **Year 1 economics:** A 40ha farm with basic + greening + young farmer = ~€13,500/year in subsidies. With yield penalties from organic transition (Spec 03), this subsidy income is what keeps the player solvent.
- **Greening penalty trap:** New players will plant monoculture wheat (highest yield). They'll get hit with the 30% greening penalty and learn the hard way that CAP forces diversification.
- **Agri-env as late-game:** Voluntary schemes pay more per hectare but lock land for 5–7 years. Best for financially secure players who can afford to set aside productive land.
- **Seasonal rhythm:** March–April = application panic. October = advance payment relief. December = balance payment Christmas. This creates an authentic agricultural calendar.
- **Young farmer expiry:** Losing the young farmer bonus after year 5 creates a natural mid-game difficulty spike. Player must have built market income by then.

---

## 11. Open Questions

1. **Cross-compliance:** Should we model cross-compliance (animal welfare, environmental standards, food safety) as a separate pass/fail check, or abstract it away?
2. **Remote sensing:** The real CAP uses satellite imagery to check crop declarations. Should we simulate "remote sensing checks" that catch discrepancies between claimed and actual crops?
3. **Regional variation:** Should Galicia have different rates than Andalucía? (Real CAP has slight regional variations via national envelopes.)
4. **Basic Income Simulator:** Should the player be able to choose "subsidy optimization" as a playstyle (maximize greening + agri-env + organic aid) vs. "market maximizer" (ignore subsidies, focus on yield)?

---

*Ready for review. Once approved, we move to Spec 05: Land Leasing & Sharecropping.*
