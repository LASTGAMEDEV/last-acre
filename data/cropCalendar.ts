import { Season } from '../engine/climate';

// Planting/harvest calendar based on temperate agricultural conditions.

export type SeasonStatus = 'plant' | 'harvest' | 'both' | 'grow' | 'avoid';

export interface CropSeasonInfo {
  cropId: string;
  seasons: Record<Season, SeasonStatus>;
  note: string;
}

export const CROP_CALENDAR: CropSeasonInfo[] = [
  {
    cropId: 'grass',
    seasons: { spring: 'both', summer: 'both', autumn: 'both', winter: 'avoid' },
    note: 'Grows fast in spring and summer. Allows multiple cuts per season.',
  },
  {
    cropId: 'alfalfa',
    seasons: { spring: 'both', summer: 'both', autumn: 'plant', winter: 'avoid' },
    note: 'Forage legume. Multiple cuts per year. Fixes nitrogen in the soil.',
  },
  {
    cropId: 'barley',
    seasons: { spring: 'avoid', summer: 'avoid', autumn: 'plant', winter: 'grow' },
    note: 'Winter cereal. Sown in autumn, harvested at the start of spring. Very frost-resistant.',
  },
  {
    cropId: 'oats',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Spring cereal. Prefers cool, humid climates. Sensitive to heat.',
  },
  {
    cropId: 'wheat',
    seasons: { spring: 'harvest', summer: 'avoid', autumn: 'plant', winter: 'grow' },
    note: 'Winter wheat. Sown in autumn, harvested in spring. Cold improves yield.',
  },
  {
    cropId: 'corn',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Needs heat to germinate. Full spring–autumn cycle.',
  },
  {
    cropId: 'sorghum',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Very drought-resistant. Ideal in arid areas. Summer cycle.',
  },
  {
    cropId: 'rice',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Needs flooded soil and high temperatures. Only viable in spring–summer.',
  },
  {
    cropId: 'potatoes',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Short-cycle root crop. Planted in early spring, harvested before summer.',
  },
  {
    cropId: 'sugarbeet',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Sugar root. Full April–October cycle. Produces sugary juice (litres).',
  },
  {
    cropId: 'soy',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Short-day legume. Sown in spring, harvested in autumn.',
  },
  {
    cropId: 'sugarcane',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'harvest', winter: 'harvest' },
    note: 'Perennial tropical crop. Long cycle. Produces juice/molasses (litres). Needs lots of water.',
  },
  {
    cropId: 'sunflower',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Drought-tolerant. Follows the sun. Harvested in late summer.',
  },
  {
    cropId: 'rapeseed',
    seasons: { spring: 'avoid', summer: 'avoid', autumn: 'plant', winter: 'grow' },
    note: 'Winter rapeseed. Sown in autumn, flowers in spring. High oil yield.',
  },
  {
    cropId: 'canola',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Spring rapeseed variety. Shorter cycle than winter rapeseed.',
  },
  {
    cropId: 'cotton',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Needs long, hot summers. Fiber harvested in autumn.',
  },
  {
    cropId: 'grapes',
    seasons: { spring: 'grow', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Perennial vine. Harvested in autumn. Peaks in chalky or sandy soils.',
  },
  {
    cropId: 'tomatoes',
    seasons: { spring: 'plant', summer: 'both', autumn: 'avoid', winter: 'avoid' },
    note: 'Warm-season vegetable. Plant in spring, harvest through summer.',
  },
  {
    cropId: 'strawberries',
    seasons: { spring: 'both', summer: 'harvest', autumn: 'plant', winter: 'avoid' },
    note: 'Short-season fruit. Spring planting gives summer harvest; autumn planting for next spring.',
  },
  {
    cropId: 'olives',
    seasons: { spring: 'grow', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Mediterranean tree crop. Long growing season, harvested in autumn.',
  },
  {
    cropId: 'almonds',
    seasons: { spring: 'grow', summer: 'grow', autumn: 'harvest', winter: 'avoid' },
    note: 'Tree nut. Flowers in late winter, harvested in early autumn.',
  },
  {
    cropId: 'saffron',
    seasons: { spring: 'avoid', summer: 'plant', autumn: 'harvest', winter: 'avoid' },
    note: 'Rare spice crocus. Planted in late summer, flowers and harvests in autumn. Very high value.',
  },
  {
    cropId: 'vanilla',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'grow', winter: 'avoid' },
    note: 'Tropical orchid vine. Very long cycle. Requires warm, humid conditions year-round.',
  },
  {
    cropId: 'lavender',
    seasons: { spring: 'plant', summer: 'harvest', autumn: 'avoid', winter: 'avoid' },
    note: 'Aromatic herb. Thrives in chalky or sandy soils. Harvested at peak bloom in summer.',
  },
  {
    cropId: 'ginseng',
    seasons: { spring: 'plant', summer: 'grow', autumn: 'grow', winter: 'avoid' },
    note: 'Slow-growing root. Prefers partial shade and loamy or sandy soils. Very long cycle.',
  },
];

export const STATUS_COLORS: Record<SeasonStatus, string> = {
  plant:   '#2e7d32',
  harvest: '#e65100',
  both:    '#00838f',
  grow:    '#1565c0',
  avoid:   '#1a1a2e',
};

export const STATUS_LABELS: Record<SeasonStatus, string> = {
  plant:   'Plant',
  harvest: 'Harvest',
  both:    'Plant/Harvest',
  grow:    'Growing',
  avoid:   'Avoid',
};

export const STATUS_ICONS: Record<SeasonStatus, string> = {
  plant:   '🌱',
  harvest: '🌾',
  both:    '✨',
  grow:    '🌿',
  avoid:   '—',
};
