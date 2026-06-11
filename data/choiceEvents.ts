export interface ChoiceEffect {
  money?: number;
  reputationDelta?: number;
  soilNitrogenAll?: number;
  soilOrganicAll?: number;
  priceShock?: { commodityId: string | null; magnitude: number; durationDays: number };
  inventoryLiquidatePct?: number; // sell all inventory at X% of current market price
}

export interface ChoiceOption {
  label: string;
  effectDesc: string;
  kind: 'good' | 'neutral' | 'risky';
  effect: ChoiceEffect;
}

export interface ChoiceEventTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  options: [ChoiceOption, ChoiceOption];
  weight: number;
  minDay?: number;
  maxDay?: number;
}

export const CHOICE_EVENT_TEMPLATES: ChoiceEventTemplate[] = [
  {
    id: 'ce_bulk_offer',
    icon: '💰',
    title: 'Bulk Buyer Arrives',
    description: "A commodity trader offers to buy your entire crop inventory right now at 80% of current market prices. No transport needed — they handle logistics.",
    weight: 9,
    options: [
      {
        label: 'Accept the deal',
        effectDesc: 'Sell all stock at 80% market price — instant cash, no hassle',
        kind: 'neutral',
        effect: { inventoryLiquidatePct: 0.80 },
      },
      {
        label: 'Decline — wait for better prices',
        effectDesc: 'Keep your inventory and sell on your own terms',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_journalist',
    icon: '📰',
    title: 'Journalist Feature Request',
    description: "A regional farming magazine wants to feature your farm in a sustainability story. It would bring good publicity and they pay a small appearance fee.",
    weight: 6,
    minDay: 90,
    options: [
      {
        label: 'Grant the interview ($300)',
        effectDesc: '+8 reputation, $300 payment',
        kind: 'good',
        effect: { money: 300, reputationDelta: 8 },
      },
      {
        label: 'Decline — too busy',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_donation',
    icon: '🤝',
    title: 'Community Fund Drive',
    description: "The village is raising funds for a new community center. The local newspaper will publish a list of major donors, giving your farm good visibility.",
    weight: 7,
    minDay: 60,
    options: [
      {
        label: 'Donate $300',
        effectDesc: '+7 reputation with local community',
        kind: 'good',
        effect: { money: -300, reputationDelta: 7 },
      },
      {
        label: 'Decline this time',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_fertilizer_deal',
    icon: '🌿',
    title: 'Discounted Fertilizer Offer',
    description: "A salesman is offering nitrogen fertilizer at 40% off. The source is unclear, but the product looks legitimate. Treat all your fields now for cheap.",
    weight: 10,
    options: [
      {
        label: 'Buy the deal ($480)',
        effectDesc: 'All parcels: +20 nitrogen. Source uncertain — small risk.',
        kind: 'risky',
        effect: { money: -480, soilNitrogenAll: 20 },
      },
      {
        label: 'Skip',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_soil_boost',
    icon: '🌱',
    title: 'Extension Service Visit',
    description: "A county agricultural extension agent offers to apply a free compost treatment across your fields as part of a pilot program. No cost to you.",
    weight: 7,
    minDay: 45,
    options: [
      {
        label: 'Accept the treatment',
        effectDesc: 'All parcels: +0.3 organic matter, +10 microbial life',
        kind: 'good',
        effect: { soilOrganicAll: 0.3, soilNitrogenAll: 5 },
      },
      {
        label: 'Decline',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_price_rumor',
    icon: '📊',
    title: 'Market Intelligence Tip',
    description: "A trusted co-op contact privately warns you that a major grain buyer is exiting the region, which could sharply depress wheat prices in the coming days.",
    weight: 5,
    minDay: 120,
    options: [
      {
        label: 'Act on the tip (sell wheat now)',
        effectDesc: 'Sell wheat inventory now before the drop hits',
        kind: 'neutral',
        effect: { inventoryLiquidatePct: 1.0 },
      },
      {
        label: 'Ignore — unverified rumor',
        effectDesc: 'Prices drop -20% for 10 days (market shock applied)',
        kind: 'risky',
        effect: { priceShock: { commodityId: 'wheat', magnitude: -0.20, durationDays: 10 } },
      },
    ],
  },
  {
    id: 'ce_research_trial',
    icon: '🔬',
    title: 'Research Partnership Offer',
    description: "A university agriculture department wants to run a trial on your farm. They'll pay you $600 and provide expert advice in exchange for using one field for their study.",
    weight: 5,
    minDay: 180,
    options: [
      {
        label: 'Accept the partnership',
        effectDesc: '$600 payment, +5 reputation with research community',
        kind: 'good',
        effect: { money: 600, reputationDelta: 5 },
      },
      {
        label: 'Decline',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_bad_weather_prep',
    icon: '🌩️',
    title: 'Storm Preparation Gamble',
    description: "Weather forecasts show a major storm in 3 days. You can pay extra to reinforce your storage and equipment now, or gamble that the storm misses you.",
    weight: 8,
    options: [
      {
        label: 'Reinforce now ($400)',
        effectDesc: 'No storm damage to your structures — peace of mind',
        kind: 'good',
        effect: { money: -400 },
      },
      {
        label: 'Hope for the best',
        effectDesc: 'If storm hits: equipment damage costs arrive. Save $400 for now.',
        kind: 'risky',
        effect: {},
      },
    ],
  },
];
