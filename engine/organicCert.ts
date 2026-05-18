export type OrganicStatus =
  | 'conventional'
  | 'transition_1'
  | 'transition_2'
  | 'transition_3'
  | 'organic'
  | 'decertified';

export interface ContaminationAppeal {
  detectedDay: number;
  appealDeadlineDay: number;
  filed: boolean;
}

export const ORGANIC_YIELD_MOD: Record<OrganicStatus, number> = {
  conventional: 1.0,
  transition_1: 0.65,
  transition_2: 0.75,
  transition_3: 0.85,
  organic: 0.92,
  decertified: 1.0,
};

export const ORGANIC_TRANSITION_DAYS = 365;
export const DECERTIFIED_LOCKOUT_DAYS = 1095; // 3 years
export const APPEAL_WINDOW_DAYS = 7;

/** Application fee flat + per hectare */
export function organicApplicationFee(hectares: number): number {
  return 300 + hectares * 50;
}

/** Compute organic practice bonus multiplier (1.0 + bonuses) */
export function getOrganicPracticeBonus(params: {
  coverCropPresent: boolean;
  organicMatter: number;
  microbialLife: number;
  noSyntheticFertilizerYears: number;
}): number {
  let bonus = 0;
  if (params.coverCropPresent) bonus += 0.05;
  if (params.organicMatter > 0.6) bonus += 0.08;
  if (params.microbialLife > 0.7) bonus += 0.06;
  if (params.noSyntheticFertilizerYears >= 2) bonus += 0.04;
  return 1.0 + Math.min(0.23, bonus);
}

/** Total organic yield modifier including practice bonuses */
export function getOrganicYieldMod(
  status: OrganicStatus,
  practiceBonus: number,
): number {
  const base = ORGANIC_YIELD_MOD[status];
  if (status === 'conventional' || status === 'decertified') return 1.0;
  return Math.min(1.0, base * practiceBonus);
}

/** Compute organic yield modifier for a parcel with its current soil */
export function getParcelOrganicYieldMod(parcel: {
  organicStatus?: OrganicStatus;
  soil?: { organicMatter: number; microbialLife: number };
  plantedCrop?: { cropId: string } | null;
}): number {
  const status = parcel.organicStatus ?? 'conventional';
  if (status === 'conventional' || status === 'decertified') return 1.0;
  const coverCropIds = new Set(['rye', 'clover', 'mustard', 'buckwheat']);
  const coverCropPresent = parcel.plantedCrop ? coverCropIds.has(parcel.plantedCrop.cropId) : false;
  const bonus = getOrganicPracticeBonus({
    coverCropPresent,
    organicMatter: parcel.soil?.organicMatter ?? 0,
    microbialLife: (parcel.soil?.microbialLife ?? 0) / 100,
    noSyntheticFertilizerYears: 0, // TODO: track separately
  });
  return getOrganicYieldMod(status, bonus);
}

/** Whether a status is in transition or certified */
export function isOrganicEnrolled(status: OrganicStatus): boolean {
  return status === 'transition_1' || status === 'transition_2' || status === 'transition_3' || status === 'organic';
}

/** Advance transition status after a clean year */
export function advanceTransition(status: OrganicStatus): OrganicStatus {
  if (status === 'transition_1') return 'transition_2';
  if (status === 'transition_2') return 'transition_3';
  if (status === 'transition_3') return 'organic';
  return status;
}

/** Whether decertified lockout has expired */
export function canReapplyAfterDecertification(
  lastDecertifiedDay: number | undefined,
  currentDay: number,
): boolean {
  if (!lastDecertifiedDay) return true;
  return currentDay - lastDecertifiedDay >= DECERTIFIED_LOCKOUT_DAYS;
}

/** Check if appeal has expired without filing */
export function isAppealExpired(
  appeal: ContaminationAppeal | undefined,
  currentDay: number,
): boolean {
  if (!appeal) return false;
  return !appeal.filed && currentDay > appeal.appealDeadlineDay;
}

/** Create a new contamination appeal */
export function createContaminationAppeal(currentDay: number): ContaminationAppeal {
  return {
    detectedDay: currentDay,
    appealDeadlineDay: currentDay + APPEAL_WINDOW_DAYS,
    filed: false,
  };
}

/** Organic price multiplier by crop category */
export function organicPriceMultiplier(cropId: string): number {
  const grains = new Set(['wheat', 'barley', 'corn', 'oat', 'rice', 'rye', 'triticale']);
  const vegFruit = new Set([
    'tomato', 'lettuce', 'carrot', 'onion', 'garlic', 'pepper', 'cucumber',
    'zucchini', 'eggplant', 'spinach', 'broccoli', 'cauliflower', 'cabbage',
    'pea', 'bean', 'lentil', 'chickpea', 'apple', 'pear', 'peach', 'plum',
    'orange', 'lemon', 'grape', 'strawberry', 'blueberry',
  ]);
  const specialty = new Set(['saffron', 'vanilla', 'lavender', 'hops']);

  if (grains.has(cropId)) return 1.8;
  if (vegFruit.has(cropId)) return 2.2;
  if (specialty.has(cropId)) return 2.5;
  if (cropId === 'honey') return 2.0;
  return 1.8; // default
}
