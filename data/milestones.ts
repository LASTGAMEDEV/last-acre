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
  // Revenue chains
  { id: 'cash_500k',      icon: '💎', title: 'Half a Million',     description: 'Reach $500,000 cash' },
  { id: 'cash_1m',        icon: '🏦', title: 'Millionaire',        description: 'Reach $1,000,000 cash' },
  // Land chains
  { id: 'thirty_ha',      icon: '🌍', title: 'Estate Owner',       description: 'Own 30+ ha of farmland' },
  { id: 'fifty_ha',       icon: '🏰', title: 'Agricultural Empire', description: 'Own 50+ ha of farmland' },
  // Animal chains
  { id: 'twenty_animals', icon: '🐄', title: 'Rancher',            description: 'Own 20 or more animals' },
  { id: 'fifty_animals',  icon: '🐑', title: 'Ranch Empire',       description: 'Own 50 or more animals' },
  // Machine chains
  { id: 'five_machines',  icon: '🔩', title: 'Fully Equipped',     description: 'Own 5 or more machines' },
  { id: 'ten_machines',   icon: '🏗️', title: 'Industrial Farm',    description: 'Own 10 or more machines' },
  // Contract chains
  { id: 'five_contracts',    icon: '📑', title: 'Reliable Supplier',  description: 'Complete 5 delivery contracts' },
  { id: 'twenty_contracts',  icon: '🤝', title: 'Contract Magnate',   description: 'Complete 20 delivery contracts' },
  // Savings chains
  { id: 'savings_50k',    icon: '🏦', title: 'Big Saver',          description: 'Keep $50,000+ in savings' },
  // Time chains
  { id: 'day_730',        icon: '📆', title: 'Two Full Years',     description: 'Survive 730 days' },
  // Prestige
  { id: 'first_prestige', icon: '⚡', title: 'Legend Begins',      description: 'Complete a full year and earn first prestige' },
  // Processing
  { id: 'first_processed', icon: '🏭', title: 'Value Added',       description: 'Sell your first processed product' },
  // Rare achievements
  { id: 'gen5_seed',         icon: '🧬', title: 'Gene Pioneer',       description: 'Develop a generation 5+ seed in the Seed Lab' },
  { id: 'perfect_animal',    icon: '⭐', title: 'Perfect Specimen',    description: 'Own an animal with all genes rated A or higher (≥1.2)' },
  { id: 'thirty_contracts',  icon: '🏆', title: 'Contract Legend',     description: 'Complete 30 delivery contracts' },
  { id: 'no_default_10',     icon: '🤝', title: 'Trustworthy',         description: 'Complete 10 contracts in a row without defaulting' },
  { id: 'cash_2m',           icon: '💫', title: 'Agricultural Mogul',  description: 'Accumulate $2,000,000 cash' },
  { id: 'full_workforce',    icon: '👥', title: 'Full Staff',          description: 'Have at least 6 workers employed at once' },
];

export const MILESTONE_REWARDS: Record<string, number> = {
  first_harvest:   500,
  tier_c:        1_000,
  tier_b:        2_500,
  tier_a:        5_000,
  tier_s:       10_000,
  five_ha:       1_500,
  ten_ha:        3_000,
  twenty_ha:     7_500,
  cash_10k:      1_000,
  cash_50k:      2_500,
  cash_250k:    10_000,
  first_animal:    500,
  five_animals:  2_000,
  first_machine: 1_000,
  three_machines:3_000,
  first_contract:1_500,
  first_insurance: 500,
  savings_5k:    1_000,
  day_100:       2_000,
  day_365:      10_000,
  cash_500k:      25_000,
  cash_1m:        50_000,
  thirty_ha:      15_000,
  fifty_ha:       30_000,
  twenty_animals: 5_000,
  fifty_animals:  15_000,
  five_machines:  8_000,
  ten_machines:   20_000,
  five_contracts: 5_000,
  twenty_contracts: 15_000,
  savings_50k:    5_000,
  day_730:        25_000,
  first_prestige: 20_000,
  first_processed: 3_000,
  gen5_seed:        20_000,
  perfect_animal:   15_000,
  thirty_contracts: 25_000,
  no_default_10:    10_000,
  cash_2m:         100_000,
  full_workforce:   12_000,
};

export function checkNewMilestones(
  state: {
    day: number;
    money: number;
    parcels: { owned: boolean; hectares: number }[];
    animals: { id: string; genes?: { production: number; hardiness: number; growth: number; value: number } }[];
    machines: { id: string }[];
    contracts: { completed?: boolean; failed?: boolean }[];
    insurances: { id: string }[];
    savings: { balance: number };
    harvestedCropIds: string[];
    seedVault?: { generation: number }[];
    workers?: { id: string }[];
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
  check('cash_500k',        state.money >= 500_000);
  check('cash_1m',          state.money >= 1_000_000);
  check('thirty_ha',        ownedHa >= 30);
  check('fifty_ha',         ownedHa >= 50);
  check('twenty_animals',   state.animals.length >= 20);
  check('fifty_animals',    state.animals.length >= 50);
  check('five_machines',    state.machines.length >= 5);
  check('ten_machines',     state.machines.length >= 10);
  check('five_contracts',   state.contracts.filter(c => c.completed).length >= 5);
  check('twenty_contracts', state.contracts.filter(c => c.completed).length >= 20);
  check('savings_50k',      state.savings.balance >= 50_000);
  check('day_730',          state.day >= 730);
  check('first_prestige',   (state as any).prestige >= 1);

  check('gen5_seed',        (state.seedVault ?? []).some(s => s.generation >= 5));
  check('perfect_animal',   state.animals.some(a => {
    const g = a.genes;
    return g && g.production >= 1.2 && g.hardiness >= 1.2 && g.growth >= 1.2 && g.value >= 1.2;
  }));
  check('thirty_contracts', state.contracts.filter(c => c.completed).length >= 30);
  check('no_default_10',    state.contracts.filter(c => c.completed).length >= 10 && !state.contracts.some(c => c.failed));
  check('cash_2m',          state.money >= 2_000_000);
  check('full_workforce',   (state.workers ?? []).length >= 6);

  return newly;
}
