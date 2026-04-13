# Recurring Contracts Implementation Plan

**Goal:** Add 8 persistent buyer relationships with 4 tiers (New → Regular → Preferred → Exclusive). Players build streaks through on-time deliveries to unlock better price bonuses (+20% → +40%) and larger order caps. Missing 2 deliveries in a row cancels the contract and drops the buyer tier. Weather insurance triggers grace period extensions.

**Architecture:** New types + buyers data appended to `engine/contracts.ts` alongside existing one-off contract logic. Pure business-logic functions take arrays and return new arrays (no Zustand imports). Store wires them into `advanceDay()`. New "Supply" sub-tab in `economia.tsx` exposes the full buyer/contract UI.

**Inventory note:** `inventory` in this store is `Record<string, number>` (cropId → kg), not an array.

---

## File Map

| File | Change |
|---|---|
| `engine/contracts.ts` | Append `BuyerTier`, `Buyer`, `RecurringContract` types; `BUYER_TIER_CONFIG`, `INITIAL_BUYERS`, `getBuyerPriceBonus`; 5 pure logic functions |
| `store/useGameStore.ts` | Extend import; add `buyers`/`recurringContracts` to `GameState`; 3 new actions; wire `checkRecurringDeliveries` in `advanceDay()` |
| `app/(tabs)/economia.tsx` | Add `'supply'` to `EcoTab`; 6th SubTabBar entry; buyers list; sign-contract modal; deliver modal |
| `app/(tabs)/calendario.tsx` | Add recurring delivery window entries to calendar list |
| `components/GameHUD.tsx` | Add delivery-due-in-≤3-days warning to `warnStrip` |

---

## Task 1: Types + buyer data in engine/contracts.ts

**File:** `engine/contracts.ts` (currently 62 lines — append after last line)

- [ ] **Step 1 — Append types and constants**

```typescript
// ─── Recurring Contracts ─────────────────────────────────────────────────────

export type BuyerTier = 'new' | 'regular' | 'preferred' | 'exclusive';

export interface Buyer {
  id: string;
  name: string;
  emoji: string;
  /** accepted crop IDs; 'any' means all crops */
  cropIds: string[];
  tier: BuyerTier;
  deliveryStreak: number;
  totalDeliveries: number;
  /** consecutive missed deliveries; hitting 2 cancels contract + drops tier */
  missedInARow: number;
  /** game day this buyer first appears */
  unlockedDay: number;
  requiresReputation?: number;
}

export interface RecurringContract {
  id: string;
  buyerId: string;
  cropId: string;
  amountPerDelivery: number;
  frequencyDays: 7 | 14 | 30;
  /** fraction added on top of base price, e.g. 0.27 = +27% */
  priceBonus: number;
  nextDeliveryDay: number;
  /** days the player has to fulfil each cycle before it counts as missed */
  deliveryWindowDays: number;
  durationSeasons: number;
  startDay: number;
  endDay: number;
  active: boolean;
  /** extra days added by weather insurance; consumed before counting a miss */
  graceDaysRemaining: number;
}

export interface TierConfig {
  label: string;
  emoji: string;
  priceBonus: number;
  maxOrderKg: number;
  windowDays: number;
  graceDays: number;
  /** totalDeliveries needed to reach this tier */
  deliveryGate: number;
}

export const BUYER_TIER_CONFIG: Record<BuyerTier, TierConfig> = {
  new:       { label: 'New',       emoji: '🆕', priceBonus: 0.20, maxOrderKg: 500,      windowDays: 7, graceDays: 0,  deliveryGate: 0  },
  regular:   { label: 'Regular',   emoji: '⭐', priceBonus: 0.27, maxOrderKg: 1500,     windowDays: 5, graceDays: 3,  deliveryGate: 3  },
  preferred: { label: 'Preferred', emoji: '🌟', priceBonus: 0.33, maxOrderKg: 4000,     windowDays: 4, graceDays: 7,  deliveryGate: 8  },
  exclusive: { label: 'Exclusive', emoji: '💎', priceBonus: 0.40, maxOrderKg: Infinity, windowDays: 3, graceDays: 14, deliveryGate: 15 },
};

// Pet Food Co. uses reduced bonuses (safety-net buyer for any crop)
const PET_FOOD_BONUSES: Record<BuyerTier, number> = {
  new: 0.15, regular: 0.20, preferred: 0.25, exclusive: 0.30,
};

/** Returns the price bonus fraction for a buyer at their current tier. */
export function getBuyerPriceBonus(buyer: Buyer): number {
  if (buyer.id === 'buyer_petfood') return PET_FOOD_BONUSES[buyer.tier];
  return BUYER_TIER_CONFIG[buyer.tier].priceBonus;
}

export const INITIAL_BUYERS: Buyer[] = [
  {
    id: 'buyer_bakery', name: 'Local Bakery', emoji: '🥖',
    cropIds: ['wheat', 'corn'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1,
  },
  {
    id: 'buyer_restaurant', name: 'City Restaurant', emoji: '🍽️',
    cropIds: ['lavender', 'saffron', 'vanilla'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 40,
  },
  {
    id: 'buyer_processor', name: 'Export Processor', emoji: '🏭',
    cropIds: ['wheat', 'corn', 'barley', 'soy'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 60,
  },
  {
    id: 'buyer_dairy', name: 'Dairy Distributor', emoji: '🥛',
    cropIds: ['grass', 'alfalfa'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1,
  },
  {
    id: 'buyer_organic', name: 'Organic Market', emoji: '🌿',
    cropIds: ['any'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 45,
  },
  {
    id: 'buyer_supermarket', name: 'Regional Supermarket', emoji: '🛒',
    cropIds: ['any'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 30,
  },
  {
    id: 'buyer_distillery', name: 'Distillery', emoji: '🍺',
    cropIds: ['barley', 'corn', 'sugarbeet'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1, requiresReputation: 50,
  },
  {
    id: 'buyer_petfood', name: 'Pet Food Co.', emoji: '🐾',
    cropIds: ['any'],
    tier: 'new', deliveryStreak: 0, totalDeliveries: 0, missedInARow: 0,
    unlockedDay: 1,
  },
];
```

- [ ] **Step 2 — Type-check**

```bash
cd "C:\Users\SanGi\.antigravity\FArM TYCOON\granja-tycoon"
npx tsc --noEmit
```

Expected: no errors from `engine/contracts.ts`.

- [ ] **Step 3 — Commit**

```bash
git add engine/contracts.ts
git commit -m "feat(contracts): add recurring contract types + 8 buyer definitions"
```

---

## Task 2: Business logic functions in engine/contracts.ts

**File:** `engine/contracts.ts` (append after Task 1 additions)

These are pure functions — no Zustand imports. All return new objects (immutable pattern).

- [ ] **Step 1 — Append logic functions**

```typescript
// ─── Recurring Contract Logic ─────────────────────────────────────────────────

const TIER_ORDER: BuyerTier[] = ['new', 'regular', 'preferred', 'exclusive'];

function nextTier(t: BuyerTier): BuyerTier {
  const i = TIER_ORDER.indexOf(t);
  return TIER_ORDER[Math.min(i + 1, TIER_ORDER.length - 1)];
}

function prevTier(t: BuyerTier): BuyerTier {
  const i = TIER_ORDER.indexOf(t);
  return TIER_ORDER[Math.max(i - 1, 0)];
}

/**
 * Returns the highest tier whose deliveryGate the buyer has already met.
 * Call after incrementing totalDeliveries.
 */
export function checkTierUpgrade(buyer: Buyer): BuyerTier {
  const candidates = TIER_ORDER.filter(
    (t) => BUYER_TIER_CONFIG[t].deliveryGate <= buyer.totalDeliveries,
  );
  return candidates[candidates.length - 1] ?? 'new';
}

/**
 * Creates a new RecurringContract from a buyer + player choices.
 * Caller must verify: crop is accepted, amount ≤ tier maxOrderKg,
 * no other active contract exists for this buyer.
 */
export function signRecurringContract(
  buyer: Buyer,
  cropId: string,
  amountPerDelivery: number,
  frequencyDays: 7 | 14 | 30,
  durationSeasons: number,
  currentDay: number,
): RecurringContract {
  const cfg = BUYER_TIER_CONFIG[buyer.tier];
  const DAYS_PER_SEASON = 90;
  const endDay = currentDay + durationSeasons * DAYS_PER_SEASON;
  return {
    id: `rc_${buyer.id}_${currentDay}`,
    buyerId: buyer.id,
    cropId,
    amountPerDelivery,
    frequencyDays,
    priceBonus: getBuyerPriceBonus(buyer),
    nextDeliveryDay: currentDay + frequencyDays,
    deliveryWindowDays: cfg.windowDays,
    durationSeasons,
    startDay: currentDay,
    endDay,
    active: true,
    graceDaysRemaining: 0,
  };
}

/**
 * Resolves a player delivery attempt.
 * Partial delivery ≥ 80% counts as on-time (streak increments, tier can upgrade).
 * Returns updated buyer + contract + the revenue earned.
 *
 * Caller is responsible for:
 *   - deducting `amountDelivered` from inventory[contract.cropId]
 *   - adding `revenue` to player money
 */
export function resolveDelivery(
  contract: RecurringContract,
  buyer: Buyer,
  amountDelivered: number,
  basePrice: number,
  currentDay: number,
): { contract: RecurringContract; buyer: Buyer; revenue: number } {
  const threshold = contract.amountPerDelivery * 0.8;
  const onTime = amountDelivered >= threshold;
  const revenue = amountDelivered * basePrice * (1 + contract.priceBonus);

  const updatedBuyer: Buyer = {
    ...buyer,
    totalDeliveries: onTime ? buyer.totalDeliveries + 1 : buyer.totalDeliveries,
    deliveryStreak: onTime ? buyer.deliveryStreak + 1 : 0,
    missedInARow: onTime ? 0 : buyer.missedInARow + 1,
  };
  if (onTime) {
    updatedBuyer.tier = checkTierUpgrade(updatedBuyer);
  }

  const updatedContract: RecurringContract = {
    ...contract,
    priceBonus: getBuyerPriceBonus(updatedBuyer),
    nextDeliveryDay: currentDay + contract.frequencyDays,
    graceDaysRemaining: 0,
  };

  return { contract: updatedContract, buyer: updatedBuyer, revenue };
}

/**
 * Called from advanceDay(). Scans all active contracts for windows that have
 * closed without a delivery.
 * - If graceDaysRemaining > 0: extends the window instead of counting a miss.
 * - If missedInARow reaches 2: deactivates contract + drops buyer tier one level.
 *
 * Returns updated { contracts, buyers } arrays (pure).
 */
export function checkRecurringDeliveries(
  contracts: RecurringContract[],
  buyers: Buyer[],
  currentDay: number,
): { contracts: RecurringContract[]; buyers: Buyer[] } {
  const buyerMap = new Map(buyers.map((b) => [b.id, { ...b }]));

  const updatedContracts = contracts.map((c) => {
    if (!c.active) return c;

    const windowCloseDay = c.nextDeliveryDay + c.deliveryWindowDays;
    if (currentDay < windowCloseDay) return c; // window still open

    const buyer = buyerMap.get(c.buyerId)!;

    if (c.graceDaysRemaining > 0) {
      // Use grace days — extend the window, don't count as a miss
      return {
        ...c,
        deliveryWindowDays: c.deliveryWindowDays + c.graceDaysRemaining,
        graceDaysRemaining: 0,
      };
    }

    // Count as a miss
    const newMissed = buyer.missedInARow + 1;
    buyerMap.set(buyer.id, {
      ...buyer,
      missedInARow: newMissed,
      deliveryStreak: 0,
    });

    if (newMissed >= 2) {
      // Cancel + drop tier
      buyerMap.set(buyer.id, {
        ...buyerMap.get(buyer.id)!,
        tier: prevTier(buyer.tier),
        missedInARow: 0,
      });
      return { ...c, active: false };
    }

    return c;
  });

  return { contracts: updatedContracts, buyers: Array.from(buyerMap.values()) };
}

/**
 * Extends graceDaysRemaining on all active contracts when weather insurance
 * triggers. Grace days added = the buyer's current tier graceDays.
 * Caller must verify that an active insurance policy exists before calling.
 */
export function applyDisasterGrace(
  contracts: RecurringContract[],
  buyers: Buyer[],
): RecurringContract[] {
  const buyerMap = new Map(buyers.map((b) => [b.id, b]));
  return contracts.map((c) => {
    if (!c.active) return c;
    const buyer = buyerMap.get(c.buyerId);
    if (!buyer) return c;
    const graceDays = BUYER_TIER_CONFIG[buyer.tier].graceDays;
    return { ...c, graceDaysRemaining: c.graceDaysRemaining + graceDays };
  });
}
```

- [ ] **Step 2 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3 — Commit**

```bash
git add engine/contracts.ts
git commit -m "feat(contracts): add recurring contract logic (sign, deliver, tier, grace, miss)"
```

---

## Task 3: Wire into useGameStore.ts

**File:** `store/useGameStore.ts`

Four changes: extend import, add state fields, add 3 actions, wire into `advanceDay()`.

- [ ] **Step 1 — Extend the contracts import (line 9)**

Replace the existing line:
```typescript
import { Contract } from '../engine/contracts';
```
With:
```typescript
import {
  Contract,
  Buyer,
  RecurringContract,
  INITIAL_BUYERS,
  signRecurringContract as buildRecurringContract,
  resolveDelivery,
  checkRecurringDeliveries,
  applyDisasterGrace,
  getBuyerPriceBonus,
  BUYER_TIER_CONFIG,
} from '../engine/contracts';
```

- [ ] **Step 2 — Add fields to GameState interface (after line 482 `contracts: Contract[];`)**

```typescript
  buyers: Buyer[];
  recurringContracts: RecurringContract[];
```

- [ ] **Step 3 — Add action signatures to the store type (after line 661 `deliverCrop`)**

```typescript
  signRecurringContract: (
    buyerId: string,
    cropId: string,
    amountPerDelivery: number,
    frequencyDays: 7 | 14 | 30,
    durationSeasons: number,
  ) => void;
  deliverToRecurringContract: (contractId: string, amountDelivered: number) => void;
  cancelRecurringContract: (contractId: string) => void;
```

- [ ] **Step 4 — Initialise in newGame() (alongside `contracts: [] as Contract[]` at line 892)**

```typescript
    buyers: INITIAL_BUYERS.map((b) => ({ ...b })),
    recurringContracts: [] as RecurringContract[],
```

- [ ] **Step 5 — Implement the 3 actions (add near the `acceptContract` implementation)**

```typescript
      signRecurringContract: (buyerId, cropId, amountPerDelivery, frequencyDays, durationSeasons) => {
        set((s) => {
          const buyer = s.buyers.find((b) => b.id === buyerId);
          if (!buyer) return {};
          const alreadyActive = s.recurringContracts.some(
            (c) => c.buyerId === buyerId && c.active,
          );
          if (alreadyActive) return {};
          const cfg = BUYER_TIER_CONFIG[buyer.tier];
          if (cfg.maxOrderKg !== Infinity && amountPerDelivery > cfg.maxOrderKg) return {};
          const newContract = buildRecurringContract(
            buyer, cropId, amountPerDelivery, frequencyDays, durationSeasons, s.day,
          );
          return { recurringContracts: [...s.recurringContracts, newContract] };
        });
      },

      deliverToRecurringContract: (contractId, amountDelivered) => {
        set((s) => {
          const contract = s.recurringContracts.find((c) => c.id === contractId);
          if (!contract || !contract.active) return {};
          const buyer = s.buyers.find((b) => b.id === contract.buyerId);
          if (!buyer) return {};

          const available = s.inventory[contract.cropId] ?? 0;
          const actual = Math.min(amountDelivered, available);
          if (actual <= 0) return {};

          const cropType = CROP_TYPES.find((ct) => ct.id === contract.cropId);
          const basePrice = cropType?.basePrice ?? 1;

          const { contract: updatedContract, buyer: updatedBuyer, revenue } =
            resolveDelivery(contract, buyer, actual, basePrice, s.day);

          return {
            money: s.money + revenue,
            inventory: { ...s.inventory, [contract.cropId]: Math.max(0, available - actual) },
            recurringContracts: s.recurringContracts.map((c) =>
              c.id === contractId ? updatedContract : c,
            ),
            buyers: s.buyers.map((b) => (b.id === buyer.id ? updatedBuyer : b)),
          };
        });
      },

      cancelRecurringContract: (contractId) => {
        set((s) => ({
          recurringContracts: s.recurringContracts.map((c) =>
            c.id === contractId ? { ...c, active: false } : c,
          ),
        }));
      },
```

- [ ] **Step 6 — Wire checkRecurringDeliveries into advanceDay()**

In `advanceDay()`, after the contract deadline / penalty block (around line 1527), add:

```typescript
        // Recurring delivery window check
        const { contracts: updatedRecurring, buyers: updatedBuyers } =
          checkRecurringDeliveries(get().recurringContracts, get().buyers, newDay);
        // merge into the final set() call below, or set immediately:
        set({ recurringContracts: updatedRecurring, buyers: updatedBuyers });
```

> **Placement note:** `advanceDay()` builds up a `summary` array and then calls a large `set(...)` at the end. If the final `set()` is one big object literal, add `recurringContracts: updatedRecurring, buyers: updatedBuyers` inside it instead of calling `set()` twice. Look for the `set({ day: newDay, ...` call and merge there.

- [ ] **Step 7 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8 — Commit**

```bash
git add store/useGameStore.ts
git commit -m "feat(store): buyers + recurringContracts state, sign/deliver/cancel actions, advanceDay wiring"
```

---

## Task 4: Supply tab — buyers list in economia.tsx

**File:** `app/(tabs)/economia.tsx`

- [ ] **Step 1 — Add 'supply' to EcoTab (line 155)**

```typescript
type EcoTab = 'market' | 'autosell' | 'stats' | 'futures' | 'orders' | 'supply';
```

- [ ] **Step 2 — Add Supply entry to SubTabBar (after line 288 `{ id: 'orders', label: '📋 Orders' },`)**

```typescript
          { id: 'supply',  label: '🤝 Supply' },
```

- [ ] **Step 3 — Add imports**

Add to the existing `import { ... } from 'react-native'` line — add `Modal` if not already present:
```typescript
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput, Modal } from 'react-native';
```

Add engine import (after the existing imports):
```typescript
import {
  Buyer,
  RecurringContract,
  BUYER_TIER_CONFIG,
  getBuyerPriceBonus,
  BuyerTier,
} from '../../engine/contracts';
```

- [ ] **Step 4 — Pull buyers/recurringContracts from store**

On line 158, extend the `useGameStore()` destructure to include:
```typescript
  buyers, recurringContracts, reputation,
  signRecurringContract, deliverToRecurringContract, cancelRecurringContract,
```

- [ ] **Step 5 — Add TIER_COLORS constant (near the top of the file, with other constants)**

```typescript
const TIER_COLORS: Record<BuyerTier, string> = {
  new:       '#37474f',
  regular:   '#1565c0',
  preferred: '#6a1fa3',
  exclusive: '#b8860b',
};
```

- [ ] **Step 6 — Add modal state variables (after line 174, alongside other useState hooks)**

```typescript
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [signingBuyerId, setSigningBuyerId] = useState<string | null>(null);
  const [signCropId, setSignCropId] = useState<string>('');
  const [signAmount, setSignAmount] = useState<string>('');
  const [signFrequency, setSignFrequency] = useState<7 | 14 | 30>(14);
  const [signDuration, setSignDuration] = useState<number>(1);
  const [deliverModalVisible, setDeliverModalVisible] = useState(false);
  const [deliveringContractId, setDeliveringContractId] = useState<string | null>(null);
  const [deliverAmount, setDeliverAmount] = useState<string>('');
```

- [ ] **Step 7 — Add helpers inside the component (above the JSX return)**

```typescript
  function isBuyerAvailable(buyer: Buyer): boolean {
    if (day < buyer.unlockedDay) return false;
    if (buyer.requiresReputation && reputation < buyer.requiresReputation) return false;
    return true;
  }

  function activeBuyerContract(buyerId: string): RecurringContract | undefined {
    return recurringContracts.find((c) => c.buyerId === buyerId && c.active);
  }
```

- [ ] **Step 8 — Add Supply tab JSX (after the closing brace of the orders tab block)**

Find where `ecoTab === 'orders'` block ends and add after it:

```tsx
      {/* ── SUPPLY TAB ── */}
      {ecoTab === 'supply' && (
        <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>

          <Text style={styles.sectionHeader}>Recurring Buyers</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: S.md }]}>
            Consistent deliveries build streaks and unlock better prices and larger orders.
          </Text>

          {buyers.map((buyer) => {
            const available = isBuyerAvailable(buyer);
            const activeContract = activeBuyerContract(buyer.id);
            const tierCfg = BUYER_TIER_CONFIG[buyer.tier];
            const priceBonus = getBuyerPriceBonus(buyer);
            const nextTierEntry = (['new','regular','preferred','exclusive'] as BuyerTier[])
              .find((t) => BUYER_TIER_CONFIG[t].deliveryGate > buyer.totalDeliveries);
            const gateToNext = nextTierEntry
              ? BUYER_TIER_CONFIG[nextTierEntry].deliveryGate - buyer.totalDeliveries
              : 0;

            return (
              <View key={buyer.id} style={[styles.card, !available && { opacity: 0.45 }]}>
                {/* Header */}
                <View style={styles.rowBetween}>
                  <View style={styles.row}>
                    <Text style={styles.buyerEmoji}>{buyer.emoji}</Text>
                    <Text style={styles.cardTitle}>{buyer.name}</Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[buyer.tier] }]}>
                    <Text style={styles.tierBadgeText}>{tierCfg.emoji} {tierCfg.label}</Text>
                  </View>
                </View>

                {/* Accepted crops */}
                <Text style={styles.buyerCropLabel}>
                  Accepts: {buyer.cropIds[0] === 'any' ? 'Any crop' : buyer.cropIds.join(', ')}
                </Text>

                {/* Tier stats */}
                <View style={[styles.row, { gap: S.md, marginTop: S.xs }]}>
                  <Text style={styles.buyerStat}>+{Math.round(priceBonus * 100)}% price</Text>
                  <Text style={styles.buyerStat}>
                    Max {tierCfg.maxOrderKg === Infinity ? 'Unlimited' : `${tierCfg.maxOrderKg} kg`}
                  </Text>
                  {gateToNext > 0 && (
                    <Text style={styles.buyerStat}>{gateToNext} more to upgrade</Text>
                  )}
                </View>

                {/* Streak pips */}
                {buyer.deliveryStreak > 0 && (
                  <View style={[styles.row, { gap: 4, marginTop: S.xs, flexWrap: 'wrap' }]}>
                    {Array.from({ length: Math.min(buyer.deliveryStreak, 15) }).map((_, i) => (
                      <View key={i} style={styles.streakPip} />
                    ))}
                    <Text style={[styles.buyerStat, { marginLeft: 4 }]}>
                      {buyer.deliveryStreak} streak
                    </Text>
                  </View>
                )}

                {/* Lock reason */}
                {!available && (
                  <Text style={styles.lockedReason}>
                    {day < buyer.unlockedDay
                      ? `Unlocks day ${buyer.unlockedDay}`
                      : `Requires ${buyer.requiresReputation} reputation`}
                  </Text>
                )}

                {/* Active contract summary */}
                {activeContract && (
                  <View style={styles.activeContractChip}>
                    <Text style={styles.activeContractText}>
                      📦 {activeContract.cropId} · {activeContract.amountPerDelivery} kg
                      {' '}· Next: day {activeContract.nextDeliveryDay}
                      {activeContract.graceDaysRemaining > 0
                        ? ` (+${activeContract.graceDaysRemaining}d grace)`
                        : ''}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                {available && (
                  <View style={[styles.row, { gap: S.sm, marginTop: S.sm }]}>
                    {!activeContract ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: C.accent }]}
                        onPress={() => {
                          setSigningBuyerId(buyer.id);
                          setSignCropId(buyer.cropIds[0] === 'any' ? CROP_TYPES[0].id : buyer.cropIds[0]);
                          setSignModalVisible(true);
                        }}
                      >
                        <Text style={styles.actionBtnText}>Sign Contract</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, backgroundColor: C.accent }]}
                          onPress={() => {
                            setDeliveringContractId(activeContract.id);
                            setDeliverAmount(String(activeContract.amountPerDelivery));
                            setDeliverModalVisible(true);
                          }}
                        >
                          <Text style={styles.actionBtnText}>Deliver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, backgroundColor: '#5c1a1a' }]}
                          onPress={() => cancelRecurringContract(activeContract.id)}
                        >
                          <Text style={[styles.actionBtnText, { color: '#ef9a9a' }]}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
```

- [ ] **Step 9 — Add new styles to StyleSheet.create**

```typescript
    buyerEmoji:         { fontSize: 22, marginRight: S.xs },
    buyerCropLabel:     { fontSize: F.size.xs, color: C.textFaint, marginTop: 2 },
    buyerStat:          { fontSize: F.size.xs, color: C.textMuted },
    streakPip:          { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
    tierBadge:          { paddingHorizontal: S.sm, paddingVertical: 2, borderRadius: R.sm },
    tierBadgeText:      { fontSize: F.size.xs, color: C.white, fontWeight: '700' },
    lockedReason:       { fontSize: F.size.xs, color: C.textFaint, marginTop: S.xs, fontStyle: 'italic' },
    activeContractChip: { backgroundColor: C.bgCard, borderRadius: R.sm, padding: S.sm, marginTop: S.sm },
    activeContractText: { fontSize: F.size.xs, color: C.textMuted },
    actionBtn:          { flex: 1, borderRadius: R.md, paddingVertical: S.sm, alignItems: 'center' },
    actionBtnText:      { color: C.white, fontWeight: '700', fontSize: F.size.sm },
```

> **Note:** Check whether `sectionHeader`, `sectionSubtitle`, `card`, `cardTitle`, `row`, `rowBetween`, `tabScroll` already exist in this file's StyleSheet before adding. Only add styles that are missing.

- [ ] **Step 10 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11 — Commit**

```bash
git add "app/(tabs)/economia.tsx"
git commit -m "feat(economia): add Supply tab with buyers list, tier badges, streak pips"
```

---

## Task 5: Sign contract + deliver modals in economia.tsx

**File:** `app/(tabs)/economia.tsx`

Add the two modals before the closing `</View>` of the screen root.

- [ ] **Step 1 — Add sign contract modal**

```tsx
      {/* ── Sign Contract Modal ── */}
      <Modal
        visible={signModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {(() => {
              const buyer = buyers.find((b) => b.id === signingBuyerId);
              if (!buyer) return null;
              const tierCfg = BUYER_TIER_CONFIG[buyer.tier];
              const acceptedCrops =
                buyer.cropIds[0] === 'any'
                  ? CROP_TYPES.map((ct) => ct.id)
                  : buyer.cropIds;

              return (
                <>
                  <Text style={styles.modalTitle}>
                    {buyer.emoji} Sign Contract — {buyer.name}
                  </Text>
                  <Text style={styles.modalSub}>
                    {tierCfg.emoji} {tierCfg.label} · +{Math.round(getBuyerPriceBonus(buyer) * 100)}% price bonus
                  </Text>

                  {/* Crop picker */}
                  <Text style={styles.formLabel}>Crop</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: S.sm }}>
                    {acceptedCrops.map((id) => (
                      <TouchableOpacity
                        key={id}
                        style={[styles.chip, signCropId === id && styles.chipActive]}
                        onPress={() => setSignCropId(id)}
                      >
                        <Text style={[styles.chipText, signCropId === id && { color: C.white }]}>
                          {CROP_TYPES.find((ct) => ct.id === id)?.name ?? id}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Amount */}
                  <Text style={styles.formLabel}>
                    Amount per delivery (kg)
                    {tierCfg.maxOrderKg !== Infinity ? ` — max ${tierCfg.maxOrderKg}` : ''}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={signAmount}
                    onChangeText={setSignAmount}
                    keyboardType="numeric"
                    placeholder="e.g. 200"
                    placeholderTextColor={C.textFaint}
                  />

                  {/* Frequency */}
                  <Text style={styles.formLabel}>Delivery frequency</Text>
                  <View style={[styles.row, { gap: S.sm, marginBottom: S.sm }]}>
                    {([7, 14, 30] as const).map((f) => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.chip, { flex: 1 }, signFrequency === f && styles.chipActive]}
                        onPress={() => setSignFrequency(f)}
                      >
                        <Text style={[styles.chipText, signFrequency === f && { color: C.white }]}>
                          {f === 7 ? 'Weekly' : f === 14 ? 'Biweekly' : 'Monthly'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Duration */}
                  <Text style={styles.formLabel}>Duration (seasons)</Text>
                  <View style={[styles.row, { gap: S.sm, marginBottom: S.md }]}>
                    {[1, 2, 3, 4].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.chip, { flex: 1 }, signDuration === d && styles.chipActive]}
                        onPress={() => setSignDuration(d)}
                      >
                        <Text style={[styles.chipText, signDuration === d && { color: C.white }]}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Buttons */}
                  <View style={[styles.row, { gap: S.sm }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.accent }]}
                      onPress={() => {
                        const amt = Number(signAmount);
                        if (!signCropId || !amt || amt <= 0) return;
                        if (tierCfg.maxOrderKg !== Infinity && amt > tierCfg.maxOrderKg) return;
                        signRecurringContract(
                          signingBuyerId!, signCropId, amt, signFrequency, signDuration,
                        );
                        setSignModalVisible(false);
                        setSignAmount('');
                      }}
                    >
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.bgCard }]}
                      onPress={() => setSignModalVisible(false)}
                    >
                      <Text style={[styles.actionBtnText, { color: C.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
```

- [ ] **Step 2 — Add deliver modal**

```tsx
      {/* ── Deliver Modal ── */}
      <Modal
        visible={deliverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliverModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {(() => {
              const contract = recurringContracts.find((c) => c.id === deliveringContractId);
              if (!contract) return null;
              const buyer = buyers.find((b) => b.id === contract.buyerId);
              if (!buyer) return null;
              const inStock = inventory[contract.cropId] ?? 0;
              const cropType = CROP_TYPES.find((ct) => ct.id === contract.cropId);
              const basePrice = cropType?.basePrice ?? 1;
              const previewAmt = Math.min(Number(deliverAmount) || 0, inStock);
              const previewRevenue = previewAmt * basePrice * (1 + contract.priceBonus);
              const threshold80 = Math.ceil(contract.amountPerDelivery * 0.8);
              const isOnTime = previewAmt >= threshold80;

              return (
                <>
                  <Text style={styles.modalTitle}>
                    {buyer.emoji} Deliver to {buyer.name}
                  </Text>
                  <Text style={styles.modalSub}>
                    Required: {contract.amountPerDelivery} kg {contract.cropId}
                    {' '}(≥{threshold80} kg counts as on-time)
                  </Text>
                  <Text style={styles.modalSub}>
                    In stock: {inStock.toLocaleString()} kg · +{Math.round(contract.priceBonus * 100)}% bonus
                  </Text>

                  <Text style={styles.formLabel}>Amount to deliver (kg)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={deliverAmount}
                    onChangeText={setDeliverAmount}
                    keyboardType="numeric"
                    placeholder={String(contract.amountPerDelivery)}
                    placeholderTextColor={C.textFaint}
                  />

                  {previewAmt > 0 && (
                    <Text style={[styles.modalSub, { color: isOnTime ? '#81c784' : '#ef9a9a', marginBottom: S.sm }]}>
                      Revenue: ${previewRevenue.toFixed(0)}
                      {isOnTime ? ' ✓ On-time' : ' ⚠️ Below 80% — counts as missed'}
                    </Text>
                  )}

                  <View style={[styles.row, { gap: S.sm }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.accent }]}
                      onPress={() => {
                        const amt = Number(deliverAmount);
                        if (!amt || amt <= 0) return;
                        deliverToRecurringContract(contract.id, amt);
                        setDeliverModalVisible(false);
                        setDeliverAmount('');
                      }}
                    >
                      <Text style={styles.actionBtnText}>Deliver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: C.bgCard }]}
                      onPress={() => setDeliverModalVisible(false)}
                    >
                      <Text style={[styles.actionBtnText, { color: C.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
```

- [ ] **Step 3 — Add missing styles to StyleSheet.create**

```typescript
    chip:         { paddingHorizontal: S.sm, paddingVertical: S.xs, borderRadius: R.pill,
                    backgroundColor: C.bgCard, marginRight: S.xs, alignItems: 'center' },
    chipActive:   { backgroundColor: C.accent },
    chipText:     { fontSize: F.size.sm, color: C.textMuted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet:   { backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
                    padding: S.lg, paddingBottom: 36 },
    modalTitle:   { color: C.text, fontSize: F.size.lg, fontWeight: F.weight.bold, marginBottom: S.xs },
    modalSub:     { color: C.textMuted, fontSize: F.size.sm, marginBottom: S.xs },
    formLabel:    { color: C.textMuted, fontSize: F.size.xs, fontWeight: '600',
                    marginTop: S.sm, marginBottom: 4 },
    formInput:    { backgroundColor: C.bgCard, borderRadius: R.md, color: C.text,
                    fontSize: F.size.md, paddingHorizontal: S.md, paddingVertical: S.sm,
                    marginBottom: S.sm },
```

> **Note:** Check for `modalOverlay`, `modalSheet`, `modalTitle`, `formLabel`, `formInput` before adding — they may already exist from the futures/orders modals. Only add missing ones.

- [ ] **Step 4 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5 — Commit**

```bash
git add "app/(tabs)/economia.tsx"
git commit -m "feat(economia): add sign contract + deliver modals for Supply tab"
```

---

## Task 6: Calendar delivery markers in calendario.tsx

**File:** `app/(tabs)/calendario.tsx`

- [ ] **Step 1 — Add 'recurring' to CalendarEntry category (line 14)**

```typescript
  category: 'contract' | 'loan' | 'futures' | 'season' | 'deposit' | 'recurring';
```

- [ ] **Step 2 — Pull recurring data from store (line 31)**

Replace:
```typescript
  const { day, contracts, loans, futures, timeDeposits } = useGameStore();
```
With:
```typescript
  const { day, contracts, loans, futures, timeDeposits, recurringContracts, buyers } = useGameStore();
```

- [ ] **Step 3 — Add recurring entries after the time deposits block (after line 94)**

```typescript
  // Recurring contract delivery windows
  for (const c of recurringContracts) {
    if (!c.active) continue;
    if (c.nextDeliveryDay < day) continue; // window already overdue (handled elsewhere)
    const buyer = buyers.find((b) => b.id === c.buyerId);
    const daysLeft = c.nextDeliveryDay - day;
    const windowCloseDay = c.nextDeliveryDay + c.deliveryWindowDays;
    const daysToClose = windowCloseDay - day;
    const urgent = daysToClose <= 3;
    entries.push({
      id: `rc_${c.id}`,
      icon: urgent ? '⚠️' : '📋',
      title: `${buyer?.emoji ?? '📦'} ${buyer?.name ?? c.buyerId} delivery`,
      detail: `${c.cropId} · ${c.amountPerDelivery} kg · window closes day ${windowCloseDay}`,
      daysLeft: daysLeft,
      category: 'recurring',
      urgent,
    });
  }
```

- [ ] **Step 4 — Add recurring color to CATEGORY_COLORS (line 114)**

```typescript
    recurring: '#2e7d32',
```

- [ ] **Step 5 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6 — Commit**

```bash
git add "app/(tabs)/calendario.tsx"
git commit -m "feat(calendar): show recurring delivery windows as calendar entries"
```

---

## Task 7: HUD warning strip in GameHUD.tsx

**File:** `components/GameHUD.tsx`

- [ ] **Step 1 — Pull recurring data from store**

In `GameHUD.tsx`, add to the existing `useGameStore` destructure:

```typescript
  const recurringContracts = useGameStore((s) => s.recurringContracts);
  const buyers = useGameStore((s) => s.buyers);
```

- [ ] **Step 2 — Compute urgent delivery (before the JSX return)**

```typescript
  const urgentDelivery = recurringContracts
    .filter((c) => c.active)
    .map((c) => ({
      contract: c,
      daysToClose: (c.nextDeliveryDay + c.deliveryWindowDays) - day,
    }))
    .filter(({ daysToClose }) => daysToClose > 0 && daysToClose <= 3)
    .sort((a, b) => a.daysToClose - b.daysToClose)[0];

  const urgentDeliveryBuyer = urgentDelivery
    ? buyers.find((b) => b.id === urgentDelivery.contract.buyerId)
    : undefined;
```

- [ ] **Step 3 — Add warning strip entry after the existing urgentContract block (after line 163)**

```tsx
      {urgentDelivery && (
        <View style={styles.warnStrip}>
          <Text style={styles.warnText}>
            ⚠️ Delivery closes in {urgentDelivery.daysToClose}d
            {' '}— {urgentDeliveryBuyer?.name ?? 'Buyer'}
            {' '}({urgentDelivery.contract.cropId} {urgentDelivery.contract.amountPerDelivery} kg)
          </Text>
        </View>
      )}
```

- [ ] **Step 4 — Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5 — Commit**

```bash
git add components/GameHUD.tsx
git commit -m "feat(hud): add delivery-window-closing warning strip (≤3 days)"
```

---

## Spec Coverage

| Spec requirement | Task |
|---|---|
| BuyerTier, Buyer, RecurringContract types | 1 |
| 8 buyers with crops / unlock conditions | 1 |
| BUYER_TIER_CONFIG (price, maxOrder, window, grace, gate) | 1 |
| Pet Food Co. reduced bonuses | 1 (getBuyerPriceBonus) |
| checkTierUpgrade via totalDeliveries gate | 2 |
| signRecurringContract — creates contract | 2 |
| resolveDelivery — 80% partial, streak, tier upgrade | 2 |
| checkRecurringDeliveries — grace extension, 2-miss cancel + tier drop | 2 |
| applyDisasterGrace — adds tier grace days | 2 |
| buyers / recurringContracts in GameState | 3 |
| sign / deliver / cancel actions | 3 |
| advanceDay wires checkRecurringDeliveries | 3 |
| Economy Supply sub-tab, buyers list, tier badge, streak pips | 4 |
| Sign contract modal (crop, amount, frequency, duration) | 5 |
| Deliver modal with 80% threshold preview | 5 |
| Cancel contract | 4 |
| Calendar delivery window entries | 6 |
| HUD warning ≤3 days to window close | 7 |
| applyDisasterGrace called when insurance triggers | ⚠️ Deferred — wire this in the Climate Depth plan (Task 4), which adds the insurance resolution code. Add `applyDisasterGrace(get().recurringContracts, get().buyers)` call there alongside frost/drought kill. |
