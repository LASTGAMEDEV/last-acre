# Animal Breeds System — Design Spec
**Date:** 2026-04-18  
**Status:** Approved for implementation (after pricing system)

---

## 1. Goal

Add real-world livestock breeds to all 13 animal species. Each breed sets distinct gene baseline ranges that define the animal's statistical identity — a Holstein is a high-production, low-value cow by nature; a Wagyu is a slow-growing, extreme-value cow. The existing genetics system (4 numeric genes + traits) operates on top of breed baselines. Breeds are acquired exclusively through the auction; animals can only be sold via auction or processing.

---

## 2. Guiding Principles

- **Breeds are real** — all 75 breeds are real livestock breeds with accurate purpose labels and gene ranges reflecting their real-world characteristics.
- **Genetics layered on breeds** — breed sets the starting range; individual genetics and breeding refine within that range.
- **Auction-only economy** — no animals in the shop. All buying happens at auction; all selling is either auction listing or processing/culling.
- **Cross-breeding is meaningful** — F1 hybrids get hybrid vigour (+5% genes). Purebreds command auction premiums.
- **Extensible by data** — adding a new breed requires one entry in `data/breedTypes.ts`. No engine changes.

---

## 3. Data Architecture

### New file: `data/breedTypes.ts`

```ts
export type BreedPurpose =
  | 'dairy' | 'beef' | 'dual' | 'wool' | 'fiber'
  | 'meat' | 'eggs' | 'draft' | 'honey' | 'racing'
  | 'premium' | 'lard';

export type BreedRarity = 'common' | 'uncommon' | 'rare';

export interface BreedGeneRanges {
  production: [number, number]; // [min, max] starting gene range
  hardiness:  [number, number];
  growth:     [number, number];
  value:      [number, number];
}

export interface BreedType {
  id: string;
  name: string;
  animalTypeId: string;        // links to AnimalType.id
  purpose: BreedPurpose;
  purposeLabel: string;        // e.g. "Dairy · High Volume"
  rarity: BreedRarity;
  geneRanges: BreedGeneRanges;
  description: string;         // one-line real-world fact
  originCountry: string;
  auctionBasePrice: number;    // starting bid, real-world informed (USD)
}
```

### Modified: `engine/animals.ts` — `OwnedAnimal`

Two new optional fields (backwards compatible — undefined = Mixed/unregistered):

```ts
breedId?: string;                     // undefined = "Mixed"
crossbreedParents?: [string, string]; // [motherBreedId, fatherBreedId]
```

Cross-breed display name is derived at render time from `crossbreedParents` — never stored as a string.

---

## 4. All Breeds (75 total)

Gene ranges are `[min, max]` for starting values. Scale: 0.5 = poor, 1.0 = average, 1.5 = exceptional.

### Cow (vaca) — 10 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| holstein_friesian | Holstein-Friesian | Dairy · High Volume | common | 1.3–1.5 | 0.7–1.0 | 0.8–1.1 | 0.6–0.9 | Netherlands | $2,500 |
| jersey | Jersey | Dairy · High Butterfat | common | 1.1–1.4 | 0.8–1.1 | 0.8–1.1 | 0.7–1.0 | UK | $2,000 |
| brown_swiss | Brown Swiss | Dual-Purpose | common | 1.0–1.3 | 1.0–1.3 | 0.9–1.2 | 0.9–1.2 | Switzerland | $2,200 |
| angus | Angus | Beef · Marbling | common | 0.6–0.9 | 1.1–1.4 | 1.0–1.3 | 1.2–1.5 | Scotland | $2,800 |
| hereford | Hereford | Beef · Hardy | common | 0.6–0.9 | 1.2–1.5 | 1.0–1.2 | 1.1–1.4 | UK | $2,400 |
| charolais | Charolais | Beef · Fast Growth | uncommon | 0.6–0.9 | 0.9–1.2 | 1.2–1.5 | 1.1–1.4 | France | $4,500 |
| simmental | Simmental | Dual-Purpose | uncommon | 1.0–1.3 | 1.0–1.3 | 1.0–1.3 | 1.0–1.3 | Switzerland | $4,000 |
| limousin | Limousin | Beef · Lean | uncommon | 0.5–0.8 | 1.0–1.3 | 1.1–1.4 | 1.2–1.5 | France | $5,000 |
| dexter | Dexter | Dual-Purpose · Small | uncommon | 0.9–1.2 | 1.1–1.4 | 1.0–1.2 | 0.9–1.1 | Ireland | $3,500 |
| wagyu | Wagyu | Premium Beef · Marbling | rare | 0.5–0.7 | 0.8–1.1 | 0.6–0.9 | 1.4–1.5 | Japan | $25,000 |

### Sheep (oveja) — 8 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| merino | Merino | Wool · Fine | common | 1.2–1.5 | 0.9–1.2 | 0.8–1.1 | 1.0–1.2 | Spain | $280 |
| suffolk | Suffolk | Meat | common | 0.6–0.9 | 1.0–1.3 | 1.2–1.5 | 1.1–1.4 | UK | $250 |
| dorper | Dorper | Meat · Hardy | common | 0.6–0.9 | 1.3–1.5 | 1.1–1.4 | 1.0–1.3 | South Africa | $300 |
| rambouillet | Rambouillet | Wool · Fine | common | 1.1–1.4 | 1.0–1.3 | 0.8–1.1 | 1.0–1.2 | France | $260 |
| texel | Texel | Meat · Muscular | uncommon | 0.7–1.0 | 1.0–1.3 | 1.1–1.4 | 1.2–1.5 | Netherlands | $600 |
| border_leicester | Border Leicester | Wool · Long | uncommon | 1.1–1.4 | 0.9–1.2 | 0.9–1.1 | 1.0–1.3 | UK | $550 |
| awassi | Awassi | Dairy | uncommon | 1.1–1.4 | 1.1–1.4 | 0.8–1.1 | 0.9–1.1 | Middle East | $700 |
| valais_blacknose | Valais Blacknose | Dual · Premium | rare | 0.9–1.2 | 1.1–1.4 | 0.8–1.0 | 1.3–1.5 | Switzerland | $5,000 |

### Pig (cerdo) — 7 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| large_white | Large White | General Purpose | common | 0.9–1.2 | 1.0–1.3 | 1.1–1.4 | 0.9–1.2 | UK | $300 |
| duroc | Duroc | Meat · Fast Growth | common | 0.8–1.1 | 1.0–1.3 | 1.2–1.5 | 1.0–1.3 | USA | $350 |
| hampshire | Hampshire | Meat · Lean | common | 0.7–1.0 | 1.0–1.2 | 1.1–1.3 | 1.1–1.4 | USA | $320 |
| landrace | Landrace | Bacon · Large Litters | common | 1.1–1.4 | 0.9–1.2 | 1.0–1.3 | 0.9–1.2 | Denmark | $280 |
| berkshire | Berkshire | Premium Pork | uncommon | 0.8–1.1 | 1.0–1.2 | 1.0–1.2 | 1.2–1.5 | UK | $900 |
| pietrain | Pietrain | Meat · Very Lean | uncommon | 0.6–0.9 | 0.8–1.1 | 1.1–1.3 | 1.2–1.5 | Belgium | $800 |
| mangalica | Mangalica | Lard · Premium | rare | 0.7–1.0 | 1.2–1.5 | 0.7–1.0 | 1.3–1.5 | Hungary | $3,500 |

### Chicken (gallina) — 7 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| leghorn | Leghorn | Eggs · High Volume | common | 1.3–1.5 | 0.8–1.1 | 1.0–1.2 | 0.7–0.9 | Italy | $18 |
| rhode_island_red | Rhode Island Red | Dual-Purpose | common | 1.0–1.3 | 1.1–1.4 | 1.0–1.2 | 0.9–1.2 | USA | $20 |
| plymouth_rock | Plymouth Rock | Dual-Purpose | common | 1.0–1.2 | 1.1–1.4 | 0.9–1.2 | 0.9–1.2 | USA | $20 |
| cornish_cross | Cornish Cross | Meat · Fast | common | 0.6–0.8 | 0.8–1.1 | 1.3–1.5 | 1.1–1.4 | UK/USA | $22 |
| sussex | Sussex | Dual-Purpose · Hardy | common | 0.9–1.2 | 1.1–1.4 | 0.9–1.2 | 1.0–1.2 | UK | $22 |
| orpington | Orpington | Dual · Cold Hardy | uncommon | 0.9–1.2 | 1.2–1.5 | 0.8–1.1 | 1.0–1.3 | UK | $65 |
| ayam_cemani | Ayam Cemani | Premium · Rare | rare | 0.8–1.1 | 1.0–1.3 | 0.9–1.1 | 1.3–1.5 | Indonesia | $400 |

### Goat (cabra) — 7 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| saanen | Saanen | Dairy · High Volume | common | 1.2–1.5 | 0.9–1.2 | 0.9–1.2 | 0.7–1.0 | Switzerland | $350 |
| alpine | Alpine | Dairy | common | 1.1–1.4 | 1.0–1.3 | 0.9–1.2 | 0.8–1.1 | France | $320 |
| nubian | Nubian | Dairy · Butterfat | common | 1.0–1.3 | 1.0–1.2 | 0.9–1.1 | 0.9–1.2 | UK/Africa | $300 |
| boer | Boer | Meat | common | 0.6–0.9 | 1.2–1.5 | 1.1–1.4 | 1.1–1.4 | South Africa | $380 |
| angora | Angora | Fiber · Mohair | uncommon | 1.1–1.4 | 0.9–1.2 | 0.8–1.1 | 1.1–1.4 | Turkey | $700 |
| kiko | Kiko | Meat · Hardy | uncommon | 0.7–1.0 | 1.3–1.5 | 1.0–1.3 | 1.0–1.3 | New Zealand | $650 |
| lamancha | LaMancha | Dairy · Persistent | uncommon | 1.1–1.4 | 1.0–1.3 | 0.9–1.2 | 0.9–1.1 | USA | $600 |

### Horse (caballo) — 8 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| quarter_horse | Quarter Horse | Working | common | 0.9–1.2 | 1.1–1.3 | 1.0–1.3 | 0.9–1.2 | USA | $5,000 |
| thoroughbred | Thoroughbred | Racing · Value | common | 0.7–1.0 | 0.8–1.1 | 1.2–1.5 | 1.1–1.4 | UK | $8,000 |
| clydesdale | Clydesdale | Draft | common | 1.0–1.3 | 1.2–1.5 | 0.7–1.0 | 0.9–1.2 | Scotland | $5,500 |
| shire | Shire | Draft · Heavy | common | 1.1–1.4 | 1.2–1.5 | 0.6–0.9 | 0.9–1.2 | UK | $6,000 |
| arabian | Arabian | Endurance · Value | uncommon | 0.8–1.1 | 1.0–1.3 | 1.1–1.4 | 1.2–1.5 | Arabia | $15,000 |
| friesian | Friesian | Prestige · Value | uncommon | 0.7–1.0 | 1.0–1.2 | 0.9–1.2 | 1.2–1.5 | Netherlands | $18,000 |
| andalusian | Andalusian | Premium · Prestige | rare | 0.7–1.0 | 1.0–1.3 | 1.0–1.2 | 1.3–1.5 | Spain | $45,000 |
| lipizzaner | Lipizzaner | Rare · Prestige | rare | 0.6–0.9 | 1.1–1.4 | 0.9–1.1 | 1.4–1.5 | Austria | $80,000 |

### Duck (pato) — 5 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| pekin | Pekin | Meat & Eggs | common | 1.0–1.3 | 1.0–1.3 | 1.1–1.4 | 0.9–1.2 | China | $28 |
| khaki_campbell | Khaki Campbell | Eggs · High Volume | common | 1.3–1.5 | 0.9–1.2 | 0.9–1.1 | 0.8–1.0 | UK | $25 |
| muscovy | Muscovy | Meat · Lean | common | 0.7–1.0 | 1.1–1.4 | 1.0–1.2 | 1.0–1.3 | South America | $30 |
| rouen | Rouen | Meat · Quality | uncommon | 0.7–1.0 | 1.0–1.3 | 0.9–1.2 | 1.1–1.4 | France | $80 |
| indian_runner | Indian Runner | Eggs · Prolific | uncommon | 1.2–1.5 | 0.9–1.2 | 0.9–1.1 | 0.8–1.0 | Indonesia | $70 |

### Bee (abeja) — 4 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| italian | Italian | Honey · High Volume | common | 1.2–1.5 | 0.9–1.2 | 1.0–1.2 | 0.9–1.1 | Italy | $280 |
| carniolan | Carniolan | Honey · Cold Hardy | common | 1.0–1.3 | 1.2–1.5 | 1.0–1.2 | 0.9–1.1 | Slovenia | $300 |
| buckfast | Buckfast | Disease Resistant | uncommon | 1.1–1.4 | 1.2–1.5 | 1.0–1.2 | 1.0–1.2 | UK | $600 |
| russian | Russian | Varroa Resistant | rare | 1.0–1.3 | 1.3–1.5 | 0.9–1.2 | 1.1–1.3 | Russia | $1,500 |

### Rabbit (conejo) — 5 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| new_zealand_white | New Zealand White | Meat | common | 0.8–1.1 | 1.0–1.3 | 1.2–1.5 | 0.9–1.2 | USA | $40 |
| rex | Rex | Meat & Fur | common | 0.8–1.1 | 1.0–1.2 | 1.0–1.3 | 1.1–1.4 | France | $55 |
| californian | Californian | Meat | common | 0.8–1.1 | 1.0–1.3 | 1.1–1.4 | 1.0–1.2 | USA | $45 |
| flemish_giant | Flemish Giant | Meat · Large | uncommon | 0.9–1.2 | 1.0–1.2 | 0.8–1.1 | 1.1–1.4 | Belgium | $120 |
| angora | Angora Rabbit | Wool | uncommon | 1.1–1.4 | 0.9–1.2 | 0.8–1.1 | 1.0–1.3 | Turkey | $150 |

### Alpaca (alpaca) — 2 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| huacaya | Huacaya | Fiber · Fluffy | common | 1.1–1.4 | 1.0–1.3 | 0.9–1.2 | 1.0–1.2 | Peru | $1,200 |
| suri | Suri | Fiber · Fine Silky | uncommon | 1.2–1.5 | 0.9–1.2 | 0.8–1.1 | 1.1–1.4 | Peru | $3,000 |

### Turkey (pavo) — 4 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| broad_breasted_white | Broad Breasted White | Meat · Commercial | common | 0.7–1.0 | 0.9–1.2 | 1.3–1.5 | 1.0–1.3 | USA | $55 |
| bronze | Bronze | Heritage Meat | common | 0.7–1.0 | 1.1–1.4 | 1.0–1.2 | 1.0–1.3 | USA | $60 |
| narragansett | Narragansett | Heritage | uncommon | 0.8–1.1 | 1.1–1.4 | 0.9–1.2 | 1.0–1.3 | USA | $150 |
| bourbon_red | Bourbon Red | Heritage · Premium | rare | 0.8–1.1 | 1.1–1.4 | 0.9–1.1 | 1.2–1.5 | USA | $500 |

### Quail (codorniz) — 3 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| coturnix | Coturnix (Japanese) | Eggs & Meat | common | 1.2–1.5 | 1.0–1.3 | 1.1–1.4 | 0.9–1.1 | Japan | $10 |
| bobwhite | Bobwhite | Meat | common | 0.8–1.1 | 1.1–1.4 | 1.0–1.3 | 1.0–1.3 | USA | $12 |
| california_quail | California Quail | Ornamental & Meat | uncommon | 0.8–1.1 | 1.0–1.3 | 0.9–1.2 | 1.1–1.4 | USA | $35 |

### Buffalo (bufalo) — 5 breeds
| id | name | purpose | rarity | prod | hardiness | growth | value | origin | basePrice |
|----|------|---------|--------|------|-----------|--------|-------|--------|-----------|
| murrah | Murrah | Dairy · High Volume | common | 1.2–1.5 | 1.0–1.3 | 0.9–1.2 | 0.8–1.1 | India | $3,500 |
| nili_ravi | Nili-Ravi | Dairy | common | 1.1–1.4 | 1.1–1.4 | 0.9–1.2 | 0.8–1.1 | Pakistan | $3,200 |
| riverine | Riverine | Dairy | common | 1.0–1.3 | 1.0–1.3 | 0.9–1.2 | 0.9–1.2 | South Asia | $3,000 |
| mediterranean_buffalo | Mediterranean | Dairy · Mozzarella | uncommon | 1.1–1.4 | 1.0–1.2 | 0.9–1.1 | 1.1–1.4 | Italy | $7,000 |
| swamp_buffalo | Swamp Buffalo | Meat & Draft | uncommon | 0.7–1.0 | 1.2–1.5 | 1.0–1.3 | 1.0–1.3 | SE Asia | $4,500 |

---

## 5. Auction-Only Animal Economy

### Buying

All animal acquisition happens exclusively through the `subasta` (auction). The `tienda` (shop) no longer sells any animals.

**Breed availability by rarity** (auction runs daily):
| Rarity | Appears every | Lots per day |
|--------|--------------|-------------|
| Common | Every day | 3–5 lots (random species selection) |
| Uncommon | Every 7–14 days per breed | 1–2 lots |
| Rare | Every 30–90 days per breed (random roll) | 1 lot max |

Each lot displays: species, breed name, purpose label, sex, age, all four gene values, and a starting bid price of `auctionBasePrice × geneScore`.

### Selling

Two options only:

**1. Send to processing** — immediate cull. Produces meat/byproducts at current market price. Available from the animal management screen at any time.

**2. List at auction** — player sets a reserve price. Animal appears in next auction cycle. NPC bidders value the animal based on gene score + breed rarity. If reserve not met, animal returns unsold.

**Purebred auction premium:**
| Breed status | Auction multiplier |
|-------------|-------------------|
| Mixed | 1.0× (baseline) |
| F1 Cross (two named breeds) | 1.3× |
| Backcross | 1.1× |
| Purebred Common | 1.2× |
| Purebred Uncommon | 1.5× |
| Purebred Rare | 2.5–3.0× |

---

## 6. Cross-Breeding Mechanics

### Breed Identity Rules

| Pairing | Offspring identity |
|---------|--------------------|
| Breed A × Breed A | Purebred A (`breedId = A`) |
| Breed A × Breed B | F1 Cross (`crossbreedParents: [A, B]`) |
| F1 Cross × Purebred C | Backcross (`crossbreedParents: [F1, C]`) |
| F1 Cross × F1 Cross | Mixed (no `breedId`, no `crossbreedParents`) |
| Mixed × anything | Mixed |

### Hybrid Vigour (Heterosis)

F1 crosses get a **+5% bonus** on all four gene values above the averaged parent gene ranges. Real phenomenon in livestock breeding — incentivises deliberate crossbreeding.

```ts
// randomInRange: min + Math.random() * (max - min), clamped 0.5–1.5
function crossbreedGenes(motherBreed: BreedType, fatherBreed: BreedType): AnimalGenes {
  const hybridVigorBonus = 1.05;
  const avg = (a: [number, number], b: [number, number]) =>
    clamp(randomInRange((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) * hybridVigorBonus, 0.5, 1.5);
  return {
    production: avg(motherBreed.geneRanges.production, fatherBreed.geneRanges.production),
    hardiness:  avg(motherBreed.geneRanges.hardiness,  fatherBreed.geneRanges.hardiness),
    growth:     avg(motherBreed.geneRanges.growth,     fatherBreed.geneRanges.growth),
    value:      avg(motherBreed.geneRanges.value,      fatherBreed.geneRanges.value),
  };
}
```

### Display Names (derived at render time)

| Scenario | Display |
|----------|---------|
| Purebred | `Holstein-Friesian` |
| F1 Cross | `Holstein × Angus` |
| Backcross | `(Holstein × Angus) × Hereford` |
| Mixed | `Mixed` |

---

## 7. File Change Summary

| File | Type | What changes |
|------|------|-------------|
| `data/breedTypes.ts` | **NEW** | All 75 breeds with gene ranges, rarity, auction prices |
| `engine/animals.ts` | modify | `OwnedAnimal` gets `breedId?` and `crossbreedParents?`; `crossbreedGenes()` function added; `breedGenes()` updated — if both parents share same `breedId`, sample from that breed's `geneRanges`; if breeds differ, call `crossbreedGenes()` with hybrid vigour; if either parent is Mixed, use existing random walk |
| `store/useGameStore.ts` | modify | Auction lot generation uses breed rarity cycles; `breedAnimal()` sets offspring breedId; purebred premium applied in sell/auction valuation; remove animals from shop |
| `app/(tabs)/tienda.tsx` | modify | Remove animal purchase section |
| `app/(tabs)/subasta.tsx` | modify | Lots show breed name, purpose label, origin; rarity cycle scheduling |
| `app/(tabs)/animales.tsx` | modify | Show breed name + purpose on each animal card; cull/process action added |

---

## 8. Backwards Compatibility

- `breedId` and `crossbreedParents` are optional on `OwnedAnimal`. Existing saves load fine — animals without a `breedId` display as "Mixed" and behave as before.
- Storage key bump not required (additive fields only).

---

## 9. Out of Scope

- Horse functional role on farm — separate feature
- Breed registry / stud book UI — separate feature
- Breed-specific diseases or health events — separate feature
- Breed unlock progression gating — all breeds available from day 1 via auction rarity system
