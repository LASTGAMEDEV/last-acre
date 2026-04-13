export interface Contract {
  id: string;
  templateId: string;
  cropId: string;
  amount: number;
  pricePerUnit: number;
  deadlineDay: number;
  acceptedDay: number;
  delivered: number;
  completed: boolean;
  failed: boolean;
}

export interface ContractTemplate {
  id: string;
  name: string;
  cropId: string;
  amountRange: [number, number];
  priceBonus: number;
  termDays: number;
  penaltyRate: number;
  minReputation?: number;  // minimum reputation to accept
  export?: boolean;        // export-tier contract
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: 'ct01', name: 'Northern Dairy Farm',       cropId: 'grass',     amountRange: [5000, 20000],  priceBonus: 1.15, termDays: 20,  penaltyRate: 0.10 },
  { id: 'ct02', name: 'Regional Livestock Co.',    cropId: 'alfalfa',   amountRange: [4000, 15000],  priceBonus: 1.18, termDays: 25,  penaltyRate: 0.12 },
  { id: 'ct03', name: 'Craft Brewing Co.',         cropId: 'barley',    amountRange: [2000,  8000],  priceBonus: 1.22, termDays: 60,  penaltyRate: 0.18 },
  { id: 'ct04', name: 'Flake Factory Ltd.',        cropId: 'oats',      amountRange: [2000,  7000],  priceBonus: 1.20, termDays: 55,  penaltyRate: 0.18 },
  { id: 'ct05', name: 'Industrial Flour Mill',     cropId: 'wheat',     amountRange: [3000, 12000],  priceBonus: 1.22, termDays: 70,  penaltyRate: 0.22 },
  { id: 'ct06', name: 'Southern Foods Inc.',       cropId: 'corn',      amountRange: [3000, 10000],  priceBonus: 1.20, termDays: 65,  penaltyRate: 0.20 },
  { id: 'ct07', name: 'Premier Livestock Feed',    cropId: 'sorghum',   amountRange: [3000, 10000],  priceBonus: 1.18, termDays: 55,  penaltyRate: 0.18 },
  { id: 'ct08', name: 'National Rice Processors',  cropId: 'rice',      amountRange: [2000,  8000],  priceBonus: 1.25, termDays: 70,  penaltyRate: 0.22 },
  { id: 'ct09', name: 'Supermarket Chain Co.',     cropId: 'potatoes',  amountRange: [2000,  8000],  priceBonus: 1.22, termDays: 55,  penaltyRate: 0.20 },
  { id: 'ct10', name: 'Continental Sugar Corp.',   cropId: 'sugarbeet', amountRange: [3000, 12000],  priceBonus: 1.25, termDays: 80,  penaltyRate: 0.25 },
  { id: 'ct11', name: 'Protein Export Group',      cropId: 'soy',       amountRange: [2000,  8000],  priceBonus: 1.28, termDays: 80,  penaltyRate: 0.25 },
  { id: 'ct12', name: 'Cane Sugar Refinery',       cropId: 'sugarcane', amountRange: [4000, 15000],  priceBonus: 1.22, termDays: 90,  penaltyRate: 0.22 },
  { id: 'ct13', name: 'Biofuel Solutions Ltd.',    cropId: 'sunflower', amountRange: [1500,  5000],  priceBonus: 1.30, termDays: 80,  penaltyRate: 0.28 },
  { id: 'ct14', name: 'Veggie Oil Refinery',       cropId: 'rapeseed',  amountRange: [1500,  5000],  priceBonus: 1.32, termDays: 85,  penaltyRate: 0.28 },
  { id: 'ct15', name: 'Canola Food Industries',    cropId: 'canola',    amountRange: [1500,  5000],  priceBonus: 1.30, termDays: 80,  penaltyRate: 0.28 },
  { id: 'ct16', name: 'National Textile Corp.',    cropId: 'cotton',    amountRange: [800,   3000],  priceBonus: 1.35, termDays: 90,  penaltyRate: 0.32 },
  // ── New crop contracts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'ct17', name: 'Regional Winery Co.',       cropId: 'grapes',       amountRange: [500,  2000],  priceBonus: 1.25, termDays: 60,  penaltyRate: 0.22 },
  { id: 'ct18', name: 'Fresh Markets Group',        cropId: 'tomatoes',     amountRange: [1000, 4000],  priceBonus: 1.20, termDays: 45,  penaltyRate: 0.18 },
  { id: 'ct19', name: 'Spring Berry Co.',           cropId: 'strawberries', amountRange: [500,  2000],  priceBonus: 1.22, termDays: 40,  penaltyRate: 0.20 },
  { id: 'ct20', name: 'Mediterranean Foods Inc.',   cropId: 'olives',       amountRange: [400,  1500],  priceBonus: 1.28, termDays: 80,  penaltyRate: 0.25 },
  { id: 'ct21', name: 'Premium Nut Distributors',   cropId: 'almonds',      amountRange: [300,  1200],  priceBonus: 1.30, termDays: 85,  penaltyRate: 0.28 },
  // ── Export contracts (reputation ≥ 70) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { id: 'exp01', name: 'EU Premium Wine Export',    cropId: 'grapes',       amountRange: [800,  3000],  priceBonus: 1.60, termDays: 100, penaltyRate: 0.45, minReputation: 70,  export: true },
  { id: 'exp02', name: 'Global Olive Oil Export',   cropId: 'olives',       amountRange: [600,  2000],  priceBonus: 1.65, termDays: 110, penaltyRate: 0.50, minReputation: 70,  export: true },
  { id: 'exp03', name: 'International Almond Trade',cropId: 'almonds',      amountRange: [400,  1500],  priceBonus: 1.70, termDays: 120, penaltyRate: 0.50, minReputation: 75,  export: true },
  { id: 'exp04', name: 'Premium Textile Exporter',  cropId: 'cotton',       amountRange: [600,  2200],  priceBonus: 1.65, termDays: 130, penaltyRate: 0.55, minReputation: 70,  export: true },
  { id: 'exp05', name: 'Luxury Spice Exchange',     cropId: 'saffron',      amountRange: [80,    400],  priceBonus: 1.80, termDays: 180, penaltyRate: 0.60, minReputation: 85,  export: true },
];

export function contractPenalty(contract: Contract): number {
  const template = CONTRACT_TEMPLATES.find(t => t.id === contract.templateId)!;
  const totalValue = contract.amount * contract.pricePerUnit;
  return totalValue * template.penaltyRate;
}

// ─── Recurring Contracts ─────────────────────────────────────────────────────

export type BuyerTier = 'new' | 'regular' | 'preferred' | 'exclusive';

export interface Buyer {
  id: string;
  name: string;
  emoji: string;
  /** accepted crop IDs; 'any' means all crops */
  cropIds: string[];
  tier: BuyerTier;
  deliveryStreak: number;
  totalDeliveries: number;
  /** consecutive missed deliveries; hitting 2 cancels contract + drops tier */
  missedInARow: number;
  /** game day this buyer first appears */
  unlockedDay: number;
  requiresReputation?: number;
}

export interface RecurringContract {
  id: string;
  buyerId: string;
  cropId: string;
  amountPerDelivery: number;
  frequencyDays: 7 | 14 | 30;
  /** fraction added on top of base price, e.g. 0.27 = +27% */
  priceBonus: number;
  nextDeliveryDay: number;
  /** days the player has to fulfil each cycle before it counts as missed */
  deliveryWindowDays: number;
  durationSeasons: number;
  startDay: number;
  endDay: number;
  active: boolean;
  /** extra days added by weather insurance; consumed before counting a miss */
  graceDaysRemaining: number;
}

export interface TierConfig {
  label: string;
  emoji: string;
  priceBonus: number;
  maxOrderKg: number;
  windowDays: number;
  graceDays: number;
  /** totalDeliveries needed to reach this tier */
  deliveryGate: number;
}

export const BUYER_TIER_CONFIG: Record<BuyerTier, TierConfig> = {
  new:       { label: 'New',       emoji: '🆕', priceBonus: 0.20, maxOrderKg: 500,      windowDays: 7, graceDays: 0,  deliveryGate: 0  },
  regular:   { label: 'Regular',   emoji: '⭐', priceBonus: 0.27, maxOrderKg: 1500,     windowDays: 5, graceDays: 3,  deliveryGate: 3  },
  preferred: { label: 'Preferred', emoji: '🌟', priceBonus: 0.33, maxOrderKg: 4000,     windowDays: 4, graceDays: 7,  deliveryGate: 8  },
  exclusive: { label: 'Exclusive', emoji: '💎', priceBonus: 0.40, maxOrderKg: Infinity, windowDays: 3, graceDays: 14, deliveryGate: 15 },
};

// Pet Food Co. uses reduced bonuses (safety-net buyer for any crop)
const PET_FOOD_BONUSES: Record<BuyerTier, number> = {
  new: 0.15, regular: 0.20, preferred: 0.25, exclusive: 0.30,
};

/** Returns the price bonus fraction for a buyer at their current tier. */
export function getBuyerPriceBonus(buyer: Buyer): number {
  if (buyer.id === 'buyer_petfood') return PET_FOOD_BONUSES[buyer.tier];
  return BUYER_TIER_CONFIG[buyer.tier].priceBonus;
}

export const INITIAL_BUYERS: Buyer[] = [
  {
    id: 'buyer_bakery', name: 'Local Bakery', emoji: '🥖',
    cropIds: ['wheat', 'corn'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1,
  },
  {
    id: 'buyer_restaurant', name: 'City Restaurant', emoji: '🍽️',
    cropIds: ['lavender', 'saffron', 'vanilla'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 40,
  },
  {
    id: 'buyer_processor', name: 'Export Processor', emoji: '🏭',
    cropIds: ['wheat', 'corn', 'barley', 'soy'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 60,
  },
  {
    id: 'buyer_dairy', name: 'Dairy Distributor', emoji: '🥛',
    cropIds: ['grass', 'alfalfa'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1,
  },
  {
    id: 'buyer_organic', name: 'Organic Market', emoji: '🌿',
    cropIds: ['any'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 45,
  },
  {
    id: 'buyer_supermarket', name: 'Regional Supermarket', emoji: '🛒',
    cropIds: ['any'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 30,
  },
  {
    id: 'buyer_distillery', name: 'Distillery', emoji: '🍺',
    cropIds: ['barley', 'corn', 'sugarbeet'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 50,
  },
  {
    id: 'buyer_petfood', name: 'Pet Food Co.', emoji: '🐾',
    cropIds: ['any'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1,
  },
];

// ─── Recurring Contract Logic ─────────────────────────────────────────────────

const TIER_ORDER: BuyerTier[] = ['new', 'regular', 'preferred', 'exclusive'];

function nextTier(t: BuyerTier): BuyerTier {
  const i = TIER_ORDER.indexOf(t);
  return TIER_ORDER[Math.min(i + 1, TIER_ORDER.length - 1)];
}

function prevTier(t: BuyerTier): BuyerTier {
  const i = TIER_ORDER.indexOf(t);
  return TIER_ORDER[Math.max(i - 1, 0)];
}

/**
 * Returns the highest tier whose deliveryGate the buyer has already met.
 * Call after incrementing totalDeliveries.
 */
export function checkTierUpgrade(buyer: Buyer): BuyerTier {
  const candidates = TIER_ORDER.filter(
    (t) => BUYER_TIER_CONFIG[t].deliveryGate <= buyer.totalDeliveries,
  );
  return candidates[candidates.length - 1] ?? 'new';
}

/**
 * Creates a new RecurringContract from a buyer + player choices.
 * Caller must verify: crop is accepted, amount ≤ tier maxOrderKg,
 * no other active contract exists for this buyer.
 */
export function signRecurringContract(
  buyer: Buyer,
  cropId: string,
  amountPerDelivery: number,
  frequencyDays: 7 | 14 | 30,
  durationSeasons: number,
  currentDay: number,
): RecurringContract {
  const cfg = BUYER_TIER_CONFIG[buyer.tier];
  const DAYS_PER_SEASON = 90;
  const endDay = currentDay + durationSeasons * DAYS_PER_SEASON;
  return {
    id: `rc_${buyer.id}_${currentDay}`,
    buyerId: buyer.id,
    cropId,
    amountPerDelivery,
    frequencyDays,
    priceBonus: getBuyerPriceBonus(buyer),
    nextDeliveryDay: currentDay + frequencyDays,
    deliveryWindowDays: cfg.windowDays,
    durationSeasons,
    startDay: currentDay,
    endDay,
    active: true,
    graceDaysRemaining: 0,
  };
}

/**
 * Resolves a player delivery attempt.
 * Partial delivery ≥ 80% counts as on-time (streak increments, tier can upgrade).
 * Returns updated buyer + contract + the revenue earned.
 *
 * Caller is responsible for:
 *   - deducting `amountDelivered` from inventory[contract.cropId]
 *   - adding `revenue` to player money
 */
export function resolveDelivery(
  contract: RecurringContract,
  buyer: Buyer,
  amountDelivered: number,
  basePrice: number,
  currentDay: number,
): { contract: RecurringContract; buyer: Buyer; revenue: number } {
  const threshold = contract.amountPerDelivery * 0.8;
  const onTime = amountDelivered >= threshold;
  const revenue = amountDelivered * basePrice * (1 + contract.priceBonus);

  const updatedBuyer: Buyer = {
    ...buyer,
    totalDeliveries: onTime ? buyer.totalDeliveries + 1 : buyer.totalDeliveries,
    deliveryStreak: onTime ? buyer.deliveryStreak + 1 : 0,
    missedInARow: onTime ? 0 : buyer.missedInARow + 1,
  };
  if (onTime) {
    updatedBuyer.tier = checkTierUpgrade(updatedBuyer);
  }

  const updatedContract: RecurringContract = {
    ...contract,
    priceBonus: getBuyerPriceBonus(updatedBuyer),
    nextDeliveryDay: currentDay + contract.frequencyDays,
    graceDaysRemaining: 0,
  };

  return { contract: updatedContract, buyer: updatedBuyer, revenue };
}

/**
 * Called from advanceDay(). Scans all active contracts for windows that have
 * closed without a delivery.
 * - If graceDaysRemaining > 0: extends the window instead of counting a miss.
 * - If missedInARow reaches 2: deactivates contract + drops buyer tier one level.
 *
 * Returns updated { contracts, buyers } arrays (pure).
 */
export function checkRecurringDeliveries(
  contracts: RecurringContract[],
  buyers: Buyer[],
  currentDay: number,
): { contracts: RecurringContract[]; buyers: Buyer[] } {
  const buyerMap = new Map(buyers.map((b) => [b.id, { ...b }]));

  const updatedContracts = contracts.map((c) => {
    if (!c.active) return c;

    const windowCloseDay = c.nextDeliveryDay + c.deliveryWindowDays;
    if (currentDay < windowCloseDay) return c; // window still open

    const buyer = buyerMap.get(c.buyerId)!;

    if (c.graceDaysRemaining > 0) {
      // Use grace days — extend the window, don't count as a miss
      return {
        ...c,
        deliveryWindowDays: c.deliveryWindowDays + c.graceDaysRemaining,
        graceDaysRemaining: 0,
      };
    }

    // Count as a miss
    const newMissed = buyer.missedInARow + 1;
    buyerMap.set(buyer.id, {
      ...buyer,
      missedInARow: newMissed,
      deliveryStreak: 0,
    });

    if (newMissed >= 2) {
      // Cancel + drop tier
      buyerMap.set(buyer.id, {
        ...buyerMap.get(buyer.id)!,
        tier: prevTier(buyer.tier),
        missedInARow: 0,
      });
      return { ...c, active: false };
    }

    return c;
  });

  return { contracts: updatedContracts, buyers: Array.from(buyerMap.values()) };
}

/**
 * Extends graceDaysRemaining on all active contracts when weather insurance
 * triggers. Grace days added = the buyer's current tier graceDays.
 * Caller must verify that an active insurance policy exists before calling.
 */
export function applyDisasterGrace(
  contracts: RecurringContract[],
  buyers: Buyer[],
): RecurringContract[] {
  const buyerMap = new Map(buyers.map((b) => [b.id, b]));
  return contracts.map((c) => {
    if (!c.active) return c;
    const buyer = buyerMap.get(c.buyerId);
    if (!buyer) return c;
    const graceDays = BUYER_TIER_CONFIG[buyer.tier].graceDays;
    return { ...c, graceDaysRemaining: c.graceDaysRemaining + graceDays };
  });
}
