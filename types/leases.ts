export interface LeaseAgreement {
  id: string;
  parcelId: string;
  landlordId: string;
  tenancyType: 'cashRent' | 'sharecrop';
  durationYears: number;
  startDay: number;
  endDay: number;
  annualRentPerHa: number;
  totalAnnualRent: number;
  paymentSchedule: 'upfront' | 'split' | 'harvestBased';
  yieldSplitFarmer: number;
  yieldSplitLandlord: number;
  inputResponsibility: 'farmer' | 'landlord' | 'shared';
  subsidyAllocation: 'farmer' | 'landlord' | 'split';
  soilImprovementClause: boolean;
  soilDegradationPenalty: boolean;
  autoRenewal: boolean;
  renewalNoticeDays: number;
  rentEscalationPercent: number;
  status: 'draft' | 'active' | 'terminating' | 'expired' | 'breached';
  terminationReason?: string;
  daysInArrears: number;
}

export interface Landlord {
  id: string;
  name: string;
  type: 'absenteeInvestor' | 'elderlyLocal' | 'familyTrust' | 'municipality' | 'cooperative';
  traits: {
    rentFlexibility: number;
    meddlingFrequency: number;
    patience: number;
    soilConsciousness: number;
    longTermVision: number;
  };
  ownedParcelIds: string[];
  typicalLeaseDuration: number;
  typicalRentPremium: number;
}

export interface LeasableParcel {
  id: string;
  sizeHa: number;
  soilHealth: 'degraded' | 'average' | 'good';
  landlordType: Landlord['type'];
  askingRentPerHa: number;
  durationOffered: number;
  specialConditions?: string[];
}
