import { CropType } from '../data/cropTypes';

export type SoilType = 'loamy' | 'sandy' | 'clay' | 'chalky';

const SOIL_AFFINITY: Record<SoilType, Partial<Record<string, number>>> = {
  loamy:  {}, // neutral — all crops 1.0
  sandy:  { potatoes: 1.20, sugarbeet: 1.15, sunflower: 1.10, lavender: 1.15, ginseng: 1.10, rice: 0.90, sugarcane: 0.90 },
  clay:   { wheat: 1.15, rice: 1.20, corn: 1.10, soy: 1.10, lavender: 0.90, saffron: 0.90, ginseng: 0.90 },
  chalky: { grapes: 1.20, lavender: 1.20, olives: 1.15, saffron: 1.10, corn: 0.90, rice: 0.90, sugarcane: 0.90 },
};

export function getSoilModifier(soilType: SoilType | undefined, cropId: string): number {
  if (!soilType || soilType === 'loamy') return 1.0;
  return SOIL_AFFINITY[soilType][cropId] ?? 1.0;
}

export interface PlantedCrop {
  cropId: string;
  parcelId: string;
  plantedDay: number;
  hectares: number;
  fertilized: boolean;
  appliedFertilizerBonus?: number; // set by mid-growth fertilizeCrop; undefined = use cropType.fertilizerBonus
  frostDamage?: number;    // 0–1 accumulated; ≥1.0 = crop killed
  droughtStress?: number;  // 0–1 accumulated
  moistureLevel?: number;  // 0–1 soil moisture; default 0.7
}

export function isReady(crop: PlantedCrop, cropType: CropType, currentDay: number): boolean {
  return currentDay >= crop.plantedDay + cropType.growthDays;
}

export function harvestAmount(
  crop: PlantedCrop,
  cropType: CropType,
  fertility: number,          // 1–25 scale → 0.5–1.0
  climateModifier: number,    // 0.6–1.2
  hasWeeds: boolean,
  machineYieldBonus: number,  // 1.0 = no machine, 1.1+ = from owned machines
  frostDamage = 0,    // default 0 = no damage (backwards compatible)
  droughtStress = 0,  // default 0 = no stress
): number {
  const fertilityMod = 0.5 + (fertility / 25) * 0.5;
  const fertilizerMod = crop.fertilized
    ? (crop.appliedFertilizerBonus ?? cropType.fertilizerBonus)
    : 1.0;
  const weedMod = hasWeeds ? 0.75 : 1.0;
  const frostMod = Math.max(0, 1 - frostDamage * 0.7);
  const droughtMod = Math.max(0, 1 - droughtStress * 0.8);

  return (
    crop.hectares *
    cropType.baseYield *
    fertilityMod *
    fertilizerMod *
    weedMod *
    climateModifier *
    machineYieldBonus *
    frostMod *
    droughtMod
  );
}

// ─── Soil System ─────────────────────────────────────────────────────────────

export interface SoilStats {
  nitrogen: number;       // 0–100, optimal 60–80
  organicMatter: number;  // 0–10, optimal 4–7
  compaction: number;     // 0–100, optimal 0–25 (lower = better)
  pH: number;             // 4.0–8.5, optimal 6.0–7.0
  microbialLife: number;  // 0–100, optimal 60–100
}

export const SOIL_DEFAULTS: SoilStats = {
  nitrogen: 65,
  organicMatter: 4.5,
  compaction: 20,
  pH: 6.5,
  microbialLife: 70,
};

/**
 * Returns a yield multiplier (0.3–1.2) based on all 5 soil dimensions.
 * Modifiers stack multiplicatively. A perfectly managed parcel can reach 1.2.
 */
export function computeSoilYieldModifier(soil: SoilStats): number {
  // Nitrogen: optimal 60–80, penalise outside that range
  const nMod =
    soil.nitrogen < 40
      ? 0.6 + (soil.nitrogen / 40) * 0.4        // 0.6 at 0, 1.0 at 40
      : soil.nitrogen > 90
      ? 0.85                                     // excess nitrogen = slight penalty
      : 1.0 + Math.max(0, Math.min((soil.nitrogen - 60) / 200, 0.10)); // +0–10% in 60–80 range; neutral 40–60

  // Organic matter: optimal ≥ 4%; below 2% penalised
  const omMod =
    soil.organicMatter < 2
      ? 0.75 + (soil.organicMatter / 2) * 0.25  // 0.75 at 0%, 1.0 at 2%
      : 1.0 + Math.max(0, Math.min((soil.organicMatter - 4) / 40, 0.05)); // +0–5% above 4%; neutral 2–4%

  // Compaction: 0 = best, 100 = worst
  const compMod =
    soil.compaction > 50
      ? 1.0 - ((soil.compaction - 50) / 50) * 0.30 // −30% at 100
      : 1.0;

  // pH: optimal 6.0–7.0; outside 5.5–7.5 penalised
  const pHDev = Math.max(0, Math.abs(soil.pH - 6.5) - 1.0); // deviation beyond ±1.0 (outside 5.5–7.5)
  const pHMod = Math.max(0.80, 1.0 - pHDev * 0.20);

  // Microbial life: below 30 penalised; above 60 slight bonus
  const microMod =
    soil.microbialLife < 30
      ? 0.85 + (soil.microbialLife / 30) * 0.15 // 0.85 at 0, 1.0 at 30
      : Math.max(1.0, 1.0 + Math.min((soil.microbialLife - 60) / 400, 0.05)); // +0–5% above 60; neutral 30–60

  return Math.max(0.3, nMod * omMod * compMod * pHMod * microMod);
}
