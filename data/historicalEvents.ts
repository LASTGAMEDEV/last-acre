// data/historicalEvents.ts

export type EventCategory =
  | 'economic'
  | 'technology'
  | 'regulation'
  | 'disease'
  | 'weather'
  | 'genetics'
  | 'product';

export type EventEffect = {
  /** Key matching a target in the timeline multiplier system.
   *  Known targets: 'fuel_cost' | 'wheat_price' | 'corn_price' | 'soy_price' |
   *  'milk_price' | 'beef_price' | 'pork_price' | 'loan_rate' | 'land_value' |
   *  'fertiliser_cost' | 'all_crop_prices' | 'all_livestock_prices'
   */
  target: string;
  /** Price multiplier. 1.4 = +40%. Applied as: basePrice * multiplier. */
  multiplier?: number;
  /** Absolute addition (e.g. interest rate). Added after multiplier. */
  absolute?: number;
};

export type UnlockGate = {
  type: 'product' | 'engine' | 'mechanic';
  /** ID string matching an item in the shop or an engine name. */
  id: string;
};

export type HistoricalEvent = {
  id: string;
  /** Real-world ISO date "YYYY-MM-DD". Converted to game day at runtime. */
  date: string;
  category: EventCategory;
  /** 'major' shows newspaper modal. 'minor' shows toast banner. */
  tier: 'major' | 'minor';
  headline: string;
  /** Hand-written narrative for major events. Template string for minor. */
  narrative: string;
  effects: EventEffect[];
  unlocks?: UnlockGate[];
  /** Days to ramp from 0 effect to full effect after trigger date. */
  rampUpDays: number;
  /** Days at full effect. */
  peakDays: number;
  /** Days to ramp from full effect back to 0. Set to 0 for permanent changes. */
  rampDownDays: number;
};

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  // ─── 1970 ────────────────────────────────────────────────────────────────
  {
    id: '1970-epa-founded',
    date: '1970-12-02',
    category: 'regulation',
    tier: 'minor',
    headline: 'Environmental Protection Agency established',
    narrative: 'A new federal agency begins regulating pesticide use and farm runoff.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'pesticide_regulation' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1972 ────────────────────────────────────────────────────────────────
  {
    id: '1972-ddt-ban',
    date: '1972-06-14',
    category: 'regulation',
    tier: 'major',
    headline: 'DDT Banned — Pesticide Era Ends',
    narrative: 'The government bans DDT after years of scientific pressure. Your spray cabinet needs rethinking. Some of your most effective pest treatments are no longer legal.',
    effects: [],
    unlocks: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1973 ────────────────────────────────────────────────────────────────
  {
    id: '1973-oil-embargo',
    date: '1973-10-17',
    category: 'economic',
    tier: 'major',
    headline: 'Oil Embargo — Fuel Prices Surge',
    narrative: 'Oil-producing nations cut exports overnight. Diesel at the pump has jumped 40 cents already and shows no sign of stopping. Every tractor hour, every delivery, every harvest run now costs more. You check your fuel reserves and do the maths. It is going to be a long winter.',
    effects: [
      { target: 'fuel_cost', multiplier: 1.4 },
      { target: 'fertiliser_cost', multiplier: 1.25 },
    ],
    rampUpDays: 30,
    peakDays: 240,
    rampDownDays: 60,
  },
  {
    id: '1973-grain-boom',
    date: '1973-06-01',
    category: 'economic',
    tier: 'minor',
    headline: 'Global grain demand surges — prices at record highs',
    narrative: 'Wheat and corn prices hit all-time highs as global demand outpaces supply.',
    effects: [
      { target: 'wheat_price', multiplier: 1.6 },
      { target: 'corn_price', multiplier: 1.5 },
    ],
    rampUpDays: 60,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 1974 ────────────────────────────────────────────────────────────────
  {
    id: '1974-glyphosate-launch',
    date: '1974-09-01',
    category: 'product',
    tier: 'minor',
    headline: 'Broad-spectrum herbicide launched',
    narrative: 'A new non-selective herbicide hits the market, promising to eliminate weeds before planting.',
    effects: [],
    unlocks: [{ type: 'product', id: 'herbicide_glyphosate_t1' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1975 ────────────────────────────────────────────────────────────────
  {
    id: '1975-embryo-transfer',
    date: '1975-01-01',
    category: 'genetics',
    tier: 'minor',
    headline: 'Embryo transfer enters commercial farming',
    narrative: 'Elite genetic traits can now be multiplied faster through embryo transfer technology.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'embryo_transfer' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1976 ────────────────────────────────────────────────────────────────
  {
    id: '1976-drought-europe',
    date: '1976-07-01',
    category: 'weather',
    tier: 'major',
    headline: 'European Drought — Worst in a Century',
    narrative: 'No meaningful rain in six weeks. The fields are cracking. Pastures are brown. Livestock are eating through winter reserves in summer. You have never seen the water table this low.',
    effects: [
      { target: 'wheat_price', multiplier: 1.35 },
      { target: 'milk_price', multiplier: 0.9 },
    ],
    rampUpDays: 14,
    peakDays: 90,
    rampDownDays: 30,
  },

  // ─── 1977 ────────────────────────────────────────────────────────────────
  {
    id: '1977-gps-satellite-first',
    date: '1977-09-01',
    category: 'technology',
    tier: 'minor',
    headline: 'First navigation satellite launched',
    narrative: 'Scientists begin testing global positioning technology. Agricultural applications are years away.',
    effects: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1978 ────────────────────────────────────────────────────────────────
  {
    id: '1978-4wd-tractors-available',
    date: '1978-03-01',
    category: 'technology',
    tier: 'minor',
    headline: 'Four-wheel drive tractors now available',
    narrative: 'Manufacturers begin offering 4WD as standard. Better traction, better productivity in wet conditions.',
    effects: [],
    unlocks: [{ type: 'product', id: 'tractor_4wd_t1' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1979 ────────────────────────────────────────────────────────────────
  {
    id: '1979-oil-crisis-2',
    date: '1979-01-16',
    category: 'economic',
    tier: 'major',
    headline: 'Second Oil Crisis — Fuel Costs Surge Again',
    narrative: 'Revolution in Iran chokes oil supply. Fuel is rationed in some areas. Diesel costs have nearly doubled in two years. Every farm in the country is recalculating.',
    effects: [
      { target: 'fuel_cost', multiplier: 1.5 },
    ],
    rampUpDays: 30,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 1980 ────────────────────────────────────────────────────────────────
  {
    id: '1980-ussr-grain-embargo',
    date: '1980-01-04',
    category: 'economic',
    tier: 'major',
    headline: 'USSR Grain Embargo — Export Markets Collapse',
    narrative: 'The government bans grain exports to the Soviet Union in protest of the Afghanistan invasion. Grain prices crash overnight. Every farmer in the country is sitting on wheat they cannot sell at any price they planned for.',
    effects: [
      { target: 'wheat_price', multiplier: 0.72 },
      { target: 'corn_price', multiplier: 0.78 },
    ],
    rampUpDays: 7,
    peakDays: 365,
    rampDownDays: 90,
  },

  // ─── 1981 ────────────────────────────────────────────────────────────────
  {
    id: '1981-interest-rate-peak',
    date: '1981-06-20',
    category: 'economic',
    tier: 'major',
    headline: 'Interest Rates Hit 21% — Borrowing Becomes Catastrophic',
    narrative: 'The bank called this morning. Your variable rate loan has adjusted again. Twenty-one percent. You sit at the kitchen table with the figures in front of you and try to find a number that works. There is not one.',
    effects: [
      { target: 'loan_rate', absolute: 0.12 },
    ],
    rampUpDays: 14,
    peakDays: 180,
    rampDownDays: 365,
  },

  // ─── 1983 ────────────────────────────────────────────────────────────────
  {
    id: '1983-bst-approved',
    date: '1983-01-01',
    category: 'product',
    tier: 'minor',
    headline: 'Bovine growth hormone approved for commercial use',
    narrative: 'A synthetic hormone treatment promises to boost dairy yields by 10–15%.',
    effects: [],
    unlocks: [{ type: 'product', id: 'bst_treatment' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1984 ────────────────────────────────────────────────────────────────
  {
    id: '1984-csa-movement',
    date: '1984-06-01',
    category: 'product',
    tier: 'minor',
    headline: 'Community-supported agriculture model emerges',
    narrative: 'Farmers in urban-adjacent areas begin selling subscription boxes direct to consumers.',
    effects: [],
    unlocks: [{ type: 'engine', id: 'csaEngine' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1985 ────────────────────────────────────────────────────────────────
  {
    id: '1985-conservation-reserve',
    date: '1985-12-23',
    category: 'regulation',
    tier: 'minor',
    headline: 'Conservation Reserve Program established',
    narrative: 'Farmers can now receive payments for taking environmentally sensitive land out of production.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'conservation_reserve' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },
  {
    id: '1985-farm-debt-crisis-early',
    date: '1985-03-01',
    category: 'economic',
    tier: 'major',
    headline: 'Farm Debt Crisis Deepens — Foreclosures Rising',
    narrative: 'Land values have fallen 30% in three years. Banks are calling in loans. Neighbours are losing their farms. The auction notices appear in the paper every week now. You watch the Caldwells loading a truck at dawn and look away.',
    effects: [
      { target: 'land_value', multiplier: 0.75 },
      { target: 'loan_rate', absolute: 0.04 },
    ],
    rampUpDays: 60,
    peakDays: 540,
    rampDownDays: 180,
  },
];
