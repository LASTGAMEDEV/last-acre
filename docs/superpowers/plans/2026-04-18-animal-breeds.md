# Animal Breeds System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 75 real-world breeds across all 13 animal species, wire them into the genetics system with hybrid vigour for F1 crosses, migrate animal acquisition to auction-only, and add a cull-for-processing action.

**Architecture:** A new `data/breedTypes.ts` file defines all breeds. `engine/animals.ts` gets breed-aware gene functions. The store's `breedAnimal()` sets offspring breed identity; NPC auction lots include a random breed. The buy buttons in `animales.tsx` are removed; a cull action is added instead.

**Tech Stack:** React Native 0.81.5 · Expo 54 · TypeScript 5.9.2 · Zustand 5

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `data/breedTypes.ts` | **CREATE** | All 75 breed definitions with gene ranges, rarity, purpose, auction price |
| `engine/animals.ts` | **MODIFY** | Add `breedId?`/`crossbreedParents?` to `OwnedAnimal`; add `randomGenesForBreed`, `crossbreedGenes`, `breedAnimalGenes`, `getBreedDisplayName`, `getBreedPurebredMultiplier` |
| `store/useGameStore.ts` | **MODIFY** | Add `animalBreedId?` to `AuctionListing`; update NPC lot generation; update `breedAnimal()`; add `cullAnimal()` |
| `app/(tabs)/animales.tsx` | **MODIFY** | Remove buy buttons; add breed badge on animal cards; add cull button |
| `app/(tabs)/subasta.tsx` | **MODIFY** | Show breed name, purpose, rarity badge on animal listings |

---

## Task 1: Create `data/breedTypes.ts`

**Files:**
- Create: `granja-tycoon/data/breedTypes.ts`

- [ ] **Step 1: Create the file**

```typescript
export type BreedPurpose =
  | 'dairy' | 'beef' | 'dual' | 'wool' | 'fiber'
  | 'meat' | 'eggs' | 'draft' | 'honey' | 'racing'
  | 'premium' | 'lard';

export type BreedRarity = 'common' | 'uncommon' | 'rare';

export interface BreedGeneRanges {
  production: [number, number];
  hardiness:  [number, number];
  growth:     [number, number];
  value:      [number, number];
}

export interface BreedType {
  id: string;
  name: string;
  animalTypeId: string;
  purpose: BreedPurpose;
  purposeLabel: string;
  rarity: BreedRarity;
  geneRanges: BreedGeneRanges;
  description: string;
  originCountry: string;
  auctionBasePrice: number;
}

export const BREED_TYPES: BreedType[] = [
  // ── Cow (vaca) ────────────────────────────────────────────────────────────
  { id: 'holstein_friesian', name: 'Holstein-Friesian', animalTypeId: 'vaca', purpose: 'dairy', purposeLabel: 'Dairy · High Volume',       rarity: 'common',   geneRanges: { production: [1.3,1.5], hardiness: [0.7,1.0], growth: [0.8,1.1], value: [0.6,0.9] }, description: 'World\'s highest-volume dairy breed.',          originCountry: 'Netherlands', auctionBasePrice: 2500  },
  { id: 'jersey',            name: 'Jersey',            animalTypeId: 'vaca', purpose: 'dairy', purposeLabel: 'Dairy · High Butterfat',     rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [0.8,1.1], growth: [0.8,1.1], value: [0.7,1.0] }, description: 'Milk has 18% more protein than average.',        originCountry: 'UK',          auctionBasePrice: 2000  },
  { id: 'brown_swiss',       name: 'Brown Swiss',       animalTypeId: 'vaca', purpose: 'dual',  purposeLabel: 'Dual-Purpose',               rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [0.9,1.2] }, description: 'One of the oldest dairy breeds in existence.',   originCountry: 'Switzerland', auctionBasePrice: 2200  },
  { id: 'angus',             name: 'Angus',             animalTypeId: 'vaca', purpose: 'beef',  purposeLabel: 'Beef · Marbling',            rarity: 'common',   geneRanges: { production: [0.6,0.9], hardiness: [1.1,1.4], growth: [1.0,1.3], value: [1.2,1.5] }, description: 'Naturally polled; dominates premium beef markets.', originCountry: 'Scotland',   auctionBasePrice: 2800  },
  { id: 'hereford',          name: 'Hereford',          animalTypeId: 'vaca', purpose: 'beef',  purposeLabel: 'Beef · Hardy',               rarity: 'common',   geneRanges: { production: [0.6,0.9], hardiness: [1.2,1.5], growth: [1.0,1.2], value: [1.1,1.4] }, description: 'Exceptionally hardy; thrives in harsh climates.', originCountry: 'UK',         auctionBasePrice: 2400  },
  { id: 'charolais',         name: 'Charolais',         animalTypeId: 'vaca', purpose: 'beef',  purposeLabel: 'Beef · Fast Growth',         rarity: 'uncommon', geneRanges: { production: [0.6,0.9], hardiness: [0.9,1.2], growth: [1.2,1.5], value: [1.1,1.4] }, description: 'Fastest-growing European beef breed.',           originCountry: 'France',      auctionBasePrice: 4500  },
  { id: 'simmental',         name: 'Simmental',         animalTypeId: 'vaca', purpose: 'dual',  purposeLabel: 'Dual-Purpose',               rarity: 'uncommon', geneRanges: { production: [1.0,1.3], hardiness: [1.0,1.3], growth: [1.0,1.3], value: [1.0,1.3] }, description: 'Most widely distributed cattle breed on Earth.', originCountry: 'Switzerland', auctionBasePrice: 4000  },
  { id: 'limousin',          name: 'Limousin',          animalTypeId: 'vaca', purpose: 'beef',  purposeLabel: 'Beef · Lean',                rarity: 'uncommon', geneRanges: { production: [0.5,0.8], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [1.2,1.5] }, description: 'Leanest beef breed; favoured for butcher\'s cuts.', originCountry: 'France',   auctionBasePrice: 5000  },
  { id: 'dexter',            name: 'Dexter',            animalTypeId: 'vaca', purpose: 'dual',  purposeLabel: 'Dual-Purpose · Small',       rarity: 'uncommon', geneRanges: { production: [0.9,1.2], hardiness: [1.1,1.4], growth: [1.0,1.2], value: [0.9,1.1] }, description: 'Smallest European cattle breed; ideal for small farms.', originCountry: 'Ireland', auctionBasePrice: 3500  },
  { id: 'wagyu',             name: 'Wagyu',             animalTypeId: 'vaca', purpose: 'premium', purposeLabel: 'Premium Beef · Marbling',  rarity: 'rare',     geneRanges: { production: [0.5,0.7], hardiness: [0.8,1.1], growth: [0.6,0.9], value: [1.4,1.5] }, description: 'Intramuscular fat so dense the meat melts at body temperature.', originCountry: 'Japan', auctionBasePrice: 25000 },

  // ── Sheep (oveja) ─────────────────────────────────────────────────────────
  { id: 'merino',            name: 'Merino',            animalTypeId: 'oveja', purpose: 'wool', purposeLabel: 'Wool · Fine',               rarity: 'common',   geneRanges: { production: [1.2,1.5], hardiness: [0.9,1.2], growth: [0.8,1.1], value: [1.0,1.2] }, description: 'Produces the finest and most valuable wool in the world.',  originCountry: 'Spain',        auctionBasePrice: 280  },
  { id: 'suffolk',           name: 'Suffolk',           animalTypeId: 'oveja', purpose: 'meat', purposeLabel: 'Meat',                      rarity: 'common',   geneRanges: { production: [0.6,0.9], hardiness: [1.0,1.3], growth: [1.2,1.5], value: [1.1,1.4] }, description: 'Most popular terminal sire breed in the UK.',              originCountry: 'UK',           auctionBasePrice: 250  },
  { id: 'dorper',            name: 'Dorper',            animalTypeId: 'oveja', purpose: 'meat', purposeLabel: 'Meat · Hardy',              rarity: 'common',   geneRanges: { production: [0.6,0.9], hardiness: [1.3,1.5], growth: [1.1,1.4], value: [1.0,1.3] }, description: 'Sheds its fleece naturally; bred for harsh African conditions.', originCountry: 'South Africa', auctionBasePrice: 300  },
  { id: 'rambouillet',       name: 'Rambouillet',       animalTypeId: 'oveja', purpose: 'wool', purposeLabel: 'Wool · Fine',               rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [1.0,1.3], growth: [0.8,1.1], value: [1.0,1.2] }, description: 'French Merino derivative; backbone of US fine-wool industry.', originCountry: 'France',      auctionBasePrice: 260  },
  { id: 'texel',             name: 'Texel',             animalTypeId: 'oveja', purpose: 'meat', purposeLabel: 'Meat · Muscular',           rarity: 'uncommon', geneRanges: { production: [0.7,1.0], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [1.2,1.5] }, description: 'Exceptional muscle development; top prices at European auctions.', originCountry: 'Netherlands', auctionBasePrice: 600  },
  { id: 'border_leicester',  name: 'Border Leicester',  animalTypeId: 'oveja', purpose: 'wool', purposeLabel: 'Wool · Long',               rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [0.9,1.2], growth: [0.9,1.1], value: [1.0,1.3] }, description: 'Produces lustrous longwool highly valued for hand spinning.', originCountry: 'UK',          auctionBasePrice: 550  },
  { id: 'awassi',            name: 'Awassi',            animalTypeId: 'oveja', purpose: 'dairy', purposeLabel: 'Dairy',                    rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [1.1,1.4], growth: [0.8,1.1], value: [0.9,1.1] }, description: 'Most productive dairy sheep in the Middle East.',           originCountry: 'Middle East',  auctionBasePrice: 700  },
  { id: 'valais_blacknose',  name: 'Valais Blacknose',  animalTypeId: 'oveja', purpose: 'premium', purposeLabel: 'Dual · Premium',         rarity: 'rare',     geneRanges: { production: [0.9,1.2], hardiness: [1.1,1.4], growth: [0.8,1.0], value: [1.3,1.5] }, description: 'Voted world\'s cutest sheep; commands extraordinary prices.', originCountry: 'Switzerland', auctionBasePrice: 5000 },

  // ── Pig (cerdo) ───────────────────────────────────────────────────────────
  { id: 'large_white',       name: 'Large White',       animalTypeId: 'cerdo', purpose: 'meat', purposeLabel: 'General Purpose',          rarity: 'common',   geneRanges: { production: [0.9,1.2], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [0.9,1.2] }, description: 'Most recorded breed in the world; cornerstone of commercial pork.', originCountry: 'UK',    auctionBasePrice: 300  },
  { id: 'duroc',             name: 'Duroc',             animalTypeId: 'cerdo', purpose: 'meat', purposeLabel: 'Meat · Fast Growth',       rarity: 'common',   geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.3], growth: [1.2,1.5], value: [1.0,1.3] }, description: 'Fastest daily weight gain of any major pig breed.',        originCountry: 'USA',          auctionBasePrice: 350  },
  { id: 'hampshire',         name: 'Hampshire',         animalTypeId: 'cerdo', purpose: 'meat', purposeLabel: 'Meat · Lean',              rarity: 'common',   geneRanges: { production: [0.7,1.0], hardiness: [1.0,1.2], growth: [1.1,1.3], value: [1.1,1.4] }, description: 'Highest lean-to-fat ratio of US commercial breeds.',      originCountry: 'USA',          auctionBasePrice: 320  },
  { id: 'landrace',          name: 'Landrace',          animalTypeId: 'cerdo', purpose: 'meat', purposeLabel: 'Bacon · Large Litters',    rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [0.9,1.2], growth: [1.0,1.3], value: [0.9,1.2] }, description: 'Largest litter size of any pig breed; ideal for multiplication.', originCountry: 'Denmark', auctionBasePrice: 280  },
  { id: 'berkshire',         name: 'Berkshire',         animalTypeId: 'cerdo', purpose: 'premium', purposeLabel: 'Premium Pork',         rarity: 'uncommon', geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.2], growth: [1.0,1.2], value: [1.2,1.5] }, description: 'Pink-tinged pork commands 2× premium in Japanese market.', originCountry: 'UK',          auctionBasePrice: 900  },
  { id: 'pietrain',          name: 'Pietrain',          animalTypeId: 'cerdo', purpose: 'meat', purposeLabel: 'Meat · Very Lean',         rarity: 'uncommon', geneRanges: { production: [0.6,0.9], hardiness: [0.8,1.1], growth: [1.1,1.3], value: [1.2,1.5] }, description: 'Extreme muscling; highest lean yield of any European breed.', originCountry: 'Belgium',   auctionBasePrice: 800  },
  { id: 'mangalica',         name: 'Mangalica',         animalTypeId: 'cerdo', purpose: 'lard',  purposeLabel: 'Lard · Premium',         rarity: 'rare',     geneRanges: { production: [0.7,1.0], hardiness: [1.2,1.5], growth: [0.7,1.0], value: [1.3,1.5] }, description: 'Woolly pig producing lard comparable to Iberian acorn-fed pork.', originCountry: 'Hungary', auctionBasePrice: 3500 },

  // ── Chicken (gallina) ─────────────────────────────────────────────────────
  { id: 'leghorn',           name: 'Leghorn',           animalTypeId: 'gallina', purpose: 'eggs', purposeLabel: 'Eggs · High Volume',    rarity: 'common',   geneRanges: { production: [1.3,1.5], hardiness: [0.8,1.1], growth: [1.0,1.2], value: [0.7,0.9] }, description: 'Lays 280–320 white eggs per year; the commercial standard.', originCountry: 'Italy',   auctionBasePrice: 18   },
  { id: 'rhode_island_red',  name: 'Rhode Island Red',  animalTypeId: 'gallina', purpose: 'dual', purposeLabel: 'Dual-Purpose',          rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.1,1.4], growth: [1.0,1.2], value: [0.9,1.2] }, description: 'America\'s most successful dual-purpose breed.',           originCountry: 'USA',     auctionBasePrice: 20   },
  { id: 'plymouth_rock',     name: 'Plymouth Rock',     animalTypeId: 'gallina', purpose: 'dual', purposeLabel: 'Dual-Purpose',          rarity: 'common',   geneRanges: { production: [1.0,1.2], hardiness: [1.1,1.4], growth: [0.9,1.2], value: [0.9,1.2] }, description: 'Docile temperament; first American breed to achieve widespread use.', originCountry: 'USA', auctionBasePrice: 20  },
  { id: 'cornish_cross',     name: 'Cornish Cross',     animalTypeId: 'gallina', purpose: 'meat', purposeLabel: 'Meat · Fast',           rarity: 'common',   geneRanges: { production: [0.6,0.8], hardiness: [0.8,1.1], growth: [1.3,1.5], value: [1.1,1.4] }, description: 'Reaches market weight in 6 weeks; dominates global meat chicken.', originCountry: 'UK/USA', auctionBasePrice: 22  },
  { id: 'sussex',            name: 'Sussex',            animalTypeId: 'gallina', purpose: 'dual', purposeLabel: 'Dual-Purpose · Hardy',  rarity: 'common',   geneRanges: { production: [0.9,1.2], hardiness: [1.1,1.4], growth: [0.9,1.2], value: [1.0,1.2] }, description: 'Lays throughout winter when most breeds stop.',            originCountry: 'UK',      auctionBasePrice: 22   },
  { id: 'orpington',         name: 'Orpington',         animalTypeId: 'gallina', purpose: 'dual', purposeLabel: 'Dual · Cold Hardy',     rarity: 'uncommon', geneRanges: { production: [0.9,1.2], hardiness: [1.2,1.5], growth: [0.8,1.1], value: [1.0,1.3] }, description: 'Tolerates cold better than any other heavy breed.',        originCountry: 'UK',      auctionBasePrice: 65   },
  { id: 'ayam_cemani',       name: 'Ayam Cemani',       animalTypeId: 'gallina', purpose: 'premium', purposeLabel: 'Premium · Rare',    rarity: 'rare',     geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.3], growth: [0.9,1.1], value: [1.3,1.5] }, description: 'Entirely black including bones and organs; mystical status.', originCountry: 'Indonesia', auctionBasePrice: 400 },

  // ── Goat (cabra) ──────────────────────────────────────────────────────────
  { id: 'saanen',            name: 'Saanen',            animalTypeId: 'cabra', purpose: 'dairy', purposeLabel: 'Dairy · High Volume',     rarity: 'common',   geneRanges: { production: [1.2,1.5], hardiness: [0.9,1.2], growth: [0.9,1.2], value: [0.7,1.0] }, description: 'Highest milk yield of any goat breed; world\'s dairy goat standard.', originCountry: 'Switzerland', auctionBasePrice: 350 },
  { id: 'alpine',            name: 'Alpine',            animalTypeId: 'cabra', purpose: 'dairy', purposeLabel: 'Dairy',                   rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [0.8,1.1] }, description: 'Adaptable to any climate; second-highest dairy production.',  originCountry: 'France',      auctionBasePrice: 320 },
  { id: 'nubian',            name: 'Nubian',            animalTypeId: 'cabra', purpose: 'dairy', purposeLabel: 'Dairy · Butterfat',       rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.0,1.2], growth: [0.9,1.1], value: [0.9,1.2] }, description: 'Highest butterfat content (5%) of any dairy goat breed.',  originCountry: 'UK/Africa',   auctionBasePrice: 300 },
  { id: 'boer',              name: 'Boer',              animalTypeId: 'cabra', purpose: 'meat',  purposeLabel: 'Meat',                    rarity: 'common',   geneRanges: { production: [0.6,0.9], hardiness: [1.2,1.5], growth: [1.1,1.4], value: [1.1,1.4] }, description: 'Fastest-growing meat goat; developed for semi-arid conditions.', originCountry: 'South Africa', auctionBasePrice: 380 },
  { id: 'angora',            name: 'Angora',            animalTypeId: 'cabra', purpose: 'fiber', purposeLabel: 'Fiber · Mohair',          rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [0.9,1.2], growth: [0.8,1.1], value: [1.1,1.4] }, description: 'Produces mohair — the \'diamond fibre\' of the textile world.', originCountry: 'Turkey',     auctionBasePrice: 700 },
  { id: 'kiko',              name: 'Kiko',              animalTypeId: 'cabra', purpose: 'meat',  purposeLabel: 'Meat · Hardy',            rarity: 'uncommon', geneRanges: { production: [0.7,1.0], hardiness: [1.3,1.5], growth: [1.0,1.3], value: [1.0,1.3] }, description: 'Bred for parasite resistance; requires minimal veterinary intervention.', originCountry: 'New Zealand', auctionBasePrice: 650 },
  { id: 'lamancha',          name: 'LaMancha',          animalTypeId: 'cabra', purpose: 'dairy', purposeLabel: 'Dairy · Persistent',      rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [0.9,1.1] }, description: 'Distinctive tiny ears; milks longer into dry period than any other breed.', originCountry: 'USA', auctionBasePrice: 600 },

  // ── Horse (caballo) ───────────────────────────────────────────────────────
  { id: 'quarter_horse',     name: 'Quarter Horse',     animalTypeId: 'caballo', purpose: 'dual',   purposeLabel: 'Working',            rarity: 'common',   geneRanges: { production: [0.9,1.2], hardiness: [1.1,1.3], growth: [1.0,1.3], value: [0.9,1.2] }, description: 'Most popular horse breed in the world; fastest over a quarter-mile.', originCountry: 'USA',      auctionBasePrice: 5000  },
  { id: 'thoroughbred',      name: 'Thoroughbred',      animalTypeId: 'caballo', purpose: 'racing', purposeLabel: 'Racing · Value',     rarity: 'common',   geneRanges: { production: [0.7,1.0], hardiness: [0.8,1.1], growth: [1.2,1.5], value: [1.1,1.4] }, description: 'Every modern racehorse traces to three Arabian stallions.',    originCountry: 'UK',       auctionBasePrice: 8000  },
  { id: 'clydesdale',        name: 'Clydesdale',        animalTypeId: 'caballo', purpose: 'draft',  purposeLabel: 'Draft',              rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.2,1.5], growth: [0.7,1.0], value: [0.9,1.2] }, description: 'Can pull 8,000 lbs; used by Budweiser as their trademark horse.',  originCountry: 'Scotland', auctionBasePrice: 5500  },
  { id: 'shire',             name: 'Shire',             animalTypeId: 'caballo', purpose: 'draft',  purposeLabel: 'Draft · Heavy',      rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [1.2,1.5], growth: [0.6,0.9], value: [0.9,1.2] }, description: 'Tallest horse breed; world record holder for heaviest horse.',    originCountry: 'UK',       auctionBasePrice: 6000  },
  { id: 'arabian',           name: 'Arabian',           animalTypeId: 'caballo', purpose: 'racing', purposeLabel: 'Endurance · Value',  rarity: 'uncommon', geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [1.2,1.5] }, description: 'Oldest breed; unique lung capacity enables unmatched endurance.', originCountry: 'Arabia',   auctionBasePrice: 15000 },
  { id: 'friesian',          name: 'Friesian',          animalTypeId: 'caballo', purpose: 'premium', purposeLabel: 'Prestige · Value',  rarity: 'uncommon', geneRanges: { production: [0.7,1.0], hardiness: [1.0,1.2], growth: [0.9,1.2], value: [1.2,1.5] }, description: 'All-black coat; one of the world\'s most photogenic horses.',  originCountry: 'Netherlands', auctionBasePrice: 18000 },
  { id: 'andalusian',        name: 'Andalusian',        animalTypeId: 'caballo', purpose: 'premium', purposeLabel: 'Premium · Prestige', rarity: 'rare',    geneRanges: { production: [0.7,1.0], hardiness: [1.0,1.3], growth: [1.0,1.2], value: [1.3,1.5] }, description: 'Bred for the Spanish cavalry for 500 years; UNESCO heritage animal.', originCountry: 'Spain',  auctionBasePrice: 45000 },
  { id: 'lipizzaner',        name: 'Lipizzaner',        animalTypeId: 'caballo', purpose: 'premium', purposeLabel: 'Rare · Prestige',    rarity: 'rare',    geneRanges: { production: [0.6,0.9], hardiness: [1.1,1.4], growth: [0.9,1.1], value: [1.4,1.5] }, description: 'Born dark, turns white with age; performs at the Spanish Riding School.', originCountry: 'Austria', auctionBasePrice: 80000 },

  // ── Duck (pato) ───────────────────────────────────────────────────────────
  { id: 'pekin_duck',        name: 'Pekin',             animalTypeId: 'pato', purpose: 'dual',  purposeLabel: 'Meat & Eggs',             rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [0.9,1.2] }, description: 'Accounts for over 90% of commercial duck meat globally.',    originCountry: 'China',     auctionBasePrice: 28  },
  { id: 'khaki_campbell',    name: 'Khaki Campbell',    animalTypeId: 'pato', purpose: 'eggs',  purposeLabel: 'Eggs · High Volume',      rarity: 'common',   geneRanges: { production: [1.3,1.5], hardiness: [0.9,1.2], growth: [0.9,1.1], value: [0.8,1.0] }, description: 'Lays up to 340 eggs per year — more than most chickens.',   originCountry: 'UK',        auctionBasePrice: 25  },
  { id: 'muscovy',           name: 'Muscovy',           animalTypeId: 'pato', purpose: 'meat',  purposeLabel: 'Meat · Lean',             rarity: 'common',   geneRanges: { production: [0.7,1.0], hardiness: [1.1,1.4], growth: [1.0,1.2], value: [1.0,1.3] }, description: 'Not a true duck; leanest poultry — 98% fat-free breast meat.', originCountry: 'South America', auctionBasePrice: 30 },
  { id: 'rouen',             name: 'Rouen',             animalTypeId: 'pato', purpose: 'meat',  purposeLabel: 'Meat · Quality',          rarity: 'uncommon', geneRanges: { production: [0.7,1.0], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [1.1,1.4] }, description: 'French heritage duck prized for flavourful, dark meat.',    originCountry: 'France',    auctionBasePrice: 80  },
  { id: 'indian_runner',     name: 'Indian Runner',     animalTypeId: 'pato', purpose: 'eggs',  purposeLabel: 'Eggs · Prolific',         rarity: 'uncommon', geneRanges: { production: [1.2,1.5], hardiness: [0.9,1.2], growth: [0.9,1.1], value: [0.8,1.0] }, description: 'Runs upright like a penguin; 300+ eggs/year without quacking.', originCountry: 'Indonesia', auctionBasePrice: 70 },

  // ── Bee (abeja) ───────────────────────────────────────────────────────────
  { id: 'italian_bee',       name: 'Italian',           animalTypeId: 'abeja', purpose: 'honey', purposeLabel: 'Honey · High Volume',   rarity: 'common',   geneRanges: { production: [1.2,1.5], hardiness: [0.9,1.2], growth: [1.0,1.2], value: [0.9,1.1] }, description: 'World\'s most popular bee; gentle temperament and high honey yield.', originCountry: 'Italy',   auctionBasePrice: 280  },
  { id: 'carniolan_bee',     name: 'Carniolan',         animalTypeId: 'abeja', purpose: 'honey', purposeLabel: 'Honey · Cold Hardy',    rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.2,1.5], growth: [1.0,1.2], value: [0.9,1.1] }, description: 'Overwinters on minimal stores; ideal for cold climates.',    originCountry: 'Slovenia', auctionBasePrice: 300  },
  { id: 'buckfast_bee',      name: 'Buckfast',          animalTypeId: 'abeja', purpose: 'honey', purposeLabel: 'Disease Resistant',     rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [1.2,1.5], growth: [1.0,1.2], value: [1.0,1.2] }, description: 'Bred by Brother Adam at Buckfast Abbey; exceptional disease resistance.', originCountry: 'UK', auctionBasePrice: 600  },
  { id: 'russian_bee',       name: 'Russian',           animalTypeId: 'abeja', purpose: 'honey', purposeLabel: 'Varroa Resistant',      rarity: 'rare',     geneRanges: { production: [1.0,1.3], hardiness: [1.3,1.5], growth: [0.9,1.2], value: [1.1,1.3] }, description: 'Evolved alongside Varroa mite; genetically resistant without treatment.', originCountry: 'Russia', auctionBasePrice: 1500 },

  // ── Rabbit (conejo) ───────────────────────────────────────────────────────
  { id: 'new_zealand_white', name: 'New Zealand White', animalTypeId: 'conejo', purpose: 'meat', purposeLabel: 'Meat',                 rarity: 'common',   geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.3], growth: [1.2,1.5], value: [0.9,1.2] }, description: 'Standard for commercial rabbit meat production worldwide.',   originCountry: 'USA',    auctionBasePrice: 40   },
  { id: 'rex_rabbit',        name: 'Rex',               animalTypeId: 'conejo', purpose: 'meat', purposeLabel: 'Meat & Fur',           rarity: 'common',   geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.2], growth: [1.0,1.3], value: [1.1,1.4] }, description: 'Plush velvet fur is a major product alongside meat.',        originCountry: 'France', auctionBasePrice: 55   },
  { id: 'californian',       name: 'Californian',       animalTypeId: 'conejo', purpose: 'meat', purposeLabel: 'Meat',                 rarity: 'common',   geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [1.0,1.2] }, description: 'Second most popular commercial meat rabbit globally.',       originCountry: 'USA',    auctionBasePrice: 45   },
  { id: 'flemish_giant',     name: 'Flemish Giant',     animalTypeId: 'conejo', purpose: 'meat', purposeLabel: 'Meat · Large',         rarity: 'uncommon', geneRanges: { production: [0.9,1.2], hardiness: [1.0,1.2], growth: [0.8,1.1], value: [1.1,1.4] }, description: 'Largest rabbit breed; adults reach 10 kg.',                 originCountry: 'Belgium', auctionBasePrice: 120  },
  { id: 'angora_rabbit',     name: 'Angora',            animalTypeId: 'conejo', purpose: 'wool', purposeLabel: 'Wool',                 rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [0.9,1.2], growth: [0.8,1.1], value: [1.0,1.3] }, description: 'Produces the finest animal fibre after vicuña and qiviut.',  originCountry: 'Turkey', auctionBasePrice: 150  },

  // ── Alpaca (alpaca) ───────────────────────────────────────────────────────
  { id: 'huacaya',           name: 'Huacaya',           animalTypeId: 'alpaca', purpose: 'fiber', purposeLabel: 'Fiber · Fluffy',       rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [1.0,1.2] }, description: '90% of all alpacas; crimped fleece grows like sheep\'s wool.', originCountry: 'Peru',  auctionBasePrice: 1200 },
  { id: 'suri',              name: 'Suri',              animalTypeId: 'alpaca', purpose: 'fiber', purposeLabel: 'Fiber · Fine Silky',   rarity: 'uncommon', geneRanges: { production: [1.2,1.5], hardiness: [0.9,1.2], growth: [0.8,1.1], value: [1.1,1.4] }, description: 'Silky pencil-lock fleece; 10% of world population; 3× value.', originCountry: 'Peru', auctionBasePrice: 3000 },

  // ── Turkey (pavo) ─────────────────────────────────────────────────────────
  { id: 'broad_breasted_white', name: 'Broad Breasted White', animalTypeId: 'pavo', purpose: 'meat', purposeLabel: 'Meat · Commercial', rarity: 'common',   geneRanges: { production: [0.7,1.0], hardiness: [0.9,1.2], growth: [1.3,1.5], value: [1.0,1.3] }, description: 'Accounts for 99% of all turkeys raised commercially.',      originCountry: 'USA',   auctionBasePrice: 55   },
  { id: 'bronze_turkey',     name: 'Bronze',            animalTypeId: 'pavo', purpose: 'meat',    purposeLabel: 'Heritage Meat',         rarity: 'common',   geneRanges: { production: [0.7,1.0], hardiness: [1.1,1.4], growth: [1.0,1.2], value: [1.0,1.3] }, description: 'America\'s original Thanksgiving turkey; iridescent plumage.', originCountry: 'USA',  auctionBasePrice: 60   },
  { id: 'narragansett',      name: 'Narragansett',      animalTypeId: 'pavo', purpose: 'meat',    purposeLabel: 'Heritage',              rarity: 'uncommon', geneRanges: { production: [0.8,1.1], hardiness: [1.1,1.4], growth: [0.9,1.2], value: [1.0,1.3] }, description: 'First turkey breed developed in America; calm disposition.', originCountry: 'USA',   auctionBasePrice: 150  },
  { id: 'bourbon_red',       name: 'Bourbon Red',       animalTypeId: 'pavo', purpose: 'premium', purposeLabel: 'Heritage · Premium',   rarity: 'rare',     geneRanges: { production: [0.8,1.1], hardiness: [1.1,1.4], growth: [0.9,1.1], value: [1.2,1.5] }, description: 'Named for Bourbon County KY; richly flavoured dark meat.', originCountry: 'USA',   auctionBasePrice: 500  },

  // ── Quail (codorniz) ──────────────────────────────────────────────────────
  { id: 'coturnix',          name: 'Coturnix (Japanese)', animalTypeId: 'codorniz', purpose: 'eggs', purposeLabel: 'Eggs & Meat',      rarity: 'common',   geneRanges: { production: [1.2,1.5], hardiness: [1.0,1.3], growth: [1.1,1.4], value: [0.9,1.1] }, description: 'Lays at 6 weeks old; most commercially farmed quail.',     originCountry: 'Japan', auctionBasePrice: 10   },
  { id: 'bobwhite',          name: 'Bobwhite',          animalTypeId: 'codorniz', purpose: 'meat',  purposeLabel: 'Meat',              rarity: 'common',   geneRanges: { production: [0.8,1.1], hardiness: [1.1,1.4], growth: [1.0,1.3], value: [1.0,1.3] }, description: 'Named for its distinctive call; traditional game bird.',   originCountry: 'USA',   auctionBasePrice: 12   },
  { id: 'california_quail',  name: 'California Quail',  animalTypeId: 'codorniz', purpose: 'meat',  purposeLabel: 'Ornamental & Meat', rarity: 'uncommon', geneRanges: { production: [0.8,1.1], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [1.1,1.4] }, description: 'California\'s state bird; distinctive plume topknot.',      originCountry: 'USA',   auctionBasePrice: 35   },

  // ── Buffalo (bufalo) ──────────────────────────────────────────────────────
  { id: 'murrah',            name: 'Murrah',            animalTypeId: 'bufalo', purpose: 'dairy', purposeLabel: 'Dairy · High Volume',  rarity: 'common',   geneRanges: { production: [1.2,1.5], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [0.8,1.1] }, description: 'Highest milk yield of all buffalo breeds; India\'s top dairy buffalo.', originCountry: 'India',   auctionBasePrice: 3500 },
  { id: 'nili_ravi',         name: 'Nili-Ravi',         animalTypeId: 'bufalo', purpose: 'dairy', purposeLabel: 'Dairy',               rarity: 'common',   geneRanges: { production: [1.1,1.4], hardiness: [1.1,1.4], growth: [0.9,1.2], value: [0.8,1.1] }, description: 'Pakistan\'s premium dairy buffalo; thrives in extreme heat.',  originCountry: 'Pakistan', auctionBasePrice: 3200 },
  { id: 'riverine',          name: 'Riverine',          animalTypeId: 'bufalo', purpose: 'dairy', purposeLabel: 'Dairy',               rarity: 'common',   geneRanges: { production: [1.0,1.3], hardiness: [1.0,1.3], growth: [0.9,1.2], value: [0.9,1.2] }, description: 'Produces milk with 8% fat — ideal for mozzarella and ghee.',  originCountry: 'South Asia', auctionBasePrice: 3000 },
  { id: 'mediterranean_buffalo', name: 'Mediterranean', animalTypeId: 'bufalo', purpose: 'dairy', purposeLabel: 'Dairy · Mozzarella', rarity: 'uncommon', geneRanges: { production: [1.1,1.4], hardiness: [1.0,1.2], growth: [0.9,1.1], value: [1.1,1.4] }, description: 'The mozzarella di bufala DOP breed; protected EU designation.', originCountry: 'Italy', auctionBasePrice: 7000 },
  { id: 'swamp_buffalo',     name: 'Swamp Buffalo',     animalTypeId: 'bufalo', purpose: 'dual',  purposeLabel: 'Meat & Draft',        rarity: 'uncommon', geneRanges: { production: [0.7,1.0], hardiness: [1.2,1.5], growth: [1.0,1.3], value: [1.0,1.3] }, description: 'Dominant working animal of Southeast Asian rice farming.',   originCountry: 'SE Asia',   auctionBasePrice: 4500 },
];

/** Returns all breeds for a given animalTypeId. */
export function breedsForSpecies(animalTypeId: string): BreedType[] {
  return BREED_TYPES.filter(b => b.animalTypeId === animalTypeId);
}

/** Returns breeds of a given rarity for a given species. */
export function breedsByRarity(animalTypeId: string, rarity: BreedRarity): BreedType[] {
  return BREED_TYPES.filter(b => b.animalTypeId === animalTypeId && b.rarity === rarity);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `granja-tycoon/`:
```bash
npx tsc --noEmit
```
Expected: no errors in `data/breedTypes.ts`. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add granja-tycoon/data/breedTypes.ts
git commit -m "feat: add breedTypes.ts with 75 real-world breeds across 13 species"
```

---

## Task 2: Update `engine/animals.ts` — Breed-Aware Gene Functions

**Files:**
- Modify: `granja-tycoon/engine/animals.ts`

- [ ] **Step 1: Add `breedId` and `crossbreedParents` to `OwnedAnimal`**

Find the `OwnedAnimal` interface (around line 71). Add two optional fields after `grandparentIds`:

```typescript
  grandparentIds?: [string, string, string, string];
  breedId?: string;                     // undefined = "Mixed"
  crossbreedParents?: [string, string]; // [motherBreedId, fatherBreedId]
  lactationStartDay?: number;
```

- [ ] **Step 2: Add breed-aware gene functions**

Add the following block after the existing `breedGenes` function (after line ~62):

```typescript
import { BreedType } from '../data/breedTypes';

/** Sample random genes within a breed's gene ranges. */
export function randomGenesForBreed(breed: BreedType): AnimalGenes {
  const r = (range: [number, number]) =>
    clamp(range[0] + Math.random() * (range[1] - range[0]), 0.5, 1.5);
  return {
    production: r(breed.geneRanges.production),
    hardiness:  r(breed.geneRanges.hardiness),
    growth:     r(breed.geneRanges.growth),
    value:      r(breed.geneRanges.value),
  };
}

/** F1 cross genes: average of both breed ranges + 5% hybrid vigour bonus. */
export function crossbreedGenes(motherBreed: BreedType, fatherBreed: BreedType): AnimalGenes {
  const avg = (a: [number, number], b: [number, number]) =>
    clamp(
      ((a[0] + b[0]) / 2 + Math.random() * ((a[1] + b[1]) / 2 - (a[0] + b[0]) / 2)) * 1.05,
      0.5, 1.5
    );
  return {
    production: avg(motherBreed.geneRanges.production, fatherBreed.geneRanges.production),
    hardiness:  avg(motherBreed.geneRanges.hardiness,  fatherBreed.geneRanges.hardiness),
    growth:     avg(motherBreed.geneRanges.growth,     fatherBreed.geneRanges.growth),
    value:      avg(motherBreed.geneRanges.value,      fatherBreed.geneRanges.value),
  };
}

/**
 * Breed-aware gene inheritance. Call this from breedAnimal() instead of breedGenes().
 * - Same breed × same breed → sample from breed's gene ranges (purebred offspring)
 * - Different breed × different breed → F1 hybrid with 5% vigour bonus
 * - Either parent Mixed → numeric average walk (existing behaviour)
 */
export function breedAnimalGenes(
  mother: OwnedAnimal | undefined,
  father: OwnedAnimal | undefined,
  allBreeds: BreedType[],
): AnimalGenes {
  const motherBreed = mother?.breedId ? allBreeds.find(b => b.id === mother.breedId) : undefined;
  const fatherBreed = father?.breedId ? allBreeds.find(b => b.id === father.breedId) : undefined;

  if (motherBreed && fatherBreed) {
    if (motherBreed.id === fatherBreed.id) {
      // Purebred × Purebred same breed
      return randomGenesForBreed(motherBreed);
    }
    // Purebred × Purebred different breed → F1 hybrid vigour
    return crossbreedGenes(motherBreed, fatherBreed);
  }

  // Fall back to existing numeric average for Mixed animals
  const mg = mother?.genes ?? randomGenes();
  const fg = father?.genes ?? randomGenes();
  const mutate = (a: number, b: number) =>
    clamp((a + b) / 2 + (Math.random() - 0.5) * 0.12, 0.5, 1.5);
  return {
    production: mutate(mg.production, fg.production),
    hardiness:  mutate(mg.hardiness,  fg.hardiness),
    growth:     mutate(mg.growth,     fg.growth),
    value:      mutate(mg.value,      fg.value),
  };
}

/** Returns a display name for an animal's breed. */
export function getBreedDisplayName(animal: OwnedAnimal, allBreeds: BreedType[]): string {
  if (animal.breedId) {
    return allBreeds.find(b => b.id === animal.breedId)?.name ?? 'Unknown';
  }
  if (animal.crossbreedParents) {
    const [mId, fId] = animal.crossbreedParents;
    const mName = allBreeds.find(b => b.id === mId)?.name;
    const fName = allBreeds.find(b => b.id === fId)?.name;
    if (mName && fName) return `${mName} × ${fName}`;
  }
  return 'Mixed';
}

/**
 * Returns the auction price multiplier for a purebred/crossbred animal.
 *   Mixed: 1.0 · F1 Cross: 1.3 · Common purebred: 1.2
 *   Uncommon: 1.5 · Rare: 2.75
 */
export function getBreedPurebredMultiplier(animal: OwnedAnimal, allBreeds: BreedType[]): number {
  if (animal.crossbreedParents) {
    const [mId, fId] = animal.crossbreedParents;
    const mBreed = allBreeds.find(b => b.id === mId);
    const fBreed = allBreeds.find(b => b.id === fId);
    return mBreed && fBreed ? 1.3 : 1.1; // F1 vs backcross
  }
  if (animal.breedId) {
    const breed = allBreeds.find(b => b.id === animal.breedId);
    if (!breed) return 1.0;
    if (breed.rarity === 'common')   return 1.2;
    if (breed.rarity === 'uncommon') return 1.5;
    return 2.75; // rare
  }
  return 1.0;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. The import of `BreedType` should resolve. If you get a circular import error, move the `BreedType` import to the top of the file.

- [ ] **Step 4: Commit**

```bash
git add granja-tycoon/engine/animals.ts
git commit -m "feat: add breed-aware gene functions to engine/animals.ts"
```

---

## Task 3: Store — Update `breedAnimal()` for Breed Identity on Offspring

**Files:**
- Modify: `granja-tycoon/store/useGameStore.ts`

- [ ] **Step 1: Add `BREED_TYPES` import to the store's `breedAnimal` action**

Find the `breedAnimal` action (around line 4463). It uses `require(...)` inside the function body. Add a require for `breedTypes` and `animals` engine functions alongside the existing ones:

```typescript
breedAnimal: (animalId) => {
  const state = get();
  const animal = state.animals.find((a: OwnedAnimal) => a.id === animalId);
  if (!animal || animal.sex !== 'female') return;
  const { ANIMAL_TYPES } = require('../data/animalTypes');
  const { BREED_TYPES } = require('../data/breedTypes');                          // ADD
  const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
  if (!animalType) return;
  const { canBreed, isMature, inheritTrait, breedAnimalGenes } = require('../engine/animals'); // ADD breedAnimalGenes
  if (!canBreed(animal, animalType, state.day)) return;
```

- [ ] **Step 2: Replace the `genes: breedGenes(...)` call in `breedAnimal` with `breedAnimalGenes`**

Find this line inside `breedAnimal` (around line 4529):
```typescript
          genes: breedGenes(animal.genes, fatherGenes),
```

The actual father used for genes is either the sire pen male or the `father` variable. Find the full `offspring` object construction block and replace it with:

```typescript
        const actualFather: OwnedAnimal | undefined = hasSirePen && sirePenMale ? sirePenMale : father;

        // ── Breed identity ────────────────────────────────────────────────
        const motherBreedId = animal.breedId;
        const fatherBreedId = actualFather?.breedId;
        let offspringBreedId: string | undefined;
        let offspringCrossbreedParents: [string, string] | undefined;

        if (motherBreedId && fatherBreedId) {
          if (motherBreedId === fatherBreedId) {
            offspringBreedId = motherBreedId; // purebred
          } else {
            offspringCrossbreedParents = [motherBreedId, fatherBreedId]; // F1 cross
          }
        } else if (motherBreedId && actualFather?.crossbreedParents) {
          // Purebred × F1 → backcross
          offspringCrossbreedParents = [motherBreedId, actualFather.crossbreedParents[0]];
        } else if (fatherBreedId && animal.crossbreedParents) {
          // F1 × Purebred → backcross
          offspringCrossbreedParents = [animal.crossbreedParents[0], fatherBreedId];
        }
        // Otherwise: Mixed (no breedId, no crossbreedParents)

        const offspring: OwnedAnimal = {
          id: `animal_${Date.now()}`,
          typeId: animal.typeId,
          sex: offspringSex,
          bornDay: state.day,
          lastProductionDay: state.day,
          lastBreedDay: state.day,
          sick: false,
          traits: offspringTraits.length > 0 ? offspringTraits : undefined,
          genes: breedAnimalGenes(animal, actualFather, BREED_TYPES),
          parentIds: [animalId, father.id],
          grandparentIds,
          breedId: offspringBreedId,
          crossbreedParents: offspringCrossbreedParents,
        };
```

> Note: Remove the old `const fatherGenes = hasSirePen && sirePenMale ? sirePenMale.genes : father?.genes;` line — it is replaced by the `actualFather` variable above.

- [ ] **Step 3: Apply purebred multiplier in sell value**

Search for `sellAnimal` action in the store. Find where it computes the sell price (it calls `sellValue` from engine/animals). After that call, multiply by the purebred multiplier:

```typescript
const { sellValue, getBreedPurebredMultiplier } = require('../engine/animals');
const { BREED_TYPES } = require('../data/breedTypes');
// ... existing sellValue call ...
const baseVal = sellValue(animal, animalType, state.day);
const breedMult = getBreedPurebredMultiplier(animal, BREED_TYPES);
const finalVal = Math.round(baseVal * breedMult);
```

Use `finalVal` (instead of the raw `sellValue` result) wherever the sell revenue is calculated.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat: breed identity on offspring, purebred multiplier on sell value"
```

---

## Task 4: Store — Add `cullAnimal()` Action + Breed Field on Auction Listings

**Files:**
- Modify: `granja-tycoon/store/useGameStore.ts`

- [ ] **Step 1: Add `animalBreedId` to `AuctionListing` interface**

Find `AuctionListing` interface (around line 413). Add after `animalGenes?`:

```typescript
  animalGenes?: AnimalGenes;
  animalBreedId?: string;              // ADD — breedId of the listed animal
  animalBreedCrossParents?: [string, string]; // ADD — for display of F1/backcross
  animalSex?: 'male' | 'female';
```

- [ ] **Step 2: Add `cullAnimal` to the store interface**

Find the store actions interface section (around line 689 where `buyAnimal` is declared). Add:

```typescript
  cullAnimal: (animalId: string) => void;
```

- [ ] **Step 3: Implement `cullAnimal` action**

Find the `breedAnimal` action implementation. Add `cullAnimal` nearby:

```typescript
cullAnimal: (animalId) => set(state => {
  const animal = state.animals.find((a: OwnedAnimal) => a.id === animalId);
  if (!animal) return {};
  const { ANIMAL_TYPES } = require('../data/animalTypes');
  const animalType = ANIMAL_TYPES.find((a: any) => a.id === animal.typeId);
  if (!animalType) return {};

  // Meat-producing species: pigs, rabbits, cows, sheep, goats, turkeys, buffalo
  const MEAT_SPECIES = new Set(['cerdo', 'conejo', 'vaca', 'oveja', 'cabra', 'pavo', 'bufalo']);
  let moneyGain = 0;

  if (MEAT_SPECIES.has(animal.typeId)) {
    // Approximate live weight → dress yield
    const DRESS_YIELDS: Record<string, { weightKg: number; dressPercent: number }> = {
      vaca:   { weightKg: 550, dressPercent: 0.60 },
      bufalo: { weightKg: 480, dressPercent: 0.57 },
      cerdo:  { weightKg: 110, dressPercent: 0.75 },
      oveja:  { weightKg: 55,  dressPercent: 0.50 },
      cabra:  { weightKg: 45,  dressPercent: 0.48 },
      conejo: { weightKg: 2.5, dressPercent: 0.55 },
      pavo:   { weightKg: 12,  dressPercent: 0.80 },
    };
    const spec = DRESS_YIELDS[animal.typeId];
    if (spec) {
      const { isMature } = require('../engine/animals');
      const ageFraction = isMature(animal, animalType, state.day)
        ? Math.min(1, (state.day - animal.bornDay) / animalType.maxPriceAge)
        : 0.4; // immature animals yield less
      const meatKg = spec.weightKg * spec.dressPercent * ageFraction * (animal.genes?.value ?? 1.0);
      const meatPrice = (state.prices ?? []).find((p: any) => p.id === 'meat')?.price ?? 4.50;
      moneyGain = Math.round(meatKg * meatPrice * 0.85); // 15% processing fee
    }
  }

  return {
    animals: state.animals.filter((a: OwnedAnimal) => a.id !== animalId),
    money: state.money + moneyGain,
    salesLog: moneyGain > 0
      ? [...(state.salesLog ?? []), { day: state.day, amount: moneyGain, category: 'animals' as const }]
      : state.salesLog,
  };
}),
```

- [ ] **Step 4: Update NPC auction lot generation to include a breed**

Find the NPC animal listing loop (around line 2528–2560):

```typescript
// Generate NPC animal listings for next event if today is event day
if (isAnimalEventDay) {
  nextAnimalAuctionDay = newDay + 7;
  const animalCount = 3 + Math.floor(Math.random() * 3);
  const eligibleTypes = AT_AUCTION.filter((a: any) => a.productionType !== null);
```

Inside the `for` loop that builds each listing, add breed selection:

```typescript
  for (let i = 0; i < animalCount; i++) {
    const animalType = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
    const { BREED_TYPES } = require('../data/breedTypes');
    const speciesBreeds = BREED_TYPES.filter((b: any) => b.animalTypeId === animalType.id);

    // Rarity weighting: 70% common, 25% uncommon, 5% rare
    const roll = Math.random();
    let rarityFilter = 'common';
    if (roll > 0.95) rarityFilter = 'rare';
    else if (roll > 0.70) rarityFilter = 'uncommon';
    const rarityBreeds = speciesBreeds.filter((b: any) => b.rarity === rarityFilter);
    const breedPool = rarityBreeds.length > 0 ? rarityBreeds : speciesBreeds;
    const selectedBreed = breedPool.length > 0
      ? breedPool[Math.floor(Math.random() * breedPool.length)]
      : null;

    // Gene ranges from breed if available, else existing random weighted genes
    let genes: AnimalGenes;
    if (selectedBreed) {
      const { randomGenesForBreed } = require('../engine/animals');
      genes = randomGenesForBreed(selectedBreed);
    } else {
      genes = {
        production: 0.9 + Math.random() * 0.5,
        hardiness:  0.9 + Math.random() * 0.5,
        growth:     0.9 + Math.random() * 0.5,
        value:      0.9 + Math.random() * 0.5,
      };
    }
    const { geneScore, getBreedPurebredMultiplier } = require('../engine/animals');
    const score = geneScore(genes);
    const breedBasePrice = selectedBreed ? selectedBreed.auctionBasePrice : animalType.buyCost;
    const purebredMult = selectedBreed ? (
      selectedBreed.rarity === 'rare' ? 2.75 :
      selectedBreed.rarity === 'uncommon' ? 1.5 : 1.2
    ) : 1.0;
    const startingBid = Math.round(breedBasePrice * score * 0.6 * purebredMult);

    updatedListings.push({
      id: `listing_animal_${newDay}_${i}`,
      category: 'animal',
      sellerId: 'npc',
      animalTypeId: animalType.id,
      animalGenes: genes,
      animalBreedId: selectedBreed?.id,       // ADD
      startingBid,
      reservePrice: 0,
      currentBid: startingBid,
      bids: [],
      playerBid: null,
      createdDay: newDay,
      expiresDay: nextAnimalAuctionDay,
      resolved: false,
      playerWon: null,
    });
  }
```

- [ ] **Step 5: Wire `cullAnimal` into the exported actions object**

Find the section around line 6701 where all actions are spread into the return. Add `cullAnimal` alongside `breedAnimal`:

```typescript
buyAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal, cullAnimal, treatAnimal,
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat: cullAnimal action, breed on auction listings, animalBreedId on AuctionListing"
```

---

## Task 5: Remove Buy Buttons from `app/(tabs)/animales.tsx`

**Files:**
- Modify: `granja-tycoon/app/(tabs)/animales.tsx`

- [ ] **Step 1: Remove `buyAnimal` from the store destructure**

Find the store destructure (around line 160):
```typescript
buyAnimal, sellAnimal, collectAnimalProduction, sellAnimalProduct, breedAnimal,
```
Remove `buyAnimal` from this list.

- [ ] **Step 2: Remove buy button variables**

Find where `maleCost` and `femaleCost` are calculated from `item.buyCost`. Remove those calculations and any `activeFair` discount applied to them.

- [ ] **Step 3: Replace the buy button block with an auction redirect message**

Find the `<View style={styles.sexBtnRow}>` block (around line 700–737) and replace the entire block with:

```typescript
<View style={{ marginTop: 8, padding: 10, backgroundColor: '#1a2a1a', borderRadius: 8 }}>
  <Text style={{ color: '#8bc34a', fontSize: 12, textAlign: 'center' }}>
    🏷️ Buy at Auction — go to the Subasta tab to bid on {item.name}s
  </Text>
</View>
```

- [ ] **Step 4: Add `cullAnimal` to the store destructure and add a Cull button**

Add `cullAnimal` to the store destructure. Find where individual owned animals are rendered (the animal card with sell/breed/treat buttons). Add a Cull button after the existing sell button:

```typescript
<TouchableOpacity
  style={{ backgroundColor: '#8b1a1a', padding: 8, borderRadius: 6, marginTop: 4 }}
  onPress={() => cullAnimal(a.id)}
>
  <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>🔪 Cull for Meat</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Add breed badge to animal card**

In the animal card, find where `typeId` or `name` is displayed. Add a breed line below it:

```typescript
import { getBreedDisplayName } from '../../engine/animals';
import { BREED_TYPES } from '../../data/breedTypes';

// Inside the card render:
<Text style={{ color: '#8bc34a', fontSize: 11, marginTop: 2 }}>
  {getBreedDisplayName(a, BREED_TYPES)}
</Text>
```

- [ ] **Step 6: Run the dev server and verify**

```bash
npx expo start --web
```

Open the Animales tab. Verify:
- No buy buttons visible on species cards
- Each owned animal shows a breed line ("Mixed" for existing animals, breed name for newly bred ones)
- "Cull for Meat" button appears on each owned animal card

- [ ] **Step 7: Commit**

```bash
git add granja-tycoon/app/(tabs)/animales.tsx
git commit -m "feat: remove buy buttons from animales, add breed badge and cull action"
```

---

## Task 6: Update `app/(tabs)/subasta.tsx` — Show Breed Info on Animal Lots

**Files:**
- Modify: `granja-tycoon/app/(tabs)/subasta.tsx`

- [ ] **Step 1: Import breed utilities**

At the top of `subasta.tsx`, add:

```typescript
import { BREED_TYPES, BreedRarity } from '../../data/breedTypes';
```

- [ ] **Step 2: Add a rarity badge helper**

Add this helper near the top of the component (before the return):

```typescript
const RARITY_COLORS: Record<BreedRarity, string> = {
  common: '#607d8b',
  uncommon: '#7b5ea7',
  rare: '#c9962a',
};

function BreedBadge({ breedId }: { breedId?: string }) {
  if (!breedId) return <Text style={{ color: '#607d8b', fontSize: 11 }}>Mixed</Text>;
  const breed = BREED_TYPES.find(b => b.id === breedId);
  if (!breed) return <Text style={{ color: '#607d8b', fontSize: 11 }}>Mixed</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
      <View style={{ backgroundColor: RARITY_COLORS[breed.rarity], borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
          {breed.rarity.toUpperCase()}
        </Text>
      </View>
      <Text style={{ color: '#e0e0e0', fontSize: 12, fontWeight: '600' }}>{breed.name}</Text>
      <Text style={{ color: '#9e9e9e', fontSize: 11 }}>· {breed.purposeLabel}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Show breed badge on animal listings**

Find where animal listings are rendered (look for `listing.animalTypeId` in the JSX). Add the `BreedBadge` after the animal type name:

```typescript
{listing.category === 'animal' && (
  <BreedBadge breedId={listing.animalBreedId} />
)}
```

- [ ] **Step 4: Show origin country if breed is known**

Below the breed badge, add origin country for non-Mixed animals:

```typescript
{listing.animalBreedId && (() => {
  const breed = BREED_TYPES.find(b => b.id === listing.animalBreedId);
  return breed ? (
    <Text style={{ color: '#9e9e9e', fontSize: 11, marginTop: 1 }}>
      🌍 {breed.originCountry} · {breed.description}
    </Text>
  ) : null;
})()}
```

- [ ] **Step 5: When a player wins a breed lot, assign breedId to the animal**

Find the auction resolution logic in the store (around line 2395–2440 where `playerWon` handling creates the new animal). Find where the new `OwnedAnimal` is created for the winner and add the breed fields:

In `useGameStore.ts`, find:
```typescript
genes: listing.animalGenes,
```
Add after it:
```typescript
breedId: listing.animalBreedId,
```

- [ ] **Step 6: Run the dev server and verify**

```bash
npx expo start --web
```

Open the Subasta tab. Advance a few days until an animal auction event. Verify:
- Animal lots now show a coloured rarity badge (COMMON/UNCOMMON/RARE)
- Breed name and purpose label are visible
- Origin country and description appear below
- Winning a bid produces an animal with the correct `breedId` (check by breeding it — offspring should show the breed name in Animales)

- [ ] **Step 7: Commit**

```bash
git add granja-tycoon/app/(tabs)/subasta.tsx granja-tycoon/store/useGameStore.ts
git commit -m "feat: breed badges on auction listings, breedId assigned on auction win"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - `data/breedTypes.ts` with 75 breeds → Task 1 ✓
  - `OwnedAnimal.breedId` + `crossbreedParents` → Task 2 ✓
  - `randomGenesForBreed`, `crossbreedGenes`, `breedAnimalGenes`, `getBreedDisplayName`, `getBreedPurebredMultiplier` → Task 2 ✓
  - `breedAnimal()` sets offspring breed identity → Task 3 ✓
  - Purebred multiplier on sell value → Task 3 ✓
  - `cullAnimal()` action → Task 4 ✓
  - `animalBreedId` on `AuctionListing` → Task 4 ✓
  - NPC auction lots include breed → Task 4 ✓
  - Remove buy buttons from animales → Task 5 ✓
  - Breed badge on animal cards → Task 5 ✓
  - Breed badge + rarity on auction listings → Task 6 ✓
  - `breedId` assigned to animal on auction win → Task 6 ✓
  - Auction-only acquisition → Tasks 5 + 6 ✓
  - F1 hybrid vigour (+5%) → Task 2 `crossbreedGenes` ✓
  - Backwards compatibility (optional fields) → Task 2 ✓

- [x] **Type consistency:** `OwnedAnimal.breedId` defined in Task 2, used in Tasks 3, 4, 5, 6. `AuctionListing.animalBreedId` defined in Task 4, used in Tasks 4 and 6. All consistent.

- [x] **No placeholders:** All steps contain complete code.
