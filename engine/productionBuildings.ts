/**
 * engine/productionBuildings.ts
 * Pure calculation functions for animal production buildings.
 * No imports from the store — all inputs passed as arguments.
 */

import { ProductionBuildingState } from '../store/useGameStore';

// ── Constants ─────────────────────────────────────────────────────────────

/** Daily hygiene decay rates per animal type (base, at-capacity herd). */
export const HYGIENE_DECAY_RATES: Record<string, number> = {
  vaca:     2.5,
  cabra:    2.0,
  bufalo:   2.5,
  oveja:    1.5,
  gallina:  3.0,
  pato:     3.0,
  codorniz: 2.5,
  cerdo:    4.0,
  conejo:   2.0,
  abeja:    0.5,
};

/**
 * Maps each animal type to the building ID prefix for its production building.
 * Used by engine callers to look up the correct building from ProductionBuildingState[].
 */
export const PRODUCTION_BUILDING_PREFIX: Record<string, string> = {
  vaca:     'bld_milking_parlour',
  cabra:    'bld_goat_milking_stand',
  bufalo:   'bld_buffalo_dairy',
  oveja:    'bld_shearing_shed',
  gallina:  'bld_egg_collection_house',
  pato:     'bld_duck_egg_house',
  codorniz: 'bld_quail_egg_station',
  cerdo:    'bld_pig_butchery',
  conejo:   'bld_rabbit_butchery',
  abeja:    'bld_honey_extraction_suite',
};

/** Species that produce dairy (milk) — used for milk grade gating and butterfat. */
export const DAIRY_SPECIES: Set<string> = new Set(['vaca', 'cabra', 'bufalo']);

// ── Capacity and manning ──────────────────────────────────────────────────

/**
 * Returns effective daily capacity for a building.
 * Currently a direct pass-through; reserved for future equipment-based modifiers.
 */
export function effectiveCapacity(building: ProductionBuildingState): number {
  return building.capacity;
}

/**
 * Returns true if the building is considered "manned" — at least one worker
 * assigned for small/medium, at least two for large.
 */
export function isManned(
  building: ProductionBuildingState,
  tier: 'small' | 'medium' | 'large',
): boolean {
  const required = tier === 'large' ? 2 : 1;
  return building.assignedWorkerIds.length >= required;
}

// ── Contractor fee ────────────────────────────────────────────────────────

/**
 * Returns the contractor fee for a given day's unprocessed production.
 *
 * @param unprocessedFraction  0–1 fraction of today's production that couldn't be handled
 * @param dailyProductionValue Estimated daily revenue from this species' production
 * @param isCoopMember         Co-op members pay 6% instead of 12%
 */
export function contractorFee(
  unprocessedFraction: number,
  dailyProductionValue: number,
  isCoopMember: boolean,
): number {
  if (unprocessedFraction <= 0) return 0;
  const rate = isCoopMember ? 0.06 : 0.12;
  return Math.round(unprocessedFraction * dailyProductionValue * rate * 100) / 100;
}

// ── Hygiene decay ─────────────────────────────────────────────────────────

/**
 * Returns the hygiene points lost today.
 *
 * Base decay comes from HYGIENE_DECAY_RATES[animalTypeId].
 * Overcrowding (herd > capacity) multiplies decay by 1 + overcrowdFraction.
 * A cleaner worker reduces decay by 30%.
 * UV sanitiser reduces decay by a further 0.5 points (egg house only, per equipment spec).
 */
export function hygieneDecay(
  animalTypeId: string,
  herdSize: number,
  capacity: number,
  hasCleanerWorker: boolean,
  hasUVSanitiser: boolean,
): number {
  const base = HYGIENE_DECAY_RATES[animalTypeId] ?? 2.0;
  const overcrowdFraction = Math.max(0, (herdSize - capacity) / Math.max(capacity, 1));
  let decay = base * (1 + overcrowdFraction);
  if (hasCleanerWorker) decay *= 0.7;
  if (hasUVSanitiser)   decay -= 0.5;
  return Math.max(0, decay);
}

// ── Animal welfare score ──────────────────────────────────────────────────

/**
 * Returns a welfare score 0–100 for a species.
 *
 * Weighted factors:
 *   hygiene       30%   (0–100 → 0–30)
 *   feedRatio7Day 30%   (0–1 → 0–30)  ratio of days in last 7 where feed was available
 *   density score 20%   (herd ≤ capacity → 20, overcrowded → linear reduction to 0)
 *   health score  20%   ((1 - sickFraction) → 0–20)
 */
export function welfareScore(
  hygiene: number,
  feedRatio7Day: number,
  herdSize: number,
  capacity: number,
  sickCount: number,
  totalCount: number,
): number {
  if (totalCount === 0) return 100;

  const hygieneScore  = (hygiene / 100) * 30;
  const feedScore     = feedRatio7Day * 30;
  const densityFrac   = Math.min(1, capacity / Math.max(herdSize, 1));
  const densityScore  = densityFrac * 20;
  const sickFraction  = sickCount / totalCount;
  const healthScore   = (1 - sickFraction) * 20;

  return Math.round(hygieneScore + feedScore + densityScore + healthScore);
}

// ── Milk quality grade ────────────────────────────────────────────────────

export function milkGrade(hygiene: number, hasMilkAnalyser: boolean): 'A' | 'B' | 'C' {
  const effective = hygiene + (hasMilkAnalyser ? 10 : 0);
  if (effective >= 80) return 'A';
  if (effective >= 60) return 'B';
  return 'C';
}

export function milkGradeMultiplier(grade: 'A' | 'B' | 'C'): number {
  if (grade === 'A') return 1.10;
  if (grade === 'B') return 1.00;
  return 0.75;  // Grade C: local market only; export/city gates enforced separately
}

// ── Butterfat percentage ──────────────────────────────────────────────────
// qualityGeneAvg: average quality gene across the dairy herd (0.5–1.5 range from AnimalGenes)
// Baseline 3.5% × quality gene + TMR bonus

export function butterfatPercent(qualityGeneAvg: number, hasTMRWagon: boolean): number {
  return 3.5 * qualityGeneAvg + (hasTMRWagon ? 0.3 : 0);
}

export function butterfatProcessingBonus(bf: number): number {
  if (bf >= 4.2) return 0.15;  // +15% processing yield
  if (bf >= 3.8) return 0.08;  // +8% processing yield
  return 0;
}

// ── Inspector event rolls ─────────────────────────────────────────────────

export function shouldInspect(hygiene: number): boolean {
  let chance: number;
  if (hygiene >= 60)      chance = 0.02;
  else if (hygiene >= 40) chance = 0.08;
  else if (hygiene >= 20) chance = 0.20;
  else                    chance = 0.35;
  return Math.random() < chance;
}

export function inspectionPassed(hygiene: number): boolean {
  return hygiene >= 60;
}

export function inspectorFine(hygiene: number): number {
  if (hygiene < 20)  return 800;
  if (hygiene < 40)  return 500;
  return 200;
}

// ── Certification progress ────────────────────────────────────────────────
// Returns the updated cert state for the building after one day.
// lastSyntheticInputDay: day the player last applied pesticide/chemical fertilizer.

export function certificationProgress(
  building: ProductionBuildingState,
  day: number,
  lastSyntheticInputDay: number,
  inspectionHappenedAndPassed: boolean,
): Pick<ProductionBuildingState, 'certificationTier' | 'certDaysAtThreshold' | 'certInspectionsPassed'> {
  const { certificationTier, certDaysAtThreshold, certInspectionsPassed, hygiene } = building;

  const newInspectionsPassed = certInspectionsPassed + (inspectionHappenedAndPassed ? 1 : 0);

  if (certificationTier === 'basic') {
    const atThreshold = hygiene >= 60;
    const newDays = atThreshold ? certDaysAtThreshold + 1 : 0;
    const upgrade = newDays >= 30 && newInspectionsPassed >= 1;
    return {
      certificationTier: upgrade ? 'certified' : 'basic',
      certDaysAtThreshold: upgrade ? 0 : newDays,
      certInspectionsPassed: upgrade ? 0 : newInspectionsPassed,
    };
  }

  if (certificationTier === 'certified') {
    const noSynthetic = day - lastSyntheticInputDay > 60;
    const atThreshold = hygiene >= 80 && noSynthetic;
    const newDays = atThreshold ? certDaysAtThreshold + 1 : 0;
    const upgrade = newDays >= 60 && newInspectionsPassed >= 2;
    return {
      certificationTier: upgrade ? 'organic' : 'certified',
      certDaysAtThreshold: upgrade ? 0 : newDays,
      certInspectionsPassed: upgrade ? 0 : newInspectionsPassed,
    };
  }

  // Already organic — maintain or drop back if hygiene falls for 7+ days
  const noSynthetic = day - lastSyntheticInputDay > 60;
  const maintaining = hygiene >= 80 && noSynthetic;
  const newDays = maintaining ? certDaysAtThreshold : certDaysAtThreshold - 1;
  const drop = newDays <= -7;
  return {
    certificationTier: drop ? 'certified' : 'organic',
    certDaysAtThreshold: drop ? 0 : newDays,
    certInspectionsPassed: newInspectionsPassed,
  };
}

// ── Season key helper (used for deep clean tracking) ─────────────────────

export function seasonKey(day: number): string {
  const year = Math.floor((day - 1) / 360) + 1;
  const dayOfYear = ((day - 1) % 360) + 1;
  if (dayOfYear <= 90)  return `spring_${year}`;
  if (dayOfYear <= 180) return `summer_${year}`;
  if (dayOfYear <= 270) return `autumn_${year}`;
  return `winter_${year}`;
}
