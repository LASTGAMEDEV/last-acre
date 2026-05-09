import type { Season } from './climate';

// ── Reputation ───────────────────────────────────────────────────────────────

export const REPUTATION_TIERS = [
  { min: 0,  max: 24,  label: 'Unknown',     shopBonus: 0.00, unlocks: [] as string[] },
  { min: 25, max: 49,  label: 'Local',       shopBonus: 0.05, unlocks: ['restaurant_contracts'] },
  { min: 50, max: 69,  label: 'Established', shopBonus: 0.12, unlocks: ['online_shop'] },
  { min: 70, max: 84,  label: 'Respected',   shopBonus: 0.20, unlocks: ['premium_restaurant'] },
  { min: 85, max: 100, label: 'Renowned',    shopBonus: 0.30, unlocks: ['best_buyers'] },
];

export function getReputationTier(score: number) {
  return REPUTATION_TIERS.find(t => score >= t.min && score <= t.max) ?? REPUTATION_TIERS[0];
}

export function reputationDecayThisWeek(eventsThisWeek: number): number {
  return eventsThisWeek > 0 ? 0 : -0.05;
}

// ── Farm Shop ────────────────────────────────────────────────────────────────

export interface FarmShopState {
  tier: 0 | 1 | 2 | 3;
  openDays: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  openHours: number;   // hours open per day
  assignedWorkerIds: string[];
}

export function calcShopVisitors(
  shopTier: number,
  season: Season,
  dayOfWeek: number, // 0=Mon, 6=Sun
  reputation: number,
  openHours: number,
): number {
  const caps = [0, 20, 80, 250];
  const base = caps[shopTier] ?? 0;
  if (base === 0) return 0;

  const seasonMult: Record<Season, number> = { spring: 1.0, summer: 1.4, autumn: 1.2, winter: 0.7 };
  const dowMult = dayOfWeek >= 5 ? (dayOfWeek === 6 ? 1.5 : 1.2) : 1.0;
  const repMult = 0.6 + (reputation / 100) * 0.7; // 0.6× at 0, 1.3× at 100
  const hoursMult = openHours >= 6 ? 1.0 : 0.65;

  return Math.round(base * seasonMult[season] * dowMult * repMult * hoursMult);
}

export function calcShopPrice(
  basePrice: number,
  quality: number,
  reputation: number,
  productAwardBonus: number,
): number {
  const tier = getReputationTier(reputation);
  const qualityMult = quality >= 90 ? 2.0 : quality >= 75 ? 1.6 : quality >= 60 ? 1.3 : quality >= 50 ? 1.0 : 0.6;
  const awardMult = 1 + (productAwardBonus / 100);
  return Math.round(basePrice * qualityMult * (1 + tier.shopBonus) * awardMult);
}

// ── Wholesale ────────────────────────────────────────────────────────────────

export function wholesalePrice(basePrice: number): number {
  return Math.round(basePrice * 0.65);
}

// ── Restaurant / Hotel ───────────────────────────────────────────────────────

export interface RestaurantContract {
  id: string;
  buyerName: string;
  productId: string;
  quantityPerCycle: number;
  pricePerUnit: number;
  minQuality: number;
  cycleDays: 7 | 14;
  durationDays: number;
  startDay: number;
  nextDeliveryDay: number;
}

export const RESTAURANT_BUYERS = [
  { name: 'Local Pub',      minQuality: 65, priceMult: 1.40, repRequired: 25 },
  { name: 'Town Restaurant', minQuality: 72, priceMult: 1.55, repRequired: 50 },
  { name: 'Fine Dining',    minQuality: 82, priceMult: 1.75, repRequired: 70 },
  { name: 'Boutique Hotel', minQuality: 78, priceMult: 1.70, repRequired: 70 },
  { name: '5-Star Hotel',   minQuality: 88, priceMult: 2.00, repRequired: 85 },
];

// ── Online Shop ──────────────────────────────────────────────────────────────

export const ONLINE_ELIGIBLE_IDS = new Set([
  'saffron_tin', 'dried_herbs', 'honey', 'spirits', 'aged_cheese',
  'jam', 'pickles', 'olive_oil', 'infused_oil', 'vinegar',
  'candles', 'yarn', 'leather_goods', 'aged_balsamic',
]);

export function isOnlineEligible(productId: string): boolean {
  return ONLINE_ELIGIBLE_IDS.has(productId);
}

export function calcOnlineOrders(
  reputation: number,
  productCount: number,
): number {
  if (productCount === 0) return 0;
  const base = 1 + Math.floor(reputation / 20);
  const varietyBonus = Math.min(1 + productCount * 0.1, 2.0);
  return Math.round(base * varietyBonus * (0.8 + Math.random() * 0.4));
}

// ── Veg Box ──────────────────────────────────────────────────────────────────

export interface VegBoxSubscriber {
  tier: 'basic' | 'premium' | 'luxury';
  count: number;
}

export const VEG_BOX_TIERS: Record<string, { weeklyFee: number; minContentsValue: number; minQuality: number }> = {
  basic:   { weeklyFee: 15, minContentsValue: 10, minQuality: 40 },
  premium: { weeklyFee: 28, minContentsValue: 18, minQuality: 65 },
  luxury:  { weeklyFee: 55, minContentsValue: 35, minQuality: 80 },
};

export function calcNewSubscribers(reputation: number, marketingSpend: number): number {
  const base = Math.max(0, Math.floor((reputation - 20) / 10));
  const marketingBonus = Math.floor(marketingSpend / 100);
  return base + marketingBonus;
}

// ── Farm Café ────────────────────────────────────────────────────────────────

export function calcCafeRevenue(
  dailyVisitors: number,
  averageSpend: number,
  qualityAvg: number,
): number {
  const qualityMult = qualityAvg > 80 ? 1.3 : qualityAvg > 60 ? 1.15 : qualityAvg > 50 ? 1.0 : 0.7;
  return Math.round(dailyVisitors * averageSpend * qualityMult);
}

// ── Agricultural Shows ───────────────────────────────────────────────────────

export interface ShowAward {
  day: number;
  productId: string;
  showName: string;
  award: 'gold' | 'silver' | 'bronze';
}

export function judgeAward(quality: number): ShowAward['award'] | null {
  const roll = quality + (Math.random() - 0.5) * 6;
  if (roll >= 88) return 'gold';
  if (roll >= 75) return 'silver';
  if (roll >= 60) return 'bronze';
  return null;
}

export function awardPriceBonus(award: ShowAward['award']): number {
  if (award === 'bronze') return 10;
  if (award === 'silver') return 20;
  if (award === 'gold') return 35;
  return 0;
}
