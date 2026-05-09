import { SoilHealth, SoilDegradationFlags } from './soil';

export type TenancyType = 'owned' | 'cashRent' | 'sharecrop';

export interface Tenancy {
  type: TenancyType;
  landlordId: string | null;
  leaseId: string | null;
  canSellParcel: boolean;
  canMortgageParcel: boolean;
  canBuildPermanent: boolean;
}

export interface TillageInfo {
  currentSystem: 'conventional' | 'reduced' | 'noTill';
  timesTilledThisWay: number;
  lastTillageDay: number;
  consecutiveSeasons: number;
}

export interface LandParcel {
  id: string;
  name: string;
  hectares: number;
  soil: SoilHealth;
  degradation: SoilDegradationFlags;
  tenancy: Tenancy;
  tillage: TillageInfo;
  slopePercent: number;
  elevationM: number;
  residueCover: number;
  // ... existing fields from store
  fertility: number;
  cropHistory: string[];
  pricePerHa: number;
  owned: boolean;
  hasWeeds: boolean;
  plantedCrop: any | null;
  lastCropId?: string;
  greenhouse: boolean;
  irrigated: boolean;
  tilled: boolean;
  seedEntryId?: string;
  soilType?: any;
  diseased?: boolean;
  diseasedDay?: number;
  pestState?: any;
}
