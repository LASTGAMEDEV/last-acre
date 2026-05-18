# Farm Tycoon — Spec Index (brain mirror)

> Full spec index lives at `projects/farm-tycoon/specs.md`.
> Full spec files live in `docs/superpowers/specs/`.
> Implementation plan files live in `docs/superpowers/plans/`.
> This file is a brief mirror for DOMINGO context.

---

## Current Save Key

`granja-tycoon-save-v9` — bump when any feature changes the store shape.

---

## Implemented in Code (34)

Workers · Futures trading · Animal genetics · Machinery overhaul · Random events & NPC farms · World map · Animal shows · Commodity exchange · Encyclopedia search · Fuel system · Onboarding rework · Price alerts UI · Profit preview & help buttons · Regional market · Save export/import · Auction house · Polish (haptics/chart/rivals) · Realistic animal production · Animal production buildings · Transportation · Climate depth & recurring contracts · Compound realism stack · Design system · NPK/drainage/soil rework · Pest & disease cycles · Water system · Co-op mechanics · Animal breeds · Realistic price engine · Electricity system · Processing system · Selling channels · UI rework (navigation)

---

## Specced in Obsidian (4)

| Spec | File | Key dependency |
|------|------|---------------|
| Precision Agriculture | `docs/superpowers/specs/2026-05-10-precision-agriculture-design.md` | Soil system, pest system |
| Pollination System | `docs/superpowers/specs/2026-05-10-pollination-system-design.md` | Pest/spray system, colmena buildings |
| Manure & Composting | `docs/superpowers/specs/2026-05-10-manure-composting-design.md` | Biogas plant, soil NPK system |
| Feed Ration Balancing | `docs/superpowers/specs/2026-05-10-feed-ration-balancing-design.md` | Animal production, feed mill |

---

See `projects/farm-tycoon/specs.md` for full file paths and status table.

---

## Specs Written — Awaiting Implementation (added 2026-05-11)

9 new design specs written collaboratively with Jose:

| # | Spec | File |
|---|------|------|
| 1 | Active Soil Degradation & Restoration | `2026-05-11-soil-degradation-restoration-design.md` |
| 2 | Tillage System Choice | `2026-05-11-tillage-system-design.md` |
| 3 | Hedgerows & Biodiversity Buffers | `2026-05-11-hedgerows-biodiversity-design.md` |
| 4 | Government Subsidies / CAP Payments | `2026-05-11-cap-subsidies-design.md` |
| 5 | Organic Certification & Transition Period | `2026-05-11-organic-certification-design.md` |
| 6 | Land Leasing & Sharecropping | `2026-05-11-land-leasing-sharecropping-design.md` |
| 7 | Storage Quality Decay | `2026-05-11-storage-quality-decay-design.md` |
| 8 | Night Operations & Time-Optimised Scheduling | `2026-05-11-night-operations-design.md` |
| 9 | Community Supported Agriculture (CSA) | `2026-05-11-csa-community-supported-agriculture-design.md` |

Key design notes:
- Specs 1+2+3 form a soil/environment cluster (dependencies between them)
- Specs 3+4+5 form a EU policy cluster (hedgerows → CAP → organic)
- Tillage no-till weed pressure is realistic: declines over 5 seasons (not fixed)
- Night operations reframed for Spanish context: irrigation at night, summer heat split-shift
- Storage quality: grain (moisture-driven) vs perishables (time-driven) are separate systems
- Land leasing includes tenant improvement compensation negotiation mechanic
