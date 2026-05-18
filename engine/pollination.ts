import { LandParcel } from '../store/useGameStore';
import { CROP_TYPES } from '../data/cropTypes';
import { getSeason } from './climate';
import { pollinatorStripCount } from './hedgerows';

/** Compute hive health (0.2–1.0) for a given colmena based on linked parcel spray status. */
export function computeHiveHealth(
  colmenaId: string,
  parcels: LandParcel[],
  currentDay: number,
): number {
  const linked = parcels.filter(p => p.linkedColmenaId === colmenaId);
  if (linked.length === 0) return 1.0;

  const contaminated = linked.filter(
    p => p.pesticideSprayedDay !== undefined && currentDay - p.pesticideSprayedDay < 14,
  ).length;

  const contaminationRatio = contaminated / linked.length;
  return Math.max(0.2, 1.0 - contaminationRatio * 0.8);
}

/** Return the pollination yield multiplier for a parcel at harvest time. */
export function getPollinationMultiplier(
  parcel: LandParcel,
  parcels: LandParcel[],
  currentDay: number,
  hedgerows: import('./hedgerows').Hedgerow[] = [],
): number {
  if (!parcel.linkedColmenaId || !parcel.plantedCrop) return 1.0;
  const cropType = CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId);
  if (!cropType || cropType.pollinationBonus <= 0) return 1.0;

  let health = computeHiveHealth(parcel.linkedColmenaId, parcels, currentDay);
  // Pollinator strip boost: +10% per mature strip, capped at 1.0
  const stripCount = pollinatorStripCount(parcel.id, hedgerows, currentDay);
  health = Math.min(1.0, health + stripCount * 0.10);

  return 1.0 + cropType.pollinationBonus * health;
}

/** Seasonal + weather honey multiplier applied during advanceDay. */
export function getHoneyMultiplier(
  currentDay: number,
  todayWeather: { event?: string; climateModifier: number } | null,
): number {
  const season = getSeason(currentDay);
  let mult = 1.0;
  switch (season) {
    case 'spring': mult = 1.2; break;
    case 'summer': mult = 1.0; break;
    case 'autumn': mult = 0.7; break;
    case 'winter': mult = 0.0; break;
  }

  const event = todayWeather?.event;
  if (event === 'rain' || event === 'heavy_rain') mult *= 0.8;
  else if (event === 'heat_wave') mult *= 0.9;
  else if (event === 'drought') mult *= 0.7;

  return mult;
}

/** Count how many parcels are linked to a given colmena. */
export function getLinkedParcelCount(colmenaId: string, parcels: LandParcel[]): number {
  return parcels.filter(p => p.linkedColmenaId === colmenaId).length;
}

/** Max linked parcels per colmena building type (capacity = hive count / 3, rounded). */
export function getColmenaCapacity(colmenaId: string): number {
  if (colmenaId.includes('_l')) return 30;
  if (colmenaId.includes('_m')) return 12;
  return 5; // small
}
