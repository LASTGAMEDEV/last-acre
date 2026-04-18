# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Granja Tycoon's visual design with a forest-green token system, compact unified HUD with integrated day controls, scrollable pill sub-tabs, and consistent card/row patterns across all 17 screens.

**Architecture:** Token-first — establish `S`, `F`, `R`, `MIN_TOUCH` exports and update the `C` palette in `constants/theme.ts`, then update all components and screens to consume them. New shared components (`SubTabBar`, rewritten `GameHUD`) replace ad-hoc implementations. No game logic changes.

**Tech Stack:** React Native · Expo Router · TypeScript · StyleSheet.create · Zustand store (read-only from UI)

**Dev server:** Run `CI=1 npx expo start --web` from the project root, open `http://localhost:8081/(tabs)/granja` to verify visually. There is no test suite.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `constants/theme.ts` | Add S/F/R/MIN_TOUCH tokens, update C palette to forest green, update SEASON_THEME |
| Rewrite | `components/GameHUD.tsx` | 2-row compact HUD with integrated Advance + Skip + weather pill |
| Modify | `app/(tabs)/_layout.tsx` | Remove floating Advance/Skip button |
| Create | `components/SubTabBar.tsx` | Scrollable pill sub-tab bar shared by all combined-tab screens |
| Modify | `app/(tabs)/granja.tsx` | Use SubTabBar, apply token colors |
| Modify | `app/(tabs)/mercado.tsx` | Use SubTabBar, apply token colors |
| Modify | `app/(tabs)/gestion.tsx` | Use SubTabBar, apply token colors |
| Modify | `app/(tabs)/tierras.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/animales.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/maquinaria.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/economia.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/tienda.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/subasta.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/oficina.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/procesado.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/clima.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/trabajadores.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/calendario.tsx` | Remove ScreenHeader, apply token colors |
| Modify | `app/(tabs)/logros.tsx` | Remove ScreenHeader, apply token colors |
| Delete | `components/ScreenHeader.tsx` | Replaced by inline title text in each screen |

---

## Task 1: Update Token System

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Add S, F, R, MIN_TOUCH exports and update C palette**

Open `constants/theme.ts`. Replace the `C` export and add the new token exports. Keep `SEASON_THEME`, `TIER_COLOR`, `Colors`, `Fonts` unchanged (only update spring `tabBar`/`badge`):

```ts
// ── Spacing scale ─────────────────────────────────────────────────────────────
export const S = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;

// ── Font scale ────────────────────────────────────────────────────────────────
export const F = {
  size: {
    xs:    10,
    sm:    12,
    md:    13,
    lg:    14,
    xl:    16,
    xxl:   18,
    title: 22,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    bold:   '600' as const,
    heavy:  'bold' as const,
  },
} as const;

// ── Border radii ──────────────────────────────────────────────────────────────
export const R = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  pill: 999,
} as const;

// ── Touch target minimum (mobile) ─────────────────────────────────────────────
export const MIN_TOUCH = 44;
```

Replace the `C` export:

```ts
export const C = {
  // Backgrounds
  bg:        '#0d1a0d',
  bgCard:    '#142014',
  bgDeep:    '#0a1a0a',
  bgInput:   '#0a1a0a',

  // Text
  text:      '#c8e6c9',
  textDim:   '#81c784',
  textMuted: '#6a9a6a',
  textFaint: '#4a6e4a',

  // Legacy aliases (backwards compat — same values)
  gold:      '#c8e6c9',
  goldDim:   '#81c784',
  white:     '#ffffff',
  muted:     '#6a9a6a',
  faint:     '#4a6e4a',
  dim:       '#81c784',

  // Semantic
  green:     '#4caf50',
  greenDark: '#2e7d32',
  greenSoft: '#81c784',
  red:       '#ef5350',
  redDark:   '#b71c1c',
  amber:     '#ffa726',
  blue:      '#2196f3',
  purple:    '#9c27b0',
  orange:    '#ff9800',
  gray:      '#9e9e9e',

  // Dividers
  divider:   '#1b3a1b',
  border:    '#1b3a1b',
};
```

Update only the `spring` entry in `SEASON_THEME` (other seasons unchanged):

```ts
spring: {
  icon:       '🌸',
  accent:     '#4caf50',
  accentSoft: '#0d1f0d',
  tabBar:     '#0a1a0a',   // was '#0a1a0a' — no change needed
  badge:      '#1b3a1b',   // was '#1b3a1b' — no change needed
  badgeText:  '#81c784',
},
```

> Spring values already match the green palette — verify the other seasons' `tabBar` colors still look correct when toggled.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit
```

Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: add S/F/R/MIN_TOUCH tokens, update C palette to forest green"
```

---

## Task 2: Create SubTabBar Component

**Files:**
- Create: `components/SubTabBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/SubTabBar.tsx
import React, { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C, S, F, R, MIN_TOUCH } from '../constants/theme';

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
}

export default function SubTabBar({ tabs, active, onSelect }: Props) {
  const { day } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];
  const scrollRef = useRef<ScrollView>(null);

  // Scroll active tab into view
  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === active);
    if (idx > 1 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * 90, animated: true });
    }
  }, [active, tabs]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map(t => {
          const isActive = t.id === active;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => onSelect(t.id)}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: 'transparent', borderColor: C.textFaint, borderWidth: 1.5 },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: S.sm,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: S.md,
    gap: S.sm,
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: F.size.sm,
    fontWeight: F.weight.bold,
  },
  labelActive:   { color: '#fff' },
  labelInactive: { color: C.textMuted },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/SubTabBar.tsx
git commit -m "feat: add SubTabBar scrollable pill sub-tab component"
```

---

## Task 3: Rewrite GameHUD + Remove Floating Button

**Files:**
- Rewrite: `components/GameHUD.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Rewrite GameHUD.tsx**

Replace the entire file:

```tsx
// components/GameHUD.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { WeatherEvent } from '../engine/climate';
import { SEASON_THEME, C, S, F, R, MIN_TOUCH } from '../constants/theme';
import { playSound } from '../engine/sounds';
import { WORKER_TYPES } from '../data/workerTypes';
import { MACHINE_TYPES } from '../data/machineTypes';
import { BUILDING_TYPES } from '../data/buildingTypes';

const WARN_DAYS = 7;

const WEATHER_DISPLAY: Record<WeatherEvent, { icon: string; pillBg: string; textColor: string }> = {
  perfect:    { icon: '✨', pillBg: '#1b3a1b', textColor: '#81c784' },
  sunny:      { icon: '☀️', pillBg: '#3a2800', textColor: '#ffd54f' },
  cloudy:     { icon: '⛅', pillBg: '#1b2e2e', textColor: '#90caf9' },
  rain:       { icon: '🌧️', pillBg: '#001a3a', textColor: '#90caf9' },
  heavy_rain: { icon: '⛈️', pillBg: '#001a3a', textColor: '#64b5f6' },
  drought:    { icon: '🌵', pillBg: '#3a1500', textColor: '#ffb74d' },
  frost:      { icon: '❄️', pillBg: '#001a3a', textColor: '#b3e5fc' },
  hail:       { icon: '🌨️', pillBg: '#1a1a3a', textColor: '#90caf9' },
  wind:       { icon: '💨', pillBg: '#1b2e1b', textColor: '#c8e6c9' },
  fog:        { icon: '🌫️', pillBg: '#1a1a1a', textColor: '#aaaaaa' },
};

const EVENT_COLORS: Record<string, string> = { heat_wave: '#5a1a00', flood: '#001a3a', frost: '#001a3a' };
const EVENT_TEXT_COLORS: Record<string, string> = { heat_wave: '#ffb74d', flood: '#64b5f6', frost: '#b3e5fc' };
const EVENT_ICONS: Record<string, string> = { heat_wave: '🌡️', flood: '🌊', frost: '❄️' };
const EVENT_NAMES: Record<string, string> = { heat_wave: 'Heat Wave', flood: 'Flood', frost: 'Frost' };

export default function GameHUD() {
  const {
    money, day, savings, loans, contracts, seasonalEvent,
    farmName, workers, machines, buildings,
    advanceDay, advanceDays,
    todayWeather,
  } = useGameStore();

  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  const SEASON_DAYS = 90;
  const daysIntoSeason = (day % (SEASON_DAYS * 4)) % SEASON_DAYS;
  const daysLeftInSeason = SEASON_DAYS - daysIntoSeason;

  const hasTaller = (buildings ?? []).includes('bld_taller');
  const machineMaint = (machines ?? []).reduce((s, m) => {
    const t = MACHINE_TYPES.find(mt => mt.id === m.typeId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0) * (hasTaller ? 0.75 : 1.0);
  const buildingMaint = (buildings ?? []).reduce((s, bId) => {
    const t = BUILDING_TYPES.find(bt => bt.id === bId);
    return s + (t?.maintenancePerDay ?? 0);
  }, 0);
  const dailyWages = (workers ?? []).reduce((sum, w) => {
    const def = WORKER_TYPES.find(t => t.id === w.typeId);
    return sum + (def?.dailyWage ?? 0);
  }, 0);
  const dailyBurn = Math.round(dailyWages + machineMaint + buildingMaint);

  const urgentLoan = loans.find(l => !l.paid && !l.defaulted && l.payoffDay - day <= WARN_DAYS && l.payoffDay >= day);
  const urgentContract = contracts.find(c => !c.completed && !c.failed && c.deadlineDay - day <= WARN_DAYS && c.deadlineDay >= day);

  const weather = todayWeather ? WEATHER_DISPLAY[todayWeather.event] : null;

  const fmtMoney = (n: number) => {
    const abs = Math.abs(Math.round(n));
    return abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs}`;
  };

  return (
    <>
      <View style={[styles.hud, { backgroundColor: theme.tabBar, borderBottomColor: theme.accent + '33' }]}>

        {/* Row 1: Farm · Season · Weather · Day */}
        <View style={styles.row1}>
          <Text style={styles.farmName} numberOfLines={1}>🌿 {farmName ?? 'My Farm'}</Text>
          <View style={[styles.pill, { backgroundColor: theme.badge }]}>
            <Text style={styles.pillText}>{theme.icon} {season.charAt(0).toUpperCase() + season.slice(1)} · {daysLeftInSeason}d</Text>
          </View>
          {weather && (
            <View style={[styles.pill, { backgroundColor: weather.pillBg }]}>
              <Text style={[styles.pillText, { color: weather.textColor }]}>{weather.icon} {todayWeather!.event.replace('_', ' ')}</Text>
            </View>
          )}
          <Text style={styles.dayNum}>Day {day}</Text>
        </View>

        {/* Row 2: Stats · Advance · Skip */}
        <View style={styles.row2}>
          {/* Stats */}
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fmtMoney(money)}</Text>
            <Text style={styles.statLabel}>CASH</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: C.textDim }]}>{fmtMoney(savings.balance)}</Text>
            <Text style={styles.statLabel}>SAVINGS</Text>
          </View>
          {dailyBurn > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: C.red }]}>−{fmtMoney(dailyBurn)}</Text>
                <Text style={styles.statLabel}>BURN/D</Text>
              </View>
            </>
          )}

          <View style={{ flex: 1 }} />

          {/* Advance button */}
          <TouchableOpacity
            style={[styles.advanceBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
            onPress={() => { playSound('dayAdvance'); advanceDay(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.advanceDayNum}>Day {day}</Text>
            <Text style={styles.advanceLabel}>▶ Advance</Text>
          </TouchableOpacity>

          {/* Skip buttons */}
          <View style={styles.skipRow}>
            {([5, 10, 30] as const).map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.skipBtn, { borderColor: theme.accent }]}
                onPress={() => { playSound('dayAdvance'); advanceDays(n); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.skipLabel, { color: theme.accent }]}>+{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Seasonal event banner */}
      {seasonalEvent && (
        <View style={[styles.warnStrip, { backgroundColor: EVENT_COLORS[seasonalEvent.type] ?? '#1a1a00' }]}>
          <Text style={[styles.warnText, { color: EVENT_TEXT_COLORS[seasonalEvent.type] ?? '#ffb74d' }]}>
            {EVENT_ICONS[seasonalEvent.type]} {EVENT_NAMES[seasonalEvent.type]} · {Math.max(0, seasonalEvent.endsDay - day)}d remaining
          </Text>
        </View>
      )}

      {/* Deadline warnings */}
      {(urgentLoan || urgentContract) && (
        <View style={styles.warnStrip}>
          {urgentLoan && (
            <Text style={styles.warnText}>
              ⚠️ Loan due in {urgentLoan.payoffDay - day}d · ${Math.round(urgentLoan.totalOwed).toLocaleString()} owed
            </Text>
          )}
          {urgentContract && (
            <Text style={styles.warnText}>
              ⚠️ Contract deadline in {urgentContract.deadlineDay - day}d
            </Text>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hud: {
    borderBottomWidth: 1,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.sm,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: S.xs + 1,
  },
  farmName: {
    color: C.textMuted,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    flexShrink: 1,
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: S.sm - 1,
    paddingVertical: 2,
  },
  pillText: {
    color: C.textDim,
    fontSize: 9,
    fontWeight: F.weight.bold,
  },
  dayNum: {
    color: C.text,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    marginLeft: 'auto',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
  },
  stat: {
    flexDirection: 'column',
  },
  statValue: {
    color: C.text,
    fontSize: F.size.sm,
    fontWeight: F.weight.bold,
  },
  statLabel: {
    color: C.textFaint,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: C.divider,
    marginHorizontal: S.xs,
  },
  advanceBtn: {
    borderRadius: R.md,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  advanceDayNum: { color: '#fff', fontSize: 8, opacity: 0.8 },
  advanceLabel:  { color: '#fff', fontSize: F.size.xs, fontWeight: F.weight.heavy },
  skipRow: {
    flexDirection: 'row',
    gap: S.xs,
  },
  skipBtn: {
    borderWidth: 1,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipLabel: {
    fontSize: 9,
    fontWeight: F.weight.bold,
  },
  warnStrip: {
    backgroundColor: '#3a1a00',
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    gap: 2,
  },
  warnText: {
    color: '#ffb74d',
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
  },
});
```

- [ ] **Step 2: Remove floating button from `_layout.tsx`**

In `app/(tabs)/_layout.tsx`:

1. Remove the `Animated` import (no longer needed for pulse)
2. Remove the `pulse` ref and its `useEffect`
3. Remove the `advanceDay`, `advanceDays` destructure from `useGameStore()`  
4. Remove the `playSound` import if not used elsewhere in the file
5. Remove the entire `<Animated.View style={[styles.advanceBtnWrap, ...]}>` block and its children
6. Remove the `advanceBtnWrap`, `advanceBtn`, `advanceDay`, `advanceLabel`, `skipRow`, `skipBtn`, `skipLabel` entries from the `StyleSheet`

The `advanceDay`/`advanceDays` actions are now called inside `GameHUD.tsx`.

- [ ] **Step 3: Start dev server and verify**

```bash
CI=1 npx expo start --web
```

Open `http://localhost:8081/(tabs)/granja`. Verify:
- HUD shows 2 rows: farm/season/weather/day on top, stats + Advance + +5/+10/+30 on bottom
- No floating button overlapping content
- Green color palette applied

- [ ] **Step 4: Commit**

```bash
git add components/GameHUD.tsx app/(tabs)/_layout.tsx
git commit -m "feat: compact 2-row HUD with integrated day controls, remove floating button"
```

---

## Task 4: Update granja.tsx

**Files:**
- Modify: `app/(tabs)/granja.tsx`

- [ ] **Step 1: Replace tab bar with SubTabBar**

At the top of `granja.tsx`, add the import:
```tsx
import SubTabBar from '../../components/SubTabBar';
```

Remove the `import { SEASON_THEME } from '../../constants/theme'` if only used for tab bar (keep if used elsewhere). Add `S, F, R, C` to the theme import.

Find the `TABS` constant — it already exists. Keep it as-is.

Find the `<View style={styles.tabBar}>` block (the block that maps `TABS` to `TouchableOpacity`). Replace the entire block with:

```tsx
<SubTabBar tabs={TABS} active={tab} onSelect={setTab} />
```

Remove `styles.tabBar`, `styles.tabBtn`, `styles.tabBtnActive`, `styles.tabBtnText`, `styles.tabBtnTextActive` from the `StyleSheet`.

Update the outer container `backgroundColor` to use `C.bg`:
```tsx
container: { flex: 1, backgroundColor: C.bg },
```

- [ ] **Step 2: Verify**

Open `http://localhost:8081/(tabs)/granja`. Confirm:
- 5 sub-tabs appear as scrollable pills (Fields, Animals, Machinery, Workers, Seed Lab)
- Active pill is filled green, inactive pills have outline
- No compression — they scroll if needed

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/granja.tsx"
git commit -m "feat: use SubTabBar in Farm screen"
```

---

## Task 5: Update mercado.tsx

**Files:**
- Modify: `app/(tabs)/mercado.tsx`

- [ ] **Step 1: Replace tab bar with SubTabBar**

```tsx
import SubTabBar from '../../components/SubTabBar';
import { C } from '../../constants/theme';
```

Replace `<View style={styles.tabBar}>` block with:
```tsx
<SubTabBar tabs={TABS} active={tab} onSelect={setTab} />
```

Update container:
```tsx
container: { flex: 1, backgroundColor: C.bg },
```

Remove `styles.tabBar`, `styles.tabBtn`, `styles.tabBtnActive`, `styles.tabBtnText`, `styles.tabBtnTextActive`.

- [ ] **Step 2: Verify**

Open `http://localhost:8081/(tabs)/mercado`. Confirm Economy/Auction/Store pills appear and switch screens correctly.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/mercado.tsx"
git commit -m "feat: use SubTabBar in Market screen"
```

---

## Task 6: Update gestion.tsx

**Files:**
- Modify: `app/(tabs)/gestion.tsx`

`gestion.tsx` has 7 tabs: `'dashboard' | 'office' | 'calendar' | 'settings' | 'guide' | 'seeds' | 'henil'`

The `TABS` constant is at line 1120:
```ts
const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'dashboard', label: '🏠 Home' },
  { id: 'office',    label: '📋 Office' },
  { id: 'calendar',  label: '📅 Calendar' },
  { id: 'seeds',     label: '🌱 Seeds' },
  { id: 'henil',     label: '🌿 Henil' },
  { id: 'settings',  label: '⚙️ Settings' },
  { id: 'guide',     label: '📖 Guide' },
];
```

- [ ] **Step 1: Replace tab bar with SubTabBar**

Add import:
```tsx
import SubTabBar from '../../components/SubTabBar';
import { C } from '../../constants/theme';
```

Find the `<View style={styles.tabBar}>` block (around line 1135) and replace with:
```tsx
<SubTabBar tabs={TABS} active={tab} onSelect={setTab} />
```

Update container:
```tsx
container: { flex: 1, backgroundColor: C.bg },
```

Remove `styles.tabBar`, `styles.tabBtn`, `styles.tabBtnActive`, `styles.tabBtnText`, `styles.tabBtnTextActive`.

- [ ] **Step 2: Verify**

Open `http://localhost:8081/(tabs)/gestion`. Confirm all 7 tabs scroll horizontally as pills and switch content correctly.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/gestion.tsx"
git commit -m "feat: use SubTabBar in Office screen"
```

---

## Task 7: Remove ScreenHeader — Batch (Simple Screens)

These screens have minimal custom content and only need ScreenHeader removed. Handle them all in one task.

**Files:**
- `app/(tabs)/clima.tsx` (line 64)
- `app/(tabs)/trabajadores.tsx` (line 74)
- `app/(tabs)/maquinaria.tsx` (line 343)
- `app/(tabs)/calendario.tsx` (line 144)
- `app/(tabs)/logros.tsx` (line 123)

For **each** of these files:

- [ ] **Step 1: Remove ScreenHeader from cada archivo**

Pattern to apply in each file:

1. Remove: `import ScreenHeader from '../../components/ScreenHeader';`
2. Add to the theme import: `C, S, F` (if not already imported)
3. Find `<ScreenHeader title="X" />` and replace with:
```tsx
<Text style={styles.screenTitle}>X</Text>
```
4. Add to the `StyleSheet`:
```ts
screenTitle: {
  color: C.text,
  fontSize: F.size.xl,
  fontWeight: F.weight.bold,
  paddingHorizontal: S.md,
  paddingTop: S.sm,
  paddingBottom: S.xs,
},
```
5. Update the outer container `backgroundColor` to `C.bg`

Specific titles:
- `clima.tsx` → `"Weather"`
- `trabajadores.tsx` → `"Staff"`
- `maquinaria.tsx` → `"Machinery"`
- `calendario.tsx` → `"Calendar"`
- `logros.tsx` → `"Achievements"`

- [ ] **Step 2: Verify**

Cycle through `http://localhost:8081/(tabs)/granja` (Workers, Machinery sub-tabs) and `http://localhost:8081/(tabs)/gestion` (Calendar, Guide tabs). Confirm no duplicate season/day header, and the green background is applied.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/clima.tsx" "app/(tabs)/trabajadores.tsx" "app/(tabs)/maquinaria.tsx" "app/(tabs)/calendario.tsx" "app/(tabs)/logros.tsx"
git commit -m "feat: remove ScreenHeader from simple screens, apply green tokens"
```

---

## Task 8: Remove ScreenHeader — Complex Screens

**Files:**
- `app/(tabs)/tierras.tsx` (line 417)
- `app/(tabs)/animales.tsx` (line 207)
- `app/(tabs)/economia.tsx` (line 276)
- `app/(tabs)/tienda.tsx` (line 394)
- `app/(tabs)/subasta.tsx` (lines 34, 89)
- `app/(tabs)/oficina.tsx` (line 1181)
- `app/(tabs)/procesado.tsx` (line 65)

- [ ] **Step 1: Remove ScreenHeader from each file**

Apply the same pattern as Task 7 for each file:

1. Remove the `import ScreenHeader from '../../components/ScreenHeader';` line
2. Replace each `<ScreenHeader title="X" />` with `<Text style={styles.screenTitle}>X</Text>`
3. Add `screenTitle` to the StyleSheet:
```ts
screenTitle: {
  color: C.text,
  fontSize: F.size.xl,
  fontWeight: F.weight.bold,
  paddingHorizontal: S.md,
  paddingTop: S.sm,
  paddingBottom: S.xs,
},
```
4. Update container `backgroundColor` to `C.bg`

Specific titles:
- `tierras.tsx` → `"My Fields"`
- `animales.tsx` → `"Animals"`
- `economia.tsx` → `"Economy"`
- `tienda.tsx` → `"Shop"`
- `subasta.tsx` → Two usages. Line 34 is `"Auction House"`. Line 89 has a dynamic title — replace it with:
```tsx
<Text style={styles.screenTitle}>
  {view === 'land' ? '🏡 Land Auction' : view === 'animal' ? '🐄 Animals' : view === 'crop' ? '🌾 Crops' : '⚙️ Machinery'}
</Text>
```
- `oficina.tsx` → `"My Office"`
- `procesado.tsx` → Has `title` and `subtitle` props. Replace with:
```tsx
<View>
  <Text style={styles.screenTitle}>Processing</Text>
  <Text style={styles.screenSubtitle}>Transform raw materials into higher-value products</Text>
</View>
```
Add to StyleSheet:
```ts
screenSubtitle: {
  color: C.textMuted,
  fontSize: F.size.xs,
  paddingHorizontal: S.md,
  paddingBottom: S.xs,
},
```

- [ ] **Step 2: Verify**

Navigate through Market → Economy, Market → Auction, Market → Store, Farm → Fields, Farm → Animals. Confirm no ScreenHeader duplication.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/tierras.tsx" "app/(tabs)/animales.tsx" "app/(tabs)/economia.tsx" "app/(tabs)/tienda.tsx" "app/(tabs)/subasta.tsx" "app/(tabs)/oficina.tsx" "app/(tabs)/procesado.tsx"
git commit -m "feat: remove ScreenHeader from complex screens, apply green tokens"
```

---

## Task 9: Apply Token Colors to All Screens

Now that ScreenHeader is gone and SubTabBar is in place, do a color/spacing pass on all screens to replace hardcoded hex values with `C.*`, `S.*`, `F.*`, `R.*` tokens.

**Files:** All 17 screen files + `components/DaySummaryModal.tsx`, `components/MilestonePopup.tsx`, `components/EventBanner.tsx`

- [ ] **Step 1: Global find-and-replace for common hardcoded values**

The most common hardcoded values and their token replacements:

| Hardcoded | Token |
|-----------|-------|
| `'#1a1a2e'` | `C.bg` |
| `'#16213e'` | `C.bgCard` |
| `'#0f1f3d'` | `C.bgDeep` |
| `'#0a1628'` | `C.bg` |
| `'#0d1117'` | `C.bgInput` |
| `'#e8d5a3'` | `C.text` |
| `'#c8a96a'` | `C.textDim` |
| `'#888888'` | `C.textMuted` |
| `'#555555'` | `C.textFaint` |
| `'#1e1e3a'` | `C.divider` |
| `'#222222'` | `C.border` |

Do this file by file. For each screen:
1. Import `S, F, R` from `'../../constants/theme'` (add to existing import)
2. Replace hardcoded `backgroundColor`, `color`, `borderColor` values with token equivalents using the table above
3. Replace hardcoded `padding: 12` with `S.md`, `padding: 8` with `S.sm`, `padding: 16` with `S.lg`, `gap: 6` with `S.sm`, `gap: 8` with `S.sm`
4. Replace hardcoded `fontSize: 10` with `F.size.xs`, `fontSize: 12` with `F.size.sm`, `fontSize: 14` with `F.size.lg`
5. Replace hardcoded `borderRadius: 8` with `R.md`, `borderRadius: 6` with `R.sm`, `borderRadius: 4` with `R.xs`

> **Note:** Do NOT replace colors on chart SVG elements (Polyline, Rect, Line in economia.tsx) — SVG attributes don't use StyleSheet. Leave SVG fill/stroke values as-is.

> **Note:** Do NOT change `TIER_COLORS` hardcoded values — tier colors are part of game data, not UI chrome.

> **GameRow pattern:** Where a screen has a list of items (crops, animals, prices, workers, machines), update each list item's markup to match the GameRow structure: `[icon 22px] | [title + optional progress bar + subtitle] | [value]` in a `bgCard` container with `borderRadius: R.md`, `minHeight: MIN_TOUCH`. This improves readability and touch targets across the board. Do this screen-by-screen alongside the token replacement.

- [ ] **Step 2: Verify green palette is consistent**

Run the dev server and click through all 5 main tabs and their sub-tabs. Every background should be dark green (`#0d1a0d`), cards should be `#142014`. No leftover navy blue backgrounds.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/." components/DaySummaryModal.tsx components/MilestonePopup.tsx components/EventBanner.tsx
git commit -m "feat: apply S/F/R/C tokens across all screens"
```

---

## Task 10: Delete ScreenHeader

**Files:**
- Delete: `components/ScreenHeader.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "ScreenHeader" app/ components/
```

Expected: no output. If any files still reference it, fix them first.

- [ ] **Step 2: Delete the file**

```bash
rm components/ScreenHeader.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: delete ScreenHeader component (replaced by inline title text)"
```

---

## Task 11: Final Visual QA Pass

- [ ] **Step 1: Start dev server**

```bash
CI=1 npx expo start --web
```

- [ ] **Step 2: Checklist**

Navigate to each screen and verify:

| Check | Pass? |
|-------|-------|
| HUD shows 2 compact rows with farm/season/weather/day | |
| HUD row 2 shows cash/savings/burn + Advance + +5/+10/+30 | |
| No floating button overlapping content on any tab | |
| Farm tab: 5 sub-tabs scroll as pills, no compression | |
| Market tab: 3 sub-tabs as pills | |
| Office tab: 7 sub-tabs scroll as pills | |
| No screen shows ScreenHeader (duplicate season/day) | |
| All backgrounds are dark green, not navy | |
| Cards use `#142014` bgCard | |
| Tier color pills (D/C/B/A/S) still display correctly | |
| SVG charts in Economy tab still render | |
| Advance and Skip buttons work correctly | |
| Season change (advance to day 91) shifts accent color | |

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: design system complete — green tokens, compact HUD, scrollable sub-tabs"
```
