export interface CSASubscriber {
  id: string;
  name: string;
  boxSize: 'small' | 'medium' | 'large';
  pricePerSeason: number;
  satisfaction: number;
  seasonsSubscribed: number;
  joinedDay: number;
}

export interface CSACommitment {
  smallBoxes: number;
  mediumBoxes: number;
  largeBoxes: number;
  priceModifier: number;
}

export interface CSAWeekLog {
  weekNumber: number;
  fillRate: number;
  varietyMet: boolean;
  bonusItemAdded: boolean;
  avgSatisfactionChange: number;
}

export const CSA_TIER_PRICES = {
  small: 65,
  medium: 105,
  large: 185,
};

export const CSA_WEEKS_PER_SEASON = 13;

export const CSA_BOX_KG = {
  small: { min: 4, max: 6 },
  medium: { min: 8, max: 12 },
  large: { min: 15, max: 20 },
};

export function boxKgNeeded(boxSize: 'small' | 'medium' | 'large'): number {
  const range = CSA_BOX_KG[boxSize];
  return (range.min + range.max) / 2;
}

export function totalKgNeeded(commitment: CSACommitment): number {
  return (
    commitment.smallBoxes * boxKgNeeded('small') +
    commitment.mediumBoxes * boxKgNeeded('medium') +
    commitment.largeBoxes * boxKgNeeded('large')
  );
}

export function evaluateBoxFulfillment(
  inventory: Record<string, number>,
  commitment: CSACommitment,
): { fillRate: number; varietyMet: boolean } {
  const totalNeeded = totalKgNeeded(commitment);
  const totalAvailable = Object.values(inventory).reduce((a, b) => a + b, 0);
  const fillRate = totalNeeded > 0 ? Math.min(1, totalAvailable / totalNeeded) : 0;

  // Variety: at least 3 non-grain categories
  const grainIds = new Set(['wheat', 'barley', 'corn', 'oat', 'rice', 'rye', 'sorghum', 'triticale']);
  const nonGrainAvailable = Object.entries(inventory).filter(([cropId, qty]) => !grainIds.has(cropId) && qty > 0).length;
  const varietyMet = nonGrainAvailable >= 3;

  return { fillRate, varietyMet };
}

export function satisfactionDelta(fillRate: number, varietyMet: boolean): number {
  if (fillRate >= 1.0 && varietyMet) return 5;
  if (fillRate >= 1.0 && !varietyMet) return 1;
  if (fillRate >= 0.5) return -10;
  if (fillRate > 0) return -20;
  return -30;
}

export function renewalProbability(satisfaction: number): number {
  if (satisfaction >= 80) return 0.95;
  if (satisfaction >= 60) return 0.75;
  if (satisfaction >= 40) return 0.40;
  return 0.10;
}

export function computeNewSubscribers(
  avgSatisfaction: number,
  reputation: number,
  hasOrganic: boolean,
  currentCount: number,
  nearSettlement: boolean,
): number {
  const cap = nearSettlement ? 120 : 40;
  if (currentCount >= cap) return 0;
  let newSubs = 0;
  if (avgSatisfaction >= 70) newSubs += 1 + Math.floor(Math.random() * 3);
  if (reputation >= 60) newSubs += 2 + Math.floor(Math.random() * 4);
  if (hasOrganic) newSubs += 2 + Math.floor(Math.random() * 3);
  return Math.min(newSubs, cap - currentCount);
}

export function seasonRevenue(
  subscribers: CSASubscriber[],
  priceModifier: number,
): number {
  return subscribers.reduce((sum, s) => {
    const base = CSA_TIER_PRICES[s.boxSize];
    return sum + Math.round(base * priceModifier);
  }, 0);
}

export function defaultCommitment(): CSACommitment {
  return { smallBoxes: 0, mediumBoxes: 0, largeBoxes: 0, priceModifier: 1.0 };
}
