import { RANDOM_EVENT_TEMPLATES, GameEventTemplate, GameEventType } from '../data/randomEvents';
import { MACHINE_TYPES } from '../data/machineTypes';

// Minimal interfaces needed — avoid circular import from store
export interface ActiveEvent {
  type: GameEventType;
  affectedIds?: string[];
  modifier?: number;
}

export interface RepairWorker {
  typeId: string;
}

export interface RepairableMachine {
  id: string;
  typeId: string;
}

/**
 * Roll for a new random event. Returns null if no event fires.
 * Avoids creating a duplicate of an already-active event type.
 */
export function rollEvent(
  activeEventTypes: GameEventType[],
): GameEventTemplate | null {
  if (Math.random() >= 0.08) return null;
  const activeSet = new Set(activeEventTypes);
  const available = RANDOM_EVENT_TEMPLATES.filter(t => !activeSet.has(t.type));
  if (available.length === 0) return null;
  const totalWeight = available.reduce((s, t) => s + t.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const t of available) {
    rand -= t.weight;
    if (rand <= 0) return t;
  }
  return available[available.length - 1];
}

/**
 * Compute the harvest yield multiplier from active events for a given parcel + crop.
 * Returns 1.0 if no active events affect this harvest.
 */
export function getHarvestModifier(
  activeEvents: ActiveEvent[],
  parcelId: string,
  cropId: string,
): number {
  let mod = 1.0;
  for (const e of activeEvents) {
    if (
      (e.type === 'weather_frost' || e.type === 'weather_hailstorm' || e.type === 'weather_heatwave') &&
      e.affectedIds?.includes(parcelId)
    ) {
      mod *= e.modifier ?? 0.5;
    }
    if (e.type === 'pest_outbreak' && e.affectedIds?.[0] === cropId) {
      mod *= 0.5;
    }
    if (
      (e.type === 'windfall_soil' || e.type === 'windfall_harvest') &&
      e.modifier && e.modifier > 1
    ) {
      mod *= e.modifier;
    }
  }
  return mod;
}

/**
 * Compute the production multiplier for an animal from active illness events.
 * Returns 0.0 if the animal is targeted by an illness event, 1.0 otherwise.
 */
export function getProductionModifier(
  activeEvents: ActiveEvent[],
  animalId: string,
): number {
  for (const e of activeEvents) {
    if (e.type === 'animal_illness' && e.affectedIds?.includes(animalId)) {
      return 0.0;
    }
  }
  return 1.0;
}

/**
 * Repair cost = 25% of the machine's purchase cost.
 */
export function calcRepairCost(machine: RepairableMachine): number {
  const t = MACHINE_TYPES.find(mt => mt.id === machine.typeId);
  return Math.round((t?.cost ?? 5000) * 0.25);
}

/**
 * Repair duration in days based on worker availability.
 * engineer → 2 days · mechanic → 3 days · no mechanic → 5 days
 */
export function calcRepairDays(workers: RepairWorker[]): number {
  if (workers.some(w => w.typeId === 'engineer')) return 2;
  if (workers.some(w => w.typeId === 'mechanic')) return 3;
  return 5;
}
