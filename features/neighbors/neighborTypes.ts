// features/neighbors/neighborTypes.ts

import type { NeighborId } from '../../data/neighborData';

export type NeighborStatus = 'thriving' | 'struggling' | 'bankrupt' | 'sold';

export type NeighborFarm = {
  id: NeighborId;
  status: NeighborStatus;
  cash: number;
  debt: number;
  landHectares: number;
  landValue: number;
  relationship: number;
  strugglingYears: number;
  events: string[];
};

export type NeighborState = {
  caldwells:   NeighborFarm;
  petrovs:     NeighborFarm;
  greens:      NeighborFarm;
  hendersons:  NeighborFarm;
  obriens:     NeighborFarm;
  rodriguezes: NeighborFarm;
  millers:     NeighborFarm;
  kowalskis:   NeighborFarm;
};

export type NeighborLandOpportunity = {
  neighborId: NeighborId;
  type: 'auction' | 'direct_sale' | 'partnership';
  hectares: number;
  pricePerHectare: number;
  playerHasPriority: boolean;
  description: string;
};
