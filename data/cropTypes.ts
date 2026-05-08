export type CropTier = 'D' | 'C' | 'B' | 'A' | 'S';
export type CropUnit = 'kg' | 'L';
export type PlantingSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CropType {
  id: string;
  name: string;
  tier: CropTier;
  growthDays: number;
  basePrice: number;       // $ per kg or $ per L
  seedCost: number;        // $ per ha
  waterNeed: number;       // 1-5
  fertilizerBonus: number;
  unit: CropUnit;
  baseYield: number;       // kg or L per ha (before modifiers)
  seasons: PlantingSeason[];   // seasons in which this crop can be planted
  peakSeason: PlantingSeason;  // season when market prices are lowest (harvest glut)
  fertilityDrain: number;      // fertility points lost per harvest (0 = none, legumes fix nitrogen)
  phosphorusDrain: number;     // P units drained per harvest (per ha; store multiplies by hectares * 0.1)
  potassiumDrain: number;      // K units drained per harvest
  frostKillTemp: number;      // C below which crop is killed (e.g. -5)
  heatStressTemp: number;     // C above which heat stress starts (e.g. 36)
  droughtTolerance: number;   // 0-1 (0=very sensitive, 1=immune)
  coverCrop?: boolean; // true = no harvest revenue; matures into soil benefits
}

export const CROP_TYPES: CropType[] = [
  // Tier D
  { id: 'grass',        name: 'Grass / Hierba', tier: 'D', growthDays: 7,   basePrice: 0.10, seedCost: 45,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8000,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, phosphorusDrain: 1,  potassiumDrain: 2,  frostKillTemp: -8,  heatStressTemp: 40, droughtTolerance: 0.6 },
  { id: 'alfalfa',      name: 'Alfalfa',         tier: 'D', growthDays: 30,  basePrice: 0.22, seedCost: 180,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 9000,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, phosphorusDrain: 2,  potassiumDrain: 8,  frostKillTemp: -5,  heatStressTemp: 40, droughtTolerance: 0.7 },
  { id: 'barley',       name: 'Barley',           tier: 'D', growthDays: 65,  basePrice: 0.20, seedCost: 95,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3500,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, phosphorusDrain: 4,  potassiumDrain: 4,  frostKillTemp: -6,  heatStressTemp: 32, droughtTolerance: 0.5 },
  { id: 'oats',         name: 'Oats',             tier: 'D', growthDays: 70,  basePrice: 0.17, seedCost: 90,    waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3200,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, phosphorusDrain: 3,  potassiumDrain: 4,  frostKillTemp: -5,  heatStressTemp: 32, droughtTolerance: 0.4 },
  // Tier C
  { id: 'wheat',        name: 'Wheat',            tier: 'C', growthDays: 75,  basePrice: 0.25,  seedCost: 85,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3400,  seasons: ['spring','autumn'],          peakSeason: 'summer',  fertilityDrain: 1, phosphorusDrain: 5,  potassiumDrain: 5,  frostKillTemp: -12, heatStressTemp: 32, droughtTolerance: 0.4 },
  { id: 'corn',         name: 'Corn',             tier: 'C', growthDays: 85,  basePrice: 0.19,  seedCost: 130,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 10000, seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, phosphorusDrain: 7,  potassiumDrain: 8,  frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.3 },
  { id: 'sorghum',      name: 'Sorghum',          tier: 'C', growthDays: 80,  basePrice: 0.18,  seedCost: 75,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 4500,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, phosphorusDrain: 4,  potassiumDrain: 6,  frostKillTemp: -2,  heatStressTemp: 40, droughtTolerance: 0.8 },
  { id: 'rice',         name: 'Rice',             tier: 'C', growthDays: 90,  basePrice: 0.40,  seedCost: 200,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'kg', baseYield: 4500,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, phosphorusDrain: 6,  potassiumDrain: 7,  frostKillTemp: -1,  heatStressTemp: 35, droughtTolerance: 0.1 },
  // Tier B - Root crops & legumes
  { id: 'potatoes',     name: 'Potatoes',         tier: 'B', growthDays: 80,  basePrice: 0.25,  seedCost: 1200, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 28000, seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 2, phosphorusDrain: 6,  potassiumDrain: 12, frostKillTemp: -3,  heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'sugarbeet',    name: 'Sugar Beet',       tier: 'B', growthDays: 100, basePrice: 0.04,  seedCost: 400,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 55000, seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, phosphorusDrain: 5,  potassiumDrain: 10, frostKillTemp: -3,  heatStressTemp: 34, droughtTolerance: 0.5 },
  { id: 'soy',          name: 'Soybean',          tier: 'B', growthDays: 100, basePrice: 0.49,  seedCost: 95,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3000,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 0, phosphorusDrain: 4,  potassiumDrain: 5,  frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'sugarcane',    name: 'Sugar Cane',       tier: 'B', growthDays: 120, basePrice: 0.03,  seedCost: 350,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'L',  baseYield: 70000, seasons: ['spring','summer'],          peakSeason: 'spring',  fertilityDrain: 2, phosphorusDrain: 5,  potassiumDrain: 12, frostKillTemp: -1,  heatStressTemp: 45, droughtTolerance: 0.3 },
  // Tier A - Oil & fibre
  { id: 'sunflower',    name: 'Sunflower',        tier: 'A', growthDays: 95,  basePrice: 0.52,  seedCost: 280,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3800,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, phosphorusDrain: 6,  potassiumDrain: 8,  frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.8 },
  { id: 'rapeseed',     name: 'Rapeseed',         tier: 'A', growthDays: 100, basePrice: 0.53,  seedCost: 320,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3200,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, phosphorusDrain: 7,  potassiumDrain: 7,  frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'canola',       name: 'Canola',           tier: 'A', growthDays: 95,  basePrice: 0.58,  seedCost: 340,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 3000,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, phosphorusDrain: 7,  potassiumDrain: 7,  frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'cotton',       name: 'Cotton',           tier: 'A', growthDays: 110, basePrice: 1.80,  seedCost: 550,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 1800,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, phosphorusDrain: 6,  potassiumDrain: 8,  frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.5 },
  // Tier B - Fruits & vegetables
  { id: 'grapes',       name: 'Grapes',           tier: 'B', growthDays: 120, basePrice: 0.55,  seedCost: 1800, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8000,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, phosphorusDrain: 3,  potassiumDrain: 5,  frostKillTemp: -3,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'tomatoes',     name: 'Tomatoes',         tier: 'B', growthDays: 60,  basePrice: 0.28,  seedCost: 900,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 55000, seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 2, phosphorusDrain: 5,  potassiumDrain: 7,  frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'strawberries', name: 'Strawberries',     tier: 'B', growthDays: 50,  basePrice: 2.20,  seedCost: 2200, waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8000,  seasons: ['spring'],                   peakSeason: 'spring',  fertilityDrain: 2, phosphorusDrain: 4,  potassiumDrain: 6,  frostKillTemp: -2,  heatStressTemp: 32, droughtTolerance: 0.3 },
  // Tier A - Orchard
  { id: 'olives',       name: 'Olives',           tier: 'A', growthDays: 150, basePrice: 0.65,  seedCost: 900,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 5000,  seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 1, phosphorusDrain: 2,  potassiumDrain: 4,  frostKillTemp: -8,  heatStressTemp: 42, droughtTolerance: 0.7 },
  { id: 'almonds',      name: 'Almonds',          tier: 'A', growthDays: 130, basePrice: 5.50,  seedCost: 6500, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 1400,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, phosphorusDrain: 3,  potassiumDrain: 5,  frostKillTemp: -3,  heatStressTemp: 42, droughtTolerance: 0.6 },
  // Tier S - Premium specialty
  { id: 'saffron',      name: 'Saffron',          tier: 'S', growthDays: 180, basePrice: 3500,  seedCost: 9000,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 8,    seasons: ['autumn'],                   peakSeason: 'autumn',  fertilityDrain: 1, phosphorusDrain: 2,  potassiumDrain: 3,  frostKillTemp: -8,  heatStressTemp: 35, droughtTolerance: 0.5 },
  { id: 'vanilla',      name: 'Vanilla',          tier: 'S', growthDays: 200, basePrice: 120,   seedCost: 12000, waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, phosphorusDrain: 2,  potassiumDrain: 3,  frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'lavender',     name: 'Lavender',         tier: 'S', growthDays: 150, basePrice: 80,    seedCost: 4500,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 800,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, phosphorusDrain: 2,  potassiumDrain: 3,  frostKillTemp: -8,  heatStressTemp: 38, droughtTolerance: 0.7 },
  { id: 'ginseng',      name: 'Ginseng',          tier: 'S', growthDays: 240, basePrice: 350,   seedCost: 15000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring'],                   peakSeason: 'autumn',  fertilityDrain: 1, phosphorusDrain: 2,  potassiumDrain: 4,  frostKillTemp: -5,  heatStressTemp: 30, droughtTolerance: 0.4 },
  // Cover Crops (no harvest revenue)
  { id: 'rye',       name: 'Winter Rye',    tier: 'D', growthDays: 60, basePrice: 0, seedCost: 40,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['autumn','winter'],          peakSeason: 'winter', fertilityDrain: 0, phosphorusDrain: 0, potassiumDrain: 0, frostKillTemp: -20, heatStressTemp: 30, droughtTolerance: 0.8, coverCrop: true },
  { id: 'clover',    name: 'Red Clover',    tier: 'D', growthDays: 45, basePrice: 0, seedCost: 35,  waterNeed: 2, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer'],           peakSeason: 'summer', fertilityDrain: 0, phosphorusDrain: 0, potassiumDrain: 0, frostKillTemp: -10, heatStressTemp: 32, droughtTolerance: 0.5, coverCrop: true },
  { id: 'mustard',   name: 'White Mustard', tier: 'D', growthDays: 40, basePrice: 0, seedCost: 30,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer','autumn'],  peakSeason: 'summer', fertilityDrain: 0, phosphorusDrain: 0, potassiumDrain: 0, frostKillTemp: -5,  heatStressTemp: 35, droughtTolerance: 0.6, coverCrop: true },
  { id: 'buckwheat', name: 'Buckwheat',     tier: 'D', growthDays: 35, basePrice: 0, seedCost: 25,  waterNeed: 1, fertilizerBonus: 1.0, unit: 'kg', baseYield: 0, seasons: ['spring','summer'],           peakSeason: 'summer', fertilityDrain: 0, phosphorusDrain: 0, potassiumDrain: 0, frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.7, coverCrop: true },
];
