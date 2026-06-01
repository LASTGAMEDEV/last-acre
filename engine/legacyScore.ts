import { AncestorRecord, Farmer } from './dynasty';

export function annualLegacyDelta(farmStats: {
  ownedHectares: number;
  hasDebt: boolean;
  knowledgeBankSize: number;
}): number {
  let delta = Math.floor(farmStats.ownedHectares / 10);
  if (!farmStats.hasDebt) delta += 5;
  delta += farmStats.knowledgeBankSize * 2;
  return delta;
}

export function handoffLegacyContribution(
  farmer: Farmer,
  startYear: number,
  endYear: number,
  farmStats: {
    ownedHectares: number;
    hasDebt: boolean;
  }
): number {
  const yearsServed = Math.max(0, endYear - startYear);
  let score = yearsServed * 3;
  score += Math.floor(farmStats.ownedHectares / 5);
  score += farmer.unlockedKnowledge.length * 10;
  if (!farmStats.hasDebt) score += 20;
  return score;
}

export function computeTotalLegacy(ancestors: AncestorRecord[]): number {
  return ancestors.reduce((sum, ancestor) => sum + ancestor.legacyContribution, 0);
}
