import { ATTACHMENT_TYPES } from '../../data/attachmentTypes';
import { CROP_TYPES } from '../../data/cropTypes';
import { MACHINE_TYPES } from '../../data/machineTypes';
import { MARKET_REGIONS, MarketId } from '../../data/marketRegions';
import { getSeason } from '../../engine/climate';
import { getCoopForCrop } from '../../engine/cooperativeData';
import { getSeason as getCoopSeason, getSeedDiscount, isMemberSuspended } from '../../engine/cooperatives';
import { calcRepairDays } from '../../engine/events';
import { ContractorOperation, calcJobDays, canAssignJob, getContractorCost } from '../../engine/machinery';
import type { PlantedCrop } from '../../engine/crops';
import type { LandParcel } from '../../types/domain/land';
import type {
  DeliveryCargo,
  DeliveryJob,
  HarvestJob,
  OwnedAttachment,
  OwnedMachine,
  OwnedTrailer,
  ReturnOrder,
  TractorJob,
} from '../../types/domain/machinery';
import type { ActionFactory } from './types';

export const DELIVERY_DURATION: Record<MarketId, number> = {
  local: 1,
  city: 2,
  export: 3,
};

export const TRUCK_FUEL_LITRES: Record<string, Record<MarketId, number>> = {
  'truck-pickup': { local: 20, city: 60, export: 140 },
  'truck-dump': { local: 28, city: 80, export: 180 },
  'truck-semi': { local: 35, city: 100, export: 220 },
};

function hasAlmacen(buildings: string[]): boolean {
  return buildings.includes('bld_almacen');
}

function hasSecadero(buildings: string[]): boolean {
  return buildings.includes('bld_secadero');
}

export interface MachineryActions {
  startRepair: (machineId: string) => void;
  buyMachine: (typeId: string) => void;
  buyAttachment: (typeId: string) => void;
  buyTrailer: (typeId: string) => void;
  hitchTrailer: (trailerId: string, truckId: string | null) => void;
  assignJob: (
    tractorId: string,
    attachmentId: string,
    operation: 'till' | 'plant' | 'spray' | 'spread_slurry',
    parcelIds: string[],
    cropId?: string,
  ) => void;
  assignHarvestJob: (combineId: string, parcelIds: string[]) => void;
  hireContractor: (operation: ContractorOperation, parcelIds: string[], cropId?: string) => void;
  dispatchDelivery: (params: {
    truckId: string;
    trailerId: string;
    driverId: string;
    cargo: DeliveryCargo[];
    marketId: MarketId;
    returnOrders: ReturnOrder[];
  }) => void;
}

export const createMachineryActions: ActionFactory<MachineryActions> = (set, get) => ({
  startRepair: (machineId) => {
    const state = get();
    const repair = (state.machineRepairs ?? []).find(
      r => r.machineId === machineId && r.startDay === null
    );
    if (!repair) return;
    const repairDays = calcRepairDays(state.workers ?? []);
    const totalCost = Math.max(0, repair.cost - repair.insurancePaid);
    if (state.money < totalCost) return;
    set({
      money: state.money - totalCost,
      machineRepairs: (state.machineRepairs ?? []).map(r =>
        r.machineId === machineId && r.startDay === null
          ? { ...r, startDay: state.day, readyDay: state.day + repairDays }
          : r
      ),
    });
  },

  buyMachine: (typeId) => {
    const state = get();
    const machineType = MACHINE_TYPES.find(m => m.id === typeId);
    if (!machineType) return;
    const cost = Math.round(machineType.cost * (hasAlmacen(state.buildings) ? 0.9 : 1.0));
    if (state.money < cost) return;
    const req = machineType.requires;
    if (req) {
      const ownedHa = state.parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);
      if (req.minHa && ownedHa < req.minHa) return;
      if (req.minTier) {
        const TIER_ORDER: Record<string, number> = { D: 0, C: 1, B: 2, A: 3 };
        const requiredLevel = TIER_ORDER[req.minTier] ?? 0;
        const hasLevel = state.harvestedCropIds.some(id => {
          const crop = CROP_TYPES.find(c => c.id === id);
          return crop && (TIER_ORDER[crop.tier] ?? 0) >= requiredLevel;
        });
        if (!hasLevel) return;
      }
    }
    const newMachine: OwnedMachine = { id: `machine_${Date.now()}`, typeId, purchasedDay: state.day };
    set({ money: state.money - cost, machines: [...state.machines, newMachine] });
  },

  buyAttachment: (typeId) => {
    const state = get();
    const attachType = ATTACHMENT_TYPES.find(a => a.id === typeId);
    if (!attachType) return;
    if (state.money < attachType.cost) return;
    const newAttachment: OwnedAttachment = { id: `attachment_${Date.now()}`, typeId };
    set({ money: state.money - attachType.cost, attachments: [...(state.attachments ?? []), newAttachment] });
  },

  buyTrailer: (typeId) => {
    const state = get();
    const trailerType = MACHINE_TYPES.find(m => m.id === typeId && m.category === 'trailer');
    if (!trailerType) return;
    if (state.money < trailerType.cost) return;
    const newTrailer: OwnedTrailer = { id: `trailer_${Date.now()}`, typeId, hitchedTo: null };
    set({ money: state.money - trailerType.cost, trailers: [...(state.trailers ?? []), newTrailer] });
  },

  hitchTrailer: (trailerId, truckId) => {
    const state = get();
    const updatedTrailers = (state.trailers ?? []).map((tr: OwnedTrailer) => {
      if (tr.id === trailerId) return { ...tr, hitchedTo: truckId };
      if (truckId && tr.hitchedTo === truckId) return { ...tr, hitchedTo: null };
      return tr;
    });
    set({ trailers: updatedTrailers });
  },

  assignJob: (tractorId, attachmentId, operation, parcelIds, cropId) => {
    const state = get();
    const tractor = (state.machines ?? []).find((m: OwnedMachine) => m.id === tractorId);
    const attachment = (state.attachments ?? []).find((a: OwnedAttachment) => a.id === attachmentId);
    if (!tractor || !attachment) return;
    const tractorType = MACHINE_TYPES.find(mt => mt.id === tractor.typeId);
    const attachType = ATTACHMENT_TYPES.find(at => at.id === attachment.typeId);
    if (!tractorType || !attachType) return;
    const parcels = parcelIds
      .map(id => state.parcels.find((p: LandParcel) => p.id === id))
      .filter((p): p is LandParcel => p !== undefined);
    if (parcels.length === 0) return;
    const parcelsTilled = parcels.map((p: LandParcel) => p.tilled);
    const check = canAssignJob(
      tractor, tractorType, attachment, attachType,
      operation, parcelsTilled, state.tractorJobs ?? [],
    );
    if (!check.ok) return;
    if (operation === 'plant' && !cropId) return;
    const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
    const haPerDay = attachType.haPerDay;
    const completesDay = state.day + calcJobDays(totalHa, haPerDay);
    const job: TractorJob = {
      id: `job_${Date.now()}`,
      tractorId,
      attachmentId,
      operation,
      parcelIds,
      cropId,
      totalHa,
      haPerDay,
      startDay: state.day,
      completesDay,
    };
    if (operation === 'plant' && cropId) {
      const cropType = CROP_TYPES.find(c => c.id === cropId);
      if (!cropType) return;
      const coopSeedDiscount = (() => {
        const coopId = getCoopForCrop(cropId);
        if (!coopId) return 1.0;
        const m = state.coopMemberships[coopId];
        if (!m || isMemberSuspended(m, getCoopSeason(state.day))) return 1.0;
        return 1.0 - getSeedDiscount(coopId);
      })();
      const seedCost = cropType.seedCost * totalHa * coopSeedDiscount;
      if (state.money < seedCost) return;
      const currentSeason = getSeason(state.day);
      const updatedParcels = state.parcels.map((p: LandParcel) => {
        if (!parcelIds.includes(p.id)) return p;
        if (!cropType.seasons.includes(currentSeason) && !p.greenhouse) return p;
        const plantedCrop: PlantedCrop = {
          cropId, parcelId: p.id, plantedDay: completesDay, hectares: p.hectares,
        };
        return { ...p, plantedCrop };
      });
      set({
        money: state.money - seedCost,
        parcels: updatedParcels,
        tractorJobs: [...(state.tractorJobs ?? []), job],
      });
      return;
    }
    set({ tractorJobs: [...(state.tractorJobs ?? []), job] });
  },

  assignHarvestJob: (combineId, parcelIds) => {
    const state = get();
    const combine = (state.machines ?? []).find((m: OwnedMachine) => m.id === combineId);
    if (!combine) return;
    const combineType = MACHINE_TYPES.find(mt => mt.id === combine.typeId && mt.category === 'harvester');
    if (!combineType) return;
    const alreadyBusy = (state.harvestJobs ?? []).some((j: HarvestJob) => j.combineId === combineId);
    if (alreadyBusy) return;
    const parcels = parcelIds
      .map(id => state.parcels.find((p: LandParcel) => p.id === id))
      .filter((p): p is LandParcel => p !== undefined);
    if (parcels.length === 0) return;
    const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
    const haPerDay = combineType.haPerDay ?? 4;
    const completesDay = state.day + calcJobDays(totalHa, haPerDay);
    const job: HarvestJob = {
      id: `hjob_${Date.now()}`,
      combineId,
      parcelIds,
      totalHa,
      haPerDay,
      startDay: state.day,
      completesDay,
      processedHa: 0,
    };
    set({ harvestJobs: [...(state.harvestJobs ?? []), job] });
  },

  hireContractor: (operation, parcelIds, cropId) => {
    const state = get();
    const parcels = parcelIds
      .map(id => state.parcels.find((p: LandParcel) => p.id === id))
      .filter((p): p is LandParcel => p !== undefined);
    if (parcels.length === 0) return;
    let cost = 0;

    if (operation === 'till') {
      const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
      cost = getContractorCost('till', totalHa);
      if (state.money < cost) return;
      set({
        money: state.money - cost,
        parcels: state.parcels.map((p: LandParcel) =>
          parcelIds.includes(p.id) ? { ...p, tilled: true } : p
        ),
      });
      get().markDayOneStep('tilled');

    } else if (operation === 'plant') {
      if (!cropId) return;
      const cropType = CROP_TYPES.find(c => c.id === cropId);
      if (!cropType) return;
      const currentSeason = getSeason(state.day);
      const validParcels = parcels.filter((p: LandParcel) =>
        p.tilled && !p.plantedCrop && (cropType.seasons.includes(currentSeason) || p.greenhouse)
      );
      if (validParcels.length === 0) return;
      const totalHa = validParcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
      const coopSeedDiscount = (() => {
        const coopId = getCoopForCrop(cropId);
        if (!coopId) return 1.0;
        const m = state.coopMemberships[coopId];
        if (!m || isMemberSuspended(m, Number(getSeason(state.day)))) return 1.0;
        return 1.0 - getSeedDiscount(coopId);
      })();
      const seedCost = cropType.seedCost * totalHa * coopSeedDiscount;
      const contractorFee = getContractorCost('plant', totalHa);
      cost = seedCost + contractorFee;
      if (state.money < cost) return;
      const validIds = validParcels.map((p: LandParcel) => p.id);
      set({
        money: state.money - cost,
        parcels: state.parcels.map((p: LandParcel) => {
          if (!validIds.includes(p.id)) return p;
          const plantedCrop: PlantedCrop = {
            cropId, parcelId: p.id, plantedDay: state.day, hectares: p.hectares,
          };
          return { ...p, plantedCrop };
        }),
      });

    } else if (operation === 'spray') {
      const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
      cost = getContractorCost('spray', totalHa);
      if (state.money < cost) return;
      set({
        money: state.money - cost,
        parcels: state.parcels.map((p: LandParcel) => {
          if (!parcelIds.includes(p.id) || !p.plantedCrop) return p;
          return {
            ...p,
            plantedCrop: {
              ...p.plantedCrop,
              appliedN: Math.max(p.plantedCrop.appliedN ?? 1.0, 1.10),
            },
          };
        }),
      });

    } else if (operation === 'harvest') {
      const totalHa = parcels.reduce((s: number, p: LandParcel) => s + p.hectares, 0);
      cost = getContractorCost('harvest', totalHa);
      if (state.money < cost) return;
      set({ money: state.money - cost });
      parcelIds.forEach(pid => get().harvestCrop(pid));

    } else if (operation === 'irrigate') {
      cost = getContractorCost('irrigate', parcels.length);
      if (state.money < cost) return;
      set({
        money: state.money - cost,
        parcels: state.parcels.map((p: LandParcel) =>
          parcelIds.includes(p.id) ? { ...p, irrigated: true } : p
        ),
      });
    }
  },

  dispatchDelivery: ({ truckId, trailerId, driverId, cargo, marketId, returnOrders }) => {
    const state = get();

    const truck = (state.machines ?? []).find((m: OwnedMachine) => m.id === truckId);
    if (!truck) return;

    const truckType = MACHINE_TYPES.find(t => t.id === truck.typeId);
    if (!truckType) return;

    const region = MARKET_REGIONS.find(r => r.id === marketId) ?? MARKET_REGIONS[0];
    const duration = DELIVERY_DURATION[marketId];
    const fuelLitres = TRUCK_FUEL_LITRES[truck.typeId]?.[marketId] ?? 60;
    const fuelCost = Math.round(fuelLitres * (state.fuelPrice ?? 1.20) * 100) / 100;

    if ((state.fuel ?? 0) < fuelLitres) return;

    const newInventory = { ...state.inventory };
    const newAnimalInventory = { ...state.animalInventory };
    const newProductInventory = { ...(state.productInventory ?? {}) };
    for (const c of cargo) {
      if (c.category === 'crop') {
        newInventory[c.itemId] = Math.max(0, (newInventory[c.itemId] ?? 0) - c.quantity);
      } else if (c.category === 'animal_product') {
        newAnimalInventory[c.itemId] = Math.max(0, (newAnimalInventory[c.itemId] ?? 0) - c.quantity);
      }
    }

    const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
    const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
    const coopBonus = 1.0;
    let expectedRevenue = 0;
    for (const c of cargo) {
      const basePrice =
        c.category === 'crop'
          ? (state.prices.find(p => p.cropId === c.itemId)?.price ?? 1)
          : ((state.animalPrices ?? {})[c.itemId] ?? 1);
      const effectivePrice = basePrice * region.priceMultiplier;
      const gross = c.quantity * effectivePrice * secaderoBonus * coopBonus * prestigeBonus;
      const transport = c.quantity * region.transportCostPerUnit;
      expectedRevenue += Math.max(0, gross - transport);
    }
    expectedRevenue = Math.round(expectedRevenue);

    let returnCost = 0;
    for (const r of returnOrders) {
      returnCost += r.quantity * r.costPerUnit;
    }
    returnCost = Math.round(returnCost);
    if (state.money < returnCost + fuelCost) return;

    const job: DeliveryJob = {
      id: `dlv_${Date.now()}`,
      truckId,
      trailerId,
      driverId,
      cargo,
      marketId,
      departDay: state.day,
      returnDay: state.day + duration,
      expectedRevenue,
      fuelCost,
      returnOrders,
      status: 'outbound',
      breakdownDaysAdded: 0,
      needsMaintenance: false,
    };

    set({
      deliveryJobs: [...(state.deliveryJobs ?? []), job],
      fuel: (state.fuel ?? 0) - fuelLitres,
      money: state.money - returnCost - fuelCost,
      inventory: newInventory,
      animalInventory: newAnimalInventory,
      productInventory: newProductInventory,
    });
  },
});
