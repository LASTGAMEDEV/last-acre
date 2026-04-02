# Commodity Exchange — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Expands the existing Economy screen with two additions: (1) interactive price history charts for each crop, and (2) market orders that auto-sell when a crop hits a target price.

The existing Futures tab (open/settle contracts) is unchanged. This spec adds a **Charts** sub-view to the Market tab and a **Orders** tab.

## Feature 1: Price History Charts (Market tab enhancement)

When a crop is selected in the Market tab, show a simple line chart below the current price info displaying the last 30 days of price history.

- Data source: `priceHistory: Record<string, number[]>` already in store (array of daily prices per cropId)
- Chart: rendered as a simple SVG polyline (`react-native-svg` already installed)
- X-axis: last 30 days (or all history if < 30 days)
- Y-axis: auto-scaled to min/max of visible range
- Highlight: current price as a dot; 7-day average as a dashed line
- Color: green if current > 7d avg, red if below

No new dependencies needed (react-native-svg already in project).

## Feature 2: Market Orders tab (new 5th tab)

A **Market Orders** tab between Stats and Futures. Players place orders to auto-sell a quantity of a crop when its price hits a target.

```typescript
interface MarketOrder {
  id: string;
  cropId: string;
  quantity: number;       // units to sell
  targetPrice: number;    // trigger price (sell when price >= this)
  createdDay: number;
  expiresDay: number;     // auto-cancel after this day
}
```

### Order placement
- Select crop, enter quantity (capped at current inventory), set target price, set expiry (7 / 14 / 30 days)
- Preview shows: estimated gross revenue at target price (after 15% tax)
- Quantity is soft-reserved (shown in inventory as "X units (Y reserved)")

### Order execution (in `advanceDay`)
- For each active order: if `prices[cropId].price >= targetPrice` → execute `sellCrop(cropId, quantity)` → add to `salesLog` → remove order
- If expired: cancel order, release reserved quantity, add to newsEvents "Market order for [Crop] expired"

### Order list
- Shows all active orders: crop, quantity, target price, days remaining
- Cancel button per order

## Store Changes

```typescript
// GameState additions:
marketOrders: MarketOrder[];
placeMarketOrder: (cropId: string, quantity: number, targetPrice: number, termDays: number) => void;
cancelMarketOrder: (orderId: string) => void;
```

`reservedInventory: Record<string, number>` — derived (not stored) from active marketOrders, used in UI to show available-to-sell quantity.

## Files Changed

| File | Action |
|------|--------|
| `store/useGameStore.ts` | Modify — add MarketOrder interface + state + actions + advanceDay execution |
| `app/(tabs)/economia.tsx` | Modify — add SVG price chart to Market tab crop detail; add Orders tab |
