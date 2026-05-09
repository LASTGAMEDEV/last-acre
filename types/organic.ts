export type OrganicStatus = 'conventional' | 'applicationPending' | 'inTransition' | 'certifiedOrganic';

export interface InspectionRecord {
  day: number;
  result: 'pass' | 'warning' | 'fail';
  parcelId: string | null;
  notes: string[];
}

export interface ComplianceViolation {
  day: number;
  parcelId: string;
  violation: 'syntheticPesticide' | 'syntheticFertilizer' | 'gmoSeed' | 'missingRecords';
  inputName: string;
  autoDecertify: boolean;
}

export interface OrganicCertification {
  status: OrganicStatus;
  applicationDay: number | null;
  transitionStartDay: number | null;
  certificationDay: number | null;
  transitionYearsCompleted: number;
  lastInspectionDay: number;
  nextInspectionDay: number;
  inspectionHistory: InspectionRecord[];
  complianceViolations: ComplianceViolation[];
  decertifiedUntilDay: number | null;
  organicBuyersUnlocked: boolean;
  organicContractsAvailable: boolean;
}
