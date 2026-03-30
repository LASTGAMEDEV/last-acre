import { CROP_TYPES } from './cropTypes';

export interface MilestoneDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'first_harvest',   icon: '🌾', title: 'First Harvest',     description: 'Harvest your first crop' },
  { id: 'tier_c',          icon: '🌿', title: 'Moving Up',         description: 'Harvest a Tier C crop' },
  { id: 'tier_b',          icon: '🌱', title: 'Established',       description: 'Harvest a Tier B crop' },
  { id: 'tier_a',          icon: '✨', title: 'Elite Farmer',      description: 'Harvest a Tier A crop' },
  { id: 'tier_s',          icon: '👑', title: 'Master Farmer',     description: 'Harvest a Tier S specialty crop' },
  { id: 'five_ha',         icon: '🗺️', title: 'Growing Land',      description: 'Own 5+ ha of farmland' },
  { id: 'ten_ha',          icon: '🏞️', title: 'Big Farmer',        description: 'Own 10+ ha of farmland' },
  { id: 'twenty_ha',       icon: '👑', title: 'Land Baron',        description: 'Own 20+ ha of farmland' },
  { id: 'cash_10k',        icon: '💵', title: 'Comfortable',       description: 'Reach $10,000 cash' },
  { id: 'cash_50k',        icon: '💰', title: 'Prosperous',        description: 'Reach $50,000 cash' },
  { id: 'cash_250k',       icon: '🤑', title: 'Tycoon',            description: 'Reach $250,000 cash' },
  { id: 'first_animal',    icon: '🐄', title: 'Livestock',         description: 'Own your first animal' },
  { id: 'five_animals',    icon: '🐓', title: 'Animal Farm',       description: 'Own 5 or more animals' },
  { id: 'first_machine',   icon: '🚜', title: 'Mechanized',        description: 'Buy your first machine' },
  { id: 'three_machines',  icon: '🏭', title: 'Industrialist',     description: 'Own 3 or more machines' },
  { id: 'first_contract',  icon: '📋', title: 'Business Partner',  description: 'Complete a delivery contract' },
  { id: 'first_insurance', icon: '🛡️', title: 'Risk Manager',      description: 'Buy an insurance policy' },
  { id: 'savings_5k',      icon: '🏦', title: 'Saver',             description: 'Keep $5,000+ in savings' },
  { id: 'day_100',         icon: '📅', title: 'Veteran',           description: 'Survive 100 days' },
  { id: 'day_365',         icon: '🗓️', title: 'One Full Year',     description: 'Survive a full year (365 days)' },
];

export function checkNewMilestones(
  state: {
    day: number;
    money: number;
    parcels: { owned: boolean; hectares: number }[];
    animals: { id: string }[];
    machines: { id: string }[];
    contracts: { completed?: boolean }[];
    insurances: { id: string }[];
    savings: { balance: number };
    harvestedCropIds: string[];
  },
  completedMilestones: string[]
): string[] {
  const done = new Set(completedMilestones);
  const newly: string[] = [];

  function check(id: string, condition: boolean) {
    if (!done.has(id) && condition) newly.push(id);
  }

  const ownedHa = state.parcels
    .filter(p => p.owned)
    .reduce((s, p) => s + p.hectares, 0);

  const harvested = state.harvestedCropIds;

  check('first_harvest',   harvested.length > 0);
  check('tier_c',          harvested.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'C'));
  check('tier_b',          harvested.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'B'));
  check('tier_a',          harvested.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'A'));
  check('tier_s',          harvested.some(id => CROP_TYPES.find(c => c.id === id)?.tier === 'S'));
  check('five_ha',         ownedHa >= 5);
  check('ten_ha',          ownedHa >= 10);
  check('twenty_ha',       ownedHa >= 20);
  check('cash_10k',        state.money >= 10_000);
  check('cash_50k',        state.money >= 50_000);
  check('cash_250k',       state.money >= 250_000);
  check('first_animal',    state.animals.length >= 1);
  check('five_animals',    state.animals.length >= 5);
  check('first_machine',   state.machines.length >= 1);
  check('three_machines',  state.machines.length >= 3);
  check('first_contract',  state.contracts.some(c => c.completed));
  check('first_insurance', state.insurances.length >= 1);
  check('savings_5k',      state.savings.balance >= 5_000);
  check('day_100',         state.day >= 100);
  check('day_365',         state.day >= 365);

  return newly;
}
