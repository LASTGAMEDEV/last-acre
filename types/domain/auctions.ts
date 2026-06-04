import type { AnimalGenes } from '../../engine/animals';
import type { LandParcel } from './land';

export interface AuctionPickup {
  listingId: string;
  animalTypeId: string;
  genes: AnimalGenes;
  paidDay: number;
  pickedUpDay: number | null;
}

export interface AuctionBid {
  day: number;
  amount: number;
  isPlayer: boolean;
}

export interface AuctionLot {
  id: string;
  parcel: LandParcel;
  startDay: number;
  endDay: number;
  startingBid: number;
  currentBid: number;
  bids: AuctionBid[];
  playerBid: number | null;
  resolved: boolean;
  playerWon: boolean | null;
}

export type AuctionCategory = 'land' | 'animal' | 'crop' | 'machinery';

export interface AuctionListing {
  id: string;
  category: AuctionCategory;
  sellerId: 'player' | string;
  parcelId?: string;
  parcel?: LandParcel;
  animalId?: string;
  animalTypeId?: string;
  animalGenes?: AnimalGenes;
  animalBreedId?: string;
  animalBreedCrossParents?: [string, string];
  animalSex?: 'male' | 'female';
  animalBornDay?: number;
  machinePurchasedDay?: number;
  cropId?: string;
  cropQuantity?: number;
  machineId?: string;
  machineTypeId?: string;
  conditionScore?: number;
  startingBid: number;
  reservePrice: number;
  currentBid: number;
  bids: AuctionBid[];
  playerBid: number | null;
  createdDay: number;
  expiresDay: number;
  resolved: boolean;
  playerWon: boolean | null;
}
