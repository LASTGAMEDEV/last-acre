export type SubsidyProgramId =
  | 'basicPayment'
  | 'greeningPayment'
  | 'youngFarmerPayment'
  | 'agriEnvironmentScheme'
  | 'organicFarmingAid'
  | 'livestockPremium';

export interface SubsidyProgram {
  id: SubsidyProgramId;
  name: string;
  nameEs: string;
  description: string;
  paymentType: 'perHectare' | 'perHead' | 'lumpSum' | 'costReimbursement';
  baseRatePerHa: number;
  baseRatePerHead: number;
  maxHectares: number;
  applicationWindow: { openDay: number; closeDay: number };
  advancePaymentPercent: number;
  advancePaymentDay: number;
  balancePaymentDay: number;
  minHectares: number;
  requiresGreening: boolean;
  requiresActiveFarmer: boolean;
  maxAgeForYoungFarmer?: number;
  yearsSinceInstallationMax?: number;
}

export interface GreeningStatus {
  cropDiversification: {
    totalArableHa: number;
    mainCropHa: number;
    mainCropPercent: number;
    secondCropHa: number;
    thirdPlusCropHa: number;
    meetsRequirement: boolean;
  };
  efa: {
    totalEfaHa: number;
    requiredEfaHa: number;
    efaElements: EfaElement[];
    meetsRequirement: boolean;
  };
  permanentGrassland: {
    currentHa: number;
    referenceHa: number;
    ratio: number;
    meetsRequirement: boolean;
  };
  overallGreeningPass: boolean;
  penaltyPercent: number;
}

export interface EfaElement {
  type: 'hedgerow' | 'bufferStrip' | 'fallowLand' | 'coverCrop' | 'agroforestry' | 'nitrogenFixingCrop';
  parcelId: string | null;
  hectares: number;
  weightFactor: number;
  efaEquivalent: number;
}

export interface SubsidyApplication {
  year: number;
  programId: SubsidyProgramId;
  status: 'draft' | 'submitted' | 'underReview' | 'approved' | 'paid' | 'rejected' | 'penalized';
  hectaresClaimed: number;
  parcelsClaimed: string[];
  greeningCompliance: GreeningStatus;
  crossCompliancePass: boolean;
  penaltyPercent: number;
  advancePaid: number;
  balancePaid: number;
  totalPaid: number;
  submittedDay: number | null;
  approvedDay: number | null;
}
