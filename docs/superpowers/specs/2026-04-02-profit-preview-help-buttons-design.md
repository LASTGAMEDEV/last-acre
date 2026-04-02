# Profit Preview Enhancement & Contextual Help Buttons — Design Spec

**Date:** 2026-04-02
**Status:** Approved

---

## Overview

Two small UI improvements to reduce guesswork for players:

1. **Profit Preview** — the existing preview card in the planting modal already shows seed cost, estimated yield, estimated profit, daily return, and days to harvest. Enhance it to also surface fertilizer and herbicide as explicit cost lines so the player sees the full input cost before committing.

2. **Contextual Help (?) Buttons** — a reusable `HelpSheet` component: a small `?` button that slides up a bottom-sheet `Modal` with a title and 2–4 sentence explanation. Placed next to confusing terms across the game's tabs.

---

## Feature 1: Profit Preview Enhancement

### Location
`app/(tabs)/tierras.tsx` — the IIFE block starting around line 780 that renders the `📊 Profit Preview` card.

### Current rows
| Row | Value |
|-----|-------|
| Seed cost | `-$seedCostPrev` (already includes fertilizer markup when toggle is on) |
| Est. yield (X kg) | `+$estRevenue` |
| Est. profit | `±$estProfit` |
| Daily return | `$X/day` |
| Ready in | `Xd` |

### New rows to add

**Fertilizer cost row** (shown only when `fertilized === true`):
- Label: `Fertilizer (30% addon)`
- Value: `−$fertCost` where `fertCost = Math.round(crop.seedCost * ha * coopDiscount * 0.3)`
- Color: `#ef9a9a`
- The existing `seedCostPrev` stays as-is (it includes fertilizer). This row makes the fertilizer portion visible as a named line rather than hiding it inside seed cost.

**Herbicide cost row** (shown only when `plantingParcel.hasWeeds === true`):
- Label: `Herbicide (field has weeds)`
- Value: `−$herbCost` where `herbCost` is estimated as the cheapest available herbicide's `cost × hectares`
  - Look up: `PRODUCT_TYPES.filter(p => p.category === 'herbicide')`, sort by `cost`, take first, multiply by `ha`
  - If player has herbicide in `productInventory`, prefer that product's cost
- Color: `#ef9a9a`
- This cost is **not** deducted from `estProfit` in the existing rows — it appears as an additional advisory line below the existing profit row with a note: `* Weed removal not included in profit above`

### Rationale for advisory vs. deducted
Herbicide is applied separately (mid-crop, not at planting) and the player may already own stock. Showing it as advisory avoids double-counting while still surfacing the cost.

---

## Feature 2: Contextual Help (?) Buttons

### Component: `components/HelpSheet.tsx`

```
Props:
  title: string        — header shown in the sheet
  body: string         — explanation text (2–4 sentences)
  size?: number        — button size (default 14)
```

**Behaviour:**
- Renders a small circular `?` button inline (e.g. next to a section label)
- On press: slides up a `Modal` (transparent, `animationType="slide"`) with a dark bottom sheet
- Sheet contains: close handle bar, title, body text, and a "Got it" dismiss button
- No external dependencies — uses React Native `Modal` + `Animated` (already in project)

### Placement — initial set of `?` buttons

| Screen | Label | Help text |
|--------|-------|-----------|
| `tierras.tsx` | Soil Type | "Each soil type favours different crops. Loamy soil gives balanced yields, sandy soil suits drought-tolerant crops, clay soil suits root vegetables, and chalky soil suits specialty crops. Matching crop to soil gives up to +20% yield." |
| `tierras.tsx` | Crop Rotation | "Planting a different crop than the previous one gives a +15% yield bonus. Rotating also slows fertility loss over time. Try to avoid planting the same high-drain crop twice in a row." |
| `animales.tsx` | Gene Grade | "Each gene is scored D (weak) to S (exceptional). The overall grade is the average of all four genes. Higher grades mean more production, disease resistance, faster growth, or better sell price. Breed selectively to improve grades over generations." |
| `economia.tsx` | Sell Pressure | "Selling a large quantity of a crop at once drives the market price down temporarily. Spreading sales over several days or selling smaller amounts avoids the penalty. The pressure lifts after a few days." |
| `economia.tsx` | Futures | "A futures contract locks in today's price for a crop you'll deliver later. Useful when prices are high but your harvest isn't ready yet. If you can't deliver the agreed quantity, you pay a penalty." |
| `oficina.tsx` | Credit Score | "Your credit score determines how much you can borrow and at what interest rate. It's based on your rolling income over recent days, your existing debt, and how reliably you've repaid past loans." |
| `procesado.tsx` | Processing | "Processing raw crops into products (flour, oil, cheese, etc.) increases their sell value by 50–200%. It takes time and requires the right building, but produces goods that are immune to crop market fluctuations." |
| `granja.tsx` / `tierras.tsx` | Seed Lab | "The Seed Lab lets you hybridize two seed batches to breed offspring with combined genes. Higher-generation seeds have better yield, drought resistance, and quality. Requires a Seed Lab building." |

### Sheet styling
- Background: `#0d1117` with `#1e2a3a` border, `border-radius: 16` top corners
- Handle bar: 4×40px rounded bar in `#333`, centered at top
- Title: `#e8d5a3`, bold, 16px
- Body: `#aaa`, 14px, line-height 22
- "Got it" button: full-width, `#1a3a5c` background, `#4fc3f7` text

---

## Files Changed

| File | Action |
|------|--------|
| `components/HelpSheet.tsx` | **Create** |
| `app/(tabs)/tierras.tsx` | **Modify** — add fertilizer + herbicide rows to profit preview; add Soil Type + Crop Rotation `?` buttons |
| `app/(tabs)/animales.tsx` | **Modify** — add Gene Grade `?` button |
| `app/(tabs)/economia.tsx` | **Modify** — add Sell Pressure + Futures `?` buttons |
| `app/(tabs)/oficina.tsx` | **Modify** — add Credit Score `?` button |
| `app/(tabs)/procesado.tsx` | **Modify** — add Processing `?` button |
| `app/(tabs)/granja.tsx` | **Modify** — add Seed Lab `?` button |

---

## Out of Scope

- Tooltip persistence / "don't show again" toggle
- Dynamic help text pulled from the Encyclopedia
- Help buttons on every label (only the 8 listed above)
