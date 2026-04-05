import { AnimalType } from '../data/animalTypes';

export const GRAIN_CROP_IDS = ['wheat', 'corn', 'barley', 'oats', 'sorghum'];

export type AnimalTrait = 'productive' | 'hardy' | 'beefy' | 'fast_maturing';

export const TRAIT_LABELS: Record<AnimalTrait, string> = {
  productive:    'Productive',
  hardy:         'Hardy',
  beefy:         'Beefy',
  fast_maturing: 'Fast Maturing',
};

export const TRAIT_ICONS: Record<AnimalTrait, string> = {
  productive:    '🥚',
  hardy:         '💪',
  beefy:         '💰',
  fast_maturing: '⚡',
};

export const TRAIT_DESC: Record<AnimalTrait, string> = {
  productive:    '+20% production',
  hardy:         '-60% sick chance',
  beefy:         '+25% sell value',
  fast_maturing: '-25% maturity time',
};

// ─── Genetics ──────────────────────────────────────────────────────────────
// Four numeric genes, each ranging 0.5 (poor) → 1.5 (excellent).
// They stack multiplicatively with existing trait bonuses.

export interface AnimalGenes {
  production: number; // multiplies daily yield
  hardiness:  number; // divides sick chance
  growth:     number; // divides maturity days (higher = faster)
  value:      number; // multiplies sell price
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

/** Random genes for a newly purchased animal — centered around 1.0, range ~0.7–1.3. */
export function randomGenes(): AnimalGenes {
  const r = () => clamp(1.0 + (Math.random() - 0.5) * 0.6, 0.5, 1.5);
  return { production: r(), hardiness: r(), growth: r(), value: r() };
}

/** Offspring genes = average of both parents + small random mutation. */
export function breedGenes(
  mother: AnimalGenes | undefined,
  father: AnimalGenes | undefined,
): AnimalGenes {
  const m = mother ?? randomGenes();
  const f = father ?? randomGenes();
  const mutate = (a: number, b: number) =>
    clamp((a + b) / 2 + (Math.random() - 0.5) * 0.12, 0.5, 1.5);
  return {
    production: mutate(m.production, f.production),
    hardiness:  mutate(m.hardiness,  f.hardiness),
    growth:     mutate(m.growth,     f.growth),
    value:      mutate(m.value,      f.value),
  };
}

/** Average of all four genes — used for grading. */
export function geneScore(genes: AnimalGenes): number {
  return (genes.production + genes.hardiness + genes.growth + genes.value) / 4;
}

// ───────────────────────────────────────────────────────────────────────────

export interface OwnedAnimal {
  id: string;
  typeId: string;
  sex: 'male' | 'female';
  bornDay: number;
  lastProductionDay: number;
  lastBreedDay: number;
  sick: boolean;
  sicknessDay?: number;
  traits?: AnimalTrait[]; // undefined on old saves → treated as []
  genes?: AnimalGenes;    // undefined on old saves → use 1.0 defaults
  parentIds?: [string, string];                      // [motherId, fatherId]
  grandparentIds?: [string, string, string, string]; // [MM, MF, FM, FF]
  lactationStartDay?: number;  // day she last gave birth (cows & goats only)
}

/** Effective maturity days accounting for fast_maturing trait and growth gene. */
export function effectiveMaturityDays(animal: OwnedAnimal, animalType: AnimalType): number {
  const fastMod  = (animal.traits ?? []).includes('fast_maturing') ? 0.75 : 1.0;
  const growthMod = animal.genes ? 1 / animal.genes.growth : 1.0;
  return animalType.maturityDays * fastMod * growthMod;
}

export function isMature(animal: OwnedAnimal, animalType: AnimalType, currentDay: number): boolean {
  return currentDay - animal.bornDay >= effectiveMaturityDays(animal, animalType);
}

export function sellValue(animal: OwnedAnimal, animalType: AnimalType, currentDay: number): number {
  const age = currentDay - animal.bornDay;
  const base = animalType.maxSellPrice * Math.min(1, age / animalType.maxPriceAge);
  const beefyMod = (animal.traits ?? []).includes('beefy') ? 1.25 : 1.0;
  const geneMod  = animal.genes?.value ?? 1.0;
  return base * beefyMod * geneMod;
}

// ─── Lactation ─────────────────────────────────────────────────────────────

export const LACTATION_PARAMS: Record<string, { lactatingDays: number; dryDays: number; breedAfterDryDay: number }> = {
  vaca:   { lactatingDays: 305, dryDays: 60,  breedAfterDryDay: 30 },
  cabra:  { lactatingDays: 200, dryDays: 45,  breedAfterDryDay: 20 },
  bufalo: { lactatingDays: 270, dryDays: 60,  breedAfterDryDay: 30 },
};

/** Returns 'lactating', 'dry', or 'none' (non-dairy species). */
export function getLactationState(
  animal: OwnedAnimal,
  typeId: string,
  currentDay: number,
): 'lactating' | 'dry' | 'none' {
  const params = LACTATION_PARAMS[typeId];
  if (!params) return 'none';
  if (!animal.lactationStartDay) return 'dry'; // never freshened
  const daysSince = currentDay - animal.lactationStartDay;
  if (daysSince < params.lactatingDays) return 'lactating';
  return 'dry';
}

/** Days remaining in current lactation window (0 if dry or non-dairy). */
export function lactationDaysRemaining(
  animal: OwnedAnimal,
  typeId: string,
  currentDay: number,
): number {
  const params = LACTATION_PARAMS[typeId];
  if (!params || !animal.lactationStartDay) return 0;
  const daysSince = currentDay - animal.lactationStartDay;
  return Math.max(0, params.lactatingDays - daysSince);
}

/** Days remaining in current dry period (0 if lactating or non-dairy). */
export function dryDaysRemaining(
  animal: OwnedAnimal,
  typeId: string,
  currentDay: number,
): number {
  const params = LACTATION_PARAMS[typeId];
  if (!params || !animal.lactationStartDay) return 0;
  const daysSince = currentDay - animal.lactationStartDay;
  if (daysSince < params.lactatingDays) return 0;
  const dryDaysSoFar = daysSince - params.lactatingDays;
  return Math.max(0, params.dryDays - dryDaysSoFar);
}

export function canBreed(animal: OwnedAnimal, animalType: AnimalType, currentDay: number): boolean {
  if (!isMature(animal, animalType, currentDay)) return false;
  if (animalType.breedingDays === 0) return false;

  const params = LACTATION_PARAMS[animalType.id];
  if (params) {
    // Dairy animals: can only breed during dry period, after min dry days
    if (!animal.lactationStartDay) {
      // Never freshened — allow first breed using existing breedingDays cooldown
      return currentDay - animal.lastBreedDay >= animalType.breedingDays;
    }
    const daysSince = currentDay - animal.lactationStartDay;
    if (daysSince < params.lactatingDays) return false; // still lactating
    const dryDaysPassed = daysSince - params.lactatingDays;
    return dryDaysPassed >= params.breedAfterDryDay;
  }

  // Non-dairy: original logic
  return currentDay - animal.lastBreedDay >= animalType.breedingDays;
}

// ─── Seasonal production multipliers ───────────────────────────────────────
// Index: [spring=0, summer=1, autumn=2, winter=3]

const SEASONAL_MULTIPLIERS: Record<string, [number, number, number, number]> = {
  gallina:  [1.15, 1.00, 0.85, 0.65],
  codorniz: [1.15, 1.00, 0.85, 0.65],
  pato:     [1.10, 1.00, 0.90, 0.70],
  pavo:     [1.00, 1.00, 1.10, 0.80],
  vaca:     [1.15, 0.95, 0.90, 0.80],
  bufalo:   [1.15, 0.95, 0.90, 0.80],
  cabra:    [1.20, 1.00, 0.85, 0.75],
  oveja:    [1.20, 1.00, 0.85, 0.75],
  alpaca:   [1.20, 1.00, 0.85, 0.75],
  cerdo:    [1.00, 1.00, 1.05, 0.90],
  conejo:   [1.00, 1.00, 1.05, 0.90],
  caballo:  [1.00, 1.00, 1.00, 1.00],
  abeja:    [1.20, 1.40, 0.30, 0.00],
};

/** Returns the seasonal production multiplier for a given animal and game day. */
export function getSeasonMultiplier(typeId: string, currentDay: number): number {
  const dayOfYear = (currentDay - 1) % 365;
  const idx = dayOfYear < 90 ? 0 : dayOfYear < 180 ? 1 : dayOfYear < 270 ? 2 : 3;
  return SEASONAL_MULTIPLIERS[typeId]?.[idx] ?? 1.0;
}

// ─── Feed penalty ───────────────────────────────────────────────────────────

/**
 * Returns a production multiplier based on how many of the last 7 days feed was missed.
 *   0–1 missed → ×1.0 (≥ 86% fed, above the 80% threshold)
 *   2–3 missed → ×0.7 (50–79% fed range)
 *   4–7 missed → ×0.4 (< 50% fed)
 */
export function getFeedPenalty(missedDays: number): number {
  const clamped = Math.min(7, Math.max(0, missedDays));
  if (clamped <= 1) return 1.0;
  if (clamped <= 3) return 0.7;
  return 0.4;
}

/**
 * Returns feed needed (kg) per simulated day for the given animals.
 * Returns separate totals for grain, hay, and the pig-specific grain portion
 * (pigs can substitute other crops for their grain share).
 */
export function computeFeedNeeded(
  animals: OwnedAnimal[],
  animalTypes: AnimalType[],
  currentDay: number,
  isWinter: boolean,
): { grainKg: number; hayKg: number; pigGrainKg: number } {
  const winterMult = isWinter ? 1.15 : 1.0;
  let grainKg = 0;
  let hayKg = 0;
  let pigGrainKg = 0;

  for (const animal of animals) {
    const type = animalTypes.find(t => t.id === animal.typeId);
    if (!type || !type.feedType) continue;
    const matFactor = isMature(animal, type, currentDay) ? 1.0 : 0.5;
    const daily = type.feedKgPerDay * matFactor * winterMult;
    if (type.feedType === 'grain') {
      grainKg += daily;
      if (type.id === 'cerdo') pigGrainKg += daily;
    } else if (type.feedType === 'hay') {
      hayKg += daily;
    }
  }
  return { grainKg, hayKg, pigGrainKg };
}

export function collectProduction(
  animal: OwnedAnimal,
  animalType: AnimalType,
  currentDay: number,
  grainMissedDays = 0,
  hayMissedDays = 0,
): { units: number; nextDay: number } {
  if (animal.sick) return { units: 0, nextDay: animal.lastProductionDay };

  const femaleOnly = animalType.productionType === 'eggs' || animalType.productionType === 'milk';
  if (femaleOnly && animal.sex === 'male') {
    return { units: 0, nextDay: animal.lastProductionDay };
  }

  if (!isMature(animal, animalType, currentDay) || animalType.productionRate === 0) {
    return { units: 0, nextDay: animal.lastProductionDay };
  }

  // Lactation gate: dairy animals produce zero milk outside lactation window
  if (animalType.productionType === 'milk') {
    const lactState = getLactationState(animal, animalType.id, currentDay);
    if (lactState !== 'lactating') return { units: 0, nextDay: currentDay };
  }

  const daysPassed = currentDay - animal.lastProductionDay;

  // Age decay
  const age = currentDay - animal.bornDay;
  const ageMod = age <= animalType.maxPriceAge
    ? 1.0
    : Math.max(0.2, 1.0 - ((age - animalType.maxPriceAge) / animalType.maxPriceAge) * 0.8);

  const productiveMod = (animal.traits ?? []).includes('productive') ? 1.20 : 1.0;
  const geneProdMod = animal.genes?.production ?? 1.0;

  // Feed penalty (bees: feedType null → no penalty)
  const missedDaysForType = animalType.feedType === 'hay' ? hayMissedDays
    : animalType.feedType === 'grain' ? grainMissedDays
    : 0;
  const feedMod = getFeedPenalty(missedDaysForType);

  // Seasonal multiplier
  const seasonMod = getSeasonMultiplier(animalType.id, currentDay);

  return {
    units: daysPassed * animalType.productionRate * ageMod * productiveMod * geneProdMod * feedMod * seasonMod,
    nextDay: currentDay,
  };
}

/** Pick one random trait from a parent, or null if the parent has no traits. */
export function inheritTrait(parent: OwnedAnimal): AnimalTrait | null {
  const traits = parent.traits ?? [];
  if (traits.length === 0) return null;
  return traits[Math.floor(Math.random() * traits.length)];
}
