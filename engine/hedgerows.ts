export type HedgerowType = 'hdg_mixed' | 'hdg_buffer' | 'hdg_pollinator' | 'hdg_woodland';

export interface Hedgerow {
  id: string;
  type: HedgerowType;
  parcelId: string;
  edge: 'north' | 'south' | 'east' | 'west';
  lengthM: number;
  plantedDay: number;
  mature: boolean;
  neglected?: boolean;
}

export const HEDGEROW_PEST_CONTROL: Record<HedgerowType, number> = {
  hdg_mixed: 0.15,
  hdg_buffer: 0.05,
  hdg_pollinator: 0.10,
  hdg_woodland: 0.25,
};

export const HEDGEROW_MAINTENANCE: Record<HedgerowType, number> = {
  hdg_mixed: 50,
  hdg_buffer: 30,
  hdg_pollinator: 20,
  hdg_woodland: 60,
};

export const HEDGEROW_COST: Record<HedgerowType, number> = {
  hdg_mixed: 400,
  hdg_buffer: 200,
  hdg_pollinator: 150,
  hdg_woodland: 800,
};

/** Days until hedgerow becomes mature (2 years compressed) */
export const HEDGEROW_MATURITY_DAYS = 730;

export function isMature(h: Hedgerow, day: number): boolean {
  return h.mature || day >= h.plantedDay + HEDGEROW_MATURITY_DAYS;
}

export function maturityProgress(h: Hedgerow, day: number): number {
  return Math.min(1, Math.max(0, (day - h.plantedDay) / HEDGEROW_MATURITY_DAYS));
}

/** Total pest control modifier for a parcel (0–0.5 max) */
export function pestControlForParcel(
  parcelId: string,
  hedgerows: Hedgerow[],
  day: number,
): number {
  const relevant = hedgerows.filter(
    h => h.parcelId === parcelId && isMature(h, day) && !h.neglected,
  );
  const total = relevant.reduce(
    (sum, h) => sum + HEDGEROW_PEST_CONTROL[h.type],
    0,
  );
  return Math.min(0.5, total);
}

/** Whether a parcel has wind-protection on north or west edge */
export function isWindProtected(
  parcelId: string,
  hedgerows: Hedgerow[],
  day: number,
): boolean {
  return hedgerows.some(
    h =>
      h.parcelId === parcelId &&
      (h.edge === 'north' || h.edge === 'west') &&
      (h.type === 'hdg_mixed' || h.type === 'hdg_woodland') &&
      isMature(h, day) &&
      !h.neglected,
  );
}

/** Count of mature pollinator strips on a parcel */
export function pollinatorStripCount(
  parcelId: string,
  hedgerows: Hedgerow[],
  day: number,
): number {
  return hedgerows.filter(
    h =>
      h.parcelId === parcelId &&
      h.type === 'hdg_pollinator' &&
      isMature(h, day) &&
      !h.neglected,
  ).length;
}

/** Whether parcel has a buffer strip on any edge */
export function hasBufferStrip(
  parcelId: string,
  hedgerows: Hedgerow[],
): boolean {
  return hedgerows.some(
    h => h.parcelId === parcelId && h.type === 'hdg_buffer',
  );
}

/** Annual maintenance cost in € */
export function annualMaintenanceCost(hedgerows: Hedgerow[]): number {
  return hedgerows.reduce(
    (sum, h) =>
      sum + HEDGEROW_MAINTENANCE[h.type] * (h.lengthM / 100) * (h.neglected ? 0 : 1),
    0,
  );
}

/** CAP EFA unit count */
export function getEFACount(hedgerows: Hedgerow[], day: number): number {
  return hedgerows
    .filter(h => isMature(h, day))
    .reduce((sum, h) => sum + (h.type === 'hdg_pollinator' ? 2 : 1), 0);
}

/** Effective pest chance multiplier after hedgerows */
export function applyPestControl(
  baseChance: number,
  parcelId: string,
  hedgerows: Hedgerow[],
  day: number,
): number {
  const control = pestControlForParcel(parcelId, hedgerows, day);
  return baseChance * (1 - control);
}

/** Land area cost in hectares for a hedgerow */
export function hedgerowAreaHa(lengthM: number, widthM: number): number {
  return (lengthM * widthM) / 10000;
}

export const HEDGEROW_WIDTH: Record<HedgerowType, number> = {
  hdg_mixed: 3,
  hdg_buffer: 6,
  hdg_pollinator: 2,
  hdg_woodland: 5,
};
