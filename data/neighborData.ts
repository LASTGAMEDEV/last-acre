// data/neighborData.ts

export type NeighborId =
  | 'caldwells' | 'petrovs' | 'greens' | 'hendersons'
  | 'obriens' | 'rodriguezes' | 'millers' | 'kowalskis';

export type NeighborProfile = {
  id: NeighborId;
  displayName: string;
  archetype: string;
  description: string;
  startingLandHectares: number;
  startingCash: number;
  startingDebt: number;
  productivityBase: number;
  leverageAggressiveness: number;
  stressRatio: number;
  bankruptRatio: number;
};

export const NEIGHBOR_PROFILES: Record<NeighborId, NeighborProfile> = {
  caldwells:   { id: 'caldwells',   displayName: 'The Caldwells',   archetype: 'Large conventional, over-leveraged',  description: 'The biggest farm in the county. High debt, expanded in boom years.',                   startingLandHectares: 300, startingCash: 15000, startingDebt: 80000, productivityBase: 1.10, leverageAggressiveness: 0.9, stressRatio: 3.0, bankruptRatio: 6.0 },
  petrovs:     { id: 'petrovs',     displayName: 'The Petrovs',     archetype: 'Traditional mixed, conservative',     description: 'Old-fashioned and careful. Low debt, steady. Will outlast most.',                    startingLandHectares: 80,  startingCash: 12000, startingDebt: 5000,  productivityBase: 0.90, leverageAggressiveness: 0.1, stressRatio: 1.5, bankruptRatio: 3.5 },
  greens:      { id: 'greens',      displayName: 'The Greens',      archetype: 'Small progressive, early adopter',    description: 'Idealistic and struggling early. Their organic pivot will eventually pay off.',     startingLandHectares: 40,  startingCash: 6000,  startingDebt: 8000,  productivityBase: 0.85, leverageAggressiveness: 0.4, stressRatio: 2.0, bankruptRatio: 5.0 },
  hendersons:  { id: 'hendersons',  displayName: 'The Hendersons',  archetype: 'Grain specialists, futures traders',  description: 'Big grain operation. Live and die by commodity prices.',                              startingLandHectares: 150, startingCash: 20000, startingDebt: 25000, productivityBase: 1.05, leverageAggressiveness: 0.6, stressRatio: 2.5, bankruptRatio: 5.5 },
  obriens:     { id: 'obriens',     displayName: "The O'Briens",    archetype: 'Dairy-focused, old-school',           description: 'Three generations of dairy. Resistant to tech but deeply reliable.',                startingLandHectares: 90,  startingCash: 10000, startingDebt: 12000, productivityBase: 0.95, leverageAggressiveness: 0.2, stressRatio: 1.8, bankruptRatio: 4.0 },
  rodriguezes: { id: 'rodriguezes', displayName: 'The Rodriguezes', archetype: 'Entrepreneurial, agritourism',        description: 'Big ambitions and borrowed money. Agritourism pivot will make them formidable.',    startingLandHectares: 30,  startingCash: 4000,  startingDebt: 15000, productivityBase: 0.80, leverageAggressiveness: 0.7, stressRatio: 2.8, bankruptRatio: 6.0 },
  millers:     { id: 'millers',     displayName: 'The Millers',     archetype: 'Elderly couple, no heirs',            description: 'Debt-free and winding down. No children. Their land needs a new owner.',            startingLandHectares: 60,  startingCash: 18000, startingDebt: 0,     productivityBase: 0.85, leverageAggressiveness: 0.0, stressRatio: 1.2, bankruptRatio: 3.0 },
  kowalskis:   { id: 'kowalskis',   displayName: 'The Kowalskis',   archetype: 'Specialty crops, farmers market',     description: 'Small but nimble. Early CSA adopters. A co-op partnership could benefit both.',     startingLandHectares: 25,  startingCash: 5000,  startingDebt: 6000,  productivityBase: 0.90, leverageAggressiveness: 0.3, stressRatio: 1.6, bankruptRatio: 4.0 },
};

export const NEIGHBOR_IDS: NeighborId[] = [
  'caldwells', 'petrovs', 'greens', 'hendersons',
  'obriens', 'rodriguezes', 'millers', 'kowalskis',
];

export const OPERATING_COST_PER_HECTARE = 8;
