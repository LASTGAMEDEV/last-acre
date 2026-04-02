# Commodity Exchange Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SVG price history charts to the Market tab crop detail panel and a new Market Orders tab for automatic sell triggers.
**Architecture:** `MarketOrder` records live in Zustand store state. Order execution runs inside `advanceDay` alongside the existing futures settlement block. The SVG chart reuses the existing `react-native-svg` dependency already imported in `economia.tsx`. The `EcoTab` union type gains an `'orders'` member.
**Tech Stack:** React Native, Zustand 5, TypeScript, react-native-svg (already installed).

---

## Task 1 — Add `MarketOrder` interface + store state + actions

- [ ] In `store/useGameStore.ts`, after the `FuturesPosition` interface (around line 136), add:

```typescript
// ── Market Orders ─────────────────────────────────────────────────────────────
export interface MarketOrder {
  id: string;
  cropId: string;
  quantity: number;        // units to sell when triggered
  targetPrice: number;     // trigger when price >= this value
  createdDay: number;
  expiresDay: number;      // order expires if not triggered by this day
  status: 'active' | 'executed' | 'expired' | 'cancelled';
  executedDay?: number;
  executedRevenue?: number;
}
```

- [ ] In the `GameState` interface (around line 396, alongside `futures`), add:

```typescript
  marketOrders: MarketOrder[];
```

- [ ] In `makeInitialState()` (around line 623, alongside `futures: [] as FuturesPosition[]`), add:

```typescript
    marketOrders: [] as MarketOrder[],
```

- [ ] In the `GameState` actions block (around line 452, after `openFuture`), add type signatures:

```typescript
  placeMarketOrder: (cropId: string, quantity: number, targetPrice: number, termDays: number) => void;
  cancelMarketOrder: (id: string) => void;
```

- [ ] Add `placeMarketOrder` and `cancelMarketOrder` to the `partialize` destructure list (around line 3649) so they are excluded from serialization:

```typescript
          placeMarketOrder, cancelMarketOrder,
```

- [ ] Add the action implementations inside the `create(...)` call (after the `openFuture:` action block):

```typescript
      placeMarketOrder: (cropId, quantity, targetPrice, termDays) => {
        const state = get();
        if (quantity <= 0 || targetPrice <= 0 || termDays <= 0) return;
        const inStock = state.inventory[cropId] ?? 0;
        if (quantity > inStock) return; // cannot order more than held
        const order: MarketOrder = {
          id: `mo_${state.day}_${Math.random().toString(36).slice(2, 7)}`,
          cropId,
          quantity,
          targetPrice,
          createdDay: state.day,
          expiresDay: state.day + termDays,
          status: 'active',
        };
        set({ marketOrders: [...(state.marketOrders ?? []), order] });
      },

      cancelMarketOrder: (id) => {
        const state = get();
        set({
          marketOrders: (state.marketOrders ?? []).map(o =>
            o.id === id ? { ...o, status: 'cancelled' as const } : o
          ),
        });
      },
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(exchange): add MarketOrder interface, state, placeMarketOrder, cancelMarketOrder"
  ```

---

## Task 2 — Add market order execution to `advanceDay`

Market orders are checked once per day. If the current crop price meets or exceeds `targetPrice`, the order executes via the same revenue formula as `sellCrop`. Expired orders are marked accordingly.

- [ ] In `advanceDay` (around line 694), locate the futures settlement block (search for `const futures = (state.futures ?? []).map`, around line 1688). **After** the futures block and **before** the existing `let finalMoney = ...` line, insert:

```typescript
        // ── Market Orders: check triggers ────────────────────────────────────
        let marketOrderIncome = 0;
        const inventoryAfterOrders: Record<string, number> = { ...state.inventory };
        // Apply futures inventory delta first so orders see the post-futures stock
        for (const [k, delta] of Object.entries(futuresInventoryDelta)) {
          inventoryAfterOrders[k] = Math.max(0, (inventoryAfterOrders[k] ?? 0) + delta);
        }
        const updatedOrders = (state.marketOrders ?? []).map(order => {
          if (order.status !== 'active') return order;
          // Expire stale orders
          if (newDay > order.expiresDay) return { ...order, status: 'expired' as const };
          const currentPrice = prices.find(p => p.cropId === order.cropId)?.price ?? 0;
          if (currentPrice < order.targetPrice) return order;
          // Price met — execute
          const available = inventoryAfterOrders[order.cropId] ?? 0;
          const toSell = Math.min(order.quantity, available);
          if (toSell <= 0) return { ...order, status: 'expired' as const };
          const secaderoBonus = hasSecadero(state.buildings) ? 1.05 : 1.0;
          const coopBonus = state.cooperative?.member ? 1.12 : 1.0;
          const prestigeBonus = 1 + 0.05 * (state.prestige ?? 0);
          const revenue = Math.round(sellRevenue(toSell, currentPrice) * secaderoBonus * coopBonus * prestigeBonus);
          marketOrderIncome += revenue;
          inventoryAfterOrders[order.cropId] = available - toSell;
          summary.push({
            id: `market_order_${order.id}`,
            icon: '📋',
            title: `Market order filled: ${toSell.toLocaleString()} × ${order.cropId} @ $${currentPrice.toFixed(2)} · +$${revenue.toLocaleString()}`,
            severity: 'good',
          });
          return {
            ...order,
            status: 'executed' as const,
            executedDay: newDay,
            executedRevenue: revenue,
          };
        });
```

- [ ] In the existing `let finalMoney = ...` line (around line 2070), add `+ marketOrderIncome` at the end of that expression.

- [ ] In the final `set({ ... })` call at the end of `advanceDay`, add:

```typescript
          marketOrders: updatedOrders,
          inventory: Object.fromEntries(
            Object.keys({ ...state.inventory, ...inventoryAfterOrders }).map(k => [
              k, Math.max(0, inventoryAfterOrders[k] ?? 0)
            ])
          ),
```

  **Important:** The existing `set` already computes an `inventory` field from the futures delta. Merge `inventoryAfterOrders` into that computation instead of setting `inventory` twice. Replace the existing inventory computation with one that uses `inventoryAfterOrders` as the base (which already includes the futures delta applied above).

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(exchange): execute market orders in advanceDay"
  ```

---

## Task 3 — Add SVG price chart to Market tab crop detail

The chart already exists in the file as the `PriceChart` component (lines 92–131 of `economia.tsx`), which renders a polyline from `priceHistory[cropId]`. The task is to extend it with a 7-day average dashed line and a current-price dot, then ensure it appears in the crop detail panel.

- [ ] In `economia.tsx`, extend the `PriceChart` component (after the closing `</Svg>` but inside the `return` of `PriceChart`) to include a 7-day moving average dashed line and current-price dot. Replace the current `<Polyline ...>` block with:

```typescript
      {/* Price line */}
      <Polyline points={points} fill="none" stroke={up ? '#4caf50' : '#ef5350'} strokeWidth={2} />

      {/* 7-day moving average dashed line */}
      {(() => {
        if (history.length < 7) return null;
        const avgPoints = history.map((_, i) => {
          if (i < 6) return null;
          const slice = history.slice(i - 6, i + 1);
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
          return `${toX(i).toFixed(1)},${toY(avg).toFixed(1)}`;
        }).filter(Boolean).join(' ');
        return <Polyline points={avgPoints} fill="none" stroke="#ffb74d" strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />;
      })()}

      {/* Current price dot */}
      {(() => {
        const cx = toX(history.length - 1);
        const cy = toY(current);
        return <Circle cx={cx} cy={cy} r={4} fill={up ? '#4caf50' : '#ef5350'} />;
      })()}
```

- [ ] Add `Circle` to the `react-native-svg` import at the top of `economia.tsx`:

```typescript
import Svg, { Polyline, Line, Text as SvgText, Rect, G, Circle } from 'react-native-svg';
```

- [ ] Verify the `PriceChart` component is already rendered inside the market crop detail section. If not (search for `<PriceChart` in the file), add it after the stats bar:

```typescript
<PriceChart history={priceHistory[selectedCrop] ?? [selected.basePrice]} basePrice={selected.basePrice} />
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/(tabs)/economia.tsx && git commit -m "feat(exchange): enhance PriceChart with 7-day avg line and current-price dot"
  ```

---

## Task 4 — Add `'orders'` tab to `economia.tsx`

- [ ] In `economia.tsx`, change the `EcoTab` type (line 133):

```typescript
type EcoTab = 'market' | 'autosell' | 'stats' | 'futures' | 'orders';
```

- [ ] In the `useGameStore` destructure (line 136), add `marketOrders`, `placeMarketOrder`, `cancelMarketOrder`:

```typescript
const { ..., marketOrders, placeMarketOrder, cancelMarketOrder } = useGameStore();
```

- [ ] Add local state for the order form near the top of the component function (after existing `useState` calls):

```typescript
const [orderCrop, setOrderCrop]           = useState<string>(CROP_TYPES[0].id);
const [orderQty, setOrderQty]             = useState<string>('');
const [orderTargetPrice, setOrderTargetPrice] = useState<string>('');
const [orderTerm, setOrderTerm]           = useState<30 | 60 | 90>(30);
```

- [ ] In the tab bar (find the JSX that maps over tab buttons for `'market' | 'autosell' | 'stats' | 'futures'`), add an `'orders'` button:

```typescript
<TouchableOpacity
  style={[styles.ecoTabBtn, ecoTab === 'orders' && styles.ecoTabBtnActive]}
  onPress={() => setEcoTab('orders')}
>
  <Text style={[styles.ecoTabText, ecoTab === 'orders' && styles.ecoTabTextActive]}>Orders</Text>
</TouchableOpacity>
```

- [ ] After the `{ecoTab === 'futures' && ...}` block, add the orders tab panel:

```typescript
{ecoTab === 'orders' && (() => {
  const activeOrders   = (marketOrders ?? []).filter(o => o.status === 'active');
  const historicOrders = (marketOrders ?? [])
    .filter(o => o.status !== 'active')
    .sort((a, b) => (b.executedDay ?? b.expiresDay) - (a.executedDay ?? a.expiresDay))
    .slice(0, 20);

  const orderCropDef   = CROP_TYPES.find(c => c.id === orderCrop) ?? CROP_TYPES[0];
  const orderInStock   = inventory[orderCrop] ?? 0;
  const parsedQty      = parseInt(orderQty, 10);
  const parsedPrice    = parseFloat(orderTargetPrice);
  const validOrder     = !isNaN(parsedQty) && parsedQty > 0 && parsedQty <= orderInStock
                        && !isNaN(parsedPrice) && parsedPrice > 0;
  const currentMktPrice = prices.find(p => p.cropId === orderCrop)?.price ?? orderCropDef.basePrice;

  return (
    <ScrollView style={styles.futuresScroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.futuresSectionLabel, { marginBottom: 8 }]}>📋 Market Orders</Text>
      <Text style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>
        Set a target price. When the market reaches it, your crop sells automatically.
      </Text>

      {/* Crop picker */}
      <Text style={styles.futuresSectionLabel}>Crop</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.futuresCropScroll}>
        {CROP_TYPES.map(crop => (
          <TouchableOpacity
            key={crop.id}
            style={[styles.futuresCropChip, orderCrop === crop.id && styles.futuresCropChipActive]}
            onPress={() => {
              setOrderCrop(crop.id);
              setOrderQty(String(Math.round(inventory[crop.id] ?? 0)));
            }}
          >
            <Text style={[styles.futuresCropChipText, orderCrop === crop.id && styles.futuresCropChipTextActive]}>
              {crop.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.futuresCropMeta}>
        Now: ${currentMktPrice.toFixed(2)}/{orderCropDef.unit} · {Math.round(orderInStock).toLocaleString()} in stock
      </Text>

      {/* Order form */}
      <View style={styles.futuresForm}>
        <View style={styles.futuresFormRow}>
          <Text style={styles.futuresFormLabel}>Quantity ({orderCropDef.unit})</Text>
          <TextInput
            style={styles.futuresQtyInput}
            value={orderQty}
            onChangeText={setOrderQty}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#444"
          />
        </View>
        <View style={styles.futuresFormRow}>
          <Text style={styles.futuresFormLabel}>Target Price ($/unit)</Text>
          <TextInput
            style={styles.futuresQtyInput}
            value={orderTargetPrice}
            onChangeText={setOrderTargetPrice}
            keyboardType="decimal-pad"
            placeholder={currentMktPrice.toFixed(2)}
            placeholderTextColor="#444"
          />
        </View>

        <Text style={styles.futuresFormLabel}>Expiry term</Text>
        <View style={styles.futuresTermRow}>
          {([30, 60, 90] as (30 | 60 | 90)[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.futuresTermBtn, orderTerm === t && styles.futuresTermBtnActive]}
              onPress={() => setOrderTerm(t)}
            >
              <Text style={[styles.futuresTermBtnText, orderTerm === t && styles.futuresTermBtnTextActive]}>
                {t}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {validOrder && (
          <View style={styles.futuresPreview}>
            <Text style={styles.futuresPreviewText}>
              Sell {parsedQty.toLocaleString()} {orderCropDef.unit} when price ≥ ${parsedPrice.toFixed(2)}
              · expires day {day + orderTerm}
              · est. revenue ~${Math.round(parsedQty * parsedPrice * 0.85).toLocaleString()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.futuresSubmitBtn, !validOrder && styles.futuresSubmitDisabled]}
          disabled={!validOrder}
          onPress={() => {
            if (!validOrder) return;
            placeMarketOrder(orderCrop, parsedQty, parsedPrice, orderTerm);
            setOrderQty('');
            setOrderTargetPrice('');
          }}
        >
          <Text style={styles.futuresSubmitText}>Place Order</Text>
        </TouchableOpacity>
      </View>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <>
          <Text style={[styles.futuresSectionLabel, { marginTop: 16 }]}>Active Orders ({activeOrders.length})</Text>
          {activeOrders.map(order => {
            const cropDef = CROP_TYPES.find(c => c.id === order.cropId);
            return (
              <View key={order.id} style={styles.futuresCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.futuresCardTitle}>
                      {cropDef?.name ?? order.cropId} — {order.quantity.toLocaleString()} {cropDef?.unit ?? ''}
                    </Text>
                    <Text style={styles.futuresCardSub}>
                      Trigger ≥ ${order.targetPrice.toFixed(2)} · expires day {order.expiresDay}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => cancelMarketOrder(order.id)}
                    style={{ backgroundColor: '#4a1010', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 }}
                  >
                    <Text style={{ color: '#ef5350', fontSize: 11 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* History */}
      {historicOrders.length > 0 && (
        <>
          <Text style={[styles.futuresSectionLabel, { marginTop: 16 }]}>History</Text>
          {historicOrders.map(order => {
            const cropDef = CROP_TYPES.find(c => c.id === order.cropId);
            const statusColor = order.status === 'executed' ? '#4caf50' : '#ef5350';
            const statusLabel = order.status === 'executed' ? `Filled day ${order.executedDay} · +$${(order.executedRevenue ?? 0).toLocaleString()}` : order.status;
            return (
              <View key={order.id} style={[styles.futuresCard, { opacity: 0.7 }]}>
                <Text style={styles.futuresCardTitle}>
                  {cropDef?.name ?? order.cropId} — {order.quantity.toLocaleString()} {cropDef?.unit ?? ''}
                </Text>
                <Text style={[styles.futuresCardSub, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
})()}
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/(tabs)/economia.tsx && git commit -m "feat(exchange): add Market Orders tab to economia screen"
  ```
