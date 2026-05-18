export type TimeWindow = 'twilight' | 'day' | 'night';

export interface WorkerShiftState {
  shiftPreference: TimeWindow | 'any';
  fatigueLevel: number; // 0.0–1.0
  consecutiveNightShifts: number;
}

export const WINDOW_LABELS: Record<TimeWindow, string> = {
  twilight: 'Twilight (5–8 AM / 7–9 PM)',
  day: 'Day (8 AM – 7 PM)',
  night: 'Night (9 PM – 5 AM)',
};

/** Irrigation efficiency bonus at night */
export function irrigationEfficiency(window: TimeWindow): number {
  return window === 'night' ? 1.25 : 1.0;
}

/** Electricity cost multiplier for irrigation */
export function irrigationElectricityCost(window: TimeWindow): number {
  return window === 'night' ? 0.60 : 1.0;
}

/** Worker productivity modifier based on season and window */
export function workerProductivityMod(season: string, window: TimeWindow): number {
  if (season !== 'summer') return 1.0;
  if (window === 'day') return 0.70;
  if (window === 'twilight') return 1.0;
  return 0.90; // night
}

/** Whether a machinery operation triggers noise ordinance */
export function triggersNoiseOrdinance(
  window: TimeWindow,
  nearSettlement: boolean,
  soundBarriers: boolean,
): boolean {
  if (window !== 'night') return false;
  if (!nearSettlement) return false;
  if (soundBarriers) return false;
  return true;
}

/** Compute fatigue after a day's work */
export function computeFatigue(
  currentFatigue: number,
  window: TimeWindow,
  consecutiveNights: number,
): { fatigue: number; consecutiveNights: number } {
  let newFatigue = currentFatigue;
  let newConsecutive = consecutiveNights;

  if (window === 'night') {
    newFatigue += 0.20;
    newConsecutive += 1;
  } else {
    newFatigue -= 0.15;
    newConsecutive = 0;
  }

  newFatigue = Math.max(0, Math.min(1.0, newFatigue));
  return { fatigue: newFatigue, consecutiveNights: newConsecutive };
}

/** Productivity modifier from fatigue */
export function fatigueProductivityMod(fatigue: number): number {
  if (fatigue >= 1.0) return 0; // sick
  if (fatigue >= 0.70) return 0.85;
  return 1.0;
}

/** Check if worker is forced to rest */
export function isForcedRest(consecutiveNights: number, fatigue: number): boolean {
  return consecutiveNights >= 5 || fatigue >= 1.0;
}

/** Wage multiplier for shift */
export function wageMultiplier(window: TimeWindow): number {
  return window === 'night' ? 1.5 : 1.0;
}

/** Hay/silage quality bonus for twilight harvest */
export function haySilageQualityBonus(cropId: string, window: TimeWindow): boolean {
  const haySilageCrops = new Set(['alfalfa', 'clover', 'grass', 'rye', 'oat']);
  return haySilageCrops.has(cropId) && window === 'twilight';
}

/** Default window for operations */
export function defaultWindow(operation: 'irrigation' | 'machinery' | 'harvest' | 'feeding'): TimeWindow {
  if (operation === 'irrigation') return 'night';
  if (operation === 'feeding') return 'twilight';
  return 'day';
}
