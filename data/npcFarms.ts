export interface NPCFarmDefinition {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[]; // cropIds they favor
  sellIntervalDays: number;
  startingWealth: number;
}

export const NPC_FARM_DEFINITIONS: NPCFarmDefinition[] = [
  {
    id: 'npc_rivera',
    name: 'Rivera Ranch',
    tier: 1,
    specialization: ['wheat', 'corn'],
    sellIntervalDays: 10,
    startingWealth: 5000,
  },
  {
    id: 'npc_golden',
    name: 'Golden Valley Co.',
    tier: 2,
    specialization: ['soy', 'sunflower'],
    sellIntervalDays: 6,
    startingWealth: 15000,
  },
  {
    id: 'npc_sierra',
    name: 'Sierra Agro',
    tier: 3,
    specialization: ['cotton', 'rice', 'sugarbeet'],
    sellIntervalDays: 3,
    startingWealth: 40000,
  },
  {
    id: 'npc_verde',
    name: 'Verde Fields',
    tier: 1,
    specialization: ['barley', 'oats'],
    sellIntervalDays: 10,
    startingWealth: 4000,
  },
  {
    id: 'npc_altavista',
    name: 'Altavista Farms',
    tier: 2,
    specialization: ['potatoes', 'rapeseed'],
    sellIntervalDays: 6,
    startingWealth: 12000,
  },
];
