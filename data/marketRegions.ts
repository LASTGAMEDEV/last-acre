export type MarketId = 'local' | 'city' | 'export';

export interface MarketRegion {
  id: MarketId;
  name: string;
  description: string;
  /** Multiplier applied to the base sale price (before tax). */
  priceMultiplier: number;
  /** Fixed transport cost per unit sold, deducted from gross revenue. */
  transportCostPerUnit: number;
  /** Game day on which this market becomes available. */
  unlockDay: number;
  icon: string;
}

export const MARKET_REGIONS: MarketRegion[] = [
  {
    id: 'local',
    name: 'Local Market',
    description: 'Sell directly to local buyers. No transport cost, standard prices.',
    priceMultiplier: 1.00,
    transportCostPerUnit: 0,
    unlockDay: 1,
    icon: '🏪',
  },
  {
    id: 'city',
    name: 'City Market',
    description: 'Larger buyer pool in the city. +20% price but $0.15/unit transport.',
    priceMultiplier: 1.20,
    transportCostPerUnit: 0.15,
    unlockDay: 30,
    icon: '🏙️',
  },
  {
    id: 'export',
    name: 'Export Terminal',
    description: 'International buyers pay premium prices. +45% price but $0.40/unit transport. Unlocks day 90.',
    priceMultiplier: 1.45,
    transportCostPerUnit: 0.40,
    unlockDay: 90,
    icon: '🚢',
  },
];
