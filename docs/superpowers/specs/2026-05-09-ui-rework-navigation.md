# UI Rework — Navigation & Visual Overhaul

**Date:** 2026-05-09  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-13-design-system.md` (tokens, GameHUD, SubTabBar, card patterns)

---

## 1. Executive Summary

Replace the current 5-tab + floating-button layout with a cleaner 4-tab + center action button architecture. Flatten all nested tab levels. Merge orphaned screens. Extract inline sections into reusable components.

**Current problems this fixes:**
- 3-level tab nesting in Office (Office → Office → Bank)
- Orphaned screens (`logros.tsx`, stale `seguros` reference)
- Advance Day button floats over content
- Machinery & Workers live under Farm but affect Processing/Buildings
- Weather has its own low-traffic tab

---

## 2. New Navigation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  🌿 Farm  │  ⚙️ Ops  │     ▶     │  📈 Market  │  🏦 Office    │
└─────────────────────────────────────────────────────────────────┘
```

### 2a. Bottom Tab Bar

Custom tab bar component. Center item is **not a navigable tab** — it's a circular action button that calls `advanceDay()` directly.

| Position | Tab | Icon | Badge Source |
|----------|-----|------|--------------|
| Left-1 | **Farm** | 🌿 | Crops ready to harvest |
| Left-2 | **Ops** | ⚙️ | — |
| Center | **Advance** | ▶ | — |
| Right-1 | **Market** | 📈 | — |
| Right-2 | **Office** | 🏦 | Urgent loans + contracts |

**Tab bar styling:**
- Background: `theme.tabBar` (seasonal)
- Top border: 1px `theme.accent + '33'`
- Active tab: `theme.accent` color, `fontWeight: bold`
- Inactive tab: `C.textMuted` color
- Center button: 56px circle, `backgroundColor: theme.accent`, white ▶ icon, elevated shadow
- Height: 64px (standard) + safe area inset
- Minimum touch target: 44px on all tabs

### 2b. Sub-tabs (SubTabBar)

Each composite screen uses the existing `SubTabBar` component. No screen may have more than 1 level of sub-tabs.

---

## 3. Screen-by-Screen Mapping

### 🌿 Farm (`app/(tabs)/farm.tsx`)

| Sub-tab | Source |
|---------|--------|
| **Fields** | `app/(tabs)/tierras.tsx` (imported as component) |
| **Animals** | `app/(tabs)/animales.tsx` (imported as component) |
| **Henil** | `HenilAndBuildingsSection` extracted from `gestion.tsx` |
| **Water** | `app/(tabs)/agua.tsx` (imported as component) |
| **Calendar** | `app/(tabs)/calendario.tsx` (imported as component) |
| **Weather** | `app/(tabs)/clima.tsx` (imported as component) |

### ⚙️ Ops (`app/(tabs)/ops.tsx`) — NEW FILE

| Sub-tab | Source |
|---------|--------|
| **Machinery** | `app/(tabs)/maquinaria.tsx` (imported as component) |
| **Workers** | `app/(tabs)/trabajadores.tsx` (imported as component) |
| **Processing** | `app/(tabs)/procesado.tsx` (imported as component) |
| **Power** | `ElectricitySection` extracted from `gestion.tsx` |
| **Seed Lab** | `SeedLabScreen` extracted from `granja.tsx` |

### 📈 Market (`app/(tabs)/market.tsx`)

| Sub-tab | Source |
|---------|--------|
| **Prices** | `MarketPricesSection` — extracted from `economia.tsx` (was "market" sub-tab) |
| **Economy** | `EconomyStatsSection` — extracted from `economia.tsx` (charts, revenue, futures, supply) |
| **Auction** | `app/(tabs)/subasta.tsx` (imported as component) |
| **Shop** | `app/(tabs)/tienda.tsx` + `SeedMarketSection` (from `gestion.tsx`) merged |
| **Contracts** | `ContractsSection` extracted from `oficina.tsx` |
| **Selling*** | `AutoSellSection` — extracted from `economia.tsx` (autosell / dispatch) |

> *\*"Selling" = bulk dispatch / autosell / orders. Extracted from economia's existing "autosell" and "orders" sub-tabs. If those sections are thin, merge into Shop as a "Sell Inventory" card group instead of a standalone sub-tab.*

### 🏦 Office (`app/(tabs)/office.tsx`)

| Sub-tab | Source |
|---------|--------|
| **Dashboard** | `DashboardSection` extracted from `gestion.tsx` |
| **Banking** | `BankingSection` extracted from `oficina.tsx` |
| **Insurance** | `InsuranceSection` extracted from `oficina.tsx` |
| **Co-op** | `CoopSection` extracted from `oficina.tsx` |
| **Rivals** | `CompetitorsSection` extracted from `oficina.tsx` |
| **Achievements** | Merge: `MilestonesSection` (from `oficina.tsx`) + `app/(tabs)/logros.tsx` |
| **Guide** | `Encyclopedia` component (from `gestion.tsx`) |
| **Settings** | `SettingsSection` extracted from `gestion.tsx` |

---

## 4. File Restructuring

### 4a. Rename / Replace

| Old Path | New Path | Action |
|----------|----------|--------|
| `app/(tabs)/granja.tsx` | `app/(tabs)/farm.tsx` | Rewrite as composite |
| `app/(tabs)/mercado.tsx` | `app/(tabs)/market.tsx` | Rewrite as composite |
| `app/(tabs)/gestion.tsx` | `app/(tabs)/office.tsx` | Rewrite as composite |
| `app/(tabs)/fabrica.tsx` | — | **Delete** (Processing moves to Ops) |
| `app/(tabs)/oficina.tsx` | — | **Delete** (split into components) |

### 4b. Extract to Components

Extract these inline sections into standalone components so they can be imported by multiple composites:

```
components/
  farm/
    HenilAndBuildingsSection.tsx   (from gestion.tsx)
  ops/
    ElectricitySection.tsx         (from gestion.tsx)
    SeedLabScreen.tsx              (from granja.tsx)
  market/
    MarketPricesSection.tsx        (from economia.tsx — "market" tab)
    EconomyStatsSection.tsx        (from economia.tsx — "stats" + "futures" + "supply")
    AutoSellSection.tsx            (from economia.tsx — "autosell" + "orders")
    ContractsSection.tsx           (from oficina.tsx)
    SeedMarketSection.tsx          (from gestion.tsx)
  office/
    DashboardSection.tsx           (from gestion.tsx)
    BankingSection.tsx             (from oficina.tsx)
    InsuranceSection.tsx           (from oficina.tsx)
    CoopSection.tsx                (from oficina.tsx)
    CompetitorsSection.tsx         (from oficina.tsx)
    MilestonesSection.tsx          (from oficina.tsx)
    SettingsSection.tsx            (from gestion.tsx)
```

> **Note:** If a section is only used once, extraction is optional. The rule is: if it lives in a file that's being deleted, it MUST be extracted.

### 4c. Hidden Screens Become Components

These files currently exist as hidden tabs (`href: null`) in `_layout.tsx`. They become regular components imported by composites:

- `app/(tabs)/tierras.tsx` → stays as file, imported by `farm.tsx`
- `app/(tabs)/animales.tsx` → stays as file, imported by `farm.tsx`
- `app/(tabs)/maquinaria.tsx` → stays as file, imported by `ops.tsx`
- `app/(tabs)/trabajadores.tsx` → stays as file, imported by `ops.tsx`
- `app/(tabs)/procesado.tsx` → stays as file, imported by `ops.tsx`
- `app/(tabs)/subasta.tsx` → stays as file, imported by `market.tsx`
- `app/(tabs)/tienda.tsx` → stays as file, imported by `market.tsx`
- `app/(tabs)/economia.tsx` → **split** into components, file deleted
- `app/(tabs)/clima.tsx` → stays as file, imported by `farm.tsx`
- `app/(tabs)/calendario.tsx` → stays as file, imported by `farm.tsx`
- `app/(tabs)/agua.tsx` → stays as file, imported by `farm.tsx`
- `app/(tabs)/logros.tsx` → content merged into `Achievements` sub-tab, file deleted
- `app/(tabs)/seguros.tsx` → doesn't exist, just remove from `_layout.tsx`

### 4d. `_layout.tsx` Changes

```tsx
// New structure — 4 navigable tabs + custom tab bar
<Tabs tabBar={props => <CustomTabBar {...props} />}>
  <Tabs.Screen name="farm"   options={{ title: 'Farm' }} />
  <Tabs.Screen name="ops"    options={{ title: 'Ops' }} />
  <Tabs.Screen name="market" options={{ title: 'Market' }} />
  <Tabs.Screen name="office" options={{ title: 'Office' }} />
</Tabs>
```

Remove all `href: null` hidden screens. No more hidden tab registrations.

---

## 5. Custom Tab Bar (`components/CustomTabBar.tsx`)

### Props

```ts
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Receives standard BottomTabBarProps from Expo Router Tabs
```

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  [Farm]  [Ops]  [  ▶  ]  [Market]  [Office]  │
└────────────────────────────────────────────────────────────┘
         ↑ 56px circle, elevated
```

### Behavior

- **Farm, Ops, Market, Office** tabs: standard navigation. On press, call `navigation.navigate(route.name)`.
- **Center ▶ button**: on press, call `useGameStore.getState().advanceDay()`.
  - Haptic feedback on press (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`)
  - Visual feedback: scale down to 0.92 on press, spring back
  - Optional long-press: reveal skip-day popover (+5 / +10 / +30)
- **Badge dots**: small red circle top-right of tab icon when badge count > 0
- **Active indicator**: top border 2px line in `theme.accent` on active tab

### Skip-Day Popover

Not implemented. Center button is single-tap only for v1.

---

## 6. GameHUD Changes

Since Advance Day moves to the tab bar center button:

### Remove from GameHUD
- Advance Day button (▶)
- Skip buttons (+5, +10, +30) — **removed entirely**

### Updated GameHUD Row 2

```
$12.4k     $8.1k      −$240
CASH       SAVINGS    BURN/D
```

Just the 3 stats, left-aligned. Right side is now empty (cleaner). The stats remain tappable for detail (if they aren't already).

---

## 7. Badge Updates

| Tab | Badge Logic |
|-----|-------------|
| **Farm** | Count of parcels with `day >= plantedDay + growthDays` (same as current `farmBadge`) |
| **Ops** | Count of processing batches completed + machinery needing service (new) |
| **Market** | Count of unread contract offers + auction lots ending soon (new) |
| **Office** | `urgentLoans + urgentContracts` (same as current `officeBadge`) |

---

## 8. Visual Improvements Beyond Navigation

### 8a. Screen Entry Animations

Sub-tab switches within a composite should fade the content area (150ms opacity crossfade). No layout animation — just opacity to avoid jank.

### 8b. Empty States

Every list screen must have a consistent empty state:

```tsx
<EmptyState
  icon="🌾"        // or relevant emoji
  title="No crops planted"
  subtitle="Buy seeds from the Market → Shop and plant them in Fields."
  action={{ label: 'Go to Shop', onPress: () => router.push('/(tabs)/market', { tab: 'shop' }) }}
/>
```

- Icon: 48px, `C.textFaint`
- Title: `F.size.lg`, `C.text`, bold
- Subtitle: `F.size.sm`, `C.textMuted`
- Action: `ActionButton` Ghost variant

### 8c. Hero Cards

Composite screens get a "hero" summary card at the top (below sub-tabs, above content):

- **Farm**: Total hectares, active crops, animals count, water status
- **Ops**: Processing batches active, machinery status, worker count, power surplus/deficit
- **Market**: Cash on hand, today's top price crop, active contracts count
- **Office**: Net worth, reputation tier, season progress %, top rival name

> **Note:** Dashboard already does this for Office. Farm/Ops/Market should get equivalent hero cards for consistency.

### 8d. Pull-to-Refresh

Add `RefreshControl` to all ScrollView-based screens. Currently most screens don't refresh. The refresh action can re-sync store state or just be visual feedback (since the store is synchronous).

---

## 9. Implementation Order

### Phase 1 — Foundation (no visual changes yet)
1. **Extract components** from `gestion.tsx` and `oficina.tsx` into `components/*`
2. **Split `economia.tsx`** into `MarketPricesSection`, `EconomyStatsSection`, `AutoSellSection`
3. **Merge `logros.tsx`** into `MilestonesSection` → rename to `AchievementsSection`
4. **Test:** All existing screens still work (no file deletions yet)

### Phase 2 — New Composites
5. Create `app/(tabs)/farm.tsx` with 6 sub-tabs
6. Create `app/(tabs)/ops.tsx` with 5 sub-tabs
7. Create `app/(tabs)/market.tsx` with 6 sub-tabs
8. Create `app/(tabs)/office.tsx` with 8 sub-tabs
9. **Test:** All new composites render correctly

### Phase 3 — Custom Tab Bar
10. Create `components/CustomTabBar.tsx`
11. Rewrite `app/(tabs)/_layout.tsx`:
    - Use custom tab bar
    - Register only 4 tabs
    - Remove all hidden `href: null` screens
    - Wire badge logic
12. **Test:** Navigation works, center button advances day

### Phase 4 — Cleanup
13. Delete `granja.tsx`, `mercado.tsx`, `gestion.tsx`, `fabrica.tsx`, `oficina.tsx`, `economia.tsx`, `logros.tsx`
14. Update GameHUD (remove Advance button)
15. Add empty states and hero cards
16. Final test pass

---

## 10. Decisions (Resolved)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | **Skip buttons** | ❌ Removed entirely. GameHUD has zero day controls. |
| 2 | **Selling sub-tab** | ✅ Standalone sub-tab in Market. |
| 3 | **Prices vs Economy** | ✅ Promote Prices + Economy + Selling from `economia.tsx`. Fold orders/stats/futures into Economy. |
| 4 | **Center button long-press** | ❌ No popover for v1. Single tap only. |
| 5 | **Ops badge** | ✅ Processing batches completed + machinery needing service. |
| 6 | **Market badge** | ✅ Unread contract offers + auction lots ending soon. |

---

## 11. Out of Scope

- Animation system overhaul (existing Reanimated usage stays)
- New game features (just reorganization)
- Store schema changes (unless required for new badge logic)
- Custom fonts or icon packs (keep system fonts + emoji)
- Responsive/tablet layout (still mobile-first)

---

## 12. Files Touch Summary

| Action | Count | Files |
|--------|-------|-------|
| **New** | 5 | `farm.tsx`, `ops.tsx`, `market.tsx`, `office.tsx`, `CustomTabBar.tsx` |
| **Extract** | 12+ | Various sections → `components/*` |
| **Delete** | 7 | `granja.tsx`, `mercado.tsx`, `gestion.tsx`, `fabrica.tsx`, `oficina.tsx`, `economia.tsx`, `logros.tsx` |
| **Rewrite** | 2 | `_layout.tsx`, `GameHUD.tsx` |
| **Keep** | 8 | `tierras.tsx`, `animales.tsx`, `maquinaria.tsx`, `trabajadores.tsx`, `procesado.tsx`, `subasta.tsx`, `tienda.tsx`, `clima.tsx`, `calendario.tsx`, `agua.tsx` |
