# Auction House Design Spec

**Date:** 2026-04-03
**Feature:** Unified Auction House (replaces `app/(tabs)/subasta.tsx`)
**Status:** Approved for implementation

---

## Goal

Replace the single-purpose land auction tab with a unified four-category auction house covering land parcels, animals, crops, and used machinery. Players act as both buyers and sellers. NPCs compete in all categories.

---

## Architecture

### New interfaces (store/useGameStore.ts)

```typescript
export type AuctionCategory = 'land' | 'animal' | 'crop' | 'machinery';

export interface AuctionListing {
  id: string;
  category: AuctionCategory;
  sellerId: 'player' | string;       // 'player' or NPC farm id
  // Payload — only the relevant field is set
  parcelId?: string;                  // category: 'land'
  animalId?: string;                  // category: 'animal' (player-owned)
  animalTypeId?: string;              // category: 'animal' (NPC-generated)
  animalGenes?: AnimalGenes;          // category: 'animal'
  cropId?: string;                    // category: 'crop'
  cropQuantity?: number;              // category: 'crop'
  machineId?: string;                 // category: 'machinery' (player-owned)
  machineTypeId?: string;             // category: 'machinery' (NPC-generated)
  conditionScore?: number;            // category: 'machinery' (0–100)
  // Auction terms
  startingBid: number;
  reservePrice: number;               // hidden from bidders; 0 = no reserve
  currentBid: number;
  bids: AuctionBid[];
  playerBid: number | null;
  createdDay: number;
  expiresDay: number;
  resolved: boolean;
  playerWon: boolean | null;
}
```

The existing `AuctionLot` interface (land only) is **replaced** by `AuctionListing` with `category: 'land'`. Migration handled in `makeInitialState` and `partialize`.

### Condition score formula (machinery)

```
conditionScore = 100
  - floor(ageDays / 5)          // −1 point per 5 days old (min 0)
  + repairedOnTime * 3          // +3 per repair completed before breakdown
  - missedRepairs * 8           // −8 per missed/overdue repair
  clamped to [0, 100]
```

Labels: **Good** 75–100 · **Fair** 40–74 · **Poor** 0–39

Suggested listing price = `machineType.cost * (conditionScore / 100) * 0.70` (70% of depreciated value).

### Animal auction event timing

A weekly auction event resolves every 7 days. `nextAnimalAuctionDay` is stored in `GameState` (initialized to `day + 7`). On `advanceDay`, when `newDay === nextAnimalAuctionDay`:
- Resolve all active animal listings (compare final bid vs reserve)
- Generate 3–5 NPC animal listings for the next event (random types, gene scores weighted toward B/A)
- Set `nextAnimalAuctionDay += 7`

### NPC bidding (advanceDay)

Each day advance, for every active non-animal listing (`category: 'crop' | 'machinery'`):
- Up to 3 randomly-selected NPC farms (from `state.npcFarms`) each have a 15% chance per day to place a bid if `currentBid < npcValuation`
- `npcValuation` for crops = `quantity × currentMarketPrice × 0.80`
- `npcValuation` for machinery = `suggestedPrice × rand(0.85, 1.10)`
- NPC bid = `currentBid × 1.05` (5% increment), capped at `npcValuation`

For animal event listings, NPC bids are resolved all at once on the event day.

### New store state

```typescript
listings: AuctionListing[];           // replaces auctionLots
nextAnimalAuctionDay: number;
```

### New store actions

```typescript
listItem: (params: {
  category: AuctionCategory;
  // supply the relevant id + optional fields matching AuctionListing payload
  animalId?: string;
  cropId?: string; cropQuantity?: number;
  machineId?: string;
  startingBid: number;
  reservePrice: number;
  durationDays: 3 | 7 | 14;          // ignored for 'animal' (event-based)
}) => void;
withdrawListing: (listingId: string) => void; // player withdraws before expiry
placeBid: (listingId: string, amount: number) => void;
```

`listItem` validates: player owns the item, sufficient data, startingBid > 0, reservePrice >= startingBid. For machinery, it removes the machine from `machines[]` (held in escrow). For animals, removes from `animals[]`. For crops, deducts from `inventory`.

`withdrawListing` returns the item/crop/machine to the player. Not available once a bid exists on the listing.

`placeBid` validates: amount >= currentBid × 1.05, player has funds. Does NOT deduct money immediately — deducted on resolution.

### Resolution (advanceDay)

When a listing expires (`newDay > listing.expiresDay`) or the animal event fires:
- If `currentBid >= reservePrice` AND `playerBid === currentBid`: player wins, money deducted, item transferred
- If player wins a machinery listing: machine added to `machines[]`
- If player wins an animal listing: animal added to `animals[]`
- If player wins a crop listing: quantity added to `inventory`
- If player's listing sells: money added, item removed from escrow
- If reserve not met or no bids: item returned to seller

---

## UI Structure

### Hub screen (default view)

```
┌─────────────────────────────────┐
│  🏛️ Auction House               │
├──────────────┬──────────────────┤
│  🏡 Land     │  🐄 Animals      │
│  2 active    │  ⚡ Event in 3d  │
├──────────────┼──────────────────┤
│  🌾 Crops    │  ⚙️ Machinery    │
│  5 listings  │  3 listings      │
├─────────────────────────────────┤
│  YOUR ACTIVE BIDS               │
│  📍 North Field · Leading $4.2k │
│  ⚙️ Large Tractor · Outbid      │
└─────────────────────────────────┘
```

Tap any tile → drill into that category's list view.

### Land tab

Existing behavior preserved exactly. `AuctionLot` data migrated to `AuctionListing` with `category: 'land'`.

### Animals tab

- Countdown banner: event day, days remaining, listing deadline
- **Your Listings**: each player-listed animal with gene score badge (S/A/B/C/D), current bid, Withdraw button (disabled once any bid exists)
- **+ List an Animal** button → modal: pick from owned mature animals, set starting bid + reserve, confirm
- **NPC Listings**: animals with gene score badges, current bid, Bid button

### Crops tab

- **+ List Crops** button → inline form: crop picker (stocked only), quantity input, starting bid, reserve price, duration (3d/7d/14d)
- **Your Active Listings** + **NPC Listings** sections
- NPC bids shown as "X buyers interested"

### Machinery tab

- **+ List a Machine** button → inline form: machine picker (shows condition score bar, age, suggested price), starting bid, reserve, duration
- Condition bar: 0–100 with Good/Fair/Poor label, age penalty and repair bonus breakdown
- **NPC Listings**: machine name, seller farm name, condition badge, current bid, days left

### Resolved / History

A collapsible "Recent Results" section at the bottom of each category tab showing the last 5 resolved listings with outcome (Won/Lost/Sold/Unsold).

---

## Error states

- **Withdraw blocked**: "Can't withdraw — bids have already been placed"
- **Insufficient funds**: bid button disabled, tooltip "Not enough money"
- **Reserve not met**: resolved listing shows "Reserve not met — item returned"
- **Machine in escrow**: machine greyed out in maquinaria.tsx with "Listed for auction" label

---

## Out of scope

- Crop listings appearing in the existing `economia.tsx` sell flow (auction is separate)
- Attachments or trailers at auction (machines only: tractors and combines)
- Player-vs-player (no multiplayer)
