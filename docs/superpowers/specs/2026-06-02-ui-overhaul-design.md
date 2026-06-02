# UI Overhaul — Clean Modern Dark
**Date:** 2026-06-02  
**Status:** Approved  
**Scope:** Full game UI — visual foundation, navigation, all screens, tutorial

---

## Goal

The game has deep, well-built systems but the UI looks flat, green-tinted, and inconsistent. This overhaul makes the game feel polished and enjoyable to play by establishing a coherent design language and applying it everywhere.

---

## Section 1 — Visual Foundation (theme.ts)

### Color System

Replace the current green-tinted palette with a deep navy base and proper text hierarchy. Green becomes semantic-only (crops, growth, success) — not backgrounds or body text.

**Backgrounds:**
| Token | Current | New | Use |
|-------|---------|-----|-----|
| `C.bg` | `#0d1a0d` | `#0a0e1a` | Screen background |
| `C.bgCard` | `#142014` | `#111827` | Card / panel surface |
| `C.bgDeep` | `#0a1a0a` | `#060a14` | Deepest layer (modals, inputs) |
| `C.bgInput` | `#0a1a0a` | `#0f1729` | Input fields |
| `C.bgElevated` | _(new)_ | `#1e293b` | Elevated cards, selected states |

**Text:**
| Token | Current | New | Use |
|-------|---------|-----|-----|
| `C.text` | `#c8e6c9` | `#f1f5f9` | Primary text |
| `C.textDim` | `#81c784` | `#94a3b8` | Secondary text |
| `C.textMuted` | `#6a9a6a` | `#64748b` | Labels, captions |
| `C.textFaint` | `#4a6e4a` | `#475569` | Placeholder, disabled |

**Borders / Dividers:**
| Token | Current | New |
|-------|---------|-----|
| `C.border` | `#1b3a1b` | `#1e293b` |
| `C.divider` | `#1b3a1b` | `#1e293b` |

**Semantic (unchanged intent, values refined):**
| Token | Current | New | Use |
|-------|---------|-----|-----|
| `C.green` | `#4caf50` | `#22c55e` | Planted, ready, success |
| `C.greenDark` | `#2e7d32` | `#15803d` | Green button background |
| `C.greenSoft` | `#81c784` | `#86efac` | Green text on dark bg |
| `C.amber` | `#ffa726` | `#f59e0b` | Primary CTA, warnings |
| `C.red` | `#ef5350` | `#ef4444` | Danger, disease, alerts |
| `C.redDark` | `#b71c1c` | `#991b1b` | Red button background |
| `C.blue` | `#2196f3` | `#3b82f6` | Water, info |
| `C.purple` | `#9c27b0` | `#a855f7` | Premium, prestige |
| `C.orange` | `#ff9800` | `#f97316` | Events, pests |

**New tokens:**
```ts
C.bgElevated = '#1e293b'   // selected cards, hover states
C.surface     = '#162032'  // between bgCard and bgElevated
C.amberDark   = '#b45309'  // amber button bg
C.amberSoft   = '#fcd34d'  // amber text on dark
```

### Typography

The font scale stays but weight usage gets tightened:

- **Titles / screen headers:** `F.size.xxl` (18px), weight `heavy`
- **Section labels:** `F.size.lg` (14px), weight `bold`, uppercase, `C.textMuted`
- **Card titles:** `F.size.xl` (16px), weight `bold`
- **Body / values:** `F.size.md` (13px), weight `normal`, `C.text`
- **Captions / hints:** `F.size.sm` (12px), weight `normal`, `C.textDim`
- **Micro labels / badges:** `F.size.xs` (10px), weight `bold`, uppercase

Add `F.size.body = 14` as the standard readable body size (currently `md: 13` is a touch small).

### Border Radius

Increase slightly for a more modern feel:
- `R.md: 8 → 10`
- `R.lg: 12 → 14`
- `R.xl: 16 → 20`

### Spacing

No changes to the scale — `S.xs/sm/md/lg/xl/xxl` stays. Consistency of application is the fix.

### Season Theming

Keep the season accent system but update background values to use navy base:
```ts
spring: { tabBar: '#061a0a', accentSoft: '#0a1f0d' }
summer: { tabBar: '#1a1200', accentSoft: '#1f1500' }
autumn: { tabBar: '#1a0a00', accentSoft: '#1f0c00' }
winter: { tabBar: '#00101e', accentSoft: '#001525' }
```

---

## Section 2 — Tab Bar

### Current Problems
- Text-only labels, no icons
- Active state is barely visible
- Bottom border blends into content

### New Design

**Structure:** Icon above label, 4 main tabs.

```
[🌾 Farm] [📈 Market] [⚙️ Ops] [🏢 Office]
```

**Active state:** Icon tinted with season accent color + label gets accent color. Inactive: icon and label both `C.textFaint`.

**Active indicator:** 2px line at the top of the tab bar (not bottom) in season accent color, spanning the active tab width.

**Tab bar background:** `C.bgDeep` with a `C.border` top border. No green tint.

**Height:** 56px (up from ~49px) for better touch targets.

**Implementation:** Update `app/(tabs)/_layout.tsx` — tab bar style, icon components, active tint.

Icons to use (React Native vector icons or emoji fallback for web):
- Farm: `🌾`
- Market: `📊`
- Ops: `⚙️`
- Office: `🏢`

---

## Section 3 — Farm Sub-Tab Bar (`SubTabBar` component)

### Current Problems
- Text-only horizontal scroll pills
- Active pill barely distinguishable
- No icons, hard to scan quickly

### New Design

**Style:** Horizontal scroll, pill-shaped chips.

**Active chip:** Solid `C.bgElevated` background, season accent text, icon + label.

**Inactive chip:** Transparent background, `C.textMuted` text, icon + label.

**Chip height:** 34px, `R.pill` border radius, `S.md` horizontal padding.

**Icons per sub-tab:**
- 🌾 Fields
- 🐄 Animals
- 🌿 Henil
- 🎯 Precision
- 💧 Water
- 📅 Calendar
- 🌤️ Weather

**Component file:** `components/SubTabBar.tsx` — full restyle.

---

## Section 4 — Screen-Level Polish

### 4a — Shared Card Component

Create `components/ui/Card.tsx`:
```tsx
// Variants: default | elevated | danger | success | warning
// Usage: <Card variant="elevated">...</Card>
```

Card specs:
- `default`: bg `C.bgCard`, border `C.border` 1px, radius `R.lg`
- `elevated`: bg `C.bgElevated`, no border, subtle shadow on native
- `danger`: bg `#1a0a0a`, border `#5a1a1a` 1px
- `success`: bg `#0a1a0a`, border `#1a5a1a` 1px
- `warning`: bg `#1a1200`, border `#5a3a00` 1px

### 4b — Shared Button Component

Create `components/ui/Button.tsx`:
```tsx
// Variants: primary | secondary | danger | ghost
// Sizes: sm | md | lg
```

Button specs:
- `primary`: bg `C.amberDark`, text white, border none
- `secondary`: bg `C.bgElevated`, text `C.text`, border `C.border`
- `danger`: bg `C.redDark`, text white, border none
- `ghost`: no bg, text `C.textDim`, border none
- All: `R.md` radius, min height 40px, `F.weight.bold` text

### 4c — Shared Badge Component

Create `components/ui/Badge.tsx`:
```tsx
// Variants: success | warning | danger | info | neutral
// Sizes: sm | md
```

Badge specs: pill shape, `F.size.xs`, bold, uppercase, letter-spacing 0.5px.

### 4d — Screen Headers

Each tab screen gets a consistent header:
```
[Screen Title]                    [Action Button]
```
- Title: `F.size.xxl`, `F.weight.heavy`, `C.text`
- Subtitle (if any): `F.size.sm`, `C.textMuted`
- Action button: uses `Button` component, `sm` size
- Bottom border: `C.divider`

### 4e — Farm / Fields Screen (`_tierras.tsx`)

Map view improvements:
- Cell size increase: `60 → 68px`
- Cell border radius: `6 → 10px`
- Bolder status badges on cells (replace bare emoji with icon + label chip)
- Bottom action panel: `C.bgDeep` bg with top border, rounded top corners
- Map legend: horizontal chips with colored dot + label

List view improvements:
- Cards use new `Card` component
- Action buttons use new `Button` component
- Filter chips use pill style from SubTabBar

### 4f — Other Screens

Apply the same pattern to each remaining screen:
- `market.tsx`: price cards get cleaner layout, trend indicators more visible
- `ops.tsx`: job progress bars get proper styling
- `office.tsx`: stat rows get better spacing and dividers
- `_animales.tsx`: animal cards get gene display cleaned up

---

## Section 5 — Tutorial

### Current Problems
- `TutorialModal.tsx`: text-only modal, no visual guidance
- `FirstMission.tsx`: text-based, no pointing to UI elements
- No progress indicator
- No persistent reminder of what to do next

### New Design

#### 5a — Highlight Overlay System

New component: `components/tutorial/TutorialHighlight.tsx`

- Renders a full-screen semi-transparent overlay (`rgba(0,0,0,0.65)`)
- Cuts a "hole" around the target element using a transparent cutout
- Pulsing ring animation around the cutout (scale 1.0 → 1.05 → 1.0, 1.5s loop)
- Tooltip below/above the cutout with: step text, step counter "Step 2 of 6", Next button, Skip button

The overlay is managed by a `useTutorial` hook in the store that tracks:
```ts
tutorialStep: number | null   // null = tutorial complete or skipped
tutorialSeen: boolean
```

#### 5b — Tutorial Steps

6 guided steps on first launch (day 1):

1. **Welcome** — Full-screen modal. "Welcome to Last Acre. Let's get you started." → "Let's go"
2. **Your Fields** — Highlights the Fields tab in the Farm screen. "These are your fields. Tap one to manage it."
3. **Till & Plant** — Highlights the first owned parcel. "Tap this field then hit Till Field to prepare the soil."
4. **The Shop** — Highlights Market tab. "Buy seeds and supplies here."
5. **Advance Time** — Highlights the day advance button. "Tap here to advance days. Crops grow while time passes."
6. **Your First Harvest** — Triggered when first crop is ready. "Your first crop is ready! Tap Harvest to collect it."

Steps 1–5 fire on first launch. Step 6 fires lazily when the condition is met.

#### 5c — Day-1 Checklist

New component: `components/tutorial/DayOneChecklist.tsx`

Persistent floating checklist in the corner of the Farm screen (days 1–10):
```
📋 Getting Started
☐ Till your first field
☐ Plant a crop
☐ Advance 5 days
☑ Check the market
```

Dismisses automatically when all items checked. Tapping an unchecked item navigates to the relevant screen.

#### 5d — Hint Cards

`HintCard` component already exists. Keep it but restyle to match new design: navy background, amber left border, cleaner typography.

---

## Implementation Order

1. **Theme tokens** — `constants/theme.ts` (foundation, cascades everywhere)
2. **Shared components** — `Card`, `Button`, `Badge` in `components/ui/`
3. **Tab bar** — `app/(tabs)/_layout.tsx`
4. **SubTabBar** — `components/SubTabBar.tsx`
5. **Tutorial system** — `useTutorial` hook + `TutorialHighlight` + `DayOneChecklist`
6. **Farm screen** — `_tierras.tsx` + `farm.tsx`
7. **Market screen** — `market.tsx`
8. **Ops screen** — `ops.tsx`
9. **Office screen** — `office.tsx`
10. **Animals screen** — `_animales.tsx`
11. **Remaining screens** — other `_*.tsx` files

---

## What This Does NOT Change

- Game logic, store, engine — untouched
- Existing route structure
- Data files (cropTypes, machineTypes, etc.)
- The `world-map.tsx` screen (deferred)

---

## Success Criteria

- No green-tinted backgrounds remain anywhere
- Every screen has a consistent header
- Tab bar has icons and a clear active state
- Tutorial guides a new player through their first harvest
- Cards, buttons, and badges are visually consistent across all screens
