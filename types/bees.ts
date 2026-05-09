export interface Beehive {
  id: string;
  buildingId: string;
  parcelId: string;
  colonyStrength: number;
  queenAgeMonths: number;
  queenQuality: 'poor' | 'fair' | 'good' | 'excellent';
  varroaInfestation: number;
  pesticideExposureDays: number;
  pesticideImpact: number;
  honeyStoredKg: number;
  waxStoredKg: number;
  propolisStoredKg: number;
  floweringCalendar: FloweringPeriod[];
  dailyForagePotential: number;
  swarmLikelihood: number;
  hasSwarmedThisSeason: boolean;
  swarmRiskDate: number | null;
  lastInspectionDay: number;
  daysSinceInspection: number;
  treatmentsApplied: TreatmentRecord[];
}

export interface FloweringPeriod {
  cropId: string;
  startDay: number;
  endDay: number;
  nectarValue: number;
  pollenValue: number;
}

export interface TreatmentRecord {
  day: number;
  type: 'varroaOxalic' | 'varroaFormic' | 'varroaThymol' | 'antibiotics';
  effectiveness: number;
  organicCompliant: boolean;
}
