import type { Worker } from '../../data/workerTypes';
import type { GeneratorModel, PendingGrant } from '../../data/electricityTypes';
import {
  BATTERY_COST_PER_BANK,
  BATTERY_SERVICE_COST,
  BIOGAS_BUILD_COST,
  BIOMASS_BUILD_COST,
  BIOMASS_FUEL_SEASON_DAYS,
  GENERATOR_CONFIG,
  GRID_TIER_CONFIG,
  HEAT_PIPE_BUILD_COST,
  SOLAR_COST_PER_PANEL,
  SOLAR_GRANT_PCT,
  SOLAR_SERVICE_COST,
  SURGE_PROTECTOR_COST,
  WIND_COST_PER_TURBINE,
  WIND_GRANT_PCT,
  WIND_SERVICE_COST,
} from '../../data/electricityTypes';
import { nextGridTier } from '../../engine/electricity';
import type { ActionFactory } from './types';

export interface ElectricityActions {
  upgradeGridTier: () => void;
  buySolarPanels: (count: number) => void;
  buyWindTurbines: (count: number) => void;
  buildBiogasPlant: () => void;
  buildBiomassCHP: () => void;
  loadBiomassStraw: () => void;
  buildHeatPipeNetwork: () => void;
  buyBatteryBanks: (count: number) => void;
  buyGenerator: (model: GeneratorModel) => void;
  refuelGenerator: (litres: number) => void;
  toggleGenerator: () => void;
  serviceEquipment: (type: 'solar' | 'wind' | 'battery') => void;
  addSurgeProtector: (buildingId: string) => void;
}

function hasElectricalCertification(workers: Worker[]): boolean {
  return workers.some((w: Worker) =>
    w.role === 'farm_mechanic' &&
    w.certifications.some(c => c.id === 'fm_electrical' && c.passed)
  );
}

export const createElectricityActions: ActionFactory<ElectricityActions> = (set, get) => ({
  upgradeGridTier: () => {
    const state = get();
    const el = state.electricity;
    const next = nextGridTier(el.gridTier);
    if (!next) return;
    const cost = GRID_TIER_CONFIG[next].upgradeCost;
    if (state.money < cost) return;
    set({ money: state.money - cost, electricity: { ...el, gridTier: next } });
  },

  buySolarPanels: (count) => {
    const state = get();
    const el = state.electricity;
    const cost = count * SOLAR_COST_PER_PANEL;
    if (state.money < cost) return;
    const isFirst = el.solarPanelCount === 0 && !el.solarGrantClaimed;
    const grantAmount = isFirst ? Math.round(cost * SOLAR_GRANT_PCT) : 0;
    const pendingGrants: PendingGrant[] = isFirst
      ? [...el.pendingGrants, { amount: grantAmount, dueDay: state.day + 3, label: 'Solar renewable grant' }]
      : el.pendingGrants;
    set({
      money: state.money - cost,
      electricity: {
        ...el,
        solarPanelCount: el.solarPanelCount + count,
        solarGrantClaimed: isFirst ? true : el.solarGrantClaimed,
        pendingGrants,
      },
    });
  },

  buyWindTurbines: (count) => {
    const state = get();
    const el = state.electricity;
    const cost = count * WIND_COST_PER_TURBINE;
    if (state.money < cost) return;
    const isFirst = el.windTurbineCount === 0 && !el.windGrantClaimed;
    const grantAmount = isFirst ? Math.round(cost * WIND_GRANT_PCT) : 0;
    const pendingGrants: PendingGrant[] = isFirst
      ? [...el.pendingGrants, { amount: grantAmount, dueDay: state.day + 3, label: 'Wind renewable grant' }]
      : el.pendingGrants;
    set({
      money: state.money - cost,
      electricity: {
        ...el,
        windTurbineCount: el.windTurbineCount + count,
        windGrantClaimed: isFirst ? true : el.windGrantClaimed,
        pendingGrants,
      },
    });
  },

  buildBiogasPlant: () => {
    const state = get();
    const el = state.electricity;
    if (el.biogasPlantBuilt || state.money < BIOGAS_BUILD_COST) return;
    set({ money: state.money - BIOGAS_BUILD_COST, electricity: { ...el, biogasPlantBuilt: true } });
  },

  buildBiomassCHP: () => {
    const state = get();
    const el = state.electricity;
    if (el.biomassCHPBuilt || state.money < BIOMASS_BUILD_COST) return;
    set({ money: state.money - BIOMASS_BUILD_COST, electricity: { ...el, biomassCHPBuilt: true } });
  },

  loadBiomassStraw: () => {
    const state = get();
    const el = state.electricity;
    if (!el.biomassCHPBuilt) return;
    set({ electricity: { ...el, biomassFuelDaysRemaining: BIOMASS_FUEL_SEASON_DAYS } });
  },

  buildHeatPipeNetwork: () => {
    const state = get();
    const el = state.electricity;
    if (el.heatPipeNetworkBuilt || state.money < HEAT_PIPE_BUILD_COST) return;
    set({ money: state.money - HEAT_PIPE_BUILD_COST, electricity: { ...el, heatPipeNetworkBuilt: true } });
  },

  buyBatteryBanks: (count) => {
    const state = get();
    const el = state.electricity;
    if (!hasElectricalCertification(state.workers ?? [])) return;
    const cost = count * BATTERY_COST_PER_BANK;
    if (state.money < cost) return;
    set({ money: state.money - cost, electricity: { ...el, batteryBankCount: el.batteryBankCount + count } });
  },

  buyGenerator: (model) => {
    const state = get();
    const el = state.electricity;
    if (el.generatorModel) return;
    const cost = GENERATOR_CONFIG[model].purchaseCost;
    if (state.money < cost) return;
    set({ money: state.money - cost, electricity: { ...el, generatorModel: model } });
  },

  refuelGenerator: (litres) => {
    const state = get();
    const el = state.electricity;
    if (!el.generatorModel) return;
    const cap = GENERATOR_CONFIG[el.generatorModel].tankCapacityLitres;
    set({ electricity: { ...el, generatorFuelLitres: Math.min(cap, el.generatorFuelLitres + litres) } });
  },

  toggleGenerator: () => {
    const state = get();
    const el = state.electricity;
    if (!el.generatorModel) return;
    set({ electricity: { ...el, generatorActive: !el.generatorActive } });
  },

  serviceEquipment: (type) => {
    const state = get();
    const el = state.electricity;
    if (!hasElectricalCertification(state.workers ?? [])) return;
    const cost = type === 'solar' ? SOLAR_SERVICE_COST : type === 'wind' ? WIND_SERVICE_COST : BATTERY_SERVICE_COST;
    if (state.money < cost) return;
    const damagedSources = el.damagedSources.filter(s => s !== type);
    const patch =
      type === 'solar' ? { solarPanelHealth: 95, solarLastServiceDay: state.day, damagedSources }
    : type === 'wind' ? { windTurbineHealth: 95, windLastServiceDay: state.day, damagedSources }
    : { batteryHealthPercent: 95, batteryLastServiceDay: state.day, damagedSources };
    set({ money: state.money - cost, electricity: { ...el, ...patch } });
  },

  addSurgeProtector: (buildingId) => {
    const state = get();
    const el = state.electricity;
    if (el.surgeProtectedBuildings.includes(buildingId)) return;
    if (state.money < SURGE_PROTECTOR_COST) return;
    set({
      money: state.money - SURGE_PROTECTOR_COST,
      electricity: { ...el, surgeProtectedBuildings: [...el.surgeProtectedBuildings, buildingId] },
    });
  },
});
