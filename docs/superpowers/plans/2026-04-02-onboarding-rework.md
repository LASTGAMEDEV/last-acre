# Onboarding Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-step linear `FirstMission` banner with 12 contextual, dismissible `HintCard` components spread across all screens.
**Architecture:** A new `dismissedHints: string[]` array and `dismissHint(id)` action are added to the Zustand store. Each screen reads the array to decide whether to render its HintCard(s). The old `firstMissionStep` field is preserved in the store for save-file compatibility but is no longer driven by actions. A new reusable `HintCard` component handles all rendering.
**Tech Stack:** React Native, Zustand 5, TypeScript — no new dependencies.

---

## Task 1 — Add `dismissedHints` state + `dismissHint` action to the store

- [ ] In `store/useGameStore.ts`, add `dismissedHints` to the `GameState` interface (around line 396, alongside `firstMissionStep`):

```typescript
  dismissedHints: string[];  // IDs of hints the player has permanently dismissed
```

- [ ] In `makeInitialState()` (around line 618), add:

```typescript
    dismissedHints: [] as string[],
```

- [ ] In the actions block of `GameState` (around line 448, after `markTutorialSeen`), add the signature:

```typescript
  dismissHint: (id: string) => void;
```

- [ ] Add the implementation inside the `create(...)` call (after `markTutorialSeen: () => set({ tutorialSeen: true }),`):

```typescript
      dismissHint: (id) => {
        const state = get();
        if ((state.dismissedHints ?? []).includes(id)) return;
        set({ dismissedHints: [...(state.dismissedHints ?? []), id] });
      },
```

- [ ] Add `dismissHint` to the `partialize` destructure (around line 3649), so it is not serialised:

```typescript
          dismissHint,
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(onboarding): add dismissedHints state and dismissHint action to store"
  ```

---

## Task 2 — Create `components/HintCard.tsx`

- [ ] Create `components/HintCard.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';

interface Props {
  id: string;
  title: string;
  body: string;
  /** Optional label for a primary action button */
  actionLabel?: string;
  /** Called when the action button is tapped */
  onAction?: () => void;
}

/**
 * A contextual, dismissible hint card with an amber border.
 * Renders nothing once the hint ID is in `dismissedHints`.
 */
export default function HintCard({ id, title, body, actionLabel, onAction }: Props) {
  const { dismissedHints, dismissHint } = useGameStore();

  if ((dismissedHints ?? []).includes(id)) return null;

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <Text style={s.title}>💡 {title}</Text>
        <TouchableOpacity onPress={() => dismissHint(id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.body}>{body}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={s.actionBtn} onPress={onAction}>
          <Text style={s.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:      { margin: 10, marginBottom: 0, borderWidth: 1, borderColor: '#7a5c00', backgroundColor: '#1e1600', borderRadius: 8, padding: 12 },
  topRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  title:     { color: '#ffd700', fontSize: 13, fontWeight: 'bold', flex: 1 },
  dismiss:   { color: '#7a5c00', fontSize: 16, paddingLeft: 8 },
  body:      { color: '#c8a86b', fontSize: 12, lineHeight: 18 },
  actionBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#7a5c00', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  actionText:{ color: '#ffd700', fontSize: 12, fontWeight: 'bold' },
});
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add components/HintCard.tsx && git commit -m "feat(onboarding): create HintCard dismissible component"
  ```

---

## Task 3 — Add 4 hints to `app/(tabs)/tierras.tsx`

- [ ] Import `HintCard` and `useRouter` at the top of `tierras.tsx` (these may already be imported — check before adding):

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the `useGameStore` destructure, add `dismissedHints` and `day` (if not already present).

- [ ] Derive hint visibility booleans near the top of the component function, after store destructure:

```typescript
  // HintCard conditions
  const hasPlanted    = parcels.some(p => p.owned && p.plantedCrop);
  const hasReadyCrop  = parcels.some(p => p.owned && p.plantedCrop && p.plantedCrop.daysLeft === 0);
  const hasUnfertile  = parcels.some(p => p.owned && p.plantedCrop && !p.plantedCrop.fertilized);
```

- [ ] Immediately after the `<ScreenHeader ... />` line, insert the four hint cards:

```typescript
{/* Hint: plant first crop */}
{!hasPlanted && (
  <HintCard
    id="hint_plant"
    title="Plant your first crop"
    body="Tap any owned parcel (green), then tap Till and Plant Crop to get started. Crops take a few days to mature."
  />
)}

{/* Hint: harvest ready crop */}
{hasReadyCrop && (
  <HintCard
    id="hint_harvest"
    title="Crop is ready to harvest!"
    body="One or more of your crops has finished growing. Tap the parcel and hit Harvest to collect it."
  />
)}

{/* Hint: fertilize planted crop */}
{hasUnfertile && !hasReadyCrop && (
  <HintCard
    id="hint_fertilize"
    title="Boost yield with fertilizer"
    body="You have a growing crop that wasn't fertilized. Buy fertilizer from the Shop and apply it to increase your harvest by up to 30%."
  />
)}

{/* Hint: explore the world map */}
{day > 30 && (
  <HintCard
    id="hint_worldmap"
    title="Expand to new regions"
    body="After day 30 you can scout and purchase fields on the World Map. Bigger farms unlock better contracts and prestige bonuses."
  />
)}
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/(tabs)/tierras.tsx && git commit -m "feat(onboarding): add plant/harvest/fertilize/worldmap hint cards to tierras"
  ```

---

## Task 4 — Add `hint_sell` to `app/(tabs)/economia.tsx`

- [ ] Import `HintCard` at the top of `economia.tsx`:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the `useGameStore` destructure, ensure `money` and `inventory` are present (they already are per the existing file).

- [ ] Derive hint condition near the top of the component function:

```typescript
  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);
  const showSellHint   = totalInventory > 0 && money < 5000;
```

- [ ] After the `<ScreenHeader ... />` line (before the tab bar), insert:

```typescript
{showSellHint && (
  <HintCard
    id="hint_sell"
    title="You have crops to sell!"
    body="Your inventory has stock but funds are low. Go to the Market tab, select a crop, and tap Sell All to convert it to cash."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/economia.tsx && git commit -m "feat(onboarding): add sell hint card to economia screen"
  ```

---

## Task 5 — Add `hint_animals` to `app/(tabs)/animales.tsx`

- [ ] Import `HintCard` at the top of `animales.tsx`:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the component, derive:

```typescript
  const hasAnimals = animals.length > 0;
```

- [ ] After the `<ScreenHeader ... />` line (and after the show banner from Plan 5 if implemented), insert:

```typescript
{!hasAnimals && (
  <HintCard
    id="hint_animals"
    title="Start your livestock"
    body="Animals produce eggs, milk, honey, wool, and meat every day. Buy a chicken coop from the Shop first, then purchase hens from this screen."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/animales.tsx && git commit -m "feat(onboarding): add animals hint card to animales screen"
  ```

---

## Task 6 — Add `hint_banking` + `hint_contract` to `app/(tabs)/oficina.tsx`

- [ ] Import `HintCard` at the top of `oficina.tsx`:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the component, derive:

```typescript
  const hasLoan      = loans.length > 0;
  const hasContract  = contracts.some(c => !c.fulfilled);
```

- [ ] After the `<ScreenHeader ... />` line, insert:

```typescript
{!hasLoan && (
  <HintCard
    id="hint_banking"
    title="Banking & Loans"
    body="Need capital? The Banking tab lets you take loans at rates based on your credit score. Repay on time to unlock larger tiers."
  />
)}

{!hasContract && (
  <HintCard
    id="hint_contract"
    title="Sign a delivery contract"
    body="Contracts guarantee a buyer for your crops at a fixed price. Go to the Contracts tab and accept an offer — fulfilled contracts raise your reputation."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/oficina.tsx && git commit -m "feat(onboarding): add banking and contract hint cards to oficina screen"
  ```

---

## Task 7 — Add `hint_processing` to `app/(tabs)/procesado.tsx`

- [ ] Import `HintCard` at the top of `procesado.tsx`:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the component, derive:

```typescript
  const hasProcessed = Object.values(processedInventory ?? {}).some(v => v > 0);
  const hasRawStock  = Object.values(inventory).some(v => v > 0);
```

- [ ] After the `<ScreenHeader ... />` line, insert:

```typescript
{hasRawStock && !hasProcessed && (
  <HintCard
    id="hint_processing"
    title="Process crops for higher margins"
    body="Raw crops sell at base price, but processed goods (flour, oil, juice) sell for 2–4× more. Select a recipe and tap Process to start a batch."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/procesado.tsx && git commit -m "feat(onboarding): add processing hint card to procesado screen"
  ```

---

## Task 8 — Add `hint_insurance` to `app/(tabs)/seguros.tsx`

- [ ] Import `HintCard` at the top of `seguros.tsx`:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the component, derive:

```typescript
  const hasInsurance = insurances.length > 0;
  const hasOwnedParcels = parcels.some(p => p.owned && p.plantedCrop);
```

- [ ] After the `<ScreenHeader ... />` line, insert:

```typescript
{hasOwnedParcels && !hasInsurance && (
  <HintCard
    id="hint_insurance"
    title="Protect your crops"
    body="Drought, frost, and pest events can wipe out an entire harvest. Buy insurance here to receive payouts when disasters strike — especially useful in summer and winter."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/seguros.tsx && git commit -m "feat(onboarding): add insurance hint card to seguros screen"
  ```

---

## Task 9 — Add `hint_auction` to `app/(tabs)/subasta.tsx`

- [ ] Import `HintCard` at the top of `subasta.tsx`:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] In the component, derive:

```typescript
  const hasPlacedBid = auctionLots.some(lot => lot.bids.some(b => b.isPlayer));
```

- [ ] After the `<ScreenHeader ... />` line, insert:

```typescript
{!hasPlacedBid && (
  <HintCard
    id="hint_auction"
    title="Buy rare items at auction"
    body="New auction lots appear every few days — rare seeds, animals, and machinery at below-market prices. Place a bid before the deadline and win if you're the highest bidder."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/subasta.tsx && git commit -m "feat(onboarding): add auction hint card to subasta screen"
  ```

---

## Task 10 — Add `hint_workers` to `app/(tabs)/trabajadores.tsx` (or `oficina.tsx` workers sub-tab)

> **Note:** Verify whether workers have their own screen file (`trabajadores.tsx`) or are a sub-tab inside `oficina.tsx`. Adjust the file path accordingly.

- [ ] Import `HintCard` in the workers screen/sub-tab:

```typescript
import HintCard from '../../components/HintCard';
```

- [ ] Derive:

```typescript
  const hasWorkers = workers.length > 0;
```

- [ ] After the workers section header, insert:

```typescript
{!hasWorkers && (
  <HintCard
    id="hint_workers"
    title="Hire workers to automate tasks"
    body="Field Workers harvest automatically, Animal Keepers collect daily production, and Agronomists boost crop yield. Each worker costs a daily wage deducted at midnight."
  />
)}
```

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add app/(tabs)/oficina.tsx && git commit -m "feat(onboarding): add workers hint card"
  ```

---

## Task 11 — Expand `TutorialModal.tsx` with Animals and Banking sections

- [ ] Open `components/TutorialModal.tsx`. Read the full file to find the `sections` array or equivalent data structure defining modal pages.

- [ ] Add two new section entries to the sections array. Based on the existing pattern (icon + title + content with visual components), insert after the existing sections:

```typescript
{
  title: 'Animals & Livestock',
  icon: '🐄',
  content: (
    <View style={{ gap: 12 }}>
      <Text style={sectionBodyStyle}>
        Animals produce goods every day — hens lay eggs, cows give milk, bees make honey.
        Tap <Text style={{ color: '#ffd700' }}>Collect Production</Text> on the Animals screen daily,
        or hire an Animal Keeper to do it automatically.
      </Text>
      <View style={vis.rotBox}>
        <Text style={vis.rotIcon}>🐔 → 🥚  🐄 → 🥛  🐝 → 🍯</Text>
        <Text style={[vis.rotLabel, { color: '#81c784' }]}>Daily production per mature animal</Text>
      </View>
      <Text style={sectionBodyStyle}>
        <Text style={{ color: '#ffd700' }}>Breeding</Text> passes genes to offspring. Pair animals
        with high gene scores (A/S grade) to produce superior stock worth more at auction and in shows.
      </Text>
    </View>
  ),
},
{
  title: 'Banking & Finance',
  icon: '🏦',
  content: (
    <View style={{ gap: 12 }}>
      <Text style={sectionBodyStyle}>
        Your <Text style={{ color: '#ffd700' }}>credit score</Text> starts at 50 and rises when you
        repay loans on time and earn consistent revenue. A higher score unlocks larger loan tiers at
        lower interest rates.
      </Text>
      <View style={vis.rotBox}>
        <Text style={vis.rotIcon}>Score 20–49 → Tier 1 ($5k)</Text>
        <Text style={vis.rotIcon}>Score 50–74 → Tier 2 ($20k)</Text>
        <Text style={vis.rotIcon}>Score 75–100 → Tier 3 ($100k)</Text>
      </View>
      <Text style={sectionBodyStyle}>
        Deposit spare cash into <Text style={{ color: '#ffd700' }}>Savings</Text> to earn 4% APR,
        or lock into a <Text style={{ color: '#ffd700' }}>Time Deposit</Text> for 6–8% over 30–90 days.
        Never let your balance hit $0 — bankruptcy resets your loans and incurs a $10,000 penalty.
      </Text>
    </View>
  ),
},
```

  Adjust style references (`sectionBodyStyle`, `vis`) to match whatever style variables the existing file uses. If the existing modal uses a `SECTIONS` constant array, append these objects to that array.

- [ ] TypeScript verify + commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit && git add components/TutorialModal.tsx && git commit -m "feat(onboarding): add Animals and Banking sections to TutorialModal"
  ```
