# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start dev server (Expo Go or web)
npx expo start --web    # Web only
npx expo start --android
npx expo start --ios
npx expo lint           # ESLint
```

There is no test suite. There is no build step beyond Expo's bundler.

## Architecture Overview

**Granja Tycoon** is a React Native farming tycoon game built with Expo Router. All game logic is synchronous and tick-based (one "day" per button press).

### State: `store/useGameStore.ts`

Single Zustand store with `persist` middleware writing to `AsyncStorage` (key: `granja-tycoon-save-v8`). The store holds all game state and every action. `partialize` is used to exclude action functions from serialization — never remove it or rename the storage key without bumping the version, or hydration will silently overwrite functions with `{}`, breaking all buttons.

Key state groups:
- **Land:** `parcels[]` — 80 total, 2 initially owned. Each parcel has `fertility` (1–25), optional `plantedCrop`, `fieldEvent`, and `owned` flag.
- **Economy:** `money`, `savings`, `loans[]`, `salesLog[]`, `prices[]`, `priceHistory`, `newsEvents[]`
- **Production:** `inventory` (crops), `animalInventory`, `processedInventory` — all `Record<string, number>`
- **Livestock:** `animals[]`, `buildings: string[]` (building IDs), `machines[]`
- **Gameplay:** `day`, `contracts[]`, `auctionLots[]`, `insurances[]`, `forecast[]`

`advanceDay()` is the central action — it runs the full game tick: prices fluctuate, crops grow, animals produce, interest accrues, maintenance is charged, contracts checked, auctions resolved, field events spawn.

### Engine (`engine/`)

Pure functions, no side effects, no store access:

| File | Role |
|------|------|
| `climate.ts` | `Season` type (`'spring'|'summer'|'autumn'|'winter'`), `getSeason(day)`, `generateForecast()`. Seasons are 90 days each. |
| `crops.ts` | `harvestYield()` — applies fertility (1–25 → 0.5–1.0 modifier), fertilizer, weeds, climate, machine bonuses |
| `market.ts` | `applyDailyFluctuation()` (±2%), `sellRevenue()` (15% tax deducted) |
| `banking.ts` | Credit scoring, loan tiers, `calculateRate()`, `loanTotalOwed()`, `checkEligibility()`, `rollingIncome()` |
| `animals.ts` | `isMature()`, `sellValue()`, production collection logic |
| `contracts.ts` | `CONTRACT_TEMPLATES` — delivery contract definitions |

### Data (`data/`)

Static readonly definitions. Adding a new crop/animal/building means adding an entry here; the store and UI pick it up automatically.

- `cropTypes.ts` — 20 crops, 5 tiers (D/C/B/A/S), fields: `id`, `name`, `tier`, `growthDays`, `baseYield`, `basePrice`, `seedCost`, `waterNeed`, `unit`
- `buildingTypes.ts` — IDs like `bld_gallinero_s`, categories: `'animal' | 'silo' | 'industrial'`
- `animalTypes.ts` — `enclosureType` strings (`'gallinero'`, `'establo'`, etc.) must match `ENCLOSURE_BUILDINGS` map in the store
- `insuranceTypes.ts` — `InsuranceType` values (`'sequia'`, `'helada'`, `'plaga'`, `'incendio'`) are stored in game saves; do not rename them

### Screens (`app/(tabs)/`)

Each file is a full-page screen. Screens only read from the store and call store actions — no local business logic. The "Advance Day" button lives in `_layout.tsx` and is always visible across all tabs.

Tab route → Screen:
`tierras` Fields · `tienda` Shop · `animales` Animals · `maquinaria` Machinery · `oficina` Office (banking + contracts) · `economia` Economy · `clima` Weather · `subasta` Auction · `seguros` Insurance · `procesado` Processing

### Components (`components/`)

`DaySummaryModal.tsx` — overlay shown after each day advance, receives `events: string[]` from the store.

## Critical Web Compatibility Rules

These are active bugs/fixes that must be preserved:

1. **`metro.config.js` must keep `unstable_enablePackageExports: false`** — Zustand v5 ships an ESM build (`esm/*.mjs`) using `import.meta`, which crashes Metro's web output as a classic script. Disabling package exports forces the CJS build. Removing this breaks all buttons on web.

2. **`partialize` in persist config** — Must exclude all action functions from the Zustand store. If omitted, functions get serialized as `{}` in localStorage, hydration overwrites them, and all button presses silently fail. Storage key is `granja-tycoon-save-v8` — bump this if the state shape changes incompatibly.

3. **`GestureHandlerRootView`** wraps the app in `app/_layout.tsx`. Required for `react-native-gesture-handler` on web.

4. **No `pointerEvents` prop on the `<View>` wrapping `<Tabs>`** in `(tabs)/_layout.tsx` — `pointerEvents="box-none"` cascades as CSS `pointer-events: none` to all tab content on web, blocking all interaction.

## Internal IDs vs Display Strings

Several string values are stored in game saves and must not be renamed:
- Animal `enclosureType` values: `'gallinero'`, `'establo'`, `'caballeriza'`, `'pocilga'`, `'corral'`, `'colmena'`, `'conejera'`
- `InsuranceType` values: `'sequia'`, `'helada'`, `'plaga'`, `'incendio'`
- Building IDs: `bld_gallinero_s`, `bld_gallinero_l`, `bld_establo_s`, etc.
- Storage key: `granja-tycoon-save-v8`

Only `name`/`description`/`label` display fields should be changed for localization.
