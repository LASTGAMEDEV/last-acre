# Transportation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring trucks and trailers to life with specialized trailer types, real delivery jobs with in-game travel time, fuel costs, driver workers, breakdown events, and return loads.

**Architecture:** A `DeliveryJob[]` queue in GameState (mirroring `TractorJob[]`/`HarvestJob[]`) drives delivery mechanics. The existing sell flow is intercepted for cold/livestock/bulk-liquid cargo — players with the right equipment dispatch a job; others pay a 12% contractor rate plus spoilage risk. All processing happens in `advanceDay`.

**Tech Stack:** React Native 0.81.5 · Expo 54 · TypeScript · Zustand 5

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `data/machineTypes.ts` | Modify | Add 6 new specialized trailer type entries |
| `data/workerTypes.ts` | Modify | Add `truck_driver` role + `'transport'` department |
| `store/useGameStore.ts` | Modify | New interfaces, GameState fields, `dispatchDelivery` action, `advanceDay` extensions, `buyFuel` price update |
| `components/DispatchModal.tsx` | Create | Dispatch confirmation modal — cargo review, truck/trailer/driver picker, return load queue, fuel cost display |
| `app/(tabs)/economia.tsx` | Modify | Intercept sell for cold/livestock/bulk-liquid cargo → open DispatchModal |
| `app/(tabs)/animales.tsx` | Modify | Intercept live-animal sell → require livestock trailer or block |
| `app/(tabs)/maquinaria.tsx` | Modify | Add Deliveries sub-tab; show live `fuelPrice` in fuel gauge |
| `app/(tabs)/trabajadores.tsx` (or workers section) | Modify | Add Transport department section for `truck_driver` |

---

## Task 1: New Specialized Trailer Types

**Files:**
- Modify: `data/machineTypes.ts`

- [ ] **Step 1: Add 6 trailer entries**

Open `data/machineTypes.ts`. At the end of the `MACHINE_TYPES` array (after `trailer-large`), add:

```typescript
  // ── Specialized trailers ──────────────────────────────────────────────────
  {
    id: 'trailer-refrigerated-s',
    name: 'Refrigerated Trailer (S)',
    cost: 28000,
    size: 'small' as const,
    category: 'trailer' as const,
    maintenancePerDay: 3,
    capacityKg: 3000,
    compatibleTruckTypeIds: ['truck-pickup'],
  },
  {
    id: 'trailer-refrigerated-l',
    name: 'Refrigerated Trailer (L)',
    cost: 48000,
    size: 'large' as const,
    category: 'trailer' as const,
    maintenancePerDay: 5,
    capacityKg: 10000,
    compatibleTruckTypeIds: ['truck-semi'],
  },
  {
    id: 'trailer-livestock-s',
    name: 'Livestock Trailer (S)',
    cost: 22000,
    size: 'small' as const,
    category: 'trailer' as const,
    maintenancePerDay: 2,
    capacityKg: 20,   // head count stored as kg field; treated as "head" in UI
    compatibleTruckTypeIds: ['truck-pickup'],
  },
  {
    id: 'trailer-livestock-l',
    name: 'Livestock Trailer (L)',
    cost: 38000,
    size: 'large' as const,
    category: 'trailer' as const,
    maintenancePerDay: 4,
    capacityKg: 60,
    compatibleTruckTypeIds: ['truck-semi'],
  },
  {
    id: 'trailer-tank-s',
    name: 'Tank Trailer (S)',
    cost: 32000,
    size: 'small' as const,
    category: 'trailer' as const,
    maintenancePerDay: 3,
    capacityKg: 6000,
    compatibleTruckTypeIds: ['truck-pickup'],
  },
  {
    id: 'trailer-tank-l',
    name: 'Tank Trailer (L)',
    cost: 55000,
    size: 'large' as const,
    category: 'trailer' as const,
    maintenancePerDay: 5,
    capacityKg: 18000,
    compatibleTruckTypeIds: ['truck-semi'],
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add data/machineTypes.ts
git commit -m "feat(transport): add 6 specialized trailer types"
```

---

## Task 2: truck_driver Worker Role

**Files:**
- Modify: `data/workerTypes.ts`

- [ ] **Step 1: Add `'transport'` to WorkerDepartment and `truck_driver` to WorkerRole**

In `data/workerTypes.ts`, find:
```typescript
export type WorkerDepartment = 'fields' | 'animals' | 'machinery' | 'processing';
```
Replace with:
```typescript
export type WorkerDepartment = 'fields' | 'animals' | 'machinery' | 'processing' | 'transport';
```

Find the `WorkerRole` type and add `'truck_driver'`:
```typescript
export type WorkerRole =
  | 'field_worker'
  | 'agronomist'
  | 'botanist'
  | 'animal_keeper'
  | 'zootechnician'
  | 'mechanic'
  | 'engineer'
  | 'processor'
  | 'supervisor'
  | 'vet'
  | 'truck_driver';
```

- [ ] **Step 2: Add truck_driver entry to WORKER_TYPES array**

At the end of the `WORKER_TYPES` array, add:

```typescript
  {
    id: 'truck_driver' as WorkerRole,
    name: 'Truck Driver',
    icon: '🚛',
    dailyWage: 55,
    maxCount: 2,
    description: 'Handles deliveries to local, city, and export markets. Required to self-dispatch — without one, deliveries go through a contractor at 12% fee.',
    department: 'transport' as WorkerDepartment,
    tier: 'basic' as WorkerTier,
  },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add data/workerTypes.ts
git commit -m "feat(transport): add truck_driver worker role and transport department"
```

---

## Task 3: New Interfaces and GameState Fields

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add new interfaces before GameState**

Find the `export interface OwnedTrailer` block (~line 257). After it, add:

```typescript
export interface DeliveryCargo {
  itemId: string;       // cropId / productType / animalId
  quantity: number;
  category: 'crop' | 'animal_product' | 'animal';
}

export interface ReturnOrder {
  itemId: string;       // cropId / 'fuel' / animalTypeId (won at auction)
  quantity: number;
  costPerUnit: number;  // locked in at dispatch
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
  expectedRevenue: number;
  fuelCost: number;
  returnOrders: ReturnOrder[];
  status: 'outbound' | 'returning';
  breakdownDaysAdded: number;
  needsMaintenance: boolean;
}

export interface AuctionPickup {
  listingId: string;
  animalTypeId: string;
  genes: AnimalGenes;
  paidDay: number;
  pickedUpDay: number | null;
}
```

- [ ] **Step 2: Add fields to GameState interface**

In the `GameState` interface (around line 392), find `tractorJobs: TractorJob[];` and add after it:

```typescript
  deliveryJobs: DeliveryJob[];
```

Find the `fuel: number;` field and add after it:

```typescript
  fuelPrice: number;
```

After `listings: AuctionListing[];` (or near the auction section), add:

```typescript
  pendingPickup: AuctionPickup[];
```

Add the `dispatchDelivery` action signature to the actions section of `GameState`:

```typescript
  dispatchDelivery: (params: {
    truckId: string;
    trailerId: string;
    driverId: string;
    cargo: DeliveryCargo[];
    marketId: 'local' | 'city' | 'export';
    returnOrders: ReturnOrder[];
  }) => void;
```

- [ ] **Step 3: Add initial values in makeInitialState**

In `makeInitialState` (around line 711), find the `fuel: 200` initialization and add:

```typescript
  deliveryJobs: [],
  fuelPrice: 1.20,
  pendingPickup: [],
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If `AnimalGenes` is not in scope where you added `AuctionPickup`, import it from `'../engine/animals'`.

- [ ] **Step 5: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(transport): add DeliveryJob interfaces and GameState fields"
```

---

## Task 4: dispatchDelivery Action

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add helper constants near the top of the store file**

Find the existing `GRAIN_CROP_IDS` or similar constants block in the store. Add:

```typescript
const DELIVERY_DURATION: Record<'local' | 'city' | 'export', number> = {
  local: 1,
  city: 2,
  export: 3,
};

const TRUCK_FUEL_LITRES: Record<string, Record<'local' | 'city' | 'export', number>> = {
  'truck-pickup': { local: 20, city: 60, export: 140 },
  'truck-dump':   { local: 28, city: 80, export: 180 },
  'truck-semi':   { local: 35, city: 100, export: 220 },
};

const COLD_CARGO_TYPES = new Set([
  'milk', 'cheese', 'butter', 'cream', 'eggs', 'meat', 'chicken_meat',
  'pork', 'lamb', 'beef', 'buffalo_meat', 'rabbit_meat', 'duck_meat',
  'turkey_meat', 'quail_meat',
]);

const BULK_LIQUID_TYPES = new Set(['milk_bulk', 'oil', 'juice']);

export const REFRIGERATED_TRAILER_IDS = [
  'trailer-refrigerated-s', 'trailer-refrigerated-l',
];
export const TANK_TRAILER_IDS = [
  'trailer-tank-s', 'trailer-tank-l',
];
export const LIVESTOCK_TRAILER_IDS = [
  'trailer-livestock-s', 'trailer-livestock-l',
];
```

- [ ] **Step 2: Add dispatchDelivery action**

Find the `buyFuel:` action (~line 3733). Add before it:

```typescript
      dispatchDelivery: ({ truckId, trailerId, driverId, cargo, marketId, returnOrders }) => {
        const state = get();

        // Resolve truck type for fuel lookup
        const truck = (state.machines ?? []).find(m => m.id === truckId);
        if (!truck) return;
        const truckType = MACHINE_TYPES.find(t => t.id === truck.typeId);
        if (!truckType) return;

        const duration = DELIVERY_DURATION[marketId];
        const fuelLitres = TRUCK_FUEL_LITRES[truck.typeId]?.[marketId] ?? 60;
        const fuelCost = Math.round(fuelLitres * state.fuelPrice * 100) / 100;

        if ((state.fuel ?? 0) < fuelLitres) return; // insufficient fuel

        // Deduct cargo from inventory
        const newInventory = { ...state.inventory };
        const newAnimalInventory = { ...state.animalInventory };
        const newProductInventory = { ...state.productInventory };
        for (const c of cargo) {
          if (c.category === 'crop') {
            newInventory[c.itemId] = Math.max(0, (newInventory[c.itemId] ?? 0) - c.quantity);
          } else if (c.category === 'animal_product') {
            newAnimalInventory[c.itemId] = Math.max(0, (newAnimalInventory[c.itemId] ?? 0) - c.quantity);
          }
          // 'animal' cargo: animal already removed from animals[] by sell flow
        }

        // Lock in expected revenue (reuse sellCrop formula components)
        const MARKET_MULTIPLIERS: Record<string, number> = { local: 1.0, city: 1.2, export: 1.45 };
        const mult = MARKET_MULTIPLIERS[marketId] ?? 1.0;
        const secaderoBonus = state.buildings.includes('bld_secadero') ? 1.05 : 1.0;
        const coopBonus = state.cooperativeMember ? 1.12 : 1.0;
        const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
        let expectedRevenue = 0;
        for (const c of cargo) {
          const basePrice =
            c.category === 'crop'
              ? (state.cropPrices?.[c.itemId] ?? 1)
              : (state.animalPrices?.[c.itemId] ?? 1);
          expectedRevenue += c.quantity * basePrice * mult * secaderoBonus * coopBonus * prestigeBonus;
        }
        expectedRevenue = Math.round(expectedRevenue);

        // Deduct return order costs upfront
        let returnCost = 0;
        for (const r of returnOrders) {
          returnCost += Math.round(r.quantity * r.costPerUnit);
        }
        if (state.money < returnCost) return; // can't afford return orders

        const job: DeliveryJob = {
          id: `dlv_${Date.now()}`,
          truckId,
          trailerId,
          driverId,
          cargo,
          marketId,
          departDay: state.day,
          returnDay: state.day + duration,
          expectedRevenue,
          fuelCost,
          returnOrders,
          status: 'outbound',
          breakdownDaysAdded: 0,
          needsMaintenance: false,
        };

        set({
          deliveryJobs: [...(state.deliveryJobs ?? []), job],
          fuel: (state.fuel ?? 0) - fuelLitres,
          money: state.money - returnCost,
          inventory: newInventory,
          animalInventory: newAnimalInventory,
          productInventory: newProductInventory,
        });
      },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any type errors (e.g. `cooperativeMember` → check actual field name in GameState; `cropPrices` → check actual field name).

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(transport): add dispatchDelivery store action"
```

---

## Task 5: advanceDay Extensions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Add fuel price fluctuation to advanceDay**

In `advanceDay` (~line 835), find the section where daily costs are computed (near maintenance deductions). Add fuel price walk:

```typescript
        // Fuel price fluctuation (±$0.04/day, range $0.90–$1.80)
        const fuelDelta = (Math.random() - 0.5) * 0.08;
        const newFuelPrice = Math.min(1.80, Math.max(0.90, (state.fuelPrice ?? 1.20) + fuelDelta));
```

Include `newFuelPrice` in the final `set({...})` call at the end of `advanceDay`.

- [ ] **Step 2: Add delivery job processing to advanceDay**

Find the `// Tractor job processing` section in `advanceDay`. After the HarvestJob loop, add:

```typescript
        // ── Delivery job processing ──────────────────────────────────────────
        const BREAKDOWN_CHANCE: Record<string, number> = { local: 0.01, city: 0.03, export: 0.05 };
        const REPAIR_FEE: Record<string, number> = {
          'truck-pickup': 200, 'truck-dump': 350, 'truck-semi': 600,
        };
        const hasMechanic = (state.workers ?? []).some(
          (w: OwnedWorker) => w.typeId === 'mechanic' || w.typeId === 'engineer'
        );

        const completedDeliveryEvents: string[] = [];
        let deliveryMoneyDelta = 0;
        const newPendingPickup = [...(state.pendingPickup ?? [])];

        const updatedDeliveryJobs: DeliveryJob[] = [];
        for (const job of (state.deliveryJobs ?? [])) {
          // Breakdown roll for jobs still in transit
          if (newDay < job.returnDay) {
            const baseChance = BREAKDOWN_CHANCE[job.marketId] ?? 0.03;
            const chance = hasMechanic ? baseChance * 0.5 : baseChance;
            if (Math.random() < chance) {
              const delay = Math.floor(Math.random() * 2) + 1;
              updatedDeliveryJobs.push({
                ...job,
                returnDay: job.returnDay + delay,
                needsMaintenance: true,
                breakdownDaysAdded: job.breakdownDaysAdded + delay,
              });
              completedDeliveryEvents.push(
                `🔧 Truck broke down on the way to ${job.marketId} — delayed ${delay}d`
              );
              continue;
            }
            updatedDeliveryJobs.push(job);
            continue;
          }

          // Job return day reached
          deliveryMoneyDelta += job.expectedRevenue;

          // Repair fee if needed and no mechanic
          if (job.needsMaintenance && !hasMechanic) {
            const truck = (state.machines ?? []).find(m => m.id === job.truckId);
            const truckTypeId = truck
              ? (MACHINE_TYPES.find(t => t.id === truck.typeId)?.id ?? '')
              : '';
            deliveryMoneyDelta -= REPAIR_FEE[truckTypeId] ?? 350;
          }

          // Return orders
          const newInvFromReturn = { ...newHarvestInventory }; // use the in-scope inventory delta
          for (const r of job.returnOrders) {
            if (r.itemId === 'fuel') {
              // fuel handled separately below
            } else if (r.itemId.startsWith('animal_')) {
              // livestock pickup handled via pendingPickup
              const pickup = newPendingPickup.find(p => p.animalTypeId === r.itemId.replace('animal_', '') && p.pickedUpDay === null);
              if (pickup) pickup.pickedUpDay = newDay;
            } else {
              newInvFromReturn[r.itemId] = (newInvFromReturn[r.itemId] ?? 0) + r.quantity;
            }
          }

          // Fuel return loads
          const fuelReturned = job.returnOrders
            .filter(r => r.itemId === 'fuel')
            .reduce((s, r) => s + r.quantity, 0);

          completedDeliveryEvents.push(
            `🚛 Truck returned from ${job.marketId} — $${job.expectedRevenue.toLocaleString()} revenue`
          );
          // Job complete — do not push to updatedDeliveryJobs
        }
```

Then in the final `set({...})` call at the end of `advanceDay`, include:

```typescript
          deliveryJobs: updatedDeliveryJobs,
          fuelPrice: newFuelPrice,
          pendingPickup: newPendingPickup,
          money: (existing money delta) + deliveryMoneyDelta,
          fuel: Math.min(getFuelCapacity(state.buildings), (state.fuel ?? 0) + fuelReturnedTotal),
```

And append `completedDeliveryEvents` to the day summary events array.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any scope issues — `newHarvestInventory` may not be the right variable name; use whichever inventory accumulator is in scope in `advanceDay` for crop/product returns.

- [ ] **Step 4: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(transport): advanceDay — delivery resolution, breakdowns, fuel price walk"
```

---

## Task 6: DispatchModal Component

**Files:**
- Create: `components/DispatchModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore, DeliveryCargo, ReturnOrder, REFRIGERATED_TRAILER_IDS, TANK_TRAILER_IDS, LIVESTOCK_TRAILER_IDS } from '../store/useGameStore';
import { MACHINE_TYPES } from '../data/machineTypes';

interface Props {
  visible: boolean;
  cargo: DeliveryCargo[];
  marketId: 'local' | 'city' | 'export';
  onClose: () => void;
  onContractor: () => void;  // called when player chooses contractor fallback
}

const DURATION: Record<string, number> = { local: 1, city: 2, export: 3 };
const FUEL_LITRES: Record<string, Record<string, number>> = {
  'truck-pickup': { local: 20, city: 60, export: 140 },
  'truck-dump':   { local: 28, city: 80, export: 180 },
  'truck-semi':   { local: 35, city: 100, export: 220 },
};

export default function DispatchModal({ visible, cargo, marketId, onClose, onContractor }: Props) {
  const {
    machines, trailers, workers, fuel, fuelPrice, money,
    dispatchDelivery, pendingPickup,
  } = useGameStore();

  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Determine cargo type to filter compatible trailers
  const needsRefrigerated = cargo.some(c => ['milk','cheese','butter','eggs','meat','chicken_meat','pork','lamb','beef'].includes(c.itemId));
  const needsTank = cargo.some(c => ['milk_bulk','oil','juice'].includes(c.itemId));
  const needsLivestock = cargo.some(c => c.category === 'animal');

  const requiredTrailerIds = needsLivestock
    ? LIVESTOCK_TRAILER_IDS
    : needsTank
    ? TANK_TRAILER_IDS
    : needsRefrigerated
    ? [...REFRIGERATED_TRAILER_IDS, ...TANK_TRAILER_IDS]
    : null; // null = any trailer ok

  // Available (not on active delivery) trucks
  const { deliveryJobs } = useGameStore();
  const busyTruckIds = new Set((deliveryJobs ?? []).map(j => j.truckId));
  const busyDriverIds = new Set((deliveryJobs ?? []).map(j => j.driverId));

  const availableTrucks = (machines ?? []).filter(m => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    return mt?.category === 'truck' && !busyTruckIds.has(m.id);
  });

  const selectedTruck = availableTrucks.find(m => m.id === selectedTruckId);
  const truckTypeId = selectedTruck
    ? MACHINE_TYPES.find(t => t.id === selectedTruck.typeId)?.id ?? ''
    : '';

  const availableTrailers = (trailers ?? []).filter(tr => {
    if (tr.hitchedTo !== selectedTruckId) return false;
    if (requiredTrailerIds && !requiredTrailerIds.includes(tr.typeId)) return false;
    const busy = (deliveryJobs ?? []).some(j => j.trailerId === tr.id);
    return !busy;
  });

  const availableDrivers = (workers ?? []).filter(w =>
    w.typeId === 'truck_driver' && !busyDriverIds.has(w.id)
  );

  const fuelLitres = truckTypeId ? (FUEL_LITRES[truckTypeId]?.[marketId] ?? 60) : 0;
  const fuelCostAmount = Math.round(fuelLitres * (fuelPrice ?? 1.20) * 100) / 100;
  const hasEnoughFuel = (fuel ?? 0) >= fuelLitres;
  const canDispatch =
    selectedTruckId !== null &&
    selectedTrailerId !== null &&
    selectedDriverId !== null &&
    hasEnoughFuel;

  const handleDispatch = () => {
    if (!canDispatch || !selectedTruckId || !selectedTrailerId || !selectedDriverId) return;
    dispatchDelivery({
      truckId: selectedTruckId,
      trailerId: selectedTrailerId,
      driverId: selectedDriverId,
      cargo,
      marketId,
      returnOrders: [],
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>🚛 Dispatch Delivery</Text>
          <Text style={s.subtitle}>{marketId.charAt(0).toUpperCase() + marketId.slice(1)} Market · {DURATION[marketId]}d round trip</Text>

          <ScrollView style={{ maxHeight: 420 }}>
            {/* Cargo summary */}
            <Text style={s.sectionLabel}>Cargo</Text>
            {cargo.map((c, i) => (
              <Text key={i} style={s.cargoLine}>• {c.quantity.toLocaleString()} × {c.itemId}</Text>
            ))}

            {/* Truck picker */}
            <Text style={s.sectionLabel}>Truck</Text>
            {availableTrucks.length === 0 ? (
              <Text style={s.unavailable}>No trucks available</Text>
            ) : availableTrucks.map(m => {
              const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.optionRow, selectedTruckId === m.id && s.optionSelected]}
                  onPress={() => { setSelectedTruckId(m.id); setSelectedTrailerId(null); }}
                >
                  <Text style={s.optionText}>{mt?.name ?? m.typeId}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Trailer picker */}
            {selectedTruckId && (
              <>
                <Text style={s.sectionLabel}>Trailer</Text>
                {availableTrailers.length === 0 ? (
                  <Text style={s.unavailable}>
                    {requiredTrailerIds
                      ? 'No compatible trailer hitched — contractor required'
                      : 'No trailer hitched'}
                  </Text>
                ) : availableTrailers.map(tr => {
                  const tt = MACHINE_TYPES.find(t => t.id === tr.typeId);
                  return (
                    <TouchableOpacity
                      key={tr.id}
                      style={[s.optionRow, selectedTrailerId === tr.id && s.optionSelected]}
                      onPress={() => setSelectedTrailerId(tr.id)}
                    >
                      <Text style={s.optionText}>{tt?.name ?? tr.typeId}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Driver picker */}
            <Text style={s.sectionLabel}>Driver</Text>
            {availableDrivers.length === 0 ? (
              <Text style={s.unavailable}>No truck drivers hired — contractor required</Text>
            ) : availableDrivers.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[s.optionRow, selectedDriverId === w.id && s.optionSelected]}
                onPress={() => setSelectedDriverId(w.id)}
              >
                <Text style={s.optionText}>🚛 Driver (hired day {w.hiredDay})</Text>
              </TouchableOpacity>
            ))}

            {/* Fuel cost */}
            {selectedTruckId && (
              <View style={s.fuelRow}>
                <Text style={s.fuelLabel}>⛽ Fuel required:</Text>
                <Text style={[s.fuelValue, !hasEnoughFuel && { color: '#ef5350' }]}>
                  {fuelLitres}L · ${fuelCostAmount.toFixed(2)}
                  {!hasEnoughFuel ? ` (need ${fuelLitres - (fuel ?? 0)} more L)` : ''}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.dispatchBtn, !canDispatch && s.dispatchBtnDisabled]}
              onPress={handleDispatch}
              disabled={!canDispatch}
            >
              <Text style={s.dispatchBtnText}>Dispatch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.contractorBtn} onPress={onContractor}>
              <Text style={s.contractorBtnText}>Pay Contractor (−12%)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:             { backgroundColor: '#0d1117', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  title:             { color: '#e8d5a3', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  subtitle:          { color: '#888', fontSize: 12, marginBottom: 12 },
  sectionLabel:      { color: '#aaa', fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  cargoLine:         { color: '#ccc', fontSize: 13, marginBottom: 2 },
  optionRow:         { backgroundColor: '#16213e', borderRadius: 8, padding: 10, marginBottom: 6 },
  optionSelected:    { borderColor: '#4caf50', borderWidth: 1.5 },
  optionText:        { color: '#e0e0e0', fontSize: 13 },
  unavailable:       { color: '#ef5350', fontSize: 12, marginBottom: 6 },
  fuelRow:           { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1a2a1a' },
  fuelLabel:         { color: '#aaa', fontSize: 13 },
  fuelValue:         { color: '#66bb6a', fontSize: 13, fontWeight: 'bold' },
  actions:           { marginTop: 16, gap: 8 },
  dispatchBtn:       { backgroundColor: '#1b5e20', borderRadius: 8, padding: 14, alignItems: 'center' },
  dispatchBtnDisabled: { opacity: 0.4 },
  dispatchBtnText:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  contractorBtn:     { backgroundColor: '#1a1a2e', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  contractorBtnText: { color: '#aaa', fontSize: 13 },
  cancelBtn:         { alignItems: 'center', padding: 8 },
  cancelBtnText:     { color: '#555', fontSize: 13 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/DispatchModal.tsx
git commit -m "feat(transport): DispatchModal component"
```

---

## Task 7: Intercept Sell Flow in economia.tsx

**Files:**
- Modify: `app/(tabs)/economia.tsx`

- [ ] **Step 1: Import DispatchModal and required constants**

At the top of `app/(tabs)/economia.tsx`, add:

```typescript
import DispatchModal from '../../components/DispatchModal';
import { REFRIGERATED_TRAILER_IDS, TANK_TRAILER_IDS } from '../../store/useGameStore';
```

- [ ] **Step 2: Add dispatch modal state**

Inside `EconomiaScreen` (or the relevant component that calls `sellCrop`), add state:

```typescript
const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
const [pendingCargo, setPendingCargo] = useState<DeliveryCargo[]>([]);
const [pendingMarket, setPendingMarket] = useState<'local' | 'city' | 'export'>('local');
const [pendingCropId, setPendingCropId] = useState<string | null>(null);
const [pendingQty, setPendingQty] = useState(0);
```

Also destructure from the store:
```typescript
const { ..., trailers, deliveryJobs } = useGameStore();
```

- [ ] **Step 3: Add isColdCargo helper**

After the store destructure, add:

```typescript
  const COLD_ITEM_IDS = new Set([
    'milk','cheese','butter','cream','eggs','meat','chicken_meat',
    'pork','lamb','beef','buffalo_meat','rabbit_meat','duck_meat',
    'turkey_meat','quail_meat',
  ]);
  const BULK_LIQUID_IDS = new Set(['milk_bulk','oil','juice']);

  const hasCompatibleTrailer = (requiredIds: string[]): boolean => {
    const busyTrailerIds = new Set((deliveryJobs ?? []).map((j: any) => j.trailerId));
    return (trailers ?? []).some(
      tr => requiredIds.includes(tr.typeId) && !busyTrailerIds.has(tr.id)
    );
  };

  const needsDispatchModal = (cropOrProductId: string, market: 'local' | 'city' | 'export'): boolean => {
    if (market === 'local') return false; // local always instant
    if (COLD_ITEM_IDS.has(cropOrProductId) || BULK_LIQUID_IDS.has(cropOrProductId)) return true;
    return false;
  };
```

- [ ] **Step 4: Replace direct sellCrop call with conditional dispatch**

Find the primary sell button `onPress` in the sell UI (line ~869). Replace:

```typescript
onPress={() => {
  sellCrop(selectedCrop, inStock, selectedMarket ?? 'local');
  playSound(regionalRevenue >= 5000 ? 'bigSale' : 'sell');
  ...
}}
```

With:

```typescript
onPress={() => {
  const market = selectedMarket ?? 'local';
  if (needsDispatchModal(selectedCrop, market)) {
    setPendingCargo([{ itemId: selectedCrop, quantity: inStock, category: 'crop' }]);
    setPendingMarket(market);
    setPendingCropId(selectedCrop);
    setPendingQty(inStock);
    setDispatchModalVisible(true);
  } else {
    sellCrop(selectedCrop, inStock, market);
    playSound(regionalRevenue >= 5000 ? 'bigSale' : 'sell');
  }
}}
```

- [ ] **Step 5: Add DispatchModal and contractor handler to JSX**

In the return JSX, before the closing `</View>`, add:

```tsx
      <DispatchModal
        visible={dispatchModalVisible}
        cargo={pendingCargo}
        marketId={pendingMarket}
        onClose={() => setDispatchModalVisible(false)}
        onContractor={() => {
          if (pendingCropId) {
            // Apply 5% spoilage for cold goods, 12% contractor cut
            const isCold = COLD_ITEM_IDS.has(pendingCropId) || BULK_LIQUID_IDS.has(pendingCropId);
            const effectiveQty = isCold ? Math.floor(pendingQty * 0.95) : pendingQty;
            sellCrop(pendingCropId, effectiveQty, pendingMarket);
            // Contractor fee already baked into sellCrop via CONTRACTOR_RATES or apply manually:
            // The 12% is applied by adjusting qty — alternatively override price in a dedicated action
          }
          setDispatchModalVisible(false);
        }}
      />
```

Note: If the codebase doesn't already apply `CONTRACTOR_RATES.transport` in `sellCrop`, the cleanest approach is to pass an optional `contractorRate` parameter to `sellCrop` or multiply `effectiveQty * 0.88` (12% cut on top of 5% spoilage = `qty * 0.95 * 0.88`).

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/economia.tsx
git commit -m "feat(transport): intercept cold/liquid sell flow with dispatch modal"
```

---

## Task 8: Maquinaria Tab — Deliveries Sub-Tab + Live Fuel Price

**Files:**
- Modify: `app/(tabs)/maquinaria.tsx`

- [ ] **Step 1: Add `'deliveries'` to the tab type and TABS array**

Find:
```typescript
type MachineryTab = 'fleet' | 'attachments' | 'jobs';
```
Replace with:
```typescript
type MachineryTab = 'fleet' | 'attachments' | 'jobs' | 'deliveries';
```

Find the TABS array (or wherever tab labels are defined) and add:
```typescript
{ id: 'deliveries', label: '🚛 Deliveries' }
```

- [ ] **Step 2: Update FleetTab fuel display to show live fuelPrice**

In `FleetTab`, find the line that computes fill cost:
```typescript
const fillCost = Math.round(Math.max(0, fuelCapacity - (fuel ?? 0)) * 1.20);
```
Replace with:
```typescript
const { fuelPrice } = useGameStore();
const liveFuelPrice = fuelPrice ?? 1.20;
const fillCost = Math.round(Math.max(0, fuelCapacity - (fuel ?? 0)) * liveFuelPrice);
```

Update the fuel price display label to show the live price:
```tsx
<Text style={s.fuelPriceLabel}>⛽ ${liveFuelPrice.toFixed(2)}/L</Text>
```
(Add this label near the fuel gauge; create the `fuelPriceLabel` style: `{ color: '#aaa', fontSize: 11 }`.)

Also update all `buyFuel` cost previews to use `liveFuelPrice` instead of the hardcoded `1.20`.

- [ ] **Step 3: Create DeliveriesTab component**

Add this component in `maquinaria.tsx` (before the main screen component):

```typescript
function DeliveriesTab() {
  const { deliveryJobs, machines, day } = useGameStore();

  const activeJobs = (deliveryJobs ?? []);

  if (activeJobs.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: '#555', fontSize: 14 }}>No active deliveries.</Text>
        <Text style={{ color: '#444', fontSize: 12, marginTop: 4 }}>Dispatch a truck from the sell screen.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
      {activeJobs.map(job => {
        const truck = (machines ?? []).find(m => m.id === job.truckId);
        const truckType = truck ? MACHINE_TYPES.find(t => t.id === truck.typeId) : null;
        const daysLeft = Math.max(0, job.returnDay - day);
        const cargoSummary = job.cargo.map(c => `${c.quantity.toLocaleString()} ${c.itemId}`).join(', ');
        return (
          <View key={job.id} style={{ backgroundColor: '#16213e', borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#e8d5a3', fontWeight: 'bold' }}>
                {truckType?.name ?? 'Truck'} → {job.marketId}
              </Text>
              <Text style={{ color: daysLeft === 0 ? '#66bb6a' : '#888', fontSize: 12 }}>
                {daysLeft === 0 ? 'Arriving today' : `${daysLeft}d left`}
              </Text>
            </View>
            <Text style={{ color: '#aaa', fontSize: 12 }}>{cargoSummary}</Text>
            <Text style={{ color: '#66bb6a', fontSize: 12, marginTop: 2 }}>
              Expected: ${job.expectedRevenue.toLocaleString()}
            </Text>
            {job.needsMaintenance && (
              <Text style={{ color: '#ff9800', fontSize: 11, marginTop: 4 }}>⚠ Broke down — delayed by {job.breakdownDaysAdded}d</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Render DeliveriesTab in the main screen**

Find where `{tab === 'jobs' && <JobsTab />}` is rendered. Add:

```tsx
{tab === 'deliveries' && <DeliveriesTab />}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/maquinaria.tsx
git commit -m "feat(transport): Deliveries sub-tab and live fuel price in maquinaria"
```

---

## Task 9: Workers Screen — Transport Department

**Files:**
- Modify: whichever file renders the workers/hire screen (likely `app/(tabs)/trabajadores.tsx` or a workers section inside `oficina.tsx`)

- [ ] **Step 1: Locate the workers hire UI**

Search for where `animal_keeper` or `field_worker` is rendered as a hire card:

```bash
grep -r "animal_keeper\|field_worker" app/ --include="*.tsx" -l
```

Open that file.

- [ ] **Step 2: Add Transport department section**

Find where the existing department sections are rendered (Fields, Animals, Machinery, Processing). Mirror the pattern for Transport:

```tsx
          {/* Transport */}
          <Text style={styles.departmentLabel}>🚛 Transport</Text>
          {WORKER_TYPES.filter(wt => wt.department === 'transport').map(wt => {
            const owned = (workers ?? []).filter(w => w.typeId === wt.id);
            const canHire = owned.length < wt.maxCount && money >= wt.dailyWage * 7;
            return (
              <View key={wt.id} style={styles.workerCard}>
                <Text style={styles.workerName}>{wt.icon} {wt.name}</Text>
                <Text style={styles.workerDesc}>{wt.description}</Text>
                <Text style={styles.workerWage}>${wt.dailyWage}/day · {owned.length}/{wt.maxCount} hired</Text>
                <TouchableOpacity
                  style={[styles.hireBtn, !canHire && styles.hireBtnDisabled]}
                  onPress={() => canHire && hireWorker(wt.id)}
                  disabled={!canHire}
                >
                  <Text style={styles.hireBtnText}>
                    {owned.length >= wt.maxCount ? 'Max hired' : `Hire ($${(wt.dailyWage * 7).toLocaleString()}/wk)`}
                  </Text>
                </TouchableOpacity>
                {owned.map(w => (
                  <TouchableOpacity key={w.id} style={styles.fireBtn} onPress={() => fireWorker(w.id)}>
                    <Text style={styles.fireBtnText}>Fire</Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
```

Note: use whatever style names already exist in the file — don't create duplicates.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add <workers file>
git commit -m "feat(transport): Transport department in workers hire screen"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task(s) |
|---|---|
| 6 new trailer types | Task 1 |
| truck_driver worker + transport department | Task 2, Task 9 |
| DeliveryJob / DeliveryCargo / ReturnOrder / AuctionPickup interfaces | Task 3 |
| GameState fields (deliveryJobs, fuelPrice, pendingPickup) | Task 3 |
| dispatchDelivery action | Task 4 |
| advanceDay delivery resolution + breakdown + fuel price walk | Task 5 |
| Spoilage for cold goods without trailer | Task 7 (contractor handler) |
| No contractor fallback for livestock | DispatchModal (no contractor button shown when `needsLivestock`) — **gap** |
| Return loads (trailer-gated) | Task 4 (dispatchDelivery accepts returnOrders) + DispatchModal (return load UI not yet added) — **partial** |
| Maquinaria Deliveries sub-tab | Task 8 |
| Live fuel price display | Task 8 |

**Gaps identified and addressed:**

1. **Livestock trailer — no contractor fallback:** In `DispatchModal`, conditionally hide the "Pay Contractor" button when `needsLivestock` is true:
   - In Task 6 Step 1, in `DispatchModal`'s actions section, wrap the contractor button: `{!needsLivestock && <TouchableOpacity...>Pay Contractor</TouchableOpacity>}`

2. **Return loads UI in DispatchModal:** The modal in Task 6 scaffolds `returnOrders: []` on dispatch but doesn't show a UI to pick return loads. This is a known simplification — return load UI can be added in a follow-up. The store supports it fully via `returnOrders` on `DeliveryJob`.

3. **animales.tsx — live animal sell:** The spec mentions intercepting live-animal sell in `animales.tsx` to require a livestock trailer. This was in the file map but not given a task. **Add Task 10 below.**

---

## Task 10: animales.tsx — Livestock Trailer Gate for Live Animal Sales

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [ ] **Step 1: Import DispatchModal and LIVESTOCK_TRAILER_IDS**

```typescript
import DispatchModal from '../../components/DispatchModal';
import { LIVESTOCK_TRAILER_IDS } from '../../store/useGameStore';
```

- [ ] **Step 2: Add dispatch modal state and livestock trailer check**

Inside `AnimalesScreen`, add:

```typescript
  const { trailers, deliveryJobs, ...rest } = useGameStore();

  const [liveDispatchVisible, setLiveDispatchVisible] = useState(false);
  const [liveDispatchCargo, setLiveDispatchCargo] = useState<DeliveryCargo[]>([]);

  const hasLivestockTrailer = (trailers ?? []).some(tr => {
    const busy = (deliveryJobs ?? []).some(j => j.trailerId === tr.id);
    return LIVESTOCK_TRAILER_IDS.includes(tr.typeId) && !busy;
  });
```

- [ ] **Step 3: Gate the "Sell Live" button**

Find wherever a live animal is sold to market (not culled for meat). Wrap the sell action:

```typescript
  const handleLiveAnimalSell = (animalId: string) => {
    if (!hasLivestockTrailer) {
      Alert.alert(
        'Livestock Trailer Required',
        'You need a livestock trailer to sell live animals. Without one you can only cull for meat.',
        [{ text: 'OK' }]
      );
      return;
    }
    setLiveDispatchCargo([{ itemId: animalId, quantity: 1, category: 'animal' }]);
    setLiveDispatchVisible(true);
  };
```

- [ ] **Step 4: Add DispatchModal to JSX**

```tsx
      <DispatchModal
        visible={liveDispatchVisible}
        cargo={liveDispatchCargo}
        marketId="city"
        onClose={() => setLiveDispatchVisible(false)}
        onContractor={() => setLiveDispatchVisible(false)} // livestock: no contractor
      />
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/animales.tsx
git commit -m "feat(transport): livestock trailer gate for live animal sales in animales tab"
```
