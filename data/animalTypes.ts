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
}

export const ANIMAL_TYPES: AnimalType[] = [
  { id: 'gallina',  name: 'Chicken',  buyCost: 25,   maturityDays: 20,  maxPriceAge: 365,  maxSellPrice: 60,  productionType: 'eggs',  productionRate: 0.85,    breedingDays: 30,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.12 },
  { id: 'vaca',     name: 'Cow',      buyCost: 1800,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 3500, productionType: 'milk',  productionRate: 28,   breedingDays: 270, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 14   },
  { id: 'oveja',    name: 'Sheep',    buyCost: 220,  maturityDays: 60,  maxPriceAge: 548,  maxSellPrice: 550,  productionType: 'wool',  productionRate: 0.07, breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8  },
  { id: 'cerdo',    name: 'Pig',      buyCost: 180,  maturityDays: 45,  maxPriceAge: 180,  maxSellPrice: 450,  productionType: 'meat',  productionRate: 0,    breedingDays: 115, enclosureType: 'pocilga',     feedType: 'grain', feedKgPerDay: 2.5  },
  { id: 'conejo',   name: 'Rabbit',   buyCost: 35,   maturityDays: 15,  maxPriceAge: 180,  maxSellPrice: 90,  productionType: 'meat',  productionRate: 0,    breedingDays: 30,  enclosureType: 'conejera',    feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'cabra',    name: 'Goat',     buyCost: 200,  maturityDays: 45,  maxPriceAge: 548,  maxSellPrice: 480,  productionType: 'milk',  productionRate: 3.5,    breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8  },
  { id: 'caballo',  name: 'Horse',    buyCost: 3500, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 12000, productionType: null,    productionRate: 0,    breedingDays: 330, enclosureType: 'caballeriza', feedType: 'hay',   feedKgPerDay: 9    },
  { id: 'pato',     name: 'Duck',     buyCost: 22,   maturityDays: 25,  maxPriceAge: 365,  maxSellPrice: 55,  productionType: 'eggs',  productionRate: 0.6,  breedingDays: 45,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'abeja',    name: 'Bee',      buyCost: 180,  maturityDays: 7,   maxPriceAge: 180,  maxSellPrice: 280,  productionType: 'honey', productionRate: 0.08,  breedingDays: 0,   enclosureType: 'colmena',     feedType: null,    feedKgPerDay: 0    },
  { id: 'alpaca',   name: 'Alpaca',   buyCost: 900,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 2200, productionType: 'wool',  productionRate: 0.09, breedingDays: 240, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.6  },
  { id: 'pavo',     name: 'Turkey',   buyCost: 45,  maturityDays: 60,  maxPriceAge: 180,  maxSellPrice: 200,  productionType: 'meat',  productionRate: 0,    breedingDays: 120, enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.25 },
  { id: 'codorniz', name: 'Quail',    buyCost: 8,   maturityDays: 12,  maxPriceAge: 120,  maxSellPrice: 28,   productionType: 'eggs',  productionRate: 1.0,  breedingDays: 20,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.03 },
  { id: 'bufalo',   name: 'Buffalo',  buyCost: 3200, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 8500, productionType: 'milk',  productionRate: 12,   breedingDays: 300, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 18   },
];
