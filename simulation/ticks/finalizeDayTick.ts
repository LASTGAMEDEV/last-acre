import type { FinalizeGameTick } from '../tickContext';

export const finalizeDayTick: FinalizeGameTick = (ctx) => {
  ctx.set(ctx.pendingState);
  return ctx;
};
