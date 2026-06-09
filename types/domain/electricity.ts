import type { GeneratorModel, GridTier, PendingGrant } from '../../data/electricityTypes';

export interface ElectricityState {
  gridTier: GridTier;
  gridRateBase: number;
  solarPanelCount: number;
  solarPanelHealth: number;
  solarLastServiceDay: number;
  windTurbineCount: number;
  windTurbineHealth: number;
  windLastServiceDay: number;
  biogasPlantBuilt: boolean;
  biomassCHPBuilt: boolean;
  biomassFuelDaysRemaining: number;
  heatPipeNetworkBuilt: boolean;
  batteryBankCount: number;
  batteryChargeKwh: number;
  batteryHealthPercent: number;
  batteryLastServiceDay: number;
  generatorModel: GeneratorModel | null;
  generatorFuelLitres: number;
  generatorActive: boolean;
  currentMonthKwhImported: number;
  currentMonthBillEstimate: number;
  lastMonthBill: number;
  billDueDay: number;
  billHistory: number[];
  outageActive: boolean;
  outageEndDay: number | null;
  solarGrantClaimed: boolean;
  windGrantClaimed: boolean;
  pendingGrants: PendingGrant[];
  surgeProtectedBuildings: string[];
  damagedSources: Array<'solar' | 'wind' | 'battery'>;
}
