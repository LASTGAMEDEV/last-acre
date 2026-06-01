# Last Acre

Last Acre is a realistic farming simulation game built mobile-first with Expo, React Native, Expo Router, TypeScript, and Zustand.

The current prototype is a synchronous, tick-based farming game: one press of **Advance Day** runs the daily simulation for crops, livestock, workers, market prices, contracts, weather, processing, electricity, soil, pests, storage quality, cooperatives, and historical events.

## Run Locally

```bash
npm install
npm run start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit
```

## Project Shape

- `app/(tabs)/` — Expo Router screens. The visible tabs are Farm, Ops, Market, Office, and Legado.
- `components/` — reusable UI sections, modals, HUD, world map, and tab content.
- `store/useGameStore.ts` — central Zustand game state and actions.
- `engine/` — pure simulation helpers and game formulas.
- `data/` — static crops, products, buildings, machinery, prices, events, and NPC data.
- `types/` — shared TypeScript types and local package declaration shims.
- `docs/` — feature specs, implementation plans, and AI coding rules.

## Verification

Before handing off code, run:

```bash
npx tsc --noEmit
npm run lint
```

There is currently no automated test suite.

## Persistence

Game saves use the current storage key:

```text
granja-tycoon-save-v12
```

Do not rename persisted IDs or remove the Zustand `partialize` block without a deliberate save migration.
