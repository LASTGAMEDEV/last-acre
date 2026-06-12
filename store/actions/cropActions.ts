import { BUILDING_TYPES } from '../../data/buildingTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import { MARKET_REGIONS, MarketId } from '../../data/marketRegions';
import { PlantedCrop, SOIL_DEFAULTS, SoilStats, getSoilModifier, harvestAmount } from '../../engine/crops';
import { sellRevenue, computeSellPressureModifier, sellPressureDuration } from '../../engine/market';
import { getSeason } from '../../engine/climate';
import {
  StoredBatch,
  addBatch,
  consumeFromBatches,
  createBatchId,
  determineHarvestQuality,
  determineMoisture,
  weightedQualityMultiplier,
} from '../../engine/storageQuality';
import { degradationYieldModifier } from '../../engine/soilDegradation';
import { fallbackTillage, getYieldTransitionMod, hasMachineryForTillage } from '../../engine/tillage';
import { pestYieldModifier } from '../../engine/pests';
import { getWorkerBonuses } from '../../engine/workers';
import { haySilageQualityBonus } from '../../engine/nightOps';
import { getParcelOrganicYieldMod } from '../../engine/organicCert';
import { getPollinationMultiplier } from '../../engine/pollination';
import { getResiduePct } from '../../engine/composting';
import { getActiveLeaseForParcel } from '../../engine/leases';
import { getHarvestModifier } from '../../engine/events';
import {
  getCoopForCrop,
} from '../../engine/cooperativeData';
import {
  getSeason as getCoopSeason,
  getSeedDiscount,
  isMemberSuspended,
} from '../../engine/cooperatives';
import type { SeedEntry, HybridJob } from '../../types/domain/crops';
import type { FuturesPosition, MarketOrder } from '../../types/domain/economy';
import type { ActionFactory } from './types';

const COVER_CROP_BENEFITS: Record<string, {
  nitrogen?: number;
  organicMatter?: number;
  compactionReduction?: number;
  microbialLife?: number;
}> = {
  rye: { compactionReduction: 8, organicMatter: 0.4 },
  clover: { nitrogen: 20, organicMatter: 2.0 },
  mustard: { microbialLife: 10 },
  buckwheat: { microbialLife: 10, organicMatter: 0.5 },
};

function getSiloCapacity(buildings: string[]): number {
  const BASE = 10_000;
  return buildings.reduce((s, bId) => {
    const t = BUILDING_TYPES.find(bt => bt.id === bId && bt.category === 'silo');
    return s + (t?.capacity ?? 0);
  }, BASE);
}

function hasSecadero(buildings: string[]): boolean {
  return buildings.includes('bld_secadero');
}

function hasWaterTower(buildings: string[]): boolean {
  return buildings.includes('bld_agua');
}

export interface CropActions {
  plantCrop: (parcelId: string, cropId: string, hectares: number) => void;
  harvestCrop: (parcelId: string) => void;
  sellCrop: (cropId: string, units: number, marketId?: MarketId) => void;
  harvestAllReady: () => void;
  sellSeedBatch: (seedEntryId: string) => void;
  buyMarketSeed: (cropId: string) => void;
  plantCropBatch: (cropId: string) => void;
  startHybridization: (cropId: string, parentAId: string, parentBId: string) => void;
  selectSeedForParcel: (parcelId: string, seedEntryId: string | null) => void;
  addPriceAlert: (cropId: string, targetPrice: number, direction: 'above' | 'below') => void;
  removePriceAlert: (alertId: string) => void;
  placeMarketOrder: (cropId: string, quantity: number, targetPrice: number, termDays: number) => void;
  cancelMarketOrder: (orderId: string) => void;
  setSelectedMarket: (marketId: MarketId) => void;
  openFuture: (cropId: string, quantity: number, termDays: number) => void;
  setAutoSell: (cropId: string, settings: { enabled: boolean; minPrice: number } | null) => void;
  setInventoryReserve: (cropId: string, qty: number) => void;
}

export const createCropActions: ActionFactory<CropActions> = (set, get) => ({
  plantCrop: (parcelId, cropId, hectares) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.owned || parcel.plantedCrop) return;
    if (!parcel.tilled) return;
    const cropType = CROP_TYPES.find(c => c.id === cropId);
    if (!cropType) return;
    const currentSeason = getSeason(state.day);
    if (!cropType.seasons.includes(currentSeason) && !parcel.greenhouse) return;
    const coopSeedDiscount = (() => {
      const coopId = getCoopForCrop(cropId);
      if (!coopId) return 1.0;
      const m = state.coopMemberships[coopId];
      if (!m || isMemberSuspended(m, getCoopSeason(state.day))) return 1.0;
      return 1.0 - getSeedDiscount(coopId);
    })();
    const seedCost = cropType.seedCost * hectares * coopSeedDiscount;
    if (state.money < seedCost) return;
    let effectiveTillage = parcel.tillageSystem ?? 'conventional';
    if (!hasMachineryForTillage(state.machines, effectiveTillage)) {
      effectiveTillage = fallbackTillage(state.machines, effectiveTillage);
    }
    const plantedCrop: PlantedCrop = { cropId, parcelId, plantedDay: state.day, hectares };
    set({
      money: state.money - seedCost,
      parcels: state.parcels.map(p =>
        p.id === parcelId
          ? { ...p, plantedCrop, residueCoverage: false, tillageSystem: effectiveTillage, tillageSystemSince: p.tillageSystem !== effectiveTillage ? state.day : p.tillageSystemSince }
          : p
      ),
      firstMissionStep: state.firstMissionStep === 0 ? 1 : state.firstMissionStep,
    });
    get().markDayOneStep('planted');
  },

  harvestCrop: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId);
    if (!parcel || !parcel.plantedCrop) return;
    const crop = parcel.plantedCrop;
    const cropType = CROP_TYPES.find(c => c.id === crop.cropId);
    if (!cropType) return;
    if (cropType.coverCrop) {
      const benefits = COVER_CROP_BENEFITS[crop.cropId] ?? {};
      const oldSoil = parcel.soil ?? SOIL_DEFAULTS;
      set({
        parcels: state.parcels.map(p => p.id === parcelId
          ? {
              ...p,
              plantedCrop: null,
              cropHistory: [...(parcel.cropHistory ?? []).slice(-3), crop.cropId],
              soil: {
                ...oldSoil,
                nitrogen: Math.min(100, oldSoil.nitrogen + (benefits.nitrogen ?? 0)),
                organicMatter: Math.min(10, oldSoil.organicMatter + (benefits.organicMatter ?? 0)),
                compaction: Math.max(0, oldSoil.compaction - (benefits.compactionReduction ?? 0)),
                microbialLife: Math.min(100, oldSoil.microbialLife + (benefits.microbialLife ?? 0)),
              },
            }
          : p
        ),
      });
      return;
    }
    const seedEntry = parcel.seedEntryId
      ? state.seedVault.find(s => s.id === parcel.seedEntryId)
      : undefined;
    const seedGenes = seedEntry?.genes ?? { yield: 1, drought: 1, growth: 1, quality: 1 };
    const effectiveGrowthDays = Math.round(cropType.growthDays / seedGenes.growth);
    if (state.day < crop.plantedDay + effectiveGrowthDays) return;
    const workerBonusesManual = getWorkerBonuses(state.workers ?? []);
    const siloCapacity = getSiloCapacity(state.buildings);
    const totalInventory = Object.values(state.inventory).reduce((a, b) => a + b, 0);
    if (totalInventory >= siloCapacity) return;
    const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
    const waterScale = (cropType.waterNeed ?? 3) / 5;
    const rawClimateDelta = (baseClimate - 1.0) * waterScale;
    const droughtScale = rawClimateDelta < 0 ? 1.0 / seedGenes.drought : 1.0;
    const climateModifier = 1.0 + rawClimateDelta * droughtScale;
    const rawUnits = harvestAmount(crop, cropType, parcel.soil ?? SOIL_DEFAULTS, climateModifier, parcel.hasWeeds, 1.0, crop.frostDamage ?? 0, crop.droughtStress ?? 0, degradationYieldModifier(parcel), getYieldTransitionMod(parcel.tillageSystem ?? 'conventional', parcel.notillSeasons ?? 0), getParcelOrganicYieldMod(parcel)) * pestYieldModifier(parcel.pestState?.severity ?? 0);
    const unresolvedEvents = state.fieldEvents.filter(e => e.parcelId === parcelId && !e.resolved).length;
    const fieldEventMod = Math.pow(0.75, unresolvedEvents);
    const waterBonus = hasWaterTower(state.buildings) ? 1.05 : 1.0;
    const rotationMod = parcel.lastCropId && parcel.lastCropId !== crop.cropId ? 1.15 : 1.0;
    const irrigationBonus = parcel.irrigated ? 1.20 : 1.0;
    const soilMod = getSoilModifier(parcel.soilType, crop.cropId);
    const randomEventMod = getHarvestModifier(state.activeEvents ?? [], parcelId, crop.cropId);
    const diseaseMod = parcel.diseased ? 0.80 : 1.0;
    const pollMultM = getPollinationMultiplier(parcel, state.parcels, state.day, state.hedgerows ?? []);
    const precisionModM = parcel.precisionApplied ? 1.05 : 1.0;
    const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationBonus * soilMod * seedGenes.yield * randomEventMod * workerBonusesManual.cropYieldMultiplier * diseaseMod * pollMultM * precisionModM), siloCapacity - totalInventory);
    const nextCropQualityMap = { ...state.cropQualityMap };
    if (seedEntry) {
      nextCropQualityMap[crop.cropId] = seedGenes.quality;
    }
    const nextSeedVaultAfterHarvest = seedEntry
      ? state.seedVault.map(s => s.id === parcel.seedEntryId ? { ...s, quantity: s.quantity - 1 } : s).filter(s => s.quantity > 0)
      : state.seedVault;
    const harvestedCropIds = state.harvestedCropIds.includes(crop.cropId)
      ? state.harvestedCropIds
      : [...state.harvestedCropIds, crop.cropId];
    const newFertility = Math.max(1, parcel.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonusesManual.fertilityDrainMult));
    const oldSoil = parcel.soil ?? SOIL_DEFAULTS;
    const newSoilP = Math.max(0, oldSoil.phosphorus ?? 60) - (cropType.phosphorusDrain ?? 0) * crop.hectares * 0.1;
    const newSoilK = Math.max(0, oldSoil.potassium ?? 60) - (cropType.potassiumDrain ?? 0) * crop.hectares * 0.1;
    const soilAfterHarvest: SoilStats = { ...oldSoil, phosphorus: Math.max(0, newSoilP), potassium: Math.max(0, newSoilK) };
    let newCoopMemberships = state.coopMemberships;
    const harvestCoopId = getCoopForCrop(crop.cropId);
    if (harvestCoopId) {
      const coopMembership = state.coopMemberships[harvestCoopId];
      if (coopMembership && !isMemberSuspended(coopMembership, getCoopSeason(state.day))) {
        const coopStateForHarvest = state.coopStates[harvestCoopId];
        const obligation = Math.round(units * (coopStateForHarvest.terms.deliveryPct / 100));
        newCoopMemberships = {
          ...state.coopMemberships,
          [harvestCoopId]: {
            ...coopMembership,
            seasonObligation: coopMembership.seasonObligation + obligation,
          },
        };
      }
    }
    const residuePctM = getResiduePct(crop.cropId);
    const newResidueKgM = Math.min(10000, (state.cropResidueKg ?? 0) + units * residuePctM);
    const seasonLabelM = `${getSeason(state.day).charAt(0).toUpperCase() + getSeason(state.day).slice(1)} Y${Math.ceil(state.day / 360)}`;
    const newYieldHistoryM = [...(parcel.yieldHistory ?? []), { season: seasonLabelM, cropId: crop.cropId, kgPerHa: parcel.hectares > 0 ? units / parcel.hectares : 0, day: state.day }].slice(-8);
    const moisture = determineMoisture(state.todayWeather?.event ?? 'sunny');
    const heatWaveActive = state.seasonalEvent?.type === 'heat_wave' && state.day <= (state.seasonalEvent?.endsDay ?? 0);
    let quality = determineHarvestQuality(crop.cropId, crop.plantedDay, cropType.growthDays, state.day, moisture, false, parcel.diseased ?? false, heatWaveActive);
    if (haySilageQualityBonus(crop.cropId, (state.activeSchedule?.harvestWindow ?? 'day'))) {
      quality = 'premium';
    }
    const newBatch: StoredBatch = {
      id: createBatchId(),
      cropId: crop.cropId,
      quantity: units,
      quality,
      harvestDay: state.day,
      moisture,
      infested: false,
      organic: parcel.organicStatus === 'organic',
    };
    const newInventoryBatches = addBatch(state.inventoryBatches ?? [], newBatch);
    const residueCoverage = (parcel.tillageSystem ?? 'conventional') === 'notill';
    let sharecropCost = 0;
    const lease = getActiveLeaseForParcel(parcelId, state.activeLeases ?? []);
    if (lease && lease.leaseType === 'sharecrop' && lease.landOwnerSharePct) {
      const cropPrice = state.prices.find(p => p.cropId === crop.cropId)?.price ?? 0;
      const harvestValue = units * cropPrice;
      sharecropCost = Math.round(harvestValue * lease.landOwnerSharePct);
    }
    set({
      money: state.money - sharecropCost,
      parcels: state.parcels.map(p => p.id === parcelId
        ? { ...p, plantedCrop: null, lastCropId: crop.cropId, fertility: newFertility, soil: soilAfterHarvest, seedEntryId: undefined, diseased: false, diseasedDay: undefined, cropHistory: [...(parcel.cropHistory ?? []).slice(-3), crop.cropId], precisionApplied: false, yieldHistory: newYieldHistoryM, residueCoverage }
        : p
      ),
      inventory: { ...state.inventory, [crop.cropId]: (state.inventory[crop.cropId] ?? 0) + units },
      inventoryBatches: newInventoryBatches,
      cropResidueKg: newResidueKgM,
      harvestedCropIds,
      cropsGrownThisYear: (state.cropsGrownThisYear ?? []).includes(crop.cropId)
        ? state.cropsGrownThisYear
        : [...(state.cropsGrownThisYear ?? []), crop.cropId],
      cropQualityMap: nextCropQualityMap,
      seedVault: nextSeedVaultAfterHarvest,
      coopMemberships: newCoopMemberships,
      firstMissionStep: state.firstMissionStep === 1 ? 2 : state.firstMissionStep,
      seasonHarvestCount: (state.seasonHarvestCount ?? 0) + 1,
      personalRecords: {
        ...(state.personalRecords ?? {}),
        peakMoney: state.personalRecords?.peakMoney ?? 0,
        totalHarvests: (state.personalRecords?.totalHarvests ?? 0) + 1,
        bestSeasonRevenue: state.personalRecords?.bestSeasonRevenue ?? 0,
        longestDay: state.personalRecords?.longestDay ?? state.day,
      },
    });
    get().markDayOneStep('harvested');
  },

  sellCrop: (cropId, units, marketId) => {
    const state = get();
    const inStock = state.inventory[cropId] ?? 0;
    const toSell = Math.min(units, inStock);
    if (toSell <= 0) return;
    const { remainingBatches, consumedBatches } = consumeFromBatches(
      state.inventoryBatches ?? [],
      cropId,
      toSell,
    );
    const qualityMult = weightedQualityMultiplier(consumedBatches);
    const activeMarketId = marketId ?? state.selectedMarket ?? 'local';
    const region = MARKET_REGIONS.find(r => r.id === activeMarketId) ?? MARKET_REGIONS[0];
    const price = state.prices.find(p => p.cropId === cropId)?.price ?? 0;
    const effectivePrice = price * region.priceMultiplier;
    const transportCost = Math.round(toSell * region.transportCostPerUnit);
    const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
    const coopBonus = 1.0;
    const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
    const grossRevenue = sellRevenue(toSell, effectivePrice) * secaderoBonus * coopBonus * prestigeBonus * qualityMult;
    const revenue = Math.max(0, Math.round(grossRevenue - transportCost));
    const pressureMod = computeSellPressureModifier(toSell);
    const newPressures = pressureMod < 1.0
      ? [
          ...(state.sellPressures ?? []).filter(sp => sp.cropId !== cropId),
          { cropId, modifier: pressureMod, expiresDay: state.day + sellPressureDuration(toSell), source: 'player' },
        ]
      : (state.sellPressures ?? []);
    set({
      money: state.money + revenue,
      inventory: { ...state.inventory, [cropId]: inStock - toSell },
      inventoryBatches: remainingBatches,
      salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'crops', cropId }],
      totalRevenue: state.totalRevenue + revenue,
      sellPressures: newPressures,
      firstMissionStep: state.firstMissionStep === 2 ? 3 : state.firstMissionStep,
    });
  },

  harvestAllReady: () => {
    const state = get();
    const yieldBonus = 1.0;
    const workerBonusesAll = getWorkerBonuses(state.workers ?? []);
    const siloCapacity = getSiloCapacity(state.buildings);
    let totalInventory = Object.values(state.inventory).reduce((a: number, b) => a + (b as number), 0);
    let newInventory = { ...state.inventory };
    let newBatches = [...(state.inventoryBatches ?? [])];
    const newHarvestedCropIds = [...state.harvestedCropIds];
    const heatWaveActive = state.seasonalEvent?.type === 'heat_wave' && state.day <= (state.seasonalEvent?.endsDay ?? 0);
    const moisture = determineMoisture(state.todayWeather?.event ?? 'sunny');
    const newParcels = state.parcels.map(p => {
      if (!p.plantedCrop || !p.owned || totalInventory >= siloCapacity) return p;
      const cropType = CROP_TYPES.find(c => c.id === p.plantedCrop!.cropId);
      if (!cropType) return p;
      if (state.day < p.plantedCrop.plantedDay + Math.round(cropType.growthDays)) return p;
      const baseClimate = state.todayWeather?.climateModifier ?? 1.0;
      const waterScale = (cropType.waterNeed ?? 3) / 5;
      const climateModifier = 1.0 + (baseClimate - 1.0) * waterScale;
      const unresolvedEvents = state.fieldEvents.filter(e => e.parcelId === p.id && !e.resolved).length;
      const fieldEventMod = Math.pow(0.75, unresolvedEvents);
      const waterBonus = hasWaterTower(state.buildings) ? 1.05 : 1.0;
      const rotationMod = p.lastCropId && p.lastCropId !== p.plantedCrop.cropId ? 1.15 : 1.0;
      const irrigationMod = p.irrigated ? 1.20 : 1.0;
      const soilMod = getSoilModifier(p.soilType, p.plantedCrop.cropId);
      const rawUnits = harvestAmount(p.plantedCrop, cropType, p.soil ?? SOIL_DEFAULTS, climateModifier, p.hasWeeds, yieldBonus, p.plantedCrop.frostDamage ?? 0, p.plantedCrop.droughtStress ?? 0, degradationYieldModifier(p), getYieldTransitionMod(p.tillageSystem ?? 'conventional', p.notillSeasons ?? 0), getParcelOrganicYieldMod(p)) * pestYieldModifier(p.pestState?.severity ?? 0);
      const pollMultC = getPollinationMultiplier(p, state.parcels, state.day, state.hedgerows ?? []);
      const units = Math.min(Math.round(rawUnits * fieldEventMod * waterBonus * rotationMod * irrigationMod * soilMod * pollMultC), siloCapacity - totalInventory);
      totalInventory += units;
      newInventory[p.plantedCrop.cropId] = (newInventory[p.plantedCrop.cropId] ?? 0) + units;
      if (!newHarvestedCropIds.includes(p.plantedCrop.cropId)) newHarvestedCropIds.push(p.plantedCrop.cropId);
      const newFertility = Math.max(1, p.fertility - Math.round((cropType.fertilityDrain ?? 0) * workerBonusesAll.fertilityDrainMult));
      const quality = determineHarvestQuality(p.plantedCrop.cropId, p.plantedCrop.plantedDay, cropType.growthDays, state.day, moisture, false, p.diseased ?? false, heatWaveActive);
      newBatches = addBatch(newBatches, {
        id: createBatchId(),
        cropId: p.plantedCrop.cropId,
        quantity: units,
        quality,
        harvestDay: state.day,
        moisture,
        infested: false,
        organic: p.organicStatus === 'organic',
      });
      const residueCoverageT = (p.tillageSystem ?? 'conventional') === 'notill';
      return { ...p, plantedCrop: null, lastCropId: p.plantedCrop.cropId, fertility: newFertility, cropHistory: [...(p.cropHistory ?? []).slice(-3), p.plantedCrop.cropId], residueCoverage: residueCoverageT };
    });
    set({ parcels: newParcels, inventory: newInventory, inventoryBatches: newBatches, harvestedCropIds: newHarvestedCropIds });
  },

  sellSeedBatch: (seedEntryId) => {
    const state = get();
    const entry = state.seedVault.find(s => s.id === seedEntryId);
    if (!entry) return;
    const avgGene = (entry.genes.yield + entry.genes.drought + entry.genes.growth + entry.genes.quality) / 4;
    const pricePerSeed = Math.round(30 * avgGene * Math.max(1, entry.generation));
    const revenue = pricePerSeed * entry.quantity;
    set({
      seedVault: state.seedVault.filter(s => s.id !== seedEntryId),
      money: state.money + revenue,
    });
  },

  buyMarketSeed: (cropId) => {
    const state = get();
    const crop = CROP_TYPES.find(c => c.id === cropId);
    if (!crop) return;
    const costPerSeed = Math.round((crop.seedCost ?? 50) * 1.5 + 25);
    const quantity = 5;
    const totalCost = costPerSeed * quantity;
    if (state.money < totalCost) return;
    const existing = state.seedVault.find(s => s.cropId === cropId && s.generation === 1 && s.genes.yield === 1.0 && s.genes.drought === 1.0);
    if (existing) {
      set({
        seedVault: state.seedVault.map(s => s.id === existing.id ? { ...s, quantity: s.quantity + quantity } : s),
        money: state.money - totalCost,
      });
    } else {
      const newEntry: SeedEntry = {
        id: `seed_mkt_${Date.now()}`,
        cropId,
        generation: 1,
        genes: { yield: 1.0, drought: 1.0, growth: 1.0, quality: 1.0 },
        createdDay: state.day,
        quantity,
      };
      set({
        seedVault: [...state.seedVault, newEntry],
        money: state.money - totalCost,
      });
    }
  },

  plantCropBatch: (cropId) => {
    const state = get();
    const crop = CROP_TYPES.find(c => c.id === cropId);
    if (!crop) return;
    const idleParcels = state.parcels.filter(p => p.owned && !p.plantedCrop && !p.hasWeeds);
    if (idleParcels.length === 0) return;
    const totalCost = idleParcels.reduce((sum, p) => sum + Math.round(crop.seedCost * p.hectares), 0);
    if (state.money < totalCost) return;
    const plantDay = state.day;
    const idleIds = new Set(idleParcels.map(p => p.id));
    set({
      parcels: state.parcels.map(p => {
        if (!idleIds.has(p.id)) return p;
        const effectiveTillage = (() => {
          const preferred = p.tillageSystem ?? 'conventional';
          if (hasMachineryForTillage(state.machines ?? [], preferred)) return preferred;
          return fallbackTillage(state.machines ?? [], preferred);
        })();
        return {
          ...p,
          plantedCrop: { cropId, parcelId: p.id, plantedDay: plantDay, hectares: p.hectares },
          tilled: false,
          residueCoverage: false,
          tillageSystem: effectiveTillage,
          tillageSystemSince: p.tillageSystem !== effectiveTillage ? plantDay : p.tillageSystemSince,
        };
      }),
      money: state.money - totalCost,
    });
  },

  startHybridization: (cropId, parentAId, parentBId) => {
    const state = get();
    const labLevel = state.buildings.includes('bld_seed_lab_3') ? 3
      : state.buildings.includes('bld_seed_lab_2') ? 2
      : state.buildings.includes('bld_seed_lab_1') ? 1
      : 0;
    if (labLevel === 0) return;
    const maxSlots = labLevel;
    const activeJobs = state.hybridJobs.length;
    if (activeJobs >= maxSlots) return;
    const parentA = state.seedVault.find(s => s.id === parentAId);
    const parentB = state.seedVault.find(s => s.id === parentBId);
    if (!parentA || !parentB) return;
    if (parentAId === parentBId) return;
    if (parentA.cropId !== cropId || parentB.cropId !== cropId) return;
    if (parentA.quantity < 1 || parentB.quantity < 1) return;
    const generation = Math.max(parentA.generation, parentB.generation) + 1;
    const cost = Math.min(200 * generation, 2000);
    if (state.money < cost) return;
    const durationDays = labLevel === 3 ? 7 : labLevel === 2 ? 10 : 14;
    const job: HybridJob = {
      id: `hybrid_${Date.now()}`,
      cropId,
      parentAId,
      parentBId,
      startDay: state.day,
      readyDay: state.day + durationDays,
      cost,
    };
    const nextVault = state.seedVault
      .map(s => s.id === parentAId || s.id === parentBId ? { ...s, quantity: s.quantity - 1 } : s)
      .filter(s => s.quantity > 0);
    set({
      money: state.money - cost,
      hybridJobs: [...state.hybridJobs, job],
      seedVault: nextVault,
    });
  },

  selectSeedForParcel: (parcelId, seedEntryId) => {
    set(state => ({
      parcels: state.parcels.map(p =>
        p.id === parcelId ? { ...p, seedEntryId: seedEntryId ?? undefined } : p
      ),
    }));
  },

  addPriceAlert: (cropId, targetPrice, direction) => {
    const state = get();
    if ((state.priceAlerts ?? []).some(a => a.cropId === cropId)) return;
    set({ priceAlerts: [...(state.priceAlerts ?? []), { id: `alert_${Date.now()}`, cropId, targetPrice, direction }] });
  },

  removePriceAlert: (alertId) => {
    const state = get();
    set({ priceAlerts: (state.priceAlerts ?? []).filter(a => a.id !== alertId) });
  },

  placeMarketOrder: (cropId, quantity, targetPrice, termDays) => {
    const state = get();
    const inStock = state.inventory[cropId] ?? 0;
    if (inStock < quantity || quantity <= 0) return;
    const newInventory = { ...state.inventory, [cropId]: inStock - quantity };
    const { remainingBatches } = consumeFromBatches(state.inventoryBatches ?? [], cropId, quantity);
    const order: MarketOrder = {
      id: `order_${Date.now()}`,
      cropId,
      quantity,
      targetPrice,
      createdDay: state.day,
      expiresDay: state.day + termDays,
      status: 'active',
    };
    set({ inventory: newInventory, inventoryBatches: remainingBatches, marketOrders: [...(state.marketOrders ?? []), order] });
  },

  cancelMarketOrder: (orderId) => {
    const state = get();
    const order = (state.marketOrders ?? []).find(o => o.id === orderId && o.status === 'active');
    if (!order) return;
    const newInventory = { ...state.inventory, [order.cropId]: (state.inventory[order.cropId] ?? 0) + order.quantity };
    const returnedBatch: StoredBatch = {
      id: createBatchId(),
      cropId: order.cropId,
      quantity: order.quantity,
      quality: 'standard',
      harvestDay: state.day,
      moisture: 'dry',
      infested: false,
    };
    const updatedOrders = (state.marketOrders ?? []).map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' as const } : o
    );
    set({ inventory: newInventory, inventoryBatches: addBatch(state.inventoryBatches ?? [], returnedBatch), marketOrders: updatedOrders });
  },

  setSelectedMarket: (marketId) => {
    const state = get();
    const region = MARKET_REGIONS.find(r => r.id === marketId);
    if (!region) return;
    if (state.day < region.unlockDay) return;
    set({ selectedMarket: marketId });
  },

  openFuture: (cropId, quantity, termDays) => {
    const state = get();
    const price = state.prices.find(p => p.cropId === cropId);
    if (!price || quantity <= 0) return;
    const lockPrice = Math.round(price.price * 100) / 100;
    const future: FuturesPosition = {
      id: `future_${state.day}_${cropId}_${Date.now()}`,
      cropId,
      quantity,
      lockPrice,
      deliveryDay: state.day + termDays,
      createdDay: state.day,
      settled: false,
    };
    set({ futures: [...(state.futures ?? []), future] });
  },

  setAutoSell: (cropId, settings) => {
    const state = get();
    if (settings === null) {
      const next = { ...state.autoSell };
      delete next[cropId];
      set({ autoSell: next });
    } else {
      set({ autoSell: { ...state.autoSell, [cropId]: settings } });
    }
  },

  setInventoryReserve: (cropId, qty) => {
    const state = get();
    const next = { ...(state.inventoryReserves ?? {}) };
    if (qty <= 0) {
      delete next[cropId];
    } else {
      next[cropId] = qty;
    }
    set({ inventoryReserves: next });
  },
});
