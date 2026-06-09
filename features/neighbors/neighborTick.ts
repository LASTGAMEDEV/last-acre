// features/neighbors/neighborTick.ts

import type { GameTick } from '../../simulation/tickContext';
import { getTickState, patchTickState } from '../../simulation/tickContext';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';
import { advanceNeighborYear } from './neighborEngine';

export const neighborTick: GameTick = (ctx) => {
  const calYear     = gameDayToCalendarYear(ctx.newDay);
  const prevCalYear = gameDayToCalendarYear(ctx.newDay - 1);
  if (calYear === prevCalYear) return ctx;

  const state = getTickState(ctx);

  const { neighbors: newNeighbors, landOpportunities } = advanceNeighborYear(
    state.neighbors,
    calYear,
    state.timeline.effectMultipliers,
    state.reputation.tier
  );

  const existing = (state.pendingLandOpportunities ?? []) as typeof landOpportunities;
  const merged = [
    ...existing.filter(o => !landOpportunities.find(n => n.neighborId === o.neighborId)),
    ...landOpportunities,
  ];

  return patchTickState(ctx, { neighbors: newNeighbors, pendingLandOpportunities: merged });
};
