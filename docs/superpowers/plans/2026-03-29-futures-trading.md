# Futures Trading UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Futures tab to the Economy screen so players can lock in crop prices for future delivery.

**Architecture:** Single-file change to `app/(tabs)/economia.tsx` — add `'futures'` to `EcoTab`, wire store data, and implement the tab content (crop picker, contract form, open positions, settled history). The `openFuture` action and settlement logic already exist in the store.

**Tech Stack:** React Native · TypeScript · Zustand · react-native-svg (already used in file)

---

## File Map

| File | Change |
|------|--------|
| `app/(tabs)/economia.tsx` | Add futures tab type, tab button, state, store connection, and full tab content |

No new files. No store changes.

---

## Note on Settled History

`FuturesPosition` has no outcome field (only `settled: boolean`). The settled history section therefore shows crop + quantity + lock price + delivery day — no ✅/❌ outcome breakdown. The Day Summary modal already reports the outcome when settlement happens.

---

## Task 1: Add tab type, tab button, and futures state

**Files:**
- Modify: `app/(tabs)/economia.tsx`

- [ ] **Step 1: Add `'futures'` to EcoTab and pull store data**

Find:
```typescript
type EcoTab = 'market' | 'autosell' | 'stats';
```
Replace with:
```typescript
type EcoTab = 'market' | 'autosell' | 'stats' | 'futures';
```

Find the `useGameStore` destructure line (around line 133):
```typescript
const { prices, priceHistory, inventory, sellCrop, newsEvents, day, salesLog, totalRevenue, autoSell, setAutoSell, prestige, sellPressures } = useGameStore();
```
Replace with:
```typescript
const { prices, priceHistory, inventory, sellCrop, newsEvents, day, salesLog, totalRevenue, autoSell, setAutoSell, prestige, sellPressures, futures, openFuture } = useGameStore();
```

- [ ] **Step 2: Add futures-specific local state**

After the existing `useState` declarations (around line 136), add:
```typescript
const [futuresCrop, setFuturesCrop] = useState<string>(CROP_TYPES[0].id);
const [futuresQty, setFuturesQty] = useState<string>('');
const [futuresTerm, setFuturesTerm] = useState<30 | 60 | 90>(30);
const [futuresFlash, setFuturesFlash] = useState(false);
```

- [ ] **Step 3: Add tab button to the tab bar**

Find the tab bar map — it currently renders `['market', 'autosell', 'stats']`. Replace with:
```typescript
{(['market', 'autosell', 'stats', 'futures'] as EcoTab[]).map(t => (
  <TouchableOpacity key={t} style={[styles.tabBtn, ecoTab === t && styles.tabBtnActive]} onPress={() => setEcoTab(t)}>
    <Text style={[styles.tabBtnText, ecoTab === t && styles.tabBtnTextActive]}>
      {t === 'market' ? '📈 Market' : t === 'autosell' ? '🤖 Auto-Sell' : t === 'stats' ? '📊 Stats' : '📉 Futures'}
    </Text>
  </TouchableOpacity>
))}
```

- [ ] **Step 4: Add empty futures tab placeholder**

Just before the closing `</View>` of the screen (after the `{ecoTab === 'market' && <>...</>}` block), add:
```typescript
{ecoTab === 'futures' && (
  <ScrollView style={styles.futuresScroll} showsVerticalScrollIndicator={false}>
    {/* content in Task 2 */}
  </ScrollView>
)}
```

Add the style at the bottom of `StyleSheet.create`:
```typescript
futuresScroll: { flex: 1, paddingHorizontal: 12 },
```

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/economia.tsx"
git commit -m "feat(futures): add Futures tab scaffold to Economy screen"
```

---

## Task 2: Implement futures tab content

**Files:**
- Modify: `app/(tabs)/economia.tsx`

This task replaces the `{/* content in Task 2 */}` comment with the full Futures tab body, and adds all required styles.

- [ ] **Step 1: Replace the futures tab placeholder with full content**

Replace:
```typescript
{ecoTab === 'futures' && (
  <ScrollView style={styles.futuresScroll} showsVerticalScrollIndicator={false}>
    {/* content in Task 2 */}
  </ScrollView>
)}
```

With:
```typescript
{ecoTab === 'futures' && (() => {
  const futuresPrice = prices.find(p => p.cropId === futuresCrop);
  const futuresCurrentPrice = futuresPrice?.price ?? CROP_TYPES.find(c => c.id === futuresCrop)!.basePrice;
  const futuresCropDef = CROP_TYPES.find(c => c.id === futuresCrop)!;
  const futuresInStock = inventory[futuresCrop] ?? 0;
  const parsedQty = parseInt(futuresQty, 10);
  const validQty = !isNaN(parsedQty) && parsedQty > 0;
  const estRevenue = validQty ? Math.round(parsedQty * futuresCurrentPrice * 0.85) : 0;
  const deliveryDay = day + futuresTerm;

  const openPositions = (futures ?? []).filter(f => !f.settled);
  const settledPositions = (futures ?? [])
    .filter(f => f.settled)
    .sort((a, b) => b.deliveryDay - a.deliveryDay)
    .slice(0, 10);

  return (
    <ScrollView style={styles.futuresScroll} showsVerticalScrollIndicator={false}>
      {/* ── Crop picker ── */}
      <Text style={styles.futuresSectionLabel}>Select Crop</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.futuresCropScroll}>
        {CROP_TYPES.map(crop => (
          <TouchableOpacity
            key={crop.id}
            style={[styles.futuresCropChip, futuresCrop === crop.id && styles.futuresCropChipActive]}
            onPress={() => {
              setFuturesCrop(crop.id);
              setFuturesQty(String(Math.round(inventory[crop.id] ?? 0)));
            }}
          >
            <Text style={[styles.futuresCropChipText, futuresCrop === crop.id && styles.futuresCropChipTextActive]}>
              {crop.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.futuresCropMeta}>
        ${futuresCurrentPrice.toFixed(2)}/{futuresCropDef.unit} · {Math.round(futuresInStock).toLocaleString()} {futuresCropDef.unit} in stock
      </Text>

      {/* ── Contract form ── */}
      <View style={styles.futuresForm}>
        <View style={styles.futuresFormRow}>
          <Text style={styles.futuresFormLabel}>Quantity ({futuresCropDef.unit})</Text>
          <TextInput
            style={styles.futuresQtyInput}
            value={futuresQty}
            onChangeText={setFuturesQty}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#444"
          />
        </View>

        <Text style={styles.futuresFormLabel}>Delivery term</Text>
        <View style={styles.futuresTermRow}>
          {([30, 60, 90] as (30 | 60 | 90)[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.futuresTermBtn, futuresTerm === t && styles.futuresTermBtnActive]}
              onPress={() => setFuturesTerm(t)}
            >
              <Text style={[styles.futuresTermBtnText, futuresTerm === t && styles.futuresTermBtnTextActive]}>
                {t}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {validQty && (
          <View style={styles.futuresPreview}>
            <Text style={styles.futuresPreviewText}>
              Lock @ ${futuresCurrentPrice.toFixed(2)}/{futuresCropDef.unit} · Deliver by day {deliveryDay} · Est. revenue ${estRevenue.toLocaleString()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.futuresOpenBtn, (!validQty || futuresInStock <= 0) && styles.futuresOpenBtnDisabled]}
          disabled={!validQty || futuresInStock <= 0}
          onPress={() => {
            openFuture(futuresCrop, parsedQty, futuresTerm);
            setFuturesQty(String(Math.round(inventory[futuresCrop] ?? 0)));
            setFuturesFlash(true);
            setTimeout(() => setFuturesFlash(false), 2000);
          }}
        >
          <Text style={styles.futuresOpenBtnText}>
            {futuresInStock <= 0 ? 'No stock' : `Open Contract — lock $${futuresCurrentPrice.toFixed(2)}/${futuresCropDef.unit}`}
          </Text>
        </TouchableOpacity>

        {futuresFlash && (
          <Text style={styles.futuresFlash}>✅ Contract opened!</Text>
        )}
      </View>

      {/* ── Open positions ── */}
      <Text style={styles.futuresSectionLabel}>Open Positions ({openPositions.length})</Text>
      <View style={styles.futuresCard}>
        {openPositions.length === 0 ? (
          <Text style={styles.futuresEmpty}>No open contracts.</Text>
        ) : (
          openPositions.map(pos => {
            const cropDef = CROP_TYPES.find(c => c.id === pos.cropId);
            const inStockForPos = inventory[pos.cropId] ?? 0;
            const isFulfillable = inStockForPos >= pos.quantity;
            const daysLeft = pos.deliveryDay - day;
            return (
              <View key={pos.id} style={styles.futuresPosRow}>
                <View style={styles.futuresPosLeft}>
                  <Text style={styles.futuresPosName}>{cropDef?.name ?? pos.cropId}</Text>
                  <Text style={styles.futuresPosDetail}>
                    {pos.quantity.toLocaleString()} {cropDef?.unit} @ ${pos.lockPrice.toFixed(2)}
                  </Text>
                  <Text style={[styles.futuresPosStock, isFulfillable ? styles.futuresPosStockOk : styles.futuresPosStockShort]}>
                    {isFulfillable
                      ? `🟢 ${Math.round(inStockForPos).toLocaleString()} in stock`
                      : `⚠️ Short ${(pos.quantity - Math.round(inStockForPos)).toLocaleString()} ${cropDef?.unit}`}
                  </Text>
                </View>
                <View style={styles.futuresPosRight}>
                  <Text style={styles.futuresPosDelivery}>📅 {daysLeft}d left</Text>
                  <Text style={styles.futuresPosDay}>Day {pos.deliveryDay}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Settled history ── */}
      <Text style={styles.futuresSectionLabel}>Settled (last 10)</Text>
      <View style={[styles.futuresCard, { marginBottom: 32 }]}>
        {settledPositions.length === 0 ? (
          <Text style={styles.futuresEmpty}>No settled contracts yet.</Text>
        ) : (
          settledPositions.map(pos => {
            const cropDef = CROP_TYPES.find(c => c.id === pos.cropId);
            return (
              <View key={pos.id} style={styles.futuresPosRow}>
                <View style={styles.futuresPosLeft}>
                  <Text style={styles.futuresPosName}>{cropDef?.name ?? pos.cropId}</Text>
                  <Text style={styles.futuresPosDetail}>
                    {pos.quantity.toLocaleString()} {cropDef?.unit} @ ${pos.lockPrice.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.futuresPosRight}>
                  <Text style={styles.futuresSettledBadge}>✅ Settled</Text>
                  <Text style={styles.futuresPosDay}>Day {pos.deliveryDay}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
})()}
```

- [ ] **Step 2: Add all styles**

In `StyleSheet.create({...})`, add after the last existing style:

```typescript
// Futures tab
futuresSectionLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', marginTop: 16, marginBottom: 6 },
futuresCropScroll:   { marginBottom: 4 },
futuresCropChip:     { backgroundColor: '#16213e', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
futuresCropChipActive: { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
futuresCropChipText: { color: '#888', fontSize: 11 },
futuresCropChipTextActive: { color: '#e8d5a3', fontWeight: 'bold' },
futuresCropMeta:     { color: '#888', fontSize: 11, marginBottom: 10 },

futuresForm:         { backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 4 },
futuresFormRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
futuresFormLabel:    { color: '#888', fontSize: 12, marginBottom: 6 },
futuresQtyInput:     { backgroundColor: '#0a1628', color: '#fff', fontSize: 13, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 100, textAlign: 'right' },
futuresTermRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
futuresTermBtn:      { flex: 1, backgroundColor: '#0a1628', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
futuresTermBtnActive: { backgroundColor: '#1565c0' },
futuresTermBtnText:  { color: '#666', fontWeight: 'bold', fontSize: 13 },
futuresTermBtnTextActive: { color: '#fff' },
futuresPreview:      { backgroundColor: '#0a1628', borderRadius: 8, padding: 8, marginBottom: 10 },
futuresPreviewText:  { color: '#81c784', fontSize: 11 },
futuresOpenBtn:      { backgroundColor: '#1b5e20', borderRadius: 8, padding: 10, alignItems: 'center' },
futuresOpenBtnDisabled: { backgroundColor: '#333' },
futuresOpenBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 13 },
futuresFlash:        { color: '#81c784', fontSize: 12, textAlign: 'center', marginTop: 8 },

futuresCard:         { backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 4 },
futuresEmpty:        { color: '#555', fontSize: 12 },
futuresPosRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
futuresPosLeft:      { flex: 1 },
futuresPosRight:     { alignItems: 'flex-end', justifyContent: 'center' },
futuresPosName:      { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
futuresPosDetail:    { color: '#888', fontSize: 11, marginTop: 2 },
futuresPosStock:     { fontSize: 11, marginTop: 3 },
futuresPosStockOk:   { color: '#66bb6a' },
futuresPosStockShort:{ color: '#ffa726' },
futuresPosDelivery:  { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
futuresPosDay:       { color: '#555', fontSize: 10, marginTop: 2 },
futuresSettledBadge: { color: '#66bb6a', fontSize: 12, fontWeight: 'bold' },
```

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/economia.tsx"
git commit -m "feat(futures): implement futures tab with contract form, open positions, and settled history"
```

---

## Task 3: Manual verification

- [ ] **Start the dev server (if not running)**

```bash
CI=1 npx expo start --web
```

Open `http://localhost:8081/(tabs)/economia`

- [ ] **Check: 4 tabs render** — `📈 Market | 🤖 Auto-Sell | 📊 Stats | 📉 Futures`

- [ ] **Check: Futures tab opens** — tap `📉 Futures`, ScrollView renders with crop picker, form, and two empty sections

- [ ] **Check: Crop picker** — scroll horizontally, tap a crop, meta line updates with price and stock

- [ ] **Check: Contract form** — enter a quantity, pick 60d, preview line shows lock price and delivery day, button label updates

- [ ] **Check: Open contract** — tap Open Contract, flash message appears, open positions section shows the new contract with stock status

- [ ] **Check: Advance a day** — advance past delivery day, contract moves to settled section

- [ ] **Check: Other tabs unaffected** — switch to Market, Auto-Sell, Stats — all still work normally
