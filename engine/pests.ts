import type { CropType } from '../data/cropTypes';
import type { Season } from './climate';

export type PestType = 'fungal' | 'insect' | 'nematode' | 'blight';

export interface PestState {
  type: PestType;
  severity: number;      // 0.0–10.0; ≥7 = visible without consultant; ≥10 = max damage
  detectedDay?: number;  // day consultant first reported this — undefined = undetected
}

export const PEST_CONFIG: Record<PestType, {
  label: string;
  spreadRate: number;       // daily probability of spreading to adjacent parcel (0–1)
  growthRate: number;       // daily severity increase (0–10 scale)
  treatment: 'fungicide' | 'insecticide' | 'nematicide';
  seasonRisk: Partial<Record<Season, number>>;
  susceptibleCrops: string[];  // cropIds most at risk (2× outbreak chance)
}> = {
  fungal:   { label: 'Fungal Disease',  spreadRate: 0.15, growthRate: 0.8, treatment: 'fungicide',   seasonRisk: { spring: 1.5, autumn: 1.3, winter: 1.2, summer: 0.7 }, susceptibleCrops: ['wheat','potatoes','grapes','tomatoes','strawberries'] },
  insect:   { label: 'Insect Pest',     spreadRate: 0.25, growthRate: 0.6, treatment: 'insecticide', seasonRisk: { spring: 1.2, summer: 2.0, autumn: 1.0, winter: 0.1 }, susceptibleCrops: ['corn','cotton','soy','sunflower','rapeseed'] },
  nematode: { label: 'Root Nematodes',  spreadRate: 0.08, growthRate: 0.4, treatment: 'nematicide',  seasonRisk: { spring: 1.0, summer: 1.5, autumn: 1.0, winter: 0.5 }, susceptibleCrops: ['potatoes','sugarbeet','sugarcane','carrots','ginseng'] },
  blight:   { label: 'Crop Blight',     spreadRate: 0.20, growthRate: 1.0, treatment: 'fungicide',   seasonRisk: { spring: 1.0, summer: 0.8, autumn: 1.5, winter: 0.3 }, susceptibleCrops: ['potatoes','tomatoes','rice','corn'] },
};

export function baseOutbreakChance(
  cropType: CropType,
  season: Season,
  weatherEvent: string,
  cropHistory: string[],
  beneficialInsectsActive: boolean,
): number {
  let chance = 0.004; // 0.4% base per day

  // Season risk (pick highest applicable pest config — simplified)
  const maxSeasonMult = Math.max(
    ...Object.values(PEST_CONFIG).map(p => p.seasonRisk[season] ?? 1.0)
  );
  chance *= maxSeasonMult;

  // Heavy rain boosts fungal risk
  if (weatherEvent === 'heavy_rain' || weatherEvent === 'rain') chance *= 1.4;

  // Crop rotation: diverse history reduces chance
  const uniqueCrops = new Set(cropHistory).size;
  if (uniqueCrops >= 3) chance *= 0.5;
  else if (uniqueCrops === 2) chance *= 0.75;
  // monoculture (1 or 0 unique) = no reduction

  // Beneficial insects
  if (beneficialInsectsActive) chance *= 0.5;

  return Math.min(chance, 0.15); // cap at 15% daily
}

export function pickPestType(cropType: CropType, season: Season): PestType {
  // Weight by season risk + crop susceptibility
  const weights = (Object.entries(PEST_CONFIG) as [PestType, typeof PEST_CONFIG[PestType]][]).map(
    ([type, config]) => {
      let w = config.seasonRisk[season] ?? 1.0;
      if (config.susceptibleCrops.includes(cropType.id)) w *= 2.0;
      return { type, w };
    }
  );
  const total = weights.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weights) {
    r -= x.w;
    if (r <= 0) return x.type;
  }
  return weights[weights.length - 1].type;
}

export function tickPestSeverity(
  pestState: PestState,
  config: typeof PEST_CONFIG[PestType],
  beneficialInsectsActive: boolean,
): number {
  const growth = config.growthRate * (beneficialInsectsActive ? 0.5 : 1.0);
  return Math.min(10, pestState.severity + growth);
}

export function pestYieldModifier(severity: number): number {
  if (severity <= 2) return 1.0;     // mild — no yield loss (undetected)
  if (severity <= 5) return 0.85;    // moderate — 15% loss
  if (severity <= 8) return 0.65;    // severe — 35% loss
  return 0.40;                       // critical — 60% loss
}

export function shouldSpread(
  severity: number,
  spreadRate: number,
  beneficialInsectsActive: boolean,
): boolean {
  if (severity < 3) return false; // too mild to spread
  const rate = spreadRate * (severity / 10) * (beneficialInsectsActive ? 0.4 : 1.0);
  return Math.random() < rate;
}
