import type { FinalizeGameTick, FinalizeTickContext, GameTick, TickContext } from './tickContext';

export function runTickPipeline(initialContext: TickContext, ticks: GameTick[]): TickContext {
  return ticks.reduce((ctx, tick) => tick(ctx), initialContext);
}

export function runFinalTick(
  context: TickContext,
  set: FinalizeTickContext['set'],
  finalizeTick: FinalizeGameTick,
): FinalizeTickContext {
  return finalizeTick({
    ...context,
    set,
  });
}
