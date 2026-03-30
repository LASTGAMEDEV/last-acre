export interface NewsEventTemplate {
  id: string;
  headline: string;
  cropId: string | null; // null = all crops affected
  modifier: number;      // 1.3 = +30%, 0.7 = -30%
  durationDays: number;
}

export const NEWS_TEMPLATES: NewsEventTemplate[] = [
  // Bullish
  { id: 'n01', headline: '📈 Record wheat exports drive up prices',                    cropId: 'wheat',     modifier: 1.30, durationDays: 14 },
  { id: 'n02', headline: '⛽ Biofuel demand boosts sunflower prices',                  cropId: 'sunflower', modifier: 1.35, durationDays: 10 },
  { id: 'n03', headline: '🌍 Global soybean shortage due to South American drought',   cropId: 'soy',       modifier: 1.40, durationDays: 12 },
  { id: 'n04', headline: '🍺 Record brewing season lifts barley prices',               cropId: 'barley',    modifier: 1.25, durationDays: 8  },
  { id: 'n05', headline: '🧴 Health food boom raises canola prices',                   cropId: 'canola',    modifier: 1.22, durationDays: 14 },
  { id: 'n06', headline: '🍚 Rice supply crisis in Asia',                              cropId: 'rice',      modifier: 1.38, durationDays: 10 },
  { id: 'n07', headline: '🧶 High textile demand drives up cotton prices',             cropId: 'cotton',    modifier: 1.32, durationDays: 12 },
  { id: 'n08', headline: '🌿 Vegan diet surge: oats hit record prices',               cropId: 'oats',      modifier: 1.20, durationDays: 10 },
  { id: 'n09', headline: '💸 General inflation lifts all agricultural prices',        cropId: null,        modifier: 1.12, durationDays: 20 },
  // Bearish
  { id: 'n10', headline: '📉 Record US harvest tanks corn prices',                    cropId: 'corn',      modifier: 0.74, durationDays: 10 },
  { id: 'n11', headline: '🚫 India bans rice exports',                                cropId: 'rice',      modifier: 0.68, durationDays: 12 },
  { id: 'n12', headline: '❄️ Alert: late frosts reduce crop demand',                  cropId: null,        modifier: 0.88, durationDays: 7  },
  { id: 'n13', headline: '🌧️ Flooding hits regional grain markets',                   cropId: null,        modifier: 0.91, durationDays: 6  },
  { id: 'n14', headline: '📦 European overproduction tanks potato prices',            cropId: 'potatoes',  modifier: 0.72, durationDays: 10 },
  { id: 'n15', headline: '🏭 Sugar beet refinery shut down by strike',               cropId: 'sugarbeet', modifier: 0.78, durationDays: 8  },
  { id: 'n16', headline: '🌊 Record sorghum harvest: supply glut',                   cropId: 'sorghum',   modifier: 0.76, durationDays: 9  },
  { id: 'n17', headline: '🤝 New trade deal stabilizes rapeseed prices',             cropId: 'rapeseed',  modifier: 0.85, durationDays: 12 },
  { id: 'n18', headline: '🌾 European wheat surplus pressures markets',              cropId: 'wheat',     modifier: 0.80, durationDays: 9  },
  { id: 'n19', headline: '🐛 Worm infestation damages regional corn crops',          cropId: 'corn',      modifier: 1.28, durationDays: 7  },
  { id: 'n20', headline: '☀️ Perfect summer floods sunflower supply',                cropId: 'sunflower', modifier: 0.82, durationDays: 8  },
];
