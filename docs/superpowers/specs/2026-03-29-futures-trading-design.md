# Futures Trading UI Spec
_Date: 2026-03-29_

## Goal

Add a Futures tab to the Economy screen so players can lock in today's crop prices for future delivery. The engine (`openFuture` action, settlement logic) is already built — this spec covers the UI only.

---

## Tab Structure

Add `'futures'` to the `EcoTab` union in `app/(tabs)/economia.tsx`.

Tab bar becomes 4 buttons:
```
📈 Market | 🤖 Auto-Sell | 📊 Stats | 📉 Futures
```

The Futures tab is a `ScrollView` with three vertically stacked sections:
1. Contract form
2. Open positions
3. Settled history

---

## Section 1: Contract Form

### Crop picker
Horizontal scrollable row of chip buttons — one per crop type. Each chip shows the crop name. The selected chip is highlighted. Below the picker, show the current market price and stock for the selected crop:
```
Wheat  $4.21/kg · 320 kg in stock
```

### Quantity input
Numeric text input. Defaults to the player's current stock for the selected crop. Player can type any positive integer.

### Term picker
Three buttons in a row: `30d`, `60d`, `90d`. One is selected at a time. Defaults to 30d.

### Lock price preview
Shown between the term picker and the open button:
```
Lock @ $4.21/kg · Deliver by day 142 · Est. revenue $1,071
```
- Lock price = current market price for selected crop
- Delivery day = current day + term
- Est. revenue = `Math.round(quantity * lockPrice * 0.85)` (15% tax, same as `sellRevenue`)

### Open Contract button
- Disabled if quantity ≤ 0 or player has 0 stock of the selected crop
- Label: `Open Contract — lock $X.XX/kg`
- On press: calls `openFuture(cropId, quantity, termDays)`
- After opening: reset quantity input to current stock, show a 2-second green confirmation text "✅ Contract opened!" below the button (use a `useState` timer)

---

## Section 2: Open Positions

Label: `Open Positions (N)`

Each row:
- Left: crop name + `Qty: X units @ $Y.YY/kg`
- Right: `📅 Nd left · Day D`
- Below: stock status indicator
  - 🟢 green text if `inventory[cropId] >= position.quantity`
  - 🟠 orange text if short: `⚠️ Short X units`

Shows "No open contracts." when empty.

---

## Section 3: Settled History

Label: `Settled (last 10)`

Each row:
- Crop name + quantity + lock price
- Outcome line:
  - ✅ `Fulfilled · +$X,XXX` (green) if fully delivered
  - ❌ `Short X units · -$XXX penalty` (red) if shortfall

Sourced from `state.futures.filter(f => f.settled)`, most recent first, capped at 10.

Shows "No settled contracts yet." when empty.

---

## Data

All data needed is already in the store. Pull from `useGameStore`:
```
futures, prices, inventory, day, openFuture
```

No new store state or actions needed.

---

## Files Touched

| File | Change |
|------|--------|
| `app/(tabs)/economia.tsx` | Add `'futures'` to `EcoTab`, add tab button, add Futures tab content |

No new files. No engine changes. No store changes.

---

## Out of Scope

- Cancelling an open futures contract
- Margin / deposit requirements
- Futures for animal products or processed goods
- Price forecasting tools
