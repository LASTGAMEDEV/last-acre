
# Community Supported Agriculture (CSA)

**Date:** 2026-05-11  
**Status:** Approved by user — ready for implementation  
**Depends on:** `2026-04-19-selling-channels-design.md` (selling channels), reputation system (existing)

---

## 1. Executive Summary

CSA is a selling model where subscribers pay the full season upfront — the farmer gets cash flow security on day 1, subscribers get a weekly box of mixed produce for 13 weeks. Bad harvests mean smaller boxes, not lost revenue (risk-sharing). The challenge is variety: CSA subscribers expect a diverse box every week, not 13 weeks of the same crop.

Weekly delivery checks create real pressure. Miss a week → subscriber satisfaction drops. Miss several → subscribers cancel. Great boxes build loyalty, word-of-mouth growth, and eventual waiting lists.

Three CSA seasons per year: Spring, Summer, Autumn. No winter CSA — nothing to deliver.

---

## 2. Subscription Tiers

| Box Size | Weekly Contents | Seasonal Price (13 weeks) | Typical Subscribers |
|----------|----------------|--------------------------|---------------------|
| Small | 4–6 kg mixed | €65/season | 5–25 |
| Medium | 8–12 kg mixed | €105/season | 10–40 |
| Large | 15–20 kg mixed | €185/season | 5–15 |

Player sets prices within a ±15% range of these defaults. Too cheap = money left on table. Too expensive = slower acquisition and faster churn.

---

## 3. Upfront Payment — The Core Mechanic

At season start (day 1 of each Spring, Summer, Autumn), all active subscribers pay in full:

```ts
const seasonRevenue = csaSubscribers.reduce((sum, s) =>
  sum + TIER_PRICE[s.boxSize] * priceModifier, 0
);
money += seasonRevenue;
addNewsEvent(`💶 CSA season started: received €${seasonRevenue} from ${csaSubscribers.length} subscribers`);
```

This cash arrives before any work is done — it's the entire point of CSA. The obligation is 13 weekly deliveries to justify it.

---

## 4. Weekly Box Fulfillment

Every 7 days, `advanceDay()` checks whether the player can fill this week's boxes.

### 4a. What a Box Needs

Each box must contain produce from **at least 3 different crop types** to count as good variety. Variety is tracked by category:

| Category | Crops | CSA Value |
|----------|-------|-----------|
| Vegetables | Tomatoes, potatoes | High |
| Fruit | Strawberries | High |
| Legumes | Soy, clover (if sold fresh) | Medium |
| Grains | Wheat, corn, barley | Low (fills weight but no variety credit) |
| Specialty | Saffron, lavender, honey, eggs | High (small quantity counts) |

Grains alone do not satisfy CSA variety — subscribers want market-basket produce, not commodity grain. A box that's 100% wheat is a failed delivery even if it meets the weight.

```ts
function evaluateBoxFulfillment(
  inventory: StoredBatch[],
  commitment: CSACommitment,
  week: number
): BoxFulfillmentResult {
  // Calculate total kg needed, check variety (≥3 categories), return fill rate
}
```

### 4b. Fulfillment Outcomes

| Fill Rate | Variety Met? | Outcome |
|-----------|-------------|---------|
| 100% | Yes | Full delivery — satisfaction +5 |
| 100% | No | Poor variety — satisfaction +1 |
| 50–99% | Any | Partial delivery — satisfaction −10 |
| < 50% | Any | Near-empty box — satisfaction −20 |
| 0% | Any | No delivery — satisfaction −30 |

### 4c. Bonus Items

If player has surplus produce above the committed amount, the extra can be added to boxes:
- Player sees: *"You have 3.2t surplus tomatoes — add bonus items to this week's boxes? [Yes] [No]"*
- Adding bonus: satisfaction +8 for all subscribers this week
- Doesn't cost extra — it's produce that would otherwise sit in storage

---

## 5. Subscriber Satisfaction & Churn

Each subscriber has a satisfaction score (0–100), starting at 60 for new subscribers.

```ts
interface CSASubscriber {
  id: string;
  name: string;
  boxSize: 'small' | 'medium' | 'large';
  pricePerSeason: number;
  satisfaction: number;          // 0–100
  seasonsSubscribed: number;
  joinedDay: number;
}
```

**Satisfaction thresholds:**
- ≥ 80: Loyal — likely to renew, will recommend to others
- 50–79: Content — will renew if nothing changes
- 30–49: At risk — one more bad week triggers cancellation consideration
- < 30: Will not renew next season, may cancel mid-season

**Mid-season cancellation:** If satisfaction drops below 20, subscriber cancels with 1-week notice. No refund given (they accepted the risk-sharing terms). This is harsh but real — it means consistent partial deliveries are worse than one zero delivery from a declared crisis.

---

## 6. Risk Sharing — Force Majeure

If a declared crop failure event occurs (drought, frost, flood, hail damage):

```ts
if (crisisEvent.type === 'crop_failure') {
  addNewsEvent("📬 CSA crisis notice sent to subscribers: [Event] reduced this week's boxes. Subscribers have been notified — satisfaction penalty halved.");
  satisfactionPenalty *= 0.5;  // subscribers accept this as part of CSA model
}
```

Subscribers who've been with you 3+ seasons take crisis even better: `satisfactionPenalty *= 0.3`. Long-term relationships matter.

---

## 7. Subscriber Growth & Renewal

**Season renewal** (each season end, before next season starts):

```ts
function renewalProbability(sub: CSASubscriber): number {
  if (sub.satisfaction >= 80) return 0.95;
  if (sub.satisfaction >= 60) return 0.75;
  if (sub.satisfaction >= 40) return 0.40;
  return 0.10;
}
```

**New subscriber acquisition per season:**

| Source | New Subscribers | Condition |
|--------|----------------|-----------|
| Word of mouth | +1–3 | Avg satisfaction ≥ 70 |
| Reputation | +2–5 | Farm reputation ≥ 60 |
| Local market presence | +3–8 | Active local market selling channel |
| Organic certification | +2–4 | Any certified organic parcels |

**Market saturation cap** based on farm location:
- Rural (near small village): max ~40 subscribers
- Peri-urban (near town): max ~120 subscribers

Growing beyond cap requires marketing investment (future scope).

---

## 8. State Additions

```ts
// Added to GameState:
csaSubscribers: CSASubscriber[];
csaActive: boolean;              // player has set up CSA (opted in)
csaCommitment: CSACommitment;
csaSeasonStart?: number;         // day current CSA season started
csaWeeklyLog: CSAWeekLog[];      // for display in Economy screen

interface CSACommitment {
  smallBoxes: number;
  mediumBoxes: number;
  largeBoxes: number;
  priceModifier: number;  // 0.85–1.15 (player-set pricing)
}

interface CSAWeekLog {
  weekNumber: number;   // 1–13
  fillRate: number;     // 0.0–1.0
  varietyMet: boolean;
  bonusItemAdded: boolean;
  avgSatisfactionChange: number;
}
```

---

## 9. UI — Economy Screen: CSA Tab

```
Community Supported Agriculture

Season: Summer Year 3  (Week 6 of 13)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subscribers:      34  (↑6 from last season)
Season revenue:  €3,510 received ✅ Day 1

This Week's Delivery (due in 2 days)
  Need: 21× small, 9× medium, 4× large
  Inventory available:
    Tomatoes  8.2t ✅   Potatoes  3.1t ✅
    Wheat     4.0t ⚠️  (grain only — variety not met)
    Eggs      180  ✅   Strawberries  0.4t ✅
  Variety: 4 categories ✅   Fill rate: ~95% ✅
  [Allocate & deliver →]

Subscriber Satisfaction: ████████░░  74% avg
  3 subscribers at risk (sat < 40)  [View →]

Delivery History
  Week 1  ✅ Full  5 categories  avg +4
  Week 2  ✅ Full  4 categories  avg +5
  Week 3  ✅ Full  bonus items!  avg +13
  Week 4  ⚠️ 72%  only wheat    avg −9
  Week 5  ✅ Full  3 categories  avg +5

Next Season Forecast
  Projected renewals:  28/34
  Projected new subs:  +7
  Projected revenue:   €3,675
```

---

## 10. Implementation Order

### Phase 1 — Data
1. Add `CSASubscriber`, `CSACommitment`, `CSAWeekLog` types
2. Add `csaSubscribers`, `csaActive`, `csaCommitment`, `csaSeasonStart`, `csaWeeklyLog` to `GameState`

### Phase 2 — Logic
3. `engine/csa.ts` — `evaluateBoxFulfillment()`, `updateSatisfaction()`, `computeRenewals()`, `computeNewSubscribers()`
4. Season start (Spring/Summer/Autumn day 1): collect upfront payment from active subscribers
5. `advanceDay()` every 7 days: run fulfillment evaluation, apply satisfaction changes
6. Mid-season cancellation check: satisfaction < 20 → remove subscriber
7. Season end: renewal calculation, new subscriber acquisition
8. Force majeure: satisfaction penalty halved on crop failure events

### Phase 3 — UI
9. CSA tab in Economy screen
10. Weekly fulfillment allocation view
11. Satisfaction bars per subscriber
12. Delivery history log
13. Season start notification in DaySummaryModal
14. Weekly delivery reminder (3 days before due)

---

## 11. Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Weekly checks | More realistic and more tense than season-end accounting |
| 2 | Upfront payment day 1 | The core CSA cash flow benefit — non-negotiable |
| 3 | 3-category variety minimum | Grains alone don't satisfy — forces diversified production |
| 4 | Grains count for weight, not variety | Realistic — CSA customers want fresh produce, not commodity crops |
| 5 | Risk-sharing halved penalty | CSA subscribers knowingly accepted weather risk — they don't punish hard for crop failure |
| 6 | No refund on mid-season cancel | Risk was accepted upfront — player keeps payment |
| 7 | Market saturation cap | Prevents trivial infinite scaling |
| 8 | Organic certification bonus | Certified organic CSA is a real premium niche — +2–4 subs/season |

---

## 12. Out of Scope

- Custom box configuration (subscriber chooses contents)
- Delivery routing / logistics
- Restaurant/chef bulk CSA (different mechanic)
- Online waitlist management
- Direct messaging with subscribers

---

## 13. Files Touch Summary

| Action | Files |
|--------|-------|
| **New** | `engine/csa.ts` |
| **Modify** | `types/index.ts` (CSASubscriber + CSACommitment + CSAWeekLog + GameState), `store/useGameStore.ts` (season start payment + weekly fulfillment check + advanceDay + renewal logic), `app/(tabs)/economia.tsx` (CSA tab), DaySummaryModal (season start + weekly delivery events) |
