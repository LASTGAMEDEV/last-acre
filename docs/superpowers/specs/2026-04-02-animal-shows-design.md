# Animal Shows & Competitions — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Once per season, players can enter animals in a county show. Animals are scored by their gene quality and traits. Top 3 placements earn cash prizes and prestige.

## Show Schedule

- One show per season (every 90 days), triggered at the season transition in `advanceDay()`
- Show category matches the season: Spring = Poultry & Rabbits, Summer = Cattle & Horses, Autumn = Sheep & Goats & Pigs, Winter = All species (Grand Show)
- Show announcement added to `newsEvents` 7 days before it opens (day 83/173/263/353 of the year)
- Entry window: days 84–89 of each season quarter
- Results resolved on day 90 (season transition)

## Entry Rules

- Max 1 animal per species entered
- Animal must be mature and not sick
- Entry fee: $200 per animal entered
- Player selects entries via `AnimalShowModal`

## Scoring Formula

```
score = (avgGeneScore × 100) × traitMultiplier × maturityBonus
```

- `avgGeneScore` = average of 4 genes (production, hardiness, growth, value), range 0.5–1.5
- `traitMultiplier`: +10% per positive trait (productive, hardy, beefy, fast_maturing)
- `maturityBonus`: 1.0 if mature, up to 1.1 for animals ≥ 2× maturity days old

NPC competitors are simulated with random scores between 40–85 (difficulty scales with game day: day 1–180 = easy, 181–360 = medium, 361+ = hard).

## Prizes

| Place | Cash | Prestige |
|-------|------|---------|
| 1st | $2,000 per entry | +5 |
| 2nd | $800 per entry | +2 |
| 3rd | $300 per entry | +1 |
| No placement | Entry fee refunded if score > 50 | — |

## Store Changes

```typescript
interface ShowEntry {
  animalId: string;
  species: string;
}

interface ShowResult {
  season: string;      // 'spring' | 'summer' | 'autumn' | 'winter'
  year: number;
  entries: { animalId: string; species: string; place: 1 | 2 | 3 | null; prize: number }[];
  totalPrize: number;
}

// GameState additions:
showEntries: ShowEntry[];           // current season's pending entries
showResults: ShowResult[];          // historical results
showWindowOpen: boolean;            // true during entry days 84-89
enterAnimalShow: (animalId: string) => void;
withdrawAnimalShow: (animalId: string) => void;
```

## UI

New `AnimalShowModal` component triggered from `app/(tabs)/animales.tsx` when `showWindowOpen` is true — a banner button appears at the top of the Animals screen.

Modal shows:
- Show name + season + entry deadline
- Eligible animals list (species matching current season, mature, not sick)
- Selected entries with score preview
- Entry fee total
- "Enter Show" confirm button

Results shown via `DaySummaryModal` on the day results resolve, and stored in `showResults` for history tab in animales.

## Files Changed

| File | Action |
|------|--------|
| `store/useGameStore.ts` | Modify — add show state/actions/advanceDay logic |
| `components/AnimalShowModal.tsx` | Create — entry UI |
| `app/(tabs)/animales.tsx` | Modify — add show banner + results history tab |
