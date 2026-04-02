# Animal Shows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seasonal county shows where players enter animals scored by genes vs NPC competitors, with cash prizes paid at season transitions.
**Architecture:** Show state lives entirely in `useGameStore.ts` (`showEntries`, `showResults`, `showWindowOpen`). The entry window opens at day 83 of each 90-day season quarter; results are resolved at the season transition (day 90) inside `advanceDay`. A new `AnimalShowModal` component handles entry UI, and `animales.tsx` gains an amber banner + Results history tab.
**Tech Stack:** React Native, Zustand 5, TypeScript — no new dependencies.

---

## Task 1 — Add interfaces and state shape to the store

- [ ] Open `store/useGameStore.ts`. After the `FuturesPosition` interface (line 128), add:

```typescript
// ── Animal Shows ─────────────────────────────────────────────────────────────
export interface ShowEntry {
  animalId: string;
  seasonKey: string;   // e.g. "spring_91" — season + first day of that quarter
  entryFee: number;
  enteredDay: number;
}

export interface ShowResult {
  id: string;
  seasonKey: string;
  seasonLabel: string; // e.g. "Spring Year 2"
  animalId: string;
  animalTypeId: string;
  playerScore: number;
  placement: number;   // 1 = first, 2 = second, 3 = third, 0 = no placement
  prize: number;
  npcScores: number[]; // 5 NPC competitors
  resolvedDay: number;
}
```

- [ ] In the `GameState` interface (around line 396, just before the Settings block), add:

```typescript
  // Animal Shows
  showEntries: ShowEntry[];
  showResults: ShowResult[];
  showWindowOpen: boolean;
```

- [ ] In `makeInitialState()` (around line 582), add inside the return object:

```typescript
    showEntries: [] as ShowEntry[],
    showResults: [] as ShowResult[],
    showWindowOpen: false,
```

- [ ] In the `GameState` actions block (around line 412, after `advanceDays`), add type signatures:

```typescript
  enterAnimalShow: (animalId: string) => void;
  withdrawAnimalShow: (animalId: string) => void;
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(shows): add ShowEntry, ShowResult interfaces and state fields"
  ```

---

## Task 2 — Add `enterAnimalShow` and `withdrawAnimalShow` actions

- [ ] In `store/useGameStore.ts`, find the `partialize` destructuring (around line 3649). Add the two new actions to the destructured list so they are excluded from serialization:

```typescript
          enterAnimalShow, withdrawAnimalShow,
```

(Insert anywhere in the destructure block before `...dataState`.)

- [ ] Add the action implementations inside the `create(...)` call, after the `clearBreedingPair` action (search for `clearBreedingPair:`) — append after its closing brace + comma:

```typescript
      enterAnimalShow: (animalId) => {
        const state = get();
        if (!state.showWindowOpen) return;
        const { getSeason } = require('../engine/climate');
        const season = getSeason(state.day);
        const seasonKey = `${season}_${state.day - ((state.day - 1) % 90)}`;
        // Already entered?
        if (state.showEntries.some(e => e.seasonKey === seasonKey && e.animalId === animalId)) return;
        const ENTRY_FEE = 250;
        if (state.money < ENTRY_FEE) return;
        const entry: ShowEntry = {
          animalId,
          seasonKey,
          entryFee: ENTRY_FEE,
          enteredDay: state.day,
        };
        set({
          money: state.money - ENTRY_FEE,
          showEntries: [...state.showEntries, entry],
        });
      },

      withdrawAnimalShow: (animalId) => {
        const state = get();
        const { getSeason } = require('../engine/climate');
        const season = getSeason(state.day);
        const seasonKey = `${season}_${state.day - ((state.day - 1) % 90)}`;
        // Refund 50% of entry fee
        const entry = state.showEntries.find(e => e.seasonKey === seasonKey && e.animalId === animalId);
        const refund = entry ? Math.round(entry.entryFee * 0.5) : 0;
        set({
          money: state.money + refund,
          showEntries: state.showEntries.filter(
            e => !(e.seasonKey === seasonKey && e.animalId === animalId)
          ),
        });
      },
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(shows): add enterAnimalShow and withdrawAnimalShow actions"
  ```

---

## Task 3 — Add show window logic to `advanceDay`

The show window opens when the current day within a 90-day season quarter reaches day 83 (i.e., `(day - 1) % 90 === 82`). Results are resolved at the season transition (`season !== prevSeason`).

- [ ] In `advanceDay` (around line 694), locate the season-change block (`if (season !== prevSeason) {`, around line 793). **Before** that block, insert the show window open/close logic:

```typescript
        // ── Animal Show: open entry window at day 83 of each season quarter ──
        const dayInSeason = (newDay - 1) % 90; // 0-indexed within season
        const showWindowOpen = dayInSeason >= 82 && dayInSeason <= 88; // days 83–89
```

- [ ] **Inside** the `if (season !== prevSeason)` block, after the seasonal goals generation (`newSeasonGoals = [...]`), insert the show resolution logic:

```typescript
          // ── Animal Show: resolve results at season transition ──────────────
          const { geneScore } = require('../engine/animals');
          const { ANIMAL_TYPES } = require('../data/animalTypes');
          const prevSeasonStart = state.day - ((state.day - 1) % 90);
          const prevSeasonKey = `${prevSeason}_${prevSeasonStart}`;
          const seasonEntries = state.showEntries.filter(e => e.seasonKey === prevSeasonKey);
          const PRIZE_TABLE = [2500, 1000, 500]; // 1st, 2nd, 3rd
          let showPrizeMoney = 0;
          const newShowResults: ShowResult[] = seasonEntries.map(entry => {
            const animal = state.animals.find(a => a.id === entry.animalId);
            if (!animal) {
              // Animal was sold — no prize, no placement
              return null as unknown as ShowResult;
            }
            const genes = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
            const traitBonus = (animal.traits ?? []).length * 0.05;
            const playerScore = parseFloat((geneScore(genes) + traitBonus).toFixed(3));
            // Simulate 5 NPC competitors at difficulty scaling with game day
            const npcBase = 0.85 + Math.min(state.day / 3600, 0.35); // 0.85→1.20 over 3 in-game years
            const npcScores = Array.from({ length: 5 }, () =>
              parseFloat((npcBase + (Math.random() - 0.5) * 0.30).toFixed(3))
            );
            const allScores = [...npcScores, playerScore].sort((a, b) => b - a);
            const placement = allScores.indexOf(playerScore) + 1; // 1-based, ties give best placement
            const prize = placement <= 3 ? PRIZE_TABLE[placement - 1] : 0;
            showPrizeMoney += prize;
            const seasonLabels: Record<string, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
            const year = Math.ceil(state.day / 360);
            const result: ShowResult = {
              id: `show_${entry.animalId}_${state.day}`,
              seasonKey: prevSeasonKey,
              seasonLabel: `${seasonLabels[prevSeason] ?? prevSeason} Year ${year}`,
              animalId: entry.animalId,
              animalTypeId: animal.typeId,
              playerScore,
              placement,
              prize,
              npcScores,
              resolvedDay: newDay,
            };
            return result;
          }).filter(Boolean);

          // Push summary events for placements
          for (const result of newShowResults) {
            if (result.placement === 1) {
              summary.push({ id: `show_win_${result.id}`, icon: '🏆', title: `1st place at the County Show! +$${result.prize.toLocaleString()}`, severity: 'good' });
            } else if (result.placement <= 3) {
              summary.push({ id: `show_place_${result.id}`, icon: '🎖️', title: `${result.placement === 2 ? '2nd' : '3rd'} place at the County Show! +$${result.prize.toLocaleString()}`, severity: 'good' });
            }
          }
```

- [ ] Still inside the `set({ ... })` call at the end of `advanceDay` (around line 2156 where `priceHistory` is set), add the show-related fields to the update object:

```typescript
          showWindowOpen,
          showEntries: season !== prevSeason
            ? state.showEntries.filter(e => {
                const prevSeasonStart2 = state.day - ((state.day - 1) % 90);
                return e.seasonKey !== `${prevSeason}_${prevSeasonStart2}`;
              })
            : state.showEntries,
          showResults: season !== prevSeason
            ? [...(state.showResults ?? []), ...newShowResults].slice(-40)
            : (state.showResults ?? []),
          money: (existingMoneyField) + showPrizeMoney, // merge with existing money field in the set call
```

  **Important:** The `advanceDay` `set({})` call already computes `finalMoney`. Find the line assigning `money: finalMoney` in the `set({})` block and change it to:
  ```typescript
          money: finalMoney + (season !== prevSeason ? showPrizeMoney : 0),
  ```
  Also add `showWindowOpen`, `showEntries` (filtered), and `showResults` (appended) to that same `set({})` call.

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(shows): add show window open/close and result resolution to advanceDay"
  ```

---

## Task 4 — Create `components/AnimalShowModal.tsx`

- [ ] Create `components/AnimalShowModal.tsx`:

```typescript
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList,
} from 'react-native';
import { useGameStore, ShowEntry } from '../store/useGameStore';
import { ANIMAL_TYPES } from '../data/animalTypes';
import { geneScore, isMature, OwnedAnimal } from '../engine/animals';
import { getSeason } from '../engine/climate';

const ENTRY_FEE = 250;
const PRIZE_TABLE = ['$2,500', '$1,000', '$500'];
const SEASON_LABELS: Record<string, string> = {
  spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter',
};

function scorePreview(animal: OwnedAnimal): number {
  const genes = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
  const traitBonus = (animal.traits ?? []).length * 0.05;
  return parseFloat((geneScore(genes) + traitBonus).toFixed(3));
}

function gradeFromScore(s: number): string {
  if (s >= 1.35) return 'S';
  if (s >= 1.15) return 'A';
  if (s >= 0.95) return 'B';
  if (s >= 0.75) return 'C';
  return 'D';
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AnimalShowModal({ visible, onClose }: Props) {
  const { animals, day, money, showEntries, enterAnimalShow, withdrawAnimalShow } = useGameStore();
  const season = getSeason(day);
  const seasonStart = day - ((day - 1) % 90);
  const seasonKey = `${season}_${seasonStart}`;
  const daysLeft = 90 - ((day - 1) % 90);
  const year = Math.ceil(day / 360);

  // Only mature animals are eligible
  const eligibleAnimals = animals.filter(animal => {
    const animalType = ANIMAL_TYPES.find(t => t.id === animal.typeId);
    if (!animalType) return false;
    return isMature(animal, animalType, day);
  });

  const isEntered = (animalId: string) =>
    showEntries.some(e => e.seasonKey === seasonKey && e.animalId === animalId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>🏆 County Show — {SEASON_LABELS[season]} Year {year}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.deadline}>Entry closes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</Text>
          <Text style={s.prizeRow}>Prizes: {PRIZE_TABLE.join(' · ')}</Text>
          <Text style={s.feeNote}>Entry fee: ${ENTRY_FEE} · 50% refunded on withdrawal</Text>

          <Text style={s.sectionLabel}>Eligible Animals ({eligibleAnimals.length})</Text>

          {eligibleAnimals.length === 0 ? (
            <Text style={s.empty}>No mature animals to enter. Buy and raise animals first.</Text>
          ) : (
            <FlatList
              data={eligibleAnimals}
              keyExtractor={item => item.id}
              style={s.list}
              renderItem={({ item }) => {
                const animalType = ANIMAL_TYPES.find(t => t.id === item.typeId);
                const entered = isEntered(item.id);
                const score = scorePreview(item);
                const grade = gradeFromScore(score);
                const gradeColor =
                  grade === 'S' ? '#ffd700' :
                  grade === 'A' ? '#81c784' :
                  grade === 'B' ? '#64b5f6' :
                  grade === 'C' ? '#aaa' : '#ef9a9a';
                return (
                  <View style={[s.animalRow, entered && s.animalRowEntered]}>
                    <View style={s.animalInfo}>
                      <Text style={s.animalName}>
                        {animalType?.name ?? item.typeId} · {item.sex === 'female' ? '♀' : '♂'}
                      </Text>
                      <Text style={s.animalScore}>
                        Score: <Text style={{ color: gradeColor }}>{score.toFixed(3)} ({grade})</Text>
                      </Text>
                      {item.traits && item.traits.length > 0 && (
                        <Text style={s.animalTraits}>
                          Traits: {item.traits.join(', ')}
                        </Text>
                      )}
                    </View>
                    {entered ? (
                      <TouchableOpacity
                        style={s.withdrawBtn}
                        onPress={() => withdrawAnimalShow(item.id)}
                      >
                        <Text style={s.withdrawText}>Withdraw</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[s.enterBtn, money < ENTRY_FEE && s.enterBtnDisabled]}
                        onPress={() => enterAnimalShow(item.id)}
                        disabled={money < ENTRY_FEE}
                      >
                        <Text style={s.enterText}>Enter $250</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#0f1e0f', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '85%' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title:           { color: '#ffd700', fontSize: 16, fontWeight: 'bold', flex: 1 },
  closeBtn:        { padding: 4 },
  closeText:       { color: '#888', fontSize: 18 },
  deadline:        { color: '#ffb74d', fontSize: 12, marginBottom: 2 },
  prizeRow:        { color: '#81c784', fontSize: 12, marginBottom: 2 },
  feeNote:         { color: '#666', fontSize: 11, marginBottom: 12 },
  sectionLabel:    { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  empty:           { color: '#555', fontSize: 13, textAlign: 'center', marginVertical: 24 },
  list:            { flexShrink: 1 },
  animalRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a2a1a', borderRadius: 8, padding: 10, marginBottom: 8 },
  animalRowEntered:{ borderWidth: 1, borderColor: '#ffd70066' },
  animalInfo:      { flex: 1 },
  animalName:      { color: '#e8d5a3', fontSize: 13, fontWeight: 'bold' },
  animalScore:     { color: '#aaa', fontSize: 11, marginTop: 2 },
  animalTraits:    { color: '#666', fontSize: 10, marginTop: 1 },
  enterBtn:        { backgroundColor: '#2e7d32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  enterBtnDisabled:{ backgroundColor: '#333' },
  enterText:       { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  withdrawBtn:     { backgroundColor: '#4a2000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  withdrawText:    { color: '#ffb74d', fontSize: 12 },
});
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add components/AnimalShowModal.tsx && git commit -m "feat(shows): create AnimalShowModal component"
  ```

---

## Task 5 — Add show banner and Results tab to `app/(tabs)/animales.tsx`

- [ ] In `app/(tabs)/animales.tsx`, add the import at the top (after existing imports):

```typescript
import AnimalShowModal from '../../components/AnimalShowModal';
```

- [ ] In the `useGameStore` destructure near the top of `EconomiaScreen` equivalent (the default export function), add:

```typescript
const { ..., showWindowOpen, showResults } = useGameStore();
```

- [ ] Add local state for the show modal and the active sub-tab, near the top of the component function:

```typescript
const [showModalVisible, setShowModalVisible] = useState(false);
type AnimalTab = 'herd' | 'results';
const [animalTab, setAnimalTab] = useState<AnimalTab>('herd');
```

- [ ] Immediately after the `<ScreenHeader ... />` line, insert the amber show banner:

```typescript
{showWindowOpen && (
  <TouchableOpacity
    style={showBannerStyle.banner}
    onPress={() => setShowModalVisible(true)}
    activeOpacity={0.85}
  >
    <Text style={showBannerStyle.text}>🏆 County Show entries open — deadline in {90 - ((day - 1) % 90)} days</Text>
    <Text style={showBannerStyle.cta}>Enter Show →</Text>
  </TouchableOpacity>
)}
```

- [ ] Insert the tab bar between the banner and the existing animal list:

```typescript
<View style={showBannerStyle.tabBar}>
  {(['herd', 'results'] as AnimalTab[]).map(t => (
    <TouchableOpacity
      key={t}
      style={[showBannerStyle.tabBtn, animalTab === t && showBannerStyle.tabBtnActive]}
      onPress={() => setAnimalTab(t)}
    >
      <Text style={[showBannerStyle.tabText, animalTab === t && showBannerStyle.tabTextActive]}>
        {t === 'herd' ? 'My Herd' : `Show Results${showResults.length ? ` (${showResults.length})` : ''}`}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

- [ ] Wrap the existing animal FlatList/ScrollView in `{animalTab === 'herd' && (...)}` and add a results panel for `animalTab === 'results'`:

```typescript
{animalTab === 'results' && (
  <ScrollView style={{ flex: 1 }}>
    {showResults.length === 0 ? (
      <Text style={showBannerStyle.emptyResults}>No show results yet. Enter the next County Show!</Text>
    ) : (
      [...showResults].reverse().map(result => {
        const placementLabel = result.placement === 1 ? '🥇 1st' : result.placement === 2 ? '🥈 2nd' : result.placement === 3 ? '🥉 3rd' : 'No placement';
        const placementColor = result.placement === 1 ? '#ffd700' : result.placement === 2 ? '#c0c0c0' : result.placement === 3 ? '#cd7f32' : '#555';
        const animalType = ANIMAL_TYPES.find(t => t.id === result.animalTypeId);
        return (
          <View key={result.id} style={showBannerStyle.resultCard}>
            <View style={showBannerStyle.resultHeader}>
              <Text style={showBannerStyle.resultSeason}>{result.seasonLabel}</Text>
              <Text style={[showBannerStyle.resultPlacement, { color: placementColor }]}>{placementLabel}</Text>
            </View>
            <Text style={showBannerStyle.resultAnimal}>{animalType?.name ?? result.animalTypeId}</Text>
            <Text style={showBannerStyle.resultScore}>Your score: {result.playerScore.toFixed(3)}</Text>
            <Text style={showBannerStyle.resultNpc}>NPC scores: {result.npcScores.map(s => s.toFixed(2)).join(' · ')}</Text>
            {result.prize > 0 && (
              <Text style={showBannerStyle.resultPrize}>Prize: +${result.prize.toLocaleString()}</Text>
            )}
          </View>
        );
      })
    )}
  </ScrollView>
)}
```

- [ ] Add the modal at the end of the return tree (before the closing outer `</View>`):

```typescript
<AnimalShowModal visible={showModalVisible} onClose={() => setShowModalVisible(false)} />
```

- [ ] Add the `showBannerStyle` StyleSheet entries:

```typescript
const showBannerStyle = StyleSheet.create({
  banner:         { backgroundColor: '#3a2800', borderBottomWidth: 1, borderBottomColor: '#7a5c00', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text:           { color: '#ffd700', fontSize: 12, flex: 1 },
  cta:            { color: '#ffb74d', fontSize: 12, fontWeight: 'bold' },
  tabBar:         { flexDirection: 'row', backgroundColor: '#0f1e0f', borderBottomWidth: 1, borderBottomColor: '#1e3a1e' },
  tabBtn:         { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:   { borderBottomWidth: 2, borderBottomColor: '#ffd700' },
  tabText:        { color: '#555', fontSize: 13 },
  tabTextActive:  { color: '#ffd700', fontWeight: 'bold' },
  emptyResults:   { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 13 },
  resultCard:     { margin: 10, backgroundColor: '#1a2a1a', borderRadius: 8, padding: 12 },
  resultHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  resultSeason:   { color: '#888', fontSize: 11 },
  resultPlacement:{ fontSize: 13, fontWeight: 'bold' },
  resultAnimal:   { color: '#e8d5a3', fontSize: 13, marginBottom: 2 },
  resultScore:    { color: '#aaa', fontSize: 11 },
  resultNpc:      { color: '#555', fontSize: 10, marginTop: 1 },
  resultPrize:    { color: '#4caf50', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
});
```

- [ ] TypeScript verify:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
  ```
- [ ] Git commit:
  ```bash
  cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && git add app/(tabs)/animales.tsx components/AnimalShowModal.tsx && git commit -m "feat(shows): add show banner, entry modal, and Results tab to animales screen"
  ```
