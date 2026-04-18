// engine/cooperativeData.ts
import type { CoopId, CoopEquipmentItem, CoopTerms, CoopState } from './cooperativeTypes';

export const COOP_CROPS: Record<CoopId, string[]> = {
  grain: [
    'grass', 'alfalfa', 'barley', 'oats', 'wheat', 'corn', 'sorghum',
    'rice', 'soy', 'sunflower', 'rapeseed', 'canola', 'cotton',
    'sugarbeet', 'sugarcane',
  ],
  horticulture: [
    'potatoes', 'grapes', 'tomatoes', 'strawberries', 'olives',
    'almonds', 'saffron', 'vanilla', 'lavender', 'ginseng',
  ],
  livestock: [],
};

export const COOP_ANIMALS: Record<CoopId, string[]> = {
  grain: [],
  horticulture: [],
  livestock: [
    'gallina', 'vaca', 'oveja', 'cerdo', 'conejo', 'cabra',
    'pato', 'abeja', 'alpaca', 'pavo', 'codorniz', 'bufalo',
  ],
};

export const INITIAL_SHARE_PRICES: Record<CoopId, number> = {
  grain: 80,
  horticulture: 120,
  livestock: 100,
};

export const COOP_NAMES: Record<CoopId, string> = {
  grain: 'Grain & Arable Co-op',
  horticulture: 'Horticulture Co-op',
  livestock: 'Livestock Co-op',
};

export const BASE_TERMS: CoopTerms = {
  deliveryPct: 50,
  floorPct: 80,
  annualFeePerShare: 4,
  dividendPct: 30,
};

const GRAIN_EQUIPMENT: CoopEquipmentItem[] = [
  { id: 'combine_harvester', label: 'Combine Harvester', usageFeePerDay: 120, unlocksAtHealth: 0, bookings: [] },
  { id: 'grain_dryer', label: 'Grain Dryer', usageFeePerDay: 60, unlocksAtHealth: 0, bookings: [] },
  { id: 'sprayer', label: 'Sprayer', usageFeePerDay: 40, unlocksAtHealth: 0, bookings: [] },
  { id: 'seed_drill', label: 'Seed Drill', usageFeePerDay: 80, unlocksAtHealth: 60, bookings: [] },
  { id: 'fertilizer_spreader', label: 'Fertilizer Spreader', usageFeePerDay: 50, unlocksAtHealth: 60, bookings: [] },
  { id: 'baler', label: 'Baler', usageFeePerDay: 70, unlocksAtHealth: 60, bookings: [] },
  { id: 'grain_trailer', label: 'Grain Trailer', usageFeePerDay: 35, unlocksAtHealth: 80, bookings: [] },
  { id: 'plough', label: 'Plough', usageFeePerDay: 90, unlocksAtHealth: 80, bookings: [] },
  { id: 'heavy_tractor', label: 'Heavy Tractor', usageFeePerDay: 150, unlocksAtHealth: 80, bookings: [] },
  { id: 'grain_auger', label: 'Grain Auger', usageFeePerDay: 30, unlocksAtHealth: 80, bookings: [] },
];

const HORTICULTURE_EQUIPMENT: CoopEquipmentItem[] = [
  { id: 'spray_rig', label: 'Spray Rig', usageFeePerDay: 50, unlocksAtHealth: 0, bookings: [] },
  { id: 'refrigerated_truck', label: 'Refrigerated Truck', usageFeePerDay: 100, unlocksAtHealth: 0, bookings: [] },
  { id: 'sorting_machine', label: 'Sorting/Grading Machine', usageFeePerDay: 60, unlocksAtHealth: 0, bookings: [] },
  { id: 'potato_harvester', label: 'Potato Harvester', usageFeePerDay: 110, unlocksAtHealth: 60, bookings: [] },
  { id: 'grape_harvester', label: 'Grape Harvester', usageFeePerDay: 120, unlocksAtHealth: 60, bookings: [] },
  { id: 'irrigation_rig', label: 'Irrigation Rig', usageFeePerDay: 45, unlocksAtHealth: 60, bookings: [] },
  { id: 'transplanting_machine', label: 'Transplanting Machine', usageFeePerDay: 70, unlocksAtHealth: 80, bookings: [] },
  { id: 'soil_fumigation', label: 'Soil Fumigation Unit', usageFeePerDay: 80, unlocksAtHealth: 80, bookings: [] },
  { id: 'cold_storage', label: 'Cold Storage Bay', usageFeePerDay: 40, unlocksAtHealth: 80, bookings: [] },
  { id: 'orchard_shaker', label: 'Orchard Shaker', usageFeePerDay: 90, unlocksAtHealth: 80, bookings: [] },
];

const LIVESTOCK_EQUIPMENT: CoopEquipmentItem[] = [
  { id: 'mobile_vet', label: 'Mobile Vet Unit', usageFeePerDay: 80, unlocksAtHealth: 0, bookings: [] },
  { id: 'livestock_truck', label: 'Livestock Truck', usageFeePerDay: 90, unlocksAtHealth: 0, bookings: [] },
  { id: 'shearing_machine', label: 'Shearing Machine', usageFeePerDay: 50, unlocksAtHealth: 0, bookings: [] },
  { id: 'feed_mixer', label: 'Feed Mixer', usageFeePerDay: 60, unlocksAtHealth: 60, bookings: [] },
  { id: 'manure_spreader', label: 'Manure Spreader', usageFeePerDay: 40, unlocksAtHealth: 60, bookings: [] },
  { id: 'ai_equipment', label: 'AI Equipment', usageFeePerDay: 100, unlocksAtHealth: 60, bookings: [] },
  { id: 'cattle_crush', label: 'Cattle Weighing Crush', usageFeePerDay: 70, unlocksAtHealth: 80, bookings: [] },
  { id: 'egg_grader', label: 'Egg Grading Machine', usageFeePerDay: 45, unlocksAtHealth: 80, bookings: [] },
  { id: 'mobile_milking', label: 'Mobile Milking Unit', usageFeePerDay: 110, unlocksAtHealth: 80, bookings: [] },
  { id: 'portable_fencing', label: 'Portable Fencing Kit', usageFeePerDay: 30, unlocksAtHealth: 80, bookings: [] },
];

const COOP_EQUIPMENT: Record<CoopId, CoopEquipmentItem[]> = {
  grain: GRAIN_EQUIPMENT,
  horticulture: HORTICULTURE_EQUIPMENT,
  livestock: LIVESTOCK_EQUIPMENT,
};

export function makeInitialCoopState(coopId: CoopId): CoopState {
  return {
    health: 70,
    memberCount: 24,
    terms: { ...BASE_TERMS },
    equipment: COOP_EQUIPMENT[coopId].map(e => ({ ...e, bookings: [] })),
    poolPrices: {},
    pendingAGM: null,
    dissolvedUntilYear: null,
    consecutiveLowHealthSeasons: 0,
  };
}

export function getCoopForCrop(cropId: string): CoopId | null {
  for (const [coopId, crops] of Object.entries(COOP_CROPS) as [CoopId, string[]][]) {
    if (crops.includes(cropId)) return coopId;
  }
  return null;
}

export function getCoopForAnimal(animalId: string): CoopId | null {
  for (const [coopId, animals] of Object.entries(COOP_ANIMALS) as [CoopId, string[]][]) {
    if (animals.includes(animalId)) return coopId;
  }
  return null;
}
