import type { WeatherEvent } from './climate';

interface SoilState { compaction: number }
interface LandParcel {
  soil: SoilState;
  soilSalinity?: number;
  soilWetUntilDay?: number;
  bareDayCtr?: number;
  topsoilErosion?: number;
  recentIrrigationDays?: number[];
  plantedCrop?: { cropId: string } | null;
}

export function wetDuration(event: WeatherEvent, streakDay: number): number {
  if (event === 'heavy_rain') return Math.min(4 + streakDay, 7);
  if (event === 'rain') return streakDay >= 2 ? 3 : 2;
  return 0;
}

export function applyWetTillageCompaction<T extends LandParcel>(parcel: T): T {
  return {
    ...parcel,
    soil: { ...parcel.soil, compaction: Math.min(100, parcel.soil.compaction + 8) },
  } as T;
}

export function checkSalinization(
  parcel: LandParcel,
  currentDay: number,
  season: string,
  isDroughtEvent: boolean,
): boolean {
  if (season !== 'summer' && !isDroughtEvent) return false;
  const irrigationsIn30Days = (parcel.recentIrrigationDays ?? []).filter(d => currentDay - d <= 30).length;
  return irrigationsIn30Days >= 5;
}

export function applySalinization<T extends LandParcel>(parcel: T): T {
  return { ...parcel, soilSalinity: Math.min(100, (parcel.soilSalinity ?? 0) + 4) } as T;
}

export function checkErosion<T extends LandParcel>(
  parcel: T,
  event: WeatherEvent,
  windProtected = false,
): T {
  const bareDays = parcel.bareDayCtr ?? 0;
  let erosion = parcel.topsoilErosion ?? 0;
  if ((event === 'rain' || event === 'heavy_rain') && bareDays >= 14) erosion = Math.min(100, erosion + 5);
  if (event === 'drought' && bareDays >= 7 && !windProtected) erosion = Math.min(100, erosion + 2);
  return { ...parcel, topsoilErosion: erosion } as T;
}

export function applyNaturalRecovery<T extends LandParcel>(parcel: T): T {
  return {
    ...parcel,
    soil: { ...parcel.soil, compaction: Math.max(0, parcel.soil.compaction - 1) },
    soilSalinity: Math.max(0, (parcel.soilSalinity ?? 0) - 0.5),
  } as T;
}

export function degradationYieldModifier(parcel: LandParcel): number {
  const mod =
    (1 - (parcel.soil.compaction / 100) * 0.3) *
    (1 - ((parcel.soilSalinity ?? 0) / 100) * 0.4) *
    (1 - ((parcel.topsoilErosion ?? 0) / 100) * 0.2);
  return Math.max(0.3, mod);
}

export function isSoilWet(parcel: LandParcel, currentDay: number): boolean {
  return (parcel.soilWetUntilDay ?? 0) > currentDay;
}

export function updateBareDayCtr<T extends LandParcel>(parcel: T): T {
  const hasCrop = parcel.plantedCrop !== null;
  const coverIds = new Set(['rye', 'clover', 'mustard', 'buckwheat']);
  const isCoverCrop = hasCrop && parcel.plantedCrop != null && coverIds.has(parcel.plantedCrop.cropId);
  if (hasCrop && !isCoverCrop) return { ...parcel, bareDayCtr: 0 } as T;
  return { ...parcel, bareDayCtr: (parcel.bareDayCtr ?? 0) + 1 } as T;
}

export function pruneIrrigationDays<T extends LandParcel>(
  parcel: T,
  currentDay: number,
  addToday = false,
): T {
  let days = (parcel.recentIrrigationDays ?? []).filter(d => currentDay - d <= 30);
  if (addToday) days = [...days, currentDay];
  return { ...parcel, recentIrrigationDays: days } as T;
}
