# Polish — Haptics Fix, Revenue Chart, Rival Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix haptics respecting user settings, add a visual revenue chart to the Stats tab, and enhance the world map with per-group rival stats + a full rival profile modal accessible from rival fields.

**Architecture:** Three independent improvements sharing one new data file (`data/npcFarmGroups.ts`). No new npm packages required — `react-native-svg` (already installed for the world map) powers the chart. The rival modal reads from the Zustand store and is rendered at the `WorldMap` component level so it can be triggered from `FieldPanel`.

**Tech Stack:** React Native, Expo, TypeScript, Zustand 5, react-native-svg

---

## File Map

| File | Change |
|---|---|
| `data/npcFarmGroups.ts` | **New** — `NPC_FARM_GROUP` + `RIVAL_GROUP_NAME` constants |
| `store/useGameStore.ts` | Import from `npcFarmGroups.ts`, remove inline duplicate |
| `app/(tabs)/oficina.tsx` | Use import, remove inline duplicate |
| `app/(tabs)/tierras.tsx` | Guard 3 `Haptics.*` calls with `hapticEnabled` |
| `app/(tabs)/economia.tsx` | Guard 1 `Haptics.*` call; add `RevenueChart` to Stats tab |
| `components/MilestonePopup.tsx` | Guard 1 `Haptics.*` call with `hapticEnabled` |
| `components/RevenueChart.tsx` | **New** — SVG line chart, pure display |
| `components/RivalDetailModal.tsx` | **New** — group-level rival profile bottom sheet |
| `components/WorldMap/FieldPanel.tsx` | Accept `npcFarms` + `mapFields` + `onViewRivalProfile` props; add rival rows |
| `components/WorldMap/index.tsx` | Pass new props to `FieldPanel`; own `rivalDetailGroup` state; render `RivalDetailModal` |

---

## Task 1: Extract NPC_FARM_GROUP to shared data file

**Files:**
- Create: `data/npcFarmGroups.ts`
- Modify: `store/useGameStore.ts` ~line 1069
- Modify: `app/(tabs)/oficina.tsx` ~line 1009

- [ ] **Step 1: Create `data/npcFarmGroups.ts`**

```typescript
// data/npcFarmGroups.ts
import { MapOwner } from '../types/worldMap';

/** Maps each NPC farm id to its map-owner group. */
export const NPC_FARM_GROUP: Record<string, 'rivalA' | 'rivalB'> = {
  npc_rivera:    'rivalA',
  npc_verde:     'rivalA',
  npc_sierra:    'rivalA',
  npc_golden:    'rivalB',
  npc_altavista: 'rivalB',
};

/** Human-readable display name for each rival group. */
export const RIVAL_GROUP_NAME: Record<'rivalA' | 'rivalB', string> = {
  rivalA: 'Hacienda Rivera',
  rivalB: 'Granja del Norte',
};
```

- [ ] **Step 2: Update `store/useGameStore.ts` — import and remove inline duplicate**

Add this import near the top of the file (after existing data imports, around line 24):

```typescript
import { NPC_FARM_GROUP } from '../data/npcFarmGroups';
```

Find the inline `NPC_MAP_OWNER` object inside `advanceDay` (around line 1069):

```typescript
        // Map NPC farm IDs to map owner types
        const NPC_MAP_OWNER: Record<string, MapOwner> = {
          'npc_rivera':    'rivalA',
          'npc_verde':     'rivalA',
          'npc_sierra':    'rivalA',
          'npc_golden':    'rivalB',
          'npc_altavista': 'rivalB',
        };
```

Replace with:

```typescript
        // Map NPC farm IDs to map owner types
        const NPC_MAP_OWNER = NPC_FARM_GROUP;
```

- [ ] **Step 3: Update `app/(tabs)/oficina.tsx` — remove inline duplicate**

Find inside `CompetitorsSection` (~line 1009):

```typescript
  const NPC_MAP_OWNER: Record<string, string> = {
    'npc_rivera': 'rivalA', 'npc_verde': 'rivalA', 'npc_sierra': 'rivalA',
    'npc_golden': 'rivalB', 'npc_altavista': 'rivalB',
  };
```

Add import at the top of oficina.tsx:

```typescript
import { NPC_FARM_GROUP, RIVAL_GROUP_NAME } from '../../data/npcFarmGroups';
```

Replace the inline declaration with:

```typescript
  const NPC_MAP_OWNER = NPC_FARM_GROUP;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add data/npcFarmGroups.ts store/useGameStore.ts app/(tabs)/oficina.tsx
git commit -m "refactor: extract NPC_FARM_GROUP to data/npcFarmGroups.ts"
```

---

## Task 2: Fix haptics in `tierras.tsx`

**Files:**
- Modify: `app/(tabs)/tierras.tsx`

- [ ] **Step 1: Add `hapticEnabled` to the store destructure**

Find the existing `useGameStore()` destructure starting at line 47:

```typescript
  const {
    parcels, money, day, inventory, machines, buildings, cooperative, prices,
    buyParcel, plantCrop, harvestCrop, harvestAllReady,
    fieldEvents, resolveFieldEvent, productInventory,
    clearWeeds, fertilizeCrop, installGreenhouse, removeGreenhouse, installIrrigation,
    seedVault, selectSeedForParcel,
    tractorJobs, harvestJobs, assignJob, assignHarvestJob, hireContractor,
    cureDisease, plantCropBatch,
  } = useGameStore();
```

Replace with:

```typescript
  const {
    parcels, money, day, inventory, machines, buildings, cooperative, prices,
    buyParcel, plantCrop, harvestCrop, harvestAllReady,
    fieldEvents, resolveFieldEvent, productInventory,
    clearWeeds, fertilizeCrop, installGreenhouse, removeGreenhouse, installIrrigation,
    seedVault, selectSeedForParcel,
    tractorJobs, harvestJobs, assignJob, assignHarvestJob, hireContractor,
    cureDisease, plantCropBatch, hapticEnabled,
  } = useGameStore();
```

- [ ] **Step 2: Guard the three Haptics calls**

**Call 1** (~line 333) — inside the harvest button's `onPress`. Find:

```typescript
                    harvestCrop(parcel.id);
                    playSound('harvest');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

Replace with:

```typescript
                    harvestCrop(parcel.id);
                    playSound('harvest');
                    if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

**Call 2** (~line 547) — map view harvest button. Find:

```typescript
                      onPress={() => { harvestCrop(p.id); setMapSelected(null); playSound('harvest'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
```

Replace with:

```typescript
                      onPress={() => { harvestCrop(p.id); setMapSelected(null); playSound('harvest'); if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
```

**Call 3** (~line 601) — batch harvest button. Find:

```typescript
              <TouchableOpacity style={styles.batchHarvestBtn} onPress={() => { harvestAllReady(); playSound('harvest'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}>
```

Replace with:

```typescript
              <TouchableOpacity style={styles.batchHarvestBtn} onPress={() => { harvestAllReady(); playSound('harvest'); if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add app/(tabs)/tierras.tsx
git commit -m "fix: guard haptics with hapticEnabled setting in tierras"
```

---

## Task 3: Fix haptics in `economia.tsx` and `MilestonePopup.tsx`

**Files:**
- Modify: `app/(tabs)/economia.tsx`
- Modify: `components/MilestonePopup.tsx`

- [ ] **Step 1: Add `hapticEnabled` to economia.tsx store destructure**

Find the long destructure at the top of the component (~line 154):

```typescript
  const { prices, priceHistory, inventory, sellCrop, newsEvents, day, salesLog, totalRevenue, prestige, sellPressures, futures, openFuture, priceAlerts, addPriceAlert, removePriceAlert, money, marketOrders, placeMarketOrder, cancelMarketOrder, selectedMarket, setSelectedMarket } = useGameStore();
```

Replace with (add `hapticEnabled` at the end):

```typescript
  const { prices, priceHistory, inventory, sellCrop, newsEvents, day, salesLog, totalRevenue, prestige, sellPressures, futures, openFuture, priceAlerts, addPriceAlert, removePriceAlert, money, marketOrders, placeMarketOrder, cancelMarketOrder, selectedMarket, setSelectedMarket, hapticEnabled } = useGameStore();
```

- [ ] **Step 2: Guard the sell haptic in economia.tsx**

Find (~line 803):

```typescript
              onPress={() => { sellCrop(selectedCrop, inStock, selectedMarket ?? 'local'); playSound(regionalRevenue >= 5000 ? 'bigSale' : 'sell'); if (regionalRevenue >= 1000) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
```

Replace with:

```typescript
              onPress={() => { sellCrop(selectedCrop, inStock, selectedMarket ?? 'local'); playSound(regionalRevenue >= 5000 ? 'bigSale' : 'sell'); if (hapticEnabled && regionalRevenue >= 1000) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
```

- [ ] **Step 3: Guard the milestone haptic in `MilestonePopup.tsx`**

Find the store destructure at the top of the component:

```typescript
  const { milestonePopup, clearMilestonePopup } = useGameStore();
```

Replace with:

```typescript
  const { milestonePopup, clearMilestonePopup, hapticEnabled } = useGameStore();
```

Find (~line 37):

```typescript
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

Replace with:

```typescript
    if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add app/(tabs)/economia.tsx components/MilestonePopup.tsx
git commit -m "fix: guard haptics with hapticEnabled setting in economia and MilestonePopup"
```

---

## Task 4: Build `RevenueChart` component

**Files:**
- Create: `components/RevenueChart.tsx`

This is a pure display component — it receives pre-aggregated data and renders an SVG line chart. `react-native-svg` is already installed.

- [ ] **Step 1: Create `components/RevenueChart.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Svg, Polyline, Polygon, Line, Text as SvgText, Rect } from 'react-native-svg';

export interface RevenueChartDataPoint {
  day: number;
  revenue: number;
}

interface Props {
  data: RevenueChartDataPoint[];  // sorted by day, length ≤ 30
  height?: number;                 // default 90
}

const PAD_L = 44;  // left padding for y-axis labels
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18; // bottom padding for x-axis labels

export default function RevenueChart({ data, height = 90 }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const W = screenWidth - 24 - 24; // card horizontal padding
  const H = height;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const n = data.length;

  // Map data to SVG coordinates
  function toX(i: number): number {
    return PAD_L + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  }
  function toY(revenue: number): number {
    return PAD_T + plotH - (revenue / maxRevenue) * plotH;
  }

  const points = data.map((d, i) => `${toX(i)},${toY(d.revenue)}`).join(' ');

  // Polygon fill: close the path along the bottom
  const fillPoints = n > 0
    ? `${toX(0)},${PAD_T + plotH} ${points} ${toX(n - 1)},${PAD_T + plotH}`
    : '';

  // Y-axis guide lines at 50% and 100%
  const guides = [1.0, 0.5].map(pct => ({
    y: PAD_T + plotH - pct * plotH,
    label: pct === 1.0
      ? maxRevenue >= 1000
        ? `$${Math.round(maxRevenue / 1000)}k`
        : `$${Math.round(maxRevenue)}`
      : maxRevenue >= 1000
        ? `$${Math.round(maxRevenue / 2000)}k`
        : `$${Math.round(maxRevenue / 2)}`,
  }));

  const isEmpty = data.every(d => d.revenue === 0);

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        {/* Background */}
        <Rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} fill="#0a1628" rx={3} />

        {/* Guide lines */}
        {guides.map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PAD_L} y1={g.y} x2={PAD_L + plotW} y2={g.y}
              stroke="#1e2a3a" strokeWidth={1} strokeDasharray="4,4"
            />
            <SvgText
              x={PAD_L - 4} y={g.y + 4}
              fontSize={9} fill="#4a5a6a" textAnchor="end"
            >
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Zero line */}
        <Line
          x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH}
          stroke="#1e2a3a" strokeWidth={1}
        />

        {/* Fill area */}
        {!isEmpty && n > 1 && (
          <Polygon points={fillPoints} fill="rgba(76,175,80,0.12)" />
        )}

        {/* Line */}
        {!isEmpty && n > 1 && (
          <Polyline points={points} fill="none" stroke="#4caf50" strokeWidth={1.5} strokeLinejoin="round" />
        )}

        {/* X-axis: first and last day */}
        {n > 0 && (
          <>
            <SvgText x={toX(0)} y={H - 4} fontSize={9} fill="#4a5a6a" textAnchor="middle">
              d{data[0].day}
            </SvgText>
            {n > 1 && (
              <SvgText x={toX(n - 1)} y={H - 4} fontSize={9} fill="#4a5a6a" textAnchor="middle">
                d{data[n - 1].day}
              </SvgText>
            )}
          </>
        )}

        {/* Empty state */}
        {isEmpty && (
          <SvgText x={PAD_L + plotW / 2} y={PAD_T + plotH / 2 + 4} fontSize={11} fill="#3a4a5a" textAnchor="middle">
            No sales yet
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add components/RevenueChart.tsx
git commit -m "feat: add RevenueChart SVG line chart component"
```

---

## Task 5: Integrate RevenueChart into the Stats tab

**Files:**
- Modify: `app/(tabs)/economia.tsx`

- [ ] **Step 1: Add the import**

At the top of `economia.tsx`, add:

```typescript
import RevenueChart, { RevenueChartDataPoint } from '../../components/RevenueChart';
```

- [ ] **Step 2: Compute chart data**

In the Stats computations block (~line 203, after the existing rev7/rev30/rev90 calculations), add:

```typescript
  // Revenue chart: group salesLog by day for the last 30 days
  const chartData: RevenueChartDataPoint[] = (() => {
    const fromDay = day - 29;
    const byDay: Record<number, number> = {};
    for (const s of salesLog) {
      if (s.day >= fromDay && s.day <= day) {
        byDay[s.day] = (byDay[s.day] ?? 0) + s.amount;
      }
    }
    const result: RevenueChartDataPoint[] = [];
    for (let d = fromDay; d <= day; d++) {
      result.push({ day: d, revenue: byDay[d] ?? 0 });
    }
    return result;
  })();
```

- [ ] **Step 3: Insert chart into Stats tab**

Find the Stats tab scroll view content (right after `{ecoTab === 'stats' && (`  ~line 250). The first element is `<View style={styles.prestigeCard}>`. Insert the chart card above it:

```typescript
      {ecoTab === 'stats' && (
        <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
          {/* Revenue chart */}
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>📈 Revenue — last 30 days</Text>
            <RevenueChart data={chartData} />
          </View>

          <View style={styles.prestigeCard}>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add app/(tabs)/economia.tsx
git commit -m "feat: add revenue history chart to Stats tab"
```

---

## Task 6: Build `RivalDetailModal` component

**Files:**
- Create: `components/RivalDetailModal.tsx`

This component reads from the Zustand store directly. It shows combined stats for one rival group (rivalA or rivalB) — all farms in that group aggregated together.

- [ ] **Step 1: Create `components/RivalDetailModal.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { NPC_FARM_GROUP, RIVAL_GROUP_NAME } from '../data/npcFarmGroups';
import { CROP_TYPES } from '../data/cropTypes';
import { NPC_FARM_DEFINITIONS } from '../data/npcFarms';

interface Props {
  group: 'rivalA' | 'rivalB' | null;
  onClose: () => void;
}

export default function RivalDetailModal({ group, onClose }: Props) {
  const { npcFarms = [], mapFields = [], rivalNews = [], day } = useGameStore();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(500)).current;

  const visible = group !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!group) return null;

  function dismiss() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 500, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      cardY.setValue(500);
      onClose();
    });
  }

  // Farms in this group
  const groupFarms = npcFarms.filter(f => NPC_FARM_GROUP[f.id] === group);
  const startingWealthTotal = NPC_FARM_DEFINITIONS
    .filter(d => NPC_FARM_GROUP[d.id] === group)
    .reduce((s, d) => s + d.startingWealth, 0);
  const currentWealthTotal = groupFarms.reduce((s, f) => s + f.wealth, 0);
  const wealthGrowthPct = startingWealthTotal > 0
    ? Math.round(((currentWealthTotal - startingWealthTotal) / startingWealthTotal) * 100)
    : 0;

  // Land
  const groupFields = mapFields.filter((f: any) => f.owner === group);
  const totalHa = groupFields.reduce((s: number, f: any) => s + (f.approximateHa ?? 0), 0);

  // Specializations (unique across all farms in group)
  const allCropIds = Array.from(new Set(groupFarms.flatMap(f => f.specialization)));

  // Tier (highest tier in group)
  const maxTier = groupFarms.reduce((mx, f) => Math.max(mx, f.tier), 1) as 1 | 2 | 3;
  const tierLabel = maxTier === 3 ? 'Dominant' : maxTier === 2 ? 'Established' : 'Small';
  const tierColor = maxTier === 3 ? '#ef5350' : maxTier === 2 ? '#ffb74d' : '#66bb6a';

  // Next dump
  const nextDumpIn = groupFarms.length > 0
    ? Math.max(0, Math.min(...groupFarms.map(f => f.nextSellDay - day)))
    : 0;

  // Recent news for this group
  const groupFarmNames = groupFarms.map(f => f.name);
  const groupNews = rivalNews.filter((n: any) =>
    groupFarmNames.some(name => (n.detail ?? '').includes(name) || (n.title ?? '').includes(name))
  ).slice(0, 8);

  const groupName = RIVAL_GROUP_NAME[group];
  const screenH = Dimensions.get('window').height;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={dismiss} />

      <Animated.View style={[styles.card, { maxHeight: screenH * 0.75, transform: [{ translateY: cardY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupSub}>{groupFarms.length} farm{groupFarms.length !== 1 ? 's' : ''} · {groupFields.length} field{groupFields.length !== 1 ? 's' : ''} · ~{Math.round(totalHa)}ha</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Wealth */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Combined Wealth</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current</Text>
              <Text style={[styles.statValue, { color: '#e8d5a3' }]}>${Math.round(currentWealthTotal).toLocaleString()}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>vs. starting</Text>
              <Text style={[styles.statValue, { color: wealthGrowthPct >= 0 ? '#66bb6a' : '#ef5350' }]}>
                {wealthGrowthPct >= 0 ? '+' : ''}{wealthGrowthPct}%
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Next market dump</Text>
              <Text style={[styles.statValue, { color: nextDumpIn <= 3 ? '#ef5350' : '#ccc' }]}>
                {nextDumpIn === 0 ? 'Today' : `in ${nextDumpIn}d`}
              </Text>
            </View>
          </View>

          {/* Specializations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌾 Crops they sell</Text>
            <View style={styles.chipRow}>
              {allCropIds.map(cropId => {
                const crop = CROP_TYPES.find(c => c.id === cropId);
                return (
                  <View key={cropId} style={styles.chip}>
                    <Text style={styles.chipText}>{crop?.name ?? cropId}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Individual farms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏭 Member farms</Text>
            {groupFarms.map(farm => (
              <View key={farm.id} style={styles.farmRow}>
                <View style={[styles.tierDot, { backgroundColor: farm.tier === 3 ? '#ef5350' : farm.tier === 2 ? '#ffb74d' : '#66bb6a' }]} />
                <Text style={styles.farmName}>{farm.name}</Text>
                <Text style={styles.farmWealth}>${Math.round(farm.wealth).toLocaleString()}</Text>
                <Text style={styles.farmSell}>sells in {Math.max(0, farm.nextSellDay - day)}d</Text>
              </View>
            ))}
          </View>

          {/* Recent news */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📡 Recent activity</Text>
            {groupNews.length === 0 ? (
              <Text style={styles.emptyText}>No activity recorded yet.</Text>
            ) : groupNews.map((item: any) => (
              <View key={item.id} style={styles.newsRow}>
                <Text style={styles.newsIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  {item.detail ? <Text style={styles.newsDetail}>{item.detail}</Text> : null}
                </View>
                <Text style={styles.newsDay}>d{item.day}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 200,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  card: {
    backgroundColor: '#080e1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#1c3050',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupName: { color: '#e8d5a3', fontSize: 17, fontWeight: 'bold' },
  groupSub: { color: '#666', fontSize: 11, marginTop: 2 },
  tierBadge: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tierText: { fontSize: 11, fontWeight: 'bold' },
  section: {
    backgroundColor: '#0f1a2e',
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  sectionTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12, marginBottom: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statLabel: { color: '#666', fontSize: 12 },
  statValue: { fontSize: 12, fontWeight: 'bold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#0f3460', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#ccc', fontSize: 11 },
  farmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  farmName: { flex: 1, color: '#ccc', fontSize: 12 },
  farmWealth: { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold', marginRight: 8 },
  farmSell: { color: '#666', fontSize: 10 },
  emptyText: { color: '#444', fontSize: 11, fontStyle: 'italic' },
  newsRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e2a3a',
  },
  newsIcon: { fontSize: 14 },
  newsTitle: { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  newsDetail: { color: '#666', fontSize: 10, marginTop: 2 },
  newsDay: { color: '#444', fontSize: 10 },
  closeBtn: {
    marginTop: 12, backgroundColor: '#16213e',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  closeBtnText: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add components/RivalDetailModal.tsx
git commit -m "feat: add RivalDetailModal component"
```

---

## Task 7: Wire RivalDetailModal into WorldMap + enhance FieldPanel

**Files:**
- Modify: `components/WorldMap/FieldPanel.tsx`
- Modify: `components/WorldMap/index.tsx`

### 7a — Update FieldPanel props

- [ ] **Step 1: Update `FieldPanel.tsx` props and add rival rows**

Replace the entire file content with:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MapField } from '../../types/worldMap';
import { LandParcel } from '../../store/useGameStore';
import { CROP_TYPES } from '../../data/cropTypes';
import { NPC_FARM_GROUP, RIVAL_GROUP_NAME } from '../../data/npcFarmGroups';

interface NPCFarmLike {
  id: string;
  wealth: number;
  nextSellDay: number;
}

interface MapFieldLike {
  owner: string;
  approximateHa?: number;
}

interface Props {
  field: MapField | null;
  parcel?: LandParcel;
  day: number;
  money: number;
  npcFarms: NPCFarmLike[];
  mapFields: MapFieldLike[];
  onClose: () => void;
  onBuy: (id: string) => void;
  onScout: (id: string) => void;
  onManage: (parcelId: string) => void;
  onViewRivalProfile: (group: 'rivalA' | 'rivalB') => void;
}

function getStatusText(field: MapField, parcel?: LandParcel, day?: number): string {
  if (field.owner === 'forsale')  return 'Available for purchase';
  if (field.owner === 'unowned')  return 'Not for sale';
  if (field.owner !== 'player')   return field.scouted ? 'Competitor — scouted' : 'Competitor — unknown';
  if (!parcel)                    return 'Unplanted';
  if (!parcel.plantedCrop)        return parcel.tilled ? 'Tilled — ready to plant' : 'Unplanted';
  const crop = CROP_TYPES.find(c => c.id === parcel.plantedCrop!.cropId);
  if (!crop) return 'Growing';
  const readyDay = parcel.plantedCrop!.plantedDay + crop.growthDays;
  if ((day ?? 0) >= readyDay) return `${crop.name} — Ready to Harvest ⚡`;
  return `${crop.name} — ${readyDay - (day ?? 0)}d remaining`;
}

export default function FieldPanel({ field, parcel, day, money, npcFarms, mapFields, onClose, onBuy, onScout, onManage, onViewRivalProfile }: Props) {
  const { width } = useWindowDimensions();
  const translateY = useSharedValue(300);

  React.useEffect(() => {
    translateY.value = withTiming(field ? 0 : 300, { duration: 260 });
  }, [field]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!field) return null;

  const status = getStatusText(field, parcel, day);
  const canAffordBuy = field.owner === 'forsale' && money >= (field.askingPrice ?? 0);
  const canAffordScout = money >= 500;

  // Rival group stats
  const rivalGroup = (field.owner === 'rivalA' || field.owner === 'rivalB') ? field.owner : null;
  const groupFarms = rivalGroup ? npcFarms.filter(f => NPC_FARM_GROUP[f.id] === rivalGroup) : [];
  const groupWealth = groupFarms.reduce((s, f) => s + f.wealth, 0);
  const groupFieldCount = mapFields.filter(f => f.owner === rivalGroup).length;
  const nextDumpIn = groupFarms.length > 0
    ? Math.max(0, Math.min(...groupFarms.map(f => f.nextSellDay - day)))
    : null;

  return (
    <Animated.View style={[styles.panel, { width: Math.min(340, width - 20) }, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.name}>{field.name}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeX}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.lbl}>Owner</Text>
        <Text style={[styles.val, field.owner === 'player' ? styles.green : field.owner === 'forsale' ? styles.amber : styles.red]}>
          {field.owner === 'player' ? 'You' : field.owner === 'forsale' ? 'For Sale' : rivalGroup ? RIVAL_GROUP_NAME[rivalGroup] : 'Unowned'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.lbl}>Size</Text>
        <Text style={styles.val}>~{field.approximateHa} ha</Text>
      </View>
      {field.fertility !== undefined && (
        <View style={styles.row}>
          <Text style={styles.lbl}>Fertility</Text>
          <Text style={styles.val}>{field.fertility}%</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.lbl}>Status</Text>
        <Text style={[styles.val, status.includes('Ready') ? styles.amber : styles.val]}>{status}</Text>
      </View>
      {field.owner === 'forsale' && (
        <View style={styles.row}>
          <Text style={styles.lbl}>Asking price</Text>
          <Text style={styles.val}>${field.askingPrice?.toLocaleString()}</Text>
        </View>
      )}

      {/* Rival group stats */}
      {rivalGroup && (
        <>
          <View style={styles.row}>
            <Text style={styles.lbl}>Combined wealth</Text>
            <Text style={styles.val}>${groupWealth >= 1000 ? `${(groupWealth / 1000).toFixed(1)}k` : Math.round(groupWealth).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.lbl}>Fields owned</Text>
            <Text style={styles.val}>{groupFieldCount}</Text>
          </View>
          {nextDumpIn !== null && (
            <View style={styles.row}>
              <Text style={styles.lbl}>Next market dump</Text>
              <Text style={[styles.val, nextDumpIn <= 3 ? styles.red : styles.val]}>
                {nextDumpIn === 0 ? 'Today' : `in ${nextDumpIn}d`}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.divider}/>

      {field.owner === 'forsale' && (
        <TouchableOpacity
          style={[styles.btn, canAffordBuy ? styles.btnBuy : styles.btnDisabled]}
          onPress={() => canAffordBuy && onBuy(field.id)}
          disabled={!canAffordBuy}
        >
          <Text style={styles.btnText}>{canAffordBuy ? `Buy Field ($${field.askingPrice?.toLocaleString()})` : 'Not enough money'}</Text>
        </TouchableOpacity>
      )}
      {field.owner === 'player' && parcel && (
        <TouchableOpacity style={[styles.btn, styles.btnManage]} onPress={() => onManage(parcel.id)}>
          <Text style={styles.btnText}>
            {parcel.plantedCrop ? (status.includes('Ready') ? '⚡ Harvest Now →' : 'Manage Field →') : 'Plant a Crop →'}
          </Text>
        </TouchableOpacity>
      )}
      {rivalGroup && !field.scouted && (
        <TouchableOpacity
          style={[styles.btn, canAffordScout ? styles.btnScout : styles.btnDisabled]}
          onPress={() => canAffordScout && onScout(field.id)}
          disabled={!canAffordScout}
        >
          <Text style={styles.btnText}>Buy Scout Report ($500)</Text>
        </TouchableOpacity>
      )}
      {rivalGroup && (
        <TouchableOpacity
          style={[styles.btn, styles.btnProfile]}
          onPress={() => onViewRivalProfile(rivalGroup)}
        >
          <Text style={styles.btnText}>View Rival Profile →</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: 'rgba(4,6,12,0.97)', borderWidth: 1, borderColor: '#1c3050',
    borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.9, shadowRadius: 24, shadowOffset: { width: 0, height: 6 },
    elevation: 20,
  },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  name:     { fontSize: 14, fontWeight: '700', color: '#ddd' },
  closeBtn: { padding: 4 },
  closeX:   { color: '#444', fontSize: 16 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lbl:      { color: '#505050', fontSize: 11 },
  val:      { color: '#aaa', fontSize: 11 },
  green:    { color: '#62a838' },
  amber:    { color: '#c8a830' },
  red:      { color: '#b84040' },
  divider:  { borderTopWidth: 1, borderTopColor: '#121c28', marginVertical: 8 },
  btn:      { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 6, marginTop: 4, alignItems: 'center' },
  btnText:  { fontSize: 12, fontWeight: '700' },
  btnBuy:   { backgroundColor: '#1a1200', borderWidth: 1, borderColor: '#6a4400' },
  btnManage:{ backgroundColor: '#0e2014', borderWidth: 1, borderColor: '#225020' },
  btnScout: { backgroundColor: '#120c22', borderWidth: 1, borderColor: '#301860' },
  btnProfile: { backgroundColor: '#0d1c30', borderWidth: 1, borderColor: '#1e4070' },
  btnDisabled: { backgroundColor: '#181818', borderWidth: 1, borderColor: '#2a2a2a' },
});
```

### 7b — Update WorldMap index to own rival modal state

- [ ] **Step 2: Update `components/WorldMap/index.tsx`**

Replace the entire file content with:

```typescript
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/useGameStore';
import MapCanvas, { CANVAS_W, CANVAS_H } from './MapCanvas';
import FieldPanel from './FieldPanel';
import MiniMap from './MiniMap';
import { useMapGestures, MIN_ZOOM, MAX_ZOOM, centreOnPoint } from './useMapGestures';
import MapLegend from './MapLegend';
import RivalDetailModal from '../RivalDetailModal';

// Center of player's starting fields (nc6 + nc7)
const PLAYER_START_X = 691;
const PLAYER_START_Y = 272;

export default function WorldMap() {
  const { width: W, height: H } = useWindowDimensions();
  const router = useRouter();

  const {
    mapFields, parcels, npcFarms, day, money,
    selectedMapFieldId, mapPanX, mapPanY, mapZoom,
    selectMapField, buyMapField, scoutMapField, savePanZoom,
  } = useGameStore();

  const [rivalDetailGroup, setRivalDetailGroup] = useState<'rivalA' | 'rivalB' | null>(null);

  const isFirstOpen = mapZoom === 0;
  const fitZoom = Math.min(
    Math.max(Math.max(W / CANVAS_W, H / CANVAS_H), MIN_ZOOM),
    1.5,
  );
  const firstOpen = isFirstOpen
    ? centreOnPoint(PLAYER_START_X, PLAYER_START_Y, fitZoom, W, H)
    : { x: mapPanX, y: mapPanY };
  const initZoom = isFirstOpen ? fitZoom : mapZoom;
  const initX    = firstOpen.x;
  const initY    = firstOpen.y;

  const { translateX, translateY, scale, composed, animStyle, jumpTo } =
    useMapGestures({
      screenW: W,
      screenH: H,
      initialX: initX,
      initialY: initY,
      initialZoom: initZoom,
      onSave: savePanZoom,
    });

  const selectedField = selectedMapFieldId
    ? mapFields.find(f => f.id === selectedMapFieldId) ?? null
    : null;

  const selectedParcel = selectedField?.parcelId
    ? parcels.find(p => p.id === selectedField.parcelId)
    : undefined;

  const handleFieldPress = useCallback((id: string) => {
    selectMapField(id);
  }, [selectMapField]);

  const handleBuy = useCallback((id: string) => {
    buyMapField(id);
    selectMapField(null);
  }, [buyMapField, selectMapField]);

  const handleManage = useCallback((_parcelId: string) => {
    selectMapField(null);
    router.push('/(tabs)/tierras');
  }, [router, selectMapField]);

  const handleMiniMapTap = useCallback((canvasX: number, canvasY: number) => {
    jumpTo(canvasX, canvasY);
  }, [jumpTo]);

  const handleViewRivalProfile = useCallback((group: 'rivalA' | 'rivalB') => {
    setRivalDetailGroup(group);
  }, []);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.canvas, animStyle]}>
            <MapCanvas
              fields={mapFields}
              parcels={parcels}
              selectedId={selectedMapFieldId}
              zoom={mapZoom}
              onFieldPress={handleFieldPress}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Mini-map top-right */}
      <View style={styles.miniMapWrap} pointerEvents="box-none">
        <MiniMap
          fields={mapFields}
          translateX={mapPanX}
          translateY={mapPanY}
          zoom={mapZoom}
          screenW={W}
          screenH={H}
          onTap={handleMiniMapTap}
        />
      </View>

      {/* Legend bottom-right */}
      <View style={styles.legendWrap} pointerEvents="none">
        <MapLegend />
      </View>

      {/* Detail panel */}
      <FieldPanel
        field={selectedField}
        parcel={selectedParcel}
        day={day}
        money={money}
        npcFarms={npcFarms ?? []}
        mapFields={mapFields}
        onClose={() => selectMapField(null)}
        onBuy={handleBuy}
        onScout={scoutMapField}
        onManage={handleManage}
        onViewRivalProfile={handleViewRivalProfile}
      />

      {/* Rival profile modal */}
      <RivalDetailModal
        group={rivalDetailGroup}
        onClose={() => setRivalDetailGroup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#050709' },
  viewport:    { flex: 1, overflow: 'hidden' },
  canvas:      { position: 'absolute', top: 0, left: 0 },
  miniMapWrap: { position: 'absolute', top: 54, right: 12 },
  legendWrap:  { position: 'absolute', bottom: 16, right: 12 },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add components/WorldMap/FieldPanel.tsx components/WorldMap/index.tsx
git commit -m "feat: wire RivalDetailModal into WorldMap — rival stats in FieldPanel + View Profile button"
```

---

## Self-Review

**Spec coverage:**
- ✅ Haptics fix: tasks 2 + 3 cover all 5 call sites (tierras ×3, economia ×1, MilestonePopup ×1)
- ✅ Revenue chart: tasks 4 + 5 build the component and integrate it
- ✅ `NPC_FARM_GROUP` extraction: task 1
- ✅ `RivalDetailModal` with wealth, growth %, land, specialization, news: task 6
- ✅ FieldPanel rival rows (combined wealth, fields, next dump): task 7a
- ✅ "View Rival Profile" button in FieldPanel: task 7a
- ✅ `RivalDetailModal` triggered from WorldMap: task 7b
- ✅ Spec notes oficina uses `RIVAL_GROUP_NAME` — imported in task 1 step 3 (available for future use); existing per-farm expand unchanged

**Placeholder scan:** No TBDs, no "similar to task N" references, no incomplete steps found.

**Type consistency:**
- `RevenueChartDataPoint` defined in task 4, imported in task 5 ✅
- `FieldPanel` props `npcFarms: NPCFarmLike[]` / `mapFields: MapFieldLike[]` use minimal structural types — avoids coupling to full store types ✅
- `NPC_FARM_GROUP` defined as `Record<string, 'rivalA' | 'rivalB'>` — matches usage in `RivalDetailModal`, `FieldPanel`, and store ✅
- `onViewRivalProfile` callback defined in props, implemented in `index.tsx` ✅
