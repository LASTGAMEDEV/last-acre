// features/family/familyTick.ts
// NOTE: No store imports — pure tick module per architecture rules.

import type { GameTick } from '../../simulation/tickContext';
import { getTickState, patchTickState } from '../../simulation/tickContext';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { advanceFamilyDay, maybeGenerateFrictionEvent } from './familyEngine';

export const familyTick: GameTick = (ctx) => {
  const state       = getTickState(ctx);
  // NOTE: state.family and state.dynasty.pendingHandoff are pre-Task-9 fields.
  // TypeScript will error until GameState is extended in Task 9.
  const calYear     = gameDayToCalendarYear(ctx.newDay);
  const prevCalYear = gameDayToCalendarYear(ctx.newDay - 1);
  const isNewYear   = calYear > prevCalYear;

  const { family: newFamily } = advanceFamilyDay(
    state.family,
    ctx.newDay,
    calYear,
    prevCalYear,
    state.dynasty.currentFarmer.birthYear,
    state.dynasty.pendingHandoff,
    Math.random()
  );

  let familyFinal = newFamily;
  if (isNewYear && newFamily.coOwner) {
    const { family: withFriction } = maybeGenerateFrictionEvent(newFamily, ctx.newDay, calYear);
    familyFinal = withFriction;
  }

  return patchTickState(ctx, { family: familyFinal });
};
