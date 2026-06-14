import type { PlantingSeason } from './cropTypes';

export interface VolatilityProfile {
  dailyVolatility: number;    // % std dev per day (e.g. 0.008 = 0.8%)
  meanReversionRate: number;  // 0–1, how fast price pulls back to baseline
  trendStrength: number;      // 0–1, allows multi-month drift
}

export interface CommodityMarketDepth {
  commodityId: string;
  depthKg: number;
  npcDailyProductionKg: number;
}

export interface CommodityCorrelation {
  source: string;
  target: string;
  lag: number;    // days
  factor: number; // 0–1
}

export interface CommodityCycle {
  periodDays: number;
  amplitude: number;
}

// Real-world global USD prices (FAO/CME/USDA sources)
export const COMMODITY_BASELINES: Record<string, number> = {
  // Crops ($/kg or $/L)
  grass: 0.10, alfalfa: 0.22, barley: 0.20, oats: 0.17,
  wheat: 0.25, corn: 0.19, sorghum: 0.18, rice: 0.40,
  potatoes: 0.25, sugarbeet: 0.04, soy: 0.49, sugarcane: 0.03,
  sunflower: 0.52, rapeseed: 0.53, canola: 0.58, cotton: 1.80,
  grapes: 0.55, tomatoes: 0.28, strawberries: 2.20, olives: 0.65,
  almonds: 5.50, saffron: 3500, vanilla: 120, lavender: 80, ginseng: 350,
  // Animal products
  eggs: 0.18, milk: 0.45, honey: 8.50, wool: 3.20, meat: 4.50, cream: 2.80,
  // Processed products
  harina_trigo: 0.55, polenta: 0.60, malta: 0.65, copos_avena: 0.70,
  harina_arroz: 0.75, aceite_girasol: 1.80, aceite_colza: 1.90, aceite_canola: 1.95,
  aceite_soja: 1.40, queso: 12.00, mantequilla: 8.50, pasta_huevo: 3.50,
  azucar: 0.55, etanol: 0.65, fibra_algodon: 2.80, tejido_lana: 8.00,
  embutidos: 9.50, vino: 5.00, aceite_oliva: 7.50, mermelada: 4.50,
  almendras_tostadas: 9.00, tomate_triturado: 1.20,
};

const DEFAULT_PROFILE: VolatilityProfile = {
  dailyVolatility: 0.006, meanReversionRate: 0.03, trendStrength: 0.20,
};

export const VOLATILITY_PROFILES: Record<string, VolatilityProfile> = {
  milk:    { dailyVolatility: 0.003, meanReversionRate: 0.05, trendStrength: 0.10 },
  wheat:   { dailyVolatility: 0.008, meanReversionRate: 0.03, trendStrength: 0.30 },
  corn:    { dailyVolatility: 0.009, meanReversionRate: 0.03, trendStrength: 0.30 },
  cotton:  { dailyVolatility: 0.012, meanReversionRate: 0.02, trendStrength: 0.40 },
  saffron: { dailyVolatility: 0.015, meanReversionRate: 0.01, trendStrength: 0.50 },
  vanilla: { dailyVolatility: 0.018, meanReversionRate: 0.01, trendStrength: 0.60 },
  honey:   { dailyVolatility: 0.007, meanReversionRate: 0.04, trendStrength: 0.20 },
  eggs:    { dailyVolatility: 0.005, meanReversionRate: 0.04, trendStrength: 0.15 },
  vino:    { dailyVolatility: 0.010, meanReversionRate: 0.02, trendStrength: 0.35 },
};

export function getVolatilityProfile(id: string): VolatilityProfile {
  return VOLATILITY_PROFILES[id] ?? DEFAULT_PROFILE;
}

// Fraction of baseline price that swings peak→trough due to season
export const SEASONAL_AMPLITUDES: Record<string, number> = {
  // Grains — moderate swing; stored in silos, so tradeoff is real
  wheat: 0.18, barley: 0.16, oats: 0.16, corn: 0.20, rice: 0.18,
  sorghum: 0.14, soy: 0.18, spelt: 0.16,
  // Roots & vegetables — perishable; quick-sell pressure is high
  potatoes: 0.22, sugarbeet: 0.14,
  // Fruits — very perishable; low storage benefit unless processed
  strawberries: 0.35, grapes: 0.25, tomatoes: 0.28,
  // Oilseeds — can store, meaningful swing
  sunflower: 0.20, rapeseed: 0.18, canola: 0.18,
  // Premium specialty — less seasonal but real demand cycles
  saffron: 0.12, lavender: 0.22, almonds: 0.20, olives: 0.24,
  cotton: 0.15, hemp: 0.15,
  // Animal products — small swings but real
  milk: 0.05, eggs: 0.08, wool: 0.20, honey: 0.15,
};

// Season when market prices are LOWEST (harvest glut) — mirrors cropTypes.ts peakSeason
export const SEASONAL_PEAK_SEASONS: Record<string, PlantingSeason> = {
  wheat: 'summer', barley: 'summer', oats: 'autumn', corn: 'autumn',
  rice: 'autumn', sorghum: 'autumn', soy: 'autumn', spelt: 'summer',
  potatoes: 'autumn', sugarbeet: 'autumn',
  strawberries: 'spring', grapes: 'autumn', tomatoes: 'summer',
  sunflower: 'autumn', rapeseed: 'spring', canola: 'spring',
  saffron: 'autumn', lavender: 'summer', almonds: 'autumn', olives: 'autumn',
  cotton: 'summer', hemp: 'autumn',
  milk: 'summer', eggs: 'spring', wool: 'spring', honey: 'summer',
};

export const MARKET_DEPTHS: CommodityMarketDepth[] = [
  { commodityId: 'wheat',       depthKg: 150_000, npcDailyProductionKg: 8_000 },
  { commodityId: 'corn',        depthKg: 200_000, npcDailyProductionKg: 10_000 },
  { commodityId: 'soy',         depthKg: 120_000, npcDailyProductionKg: 5_000 },
  { commodityId: 'rice',        depthKg: 100_000, npcDailyProductionKg: 4_000 },
  { commodityId: 'barley',      depthKg: 80_000,  npcDailyProductionKg: 3_000 },
  { commodityId: 'potatoes',    depthKg: 180_000, npcDailyProductionKg: 7_000 },
  { commodityId: 'tomatoes',    depthKg: 200_000, npcDailyProductionKg: 9_000 },
  { commodityId: 'strawberries',depthKg: 40_000,  npcDailyProductionKg: 1_500 },
  { commodityId: 'saffron',     depthKg: 50,      npcDailyProductionKg: 2 },
  { commodityId: 'honey',       depthKg: 2_000,   npcDailyProductionKg: 80 },
  { commodityId: 'milk',        depthKg: 50_000,  npcDailyProductionKg: 3_000 },
  { commodityId: 'eggs',        depthKg: 100_000, npcDailyProductionKg: 5_000 },
  { commodityId: 'meat',        depthKg: 30_000,  npcDailyProductionKg: 1_200 },
  { commodityId: 'wool',        depthKg: 5_000,   npcDailyProductionKg: 200 },
];

export const CORRELATIONS: CommodityCorrelation[] = [
  { source: 'corn',      target: 'meat',           lag: 15, factor: 0.30 },
  { source: 'corn',      target: 'eggs',           lag: 10, factor: 0.20 },
  { source: 'corn',      target: 'milk',           lag: 10, factor: 0.15 },
  { source: 'barley',    target: 'meat',           lag: 15, factor: 0.20 },
  { source: 'wheat',     target: 'harina_trigo',   lag: 3,  factor: 0.80 },
  { source: 'grapes',    target: 'vino',           lag: 30, factor: 0.60 },
  { source: 'sunflower', target: 'aceite_girasol', lag: 5,  factor: 0.75 },
  { source: 'milk',      target: 'queso',          lag: 7,  factor: 0.65 },
  { source: 'milk',      target: 'mantequilla',    lag: 7,  factor: 0.70 },
];

export const COMMODITY_CYCLES: Record<string, CommodityCycle> = {
  pig:    { periodDays: 4 * 365, amplitude: 0.35 },
  cattle: { periodDays: 7 * 365, amplitude: 0.45 },
};
