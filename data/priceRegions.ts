export interface PriceRegion {
  id: string;
  name: string;
  multipliers: Record<string, number>;
}

export const PRICE_REGIONS: PriceRegion[] = [
  { id: 'global', name: 'Global Market', multipliers: {} },
];

export const ACTIVE_REGION_ID = 'global';

export function getRegionMultiplier(commodityId: string, regionId = ACTIVE_REGION_ID): number {
  const region = PRICE_REGIONS.find(r => r.id === regionId);
  return region?.multipliers[commodityId] ?? 1.0;
}
