# Full-Scale Adaptive Guide - Design Spec
**Date:** 2026-06-03
**Project:** Granja Tycoon / Last Acre
**Status:** Approved for implementation planning

---

## Overview

The Full-Scale Adaptive Guide turns the existing Office guide, `Encyclopedia`, and small `HelpSheet` popups into a player-facing knowledge system. Its job is simple: when players feel lost, they can open the guide, search or tap the thing they are confused by, understand what it is, and return to play with a clear next action.

The guide has two access paths:

1. **Compiled guide:** a searchable, browsable library in Office that covers systems, crops, animals, buildings, machines, markets, workers, timeline, soil, water, processing, neighbours, and other major game concepts.
2. **Object-level help:** info icons and long-press shortcuts on cards, warnings, fields, animals, buildings, machines, contracts, guide terms, and other objects. These open the exact guide entry for that object or mechanic.

The guide is adaptive. Entries have stable explanations, but they also show era-aware and farm-state-aware sections so advice changes as the farm progresses through history and as the player's actual farm changes.

---

## Design Goals

- Reduce player confusion without simplifying the game.
- Make every major object and mechanic explain itself where the player sees it.
- Give players practical guidance, not just dictionary definitions.
- Use visuals to make complex mechanics readable.
- Respect the historical timeline: an entry should reflect what is available and relevant in the current year.
- Respect the current farm: an entry should show owned assets, missing requirements, current risks, and available actions where possible.
- Reuse the existing guide surface instead of adding a new main tab.

---

## Non-Goals

- Do not implement Annual Planning advisor-aware guide sections in V1.
- Do not call external AI APIs for guide text.
- Do not generate hundreds of unique art assets in the first pass.
- Do not replace the UI redesign Claude is handling.
- Do not add hard tutorial gates or forced lessons.
- Do not make the guide responsible for game actions.

Advisor-aware guide content is tracked as a future idea in `brain/PROJECTS/farm-tycoon/ideas.md`.

---

## Player Experience

### Compiled Guide

The existing Office guide becomes the main guide library. It should support:

- search
- category browsing
- entry detail pages
- related entries
- current-farm status blocks
- era notes
- visual diagrams or illustrations
- quick "what should I do next?" sections

Primary categories:

- Getting Started
- Crops & Fields
- Soil & Water
- Animals & Welfare
- Buildings & Infrastructure
- Machinery & Transport
- Workers
- Processing & Storage
- Market & Contracts
- Banking & Risk
- Co-ops, CSA & Reputation
- Neighbours & Auctions
- Timeline & Historical Events
- Certifications & Subsidies
- Electricity & Utilities
- Common Problems

### Object-Level Help

Important game objects should expose direct guide access.

Access methods:

- visible info icon on important cards
- long press / press-and-hold shortcut where space is tight

The info icon is the primary method because discoverability matters. Long press is a secondary convenience.

Object-level help targets:

- crop cards
- animal cards
- building cards
- machine and attachment cards
- field/parcel panels
- soil stat rows
- water/well/drainage panels
- pest, weed, disease, and disaster warnings
- contract cards
- co-op cards
- buyer cards
- worker cards
- loan and finance panels
- market price cards
- futures and market order cards
- processing recipes and batches
- storage batch quality rows
- electricity and utility cards
- timeline event cards
- neighbour farm and auction cards

---

## Guide Entry Shape

Every guide entry should be player-facing and practical.

```ts
type GuideEntry = {
  id: string;
  title: string;
  category: GuideCategory;
  tags: string[];
  summary: string;
  whyItMatters: string;
  howToUse: string[];
  mistakesToAvoid: string[];
  relatedEntryIds: string[];
  visual?: GuideVisualRef;
  eraSections?: GuideEraSection[];
  farmStateRules?: GuideFarmStateRule[];
};
```

Entry sections:

- **What it is:** short explanation.
- **Why it matters:** how it affects farm outcomes.
- **How to use it:** practical steps.
- **Mistakes to avoid:** common player traps.
- **Your farm right now:** current status, missing requirements, risks, and available actions.
- **Era note:** what changes in the current decade or current historical unlock stage.
- **Related systems:** linked entries.
- **Visual explainer:** diagram, illustration, or before/after panel where useful.

Entries should avoid long walls of text. Short sections, bullets, diagrams, and action-oriented language are preferred.

---

## Adaptive Behaviour

### Era-Aware Content

Guide entries can change based on the historical year and timeline unlocks.

Examples:

- Machinery entries explain older equipment limits in early eras and automation pressure in later eras.
- Worker entries mention cheap labour in early decades and shortages in later decades.
- Market entries reference era-specific volatility, fuel shocks, or historical price pressure.
- Technology entries stay hidden or marked "not available yet" before their unlock year.
- Organic/certification entries can explain when the current rules become relevant.

Era-aware content must be deterministic and local. No external generation.

### Farm-State-Aware Content

Guide entries can show a "Your farm right now" block based on current state.

Examples:

- A crop entry shows whether the player owns seeds, has suitable land, and is in a valid planting season.
- A building entry shows whether it is owned, affordable, locked, or missing prerequisites.
- A machinery entry shows whether the player owns compatible attachments and whether repair is needed.
- A contract entry shows current inventory shortfall and days remaining.
- A soil entry shows the selected parcel's current N/P/K, compaction, pH, drainage, and likely next action.
- A livestock entry shows feed risk, welfare risk, production building status, and winter readiness.
- A market entry shows current price trend, storage risk, and available selling channels.

Farm-state sections must be helpful but not bossy. They should suggest, not command.

---

## Visual Layer

The guide should combine diagrams with small generated illustrations.

### Diagrams

Diagrams are best for systems and relationships.

Examples:

- Soil -> Crop Growth -> Storage Quality -> Market Price
- Crop Rotation -> Soil Health -> Yield Stability
- Feed Quality -> Animal Welfare -> Production Grade
- Storage Moisture -> Quality Decay -> Sale Multiplier
- Contract -> Inventory -> Transport -> Buyer Reputation
- Timeline Event -> Input Cost -> Market Risk -> Farm Strategy

Diagrams should be reusable components, not static one-off images where possible.

### Generated Illustrations

Generated bitmap illustrations are useful for category headers and high-value entries.

Initial image targets:

- Guide home/category header
- Crops & Fields
- Soil & Water
- Animals & Welfare
- Machinery & Transport
- Market & Contracts
- Timeline & Historical Events
- Common Problems

The first build should avoid generating images for every crop, animal, and building. Start with category-level art and add specific illustrations only for confusing/high-value entries.

### Before/After Panels

Before/after panels should explain state changes.

Examples:

- compacted soil vs restored soil
- dry storage vs wet storage
- underfed animals vs balanced ration
- unplanned harvest bottleneck vs planned workload
- conventional field edge vs hedgerow/pollinator strip

---

## Architecture

The guide should have a static content layer and a deterministic adapter layer.

New or evolved files:

```txt
data/guideEntries.ts
types/guide.ts
engine/guideContext.ts
components/Guide/
  GuideHome.tsx
  GuideSearch.tsx
  GuideEntryView.tsx
  GuideContextPanel.tsx
  GuideVisual.tsx
  GuideLink.tsx
components/GuideButton.tsx
```

### Static Content Layer

`data/guideEntries.ts` contains the base guide content:

- IDs
- titles
- categories
- tags
- stable explanatory copy
- related entry links
- visual references
- era section definitions
- farm-state rule references

### Context Adapter Layer

`engine/guideContext.ts` creates dynamic sections from game state.

Conceptual API:

```ts
export function buildGuideContext(input: GuideContextInput): GuideContext;
export function getEraSection(entry: GuideEntry, context: GuideContext): GuideEraSection | null;
export function getFarmStatePanel(entry: GuideEntry, context: GuideContext): GuideFarmStatePanel | null;
export function getGuideRelatedActions(entry: GuideEntry, context: GuideContext): GuideRelatedAction[];
```

The adapter must be pure and must not import the store directly.

---

## UI Integration

### Office Guide

`app/(tabs)/office.tsx` already has a `guide` tab that renders `Encyclopedia`. The first implementation can replace or evolve `components/Encyclopedia.tsx` into the new guide surface.

The Office guide should include:

- search input
- category chips
- recently viewed or suggested entries
- common problems section
- entry cards with title, summary, tags, and relevance notes
- entry detail view

### Object-Level Guide Access

Create a reusable guide trigger component:

```ts
type GuideButtonProps = {
  entryId: string;
  objectId?: string;
  compact?: boolean;
};
```

Use this on important cards and panels. For long press, wrap eligible cards with a helper that opens the same entry.

Guide buttons should open the entry in a modal/sheet or navigate to the Office guide detail, depending on the current navigation pattern. The design should preserve the player's current workflow as much as possible.

### HelpSheet Migration

Existing `HelpSheet` popups can remain temporarily. Over time, short `HelpSheet` copy should migrate into guide entries so help content is not duplicated.

---

## Content Priorities

The first content pass should cover systems players are most likely to find confusing:

1. crop seasons and planting windows
2. soil stats and yield impact
3. water, irrigation, wells, and drainage
4. storage quality and decay
5. contracts and recurring contracts
6. market prices, sell pressure, futures, and market orders
7. animal feed, welfare, breeding, and production buildings
8. machinery, attachments, contractors, fuel, and repair
9. processing recipes, quality, and expiry
10. loans, savings, credit score, and risk
11. workers, fatigue, injuries, satisfaction, and payroll
12. co-ops, CSA, reputation, and buyers
13. neighbours, auctions, and land competition
14. timeline events and historical unlocks
15. common recovery paths for players who feel stuck

---

## Common Problems Section

The guide needs a "Common Problems" category because lost players often do not know the name of the system they need.

Example articles:

- I have no money.
- My crop yield is bad.
- I cannot plant this crop.
- My animals are not producing enough.
- I missed a contract.
- My machines keep breaking.
- My storage quality is dropping.
- I do not know what to do next.
- I expanded too fast.
- Prices are terrible.
- I cannot afford workers.
- I am losing money every day.

Each problem article should link to relevant systems and suggest 2-4 practical recovery actions.

---

## Save And Persistence

The first guide build should avoid changing core save shape unless needed.

Acceptable persisted guide state:

- recently viewed entry IDs
- dismissed first-time guide prompts
- optional guide settings

If persisted state is added to the Zustand store, implementation must bump the save key and update `partialize` correctly.

---

## First Build Scope

### In Scope

- Full compiled guide in Office
- searchable categories and entries
- object-level guide buttons
- long-press shortcut support where practical
- guide entry detail view
- era-aware sections
- farm-state-aware "your farm right now" panels
- related entry links
- common problems section
- diagram/visual framework
- initial category-level generated illustration plan
- migration path from `HelpSheet` to guide entries

### Out of Scope

- advisor-aware guide sections
- external AI text generation
- full image set for every object
- new main navigation tab
- forced tutorial gates
- automatic gameplay actions
- cloud save changes
- replacing Claude's UI redesign work

### Future Extensions

- advisor-aware guide entries once Annual Farm Planning exists
- plan-aware guide recommendations
- more generated illustrations for specific high-value entries
- interactive calculators inside guide entries
- shareable guide/problem reports
- audio narration or narrated tutorial cards
- content localization pipeline

---

## Testing And Verification

There is no formal test suite. Implementation should verify with:

- `npx tsc --noEmit`
- `npx expo lint`
- web smoke test
- open Office -> Guide
- search for entries
- open an entry from compiled guide
- open an entry from an object-level info button
- open an entry from long press where implemented
- verify era-aware text changes by calendar year
- verify farm-state panels handle missing data gracefully
- verify guide does not mutate game state
- verify guide remains usable on small mobile screens

---

## Implementation Notes

- Keep guide IDs stable because object-level links will depend on them.
- Prefer deterministic templates over generated text.
- Avoid duplicating help copy across `HelpSheet` and guide entries long term.
- Start with fewer excellent entries instead of many shallow entries.
- Use diagrams for mechanics, generated illustrations for category mood and recognition.
- Keep visual assets inspectable and relevant; do not use generic decorative art where a diagram would teach better.
