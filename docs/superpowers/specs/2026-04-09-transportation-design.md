# Transportation System — Design Spec

**Date:** 2026-04-09
**Status:** Approved

---

## Overview

Bring the existing trucks and trailers to life. Selling cold goods, live animals, and bulk liquids to city or export markets requires an active delivery job: a truck, the right specialized trailer, a hired driver, and enough fuel. Players without the right equipment pay a contractor rate (12%) instead — plus a spoilage risk for cold goods. Deliveries take in-game days to complete. Trucks can break down mid-trip. Return trips can carry supplies back to the farm.

The existing `TractorJob` / `HarvestJob` pattern is extended with a `DeliveryJob` type. The existing `fuel: number` GameState field (from the fuel system spec) is reused for truck fuel consumption.

---

## Section 1 — New Trailer Types

Six new trailers added to `data/machineTypes.ts`. All are `category: 'trailer'`. Pickup-sized trailers fit `truck-pickup`; large trailers fit `truck-semi`. The `compatibleTrucks` field on each trailer type lists compatible truck type IDs.

| ID | Name | Cost | Capacity | Compatible Trucks |
|----|------|------|----------|-------------------|
| `trailer-refrigerated-s` | Refrigerated Trailer (S) | $28,000 | 3,000 kg | `truck-pickup` |
| `trailer-refrigerated-l` | Refrigerated Trailer (L) | $48,000 | 10,000 kg | `truck-semi` |
| `trailer-livestock-s` | Livestock Trailer (S) | $22,000 | 20 head | `truck-pickup` |
| `trailer-livestock-l` | Livestock Trailer (L) | $38,000 | 60 head | `truck-semi` |
| `trailer-tank-s` | Tank Trailer (S) | $32,000 | 6,000 L | `truck-pickup` |
| `trailer-tank-l` | Tank Trailer (L) | $55,000 | 18,000 L | `truck-semi` |

### Cargo type requirements

| Cargo category | Required trailer type | Contractor fallback | Spoilage risk |
|---|---|---|---|
| Dairy (milk, cheese, butter) | `refrigerated` or `tank` | ✓ 12% fee | 5% quantity loss |
| Eggs | `refrigerated` | ✓ 12% fee | 5% quantity loss |
| Fresh meat | `refrigerated` | ✓ 12% fee | 5% quantity loss |
| Processed goods (packaged) | `refrigerated` | ✓ 12% fee | 5% quantity loss |
| Live animals (auction) | `livestock` | ✗ no fallback | — |
| Bulk milk (tank sale) | `tank` | ✓ 12% fee | 5% quantity loss |
| Dry crops / grain | existing `trailer-*` | ✓ 12% fee | none |

Live animals have no contractor fallback — without a livestock trailer, the player cannot sell live animals. They can still cull for meat.

---

## Section 2 — DeliveryJob System

### New interface

```typescript
export interface DeliveryCargo {
  itemId: string;          // cropId / productType / animalId
  quantity: number;
  category: 'crop' | 'animal_product' | 'animal';
}

export interface ReturnOrder {
  itemId: string;          // cropId / 'fuel' / animalTypeId (won at auction)
  quantity: number;
  costPerUnit: number;     // locked in at dispatch
}

export interface DeliveryJob {
  id: string;
  truckId: string;
  trailerId: string;
  driverId: string;
  cargo: DeliveryCargo[];
  marketId: 'local' | 'city' | 'export';
  departDay: number;
  returnDay: number;
  expectedRevenue: number;   // locked in at dispatch, credited on return
  fuelCost: number;          // deducted from fuel on dispatch
  returnOrders: ReturnOrder[];
  status: 'outbound' | 'returning';
  breakdownDaysAdded: number;
  needsMaintenance: boolean;
}
```

Add `deliveryJobs: DeliveryJob[]` to `GameState`. Initial value: `[]`.

### Trip duration

| Market | Duration (days round trip) |
|--------|---------------------------|
| `local` | 1 |
| `city` | 2 |
| `export` | 3 |

`returnDay = departDay + duration`

### Dispatch logic (`dispatchDelivery` action)

1. Validate: truck owned, trailer hitched and compatible, driver assigned, sufficient `fuel`
2. Deduct cargo from `inventory` / `animalInventory` / `productInventory`
3. Deduct `fuelCost` from `fuel`
4. Lock in `expectedRevenue` at current market price × multiplier (same formula as existing `sellCrop`)
5. Deduct return order costs from `money` upfront
6. Mark truck, trailer, driver as in-use (checked by `isTruckAvailable`, `isTrailerAvailable`, `isWorkerAvailable`)
7. Push `DeliveryJob` to `deliveryJobs`

### advanceDay processing

For each `DeliveryJob` where `newDay >= job.returnDay`:

1. Credit `expectedRevenue` to `money`
2. Add return order items to inventory
3. Free truck, trailer, driver
4. If `job.needsMaintenance` and no mechanic worker: deduct flat repair fee ($200–$600 depending on truck size)
5. If `job.needsMaintenance` and mechanic present: cleared for free
6. Remove job from `deliveryJobs`
7. Add day-summary event: *"🚛 [Truck] returned from [market] — $X revenue"*

### Contractor fallback

When player sells cold goods or bulk liquids without the right trailer (or no driver / truck busy):

- Sale proceeds instantly (same as current flow)
- Revenue = `quantity × price × marketMultiplier × 0.88` (12% contractor cut)
- Apply 5% spoilage before revenue calc: `effectiveQty = quantity × 0.95`
- Show warning in confirmation modal: *"⚠ No refrigerated trailer — contractor handling, 5% spoilage risk applied"*

---

## Section 3 — Fuel System Extension

The existing `fuel: number` GameState field is reused. This spec extends it with:

### Fuel price fluctuation

Add `fuelPrice: number` to `GameState`. Initial value: `1.20`.

Each `advanceDay`, apply a random walk:
```typescript
const delta = (Math.random() - 0.5) * 0.08;   // ±$0.04 max per day
fuelPrice = clamp(fuelPrice + delta, 0.90, 1.80);
```

Existing flat `$1.20/L` purchase price in the fuel buy UI is replaced with the live `fuelPrice`.

### Truck fuel consumption per trip

Fuel deducted on dispatch (not per day — the whole trip cost is paid upfront):

| Market | Pickup (all trailer types) | Semi (all trailer types) |
|--------|---------------------------|--------------------------|
| Local  | 20 L | 35 L |
| City   | 60 L | 100 L |
| Export | 140 L | 220 L |

`fuelCost = tripLitres × state.fuelPrice` at dispatch time.

If `fuel < fuelCost`, the dispatch button is disabled: *"Need X more litres to dispatch"*.

---

## Section 4 — Breakdowns

Each day in transit (`advanceDay`), for each active `DeliveryJob`, roll for breakdown:

| Market | Base daily chance |
|--------|------------------|
| Local | 1% |
| City | 3% per day |
| Export | 5% per day |

Owning at least one `mechanic` worker halves all percentages.

On breakdown:
- `job.returnDay += randomInt(1, 2)`
- `job.needsMaintenance = true`
- `job.breakdownDaysAdded += extension`
- Day-summary event: *"🔧 [Truck] broke down on the road — return delayed by [N] days"*

Repair fee on return (if no mechanic):

| Truck size | Repair fee |
|---|---|
| Pickup | $200 |
| Dump | $350 |
| Semi | $600 |

---

## Section 5 — Drivers

### New worker role

Add `truck_driver` to `WorkerRole`. Fits the existing `WorkerType` structure:

```typescript
{
  id: 'truck_driver',
  name: 'Truck Driver',
  icon: '🚛',
  department: 'transport',
  tier: 'basic',
  dailyWage: 55,
  maxCount: 2,
  description: 'Handles deliveries to local, city, and export markets. Required to self-dispatch — without one, deliveries go through a contractor.',
}
```

Add `'transport'` as a new department value in the `WorkerType` department union.

### Assignment

Drivers are not permanently assigned to a specific truck. On dispatch, the player selects which available driver to use (any unhired driver in `deliveryJobs` at that moment). A driver on an active delivery cannot be reused until the job completes.

### Without a driver

If no driver is available:
- Cannot self-dispatch
- Contractor fallback applies (12% fee + spoilage risk)
- No `DeliveryJob` is created — sale is instant

---

## Section 6 — Return Loads

When dispatching, the player can optionally queue up to 3 return load items. Valid items depend on the hitched trailer:

| Trailer type | Valid return load items |
|---|---|
| Standard / grain (`trailer-small`, `trailer-standard`, `trailer-large`) | Grain, hay, dry animal feed, seeds |
| Refrigerated (`trailer-refrigerated-s/l`) | Veterinary meds, packaged feed supplements |
| Tank (`trailer-tank-s/l`) | Fuel, bulk liquid fertiliser |
| Livestock (`trailer-livestock-s/l`) | Animals won at auction (see below) |

### Livestock return loads and the auction house

When the player wins an animal at auction (see auction house spec), the won animal is held in a `pendingPickup: AuctionPickup[]` state field instead of being immediately added to `animals[]`. The animal is delivered to the farm when a livestock trailer return load carries it.

```typescript
export interface AuctionPickup {
  listingId: string;
  animalTypeId: string;
  genes: AnimalGenes;
  paidDay: number;
  pickedUpDay: number | null;
}
```

In the return orders flow, the livestock trailer return load picker shows available `pendingPickup` animals. On truck return, animals are moved from `pendingPickup` to `animals[]`.

If the player has no livestock trailer, won animals are auto-delivered by contractor after 3 days (no extra cost — just a 3-day delay added to the existing auction win flow).

### Return load costs

Costs for return load items (grain, hay, fuel, meds, fertiliser) are deducted from `money` at dispatch time at current market prices. If `money` is insufficient, those return load items are dropped from the order (warning shown).

---

## Section 7 — UI

### Dispatch modal

Triggered when selling cold goods, bulk liquids, or live animals to city/export. Replaces the simple confirmation alert:

```
┌──────────────────────────────────────┐
│  🚛 Dispatch Delivery                │
│  200 kg Cheese → City Market         │
├──────────────────────────────────────┤
│  Truck:    Ford F-250 (available)    │
│  Trailer:  Refrigerated (S) ✓        │
│  Driver:   Carlos (available)        │
│  Fuel:     60 L · $72.00 (⛽ 340 L) │
│  ETA:      Day 47 (2 days)           │
├──────────────────────────────────────┤
│  Return loads (optional)             │
│  + Add item (vet meds, feed suppl.)  │
├──────────────────────────────────────┤
│  Expected revenue:    $4,800         │
│  [DISPATCH]    [PAY CONTRACTOR]      │
└──────────────────────────────────────┘
```

If requirements not met, DISPATCH is greyed out with a reason. PAY CONTRACTOR always available (cold goods show spoilage warning).

### Maquinaria tab — Deliveries sub-tab

New sub-tab alongside existing Attachments tab:

- Active delivery cards: truck name, cargo summary, destination, days remaining, breakdown status
- Empty state: "No active deliveries"

### Maquinaria tab — Fuel section

Extend existing fuel gauge to show `fuelPrice` live:
- Current price label: *"⛽ $1.34/L ↑"* (arrow indicates trend)
- Buy buttons unchanged, cost preview updates with live price

### Workers screen — Transport department

New department section between Machinery and Processing. Shows `truck_driver` card with hire/fire, count (0/2), and daily wage.

---

## Section 8 — Files Changed

| File | Action |
|------|--------|
| `data/machineTypes.ts` | Add 6 new trailer type entries |
| `store/useGameStore.ts` | Add `DeliveryJob`, `DeliveryCargo`, `ReturnOrder`, `AuctionPickup` interfaces; add `deliveryJobs`, `fuelPrice`, `pendingPickup` to `GameState`; add `dispatchDelivery` action; update `advanceDay` for delivery resolution + breakdown rolls + fuel price walk; update sell actions for contractor fallback + spoilage |
| `data/workerTypes.ts` | Add `truck_driver` worker type; add `'transport'` to department union |
| `app/(tabs)/maquinaria.tsx` | Add Deliveries sub-tab; update fuel section with live price display |
| `app/(tabs)/animales.tsx` | Update sell-animal flow to check livestock trailer requirement |
| `app/(tabs)/economia.tsx` | Update sell-crop / sell-product flow to trigger dispatch modal for cold goods / bulk liquids |
| `components/DispatchModal.tsx` | New component — dispatch confirmation modal |

---

## Out of scope

- Per-truck job slots (parallel deliveries from same truck) — add after this is working
- Route planning / recurring scheduled deliveries
- Trailer condition/wear system
- Fuel purchase via return loads only (fuel is still buyable directly in maquinaria tab)
- Trailers or attachments listed at auction
