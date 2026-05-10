import { AnimalType, NutritionProfile } from '../data/animalTypes';

export interface FeedRation {
  animalTypeId: string;
  ingredients: Array<{ ingredientId: string; pct: number }>;
  mineralPremixKgPerAnimalPerDay: number;
}

export interface RationAnalysis {
  proteinPct: number;
  energyMJPerDay: number;
  roughagePct: number;
  hasMinerals: boolean;
  tier: 'deficient' | 'adequate' | 'optimal' | 'premium';
  costPerAnimalPerDay: number;
  issues: string[];
}

export const FEED_NUTRITION: Record<string, { proteinPct: number; energyMJPerKg: number; roughagePct: number }> = {
  corn:           { proteinPct: 8.5,  energyMJPerKg: 13.5, roughagePct: 0   },
  wheat:          { proteinPct: 12.5, energyMJPerKg: 12.5, roughagePct: 0   },
  barley:         { proteinPct: 11.0, energyMJPerKg: 12.0, roughagePct: 3   },
  oats:           { proteinPct: 10.5, energyMJPerKg: 11.5, roughagePct: 8   },
  sorghum:        { proteinPct: 9.0,  energyMJPerKg: 13.0, roughagePct: 0   },
  soy:            { proteinPct: 36.0, energyMJPerKg: 13.0, roughagePct: 0   },
  hay:            { proteinPct: 10.0, energyMJPerKg: 8.5,  roughagePct: 100 },
  silage:         { proteinPct: 7.0,  energyMJPerKg: 10.5, roughagePct: 60  },
  protein_meal:   { proteinPct: 45.0, energyMJPerKg: 12.0, roughagePct: 0   },
  mineral_premix: { proteinPct: 0,    energyMJPerKg: 0,    roughagePct: 0   },
};

export function analyzeRation(
  ration: FeedRation,
  animalType: AnimalType,
  availableInventory: Record<string, number>,
  pastureKgPerDay = 0,
): RationAnalysis {
  const profile = animalType.nutritionProfile;
  let totalKg = 0;
  let proteinSum = 0;
  let energySum = 0;
  let roughageSum = 0;
  let cost = 0;
  const issues: string[] = [];

  for (const ing of ration.ingredients) {
    const info = FEED_NUTRITION[ing.ingredientId];
    if (!info) continue;
    const kg = (ing.pct / 100) * animalType.feedKgPerDay;
    totalKg += kg;
    proteinSum += kg * info.proteinPct;
    energySum += kg * info.energyMJPerKg;
    roughageSum += kg * info.roughagePct;
    // cost estimate from inventory (simplified: use $0.30/kg for homegrown grain, $0.10 for hay)
    const pricePerKg = ing.ingredientId === 'hay' ? 0.10 : ing.ingredientId === 'protein_meal' ? 0.85 : ing.ingredientId === 'mineral_premix' ? 2.40 : 0.30;
    cost += kg * pricePerKg;
  }

  if (pastureKgPerDay > 0) {
    const pastureProtein = 18;
    const pastureEnergy = 10.0;
    proteinSum += pastureKgPerDay * pastureProtein;
    energySum += pastureKgPerDay * pastureEnergy;
    roughageSum += pastureKgPerDay * 100;
    totalKg += pastureKgPerDay;
  }

  const mineralKg = ration.mineralPremixKgPerAnimalPerDay;
  if (mineralKg > 0) {
    cost += mineralKg * 2.40;
  }

  const proteinPct = totalKg > 0 ? proteinSum / totalKg : 0;
  const energyMJPerDay = energySum;
  const roughagePct = totalKg > 0 ? roughageSum / totalKg : 0;
  const hasMinerals = mineralKg > 0;

  let tier: RationAnalysis['tier'] = 'adequate';
  if (proteinPct < profile.minProteinPct || energyMJPerDay < profile.minEnergyMJPerDay || roughagePct < profile.minRoughagePct) {
    tier = 'deficient';
    if (proteinPct < profile.minProteinPct) issues.push(`Protein too low: ${proteinPct.toFixed(1)}% (need ≥${profile.minProteinPct}%)`);
    if (energyMJPerDay < profile.minEnergyMJPerDay) issues.push(`Energy too low: ${energyMJPerDay.toFixed(1)} MJ (need ≥${profile.minEnergyMJPerDay} MJ)`);
    if (roughagePct < profile.minRoughagePct) issues.push(`Roughage too low: ${roughagePct.toFixed(1)}% (need ≥${profile.minRoughagePct}%)`);
  } else if (proteinPct >= profile.premiumProteinPct && energyMJPerDay >= profile.optEnergyMJPerDay && (!profile.needsMinerals || hasMinerals)) {
    tier = 'premium';
  } else if (proteinPct >= profile.optProteinPct && energyMJPerDay >= profile.optEnergyMJPerDay) {
    tier = 'optimal';
  }

  return { proteinPct, energyMJPerDay, roughagePct, hasMinerals, tier, costPerAnimalPerDay: cost, issues };
}

export function getRationProductionModifier(tier: RationAnalysis['tier']): number {
  switch (tier) {
    case 'deficient': return 0.65;
    case 'adequate':  return 0.90;
    case 'optimal':   return 1.00;
    case 'premium':   return 1.08;
  }
}

export function getRationSickChanceModifier(tier: RationAnalysis['tier']): number {
  switch (tier) {
    case 'deficient': return 2.5;
    case 'adequate':  return 1.0;
    case 'optimal':   return 1.0;
    case 'premium':   return 0.85;
  }
}

export function generateDefaultRation(animalType: AnimalType): FeedRation {
  const isRuminant = animalType.feedType === 'hay';
  const ingredients: FeedRation['ingredients'] = isRuminant
    ? [{ ingredientId: 'hay', pct: 80 }, { ingredientId: 'corn', pct: 20 }]
    : [{ ingredientId: 'corn', pct: 60 }, { ingredientId: 'soy', pct: 30 }, { ingredientId: 'hay', pct: 10 }];
  return {
    animalTypeId: animalType.id,
    ingredients,
    mineralPremixKgPerAnimalPerDay: animalType.nutritionProfile.needsMinerals ? 0.02 : 0,
  };
}
