# Annual Farm Planning - Design Spec
**Date:** 2026-06-03
**Project:** Granja Tycoon / Last Acre
**Status:** Approved for implementation planning

---

## Overview

Annual Farm Planning adds a yearly strategy briefing to the Office tab. At the start of each in-game year, the player chooses an advisor style, receives a generated whole-farm plan, tweaks the goal cards, and approves a soft commitment for the year.

The system is a planning layer, not an automation layer. It reads the current farm state, timeline era, market conditions, neighbour pressure, co-op health, and operational bottlenecks, then turns that into goals, forecasts, risk warnings, and recommended actions. The player still makes every real farm decision manually.

Completed goals award legacy and morale-style benefits. Missed goals have no downside.

---

## Design Goals

- Make the existing deep systems easier to understand and act on.
- Give each in-game year a clear strategic identity.
- Connect farm operations, market strategy, neighbours, timeline, workers, animals, soil, and finance into one readable briefing.
- Keep commitments soft so the player can react to weather, disasters, family events, and market shocks.
- Avoid spreadsheet fatigue by generating a useful first draft instead of asking the player to fill blank forms.
- Keep the first build contained inside Office, with no new main tab and no HUD dependency.

---

## Core Loop

1. At the start of a new calendar year, the game marks Annual Planning as available.
2. The player opens the Annual Plan section in Office.
3. The game recommends an advisor style based on the farm state.
4. The player chooses an advisor style.
5. The game generates a draft whole-farm plan.
6. The player reviews forecast cards, risk warnings, goals, and recommended actions.
7. The player can replace goals, remove optional goals, or adjust numeric targets within safe bounds.
8. The player approves the plan.
9. During the year, the Office section tracks goal progress and shows time-sensitive recommendation cards.
10. At year end, the game creates a Plan Review with completed goals and earned legacy/morale rewards.
11. The next year can begin with a fresh advisor-generated plan.

---

## Advisor Styles

Advisor styles change plan priorities. They do not change core rules or create hidden penalties.

| Advisor | Priority |
|---------|----------|
| Steady Steward | Debt control, reliability, savings, repairs, avoiding overextension |
| Expansion Planner | Land acquisition, buildings, machinery, workers, production growth |
| Soil & Sustainability Advisor | Rotation, cover crops, organic matter, hedgerows, compost, reduced tillage, water care, organic certification |
| Market Strategist | Futures, storage timing, selling channels, contracts, co-ops, price alerts, processed goods |
| Livestock Operator | Feed planning, breeding, production buildings, welfare, manure use, winter readiness |
| Community Builder | Workers, family, reputation, neighbours, CSA, co-op relationships, direct sales, local trust |

The game may recommend a default advisor, but the player can pick any advisor.

---

## Plan Inputs

Annual Planning should read existing state instead of owning existing systems.

Inputs include:

- current day and calendar year
- active timeline effects and historical unlocks
- money, debt, savings, loans, and recent sales
- owned land, planted crops, crop history where available, soil stats, water state, hedgerows, tillage, organic state
- inventory, stored batches, processing buildings, processed inventory
- animals, feed availability, production buildings, welfare/hygiene where available
- workers, payroll, satisfaction, injuries, applicants, and role coverage
- machines, attachments, trailers, maintenance state, fuel
- contracts, recurring contracts, buyers, CSA, co-ops, futures, market orders, prices, price history
- map fields, NPC farms, auctions, leases, and neighbour pressure
- electricity, water, storage, and other infrastructure bottlenecks
- dynasty/family/reputation state when Phase 3 is available

If an input is missing or not yet implemented, the planner should degrade gracefully by omitting that recommendation category.

---

## Plan Output

An approved annual plan contains:

- 4 to 7 goal cards
- forecast summary cards
- risk warnings
- recommendation cards
- yearly progress state
- year-end review state

### Goal Cards

Goal cards must be measurable from existing state. Each goal has:

```ts
type AnnualPlanGoal = {
  id: string;
  category: AnnualPlanGoalCategory;
  title: string;
  description: string;
  metric: AnnualPlanMetric;
  target: number;
  current: number;
  unit: string;
  required: boolean;
  completed: boolean;
  reward: AnnualPlanReward;
};
```

Goal categories:

- planting
- rotation
- soil
- finance
- livestock
- machinery
- market
- community
- infrastructure

Example goals:

- Plant at least 15 ha of wheat or corn.
- Avoid repeating the same crop on more than 40% of last year's fields.
- Raise average organic matter or reduce average compaction.
- Finish the year with debt below a target or savings above a target.
- Secure enough feed for winter.
- Repair critical machines before peak season.
- Fulfill signed contracts.
- Join or strengthen a co-op relationship.
- Keep worker satisfaction above a target.

### Forecast Cards

Forecast cards are read-only summaries:

- projected cashflow
- expected revenue band
- expected cost band
- weather and water exposure
- labour pressure
- machinery bottlenecks
- storage and processing bottlenecks
- soil impact
- market risk
- neighbour and auction risk

Forecasts should be expressed as bands and risk labels, not false precision.

### Recommendation Cards

Recommendation cards appear in the Office plan section when useful. They are dismissible and do not block play.

Examples:

- Spring planting window opens soon.
- You planned 20 ha of corn but only own enough seed for 12 ha.
- Export prices are strong; consider booking transport.
- Planned harvest may exceed storage capacity.
- A neighbour farm may compete for nearby land this year.
- Debt plan is on track.
- Feed reserves are below the livestock plan.
- Machinery repair should happen before harvest.

Recommendation triggers can be:

- time-based
- goal-progress-based
- risk-based
- market-opportunity-based
- neighbour-pressure-based
- infrastructure-bottleneck-based

---

## Rewards

Annual Planning uses soft rewards only. There are no cash payouts and no penalties for missed goals in the first build.

Reward types:

- legacy score progress
- worker morale or satisfaction bump
- family confidence or farm confidence, if Phase 3 state exists
- advisor trust, reserved for future advisor personality depth
- narrative review praise

Missed goals simply do not award their completion reward.

---

## UI Flow

Annual Planning lives in the Office tab as a new section.

### No Active Plan

Shown at the start of a new year, or when no plan exists.

Content:

- recommended advisor style
- advisor style selector
- short explanation of the selected advisor
- generate plan button

### Draft Plan

Shown after generating a plan and before approval.

Content:

- advisor style
- forecast cards
- risk warnings
- goal cards
- replace goal action
- remove optional goal action
- numeric target adjustment where supported
- approve plan action

The draft should feel like a strategy briefing, not a form.

### Active Plan

Shown after approval.

Content:

- year and advisor style
- overall progress
- goal progress cards
- current recommendation cards
- forecast status
- completed goals

### Plan Review

Shown after the year ends.

Content:

- completed goals
- incomplete goals
- best decision or strongest result
- missed opportunities, phrased neutrally
- earned legacy/morale rewards
- suggested advisor for next year

The review does not shame or punish the player.

---

## Engine Architecture

New file:

```txt
engine/annualPlanning.ts
```

Responsibilities:

- recommend advisor style
- generate annual plan draft
- calculate forecast cards
- calculate goal progress
- generate recommendation cards
- generate end-of-year review
- calculate soft rewards for completed goals

The engine must be pure. It receives state snapshots as input and returns new planning objects. It does not import the store and does not mutate farm systems.

Conceptual API:

```ts
export function recommendAdvisor(input: AnnualPlanningInput): AdvisorStyle;
export function generateAnnualPlanDraft(input: AnnualPlanningInput, advisor: AdvisorStyle): AnnualPlanDraft;
export function updateAnnualPlanProgress(input: AnnualPlanningInput, plan: AnnualPlan): AnnualPlan;
export function generateAnnualPlanRecommendations(input: AnnualPlanningInput, plan: AnnualPlan): AnnualPlanRecommendation[];
export function generateAnnualPlanReview(input: AnnualPlanningInput, plan: AnnualPlan): AnnualPlanReview;
```

---

## Store Shape

Conceptual store state:

```ts
type AnnualPlanStatus = 'none' | 'draft' | 'active' | 'reviewed';

type AnnualPlanningState = {
  activeYear: number;
  status: AnnualPlanStatus;
  selectedAdvisor?: AdvisorStyle;
  draft?: AnnualPlanDraft;
  active?: AnnualPlan;
  review?: AnnualPlanReview;
  dismissedRecommendationIds: string[];
};
```

Conceptual store actions:

```ts
generateAnnualPlan(advisor: AdvisorStyle): void;
replaceAnnualPlanGoal(goalId: string): void;
adjustAnnualPlanGoal(goalId: string, target: number): void;
approveAnnualPlan(): void;
dismissAnnualPlanRecommendation(id: string): void;
completeAnnualPlanReview(): void;
```

Adding this state changes the persisted store shape, so implementation should bump the save key.

---

## advanceDay Integration

The `advanceDay()` integration should stay light:

- detect new calendar year
- mark the planning state as needing a new plan
- update active plan progress
- refresh recommendations
- generate year-end review when the prior year closes
- apply soft rewards for completed goals once

The planner must not:

- plant crops
- sell goods
- sign contracts
- buy machines
- repair machines
- hire workers
- borrow money
- force a player choice
- punish missed goals

---

## First Build Scope

### In Scope

- Office section for Annual Plan
- advisor-style selection
- generated whole-farm draft plan
- editable goal cards
- approval flow
- active-year progress tracking
- recommendation cards
- year-end review
- legacy and morale-style rewards for completed goals
- no downside for missed goals
- farm-state, timeline, neighbour, co-op, market, worker, animal, and land awareness where data is already available

### Out of Scope

- automatic farm actions
- hard penalties
- new HUD shortcut
- cloud save changes
- complex multi-year plans
- full visual calendar scheduling
- AI text generation or external API
- new main navigation tab
- forced tutorial flow

### Future Extensions

- multi-year strategic plans
- seasonal replanning after disasters
- farm board or family meeting events
- advisor personalities with trust levels
- plan templates based on famous farming strategies
- visual workload calendar
- plan sharing/export

---

## Testing and Verification

There is no formal test suite in the repo. Implementation should verify with:

- `npx tsc --noEmit`
- `npx expo lint`
- manual web smoke test
- start a new year and generate a plan
- approve a plan and advance days
- verify progress changes without auto-playing the farm
- verify completed goals award once
- verify missed goals create no penalty
- verify save/hydration keeps actions intact through `partialize`

---

## Open Implementation Notes

- Keep recommendation text deterministic and template-based.
- Prefer risk labels and bands over exact projections.
- Do not require Living History Phase 3 state. Use it when present, omit those categories when absent.
- The Office UI should reuse existing section/card patterns and avoid adding another top-level tab.
- Goal IDs and advisor IDs are internal persisted strings and should not be renamed after release without a save migration.
