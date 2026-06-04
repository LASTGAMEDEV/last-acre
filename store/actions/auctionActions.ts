import { MACHINE_TYPES } from '../../data/machineTypes';
import { OwnedAnimal } from '../../engine/animals';
import { addBatch, consumeFromBatches, createBatchId, StoredBatch } from '../../engine/storageQuality';
import type { AuctionCategory, AuctionListing } from '../../types/domain/auctions';
import type { OwnedMachine } from '../../types/domain/machinery';
import type { GameState } from '../../types/domain/gameState';
import type { ActionFactory } from './types';

export interface AuctionActions {
  listItem: (params: {
    category: AuctionCategory;
    animalId?: string;
    cropId?: string;
    cropQuantity?: number;
    machineId?: string;
    startingBid: number;
    reservePrice: number;
    durationDays: 3 | 7 | 14;
  }) => void;
  withdrawListing: (listingId: string) => void;
  placeBid: (listingId: string, amount: number) => void;
}

export const createAuctionActions: ActionFactory<AuctionActions> = (set, get) => ({
  listItem: (params) => {
    const state = get();
    const { category, animalId, cropId, cropQuantity, machineId,
            startingBid, reservePrice, durationDays } = params;
    if (startingBid <= 0 || reservePrice < startingBid) return;

    const listing: AuctionListing = {
      id: `listing_${Date.now()}`,
      category,
      sellerId: 'player',
      startingBid,
      reservePrice,
      currentBid: startingBid,
      bids: [],
      playerBid: null,
      createdDay: state.day,
      expiresDay: state.day + durationDays,
      resolved: false,
      playerWon: null,
    };

    if (category === 'animal') {
      if (!animalId) return;
      const animal = state.animals.find(a => a.id === animalId);
      if (!animal) return;
      listing.animalId = animalId;
      listing.animalGenes = animal.genes;
      listing.animalBreedId = animal.breedId;
      listing.animalTypeId = animal.typeId;
      listing.animalSex = animal.sex;
      listing.animalBornDay = animal.bornDay;
      listing.expiresDay = state.nextAnimalAuctionDay;
      set({
        listings: [...(state.listings ?? []), listing],
        animals: state.animals.filter(a => a.id !== animalId),
      });
    } else if (category === 'crop') {
      if (!cropId || !cropQuantity || cropQuantity <= 0) return;
      const inStock = state.inventory[cropId] ?? 0;
      if (inStock < cropQuantity) return;
      listing.cropId = cropId;
      listing.cropQuantity = cropQuantity;
      const { remainingBatches } = consumeFromBatches(state.inventoryBatches ?? [], cropId, cropQuantity);
      set({
        listings: [...(state.listings ?? []), listing],
        inventory: { ...state.inventory, [cropId]: inStock - cropQuantity },
        inventoryBatches: remainingBatches,
      });
    } else if (category === 'machinery') {
      if (!machineId) return;
      const machine = state.machines.find(m => m.id === machineId);
      if (!machine) return;
      const machineType = MACHINE_TYPES.find(t => t.id === machine.typeId);
      if (!machineType) return;
      const ageDays = state.day - machine.purchasedDay;
      const repairs = (state.machineRepairs ?? []).filter(r => r.machineId === machineId);
      const repairedOnTime = repairs.filter(r => r.readyDay !== null).length;
      const missedRepairs = repairs.filter(r => r.startDay === null).length;
      const conditionScore = Math.min(100, Math.max(0,
        100 - Math.floor(ageDays / 5) + repairedOnTime * 3 - missedRepairs * 8
      ));
      listing.machineId = machineId;
      listing.machineTypeId = machine.typeId;
      listing.conditionScore = conditionScore;
      listing.machinePurchasedDay = machine.purchasedDay;
      set({
        listings: [...(state.listings ?? []), listing],
        machines: state.machines.filter(m => m.id !== machineId),
      });
    }
  },

  withdrawListing: (listingId) => {
    const state = get();
    const listing = (state.listings ?? []).find(l => l.id === listingId && !l.resolved);
    if (!listing || listing.sellerId !== 'player') return;
    if (listing.bids.some(b => b.isPlayer === false)) return;

    let inventoryPatch: Partial<GameState> = {};
    if (listing.category === 'animal' && listing.animalId && listing.animalGenes && listing.animalTypeId) {
      const returnedAnimal: OwnedAnimal = {
        id: listing.animalId,
        typeId: listing.animalTypeId,
        sex: listing.animalSex ?? 'female',
        bornDay: listing.animalBornDay ?? state.day,
        genes: listing.animalGenes,
        breedId: listing.animalBreedId,
        sick: false,
        lastProductionDay: state.day,
        lastBreedDay: state.day,
      };
      inventoryPatch = { animals: [...state.animals, returnedAnimal] };
    } else if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
      const returnedBatch: StoredBatch = {
        id: createBatchId(),
        cropId: listing.cropId,
        quantity: listing.cropQuantity,
        quality: 'standard',
        harvestDay: state.day,
        moisture: 'dry',
        infested: false,
      };
      inventoryPatch = {
        inventory: {
          ...state.inventory,
          [listing.cropId]: (state.inventory[listing.cropId] ?? 0) + listing.cropQuantity,
        },
        inventoryBatches: addBatch(state.inventoryBatches ?? [], returnedBatch),
      };
    } else if (listing.category === 'machinery' && listing.machineId && listing.machineTypeId) {
      const restoredMachine: OwnedMachine = {
        id: listing.machineId,
        typeId: listing.machineTypeId,
        purchasedDay: listing.machinePurchasedDay ?? state.day,
      };
      inventoryPatch = { machines: [...state.machines, restoredMachine] };
    }

    set({
      ...inventoryPatch,
      listings: (state.listings ?? []).map(l =>
        l.id === listingId ? { ...l, resolved: true, playerWon: null } : l
      ),
    });
  },

  placeBid: (listingId, amount) => {
    const state = get();
    const listing = (state.listings ?? []).find(l => l.id === listingId && !l.resolved);
    if (!listing) return;
    const minBid = Math.ceil(listing.currentBid * 1.05);
    if (amount < minBid) return;
    if (state.money < amount) return;
    set({
      listings: (state.listings ?? []).map(l => l.id === listingId ? {
        ...l,
        playerBid: amount,
        currentBid: amount,
        bids: [...l.bids, { day: state.day, amount, isPlayer: true }],
      } : l),
    });
  },
});
