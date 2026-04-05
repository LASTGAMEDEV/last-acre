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
  { id: 'gallina',  name: 'Chicken',  buyCost: 80,   maturityDays: 20,  maxPriceAge: 365,  maxSellPrice: 150,  productionType: 'eggs',  productionRate: 1,    breedingDays: 30,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.12 },
  { id: 'vaca',     name: 'Cow',      buyCost: 800,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 2000, productionType: 'milk',  productionRate: 20,   breedingDays: 270, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 15   },
  { id: 'oveja',    name: 'Sheep',    buyCost: 300,  maturityDays: 60,  maxPriceAge: 548,  maxSellPrice: 700,  productionType: 'wool',  productionRate: 0.05, breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.8  },
  { id: 'cerdo',    name: 'Pig',      buyCost: 200,  maturityDays: 45,  maxPriceAge: 180,  maxSellPrice: 600,  productionType: 'meat',  productionRate: 0,    breedingDays: 115, enclosureType: 'pocilga',     feedType: 'grain', feedKgPerDay: 2.5  },
  { id: 'conejo',   name: 'Rabbit',   buyCost: 50,   maturityDays: 15,  maxPriceAge: 180,  maxSellPrice: 120,  productionType: 'meat',  productionRate: 0,    breedingDays: 30,  enclosureType: 'conejera',    feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'cabra',    name: 'Goat',     buyCost: 250,  maturityDays: 45,  maxPriceAge: 548,  maxSellPrice: 600,  productionType: 'milk',  productionRate: 5,    breedingDays: 150, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 2    },
  { id: 'caballo',  name: 'Horse',    buyCost: 2000, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 8000, productionType: null,    productionRate: 0,    breedingDays: 330, enclosureType: 'caballeriza', feedType: 'hay',   feedKgPerDay: 9    },
  { id: 'pato',     name: 'Duck',     buyCost: 60,   maturityDays: 25,  maxPriceAge: 365,  maxSellPrice: 130,  productionType: 'eggs',  productionRate: 0.7,  breedingDays: 45,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.18 },
  { id: 'abeja',    name: 'Bee',      buyCost: 150,  maturityDays: 7,   maxPriceAge: 180,  maxSellPrice: 200,  productionType: 'honey', productionRate: 0.1,  breedingDays: 0,   enclosureType: 'colmena',     feedType: null,    feedKgPerDay: 0    },
  { id: 'alpaca',   name: 'Alpaca',   buyCost: 600,  maturityDays: 90,  maxPriceAge: 730,  maxSellPrice: 1500, productionType: 'wool',  productionRate: 0.08, breedingDays: 240, enclosureType: 'corral',      feedType: 'hay',   feedKgPerDay: 1.6  },
  { id: 'pavo',     name: 'Turkey',   buyCost: 120,  maturityDays: 60,  maxPriceAge: 180,  maxSellPrice: 380,  productionType: 'meat',  productionRate: 0,    breedingDays: 120, enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.25 },
  { id: 'codorniz', name: 'Quail',    buyCost: 25,   maturityDays: 12,  maxPriceAge: 120,  maxSellPrice: 65,   productionType: 'eggs',  productionRate: 1.2,  breedingDays: 20,  enclosureType: 'gallinero',   feedType: 'grain', feedKgPerDay: 0.03 },
  { id: 'bufalo',   name: 'Buffalo',  buyCost: 2800, maturityDays: 180, maxPriceAge: 1095, maxSellPrice: 9000, productionType: 'milk',  productionRate: 10,   breedingDays: 300, enclosureType: 'establo',     feedType: 'hay',   feedKgPerDay: 18   },
];
