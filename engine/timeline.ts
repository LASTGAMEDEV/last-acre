// engine/timeline.ts
import { HistoricalEvent, EventEffect } from '../data/historicalEvents';
import { isoDateToGameDay } from './calendarUtils';

export type ActiveHistoricalEvent = {
  eventId: string;
  triggerDay: number;
  /** Current phase in the event lifecycle. */
  phase: 'rampUp' | 'peak' | 'rampDown';
  /** Days elapsed in the current phase. */
  daysInPhase: number;
};

export type TimelineState = {
  /** Game days of events that have already fired — prevents re-firing. */
  firedEventIds: string[];
  /** Events currently applying effects to the game world. */
  activeHistoricalEvents: ActiveHistoricalEvent[];
  /**
   * Current combined multipliers per target.
   * e.g. { fuel_cost: 1.4, wheat_price: 0.72 }
   * A multiplier of 1.0 means no change.
   */
  effectMultipliers: Record<string, number>;
  /**
   * Product/engine/mechanic IDs that are now historically available.
   * Populated by UnlockGate entries in fired events.
   */
  unlockedIds: string[];
  /**
   * Event queued for display to the player. Set when an event fires.
   * The UI clears this after showing the modal/toast.
   */
  pendingDisplayEvent: HistoricalEvent | null;
};

export const INITIAL_TIMELINE_STATE: TimelineState = {
  firedEventIds: [],
  activeHistoricalEvents: [],
  effectMultipliers: {},
  unlockedIds: [],
  pendingDisplayEvent: null,
};

/** Returns events that should fire on the given game day. */
export function getEventsToFire(
  currentDay: number,
  firedEventIds: string[],
  allEvents: HistoricalEvent[]
): HistoricalEvent[] {
  return allEvents.filter(event => {
    const triggerDay = isoDateToGameDay(event.date);
    return triggerDay === currentDay && !firedEventIds.includes(event.id);
  });
}

/**
 * Computes the current multiplier contribution for one active event,
 * based on its lifecycle phase and days elapsed in that phase.
 */
function computeEventMultipliers(
  event: HistoricalEvent,
  active: ActiveHistoricalEvent
): Record<string, number> {
  let progress = 0;

  if (active.phase === 'rampUp') {
    progress = event.rampUpDays > 0
      ? Math.min(1, active.daysInPhase / event.rampUpDays)
      : 1;
  } else if (active.phase === 'peak') {
    progress = 1;
  } else if (active.phase === 'rampDown') {
    progress = event.rampDownDays > 0
      ? Math.max(0, 1 - active.daysInPhase / event.rampDownDays)
      : 0;
  }

  const result: Record<string, number> = {};
  for (const effect of event.effects) {
    if (effect.multiplier !== undefined) {
      // Interpolate from 1.0 (no change) to the peak multiplier
      result[effect.target] = 1 + (effect.multiplier - 1) * progress;
    }
  }
  return result;
}

/**
 * Combines multipliers from all active events for a given target.
 * Multipliers stack multiplicatively.
 */
export function computeCombinedMultipliers(
  activeEvents: ActiveHistoricalEvent[],
  allEvents: HistoricalEvent[]
): Record<string, number> {
  const combined: Record<string, number> = {};

  for (const active of activeEvents) {
    const event = allEvents.find(e => e.id === active.eventId);
    if (!event) continue;
    const multipliers = computeEventMultipliers(event, active);
    for (const [target, mult] of Object.entries(multipliers)) {
      combined[target] = (combined[target] ?? 1) * mult;
    }
  }

  return combined;
}

/**
 * Advances the lifecycle of all active events by one day.
 * Returns the updated active events list and any that have completed.
 */
function advanceActiveEvents(
  activeEvents: ActiveHistoricalEvent[],
  allEvents: HistoricalEvent[]
): { updated: ActiveHistoricalEvent[]; completed: string[] } {
  const updated: ActiveHistoricalEvent[] = [];
  const completed: string[] = [];

  for (const active of activeEvents) {
    const event = allEvents.find(e => e.id === active.eventId);
    if (!event) continue;

    let { phase, daysInPhase } = active;
    daysInPhase += 1;

    if (phase === 'rampUp' && daysInPhase >= event.rampUpDays) {
      phase = 'peak';
      daysInPhase = 0;
    } else if (phase === 'peak' && daysInPhase >= event.peakDays) {
      if (event.rampDownDays === 0) {
        // Permanent change — stays in peak forever
        updated.push({ ...active, phase, daysInPhase });
        continue;
      }
      phase = 'rampDown';
      daysInPhase = 0;
    } else if (phase === 'rampDown' && daysInPhase >= event.rampDownDays) {
      completed.push(active.eventId);
      continue;
    }

    updated.push({ ...active, phase, daysInPhase });
  }

  return { updated, completed };
}

/**
 * Main per-day update function. Call from advanceDay in useGameStore.
 * Returns the new TimelineState.
 */
export function advanceTimeline(
  state: TimelineState,
  currentDay: number,
  allEvents: HistoricalEvent[]
): TimelineState {
  // 1. Find events that fire today
  const toFire = getEventsToFire(currentDay, state.firedEventIds, allEvents);

  // 2. Activate them
  const newActive: ActiveHistoricalEvent[] = toFire.map(event => ({
    eventId: event.id,
    triggerDay: currentDay,
    phase: event.rampUpDays > 0 ? 'rampUp' : 'peak',
    daysInPhase: 0,
  }));

  // 3. Collect new unlocks
  const newUnlocks = toFire.flatMap(e => (e.unlocks ?? []).map(u => u.id));

  // 4. Advance existing active events
  const { updated, completed: _ } = advanceActiveEvents(
    [...state.activeHistoricalEvents, ...newActive],
    allEvents
  );

  // 5. Recompute combined multipliers
  const effectMultipliers = computeCombinedMultipliers(updated, allEvents);

  // 6. Queue the most recent major event for display (if any fired today)
  const majorToday = toFire.find(e => e.tier === 'major');
  const minorToday = toFire.find(e => e.tier === 'minor');
  const pendingDisplayEvent = majorToday ?? minorToday ?? state.pendingDisplayEvent;

  return {
    firedEventIds: [...state.firedEventIds, ...toFire.map(e => e.id)],
    activeHistoricalEvents: updated,
    effectMultipliers,
    unlockedIds: [...new Set([...state.unlockedIds, ...newUnlocks])],
    pendingDisplayEvent,
  };
}

/**
 * Returns the current multiplier for a given target.
 * Returns 1.0 if no events are affecting this target.
 */
export function getTimelineMultiplier(
  state: TimelineState,
  target: string
): number {
  return state.effectMultipliers[target] ?? 1;
}

/**
 * Returns true if a product/engine/mechanic ID has been historically unlocked.
 */
export function isHistoricallyUnlocked(state: TimelineState, id: string): boolean {
  return state.unlockedIds.includes(id);
}

/** Clears the pending display event after the UI has shown it. */
export function clearPendingDisplayEvent(state: TimelineState): TimelineState {
  return { ...state, pendingDisplayEvent: null };
}
