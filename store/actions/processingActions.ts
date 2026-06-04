import { BUILDING_TYPES, PRODUCTION_EQUIPMENT, EquipmentItem } from '../../data/buildingTypes';
import {
  PROCESSING_RECIPES,
  PROCESSED_ITEM_DEFS,
  ProcessingBatch,
  ProcessedItem,
  getProcessingBuildingConfig,
} from '../../data/processingTypes';
import {
  ProcessingBuilding,
  canUpgradeTier,
  getSellMultiplier,
  getUpgradeCost,
} from '../../engine/processing';
import { consumeFromBatches } from '../../engine/storageQuality';
import {
  CompostBatch,
  MANURE_CN_RATIOS,
  SOLID_MANURE_KG_PER_DAY,
  computeCNRatio,
  computeMaturationDay,
} from '../../engine/composting';
import { seasonKey } from '../../engine/productionBuildings';
import type { Worker } from '../../data/workerTypes';
import type { ProductionBuildingState } from '../../types/domain/processing';
import type { ActionFactory } from './types';

export interface ProcessingActions {
  processProduct: (recipeId: string, batches: number) => void;
  sellProcessed: (productId: string, units: number) => void;
  buyProcessingBuilding: (buildingTypeId: string) => void;
  upgradeProcessingBuilding: (buildingId: string) => void;
  assignWorkerToProcessingBuilding: (buildingId: string, workerId: string) => void;
  unassignWorkerFromProcessingBuilding: (buildingId: string, workerId: string) => void;
  installColdStorage: (buildingId: string) => void;
  purchaseProductionBuilding: (buildingTypeId: string) => void;
  assignWorkerToBuilding: (buildingId: string, workerId: string) => void;
  unassignWorkerFromBuilding: (buildingId: string, workerId: string) => void;
  installEquipment: (buildingId: string, equipmentItemId: string) => void;
  performDeepClean: (buildingId: string, useContractor: boolean) => void;
  startCompostBatch: (manureKg: number, residueKg: number) => void;
  turnCompostBatch: (batchId: string) => void;
  waterCompostBatch: (batchId: string) => void;
  collectCompostBatch: (batchId: string) => void;
}

export const createProcessingActions: ActionFactory<ProcessingActions> = (set, get) => ({
  processProduct: (recipeId, batches) => {
    if (batches <= 0) return;
    const state = get();
    const recipe = PROCESSING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const procBuildings = state.processingBuildings ?? [];
    const building = procBuildings.find(b => b.buildingTypeId === recipe.buildingTypeId);
    if (!building) return;
    if (building.tier < recipe.minBuildingTier) return;
    if (building.activeBatchId) return;

    const maxBatches = (() => {
      let max = Infinity;
      for (const input of recipe.inputs) {
        let stock = 0;
        if (input.source === 'crop') stock = state.inventory[input.itemId] ?? 0;
        else if (input.source === 'animal') stock = state.animalInventory[input.itemId] ?? 0;
        else if (input.source === 'processed') {
          stock = (state.processedInventory ?? [])
            .filter((i: ProcessedItem) => i.itemId === input.itemId)
            .reduce((s: number, i: ProcessedItem) => s + i.quantity, 0);
        }
        max = Math.min(max, Math.floor(stock / input.quantity));
      }
      return max === Infinity ? 0 : max;
    })();
    const actualBatches = Math.min(batches, maxBatches);
    if (actualBatches <= 0) return;

    let inputQualitySum = 0;
    let inputWeightSum = 0;
    for (const input of recipe.inputs) {
      let q = 50;
      if (input.source === 'crop') q = state.cropQualityMap?.[input.itemId] ?? 50;
      else if (input.source === 'processed') {
        const items = (state.processedInventory ?? []).filter((i: ProcessedItem) => i.itemId === input.itemId);
        if (items.length > 0) {
          const totalQty = items.reduce((s: number, i: ProcessedItem) => s + i.quantity, 0);
          q = items.reduce((s: number, i: ProcessedItem) => s + i.quality * i.quantity, 0) / totalQty;
        }
      }
      inputQualitySum += q * input.quantity;
      inputWeightSum += input.quantity;
    }
    const inputQuality = inputWeightSum > 0 ? inputQualitySum / inputWeightSum : 50;

    const assignedWorkers = (state.workers ?? []).filter((w: Worker) => building.assignedWorkerIds.includes(w.id));
    const workerBonus = assignedWorkers.length > 0
      ? Math.min(20, Math.max(...assignedWorkers.map((w: Worker) => (w.tier ?? 1) * 5)))
      : 0;

    const buildingBonus = { 1: 0, 2: 10, 3: 20 }[building.tier] ?? 0;
    const ceiling = { 1: 70, 2: 85, 3: 100 }[building.tier] ?? 70;
    const rawQuality = inputQuality * 0.6 + buildingBonus + workerBonus;
    const quality = Math.max(0, Math.min(ceiling, Math.round(rawQuality)));

    const tierMult = { 1: 1, 2: 2, 3: 4 }[building.tier] ?? 1;
    const outputQty = Math.round(recipe.baseOutputQuantity * tierMult * actualBatches);

    const inputSnapshot: Record<string, number> = {};
    for (const input of recipe.inputs) {
      inputSnapshot[input.itemId] = (inputSnapshot[input.itemId] ?? 0) + input.quantity * actualBatches;
    }

    const newInventory = { ...state.inventory };
    const newAnimalInventory = { ...state.animalInventory };
    let newProcessedInventory = [...(state.processedInventory ?? [])] as ProcessedItem[];
    let newInventoryBatches = [...(state.inventoryBatches ?? [])];

    for (const input of recipe.inputs) {
      const needed = input.quantity * actualBatches;
      if (input.source === 'crop') {
        newInventory[input.itemId] = (newInventory[input.itemId] ?? 0) - needed;
        const { remainingBatches } = consumeFromBatches(newInventoryBatches, input.itemId, needed);
        newInventoryBatches = remainingBatches;
      } else if (input.source === 'animal') {
        newAnimalInventory[input.itemId] = (newAnimalInventory[input.itemId] ?? 0) - needed;
      } else if (input.source === 'processed') {
        let remaining = needed;
        newProcessedInventory = newProcessedInventory.map((item: ProcessedItem) => {
          if (item.itemId !== input.itemId || remaining <= 0) return item;
          const take = Math.min(item.quantity, remaining);
          remaining -= take;
          return { ...item, quantity: item.quantity - take };
        }).filter((item: ProcessedItem) => item.quantity > 0);
      }
    }

    const batch: ProcessingBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      buildingId: building.id,
      recipeId,
      startDay: state.day,
      completionDay: state.day + recipe.processingDays,
      inputSnapshot,
      outputItemId: recipe.outputItemId,
      outputQuantity: outputQty,
      quality,
    };

    set({
      inventory: newInventory,
      inventoryBatches: newInventoryBatches,
      animalInventory: newAnimalInventory,
      processedInventory: newProcessedInventory,
      activeBatches: [...(state.activeBatches ?? []), batch],
      processingBuildings: procBuildings.map((b: ProcessingBuilding) =>
        b.id === building.id ? { ...b, activeBatchId: batch.id } : b
      ),
    });
  },

  sellProcessed: (productId, units) => {
    const state = get();
    const def = PROCESSED_ITEM_DEFS.find(d => d.id === productId);
    if (!def) return;
    const items = (state.processedInventory ?? []).filter(i => i.itemId === productId);
    const totalStock = items.reduce((s, i) => s + i.quantity, 0);
    const toSell = Math.min(units, totalStock);
    if (toSell <= 0) return;
    const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
    let remaining = toSell;
    let revenue = 0;
    const updatedInventory = (state.processedInventory ?? []).map(item => {
      if (item.itemId !== productId || remaining <= 0) return item;
      const take = Math.min(item.quantity, remaining);
      remaining -= take;
      const mult = getSellMultiplier(item, state.day) * prestigeBonus;
      revenue += Math.round(take * def.basePrice * mult);
      return { ...item, quantity: item.quantity - take };
    }).filter(item => item.quantity > 0);
    set({
      money: state.money + revenue,
      processedInventory: updatedInventory,
      salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'processed' }],
      totalRevenue: state.totalRevenue + revenue,
    });
  },

  buyProcessingBuilding: (buildingTypeId) => {
    const state = get();
    const config = getProcessingBuildingConfig(buildingTypeId);
    if (!config) return;
    if (state.buildings.includes(buildingTypeId)) return;
    if (state.money < config.baseCost) return;
    const newBuilding: ProcessingBuilding = {
      id: `pb_${buildingTypeId}_${Date.now()}`,
      buildingTypeId,
      tier: 1,
      assignedWorkerIds: [],
      hasColdStorage: false,
    };
    set({
      money: state.money - config.baseCost,
      buildings: [...state.buildings, buildingTypeId],
      processingBuildings: [...(state.processingBuildings ?? []), newBuilding],
    });
  },

  upgradeProcessingBuilding: (buildingId) => {
    const state = get();
    const building = (state.processingBuildings ?? []).find(b => b.id === buildingId);
    if (!building || !canUpgradeTier(building)) return;
    const config = getProcessingBuildingConfig(building.buildingTypeId);
    if (!config) return;
    const cost = getUpgradeCost(building, config);
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      processingBuildings: (state.processingBuildings ?? []).map(b =>
        b.id === buildingId ? { ...b, tier: (b.tier + 1) as 1 | 2 | 3 } : b
      ),
    });
  },

  assignWorkerToProcessingBuilding: (buildingId, workerId) => {
    const state = get();
    const building = (state.processingBuildings ?? []).find(b => b.id === buildingId);
    if (!building) return;
    if (building.assignedWorkerIds.includes(workerId)) return;
    set({
      processingBuildings: (state.processingBuildings ?? []).map(b =>
        b.id === buildingId ? { ...b, assignedWorkerIds: [...b.assignedWorkerIds, workerId] } : b
      ),
    });
  },

  unassignWorkerFromProcessingBuilding: (buildingId, workerId) => {
    const state = get();
    set({
      processingBuildings: (state.processingBuildings ?? []).map(b =>
        b.id === buildingId ? { ...b, assignedWorkerIds: b.assignedWorkerIds.filter(id => id !== workerId) } : b
      ),
    });
  },

  installColdStorage: (buildingId) => {
    const state = get();
    const building = (state.processingBuildings ?? []).find(b => b.id === buildingId);
    if (!building || building.hasColdStorage) return;
    const cost = 8000;
    if (state.money < cost) return;
    set({
      money: state.money - cost,
      processingBuildings: (state.processingBuildings ?? []).map(b =>
        b.id === buildingId ? { ...b, hasColdStorage: true } : b
      ),
    });
  },

  purchaseProductionBuilding: (buildingTypeId) => {
    const state = get();
    const bt = BUILDING_TYPES.find(b => b.id === buildingTypeId);
    if (!bt || bt.category !== 'production' || !bt.animalTypeId) return;
    if (state.money < bt.cost) return;
    if (state.productionBuildings.some(pb => pb.animalTypeId === bt.animalTypeId)) return;
    const newBuilding: ProductionBuildingState = {
      id: `pb_${Date.now()}`,
      buildingTypeId,
      animalTypeId: bt.animalTypeId,
      hygiene: 100,
      certificationTier: 'basic',
      certDaysAtThreshold: 0,
      certInspectionsPassed: 0,
      equipmentSlots: [],
      assignedWorkerIds: [],
      lastDeepCleanSeason: seasonKey(state.day),
      capacity: bt.dailyCapacity ?? 10,
    };
    set({
      money: state.money - bt.cost,
      productionBuildings: [...state.productionBuildings, newBuilding],
    });
  },

  assignWorkerToBuilding: (buildingId, workerId) => {
    const state = get();
    const pb = state.productionBuildings.find(b => b.id === buildingId);
    if (!pb) return;
    const workerExists = (state.workers ?? []).some(w => w.id === workerId);
    if (!workerExists) return;
    if (pb.assignedWorkerIds.includes(workerId)) return;
    const alreadyAssigned = state.productionBuildings.some(b =>
      b.id !== buildingId && b.assignedWorkerIds.includes(workerId)
    );
    if (alreadyAssigned) return;
    const bt2 = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
    const maxWorkers = bt2?.buildingTier === 'large' ? 2 : 1;
    if (pb.assignedWorkerIds.length >= maxWorkers) return;
    set({
      productionBuildings: state.productionBuildings.map(b =>
        b.id === buildingId
          ? { ...b, assignedWorkerIds: [...b.assignedWorkerIds, workerId] }
          : b
      ),
    });
  },

  unassignWorkerFromBuilding: (buildingId, workerId) => {
    const state = get();
    set({
      productionBuildings: state.productionBuildings.map(b =>
        b.id === buildingId
          ? { ...b, assignedWorkerIds: b.assignedWorkerIds.filter(id => id !== workerId) }
          : b
      ),
    });
  },

  installEquipment: (buildingId, equipmentItemId) => {
    const state = get();
    const pb = state.productionBuildings.find(b => b.id === buildingId);
    if (!pb) return;
    const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
    if (!bt) return;
    const maxSlots = bt.equipmentSlotCount ?? 2;
    if (pb.equipmentSlots.length >= maxSlots) return;
    if (pb.equipmentSlots.includes(equipmentItemId)) return;
    const eq: EquipmentItem | undefined = PRODUCTION_EQUIPMENT.find(e => e.id === equipmentItemId);
    if (!eq) return;
    const fits = eq.applicableBuildingPrefixes.some(prefix =>
      pb.buildingTypeId.startsWith(prefix)
    );
    if (!fits) return;
    if (state.money < eq.cost) return;
    set({
      money: state.money - eq.cost,
      productionBuildings: state.productionBuildings.map(b =>
        b.id === buildingId
          ? { ...b, equipmentSlots: [...b.equipmentSlots, equipmentItemId] }
          : b
      ),
    });
  },

  performDeepClean: (buildingId, useContractor) => {
    const state = get();
    const pb = state.productionBuildings.find(b => b.id === buildingId);
    if (!pb) return;
    const bt = BUILDING_TYPES.find(b => b.id === pb.buildingTypeId);
    if (!bt) return;
    const contractorCost = bt.buildingTier === 'large' ? 400
      : bt.buildingTier === 'medium' ? 250 : 150;
    if (useContractor) {
      if (state.money < contractorCost) return;
      set({
        money: state.money - contractorCost,
        productionBuildings: state.productionBuildings.map(b =>
          b.id === buildingId
            ? { ...b, hygiene: 85, lastDeepCleanSeason: seasonKey(state.day) }
            : b
        ),
      });
    } else {
      set({
        productionBuildings: state.productionBuildings.map(b =>
          b.id === buildingId
            ? { ...b, hygiene: 95, lastDeepCleanSeason: seasonKey(state.day) }
            : b
        ),
      });
    }
  },

  startCompostBatch: (manureKg, residueKg) => {
    const state = get();
    if (manureKg <= 0 || residueKg <= 0) return;
    if (manureKg > state.solidManureKg || residueKg > state.cropResidueKg) return;
    const batchCapacity = (state.buildings ?? []).reduce((sum, bId) => {
      if (bId.startsWith('bld_compost_bay')) {
        const bt = BUILDING_TYPES.find(b => b.id === bId);
        return sum + (bt?.capacity ?? 0);
      }
      return sum;
    }, 0);
    const activeCount = state.compostBatches.filter(b => b.status === 'active' || b.status === 'ready').length;
    if (activeCount >= batchCapacity) return;
    const animals = state.animals;
    let totalManureKg = 0;
    let weightedCN = 0;
    for (const typeId of Object.keys(MANURE_CN_RATIOS)) {
      const count = animals.filter(a => a.typeId === typeId).length;
      const dailyKg = (SOLID_MANURE_KG_PER_DAY[typeId] ?? 0) * count;
      if (dailyKg > 0) {
        weightedCN += dailyKg * MANURE_CN_RATIOS[typeId];
        totalManureKg += dailyKg;
      }
    }
    const avgManureCN = totalManureKg > 0 ? weightedCN / totalManureKg : 18;
    const cnRatio = computeCNRatio(manureKg, residueKg, avgManureCN);
    const batch: CompostBatch = {
      id: `compost_${Date.now()}`,
      startDay: state.day,
      manureKg,
      residueKg,
      cnRatio,
      moistureLevel: 55,
      turnings: 0,
      lastTurnedDay: state.day,
      maturationDay: computeMaturationDay(state.day, 0, 0),
      moistureEvents: 0,
      status: 'active',
    };
    set({
      solidManureKg: Math.max(0, state.solidManureKg - manureKg),
      cropResidueKg: Math.max(0, state.cropResidueKg - residueKg),
      compostBatches: [...state.compostBatches, batch],
    });
  },

  turnCompostBatch: (batchId) => {
    const state = get();
    const batch = state.compostBatches.find(b => b.id === batchId);
    if (!batch || batch.status !== 'active') return;
    if (state.day - batch.lastTurnedDay < 7) return;
    const newTurnings = Math.min(5, batch.turnings + 1);
    set({
      compostBatches: state.compostBatches.map(b =>
        b.id === batchId
          ? { ...b, turnings: newTurnings, lastTurnedDay: state.day, maturationDay: computeMaturationDay(b.startDay, newTurnings, b.moistureEvents) }
          : b
      ),
    });
  },

  waterCompostBatch: (batchId) => {
    const state = get();
    const batch = state.compostBatches.find(b => b.id === batchId);
    if (!batch || batch.status !== 'active') return;
    set({
      compostBatches: state.compostBatches.map(b =>
        b.id === batchId ? { ...b, moistureLevel: Math.min(100, b.moistureLevel + 15) } : b
      ),
    });
  },

  collectCompostBatch: (batchId) => {
    const state = get();
    const batch = state.compostBatches.find(b => b.id === batchId);
    if (!batch || batch.status !== 'ready') return;
    const outputKg = Math.round((batch.manureKg + batch.residueKg) * 0.40);
    set({
      compostInventoryKg: state.compostInventoryKg + outputKg,
      compostBatches: state.compostBatches.filter(b => b.id !== batchId),
    });
  },
});
