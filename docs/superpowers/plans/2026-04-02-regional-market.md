# Regional Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three sell destinations (Local / City / Export) with price multipliers and transport costs, unlocked progressively by game day.
**Architecture:** A static `data/marketRegions.ts` file defines the three regions. `selectedMarket` state and `setSelectedMarket` action live in the Zustand store. `sellCrop` gains an optional `marketId` parameter; if omitted it falls back to `selectedMarket`. The sell panel in `economia.tsx` shows three chip buttons with a live net-revenue preview.
**Tech Stack:** React Native, Zustand 5, TypeScript — no new dependencies.

---

## Task 1 — Create `data/marketRegions.ts`

- [ ] Create `data/marketRegions.ts`:

```typescript
export type MarketId = 'local' | 'city' | 'export';

export interface MarketRegion {
  id: MarketId;
  name: string;
  description: string;
  /** Multiplier applied to the base sale price (before tax). */
  priceMultiplier: number;
  /** Fixed transport cost per unit sold, deducted from gross revenue. */
  transportCostPerUnit: number;
  /** Game day on which this market becomes available. */
  unlockDay: number;
  icon: string;
}

export const MARKET_REGIONS: MarketRegion[] = [
  {
    id: 'local',
    name: 'Local Market',
    description: 'Sell directly to local buyers. No transport cost, standard prices.',
    priceMultiplier: 1.00,
    transportCostPerUnit: 0,
    unlockDay: 1,
    icon: '🏪',
  },
  {
    id: 'city',
    name: 'City Market',
    description: 'Larger buyer pool in the city. +20% price but $0.15/unit transport.',
    priceMultiplier: 1.20,
    transportCostPerUnit: 0.15,
    unlockDay: 30,
    icon: '🏙️',
  },
  {
    id: 'export',
    name: 'Export Terminal',
    description: 'International buyers pay premium prices. +45% price but $0.40/unit transport. Unlocks day 90.',
    priceMultiplier: 1.45,
    transportCostPerUnit: 0.40,
    unlockDay: 90,
    icon: '🚢',
  },
];
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add data/marketRegions.ts && git commit -m "feat(regional-market): create marketRegions data file with local/city/export definitions"
  ```

---

## Task 2 — Add `selectedMarket` state and `setSelectedMarket` action to the store

- [ ] In `store/useGameStore.ts`, add the import near the top (after other data imports):

```typescript
import { MarketId, MARKET_REGIONS } from '../data/marketRegions';
```

- [ ] In the `GameState` interface (around line 396, alongside `autoSell`), add:

```typescript
  selectedMarket: MarketId;
```

- [ ] In `makeInitialState()` (around line 626, alongside `autoSell`), add:

```typescript
    selectedMarket: 'local' as MarketId,
```

- [ ] In the `GameState` actions block (around line 457, after `setAutoSell`), add the signature:

```typescript
  setSelectedMarket: (marketId: MarketId) => void;
```

- [ ] Add `setSelectedMarket` to the `partialize` destructure list (around line 3649) so it is not serialised:

```typescript
          setSelectedMarket,
```

- [ ] Add the implementation inside the `create(...)` call (after `setAutoSell: ...`):

```typescript
      setSelectedMarket: (marketId) => {
        const state = get();
        const region = MARKET_REGIONS.find(r => r.id === marketId);
        if (!region) return;
        if (state.day < region.unlockDay) return; // still locked
        set({ selectedMarket: marketId });
      },
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(regional-market): add selectedMarket state and setSelectedMarket action"
  ```

---

## Task 3 — Update `sellCrop` to accept `marketId` and apply regional pricing

The existing `sellCrop` implementation (lines 2344–2373 of `store/useGameStore.ts`) computes:
```
revenue = sellRevenue(toSell, price) * secaderoBonus * coopBonus * prestigeBonus
```
where `sellRevenue(units, price) = units * price * 0.85` (15% tax).

Regional pricing wraps this:
- **Gross price used** = `price × region.priceMultiplier`
- **Transport cost** = `toSell × region.transportCostPerUnit` (deducted after tax)

- [ ] Update the `sellCrop` action signature in `GameState` (around line 417):

```typescript
  sellCrop: (cropId: string, units: number, marketId?: MarketId) => void;
```

- [ ] Replace the `sellCrop` implementation body with:

```typescript
      sellCrop: (cropId, units, marketId) => {
        const state = get();
        const inStock = state.inventory[cropId] ?? 0;
        const toSell = Math.min(units, inStock);
        if (toSell <= 0) return;

        // Regional market
        const activeMarketId = marketId ?? state.selectedMarket ?? 'local';
        const region = MARKET_REGIONS.find(r => r.id === activeMarketId) ?? MARKET_REGIONS[0];
        const price = state.prices.find(p => p.cropId === cropId)?.price ?? 0;
        const effectivePrice = price * region.priceMultiplier;
        const transportCost  = Math.round(toSell * region.transportCostPerUnit);

        const secaderoBonus  = hasSecadero(state.buildings) ? 1.05 : 1.0;
        const coopBonus      = state.cooperative?.member ? 1.12 : 1.0;
        const prestigeBonus  = 1 + 0.05 * (state.prestige ?? 0);
        const grossRevenue   = sellRevenue(toSell, effectivePrice) * secaderoBonus * coopBonus * prestigeBonus;
        const revenue        = Math.max(0, Math.round(grossRevenue - transportCost));

        // Sell pressure: large sales depress price for several days
        const pressureMod  = computeSellPressureModifier(toSell);
        const newPressures = pressureMod < 1.0
          ? [
              ...(state.sellPressures ?? []).filter(sp => sp.cropId !== cropId),
              { cropId, modifier: pressureMod, expiresDay: state.day + sellPressureDuration(toSell) },
            ]
          : (state.sellPressures ?? []);

        set({
          money: state.money + revenue,
          inventory: { ...state.inventory, [cropId]: inStock - toSell },
          salesLog: [...state.salesLog, { day: state.day, amount: revenue, category: 'crops' }],
          totalRevenue: state.totalRevenue + revenue,
          sellPressures: newPressures,
          firstMissionStep: state.firstMissionStep === 2 ? 3 : state.firstMissionStep,
        });
      },
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(regional-market): update sellCrop to apply priceMultiplier and transportCost"
  ```

---

## Task 4 — Add market selector chips + live revenue preview to `economia.tsx`

The sell panel in `economia.tsx` is located around lines 584–624. The existing "Sell all" button calls `sellCrop(selectedCrop, inStock)`. We insert three region chips above it and update the revenue preview calculation.

- [ ] In `economia.tsx`, add the import near the top:

```typescript
import { MARKET_REGIONS, MarketId } from '../../data/marketRegions';
```

- [ ] In the `useGameStore` destructure (line 136), add `selectedMarket` and `setSelectedMarket`:

```typescript
const { ..., selectedMarket, setSelectedMarket } = useGameStore();
```

- [ ] Locate the sell panel area (search for `{/* Sell panel */}`, around line 584). **Above** the existing stock/sell-pressure text and **before** the sell button, insert the market selector chips:

```typescript
          {/* Regional market selector */}
          <View style={regionStyles.row}>
            {MARKET_REGIONS.map(region => {
              const locked  = day < region.unlockDay;
              const active  = selectedMarket === region.id;
              return (
                <TouchableOpacity
                  key={region.id}
                  style={[
                    regionStyles.chip,
                    active  && regionStyles.chipActive,
                    locked  && regionStyles.chipLocked,
                  ]}
                  onPress={() => !locked && setSelectedMarket(region.id)}
                  disabled={locked}
                  activeOpacity={locked ? 1 : 0.75}
                >
                  <Text style={[regionStyles.chipIcon]}>{region.icon}</Text>
                  <Text style={[regionStyles.chipName, active && regionStyles.chipNameActive, locked && regionStyles.chipNameLocked]}>
                    {region.name}
                  </Text>
                  {locked ? (
                    <Text style={regionStyles.chipLockLabel}>Unlocks day {region.unlockDay}</Text>
                  ) : (
                    <Text style={[regionStyles.chipMult, active && { color: '#ffd700' }]}>
                      ×{region.priceMultiplier.toFixed(2)}
                      {region.transportCostPerUnit > 0 ? ` -$${region.transportCostPerUnit.toFixed(2)}/u` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
```

- [ ] Update the revenue calculation displayed in the sell button and sell panel. Find the variable `revenue` in the market tab section (it's typically computed as `sellRevenue(inStock, currentPrice) * bonuses`). Add regional market computation right after the existing `revenue` variable:

```typescript
          const activeRegion      = MARKET_REGIONS.find(r => r.id === selectedMarket) ?? MARKET_REGIONS[0];
          const effectivePrice    = currentPrice * activeRegion.priceMultiplier;
          const transportTotal    = Math.round(inStock * activeRegion.transportCostPerUnit);
          const regionalRevenue   = Math.max(0, Math.round(sellRevenue(inStock, effectivePrice) * secaderoBonus * coopBonus * prestigeBonus - transportTotal));
```

  Then update the sell button's `onPress` to pass the market ID:
  ```typescript
  onPress={() => { sellCrop(selectedCrop, inStock, selectedMarket); ... }}
  ```
  And update its label to show `regionalRevenue`:
  ```typescript
  {inStock > 0 ? `Sell all · $${Math.round(regionalRevenue).toLocaleString()}` : 'No stock'}
  ```

  Also show transport cost below the stock line when non-zero:
  ```typescript
  {activeRegion.transportCostPerUnit > 0 && inStock > 0 && (
    <Text style={regionStyles.transportNote}>
      🚚 Transport: -${transportTotal.toLocaleString()} · Net: ${Math.round(regionalRevenue).toLocaleString()}
    </Text>
  )}
  ```

- [ ] Add `regionStyles` to the existing `StyleSheet.create(...)` at the bottom of the file (or create a new one):

```typescript
const regionStyles = StyleSheet.create({
  row:             { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip:            { flex: 1, minWidth: 90, borderWidth: 1, borderColor: '#2a3a2a', backgroundColor: '#0f1e0f', borderRadius: 8, padding: 8, alignItems: 'center' },
  chipActive:      { borderColor: '#4caf50', backgroundColor: '#0f2a0f' },
  chipLocked:      { opacity: 0.4 },
  chipIcon:        { fontSize: 18, marginBottom: 2 },
  chipName:        { color: '#888', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  chipNameActive:  { color: '#e8d5a3' },
  chipNameLocked:  { color: '#555' },
  chipMult:        { color: '#888', fontSize: 10, textAlign: 'center', marginTop: 1 },
  chipLockLabel:   { color: '#555', fontSize: 9, textAlign: 'center', marginTop: 1 },
  transportNote:   { color: '#ef9a9a', fontSize: 10, marginBottom: 4 },
});
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/(tabs)/economia.tsx data/marketRegions.ts && git commit -m "feat(regional-market): add market selector chips and live revenue preview to economia sell panel"
  ```
