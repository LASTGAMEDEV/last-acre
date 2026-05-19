# Living History System — Phase 1: Timeline Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a historical timeline engine that starts the game in 1970, fires real historical events on their exact dates with gradual economic effects, gates existing engines by their real-world activation year, and shows events to the player via a newspaper modal and toast banner.

**Architecture:** A new pure-function engine (`engine/timeline.ts`) processes a static event database (`data/historicalEvents.ts`) each day and writes multipliers + unlock flags into a `TimelineState` slice of `useGameStore`. The existing `advanceDay` loop calls the timeline engine first, and all downstream systems (priceEngine, shop, existing engines) read from `TimelineState`. No existing engine logic is changed — they are simply skipped before their historical activation year.

**Tech Stack:** TypeScript, Zustand 5, React Native, Expo Router. No test suite — verify with manual console checks and in-app observation.

---

## Critical Reading Before Starting

- `store/useGameStore.ts` is 10,018 lines. **Never use `require()` inside function bodies** — use top-level ES imports only. This is a documented project rule.
- Engines live in `engine/` (singular). New files follow existing naming: `engine/timeline.ts` not `engines/timelineEngine.ts`.
- The game uses **360-day years**, **30-day months**. `day` is an integer starting at 1. `getYear(day)` from `engine/cooperatives.ts` returns game year (1, 2, 3…). Calendar year = `1969 + getYear(day)`. Day 1 = Jan 1 1970.
- `COMMODITY_BASELINES` lives in `data/prices.ts` (loaded via require at line 1292 of useGameStore — pre-existing violation, do not copy this pattern).
- `activeEvents` in the store (line 800) is the existing game event system (weather, pests). Historical events use separate state fields to avoid collision.
- `components/EventBanner.tsx` displays existing game events. Do not touch it.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `engine/calendarUtils.ts` | ISO date ↔ game day conversion utilities |
| Create | `data/historicalEvents.ts` | Types + event database (1970–1985 initial, expandable) |
| Create | `data/historicalPrices.ts` | Year-indexed commodity baseline prices |
| Create | `engine/timeline.ts` | Pure functions: fire events, advance effect curves, compute multipliers |
| Create | `components/NewspaperModal.tsx` | Full-screen modal for major historical events |
| Create | `components/HistoricalToast.tsx` | Non-blocking sliding banner for minor events |
| Modify | `store/useGameStore.ts` | Add TimelineState, wire engine, gate existing engines |
| Modify | `engine/priceEngine.ts` | Apply timeline multipliers to commodity baselines |
| Modify | `components/GameHUD.tsx` | Add calendar year display |
| Modify | `app/(tabs)/_layout.tsx` | Mount NewspaperModal and HistoricalToast |
| Modify | `components/market/ShopSection.tsx` | Gate items by historical unlock |

---

## Task 1: Calendar Utility Functions

**Files:**
- Create: `engine/calendarUtils.ts`

These are pure conversion functions needed by every other task. Create them first so they can be imported freely.

- [ ] **Create `engine/calendarUtils.ts`**

```typescript
// engine/calendarUtils.ts
// The game uses 360-day years and 30-day months. Day 1 = January 1, 1970.
// Calendar year 1970 = game year 1 = days 1–360.

export const GAME_START_CALENDAR_YEAR = 1970;
const DAYS_PER_YEAR = 360;
const DAYS_PER_MONTH = 30;

/** Returns the real-world calendar year for a given game day. Day 1 → 1970. */
export function gameDayToCalendarYear(day: number): number {
  return GAME_START_CALENDAR_YEAR + Math.floor((day - 1) / DAYS_PER_YEAR);
}

/** Returns the calendar month (1–12) for a given game day. */
export function gameDayToCalendarMonth(day: number): number {
  const dayOfYear = ((day - 1) % DAYS_PER_YEAR) + 1;
  return Math.ceil(dayOfYear / DAYS_PER_MONTH);
}

/** Returns the day of month (1–30) for a given game day. */
export function gameDayToCalendarDayOfMonth(day: number): number {
  return ((day - 1) % DAYS_PER_MONTH) + 1;
}

/**
 * Converts a real-world ISO date string ("1973-10-17") to the game day number.
 * Uses approximate 30-day months matching the game calendar.
 */
export function isoDateToGameDay(isoDate: string): number {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const dayOfMonth = parseInt(dayStr, 10);
  const gameYear = year - GAME_START_CALENDAR_YEAR + 1; // 1970 → 1
  const dayOfYear = (month - 1) * DAYS_PER_MONTH + dayOfMonth;
  return (gameYear - 1) * DAYS_PER_YEAR + dayOfYear;
}

/**
 * Returns a human-readable date string for display.
 * Example: gameDayToDisplayDate(287) → "October 1970"
 */
export function gameDayToDisplayDate(day: number): string {
  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const year = gameDayToCalendarYear(day);
  const month = gameDayToCalendarMonth(day);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
```

- [ ] **Verify by checking the math manually**

Open a JS console (browser devtools or Node) and verify:
- `gameDayToCalendarYear(1)` should equal `1970`
- `gameDayToCalendarYear(360)` should equal `1970`
- `gameDayToCalendarYear(361)` should equal `1971`
- `isoDateToGameDay('1973-10-17')` should equal `1367` (3×360 + 9×30 + 17 = 1080 + 270 + 17)
- `gameDayToDisplayDate(1)` should equal `"January 1970"`

- [ ] **Commit**

```bash
git add engine/calendarUtils.ts
git commit -m "feat(timeline): add calendar conversion utilities (game day ↔ real date)"
```

---

## Task 2: Historical Event Types and Database

**Files:**
- Create: `data/historicalEvents.ts`

This is the core data layer. Start with 1970–1985 (~40 events). The file is designed to be extended — new events are just new array entries.

- [ ] **Create `data/historicalEvents.ts`**

```typescript
// data/historicalEvents.ts

export type EventCategory =
  | 'economic'
  | 'technology'
  | 'regulation'
  | 'disease'
  | 'weather'
  | 'genetics'
  | 'product';

export type EventEffect = {
  /** Key matching a target in the timeline multiplier system.
   *  Known targets: 'fuel_cost' | 'wheat_price' | 'corn_price' | 'soy_price' |
   *  'milk_price' | 'beef_price' | 'pork_price' | 'loan_rate' | 'land_value' |
   *  'fertiliser_cost' | 'all_crop_prices' | 'all_livestock_prices'
   */
  target: string;
  /** Price multiplier. 1.4 = +40%. Applied as: basePrice * multiplier. */
  multiplier?: number;
  /** Absolute addition (e.g. interest rate). Added after multiplier. */
  absolute?: number;
};

export type UnlockGate = {
  type: 'product' | 'engine' | 'mechanic';
  /** ID string matching an item in the shop or an engine name. */
  id: string;
};

export type HistoricalEvent = {
  id: string;
  /** Real-world ISO date "YYYY-MM-DD". Converted to game day at runtime. */
  date: string;
  category: EventCategory;
  /** 'major' shows newspaper modal. 'minor' shows toast banner. */
  tier: 'major' | 'minor';
  headline: string;
  /** Hand-written narrative for major events. Template string for minor. */
  narrative: string;
  effects: EventEffect[];
  unlocks?: UnlockGate[];
  /** Days to ramp from 0 effect to full effect after trigger date. */
  rampUpDays: number;
  /** Days at full effect. */
  peakDays: number;
  /** Days to ramp from full effect back to 0. Set to 0 for permanent changes. */
  rampDownDays: number;
};

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  // ─── 1970 ────────────────────────────────────────────────────────────────
  {
    id: '1970-epa-founded',
    date: '1970-12-02',
    category: 'regulation',
    tier: 'minor',
    headline: 'Environmental Protection Agency established',
    narrative: 'A new federal agency begins regulating pesticide use and farm runoff.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'pesticide_regulation' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1972 ────────────────────────────────────────────────────────────────
  {
    id: '1972-ddt-ban',
    date: '1972-06-14',
    category: 'regulation',
    tier: 'major',
    headline: 'DDT Banned — Pesticide Era Ends',
    narrative: 'The government bans DDT after years of scientific pressure. Your spray cabinet needs rethinking. Some of your most effective pest treatments are no longer legal.',
    effects: [],
    unlocks: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1973 ────────────────────────────────────────────────────────────────
  {
    id: '1973-oil-embargo',
    date: '1973-10-17',
    category: 'economic',
    tier: 'major',
    headline: 'Oil Embargo — Fuel Prices Surge',
    narrative: 'Oil-producing nations cut exports overnight. Diesel at the pump has jumped 40 cents already and shows no sign of stopping. Every tractor hour, every delivery, every harvest run now costs more. You check your fuel reserves and do the maths. It is going to be a long winter.',
    effects: [
      { target: 'fuel_cost', multiplier: 1.4 },
      { target: 'fertiliser_cost', multiplier: 1.25 },
    ],
    rampUpDays: 30,
    peakDays: 240,
    rampDownDays: 60,
  },
  {
    id: '1973-grain-boom',
    date: '1973-06-01',
    category: 'economic',
    tier: 'minor',
    headline: 'Global grain demand surges — prices at record highs',
    narrative: 'Wheat and corn prices hit all-time highs as global demand outpaces supply.',
    effects: [
      { target: 'wheat_price', multiplier: 1.6 },
      { target: 'corn_price', multiplier: 1.5 },
    ],
    rampUpDays: 60,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 1974 ────────────────────────────────────────────────────────────────
  {
    id: '1974-glyphosate-launch',
    date: '1974-09-01',
    category: 'product',
    tier: 'minor',
    headline: 'Broad-spectrum herbicide launched',
    narrative: 'A new non-selective herbicide hits the market, promising to eliminate weeds before planting.',
    effects: [],
    unlocks: [{ type: 'product', id: 'herbicide_glyphosate_t1' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1975 ────────────────────────────────────────────────────────────────
  {
    id: '1975-embryo-transfer',
    date: '1975-01-01',
    category: 'genetics',
    tier: 'minor',
    headline: 'Embryo transfer enters commercial farming',
    narrative: 'Elite genetic traits can now be multiplied faster through embryo transfer technology.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'embryo_transfer' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1976 ────────────────────────────────────────────────────────────────
  {
    id: '1976-drought-europe',
    date: '1976-07-01',
    category: 'weather',
    tier: 'major',
    headline: 'European Drought — Worst in a Century',
    narrative: 'No meaningful rain in six weeks. The fields are cracking. Pastures are brown. Livestock are eating through winter reserves in summer. You have never seen the water table this low.',
    effects: [
      { target: 'wheat_price', multiplier: 1.35 },
      { target: 'milk_price', multiplier: 0.9 },
    ],
    rampUpDays: 14,
    peakDays: 90,
    rampDownDays: 30,
  },

  // ─── 1977 ────────────────────────────────────────────────────────────────
  {
    id: '1977-gps-satellite-first',
    date: '1977-09-01',
    category: 'technology',
    tier: 'minor',
    headline: 'First navigation satellite launched',
    narrative: 'Scientists begin testing global positioning technology. Agricultural applications are years away.',
    effects: [],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1978 ────────────────────────────────────────────────────────────────
  {
    id: '1978-4wd-tractors-available',
    date: '1978-03-01',
    category: 'technology',
    tier: 'minor',
    headline: 'Four-wheel drive tractors now available',
    narrative: 'Manufacturers begin offering 4WD as standard. Better traction, better productivity in wet conditions.',
    effects: [],
    unlocks: [{ type: 'product', id: 'tractor_4wd_t1' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1979 ────────────────────────────────────────────────────────────────
  {
    id: '1979-oil-crisis-2',
    date: '1979-01-16',
    category: 'economic',
    tier: 'major',
    headline: 'Second Oil Crisis — Fuel Costs Surge Again',
    narrative: 'Revolution in Iran chokes oil supply. Fuel is rationed in some areas. Diesel costs have nearly doubled in two years. Every farm in the country is recalculating.',
    effects: [
      { target: 'fuel_cost', multiplier: 1.5 },
    ],
    rampUpDays: 30,
    peakDays: 180,
    rampDownDays: 90,
  },

  // ─── 1980 ────────────────────────────────────────────────────────────────
  {
    id: '1980-ussr-grain-embargo',
    date: '1980-01-04',
    category: 'economic',
    tier: 'major',
    headline: 'USSR Grain Embargo — Export Markets Collapse',
    narrative: 'The government bans grain exports to the Soviet Union in protest of the Afghanistan invasion. Grain prices crash overnight. Every farmer in the country is sitting on wheat they cannot sell at any price they planned for.',
    effects: [
      { target: 'wheat_price', multiplier: 0.72 },
      { target: 'corn_price', multiplier: 0.78 },
    ],
    rampUpDays: 7,
    peakDays: 365,
    rampDownDays: 90,
  },

  // ─── 1981 ────────────────────────────────────────────────────────────────
  {
    id: '1981-interest-rate-peak',
    date: '1981-06-20',
    category: 'economic',
    tier: 'major',
    headline: 'Interest Rates Hit 21% — Borrowing Becomes Catastrophic',
    narrative: 'The bank called this morning. Your variable rate loan has adjusted again. Twenty-one percent. You sit at the kitchen table with the figures in front of you and try to find a number that works. There is not one.',
    effects: [
      { target: 'loan_rate', absolute: 0.12 },
    ],
    rampUpDays: 14,
    peakDays: 180,
    rampDownDays: 365,
  },

  // ─── 1983 ────────────────────────────────────────────────────────────────
  {
    id: '1983-bst-approved',
    date: '1983-01-01',
    category: 'product',
    tier: 'minor',
    headline: 'Bovine growth hormone approved for commercial use',
    narrative: 'A synthetic hormone treatment promises to boost dairy yields by 10–15%.',
    effects: [],
    unlocks: [{ type: 'product', id: 'bst_treatment' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1984 ────────────────────────────────────────────────────────────────
  {
    id: '1984-csa-movement',
    date: '1984-06-01',
    category: 'product',
    tier: 'minor',
    headline: 'Community-supported agriculture model emerges',
    narrative: 'Farmers in urban-adjacent areas begin selling subscription boxes direct to consumers.',
    effects: [],
    unlocks: [{ type: 'engine', id: 'csaEngine' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },

  // ─── 1985 ────────────────────────────────────────────────────────────────
  {
    id: '1985-conservation-reserve',
    date: '1985-12-23',
    category: 'regulation',
    tier: 'minor',
    headline: 'Conservation Reserve Program established',
    narrative: 'Farmers can now receive payments for taking environmentally sensitive land out of production.',
    effects: [],
    unlocks: [{ type: 'mechanic', id: 'conservation_reserve' }],
    rampUpDays: 0,
    peakDays: 0,
    rampDownDays: 0,
  },
  {
    id: '1985-farm-debt-crisis-early',
    date: '1985-03-01',
    category: 'economic',
    tier: 'major',
    headline: 'Farm Debt Crisis Deepens — Foreclosures Rising',
    narrative: 'Land values have fallen 30% in three years. Banks are calling in loans. Neighbours are losing their farms. The auction notices appear in the paper every week now. You watch the Caldwells loading a truck at dawn and look away.',
    effects: [
      { target: 'land_value', multiplier: 0.75 },
      { target: 'loan_rate', absolute: 0.04 },
    ],
    rampUpDays: 60,
    peakDays: 540,
    rampDownDays: 180,
  },
];
```

- [ ] **Verify the file compiles**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "historicalEvents"
```
Expected: no errors mentioning `historicalEvents.ts`.

- [ ] **Commit**

```bash
git add data/historicalEvents.ts
git commit -m "feat(timeline): add historical event types and initial database (1970-1985)"
```

---

## Task 3: Historical Price Table

**Files:**
- Create: `data/historicalPrices.ts`

Year-indexed real-world commodity baselines. These are the prices in the absence of event multipliers. Values are calibrated to the game's internal price scale (not real dollars — keep the same order of magnitude as the existing `COMMODITY_BASELINES` in `data/prices.ts`).

- [ ] **Read the existing baselines first**

```bash
grep -A 30 "COMMODITY_BASELINES" granja-tycoon/data/prices.ts | head -40
```

Note the price scale used. The historical table below uses the same scale (adjust the numbers if the existing baselines differ significantly from the values shown).

- [ ] **Create `data/historicalPrices.ts`**

```typescript
// data/historicalPrices.ts
// Year-indexed commodity baseline prices.
// These are calibrated to the game's internal price scale.
// Event multipliers from the timeline engine stack on top of these.

type CommodityBaselines = {
  wheat: number;
  corn: number;
  soy: number;
  milk: number;
  beef: number;
  pork: number;
  lamb: number;
  wool: number;
  fuel: number;
};

// Prices indexed by calendar year (1970–2026).
// Interpolate between years for smooth transitions.
const PRICE_TABLE: Record<number, CommodityBaselines> = {
  1970: { wheat: 42, corn: 28, soy: 60, milk: 38, beef: 110, pork: 75, lamb: 90, wool: 55, fuel: 18 },
  1971: { wheat: 44, corn: 29, soy: 62, milk: 39, beef: 112, pork: 76, lamb: 92, wool: 55, fuel: 18 },
  1972: { wheat: 46, corn: 30, soy: 65, milk: 40, beef: 115, pork: 78, lamb: 94, wool: 57, fuel: 19 },
  1973: { wheat: 80, corn: 56, soy: 120, milk: 42, beef: 125, pork: 88, lamb: 100, wool: 60, fuel: 28 },
  1974: { wheat: 70, corn: 50, soy: 110, milk: 46, beef: 130, pork: 90, lamb: 105, wool: 62, fuel: 34 },
  1975: { wheat: 58, corn: 40, soy: 90, milk: 48, beef: 128, pork: 88, lamb: 102, wool: 60, fuel: 32 },
  1976: { wheat: 55, corn: 38, soy: 85, milk: 49, beef: 130, pork: 87, lamb: 104, wool: 61, fuel: 31 },
  1977: { wheat: 50, corn: 35, soy: 80, milk: 50, beef: 128, pork: 85, lamb: 100, wool: 60, fuel: 30 },
  1978: { wheat: 52, corn: 36, soy: 82, milk: 52, beef: 132, pork: 88, lamb: 104, wool: 62, fuel: 31 },
  1979: { wheat: 54, corn: 37, soy: 84, milk: 54, beef: 135, pork: 90, lamb: 108, wool: 63, fuel: 45 },
  1980: { wheat: 38, corn: 29, soy: 70, milk: 55, beef: 130, pork: 88, lamb: 105, wool: 63, fuel: 50 },
  1981: { wheat: 36, corn: 28, soy: 68, milk: 56, beef: 128, pork: 85, lamb: 102, wool: 62, fuel: 52 },
  1982: { wheat: 34, corn: 26, soy: 65, milk: 54, beef: 125, pork: 82, lamb: 98, wool: 60, fuel: 48 },
  1983: { wheat: 33, corn: 25, soy: 62, milk: 53, beef: 122, pork: 80, lamb: 96, wool: 59, fuel: 45 },
  1984: { wheat: 35, corn: 27, soy: 64, milk: 54, beef: 124, pork: 82, lamb: 98, wool: 60, fuel: 44 },
  1985: { wheat: 30, corn: 24, soy: 58, milk: 52, beef: 115, pork: 78, lamb: 92, wool: 57, fuel: 38 },
  1986: { wheat: 28, corn: 22, soy: 54, milk: 50, beef: 105, pork: 74, lamb: 88, wool: 54, fuel: 28 },
  1987: { wheat: 30, corn: 23, soy: 56, milk: 50, beef: 108, pork: 76, lamb: 90, wool: 55, fuel: 29 },
  1988: { wheat: 38, corn: 30, soy: 68, milk: 52, beef: 115, pork: 80, lamb: 95, wool: 57, fuel: 30 },
  1989: { wheat: 36, corn: 29, soy: 66, milk: 53, beef: 118, pork: 82, lamb: 98, wool: 58, fuel: 31 },
  1990: { wheat: 34, corn: 28, soy: 64, milk: 54, beef: 120, pork: 84, lamb: 100, wool: 59, fuel: 35 },
  1991: { wheat: 35, corn: 28, soy: 65, milk: 54, beef: 120, pork: 84, lamb: 100, wool: 59, fuel: 32 },
  1992: { wheat: 36, corn: 29, soy: 66, milk: 55, beef: 122, pork: 85, lamb: 102, wool: 60, fuel: 31 },
  1993: { wheat: 37, corn: 29, soy: 67, milk: 55, beef: 122, pork: 85, lamb: 102, wool: 60, fuel: 31 },
  1994: { wheat: 38, corn: 30, soy: 68, milk: 56, beef: 124, pork: 86, lamb: 104, wool: 61, fuel: 32 },
  1995: { wheat: 45, corn: 36, soy: 78, milk: 58, beef: 130, pork: 90, lamb: 110, wool: 64, fuel: 34 },
  1996: { wheat: 60, corn: 48, soy: 100, milk: 60, beef: 105, pork: 92, lamb: 108, wool: 65, fuel: 36 },
  1997: { wheat: 50, corn: 40, soy: 88, milk: 60, beef: 112, pork: 90, lamb: 110, wool: 65, fuel: 35 },
  1998: { wheat: 42, corn: 34, soy: 76, milk: 58, beef: 110, pork: 86, lamb: 106, wool: 63, fuel: 30 },
  1999: { wheat: 40, corn: 32, soy: 72, milk: 57, beef: 108, pork: 84, lamb: 104, wool: 62, fuel: 28 },
  2000: { wheat: 42, corn: 34, soy: 74, milk: 58, beef: 112, pork: 86, lamb: 106, wool: 63, fuel: 32 },
  2001: { wheat: 40, corn: 32, soy: 72, milk: 57, beef: 108, pork: 84, lamb: 104, wool: 62, fuel: 31 },
  2002: { wheat: 42, corn: 33, soy: 75, milk: 57, beef: 110, pork: 85, lamb: 105, wool: 62, fuel: 33 },
  2003: { wheat: 44, corn: 35, soy: 80, milk: 58, beef: 112, pork: 86, lamb: 106, wool: 63, fuel: 38 },
  2004: { wheat: 46, corn: 36, soy: 95, milk: 60, beef: 118, pork: 88, lamb: 108, wool: 64, fuel: 44 },
  2005: { wheat: 48, corn: 38, soy: 90, milk: 62, beef: 122, pork: 90, lamb: 112, wool: 65, fuel: 52 },
  2006: { wheat: 52, corn: 42, soy: 92, milk: 64, beef: 128, pork: 92, lamb: 116, wool: 66, fuel: 58 },
  2007: { wheat: 70, corn: 58, soy: 120, milk: 68, beef: 135, pork: 96, lamb: 122, wool: 68, fuel: 65 },
  2008: { wheat: 88, corn: 72, soy: 145, milk: 70, beef: 140, pork: 98, lamb: 128, wool: 70, fuel: 95 },
  2009: { wheat: 55, corn: 44, soy: 100, milk: 58, beef: 125, pork: 88, lamb: 112, wool: 63, fuel: 50 },
  2010: { wheat: 60, corn: 52, soy: 112, milk: 62, beef: 132, pork: 92, lamb: 118, wool: 66, fuel: 60 },
  2011: { wheat: 75, corn: 65, soy: 130, milk: 68, beef: 142, pork: 98, lamb: 128, wool: 70, fuel: 78 },
  2012: { wheat: 90, corn: 80, soy: 150, milk: 70, beef: 148, pork: 100, lamb: 132, wool: 72, fuel: 80 },
  2013: { wheat: 70, corn: 60, soy: 130, milk: 72, beef: 155, pork: 102, lamb: 136, wool: 73, fuel: 75 },
  2014: { wheat: 60, corn: 50, soy: 110, milk: 74, beef: 165, pork: 104, lamb: 140, wool: 74, fuel: 68 },
  2015: { wheat: 52, corn: 42, soy: 95, milk: 65, beef: 160, pork: 98, lamb: 136, wool: 72, fuel: 45 },
  2016: { wheat: 48, corn: 38, soy: 90, milk: 60, beef: 152, pork: 94, lamb: 130, wool: 70, fuel: 40 },
  2017: { wheat: 50, corn: 40, soy: 92, milk: 62, beef: 150, pork: 95, lamb: 132, wool: 71, fuel: 48 },
  2018: { wheat: 52, corn: 42, soy: 88, milk: 64, beef: 155, pork: 97, lamb: 135, wool: 72, fuel: 55 },
  2019: { wheat: 55, corn: 44, soy: 90, milk: 66, beef: 158, pork: 99, lamb: 138, wool: 73, fuel: 52 },
  2020: { wheat: 58, corn: 46, soy: 98, milk: 64, beef: 155, pork: 105, lamb: 140, wool: 72, fuel: 38 },
  2021: { wheat: 68, corn: 58, soy: 115, milk: 70, beef: 168, pork: 108, lamb: 148, wool: 75, fuel: 65 },
  2022: { wheat: 105, corn: 80, soy: 145, milk: 75, beef: 175, pork: 110, lamb: 155, wool: 78, fuel: 105 },
  2023: { wheat: 75, corn: 60, soy: 125, milk: 72, beef: 170, pork: 106, lamb: 150, wool: 76, fuel: 90 },
  2024: { wheat: 65, corn: 52, soy: 115, milk: 70, beef: 165, pork: 104, lamb: 146, wool: 74, fuel: 85 },
  2025: { wheat: 62, corn: 50, soy: 112, milk: 70, beef: 162, pork: 103, lamb: 144, wool: 74, fuel: 82 },
  2026: { wheat: 62, corn: 50, soy: 112, milk: 70, beef: 162, pork: 103, lamb: 144, wool: 74, fuel: 82 },
};

/**
 * Returns the historical baseline price for a commodity in a given calendar year.
 * Interpolates linearly between table entries for smooth transitions.
 */
export function getHistoricalBaseline(commodityId: string, calendarYear: number): number {
  const clampedYear = Math.max(1970, Math.min(2026, calendarYear));
  const entry = PRICE_TABLE[clampedYear];
  if (entry) {
    const key = commodityId as keyof CommodityBaselines;
    return entry[key] ?? 0;
  }
  // Fallback: linear interpolation between nearest years
  const years = Object.keys(PRICE_TABLE).map(Number).sort((a, b) => a - b);
  const lower = years.filter(y => y <= clampedYear).pop() ?? years[0];
  const upper = years.find(y => y > clampedYear) ?? years[years.length - 1];
  if (lower === upper) return PRICE_TABLE[lower]?.[commodityId as keyof CommodityBaselines] ?? 0;
  const t = (clampedYear - lower) / (upper - lower);
  const lo = PRICE_TABLE[lower]?.[commodityId as keyof CommodityBaselines] ?? 0;
  const hi = PRICE_TABLE[upper]?.[commodityId as keyof CommodityBaselines] ?? 0;
  return Math.round(lo + (hi - lo) * t);
}
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "historicalPrices"
```
Expected: no errors.

- [ ] **Commit**

```bash
git add data/historicalPrices.ts
git commit -m "feat(timeline): add historical commodity price table (1970-2026)"
```

---

## Task 4: Timeline Engine Pure Functions

**Files:**
- Create: `engine/timeline.ts`

Pure functions only. No Zustand imports. Takes state in, returns new state out.

- [ ] **Create `engine/timeline.ts`**

```typescript
// engine/timeline.ts
import { HistoricalEvent, EventEffect } from '../data/historicalEvents';
import { isoDateToGameDay } from './calendarUtils';

export type ActiveHistoricalEvent = {
  eventId: string;
  triggerDay: number;
  /** Current phase in the event lifecycle. */
  phase: 'rampUp' | 'peak' | 'rampDown';
  /** Days elapsed in the current phase. */
  daysInPhase: number;
};

export type TimelineState = {
  /** Game days of events that have already fired — prevents re-firing. */
  firedEventIds: string[];
  /** Events currently applying effects to the game world. */
  activeHistoricalEvents: ActiveHistoricalEvent[];
  /**
   * Current combined multipliers per target.
   * e.g. { fuel_cost: 1.4, wheat_price: 0.72 }
   * A multiplier of 1.0 means no change.
   */
  effectMultipliers: Record<string, number>;
  /**
   * Product/engine/mechanic IDs that are now historically available.
   * Populated by UnlockGate entries in fired events.
   */
  unlockedIds: string[];
  /**
   * Event queued for display to the player. Set when an event fires.
   * The UI clears this after showing the modal/toast.
   */
  pendingDisplayEvent: HistoricalEvent | null;
};

export const INITIAL_TIMELINE_STATE: TimelineState = {
  firedEventIds: [],
  activeHistoricalEvents: [],
  effectMultipliers: {},
  unlockedIds: [],
  pendingDisplayEvent: null,
};

/** Returns events that should fire on the given game day. */
export function getEventsToFire(
  currentDay: number,
  firedEventIds: string[],
  allEvents: HistoricalEvent[]
): HistoricalEvent[] {
  return allEvents.filter(event => {
    const triggerDay = isoDateToGameDay(event.date);
    return triggerDay === currentDay && !firedEventIds.includes(event.id);
  });
}

/**
 * Computes the current multiplier contribution for one active event,
 * based on its lifecycle phase and days elapsed in that phase.
 */
function computeEventMultipliers(
  event: HistoricalEvent,
  active: ActiveHistoricalEvent
): Record<string, number> {
  let progress = 0;

  if (active.phase === 'rampUp') {
    progress = event.rampUpDays > 0
      ? Math.min(1, active.daysInPhase / event.rampUpDays)
      : 1;
  } else if (active.phase === 'peak') {
    progress = 1;
  } else if (active.phase === 'rampDown') {
    progress = event.rampDownDays > 0
      ? Math.max(0, 1 - active.daysInPhase / event.rampDownDays)
      : 0;
  }

  const result: Record<string, number> = {};
  for (const effect of event.effects) {
    if (effect.multiplier !== undefined) {
      // Interpolate from 1.0 (no change) to the peak multiplier
      result[effect.target] = 1 + (effect.multiplier - 1) * progress;
    }
  }
  return result;
}

/**
 * Combines multipliers from all active events for a given target.
 * Multipliers stack multiplicatively.
 */
export function computeCombinedMultipliers(
  activeEvents: ActiveHistoricalEvent[],
  allEvents: HistoricalEvent[]
): Record<string, number> {
  const combined: Record<string, number> = {};

  for (const active of activeEvents) {
    const event = allEvents.find(e => e.id === active.eventId);
    if (!event) continue;
    const multipliers = computeEventMultipliers(event, active);
    for (const [target, mult] of Object.entries(multipliers)) {
      combined[target] = (combined[target] ?? 1) * mult;
    }
  }

  return combined;
}

/**
 * Advances the lifecycle of all active events by one day.
 * Returns the updated active events list and any that have completed.
 */
function advanceActiveEvents(
  activeEvents: ActiveHistoricalEvent[],
  allEvents: HistoricalEvent[]
): { updated: ActiveHistoricalEvent[]; completed: string[] } {
  const updated: ActiveHistoricalEvent[] = [];
  const completed: string[] = [];

  for (const active of activeEvents) {
    const event = allEvents.find(e => e.id === active.eventId);
    if (!event) continue;

    let { phase, daysInPhase } = active;
    daysInPhase += 1;

    if (phase === 'rampUp' && daysInPhase >= event.rampUpDays) {
      phase = 'peak';
      daysInPhase = 0;
    } else if (phase === 'peak' && daysInPhase >= event.peakDays) {
      if (event.rampDownDays === 0) {
        // Permanent change — stays in peak forever
        updated.push({ ...active, phase, daysInPhase });
        continue;
      }
      phase = 'rampDown';
      daysInPhase = 0;
    } else if (phase === 'rampDown' && daysInPhase >= event.rampDownDays) {
      completed.push(active.eventId);
      continue;
    }

    updated.push({ ...active, phase, daysInPhase });
  }

  return { updated, completed };
}

/**
 * Main per-day update function. Call from advanceDay in useGameStore.
 * Returns the new TimelineState.
 */
export function advanceTimeline(
  state: TimelineState,
  currentDay: number,
  allEvents: HistoricalEvent[]
): TimelineState {
  // 1. Find events that fire today
  const toFire = getEventsToFire(currentDay, state.firedEventIds, allEvents);

  // 2. Activate them
  const newActive: ActiveHistoricalEvent[] = toFire.map(event => ({
    eventId: event.id,
    triggerDay: currentDay,
    phase: event.rampUpDays > 0 ? 'rampUp' : 'peak',
    daysInPhase: 0,
  }));

  // 3. Collect new unlocks
  const newUnlocks = toFire.flatMap(e => (e.unlocks ?? []).map(u => u.id));

  // 4. Advance existing active events
  const { updated, completed: _ } = advanceActiveEvents(
    [...state.activeHistoricalEvents, ...newActive],
    allEvents
  );

  // 5. Recompute combined multipliers
  const effectMultipliers = computeCombinedMultipliers(updated, allEvents);

  // 6. Queue the most recent major event for display (if any fired today)
  const majorToday = toFire.find(e => e.tier === 'major');
  const minorToday = toFire.find(e => e.tier === 'minor');
  const pendingDisplayEvent = majorToday ?? minorToday ?? state.pendingDisplayEvent;

  return {
    firedEventIds: [...state.firedEventIds, ...toFire.map(e => e.id)],
    activeHistoricalEvents: updated,
    effectMultipliers,
    unlockedIds: [...new Set([...state.unlockedIds, ...newUnlocks])],
    pendingDisplayEvent,
  };
}

/**
 * Returns the current multiplier for a given target.
 * Returns 1.0 if no events are affecting this target.
 */
export function getTimelineMultiplier(
  state: TimelineState,
  target: string
): number {
  return state.effectMultipliers[target] ?? 1;
}

/**
 * Returns true if a product/engine/mechanic ID has been historically unlocked.
 */
export function isHistoricallyUnlocked(state: TimelineState, id: string): boolean {
  return state.unlockedIds.includes(id);
}

/** Clears the pending display event after the UI has shown it. */
export function clearPendingDisplayEvent(state: TimelineState): TimelineState {
  return { ...state, pendingDisplayEvent: null };
}
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "timeline"
```
Expected: no errors.

- [ ] **Commit**

```bash
git add engine/timeline.ts
git commit -m "feat(timeline): add pure timeline engine with event firing and effect curves"
```

---

## Task 5: Add TimelineState to useGameStore

**Files:**
- Modify: `store/useGameStore.ts`

Add `timeline` state field and the import. Do not touch advanceDay yet.

- [ ] **Add imports at the top of `store/useGameStore.ts`**

Find the existing imports block (around line 1–200). Add after the last engine import:

```typescript
import { advanceTimeline, clearPendingDisplayEvent, getTimelineMultiplier, isHistoricallyUnlocked, INITIAL_TIMELINE_STATE, TimelineState } from '../engine/timeline';
import { HISTORICAL_EVENTS } from '../data/historicalEvents';
import { getHistoricalBaseline } from '../data/historicalPrices';
import { gameDayToCalendarYear } from '../engine/calendarUtils';
```

- [ ] **Add `timeline` to the store state type**

Find the main state type definition (search for `day: number;` — around line 561). Add:

```typescript
timeline: TimelineState;
```

- [ ] **Add `timeline` to the initial state**

Find where initial state is set (around line 1337 where `day: 1,` appears). Add:

```typescript
timeline: INITIAL_TIMELINE_STATE,
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep -E "timeline|TimelineState" | head -20
```
Expected: no errors. If you see "Property 'timeline' does not exist on type", check that you added it to both the interface and the initial state.

- [ ] **Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(timeline): add TimelineState slice to useGameStore"
```

---

## Task 6: Wire Timeline Engine into advanceDay

**Files:**
- Modify: `store/useGameStore.ts`

Find `advanceDay` at line 1557. At the **very beginning** of the advanceDay action body (before all other engine calls), add the timeline update.

- [ ] **Locate the start of advanceDay's set() callback**

```bash
grep -n "advanceDay:" granja-tycoon/store/useGameStore.ts
```

Read 5 lines after that line to find where the `set((state) => {` or `set(state => {` begins.

- [ ] **Add timeline advance as the first operation in advanceDay**

Inside the set callback, before any other state computation, add:

```typescript
// ── Historical Timeline ───────────────────────────────────────────────
const newTimeline = advanceTimeline(state.timeline, newDay, HISTORICAL_EVENTS);
```

(Note: `newDay` is the incremented day value computed at the start of advanceDay — find it by searching for `const newDay` near line 1557.)

- [ ] **Include `timeline: newTimeline` in the returned state object**

Find the large object returned from the `set()` call at the end of advanceDay (the one containing `currentDay: newDay` around line 3468). Add:

```typescript
timeline: newTimeline,
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Smoke test in the running app**

```bash
cd granja-tycoon && npx expo start --web
```

Open the app, skip several days past game day 287 (Oct 1970). Open the browser console and add a temporary log:

In `advanceDay`, temporarily add after the timeline line:
```typescript
if (newTimeline.firedEventIds.length > 0) console.log('[timeline] fired:', newTimeline.firedEventIds);
```

Advance days past day 287. You should see `[timeline] fired: ["1970-epa-founded"]` in the console. Remove the log after verifying.

- [ ] **Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(timeline): wire timeline engine into advanceDay loop"
```

---

## Task 7: Gate Existing Engines by Calendar Year

**Files:**
- Modify: `store/useGameStore.ts`

Existing engines that were implemented before their historical activation date must be skipped until that date. Find each engine call in advanceDay and wrap it.

- [ ] **Find existing engine call sites in advanceDay**

```bash
grep -n "organic\|capSubsid\|csaEngine\|hedgerow\|precision\|nightOps" granja-tycoon/store/useGameStore.ts | grep -v "import\|type\|//" | head -30
```

For each engine, identify the line where its `advanceDay` / tick function is called.

- [ ] **Compute `calYear` once near the top of advanceDay**

After the `newTimeline` line, add:

```typescript
const calYear = gameDayToCalendarYear(newDay);
```

- [ ] **Wrap each engine call with its activation year guard**

For organic certification engine calls, wrap with:
```typescript
if (calYear >= 1990) {
  // existing organic cert engine call
}
```

For CAP subsidies:
```typescript
if (calYear >= 1992) {
  // existing CAP subsidies engine call
}
```

For CSA engine:
```typescript
if (calYear >= 1984) {
  // existing CSA engine call
}
```

For hedgerow EFA counting:
```typescript
if (calYear >= 1992) {
  // existing hedgerow EFA call
}
```

For nightOps productivity/wage effects (currently not wired — skip this gate until Phase 2):
```typescript
// nightOps: already partially wired; no additional gating needed
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Smoke test**

Start a new game (day 1 = 1970). Verify in the app that the Organic Certification screen shows no certifiable status before 1990. You can fast-advance by calling `advanceDays(7200)` from the console (7200 days = 20 years) and checking the office screen.

- [ ] **Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(timeline): gate existing engines by historical activation year"
```

---

## Task 8: Apply Timeline Multipliers in priceEngine

**Files:**
- Modify: `engine/priceEngine.ts`
- Modify: `store/useGameStore.ts` (pass multipliers to priceEngine call)

The priceEngine uses `COMMODITY_BASELINES` from `data/prices.ts`. We need to: (a) override the baseline with historical prices, and (b) apply timeline event multipliers.

- [ ] **Read the priceEngine tick function signature**

```bash
grep -n "export function\|export const" granja-tycoon/engine/priceEngine.ts | head -20
```

Note the function name and its parameters.

- [ ] **Add parameters to the priceEngine tick function**

Find the main price update function in `engine/priceEngine.ts`. Add two new optional parameters:

```typescript
export function tickMarketPrices(
  prices: MarketPrice[],
  // ... existing params ...
  calendarYear: number = 1970,
  timelineMultipliers: Record<string, number> = {}
): MarketPrice[] {
```

- [ ] **Apply historical baseline inside the function**

Find where `rawBaseline` is computed (around line 168):

```typescript
const rawBaseline = COMMODITY_BASELINES[p.cropId] ?? p.basePrice;
```

Replace with:

```typescript
const historicalBase = getHistoricalBaseline(p.cropId, calendarYear);
const rawBaseline = (historicalBase > 0 ? historicalBase : COMMODITY_BASELINES[p.cropId]) ?? p.basePrice;
```

Add the import at the top of `engine/priceEngine.ts`:
```typescript
import { getHistoricalBaseline } from '../data/historicalPrices';
```

- [ ] **Apply timeline multipliers to the effective baseline**

After the `rawBaseline` line, add:

```typescript
// Map cropId to timeline target key (wheat → wheat_price, etc.)
const timelineTarget = `${p.cropId}_price`;
const timelineMult = timelineMultipliers[timelineTarget] ?? timelineMultipliers['all_crop_prices'] ?? 1;
const effectiveBaseline = rawBaseline * timelineMult;
```

Then use `effectiveBaseline` wherever `rawBaseline` was previously used in price calculations (check the lines below — typically there is one usage).

- [ ] **Pass `calYear` and multipliers from useGameStore to priceEngine**

In `useGameStore.ts`, find where the priceEngine tick is called inside `advanceDay`. Pass the new arguments:

```typescript
tickMarketPrices(
  state.marketPrices,
  // ... existing args ...,
  calYear,
  newTimeline.effectMultipliers
)
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Smoke test**

Advance to game day 1367 (Oct 17, 1973 — the oil embargo). Check the market screen. Fuel cost (if visible) should show the multiplier taking effect. Wheat price should be elevated from its 1973 baseline (~80 vs 1970's ~42).

- [ ] **Commit**

```bash
git add engine/priceEngine.ts store/useGameStore.ts data/historicalPrices.ts
git commit -m "feat(timeline): apply historical prices and event multipliers in priceEngine"
```

---

## Task 9: NewspaperModal Component

**Files:**
- Create: `components/NewspaperModal.tsx`

Shown when a major historical event fires. Full-screen modal with era-appropriate newspaper styling.

- [ ] **Create `components/NewspaperModal.tsx`**

```typescript
// components/NewspaperModal.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { HistoricalEvent } from '../data/historicalEvents';
import { gameDayToDisplayDate } from '../engine/calendarUtils';

type Props = {
  event: HistoricalEvent | null;
  currentDay: number;
  onDismiss: () => void;
};

export default function NewspaperModal({ event, currentDay, onDismiss }: Props) {
  if (!event) return null;

  const dateDisplay = gameDayToDisplayDate(currentDay);
  const effectLines = event.effects.map(e => {
    if (e.multiplier !== undefined) {
      const pct = Math.round((e.multiplier - 1) * 100);
      const sign = pct >= 0 ? '+' : '';
      return `${e.target.replace(/_/g, ' ')}: ${sign}${pct}%`;
    }
    if (e.absolute !== undefined) {
      const pct = Math.round(e.absolute * 100);
      return `${e.target.replace(/_/g, ' ')}: +${pct}%`;
    }
    return null;
  }).filter(Boolean);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.paper}>
          {/* Masthead */}
          <View style={styles.masthead}>
            <Text style={styles.mastheadTitle}>THE FARM GAZETTE</Text>
            <View style={styles.mastheadLine} />
            <Text style={styles.mastheadDate}>{dateDisplay}</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>{event.headline.toUpperCase()}</Text>
          <View style={styles.divider} />

          {/* Narrative */}
          <Text style={styles.body}>{event.narrative}</Text>

          {/* Effects box */}
          {effectLines.length > 0 && (
            <View style={styles.effectBox}>
              <Text style={styles.effectTitle}>FARM IMPACT</Text>
              {effectLines.map((line, i) => (
                <Text key={i} style={styles.effectLine}>⚠ {line}</Text>
              ))}
            </View>
          )}

          {event.unlocks && event.unlocks.length > 0 && (
            <View style={[styles.effectBox, { borderColor: '#27ae60', backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.effectTitle, { color: '#27ae60' }]}>NOW AVAILABLE</Text>
              {event.unlocks.map((u, i) => (
                <Text key={i} style={[styles.effectLine, { color: '#27ae60' }]}>✓ {u.id.replace(/_/g, ' ')}</Text>
              ))}
            </View>
          )}

          {/* Dismiss */}
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Continue Farming →</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  paper: {
    backgroundColor: '#f5f0e8',
    borderRadius: 4,
    padding: 20,
    maxWidth: Math.min(Dimensions.get('window').width - 32, 480),
    width: '100%',
  },
  masthead: { alignItems: 'center', marginBottom: 10 },
  mastheadTitle: {
    fontFamily: 'serif',
    fontSize: 11,
    letterSpacing: 4,
    color: '#5d4037',
    fontWeight: 'bold',
  },
  mastheadLine: {
    height: 2,
    backgroundColor: '#5d4037',
    width: '100%',
    marginVertical: 4,
  },
  mastheadDate: {
    fontFamily: 'serif',
    fontSize: 10,
    color: '#795548',
  },
  headline: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    lineHeight: 26,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#8d6e63',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'serif',
    fontSize: 13,
    color: '#333',
    lineHeight: 21,
    marginBottom: 14,
  },
  effectBox: {
    borderWidth: 1,
    borderColor: '#e65100',
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  effectTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#e65100',
    marginBottom: 4,
  },
  effectLine: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#4a7c59',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'serif',
    fontSize: 14,
  },
});
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "NewspaperModal"
```

- [ ] **Commit**

```bash
git add components/NewspaperModal.tsx
git commit -m "feat(timeline): add NewspaperModal component for major historical events"
```

---

## Task 10: HistoricalToast Component

**Files:**
- Create: `components/HistoricalToast.tsx`

Non-blocking banner for minor events. Slides in from top, auto-dismisses after 6 seconds.

- [ ] **Create `components/HistoricalToast.tsx`**

```typescript
// components/HistoricalToast.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { HistoricalEvent } from '../data/historicalEvents';
import { gameDayToDisplayDate } from '../engine/calendarUtils';

type Props = {
  event: HistoricalEvent | null;
  currentDay: number;
  onDismiss: () => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  economic: '📈',
  technology: '⚙️',
  regulation: '📋',
  disease: '🦠',
  weather: '🌩️',
  genetics: '🧬',
  product: '🛒',
};

export default function HistoricalToast({ event, currentDay, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (!event) return;

    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5400),
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [event?.id]);

  if (!event) return null;

  const icon = CATEGORY_ICONS[event.category] ?? '📰';
  const effectSummary = event.effects[0]
    ? (() => {
        const e = event.effects[0];
        if (e.multiplier !== undefined) {
          const pct = Math.round((e.multiplier - 1) * 100);
          const sign = pct >= 0 ? '+' : '';
          return `${e.target.replace(/_/g, ' ')}: ${sign}${pct}%`;
        }
        return '';
      })()
    : '';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textBlock}>
        <Text style={styles.date}>{gameDayToDisplayDate(currentDay).toUpperCase()}</Text>
        <Text style={styles.headline} numberOfLines={1}>{event.headline}</Text>
        {effectSummary ? <Text style={styles.effect}>⚠ {effectSummary}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a2a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#4a7c59',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    gap: 10,
  },
  icon: { fontSize: 22 },
  textBlock: { flex: 1 },
  date: { fontSize: 9, color: '#7cb87e', letterSpacing: 1 },
  headline: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  effect: { fontSize: 10, color: '#f39c12', marginTop: 2 },
});
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep "HistoricalToast"
```

- [ ] **Commit**

```bash
git add components/HistoricalToast.tsx
git commit -m "feat(timeline): add HistoricalToast banner for minor historical events"
```

---

## Task 11: Add Calendar Year to GameHUD

**Files:**
- Modify: `components/GameHUD.tsx`

The existing GameHUD shows game status. Add the calendar year prominently. Read the file before editing.

- [ ] **Read the full GameHUD component**

```bash
wc -l granja-tycoon/components/GameHUD.tsx
```

Then read it fully to understand its current layout before adding anything.

- [ ] **Add the calendar year display**

Add the import at the top of `GameHUD.tsx`:
```typescript
import { gameDayToCalendarYear, gameDayToDisplayDate } from '../engine/calendarUtils';
```

Inside the component, after the existing `day` state selector, add:
```typescript
const calYear = gameDayToCalendarYear(day);
```

In the JSX, find a suitable place in the existing HUD layout (near where the current day or season is shown) and add:
```tsx
<View style={styles.yearBadge}>
  <Text style={styles.yearText}>{calYear}</Text>
</View>
```

Add to StyleSheet:
```typescript
yearBadge: {
  backgroundColor: '#2d4a2d',
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 2,
},
yearText: {
  color: '#f39c12',
  fontSize: 18,
  fontWeight: 'bold',
  letterSpacing: 2,
},
```

- [ ] **Verify visually**

Run the app, check that the calendar year (starting at 1970) is visible in the HUD on every screen.

- [ ] **Commit**

```bash
git add components/GameHUD.tsx
git commit -m "feat(timeline): add calendar year (starting 1970) to GameHUD"
```

---

## Task 12: Mount UI Components in Layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

Wire `NewspaperModal` and `HistoricalToast` into the tab layout so they appear over all screens.

- [ ] **Read the current `app/(tabs)/_layout.tsx`**

```bash
cat granja-tycoon/app/\(tabs\)/_layout.tsx
```

Understand the existing structure before adding anything.

- [ ] **Add imports**

```typescript
import NewspaperModal from '../../components/NewspaperModal';
import HistoricalToast from '../../components/HistoricalToast';
import { useGameStore } from '../../store/useGameStore';
import { clearPendingDisplayEvent } from '../../engine/timeline';
```

- [ ] **Add state and dismiss handler in the layout component**

```typescript
const day = useGameStore(s => s.day);
const timeline = useGameStore(s => s.timeline);
const setTimeline = useGameStore(s => s.setTimeline); // see note below
const pendingEvent = timeline.pendingDisplayEvent;

function handleDismissEvent() {
  setTimeline(clearPendingDisplayEvent(timeline));
}
```

> **Note:** You need a `setTimeline` action in useGameStore if one doesn't exist. Add it in the store:
> ```typescript
> setTimeline: (tl: TimelineState) => set({ timeline: tl }),
> ```
> Add `setTimeline: (tl: TimelineState) => void;` to the state type.

- [ ] **Render modals in the JSX**

Wrap the existing `<Tabs>` (or whatever the root element is) in a `<View style={{flex:1}}>` and add the components after it:

```tsx
<View style={{ flex: 1 }}>
  <Tabs {/* existing props */}>
    {/* existing tab screens */}
  </Tabs>

  {/* Historical event UI — major events use modal, minor use toast */}
  {pendingEvent?.tier === 'major' && (
    <NewspaperModal
      event={pendingEvent}
      currentDay={day}
      onDismiss={handleDismissEvent}
    />
  )}
  {pendingEvent?.tier === 'minor' && (
    <HistoricalToast
      event={pendingEvent}
      currentDay={day}
      onDismiss={handleDismissEvent}
    />
  )}
</View>
```

- [ ] **Verify with TypeScript**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Smoke test the full event flow**

Run the app. Advance to day 287 (1970-10-17, EPA founding — minor). You should see the toast slide in and auto-dismiss. Advance to day 1367 (1973-10-17, oil embargo — major). The newspaper modal should appear and block the game until dismissed.

- [ ] **Commit**

```bash
git add app/\(tabs\)/_layout.tsx store/useGameStore.ts
git commit -m "feat(timeline): mount NewspaperModal and HistoricalToast in tab layout"
```

---

## Task 13: Gate Shop Items by Historical Unlock

**Files:**
- Modify: `components/market/ShopSection.tsx`

Items with an `unlockId` that hasn't fired yet should be hidden from the shop.

- [ ] **Read `components/market/ShopSection.tsx`**

Understand how shop items are currently structured and rendered. Look for the item array/list that gets mapped into UI elements.

- [ ] **Add the unlock check**

Add the import:
```typescript
import { useGameStore } from '../../store/useGameStore';
import { isHistoricallyUnlocked } from '../../engine/timeline';
```

Inside the component:
```typescript
const timeline = useGameStore(s => s.timeline);
```

When rendering shop items, filter any item that has an `unlockId` property:
```typescript
const visibleItems = shopItems.filter(item =>
  !item.unlockId || isHistoricallyUnlocked(timeline, item.unlockId)
);
```

> **Note:** Shop items may not currently have an `unlockId` field. If they don't, you need to add it to the item type and set it on items that correspond to historical unlocks (e.g., `herbicide_glyphosate_t1`, `tractor_4wd_t1`, `bst_treatment`). Find the shop item data — likely in `data/prices.ts` or similar — and add `unlockId?: string` to those items. Match the `unlockId` values exactly to the `id` strings in the `UnlockGate` entries in `historicalEvents.ts`.

- [ ] **Verify the glyphosate herbicide is hidden before 1974**

Start a new game (day 1 = 1970). Open the shop. The glyphosate herbicide tier should not be visible. Advance past day 1323 (Sep 1, 1974). The item should now appear.

- [ ] **Commit**

```bash
git add components/market/ShopSection.tsx
git commit -m "feat(timeline): gate shop items by historical unlock date"
```

---

## Task 14: Manual Verification Checklist

Run through these checks to confirm Phase 1 is working end-to-end.

- [ ] **Calendar year shows 1970 on game start**
  - Open app, verify HUD shows 1970.

- [ ] **Year advances correctly**
  - Advance 360 days. HUD should show 1971.

- [ ] **EPA event fires correctly (day 287, minor)**
  - Advance to day 287. Toast banner should slide in with "Environmental Protection Agency established".

- [ ] **Oil embargo fires correctly (day 1367, major)**
  - Advance to day 1367. Newspaper modal should appear with oil embargo narrative.
  - After dismissing, advance 30 more days. Check market — fuel cost multiplier should be approaching 1.4×.

- [ ] **Historical prices apply in 1973**
  - In 1973, wheat price in the market should be ~80 (vs ~42 in 1970). Confirm in the market screen.

- [ ] **Organic cert unavailable before 1990**
  - Start a new game in 1970. The organic certification section should show no available options.
  - Advance to 1990 (day 7201). Options should now appear.

- [ ] **Glyphosate herbicide gated until 1974**
  - In 1970, confirm glyphosate is not in the shop.
  - Advance to 1974. Confirm it appears.

- [ ] **No TypeScript errors**

```bash
cd granja-tycoon && npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **No ESLint errors in new files**

```bash
cd granja-tycoon && npx expo lint -- engine/timeline.ts engine/calendarUtils.ts data/historicalEvents.ts data/historicalPrices.ts components/NewspaperModal.tsx components/HistoricalToast.tsx
```

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat(timeline): Phase 1 complete — historical timeline engine, events 1970-1985, HUD year, shop gating"
```

---

## Phase 1 Completion Note

When Phase 1 is verified and merged, the following are ready for Phase 2 planning:
- `engine/dynasy.ts` — farmer aging, health, generational handoff, mentor phase, knowledge bank
- `TimelineState.unlockedIds` — already populated, Phase 2 can read from it
- `gameDayToCalendarYear()` — available for dynasty age calculations
- The `data/historicalEvents.ts` database — extend it continuously with 1986–2026 events in parallel with Phase 2 work

Phase 2 plan will be written after Phase 1 is live and stable.
