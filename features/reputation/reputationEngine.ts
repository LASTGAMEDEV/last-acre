// features/reputation/reputationEngine.ts
// Pure functions only. No Zustand imports.

import { ReputationState, ReputationTier, ReputationFactors, TierEffects } from './reputationTypes';

export type ReputationInputs = {
  avgAnimalHealth: number;
  organicHectareFraction: number;
  hasHedgerows: boolean;
  hasComposting: boolean;
  avgStorageQuality: number;
  hasUnresolvedDefault: boolean;
  debtToIncomeRatio: number;
  survivedCrisis: boolean;
  communityStandingDelta: number;
};

const TIER_THRESHOLDS: { tier: ReputationTier; min: number }[] = [
  { tier: 'legendary',  min: 80 },
  { tier: 'renowned',   min: 60 },
  { tier: 'respected',  min: 40 },
  { tier: 'local',      min: 20 },
  { tier: 'unknown',    min: 0  },
];

export function scoreToTier(score: number): ReputationTier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return 'unknown';
}

const WEIGHTS = {
  animalWelfare:         0.15,
  environmentalPractice: 0.20,
  communityStanding:     0.20,
  productQuality:        0.20,
  financialReliability:  0.15,
  historicalConduct:     0.10,
};

export function advanceReputationWeek(
  reputation: ReputationState,
  inputs: ReputationInputs
): ReputationState {
  const newCommunity = Math.max(0, Math.min(100,
    reputation.factors.communityStanding + inputs.communityStandingDelta
  ));

  const financial = inputs.hasUnresolvedDefault
    ? Math.max(0, 40 - inputs.debtToIncomeRatio * 5)
    : inputs.debtToIncomeRatio > 5 ? 30
    : inputs.debtToIncomeRatio > 3 ? 50
    : inputs.debtToIncomeRatio > 1 ? 70
    : 90;

  const newFactors: ReputationFactors = {
    animalWelfare:         Math.max(0, Math.min(100, inputs.avgAnimalHealth)),
    environmentalPractice: Math.min(100, inputs.organicHectareFraction * 60 + (inputs.hasHedgerows ? 20 : 0) + (inputs.hasComposting ? 20 : 0)),
    communityStanding:     newCommunity,
    productQuality:        Math.max(0, Math.min(100, inputs.avgStorageQuality)),
    financialReliability:  financial,
    historicalConduct:     inputs.survivedCrisis
      ? Math.min(100, reputation.factors.historicalConduct + 5)
      : reputation.factors.historicalConduct,
  };

  const rawScore =
    newFactors.animalWelfare         * WEIGHTS.animalWelfare +
    newFactors.environmentalPractice * WEIGHTS.environmentalPractice +
    newFactors.communityStanding     * WEIGHTS.communityStanding +
    newFactors.productQuality        * WEIGHTS.productQuality +
    newFactors.financialReliability  * WEIGHTS.financialReliability +
    newFactors.historicalConduct     * WEIGHTS.historicalConduct;

  const delta    = Math.max(-3, Math.min(3, rawScore - reputation.score));
  const newScore = Math.max(0, Math.min(100, reputation.score + delta));

  return { score: newScore, tier: scoreToTier(newScore), factors: newFactors, communityStandingDelta: 0 };
}

export function addCommunityStandingDelta(rep: ReputationState, delta: number): ReputationState {
  return { ...rep, communityStandingDelta: rep.communityStandingDelta + delta };
}

export function getTierEffects(tier: ReputationTier): TierEffects {
  switch (tier) {
    case 'legendary':  return { auctionPriceMultiplier: 1.2,  loanInterestMultiplier: 0.85, csaAutoWaitlist: true,  organicPremiumMultiplier: 1.2,  workersApplyProactively: true,  landSellersApproach: true,  legacyScoreMultiplier: 1.5 };
    case 'renowned':   return { auctionPriceMultiplier: 1.1,  loanInterestMultiplier: 0.92, csaAutoWaitlist: true,  organicPremiumMultiplier: 1.15, workersApplyProactively: true,  landSellersApproach: false, legacyScoreMultiplier: 1.0 };
    case 'respected':  return { auctionPriceMultiplier: 1.05, loanInterestMultiplier: 0.99, csaAutoWaitlist: false, organicPremiumMultiplier: 1.0,  workersApplyProactively: true,  landSellersApproach: false, legacyScoreMultiplier: 1.0 };
    case 'local':      return { auctionPriceMultiplier: 1.05, loanInterestMultiplier: 1.0,  csaAutoWaitlist: false, organicPremiumMultiplier: 1.0,  workersApplyProactively: false, landSellersApproach: false, legacyScoreMultiplier: 1.0 };
    default:           return { auctionPriceMultiplier: 1.0,  loanInterestMultiplier: 1.0,  csaAutoWaitlist: false, organicPremiumMultiplier: 1.0,  workersApplyProactively: false, landSellersApproach: false, legacyScoreMultiplier: 1.0 };
  }
}
