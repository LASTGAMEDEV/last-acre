# Selling Channels Design
**Date:** 2026-04-19  
**Status:** Approved  
**Save key:** granja-tycoon-save-v6 (same bump as workers, electricity, processing)

---

## Overview

Selling channels are the routes by which farm produce and processed goods reach buyers. Every channel has different margins, volume capacity, quality expectations, and unlock conditions. Players do not set prices manually — prices are auto-calculated from base market rates, product quality, and the farm's current reputation score.

The ten channels are:

| # | Channel | Margin | Volume | Quality sensitivity |
|---|---------|--------|--------|-------------------|
| 1 | Farm Shop | High | Low–Medium | High |
| 2 | Buyer Contracts | Medium | Medium | Medium |
| 3 | Spot Sales | Market | Any | None |
| 4 | Farmers Markets | High | Low | High |
| 5 | Restaurant & Hotel Supply | Very High | Low | Very High |
| 6 | Online Shop | High | Low–Medium | High |
| 7 | Agricultural Shows | Prestige only | — | Highest |
| 8 | Wholesale Distributor | Low | Very High | None |
| 9 | Farm Café | High | Low | Medium |
| 10 | Veg Box Scheme | Medium–High | Medium | Medium |

---

## Reputation System

Farm reputation is a score from 0–100 that grows over time through consistent quality, award wins, and successful channel performance. It is the single most important unlock gate in the selling system.

### Reputation score sources
| Event | Points |
|-------|--------|
| Agricultural show gold medal | +5 |
| Agricultural show silver medal | +3 |
| Agricultural show bronze medal | +1 |
| Restaurant contract fulfilled at quality ≥ 80 (per week) | +0.5 |
| Restaurant contract cancelled due to quality failure | −3 |
| Online shop review (auto-generated, quality ≥ 75) | +0.2 |
| Buyer contract completed on time | +0.3 |
| Buyer contract broken / short-delivered | −2 |
| Farm café open consistently 5+ days/week | +0.1/week |
| Product spoilage event (lost stock) | −0.5 |

Reputation decays slowly at −0.05/week if no positive events occur, preventing indefinite coasting.

### Reputation tiers
| Score | Tier | Effect |
|-------|------|--------|
| 0–24 | Unknown | Base prices only, no restaurant contracts available |
| 25–49 | Local | Restaurant contracts unlock, +5% shop prices |
| 50–69 | Established | Online shop unlocks, +12% shop prices, better contract offers |
| 70–84 | Respected | Premium restaurant / hotel supply unlocks, +20% shop prices |
| 85–100 | Renowned | Best buyers approach you, +30% shop prices, national online reach |

---

## 1. Farm Shop

The physical anchor of all direct sales. A building on the farm that the player constructs and upgrades.

### Tiers

| Tier | Name | Unlock cost | Staff slots | Daily visitor cap | What it unlocks |
|------|------|-------------|-------------|-------------------|-----------------|
| 1 | Roadside Stall | Low | 1 | 20 | Basic shop sales |
| 2 | Farm Shop | Medium | 2 | 80 | Wider product range, veg box scheme, online shop access |
| 3 | Visitor Centre | High | 4 | 250 | Farm café, events space, agritourism foot traffic |

### Opening hours
The player sets opening hours per day (e.g. Tue–Sun, 09:00–17:00). Each open day consumes one worker shift. Closed days generate no shop revenue.

### Foot traffic
Daily visitors are calculated from:
```
visitors = baseDemand × seasonModifier × dayOfWeekModifier × reputationModifier × openHoursModifier
```

- **baseDemand** — set by shop tier (20 / 80 / 250 cap)
- **seasonModifier** — Summer: 1.4×, Autumn: 1.2×, Spring: 1.0×, Winter: 0.7×
- **dayOfWeekModifier** — Weekend: 1.5×, Friday: 1.2×, Mon–Thu: 1.0×
- **reputationModifier** — scales 0.6× at rep 0 to 1.3× at rep 100
- **openHoursModifier** — full day (6+ hrs): 1.0×, half day: 0.65×

### Pricing
Shop prices = `basePrice × qualityMultiplier × reputationMultiplier`

- **qualityMultiplier** — quality score 50 → 1.0×; quality 90 → 2.0×; quality 30 → 0.6×
- **reputationMultiplier** — matches reputation tier table above

### Staffing
Each open day requires at least one assigned shop worker (a retail/customer-facing role from the workers spec). No worker = shop stays closed regardless of hours setting.

---

## 2. Buyer Contracts

A buyer commits to purchasing a fixed quantity of a specific product at a fixed price per unit, on a recurring weekly or monthly schedule. Contracts are offered by buyers based on reputation tier and what products the farm has been producing.

### Contract structure
```typescript
interface BuyerContract {
  id: string;
  buyerName: string;
  productId: string;
  quantityPerCycle: number;
  pricePerUnit: number;         // fixed for contract duration
  minQuality: number;           // 0 if buyer doesn't care
  cycleDays: 7 | 30;
  durationDays: number;         // total contract length
  penaltyPerShortfall: number;  // cost if you can't deliver
  startDay: number;
  nextDeliveryDay: number;
}
```

The player accepts or declines offers. Accepted contracts auto-deduct stock on the delivery day. If stock is insufficient, a penalty is charged and reputation takes a hit.

---

## 3. Spot Sales

Immediate one-off sale of any quantity at the current market price. No quality minimum, no buyer relationship required. Useful for clearing surplus or offloading goods approaching expiry.

Spot sale price = `marketBasePrice × qualityMultiplier × 0.85` (5% discount vs shop price reflects no relationship premium).

Available from day 1. No unlock required.

---

## 4. Farmers Markets

Weekly markets held in nearby towns. The player loads a van with stock and sends a worker to staff the stall for the day. The worker returns with cash and any unsold stock.

### Mechanics
- Markets occur on a fixed day each week (e.g. Saturday)
- Player selects which products to load and quantity
- Revenue = `units sold × marketStallPrice`
- Units sold depends on stall traffic, product quality, and worker's sales skill
- Unsold stock returns to inventory (no waste unless something spoils in transit)
- Worker is unavailable to the farm for that day

### Stall pricing
`marketStallPrice = basePrice × qualityMultiplier × 1.1` (slight premium over shop due to personal selling)

### Unlock
Available once a Farm Shop (Tier 1) is built.

---

## 5. Restaurant & Hotel Supply

Recurring supply relationships with local restaurants and hotels. These buyers pay a significant premium but enforce strict quality minimums and expect reliable weekly delivery.

### Contract differences from buyer contracts
- Quality minimums are non-negotiable (typically 70–85)
- Any delivery below minimum quality cancels the contract immediately and costs reputation
- Price premium: 1.4–1.8× base market price depending on restaurant prestige
- Require **Local reputation tier** (score ≥ 25) to unlock; premium hotels require **Respected** (score ≥ 70)

### Buyer types
| Buyer | Quality min | Price multiplier | Reputation required |
|-------|------------|-----------------|-------------------|
| Local pub / bistro | 65 | 1.4× | Local (25) |
| Town restaurant | 72 | 1.55× | Established (50) |
| Fine dining restaurant | 82 | 1.75× | Respected (70) |
| Boutique hotel | 78 | 1.7× | Respected (70) |
| 5-star hotel | 88 | 2.0× | Renowned (85) |

---

## 6. Online Shop

Sells shelf-stable products by mail order to customers across the country. Unlocks at Farm Shop Tier 2 and **Established** reputation (score ≥ 50).

### Eligible products
Only shelf-stable goods: saffron tins, dried herbs, honey, spirits, aged cheese (vacuum-packed), jams, pickles, olive oil, infused oils, vinegar, candles, yarn, leather goods, aged balsamic. Fresh goods, ice cream, and fresh meat cannot be sold online.

### Mechanics
- Player sets stock allocation per product for the online shop
- Orders arrive daily based on reputation and product listing quality
- Each order dispatches automatically; courier cost deducted per order
- Order volume scales with reputation — at Renowned, national reach means significantly higher order rates
- Returns are possible (rare): spoiled-in-transit item generates a reputation penalty and refund

### Pricing
`onlinePrice = basePrice × qualityMultiplier × reputationMultiplier × 1.05` (small premium for convenience)

---

## 7. Agricultural Shows & Competitions

Seasonal events where the player enters their best-quality batches for judging. No revenue from the entry itself — the value is the award, which boosts reputation and permanently increases prices for that product in the farm shop.

### Mechanics
- Shows occur 2–4 times per year (spring county show, summer agricultural fair, autumn harvest festival, winter specialist show)
- Player selects a product and a batch to enter (batch is consumed — it cannot be sold if entered)
- Judging is based on quality score with a small random variance (judge's preference)
- Awards: Gold (quality ≥ 88), Silver (75–87), Bronze (60–74), No award (<60)
- Winning products display an award badge in the shop, commanding a price premium

### Award price effect
| Award | Shop price bonus for that product | Duration |
|-------|----------------------------------|----------|
| Bronze | +10% | Permanent |
| Silver | +20% | Permanent |
| Gold | +35% | Permanent |
| Multiple gold (same product) | Stacks up to +60% | Permanent |

---

## 8. Wholesale Distributor

A bulk buyer who takes large volumes at low margin. No quality minimum. The distributor acts as a safety valve — anything you can't sell elsewhere can be unloaded here, preventing spoilage losses.

### Mechanics
- Available from day 1, no unlock required
- Price = `basePrice × 0.65` (35% below market — punishing but better than waste)
- No quantity limit — the distributor always takes what you offer
- No relationship, no contract, no reputation effect

---

## 9. Farm Café

An on-site café/tearoom that serves food and drink made from the farm's own produce. Unlocks at Farm Shop Tier 3 (Visitor Centre).

### Mechanics
- Generates daily revenue from visitors who eat and drink on-site
- Consumes produce directly from inventory each open day (milk, eggs, bread, jams, etc.)
- Revenue scales with visitor numbers (shared foot traffic with the shop)
- Requires at least one café worker (cooking skill)
- Menu is auto-populated from available inventory — no player menu management
- Quality of produce used determines customer satisfaction, which feeds reputation

### Revenue formula
`caféRevenue = dailyVisitors × averageSpendPerHead × qualityModifier`

- averageSpendPerHead: ~$8–$18 depending on product range available
- qualityModifier: 0.7× (quality avg < 50) to 1.3× (quality avg > 80)

---

## 10. Veg Box / Subscription Scheme

Customers subscribe to a weekly box of seasonal produce. They pay upfront at the start of each week. The player packs whatever is in season and available — subscribers accept seasonal variation.

### Mechanics
- Subscribers sign up in batches (5–20 per week based on reputation and marketing)
- Each subscriber pays a fixed weekly fee upfront
- On delivery day, the game auto-packs boxes from available inventory in priority order: processed goods first, then raw produce
- If inventory is insufficient to fill all boxes, partial fulfilment is allowed but unsatisfied subscribers may cancel
- Seasonal variation is expected — subscribers do not cancel for receiving different products, only for under-filled boxes or poor quality

### Box tiers
| Tier | Weekly fee | Contents value | Min quality |
|------|-----------|---------------|-------------|
| Basic Veg Box | $15 | $10 of produce | 40 |
| Premium Box | $28 | $18 of produce + 1 processed item | 65 |
| Luxury Hamper | $55 | $35 of premium goods | 80 |

### Unlock
Available once Farm Shop Tier 2 is built.

---

## State Interface

```typescript
interface SellingChannelsState {
  farmShop: {
    tier: 0 | 1 | 2 | 3;          // 0 = not built
    openDays: boolean[];            // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    openHours: number;              // hours open per day
    assignedWorkerIds: string[];
  };
  reputation: number;               // 0–100
  reputationHistory: { day: number; delta: number; reason: string }[];
  buyerContracts: BuyerContract[];
  restaurantContracts: BuyerContract[];
  vegBoxSubscribers: {
    tier: 'basic' | 'premium' | 'luxury';
    count: number;
  }[];
  onlineShopActive: boolean;
  onlineShopAllocations: Record<string, number>; // productId → units allocated
  farmCafeOpen: boolean;
  farmCafeWorkerIds: string[];
  awardHistory: {
    day: number;
    productId: string;
    show: string;
    award: 'gold' | 'silver' | 'bronze';
  }[];
  productAwardBonuses: Record<string, number>; // productId → cumulative % bonus
}
```

---

## advanceDay() Integration

Each tick:
1. If farm shop is open today: calculate visitors, sell stock, log revenue
2. Check all buyer/restaurant contracts with `nextDeliveryDay === currentDay`: deduct stock, pay out, apply penalties for shortfalls, update reputation
3. Process veg box delivery day (weekly): auto-pack boxes, collect subscriber fees, handle shortfalls
4. Process online shop orders: calculate daily orders, deduct allocated stock, deduct courier costs, pay revenue
5. Process farm café: deduct produce consumed, calculate revenue, update reputation
6. Check for upcoming agricultural shows: notify player 7 days before deadline to enter
7. Apply reputation decay (−0.05) if no positive reputation events this week

---

## Integration with Other Systems

- **Processing spec:** Processed goods flow into all channels. Quality scores from the processing system directly determine prices and award outcomes.
- **Workers spec:** Farm shop, café, and farmers market stalls each require assigned workers. Worker sales skill affects stall revenue. Café worker cooking skill affects café satisfaction.
- **Electricity spec:** Farm shop and visitor centre draw power. Power outage closes the shop.
- **Breeds & price engine specs:** Higher animal breed quality raises base output quality, which flows through to better reputation gains and premium prices in all channels.
