# AI Coding Rules — granja-tycoon

Paste this at the start of any AI coding session (Kimi, Copilot, etc.) so you
understand the project, the workflow, and the sharp edges.

---

## The Project

**Granja Tycoon** is a React Native farming tycoon game built with Expo Router.
Stack: React Native 0.81.5 · Expo 54 · Expo Router · TypeScript 5.9.2 · Zustand 5 · React 19.

There is **no test suite**. There is no build step beyond Expo's bundler.

Verify every change with:
```bash
npx tsc --noEmit     # zero errors required before committing
npx expo lint        # zero errors required before committing (warnings OK)
```

Run from `granja-tycoon/`. Never commit with TypeScript errors.

---

## Navigation Architecture — READ THIS CAREFULLY

There are exactly **4 top-level tabs** + a center Advance Day button. Do not add new ones.

```
Farm  |  Ops  |  ▶ Advance Day  |  Market  |  Office
```

Each top-level tab (`farm.tsx`, `ops.tsx`, `market.tsx`, `office.tsx`) is a **hub
screen** that hosts scrollable sub-tabs via `<SubTabBar>`.

Files prefixed with `_` in `app/(tabs)/` (e.g. `_tierras.tsx`, `_animales.tsx`) are
**sub-tab screens**. The underscore prefix hides them from Expo Router's automatic tab
registration — they are imported directly into their hub screen, not routed to directly.

**Rules:**
- Never add a new file to `app/(tabs)/` without an underscore prefix unless it is
  a new top-level tab (which should be rare and discussed first).
- When adding new content, embed it as a sub-tab inside an existing hub screen.
- When a screen is moved or renamed, grep the entire codebase for any
  `router.push('/(tabs)/old-name')` calls and update them.
- Run `npx tsc --noEmit` after any navigation change — TypeScript errors on invalid
  Expo Router route strings.

---

## State — The Zustand Store

All game state and every action live in `store/useGameStore.ts`. It is a single Zustand
store with `persist` middleware writing to `AsyncStorage`.

**Current save key: `granja-tycoon-save-v10`**

Rules for the store:
- **Bump the save key** any time you add new required fields or change the shape of
  existing ones. Pattern: `v9` → `v10`. Update the key string and add a comment.
- **Never remove `partialize`** from the persist config. It excludes action functions
  from serialization. Without it, functions get serialized as `{}`, hydration
  overwrites them, and every button silently stops working.
- **Always add `?? defaultValue` guards** when reading new optional fields in
  components and actions — existing saves won't have them, and the field will be
  `undefined` until the user's save migrates.
- Never put business logic in screen components. Screens read state and call store
  actions. Logic belongs in the store or in `engine/`.

---

## Engine Files — Pure Functions Only

Files in `engine/` are pure functions with no store access and no side effects.
If you need to compute something during a day tick, add a pure function to `engine/`
and call it from `advanceDay()` in the store.

Key engines:
- `engine/climate.ts` — seasons (90 days each), weather, forecast
- `engine/crops.ts` — harvest yield, soil, fertilizer modifiers
- `engine/market.ts` — price fluctuation, sell revenue (15% tax)
- `engine/banking.ts` — loan rates, credit score, savings interest
- `engine/animals.ts` — maturity, produce, welfare
- `engine/pests.ts` — pest/disease spread and treatment
- `engine/sellingChannels.ts` — farm shop, online shop, veg box logic

---

## Data Files — Static Config, Never Rename IDs

Files in `data/` are static readonly config. These string IDs are stored in player
saves and **must never be renamed**:

- Animal `enclosureType`: `'gallinero'` `'establo'` `'caballeriza'` `'pocilga'` `'corral'` `'colmena'` `'conejera'`
- `InsuranceType`: `'sequia'` `'helada'` `'plaga'` `'incendio'`
- Building IDs: `bld_gallinero_s`, `bld_gallinero_l`, `bld_establo_s`, etc.

You can change `name`/`description`/`label` display strings freely. Never change the `id` field.

Adding a new crop/animal/building = add an entry to the relevant data file; the store
and UI pick it up automatically.

---

## Critical Web Compatibility Rules

The game runs on web via Expo. These fixes must never be undone:

1. **`metro.config.js` must keep `unstable_enablePackageExports: false`**
   Zustand v5 ships an ESM build using `import.meta`, which crashes Metro on web.
   Removing this breaks all buttons on web.

2. **`partialize` in persist config** — see Store section above.

3. **`GestureHandlerRootView`** wraps the app in `app/_layout.tsx`. Required for
   `react-native-gesture-handler` on web. Do not remove it.

4. **No `pointerEvents="box-none"` on the `<View>` wrapping `<Tabs>`** in
   `app/(tabs)/_layout.tsx`. This cascades as `pointer-events: none` in CSS and
   blocks all tab interaction on web.

5. **No `require()` imports** — use static ES `import` statements only.
   Metro/web can't tree-shake dynamic requires and they break in some bundling modes.

---

## Unicode / Emoji Rules

- Always write emoji as literal characters (🌿 🌾 🔵 etc.), never as escape sequences.
- Save files as **UTF-8 without BOM**. Files with a UTF-8 BOM trigger ESLint warnings.
- If you see emoji rendered as garbage like `ðŸŒ¿` or `â¬œ` or text starting with `Â`,
  the file has been double-encoded through Windows-1252. This is a bug — fix the file
  encoding, do not work around it.

---

## JSX Text Rules

Inside JSX text nodes (between tags like `<Text>`), these characters must be escaped:
- `"` → `&quot;`
- `'` → `&apos;`

The ESLint rule `react/no-unescaped-entities` catches these as **errors**, not warnings.

---

## Your Role If You Are Kimi

**You are an executor, not a designer.**

Before writing a single line of code, locate the plan file for this feature in
`docs/superpowers/plans/` and the design spec in `docs/superpowers/specs/`.
If there is no plan file, stop and ask for one — do not invent an approach.

The plan file tells you:
- Exactly which files to create or modify
- The precise state shape, action signatures, and data types to use
- Which files are off-limits
- The step-by-step order to implement in
- The verification checklist to run when done

**If something is not in the plan, do not do it.** Do not refactor nearby code.
Do not add extra features. Do not rename things. Do not create new top-level tabs.
Do not make architectural decisions. If you hit a case the plan didn't anticipate,
stop and flag it rather than inventing a solution.

Claude Code writes the specs and plans. You implement them exactly.

---

## Commit & Workflow Rules

This project is worked on by three AI assistants + the owner:
- **ClawdBot** — the user's planning assistant; defines what to build.
- **Claude Code** — writes technical specs and implementation plans; reviews code; fixes bugs; commits.
- **Kimi Code** — implements features by following Claude Code's plan files exactly.

To keep them in sync:

1. Always run `npx tsc --noEmit && npx expo lint` before committing.
2. Write descriptive commit messages. Use conventional commits:
   - `feat:` new feature
   - `fix:` bug fix
   - `refactor:` code restructure without behaviour change
   - `docs:` documentation only
3. Push to GitHub (`git push origin main`) after every session.
4. Claude Code reads git history to understand context — your commit messages are
   its breadcrumbs. Never squash to a single "WIP" commit.

---

## What NOT to Do

- Do not rewrite or restructure dvanceDay() — only append new blocks to it.
  It is 6000+ lines containing years of bugfixes. Adding a new system means adding
  a new clearly-labelled block at the appropriate point. Never touch existing blocks.
- When adding new store actions, add them to the partialize exclusion list too.
  Actions not excluded from partialize get serialized as {} in AsyncStorage,
  hydration overwrites them, and every button that calls them silently stops working.
- New fields added to LandParcel, Animal, Building, or any other interface that
  is stored in saves MUST be optional (ield?: Type) or have ?? defaultValue guards
  everywhere they are read. Existing saves will not have the field — it will be
  undefined until the player's save migrates, causing crashes on old saves.
- Engine files in engine/ must not import from store/, components/, or
  pp/. They are pure functions only. If you need game state in an engine function,
  pass it as a parameter. Importing the store into an engine file creates circular
  dependencies and breaks the architecture.
- Do not leave console.log, console.warn, or console.error in committed code.
- Do not use s any or // @ts-ignore to silence TypeScript errors. Fix the
  actual type. These suppress real bugs that surface as silent failures at runtime.
- Do not create new standalone screen files in pp/ for features that belong inside
  an existing tab. New UI goes in components/ as a component, then gets imported
  into the relevant hub screen (arm.tsx, ops.tsx, market.tsx, office.tsx).
- Do not add a 5th top-level tab without discussing it first.
- Do not rename save-critical ID strings (enclosure types, insurance types, building IDs).
- Do not remove or bypass `partialize` from the Zustand persist config.
- Do not modify `metro.config.js` without understanding the web compatibility reason.
- Do not put game logic (formulas, calculations) in screen components — it belongs in
  the store or `engine/`.
- Do not use `require()` for imports.
- Do not add comments that describe WHAT the code does. Only add comments for WHY
  (a non-obvious constraint, workaround, or invariant).
- Do not commit with TypeScript errors or ESLint errors.
- Do not display prices or costs with `$`. This game is set in Spain — all monetary
  values must use `€`. Found in: NutritionTab (cost/animal), PrecisionTab (soil lab hint).
- Do not add a new _*.tsx file to pp/(tabs)/ without also adding a matching
  <Tabs.Screen name="_yourscreen" options={{ href: null }} /> entry in
  pp/(tabs)/_layout.tsx. Without it, Expo Router auto-registers the file as a
  visible tab — breaking the tab bar. This happened when Kimi added _agua.tsx,
  _animales.tsx, etc. and skipped the layout entry, producing 10+ ghost tabs.
- Do not leave unused imports in components. ESLint catches these as warnings. Run
  `npx expo lint` before handing off. Found in: CompostScreen (`Alert` imported but never used).
