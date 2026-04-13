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
