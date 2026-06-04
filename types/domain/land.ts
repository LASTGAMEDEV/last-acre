import type { PlantedCrop, SoilStats, SoilType } from '../../engine/crops';

export interface LandParcel {
  id: string;
  name: string;
  /** @deprecated use soil.nitrogen; kept for save migration only */
  fertility: number;
  soil: SoilStats;
  cropHistory: string[];
  hectares: number;
  pricePerHa: number;
  owned: boolean;
  hasWeeds: boolean;
  plantedCrop: PlantedCrop | null;
  lastCropId?: string;
  greenhouse: boolean;
  irrigated: boolean;
  tilled: boolean;
  seedEntryId?: string;
  soilType?: SoilType;
  diseased?: boolean;
  diseasedDay?: number;
  pestState?: import('../../engine/pests').PestState;
  linkedColmenaId?: string;
  pesticideSprayedDay?: number;
  soilAnalysis?: import('../../engine/precision').SoilAnalysis;
  precisionApplied: boolean;
  yieldHistory: import('../../engine/precision').YieldEntry[];
  weedDetectedDay?: number;
  soilWetUntilDay?: number;
  bareDayCtr?: number;
  recentIrrigationDays?: number[];
  soilSalinity?: number;
  topsoilErosion?: number;
  tillageSystem?: 'conventional' | 'reduced' | 'notill';
  tillageSystemSince?: number;
  notillSeasons?: number;
  residueCoverage?: boolean;
  weedFlushSeason?: boolean;
  waterwayAdjacent?: boolean;
  organicStatus?: 'conventional' | 'transition_1' | 'transition_2' | 'transition_3' | 'organic' | 'decertified';
  organicTransitionStartDay?: number;
  lastDecertifiedDay?: number;
  pendingContaminationAppeal?: import('../../engine/organicCert').ContaminationAppeal;
  compostNPKReleaseRemaining?: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    daysLeft: number;
  };
}
