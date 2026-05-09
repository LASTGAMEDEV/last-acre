export type TillageSystem = 'conventional' | 'reduced' | 'noTill';

export interface MachineRequirement {
  type: string;
  minPowerHp: number;
  attachment: string;
}

export interface TillageConfig {
  id: TillageSystem;
  name: string;
  nameEs: string;
  fuelLitersPerHa: number;
  laborHoursPerHa: number;
  machineryRequired: MachineRequirement[];
  soilEffects: {
    compactionDelta: number;
    omDelta: number;
    microbialLifeDelta: number;
  };
  weedEffects: {
    initialWeedSuppression: number;
    ongoingWeedMultiplier: number;
  };
  erosionMultiplier: number;
  description: string;
  suitableForSlope: 'all' | 'gentle' | 'flat';
}
