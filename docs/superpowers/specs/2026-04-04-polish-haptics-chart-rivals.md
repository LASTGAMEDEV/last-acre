# Design Spec: Polish — Haptics Fix + Revenue Chart + Rival Drilldown

**Date:** 2026-04-04
**Status:** Approved

---

## Overview

Three self-contained improvements that require no new packages:

1. **Haptic settings bug fix** — haptics currently ignore the `hapticEnabled` store setting
2. **Revenue history chart** — visual SVG line chart in the Stats tab
3. **Rival detail drilldown** — tap-to-expand rival profiles in Oficina + richer FieldPanel rival info

---

## 1 · Haptic Settings Bug Fix

### Problem

`hapticEnabled` is stored in Zustand and exposed in the Settings screen, but every `Haptics.*` call in the codebase fires unconditionally:

- `app/(tabs)/tierras.tsx` — harvest, buy parcel, batch harvest
- `app/(tabs)/economia.tsx` — sell crop
- `components/MilestonePopup.tsx` — milestone unlock

### Fix

In each file:
1. Destructure `hapticEnabled` from `useGameStore()`
2. Guard every `Haptics.impactAsync(...)` and `Haptics.notificationAsync(...)` call: `if (hapticEnabled) Haptics.*(…)`

`MilestonePopup.tsx` is a component (not a tab screen) — it reads from the store directly, so the same pattern applies.

**Files changed:** `tierras.tsx`, `economia.tsx`, `MilestonePopup.tsx`
**No new files, no new deps.**

---

## 2 · Revenue History Chart

### Goal

Replace the blank top of the Stats tab with a compact 30-day revenue line chart so players can see their financial trajectory at a glance.

### Data source

`salesLog: SalesLogEntry[]` — already in the store. Each entry: `{ cropId, qty, revenue, day }`.

Aggregate: group by `day`, sum `revenue`. Fill any day with no sales as `$0`. Keep only the last 30 days relative to `day` (current game day).

### Component: `components/RevenueChart.tsx`

**Props:**
```ts
interface RevenueChartProps {
  data: { day: number; revenue: number }[];  // pre-aggregated, sorted by day, length ≤ 30
  height?: number;                            // default 90
}
```

**Rendering (react-native-svg):**
- SVG canvas fills container width × height
- Polyline from (x0, y0) → (xN, yN) mapped from data
- If all values are 0, show a flat line + "No sales yet" label
- Y-axis: 3 horizontal guide lines at 0%, 50%, 100% of max, labeled with $ amounts
- X-axis: show first and last day numbers
- Line color: `#4caf50` (green, matches rest of economy screen)
- Fill under curve: semi-transparent green `rgba(76,175,80,0.15)`
- No external chart library — pure SVG primitives (Polyline, Path, Line, Text from react-native-svg)

### Integration: `app/(tabs)/economia.tsx` Stats tab

Insert `<RevenueChart data={chartData} />` at the top of the Stats tab scroll view, inside a `styles.statsCard` wrapper with title "Revenue — last 30 days".

Compute `chartData` inline using `salesLog` and `day` from the store (already destructured).

**Files changed:** `economia.tsx` (import + usage)
**New file:** `components/RevenueChart.tsx`

---

## 3 · Rival Detail Drilldown

### Goal

Make rivals feel like real competitors with inspectable profiles, not just colored blobs on a map.

### 3a · Shared data constant

**New file: `data/npcFarmGroups.ts`**

Export `NPC_FARM_GROUP: Record<string, 'rivalA' | 'rivalB'>` — the same mapping currently buried inside `advanceDay`:

```ts
export const NPC_FARM_GROUP: Record<string, 'rivalA' | 'rivalB'> = {
  npc_rivera:    'rivalA',
  npc_verde:     'rivalA',
  npc_sierra:    'rivalA',
  npc_golden:    'rivalB',
  npc_altavista: 'rivalB',
};

export const RIVAL_GROUP_NAME: Record<'rivalA' | 'rivalB', string> = {
  rivalA: 'Hacienda Rivera',
  rivalB: 'Granja del Norte',
};
```

Update `store/useGameStore.ts` to import `NPC_FARM_GROUP` from this file instead of re-declaring the mapping inline.

### 3b · `components/RivalDetailModal.tsx`

Full-screen bottom-sheet modal (slides up, same animation pattern as `DaySummaryModal`).

**Props:**
```ts
interface RivalDetailModalProps {
  group: 'rivalA' | 'rivalB' | null;   // null = hidden
  onClose: () => void;
}
```

**Content (all computed from store at render time):**

| Section | Data |
|---|---|
| Header | Group name, tier badge (highest tier among farms in this group), specialization chips (unique crops from all farms in group) |
| Wealth | Combined current wealth of all farms in group; starting wealth for comparison; a simple "growth" label (e.g. "+42% since start") |
| Land | Count of `mapFields` where `field.owner === group`; list of field names if ≤ 5, otherwise "X fields" |
| Recent news | Last 5 `rivalNews` entries where `detail` or `title` includes any farm name in this group |
| Next market sell | Minimum `nextSellDay - currentDay` across all farms in group (how soon they'll dump crops and pressure prices) |

**Dismiss:** backdrop tap or Close button. Same slide animation as `DaySummaryModal`.

### 3c · Oficina rival list integration

File: `app/(tabs)/oficina.tsx`

Currently each rival farm renders as a row. Change: wrap the row in a `TouchableOpacity`. On press, set local state `rivalDetailGroup: 'rivalA' | 'rivalB' | null` and render `<RivalDetailModal group={rivalDetailGroup} onClose={() => setRivalDetailGroup(null)} />`.

Add a small `ⓘ` tap hint on each row so the user knows it's tappable.

### 3d · FieldPanel enhancement

File: `components/WorldMap/FieldPanel.tsx`

When `field.owner === 'rivalA' || 'rivalB'`, add two new info rows below the existing "Owner" row:
- **Wealth** — combined wealth of that group (formatted, e.g. "$1.2M"), labeled "Combined wealth"
- **Fields** — count of map fields owned by this group, labeled "Fields owned"
- **Sells in** — days until next market dump, labeled "Next dump"

Pass `npcFarms` and `mapFields` as new props to `FieldPanel` (or read from store directly — since `FieldPanel` is a pure display component receiving props, adding props is cleaner).

Update `components/WorldMap/index.tsx` to pass the new props.

---

## File Change Summary

| File | Change |
|---|---|
| `app/(tabs)/tierras.tsx` | Add `hapticEnabled` guard to all `Haptics.*` calls |
| `app/(tabs)/economia.tsx` | Add `hapticEnabled` guard; add `RevenueChart` to Stats tab |
| `components/MilestonePopup.tsx` | Add `hapticEnabled` guard |
| `components/RevenueChart.tsx` | **New** — SVG line chart component |
| `data/npcFarmGroups.ts` | **New** — `NPC_FARM_GROUP` + `RIVAL_GROUP_NAME` constants |
| `store/useGameStore.ts` | Import `NPC_FARM_GROUP` from new data file, remove inline duplicate |
| `components/RivalDetailModal.tsx` | **New** — rival profile bottom sheet |
| `app/(tabs)/oficina.tsx` | Tap handler on rival rows → `RivalDetailModal` |
| `components/WorldMap/FieldPanel.tsx` | Extra rows for rival wealth/fields/next-dump |
| `components/WorldMap/index.tsx` | Pass `npcFarms` + `mapFields` to `FieldPanel` |

---

## Out of Scope

- Sound effects (no `expo-av` installed, no audio assets)
- Any changes to game mechanics or store logic beyond the `NPC_FARM_GROUP` extraction
