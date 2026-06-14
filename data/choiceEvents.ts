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
  {
    id: 'ce_animal_show',
    icon: '🏆',
    title: 'Regional Farm Show Invitation',
    description:
      "The county agricultural fair is accepting entries. Entering your best livestock costs $250 in preparation fees, but prize winners earn significant community standing.",
    weight: 7,
    minDay: 60,
    options: [
      {
        label: 'Enter the show ($250)',
        effectDesc: '-$250 prep costs, +16 reputation',
        kind: 'good',
        effect: { money: -250, reputationDelta: 16 },
      },
      {
        label: 'Skip this year',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_disease_scare',
    icon: '🩺',
    title: 'Herd Health Scare',
    description:
      "Your veterinarian flags unusual symptoms in the herd. A full diagnostic panel costs $350 but catches any disease early. Waiting saves money but risks spreading the scare to market prices.",
    weight: 8,
    options: [
      {
        label: 'Run full diagnostics ($350)',
        effectDesc: '-$350, +3 reputation for responsible herd management',
        kind: 'good',
        effect: { money: -350, reputationDelta: 3 },
      },
      {
        label: 'Monitor for a few more days',
        effectDesc: 'Risk: disease rumor suppresses all commodity prices -12% for 14 days',
        kind: 'risky',
        effect: { priceShock: { commodityId: null, magnitude: -0.12, durationDays: 14 } },
      },
    ],
  },
  {
    id: 'ce_drought_aid',
    icon: '💧',
    title: 'Emergency Drought Relief',
    description:
      "The regional agriculture board is offering emergency drought relief grants to qualifying farms. Accepting binds you to 12 months of production reporting — but the funds are substantial.",
    weight: 7,
    minDay: 90,
    options: [
      {
        label: 'Accept the relief grant',
        effectDesc: '+$2,000 cash infusion',
        kind: 'neutral',
        effect: { money: 2000 },
      },
      {
        label: 'Decline — manage independently',
        effectDesc: '+6 reputation for resilience and self-reliance',
        kind: 'good',
        effect: { reputationDelta: 6 },
      },
    ],
  },
  {
    id: 'ce_prize_birth',
    icon: '🐄',
    title: 'Outstanding Animal Birth',
    description:
      "One of your cows has delivered an exceptionally healthy calf with rare genetic traits. A livestock broker is offering $1,400 immediately — far above normal market value.",
    weight: 6,
    minDay: 120,
    options: [
      {
        label: 'Sell to the broker',
        effectDesc: '+$1,400 cash — premium price now',
        kind: 'good',
        effect: { money: 1400 },
      },
      {
        label: 'Keep for your breeding stock',
        effectDesc: '+8 reputation as a quality breeder',
        kind: 'good',
        effect: { reputationDelta: 8 },
      },
    ],
  },
  {
    id: 'ce_organic_cooperative',
    icon: '🌿',
    title: 'Organic Co-op Invitation',
    description:
      "A premium organic farming cooperative is inviting your farm to join their network. Membership costs $600 but opens access to premium markets and shared certification benefits.",
    weight: 5,
    minDay: 180,
    options: [
      {
        label: 'Join the co-op ($600)',
        effectDesc: '-$600, +14 reputation in organic circles',
        kind: 'good',
        effect: { money: -600, reputationDelta: 14 },
      },
      {
        label: 'Not the right time',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_estate_auction',
    icon: '🚜',
    title: 'Estate Auction Bargain',
    description:
      "A retiring farmer is auctioning equipment at steep discounts. There's a solid cultivator going for $900 — unknown service history, bought as-is. Could be a great deal or an expensive repair.",
    weight: 8,
    options: [
      {
        label: 'Buy the cultivator ($900)',
        effectDesc: '-$900, +10 soil nitrogen from better field prep',
        kind: 'risky',
        effect: { money: -900, soilNitrogenAll: 10 },
      },
      {
        label: 'Pass — too risky',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_seed_trial',
    icon: '🌾',
    title: 'Seed Company Trial Offer',
    description:
      "An agricultural seed company wants to trial a new high-yield variety on your farm. They provide seeds free and pay you $500 for your crop yield data over the season.",
    weight: 7,
    minDay: 60,
    options: [
      {
        label: 'Accept the trial ($500)',
        effectDesc: '+$500 payment and improved soil from their premium seed prep',
        kind: 'good',
        effect: { money: 500, soilNitrogenAll: 8 },
      },
      {
        label: 'Decline — stick to your varieties',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_celebrity_chef',
    icon: '👨‍🍳',
    title: 'Celebrity Chef Partnership',
    description:
      "A well-known chef is sourcing local farms for their new restaurant. They want to feature your produce and offer a flat $800 fee for exclusive supply rights for one month.",
    weight: 5,
    minDay: 150,
    options: [
      {
        label: 'Accept the partnership',
        effectDesc: '+$800 flat fee, +10 reputation — great publicity',
        kind: 'good',
        effect: { money: 800, reputationDelta: 10 },
      },
      {
        label: 'Decline the offer',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  // ── Rare events (weight 1–3) ───────────────────────────────────────────────
  {
    id: 'ce_heritage_seed_cache',
    icon: '🌿',
    title: 'Forgotten Seed Cache',
    description:
      "While clearing an old barn corner, you uncover a sealed wooden chest filled with hand-labeled seed packets — heirloom varieties your grandfather saved decades ago. A heritage seed organisation offers $2,500 for the archive, or you could try to grow them and see what happens.",
    weight: 2,
    minDay: 120,
    options: [
      {
        label: 'Sell the archive ($2,500)',
        effectDesc: '+$2,500 cash and the seeds go to the public collection',
        kind: 'good',
        effect: { money: 2500 },
      },
      {
        label: 'Keep and trial the seeds',
        effectDesc: '+18 soil organic matter as you prepare special plots, no cash',
        kind: 'risky',
        effect: { soilOrganicAll: 0.8 },
      },
    ],
  },
  {
    id: 'ce_govt_climate_grant',
    icon: '🏛️',
    title: 'Government Climate Grant',
    description:
      "A regional climate-adaptation fund is awarding grants to farms that reduce emissions and improve soil health. The application costs time and a $250 assessment fee, but approved farms receive $4,000 within 30 days.",
    weight: 2,
    minDay: 200,
    options: [
      {
        label: 'Apply for the grant (-$250)',
        effectDesc: '-$250 now, +$4,000 payout and +8 reputation if approved',
        kind: 'risky',
        effect: { money: 3750, reputationDelta: 8 },
      },
      {
        label: 'Skip the paperwork',
        effectDesc: 'No change — grant goes to another farm',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_local_food_crisis',
    icon: '🍞',
    title: 'Local Food Shortage',
    description:
      "A logistics strike has cut off the town's food supply. Your storerooms are full. You could donate generously to the community food bank — or seize the shortage to sell your entire inventory at a 50% premium.",
    weight: 2,
    minDay: 90,
    options: [
      {
        label: 'Donate generously',
        effectDesc: 'Sell all inventory at 40% of market price, but gain +20 community reputation',
        kind: 'good',
        effect: { inventoryLiquidatePct: 0.40, reputationDelta: 20 },
      },
      {
        label: 'Sell at crisis premium',
        effectDesc: 'Sell all inventory at 140% market price, but −12 community reputation',
        kind: 'risky',
        effect: { inventoryLiquidatePct: 1.40, reputationDelta: -12 },
      },
    ],
  },
  {
    id: 'ce_soil_scientist',
    icon: '🔬',
    title: 'Soil Science Partnership',
    description:
      "A university soil science team wants to use your farm as a research site for two seasons. They pay you $600 for access and, as a byproduct of their deep-tillage sampling, your fields benefit from improved nitrogen cycling.",
    weight: 3,
    minDay: 150,
    options: [
      {
        label: 'Partner with the university',
        effectDesc: '+$600 and improved soil nitrogen across all parcels',
        kind: 'good',
        effect: { money: 600, soilNitrogenAll: 15 },
      },
      {
        label: 'Decline — too disruptive',
        effectDesc: 'No change',
        kind: 'neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'ce_rival_buys_out',
    icon: '🤝',
    title: 'Rival Makes an Offer',
    description:
      "Your biggest competitor has offered to buy you out entirely — farm, stock, and equipment — for a lump sum of $18,000. They want your land to expand their operation. It's a life-changing amount of money, but you'd be starting over.",
    weight: 1,
    minDay: 365,
    options: [
      {
        label: 'Sell the farm ($18,000)',
        effectDesc: '+$18,000 — the rival takes over your land',
        kind: 'risky',
        effect: { money: 18000 },
      },
      {
        label: 'Refuse — this farm is your legacy',
        effectDesc: '+5 reputation for standing your ground',
        kind: 'good',
        effect: { reputationDelta: 5 },
      },
    ],
  },
];
