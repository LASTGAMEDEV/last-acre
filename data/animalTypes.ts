export interface NutritionProfile {
  minProteinPct: number;
  optProteinPct: number;
  premiumProteinPct: number;
  minEnergyMJPerDay: number;
  optEnergyMJPerDay: number;
  minRoughagePct: number;
  needsMinerals: boolean;
}

export interface AnimalType {
  id: string;
  name: string;
  buyCost: number;
  maturityDays: number;      // days until productive
  maxPriceAge: number;       // days until max sell price
  maxSellPrice: number;
  productionType: 'eggs' | 'milk' | 'wool' | 'meat' | 'honey' | null;
  productionRate: number;    // units per day when mature
  breedingDays: number;      // days between offspring
  enclosureType: string;
  feedType: 'grain' | 'hay' | null;   // null = self-sufficient (bees)
  feedKgPerDay: number;               // daily consumption at full maturity
  nutritionProfile: NutritionProfile;
}

export const ANIMAL_TYPES: AnimalType[] = [
  { id: 'gallina',  name: 'Chicken',  buyCost: 25,   maturityDays: 20,  maxPriceAge: 365,  maxSellPrice: 60,  productionType: 'eggs',  productionRate: 0.85,    breedingDays: 30,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.12, nutritionProfile: { minProteinPct: 14, optProteinPct: 16, premiumProteinPct: 18, minEnergyMJPerDay: 1.5, optEnergyMJPerDay: 1.8, minRoughagePct: 0, needsMinerals: true } },
  { id: 'vaca',     name: 'Cow',      buyCost: 1800,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 3500, productionType: 'milk',  productionRate: 28,   breedingDays: 270, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 14,   nutritionProfile: { minProteinPct: 13, optProteinPct: 16, premiumProteinPct: 18, minEnergyMJPerDay: 110, optEnergyMJPerDay: 140, minRoughagePct: 40, needsMinerals: true } },
  { id: 'oveja',    name: 'Sheep',    buyCost: 220,  maturityDays: 60,  maxPriceAge: 548,  maxSellPrice: 550,  productionType: 'wool',  productionRate: 0.07, breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8,  nutritionProfile: { minProteinPct: 9,  optProteinPct: 11, premiumProteinPct: 13, minEnergyMJPerDay: 8,  optEnergyMJPerDay: 11,  minRoughagePct: 35, needsMinerals: false } },
  { id: 'cerdo',    name: 'Pig',      buyCost: 180,  maturityDays: 45,  maxPriceAge: 180,  maxSellPrice: 450,  productionType: 'meat',  productionRate: 0,    breedingDays: 115, enclosureType: 'pocilga',     feedType: 'grain', feedKgPerDay: 2.5,  nutritionProfile: { minProteinPct: 13, optProteinPct: 16, premiumProteinPct: 18, minEnergyMJPerDay: 18, optEnergyMJPerDay: 24,  minRoughagePct: 0,  needsMinerals: false } },
  { id: 'conejo',   name: 'Rabbit',   buyCost: 35,   maturityDays: 15,  maxPriceAge: 180,  maxSellPrice: 90,  productionType: 'meat',  productionRate: 0,    breedingDays: 30,  enclosureType: 'conejera',    feedType: 'grain', feedKgPerDay: 0.18, nutritionProfile: { minProteinPct: 13, optProteinPct: 15, premiumProteinPct: 17, minEnergyMJPerDay: 1.2, optEnergyMJPerDay: 1.6, minRoughagePct: 25, needsMinerals: false } },
  { id: 'cabra',    name: 'Goat',     buyCost: 200,  maturityDays: 45,  maxPriceAge: 548,  maxSellPrice: 480,  productionType: 'milk',  productionRate: 3.5,    breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8,  nutritionProfile: { minProteinPct: 12, optProteinPct: 15, premiumProteinPct: 17, minEnergyMJPerDay: 9,  optEnergyMJPerDay: 12,  minRoughagePct: 30, needsMinerals: false } },
  { id: 'caballo',  name: 'Horse',    buyCost: 3500, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 12000, productionType: null,    productionRate: 0,    breedingDays: 330, enclosureType: 'caballeriza', feedType: 'hay',   feedKgPerDay: 9,    nutritionProfile: { minProteinPct: 8,  optProteinPct: 10, premiumProteinPct: 12, minEnergyMJPerDay: 65, optEnergyMJPerDay: 85,  minRoughagePct: 55, needsMinerals: false } },
  { id: 'pato',     name: 'Duck',     buyCost: 22,   maturityDays: 25,  maxPriceAge: 365,  maxSellPrice: 55,  productionType: 'eggs',  productionRate: 0.6,  breedingDays: 45,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.18, nutritionProfile: { minProteinPct: 13, optProteinPct: 15, premiumProteinPct: 17, minEnergyMJPerDay: 2.2, optEnergyMJPerDay: 2.8, minRoughagePct: 0,  needsMinerals: false } },
  { id: 'abeja',    name: 'Bee',      buyCost: 180,  maturityDays: 7,   maxPriceAge: 180,  maxSellPrice: 280,  productionType: 'honey', productionRate: 0.08,  breedingDays: 0,   enclosureType: 'colmena',     feedType: null,    feedKgPerDay: 0,    nutritionProfile: { minProteinPct: 0,  optProteinPct: 0,  premiumProteinPct: 0,  minEnergyMJPerDay: 0,  optEnergyMJPerDay: 0,   minRoughagePct: 0,  needsMinerals: false } },
  { id: 'alpaca',   name: 'Alpaca',   buyCost: 900,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 2200, productionType: 'wool',  productionRate: 0.09, breedingDays: 240, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.6,  nutritionProfile: { minProteinPct: 9,  optProteinPct: 11, premiumProteinPct: 13, minEnergyMJPerDay: 8,  optEnergyMJPerDay: 11,  minRoughagePct: 30, needsMinerals: false } },
  { id: 'pavo',     name: 'Turkey',   buyCost: 45,  maturityDays: 60,  maxPriceAge: 180,  maxSellPrice: 200,  productionType: 'meat',  productionRate: 0,    breedingDays: 120, enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.25, nutritionProfile: { minProteinPct: 16, optProteinPct: 19, premiumProteinPct: 22, minEnergyMJPerDay: 3.5, optEnergyMJPerDay: 4.5, minRoughagePct: 0,  needsMinerals: true } },
  { id: 'codorniz', name: 'Quail',    buyCost: 8,   maturityDays: 12,  maxPriceAge: 120,  maxSellPrice: 28,   productionType: 'eggs',  productionRate: 1.0,  breedingDays: 20,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.03, nutritionProfile: { minProteinPct: 17, optProteinPct: 20, premiumProteinPct: 23, minEnergyMJPerDay: 0.4, optEnergyMJPerDay: 0.5, minRoughagePct: 0,  needsMinerals: true } },
  { id: 'bufalo',   name: 'Buffalo',       buyCost: 3200, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 8500,  productionType: 'milk',  productionRate: 12,   breedingDays: 300, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 18,   nutritionProfile: { minProteinPct: 12, optProteinPct: 14, premiumProteinPct: 16, minEnergyMJPerDay: 140, optEnergyMJPerDay: 180, minRoughagePct: 40, needsMinerals: true } },
  { id: 'novillo',  name: 'Beef Steer',    buyCost: 350,  maturityDays: 120, maxPriceAge: 270,  maxSellPrice: 1600,  productionType: 'meat',  productionRate: 0,    breedingDays: 0,   enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 10,   nutritionProfile: { minProteinPct: 11, optProteinPct: 13, premiumProteinPct: 15, minEnergyMJPerDay: 90,  optEnergyMJPerDay: 120, minRoughagePct: 45, needsMinerals: true } },
  { id: 'ganso',    name: 'Goose',         buyCost: 40,   maturityDays: 35,  maxPriceAge: 400,  maxSellPrice: 130,   productionType: 'eggs',  productionRate: 0.35, breedingDays: 60,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.22, nutritionProfile: { minProteinPct: 13, optProteinPct: 15, premiumProteinPct: 17, minEnergyMJPerDay: 2.8, optEnergyMJPerDay: 3.4, minRoughagePct: 10, needsMinerals: false } },
  { id: 'llama',    name: 'Llama',         buyCost: 480,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 1200,  productionType: 'wool',  productionRate: 0.08, breedingDays: 210, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8,  nutritionProfile: { minProteinPct: 9,  optProteinPct: 11, premiumProteinPct: 13, minEnergyMJPerDay: 9,  optEnergyMJPerDay: 12,  minRoughagePct: 30, needsMinerals: false } },
  { id: 'avestruz', name: 'Ostrich',       buyCost: 800,  maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 3500,  productionType: 'eggs',  productionRate: 0.15, breedingDays: 180, enclosureType: 'corral',      feedType: 'grain', feedKgPerDay: 2.0,  nutritionProfile: { minProteinPct: 15, optProteinPct: 18, premiumProteinPct: 21, minEnergyMJPerDay: 20, optEnergyMJPerDay: 26,  minRoughagePct: 15, needsMinerals: true } },
  { id: 'pintada',  name: 'Guinea Fowl',   buyCost: 12,   maturityDays: 22,  maxPriceAge: 150,  maxSellPrice: 40,    productionType: 'eggs',  productionRate: 0.75, breedingDays: 28,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.04, nutritionProfile: { minProteinPct: 15, optProteinPct: 17, premiumProteinPct: 19, minEnergyMJPerDay: 0.5, optEnergyMJPerDay: 0.7, minRoughagePct: 5,  needsMinerals: false } },
];
