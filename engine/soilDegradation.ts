import type { WeatherEvent } from './climate';
import type { LandParcel } from '../store/useGameStore';

/**
 * Compute how many days soil stays wet after a rainfall event.
 */
export function wetDuration(event: WeatherEvent, streakDay: number): number {
  if (event === 'heavy_rain') return Math.min(4 + streakDay, 7);
  if (event === 'rain') return streakDay >= 2 ? 3 : 2;
  return 0;
}

/**
 * Apply wet-tillage compaction penalty.
 * Returns updated parcel with increased compaction.
 */
export function applyWetTillageCompaction(parcel: LandParcel): LandParcel {
  return {
    ...parcel,
    soil: {
      ...parcel.soil,
      compaction: Math.min(100, parcel.soil.compaction + 8),
    },
  };
}

/**
 * Check if irrigation triggers salinization.
 * True when: season is summer OR drought event, AND
 * parcel irrigated 5+ times in last 30 days without rain leaching.
 */
export function checkSalinization(
  parcel: LandParcel,
  currentDay: number,
  season: string,
  isDroughtEvent: boolean,
): boolean {
  const isDryPeriod = season === 'summer' || isDroughtEvent;
  if (!isDryPeriod) return false;

  const recentDays = parcel.recentIrrigationDays ?? [];
  const irrigationsIn30Days = recentDays.filter(d => currentDay - d <= 30).length;
  return irrigationsIn30Days >= 5;
}

/**
 * Apply salinization effect.
 */
export function applySalinization(parcel: LandParcel): LandParcel {
  return {
    ...parcel,
    soilSalinity: Math.min(100, (parcel.soilSalinity ?? 0) + 4),
  };
}

/**
 * Check erosion on rain/drought events.
 * windProtected skips wind (drought) erosion from north/west hedgerows.
 */
export function checkErosion(
  parcel: LandParcel,
  event: WeatherEvent,
  windProtected = false,
): LandParcel {
  const bareDays = parcel.bareDayCtr ?? 0;
  let erosion = parcel.topsoilErosion ?? 0;

  if ((event === 'rain' || event === 'heavy_rain') && bareDays >= 14) {
    erosion = Math.min(100, erosion + 5);
  }
  if (event === 'drought' && bareDays >= 7 && !windProtected) {
    erosion = Math.min(100, erosion + 2);
  }

  return { ...parcel, topsoilErosion: erosion };
}

/**
 * Natural daily recovery for compaction and salinity.
 */
export function applyNaturalRecovery(parcel: LandParcel): LandParcel {
  const compaction = Math.max(0, parcel.soil.compaction - 1);
  const salinity = Math.max(0, (parcel.soilSalinity ?? 0) - 0.5);
  return {
    ...parcel,
    soil: { ...parcel.soil, compaction },
    soilSalinity: salinity,
  };
}

/**
 * Compute the degradation yield modifier (0.3–1.0).
 */
export function degradationYieldModifier(parcel: LandParcel): number {
  const compaction = parcel.soil.compaction / 100;
  const salinity = (parcel.soilSalinity ?? 0) / 100;
  const erosion = (parcel.topsoilErosion ?? 0) / 100;

  const mod =
    (1 - compaction * 0.3) *
    (1 - salinity * 0.4) *
    (1 - erosion * 0.2);

  return Math.max(0.3, mod);
}

/**
 * Check if soil is currently wet.
 */
export function isSoilWet(parcel: LandParcel, currentDay: number): boolean {
  return (parcel.soilWetUntilDay ?? 0) > currentDay;
}

/**
 * Update bare-day counter for a parcel.
 */
export function updateBareDayCtr(parcel: LandParcel): LandParcel {
  const hasCrop = parcel.plantedCrop !== null;
  const isCoverCrop = hasCrop && (parcel.plantedCrop?.cropId === 'rye' || parcel.plantedCrop?.cropId === 'clover' || parcel.plantedCrop?.cropId === 'mustard' || parcel.plantedCrop?.cropId === 'buckwheat');
  if (hasCrop && !isCoverCrop) {
    return { ...parcel, bareDayCtr: 0 };
  }
  return { ...parcel, bareDayCtr: (parcel.bareDayCtr ?? 0) + 1 };
}

/**
 * Prune recentIrrigationDays to last 30 days and optionally add today.
 */
export function pruneIrrigationDays(
  parcel: LandParcel,
  currentDay: number,
  addToday = false,
): LandParcel {
  let days = (parcel.recentIrrigationDays ?? []).filter(d => currentDay - d <= 30);
  if (addToday) {
    days = [...days, currentDay];
  }
  return { ...parcel, recentIrrigationDays: days };
}
