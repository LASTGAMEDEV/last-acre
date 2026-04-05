# Animal Genetics UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Expose the existing `AnimalGenes` engine in the UI — gene bars, breeding pair selection, and 3-generation lineage tree on each animal card.

**Architecture:** Two-part change: (1) Store additions — `breedingPairs` map, `parentIds`/`grandparentIds` on `OwnedAnimal`, `setBreedingPair`/`clearBreedingPair` actions, and `breedAnimal()` updated to use preferred pair + record lineage. (2) UI additions to `app/(tabs)/animales.tsx` — expandable gene panel per animal card.

**Tech Stack:** React Native, Zustand 5, TypeScript. Existing gene logic in `engine/animals.ts` (`AnimalGenes`, `breedGenes`, `geneScore`, grade helpers already used in animales.tsx).

---

## File Structure

**Modify:**
- `store/useGameStore.ts` — `OwnedAnimal` fields, `GameState` fields, 2 new actions, `breedAnimal` update
- `app/(tabs)/animales.tsx` — expandable genetics panel per animal card

---

### Task 1: Store — lineage fields, breedingPairs, updated breedAnimal

**Files:**
- Modify: `store/useGameStore.ts`

- [x] **Step 1: Add `parentIds` and `grandparentIds` to `OwnedAnimal`**

Find the `OwnedAnimal` interface (exported from `store/useGameStore.ts`, currently ends with `genes?: AnimalGenes`). Add two optional fields:

```typescript
export interface OwnedAnimal {
  id: string;
  typeId: string;
  sex: 'male' | 'female';
  bornDay: number;
  lastProductionDay: number;
  lastBreedDay: number;
  sick: boolean;
  sicknessDay?: number;
  traits?: AnimalTrait[];
  genes?: AnimalGenes;
  parentIds?: [string, string];                          // [motherId, fatherId]
  grandparentIds?: [string, string, string, string];     // [MM, MF, FM, FF]
}
```

- [x] **Step 2: Add `breedingPairs` to `GameState`**

Find the `GameState` interface. Add after the `workers` field (or wherever the last field is):

```typescript
breedingPairs: Record<string, string>; // femaleId → preferred maleId
```

Also add to the initial state in `useGameStore` (search for `workers: []` and add nearby):
```typescript
breedingPairs: {},
```

- [x] **Step 3: Add `setBreedingPair` and `clearBreedingPair` to `GameState` interface**

In the `GameState` interface, add:
```typescript
setBreedingPair: (femaleId: string, maleId: string) => void;
clearBreedingPair: (femaleId: string) => void;
```

- [x] **Step 4: Implement `setBreedingPair` and `clearBreedingPair` actions**

In the store's `create(...)` block, add these two actions (near `breedAnimal`):

```typescript
setBreedingPair: (femaleId, maleId) => {
  set(state => ({
    breedingPairs: { ...state.breedingPairs, [femaleId]: maleId },
  }));
},

clearBreedingPair: (femaleId) => {
  set(state => {
    const next = { ...state.breedingPairs };
    delete next[femaleId];
    return { breedingPairs: next };
  });
},
```

- [x] **Step 5: Update `breedAnimal` to use preferred pair and record lineage**

Find the `breedAnimal` action. It currently picks the first available mature male with `.find(...)`. Change it to:

1. Check `state.breedingPairs[animalId]` for a preferred male
2. Verify that preferred male is still mature and same type; fall back to first available if not
3. Record `parentIds` and `grandparentIds` on offspring

Replace the father-selection and offspring-creation block:

```typescript
breedAnimal: (animalId) => {
  const state = get();
  const animal = state.animals.find((a: OwnedAnimal) => a.id === animalId);
  if (!animal || animal.sex !== 'female') return;
  const { ANIMAL_TYPES } = require('../data/animalTypes');
  const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
  const { canBreed, isMature, inheritTrait } = require('../engine/animals');
  if (!canBreed(animal, animalType, state.day)) return;

  const matureMales = state.animals.filter(
    (a: OwnedAnimal) => a.id !== animalId && a.typeId === animal.typeId && a.sex === 'male' && isMature(a, animalType, state.day)
  );
  if (matureMales.length === 0) return;

  const capacity = getEnclosureCapacity(state.buildings, animalType.enclosureType);
  const currentCount = state.animals.filter((a: OwnedAnimal) => a.typeId === animal.typeId).length;
  if (currentCount >= capacity) return;

  const preferredId = state.breedingPairs[animalId];
  const father: OwnedAnimal = (preferredId && matureMales.find((a: OwnedAnimal) => a.id === preferredId))
    ?? matureMales[0];

  const maternalTrait = inheritTrait(animal);
  const paternalTrait = father ? inheritTrait(father) : null;
  const offspringTraits = Array.from(new Set([maternalTrait, paternalTrait].filter(Boolean))) as import('../engine/animals').AnimalTrait[];
  const offspringSex: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';

  // Lineage: copy grandparents from parents' parentIds
  const motherParents = animal.parentIds;     // [MM_id, MF_id] or undefined
  const fatherParents = father?.parentIds;    // [FM_id, FF_id] or undefined

  const grandparentIds: [string, string, string, string] | undefined =
    (motherParents && fatherParents)
      ? [motherParents[0], motherParents[1], fatherParents[0], fatherParents[1]]
      : undefined;

  const offspring: OwnedAnimal = {
    id: `animal_${Date.now()}`,
    typeId: animal.typeId,
    sex: offspringSex,
    bornDay: state.day,
    lastProductionDay: state.day,
    lastBreedDay: state.day,
    sick: false,
    traits: offspringTraits.length > 0 ? offspringTraits : undefined,
    genes: breedGenes(animal.genes, father?.genes),
    parentIds: [animalId, father.id],
    grandparentIds,
  };

  // Clear the breeding pair after successful breed
  const nextPairs = { ...state.breedingPairs };
  delete nextPairs[animalId];

  set({
    breedingPairs: nextPairs,
    animals: [
      ...state.animals.map((a: OwnedAnimal) => a.id === animalId ? { ...a, lastBreedDay: state.day } : a),
      offspring,
    ],
  });
},
```

- [x] **Step 6: Verify TypeScript**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon" && npx tsc --noEmit
```

Expected: same 4 pre-existing errors, no new ones.

- [x] **Step 7: Commit**

```bash
git add "store/useGameStore.ts"
git commit -m "feat(genetics): add breedingPairs, lineage fields, and preferred-pair breeding"
```

---

### Task 2: Animal card — gene bars and grade badge

**Files:**
- Modify: `app/(tabs)/animales.tsx`

The file already imports `geneGrade`, `gradeColor`, `TRAIT_ICONS`, `TRAIT_DESC`, `AnimalGenes` from `engine/animals`. The gene grade helpers (`geneGrade`, `gradeColor`) already exist as local functions at the top of the file.

- [x] **Step 1: Add expanded-card state**

Find the `useState` declarations near the top of `AnimalesScreen`. Add:

```typescript
const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);
```

- [x] **Step 2: Add a `GeneBar` helper component**

Add this component before the `AnimalesScreen` function (or at the bottom of the file above styles):

```typescript
function GeneBar({ label, value }: { label: string; value: number }) {
  const grade = geneGrade(value);
  const color = gradeColor(grade);
  const pct = Math.round(((value - 0.5) / 1.0) * 100); // 0.5→0%, 1.5→100%
  return (
    <View style={gbStyles.row}>
      <Text style={gbStyles.label}>{label}</Text>
      <View style={gbStyles.barBg}>
        <View style={[gbStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[gbStyles.grade, { color }]}>{grade} ({value.toFixed(2)})</Text>
    </View>
  );
}

const gbStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label:  { color: '#888', fontSize: 10, width: 70 },
  barBg:  { flex: 1, height: 5, backgroundColor: '#1a1a2e', borderRadius: 3, marginHorizontal: 6 },
  barFill:{ height: 5, borderRadius: 3 },
  grade:  { fontSize: 10, width: 52, textAlign: 'right', fontWeight: 'bold' },
});
```

- [x] **Step 3: Render gene panel inside animal cards**

Find where each animal card is rendered (the FlatList `renderItem` or the mapped list). After the existing animal info row (name, sex, traits etc.) and before the action buttons, add:

```typescript
{/* Expandable genetics panel */}
<TouchableOpacity onPress={() => setExpandedAnimalId(expandedAnimalId === animal.id ? null : animal.id)} style={genStyles.toggleBtn}>
  <Text style={genStyles.toggleBtnText}>{expandedAnimalId === animal.id ? '▲ Hide Genetics' : '▼ Genetics'}</Text>
</TouchableOpacity>

{expandedAnimalId === animal.id && (() => {
  const g = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
  const avgGrade = geneGrade((g.production + g.hardiness + g.growth + g.value) / 4);
  const avgColor = gradeColor(avgGrade);
  return (
    <View style={genStyles.panel}>
      <View style={genStyles.panelHeader}>
        <Text style={genStyles.panelTitle}>🧬 Genes</Text>
        <View style={[genStyles.gradeBadge, { backgroundColor: avgColor + '33', borderColor: avgColor }]}>
          <Text style={[genStyles.gradeBadgeText, { color: avgColor }]}>{avgGrade} Grade</Text>
        </View>
      </View>
      <GeneBar label="🥚 Production" value={g.production} />
      <GeneBar label="💪 Hardiness"  value={g.hardiness} />
      <GeneBar label="⚡ Growth"     value={g.growth} />
      <GeneBar label="💰 Value"      value={g.value} />
    </View>
  );
})()}
```

Add to the stylesheet:
```typescript
const genStyles = StyleSheet.create({
  toggleBtn:      { paddingVertical: 4, alignSelf: 'flex-start' },
  toggleBtnText:  { color: '#4fc3f7', fontSize: 11 },
  panel:          { backgroundColor: '#0a1628', borderRadius: 8, padding: 10, marginTop: 6 },
  panelHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelTitle:     { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12 },
  gradeBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  gradeBadgeText: { fontSize: 11, fontWeight: 'bold' },
});
```

- [x] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add "app/(tabs)/animales.tsx"
git commit -m "feat(genetics): add gene bars and grade badge to animal cards"
```

---

### Task 3: Breeding pair selector

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [x] **Step 1: Pull `breedingPairs`, `setBreedingPair`, `clearBreedingPair` from store**

Find the `useGameStore` destructure in `AnimalesScreen`. Add:

```typescript
const { ..., breedingPairs, setBreedingPair, clearBreedingPair } = useGameStore();
```

- [x] **Step 2: Add breeding pair selector inside the expanded gene panel (females only)**

Inside the IIFE in `expandedAnimalId === animal.id` block, after the `GeneBar` rows, add:

```typescript
{animal.sex === 'female' && (() => {
  const matureMales = animals.filter(
    (a: OwnedAnimal) => a.id !== animal.id && a.typeId === animal.typeId && a.sex === 'male'
  );
  const preferredId = breedingPairs[animal.id];
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={genStyles.panelTitle}>🧬 Breeding Pair</Text>
      {matureMales.length === 0 ? (
        <Text style={{ color: '#555', fontSize: 11, marginTop: 4 }}>No males available.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {matureMales.map(male => {
              const mg = male.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
              const avgG = geneGrade((mg.production + mg.hardiness + mg.growth + mg.value) / 4);
              const isSelected = preferredId === male.id;
              return (
                <TouchableOpacity
                  key={male.id}
                  style={[bpStyles.maleChip, isSelected && bpStyles.maleChipSelected]}
                  onPress={() => isSelected ? clearBreedingPair(animal.id) : setBreedingPair(animal.id, male.id)}
                >
                  <Text style={bpStyles.maleName}>♂ {male.id.slice(-4)}</Text>
                  <Text style={[bpStyles.maleGrade, { color: gradeColor(avgG) }]}>{avgG}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {preferredId && (() => {
            const pm = matureMales.find(m => m.id === preferredId);
            if (!pm) return null;
            const pg = pm.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
            const fg = animal.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
            const pred = {
              production: (pg.production + fg.production) / 2,
              hardiness:  (pg.hardiness  + fg.hardiness)  / 2,
              growth:     (pg.growth     + fg.growth)     / 2,
              value:      (pg.value      + fg.value)      / 2,
            };
            return (
              <View style={bpStyles.prediction}>
                <Text style={bpStyles.predLabel}>Offspring prediction:</Text>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {(['production','hardiness','growth','value'] as (keyof AnimalGenes)[]).map(k => {
                    const g = geneGrade(pred[k]);
                    return (
                      <Text key={k} style={[bpStyles.predChip, { color: gradeColor(g) }]}>
                        {k[0].toUpperCase()} {g}
                      </Text>
                    );
                  })}
                </View>
              </View>
            );
          })()}
        </>
      )}
    </View>
  );
})()}
```

Add to the file's StyleSheet (or a new `bpStyles` sheet):
```typescript
const bpStyles = StyleSheet.create({
  maleChip:         { backgroundColor: '#16213e', borderRadius: 8, padding: 8, marginRight: 6, alignItems: 'center', minWidth: 60 },
  maleChipSelected: { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  maleName:         { color: '#aaa', fontSize: 10 },
  maleGrade:        { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  prediction:       { backgroundColor: '#0a1628', borderRadius: 6, padding: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#ffd700' },
  predLabel:        { color: '#ffd700', fontSize: 10, fontWeight: 'bold' },
  predChip:         { fontSize: 11, fontWeight: 'bold' },
});
```

Note: `OwnedAnimal` needs to be imported in animales.tsx for the filter type. Check if it's already imported from the store; if not, add it to the import line.

- [x] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add "app/(tabs)/animales.tsx"
git commit -m "feat(genetics): add breeding pair selector with offspring prediction"
```

---

### Task 4: Lineage tree

**Files:**
- Modify: `app/(tabs)/animales.tsx`

- [x] **Step 1: Add lineage tree inside the expanded genetics panel**

After the breeding pair selector block (still inside `expandedAnimalId === animal.id`), add:

```typescript
{/* Lineage tree */}
<View style={{ marginTop: 10 }}>
  <Text style={genStyles.panelTitle}>🌳 Lineage</Text>
  {(() => {
    const findAnimal = (id: string) => animals.find((a: OwnedAnimal) => a.id === id);
    const mother = animal.parentIds ? findAnimal(animal.parentIds[0]) : undefined;
    const father = animal.parentIds ? findAnimal(animal.parentIds[1]) : undefined;
    const gp = animal.grandparentIds;

    if (!mother && !father) {
      return <Text style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Unknown lineage.</Text>;
    }

    const AncestorChip = ({ label, animalId }: { label: string; animalId?: string }) => {
      const a = animalId ? findAnimal(animalId) : undefined;
      if (!a) return (
        <View style={ltStyles.chip}>
          <Text style={ltStyles.chipLabel}>{label}</Text>
          <Text style={ltStyles.chipUnknown}>Unknown</Text>
        </View>
      );
      const ag = a.genes ?? { production: 1, hardiness: 1, growth: 1, value: 1 };
      const avg = (ag.production + ag.hardiness + ag.growth + ag.value) / 4;
      const grade = geneGrade(avg);
      return (
        <View style={ltStyles.chip}>
          <Text style={ltStyles.chipLabel}>{label} {a.sex === 'female' ? '♀' : '♂'}</Text>
          <Text style={[ltStyles.chipGrade, { color: gradeColor(grade) }]}>{grade}</Text>
        </View>
      );
    };

    return (
      <View style={ltStyles.tree}>
        {/* Grandparents column */}
        {gp && (
          <View style={ltStyles.col}>
            <AncestorChip label="GM" animalId={gp[0]} />
            <AncestorChip label="GF" animalId={gp[1]} />
            <AncestorChip label="GM" animalId={gp[2]} />
            <AncestorChip label="GF" animalId={gp[3]} />
          </View>
        )}
        {/* Parents column */}
        <View style={ltStyles.col}>
          <AncestorChip label="Mom" animalId={animal.parentIds?.[0]} />
          <AncestorChip label="Dad" animalId={animal.parentIds?.[1]} />
        </View>
        {/* Self */}
        <View style={[ltStyles.chip, ltStyles.chipSelf]}>
          <Text style={ltStyles.chipLabel}>{animal.sex === 'female' ? '♀' : '♂'} Self</Text>
          <Text style={[ltStyles.chipGrade, { color: gradeColor(geneGrade((g.production + g.hardiness + g.growth + g.value) / 4)) }]}>
            {geneGrade((g.production + g.hardiness + g.growth + g.value) / 4)}
          </Text>
        </View>
      </View>
    );
  })()}
</View>
```

Add `ltStyles`:
```typescript
const ltStyles = StyleSheet.create({
  tree:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  col:         { gap: 4 },
  chip:        { backgroundColor: '#16213e', borderRadius: 6, padding: 6, alignItems: 'center', minWidth: 52 },
  chipSelf:    { backgroundColor: '#0f3460', borderWidth: 1, borderColor: '#4fc3f7' },
  chipLabel:   { color: '#888', fontSize: 9 },
  chipGrade:   { fontSize: 12, fontWeight: 'bold', marginTop: 1 },
  chipUnknown: { color: '#444', fontSize: 9 },
});
```

- [x] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add "app/(tabs)/animales.tsx"
git commit -m "feat(genetics): add 3-generation lineage tree to animal cards"
```
