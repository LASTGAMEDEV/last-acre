# Price Alerts UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `direction: 'above' | 'below'` to the price alert system and surface alert UI inline in the Market tab of `economia.tsx`.

**Architecture:** Task 1 extends the `PriceAlert` interface in the store and updates `addPriceAlert` + `advanceDay` logic. Task 2 adds a per-crop alert input row below the sell panel in the right panel of the Market tab. Task 3 adds an active-alerts summary section in the left-column area above the crop list. No new files needed.

**Tech Stack:** React Native, TypeScript, Zustand 5, Expo Router.

---

## File Map

| File | Action |
|------|--------|
| `store/useGameStore.ts` | Modify — extend `PriceAlert` interface, update `addPriceAlert` signature, update `advanceDay` alert check |
| `app/(tabs)/economia.tsx` | Modify — add alert input row in right panel; add active alerts summary above crop chips |

---

## Task 1: Extend `PriceAlert` with `direction` + update store logic

**Files:**
- Modify: `store/useGameStore.ts`

### Background

Current interface (line 396):
```typescript
priceAlerts: { id: string; cropId: string; targetPrice: number }[];
```

Current initial state (line 656):
```typescript
priceAlerts: [] as { id: string; cropId: string; targetPrice: number }[],
```

Current `addPriceAlert` (line 3065):
```typescript
addPriceAlert: (cropId, targetPrice) => {
  const state = get();
  if ((state.priceAlerts ?? []).some(a => a.cropId === cropId)) return;
  set({ priceAlerts: [...(state.priceAlerts ?? []), { id: `alert_${Date.now()}`, cropId, targetPrice }] });
},
```

Current alert-trigger check in `advanceDay` (line 2054):
```typescript
if (currentPrice >= alert.targetPrice) {
```

The store's TypeScript interface for the whole store (around line 396) must be updated so `addPriceAlert` has the new signature. The `partialize` key list must also be verified to not exclude `priceAlerts` (it is not listed in partialize exclusions — it is included in the persisted state, so no change needed there).

### Changes

- [ ] **Step 1.1: Add a named `PriceAlert` interface near the top of the store (before the main `GameState` interface)**

  Find the block that contains the inline type near line 396:
  ```typescript
    priceAlerts: { id: string; cropId: string; targetPrice: number }[];
  ```

  Just above the `GameState` interface declaration (search for `export interface GameState` or the comment block before it), add a named exported interface. Locate the group of exported interfaces (e.g. after `HarvestJob`, `FieldEvent`, `AuctionBid`) and insert:

  ```typescript
  export interface PriceAlert {
    id: string;
    cropId: string;
    targetPrice: number;
    direction: 'above' | 'below';
  }
  ```

- [ ] **Step 1.2: Update the `priceAlerts` field type in `GameState`**

  In the `GameState` interface, replace:
  ```typescript
    priceAlerts: { id: string; cropId: string; targetPrice: number }[];
  ```
  With:
  ```typescript
    priceAlerts: PriceAlert[];
  ```

- [ ] **Step 1.3: Update the `addPriceAlert` action signature in `GameState`**

  Find:
  ```typescript
    addPriceAlert: (cropId: string, targetPrice: number) => void;
  ```
  Replace with:
  ```typescript
    addPriceAlert: (cropId: string, targetPrice: number, direction: 'above' | 'below') => void;
  ```

- [ ] **Step 1.4: Update initial state cast**

  Find:
  ```typescript
      priceAlerts: [] as { id: string; cropId: string; targetPrice: number }[],
  ```
  Replace with:
  ```typescript
      priceAlerts: [] as PriceAlert[],
  ```

- [ ] **Step 1.5: Update `addPriceAlert` implementation**

  Find:
  ```typescript
        addPriceAlert: (cropId, targetPrice) => {
          const state = get();
          if ((state.priceAlerts ?? []).some(a => a.cropId === cropId)) return;
          set({ priceAlerts: [...(state.priceAlerts ?? []), { id: `alert_${Date.now()}`, cropId, targetPrice }] });
        },
  ```
  Replace with:
  ```typescript
        addPriceAlert: (cropId, targetPrice, direction) => {
          const state = get();
          if ((state.priceAlerts ?? []).some(a => a.cropId === cropId)) return;
          set({ priceAlerts: [...(state.priceAlerts ?? []), { id: `alert_${Date.now()}`, cropId, targetPrice, direction }] });
        },
  ```

- [ ] **Step 1.6: Update the trigger check in `advanceDay`**

  Find:
  ```typescript
          if (currentPrice >= alert.targetPrice) {
  ```
  Replace with:
  ```typescript
          const triggered =
            alert.direction === 'below'
              ? currentPrice <= alert.targetPrice
              : currentPrice >= alert.targetPrice;
          if (triggered) {
  ```

  Also update the summary message for direction. Find:
  ```typescript
              summary.push({ id: `alert_${alert.id}`, icon: '🎯', title: `Price alert: sold ${qty.toLocaleString()} ${cropName}`, detail: `$${currentPrice.toFixed(2)}/unit · $${revenue.toLocaleString()} total`, severity: 'good' });
  ```
  Replace with:
  ```typescript
              const dirLabel = alert.direction === 'below' ? '≤' : '≥';
              summary.push({ id: `alert_${alert.id}`, icon: '🎯', title: `Price alert: sold ${qty.toLocaleString()} ${cropName}`, detail: `${dirLabel}$${alert.targetPrice.toFixed(2)} hit · $${revenue.toLocaleString()} total`, severity: 'good' });
  ```

- [ ] **Step 1.7: Update the existing call in `gestion.tsx` to pass `direction`**

  In `app/(tabs)/gestion.tsx`, find the existing call at line ~266:
  ```typescript
              addPriceAlert(alertCropId, tp);
  ```
  Replace with:
  ```typescript
              addPriceAlert(alertCropId, tp, 'above');
  ```

- [ ] **Step 1.8: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 1.9: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts app/\(tabs\)/gestion.tsx && git commit -m "feat(store): add direction field to PriceAlert interface and update advanceDay trigger logic"
  ```

---

## Task 2: Add per-crop alert input row in the Market tab right panel

**Files:**
- Modify: `app/(tabs)/economia.tsx`

### Background

The right panel in the Market tab (`ecoTab === 'market'`) is a `ScrollView` starting at line 540. After the `sellPanel` View (ends around line 626), there is a "ROI Ranking" section. The alert input row goes between the sell panel and the ROI section.

The screen already imports `TextInput` from react-native (line 2). The store actions `addPriceAlert`, `removePriceAlert`, and `priceAlerts` must be destructured from `useGameStore`.

### Changes

- [ ] **Step 2.1: Import `PriceAlert` type and add state variables**

  At the top of the `EconomiaScreen` component function, destructure the alert actions from the store. Find the destructuring block that reads from `useGameStore` (the first `useGameStore()` call in the component). Add:
  ```typescript
    priceAlerts, addPriceAlert, removePriceAlert,
  ```
  to the destructuring list.

  Then add local state for the alert direction toggle directly after the existing `useState` declarations (e.g. after `const [ecoTab, setEcoTab] = useState<EcoTab>('market');`):
  ```typescript
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  ```

- [ ] **Step 2.2: Add the alert row block below the sell panel**

  Find the closing tag of the sell panel, which is followed by the ROI Ranking comment (around line 627–628):
  ```typescript
          </View>

          {/* ROI Ranking */}
  ```

  Insert after `</View>` and before `{/* ROI Ranking */}`:
  ```typescript
          {/* Price Alert */}
          {(() => {
            const existingAlert = (priceAlerts ?? []).find(a => a.cropId === selectedCrop);
            return (
              <View style={styles.alertPanel}>
                <Text style={styles.alertPanelTitle}>🎯 Price Alert</Text>
                {existingAlert ? (
                  <View style={styles.alertActiveRow}>
                    <Text style={styles.alertActiveText}>
                      {existingAlert.direction === 'below' ? 'Sell when ≤' : 'Sell when ≥'} ${existingAlert.targetPrice.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => removePriceAlert(existingAlert.id)}>
                      <Text style={styles.alertRemoveBtn}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.alertDirectionRow}>
                      {(['above', 'below'] as const).map(dir => (
                        <TouchableOpacity
                          key={dir}
                          style={[styles.alertDirBtn, alertDirection === dir && styles.alertDirBtnActive]}
                          onPress={() => setAlertDirection(dir)}
                        >
                          <Text style={[styles.alertDirBtnText, alertDirection === dir && styles.alertDirBtnTextActive]}>
                            {dir === 'above' ? '≥ Above' : '≤ Below'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.alertInputRow}>
                      <TextInput
                        style={styles.alertInput}
                        value={alertTargetPrice}
                        onChangeText={setAlertTargetPrice}
                        placeholder="Target $"
                        placeholderTextColor="#444"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={styles.alertSetBtn}
                        onPress={() => {
                          const tp = parseFloat(alertTargetPrice);
                          if (!tp || tp <= 0) return;
                          addPriceAlert(selectedCrop, tp, alertDirection);
                          setAlertTargetPrice('');
                        }}
                      >
                        <Text style={styles.alertSetBtnText}>Set Alert</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })()}
  ```

- [ ] **Step 2.3: Add styles for the alert panel**

  In the `StyleSheet.create({})` block at the bottom of `economia.tsx`, add these entries (append before the closing `}`):
  ```typescript
    alertPanel:           { backgroundColor: '#16213e', borderRadius: 10, padding: 10, marginTop: 8, gap: 6 },
    alertPanelTitle:      { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    alertActiveRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    alertActiveText:      { color: '#66bb6a', fontSize: 12 },
    alertRemoveBtn:       { color: '#ef5350', fontSize: 12, paddingHorizontal: 6 },
    alertDirectionRow:    { flexDirection: 'row', gap: 6 },
    alertDirBtn:          { flex: 1, backgroundColor: '#0d1117', borderRadius: 6, paddingVertical: 5, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    alertDirBtnActive:    { backgroundColor: '#0f3460', borderColor: '#e8d5a3' },
    alertDirBtnText:      { color: '#666', fontSize: 11, fontWeight: 'bold' },
    alertDirBtnTextActive:{ color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
    alertInputRow:        { flexDirection: 'row', gap: 6, alignItems: 'center' },
    alertInput:           { flex: 1, backgroundColor: '#0d1117', borderRadius: 6, borderWidth: 1, borderColor: '#333', color: '#e8d5a3', fontSize: 12, paddingHorizontal: 8, paddingVertical: 5 },
    alertSetBtn:          { backgroundColor: '#0f3460', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    alertSetBtnText:      { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  ```

- [ ] **Step 2.4: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 2.5: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/\(tabs\)/economia.tsx && git commit -m "feat(economia): add per-crop price alert input row in Market tab right panel"
  ```

---

## Task 3: Add active alerts summary section above the crop list in the Market tab

**Files:**
- Modify: `app/(tabs)/economia.tsx`

### Background

The Market tab left column begins at the `<View style={styles.body}>` block (line 504). The `<ScrollView style={styles.leftCol}>` that lists crop rows starts at line 506. The alerts summary goes between these — in the `body` View, before the left column ScrollView, as a full-width header strip shown only when `(priceAlerts ?? []).length > 0`.

### Changes

- [ ] **Step 3.1: Add the alerts summary strip inside the `body` View**

  Find:
  ```typescript
        {/* Left column */}
        <ScrollView style={styles.leftCol} showsVerticalScrollIndicator={false}>
  ```

  Insert before it:
  ```typescript
        {/* Active alerts summary */}
        {(priceAlerts ?? []).length > 0 && (
          <View style={styles.alertSummaryBar}>
            <Text style={styles.alertSummaryTitle}>🎯 Active Alerts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
              {(priceAlerts ?? []).map(alert => {
                const cropDef = CROP_TYPES.find(c => c.id === alert.cropId);
                return (
                  <View key={alert.id} style={styles.alertSummaryChip}>
                    <Text style={styles.alertSummaryChipName}>{cropDef?.name ?? alert.cropId}</Text>
                    <Text style={styles.alertSummaryChipPrice}>
                      {alert.direction === 'below' ? '≤' : '≥'}${alert.targetPrice.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => removePriceAlert(alert.id)}>
                      <Text style={styles.alertSummaryChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
  ```

  Note: this strip sits inside `<View style={styles.body}>` which is a `flexDirection: 'row'` container for the two-column layout. To make the strip span full width, we need to restructure slightly. The `body` View should wrap an outer column. If the current `body` style is `flexDirection: 'row'`, wrap the strip and the two-column row in a `flexDirection: 'column'` parent.

  The safest approach: change the outer `{ecoTab === 'market' && <> ... </>}` wrapper to contain a `<View style={{ flex: 1 }}>` that stacks the summary strip above the existing `<View style={styles.body}>`.

  Find the market tab opening:
  ```typescript
        {/* MARKET TAB */}
        {ecoTab === 'market' && <>
        {/* News ticker */}
  ```

  And find the closing of the market tab block (after `</View>` that closes `styles.body`):
  ```typescript
        </View>
        </>}
  ```

  Insert the alert summary strip just before `<View style={styles.body}>`:
  ```typescript
        {/* Active alerts summary */}
        {(priceAlerts ?? []).length > 0 && (
          <View style={styles.alertSummaryBar}>
            <Text style={styles.alertSummaryTitle}>🎯 Active Alerts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
              {(priceAlerts ?? []).map(alert => {
                const cropDef = CROP_TYPES.find(c => c.id === alert.cropId);
                return (
                  <View key={alert.id} style={styles.alertSummaryChip}>
                    <Text style={styles.alertSummaryChipName}>{cropDef?.name ?? alert.cropId}</Text>
                    <Text style={styles.alertSummaryChipPrice}>
                      {alert.direction === 'below' ? '≤' : '≥'}${alert.targetPrice.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => removePriceAlert(alert.id)}>
                      <Text style={styles.alertSummaryChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
  ```

- [ ] **Step 3.2: Add styles for the alerts summary strip**

  In the `StyleSheet.create({})` block, append:
  ```typescript
    alertSummaryBar:          { backgroundColor: '#16213e', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
    alertSummaryTitle:        { color: '#e8d5a3', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    alertSummaryChip:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f3460', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
    alertSummaryChipName:     { color: '#e8d5a3', fontSize: 10, fontWeight: 'bold' },
    alertSummaryChipPrice:    { color: '#66bb6a', fontSize: 10 },
    alertSummaryChipRemove:   { color: '#ef5350', fontSize: 11, paddingLeft: 2 },
  ```

- [ ] **Step 3.3: TypeScript verify**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```

- [ ] **Step 3.4: Git commit**
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/\(tabs\)/economia.tsx && git commit -m "feat(economia): add active alerts summary strip in Market tab above crop list"
  ```
