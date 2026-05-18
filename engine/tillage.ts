export type TillageSystem = 'conventional' | 'reduced' | 'notill';

export const TILLAGE_FUEL_MULT: Record<TillageSystem, number> = {
  conventional: 2.5,
  reduced: 1.5,
  notill: 0.3,
};

export const TILLAGE_OM_DELTA: Record<TillageSystem, number> = {
  conventional: -0.002,
  reduced: 0,
  notill: 0.003,
};

export function notillWeedMult(notillSeasons: number): number {
  const curve = [1.6, 1.5, 1.4, 1.2, 1.0, 0.7];
  return curve[Math.min(notillSeasons, 5)];
}

export function notillYieldTransitionMod(notillSeasons: number): number {
  const curve = [0.92, 0.95, 0.98, 1.0];
  return curve[Math.min(notillSeasons, 3)];
}

export function conventionalWeedMult(): number {
  return 0.4;
}

export function reducedWeedMult(): number {
  return 0.8;
}

export function getWeedMult(
  tillageSystem: TillageSystem,
  notillSeasons: number,
  weedFlushSeason: boolean,
): number {
  if (weedFlushSeason) return 2.0;
  if (tillageSystem === 'notill') return notillWeedMult(notillSeasons);
  if (tillageSystem === 'reduced') return reducedWeedMult();
  return conventionalWeedMult();
}

export function getYieldTransitionMod(
  tillageSystem: TillageSystem,
  notillSeasons: number,
): number {
  if (tillageSystem === 'notill') return notillYieldTransitionMod(notillSeasons);
  return 1.0;
}

/**
 * Check if player owns required machinery for a tillage system.
 * Simplified: checks machine types owned.
 */
export function hasMachineryForTillage(
  machines: Array<{ typeId: string }>,
  tillageSystem: TillageSystem,
): boolean {
  if (tillageSystem === 'notill') {
    return machines.some(m => m.typeId === 'mach_notill_planter');
  }
  if (tillageSystem === 'reduced') {
    return machines.some(m => m.typeId === 'mach_chisel' || m.typeId === 'mach_disc');
  }
  // conventional
  return machines.some(m => m.typeId === 'mach_plow_mb');
}

/**
 * Get fallback tillage system if required machinery is missing.
 */
export function fallbackTillage(
  machines: Array<{ typeId: string }>,
  preferred: TillageSystem,
): TillageSystem {
  if (hasMachineryForTillage(machines, preferred)) return preferred;
  if (preferred === 'notill' && hasMachineryForTillage(machines, 'reduced')) return 'reduced';
  if (preferred === 'notill' && hasMachineryForTillage(machines, 'conventional')) return 'conventional';
  if (preferred === 'reduced' && hasMachineryForTillage(machines, 'conventional')) return 'conventional';
  return 'conventional';
}
