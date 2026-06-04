// features/reputation/reputationTypes.ts

export type ReputationTier = 'unknown' | 'local' | 'respected' | 'renowned' | 'legendary';

export type ReputationFactors = {
  animalWelfare: number;
  environmentalPractice: number;
  communityStanding: number;
  productQuality: number;
  financialReliability: number;
  historicalConduct: number;
};

export type ReputationState = {
  score: number;
  tier: ReputationTier;
  factors: ReputationFactors;
  communityStandingDelta: number;
};

export type TierEffects = {
  auctionPriceMultiplier: number;
  loanInterestMultiplier: number;
  csaAutoWaitlist: boolean;
  organicPremiumMultiplier: number;
  workersApplyProactively: boolean;
  landSellersApproach: boolean;
  legacyScoreMultiplier: number;
};

export const INITIAL_REPUTATION_STATE: ReputationState = {
  score: 0,
  tier: 'unknown',
  factors: {
    animalWelfare:         50,
    environmentalPractice: 30,
    communityStanding:     50,
    productQuality:        50,
    financialReliability:  70,
    historicalConduct:     50,
  },
  communityStandingDelta: 0,
};
