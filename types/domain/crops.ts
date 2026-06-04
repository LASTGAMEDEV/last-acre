export interface SeedGenes {
  yield: number;
  drought: number;
  growth: number;
  quality: number;
}

export interface SeedEntry {
  id: string;
  cropId: string;
  generation: number;
  genes: SeedGenes;
  createdDay: number;
  quantity: number;
}

export interface HybridJob {
  id: string;
  cropId: string;
  parentAId: string;
  parentBId: string;
  startDay: number;
  readyDay: number;
  cost: number;
}
