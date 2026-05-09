# Spec 13: Community Supported Agriculture (CSA)

**Tier:** 4 — Atmosphere & World  
**Status:** Draft  
**Dependencies:** Existing market system, crop system, reputation system. Integrates with Spec 03 (organic certification), Spec 04 (subsidies), Spec 12 (biodiversity).

---

## 1. Objective

Introduce **Community Supported Agriculture (Cesta de Producto / Huerta Compartida)** as an alternative, relationship-based selling channel that contrasts sharply with commodity markets. CSA customers pay upfront at season start, delivering critical early-season cash flow. In exchange, the farmer commits to weekly boxes of fresh produce throughout the season. The twist: when harvests fail, boxes shrink, but the farmer has already been paid. This is risk-sharing, not risk-transfer. It creates a human layer to the economy — customer loyalty, word-of-mouth growth, and the satisfaction of feeding your community — while teaching players that diversification across selling channels is as important as crop diversification.

---

## 2. Design Principles

1. **Cash flow is the immediate win:** Upfront payments in March/April solve the classic farmer cash crunch before harvest.
2. **Relationship is the long-term win:** Loyal subscribers tolerate bad weeks, refer friends, and pay premium prices. They are assets.
3. **Risk is shared, not eliminated:** Bad harvest = smaller boxes. Subscriber satisfaction drops. Churn increases. CSA is not a free lunch.
4. **Organic unlocks the premium tier:** Conventional CSA exists, but organic CSA commands 2× prices and attracts wealthier urban subscribers.
5. **Box composition is gameplay:** What goes in this week's box? Too much zucchini = subscriber fatigue. Too little variety = complaints. The player becomes a curator.

---

## 3. Data Model

### 3.1 CSA Program

```ts
// types/csa.ts
export interface CsaProgram {
  id: string;
  name: string;
  status: 'planning' | 'enrolling' | 'active' | 'paused' | 'ended';
  
  // Season
  year: number;
  enrollmentStartDay: number;   // typically February–March
  seasonStartDay: number;       // first delivery
  seasonEndDay: number;         // last delivery (20–26 weeks typical)
  
  // Tiers
  tiers: CsaTier[];
  
  // Subscribers
  subscribers: CsaSubscriber[];
  totalSubscribers: number;
  targetSubscribers: number;
  
  // Economics
  totalRevenueUpfront: number;
  totalRevenueInstallments: number;
  totalBoxesDelivered: number;
  totalBoxesShort: number;
  
  // Performance
  averageSatisfaction: number;  // 0–100
  churnRate: number;
  referralRate: number;
  wordOfMouthGrowth: number;    // new subs from referrals
}

export interface CsaTier {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  
  // Box specs
  boxSizeKg: number;            // target weight per week
  weeklyValueEstimate: number;  // retail value of typical box
  
  // Pricing
  fullSeasonPrice: number;      // upfront payment
  installmentPrice: number;     // total if paying monthly (+10%)
  weeklyPrice: number;          // implied weekly cost
  
  // Requirements
  requiresOrganic: boolean;
  minBiodiversityScore: number; // some premium tiers require farm biodiversity
  
  // Content
  minVarietyItems: number;
  includesFruit: boolean;
  includesEggs: boolean;
  includesHoney: boolean;
  includesProcessedGoods: boolean; // jam, oil, etc.
}
```

### 3.2 CSA Subscriber

```ts
export interface CsaSubscriber {
  id: string;
  name: string;
  type: 'individual' | 'family' | 'restaurant' | 'school';
  
  // Subscription
  tierId: string;
  paymentMethod: 'upfront' | 'monthly';
  amountPaid: number;
  amountOwed: number;
  
  // Satisfaction
  satisfactionHistory: number[]; // per-week score
  currentSatisfaction: number;   // 0–100 rolling average
  
  // Behavior
  complaints: CsaComplaint[];
  compliments: number;
  referralsMade: number;
  
  // Status
  status: 'active' | 'suspended' | 'churned' | 'upgraded';
  churnRisk: number; // 0–1 probability
  
  // Preferences
  preferences: {
    loves: string[];   // crop IDs
    dislikes: string[]; // crop IDs
    allergicTo: string[];
    prefersVariety: boolean; // true = prefers 8 small items, false = prefers 4 large items
  };
}

export interface CsaComplaint {
  week: number;
  type: 'tooSmall' | 'tooMuchOfOneItem' | 'missingFavorite' | 'poorQuality' | 'lateDelivery' | 'notOrganic';
  severity: 'minor' | 'moderate' | 'severe';
  resolved: boolean;
}
```

### 3.3 Weekly Box & Delivery

```ts
export interface CsaDelivery {
  week: number;
  day: number;
  
  // Composition
  plannedContents: BoxItem[];
  actualContents: BoxItem[];
  shortfallItems: string[]; // what we promised but couldn't deliver
  
  // Economics
  boxRetailValue: number;    // what this would cost at market
  boxCostToProduce: number;  // farmer's cost
  subscriberTierPrice: number; // what subscriber paid for this week
  
  // Quality
  averageQuality: number;    // 0–100
  organicPercent: number;    // % of items certified organic
  
  // Feedback
  satisfactionScores: number[]; // per subscriber
}

export interface BoxItem {
  cropId: string;
  quantityKg: number;
  quality: 'premium' | 'standard' | 'feed';
  sourceParcelId: string | null;
  organic: boolean;
  retailPricePerKg: number;
}
```

---

## 4. Static Data (`data/csaTiers.ts`)

```ts
export const csaTierTemplates: CsaTier[] = [
  {
    id: 'basicConventional',
    name: 'Basic Box',
    nameEs: 'Cesta Básica',
    description: 'Seasonal vegetables, conventional farming. 5–6 kg/week.',
    boxSizeKg: 5.5,
    weeklyValueEstimate: 18,
    fullSeasonPrice: 380,      // 20 weeks × €19
    installmentPrice: 420,     // +10%
    weeklyPrice: 19,
    requiresOrganic: false,
    minBiodiversityScore: 0,
    minVarietyItems: 5,
    includesFruit: false,
    includesEggs: false,
    includesHoney: false,
    includesProcessedGoods: false,
  },
  {
    id: 'familyConventional',
    name: 'Family Box',
    nameEs: 'Cesta Familiar',
    description: 'Larger variety for families. 8–10 kg/week with some fruit.',
    boxSizeKg: 9,
    weeklyValueEstimate: 32,
    fullSeasonPrice: 640,
    installmentPrice: 700,
    weeklyPrice: 32,
    requiresOrganic: false,
    minBiodiversityScore: 0,
    minVarietyItems: 7,
    includesFruit: true,
    includesEggs: false,
    includesHoney: false,
    includesProcessedGoods: false,
  },
  {
    id: 'basicOrganic',
    name: 'Organic Box',
    nameEs: 'Cesta Ecológica',
    description: 'Certified organic vegetables. 5–6 kg/week.',
    boxSizeKg: 5.5,
    weeklyValueEstimate: 28,
    fullSeasonPrice: 560,      // 20 weeks × €28
    installmentPrice: 620,
    weeklyPrice: 28,
    requiresOrganic: true,
    minBiodiversityScore: 30,
    minVarietyItems: 6,
    includesFruit: false,
    includesEggs: false,
    includesHoney: false,
    includesProcessedGoods: false,
  },
  {
    id: 'premiumOrganic',
    name: 'Premium Organic',
    nameEs: 'Cesta Premium Ecológica',
    description: 'Diverse organic box with eggs, honey, and artisan products. 8–10 kg.',
    boxSizeKg: 9,
    weeklyValueEstimate: 52,
    fullSeasonPrice: 1040,     // 20 weeks × €52
    installmentPrice: 1150,
    weeklyPrice: 52,
    requiresOrganic: true,
    minBiodiversityScore: 50,
    minVarietyItems: 8,
    includesFruit: true,
    includesEggs: true,
    includesHoney: true,
    includesProcessedGoods: true,
  },
  {
    id: 'gourmetRestaurant',
    name: 'Chef\'s Selection',
    nameEs: 'Selección del Chef',
    description: 'Rare varieties, microgreens, perfect presentation. For restaurants.',
    boxSizeKg: 6,
    weeklyValueEstimate: 75,
    fullSeasonPrice: 1500,     // 20 weeks × €75
    installmentPrice: 1650,
    weeklyPrice: 75,
    requiresOrganic: true,
    minBiodiversityScore: 40,
    minVarietyItems: 10,
    includesFruit: true,
    includesEggs: true,
    includesHoney: true,
    includesProcessedGoods: true,
  },
];
```

### 4.1 Seasonal Box Templates

```ts
export const seasonalBoxTemplates: Record<number, { preferredCrops: string[]; avoidCrops: string[]; notes: string }[]> = {
  // Week 1–4 (Spring)
  1: [
    { preferredCrops: ['lettuce', 'spinach', 'radish', 'greenOnion', 'peas'], avoidCrops: ['tomato', 'pepper'], notes: 'Early greens dominate' },
  ],
  // Week 5–8 (Late Spring)
  5: [
    { preferredCrops: ['lettuce', 'spinach', 'radish', 'beet', 'carrot', 'strawberry'], avoidCrops: [], notes: 'First roots and early fruit' },
  ],
  // Week 9–14 (Summer)
  9: [
    { preferredCrops: ['tomato', 'pepper', 'zucchini', 'cucumber', 'beans', 'eggplant'], avoidCrops: ['spinach'], notes: 'Summer abundance' },
  ],
  // Week 15–18 (Late Summer)
  15: [
    { preferredCrops: ['tomato', 'pepper', 'melon', 'watermelon', 'sweetCorn', 'pumpkin'], avoidCrops: [], notes: 'Peak variety, first storage crops' },
  ],
  // Week 19–22 (Autumn)
  19: [
    { preferredCrops: ['pumpkin', 'squash', 'potato', 'sweetPotato', 'carrot', 'cabbage'], avoidCrops: ['tomato'], notes: 'Storage crops and roots' },
  ],
};
```

---

## 5. Engine Logic (`engine/csa.ts`)

### 5.1 Box Composition

```ts
export function composeWeeklyBox(
  week: number,
  tier: CsaTier,
  availableHarvest: StoredCropBatch[],
  animalProducts: { eggs: number; honey: number },
  processedGoods: { id: string; quantity: number }[],
): { box: BoxItem[]; shortfall: string[]; retailValue: number } {
  const template = getSeasonalTemplate(week);
  const box: BoxItem[] = [];
  const shortfall: string[] = [];
  let currentWeight = 0;
  let retailValue = 0;
  
  // Prioritize template crops
  for (const cropId of template.preferredCrops) {
    if (currentWeight >= tier.boxSizeKg * 1.1) break; // 10% overweight tolerance
    
    const available = availableHarvest.filter(b => b.cropId === cropId && b.quantityKg > 5);
    if (available.length === 0) {
      shortfall.push(cropId);
      continue;
    }
    
    // Take from best quality batch
    available.sort((a, b) => b.currentQuality - a.currentQuality);
    const batch = available[0];
    const targetQty = Math.min(
      (tier.boxSizeKg / tier.minVarietyItems) * 1.2,
      batch.quantityKg * 0.3, // don't take more than 30% of a batch
      tier.boxSizeKg - currentWeight
    );
    
    if (targetQty > 0.3) { // minimum item size
      box.push({
        cropId,
        quantityKg: targetQty,
        quality: batch.qualityGrade,
        sourceParcelId: batch.parcelId,
        organic: true, // from organic batch tracking
        retailPricePerKg: getRetailPrice(cropId),
      });
      currentWeight += targetQty;
      retailValue += targetQty * getRetailPrice(cropId);
      batch.quantityKg -= targetQty;
    }
  }
  
  // Fill gaps with whatever is available
  while (currentWeight < tier.boxSizeKg * 0.9 && availableHarvest.length > 0) {
    const filler = availableHarvest
      .filter(b => b.quantityKg > 2 && !box.some(item => item.cropId === b.cropId))
      .sort((a, b) => b.quantityKg - a.quantityKg)[0];
    
    if (!filler) break;
    
    const qty = Math.min(filler.quantityKg * 0.2, tier.boxSizeKg - currentWeight);
    box.push({
      cropId: filler.cropId,
      quantityKg: qty,
      quality: filler.qualityGrade,
      sourceParcelId: filler.parcelId,
      organic: true,
      retailPricePerKg: getRetailPrice(filler.cropId),
    });
    currentWeight += qty;
    retailValue += qty * getRetailPrice(filler.cropId);
    filler.quantityKg -= qty;
  }
  
  // Add animal products for premium tiers
  if (tier.includesEggs && animalProducts.eggs >= box.length) {
    box.push({ cropId: 'eggs', quantityKg: box.length * 0.06, quality: 'premium', sourceParcelId: null, organic: true, retailPricePerKg: 4.5 });
    retailValue += box.length * 0.27;
  }
  
  if (tier.includesHoney && animalProducts.honey >= 0.5) {
    box.push({ cropId: 'honey', quantityKg: 0.5, quality: 'premium', sourceParcelId: null, organic: true, retailPricePerKg: 18 });
    retailValue += 9;
  }
  
  return { box, shortfall, retailValue };
}
```

### 5.2 Customer Satisfaction

```ts
export function calculateWeeklySatisfaction(
  subscriber: CsaSubscriber,
  delivery: CsaDelivery,
  tier: CsaTier,
): number {
  let score = 70; // baseline
  
  // Box value vs price
  const valueRatio = delivery.boxRetailValue / tier.weeklyPrice;
  if (valueRatio > 1.3) score += 15;
  else if (valueRatio > 1.0) score += 5;
  else if (valueRatio < 0.8) score -= 20;
  else if (valueRatio < 0.6) score -= 35;
  
  // Variety
  const variety = delivery.actualContents.length;
  if (variety >= tier.minVarietyItems) score += 10;
  else if (variety < tier.minVarietyItems * 0.7) score -= 15;
  
  // Preferences
  subscriber.preferences.loves.forEach(cropId => {
    if (delivery.actualContents.some(item => item.cropId === cropId)) score += 5;
  });
  subscriber.preferences.dislikes.forEach(cropId => {
    if (delivery.actualContents.some(item => item.cropId === cropId)) score -= 5;
  });
  
  // Shortfall penalty
  score -= delivery.shortfallItems.length * 8;
  
  // Quality
  const avgQuality = delivery.actualContents.reduce((s, i) => s + (i.quality === 'premium' ? 100 : i.quality === 'standard' ? 70 : 40), 0) / delivery.actualContents.length;
  score += (avgQuality - 70) / 5;
  
  // Too much zucchini penalty (the classic CSA meme)
  const zucchiniItem = delivery.actualContents.find(i => i.cropId === 'zucchini');
  if (zucchiniItem && zucchiniItem.quantityKg > 2.5) {
    score -= 10; // "Not more zucchini!"
  }
  
  // Organic expectation
  if (tier.requiresOrganic && delivery.organicPercent < 95) {
    score -= 25;
  }
  
  return clamp(score, 0, 100);
}
```

### 5.3 Churn & Growth

```ts
export function updateSubscriberStatus(
  subscriber: CsaSubscriber,
  recentSatisfaction: number[],
): { churned: boolean; upgraded: boolean; referrals: number } {
  const avgSatisfaction = recentSatisfaction.reduce((a, b) => a + b, 0) / recentSatisfaction.length;
  subscriber.currentSatisfaction = avgSatisfaction;
  
  // Churn probability
  let churnProb = 0;
  if (avgSatisfaction < 40) churnProb = 0.6;
  else if (avgSatisfaction < 55) churnProb = 0.3;
  else if (avgSatisfaction < 70) churnProb = 0.1;
  else if (avgSatisfaction > 85) churnProb = 0.0;
  
  // Complaints amplify churn
  const unresolvedComplaints = subscriber.complaints.filter(c => !c.resolved && c.severity !== 'minor').length;
  churnProb += unresolvedComplaints * 0.15;
  
  const churned = Math.random() < churnProb;
  
  // Upgrade probability
  const upgraded = avgSatisfaction > 90 && subscriber.tierId === 'basicOrganic' && Math.random() < 0.2;
  
  // Referrals
  let referrals = 0;
  if (avgSatisfaction > 80) referrals += Math.floor(Math.random() * 2);
  if (avgSatisfaction > 90) referrals += Math.floor(Math.random() * 2);
  
  return { churned, upgraded, referrals };
}

export function calculateEnrollmentGrowth(
  currentSubscribers: number,
  satisfaction: number,
  reputation: number,
  marketingSpend: number,
  organicCertified: boolean,
): number {
  const baseGrowth = 0.05; // 5% organic word-of-mouth
  const satisfactionMultiplier = satisfaction / 70;
  const reputationMultiplier = reputation / 50;
  const marketingEffect = marketingSpend / 1000;
  const organicBonus = organicCertified ? 0.03 : 0;
  
  const growthRate = baseGrowth * satisfactionMultiplier * reputationMultiplier + marketingEffect + organicBonus;
  return Math.floor(currentSubscribers * growthRate);
}
```

### 5.4 Risk Sharing

```ts
export function applyRiskSharing(
  promisedBoxes: number,
  actualBoxes: number,
  upfrontPrice: number,
): { refundOwed: number; satisfactionPenalty: number } {
  const shortfallRatio = 1 - (actualBoxes / promisedBoxes);
  
  if (shortfallRatio <= 0.1) {
    // Under 10% shortfall: no refund, minor satisfaction hit
    return { refundOwed: 0, satisfactionPenalty: 5 };
  } else if (shortfallRatio <= 0.25) {
    // 10–25% shortfall: partial refund
    const refund = upfrontPrice * shortfallRatio * 0.5;
    return { refundOwed: refund, satisfactionPenalty: 15 };
  } else {
    // >25% shortfall: significant refund
    const refund = upfrontPrice * shortfallRatio * 0.75;
    return { refundOwed: refund, satisfactionPenalty: 30 };
  }
}
```

---

## 6. Store Integration

### 6.1 New Actions

```ts
interface CsaActions {
  // Program setup
  createCsaProgram(name: string, year: number, tiers: string[]): void;
  setEnrollmentPeriod(startDay: number, endDay: number): void;
  
  // Subscriber management
  enrollSubscriber(name: string, tierId: string, paymentMethod: 'upfront' | 'monthly'): void;
  processSubscriberPayment(subscriberId: string, amount: number): void;
  handleSubscriberComplaint(subscriberId: string, complaint: CsaComplaint): void;
  resolveComplaint(subscriberId: string, complaintIndex: number, compensation: number): void;
  
  // Weekly operations
  composeAndDeliverBoxes(week: number): void;
  
  // Marketing
  spendOnCsaMarketing(amount: number): void;
  
  // Season end
  closeCsaSeason(): void;
}
```

### 6.2 `advanceDay()` Integration

```ts
function tickCsa(state: GameState, day: number): void {
  const program = state.csaProgram;
  if (!program || program.status !== 'active') return;
  
  const week = Math.floor((day - program.seasonStartDay) / 7) + 1;
  
  // Weekly delivery day (e.g., Thursday = day 4 of week)
  if ((day - program.seasonStartDay) % 7 === 3) {
    // Compose boxes
    const availableHarvest = state.storageBatches.filter(b => b.quantityKg > 1);
    const animalProducts = {
      eggs: state.animalInventory.eggs || 0,
      honey: state.beehives.reduce((sum, h) => sum + h.honeyStoredKg, 0),
    };
    
    program.tiers.forEach(tier => {
      const tierSubscribers = program.subscribers.filter(s => s.tierId === tier.id && s.status === 'active');
      if (tierSubscribers.length === 0) return;
      
      const { box, shortfall, retailValue } = composeWeeklyBox(
        week, tier, availableHarvest, animalProducts, []
      );
      
      // Create delivery record
      const delivery: CsaDelivery = {
        week,
        day,
        plannedContents: box,
        actualContents: box,
        shortfallItems: shortfall,
        boxRetailValue: retailValue,
        boxCostToProduce: box.reduce((s, i) => s + i.quantityKg * getProductionCost(i.cropId), 0),
        subscriberTierPrice: tier.weeklyPrice,
        averageQuality: box.reduce((s, i) => s + (i.quality === 'premium' ? 100 : 70), 0) / box.length,
        organicPercent: box.filter(i => i.organic).length / box.length * 100,
        satisfactionScores: [],
      };
      
      // Calculate satisfaction per subscriber
      tierSubscribers.forEach(sub => {
        const satisfaction = calculateWeeklySatisfaction(sub, delivery, tier);
        delivery.satisfactionScores.push(satisfaction);
        sub.satisfactionHistory.push(satisfaction);
        
        // Keep rolling window of last 4 weeks
        if (sub.satisfactionHistory.length > 4) sub.satisfactionHistory.shift();
      });
      
      state.csaDeliveries.push(delivery);
    });
  }
  
  // Monthly churn/upgrade check
  if ((day - program.seasonStartDay) % 30 === 0) {
    program.subscribers.forEach(sub => {
      if (sub.status !== 'active') return;
      
      const { churned, upgraded, referrals } = updateSubscriberStatus(sub, sub.satisfactionHistory);
      
      if (churned) {
        sub.status = 'churned';
        program.totalSubscribers -= 1;
        state.notifications.push({
          day,
          type: 'csa',
          message: `${sub.name} has cancelled their CSA subscription.`,
          urgent: false,
        });
      }
      
      if (upgraded) {
        sub.status = 'upgraded';
        sub.tierId = 'premiumOrganic';
        state.notifications.push({
          day,
          type: 'csa',
          message: `${sub.name} upgraded to Premium Organic!`,
          urgent: false,
        });
      }
      
      if (referrals > 0) {
        sub.referralsMade += referrals;
        program.wordOfMouthGrowth += referrals;
        state.notifications.push({
          day,
          type: 'csa',
          message: `${sub.name} referred ${referrals} new potential subscribers!`,
          urgent: false,
        });
      }
    });
  }
  
  // Enrollment period growth
  if (program.status === 'enrolling' && day <= program.enrollmentStartDay + 60) {
    const newSubs = calculateEnrollmentGrowth(
      program.totalSubscribers,
      program.averageSatisfaction,
      state.reputation,
      state.csaMarketingSpend || 0,
      state.organicCertification?.status === 'certifiedOrganic'
    );
    
    // Add new subscribers (simplified — in reality they'd enroll individually)
    program.totalSubscribers += newSubs;
  }
}
```

---

## 7. UI/UX Design

### 7.1 Mercado Tab — CSA Sub-Tab

```
┌─────────────────────────────────────────┐
│  🥬 COMMUNITY SUPPORTED AGRICULTURE    │
│  Season: 2026 | Week 12 of 20          │
│                                         │
│  SUBSCRIBERS: 47 (target: 60)          │
│  [████████████░░░░░░░░░░░░] 78%        │
│                                         │
│  REVENUE                                │
│  Upfront: €28,400 | Instalments: €4,200│
│  Outstanding: €1,800                   │
│                                         │
│  SATISFACTION: 74%                     │
│  Churn rate: 8% | Referrals: 6         │
│                                         │
│  [View Subscribers] [Weekly Boxes]     │
│  [Marketing] [Close Enrollment]        │
└─────────────────────────────────────────┘
```

### 7.2 Weekly Box Composer

```
┌─────────────────────────────────────────┐
│  WEEK 12 BOX COMPOSITION                │
│  Tier: Family Box (35 subscribers)      │
│                                         │
│  AVAILABLE HARVEST                      │
│  Tomatoes: 420 kg ⭐⭐⭐                │
│  Zucchini: 280 kg                       │
│  Cucumbers: 190 kg                      │
│  Beans: 95 kg                           │
│  Carrots: 140 kg                        │
│  Strawberries: 65 kg ⭐⭐⭐              │
│                                         │
│  BOX CONTENTS (target: 9 kg)            │
│  Tomatoes    2.0 kg  €6.00             │
│  Zucchini    1.5 kg  €3.00  ⚠️ high   │
│  Cucumbers   1.0 kg  €2.50             │
│  Beans       0.8 kg  €3.20             │
│  Carrots     1.2 kg  €2.40             │
│  Strawberries 0.5 kg €5.00 ⭐ premium  │
│  Eggs        6 units €2.70             │
│  ─────────────────────────────────────  │
│  Total: 7.0 kg + eggs | Value: €24.80  │
│  Tier price: €32 ✅ Good value         │
│                                         │
│  [Auto-fill remaining] [Deliver]       │
└─────────────────────────────────────────┘
```

### 7.3 Subscriber Detail Card

```
┌─────────────────────────────────────────┐
│  👤 María Sánchez — Premium Organic     │
│  Status: ACTIVE | Satisfaction: 88%    │
│                                         │
│  Payment: Upfront ✅ (€1,040 paid)     │
│  Referred: 2 new subscribers            │
│                                         │
│  PREFERENCES                            │
│  ❤️ Loves: tomatoes, strawberries       │
│  💔 Dislikes: zucchini, eggplant        │
│  ⚠️ Allergic: none                      │
│                                         │
│  RECENT SATISFACTION                    │
│  Week 9:  92% ⭐⭐⭐                     │
│  Week 10: 85% ⭐⭐⭐                     │
│  Week 11: 90% ⭐⭐⭐                     │
│  Week 12: 86% ⭐⭐⭐                     │
│                                         │
│  [Send thank you note] [Offer upgrade] │
└─────────────────────────────────────────┘
```

### 7.4 Season Summary Dashboard

```
┌─────────────────────────────────────────┐
│  2026 CSA SEASON SUMMARY                │
│                                         │
│  Subscribers: 47 → 52 (net +5)         │
│  Revenue: €32,600                       │
│  Production cost: €14,200               │
│  NET MARGIN: €18,400 (56%)             │
│                                         │
│  vs. WHOLESALE ALTERNATIVE              │
│  Same produce at wholesale: €19,800    │
│  CSA premium: +€12,800 (+65%)          │
│                                         │
│  CUSTOMER SATISFACTION                  │
│  Average: 74%                           │
│  Churned: 4 (8%)                        │
│  Upgraded: 3                            │
│  Referrals: 12                          │
│                                         │
│  🏆 TOP PERFORMER: Premium Organic      │
│     Margin: 68% | Satisfaction: 81%    │
│                                         │
│  [Plan 2027 season] [Export data]      │
└─────────────────────────────────────────┘
```

### 7.5 Risk Sharing Alert

```
┌─────────────────────────────────────────┐
│  ⚠️ CSA RISK SHARING EVENT              │
│                                         │
│  Hailstorm destroyed 40% of tomato      │
│  crop in Field 3.                       │
│                                         │
│  Impact on Week 15 boxes:               │
│  • Planned tomatoes: 2.0 kg/sub        │
│  • Available: 1.1 kg/sub               │
│  • Shortfall: 45%                       │
│                                         │
│  Risk sharing applies:                  │
│  • No refunds (under 10% season avg)   │
│  • Satisfaction penalty: −15 points    │
│  • Churn risk increase: +12%           │
│                                         │
│  Mitigation options:                    │
│  [Buy tomatoes from neighbor €2.80/kg] │
│  [Substitute with extra peppers]       │
│  [Explain honestly in newsletter]      │
└─────────────────────────────────────────┘
```

---

## 8. Integration Matrix

| System | Integration Point |
|--------|------------------|
| **Market** | CSA is an alternative selling channel alongside wholesale, export, and direct market. Revenue comparison visible in season summary. |
| **Crops** | Box composition pulls from `storageBatches`. Harvest timing must align with weekly delivery schedule. Crop diversity directly enables box variety. |
| **Organic** (Spec 03) | Organic certification unlocks premium tiers (2× pricing). Non-organic CSA is viable but low-margin. |
| **Biodiversity** (Spec 12) | Premium tiers require minimum biodiversity scores. Diverse farms attract premium subscribers. |
| **Storage** (Spec 06) | Box quality limited by storage batch quality. Moldy produce cannot go in CSA boxes (subscribers notice!). |
| **Animals** | Eggs and honey from farm animals add value to premium boxes. Livestock integration becomes a CSA asset. |
| **Processing** | Jams, oils, and preserves extend box value in autumn/winter when fresh produce is scarce. |
| **Reputation** | CSA subscribers are reputation amplifiers. Happy customers refer friends; unhappy customers complain publicly. |
| **Subsidies** (Spec 04) | Young farmer bonus and organic aid reduce the financial pressure during early CSA seasons. |

---

## 9. Files to Create / Modify

### New Files
```
types/csa.ts                   # CsaProgram, CsaTier, CsaSubscriber, CsaDelivery
data/csaTiers.ts               # Tier templates and pricing
data/seasonalBoxTemplates.ts   # Weekly crop preferences by season
engine/csa.ts                  # Box composition, satisfaction, churn/growth
components/CsaDashboard.tsx    # Main CSA management UI
components/BoxComposer.tsx     # Weekly box builder
components/SubscriberCard.tsx  # Individual subscriber detail
components/SeasonSummary.tsx   # End-of-season report
components/RiskSharingAlert.tsx # Shortfall handling modal
```

### Modified Files
```
store/useGameStore.ts          # CSA program state, deliveries, subscriber list
app/(tabs)/mercado.tsx         # Add CSA sub-tab
app/(tabs)/economia.tsx        # CSA revenue in P&L breakdown
engine/crops.ts                # Harvest routed to CSA inventory vs. market
```

---

## 10. Balance Notes

- **Year 1 CSA:** 15–20 subscribers, basic tier only. Player learns box composition and customer management. Break-even or small loss acceptable.
- **Year 2–3:** 40–60 subscribers, organic tier unlocked. Word-of-mouth begins working. Cash flow from upfront payments transforms spring finances. Margin 40–50%.
- **Year 4+:** 80–150 subscribers, multiple tiers including restaurant chef's selection. CSA becomes primary revenue channel. Margin 55–65%.
- **The zucchini problem:** Summer abundance of zucchini/tomatoes causes subscriber fatigue unless balanced with beans, herbs, and fruit. Forces crop diversification.
- **Bad harvest resilience:** CSA subscribers share risk. A 30% hail loss hurts satisfaction but doesn't bankrupt the farm (unlike a wholesale contract cancellation). However, two bad seasons in a row = mass churn.
- **vs. wholesale:** CSA requires 3× more labor (packing, delivery, customer service) but generates 65% more revenue for the same produce. It's a business model choice, not an automatic upgrade.

---

## 11. Open Questions

1. **Delivery logistics:** Should the player manage delivery routes, vehicle capacity, and delivery days? Or abstract delivery as a fixed cost per subscriber?
2. **U-pick option:** Should subscribers be able to visit the farm and pick their own boxes (reduces labor, increases engagement, but requires farm tourism infrastructure)?
3. **Winter CSA:** Should there be an off-season "preserves box" or "root cellar box" to maintain year-round cash flow?
4. **Restaurant contracts vs. CSA:** Should restaurant sales be a separate B2B channel with different dynamics (strict specs, no risk sharing, higher volume)?

---

**This completes the 13-spec design document set for Granja Tycoon.**
