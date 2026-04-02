# Regional Market — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Instead of one global market, players can sell to 3 regional destinations with different price multipliers and transport costs. Higher-paying markets unlock as the game progresses.

## Markets

| ID | Name | Unlock | Price Multiplier | Transport Cost |
|----|------|--------|-----------------|----------------|
| `local` | Local Market | Always | 1.0× | $0/unit |
| `city` | City Market | Day 60 | 1.18× | $0.04/unit |
| `export` | Export Hub | Day 180 | 1.40× | $0.12/unit |

Transport cost is per unit sold (kg or L), deducted after the 15% market tax.

## Net Revenue Formula

```
netRevenue = quantity × price × multiplier × 0.85 − (quantity × transportCost)
```

## UI Change (economia.tsx — Market tab)

When selling a crop, show a market selector above the Sell button:
- 3 chips: Local / City / Export (greyed out + locked icon if not unlocked)
- Selected chip highlighted
- Below chips: net revenue preview updates live as market changes
- Default: highest unlocked market

The existing `sellCrop(cropId, quantity)` action is extended to `sellCrop(cropId, quantity, marketId)`.

## Store Changes

```typescript
// GameState additions:
selectedMarket: 'local' | 'city' | 'export';  // persisted preference
setSelectedMarket: (market: 'local' | 'city' | 'export') => void;
```

Market unlock is derived from `day` (no extra state needed).

`sellCrop` action updated to accept optional `marketId` parameter, apply multiplier and deduct transport cost.

## Data File

`data/marketRegions.ts` — static definitions:
```typescript
export interface MarketRegion {
  id: 'local' | 'city' | 'export';
  name: string;
  icon: string;
  unlockDay: number;
  priceMultiplier: number;
  transportCostPerUnit: number;
}
```

## Files Changed

| File | Action |
|------|--------|
| `data/marketRegions.ts` | Create — market region definitions |
| `store/useGameStore.ts` | Modify — add `selectedMarket` state + `setSelectedMarket` + update `sellCrop` |
| `app/(tabs)/economia.tsx` | Modify — add market selector chips + live net revenue preview |
