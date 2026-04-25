# Electricity System — Design Spec
**Date:** 2026-04-19  
**Status:** Approved — ready for implementation planning  
**Depends on:** Climate system (weather multipliers), Water system (pump loads), Workers system (Farm Mechanic cert)

---

## Overview

A farm-wide electricity infrastructure layer. Every building in the game draws power. The grid covers demand by default but charges a monthly bill. Players invest in on-farm renewable generation to reduce costs, achieve energy independence, and survive outages. Touches every system in the game.

---

## 1. Grid Connection

The grid is the baseline power source. It covers any shortfall between on-farm generation and total demand automatically — but charges for every kWh imported.

### Connection Tiers

| Tier | Max Import | Upgrade Cost | Unlocks |
|------|-----------|--------------|---------|
| Basic | 50 kW | Starting | Grid connection |
| Standard | 150 kW | $8,000 | Supports medium farm |
| Industrial | 400 kW | $25,000 | Supports large processing |
| Heavy Industrial | 1,000 kW | $80,000 | Full factory operation |

If total demand exceeds the connection tier's max import AND on-farm generation can't cover the shortfall, low-priority buildings are shed automatically until demand fits within capacity.

### Grid Rates

Base rate: **$0.14/kWh** (adjustable by price region)

| Time | Rate Multiplier |
|------|----------------|
| Peak (07:00–22:00) | 1.0× |
| Off-peak (22:00–07:00) | 0.65× |

Processing buildings can be **scheduled** to run overnight to take advantage of off-peak rates.

### Energy Price Volatility

Grid rates fluctuate ±30% over time driven by:
- Seasonal demand (winter = higher rates)
- Random energy crisis events (can double rates for 7–30 days)
- Long-term inflation drift (rates slowly increase year-on-year)

Charlie warns when an energy crisis event begins.

---

## 2. Building Power Draws

Every building has a `powerDraw` value (kW per active day). Buildings only draw power when active/occupied.

### Reference Values

| Building | Power Draw (kW) |
|----------|----------------|
| Barn (basic) | 2 |
| Milking parlour | 8 |
| Egg collection house | 3 |
| Irrigation pump | 12 |
| Cold storage (small) | 6 |
| Cold storage (large) | 15 |
| Flour mill | 18 |
| Oil press | 14 |
| Dairy plant | 22 |
| Brewery | 20 |
| Winery | 12 |
| Textile mill | 25 |
| Smokehouse | 10 |
| Farm office | 2 |
| Worker facilities | 3 |

*(Full table defined in `data/electricityTypes.ts`)*

---

## 3. On-Farm Generation

### Solar Panels

- Scalable — bought in panels (each panel = 0.4 kW peak output)
- Output multiplied by: `weatherSunMultiplier × seasonMultiplier`
  - Clear summer day: 1.0×
  - Overcast: 0.35×
  - Winter: 0.6×
  - Night: 0×
- **Degradation:** −1.5% output per year. Servicing (every 3 years) restores to 95%.
- **Roof-mounted** (no land cost) or **ground-mounted** (uses land, higher output)
- Installation qualifies for government renewable grant (one-off, 15% of install cost)

### Wind Turbines

- Scalable — each turbine = 5 kW at reference wind speed
- Output multiplied by: `windSpeedMultiplier` from climate system
  - Calm (<10 km/h): 0.1×
  - Moderate (20–40 km/h): 0.8×
  - Strong (>50 km/h): 1.0×
  - Storm: 1.2× (but surge protection required or risk damage)
- **Degradation:** −1% output per year. Servicing every 2 years recommended.
- Installation qualifies for government renewable grant (15% of install cost)

### Biogas Plant

- Fixed daily output based on herd size: `kW = totalAnimalUnits × 0.8`
- Also produces **heat** (reduces fuel consumption in buildings needing heat)
- Produces **digestate fertiliser** daily: `kg = totalAnimalUnits × 2.5`
  - Digestate applied to fields as N/P/K source (ties into soil system)
  - Stored in digestate tank (max capacity, must be applied or it's wasted)
- Requires minimum herd of 10 animal units to be viable
- No degradation — maintained by Farm Mechanic (standard certification)

### Biomass CHP (Combined Heat and Power)

- Burns crop waste / straw fed in manually each season
- Fixed daily output while fuel is loaded: 15 kW electricity + significant heat output
- Heat pipes to nearby buildings, reducing their fuel consumption by up to 40%
- Fuel capacity: 1 season's worth of straw from ~50ha of cereal crops
- No degradation — maintained by Farm Mechanic (standard certification)

### Battery Banks

- Scalable — each bank = 50 kWh storage capacity
- **Round-trip efficiency: 85%** — 100 kWh stored returns 85 kWh usable
- Automatically charges from surplus generation
- Automatically discharges when generation < demand
- Battery health degrades over charge cycles — replace every ~7 game years
- Requires **Electrical Engineer certification** on Farm Mechanic to install/service

### Emergency Diesel Generator

- Manual activation only (player or Charlie activates during outages)
- Output: selectable 25 kW / 50 kW / 100 kW models
- Running cost: **$0.85/kWh** (6× grid rate — expensive but keeps farm alive)
- Fuel tank capacity: 3 days at full load
- Requires refuelling from farm fuel supply

---

## 4. Monthly Billing

Electricity is billed monthly (every 30 game days), not daily.

```
monthlyBill = Σ daily (max(0, totalDemand − totalGeneration) × gridRate × timeOfDayMultiplier)
```

- Charlie warns player **3 days before** bill is due with estimated amount
- If farm balance can't cover the bill: grid connection downgraded one tier temporarily until paid
- Bill summary shows: total kWh imported, average daily cost, largest consumers

---

## 5. Load Shedding Priority

When generation + grid import < total demand, buildings shed in this order (lowest priority first):

1. Farm office / admin
2. Worker facilities  
3. Non-urgent machinery
4. Processing / factory buildings
5. Irrigation pumps
6. Cold storage ← protected
7. Animal production buildings ← protected
8. Animal welfare buildings (heating/cooling) ← never shed

Player can override priority order in electricity management screen.

---

## 6. Power Outages

**Grid outages** triggered by:
- Storm events from climate system (probability scales with storm severity)
- Random grid failure events
- Duration: 4 hours – 3 game days

During outage:
- Grid import = 0
- On-farm generation + batteries cover what they can
- Load shedding kicks in if generation < demand
- Diesel generator can be manually activated
- Charlie notifies immediately and suggests action

---

## 7. Storm & Lightning Damage

Lightning strikes during storms can damage unprotected electrical equipment:
- Solar array, wind turbines, battery banks, processing equipment at risk
- **Surge protectors** (cheap upgrade, per building) eliminate risk for that building
- Damaged equipment output reduced to 0 until repaired by Farm Mechanic (Electrical Engineer cert required)
- Insurance covers replacement cost if electrical policy active

---

## 8. Equipment Degradation & Maintenance

| Equipment | Degradation Rate | Service Interval | Cert Required |
|-----------|-----------------|-----------------|---------------|
| Solar panels | −1.5%/yr | Every 3 years | Electrical Engineer |
| Wind turbines | −1%/yr | Every 2 years | Electrical Engineer |
| Battery banks | Replace every 7 yrs | Annual health check | Electrical Engineer |
| Biogas plant | None | Annual | Standard Mechanic |
| Biomass CHP | None | Annual | Standard Mechanic |
| Grid infrastructure | −0.5%/yr efficiency | Every 5 years | Electrical Engineer |

Farm Mechanic **Electrical Engineer certification** (Tier 2 cert, ~60hr study, $400 exam fee) required for all renewable/battery/grid work.

---

## 9. Heat Recovery

Biogas plant and Biomass CHP produce heat as a byproduct. Heat is automatically piped to nearby buildings that need it:

| Building | Benefit |
|----------|---------|
| Dairy plant | −30% fuel cost for pasteurisation |
| Brewery | −40% fuel cost for fermentation |
| Smokehouse | −50% fuel cost |
| Greenhouse (future) | Free heating |
| Worker facilities | Reduced heating bill in winter |

Heat recovery requires a **heat pipe network** (one-off infrastructure cost, $3,000–$12,000 depending on farm size).

---

## 10. Government Renewable Grants

When first installing solar panels or wind turbines:
- One-off grant: **15% of installation cost** paid by government
- Notified via Charlie: *"I've submitted the renewable energy grant application — should hear back in 3 days."*
- 3-day delay then money arrives
- Available once per technology type per farm

---

## 11. Electricity Management UI

Dedicated sub-tab in `gestion.tsx` (or standalone `electricidad.tsx` tab):

**Overview panel:**
- Live generation vs demand gauge
- Battery state of charge
- Grid import rate (today)
- Estimated month-end bill
- Active outage indicator

**Generation panel:**
- Each source with current output, health %, next service due
- Install new sources button

**Consumption panel:**
- Buildings ranked by power draw
- Toggle off-peak scheduling per building
- Load priority order (drag to reorder)

**History panel:**
- Monthly bill history (last 12 months)
- Generation vs consumption chart

---

## 12. Electricity State (Store)

```typescript
interface ElectricityState {
  gridTier: 'basic' | 'standard' | 'industrial' | 'heavy';
  gridRateBase: number;                    // $/kWh, fluctuates with market
  
  // Generation sources
  solarPanelCount: number;
  solarPanelHealth: number;               // 0–100
  windTurbineCount: number;
  windTurbineHealth: number;
  biogasPlantBuilt: boolean;
  biomassCHPBuilt: boolean;
  heatPipeNetworkBuilt: boolean;
  
  // Battery
  batteryBankCount: number;
  batteryChargeKwh: number;               // current charge
  batteryHealthPercent: number;
  
  // Generator
  generatorModel: '25kw' | '50kw' | '100kw' | null;
  generatorFuelLitres: number;
  generatorActive: boolean;
  
  // Billing
  currentMonthKwhImported: number;
  currentMonthBillEstimate: number;
  lastMonthBill: number;
  billDueDay: number;
  
  // Outage
  outageActive: boolean;
  outageEndDay?: number;
  
  // Grants claimed
  solarGrantClaimed: boolean;
  windGrantClaimed: boolean;
}
```

---

## 13. New Files

| File | Purpose |
|------|---------|
| `engine/electricity.ts` | Pure functions: daily generation calc, demand sum, billing, battery charge/discharge, degradation ticks |
| `data/electricityTypes.ts` | Building power draws, generator specs, renewable output curves |
| `store/useGameStore.ts` | Add `electricity: ElectricityState`, wire into `advanceDay()` |
| `app/(tabs)/gestion.tsx` | Add Electricity sub-tab with management UI |

---

## 14. Save Key

Adding `electricity` to store state requires bumping save key to `granja-tycoon-save-v6` (already planned for workers system — both ship together).

---

## 15. Out of Scope

- Hydroelectric power
- Electric vehicles / machinery charging
- Smart home automation
- Carbon credits / feed-in tariffs
- Physical wiring layout
