# UI Overhaul — Clean Modern Dark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the game's flat green-tinted UI with a clean, modern dark design system applied consistently across every screen.

**Architecture:** All colour, spacing, and radius values flow from `constants/theme.ts`. New shared primitives (`Card`, `Button`, `Badge`) in `components/ui/` are used by every screen. Visual changes only — no game logic is touched.

**Tech Stack:** React Native 0.81 · Expo 54 · TypeScript · Zustand (store additions for checklist only) · StyleSheet API

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `constants/theme.ts` | Modify | New colour tokens, typography additions |
| `components/ui/Card.tsx` | Create | Shared card primitive |
| `components/ui/Button.tsx` | Create | Shared button primitive |
| `components/ui/Badge.tsx` | Create | Shared badge/chip primitive |
| `components/CustomTabBar.tsx` | Modify | Icon + label tabs, better active state |
| `components/SubTabBar.tsx` | Modify | Pill style with icons, new active fill |
| `components/TutorialModal.tsx` | Modify | Apply new theme tokens throughout |
| `components/tutorial/DayOneChecklist.tsx` | Create | Persistent first-week checklist |
| `components/GameHUD.tsx` | Modify | Navy base, token-driven colours |
| `components/HintCard.tsx` | Modify | Navy bg, amber left border |
| `store/useGameStore.ts` | Modify | Add `dayOneChecklist` state + actions |
| `app/(tabs)/farm.tsx` | Modify | Sub-tab spacing, screen header |
| `app/(tabs)/_tierras.tsx` | Modify | Map cells, cards, buttons, action panel |
| `app/(tabs)/market.tsx` | Modify | Price cards, section headers |
| `app/(tabs)/ops.tsx` | Modify | Job cards, progress bars |
| `app/(tabs)/office.tsx` | Modify | Stat rows, section dividers |
| `app/(tabs)/_animales.tsx` | Modify | Animal cards, gene display |

---

## Task 1: Theme Tokens

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Replace the `C` palette**

Open `constants/theme.ts`. Replace the entire `C` export with:

```ts
export const C = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:          '#0a0e1a',   // screen background
  bgCard:      '#111827',   // card / panel surface
  bgDeep:      '#060a14',   // deepest layer (modals, inputs)
  bgInput:     '#0f1729',   // input fields
  bgElevated:  '#1e293b',   // elevated cards, selected states
  surface:     '#162032',   // between bgCard and bgElevated

  // ── Text ─────────────────────────────────────────────────────
  text:        '#f1f5f9',   // primary
  textDim:     '#94a3b8',   // secondary
  textMuted:   '#64748b',   // labels, captions
  textFaint:   '#475569',   // placeholder, disabled

  // ── Legacy aliases (keep for backwards compat) ───────────────
  gold:        '#f1f5f9',
  goldDim:     '#94a3b8',
  white:       '#ffffff',
  muted:       '#64748b',
  faint:       '#475569',
  dim:         '#94a3b8',

  // ── Semantic ─────────────────────────────────────────────────
  green:       '#22c55e',
  greenDark:   '#15803d',
  greenSoft:   '#86efac',
  amber:       '#f59e0b',
  amberDark:   '#b45309',
  amberSoft:   '#fcd34d',
  red:         '#ef4444',
  redDark:     '#991b1b',
  blue:        '#3b82f6',
  purple:      '#a855f7',
  orange:      '#f97316',
  gray:        '#9e9e9e',

  // ── Borders ──────────────────────────────────────────────────
  border:      '#1e293b',
  divider:     '#1e293b',
};
```

- [ ] **Step 2: Update border radius values**

```ts
export const R = {
  xs:   4,
  sm:   6,
  md:   10,   // was 8
  lg:   14,   // was 12
  xl:   20,   // was 16
  pill: 999,
} as const;
```

- [ ] **Step 3: Add `body` to font scale and `F.weight.heavy` alias**

In the `F` export, change:
```ts
size: {
  xs:    10,
  sm:    12,
  md:    13,
  body:  14,   // ADD — standard readable body size
  lg:    14,
  xl:    16,
  xxl:   18,
  title: 22,
},
```

- [ ] **Step 4: Update season theme backgrounds to navy base**

Replace the `SEASON_THEME` export with:

```ts
export const SEASON_THEME: Record<Season, {
  icon: string;
  accent: string;
  accentSoft: string;
  tabBar: string;
  badge: string;
  badgeText: string;
}> = {
  spring: {
    icon: '🌸',
    accent:     '#22c55e',
    accentSoft: '#0a1f0d',
    tabBar:     '#060e0a',
    badge:      '#0f2a14',
    badgeText:  '#86efac',
  },
  summer: {
    icon: '☀️',
    accent:     '#f59e0b',
    accentSoft: '#1a1200',
    tabBar:     '#0e0a00',
    badge:      '#2a1a00',
    badgeText:  '#fcd34d',
  },
  autumn: {
    icon: '🍂',
    accent:     '#f97316',
    accentSoft: '#1a0c00',
    tabBar:     '#0e0600',
    badge:      '#2a0f00',
    badgeText:  '#fdba74',
  },
  winter: {
    icon: '❄️',
    accent:     '#3b82f6',
    accentSoft: '#001525',
    tabBar:     '#00060e',
    badge:      '#001a2e',
    badgeText:  '#93c5fd',
  },
};
```

- [ ] **Step 5: Type-check**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | head -40
```

Expected: Any errors should be about missing properties like `C.bgElevated` not yet used — that's fine. Fix any actual type errors before proceeding.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add constants/theme.ts
git commit -m "feat(ui): new Clean Modern Dark theme tokens"
```

---

## Task 2: Shared Card Component

**Files:**
- Create: `components/ui/Card.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\components\ui"
```

- [ ] **Step 2: Write `components/ui/Card.tsx`**

```tsx
import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { C, R, S } from '../../constants/theme';

export type CardVariant = 'default' | 'elevated' | 'danger' | 'success' | 'warning' | 'info';

interface CardProps {
  variant?: CardVariant;
  style?: ViewStyle;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<CardVariant, { bg: string; border: string }> = {
  default:  { bg: C.bgCard,    border: C.border },
  elevated: { bg: C.bgElevated, border: 'transparent' },
  danger:   { bg: '#1a0808',   border: '#5a1a1a' },
  success:  { bg: '#081a0a',   border: '#1a5a1a' },
  warning:  { bg: '#1a1200',   border: '#5a3a00' },
  info:     { bg: '#080f1a',   border: '#1a3a5a' },
};

export default function Card({ variant = 'default', style, children }: CardProps) {
  const v = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.lg,
    borderWidth: 1,
    padding: S.md,
    marginBottom: S.sm,
  },
});
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add components/ui/Card.tsx
git commit -m "feat(ui): add shared Card component"
```

---

## Task 3: Shared Button Component

**Files:**
- Create: `components/ui/Button.tsx`

- [ ] **Step 1: Write `components/ui/Button.tsx`**

```tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { C, R, F, S } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: C.amberDark,  text: '#fff' },
  secondary: { bg: C.bgElevated, text: C.text,    border: C.border },
  danger:    { bg: C.redDark,    text: '#fff' },
  ghost:     { bg: 'transparent', text: C.textDim, border: C.border },
  success:   { bg: C.greenDark,  text: '#fff' },
};

const SIZE: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; minHeight: number }> = {
  sm: { paddingV: 6,  paddingH: 12, fontSize: F.size.sm,   minHeight: 32 },
  md: { paddingV: 10, paddingH: 16, fontSize: F.size.body, minHeight: 40 },
  lg: { paddingV: 14, paddingH: 20, fontSize: F.size.xl,   minHeight: 48 },
};

export default function Button({
  label, onPress, variant = 'primary', size = 'md', disabled = false, style, textStyle,
}: ButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: disabled ? C.bgElevated : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          minHeight: s.minHeight,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: s.fontSize, color: disabled ? C.textFaint : v.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: F.weight.bold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add components/ui/Button.tsx
git commit -m "feat(ui): add shared Button component"
```

---

## Task 4: Shared Badge Component

**Files:**
- Create: `components/ui/Badge.tsx`

- [ ] **Step 1: Write `components/ui/Badge.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { C, R, F } from '../../constants/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const VARIANT: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: { bg: '#0f2a14', text: C.greenSoft,  border: C.greenDark },
  warning: { bg: '#2a1a00', text: C.amberSoft,  border: C.amberDark },
  danger:  { bg: '#2a0808', text: '#fca5a5',    border: C.redDark },
  info:    { bg: '#08152a', text: '#93c5fd',    border: '#1e3a5a' },
  neutral: { bg: C.bgElevated, text: C.textDim, border: C.border },
  purple:  { bg: '#1a0a2a', text: '#d8b4fe',    border: '#6b21a8' },
};

export default function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const v = VARIANT[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    letterSpacing: 0.5,
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
git add components/ui/Badge.tsx
git commit -m "feat(ui): add shared Badge component"
```

---

## Task 5: Tab Bar Restyle

**Files:**
- Modify: `components/CustomTabBar.tsx`

The tab bar has 4 visible tabs (farm, ops, market, office) plus a centre Advance button. The current design shows text-only emoji labels. The new design shows a larger emoji icon above a clean text label, with a coloured top-line active indicator.

- [ ] **Step 1: Replace `CustomTabBar.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';
import { getSeason } from '../engine/climate';
import { SEASON_THEME, C, F, S } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

// Icon and display label per route name
const TAB_META: Record<string, { icon: string; label: string }> = {
  farm:   { icon: '🌾', label: 'Farm' },
  ops:    { icon: '⚙️', label: 'Ops' },
  market: { icon: '📊', label: 'Market' },
  office: { icon: '🏢', label: 'Office' },
  legado: { icon: '🏆', label: 'Legacy' },
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const advanceDay = useGameStore(s => s.advanceDay);
  const { day, parcels, loans, contracts } = useGameStore();
  const season = getSeason(day);
  const theme = SEASON_THEME[season];

  const cropsReady = parcels.filter(p => {
    if (!p.owned || !p.plantedCrop) return false;
    const ct = (require('../data/cropTypes').CROP_TYPES as any[]).find(
      (c: any) => c.id === p.plantedCrop!.cropId
    );
    return ct && day >= p.plantedCrop.plantedDay + ct.growthDays;
  }).length;

  const urgentLoans = loans.filter(
    l => !l.paid && !l.defaulted && l.payoffDay - day <= 7 && l.payoffDay >= day
  ).length;
  const urgentContracts = contracts.filter(
    c => !c.completed && !c.failed && c.deadlineDay - day <= 7 && c.deadlineDay >= day
  ).length;

  const badges: Record<string, number> = {
    farm:   cropsReady,
    office: urgentLoans + urgentContracts,
  };

  const visibleRoutes = state.routes.filter((_, i) => {
    const { options } = descriptors[state.routes[i].key];
    return (options as any).href !== null && (options as any).href !== undefined
      ? true
      : !['_agua','_animales','_calendario','_clima','_maquinaria',
          '_procesado','_subasta','_tienda','_tierras','_trabajadores'].includes(state.routes[i].name);
  }).slice(0, 4); // show max 4 tabs around centre button

  const leftRoutes  = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2, 4);

  function renderTab(route: typeof state.routes[0], index: number) {
    const globalIndex = state.routes.findIndex(r => r.key === route.key);
    const isFocused = state.index === globalIndex;
    const badge = badges[route.name] ?? 0;
    const meta = TAB_META[route.name] ?? { icon: '●', label: route.name };

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={styles.tab}
      >
        {/* Active top-line indicator */}
        {isFocused && (
          <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />
        )}

        {/* Icon */}
        <Text style={[styles.tabIcon, isFocused && { opacity: 1 }, !isFocused && { opacity: 0.45 }]}>
          {meta.icon}
        </Text>

        {/* Label */}
        <Text style={[styles.tabLabel, { color: isFocused ? theme.accent : C.textFaint }]}>
          {meta.label}
        </Text>

        {/* Badge */}
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const onAdvance = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* noop */ }
    advanceDay();
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.tabBar, borderTopColor: C.border }]}>
      {leftRoutes.map(r => renderTab(r, state.routes.findIndex(x => x.key === r.key)))}

      {/* Centre Advance Day button */}
      <TouchableOpacity style={styles.centerButton} onPress={onAdvance} activeOpacity={0.8}>
        <View style={[styles.centerCircle, { backgroundColor: theme.accent }]}>
          <Text style={styles.centerIcon}>▶</Text>
        </View>
        <Text style={[styles.centerLabel, { color: theme.accent }]}>Advance</Text>
      </TouchableOpacity>

      {rightRoutes.map(r => renderTab(r, state.routes.findIndex(x => x.key === r.key)))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 68,
    borderTopWidth: 1,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 62,
    paddingBottom: 2,
    paddingTop: 4,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: '15%',
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centerButton: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    marginBottom: 0,
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    marginTop: -18,
  },
  centerIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  centerLabel: {
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Type-check**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/CustomTabBar.tsx
git commit -m "feat(ui): restyle tab bar — icons + labels + active indicator"
```

---

## Task 6: SubTabBar Restyle

**Files:**
- Modify: `components/SubTabBar.tsx`

The sub-tab bar sits inside the Farm screen. Change from season-accent-filled active pill to a dark-elevated active chip. Keep the scroll-to-active logic unchanged.

- [ ] **Step 1: Replace styles and active pill logic in `SubTabBar.tsx`**

Replace the `return` block and `styles` in `components/SubTabBar.tsx`:

```tsx
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
                isActive ? styles.pillActive : styles.pillInactive,
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
```

Replace the `StyleSheet.create` block:

```ts
const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: S.md,
    gap: S.xs,
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: F.size.sm,
  },
  labelActive:   { color: C.text, fontWeight: F.weight.bold },
  labelInactive: { color: C.textMuted, fontWeight: F.weight.normal },
});
```

Also update the import at the top — add `R` and remove `MIN_TOUCH` if unused:

```ts
import { SEASON_THEME, C, S, F, R } from '../constants/theme';
```

Remove the `season` and `theme` variables since they're no longer used:

```ts
// Remove these two lines:
// const season = getSeason(day);
// const theme = SEASON_THEME[season];
```

If `day` is no longer needed after removing season, also remove:
```ts
// Remove: const day = useGameStore(s => s.day);
```

And remove unused imports: `getSeason`, `SEASON_THEME`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/SubTabBar.tsx
git commit -m "feat(ui): restyle SubTabBar — elevated active chip, cleaner inactive"
```

---

## Task 7: Tutorial Modal Restyle

**Files:**
- Modify: `components/TutorialModal.tsx`

The modal has good content but uses hardcoded colours (`#16213e`, `#e8d5a3`, `#0d1117`, etc.). Replace all hardcoded values with theme tokens. Do NOT change the step content or logic.

- [ ] **Step 1: Add theme imports**

At the top of `TutorialModal.tsx`, ensure this import exists:

```ts
import { C, F, R, S } from '../constants/theme';
```

- [ ] **Step 2: Update `styles` at the bottom of the file**

Replace the entire `styles` StyleSheet.create block:

```ts
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.lg,
  },
  card: {
    backgroundColor: C.bgCard,
    borderRadius: R.xl,
    padding: S.xl,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: C.border,
  },
  progressTrack: {
    height: 3,
    backgroundColor: C.bgDeep,
    borderRadius: 2,
    marginBottom: S.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: C.amber,
    borderRadius: 2,
  },
  stepCount: {
    color: C.textFaint,
    fontSize: F.size.xs,
    textAlign: 'right',
    marginBottom: S.md,
  },
  icon:     { fontSize: 38, textAlign: 'center', marginBottom: S.sm },
  title:    { color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy, textAlign: 'center', marginBottom: S.xs },
  subtitle: { color: C.textDim, fontSize: F.size.sm, textAlign: 'center', marginBottom: S.lg, lineHeight: 18 },
  visualBox: {
    backgroundColor: C.bgDeep,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
  },
  tipBox: {
    backgroundColor: '#0f1a0a',
    borderRadius: R.md,
    padding: S.md,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
    marginBottom: S.sm,
  },
  tipLabel: { color: C.amber, fontSize: F.size.xs, fontWeight: F.weight.bold, marginBottom: 3 },
  tipText:  { color: C.textDim, fontSize: F.size.sm, lineHeight: 17 },
  navHint:  { color: C.textFaint, fontSize: F.size.xs, textAlign: 'center', marginBottom: S.xs },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S.sm,
    marginTop: S.md,
    marginBottom: S.lg,
  },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: C.bgElevated },
  dotActive: { backgroundColor: C.amberSoft, width: 20 },
  dotDone:   { backgroundColor: C.surface },
  btnRow:    { flexDirection: 'row', gap: S.sm },
  backBtn:   { flex: 1, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  backText:  { color: C.textDim, fontSize: F.size.md },
  skipBtn:   { flex: 1, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  skipText:  { color: C.textFaint, fontSize: F.size.md },
  nextBtn:   { flex: 2, padding: S.md, borderRadius: R.md, backgroundColor: C.amberDark, alignItems: 'center' },
  nextText:  { color: '#fff', fontWeight: F.weight.heavy, fontSize: F.size.md },
});
```

- [ ] **Step 3: Update hardcoded colours in the `vis` StyleSheet**

In the `vis` StyleSheet.create block, replace hardcoded colour values:

```ts
// Change these lines:
arrow:      { color: C.textFaint, fontSize: 16 },          // was '#555'
cycleLabel: { color: C.textDim, fontSize: 10, marginTop: 2 }, // was '#aaa'
seasonDays: { color: C.textFaint, fontSize: 9 },            // was '#555'
fertLabel:  { color: C.textDim, fontSize: 11, width: 70 },  // was '#aaa'
fertTrack:  { flex: 1, height: 8, backgroundColor: C.bgDeep, borderRadius: 4, overflow: 'hidden' }, // was '#0d1117'
fertNote:   { color: C.textFaint, fontSize: 10, textAlign: 'center', marginTop: 2 }, // was '#555'
rotSub:     { color: C.textMuted, fontSize: 10 },            // was '#666'
mktRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: R.md, padding: S.sm, gap: S.sm }, // was '#0d1117'
mktCrop:    { color: C.textDim, fontSize: 12, flex: 1 },    // was '#ccc'
machRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgDeep, borderRadius: R.md, padding: S.sm }, // was '#0d1117'
machName:   { color: C.textDim, fontSize: 12, fontWeight: 'bold' }, // was '#ccc'
machBadge:  { backgroundColor: '#0f2044', borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 }, // was '#0f3460'
machEffect: { color: '#93c5fd', fontSize: 11, fontWeight: 'bold' }, // was '#64b5f6'
```

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
git add components/TutorialModal.tsx
git commit -m "feat(ui): restyle TutorialModal with new theme tokens"
```

---

## Task 8: Day-One Checklist

**Files:**
- Modify: `store/useGameStore.ts`
- Create: `components/tutorial/DayOneChecklist.tsx`
- Modify: `app/(tabs)/farm.tsx`

- [ ] **Step 1: Add checklist state to the store**

In `store/useGameStore.ts`, find the state interface (around line 781 where `tutorialSeen` is defined) and add:

```ts
dayOneChecklist: {
  tilled:    boolean;
  planted:   boolean;
  advanced5: boolean;
  harvested: boolean;
};
```

In the initial state (around line 1409 where `tutorialSeen: false` is), add:

```ts
dayOneChecklist: {
  tilled:    false,
  planted:   false,
  advanced5: false,
  harvested: false,
},
```

Find `markTutorialSeen` action (around line 8689) and add a new action nearby:

```ts
markDayOneStep: (step: keyof ReturnType<typeof get>['dayOneChecklist']) => {
  set(state => ({
    dayOneChecklist: { ...state.dayOneChecklist, [step]: true },
  }));
},
```

In the store's existing `tillField` or first till operation (search for `tilled:` in the set calls, around line 6262), add:
```ts
// After setting tilled: true on a parcel, also mark checklist:
get().markDayOneStep('tilled');
```

In `harvestCrop` (search for `firstMissionStep === 1 ? 2` around line 6418), also call:
```ts
get().markDayOneStep('harvested');
```

In `plantCrop` (search for `firstMissionStep === 0 ? 1` around line 6262), also call:
```ts
get().markDayOneStep('planted');
```

In `advanceDay` (search for `firstMissionStep`, check where day increments), add logic to mark `advanced5` when `day >= 5`:
```ts
// After incrementing day:
if (get().day >= 5 && !get().dayOneChecklist.advanced5) {
  get().markDayOneStep('advanced5');
}
```

Export `markDayOneStep` at the end of the store alongside `markTutorialSeen`.

- [ ] **Step 2: Create `components/tutorial/` directory**

```bash
mkdir -p "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\components\tutorial"
```

- [ ] **Step 3: Write `components/tutorial/DayOneChecklist.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, F, R, S } from '../../constants/theme';

const ITEMS: { key: 'tilled' | 'planted' | 'advanced5' | 'harvested'; label: string }[] = [
  { key: 'tilled',    label: 'Till your first field' },
  { key: 'planted',   label: 'Plant a crop' },
  { key: 'advanced5', label: 'Advance 5 days' },
  { key: 'harvested', label: 'Harvest your first crop' },
];

export default function DayOneChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const { dayOneChecklist, day } = useGameStore();

  // Hide after day 15 or when all done
  const allDone = Object.values(dayOneChecklist).every(Boolean);
  if (day > 15 || allDone) return null;

  const doneCount = Object.values(dayOneChecklist).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed(c => !c)} activeOpacity={0.8}>
        <Text style={styles.headerText}>📋 Getting Started</Text>
        <View style={styles.progress}>
          <Text style={styles.progressText}>{doneCount}/{ITEMS.length}</Text>
        </View>
        <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.list}>
          {ITEMS.map(item => {
            const done = dayOneChecklist[item.key];
            return (
              <View key={item.key} style={styles.item}>
                <Text style={[styles.check, done && styles.checkDone]}>
                  {done ? '✓' : '○'}
                </Text>
                <Text style={[styles.itemLabel, done && styles.itemDone]}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: S.md,
    marginBottom: S.sm,
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.md,
    gap: S.sm,
  },
  headerText: {
    color: C.text,
    fontSize: F.size.sm,
    fontWeight: F.weight.bold,
    flex: 1,
  },
  progress: {
    backgroundColor: C.bgElevated,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressText: {
    color: C.amber,
    fontSize: F.size.xs,
    fontWeight: F.weight.bold,
  },
  chevron: {
    color: C.textMuted,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: S.md,
    paddingBottom: S.md,
    gap: S.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  check: {
    color: C.textMuted,
    fontSize: 14,
    width: 16,
    textAlign: 'center',
  },
  checkDone: {
    color: C.green,
  },
  itemLabel: {
    color: C.textDim,
    fontSize: F.size.sm,
  },
  itemDone: {
    color: C.textFaint,
    textDecorationLine: 'line-through',
  },
});
```

- [ ] **Step 4: Add `DayOneChecklist` to farm screen**

In `app/(tabs)/farm.tsx`, add import:

```ts
import DayOneChecklist from '../../components/tutorial/DayOneChecklist';
```

In the return JSX, add it above `<SubTabBar>`:

```tsx
return (
  <View style={styles.container}>
    <DayOneChecklist />
    <SubTabBar tabs={TABS} active={tab} onSelect={id => setTab(id as FarmTab)} />
    ...
```

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -30
git add store/useGameStore.ts components/tutorial/DayOneChecklist.tsx app/(tabs)/farm.tsx
git commit -m "feat(ui): add Day-One Checklist + store checklist state"
```

---

## Task 9: GameHUD Restyle

**Files:**
- Modify: `components/GameHUD.tsx`

The HUD sits at the top of every screen. It uses hardcoded green-tinted colours and needs to use the navy theme.

- [ ] **Step 1: Update `WEATHER_DISPLAY` colours**

In `components/GameHUD.tsx`, replace the `WEATHER_DISPLAY` map:

```ts
const WEATHER_DISPLAY: Record<WeatherEvent, { icon: string; pillBg: string; textColor: string }> = {
  perfect:    { icon: '✨', pillBg: C.bgElevated, textColor: C.greenSoft },
  sunny:      { icon: '☀️', pillBg: '#2a1a00',    textColor: '#fcd34d' },
  cloudy:     { icon: '⛅', pillBg: C.bgCard,     textColor: C.textDim },
  rain:       { icon: '🌧️', pillBg: '#001225',   textColor: '#93c5fd' },
  heavy_rain: { icon: '⛈️', pillBg: '#001225',   textColor: '#60a5fa' },
  drought:    { icon: '🌵', pillBg: '#2a0f00',   textColor: C.amberSoft },
  frost:      { icon: '❄️', pillBg: '#001225',   textColor: '#bae6fd' },
  hail:       { icon: '🌨️', pillBg: '#0f0f2a',  textColor: '#93c5fd' },
  wind:       { icon: '💨', pillBg: C.bgCard,    textColor: C.textDim },
  fog:        { icon: '🌫️', pillBg: C.bgCard,   textColor: C.textMuted },
};
```

- [ ] **Step 2: Find the HUD's StyleSheet.create block**

Search for `StyleSheet.create` in `GameHUD.tsx`. For each style that uses hardcoded colours like `#0d1a0d`, `#142014`, `#c8e6c9`, `#6a9a6a`, etc., replace with theme tokens:

Key replacements to make:
- Any `backgroundColor: '#0d1a0d'` or similar green-bg → `C.bgDeep` or `C.bg`
- Any `backgroundColor: '#142014'` → `C.bgCard`
- Any `color: '#c8e6c9'` or `color: '#81c784'` as body text → `C.text` or `C.textDim`
- Any `borderColor: '#1b3a1b'` → `C.border`
- `color: '#4caf50'` used as green accent → `C.green`
- `color: '#ffa726'` → `C.amber`

Read the GameHUD styles section and apply these replacements systematically. The logic and layout of the HUD does not change.

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
git add components/GameHUD.tsx
git commit -m "feat(ui): restyle GameHUD with navy theme tokens"
```

---

## Task 10: HintCard Restyle

**Files:**
- Modify: `components/HintCard.tsx`

- [ ] **Step 1: Read and update `components/HintCard.tsx`**

Open `components/HintCard.tsx`. The component likely has a container with a green-tinted background. Replace its styles to use:
- Container: `bg: C.bgCard`, `borderLeftWidth: 3`, `borderLeftColor: C.amber`, `borderRadius: R.md`
- Title text: `C.text`, `F.weight.bold`
- Body text: `C.textDim`
- Add `C, F, R, S` to imports if not already there

The exact code depends on the file — read it first, then apply the pattern above.

- [ ] **Step 2: Commit**

```bash
git add components/HintCard.tsx
git commit -m "feat(ui): restyle HintCard — navy bg, amber left border"
```

---

## Task 11: Farm Fields Screen (`_tierras.tsx`)

**Files:**
- Modify: `app/(tabs)/_tierras.tsx`

This is the largest file (~1600 lines). Focus on the visual styles only — no logic changes.

- [ ] **Step 1: Update map cell colours in `renderMapCell`**

Find the `renderMapCell` function (around line 406). Replace the colour assignment block:

```ts
if (parcel.owned) {
  if (parcel.diseased) {
    bg = '#1f0800'; borderColor = '#7a2800'; statusIcon = '🦠';
  } else if (event) {
    bg = '#1f0808'; borderColor = '#991b1b'; statusIcon = '⚠️';
  } else if (parcel.pestState?.detectedDay) {
    bg = '#1f0e00'; borderColor = '#c2410c'; statusIcon = '🐛';
  } else if (parcel.hasWeeds) {
    bg = '#1a1600'; borderColor = '#a16207';
  } else if (parcel.plantedCrop && ready) {
    bg = '#082a10'; borderColor = C.green;
  } else if (parcel.plantedCrop) {
    bg = '#081a0d'; borderColor = C.greenDark;
  } else if (parcel.tilled) {
    bg = '#1a1200'; borderColor = '#78350f'; statusIcon = '⬛';
  } else {
    bg = '#0f172a'; borderColor = C.border;
  }
```

For unowned cells:
```ts
let bg = '#060a14';         // not owned — was '#0d0d14'
let borderColor = C.border; // was '#222230'
```

- [ ] **Step 2: Increase cell size and radius**

Find `CELL_SIZE` calculation (around line 320):
```ts
const CELL_SIZE = Math.min(68, Math.floor((Math.min(screenWidth, 480) - 20) / MAP_COLS));
// was: Math.min(60, ...)
```

In `renderMapCell` style, update `borderRadius: 6` → `borderRadius: 10`.

- [ ] **Step 3: Update the map panel (bottom action sheet)**

Find `styles.mapPanel` in the StyleSheet. Update:
```ts
mapPanel: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: C.bgDeep,
  borderTopLeftRadius: R.xl,
  borderTopRightRadius: R.xl,
  borderTopWidth: 1,
  borderTopColor: C.border,
  padding: S.lg,
  maxHeight: 200,
},
```

- [ ] **Step 4: Update all remaining styles in the StyleSheet**

Search for hardcoded colour values in the `styles` and `localStyles` objects. Replace:
- `backgroundColor: '#0d1a0d'` / `'#142014'` → `C.bg` / `C.bgCard`
- `backgroundColor: '#1e3a1b'` → `C.bgElevated`
- `borderColor: '#1b3a1b'` → `C.border`
- `color: '#c8e6c9'` → `C.text`
- `color: '#81c784'` / `'#6a9a6a'` → `C.textDim` / `C.textMuted`
- Button background `'#2e7d32'` → `C.greenDark`
- Button background `'#b71c1c'` → `C.redDark`
- Keep all the semantic alert colours (`#2a1a00` for disease, etc.) but update to match new spec equivalents

- [ ] **Step 5: Update the screen header**

Find the header row (around line 749, `styles.headerRow`). Add a proper title style:
```ts
// In the header row JSX, ensure title uses:
<Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>
  My Fields
</Text>
```

- [ ] **Step 6: Update filter chips**

Find filter chips in the list view. Make active chip use `C.bgElevated` background and `C.text` colour; inactive use `C.bgCard` and `C.textMuted`.

- [ ] **Step 7: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -30
git add "app/(tabs)/_tierras.tsx"
git commit -m "feat(ui): restyle tierras fields screen — map cells, panel, cards"
```

---

## Task 12: Market Screen

**Files:**
- Modify: `app/(tabs)/market.tsx`

- [ ] **Step 1: Read `market.tsx` then apply the standard theme sweep**

Open `app/(tabs)/market.tsx`. Apply the following replacement pattern throughout:

| Old value | New value |
|-----------|-----------|
| `bg: '#0d1a0d'` or `'#142014'` | `C.bg` / `C.bgCard` |
| `bg: '#1e3a1b'` | `C.bgElevated` |
| `borderColor: '#1b3a1b'` | `C.border` |
| `color: '#c8e6c9'` | `C.text` |
| `color: '#81c784'` | `C.textDim` |
| `color: '#6a9a6a'` | `C.textMuted` |
| `color: '#4a6e4a'` | `C.textFaint` |
| Green price positive `'#4caf50'` | `C.green` |
| Red price negative `'#ef5350'` | `C.red` |
| Amber `'#ffa726'` | `C.amber` |

Add `C, F, R, S` to the theme import if not already there.

Add a consistent screen header at the top of the screen's return JSX:
```tsx
<View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm,
  borderBottomWidth: 1, borderBottomColor: C.divider }}>
  <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>
    Market
  </Text>
</View>
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
git add "app/(tabs)/market.tsx"
git commit -m "feat(ui): restyle market screen with navy theme"
```

---

## Task 13: Ops Screen

**Files:**
- Modify: `app/(tabs)/ops.tsx`

- [ ] **Step 1: Read `ops.tsx` then apply the standard theme sweep**

Open `app/(tabs)/ops.tsx`. Apply the same replacement pattern as Task 12.

Additionally, find any progress bar tracks and fills:
- Track background: `C.bgDeep`
- Fill: use the semantic colour appropriate to the job type (green for tilling/planting, amber for spraying, blue for watering)

Add consistent screen header:
```tsx
<View style={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm,
  borderBottomWidth: 1, borderBottomColor: C.divider }}>
  <Text style={{ color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy }}>
    Operations
  </Text>
</View>
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
git add "app/(tabs)/ops.tsx"
git commit -m "feat(ui): restyle ops screen with navy theme"
```

---

## Task 14: Office Screen

**Files:**
- Modify: `app/(tabs)/office.tsx`

- [ ] **Step 1: Read `office.tsx` then apply the standard theme sweep**

Open `app/(tabs)/office.tsx`. Apply the same replacement pattern as Task 12.

Key additions:
- Section dividers between groups of settings: `height: 1, backgroundColor: C.divider, marginVertical: S.md`
- Stat rows: ensure value column uses `C.text` + `F.weight.bold`, label uses `C.textMuted`
- Add consistent screen header ("Office")

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
git add "app/(tabs)/office.tsx"
git commit -m "feat(ui): restyle office screen with navy theme"
```

---

## Task 15: Animals Screen

**Files:**
- Modify: `app/(tabs)/_animales.tsx`

- [ ] **Step 1: Read `_animales.tsx` then apply the standard theme sweep**

Open `app/(tabs)/_animales.tsx`. Apply the same replacement pattern as Task 12.

Special attention to gene display cards — currently uses letter grades (F→S) with colour coding. Ensure the grade colours still work on the new dark backgrounds:
- Grade S: `C.amber` (gold)
- Grade A: `C.purple`
- Grade B: `C.blue`
- Grade C: `C.green`
- Grade D/F: `C.textMuted`

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
git add "app/(tabs)/_animales.tsx"
git commit -m "feat(ui): restyle animals screen with navy theme"
```

---

## Task 16: Remaining Screens Sweep

**Files:**
- Modify: `app/(tabs)/_agua.tsx`, `_calendario.tsx`, `_clima.tsx`, `_maquinaria.tsx`, `_procesado.tsx`, `_subasta.tsx`, `_tienda.tsx`, `_trabajadores.tsx`

- [ ] **Step 1: Apply theme sweep to each remaining screen**

For each file listed above, open it and apply the replacement pattern from Task 12. Each file should take 5–10 minutes. Commit each file separately:

```bash
# Example pattern — repeat for each file:
git add "app/(tabs)/_agua.tsx"
git commit -m "feat(ui): restyle agua screen with navy theme"
```

- [ ] **Step 2: Final type-check across the whole project**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: 0 errors.

---

## Task 17: Final Polish Pass

- [ ] **Step 1: Search for any remaining hardcoded green-bg values**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
grep -rn "0d1a0d\|142014\|0a1a0a\|1b3a1b\|c8e6c9\|81c784\|6a9a6a" \
  --include="*.tsx" --include="*.ts" \
  app/ components/ | grep -v node_modules | grep -v ".git"
```

For each match found, replace with the appropriate theme token.

- [ ] **Step 2: Verify no green-tinted backgrounds remain**

```bash
# Check for the most common green-bg culprits
grep -rn "bg.*#0d1a\|bg.*#142014\|backgroundColor.*#0d1a\|backgroundColor.*#142014" \
  --include="*.tsx" app/ components/ | grep -v node_modules
```

Expected: 0 matches.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ui): final polish pass — remove remaining hardcoded green values"
```

- [ ] **Step 4: Push to GitHub**

```bash
git push
```

---

## Success Checklist

Before marking the plan complete, verify:

- [ ] `constants/theme.ts` uses navy base colours, no green backgrounds
- [ ] Tab bar shows icon + label with coloured active indicator
- [ ] SubTabBar uses elevated chip for active, transparent for inactive
- [ ] Tutorial modal has clean navy card, amber progress bar
- [ ] Day-One checklist appears on Farm screen for new players
- [ ] GameHUD reads cleanly against the navy background
- [ ] Every screen has a consistent title header
- [ ] Map cells in tierras are 68px with rounded corners
- [ ] No screen has a green-tinted card background
- [ ] `npx tsc --noEmit` passes with 0 errors
