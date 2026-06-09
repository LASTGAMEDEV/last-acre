import type { GameSet } from '../store/actions/types';
import type { GameState } from '../types/domain/gameState';
import type { DaySummaryEvent } from '../types/domain/uiEvents';

export type PendingGameState = Partial<GameState>;

export interface TickContext {
  previousState: GameState;
  pendingState: PendingGameState;
  newDay: number;
  summary: DaySummaryEvent[];
}

export interface FinalizeTickContext extends TickContext {
  set: GameSet;
}

export type GameTick = (ctx: TickContext) => TickContext;
export type FinalizeGameTick = (ctx: FinalizeTickContext) => FinalizeTickContext;

export function getTickState(ctx: TickContext): GameState {
  return {
    ...ctx.previousState,
    ...ctx.pendingState,
  };
}

export function patchTickState(ctx: TickContext, patch: PendingGameState): TickContext {
  return {
    ...ctx,
    pendingState: {
      ...ctx.pendingState,
      ...patch,
    },
  };
}
