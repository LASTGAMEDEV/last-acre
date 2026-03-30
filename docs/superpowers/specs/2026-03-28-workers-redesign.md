# Workers Redesign Spec
_Date: 2026-03-28_

## Goal

Expand the Workers tab from 3 basic auto-action roles into 8 roles across 4 departments, each with meaningful passive bonuses. Add a basic → specialist tier structure to give the player a sense of progression.

---

## Worker Roster

### Departments and Roles

| Dept | Tier | ID | Name | Wage/day | Max | Unlock Req |
|------|------|----|------|----------|-----|------------|
| Fields | Basic | `field_worker` | Field Worker | $50 | 5 | — |
| Fields | Specialist | `agronomist` | Agronomist | $120 | 2 | 1× field_worker |
| Animals | Basic | `animal_keeper` | Animal Keeper | $40 | 3 | — |
| Animals | Specialist | `zootechnician` | Zootechnician | $100 | 2 | 1× animal_keeper |
| Machinery | Basic | `mechanic` | Mechanic | $70 | 2 | — |
| Machinery | Specialist | `engineer` | Engineer | $150 | 1 | 1× mechanic |
| Processing | Basic | `processor` | Processor | $60 | 3 | — |
| Processing | Specialist | `supervisor` | Supervisor | $130 | 1 | 1× processor |
| — | Standalone | `vet` | Veterinarian | $80 | 2 | — |

_Existing `vet` role is kept unchanged — vets are the only ones who cure sick animals and remain a standalone hire outside the department tier system._

### Passive Bonuses

| Role | Bonus |
|------|-------|
| Field Worker | Auto-harvest ready plots + +5% crop yield per worker hired (stacks, max +25%) |
| Agronomist | +15% crop yield + crops grow 1 day faster |
| Animal Keeper | Auto-collect animal products + +8% animal production per keeper (stacks, max +24%) |
| Zootechnician | +25% animal production + −30% animal sickness chance |
| Mechanic | −20% machine maintenance cost per mechanic (stacks, max −40%) |
| Engineer | −40% machine maintenance cost + +10% bonus stacked on top of all machine yield bonuses |
| Processor | +10% processing output per worker (stacks, max +30%) |
| Supervisor | +25% processing output + auto-processes 1 batch of the highest-stock recipe each day |
| Veterinarian | Auto-treats all sick animals each day (covers treatment costs) |

**Stacking rules:**
- Field Worker yield bonus and Agronomist yield bonus are additive (e.g. 2× field workers + 1 agronomist = +10% + 15% = +25% total yield multiplier).
- Mechanic and Engineer maintenance reduction: hiring Engineer replaces Mechanic's reduction (Engineer is always better; don't double-apply).
- Processor and Supervisor output bonuses are additive.

**Unlock rule:** To hire a specialist, the player must have at least 1 basic worker of the same department currently hired. Firing all basic workers of a department does not auto-fire the specialist, but the hire button for that specialist becomes locked again.

---

## Data Layer (`data/workerTypes.ts`)

Extend `WorkerType` with:
- `department: 'fields' | 'animals' | 'machinery' | 'processing'`
- `tier: 'basic' | 'specialist'`
- `requiresBasicId?: WorkerRole` — ID of the basic role required to unlock
- `bonuses` object describing passive effects (used by both store and UI description rendering)

`WorkerRole` union expands to include all 8 new IDs. `vet` is removed.

---

## Store Changes (`store/useGameStore.ts`)

### Bonus application in `advanceDay()`

Add a `getWorkerBonuses(workers)` helper (or inline) that computes:

```
cropYieldMultiplier    — 1 + (fieldWorkerCount * 0.05) + (agronomistCount * 0.15)
cropGrowthReduction    — agronomistCount > 0 ? 1 : 0  (days shaved off growth)
animalProductionMult   — 1 + (keeperCount * 0.08) + (zootechCount * 0.25)
sicknessBonusReduction — zootechCount > 0 ? 0.3 : 0
maintenanceMult        — engineerCount > 0 ? 0.6 : (1 - mechanicCount * 0.2)
machineYieldBonus      — engineerCount > 0 ? 0.1 : 0  (added to machine yield)
processingOutputMult   — 1 + (processorCount * 0.10) + (supervisorCount * 0.25)
autoProcessEnabled     — supervisorCount > 0
```

Apply these multipliers at the relevant points in `advanceDay()`:
- `harvestYield()` call → multiply result by `cropYieldMultiplier`
- Crop `growthDays` check → subtract `cropGrowthReduction` from remaining days
- Animal production → multiply by `animalProductionMult`
- Animal sickness roll → reduce probability by `sicknessBonusReduction`
- Machine maintenance deduction → multiply by `maintenanceMult`
- `processProduct()` output → multiply by `processingOutputMult`

### `hireWorker` guard update
Before hiring a specialist, check that `workers` contains at least 1 worker with the matching `requiresBasicId`.

### `OwnedWorker` type
No changes needed — `{ id, typeId, hiredDay }` is sufficient.

---

## UI (`app/(tabs)/trabajadores.tsx`)

### Layout

```
[Wage banner — total staff · total wages/day]

🌾 Fields
  [Field Worker card]  [Agronomist card — locked if no field_worker]

🐄 Animals
  [Animal Keeper card]  [Zootechnician card — locked if no animal_keeper]

⚙️ Machinery
  [Mechanic card]  [Engineer card — locked if no mechanic]

🏭 Processing
  [Processor card]  [Supervisor card — locked if no processor]

🏥 Standalone
  [Veterinarian card — always available]

Active Staff
  [worker row] [worker row] ...
```

### Card anatomy

Each card (basic or specialist) shows:
- Icon + name
- Bonus description (1-2 lines)
- Wage per day
- `X / maxCount hired`
- Hire button (disabled if at max, can't afford, or locked)
- If locked: small gray note — *"Requires 1 Field Worker"*

Specialist cards use a slightly different background color to visually distinguish tier.

### Active staff list

Same as current. Add a small department tag (e.g. `🌾`) next to each worker name.

---

## Files Touched

| File | Change |
|------|--------|
| `data/workerTypes.ts` | Rewrite with 8 roles, new fields |
| `store/useGameStore.ts` | `hireWorker` guard, bonus application in `advanceDay()` |
| `app/(tabs)/trabajadores.tsx` | Full UI rewrite with department grouping |

No new files needed. Engine functions remain pure — bonus math lives in the store or a small inline helper.

---

## Out of Scope

- Worker morale / happiness
- Worker names / personalities
- Worker experience / leveling
- More than 8 roles
