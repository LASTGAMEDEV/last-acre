import { MarketPrice } from './market';
import { getSeason, WeatherDay } from './climate';
import {
  COMMODITY_BASELINES,
  COMMODITY_CYCLES,
  CORRELATIONS,
  MARKET_DEPTHS,
  SEASONAL_AMPLITUDES,
  SEASONAL_PEAK_SEASONS,
  VolatilityProfile,
  getVolatilityProfile,
} from '../data/prices';
import { getRegionMultiplier } from '../data/priceRegions';

export interface PriceShock {
  commodityId: string | null; // null = all commodities
  magnitude: number;          // e.g. +0.25 = +25%, -0.18 = -18%
  durationDays: number;
  decayRate?: number;         // fraction decayed per day (unused — we use remainingDays/durationDays)
}

export interface ActiveShock extends PriceShock {
  remainingDays: number;
}

export interface PriceTickInput {
  prices: MarketPrice[];
  momentum: Record<string, number>;
  priceHistory15d: Record<string, number[]>;
  activeShocks: ActiveShock[];
  day: number;
  forecast: WeatherDay[];
  npcProductionMultipliers: Record<string, number>;
}

export interface PriceTickOutput {
  prices: MarketPrice[];
  momentum: Record<string, number>;
  priceHistory15d: Record<string, number[]>;
  activeShocks: ActiveShock[];
}

// Box-Muller Gaussian random
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Layer 2: Mean-reverting random walk with trend
function applyVolatility(
  currentPrice: number,
  baseline: number,
  profile: VolatilityProfile,
  trend: number,
): { newPrice: number; newTrend: number } {
  const shock = gaussianRandom(0, profile.dailyVolatility);
  const reversion = profile.meanReversionRate * (baseline - currentPrice) / baseline;
  const trendDrift = trend * profile.trendStrength;
  const newTrend = trend * 0.99 + gaussianRandom(0, 0.001);
  const newPrice = currentPrice * (1 + shock + reversion + trendDrift);
  return { newPrice: Math.max(baseline * 0.2, newPrice), newTrend };
}

// Layer 3: Seasonal curve — price lowest during peakSeason (harvest glut)
function seasonalMultiplier(commodityId: string, day: number): number {
  const amplitude = SEASONAL_AMPLITUDES[commodityId];
  if (!amplitude) return 1.0;
  const peakSeason = SEASONAL_PEAK_SEASONS[commodityId];
  if (!peakSeason) return 1.0;
  const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
  const season = getSeason(day);
  const peakIdx = seasonOrder.indexOf(peakSeason);
  const currentIdx = seasonOrder.indexOf(season);
  const distance = Math.min(Math.abs(currentIdx - peakIdx), 4 - Math.abs(currentIdx - peakIdx));
  // distance 0 = glut (lowest price), distance 2 = peak price
  return 1 + amplitude * (distance / 2 - 0.5);
}

// Layer 4: Decaying event shocks
function shockModifier(commodityId: string, activeShocks: ActiveShock[]): number {
  return activeShocks.reduce((mult, shock) => {
    if (shock.remainingDays <= 0) return mult;
    if (shock.commodityId !== null && shock.commodityId !== commodityId) return mult;
    const strength = shock.durationDays > 0 ? shock.remainingDays / shock.durationDays : 1.0;
    return mult * (1 + shock.magnitude * strength);
  }, 1.0);
}

// Layer 5: NPC supply pressure
function supplyPressureAdj(commodityId: string, npcMultiplier: number): number {
  const depth = MARKET_DEPTHS.find(d => d.commodityId === commodityId);
  if (!depth) return 0;
  const npcKg = depth.npcDailyProductionKg * npcMultiplier;
  return Math.max(-0.15, -0.10 * (npcKg / depth.depthKg));
}

// Module-level set of crops sensitive to forecast events
const FORECAST_SENSITIVE_CROPS = new Set(['wheat', 'corn', 'barley', 'oats', 'rice', 'potatoes', 'soy']);

// Addition #5: Forecast pre-movement — grain prices creep up ahead of drought/frost
function forecastPreMovement(commodityId: string, forecast: WeatherDay[]): number {
  if (!FORECAST_SENSITIVE_CROPS.has(commodityId)) return 0;
  for (let i = 5; i <= 10; i++) {
    const w = forecast[i];
    if (!w) continue;
    if (w.event === 'drought' || w.event === 'frost') {
      return 0.005 * (11 - i);
    }
  }
  return 0;
}

// Addition #1: Cross-commodity correlations via 15-day lag buffer
function applyCorrelations(
  prices: MarketPrice[],
  history: Record<string, number[]>,
): MarketPrice[] {
  const adjustments: Record<string, number> = {};
  for (const corr of CORRELATIONS) {
    const sourceHistory = history[corr.source];
    if (!sourceHistory || sourceHistory.length < corr.lag) continue;
    const laggedPrice = sourceHistory[sourceHistory.length - corr.lag];
    const sourceBaseline = COMMODITY_BASELINES[corr.source] ?? 1;
    const deviation = (laggedPrice - sourceBaseline) / sourceBaseline;
    adjustments[corr.target] = (adjustments[corr.target] ?? 0) + deviation * corr.factor;
  }
  return prices.map(p => {
    const adj = adjustments[p.cropId];
    if (!adj) return p;
    // Apply correlation as a gentle nudge (capped at ±10% to avoid runaway feedback)
    const cappedAdj = Math.max(-0.10, Math.min(0.10, adj));
    return { ...p, price: Math.max(p.basePrice * 0.2, p.price * (1 + cappedAdj)) };
  });
}

// Addition #2: Multi-year commodity cycles (hog/cattle)
function getCycleMultiplier(commodityId: string, day: number): number {
  if (commodityId === 'meat') {
    const pig    = 1 + COMMODITY_CYCLES.pig.amplitude    * Math.sin(2 * Math.PI * day / COMMODITY_CYCLES.pig.periodDays);
    const cattle = 1 + COMMODITY_CYCLES.cattle.amplitude * Math.sin(2 * Math.PI * day / COMMODITY_CYCLES.cattle.periodDays);
    return (pig + cattle) / 2;
  }
  if (commodityId === 'milk') {
    return 1 + COMMODITY_CYCLES.cattle.amplitude * Math.sin(2 * Math.PI * day / COMMODITY_CYCLES.cattle.periodDays);
  }
  return 1.0;
}

// Main tick — call once per advanceDay
export function tickAllPrices(input: PriceTickInput): PriceTickOutput {
  const { prices, momentum, priceHistory15d, activeShocks, day, forecast, npcProductionMultipliers } = input;

  // Addition #4: Inflation drift — 2.5% per in-game year
  const inflationIndex = Math.pow(1.025, day / 365);

  // Update 15-day history for correlation lag buffer
  const newHistory15d: Record<string, number[]> = {};
  for (const p of prices) {
    const prev = priceHistory15d[p.cropId] ?? [];
    newHistory15d[p.cropId] = [...prev, p.price].slice(-30);
  }

  const newMomentum = { ...momentum };

  // Apply layers 1–5 + additions #3, #4, #5
  let newPrices = prices.map(p => {
    const rawBaseline = COMMODITY_BASELINES[p.cropId] ?? p.basePrice;
    const inflatedBaseline = rawBaseline * inflationIndex * getRegionMultiplier(p.cropId);
    const cycleMultiplier = getCycleMultiplier(p.cropId, day);
    const effectiveBaseline = inflatedBaseline * cycleMultiplier;

    const profile = getVolatilityProfile(p.cropId);
    const currentTrend = newMomentum[p.cropId] ?? 0;

    // Layer 2: Volatility
    const { newPrice: afterVol, newTrend } = applyVolatility(p.price, effectiveBaseline, profile, currentTrend);
    newMomentum[p.cropId] = newTrend;

    // Layer 3: Seasonal
    const afterSeasonal = afterVol * seasonalMultiplier(p.cropId, day);

    // Layer 4: Event shocks
    const afterShock = afterSeasonal * shockModifier(p.cropId, activeShocks);

    // Layer 5: NPC supply pressure
    const npcMult = npcProductionMultipliers[p.cropId] ?? 1.0;
    const afterPressure = afterShock * (1 + supplyPressureAdj(p.cropId, npcMult));

    // Addition #5: Forecast pre-movement
    const afterForecast = afterPressure * (1 + forecastPreMovement(p.cropId, forecast));

    const finalPrice = Math.max(effectiveBaseline * 0.2, afterForecast);
    return { ...p, price: finalPrice, basePrice: effectiveBaseline };
  });

  // Addition #1: Correlations (post-process)
  newPrices = applyCorrelations(newPrices, newHistory15d);

  // Decay active shocks
  const newActiveShocks = activeShocks
    .map(s => ({ ...s, remainingDays: s.remainingDays - 1 }))
    .filter(s => s.remainingDays > 0);

  return {
    prices: newPrices,
    momentum: newMomentum,
    priceHistory15d: newHistory15d,
    activeShocks: newActiveShocks,
  };
}

// Addition #6: NPC supply response to sustained price signals
export function updateNpcProductionMultipliers(
  current: Record<string, number>,
  signalDays: Record<string, number>,
  prices: MarketPrice[],
): { multipliers: Record<string, number>; signalDays: Record<string, number> } {
  const newMultipliers = { ...current };
  const newSignalDays = { ...signalDays };

  for (const p of prices) {
    const baseline = COMMODITY_BASELINES[p.cropId];
    if (!baseline) continue;
    const ratio = p.price / baseline;
    const prev = newSignalDays[p.cropId] ?? 0;

    if (ratio > 1.30) {
      newSignalDays[p.cropId] = prev + 1;
    } else if (ratio < 0.70) {
      newSignalDays[p.cropId] = prev - 1;
    } else {
      newSignalDays[p.cropId] = Math.sign(prev) * Math.max(0, Math.abs(prev) - 1);
    }

    const sd = newSignalDays[p.cropId];
    if (sd >= 30) {
      // Ramp NPC production +20% over 60 days (~0.33%/day)
      newMultipliers[p.cropId] = Math.min(2.0, (current[p.cropId] ?? 1.0) + 0.0033);
    } else if (sd <= -30) {
      // Reduce NPC production by 25% over 60 days (~0.42%/day)
      newMultipliers[p.cropId] = Math.max(0.1, (current[p.cropId] ?? 1.0) - 0.0042);
    }
  }

  return { multipliers: newMultipliers, signalDays: newSignalDays };
}
