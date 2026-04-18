import type { LandParcel } from '../store/useGameStore';
import { Season } from './climate';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WellStatus =
  | 'surveying'      // hydrogeologist assigned, not done yet
  | 'survey_ready'   // survey results ready, awaiting player choice
  | 'drilling'       // drilling team hired, in progress
  | 'failed'         // drilling attempt hit dry rock
  | 'active'         // well operational
  | 'dry';           // aquifer too depleted to pump

export interface DrillSpot {
  id: string;
  successProbability: number;   // 0.0–1.0
  approxDepthMin: number;       // metres
  approxDepthMax: number;
  estimatedCostMin: number;     // $
  estimatedCostMax: number;
}

export interface Well {
  id: string;
  parcelId: string;
  status: WellStatus;
  surveyCompletesDay?: number;
  surveySpots?: DrillSpot[];
  chosenSpotId?: string;
  drillingCompletesDay?: number;
  actualDepth?: number;
  actualCost?: number;
  flowRateTarget: number;       // L/hr — specified by player at drilling time
  pumpTier?: 1 | 2 | 3;
  connectedParcelIds: string[];
}

export type PumpTier = 1 | 2 | 3;

export const PUMP_SPECS: Record<PumpTier, { maxFlowRate: number; cost: number; label: string }> = {
  1: { maxFlowRate: 5_000,  cost: 3_500,  label: 'Small (5,000 L/hr)' },
  2: { maxFlowRate: 15_000, cost: 8_000,  label: 'Medium (15,000 L/hr)' },
  3: { maxFlowRate: 30_000, cost: 18_000, label: 'Large (30,000 L/hr)' },
};

// ─── Pure functions ───────────────────────────────────────────────────────────

/** Total L/hr required to irrigate the given parcels based on their current crop waterNeed. */
export function calcParcelWaterDemand(
  parcelIds: string[],
  parcels: LandParcel[],
  cropTypes: { id: string; waterNeed: number }[],
): number {
  return parcelIds.reduce((total, id) => {
    const parcel = parcels.find(p => p.id === id);
    if (!parcel) return total;
    const cropId = parcel.plantedCrop?.cropId;
    const cropType = cropTypes.find(c => c.id === cropId);
    const waterNeed = cropType?.waterNeed ?? 3;
    return total + parcel.hectares * waterNeed * 1_000;
  }, 0);
}

/** Minimum PumpTier that covers the demand. */
export function pumpTierForDemand(demandLhr: number): PumpTier {
  if (demandLhr <= 5_000)  return 1;
  if (demandLhr <= 15_000) return 2;
  return 3;
}

/** Effective flow rate accounting for aquifer depletion. Scales to 0 below 50% aquifer. */
export function wellFlowRate(well: Well, aquiferLevel: number): number {
  if (well.status !== 'active' || !well.pumpTier) return 0;
  const maxFlow = PUMP_SPECS[well.pumpTier].maxFlowRate;
  const flowScale = aquiferLevel >= 50 ? 1.0 : aquiferLevel / 50;
  return maxFlow * flowScale;
}

export interface AquiferTickParams {
  totalFarmDemandLhr: number;
  npcDailyDraw: number;
  weatherEvent: string;
  season: Season;
}

/** Daily aquifer tick — pure, no side effects. Returns new aquifer level (0–100). */
export function advanceAquifer(level: number, params: AquiferTickParams): number {
  let next = level;
  const totalDraw = (params.totalFarmDemandLhr + params.npcDailyDraw) / 100_000;
  next -= totalDraw;
  if (params.weatherEvent === 'rain')       next += 1.5;
  if (params.weatherEvent === 'heavy_rain') next += 3.5;
  if (params.weatherEvent === 'drought')    next -= 0.5;
  if (params.season === 'spring')           next += 0.2;
  return Math.max(0, Math.min(100, next));
}

/** Generate 2–4 randomised drilling spots for a parcel. */
export function generateSurveySpots(parcelId: string, day: number): DrillSpot[] {
  const count = 2 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, (_, i) => {
    const successProb = 0.35 + Math.random() * 0.60;
    const depthMin = 20 + Math.floor(Math.random() * 100);
    const depthMax = depthMin + 10 + Math.floor(Math.random() * 40);
    const costPerMetre = 180 + Math.floor(Math.random() * 120);
    return {
      id: `spot_${parcelId}_${day}_${i}`,
      successProbability: Math.round(successProb * 100) / 100,
      approxDepthMin: depthMin,
      approxDepthMax: depthMax,
      estimatedCostMin: depthMin * costPerMetre,
      estimatedCostMax: depthMax * (costPerMetre + 50),
    };
  });
}

/** One-time pipe installation cost based on parcel index proximity. */
export function pipeCost(wellParcelIdx: number, targetParcelIdx: number): number {
  const distance = Math.abs(wellParcelIdx - targetParcelIdx) * 50; // metres
  return Math.max(400, distance * 8);
}
