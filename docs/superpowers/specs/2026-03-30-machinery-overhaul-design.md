# Machinery Overhaul — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Machinery becomes a functional requirement for farming operations rather than a passive yield bonus. Every field operation (till, plant, spray, harvest, transport, irrigate) requires the appropriate machine. Without one, the player hires a contractor for a flat fee. Tractors accept detachable attachments and can only run one job at a time. Save key bumps v6 → v7.

---

## 1. Farming Lifecycle

Each parcel progresses through these states:

```
UNTILLED → [Till] → TILLED → [Plant] → PLANTED → [Grow] → READY → [Harvest] → HARVESTED
                                          ↑                    ↑
                               [Irrigate] optional    [Spray] optional during grow
                                                              ↓
                                                      [Transport] optional after harvest
```

- **Till** and **Plant** are required in sequence — a parcel must be `tilled: true` before a crop can be planted.
- **Irrigate** and **Spray** are optional but improve yield.
- **Harvest** requires a combine harvester or contractor.
- **Transport** is optional — without a truck the crop sells at -12% (contractor cut).

---

## 2. Machine Categories

### 2.1 Tractors (3 sizes)

| Size   | Cost     | Sweet Spot  |
|--------|----------|-------------|
| Small  | $18,000  | 1–5 ha      |
| Medium | $48,000  | 5–20 ha     |
| Large  | $120,000 | 20+ ha      |

**Rules:**
- One active job per tractor at a time.
- Tractor alone does nothing — requires an attachment for field operations.
- Small attachment fits Small and Medium tractors. Large attachment fits Large tractor only.

### 2.2 Attachments (per operation, 3 sizes each)

| Attachment      | Operation | Small          | Medium          | Large           |
|-----------------|-----------|----------------|-----------------|-----------------|
| Cultivator      | Till      | $5,000 · 2 ha/day | $11,000 · 5 ha/day | $25,000 · 12 ha/day |
| Planter         | Plant     | $6,500 · 4 ha/day | $15,000 · 10 ha/day | $32,000 · 22 ha/day |
| Sprayer         | Spray     | $4,000 · 6 ha/day | $9,500 · 15 ha/day  | $22,000 · 35 ha/day |

### 2.3 Combine Harvesters (3 sizes, standalone)

| Size   | Cost      | Rate       |
|--------|-----------|------------|
| Small  | $85,000   | 4 ha/day   |
| Medium | $175,000  | 10 ha/day  |
| Large  | $340,000  | 22 ha/day  |

### 2.4 Irrigation Systems (standalone)

| System         | Cost     | Coverage  | Install Time |
|----------------|----------|-----------|--------------|
| Drip System    | $8,500   | 1 parcel  | 1 day        |
| Sprinkler Array| $28,000  | 3 parcels | 2 days       |
| Center Pivot   | $95,000  | 8 parcels | 4 days       |

### 2.5 Trucks & Trailers

**Vehicles:**

| Vehicle    | Cost    | Standalone Capacity | Future Plans |
|------------|---------|---------------------|--------------|
| Pickup     | $28,000 | 0 kg (needs trailer)| Yes          |
| Dump Truck | $43,000 | 10,000 kg           | No           |
| Semi       | $72,000 | 0 kg (needs trailer)| Yes          |

Pickup and Semi are vehicle platforms with future functionality planned beyond transport. Dump Truck is transport-only.

**Trailers (purchased separately):**

| Trailer          | Cost    | Capacity   | Compatible With     |
|------------------|---------|------------|---------------------|
| Small Trailer    | $10,000 | 2,000 kg   | Pickup              |
| Standard Trailer | $22,000 | 6,000 kg   | Pickup or Semi      |
| Large Trailer    | $38,000 | 22,000 kg  | Semi only           |

A Pickup or Semi without a trailer has zero transport capacity. The `hitchTrailer` action links a trailer to a truck. A trailer can only be hitched to one truck at a time.

---

## 3. Contractor Fallback

Any operation can be handled by a contractor — instantly, no machine required.

| Operation   | Cost         |
|-------------|--------------|
| Tilling     | $180 / ha    |
| Planting    | $130 / ha    |
| Spraying    | $85 / ha     |
| Harvesting  | $280 / ha    |
| Irrigation  | $300 / parcel|
| Transport   | 12% of sale  |

When the player clicks an operation without owning the required machine, a contractor modal appears showing the cost breakdown. Confirming deducts the fee and applies the operation instantly the same day.

---

## 4. Data Model

### 4.1 Updated `LandParcel`

```typescript
tilled: boolean  // true after till operation; reset to false after harvest
```

### 4.2 `AttachmentType` (new — `data/attachmentTypes.ts`)

```typescript
export interface AttachmentType {
  id: string;
  name: string;
  cost: number;
  operation: 'till' | 'plant' | 'spray';
  size: 'small' | 'medium' | 'large';
  haPerDay: number;
  compatibleTractorSizes: ('small' | 'medium' | 'large')[];
}
```

### 4.3 Updated `MachineType` (`data/machineTypes.ts`)

```typescript
export interface MachineType {
  id: string;
  name: string;
  cost: number;
  size: 'small' | 'medium' | 'large';
  category: 'tractor' | 'harvester' | 'truck' | 'trailer' | 'irrigation';
  maintenancePerDay: number;
  haPerDay?: number;           // harvesters and irrigation
  capacityKg?: number;         // trucks and trailers (0 for pickup/semi alone)
  compatibleTrailerSizes?: ('small' | 'medium' | 'large')[];  // trucks: which trailer sizes can hitch
  compatibleTruckCategories?: string[];  // trailers: which truck ids can tow this (e.g. ['pickup','semi'])
}
```

Existing `yieldBonus` and `speedBonus` fields are removed — machines no longer provide passive bonuses. Their value is operational gating.

### 4.4 `TractorJob` (new — store)

```typescript
export interface TractorJob {
  id: string;
  tractorId: string;
  attachmentId: string;
  operation: 'till' | 'plant' | 'spray';
  parcelIds: string[];
  cropId?: string;       // required when operation === 'plant'; selected by player at assign time
  totalHa: number;
  haPerDay: number;
  startDay: number;
  completesDay: number;  // startDay + Math.ceil(totalHa / haPerDay)
}
```

### 4.5 `HarvestJob` (new — store)

Harvest uses a combine harvester, not a tractor+attachment. Tracked separately.

```typescript
export interface HarvestJob {
  id: string;
  combineId: string;
  parcelIds: string[];
  totalHa: number;
  haPerDay: number;
  startDay: number;
  completesDay: number;
}
```

### 4.6 New store state fields

```typescript
attachments: OwnedAttachment[];   // { id: string; typeId: string }
tractorJobs: TractorJob[];
harvestJobs: HarvestJob[];
trailers: OwnedTrailer[];         // { id: string; typeId: string; hitchedTo: string | null }
```

---

## 5. Engine — `engine/machinery.ts`

Pure functions, no store access:

```typescript
calcJobDays(totalHa: number, haPerDay: number): number
  // Math.ceil(totalHa / haPerDay)

getContractorCost(operation: ContractorOperation, totalHa: number, pricePerUnit?: number): number
  // Returns flat fee for till/plant/spray/harvest/irrigate; 12% of value for transport

canAssignJob(tractor: OwnedMachine, attachment: OwnedAttachment, operation, parcels, activeJobs): { ok: boolean; reason?: string }
  // Checks: tractor not busy, attachment compatible with tractor size, parcels in correct state

getTransportCapacityKg(machines: OwnedMachine[], trailers: OwnedTrailer[]): number
  // Sums capacityKg for all truck+trailer combos (and standalone dump trucks)
```

---

## 6. Store Changes

### 6.1 New actions

- `buyAttachment(typeId)` — deduct cost, push to `attachments[]`
- `buyTrailer(typeId)` — deduct cost, push to `trailers[]`
- `hitchTrailer(trailerId, truckId | null)` — set `trailer.hitchedTo`
- `assignJob(tractorId, attachmentId, operation, parcelIds, cropId?)` — validate via `canAssignJob`, compute `completesDay`, push `TractorJob`. For plant jobs, `cropId` is required and stored on the job; the parcel is marked as planting-in-progress but crop is not set until job completes.
- `assignHarvestJob(combineId, parcelIds)` — validate combine not busy, compute `completesDay`, push `HarvestJob`
- `hireContractor(operation, parcelIds, cropId?)` — deduct fee, apply operation instantly. For plant, `cropId` required.

### 6.2 Updated actions

- `plantCrop` — blocked if `parcel.tilled === false`; shows "Till this field first" message
- `harvestCrop` — blocked if no owned combine; prompts contractor hire instead

### 6.3 `advanceDay` additions

```
For each tractorJob where completesDay <= newDay:
  - 'till'  → set parcel.tilled = true for all parcelIds
  - 'plant' → no-op (planting was queued; actual crop was set at assignJob time)
  - 'spray' → apply spray benefit to parcels
  Remove job, push day summary entry

Harvest jobs (combine): processed incrementally — track ha harvested per day
  Each day: process up to combine.haPerDay worth of ready parcels
  Remove job when all parcels harvested
```

### 6.4 Partialize

Add `attachments`, `tractorJobs`, `trailers` to persisted state. Add `buyAttachment`, `buyTrailer`, `hitchTrailer`, `assignJob`, `hireContractor` to partialize exclusion list.

### 6.5 Save key

`granja-tycoon-save-v6` → `granja-tycoon-save-v7`

---

## 7. UI Changes

### 7.1 Market tab split

Current `tienda.tsx` (or equivalent shop tab) splits into two internal sub-tabs:
- **Machinery** — tractors, combines, trucks, trailers, attachments
- **Buildings** — all existing buildings (silo, workshop, greenhouse, etc.)

### 7.2 Machinery tab redesign (`maquinaria.tsx`)

Three internal sub-tabs:
- **Fleet** — owned tractors, combines, trucks with active job status and repair state
- **Attachments** — owned attachments + shop; trailer hitch UI for trucks
- **Jobs** — active tractor jobs with days remaining; assign new job UI (select tractor + attachment + parcels + operation)

### 7.3 Fields tab (`tierras.tsx`)

Each parcel card shows context-sensitive operation buttons:
- Unowned → **Buy**
- Owned, untilled → **Till** (opens assign-job or contractor modal)
- Owned, tilled → **Plant**
- Planted, growing → **Spray** (optional)
- Ready to harvest → **Harvest**
- Active tractor job in progress → progress indicator (e.g. "Tilling · 2d remaining")

### 7.4 Contractor modal

Shared modal component `ContractorModal`. Shows:
- Operation name
- Affected parcels + total ha
- Cost breakdown (ha × rate or fixed fee)
- Confirm / Cancel buttons
- Disabled + reason if player can't afford

---

## 8. Removed / Replaced

- `yieldBonus` and `speedBonus` on `MachineType` — removed (machines no longer give passive yield bonuses)
- Existing irrigation machine entries in `MACHINE_TYPES` — replaced by new irrigation system definitions
- Existing tractor/harvester/truck entries — replaced with new sized definitions
- Old `getMachineYieldBonus` and `getMachineSpeedBonus` helpers — removed from store
