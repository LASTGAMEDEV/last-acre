export interface SoilHealth {
  nitrogen: number;
  organicMatter: number;
  compaction: number;
  ph: number;
  microbialLife: number;
  phosphorus: number;
  potassium: number;
  drainage: number;
  salinity: number;
}

export interface SoilDegradationFlags {
  daysSinceLastTillage: number;
  daysSinceHeavyMachinery: number;
  daysWithCoverCrop: number;
  totalIrrigationThisSeason: number;
  totalFertilizerNThisSeason: number;
  timesSubsoiled: number;
  erosionEventsThisYear: number;
}

export interface SoilAmendment {
  id: string;
  name: string;
  nameEs: string;
  organicAllowed: boolean;
  effects: Partial<SoilHealth>;
  costPerTon: number;
  typicalDoseTonsPerHa: number;
}
