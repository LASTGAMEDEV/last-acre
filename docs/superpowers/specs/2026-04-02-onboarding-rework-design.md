# Onboarding Rework — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Replace the rigid 5-step `FirstMission` linear progression with a contextual hint card system. Hints appear on relevant screens when a player hasn't yet performed that action. Each hint is dismissible and tracked in the store.

## Current State

`components/FirstMission.tsx` tracks `firstMissionStep` (0–5). `components/TutorialModal.tsx` shows a 2-section visual tutorial on first launch.

## New System: Contextual Hint Cards

A `HintCard` component renders a dismissible tip banner on the relevant screen. Each hint has:
- A unique `id`
- A `screen` it belongs to
- A `condition` checked against game state (e.g. "parcels owned < 3")
- A title, body text, and optional action button

Hints are shown only if:
1. `dismissedHints` does not include this hint's id
2. The condition is true (hint is relevant)

Dismissed hints are stored in `dismissedHints: string[]` in the store (persisted).

## Hint Catalog (12 hints)

| ID | Screen | Condition | Title | Body |
|----|--------|-----------|-------|------|
| `hint_plant` | tierras | no parcels planted | 🌱 Plant your first crop | Tap a field to open the planting menu. Start with wheat or corn — cheap seeds, steady returns. |
| `hint_harvest` | tierras | crop ready to harvest | ⏰ Harvest time! | One of your fields is ready. Tap it and press Harvest, or use Harvest All above. |
| `hint_sell` | economia | inventory > 0, money < 5000 | 💰 Sell your crops | Head to the Market tab and sell your harvest. Watch sell pressure — don't dump everything at once. |
| `hint_fertilize` | tierras | planted crop, fertilized = false | ✨ Boost your yield | Tap a planted field and apply fertilizer mid-growth for up to +35% extra yield. |
| `hint_animals` | animales | no animals owned | 🐄 Add livestock | Animals produce daily income without replanting. Start with chickens — cheap and consistent. |
| `hint_banking` | oficina | day > 30, money < 2000 | 🏦 Need capital? | You can take out a loan in the Office tab. Your credit score determines the rate. |
| `hint_contract` | oficina | no active contracts | 📋 Sign a contract | Delivery contracts pay a premium over market price. Check the Contracts tab in the Office. |
| `hint_processing` | procesado | inventory > 500 | 🏭 Add value | You can process raw crops into higher-value goods (flour, oil, etc.) in the Processing tab. |
| `hint_insurance` | seguros | day > 45, no insurance | 🛡️ Protect your farm | Random events can wipe out crops. Insurance in the Insurance tab covers losses cheaply. |
| `hint_auction` | subasta | day > 60, parcels owned < 5 | 🏷️ Buy more land | Check the Auction tab — land goes up for bid periodically. More land = more income. |
| `hint_workers` | trabajadores | day > 90, no workers | 👷 Hire workers | Workers automate tasks and boost yields. A field worker is a good first hire. |
| `hint_worldmap` | tierras | day > 30 | 🗺️ Explore the map | Tap "World Map" to see all available land. Scout rival farms and find fields for sale. |

## HintCard Component

```typescript
// components/HintCard.tsx
interface HintCardProps {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}
```

Styled as a compact amber-bordered card. ✕ dismiss button top-right. Optional action button (e.g. "Go to Market" using router.push).

## Store Changes

```typescript
// GameState additions:
dismissedHints: string[];
dismissHint: (id: string) => void;
```

`firstMissionStep` and `firstMissionDone` are kept for backwards save compatibility but `FirstMission` component is retired (hidden when `dismissedHints.length > 0` or replaced entirely).

## TutorialModal

Keep as-is but expand from 2 sections to 4: add sections for Animals and Banking to the existing Plant/Harvest and Seasons sections.

## Files Changed

| File | Action |
|------|--------|
| `store/useGameStore.ts` | Modify — add `dismissedHints`, `dismissHint` |
| `components/HintCard.tsx` | Create — dismissible tip card |
| `app/(tabs)/tierras.tsx` | Modify — add plant/harvest/fertilize/worldmap hints |
| `app/(tabs)/economia.tsx` | Modify — add sell hint |
| `app/(tabs)/animales.tsx` | Modify — add animals hint |
| `app/(tabs)/oficina.tsx` | Modify — add banking/contract hints |
| `app/(tabs)/procesado.tsx` | Modify — add processing hint |
| `app/(tabs)/seguros.tsx` | Modify — add insurance hint |
| `app/(tabs)/subasta.tsx` | Modify — add auction hint |
| `app/(tabs)/trabajadores.tsx` | Modify — add workers hint |
| `components/TutorialModal.tsx` | Modify — add Animals + Banking sections |
