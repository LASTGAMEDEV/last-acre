export interface NPCFarmDefinition {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[]; // cropIds they favor
  sellIntervalDays: number;
  startingWealth: number;
  dailyProductionKg?: Record<string, number>;
}

export const NPC_FARM_DEFINITIONS: NPCFarmDefinition[] = [
  {
    id: 'npc_rivera',
    name: 'Rivera Ranch',
    tier: 1,
    specialization: ['wheat', 'corn'],
    sellIntervalDays: 10,
    startingWealth: 5000,
    dailyProductionKg: { wheat: 1200, corn: 1500 },
  },
  {
    id: 'npc_golden',
    name: 'Golden Valley Co.',
    tier: 2,
    specialization: ['soy', 'sunflower'],
    sellIntervalDays: 6,
    startingWealth: 15000,
    dailyProductionKg: { soy: 800, sunflower: 600 },
  },
  {
    id: 'npc_sierra',
    name: 'Sierra Agro',
    tier: 3,
    specialization: ['cotton', 'rice', 'sugarbeet'],
    sellIntervalDays: 3,
    startingWealth: 40000,
    dailyProductionKg: { cotton: 400, rice: 900, sugarbeet: 2000 },
  },
  {
    id: 'npc_verde',
    name: 'Verde Fields',
    tier: 1,
    specialization: ['barley', 'oats'],
    sellIntervalDays: 10,
    startingWealth: 4000,
    dailyProductionKg: { barley: 900, oats: 800 },
  },
  {
    id: 'npc_altavista',
    name: 'Altavista Farms',
    tier: 2,
    specialization: ['potatoes', 'rapeseed'],
    sellIntervalDays: 6,
    startingWealth: 12000,
    dailyProductionKg: { potatoes: 1000, rapeseed: 1000 },
  },
];
