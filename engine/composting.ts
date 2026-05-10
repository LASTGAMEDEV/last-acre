export interface CompostBatch {
  id: string;
  startDay: number;
  manureKg: number;
  residueKg: number;
  cnRatio: number;
  moistureLevel: number;
  turnings: number;
  lastTurnedDay: number;
  maturationDay: number;
  moistureEvents: number;
  status: 'active' | 'ready' | 'collected';
}

export function computeCNRatio(manureKg: number, residueKg: number, avgManureCN: number): number {
  const total = manureKg + residueKg;
  if (total <= 0) return 25;
  return (residueKg * 65 + manureKg * avgManureCN) / total;
}

export function computeMaturationDay(
  startDay: number,
  turnings: number,
  moistureEvents: number,
): number {
  const baseDays = 45;
  const moisturePenalty = Math.min(20, moistureEvents * 2);
  return startDay + baseDays - (turnings * 5) + moisturePenalty;
}

export function computeCompostQuality(batch: CompostBatch): number {
  const cnPenalty = Math.min(40, Math.abs(batch.cnRatio - 25) * 3);
  const moisturePenalty = Math.min(30, batch.moistureEvents * 4);
  const turningBonus = batch.turnings * 5;
  return Math.min(100, Math.max(10, 100 - cnPenalty - moisturePenalty + turningBonus));
}

export interface CompostGrade {
  grade: 'Premium' | 'Standard' | 'Poor';
  nPer1000kg: number;
  pPer1000kg: number;
  kPer1000kg: number;
  organicMatter: number;
}

export function getCompostGrade(quality: number): CompostGrade {
  if (quality >= 80) {
    return { grade: 'Premium', nPer1000kg: 8, pPer1000kg: 6, kPer1000kg: 10, organicMatter: 2 };
  } else if (quality >= 50) {
    return { grade: 'Standard', nPer1000kg: 5, pPer1000kg: 4, kPer1000kg: 7, organicMatter: 1 };
  }
  return { grade: 'Poor', nPer1000kg: 2, pPer1000kg: 2, kPer1000kg: 3, organicMatter: 0 };
}

export const MANURE_CN_RATIOS: Record<string, number> = {
  gallina: 8,
  pato: 8,
  caballo: 25,
  oveja: 15,
  conejo: 7,
  cabra: 12,
  vaca: 18,
  buey: 18,
};

export const SOLID_MANURE_KG_PER_DAY: Record<string, number> = {
  gallina: 0.05,
  pato: 0.07,
  caballo: 8.0,
  oveja: 1.5,
  conejo: 0.15,
  cabra: 1.2,
  vaca: 15.0,
  buey: 15.0,
};

export const CROP_RESIDUE_PCT: Record<string, number> = {
  wheat: 0.80, barley: 0.80, oats: 0.80, corn: 0.80, sorghum: 0.80, rice: 0.80,
  rapeseed: 0.60, canola: 0.60, sunflower: 0.60,
  soy: 0.40, alfalfa: 0.40, clover: 0.40,
  potatoes: 0.20, sugarbeet: 0.20,
  strawberries: 0.10, grapes: 0.10, almonds: 0.10, olives: 0.10, tomatoes: 0.10,
  rye: 1.00, mustard: 1.00, buckwheat: 1.00,
};

export function getResiduePct(cropId: string): number {
  return CROP_RESIDUE_PCT[cropId] ?? 0.10;
}
