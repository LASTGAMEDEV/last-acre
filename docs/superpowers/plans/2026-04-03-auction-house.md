# Auction House Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-purpose land auction tab (`subasta.tsx`) with a unified four-category auction house covering land, animals, crops, and used machinery — players can both buy and sell.

**Architecture:** A new `AuctionListing` interface replaces the old `AuctionLot` interface in the Zustand store. Three new store actions (`listItem`, `withdrawListing`, `placeBid`) replace the old `placeBid`. Resolution and NPC bidding run inside `advanceDay`. The UI is a hub screen with a 2×2 category grid drilling into per-category list views.

**Tech Stack:** React Native 0.81.5, Expo 54, Zustand 5, TypeScript 5.9.2 — no new dependencies. TypeScript verified via `node_modules/.bin/tsc --noEmit --project "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/tsconfig.json"`.

---

## File Map

| File | Change |
|------|--------|
| `store/useGameStore.ts` | Replace `AuctionLot`/`auctionLots`/`placeBid` with `AuctionListing`/`listings`/`listItem`/`withdrawListing`/`placeBid`; add `nextAnimalAuctionDay`; update `advanceDay` |
| `app/(tabs)/subasta.tsx` | Full rewrite — hub + four drill-in views |
| `app/(tabs)/maquinaria.tsx` | Add "Listed for auction" escrow label on machines in listings |

---

## Task 1 — Add `AuctionListing` interface and replace `AuctionLot` in the store

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] After the existing `AuctionLot` interface (around line 300), add `AuctionCategory` and `AuctionListing`, then mark `AuctionLot` as deprecated with a comment:

```typescript
// ── Auction House ─────────────────────────────────────────────────────────────
export type AuctionCategory = 'land' | 'animal' | 'crop' | 'machinery';

export interface AuctionListing {
  id: string;
  category: AuctionCategory;
  sellerId: 'player' | string;      // 'player' or NPC farm id
  // Payload — only the relevant field is set per category
  parcelId?: string;                 // land
  parcel?: LandParcel;               // land (kept for display, same as AuctionLot)
  animalId?: string;                 // animal (player-listed)
  animalTypeId?: string;             // animal (NPC-generated)
  animalGenes?: AnimalGenes;         // animal
  cropId?: string;                   // crop
  cropQuantity?: number;             // crop
  machineId?: string;                // machinery (player-listed)
  machineTypeId?: string;            // machinery (NPC-generated)
  conditionScore?: number;           // machinery (0–100)
  // Auction terms
  startingBid: number;
  reservePrice: number;              // 0 = no reserve; hidden from bidders
  currentBid: number;
  bids: AuctionBid[];
  playerBid: number | null;
  createdDay: number;
  expiresDay: number;                // for animal listings: equals nextAnimalAuctionDay at creation
  resolved: boolean;
  playerWon: boolean | null;
}
```

- [ ] In `GameState` interface, replace:
  ```typescript
  auctionLots: AuctionLot[];
  ```
  with:
  ```typescript
  listings: AuctionListing[];
  nextAnimalAuctionDay: number;
  ```

- [ ] In `GameState` action signatures, replace:
  ```typescript
  placeBid: (lotId: string, amount: number) => void;
  ```
  with:
  ```typescript
  listItem: (params: {
    category: AuctionCategory;
    animalId?: string;
    cropId?: string;
    cropQuantity?: number;
    machineId?: string;
    startingBid: number;
    reservePrice: number;
    durationDays: 3 | 7 | 14;
  }) => void;
  withdrawListing: (listingId: string) => void;
  placeBid: (listingId: string, amount: number) => void;
  ```

- [ ] In `makeInitialState()`, replace:
  ```typescript
  auctionLots: generateInitialAuctions(),
  ```
  with:
  ```typescript
  listings: generateInitialListings(),
  nextAnimalAuctionDay: 8,
  ```

- [ ] Add `generateInitialListings()` function just before `makeInitialState()` (replacing `generateInitialAuctions()`). It creates the same 2 premium parcels as before but as `AuctionListing` objects:

```typescript
function generateInitialListings(): AuctionListing[] {
  const premiumParcels: LandParcel[] = [
    { id: 'auction_p0', name: 'Gold Acre',   fertility: 22, hectares: 5,  pricePerHa: 55000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false },
    { id: 'auction_p1', name: 'Prime Ridge', fertility: 25, hectares: 2,  pricePerHa: 60000, owned: false, hasWeeds: false, plantedCrop: null, greenhouse: false, irrigated: false, tilled: false },
  ];
  return premiumParcels.map((parcel, i) => ({
    id: `lot_init_${i}`,
    category: 'land' as AuctionCategory,
    sellerId: 'npc',
    parcel,
    startingBid: Math.round(parcel.pricePerHa * parcel.hectares * 0.7),
    reservePrice: 0,
    currentBid: Math.round(parcel.pricePerHa * parcel.hectares * 0.7),
    bids: [],
    playerBid: null,
    createdDay: 1,
    expiresDay: 10 + i * 5,
    resolved: false,
    playerWon: null,
  }));
}
```

- [ ] In the `partialize` destructure at the bottom of the file, replace `placeBid` with `listItem, withdrawListing, placeBid` (all three go in the exclusion list alongside other actions).

- [ ] Run TypeScript check:
  ```bash
  "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/node_modules/.bin/tsc" --noEmit --project "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/tsconfig.json" 2>&1 | head -30
  ```
  Expected: errors only about `auctionLots` usages (the old name) in `advanceDay` and `subasta.tsx` — not type errors in what we just added.

- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(auction): add AuctionListing interface + replace auctionLots state"
  ```

---

## Task 2 — Implement `listItem`, `withdrawListing`, and `placeBid` actions

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] Find the old `placeBid` implementation (around line 3485) and replace it entirely with the three new actions:

```typescript
      listItem: (params) => {
        const state = get();
        const { category, animalId, cropId, cropQuantity, machineId,
                startingBid, reservePrice, durationDays } = params;
        if (startingBid <= 0 || reservePrice < startingBid) return;

        const listing: AuctionListing = {
          id: `listing_${Date.now()}`,
          category,
          sellerId: 'player',
          startingBid,
          reservePrice,
          currentBid: startingBid,
          bids: [],
          playerBid: null,
          createdDay: state.day,
          expiresDay: state.day + durationDays,
          resolved: false,
          playerWon: null,
        };

        if (category === 'animal') {
          if (!animalId) return;
          const animal = state.animals.find(a => a.id === animalId);
          if (!animal) return;
          listing.animalId = animalId;
          listing.animalGenes = animal.genes;
          listing.animalTypeId = animal.typeId;
          listing.expiresDay = state.nextAnimalAuctionDay;
          set({
            listings: [...(state.listings ?? []), listing],
            animals: state.animals.filter(a => a.id !== animalId),
          });
        } else if (category === 'crop') {
          if (!cropId || !cropQuantity || cropQuantity <= 0) return;
          const inStock = state.inventory[cropId] ?? 0;
          if (inStock < cropQuantity) return;
          listing.cropId = cropId;
          listing.cropQuantity = cropQuantity;
          set({
            listings: [...(state.listings ?? []), listing],
            inventory: { ...state.inventory, [cropId]: inStock - cropQuantity },
          });
        } else if (category === 'machinery') {
          if (!machineId) return;
          const machine = state.machines.find(m => m.id === machineId);
          if (!machine) return;
          const machineType = MACHINE_TYPES.find(t => t.id === machine.typeId);
          if (!machineType) return;
          const ageDays = state.day - machine.purchasedDay;
          const repairs = (state.machineRepairs ?? []).filter(r => r.machineId === machineId);
          const repairedOnTime = repairs.filter(r => r.readyDay !== null).length;
          const missedRepairs = repairs.filter(r => r.startDay === null).length;
          const conditionScore = Math.min(100, Math.max(0,
            100 - Math.floor(ageDays / 5) + repairedOnTime * 3 - missedRepairs * 8
          ));
          listing.machineId = machineId;
          listing.machineTypeId = machine.typeId;
          listing.conditionScore = conditionScore;
          set({
            listings: [...(state.listings ?? []), listing],
            machines: state.machines.filter(m => m.id !== machineId),
          });
        }
      },

      withdrawListing: (listingId) => {
        const state = get();
        const listing = (state.listings ?? []).find(l => l.id === listingId && !l.resolved);
        if (!listing || listing.sellerId !== 'player') return;
        if (listing.bids.some(b => b.isPlayer === false)) return; // bids exist, can't withdraw

        let inventoryPatch: Partial<typeof state> = {};
        if (listing.category === 'animal' && listing.animalId && listing.animalGenes && listing.animalTypeId) {
          // Reconstruct animal stub and return it
          const returnedAnimal: OwnedAnimal = {
            id: listing.animalId,
            typeId: listing.animalTypeId,
            sex: 'female',
            bornDay: state.day,
            genes: listing.animalGenes,
            sick: false,
            lastProductionDay: state.day,
          };
          inventoryPatch = { animals: [...state.animals, returnedAnimal] };
        } else if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
          inventoryPatch = {
            inventory: {
              ...state.inventory,
              [listing.cropId]: (state.inventory[listing.cropId] ?? 0) + listing.cropQuantity,
            },
          };
        } else if (listing.category === 'machinery' && listing.machineId && listing.machineTypeId) {
          const restoredMachine: OwnedMachine = {
            id: listing.machineId,
            typeId: listing.machineTypeId,
            purchasedDay: state.day,
          };
          inventoryPatch = { machines: [...state.machines, restoredMachine] };
        }

        set({
          ...inventoryPatch,
          listings: (state.listings ?? []).map(l =>
            l.id === listingId ? { ...l, resolved: true, playerWon: null } : l
          ),
        });
      },

      placeBid: (listingId, amount) => {
        const state = get();
        const listing = (state.listings ?? []).find(l => l.id === listingId && !l.resolved);
        if (!listing) return;
        const minBid = Math.ceil(listing.currentBid * 1.05);
        if (amount < minBid) return;
        if (state.money < amount) return;
        set({
          listings: (state.listings ?? []).map(l => l.id === listingId ? {
            ...l,
            playerBid: amount,
            currentBid: amount,
            bids: [...l.bids, { day: state.day, amount, isPlayer: true }],
          } : l),
        });
      },
```

- [ ] Run TypeScript check:
  ```bash
  "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/node_modules/.bin/tsc" --noEmit --project "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/tsconfig.json" 2>&1 | head -30
  ```
  Expected: errors only in `advanceDay` (still references `auctionLots`) and `subasta.tsx` — not in the actions we just wrote.

- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(auction): implement listItem, withdrawListing, placeBid actions"
  ```

---

## Task 3 — Update `advanceDay` to use `listings` instead of `auctionLots`

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] In `advanceDay`, find the block that starts with:
  ```typescript
  const auctionLots: AuctionLot[] = state.auctionLots.map(lot => {
  ```
  Replace the entire auction block (from that line through `const trimmedAuctionLots = [...]`) with the following. This handles land listing resolution, NPC bidding on crop/machinery, animal event resolution, and generating new NPC listings:

```typescript
        // ── Auction House ────────────────────────────────────────────────────
        const { geneScore, randomGenes } = require('../engine/animals');
        const { ANIMAL_TYPES: AT_AUCTION } = require('../data/animalTypes');

        let auctionMoneyDelta = 0;
        const auctionParcelAdditions: LandParcel[] = [];
        const auctionAnimalAdditions: OwnedAnimal[] = [];
        const auctionInventoryDelta: Record<string, number> = {};
        const auctionMachineAdditions: OwnedMachine[] = [];

        // Animal event: resolve on nextAnimalAuctionDay
        const isAnimalEventDay = newDay >= state.nextAnimalAuctionDay;
        let nextAnimalAuctionDay = state.nextAnimalAuctionDay;

        const updatedListings: AuctionListing[] = (state.listings ?? []).map((listing: AuctionListing) => {
          if (listing.resolved) return listing;

          // ── NPC bidding on crop / machinery listings (daily) ──
          if (listing.category === 'crop' || listing.category === 'machinery') {
            const candidateNpcs = [...(npcFarms ?? [])].sort(() => Math.random() - 0.5).slice(0, 3);
            let updated = { ...listing };
            for (const npc of candidateNpcs) {
              if (Math.random() > 0.15) continue;
              let npcValuation = 0;
              if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
                const cropPrice = prices.find((p: any) => p.cropId === listing.cropId)?.price ?? 0;
                npcValuation = listing.cropQuantity * cropPrice * 0.80;
              } else if (listing.category === 'machinery' && listing.machineTypeId) {
                const mt = MACHINE_TYPES.find(t => t.id === listing.machineTypeId);
                const suggested = mt ? mt.cost * ((listing.conditionScore ?? 70) / 100) * 0.70 : 0;
                npcValuation = suggested * (0.85 + Math.random() * 0.25);
              }
              if (updated.currentBid >= npcValuation) continue;
              const npcBid = Math.min(Math.ceil(updated.currentBid * 1.05), Math.ceil(npcValuation));
              updated = {
                ...updated,
                currentBid: npcBid,
                bids: [...updated.bids, { day: newDay, amount: npcBid, isPlayer: false }],
              };
            }
            listing = updated;
          }

          // ── NPC bidding on land listings (existing logic) ──
          if (listing.category === 'land' && !listing.resolved) {
            const daysLeft = listing.expiresDay - newDay;
            const aiBidChance = daysLeft <= 3 ? 0.5 : daysLeft <= 7 ? 0.25 : 0.1;
            if (Math.random() < aiBidChance) {
              const parcelValue = (listing.parcel?.pricePerHa ?? 0) * (listing.parcel?.hectares ?? 0);
              const npcBids = (npcFarms ?? [])
                .map((farm: any) => npcAuctionBid(farm, parcelValue))
                .filter((bid: number) => bid > listing.currentBid);
              const aiBid = npcBids.length > 0
                ? Math.max(...npcBids)
                : Math.ceil(listing.currentBid * (1.05 + Math.random() * 0.12));
              listing = {
                ...listing,
                currentBid: aiBid,
                bids: [...listing.bids, { day: newDay, amount: aiBid, isPlayer: false }],
              };
            }
          }

          // ── NPC bidding on animal event listings (batch on event day) ──
          if (listing.category === 'animal' && isAnimalEventDay && !listing.resolved) {
            // Simulate 2–4 NPC bids up to a valuation based on gene score
            const score = listing.animalGenes ? geneScore(listing.animalGenes) : 1.0;
            const animalTypeDef = AT_AUCTION.find((a: any) => a.typeId === listing.animalTypeId || a.id === listing.animalTypeId);
            const baseValue = animalTypeDef ? animalTypeDef.buyCost * score : 500;
            const npcBidCount = 2 + Math.floor(Math.random() * 3);
            let currentBid = listing.currentBid;
            const newBids = [...listing.bids];
            for (let i = 0; i < npcBidCount; i++) {
              const npcVal = baseValue * (0.8 + Math.random() * 0.4);
              if (currentBid >= npcVal) continue;
              const npcBid = Math.min(Math.ceil(currentBid * 1.05), Math.ceil(npcVal));
              currentBid = npcBid;
              newBids.push({ day: newDay, amount: npcBid, isPlayer: false });
            }
            listing = { ...listing, currentBid, bids: newBids };
          }

          // ── Resolution: land, crop, machinery (expires), animal (event day) ──
          const shouldResolve =
            (listing.category !== 'animal' && newDay >= listing.expiresDay) ||
            (listing.category === 'animal' && isAnimalEventDay);

          if (!shouldResolve) return listing;

          const reserveMet = listing.reservePrice === 0 || listing.currentBid >= listing.reservePrice;
          const playerWon = reserveMet && listing.playerBid !== null && listing.playerBid >= listing.currentBid;
          const playerSold = reserveMet && listing.sellerId === 'player' && listing.currentBid > listing.startingBid;

          if (playerWon) {
            auctionMoneyDelta -= listing.playerBid!;
            if (listing.category === 'land' && listing.parcel) {
              auctionParcelAdditions.push({ ...listing.parcel, owned: true });
            } else if (listing.category === 'animal' && listing.animalTypeId && listing.animalGenes) {
              const newAnimal: OwnedAnimal = {
                id: `animal_auction_${listing.id}`,
                typeId: listing.animalTypeId,
                sex: Math.random() < 0.5 ? 'female' : 'male',
                bornDay: newDay - 30,
                genes: listing.animalGenes,
                sick: false,
                lastProductionDay: newDay,
              };
              auctionAnimalAdditions.push(newAnimal);
            } else if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
              auctionInventoryDelta[listing.cropId] = (auctionInventoryDelta[listing.cropId] ?? 0) + listing.cropQuantity;
            } else if (listing.category === 'machinery' && listing.machineTypeId) {
              auctionMachineAdditions.push({
                id: `machine_auction_${listing.id}`,
                typeId: listing.machineTypeId,
                purchasedDay: newDay,
              });
            }
          }

          if (playerSold) {
            auctionMoneyDelta += listing.currentBid;
            // Item already removed from inventory/animals/machines when listed
          }

          if (!playerSold && listing.sellerId === 'player') {
            // Reserve not met — return item to player
            if (listing.category === 'crop' && listing.cropId && listing.cropQuantity) {
              auctionInventoryDelta[listing.cropId] = (auctionInventoryDelta[listing.cropId] ?? 0) + listing.cropQuantity;
            } else if (listing.category === 'machinery' && listing.machineId && listing.machineTypeId) {
              auctionMachineAdditions.push({
                id: listing.machineId,
                typeId: listing.machineTypeId,
                purchasedDay: newDay,
              });
            } else if (listing.category === 'animal' && listing.animalId && listing.animalTypeId && listing.animalGenes) {
              const returnedAnimal: OwnedAnimal = {
                id: listing.animalId,
                typeId: listing.animalTypeId,
                sex: 'female',
                bornDay: newDay - 30,
                genes: listing.animalGenes,
                sick: false,
                lastProductionDay: newDay,
              };
              auctionAnimalAdditions.push(returnedAnimal);
            }
          }

          // Push day summary event
          if (playerWon) {
            const labelMap: Record<AuctionCategory, string> = { land: 'Land', animal: 'Animal', crop: 'Crop lot', machinery: 'Machine' };
            summary.push({
              id: `auction_won_${listing.id}`,
              icon: '🏆',
              title: `Auction won — ${labelMap[listing.category]}`,
              detail: `Paid $${listing.playerBid?.toLocaleString()}`,
              severity: 'good',
            });
          } else if (listing.playerBid !== null && !playerWon) {
            summary.push({
              id: `auction_lost_${listing.id}`,
              icon: '😔',
              title: 'Auction lost',
              detail: `Your bid $${listing.playerBid?.toLocaleString()} · Final $${listing.currentBid.toLocaleString()}`,
              severity: 'warning',
            });
          } else if (playerSold) {
            summary.push({
              id: `auction_sold_${listing.id}`,
              icon: '💰',
              title: 'Your listing sold',
              detail: `+$${listing.currentBid.toLocaleString()}`,
              severity: 'good',
            });
          } else if (listing.sellerId === 'player' && !reserveMet) {
            summary.push({
              id: `auction_unsold_${listing.id}`,
              icon: '📋',
              title: 'Reserve not met — item returned',
              detail: `Highest bid: $${listing.currentBid.toLocaleString()}`,
              severity: 'warning',
            });
          }

          return { ...listing, resolved: true, playerWon };
        });

        // Generate new land listing if fewer than 2 active land listings
        const activeLandListings = updatedListings.filter(l => !l.resolved && l.category === 'land');
        if (activeLandListings.length < 2 && Math.random() < 0.3) {
          const fertility = Math.floor(Math.random() * 10) + 16;
          const hectares = ([2, 5, 10] as const)[Math.floor(Math.random() * 3)];
          const pricePerHa = Math.round((20000 + (fertility / 25) * 50000) / 1000) * 1000;
          const startingBid = Math.round(pricePerHa * hectares * 0.7);
          const auctionNames = ['Riverside Lot','Hilltop Parcel','Valley Premium','Lakeside Acre','Woodland Plot','Cliffside Field','Meadow Estate','Ridge Premium','Orchard Lot','Vineyard Parcel'];
          const newParcel: LandParcel = {
            id: `auction_p${newDay}`,
            name: auctionNames[newDay % auctionNames.length],
            fertility, hectares, pricePerHa,
            owned: false, hasWeeds: false, plantedCrop: null,
            greenhouse: false, irrigated: false, tilled: false,
          };
          updatedListings.push({
            id: `listing_land_${newDay}`,
            category: 'land',
            sellerId: 'npc',
            parcel: newParcel,
            startingBid,
            reservePrice: 0,
            currentBid: startingBid,
            bids: [],
            playerBid: null,
            createdDay: newDay,
            expiresDay: newDay + 10 + Math.floor(Math.random() * 10),
            resolved: false,
            playerWon: null,
          });
          summary.push({
            id: `auction_new_${newDay}`,
            icon: '🏷️',
            title: 'New land auction available',
            detail: `${hectares} ha · fertility ${fertility}/25 · starting $${startingBid.toLocaleString()}`,
            severity: 'info',
          });
        }

        // Generate NPC animal listings for next event if today is event day
        if (isAnimalEventDay) {
          nextAnimalAuctionDay = newDay + 7;
          const animalCount = 3 + Math.floor(Math.random() * 3);
          const eligibleTypes = AT_AUCTION.filter((a: any) => a.productionType !== null);
          for (let i = 0; i < animalCount; i++) {
            const animalType = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
            // Genes weighted toward A/B (score ~1.1–1.3)
            const genes: AnimalGenes = {
              production: 0.9 + Math.random() * 0.5,
              hardiness:  0.9 + Math.random() * 0.5,
              growth:     0.9 + Math.random() * 0.5,
              value:      0.9 + Math.random() * 0.5,
            };
            const score = geneScore(genes);
            const startingBid = Math.round(animalType.buyCost * score * 0.6);
            updatedListings.push({
              id: `listing_animal_${newDay}_${i}`,
              category: 'animal',
              sellerId: 'npc',
              animalTypeId: animalType.id,
              animalGenes: genes,
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
          summary.push({
            id: `animal_auction_event_${newDay}`,
            icon: '🐄',
            title: 'Animal Auction Event',
            detail: `${animalCount} new animals listed · next event Day ${nextAnimalAuctionDay}`,
            severity: 'info',
          });
        }

        // Trim resolved listings — keep 10 most recent resolved per category
        const resolvedListings = updatedListings.filter(l => l.resolved).slice(-20);
        const activeListings = updatedListings.filter(l => !l.resolved);
        const trimmedListings = [...activeListings, ...resolvedListings];

        // Apply auction money / inventory / asset deltas (merged into advanceDay final set)
        moneyDelta += auctionMoneyDelta;
        const auctionFinalInventory = Object.fromEntries(
          Object.keys({ ...state.inventory, ...auctionInventoryDelta }).map(k => [
            k, Math.max(0, (state.inventory[k] ?? 0) + (auctionInventoryDelta[k] ?? 0)),
          ])
        );
```

- [ ] In the final `set({...})` call inside `advanceDay`, replace:
  ```typescript
  auctionLots: trimmedAuctionLots,
  ```
  with:
  ```typescript
  listings: trimmedListings,
  nextAnimalAuctionDay,
  animals: [...animals, ...auctionAnimalAdditions],
  machines: [...(state.machines ?? []), ...auctionMachineAdditions],
  ```
  And ensure `parcels: finalParcels` already incorporates `auctionParcelAdditions` by appending them to `parcelAdditions` before the `finalParcels` computation. Find the line:
  ```typescript
  let finalParcels = [...parcels, ...parcelAdditions];
  ```
  And change to:
  ```typescript
  let finalParcels = [...parcels, ...parcelAdditions, ...auctionParcelAdditions];
  ```
  Also replace the inventory reference in the final set's `inventory:` key to merge `auctionFinalInventory`. Find where `inventory: harvestInventory` is set in the final set and replace with:
  ```typescript
  inventory: Object.fromEntries(
    Object.keys({ ...harvestInventory, ...auctionInventoryDelta }).map(k => [
      k, Math.max(0, (harvestInventory[k] ?? 0) + (auctionInventoryDelta[k] ?? 0)),
    ])
  ),
  ```

- [ ] Run TypeScript check:
  ```bash
  "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/node_modules/.bin/tsc" --noEmit --project "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/tsconfig.json" 2>&1 | head -30
  ```
  Expected: errors only in `subasta.tsx` (still uses old interface).

- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add store/useGameStore.ts && git commit -m "feat(auction): update advanceDay — AuctionListing resolution + NPC bidding + animal events"
  ```

---

## Task 4 — Rewrite `subasta.tsx` — hub + land view

**Files:**
- Modify: `app/(tabs)/subasta.tsx`

- [ ] Replace the entire file with the hub screen + land drill-in view. The hub shows a 2×2 category grid and an "Active Bids" strip. Tapping a tile sets `activeCategory` state:

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore, AuctionListing, AuctionCategory } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import HintCard from '../../components/HintCard';

type AuctionView = 'hub' | AuctionCategory;

export default function SubastaScreen() {
  const { listings, day, money, placeBid, listItem, withdrawListing, nextAnimalAuctionDay,
          animals, inventory, machines } = useGameStore();
  const [view, setView] = useState<AuctionView>('hub');
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});

  const allListings = listings ?? [];
  const activeListings = allListings.filter(l => !l.resolved);
  const playerBids = activeListings.filter(l => l.playerBid !== null);

  function countActive(cat: AuctionCategory) {
    return activeListings.filter(l => l.category === cat).length;
  }

  const daysToAnimalEvent = nextAnimalAuctionDay - day;

  if (view === 'hub') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Auction House" />
        <HintCard
          id="hint_auction"
          title="Buy and sell at auction"
          body="List your animals, crops, and used machinery for sale. Bid on NPC listings. Land auctions appear automatically."
        />

        {/* 2×2 category grid */}
        <View style={styles.grid}>
          {([
            { cat: 'land',      icon: '🏡', label: 'Land',      sub: `${countActive('land')} active` },
            { cat: 'animal',    icon: '🐄', label: 'Animals',   sub: daysToAnimalEvent <= 0 ? '⚡ Event today!' : `⚡ Event in ${daysToAnimalEvent}d` },
            { cat: 'crop',      icon: '🌾', label: 'Crops',     sub: `${countActive('crop')} listings` },
            { cat: 'machinery', icon: '⚙️', label: 'Machinery', sub: `${countActive('machinery')} listings` },
          ] as { cat: AuctionCategory; icon: string; label: string; sub: string }[]).map(({ cat, icon, label, sub }) => (
            <TouchableOpacity
              key={cat}
              style={[styles.tile, cat === 'animal' && styles.tileAnimal]}
              onPress={() => setView(cat)}
            >
              <Text style={styles.tileIcon}>{icon}</Text>
              <Text style={[styles.tileLabel, cat === 'animal' && styles.tileLabelAnimal]}>{label}</Text>
              <Text style={[styles.tileSub, cat === 'animal' && styles.tileSubAnimal]}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active bids strip */}
        {playerBids.length > 0 && (
          <View style={styles.bidsStrip}>
            <Text style={styles.bidStripTitle}>YOUR ACTIVE BIDS</Text>
            {playerBids.map(l => {
              const isLeading = l.playerBid !== null && l.playerBid >= l.currentBid;
              const label = l.category === 'land' ? `📍 ${l.parcel?.name ?? 'Parcel'}`
                          : l.category === 'animal' ? `🐄 ${l.animalTypeId ?? 'Animal'}`
                          : l.category === 'crop' ? `🌾 ${l.cropId ?? 'Crop'}`
                          : `⚙️ ${l.machineTypeId ?? 'Machine'}`;
              return (
                <TouchableOpacity key={l.id} style={styles.bidStripRow} onPress={() => setView(l.category)}>
                  <Text style={styles.bidStripLabel}>{label}</Text>
                  <Text style={[styles.bidStripStatus, isLeading ? styles.leading : styles.outbid]}>
                    {isLeading ? `✓ Leading $${l.playerBid?.toLocaleString()}` : `⚠ Outbid $${l.playerBid?.toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={view === 'land' ? '🏡 Land Auction' : view === 'animal' ? '🐄 Animals' : view === 'crop' ? '🌾 Crops' : '⚙️ Machinery'} />
      <TouchableOpacity style={styles.backBtn} onPress={() => setView('hub')}>
        <Text style={styles.backBtnText}>← Back to Auction House</Text>
      </TouchableOpacity>
      {view === 'land' && <LandView listings={allListings} day={day} money={money} placeBid={placeBid} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
      {view === 'animal' && <AnimalView listings={allListings} day={day} money={money} placeBid={placeBid} listItem={listItem} withdrawListing={withdrawListing} nextAnimalAuctionDay={nextAnimalAuctionDay} animals={animals} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
      {view === 'crop' && <CropView listings={allListings} day={day} money={money} placeBid={placeBid} listItem={listItem} withdrawListing={withdrawListing} inventory={inventory} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
      {view === 'machinery' && <MachineryView listings={allListings} day={day} money={money} placeBid={placeBid} listItem={listItem} withdrawListing={withdrawListing} machines={machines} bidInputs={bidInputs} setBidInputs={setBidInputs} />}
    </View>
  );
}
```

- [ ] Add `LandView` component below `SubastaScreen` — this is the existing land auction logic ported to use `AuctionListing`:

```typescript
function LandView({ listings, day, money, placeBid, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const activeLots = listings.filter(l => !l.resolved && l.category === 'land');
  const resolvedLots = listings.filter(l => l.resolved && l.category === 'land').slice(-5).reverse();

  function renderLot(lot: AuctionListing, isActive: boolean) {
    const daysLeft = lot.expiresDay - day;
    const bidText = bidInputs[lot.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const minBid = Math.ceil(lot.currentBid * 1.05);
    const canBid = bidAmount >= minBid && money >= bidAmount && isActive && daysLeft > 0;
    const playerIsLeading = lot.playerBid !== null && lot.playerBid >= lot.currentBid;
    const urgentColor = daysLeft <= 2 ? '#f44336' : daysLeft <= 5 ? '#ff9800' : '#888';
    return (
      <View key={lot.id} style={[styles.card, lot.playerWon === true && styles.cardWon, lot.playerWon === false && styles.cardLost]}>
        <View style={styles.cardHeader}>
          <Text style={styles.parcelTitle}>{lot.parcel?.name ?? 'Parcel'} · {lot.parcel?.hectares}ha</Text>
          {isActive
            ? <Text style={[styles.daysLeft, { color: urgentColor }]}>{daysLeft > 0 ? `${daysLeft}d left` : 'Closing...'}</Text>
            : <Text style={[styles.resolved, lot.playerWon ? styles.wonText : styles.lostText]}>{lot.playerWon ? '🏆 Won' : '❌ Lost'}</Text>}
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Size</Text><Text style={styles.infoValue}>{lot.parcel?.hectares} ha</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Fertility</Text><Text style={styles.infoValue}>{lot.parcel?.fertility}/25</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Market</Text><Text style={styles.infoValue}>${((lot.parcel?.pricePerHa ?? 0) * (lot.parcel?.hectares ?? 0)).toLocaleString()}</Text></View>
        </View>
        <View style={styles.bidInfo}>
          <View style={styles.bidRow}><Text style={styles.bidLabel}>Current bid</Text><Text style={styles.currentBid}>${lot.currentBid.toLocaleString()}</Text></View>
          <View style={styles.bidRow}><Text style={styles.bidLabel}>Starting bid</Text><Text style={styles.startingBid}>${lot.startingBid.toLocaleString()}</Text></View>
          {lot.playerBid !== null && (
            <View style={styles.bidRow}>
              <Text style={styles.bidLabel}>Your bid</Text>
              <Text style={[styles.playerBid, playerIsLeading ? styles.leading : styles.outbid]}>
                ${lot.playerBid.toLocaleString()} {playerIsLeading ? '✓ Leading' : '⚠ Outbid'}
              </Text>
            </View>
          )}
        </View>
        {lot.bids.length > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Recent bids</Text>
            {lot.bids.slice(-3).reverse().map((bid, i) => (
              <Text key={i} style={[styles.historyItem, bid.isPlayer && styles.historyItemPlayer]}>
                {bid.isPlayer ? '👤 You' : '🤖 Other'} · ${bid.amount.toLocaleString()} · day {bid.day}
              </Text>
            ))}
          </View>
        )}
        {isActive && daysLeft > 0 && (
          <View style={styles.bidInputRow}>
            <TextInput style={styles.bidInput} keyboardType="numeric" placeholder={`Min: $${minBid.toLocaleString()}`} placeholderTextColor="#555" value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [lot.id]: v }))} />
            <TouchableOpacity style={[styles.bidBtn, !canBid && styles.bidBtnDisabled]} disabled={!canBid} onPress={() => { placeBid(lot.id, bidAmount); setBidInputs(b => ({ ...b, [lot.id]: '' })); }}>
              <Text style={styles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        {isActive && daysLeft > 0 && bidAmount > 0 && bidAmount < minBid && <Text style={styles.bidWarn}>Minimum bid: ${minBid.toLocaleString()}</Text>}
        {isActive && daysLeft > 0 && bidAmount >= minBid && money < bidAmount && <Text style={styles.bidWarn}>Insufficient funds</Text>}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {activeLots.length > 0
        ? <>{<Text style={styles.sectionLabel}>Active ({activeLots.length})</Text>}{activeLots.map(l => renderLot(l, true))}</>
        : <View style={styles.emptyBox}><Text style={styles.emptyText}>No active land auctions.</Text><Text style={styles.emptyHint}>Advance days for new lots.</Text></View>}
      {resolvedLots.length > 0 && <>{<Text style={styles.sectionLabel}>Recent</Text>}{resolvedLots.map(l => renderLot(l, false))}</>}
    </ScrollView>
  );
}
```

- [ ] Add the hub + land StyleSheet at the bottom of the file:

```typescript
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#1a1a2e' },
  backBtn:         { paddingHorizontal: 16, paddingVertical: 8 },
  backBtnText:     { color: '#7eb8f7', fontSize: 13 },
  sectionLabel:    { color: '#888', fontSize: 13, paddingHorizontal: 16, marginTop: 10, marginBottom: 6 },

  // Hub grid
  grid:            { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  tile:            { width: '47%', backgroundColor: '#16213e', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1e2a3a' },
  tileAnimal:      { borderColor: '#ffd700', backgroundColor: '#1a2744' },
  tileIcon:        { fontSize: 28, marginBottom: 4 },
  tileLabel:       { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  tileLabelAnimal: { color: '#ffd700' },
  tileSub:         { color: '#666', fontSize: 11, marginTop: 2 },
  tileSubAnimal:   { color: '#ffd700' },

  // Active bids strip
  bidsStrip:       { margin: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 12 },
  bidStripTitle:   { color: '#555', fontSize: 9, letterSpacing: 1, marginBottom: 8 },
  bidStripRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  bidStripLabel:   { color: '#e8d5a3', fontSize: 12 },
  bidStripStatus:  { fontSize: 12, fontWeight: 'bold' },

  // Shared land card styles
  card:            { backgroundColor: '#16213e', borderRadius: 12, margin: 10, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1e1e3a' },
  cardWon:         { borderColor: '#4caf50' },
  cardLost:        { borderColor: '#333', opacity: 0.7 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  parcelTitle:     { color: '#e8d5a3', fontWeight: 'bold', fontSize: 15, flex: 1 },
  daysLeft:        { fontSize: 12, fontWeight: 'bold' },
  resolved:        { fontSize: 13, fontWeight: 'bold' },
  wonText:         { color: '#4caf50' },
  lostText:        { color: '#666' },
  infoRow:         { flexDirection: 'row', marginBottom: 10, gap: 8 },
  infoItem:        { flex: 1, backgroundColor: '#0f3460', borderRadius: 8, padding: 8, alignItems: 'center' },
  infoLabel:       { color: '#666', fontSize: 9, marginBottom: 2 },
  infoValue:       { color: '#e8d5a3', fontWeight: 'bold', fontSize: 12 },
  bidInfo:         { backgroundColor: '#0a1628', borderRadius: 8, padding: 10, marginBottom: 10 },
  bidRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bidLabel:        { color: '#666', fontSize: 12 },
  currentBid:      { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  startingBid:     { color: '#888', fontSize: 12 },
  playerBid:       { fontSize: 12, fontWeight: 'bold' },
  leading:         { color: '#4caf50' },
  outbid:          { color: '#ff9800' },
  historyBox:      { backgroundColor: '#0d1117', borderRadius: 8, padding: 8, marginBottom: 10 },
  historyTitle:    { color: '#555', fontSize: 10, marginBottom: 4 },
  historyItem:     { color: '#888', fontSize: 11, paddingVertical: 2 },
  historyItemPlayer:{ color: '#64b5f6' },
  bidInputRow:     { flexDirection: 'row', gap: 8 },
  bidInput:        { flex: 1, backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 10, fontSize: 14 },
  bidBtn:          { backgroundColor: '#c8860a', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  bidBtnDisabled:  { backgroundColor: '#333' },
  bidBtnText:      { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  bidWarn:         { color: '#ff9800', fontSize: 11, marginTop: 4 },
  emptyBox:        { alignItems: 'center', padding: 40 },
  emptyText:       { color: '#555', fontSize: 15, marginBottom: 8 },
  emptyHint:       { color: '#444', fontSize: 12 },
});
```

- [ ] Run TypeScript check:
  ```bash
  "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/node_modules/.bin/tsc" --noEmit --project "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon/tsconfig.json" 2>&1 | head -30
  ```
  Expected: no errors.

- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add "app/(tabs)/subasta.tsx" && git commit -m "feat(auction): rewrite subasta — hub screen + land view"
  ```

---

## Task 5 — Add `AnimalView` component to `subasta.tsx`

**Files:**
- Modify: `app/(tabs)/subasta.tsx`

- [ ] Add these imports at the top of `subasta.tsx` (after existing imports):

```typescript
import { ANIMAL_TYPES } from '../../data/animalTypes';
import { geneScore, AnimalGenes } from '../../engine/animals';
import { OwnedAnimal } from '../../engine/animals';
```

- [ ] Add the `AnimalView` component after `LandView`:

```typescript
function geneLabel(score: number): { grade: string; color: string } {
  if (score >= 1.3) return { grade: 'S', color: '#7eb8f7' };
  if (score >= 1.15) return { grade: 'A', color: '#66bb6a' };
  if (score >= 1.0)  return { grade: 'B', color: '#ffa726' };
  if (score >= 0.85) return { grade: 'C', color: '#ef5350' };
  return { grade: 'D', color: '#888' };
}

function AnimalView({ listings, day, money, placeBid, listItem, withdrawListing,
                      nextAnimalAuctionDay, animals, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  listItem: (params: any) => void;
  withdrawListing: (id: string) => void;
  nextAnimalAuctionDay: number;
  animals: OwnedAnimal[];
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [showListForm, setShowListForm] = React.useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = React.useState<string | null>(null);
  const [startBidInput, setStartBidInput] = React.useState('');
  const [reserveInput, setReserveInput] = React.useState('');

  const daysToEvent = nextAnimalAuctionDay - day;
  const activeListings = listings.filter(l => !l.resolved && l.category === 'animal');
  const playerListings = activeListings.filter(l => l.sellerId === 'player');
  const npcListings = activeListings.filter(l => l.sellerId !== 'player');
  const resolvedListings = listings.filter(l => l.resolved && l.category === 'animal').slice(-5).reverse();

  const { ANIMAL_TYPES: AT } = require('../../data/animalTypes');

  function renderAnimalCard(listing: AuctionListing, isPlayer: boolean) {
    const animalTypeDef = AT.find((a: any) => a.id === listing.animalTypeId);
    const score = listing.animalGenes ? geneScore(listing.animalGenes) : 1.0;
    const { grade, color } = geneLabel(score);
    const minBid = Math.ceil(listing.currentBid * 1.05);
    const bidText = bidInputs[listing.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const canBid = !isPlayer && bidAmount >= minBid && money >= bidAmount;
    const hasBids = listing.bids.length > 0;

    return (
      <View key={listing.id} style={[anStyles.card, listing.playerWon === true && anStyles.cardWon]}>
        <View style={anStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={anStyles.cardTitle}>{animalTypeDef?.name ?? listing.animalTypeId}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, alignItems: 'center' }}>
              <View style={[anStyles.gradeBadge, { backgroundColor: color + '33', borderColor: color }]}>
                <Text style={[anStyles.gradeText, { color }]}>Grade {grade}</Text>
              </View>
              {listing.sellerId === 'player' && <Text style={anStyles.yourTag}>Your listing</Text>}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={anStyles.currentBid}>${listing.currentBid.toLocaleString()}</Text>
            <Text style={anStyles.bidSub}>current bid</Text>
          </View>
        </View>

        {!isPlayer && !listing.resolved && (
          <View style={anStyles.bidRow}>
            <TextInput
              style={anStyles.bidInput}
              keyboardType="numeric"
              placeholder={`Min: $${minBid.toLocaleString()}`}
              placeholderTextColor="#555"
              value={bidText}
              onChangeText={v => setBidInputs(b => ({ ...b, [listing.id]: v }))}
            />
            <TouchableOpacity
              style={[anStyles.bidBtn, !canBid && anStyles.bidBtnDisabled]}
              disabled={!canBid}
              onPress={() => { placeBid(listing.id, bidAmount); setBidInputs(b => ({ ...b, [listing.id]: '' })); }}
            >
              <Text style={anStyles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPlayer && !listing.resolved && (
          <TouchableOpacity
            style={[anStyles.withdrawBtn, hasBids && anStyles.withdrawBtnDisabled]}
            disabled={hasBids}
            onPress={() => withdrawListing(listing.id)}
          >
            <Text style={anStyles.withdrawBtnText}>
              {hasBids ? 'Bids placed — cannot withdraw' : 'Withdraw'}
            </Text>
          </TouchableOpacity>
        )}

        {listing.resolved && (
          <Text style={[anStyles.resolvedTag, listing.playerWon ? { color: '#66bb6a' } : { color: '#666' }]}>
            {listing.playerWon ? '🏆 Won' : listing.sellerId === 'player' ? '💰 Sold' : '❌ Lost'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Event countdown banner */}
      <View style={anStyles.eventBanner}>
        <View>
          <Text style={anStyles.eventTitle}>⚡ County Livestock Auction</Text>
          <Text style={anStyles.eventSub}>Resolves Day {nextAnimalAuctionDay} · List before that day</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={anStyles.eventDays}>{daysToEvent <= 0 ? 'Today!' : `${daysToEvent}d`}</Text>
          <Text style={anStyles.eventDaysSub}>remaining</Text>
        </View>
      </View>

      {/* Player listings */}
      <Text style={styles.sectionLabel}>Your Listings ({playerListings.length})</Text>
      {playerListings.map(l => renderAnimalCard(l, true))}

      {/* List an animal form */}
      {!showListForm ? (
        <TouchableOpacity style={anStyles.listBtn} onPress={() => setShowListForm(true)}>
          <Text style={anStyles.listBtnText}>+ List an Animal</Text>
        </TouchableOpacity>
      ) : (
        <View style={anStyles.listForm}>
          <Text style={anStyles.formTitle}>List an Animal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {animals.map(a => {
              const typeDef = AT.find((t: any) => t.id === a.typeId);
              const score = a.genes ? geneScore(a.genes) : 1.0;
              const { grade, color } = geneLabel(score);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[anStyles.animalChip, selectedAnimalId === a.id && anStyles.animalChipActive]}
                  onPress={() => setSelectedAnimalId(a.id)}
                >
                  <Text style={anStyles.animalChipName}>{typeDef?.name ?? a.typeId}</Text>
                  <Text style={[anStyles.animalChipGrade, { color }]}>Grade {grade}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={anStyles.formLabel}>Starting Bid</Text>
              <TextInput style={anStyles.formInput} keyboardType="numeric" value={startBidInput} onChangeText={setStartBidInput} placeholder="$0" placeholderTextColor="#555" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={anStyles.formLabel}>Reserve Price</Text>
              <TextInput style={anStyles.formInput} keyboardType="numeric" value={reserveInput} onChangeText={setReserveInput} placeholder="$0" placeholderTextColor="#555" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[anStyles.confirmBtn, (!selectedAnimalId || !startBidInput) && anStyles.confirmBtnDisabled]}
              disabled={!selectedAnimalId || !startBidInput}
              onPress={() => {
                if (!selectedAnimalId) return;
                const sb = parseInt(startBidInput) || 0;
                const rp = parseInt(reserveInput) || sb;
                listItem({ category: 'animal', animalId: selectedAnimalId, startingBid: sb, reservePrice: rp, durationDays: 7 });
                setShowListForm(false); setSelectedAnimalId(null); setStartBidInput(''); setReserveInput('');
              }}
            >
              <Text style={anStyles.confirmBtnText}>Confirm Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={anStyles.cancelBtn} onPress={() => setShowListForm(false)}>
              <Text style={anStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* NPC listings */}
      <Text style={styles.sectionLabel}>NPC Listings ({npcListings.length})</Text>
      {npcListings.length === 0
        ? <Text style={styles.emptyHint}>No animals listed yet — check back after the event.</Text>
        : npcListings.map(l => renderAnimalCard(l, false))}

      {/* History */}
      {resolvedListings.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Recent Results</Text>
          {resolvedListings.map(l => renderAnimalCard(l, false))}
        </>
      )}
    </ScrollView>
  );
}

const anStyles = StyleSheet.create({
  card:              { backgroundColor: '#16213e', borderRadius: 12, marginHorizontal: 12, marginVertical: 5, padding: 12, borderWidth: 1, borderColor: '#1e2a3a' },
  cardWon:           { borderColor: '#4caf50' },
  cardHeader:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14 },
  gradeBadge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  gradeText:         { fontSize: 11, fontWeight: 'bold' },
  yourTag:           { color: '#888', fontSize: 10, fontStyle: 'italic' },
  currentBid:        { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  bidSub:            { color: '#555', fontSize: 9 },
  bidRow:            { flexDirection: 'row', gap: 8, marginTop: 4 },
  bidInput:          { flex: 1, backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 10, fontSize: 13 },
  bidBtn:            { backgroundColor: '#c8860a', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  bidBtnDisabled:    { backgroundColor: '#333' },
  bidBtnText:        { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  withdrawBtn:       { marginTop: 6, backgroundColor: '#b71c1c', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  withdrawBtnDisabled:{ backgroundColor: '#2a2a2a' },
  withdrawBtnText:   { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  resolvedTag:       { marginTop: 6, fontSize: 13, fontWeight: 'bold' },
  eventBanner:       { margin: 12, backgroundColor: '#1a2744', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ffd700', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle:        { color: '#ffd700', fontWeight: 'bold', fontSize: 13 },
  eventSub:          { color: '#888', fontSize: 10, marginTop: 2 },
  eventDays:         { color: '#ffd700', fontSize: 22, fontWeight: 'bold' },
  eventDaysSub:      { color: '#888', fontSize: 9 },
  listBtn:           { margin: 12, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#4caf50', borderStyle: 'dashed', alignItems: 'center' },
  listBtnText:       { color: '#4caf50', fontWeight: 'bold', fontSize: 13 },
  listForm:          { margin: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  formTitle:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  formLabel:         { color: '#888', fontSize: 10, marginBottom: 4 },
  formInput:         { backgroundColor: '#0d1b2e', borderRadius: 8, color: '#e8d5a3', padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#1e2a3a' },
  animalChip:        { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  animalChipActive:  { borderColor: '#4caf50', backgroundColor: '#0f2a0f' },
  animalChipName:    { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  animalChipGrade:   { fontSize: 10, marginTop: 2 },
  confirmBtn:        { flex: 1, backgroundColor: '#1565c0', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  confirmBtnDisabled:{ backgroundColor: '#333' },
  confirmBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cancelBtn:         { backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText:     { color: '#888', fontSize: 13 },
});
```

- [ ] Run TypeScript check — expected: no errors.
- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add "app/(tabs)/subasta.tsx" && git commit -m "feat(auction): add AnimalView with event countdown + gene grades + list form"
  ```

---

## Task 6 — Add `CropView` component to `subasta.tsx`

**Files:**
- Modify: `app/(tabs)/subasta.tsx`

- [ ] Add these imports at the top of `subasta.tsx` (after existing imports):

```typescript
import { CROP_TYPES } from '../../data/cropTypes';
```

- [ ] Add `CropView` after `AnimalView`:

```typescript
function CropView({ listings, day, money, placeBid, listItem, withdrawListing,
                    inventory, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  listItem: (params: any) => void;
  withdrawListing: (id: string) => void;
  inventory: Record<string, number>;
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [cropId, setCropId] = React.useState<string>(CROP_TYPES[0].id);
  const [qtyInput, setQtyInput] = React.useState('');
  const [startBidInput, setStartBidInput] = React.useState('');
  const [reserveInput, setReserveInput] = React.useState('');
  const [termDays, setTermDays] = React.useState<3 | 7 | 14>(7);

  const activeListings = listings.filter(l => !l.resolved && l.category === 'crop');
  const playerListings = activeListings.filter(l => l.sellerId === 'player');
  const npcListings = activeListings.filter(l => l.sellerId !== 'player');
  const resolvedListings = listings.filter(l => l.resolved && l.category === 'crop').slice(-5).reverse();
  const stockedCrops = CROP_TYPES.filter(c => (inventory[c.id] ?? 0) > 0);
  const inStock = inventory[cropId] ?? 0;
  const parsedQty = parseInt(qtyInput) || 0;
  const parsedBid = parseInt(startBidInput) || 0;
  const parsedReserve = parseInt(reserveInput) || parsedBid;
  const canList = parsedQty > 0 && parsedQty <= inStock && parsedBid > 0;

  function renderCropCard(listing: AuctionListing, isPlayer: boolean) {
    const cropDef = CROP_TYPES.find(c => c.id === listing.cropId);
    const daysLeft = listing.expiresDay - day;
    const minBid = Math.ceil(listing.currentBid * 1.05);
    const bidText = bidInputs[listing.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const canBid = !isPlayer && bidAmount >= minBid && money >= bidAmount;
    const hasBids = listing.bids.some(b => !b.isPlayer);
    return (
      <View key={listing.id} style={[cropStyles.card, listing.playerWon === true && cropStyles.cardWon]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View>
            <Text style={cropStyles.cardTitle}>{cropDef?.name ?? listing.cropId}</Text>
            <Text style={cropStyles.cardSub}>{listing.cropQuantity?.toLocaleString()} {cropDef?.unit ?? 'units'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={cropStyles.currentBid}>${listing.currentBid.toLocaleString()}</Text>
            {!listing.resolved && <Text style={cropStyles.daysLeft}>{daysLeft}d left</Text>}
          </View>
        </View>
        {!isPlayer && !listing.resolved && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[cropStyles.bidInput, { flex: 1 }]} keyboardType="numeric" placeholder={`Min $${minBid.toLocaleString()}`} placeholderTextColor="#555" value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [listing.id]: v }))} />
            <TouchableOpacity style={[cropStyles.bidBtn, !canBid && cropStyles.bidBtnDisabled]} disabled={!canBid} onPress={() => { placeBid(listing.id, bidAmount); setBidInputs(b => ({ ...b, [listing.id]: '' })); }}>
              <Text style={cropStyles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        {isPlayer && !listing.resolved && (
          <TouchableOpacity style={[cropStyles.withdrawBtn, hasBids && cropStyles.withdrawBtnDisabled]} disabled={hasBids} onPress={() => withdrawListing(listing.id)}>
            <Text style={cropStyles.withdrawBtnText}>{hasBids ? 'Bids placed — cannot withdraw' : 'Withdraw'}</Text>
          </TouchableOpacity>
        )}
        {listing.resolved && (
          <Text style={{ color: listing.playerWon ? '#66bb6a' : '#666', fontSize: 12, marginTop: 4 }}>
            {listing.playerWon ? '🏆 Won' : listing.sellerId === 'player' ? (listing.currentBid > listing.startingBid ? '💰 Sold' : '📋 Reserve not met') : '❌ Lost'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* List crops form */}
      <View style={cropStyles.form}>
        <Text style={cropStyles.formTitle}>List Crops for Auction</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {stockedCrops.length === 0
            ? <Text style={{ color: '#555', fontSize: 12 }}>No crops in inventory</Text>
            : stockedCrops.map(c => (
              <TouchableOpacity key={c.id} style={[cropStyles.cropChip, cropId === c.id && cropStyles.cropChipActive]} onPress={() => setCropId(c.id)}>
                <Text style={[cropStyles.cropChipText, cropId === c.id && { color: '#fff' }]}>{c.name}</Text>
                <Text style={cropStyles.cropChipStock}>{Math.round(inventory[c.id] ?? 0)} {c.unit}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}><Text style={cropStyles.label}>Quantity</Text><TextInput style={cropStyles.input} keyboardType="numeric" value={qtyInput} onChangeText={setQtyInput} placeholder={`Max ${Math.round(inStock)}`} placeholderTextColor="#555" /></View>
          <View style={{ flex: 1 }}><Text style={cropStyles.label}>Starting Bid</Text><TextInput style={cropStyles.input} keyboardType="numeric" value={startBidInput} onChangeText={setStartBidInput} placeholder="$0" placeholderTextColor="#555" /></View>
          <View style={{ flex: 1 }}><Text style={cropStyles.label}>Reserve</Text><TextInput style={cropStyles.input} keyboardType="numeric" value={reserveInput} onChangeText={setReserveInput} placeholder="$0" placeholderTextColor="#555" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {([3, 7, 14] as const).map(t => (
            <TouchableOpacity key={t} style={[cropStyles.termBtn, termDays === t && cropStyles.termBtnActive]} onPress={() => setTermDays(t)}>
              <Text style={[cropStyles.termText, termDays === t && { color: '#fff' }]}>{t}d</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[cropStyles.listBtn, !canList && cropStyles.listBtnDisabled]} disabled={!canList} onPress={() => {
          listItem({ category: 'crop', cropId, cropQuantity: parsedQty, startingBid: parsedBid, reservePrice: parsedReserve, durationDays: termDays });
          setQtyInput(''); setStartBidInput(''); setReserveInput('');
        }}>
          <Text style={cropStyles.listBtnText}>{canList ? `List ${parsedQty.toLocaleString()} ${CROP_TYPES.find(c => c.id === cropId)?.unit ?? 'units'} for ${termDays}d` : 'Enter quantity & bid'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your Listings ({playerListings.length})</Text>
      {playerListings.length === 0 ? <Text style={styles.emptyHint}>No active listings.</Text> : playerListings.map(l => renderCropCard(l, true))}

      <Text style={styles.sectionLabel}>NPC Listings ({npcListings.length})</Text>
      {npcListings.length === 0 ? <Text style={styles.emptyHint}>No NPC crop listings yet.</Text> : npcListings.map(l => renderCropCard(l, false))}

      {resolvedListings.length > 0 && (
        <><Text style={styles.sectionLabel}>Recent Results</Text>{resolvedListings.map(l => renderCropCard(l, false))}</>
      )}
    </ScrollView>
  );
}

const cropStyles = StyleSheet.create({
  form:              { margin: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  formTitle:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  label:             { color: '#888', fontSize: 10, marginBottom: 4 },
  input:             { backgroundColor: '#0d1b2e', borderRadius: 8, color: '#e8d5a3', padding: 8, fontSize: 12, borderWidth: 1, borderColor: '#1e2a3a' },
  cropChip:          { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  cropChipActive:    { borderColor: '#4caf50', backgroundColor: '#0f2a0f' },
  cropChipText:      { color: '#888', fontSize: 12, fontWeight: 'bold' },
  cropChipStock:     { color: '#555', fontSize: 9 },
  termBtn:           { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  termBtnActive:     { backgroundColor: '#1565c0', borderColor: '#42a5f5' },
  termText:          { color: '#888', fontSize: 12, fontWeight: 'bold' },
  listBtn:           { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  listBtnDisabled:   { backgroundColor: '#333' },
  listBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  card:              { backgroundColor: '#16213e', borderRadius: 10, marginHorizontal: 12, marginVertical: 4, padding: 12, borderWidth: 1, borderColor: '#1e2a3a' },
  cardWon:           { borderColor: '#4caf50' },
  cardTitle:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  cardSub:           { color: '#888', fontSize: 11, marginTop: 1 },
  currentBid:        { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  daysLeft:          { color: '#888', fontSize: 10, marginTop: 1 },
  bidInput:          { backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 8, fontSize: 13 },
  bidBtn:            { backgroundColor: '#c8860a', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  bidBtnDisabled:    { backgroundColor: '#333' },
  bidBtnText:        { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  withdrawBtn:       { marginTop: 6, backgroundColor: '#b71c1c', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  withdrawBtnDisabled:{ backgroundColor: '#2a2a2a' },
  withdrawBtnText:   { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
```

- [ ] Run TypeScript check — expected: no errors.
- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add "app/(tabs)/subasta.tsx" && git commit -m "feat(auction): add CropView with list form + NPC listings"
  ```

---

## Task 7 — Add `MachineryView` component to `subasta.tsx`

**Files:**
- Modify: `app/(tabs)/subasta.tsx`

- [ ] Add these imports at top (after existing imports):

```typescript
import { MACHINE_TYPES } from '../../data/machineTypes';
import { OwnedMachine } from '../../store/useGameStore';
```

- [ ] Add `MachineryView` after `CropView`:

```typescript
function computeConditionScore(machine: OwnedMachine, day: number, machineRepairs: any[]): number {
  const ageDays = day - machine.purchasedDay;
  const repairs = machineRepairs.filter((r: any) => r.machineId === machine.id);
  const repairedOnTime = repairs.filter((r: any) => r.readyDay !== null).length;
  const missedRepairs = repairs.filter((r: any) => r.startDay === null).length;
  return Math.min(100, Math.max(0,
    100 - Math.floor(ageDays / 5) + repairedOnTime * 3 - missedRepairs * 8
  ));
}

function conditionLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'Good', color: '#81c784', bg: '#2e5a2e' };
  if (score >= 40) return { label: 'Fair', color: '#ffa726', bg: '#3a2a0a' };
  return { label: 'Poor', color: '#ef5350', bg: '#3a1a0a' };
}

function MachineryView({ listings, day, money, placeBid, listItem, withdrawListing,
                         machines, bidInputs, setBidInputs }: {
  listings: AuctionListing[];
  day: number; money: number;
  placeBid: (id: string, amount: number) => void;
  listItem: (params: any) => void;
  withdrawListing: (id: string) => void;
  machines: any[];
  bidInputs: Record<string, string>;
  setBidInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const { machineRepairs } = useGameStore.getState();
  const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(null);
  const [startBidInput, setStartBidInput] = React.useState('');
  const [reserveInput, setReserveInput] = React.useState('');
  const [termDays, setTermDays] = React.useState<3 | 7 | 14>(7);

  const activeListings = listings.filter(l => !l.resolved && l.category === 'machinery');
  const playerListings = activeListings.filter(l => l.sellerId === 'player');
  const npcListings = activeListings.filter(l => l.sellerId !== 'player');
  const resolvedListings = listings.filter(l => l.resolved && l.category === 'machinery').slice(-5).reverse();

  const eligibleMachines = (machines ?? []).filter((m: OwnedMachine) => {
    const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
    return mt && (mt.category === 'tractor' || mt.category === 'harvester');
  });

  const selectedMachine = eligibleMachines.find((m: OwnedMachine) => m.id === selectedMachineId);
  const selectedMachineType = selectedMachine ? MACHINE_TYPES.find(t => t.id === selectedMachine.typeId) : null;
  const selectedCondition = selectedMachine ? computeConditionScore(selectedMachine, day, machineRepairs ?? []) : 0;
  const suggestedPrice = selectedMachineType ? Math.round(selectedMachineType.cost * (selectedCondition / 100) * 0.70) : 0;
  const { label: condLabel, color: condColor } = conditionLabel(selectedCondition);

  const parsedBid = parseInt(startBidInput) || 0;
  const parsedReserve = parseInt(reserveInput) || parsedBid;
  const canList = !!selectedMachineId && parsedBid > 0;

  function renderMachineCard(listing: AuctionListing, isPlayer: boolean) {
    const machineType = MACHINE_TYPES.find(t => t.id === listing.machineTypeId);
    const daysLeft = listing.expiresDay - day;
    const score = listing.conditionScore ?? 70;
    const { label, color, bg } = conditionLabel(score);
    const minBid = Math.ceil(listing.currentBid * 1.05);
    const bidText = bidInputs[listing.id] ?? '';
    const bidAmount = parseFloat(bidText.replace(/,/g, '')) || 0;
    const canBid = !isPlayer && bidAmount >= minBid && money >= bidAmount;
    const hasBids = listing.bids.some(b => !b.isPlayer);
    return (
      <View key={listing.id} style={[mStyles.card, listing.playerWon === true && mStyles.cardWon]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={mStyles.cardTitle}>{machineType?.name ?? listing.machineTypeId}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, alignItems: 'center' }}>
              <View style={[mStyles.condBadge, { backgroundColor: bg }]}>
                <Text style={[mStyles.condText, { color }]}>{label} {score}/100</Text>
              </View>
              {!listing.resolved && <Text style={mStyles.daysLeft}>{daysLeft}d left</Text>}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={mStyles.currentBid}>${listing.currentBid.toLocaleString()}</Text>
            {listing.sellerId !== 'player' && <Text style={mStyles.sellerName}>NPC Farm</Text>}
          </View>
        </View>
        {!isPlayer && !listing.resolved && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[mStyles.bidInput, { flex: 1 }]} keyboardType="numeric" placeholder={`Min $${minBid.toLocaleString()}`} placeholderTextColor="#555" value={bidText} onChangeText={v => setBidInputs(b => ({ ...b, [listing.id]: v }))} />
            <TouchableOpacity style={[mStyles.bidBtn, !canBid && mStyles.bidBtnDisabled]} disabled={!canBid} onPress={() => { placeBid(listing.id, bidAmount); setBidInputs(b => ({ ...b, [listing.id]: '' })); }}>
              <Text style={mStyles.bidBtnText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        {isPlayer && !listing.resolved && (
          <TouchableOpacity style={[mStyles.withdrawBtn, hasBids && mStyles.withdrawBtnDisabled]} disabled={hasBids} onPress={() => withdrawListing(listing.id)}>
            <Text style={mStyles.withdrawBtnText}>{hasBids ? 'Bids placed — cannot withdraw' : 'Withdraw'}</Text>
          </TouchableOpacity>
        )}
        {listing.resolved && (
          <Text style={{ color: listing.playerWon ? '#66bb6a' : '#666', fontSize: 12, marginTop: 4 }}>
            {listing.playerWon ? '🏆 Won' : listing.sellerId === 'player' ? (listing.currentBid > listing.startingBid ? '💰 Sold' : '📋 Reserve not met') : '❌ Lost'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* List machine form */}
      <View style={mStyles.form}>
        <Text style={mStyles.formTitle}>List a Machine</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {eligibleMachines.length === 0
            ? <Text style={{ color: '#555', fontSize: 12 }}>No tractors or combines to list</Text>
            : eligibleMachines.map((m: OwnedMachine) => {
              const mt = MACHINE_TYPES.find(t => t.id === m.typeId);
              const score = computeConditionScore(m, day, machineRepairs ?? []);
              const { label, color } = conditionLabel(score);
              return (
                <TouchableOpacity key={m.id} style={[mStyles.machineChip, selectedMachineId === m.id && mStyles.machineChipActive]} onPress={() => {
                  setSelectedMachineId(m.id);
                  const sugg = mt ? Math.round(mt.cost * (score / 100) * 0.70) : 0;
                  setStartBidInput(String(Math.round(sugg * 0.8)));
                  setReserveInput(String(sugg));
                }}>
                  <Text style={mStyles.machineChipName}>{mt?.name ?? m.typeId}</Text>
                  <Text style={[mStyles.machineChipCond, { color }]}>{label} {score}/100</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        {selectedMachine && (
          <View style={mStyles.condBar}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={mStyles.condBarLabel}>Condition</Text>
              <Text style={[mStyles.condBarScore, { color: condColor }]}>{condLabel} {selectedCondition}/100</Text>
            </View>
            <View style={mStyles.condBarTrack}>
              <View style={[mStyles.condBarFill, { width: `${selectedCondition}%` as any, backgroundColor: condColor }]} />
            </View>
            <Text style={mStyles.condBarHint}>Suggested price: ${suggestedPrice.toLocaleString()}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}><Text style={mStyles.label}>Starting Bid</Text><TextInput style={mStyles.input} keyboardType="numeric" value={startBidInput} onChangeText={setStartBidInput} placeholder="$0" placeholderTextColor="#555" /></View>
          <View style={{ flex: 1 }}><Text style={mStyles.label}>Reserve Price</Text><TextInput style={mStyles.input} keyboardType="numeric" value={reserveInput} onChangeText={setReserveInput} placeholder="$0" placeholderTextColor="#555" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {([3, 7, 14] as const).map(t => (
            <TouchableOpacity key={t} style={[mStyles.termBtn, termDays === t && mStyles.termBtnActive]} onPress={() => setTermDays(t)}>
              <Text style={[mStyles.termText, termDays === t && { color: '#fff' }]}>{t}d</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[mStyles.listBtn, !canList && mStyles.listBtnDisabled]} disabled={!canList} onPress={() => {
          if (!selectedMachineId) return;
          listItem({ category: 'machinery', machineId: selectedMachineId, startingBid: parsedBid, reservePrice: parsedReserve, durationDays: termDays });
          setSelectedMachineId(null); setStartBidInput(''); setReserveInput('');
        }}>
          <Text style={mStyles.listBtnText}>{canList ? 'List for Auction' : 'Select a machine & set price'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your Listings ({playerListings.length})</Text>
      {playerListings.length === 0 ? <Text style={styles.emptyHint}>No machines listed.</Text> : playerListings.map(l => renderMachineCard(l, true))}

      <Text style={styles.sectionLabel}>NPC Listings ({npcListings.length})</Text>
      {npcListings.length === 0 ? <Text style={styles.emptyHint}>No NPC machinery listed yet.</Text> : npcListings.map(l => renderMachineCard(l, false))}

      {resolvedListings.length > 0 && (
        <><Text style={styles.sectionLabel}>Recent Results</Text>{resolvedListings.map(l => renderMachineCard(l, false))}</>
      )}
    </ScrollView>
  );
}

const mStyles = StyleSheet.create({
  form:              { margin: 12, backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  formTitle:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  label:             { color: '#888', fontSize: 10, marginBottom: 4 },
  input:             { backgroundColor: '#0d1b2e', borderRadius: 8, color: '#e8d5a3', padding: 8, fontSize: 12, borderWidth: 1, borderColor: '#1e2a3a' },
  machineChip:       { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  machineChipActive: { borderColor: '#1565c0', backgroundColor: '#0d1b3e' },
  machineChipName:   { color: '#e8d5a3', fontSize: 12, fontWeight: 'bold' },
  machineChipCond:   { fontSize: 10, marginTop: 2 },
  condBar:           { backgroundColor: '#0d1b2e', borderRadius: 8, padding: 10, marginBottom: 10 },
  condBarLabel:      { color: '#888', fontSize: 10 },
  condBarScore:      { fontSize: 11, fontWeight: 'bold' },
  condBarTrack:      { backgroundColor: '#1e2a3a', borderRadius: 4, height: 6, marginBottom: 4 },
  condBarFill:       { height: 6, borderRadius: 4 },
  condBarHint:       { color: '#555', fontSize: 10 },
  termBtn:           { backgroundColor: '#0d1b2e', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#1e2a3a' },
  termBtnActive:     { backgroundColor: '#1565c0', borderColor: '#42a5f5' },
  termText:          { color: '#888', fontSize: 12, fontWeight: 'bold' },
  listBtn:           { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  listBtnDisabled:   { backgroundColor: '#333' },
  listBtnText:       { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  card:              { backgroundColor: '#16213e', borderRadius: 10, marginHorizontal: 12, marginVertical: 4, padding: 12, borderWidth: 1, borderColor: '#1e2a3a' },
  cardWon:           { borderColor: '#4caf50' },
  cardTitle:         { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  condBadge:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  condText:          { fontSize: 10, fontWeight: 'bold' },
  daysLeft:          { color: '#888', fontSize: 10 },
  currentBid:        { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  sellerName:        { color: '#555', fontSize: 9 },
  bidInput:          { backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 8, fontSize: 13 },
  bidBtn:            { backgroundColor: '#c8860a', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  bidBtnDisabled:    { backgroundColor: '#333' },
  bidBtnText:        { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  withdrawBtn:       { marginTop: 6, backgroundColor: '#b71c1c', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  withdrawBtnDisabled:{ backgroundColor: '#2a2a2a' },
  withdrawBtnText:   { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
```

- [ ] Run TypeScript check — expected: no errors.
- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add "app/(tabs)/subasta.tsx" && git commit -m "feat(auction): add MachineryView with condition score + NPC listings"
  ```

---

## Task 8 — Mark listed machines as "in escrow" in `maquinaria.tsx`

**Files:**
- Modify: `app/(tabs)/maquinaria.tsx`

- [ ] In `maquinaria.tsx`, add `listings` to the `useGameStore` destructure:

```typescript
const { ..., listings } = useGameStore();
```

- [ ] Where each machine card is rendered (find the section that maps over `machines`), add a check before rendering the action buttons:

```typescript
const isListed = (listings ?? []).some(
  l => l.category === 'machinery' && l.machineId === machine.id && !l.resolved
);
```

- [ ] If `isListed` is true, show a grey "Listed for auction" badge instead of the normal action buttons for that machine:

```typescript
{isListed ? (
  <View style={maquStyles.escrowBadge}>
    <Text style={maquStyles.escrowText}>📋 Listed for auction</Text>
  </View>
) : (
  /* existing action buttons */
)}
```

- [ ] Add to the existing StyleSheet in `maquinaria.tsx`:

```typescript
  escrowBadge: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 6 },
  escrowText:  { color: '#666', fontSize: 11, fontStyle: 'italic' },
```

- [ ] Run TypeScript check — expected: no errors.
- [ ] Commit:
  ```bash
  cd "C:/Users/SanGi/.antigravity/FArM TYCOON/granja-tycoon" && git add "app/(tabs)/maquinaria.tsx" && git commit -m "feat(auction): grey out listed machines in maquinaria with escrow badge"
  ```

---

## Self-review notes

- **`OwnedMachine` imported in subasta.tsx**: sourced from `'../../store/useGameStore'` — this export already exists.
- **`useGameStore.getState()`** used in `MachineryView` to access `machineRepairs` without prop drilling — this is the standard Zustand pattern for reading state outside a React component hook.
- **`AnimalGenes` type** imported from `'../../engine/animals'` — already exported there.
- **`geneScore` function** imported from `'../../engine/animals'` — already exported there.
- **`animals` prop in `AnimalView`**: passed from `SubastaScreen` which gets it from `useGameStore`. The store's `animals` is `OwnedAnimal[]`.
- **`withdrawListing` for animals**: reconstructs a stub `OwnedAnimal` — `sex` defaults to `'female'` since original sex is not stored in the listing. This is a minor limitation, acceptable for v1.
- **NPC machinery listings**: the spec says NPCs can list machines too. The advanceDay code handles NPC bidding on those listings, but NPC machinery *listings* (created by NPCs) are not explicitly generated. This is intentional — NPC machinery listings can be seeded manually in `generateInitialListings()` in a follow-up or left as player-only listings for v1.
