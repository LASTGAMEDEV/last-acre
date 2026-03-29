import { AnimalType } from '../data/animalTypes';

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

export function collectProduction(
  animal: OwnedAnimal,
  animalType: AnimalType,
  currentDay: number,
): { units: number; nextDay: number } {
  // Sick animals don't produce
  if (animal.sick) return { units: 0, nextDay: animal.lastProductionDay };
  // Males don't produce eggs or milk (they do produce meat/wool/honey — handled at sell time)
  const femaleOnly = animalType.productionType === 'eggs' || animalType.productionType === 'milk';
  if (femaleOnly && animal.sex === 'male') {
    return { units: 0, nextDay: animal.lastProductionDay };
  }
  if (!isMature(animal, animalType, currentDay) || animalType.productionRate === 0) {
    return { units: 0, nextDay: animal.lastProductionDay };
  }
  const daysPassed = currentDay - animal.lastProductionDay;
  // Aging: production declines after maxPriceAge, bottoming out at 20%
  const age = currentDay - animal.bornDay;
  const ageMod = age <= animalType.maxPriceAge
    ? 1.0
    : Math.max(0.2, 1.0 - ((age - animalType.maxPriceAge) / animalType.maxPriceAge) * 0.8);
  const productiveMod = (animal.traits ?? []).includes('productive') ? 1.20 : 1.0;
  return { units: daysPassed * animalType.productionRate * ageMod * productiveMod, nextDay: currentDay };
}

export function canBreed(animal: OwnedAnimal, animalType: AnimalType, currentDay: number): boolean {
  if (!isMature(animal, animalType, currentDay)) return false;
  if (animalType.breedingDays === 0) return false;
  return currentDay - animal.lastBreedDay >= animalType.breedingDays;
}

/** Pick one random trait from a parent, or null if the parent has no traits. */
export function inheritTrait(parent: OwnedAnimal): AnimalTrait | null {
  const traits = parent.traits ?? [];
  if (traits.length === 0) return null;
  return traits[Math.floor(Math.random() * traits.length)];
}
