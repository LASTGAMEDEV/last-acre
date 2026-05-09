export interface StoredCropBatch {
  id: string;
  cropId: string;
  parcelId: string;
  harvestDay: number;
  quantityKg: number;
  baseQuality: number;
  currentQuality: number;
  qualityGrade: 'premium' | 'standard' | 'feed' | 'waste';
  moisturePercent: number;
  temperatureC: number;
  pestInfestation: number;
  moldSeverity: number;
  facilityId: string | null;
  storageType: 'bag' | 'silo' | 'coldStorage' | 'hermeticBag';
  dryingHistory: DryingRecord[];
  fumigationHistory: FumigationRecord[];
  temperatureLog: { day: number; tempC: number }[];
}

export interface DryingRecord {
  day: number;
  method: 'sun' | 'mechanical' | 'continuousFlow';
  moistureBefore: number;
  moistureAfter: number;
  fuelLiters: number;
  electricityKwh: number;
  cost: number;
}

export interface FumigationRecord {
  day: number;
  method: 'phosphine' | 'coldTreatment' | 'diatomaceousEarth';
  effectiveness: number;
  cost: number;
  organicCompliant: boolean;
}

export interface StorageFacility {
  id: string;
  name: string;
  type: 'flatWarehouse' | 'silo' | 'coldStorage' | 'hermeticSilo';
  capacityKg: number;
  currentLoadKg: number;
  hasAeration: boolean;
  hasTemperatureMonitoring: boolean;
  hasAutoAeration: boolean;
  targetTemperatureC: number | null;
  ambientTemperatureC: number;
  ambientHumidityPercent: number;
  insulationFactor: number;
  batches: string[];
  hotSpots: HotSpot[];
  maintenanceDueDay: number;
}

export interface HotSpot {
  batchId: string;
  location: 'center' | 'wall' | 'base' | 'top';
  temperatureC: number;
  severity: 'warning' | 'critical' | 'emergency';
  daysActive: number;
}
