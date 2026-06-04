export interface ProductionBuildingState {
  id: string;
  buildingTypeId: string;
  animalTypeId: string;
  hygiene: number;
  capacity: number;
  certificationTier: 'basic' | 'certified' | 'organic';
  certDaysAtThreshold: number;
  certInspectionsPassed: number;
  equipmentSlots: string[];
  assignedWorkerIds: string[];
  lastDeepCleanSeason: string | null;
}

export interface HenilBatch {
  batchId: string;
  wetGrassKg: number;
  startDay: number;
  readyDay: number;
}

export interface IncubationBatch {
  batchId: string;
  typeId: string;
  eggCount: number;
  startDay: number;
  readyDay: number;
}
