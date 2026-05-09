/**
 * engine/processing.ts
 * Pure calculation functions for the artisan processing system.
 * No imports from the store — all inputs passed as arguments.
 */

import {
  ProcessingRecipe,
  ProcessedItem,
  ProcessedItemDef,
  ProcessingBuildingConfig,
  BATCH_MULTIPLIER,
  QUALITY_CEILING,
  BUILDING_BONUS,
  PROCESSED_ITEM_DEFS,
  getValueDecayMultiplier,
  getAgingQualityBonus,
  isExpiryWarning,
} from '../data/processingTypes';

// ── Types used by engine ────────────────────────────────────────────────────

export interface ProcessingBuilding {
  id: string;
  buildingTypeId: string;
  tier: 1 | 2 | 3;
  assignedWorkerIds: string[];
  activeBatchId?: string;
  hasColdStorage: boolean;
}

export interface WorkerForBonus {
  id: string;
  role: string;
  skillLevel: number; // 0–20 per role
}

export interface BatchCompletionResult {
  newInventory: ProcessedItem[];
  events: string[];
}

export interface SpoilageResult {
  survivingItems: ProcessedItem[];
  destroyedEvents: string[];
  warningEvents: string[];
}

// ── Quality calculation ─────────────────────────────────────────────────────

/**
 * Calculates final quality for a processed batch.
 * Formula: clamp(inputQuality * 0.6 + buildingBonus + workerBonus, 0, qualityCeiling)
 */
export function calculateQuality(
  inputQuality: number,
  buildingTier: number,
  workerBonus: number
): number {
  const weightedInput = inputQuality * 0.6;
  const buildingBonus = BUILDING_BONUS[buildingTier] ?? 0;
  const ceiling = QUALITY_CEILING[buildingTier] ?? 70;
  const raw = weightedInput + buildingBonus + workerBonus;
  return Math.max(0, Math.min(ceiling, Math.round(raw)));
}

/**
 * Computes weighted average input quality from crops and processed items.
 * Crop quality comes from cropQualityMap (0–100 scale).
 * Processed item quality comes from the best available batch.
 */
export function computeInputQuality(
  recipe: ProcessingRecipe,
  cropQualityMap: Record<string, number>,
  processedInventory: ProcessedItem[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const input of recipe.inputs) {
    let q = 50; // default neutral quality
    if (input.source === 'crop') {
      q = cropQualityMap[input.itemId] ?? 50;
    } else if (input.source === 'processed') {
      const items = processedInventory.filter(i => i.itemId === input.itemId);
      if (items.length > 0) {
        const totalQty = items.reduce((s, i) => s + i.quantity, 0);
        q = items.reduce((s, i) => s + i.quality * i.quantity, 0) / totalQty;
      }
    }
    // animal products default to 50 unless we have a quality system for them
    weightedSum += q * input.quantity;
    totalWeight += input.quantity;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

/**
 * Returns the worker bonus (0–20) for a processing building.
 * Uses the highest skill level among assigned workers of the correct role.
 */
export function getWorkerBonusForBuilding(
  buildingConfig: ProcessingBuildingConfig,
  workers: WorkerForBonus[]
): number {
  const relevant = workers.filter(w => w.role === buildingConfig.role);
  if (relevant.length === 0) return 0;
  return Math.max(...relevant.map(w => w.skillLevel));
}

/**
 * Checks whether a processing building has at least one assigned worker
 * with the correct role.
 */
export function isBuildingManned(
  building: ProcessingBuilding,
  buildingConfig: ProcessingBuildingConfig,
  workers: WorkerForBonus[]
): boolean {
  return building.assignedWorkerIds.some(id => {
    const w = workers.find(x => x.id === id);
    return w !== undefined && w.role === buildingConfig.role;
  });
}

// ── Input validation & deduction ────────────────────────────────────────────

/**
 * Returns the max number of batches that can be started for a recipe
 * given current stock levels.
 */
export function maxBatchesForRecipe(
  recipe: ProcessingRecipe,
  inventory: Record<string, number>,
  animalInventory: Record<string, number>,
  processedInventory: ProcessedItem[]
): number {
  let max = Infinity;
  for (const input of recipe.inputs) {
    let stock = 0;
    if (input.source === 'crop') {
      stock = inventory[input.itemId] ?? 0;
    } else if (input.source === 'animal') {
      stock = animalInventory[input.itemId] ?? 0;
    } else if (input.source === 'processed') {
      stock = processedInventory
        .filter(i => i.itemId === input.itemId)
        .reduce((s, i) => s + i.quantity, 0);
    }
    const possible = Math.floor(stock / input.quantity);
    max = Math.min(max, possible);
  }
  return max === Infinity ? 0 : max;
}

/**
 * Builds a snapshot of input quantities for a given number of batches.
 */
export function buildInputSnapshot(
  recipe: ProcessingRecipe,
  batches: number
): Record<string, number> {
  const snap: Record<string, number> = {};
  for (const input of recipe.inputs) {
    snap[input.itemId] = (snap[input.itemId] ?? 0) + input.quantity * batches;
  }
  return snap;
}

/**
 * Calculates output quantity with tier multiplier applied.
 */
export function getOutputQuantity(
  recipe: ProcessingRecipe,
  buildingTier: number,
  workerBonusMultiplier: number = 1
): number {
  const mult = BATCH_MULTIPLIER[buildingTier] ?? 1;
  return Math.round(recipe.baseOutputQuantity * mult * workerBonusMultiplier);
}

// ── Batch completion ────────────────────────────────────────────────────────

/**
 * Converts a completed processing batch into a ProcessedItem entry.
 */
export function batchToProcessedItem(
  batch: { outputItemId: string; outputQuantity: number; quality: number; completionDay: number },
  coldStorage: boolean
): ProcessedItem {
  const def = PROCESSED_ITEM_DEFS.find(d => d.id === batch.outputItemId);
  const shelfLife = def?.shelfLifeDays ?? 365;
  const csMult = coldStorage && def ? def.coldStorageMultiplier : 1;
  return {
    itemId: batch.outputItemId,
    quantity: batch.outputQuantity,
    quality: batch.quality,
    producedDay: batch.completionDay,
    expiryDay: batch.completionDay + Math.round(shelfLife * csMult),
  };
}

// ── Spoilage, decay & aging ─────────────────────────────────────────────────

/**
 * Runs spoilage check and value decay on processed inventory.
 * Returns surviving items, destruction events, and warning events.
 */
export function tickProcessedInventory(
  inventory: ProcessedItem[],
  currentDay: number
): SpoilageResult {
  const surviving: ProcessedItem[] = [];
  const destroyedEvents: string[] = [];
  const warningEvents: string[] = [];

  for (const item of inventory) {
    if (item.expiryDay <= currentDay) {
      const def = PROCESSED_ITEM_DEFS.find(d => d.id === item.itemId);
      destroyedEvents.push(
        `${def?.name ?? item.itemId} spoiled (${Math.round(item.quantity)} ${def?.unit ?? ''})`
      );
      continue;
    }

    const def = PROCESSED_ITEM_DEFS.find(d => d.id === item.itemId);

    // Expiry warning
    if (def && isExpiryWarning(item, currentDay)) {
      const daysLeft = item.expiryDay - currentDay;
      warningEvents.push(
        `⚠️ ${def.name} expires in ${daysLeft}d (${Math.round(item.quantity)} ${def.unit})`
      );
    }

    // Aging quality improvement
    if (def?.agingImproves) {
      const bonus = getAgingQualityBonus(item, def, currentDay);
      const newQuality = Math.min(100, item.quality + bonus);
      surviving.push({ ...item, quality: newQuality });
    } else {
      surviving.push(item);
    }
  }

  return { survivingItems: surviving, destroyedEvents, warningEvents };
}

/**
 * Computes the sell-value multiplier for a processed item at the current day,
 * accounting for quality and value decay.
 */
export function getSellMultiplier(
  item: ProcessedItem,
  currentDay: number
): number {
  const decay = getValueDecayMultiplier(item, currentDay);
  const qualityMult = 0.5 + (item.quality / 100); // 0.5 at q=0, 1.5 at q=100
  return qualityMult * decay;
}

// ── Electricity ─────────────────────────────────────────────────────────────

/**
 * Calculates total kWh draw from all active processing batches plus standby draw
 * from owned processing buildings.
 */
export function calcProcessingPowerDraw(
  activeBatches: { recipeId: string; buildingId: string }[],
  processingBuildings: ProcessingBuilding[],
  recipes: ProcessingRecipe[]
): number {
  let total = 0;
  for (const batch of activeBatches) {
    const recipe = recipes.find(r => r.id === batch.recipeId);
    if (recipe) {
      total += recipe.electricityKwhPerDay ?? 0;
    }
  }
  for (const pb of processingBuildings) {
    const config = getProcessingBuildingConfig(pb.buildingTypeId);
    if (config) {
      total += config.electricityStandbyKwh ?? 0;
    }
  }
  return total;
}

// Import needed for the above helper
import { getProcessingBuildingConfig } from '../data/processingTypes';

// ── Tier progression ────────────────────────────────────────────────────────

/**
 * Returns whether a building can be upgraded to the next tier.
 */
export function canUpgradeTier(building: ProcessingBuilding): boolean {
  return building.tier < 3;
}

/**
 * Returns the upgrade cost for the next tier.
 */
export function getUpgradeCost(
  building: ProcessingBuilding,
  config: ProcessingBuildingConfig
): number {
  if (building.tier === 1) return config.upgradeCostTier2;
  if (building.tier === 2) return config.upgradeCostTier3;
  return Infinity;
}
