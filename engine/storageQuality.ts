import type { WeatherEvent } from './climate';

export type QualityGrade = 'premium' | 'standard' | 'low' | 'damaged' | 'condemned';

export interface StoredBatch {
  id: string;
  cropId: string;
  quantity: number; // kg
  quality: QualityGrade;
  harvestDay: number;
  moisture: 'dry' | 'wet' | 'saturated';
  infested: boolean;
  infestedDay?: number;
  condemnedDay?: number;
  siloId?: string;
  organic?: boolean;
}

export const GRAIN_CROP_IDS = [
  'wheat', 'barley', 'oats', 'corn', 'rice', 'sorghum', 'rye', 'buckwheat',
];

export const GRADE_MULTIPLIERS: Record<QualityGrade, number> = {
  premium: 1.20,
  standard: 1.00,
  low: 0.70,
  damaged: 0.40,
  condemned: 0.00,
};

export const CONDEMNED_DISPOSAL_COST_PER_TONNE = 30;

export function isGrain(cropId: string): boolean {
  return GRAIN_CROP_IDS.includes(cropId);
}

export function isPerishable(cropId: string): boolean {
  return !isGrain(cropId) && cropId !== 'grass' && cropId !== 'alfalfa';
}

export function determineMoisture(todayEvent: WeatherEvent): 'dry' | 'wet' | 'saturated' {
  if (todayEvent === 'rain' || todayEvent === 'heavy_rain') return 'saturated';
  if (todayEvent === 'cloudy' || todayEvent === 'fog' || todayEvent === 'wind' || todayEvent === 'frost' || todayEvent === 'hail') return 'wet';
  return 'dry'; // sunny, perfect, drought
}

export function determineHarvestQuality(
  cropId: string,
  plantedDay: number,
  growthDays: number,
  harvestDay: number,
  moisture: 'dry' | 'wet' | 'saturated',
  machineUsed: boolean,
  diseased: boolean,
  heatWaveActive = false,
): QualityGrade {
  if (!isGrain(cropId) && !isPerishable(cropId)) return 'standard';

  if (isGrain(cropId)) {
    if (moisture === 'saturated') return 'damaged';
    if (moisture === 'wet') return 'low';

    const daysFromMaturity = harvestDay - (plantedDay + growthDays);
    const withinMaturityWindow = daysFromMaturity >= -5 && daysFromMaturity <= 5;

    if (withinMaturityWindow && moisture === 'dry' && machineUsed && !diseased) {
      return 'premium';
    }
    return 'standard';
  }

  // Perishable
  const daysFromMaturity = harvestDay - (plantedDay + growthDays);
  const withinMaturityWindow = daysFromMaturity >= -3 && daysFromMaturity <= 3;

  if (withinMaturityWindow && !diseased && !heatWaveActive) {
    return 'premium';
  }
  return 'standard';
}

const GRADE_ORDER: QualityGrade[] = ['premium', 'standard', 'low', 'damaged', 'condemned'];

export function downgradeGrade(grade: QualityGrade, steps: number): QualityGrade {
  const idx = GRADE_ORDER.indexOf(grade);
  return GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, idx + steps)];
}

export function upgradeGrade(grade: QualityGrade, steps: number): QualityGrade {
  const idx = GRADE_ORDER.indexOf(grade);
  return GRADE_ORDER[Math.max(0, idx - steps)];
}

export function checkMoistureDecay(batch: StoredBatch, currentDay: number): QualityGrade {
  if (!isGrain(batch.cropId) || batch.moisture === 'dry') return batch.quality;

  const daysStored = currentDay - batch.harvestDay;
  const decayInterval = batch.moisture === 'wet' ? 10 : 4;
  const gradesLost = Math.floor(daysStored / decayInterval);

  return downgradeGrade(batch.quality, gradesLost);
}

export function checkPestInfestation(
  batch: StoredBatch,
  currentDay: number,
  season: string,
): { infested: boolean; infestedDay?: number; newQuality: QualityGrade } {
  if (!isGrain(batch.cropId)) {
    return { infested: batch.infested, infestedDay: batch.infestedDay, newQuality: batch.quality };
  }

  const daysStored = currentDay - batch.harvestDay;
  if (daysStored < 60) {
    return { infested: batch.infested, infestedDay: batch.infestedDay, newQuality: batch.quality };
  }

  if (batch.infested) {
    const daysSinceInfested = currentDay - (batch.infestedDay ?? batch.harvestDay + 60);
    const gradesLost = Math.floor(daysSinceInfested / 14);
    return {
      infested: true,
      infestedDay: batch.infestedDay,
      newQuality: downgradeGrade(batch.quality, gradesLost),
    };
  }

  const pestChance = season === 'summer' ? 0.008 : 0.003;
  if (Math.random() < pestChance) {
    return { infested: true, infestedDay: currentDay, newQuality: batch.quality };
  }

  return { infested: false, newQuality: batch.quality };
}

export function checkHotSpot(
  batch: StoredBatch,
  currentDay: number,
  season: string,
): boolean {
  if (!isGrain(batch.cropId)) return false;
  const daysStored = currentDay - batch.harvestDay;
  if (daysStored < 90 || season !== 'summer') return false;
  if (batch.quantity <= 20_000) return false;
  return Math.random() < 0.01;
}

export function checkPerishableDecay(
  batch: StoredBatch,
  currentDay: number,
  hasColdStorage: boolean,
): QualityGrade {
  if (isGrain(batch.cropId) || batch.cropId === 'grass' || batch.cropId === 'alfalfa') {
    return batch.quality;
  }

  const safeWindow = hasColdStorage ? 30 : 7;
  const decayInterval = hasColdStorage ? 10 : 5;
  const daysOver = currentDay - batch.harvestDay - safeWindow;

  if (daysOver <= 0) return batch.quality;

  const gradesLost = Math.floor(daysOver / decayInterval);
  return downgradeGrade(batch.quality, gradesLost);
}

export function checkCrossContamination(
  batches: StoredBatch[],
  currentDay: number,
): StoredBatch[] {
  const condemnedGrain = batches.filter(
    b => isGrain(b.cropId) && b.quality === 'condemned' && b.condemnedDay !== undefined && currentDay - b.condemnedDay >= 1,
  );

  if (condemnedGrain.length === 0) return batches;

  const minCondemnedDay = Math.min(...condemnedGrain.map(b => b.condemnedDay!));
  const daysSinceCondemnation = currentDay - minCondemnedDay;
  const downgradeSteps = Math.floor(daysSinceCondemnation / 7);
  if (downgradeSteps <= 0) return batches;

  return batches.map(batch => {
    if (!isGrain(batch.cropId) || batch.quality === 'condemned') return batch;
    return { ...batch, quality: downgradeGrade(batch.quality, downgradeSteps) };
  });
}

export function deriveInventory(batches: StoredBatch[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const batch of batches) {
    result[batch.cropId] = (result[batch.cropId] ?? 0) + batch.quantity;
  }
  return result;
}

/**
 * Consume quantity from batches, prioritising best quality first.
 * Condemned batches are never consumed automatically.
 */
export function consumeFromBatches(
  batches: StoredBatch[],
  cropId: string,
  quantity: number,
): { remainingBatches: StoredBatch[]; consumedBatches: StoredBatch[] } {
  const cropBatches = batches.filter(b => b.cropId === cropId && b.quality !== 'condemned');
  const qualityOrder: Record<QualityGrade, number> = {
    premium: 0, standard: 1, low: 2, damaged: 3, condemned: 4,
  };
  cropBatches.sort((a, b) => qualityOrder[a.quality] - qualityOrder[b.quality]);

  let remaining = quantity;
  const consumedBatches: StoredBatch[] = [];
  const updatedBatches = [...batches];

  for (const batch of cropBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    remaining -= take;

    const batchIndex = updatedBatches.findIndex(b => b.id === batch.id);
    if (batchIndex >= 0) {
      if (take >= batch.quantity) {
        updatedBatches.splice(batchIndex, 1);
      } else {
        updatedBatches[batchIndex] = { ...batch, quantity: batch.quantity - take };
      }
    }

    consumedBatches.push({ ...batch, quantity: take });
  }

  return { remainingBatches: updatedBatches, consumedBatches };
}

export function addBatch(
  batches: StoredBatch[],
  batch: StoredBatch,
): StoredBatch[] {
  return [...batches, batch];
}

export function weightedQualityMultiplier(consumedBatches: StoredBatch[]): number {
  const totalQty = consumedBatches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalQty === 0) return 1.0;

  const weightedSum = consumedBatches.reduce(
    (sum, b) => sum + b.quantity * GRADE_MULTIPLIERS[b.quality],
    0,
  );

  return weightedSum / totalQty;
}

export function calculateDisposalCost(batches: StoredBatch[]): number {
  const condemnedKg = batches
    .filter(b => b.quality === 'condemned')
    .reduce((sum, b) => sum + b.quantity, 0);
  return Math.round((condemnedKg / 1000) * CONDEMNED_DISPOSAL_COST_PER_TONNE);
}

export function createBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Advance all batches by one day. Returns updated batches and any notifications.
 */
export function advanceStorageQuality(
  batches: StoredBatch[],
  currentDay: number,
  season: string,
  hasColdStorage: boolean,
): {
  batches: StoredBatch[];
  disposalCost: number;
  notifications: string[];
} {
  let updated = [...batches];
  const notifications: string[] = [];
  let newDisposalCost = 0;

  // 1. Moisture decay (grain)
  // 2. Perishable decay
  updated = updated.map(batch => {
    let quality = batch.quality;

    if (isGrain(batch.cropId)) {
      quality = checkMoistureDecay(batch, currentDay);
    } else if (isPerishable(batch.cropId)) {
      quality = checkPerishableDecay(batch, currentDay, hasColdStorage);
      const daysStored = currentDay - batch.harvestDay;
      const safeWindow = hasColdStorage ? 30 : 7;
      if (daysStored === safeWindow - 3 && quality !== 'condemned') {
        notifications.push(`⚠️ ${batch.cropId} batch approaching expiry — sell or process within 3 days`);
      }
    }

    return { ...batch, quality };
  });

  // 3. Pest infestation
  updated = updated.map(batch => {
    if (!isGrain(batch.cropId)) return batch;
    const result = checkPestInfestation(batch, currentDay, season);
    if (result.infested && !batch.infested) {
      notifications.push(`🐛 Grain weevil activity detected — treat or move within 14 days`);
    }
    return { ...batch, infested: result.infested, infestedDay: result.infestedDay, quality: result.newQuality };
  });

  // 4. Hot spot (simplified: per-batch > 20t in summer)
  updated = updated.map(batch => {
    if (!isGrain(batch.cropId)) return batch;
    if (checkHotSpot(batch, currentDay, season)) {
      notifications.push(`🌡️ Hot spot forming — aerate immediately or risk fire`);
      // 50% condemned, 50% damaged
      if (Math.random() < 0.5) {
        return { ...batch, quality: 'condemned', condemnedDay: currentDay };
      }
      return { ...batch, quality: 'damaged' };
    }
    return batch;
  });

  // 5. Cross-contamination
  updated = checkCrossContamination(updated, currentDay);

  // 6. Charge disposal for newly condemned batches
  updated = updated.map(batch => {
    if (batch.quality === 'condemned' && !batch.condemnedDay) {
      newDisposalCost += Math.round((batch.quantity / 1000) * CONDEMNED_DISPOSAL_COST_PER_TONNE);
      return { ...batch, condemnedDay: currentDay };
    }
    return batch;
  });

  return { batches: updated, disposalCost: newDisposalCost, notifications: [...new Set(notifications)] };
}

/**
 * Sync batches to match an inventory delta.
 * Used in advanceDay where complex inventory logic already computed the new totals.
 */
export function syncBatchesWithInventory(
  oldBatches: StoredBatch[],
  oldInventory: Record<string, number>,
  newInventory: Record<string, number>,
  currentDay: number,
  todayWeather: { event: WeatherEvent } | null,
): StoredBatch[] {
  let batches = [...oldBatches];

  for (const cropId of new Set([...Object.keys(oldInventory), ...Object.keys(newInventory)])) {
    const oldQty = oldInventory[cropId] ?? 0;
    const newQty = newInventory[cropId] ?? 0;
    const delta = newQty - oldQty;

    if (delta > 0) {
      const moisture = isGrain(cropId) ? determineMoisture(todayWeather?.event ?? 'sunny') : 'dry';
      batches = addBatch(batches, {
        id: createBatchId(),
        cropId,
        quantity: delta,
        quality: 'standard',
        harvestDay: currentDay,
        moisture,
        infested: false,
      });
    } else if (delta < 0) {
      const { remainingBatches } = consumeFromBatches(batches, cropId, Math.abs(delta));
      batches = remainingBatches;
    }
  }

  return batches;
}
