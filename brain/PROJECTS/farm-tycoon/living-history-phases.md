# Living History System — Phase 2 & 3 Roadmap

> Created: 2026-05-19
> After Phase 1 ships, come back here to pick up Phase 2.
> Full design spec: `docs/superpowers/specs/2026-05-19-living-history-system-design.md`

---

## Phase 1 — Timeline Engine ✅ (plan written, Kimi implementing)

Adds the historical event backbone: real dates fire events, prices use real historical baselines, major events show as newspaper modals, minor events show as toast banners. No characters, no family, no succession.

**When Phase 1 is done:** calendar year shows in HUD, 1973 oil embargo fires and costs +40% fuel for 8 months, DDT ban fires, glyphosate unlocks, shop items gate by era.

---

## Phase 2 — Dynasty Engine (plan NOT written yet)

**What it adds:** The farmer character, health, aging, and generational handoff.

### Core components to build

| Component | Description |
|-----------|-------------|
| `engine/dynasty.ts` | Farmer aging, health changes, skill accumulation, handoff trigger logic |
| `data/farmerNames.ts` | Pool of first/last name pairs for procedural farmer generation |
| `store/` — DynastyState slice | farmerName, age, health (0–100), skills, generationNumber, legacyScore |
| `engine/legacyScore.ts` | Accumulates points per generation: land owned, debt cleared, innovations adopted, events survived |
| `components/CharacterCard.tsx` | Sub-screen for the "Carácter" tab — shows farmer stats, skill list, legacy score |
| `engine/inheritance.ts` | Child selection, skill inheritance (weighted from parents), debt carried forward, knowledge transfer |
| Persistent HUD strip (full) | Add health bar, age to the HUD already showing year (Phase 1 adds year only) |

### Key rules (locked in brainstorm)

- Farmer stats: **Age** and **Health** only. No energy bar — no artificial limitations.
- Health drifts down slowly with age, faster with debt/stress events, recovers with good years.
- Handoff triggers: health < 30 (forced), or voluntary at any time if a child is old enough (≥18).
- Health-driven handoff — but the original farmer can stay as a **mentor** on the farm after handoff, giving a skill bonus to the heir for a few years.
- **At least one child always wants the farm** — guaranteed succession, never a dead end.
- If two kids want it: player chooses (divide farm or work together — both are valid).
- Each generation inherits: assets, debts, land, farm name/brand, **accumulated knowledge** (skill scores). Not health or age.
- Legacy score accumulates across ALL generations — it never resets.

### Plan writing approach

When ready: run `/brainstorm` or invoke `writing-plans` skill directly since the design is already in the spec.
Claude writes the plan; Kimi implements; Claude reviews.

**Pre-read before planning:**
- `docs/superpowers/specs/2026-05-19-living-history-system-design.md` — Section: Dynasty Engine
- `engine/timeline.ts` (Phase 1 output) — DynastyState will need `calendarYear` from it
- `store/useGameStore.ts` — check current state shape before adding DynastyState slice

---

## Phase 3 — Family + Reputation + Neighbors (plan NOT written yet)

**What it adds:** Marriage, children, family costs, reputation as a mechanic, NPC neighbor farms.

### Core components to build

| Component | Description |
|-----------|-------------|
| `engine/family.ts` | Relationship events (dating→marriage→kids), family cost calculations, child skill development by era |
| `data/lifeEvents.ts` | ~40 personal life event templates with costs and choices |
| `components/FamiliaTab.tsx` | Familia sub-tab in Legado tab — shows spouse, children, roles, costs |
| `components/FamilyTreeView.tsx` | Árbol sub-tab — visual multi-gen family tree |
| `components/CronicaTab.tsx` | Crónica sub-tab — news feed of all historical events that fired |
| `engine/reputation.ts` | Weekly reputation recalculation (not daily): quality, debt, community, innovation scores → composite |
| `data/neighborFarms.ts` | 3 NPC farms (Caldwells, Petrovs, Greens) — static profiles + how they react to history |
| `engine/neighbors.ts` | Neighbor event logic — land sale offers, cooperative opportunities, price competition |
| `components/LifeEventCard.tsx` | Full-screen decision card for personal events (marriage proposal, child born, etc.) |

### Key rules (locked in brainstorm)

- Personal life events **pause the game** and present a choice card. No auto-resolution for major ones.
- Full agency: player decides whether to pursue relationships. No forced marriage.
- Family expenses are real and historically calibrated: school fees, healthcare, weddings, university, allowances.
- Children from 2000s era are better with technology — skill bonuses match the era they grew up in.
- Wife/partner can take on a farm role (finance manager, office manager) with a real skill bonus.
- Reputation affects: prices buyers offer, loan interest rates, inspector leniency, cooperative access.
- Reputation recalculates **weekly** (not daily — too noisy).
- 3 NPC neighbor farms live through the same historical events. They can: sell you land, buy your produce, compete on price, go bust in the 1985 debt crisis.

### Family cost reference (approximate, historically calibrated)

| Item | Cost |
|------|------|
| Wedding | £3,000–8,000 (era-scaled) |
| Childbirth/healthcare | £200–500/year |
| Primary school | £300–600/child/year |
| Secondary school | £500–1,200/child/year |
| University | £3,000–9,000/year |
| Allowance (teen) | £500–1,000/year |

### Legado Tab structure (to build in Phase 3)

```
Legado tab
├── 👨‍👩‍👧‍👦 Familia   — spouse, children, roles, annual costs
├── 🌳 Árbol     — family tree across generations
├── 📰 Crónica   — historical news feed log
└── 👤 Carácter  — farmer stats (health, age, skills, legacy score)
```

### Plan writing approach

Run `writing-plans` skill when Phase 2 is stable. Phase 3 has the most UI work so break into sub-tasks carefully — the Legado tab has 4 sub-screens.

**Pre-read before planning:**
- `docs/superpowers/specs/2026-05-19-living-history-system-design.md` — Sections: Family Engine, Reputation Engine, Neighbor Farms
- `engine/dynasty.ts` (Phase 2 output) — Family engine will read farmerAge, farmerHealth
- `store/useGameStore.ts` — check FamilyState/ReputationState don't conflict with DynastyState

---

## Overall Architecture After All 3 Phases

```
store/useGameStore.ts
  timeline: TimelineState          ← Phase 1
  dynasty: DynastyState            ← Phase 2
  family: FamilyState              ← Phase 3
  reputation: ReputationState      ← Phase 3

engine/
  calendarUtils.ts                 ← Phase 1
  timeline.ts                      ← Phase 1
  dynasty.ts                       ← Phase 2
  inheritance.ts                   ← Phase 2
  legacyScore.ts                   ← Phase 2
  family.ts                        ← Phase 3
  reputation.ts                    ← Phase 3
  neighbors.ts                     ← Phase 3

data/
  historicalEvents.ts              ← Phase 1
  historicalPrices.ts              ← Phase 1
  farmerNames.ts                   ← Phase 2
  lifeEvents.ts                    ← Phase 3
  neighborFarms.ts                 ← Phase 3
```

---

## Notes for Future Claude

- Don't start Phase 2 until Phase 1 TypeScript is clean and Jose has approved it
- Don't start Phase 3 until Phase 2 dynasty handoff works end-to-end
- The spec file has everything — don't re-brainstorm, just write the plan
- Historical events data only covers 1970–1985 in Phase 1. Expand to 1986–2026 as a Phase 2 or Phase 3 sub-task (it's data work, not logic work — Kimi can do it)
