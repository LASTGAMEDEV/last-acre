# Fuel System — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Tractors and combines consume fuel when running jobs. Players must keep fuel stocked, which adds a resource management layer to the machinery system.

## Fuel Resource

- `fuel: number` — litres in store, starts at 200 (a free starter amount)
- `fuelCapacity: number` — max litres storable, derived from owned fuel tank buildings
- Default capacity without any tank building: 200 L

## Fuel Buildings (add to `data/buildingTypes.ts`)

| ID | Name | Cost | Capacity | Category |
|----|------|------|----------|----------|
| `bld_fuel_tank_s` | Small Fuel Tank | $3,500 | +500 L | `'upgrade'` |
| `bld_fuel_tank_l` | Large Fuel Tank | $9,000 | +2,000 L | `'upgrade'` |

## Fuel Consumption

Tractors and combines consume fuel per day while a job is active:
- Small tractor: 8 L/day
- Medium tractor: 15 L/day  
- Large tractor: 28 L/day
- Small combine: 12 L/day
- Medium combine: 22 L/day
- Large combine: 38 L/day

Consumption is defined in `data/machineTypes.ts` as a `fuelPerDay: number` field on each machine.

## Fuel Purchase

Players buy fuel in `app/(tabs)/maquinaria.tsx` (new Fuel sub-section):
- Price: $1.20 per litre (flat)
- Buy in quantities: 50L / 100L / 200L / fill to max
- Cannot buy more than `fuelCapacity`

## Job Behaviour Without Fuel

If `fuel < fuelPerDay` for a running job:
- Job is paused (not cancelled) — `job.status = 'paused'`
- Day summary shows: "⛽ [MachineName] ran out of fuel — job paused"
- Job resumes automatically next advanceDay once fuel is restocked

## advanceDay Changes

In the TractorJob and HarvestJob processing loops:
1. Calculate total fuel needed this day across all active jobs
2. If `fuel >= totalNeeded`: deduct and proceed normally
3. If `fuel < totalNeeded`: deduct all available fuel, mark jobs with insufficient fuel as paused

## UI

`app/(tabs)/maquinaria.tsx` — new "⛽ Fuel" section at top of screen:
- Fuel gauge: `fuel / fuelCapacity` bar with litre count
- Buy fuel buttons (50L / 100L / 200L / Fill)
- Cost preview next to each button

## Files Changed

| File | Action |
|------|--------|
| `data/buildingTypes.ts` | Modify — add 2 fuel tank buildings |
| `data/machineTypes.ts` | Modify — add `fuelPerDay` field to each machine entry |
| `store/useGameStore.ts` | Modify — add `fuel`, `fuelCapacity` state + `buyFuel` action + advanceDay fuel deduction + job pause logic |
| `app/(tabs)/maquinaria.tsx` | Modify — add Fuel section with gauge + buy buttons |
