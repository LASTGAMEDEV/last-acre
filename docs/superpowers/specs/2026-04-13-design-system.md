# Design System — Granja Tycoon

**Date:** 2026-04-13  
**Approach:** Token-first — establish a complete token layer in `constants/theme.ts`, then update all screens and components to consume the tokens. No more hardcoded values.

---

## 1. Goals

- Every screen looks consistent — same spacing, font sizes, colors, radii
- Nothing overlaps — floating Advance Day button removed, controls live in the HUD
- Sub-tabs never compress — scrollable pill row replaces all ad-hoc tab bars
- Mobile-friendly throughout — 44px minimum touch targets everywhere
- Forest Green base palette replaces the current dark navy

---

## 2. Token System (`constants/theme.ts`)

### 2a. Color palette (`C`)

Replace the current navy-based `C` object with a forest green base:

```ts
bg:        '#0d1a0d'   // was #1a1a2e
bgCard:    '#142014'   // was #16213e
bgDeep:    '#0a1a0a'   // was #0f1f3d
bgInput:   '#0a1a0a'

text:      '#c8e6c9'   // was gold #e8d5a3
textDim:   '#81c784'
textMuted: '#6a9a6a'
textFaint: '#4a6e4a'

// Semantic — unchanged
green / greenDark / greenSoft / red / redDark / amber / blue / purple / orange / gray

divider:   '#1b3a1b'   // was #1e1e3a
border:    '#1b3a1b'
```

Keep `gold: '#c8e6c9'` and `goldDim: '#81c784'` as aliases (same values as `text` / `textDim`) for backwards compatibility with existing screen references.

### 2b. Season themes (`SEASON_THEME`)

Accent colors stay the same (spring green, summer amber, autumn orange-red, winter blue). Only `tabBar` and `badge` backgrounds shift to match the green base:

```ts
spring:  tabBar '#0a1a0a', badge '#1b3a1b'
summer:  tabBar '#1a1200', badge '#3a2800'   // unchanged
autumn:  tabBar '#1a0d00', badge '#3a1500'   // unchanged
winter:  tabBar '#001020', badge '#001f35'   // unchanged
```

### 2c. Spacing scale (`S`)

```ts
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
```

### 2d. Font scale (`F`)

```ts
export const F = {
  size: { xs: 10, sm: 12, md: 13, lg: 14, xl: 16, xxl: 18, title: 22 },
  weight: { normal: '400', medium: '500', bold: '600', heavy: 'bold' },
}
```

### 2e. Border radii (`R`)

```ts
export const R = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, pill: 999 }
```

### 2f. Touch target minimum

```ts
export const MIN_TOUCH = 44
```

All interactive elements must be at least 44px tall/wide.

---

## 3. GameHUD Redesign (`components/GameHUD.tsx`)

Two compact rows. Floating Advance Day button removed entirely.

**Row 1** — single line, 10px font:
```
🌿 My Farm   [🌸 Spring · 48d]  [⛅ Cloudy]   Day 42
```
- Farm name (left)
- Season pill (green badge, `SEASON_THEME` colors)
- Today's weather pill — reads `forecast[0]` from the store (the current day's entry). If `forecast` is empty, the pill is hidden. Color reflects condition per the table below.
- Day number (right, pushed with `marginLeft: auto`)

**Row 2** — stats left, day controls right:
```
$12.4k     $8.1k      −$240    [▶ Advance]  [+5] [+10] [+30]
CASH       SAVINGS    BURN/D
```
- Stats: three `flex-direction:column` stat items with dividers between them
- Advance button: green filled, `borderRadius: R.md`, glows with `shadowColor: theme.accent`
- Skip buttons: `bgCard` background, `theme.accent` border and text, `borderRadius: R.sm`
- All controls minimum `MIN_TOUCH` height

Weather condition → icon + pill color mapping:
| Condition | Icon | Pill bg |
|-----------|------|---------|
| Sunny / Clear | ☀️ | `#3a2800` |
| Cloudy | ⛅ | `#1b2e2e` |
| Rain | 🌧️ | `#001a3a` |
| Heat wave | 🌡️ | `#5a1a00` |
| Frost | ❄️ | `#001a3a` |
| Storm | ⛈️ | `#1a1a3a` |

The existing `seasonalEvent` warning strip and loan/contract deadline strips remain below the HUD, unchanged.

---

## 4. SubTabBar Component (`components/SubTabBar.tsx`)

Single shared component replacing all ad-hoc tab rows in `granja.tsx`, `mercado.tsx`, `gestion.tsx`, `fabrica.tsx`.

```ts
interface Props {
  tabs: { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
}
```

- `ScrollView` horizontal, `showsHorizontalScrollIndicator={false}`
- Container padding: `S.sm` vertical, `S.md` horizontal, `S.sm` gap
- **Active pill:** `backgroundColor: theme.accent`, label `color: '#fff'`, `fontWeight: F.weight.bold`
- **Inactive pill:** `backgroundColor: 'transparent'`, `borderWidth: 1.5`, `borderColor: C.textFaint`, label `color: C.textMuted`
- All pills: `borderRadius: R.pill`, `paddingHorizontal: S.md`, `paddingVertical: S.sm`, `minHeight: MIN_TOUCH`
- Auto-scroll active tab into view on mount and on `active` change using `scrollViewRef.scrollTo`

---

## 5. ScreenHeader Removal

`components/ScreenHeader.tsx` is deleted. It was repeating Day + Season already shown in the HUD.

Each screen that used `ScreenHeader` gets a simple title line instead:
```tsx
<Text style={styles.screenTitle}>{title}</Text>
```
```ts
screenTitle: { color: C.text, fontSize: F.size.xl, fontWeight: F.weight.bold, paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.xs }
```

Screens using `ScreenHeader`: `tierras.tsx`, `animales.tsx`, `maquinaria.tsx`, `economia.tsx`, `tienda.tsx`, `subasta.tsx`, `oficina.tsx`, `procesado.tsx`, `seguros.tsx`, `clima.tsx`, `trabajadores.tsx`. Each gets the title inline.

---

## 6. Card & Row Patterns

All screens standardize on four patterns. No other card styles.

### 6a. GameRow
Standard list item used in crop lists, animal lists, inventory, market prices, worker lists, machine lists.

```
[icon 22px]  [title bold md] .............. [value bold sm-green]
             [progress bar 3px — optional]
             [subtitle faint xs] ........... [meta faint xs]
```
- Container: `bgCard`, `borderRadius: R.md`, `padding: S.md` horizontal `S.sm` vertical, `minHeight: MIN_TOUCH`
- Progress bar: `bgDeep` track, `theme.accent` fill, `borderRadius: R.xs`, `height: 3`
- No progress bar variant: subtitle row fills the second line instead

### 6b. StatCard
KPI tile used in summaries and dashboards (e.g. season goal progress panels).

```
[LABEL 7px uppercase faint]
[value bold lg]
[secondary 8px muted]
```
- Container: `bgCard`, `borderRadius: R.md`, `padding: S.sm`
- Used in grids (typically 2–3 column)

### 6c. SectionHeader
Labeled group divider used to separate content groups within a screen.

```
LABEL UPPERCASE ............... count/meta
────────────────────────────────────────
```
- Label: `C.textFaint`, `F.size.xs`, `fontWeight: F.weight.bold`, `letterSpacing: 1.2`
- Divider: 1px `C.divider`
- No background — sits directly above the rows it labels

### 6d. ActionButton
Interactive buttons. Four variants:

| Variant | Background | Border | Label color |
|---------|-----------|--------|-------------|
| Primary | `theme.accent` | none | `#fff` bold |
| Secondary | `bgCard` | `theme.accent` 1.5px | `theme.accent` bold |
| Ghost | `bgCard` | `C.textFaint` 1.5px | `C.textMuted` |
| Danger | `red + 22 opacity` | `C.red` 1.5px | `C.red` bold |

All variants: `borderRadius: R.md`, `minHeight: MIN_TOUCH`, `paddingHorizontal: S.lg`.

---

## 7. Screen-by-screen Changes

| Screen | Changes |
|--------|---------|
| `_layout.tsx` | Remove floating Advance/Skip buttons. Import new `GameHUD`. |
| `GameHUD.tsx` | Full rewrite per Section 3. |
| `granja.tsx` | Replace custom tab row with `SubTabBar`. Remove `ScreenHeader`. Apply `GameRow`/`ActionButton` tokens. |
| `mercado.tsx` | Replace custom tab row with `SubTabBar`. Remove `ScreenHeader`. |
| `gestion.tsx` | Replace custom tab row with `SubTabBar`. Remove `ScreenHeader`. |
| `fabrica.tsx` | Replace custom tab row with `SubTabBar`. Remove `ScreenHeader`. |
| `economia.tsx` | Remove `ScreenHeader`. Apply `GameRow` for price list. Apply token spacing/colors. |
| `tienda.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `subasta.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `oficina.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `StatCard`. |
| `procesado.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `seguros.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `clima.tsx` | Remove `ScreenHeader`. Apply token colors. |
| `tierras.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `animales.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `maquinaria.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |
| `trabajadores.tsx` | Remove `ScreenHeader`. Apply `GameRow` + `ActionButton`. |

---

## 8. Mobile Considerations

- All interactive elements: `minHeight: MIN_TOUCH` (44px)
- No absolute-positioned overlapping elements (floating button eliminated)
- `ScrollView` used for any list that can exceed screen height
- `SubTabBar` scrolls horizontally — no compression on any screen size
- Font sizes from `F.size` scale — nothing below `F.size.xs` (10px) for readable content
- Weather/season pills on HUD row 1 use `numberOfLines={1}` to prevent wrapping on narrow screens

---

## 9. Out of Scope

- Animation changes (existing pulse on Advance button is removed since button moves into HUD; existing day-summary animations, milestone popups, event banners unchanged)
- Game logic / store changes
- Adding new screens or features
- Font loading (custom fonts not introduced — stays with system fonts via `Fonts` in theme)
