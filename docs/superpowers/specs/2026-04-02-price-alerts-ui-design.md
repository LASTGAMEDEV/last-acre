# Price Alerts UI — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

The store already has `priceAlerts: { id, cropId, targetPrice }[]`, `addPriceAlert`, `removePriceAlert`, and advanceDay logic that fires alerts. This spec covers only the missing UI in `app/(tabs)/economia.tsx`.

## Feature Description

Players can set a price alert on any crop in the Market tab. When the crop's market price crosses the target, an EventBanner notification fires and the alert is removed.

## UI Design

### Alert button (Market tab — crop detail area)
When a crop is selected in the Market tab, show a small "🔔 Alert" row below the sell controls:
- If no alert exists for this crop: show `🔔 Set alert at $___` with a numeric input and a Set button
- If an alert exists: show `🔔 Alert set at $X.XX` with a ✕ remove button
- Input: numeric, pre-filled with current price

### Alert list (Market tab — below crop selector)
A compact section showing all active alerts:
- Each row: crop name + target price + ✕ button
- Only shown if alerts exist
- Label: "🔔 Active Alerts (N)"

## Store Changes

Add `direction: 'above' | 'below'` to the `PriceAlert` interface and `addPriceAlert` signature. The advanceDay alert check fires when:
- direction === 'above' AND currentPrice >= targetPrice
- direction === 'below' AND currentPrice <= targetPrice

Default direction when setting alert: 'above' if target > current price, 'below' if target < current price.

When an alert fires: add to `newsEvents` with message `"🔔 Price alert: [CropName] reached $X.XX"` and remove the alert.

## Files Changed

| File | Action |
|------|--------|
| `store/useGameStore.ts` | Modify — add `direction` field to PriceAlert interface + initial state + addPriceAlert signature + advanceDay check |
| `app/(tabs)/economia.tsx` | Modify — add alert input row to crop detail + active alerts list section |
