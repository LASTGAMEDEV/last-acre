# Animal Production Buildings — Plan 4: Feed Mill, Slurry Tractor Job & Apiary Effects

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate gameplay effects for three already-purchasable buildings: wire the `spread_slurry` tractor job into `advanceDay` so spreading slurry uses a tractor, reduce daily grain consumption by 35% when a feed mill is owned, and protect bee colonies from winter collapse when an apiary shelter is owned.

**Architecture:** All three changes are isolated `advanceDay` insertions in `store/useGameStore.ts`. No new GameState fields, no new actions, no UI changes. Each task is a drop-in code block following the Plan 2–3 inline `state.buildings.includes()` pattern. A single bridge variable (`tractorSlurryDrain`) links the tractor-job loop (line ~2652) to the slurry accumulation block (line ~3232).

**Tech Stack:** React Native 0.81.5 / Expo 54 / TypeScript / Zustand 5. No test infrastructure — use `npx tsc --noEmit` for verification.

---

## Plans 5+ (not in this plan)

- **Plan 5:** Silage pit mechanics (fill action + winter hay substitution for ruminants), processing buildings (smokehouse +40% meat, wool scouring +30% wool), cream separator products, biogas upgrader biomethane toggle, hatchery auto-spawn
- **Plan 6:** Milk quality grading (SCC from hygiene, butterfat from feed + genetics), animal welfare score (hygiene + feed + density + health → Grade A/B product flag), monitoring (farm lab, carbon tracker)

---

## Architectural Notes

- **Tractor loop ↔ slurry block bridge:** The tractor job loop (`completedTractorJobIds`) runs at line ~2652, before the slurry accumulation block at line ~3232. Declare `let tractorSlurryDrain = 0` before the tractor loop; set it when a `spread_slurry` job completes; then at line ~3232 subtract it from the starting slurry level.
- **Feed mill:** `computeFeedNeeded()` returns `{ grainKg, hayKg, pigGrainKg }`. The mill reduces grain (not hay) consumption by 35%. Rename the destructured vars with `_raw` aliases, then declare reduced `const grainKg` / `const pigGrainKg` in the same block scope.
- **Apiary shelter:** Season-transition pattern identical to sheep dip (Plan 3 Task 5 Block C). Trigger: `seasonKey(newDay) === 'winter' && seasonKey(newDay - 1) !== 'winter'`. Use a block scope `{}` and a local `collapseCount` to avoid collisions with existing `prevSeason`/`currentSeason` vars and stale `diedIds.length` counts.
- **No GameState additions:** No new fields → no `onRehydrateStorage` or `performPrestige` changes needed.

---

## File Map

| File | Change |
|------|--------|
| `store/useGameStore.ts` | Task 1: 1 variable + 1 `else if` branch + 1 line change<br>Task 2: Replace 1 line with 6 lines<br>Task 3: 1 block after sheep dip |

---

## Task 1: Slurry tractor job — `advanceDay` integration

**Files:** Modify `store/useGameStore.ts`

Read the tractor job loop in `advanceDay`. Search for `'spread_slurry'` or `operation === 'till'` to find the if/else-if chain at around line 2666. The structure is:
```
for (const job of tractorJobs) {
  if (job.completesDay > newDay) continue;
  // fuel check
  completedTractorJobIds.push(job.id);
  if (job.operation === 'till') { ... }
  else if (job.operation === 'spray') { ... }
  else if (job.operation === 'plant') { ... }
}
```

Also find the slurry accumulation block (search `SLURRY_LITRES_PER_DAY`) at line ~3211, where `let newSlurryLevel = state.slurryLevel ?? 0;` is declared (line ~3232).

- [ ] **Step 1: Declare `tractorSlurryDrain` before the tractor loop**

Find `const completedTractorJobIds: string[] = [];`. On the line directly before it, add:

```typescript
let tractorSlurryDrain = 0;
```

- [ ] **Step 2: Add `spread_slurry` branch in the tractor-job if/else-if chain**

Find the closing brace of the `else if (job.operation === 'plant')` block. After it, add:

```typescript
} else if (job.operation === 'spread_slurry') {
  // Apply +1 fertility to all assigned parcels (clamped at 25)
  finalParcels = finalParcels.map((p: LandParcel) =>
    job.parcelIds.includes(p.id)
      ? { ...p, fertility: Math.min(25, (p.fertility ?? 1) + 1) }
      : p
  );
  // Drain the whole tank — tractor job empties it in one pass
  tractorSlurryDrain = state.slurryLevel ?? 0;
  summary.push({
    id: `tj_${job.id}`,
    icon: '💧',
    title: 'Slurry Spread Complete',
    detail: `${job.parcelIds.length} parcel(s) received +1 soil fertility`,
    severity: 'good' as const,
  });
}
```

- [ ] **Step 3: Apply the drain in the slurry accumulation block**

Find `let newSlurryLevel = state.slurryLevel ?? 0;` (line ~3232). Change it to:

```typescript
let newSlurryLevel = Math.max(0, (state.slurryLevel ?? 0) - tractorSlurryDrain);
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any errors (most likely: `LandParcel.fertility` possibly `undefined` — the `?? 1` handles that, but check the type).

- [ ] **Step 5: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): spread_slurry tractor job applies fertility and drains slurry tank"
```

---

## Task 2: Feed mill — 35% grain consumption reduction in `advanceDay`

**Files:** Modify `store/useGameStore.ts`

Read the feed deduction block (search `computeFeedNeeded`). It is inside a `{ }` block scope at line ~2948. The relevant line is:

```typescript
const { grainKg, hayKg, pigGrainKg } = computeFeedNeeded(animals, AT_FEED, newDay);
```

- [ ] **Step 1: Replace the destructure with aliased names + feed mill multiplier**

Replace:
```typescript
const { grainKg, hayKg, pigGrainKg } = computeFeedNeeded(animals, AT_FEED, newDay);
```

With:
```typescript
const { grainKg: _rawGrainKg, hayKg, pigGrainKg: _rawPigGrainKg } = computeFeedNeeded(animals, AT_FEED, newDay);
const hasFeedMill = (state.buildings ?? []).some(bid =>
  bid === 'bld_feed_mill_s' || bid === 'bld_feed_mill_m' || bid === 'bld_feed_mill_l'
);
const feedMillMult = hasFeedMill ? 0.65 : 1.0; // 35% reduction when milling on-farm
const grainKg = Math.round(_rawGrainKg * feedMillMult * 10) / 10;
const pigGrainKg = Math.round(_rawPigGrainKg * feedMillMult * 10) / 10;
```

`hayKg` is unchanged — the mill only affects grain, not hay. All downstream uses of `grainKg` and `pigGrainKg` in the same `{ }` block scope automatically pick up the reduced values.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about `_rawGrainKg` being unused (it won't — it's used on the next line), rename differently.

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): feed mill reduces daily grain consumption by 35% in advanceDay"
```

---

## Task 3: Apiary shelter — winter colony collapse in `advanceDay`

**Files:** Modify `store/useGameStore.ts`

Read the sheep dip block (search `bld_sheep_dip` or `hasSheepDip`). It is a `{ }` scoped block that fires on autumn transition. Add a parallel block for winter transition immediately after it.

- [ ] **Step 1: Add apiary shelter block after the sheep dip closing brace**

Find the closing `}` of the sheep dip block (the outer `{ const prevSeason = ...; if (currentSeason === 'autumn') { ... } }` block). After it, add:

```typescript
// ── Apiary shelter: winter colony collapse ────────────────────────────────
{
  const prevSeasonApiary = seasonKey(newDay - 1);
  const currSeasonApiary = seasonKey(newDay);
  if (currSeasonApiary === 'winter' && prevSeasonApiary !== 'winter') {
    const hasApiaryShelter = (state.buildings ?? []).includes('bld_apiary_shelter');
    const bees = animals.filter((a: OwnedAnimal) => a.typeId === 'abeja' && !a.sick);
    let collapseCount = 0;
    bees.forEach((bee: OwnedAnimal) => {
      const collapseChance = hasApiaryShelter ? 0.04 : 0.20; // 4% vs 20% per colony
      if (Math.random() < collapseChance) {
        diedIds.push(bee.id);
        animals = animals.filter((a: OwnedAnimal) => a.id !== bee.id);
        collapseCount++;
      }
    });
    if (collapseCount > 0) {
      summary.push({
        id: `apiary_collapse_${newDay}`,
        icon: '🐝',
        title: `${collapseCount} bee colony${collapseCount > 1 ? 'ies' : ''} collapsed`,
        detail: hasApiaryShelter
          ? 'Shelter reduced losses. Consider adding a queen rearing unit.'
          : 'Build an Apiary Shelter to protect hives from winter.',
        severity: 'warning' as const,
      });
    }
  }
}
```

**Important notes:**
- Block-scoped `{}` prevents collision with `prevSeason`/`currentSeason` vars used in the sheep dip block
- Local `collapseCount` avoids reading stale `diedIds.length` (which would include deaths from earlier in the day)
- `animals = animals.filter(...)` inside `forEach` — this works because `animals` is `let` in `advanceDay` scope. Verify this before implementing.
- If `animals` is not reassignable at this point, use `animals = animals.filter(a => !beeIdsToRemove.has(a.id))` after the `forEach` loop instead.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): apiary shelter protects bee colonies from winter collapse"
```

---

## Dependency Order

- Tasks 1, 2, 3 are fully independent — each modifies a different block in `advanceDay`
- No shared variables between tasks (except `animals` and `diedIds`, which exist throughout `advanceDay`)
- Implement in any order; commit separately

## Known Challenges

1. **`LandParcel.fertility` type** — May be `number | undefined`. The `?? 1` in `Math.min(25, (p.fertility ?? 1) + 1)` handles this. If TypeScript still complains, cast: `(p.fertility as number ?? 1)`.
2. **`animals` reassignment in Task 3** — The apiary block assigns `animals = animals.filter(...)` inside `forEach`. Confirm `animals` is declared as `let animals = state.animals` (or similar) in `advanceDay` scope. It was confirmed `let` in Plan 2 (sick bay isolation block also reassigns `animals`).
3. **`diedIds` push in Task 3** — Verify `diedIds` is a `let` array (not `const`) at the apiary block's scope. It was declared as `let` in Plan 2.
4. **Feed block scope in Task 2** — The feed deduction is inside a `{ }` block scope. The new `grainKg` / `pigGrainKg` constants must be declared inside that same scope — they replace the destructured ones, so they will be in the same scope automatically.
