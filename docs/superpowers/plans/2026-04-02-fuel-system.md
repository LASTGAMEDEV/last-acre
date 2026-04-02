# Fuel System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fuel resource consumed by tractor and combine harvester jobs each day, with fuel tank buildings that expand capacity, a `buyFuel` action, and a Fuel section UI in `maquinaria.tsx`.

**Architecture:** Task 1 adds `fuelPerDay` to the `MachineType` interface and all 9 relevant machine entries. Task 2 adds two fuel tank buildings. Task 3 adds `fuel` state and `fuelCapacity` derived getter plus `buyFuel` action to the Zustand store. Task 4 wires fuel consumption into the `advanceDay` TractorJob and HarvestJob loops, pausing jobs when fuel runs out. Task 5 adds a Fuel section in `maquinaria.tsx` with a gauge bar and buy buttons. No new files needed.

**Tech Stack:** React Native, TypeScript, Zustand 5, Expo Router.

---

## File Map

| File | Action |
|------|--------|
| `data/machineTypes.ts` | Modify — add `fuelPerDay` field to `MachineType` interface and all tractor/harvester entries |
| `data/buildingTypes.ts` | Modify — add 2 fuel tank building entries |
| `store/useGameStore.ts` | Modify — add `fuel`, `buyFuel`, update `advanceDay` TractorJob and HarvestJob loops |
| `app/(tabs)/maquinaria.tsx` | Modify — add Fuel section with gauge + buy buttons |

---

## Task 1: Add `fuelPerDay` to `MachineType` interface and all entries

**Files:**
- Modify: `data/machineTypes.ts`

### Background

The full file (35 lines) contains the `MachineType` interface and `MACHINE_TYPES` array. Tractors (3) and combine harvesters (3) consume fuel when working. Irrigation systems, trucks, and trailers do not consume fuel from the tank (they use water/diesel tracked separately or are non-applicable). `fuelPerDay` is optional in the interface (so existing entries without it remain valid TypeScript) but all tractor and harvester entries should have it explicitly set.

Fuel consumption rates (L/day while a job is active — not per idle machine):
- `tractor-small`: 8 L/day
- `tractor-medium`: 18 L/day
- `tractor-large`: 40 L/day
- `combine-small`: 15 L/day
- `combine-medium`: 30 L/day
- `combine-large`: 60 L/day

### Changes

- [ ] **Step 1.1: Add `fuelPerDay` to the `MachineType` interface**

  Find:
  ```typescript
  export interface MachineType {
    id: string;
    name: string;
    cost: number;
    size: 'small' | 'medium' | 'large';
    category: 'tractor' | 'harvester' | 'truck' | 'trailer' | 'irrigation';
    maintenancePerDay: number;
    haPerDay?: number;           // harvesters
    capacityKg?: number;         // trucks (0 = needs trailer) and trailers
    compatibleTrailerSizes?: ('small' | 'medium' | 'large')[];  // trucks only
    compatibleTruckTypeIds?: string[];  // trailers: which truck ids can tow this
  }
  ```
  Replace with:
  ```typescript
  export interface MachineType {
    id: string;
    name: string;
    cost: number;
    size: 'small' | 'medium' | 'large';
    category: 'tractor' | 'harvester' | 'truck' | 'trailer' | 'irrigation';
    maintenancePerDay: number;
    fuelPerDay?: number;         // litres consumed per active job-day (tractors & harvesters only)
    haPerDay?: number;           // harvesters
    capacityKg?: number;         // trucks (0 = needs trailer) and trailers
    compatibleTrailerSizes?: ('small' | 'medium' | 'large')[];  // trucks only
    compatibleTruckTypeIds?: string[];  // trailers: which truck ids can tow this
  }
  ```

- [ ] **Step 1.2: Add `fuelPerDay` to all tractor entries**

  Find:
  ```typescript
    { id: 'tractor-small',  name: 'Small Tractor',  cost: 18000,  size: 'small',  category: 'tractor',    maintenancePerDay: 4 },
    { id: 'tractor-medium', name: 'Medium Tractor', cost: 48000,  size: 'medium', category: 'tractor',    maintenancePerDay: 9 },
    { id: 'tractor-large',  name: 'Large Tractor',  cost: 120000, size: 'large',  category: 'tractor',    maintenancePerDay: 20 },
  ```
  Replace with:
  ```typescript
    { id: 'tractor-small',  name: 'Small Tractor',  cost: 18000,  size: 'small',  category: 'tractor',    maintenancePerDay: 4,  fuelPerDay: 8 },
    { id: 'tractor-medium', name: 'Medium Tractor', cost: 48000,  size: 'medium', category: 'tractor',    maintenancePerDay: 9,  fuelPerDay: 18 },
    { id: 'tractor-large',  name: 'Large Tractor',  cost: 120000, size: 'large',  category: 'tractor',    maintenancePerDay: 20, fuelPerDay: 40 },
  ```

- [ ] **Step 1.3: Add `fuelPerDay` to all combine harvester entries**

  Find:
  ```typescript
    { id: 'combine-small',  name: 'Small Combine',  cost: 85000,  size: 'small',  category: 'harvester',  maintenancePerDay: 15, haPerDay: 4 },
    { id: 'combine-medium', name: 'Medium Combine', cost: 175000, size: 'medium', category: 'harvester',  maintenancePerDay: 28, haPerDay: 10 },
    { id: 'combine-large',  name: 'Large Combine',  cost: 340000, size: 'large',  category: 'harvester',  maintenancePerDay: 50, haPerDay: 22 },
  ```
  Replace with:
  ```typescript
    { id: 'combine-small',  name: 'Small Combine',  cost: 85000,  size: 'small',  category: 'harvester',  maintenancePerDay: 15, fuelPerDay: 15, haPerDay: 4 },
    { id: 'combine-medium', name: 'Medium Combine', cost: 175000, size: 'medium', category: 'harvester',  maintenancePerDay: 28, fuelPerDay: 30, haPerDay: 10 },
    { id: 'combine-large',  name: 'Large Combine',  cost: 340000, size: 'large',  category: 'harvester',  maintenancePerDay: 50, fuelPerDay: 60, haPerDay: 22 },
  ```

- [ ] **Step 1.4: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 1.5: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add data/machineTypes.ts && git commit -m "feat(machineTypes): add fuelPerDay field to MachineType interface and tractor/harvester entries"
  ```

---

## Task 2: Add fuel tank buildings to `buildingTypes.ts`

**Files:**
- Modify: `data/buildingTypes.ts`

### Background

The last entry in `BUILDING_TYPES` before the closing `];` is `bld_hydroponic_lab` (line 456–464). The `BuildingCategory` type already includes `'upgrade'`. New entries go before the closing `];`.

Fuel tank capacity is tracked via `capacity` (existing field in `BuildingType`, typed as `number | undefined`). The store will interpret `capacity` on fuel tank buildings as litres of fuel storage.

### Changes

- [ ] **Step 2.1: Append two fuel tank entries to `BUILDING_TYPES`**

  Find the last entry and closing bracket:
  ```typescript
    {
      id: 'bld_hydroponic_lab',
      name: 'Hydroponic Lab',
      category: 'upgrade',
      cost: 200_000,
      maintenancePerDay: 35,
      capacity: 10,
      effectLabel: '10 hydroponic slots — any crop, any season, +40% yield, no soil degradation',
    },
  ];
  ```
  Replace with:
  ```typescript
    {
      id: 'bld_hydroponic_lab',
      name: 'Hydroponic Lab',
      category: 'upgrade',
      cost: 200_000,
      maintenancePerDay: 35,
      capacity: 10,
      effectLabel: '10 hydroponic slots — any crop, any season, +40% yield, no soil degradation',
    },
    // ── Fuel Tanks ─────────────────────────────────────────────────────────────
    {
      id: 'bld_fuel_tank_s',
      name: 'Small Fuel Tank',
      category: 'upgrade',
      cost: 3_500,
      maintenancePerDay: 0,
      capacity: 500,
      effectLabel: '+500 L fuel capacity for tractors and combines',
    },
    {
      id: 'bld_fuel_tank_l',
      name: 'Large Fuel Tank',
      category: 'upgrade',
      cost: 9_000,
      maintenancePerDay: 0,
      capacity: 2000,
      effectLabel: '+2000 L fuel capacity for tractors and combines',
    },
  ];
  ```

- [ ] **Step 2.2: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 2.3: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add data/buildingTypes.ts && git commit -m "feat(buildingTypes): add Small Fuel Tank (500L) and Large Fuel Tank (2000L) upgrade buildings"
  ```

---

## Task 3: Add `fuel` state and `buyFuel` action to the store

**Files:**
- Modify: `store/useGameStore.ts`

### Background

- `fuel: number` — starts at 200 (L). Persisted.
- `fuelCapacity` — not stored; derived at runtime from `buildings` array. Default 200 L (no tanks). Each `bld_fuel_tank_s` adds 500 L; each `bld_fuel_tank_l` adds 2000 L. This is a computed value used in UI and `advanceDay`, not stored in state.
- `buyFuel(litres: number)` — deducts `litres * 1.20` from `money` (price: $1.20/L) and adds `litres` to `fuel`, capped at `fuelCapacity`.
- `partialize` already excludes action functions; `fuel` is a plain number and will be included automatically.

### Changes

- [ ] **Step 3.1: Add `fuel` to the `GameState` interface**

  Find the `farmName` and `priceAlerts` lines in the `GameState` interface:
  ```typescript
    farmName: string;
    priceAlerts: PriceAlert[];
  ```
  Replace with:
  ```typescript
    farmName: string;
    fuel: number;
    priceAlerts: PriceAlert[];
  ```

- [ ] **Step 3.2: Add `buyFuel` action signature to `GameState`**

  Find:
  ```typescript
    addPriceAlert: (cropId: string, targetPrice: number, direction: 'above' | 'below') => void;
    removePriceAlert: (alertId: string) => void;
  ```
  Replace with:
  ```typescript
    addPriceAlert: (cropId: string, targetPrice: number, direction: 'above' | 'below') => void;
    removePriceAlert: (alertId: string) => void;
    buyFuel: (litres: number) => void;
  ```

- [ ] **Step 3.3: Add `getFuelCapacity` helper function**

  Add a pure helper near the other utility functions in the store file (e.g. near `getSiloCapacity`). Search for `function getSiloCapacity` and insert immediately after its closing brace:

  ```typescript
  function getFuelCapacity(buildings: string[]): number {
    let cap = 200; // default tank
    for (const id of buildings) {
      if (id === 'bld_fuel_tank_s') cap += 500;
      else if (id === 'bld_fuel_tank_l') cap += 2000;
    }
    return cap;
  }
  ```

- [ ] **Step 3.4: Add `fuel` to the initial state**

  Find the initial state block containing `farmName` and `priceAlerts`:
  ```typescript
      farmName: 'My Farm',
      priceAlerts: [] as PriceAlert[],
  ```
  Replace with:
  ```typescript
      farmName: 'My Farm',
      fuel: 200,
      priceAlerts: [] as PriceAlert[],
  ```

- [ ] **Step 3.5: Add `buyFuel` action implementation**

  Find the `addPriceAlert` implementation:
  ```typescript
        addPriceAlert: (cropId, targetPrice, direction) => {
  ```
  Insert the `buyFuel` action immediately before it:
  ```typescript
        buyFuel: (litres) => {
          const state = get();
          const capacity = getFuelCapacity(state.buildings);
          const canAdd = Math.max(0, capacity - state.fuel);
          const actualLitres = Math.min(litres, canAdd);
          if (actualLitres <= 0) return;
          const cost = Math.round(actualLitres * 1.20);
          if (state.money < cost) return;
          set({ fuel: Math.min(capacity, state.fuel + actualLitres), money: state.money - cost });
        },

  ```

- [ ] **Step 3.6: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 3.7: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(store): add fuel state, getFuelCapacity helper, and buyFuel action"
  ```

---

## Task 4: Add fuel consumption to `advanceDay`

**Files:**
- Modify: `store/useGameStore.ts`

### Background

The `advanceDay` action processes TractorJobs (lines 1925–1973) and HarvestJobs (lines 1975–2015). For each active job, the machine's `fuelPerDay` is deducted from a mutable `currentFuel` variable. If fuel would go negative before the job processes, the job is skipped for that day (not cancelled — the job remains but doesn't progress). A summary event is pushed if any job was paused for fuel.

`TractorJob` has `completesDay` — a job with `completesDay > newDay` is skipped entirely on this day (already in the existing code). For fuel: only jobs that _would_ execute (i.e. `completesDay <= newDay` for tractors, or active harvest jobs) consume fuel.

For HarvestJobs the existing loop already processes incrementally. We check fuel before processing each job's `haAvailable` slice. If insufficient, we skip that job's processing for the day.

Note: `status: 'paused'` is not an existing field on `TractorJob` or `HarvestJob`. Rather than adding a new field to the interfaces (which would require a save version bump), we simply _skip_ the job's effect for that day by not calling the processing code — the job persists and will retry next day if fuel is available.

### Changes

- [ ] **Step 4.1: Initialize `currentFuel` and `fuelPausedMachineNames` before the job loops**

  Find the comment and code that begins the TractorJob processing block:
  ```typescript
          // ── Process TractorJobs ──────────────────────────────────────────────
          const completedTractorJobIds: string[] = [];
  ```
  Insert before it:
  ```typescript
          // ── Fuel tracking for job day ────────────────────────────────────────
          let currentFuel = state.fuel ?? 200;
          const fuelPausedNames: string[] = [];
  ```

- [ ] **Step 4.2: Deduct fuel for each TractorJob that executes**

  Inside the TractorJob loop, find:
  ```typescript
          for (const job of (state.tractorJobs ?? [])) {
            if (job.completesDay > newDay) continue;
            completedTractorJobIds.push(job.id);
  ```

  Replace with:
  ```typescript
          for (const job of (state.tractorJobs ?? [])) {
            if (job.completesDay > newDay) continue;
            // Fuel check
            const tractorMachineType = MACHINE_TYPES.find((mt: { id: string }) => {
              const owned = (state.machines ?? []).find((m: OwnedMachine) => m.id === job.tractorId);
              return owned ? mt.id === owned.typeId : false;
            });
            const fuelNeeded = tractorMachineType?.fuelPerDay ?? 0;
            if (fuelNeeded > 0 && currentFuel < fuelNeeded) {
              const machineName = tractorMachineType?.name ?? 'Tractor';
              fuelPausedNames.push(machineName);
              continue; // skip this job — not enough fuel
            }
            currentFuel -= fuelNeeded;
            completedTractorJobIds.push(job.id);
  ```

- [ ] **Step 4.3: Deduct fuel for each HarvestJob that executes**

  Inside the HarvestJob loop, find:
  ```typescript
          for (let hi = 0; hi < updatedHarvestJobs.length; hi++) {
            const hj = updatedHarvestJobs[hi];
            const haAvailable = Math.min(hj.haPerDay, hj.totalHa - hj.processedHa);
            let processedHa = 0;
  ```

  Replace with:
  ```typescript
          for (let hi = 0; hi < updatedHarvestJobs.length; hi++) {
            const hj = updatedHarvestJobs[hi];
            // Fuel check
            const combineOwnedMachine = (state.machines ?? []).find((m: OwnedMachine) => m.id === hj.combineId);
            const combineMachineType = MACHINE_TYPES.find((mt: { id: string }) => mt.id === (combineOwnedMachine?.typeId ?? ''));
            const harvestFuelNeeded = combineMachineType?.fuelPerDay ?? 0;
            if (harvestFuelNeeded > 0 && currentFuel < harvestFuelNeeded) {
              const machineName = combineMachineType?.name ?? 'Combine';
              fuelPausedNames.push(machineName);
              continue; // skip this harvest job day — not enough fuel
            }
            currentFuel -= harvestFuelNeeded;
            const haAvailable = Math.min(hj.haPerDay, hj.totalHa - hj.processedHa);
            let processedHa = 0;
  ```

- [ ] **Step 4.4: Push a summary event if any jobs were paused, and persist `fuel`**

  After the harvest jobs loop (after `updatedHarvestJobs = updatedHarvestJobs.filter(...)`) and before the crop disease section, add:
  ```typescript
          if (fuelPausedNames.length > 0) {
            const uniqueNames = [...new Set(fuelPausedNames)];
            summary.push({
              id: 'fuel_paused',
              icon: '⛽',
              title: `Fuel too low — ${uniqueNames.join(', ')} idle`,
              detail: `Refuel in the Machinery tab to resume jobs`,
              severity: 'danger',
            });
          }
  ```

  Then in the final `set({...})` call at the end of `advanceDay`, add `fuel: currentFuel` to the object being set. Find the block that sets `tractorJobs` and `harvestJobs`:
  ```typescript
            tractorJobs: remainingTractorJobs,
            harvestJobs: updatedHarvestJobs,
  ```
  Replace with:
  ```typescript
            tractorJobs: remainingTractorJobs,
            harvestJobs: updatedHarvestJobs,
            fuel: currentFuel,
  ```

- [ ] **Step 4.5: Verify `MACHINE_TYPES` is imported in the store**

  Search for `import.*MACHINE_TYPES` in `store/useGameStore.ts`. If not already imported, add:
  ```typescript
  import { MACHINE_TYPES } from '../data/machineTypes';
  ```
  (It is likely already imported since machinery buying logic references it — confirm before adding.)

- [ ] **Step 4.6: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 4.7: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(store): consume fuel in advanceDay for tractor and harvest jobs; pause jobs when insufficient"
  ```

---

## Task 5: Add Fuel section to `maquinaria.tsx`

**Files:**
- Modify: `app/(tabs)/maquinaria.tsx`

### Background

The machinery screen has three tabs: `'fleet' | 'attachments' | 'jobs'` (line 8). The fuel section is added as a new tab `'fuel'` — the simplest approach that keeps the UI clean.

Alternatively (simpler, less UI work): add the fuel section at the top of the existing `'fleet'` tab's scroll view. This avoids adding a new tab and tab bar item. We'll add it at the **top of the FleetTab scroll view** since that's where the farm's energy resource status belongs.

The fuel gauge is a horizontal bar showing `fuel / fuelCapacity` as a percentage. Buy buttons: 50 L / $60, 100 L / $120, 200 L / $240, and "Fill" which buys `fuelCapacity - fuel` litres at $1.20/L.

### Changes

- [ ] **Step 5.1: Import `BUILDING_TYPES` and the fuel capacity helper**

  `BUILDING_TYPES` is in `data/buildingTypes.ts`. Add to `maquinaria.tsx` imports:
  ```typescript
  import { BUILDING_TYPES } from '../../data/buildingTypes';
  ```

  Because `getFuelCapacity` is a private function inside `useGameStore.ts`, we need to duplicate the computation inline in the component (it's 5 lines). Do NOT export it from the store to avoid interface pollution.

- [ ] **Step 5.2: Destructure `fuel`, `buyFuel`, and `buildings` from the store in `FleetTab`**

  Find the destructuring in `FleetTab` (line 12):
  ```typescript
    const { machines, trailers, tractorJobs, harvestJobs, machineRepairs, day } = useGameStore();
  ```
  Replace with:
  ```typescript
    const { machines, trailers, tractorJobs, harvestJobs, machineRepairs, day, fuel, buyFuel, buildings, money } = useGameStore();
  ```

- [ ] **Step 5.3: Compute `fuelCapacity` inline**

  After the destructuring line, add:
  ```typescript
    const fuelCapacity = (buildings ?? []).reduce((cap: number, id: string) => {
      if (id === 'bld_fuel_tank_s') return cap + 500;
      if (id === 'bld_fuel_tank_l') return cap + 2000;
      return cap;
    }, 200);
    const fuelPct = Math.min(1, (fuel ?? 0) / fuelCapacity);
    const fuelColor = fuelPct > 0.5 ? '#66bb6a' : fuelPct > 0.2 ? '#ffa726' : '#ef5350';
    const fillCost = Math.round(Math.max(0, fuelCapacity - (fuel ?? 0)) * 1.20);
  ```

- [ ] **Step 5.4: Add the fuel section JSX at the top of `FleetTab`'s return**

  In `FleetTab`, find the conditional that renders the empty state:
  ```typescript
    if ((machines ?? []).length === 0) {
  ```

  The component's full return (for the non-empty case) wraps everything in a `ScrollView`. Find where that `ScrollView` begins in the FleetTab return and add the fuel section before the tractors/combines renders. Since the current structure ends at the outer return, insert a fuel card JSX block before the tractor/combine/truck/irrigation groups.

  Specifically, locate the FleetTab return's `ScrollView` opening. The FleetTab renders content inside a `ScrollView` (search for the ScrollView in the non-empty branch). Add this block as the first child of that `ScrollView`:

  ```typescript
          {/* Fuel section */}
          <View style={s.fuelCard}>
            <View style={s.fuelHeader}>
              <Text style={s.fuelTitle}>⛽ Fuel</Text>
              <Text style={s.fuelAmount}>{Math.round(fuel ?? 0).toLocaleString()} / {fuelCapacity.toLocaleString()} L</Text>
            </View>
            {/* Gauge bar */}
            <View style={s.fuelGaugeBg}>
              <View style={[s.fuelGaugeFill, { width: `${Math.round(fuelPct * 100)}%` as `${number}%`, backgroundColor: fuelColor }]} />
            </View>
            {/* Buy buttons */}
            <View style={s.fuelBuyRow}>
              {([50, 100, 200] as const).map(litres => {
                const cost = Math.round(litres * 1.20);
                const canAfford = money >= cost;
                const hasRoom = (fuel ?? 0) + litres <= fuelCapacity;
                return (
                  <TouchableOpacity
                    key={litres}
                    style={[s.fuelBuyBtn, (!canAfford || !hasRoom) && s.fuelBuyBtnDisabled]}
                    onPress={() => buyFuel(litres)}
                    disabled={!canAfford || !hasRoom}
                  >
                    <Text style={s.fuelBuyBtnTop}>+{litres} L</Text>
                    <Text style={s.fuelBuyBtnSub}>${cost}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[s.fuelBuyBtn, s.fuelFillBtn, (fillCost <= 0 || money < fillCost) && s.fuelBuyBtnDisabled]}
                onPress={() => buyFuel(fuelCapacity - (fuel ?? 0))}
                disabled={fillCost <= 0 || money < fillCost}
              >
                <Text style={s.fuelBuyBtnTop}>Fill</Text>
                <Text style={s.fuelBuyBtnSub}>${fillCost.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          </View>
  ```

- [ ] **Step 5.5: Add fuel styles to the `s` StyleSheet**

  In `maquinaria.tsx`, the StyleSheet is named `s` (from `const s = StyleSheet.create({...})`). Append to it:
  ```typescript
    fuelCard:          { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 10, gap: 8 },
    fuelHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fuelTitle:         { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
    fuelAmount:        { color: '#888', fontSize: 11 },
    fuelGaugeBg:       { height: 8, backgroundColor: '#0d1117', borderRadius: 4, overflow: 'hidden' },
    fuelGaugeFill:     { height: 8, borderRadius: 4 },
    fuelBuyRow:        { flexDirection: 'row', gap: 6 },
    fuelBuyBtn:        { flex: 1, backgroundColor: '#0f3460', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
    fuelBuyBtnDisabled:{ backgroundColor: '#1a1a2e', opacity: 0.5 },
    fuelFillBtn:       { backgroundColor: '#1a3a20' },
    fuelBuyBtnTop:     { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
    fuelBuyBtnSub:     { color: '#66bb6a', fontSize: 10 },
  ```

- [ ] **Step 5.6: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 5.7: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/\(tabs\)/maquinaria.tsx && git commit -m "feat(maquinaria): add fuel gauge and buy buttons at top of Fleet tab"
  ```
