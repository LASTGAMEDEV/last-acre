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

  // ─── 1986 ────────────────────────────────────────────────────────────────
  {
    id: '1986-chernobyl',
    date: '1986-04-26',
    category: 'regulation',
    tier: 'major',
    headline: 'Chernobyl Disaster — Radiation Blankets European Farmland',
    narrative: 'The reactor exploded three nights ago. Milk from farms across northern Europe is being tested. Authorities are warning consumers. You wait for the call about your own fields. The wind has been from the east.',
    effects: [
      { target: 'milk_price', multiplier: 0.85 },
      { target: 'all_crop_prices', multiplier: 0.92 },
    ],
    rampUpDays: 14,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 1988 ────────────────────────────────────────────────────────────────
  {
    id: '1988-north-america-drought',
    date: '1988-07-01',
    category: 'weather',
    tier: 'major',
    headline: 'North American Drought — Grain Crops Devastated',
    narrative: 'The worst drought in fifty years is burning through the corn belt. Grain elevators are half empty. Prices are climbing every week. If you have anything left in storage, now is the time to think hard about when to sell.',
    effects: [
      { target: 'corn_price', multiplier: 1.55 },
      { target: 'wheat_price', multiplier: 1.40 },
      { target: 'soy_price', multiplier: 1.45 },
    ],
    rampUpDays: 30,
    peakDays: 120,
    rampDownDays: 60,
  },

  // ─── 1990 ────────────────────────────────────────────────────────────────
  {
    id: '1990-eastern-europe-reform',
    date: '1990-03-01',
    category: 'economic',
    tier: 'minor',
    headline: 'Eastern European agricultural markets open after Communism falls',
    narrative: 'The Soviet bloc\'s collective farms are being privatised. New export and import flows reshape commodity prices across the continent.',
    effects: [
      { target: 'wheat_price', multiplier: 0.92 },
    ],
    rampUpDays: 60,
    peakDays: 365,
    rampDownDays: 180,
  },

  // ─── 1991 ────────────────────────────────────────────────────────────────
  {
    id: '1991-gulf-war-fuel',
    date: '1991-01-17',
    category: 'economic',
    tier: 'minor',
    headline: 'Gulf War drives fuel and fertilizer prices higher',
    narrative: 'Military action in Kuwait pushes oil markets up sharply. Diesel and fertilizer costs are rising week by week.',
    effects: [
      { target: 'fuel_cost', multiplier: 1.25 },
      { target: 'fertiliser_cost', multiplier: 1.15 },
    ],
    rampUpDays: 14,
    peakDays: 90,
    rampDownDays: 60,
  },

  // ─── 1992 ────────────────────────────────────────────────────────────────
  {
    id: '1992-organic-standards',
    date: '1992-01-01',
    category: 'regulation',
    tier: 'minor',
    headline: 'Official organic farming standards introduced',
    narrative: 'For the first time, certified organic produce commands a legal premium. Inspection bodies are established and the organic label means something the market will pay for.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'organic_certification_v2' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1994 ────────────────────────────────────────────────────────────────
  {
    id: '1994-nafta',
    date: '1994-01-01',
    category: 'economic',
    tier: 'minor',
    headline: 'NAFTA opens North American agricultural trade',
    narrative: 'Trade barriers drop between the US, Canada, and Mexico. New export opportunities open but cheaper imports also arrive. Corn flows south; cheap vegetables flow north.',
    effects: [
      { target: 'corn_price', multiplier: 1.1 },
    ],
    rampUpDays: 30,
    peakDays: 365,
    rampDownDays: 0,
  },

  // ─── 1996 ────────────────────────────────────────────────────────────────
  {
    id: '1996-gmo-first-season',
    date: '1996-04-01',
    category: 'genetics',
    tier: 'major',
    headline: 'First Genetically Modified Crops Planted at Commercial Scale',
    narrative: 'Roundup Ready soybeans go into the ground this spring across millions of acres. The seed company says yields will be up and weed control simpler. Farmers across the road are adopting it. You weigh the licence fees against the saved herbicide bills.',
    effects: [
      { target: 'soy_price', multiplier: 0.95 },
    ],
    unlocks: [{ type: 'product', id: 'gmo_seeds_t1' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },
  {
    id: '1996-bse-crisis',
    date: '1996-03-20',
    category: 'disease',
    tier: 'major',
    headline: 'Mad Cow Crisis — Beef Market Collapses',
    narrative: 'The minister announced today that BSE can cross to humans. Beef sales in supermarkets fell 30% in a week. The export ban is total. Your cattle are healthy but nobody wants to hear that right now. The prices on the board are catastrophic.',
    effects: [
      { target: 'beef_price', multiplier: 0.58 },
    ],
    rampUpDays: 14,
    peakDays: 540,
    rampDownDays: 180,
  },

  // ─── 2000 ────────────────────────────────────────────────────────────────
  {
    id: '2000-gmo-europe-labelling',
    date: '2000-04-01',
    category: 'regulation',
    tier: 'minor',
    headline: 'EU mandates GMO labelling — organic premium rises',
    narrative: 'All products containing genetically modified ingredients must now be labelled in Europe. Consumer preference for non-GMO drives a meaningful organic price premium.',
    effects: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 2001 ────────────────────────────────────────────────────────────────
  {
    id: '2001-foot-mouth',
    date: '2001-02-20',
    category: 'disease',
    tier: 'major',
    headline: 'Foot-and-Mouth Outbreak — Livestock Movement Banned',
    narrative: 'No movement of animals anywhere. Burning pyres are visible on the news every night. Your herd is healthy but you cannot move them, sell them, or bring any new stock in. The market has shut down. You wait, and you watch the horizon for smoke.',
    effects: [
      { target: 'beef_price', multiplier: 0.70 },
      { target: 'pork_price', multiplier: 0.75 },
      { target: 'all_livestock_prices', multiplier: 0.80 },
    ],
    rampUpDays: 7,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 2004 ────────────────────────────────────────────────────────────────
  {
    id: '2004-avian-flu',
    date: '2004-01-01',
    category: 'disease',
    tier: 'minor',
    headline: 'Avian influenza H5N1 detected in commercial poultry flocks',
    narrative: 'Highly pathogenic bird flu is spreading through Asia. Export markets are closing for poultry. Authorities urge biosecurity reviews.',
    effects: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 2006 ────────────────────────────────────────────────────────────────
  {
    id: '2006-ethanol-boom',
    date: '2006-01-01',
    category: 'economic',
    tier: 'minor',
    headline: 'Ethanol mandates divert corn to fuel production',
    narrative: 'Government biofuel targets are pulling corn out of the food market. Demand for feed grain is rising and so are prices. Land that grew wheat is being converted to corn.',
    effects: [
      { target: 'corn_price', multiplier: 1.25 },
    ],
    rampUpDays: 90,
    peakDays: 730,
    rampDownDays: 180,
  },

  // ─── 2007 ────────────────────────────────────────────────────────────────
  {
    id: '2007-global-food-crisis',
    date: '2007-10-01',
    category: 'economic',
    tier: 'major',
    headline: 'Global Food Price Crisis — Commodity Prices Soar',
    narrative: 'Wheat is up 80% from last year. Rice is rationed in three continents. There are food riots on the news. Your grain bin is suddenly worth more than it has ever been. You call the broker and ask about futures. You sell half now and watch the other half climb.',
    effects: [
      { target: 'wheat_price', multiplier: 1.80 },
      { target: 'corn_price', multiplier: 1.60 },
      { target: 'soy_price', multiplier: 1.55 },
      { target: 'all_crop_prices', multiplier: 1.30 },
    ],
    rampUpDays: 60,
    peakDays: 240,
    rampDownDays: 90,
  },

  // ─── 2008 ────────────────────────────────────────────────────────────────
  {
    id: '2008-oil-peak',
    date: '2008-07-11',
    category: 'economic',
    tier: 'major',
    headline: 'Oil Hits $147 — Fuel and Fertilizer Costs Peak',
    narrative: 'Diesel is at record highs. Nitrogen fertilizer, made from natural gas, has nearly tripled in price over two years. Every input cost on the farm has risen. The combine runs at double what it cost two seasons ago.',
    effects: [
      { target: 'fuel_cost', multiplier: 1.65 },
      { target: 'fertiliser_cost', multiplier: 2.0 },
    ],
    rampUpDays: 60,
    peakDays: 90,
    rampDownDays: 180,
  },
  {
    id: '2008-financial-crisis',
    date: '2008-09-15',
    category: 'economic',
    tier: 'major',
    headline: 'Banking Collapse — Credit Dries Up for Farms',
    narrative: 'Lehman Brothers is gone. Your rural banker called to say operating lines are being reviewed. Commodity prices have crashed from their summer highs. Cash is tight everywhere and getting tighter.',
    effects: [
      { target: 'loan_rate', absolute: 0.03 },
      { target: 'land_value', multiplier: 0.88 },
      { target: 'all_crop_prices', multiplier: 0.80 },
    ],
    rampUpDays: 30,
    peakDays: 365,
    rampDownDays: 180,
  },

  // ─── 2010 ────────────────────────────────────────────────────────────────
  {
    id: '2010-russia-drought',
    date: '2010-08-05',
    category: 'weather',
    tier: 'major',
    headline: 'Russian Drought — Grain Export Ban Imposed',
    narrative: 'The worst drought in fifty years has burned through Russia\'s wheat belt. Moscow has banned all grain exports immediately. World wheat prices spike overnight. Buyers who relied on Black Sea shipments are scrambling. Your bin has become strategic.',
    effects: [
      { target: 'wheat_price', multiplier: 1.60 },
      { target: 'corn_price', multiplier: 1.35 },
    ],
    rampUpDays: 14,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 2011 ────────────────────────────────────────────────────────────────
  {
    id: '2011-food-prices-peak',
    date: '2011-02-01',
    category: 'economic',
    tier: 'minor',
    headline: 'UN food price index hits all-time record',
    narrative: 'Commodity prices reach a historic high. North Africa and Middle East see food-related unrest. Strong demand from emerging economies is the long-term driver.',
    effects: [
      { target: 'all_crop_prices', multiplier: 1.20 },
    ],
    rampUpDays: 30,
    peakDays: 120,
    rampDownDays: 60,
  },

  // ─── 2012 ────────────────────────────────────────────────────────────────
  {
    id: '2012-us-drought',
    date: '2012-07-01',
    category: 'weather',
    tier: 'major',
    headline: 'US Drought — Worst in 56 Years',
    narrative: 'USDA crop scouts are reporting failures across the corn belt. Fields that looked good in May are withering by July. Corn yield forecasts have been cut 13% in a single report. Soy is not far behind.',
    effects: [
      { target: 'corn_price', multiplier: 1.65 },
      { target: 'soy_price', multiplier: 1.50 },
    ],
    rampUpDays: 21,
    peakDays: 120,
    rampDownDays: 60,
  },

  // ─── 2013 ────────────────────────────────────────────────────────────────
  {
    id: '2013-neonic-ban',
    date: '2013-12-01',
    category: 'regulation',
    tier: 'minor',
    headline: 'Neonicotinoid pesticides partially banned over bee decline',
    narrative: 'Three widely used seed treatments are restricted after studies link them to collapse of bee populations. Pest management strategies will need to change.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'bee_welfare_mandate' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 2014 ────────────────────────────────────────────────────────────────
  {
    id: '2014-russia-food-ban',
    date: '2014-08-06',
    category: 'economic',
    tier: 'major',
    headline: 'Russia Bans EU Food Imports — Dairy and Pork Hit Hard',
    narrative: 'In retaliation for Western sanctions, Russia bans imports of EU beef, pork, dairy, and produce. European markets are suddenly oversupplied. Milk and pork prices tumble as the continent\'s farms lose their largest export market overnight.',
    effects: [
      { target: 'milk_price', multiplier: 0.78 },
      { target: 'pork_price', multiplier: 0.82 },
    ],
    rampUpDays: 7,
    peakDays: 365,
    rampDownDays: 180,
  },

  // ─── 2015 ────────────────────────────────────────────────────────────────
  {
    id: '2015-milk-oversupply',
    date: '2015-04-01',
    category: 'economic',
    tier: 'major',
    headline: 'EU Milk Quotas Abolished — Oversupply Crashes Farmgate Prices',
    narrative: 'Production quotas that held milk prices up for thirty years have been lifted. Farms across Europe ramp up output. By summer, farmgate prices are below the cost of production. The co-op is paying what it paid in 1980.',
    effects: [
      { target: 'milk_price', multiplier: 0.68 },
    ],
    rampUpDays: 60,
    peakDays: 365,
    rampDownDays: 180,
  },
  {
    id: '2015-paris-accord',
    date: '2015-12-12',
    category: 'regulation',
    tier: 'minor',
    headline: 'Paris Climate Accord — agriculture faces carbon scrutiny',
    narrative: 'Nearly 200 countries commit to emissions reductions. Livestock emissions and soil carbon sequestration begin to enter farm policy debates for the first time.',
    effects: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 2018 ────────────────────────────────────────────────────────────────
  {
    id: '2018-europe-drought',
    date: '2018-07-01',
    category: 'weather',
    tier: 'major',
    headline: 'European Heatwave — Grain Harvests Collapse',
    narrative: 'The driest summer in living memory. Yields are down 30 to 40 percent across northern Europe. Farmers with irrigation are thanking their foresight. Those without are watching their margins evaporate in 38-degree heat.',
    effects: [
      { target: 'wheat_price', multiplier: 1.45 },
      { target: 'corn_price', multiplier: 1.40 },
      { target: 'milk_price', multiplier: 0.92 },
    ],
    rampUpDays: 14,
    peakDays: 90,
    rampDownDays: 60,
  },

  // ─── 2019 ────────────────────────────────────────────────────────────────
  {
    id: '2019-african-swine-fever',
    date: '2019-01-01',
    category: 'disease',
    tier: 'major',
    headline: 'African Swine Fever Eliminates Half of China\'s Pig Herd',
    narrative: 'ASF has swept through the world\'s largest pork market. China has lost an estimated 200 million pigs to the disease. Global pork prices are rising fast. If you have pigs, the phone is ringing.',
    effects: [
      { target: 'pork_price', multiplier: 1.75 },
    ],
    rampUpDays: 60,
    peakDays: 540,
    rampDownDays: 180,
  },

  // ─── 2020 ────────────────────────────────────────────────────────────────
  {
    id: '2020-covid-supply-chains',
    date: '2020-03-15',
    category: 'economic',
    tier: 'major',
    headline: 'Pandemic Lockdowns — Food Supply Chains Under Strain',
    narrative: 'Processing plants are closing due to worker illness. Milk is being dumped because restaurants are shut. Grocery shelves fluctuate between empty and overstocked. Your contracts are in limbo. Buyers you counted on are not answering calls.',
    effects: [
      { target: 'milk_price', multiplier: 0.82 },
      { target: 'all_livestock_prices', multiplier: 0.88 },
      { target: 'fuel_cost', multiplier: 0.78 },
    ],
    rampUpDays: 14,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 2021 ────────────────────────────────────────────────────────────────
  {
    id: '2021-fertiliser-crisis',
    date: '2021-09-01',
    category: 'economic',
    tier: 'major',
    headline: 'Fertilizer Prices Double — Input Costs Soar',
    narrative: 'Natural gas shortages have shut down ammonia plants across Europe. Nitrogen fertilizer has nearly doubled since spring. Every bag of urea you ordered last season now looks like a bargain you did not buy enough of.',
    effects: [
      { target: 'fertiliser_cost', multiplier: 2.1 },
      { target: 'fuel_cost', multiplier: 1.35 },
    ],
    rampUpDays: 30,
    peakDays: 240,
    rampDownDays: 120,
  },

  // ─── 2022 ────────────────────────────────────────────────────────────────
  {
    id: '2022-ukraine-war',
    date: '2022-02-24',
    category: 'economic',
    tier: 'major',
    headline: 'War in Ukraine — Global Wheat Supply in Crisis',
    narrative: 'Ukraine and Russia together supply 30% of world wheat exports. The Black Sea grain corridor is closed. Wheat hit $12 a bushel this week, up from $7 in January. Fertilizer from Belarus and Russia is sanctioned. Every input and every output has been re-priced in a single month.',
    effects: [
      { target: 'wheat_price', multiplier: 1.65 },
      { target: 'corn_price', multiplier: 1.45 },
      { target: 'soy_price', multiplier: 1.35 },
      { target: 'fertiliser_cost', multiplier: 1.80 },
      { target: 'fuel_cost', multiplier: 1.55 },
    ],
    rampUpDays: 21,
    peakDays: 180,
    rampDownDays: 120,
  },

  // ─── 2023 ────────────────────────────────────────────────────────────────
  {
    id: '2023-lab-meat-commercial',
    date: '2023-06-21',
    category: 'product',
    tier: 'minor',
    headline: 'Lab-grown meat approved for restaurant sale',
    narrative: 'Cultivated chicken products go on sale commercially for the first time. Market share is tiny but the signal is clear: the definition of farming is being contested.',
    effects: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },
  {
    id: '2023-el-nino',
    date: '2023-07-01',
    category: 'weather',
    tier: 'minor',
    headline: 'El Niño returns — Southern hemisphere crops at risk',
    narrative: 'NOAA declares a moderate-to-strong El Niño. Drier conditions are expected in key southern hemisphere growing regions. Global supply forecasts are revised down.',
    effects: [
      { target: 'wheat_price', multiplier: 1.15 },
      { target: 'corn_price', multiplier: 1.12 },
    ],
    rampUpDays: 60,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 2024 ────────────────────────────────────────────────────────────────
  {
    id: '2024-eu-nature-law',
    date: '2024-06-12',
    category: 'regulation',
    tier: 'minor',
    headline: 'EU Nature Restoration Law passed — farmland habitat targets set',
    narrative: 'New rules require member states to restore degraded ecosystems. Hedgerow obligations and wildflower field margin requirements are tightened across Europe.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'nature_restoration_obligation' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 2025 ────────────────────────────────────────────────────────────────
  {
    id: '2025-gene-editing-approved',
    date: '2025-03-01',
    category: 'genetics',
    tier: 'minor',
    headline: 'Gene-edited crops approved for commercial planting',
    narrative: 'New precision-bred varieties with drought resistance and disease tolerance are cleared for farms. Unlike transgenic GMOs, these do not require GM labelling in most markets.',
    effects: [],
    unlocks: [{ type: 'product', id: 'gene_edited_seeds_t1' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },
  {
    id: '2025-carbon-credits-farm',
    date: '2025-01-01',
    category: 'economic',
    tier: 'minor',
    headline: 'Agricultural carbon credit markets reach mainstream adoption',
    narrative: 'Verified soil carbon sequestration and livestock methane reduction programs begin paying farms directly for emissions reductions. A new income stream emerges from land stewardship.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'carbon_credit_program' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },
];
