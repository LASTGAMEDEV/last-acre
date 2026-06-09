// features/reputation/reputationTick.ts

import type { GameTick } from '../../simulation/tickContext';
import { getTickState, patchTickState } from '../../simulation/tickContext';
import { advanceReputationWeek } from './reputationEngine';

export const reputationTick: GameTick = (ctx) => {
  if (ctx.newDay % 7 !== 0) return ctx;

  const state = getTickState(ctx);

  const animals      = (state.animals ?? []) as any[];
  const parcels      = (state.parcels ?? []) as any[];
  const loans        = (state.loans   ?? []) as any[];
  const owned        = parcels.filter((p: any) => p.owned);
  const totalHa      = owned.reduce((s: number, p: any) => s + (p.hectares ?? 0), 0);
  const organicHa    = owned.filter((p: any) => p.organicStatus === 'organic').reduce((s: number, p: any) => s + (p.hectares ?? 0), 0);
  const storage      = (state as any).storageItems ?? [];
  const totalDebt    = loans.filter((l: any) => !l.paid).reduce((s: number, l: any) => s + (l.amount ?? 0), 0);
  const annualIncome = totalHa * 40;

  // NOTE: state.reputation is currently typed as `number` in GameState (line 123 of gameState.ts).
  // Task 9 will change it to ReputationState. Until then, this line will produce a TS error.
  const newReputation = advanceReputationWeek(state.reputation, {
    avgAnimalHealth:        animals.length > 0 ? animals.reduce((s: number, a: any) => s + (a.health ?? 80), 0) / animals.length : 100,
    organicHectareFraction: totalHa > 0 ? organicHa / totalHa : 0,
    hasHedgerows:           ((state as any).hedgerows?.length ?? 0) > 0,
    hasComposting:          ((state as any).compostPiles?.length ?? 0) > 0,
    avgStorageQuality:      storage.length > 0 ? storage.reduce((s: number, i: any) => s + (i.quality ?? 80), 0) / storage.length : 100,
    hasUnresolvedDefault:   loans.some((l: any) => l.defaulted && !l.paid),
    debtToIncomeRatio:      annualIncome > 0 ? totalDebt / annualIncome : 0,
    survivedCrisis:         !(state as any).bankrupt,
    communityStandingDelta: state.reputation.communityStandingDelta,
  });

  return patchTickState(ctx, { reputation: newReputation });
};
