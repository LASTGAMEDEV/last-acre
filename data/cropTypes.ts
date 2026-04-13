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
  waterNeed: number;       // 1–5
  fertilizerBonus: number;
  unit: CropUnit;
  baseYield: number;       // kg or L per ha (before modifiers)
  seasons: PlantingSeason[];   // seasons in which this crop can be planted
  peakSeason: PlantingSeason;  // season when market prices are lowest (harvest glut)
  fertilityDrain: number;      // fertility points lost per harvest (0 = none, legumes fix nitrogen)
  frostKillTemp: number;      // °C below which crop is killed (e.g. -5)
  heatStressTemp: number;     // °C above which heat stress starts (e.g. 36)
  droughtTolerance: number;   // 0–1 (0=very sensitive, 1=immune)
}

export const CROP_TYPES: CropType[] = [
  // Tier D
  { id: 'grass',        name: 'Grass / Hierba', tier: 'D', growthDays: 7,   basePrice: 0.10, seedCost: 60,   waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 350,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, frostKillTemp: -8,  heatStressTemp: 40, droughtTolerance: 0.6 },
  { id: 'alfalfa',      name: 'Alfalfa',         tier: 'D', growthDays: 30,  basePrice: 6,   seedCost: 90,   waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring','summer','autumn'], peakSeason: 'summer',  fertilityDrain: 0, frostKillTemp: -5,  heatStressTemp: 40, droughtTolerance: 0.7 },
  { id: 'barley',       name: 'Barley',           tier: 'D', growthDays: 65,  basePrice: 9,   seedCost: 140,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -6,  heatStressTemp: 32, droughtTolerance: 0.5 },
  { id: 'oats',         name: 'Oats',             tier: 'D', growthDays: 70,  basePrice: 9,   seedCost: 140,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 480,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -5,  heatStressTemp: 32, droughtTolerance: 0.4 },
  // Tier C
  { id: 'wheat',        name: 'Wheat',            tier: 'C', growthDays: 75,  basePrice: 16,  seedCost: 210,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 600,  seasons: ['spring','autumn'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -12, heatStressTemp: 32, droughtTolerance: 0.4 },
  { id: 'corn',         name: 'Corn',             tier: 'C', growthDays: 85,  basePrice: 15,  seedCost: 200,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 700,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.3 },
  { id: 'sorghum',      name: 'Sorghum',          tier: 'C', growthDays: 80,  basePrice: 14,  seedCost: 180,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 640,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -2,  heatStressTemp: 40, droughtTolerance: 0.8 },
  { id: 'rice',         name: 'Rice',             tier: 'C', growthDays: 90,  basePrice: 18,  seedCost: 250,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'kg', baseYield: 560,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 35, droughtTolerance: 0.1 },
  // Tier B — Root crops & legumes
  { id: 'potatoes',     name: 'Potatoes',         tier: 'B', growthDays: 80,  basePrice: 22,  seedCost: 580,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 720,  seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -3,  heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'sugarbeet',    name: 'Sugar Beet',       tier: 'B', growthDays: 100, basePrice: 26,  seedCost: 520,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'L',  baseYield: 700,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -3,  heatStressTemp: 34, droughtTolerance: 0.5 },
  { id: 'soy',          name: 'Soybean',          tier: 'B', growthDays: 100, basePrice: 38,  seedCost: 570,  waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 480,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 0, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'sugarcane',    name: 'Sugar Cane',       tier: 'B', growthDays: 120, basePrice: 26,  seedCost: 480,  waterNeed: 5, fertilizerBonus: 1.3, unit: 'L',  baseYield: 800,  seasons: ['spring','summer'],          peakSeason: 'spring',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 45, droughtTolerance: 0.3 },
  // Tier A — Oil & fibre
  { id: 'sunflower',    name: 'Sunflower',        tier: 'A', growthDays: 95,  basePrice: 65,  seedCost: 1150, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 380,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -2,  heatStressTemp: 38, droughtTolerance: 0.8 },
  { id: 'rapeseed',     name: 'Rapeseed',         tier: 'A', growthDays: 100, basePrice: 68,  seedCost: 1200, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 380,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'canola',       name: 'Canola',           tier: 'A', growthDays: 95,  basePrice: 70,  seedCost: 1280, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 370,  seasons: ['spring','autumn'],          peakSeason: 'spring',  fertilityDrain: 1, frostKillTemp: -10, heatStressTemp: 30, droughtTolerance: 0.4 },
  { id: 'cotton',       name: 'Cotton',           tier: 'A', growthDays: 110, basePrice: 85,  seedCost: 1650, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 330,  seasons: ['summer'],                   peakSeason: 'autumn',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 40, droughtTolerance: 0.5 },
  // Tier B — Fruits & vegetables
  { id: 'grapes',       name: 'Grapes',           tier: 'B', growthDays: 120, basePrice: 45,  seedCost: 800,  waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 400,  seasons: ['spring','summer'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -3,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'tomatoes',     name: 'Tomatoes',         tier: 'B', growthDays: 60,  basePrice: 30,  seedCost: 450,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 650,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 2, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.4 },
  { id: 'strawberries', name: 'Strawberries',     tier: 'B', growthDays: 50,  basePrice: 40,  seedCost: 600,  waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 500,  seasons: ['spring'],                   peakSeason: 'spring',  fertilityDrain: 2, frostKillTemp: -2,  heatStressTemp: 32, droughtTolerance: 0.3 },
  // Tier A — Orchard
  { id: 'olives',       name: 'Olives',           tier: 'A', growthDays: 150, basePrice: 80,  seedCost: 1800, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 280,  seasons: ['spring','autumn'],          peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 42, droughtTolerance: 0.7 },
  { id: 'almonds',      name: 'Almonds',          tier: 'A', growthDays: 130, basePrice: 90,  seedCost: 2200, waterNeed: 2, fertilizerBonus: 1.3, unit: 'kg', baseYield: 320,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -3,  heatStressTemp: 42, droughtTolerance: 0.6 },
  // Tier S — Premium specialty
  { id: 'saffron',      name: 'Saffron',          tier: 'S', growthDays: 180, basePrice: 500, seedCost: 6000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 140,  seasons: ['autumn'],                   peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 35, droughtTolerance: 0.5 },
  { id: 'vanilla',      name: 'Vanilla',          tier: 'S', growthDays: 200, basePrice: 420, seedCost: 7000, waterNeed: 4, fertilizerBonus: 1.3, unit: 'kg', baseYield: 175,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -1,  heatStressTemp: 38, droughtTolerance: 0.5 },
  { id: 'lavender',     name: 'Lavender',         tier: 'S', growthDays: 150, basePrice: 220, seedCost: 5000, waterNeed: 2, fertilizerBonus: 1.3, unit: 'L',  baseYield: 280,  seasons: ['spring','summer'],          peakSeason: 'summer',  fertilityDrain: 1, frostKillTemp: -8,  heatStressTemp: 38, droughtTolerance: 0.7 },
  { id: 'ginseng',      name: 'Ginseng',          tier: 'S', growthDays: 240, basePrice: 380, seedCost: 9000, waterNeed: 3, fertilizerBonus: 1.3, unit: 'kg', baseYield: 240,  seasons: ['spring'],                   peakSeason: 'autumn',  fertilityDrain: 1, frostKillTemp: -5,  heatStressTemp: 30, droughtTolerance: 0.4 },
];
