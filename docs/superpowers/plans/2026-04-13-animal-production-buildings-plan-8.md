# Animal Production Buildings — Plan 8: Milk Quality Grading UI + Welfare Sale Bonus

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the already-computed milk grades and welfare scores to the player via UI, add a welfare-based sale multiplier to meat and wool, and emit mastitis warning events when dairy hygiene is critically low.

**Architecture:** `milkGrades` and `animalWelfareScores` are already computed daily in `advanceDay` (lines 3331–3353) and stored in GameState. This plan adds three things on top: (1) a `welfareMultiplier` variable in `sellAnimalProduct` that rewards high-welfare meat/wool producers; (2) a block after the production-buildings loop in `advanceDay` that emits mastitis warning summaries when dairy hygiene < 40; (3) a new `AnimalQualitySection` component in `gestion.tsx` that renders grade badges and welfare bars per species. No new GameState fields are needed.

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `node_modules\.bin\tsc --noEmit` for verification.

---

## Architectural Notes

- **`welfareMultiplier` for meat:** Average `animalWelfareScores[typeId]` across all meat-producing species that appear in `state.animalWelfareScores`. Thresholds: ≥80 → 1.10×, ≥60 → 1.00×, <60 → 0.90×. Meat-producing species set: `vaca, bufalo, cabra, oveja, cerdo, conejo, gallina, pato, codorniz`.
- **`welfareMultiplier` for wool:** `animalWelfareScores['oveja'] ?? 60`. Same thresholds.
- **For all other product types** (milk/dairy already has `gradeMultiplier`): `welfareMultiplier = 1.0`.
- **Mastitis warning block** — placed immediately after `// ── End production buildings processing ───────────────────────────` (line 3354). Iterates `newProductionBuildings` (the updated array from the same `advanceDay` block). Dairy species set: `vaca, cabra, bufalo`. Fires at most once per species per day. Severity: `'warning'`.
- **`AnimalQualitySection`** — rendered at the top of `HenilAndBuildingsSection` in `gestion.tsx`, before `<IncubationSection>`. Returns `null` if `productionBuildings` is empty. Shows two sub-sections:
  - Milk grades: badge per dairy species (A=`#4caf50`, B=`#ffa726`, C=`#f44336`) — only if species has a grade.
  - Welfare scores: horizontal bar per species (green ≥80, orange ≥60, red <60) — for all species in `animalWelfareScores`.
- `productionBuildings` state is already destructured in `HenilAndBuildingsSection` via `useGameStore()` (it powers `ProductionBuildingsSection`). Verify and use it directly.

---

## File Map

| File | Change |
|------|--------|
| `store/useGameStore.ts` | Task 1: `welfareMultiplier` in `sellAnimalProduct`<br>Task 2: mastitis warning block in `advanceDay` |
| `app/(tabs)/gestion.tsx` | Task 3: `AnimalQualitySection` component |

---

## Task 1: Welfare sale multiplier in `sellAnimalProduct`

**Files:** Modify `store/useGameStore.ts`

### Step 1: Add `welfareMultiplier` after `smokehouseBonus` in `sellAnimalProduct`

Find `sellAnimalProduct` (line ~4148). After the `smokehouseBonus` lines (which end around line 4196), add:

```typescript
        const MEAT_SPECIES_WELFARE = new Set([
          'vaca', 'bufalo', 'cabra', 'oveja', 'cerdo', 'conejo', 'gallina', 'pato', 'codorniz',
        ]);
        const welfareScores = state.animalWelfareScores ?? {};
        let welfareMultiplier = 1.0;
        if (productType === 'meat') {
          const relevantScores = Object.entries(welfareScores)
            .filter(([typeId]) => MEAT_SPECIES_WELFARE.has(typeId))
            .map(([, score]) => score as number);
          if (relevantScores.length > 0) {
            const avgWelfare = relevantScores.reduce((s, v) => s + v, 0) / relevantScores.length;
            welfareMultiplier = avgWelfare >= 80 ? 1.10 : avgWelfare < 60 ? 0.90 : 1.00;
          }
        } else if (productType === 'wool') {
          const sheepWelfare = (welfareScores['oveja'] as number) ?? 60;
          welfareMultiplier = sheepWelfare >= 80 ? 1.10 : sheepWelfare < 60 ? 0.90 : 1.00;
        }
```

### Step 2: Add `welfareMultiplier` to the revenue formula

Find the revenue line (line ~4198):

```typescript
        const revenue = Math.round(sellRevenue(toSell, livePrice) * coopBonus * prestigeBonus * gradeMultiplier * woolScouringBonus * smokehouseBonus);
```

Replace it with:

```typescript
        const revenue = Math.round(sellRevenue(toSell, livePrice) * coopBonus * prestigeBonus * gradeMultiplier * woolScouringBonus * smokehouseBonus * welfareMultiplier);
```

### Step 3: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: zero errors.

### Step 4: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): welfare sale multiplier for meat and wool in sellAnimalProduct"
```

---

## Task 2: Mastitis warning events in `advanceDay`

**Files:** Modify `store/useGameStore.ts`

### Step 1: Add mastitis warning block after production-buildings processing

Find the comment `// ── End production buildings processing ───────────────────────────` (line ~3354). Immediately after it, insert:

```typescript
        // ── Mastitis / low-hygiene warnings ──────────────────────────────────────
        {
          const DAIRY_SPECIES_WARN = new Set(['vaca', 'cabra', 'bufalo']);
          for (const pb of newProductionBuildings) {
            if (!DAIRY_SPECIES_WARN.has(pb.animalTypeId)) continue;
            if (pb.hygiene < 40) {
              const speciesLabel =
                pb.animalTypeId === 'vaca' ? 'cow' :
                pb.animalTypeId === 'cabra' ? 'goat' : 'buffalo';
              summary.push({
                id: `mastitis_${pb.animalTypeId}_${newDay}`,
                icon: '🦠',
                title: `Low hygiene in ${speciesLabel} dairy`,
                detail: `Hygiene ${Math.round(pb.hygiene)}/100 — Grade C milk likely. Clean the parlour and reduce herd density.`,
                severity: 'warning' as const,
              });
            }
          }
        }
```

**Important:** `newProductionBuildings` is the updated array computed earlier in the same `advanceDay` block (it was produced by the `.map()` call that ends at line ~3328). It is in scope here. `summary` is the mutable `let` array also in scope.

### Step 2: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Expected: zero errors.

### Step 3: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add store/useGameStore.ts
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(store): mastitis warning event when dairy hygiene < 40 in advanceDay"
```

---

## Task 3: `AnimalQualitySection` UI in `gestion.tsx`

**Files:** Modify `app/(tabs)/gestion.tsx`

Read `app/(tabs)/gestion.tsx` first to confirm:
- What is already destructured from `useGameStore()` in `HenilAndBuildingsSection`
- Where `<IncubationSection ... />` is rendered (to insert before it)
- Whether `productionBuildings`, `milkGrades`, `animalWelfareScores` are already destructured

### Step 1: Add new destructured values to `HenilAndBuildingsSection`

Find the `useGameStore()` destructure in `HenilAndBuildingsSection`. Add if not already present:

```typescript
    milkGrades, animalWelfareScores, productionBuildings,
```

(Note: `productionBuildings` may already be there for `ProductionBuildingsSection`. Only add what's missing.)

### Step 2: Add the `AnimalQualitySection` component

Find the `// ── Incubation Section` comment (before `function IncubationSection` or the `POULTRY_HATCH_CONFIG` constant). Add a new `AnimalQualitySection` component BEFORE it:

```typescript
// ── Animal Quality Section ────────────────────────────────────────────────────
function AnimalQualitySection({
  milkGrades,
  animalWelfareScores,
  productionBuildings,
}: {
  milkGrades: Record<string, 'A' | 'B' | 'C'>;
  animalWelfareScores: Record<string, number>;
  productionBuildings: { animalTypeId: string }[];
}) {
  if (productionBuildings.length === 0) return null;

  const DAIRY_LABELS: Record<string, string> = {
    vaca: 'Cows 🐄',
    cabra: 'Goats 🐐',
    bufalo: 'Buffalo 🐃',
  };
  const SPECIES_LABELS: Record<string, string> = {
    vaca: 'Cow', cabra: 'Goat', bufalo: 'Buffalo',
    oveja: 'Sheep', cerdo: 'Pig', conejo: 'Rabbit',
    gallina: 'Chicken', pato: 'Duck', codorniz: 'Quail',
    abeja: 'Bees',
  };

  const dairyEntries = Object.entries(milkGrades);
  const welfareEntries = Object.entries(animalWelfareScores).filter(
    ([typeId]) => productionBuildings.some(pb => pb.animalTypeId === typeId)
  );

  if (dairyEntries.length === 0 && welfareEntries.length === 0) return null;

  return (
    <View style={{ backgroundColor: '#1c1c1c', borderRadius: 8, padding: 12, marginHorizontal: 8, marginBottom: 8 }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>📊 Animal Quality</Text>

      {/* Milk grades */}
      {dairyEntries.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Milk Grade</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {dairyEntries.map(([typeId, grade]) => {
              const badgeColor = grade === 'A' ? '#4caf50' : grade === 'B' ? '#ffa726' : '#f44336';
              return (
                <View
                  key={typeId}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ color: '#ccc', fontSize: 11, marginRight: 4 }}>
                    {DAIRY_LABELS[typeId] ?? typeId}
                  </Text>
                  <View style={{ backgroundColor: badgeColor, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Grade {grade}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Welfare scores */}
      {welfareEntries.length > 0 && (
        <View>
          <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>Welfare Score</Text>
          {welfareEntries.map(([typeId, score]) => {
            const barColor = score >= 80 ? '#4caf50' : score >= 60 ? '#ffa726' : '#f44336';
            const label = SPECIES_LABELS[typeId] ?? typeId;
            return (
              <View key={typeId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#ccc', fontSize: 11, width: 64 }}>{label}</Text>
                <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, height: 6, marginHorizontal: 6 }}>
                  <View style={{ width: `${Math.round(score)}%`, backgroundColor: barColor, borderRadius: 4, height: 6 }} />
                </View>
                <Text style={{ color: '#aaa', fontSize: 11, width: 30, textAlign: 'right' }}>{Math.round(score)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
```

### Step 3: Render `AnimalQualitySection` in `HenilAndBuildingsSection`

Find where `<IncubationSection ... />` is rendered (the first component in the JSX section). Add `<AnimalQualitySection ... />` directly BEFORE it:

```typescript
          <AnimalQualitySection
            milkGrades={milkGrades ?? {}}
            animalWelfareScores={animalWelfareScores ?? {}}
            productionBuildings={productionBuildings ?? []}
          />
          <IncubationSection
            incubationQueue={incubationQueue ?? []}
            hatcheryCapacity={hatcheryCapacity ?? 0}
            queueEggsForIncubation={queueEggsForIncubation}
            eggsInStock={animalInventory['eggs'] ?? 0}
            currentDay={day}
          />
```

### Step 4: TypeScript check

```
cmd /c "cd /d \"C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon\" && node_modules\.bin\tsc --noEmit 2>&1"
```

Fix any type errors. Common issue: `productionBuildings` prop type — use the imported `ProductionBuildingState` type if available (check existing imports), or use `{ animalTypeId: string }[]` as a minimal structural type.

### Step 5: Commit

```bash
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" add "app/(tabs)/gestion.tsx"
git -C "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" commit -m "feat(ui): AnimalQualitySection — milk grade badges and welfare score bars in gestion tab"
```

---

## Dependency Order

- Task 1 and Task 2 are independent of each other (different areas of the store)
- Task 3 depends on nothing new (reads from existing state fields)
- Implement: Task 1 → Task 2 → Task 3

## Known Challenges

1. **`productionBuildings` type in Task 3** — The `ProductionBuildingState` type is defined in `engine/productionBuildings.ts`. If it's not imported in `gestion.tsx`, use `{ animalTypeId: string }[]` as the prop type (structural typing — TypeScript will accept it because `ProductionBuildingState` has `animalTypeId: string`). Don't add a new import just for the prop type.
2. **`animalWelfareScores` type** — `Record<string, number>` in `GameState`. The `Object.entries()` map returns `[string, unknown][]` by default — cast scores to `number` where needed, or use `as number`.
3. **`welfareMultiplier` for meat when no species owned** — If `relevantScores.length === 0` (no welfare scores exist for any meat species), `welfareMultiplier` stays `1.0`. This is correct — no data means no penalty/bonus.
4. **`gap` style in React Native** — The `gap: 6` style in the milk-grade row requires RN 0.71+ (Expo 54 uses RN 0.81.5 — fully supported). No issue.
5. **`newProductionBuildings` scope in Task 2** — This is the same variable produced by the production-buildings `.map()` call earlier in `advanceDay`. It's a `let` (or `const`) in the outer `advanceDay` scope. The new block directly references it without re-deriving anything.
