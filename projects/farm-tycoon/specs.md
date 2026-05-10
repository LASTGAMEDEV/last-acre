# Farm Tycoon — Specs Index

This file is the single entry point for ClawdBot to understand all designed features.
Full spec files live in `docs/superpowers/specs/`. Plans (step-by-step for Kimi) live in `docs/superpowers/plans/`.

When Claude Code writes a new spec, it adds a summary entry here.

---

## Workflow

```
ClawdBot (plan with user)
  → Claude Code (write spec + plan files, add entry here)
    → Kimi Code (implement from plan exactly)
      → Claude Code (review, fix, commit)
```

---

## Built & Shipped

| Feature | Spec | Status |
|---------|------|--------|
| Workers system | `docs/superpowers/specs/2026-03-28-workers-redesign.md` | ✅ Shipped |
| Futures trading | `docs/superpowers/specs/2026-03-29-futures-trading-design.md` | ✅ Shipped |
| Animal genetics | `docs/superpowers/specs/2026-03-30-genetics-design.md` | ✅ Shipped |
| Machinery overhaul | `docs/superpowers/specs/2026-03-30-machinery-overhaul-design.md` | ✅ Shipped |
| Random events & NPC farms | `docs/superpowers/specs/2026-03-30-random-events-npc-farms-design.md` | ✅ Shipped |
| World map | `docs/superpowers/specs/2026-03-31-world-map-design.md` | ✅ Shipped |
| Animal shows | `docs/superpowers/specs/2026-04-02-animal-shows-design.md` | ✅ Shipped |
| Commodity exchange | `docs/superpowers/specs/2026-04-02-commodity-exchange-design.md` | ✅ Shipped |
| Encyclopedia search | `docs/superpowers/specs/2026-04-02-encyclopedia-search-design.md` | ✅ Shipped |
| Fuel system | `docs/superpowers/specs/2026-04-02-fuel-system-design.md` | ✅ Shipped |
| Onboarding rework | `docs/superpowers/specs/2026-04-02-onboarding-rework-design.md` | ✅ Shipped |
| Price alerts UI | `docs/superpowers/specs/2026-04-02-price-alerts-ui-design.md` | ✅ Shipped |
| Profit preview & help buttons | `docs/superpowers/specs/2026-04-02-profit-preview-help-buttons-design.md` | ✅ Shipped |
| Regional market | `docs/superpowers/specs/2026-04-02-regional-market-design.md` | ✅ Shipped |
| Save export/import | `docs/superpowers/specs/2026-04-02-save-export-import-design.md` | ✅ Shipped |
| Auction house | `docs/superpowers/specs/2026-04-03-auction-house-design.md` | ✅ Shipped |
| Polish: haptics, chart, rivals | `docs/superpowers/specs/2026-04-04-polish-haptics-chart-rivals.md` | ✅ Shipped |
| Realistic animal production | `docs/superpowers/specs/2026-04-05-realistic-animal-production-design.md` | ✅ Shipped |
| Animal production buildings | `docs/superpowers/specs/2026-04-09-animal-production-buildings-design.md` | ✅ Shipped |
| Transportation | `docs/superpowers/specs/2026-04-09-transportation-design.md` | ✅ Shipped |
| Climate depth & recurring contracts | `docs/superpowers/specs/2026-04-13-climate-depth-recurring-contracts-design.md` | ✅ Shipped |
| Compound realism stack | `docs/superpowers/specs/2026-04-13-compound-realism-stack-design.md` | ✅ Shipped |
| Design system | `docs/superpowers/specs/2026-04-13-design-system.md` | ✅ Shipped |
| NPK / drainage / soil rework | `docs/superpowers/specs/2026-04-16-npk-drainage-soil-rework-design.md` | ✅ Shipped |
| Pest & disease cycles | `docs/superpowers/specs/2026-04-16-pest-disease-cycles-design.md` | ✅ Shipped |
| Water system | `docs/superpowers/specs/2026-04-16-water-system-design.md` | ✅ Shipped |
| Co-op mechanics | `docs/superpowers/specs/2026-04-17-coop-mechanics-design.md` | ✅ Shipped |
| Animal breeds | `docs/superpowers/specs/2026-04-18-animal-breeds-design.md` | ✅ Shipped |
| Realistic price engine | `docs/superpowers/specs/2026-04-18-realistic-price-engine-design.md` | ✅ Shipped |
| Electricity system | `docs/superpowers/specs/2026-04-19-electricity-system-design.md` | ✅ Shipped |
| Processing system | `docs/superpowers/specs/2026-04-19-processing-system-design.md` | ✅ Shipped |
| Selling channels | `docs/superpowers/specs/2026-04-19-selling-channels-design.md` | ✅ Shipped |
| UI rework — navigation | `docs/superpowers/specs/2026-05-09-ui-rework-navigation.md` | ✅ Shipped |

---

## Specs Written, Not Yet Implemented

| Feature | Spec | Notes |
|---------|------|-------|
| Active soil degradation | `docs/specs/01-active-soil-degradation.md` | — |
| Tillage system | `docs/specs/02-tillage-system-choice.md` | — |
| Organic certification | `docs/specs/03-organic-certification.md` | — |
| Government subsidies | `docs/specs/04-government-subsidies.md` | — |
| Land leasing | `docs/specs/05-land-leasing.md` | — |
| Storage quality decay | `docs/specs/06-storage-quality-decay.md` | — |
| Pollination system | `docs/specs/07-pollination-system.md` | — |
| Manure management | `docs/specs/08-manure-management.md` | — |
| Feed ration balancing | `docs/specs/09-feed-ration-balancing.md` | — |
| Precision agriculture | `docs/specs/10-precision-agriculture.md` | — |
| Night operations | `docs/specs/11-night-operations.md` | — |
| Hedgerows & biodiversity | `docs/specs/12-hedgerows-biodiversity.md` | — |
| Community supported agriculture | `docs/specs/13-community-supported-agriculture.md` | — |

---

## Current Save Key

`granja-tycoon-save-v9` — bump this when any new feature changes the store shape.
