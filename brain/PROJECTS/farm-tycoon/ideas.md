# Farm Tycoon Ideas Register

> Capture new mechanics, realism ideas, quality-of-life ideas, and future extensions here so they are not lost between design sessions.
> Bugs and technical debt stay in `backlog.md`. Approved feature specs stay in `docs/superpowers/specs/`.

---

## How To Use This File

When adding an idea, keep it short but concrete:

```md
### Idea Name
- **Status:** raw idea | promising | needs design | specced | shipped | rejected
- **Theme:** planning | realism | economy | animals | crops | UI | neighbours | dynasty | operations
- **Why it matters:** One sentence on player value.
- **First version:** Smallest useful version.
- **Notes:** Constraints, dependencies, or future expansion hooks.
```

Status meanings:

- **raw idea:** captured but not evaluated
- **promising:** worth discussing
- **needs design:** agreed direction, needs a spec
- **specced:** has a design spec
- **shipped:** implemented
- **rejected:** intentionally not pursuing

---

## Active Design Candidates

### Annual Farm Planning
- **Status:** specced
- **Spec:** `docs/superpowers/specs/2026-06-03-annual-farm-planning-design.md`
- **Theme:** planning, whole-farm strategy, Office
- **Why it matters:** Gives every in-game year a strategic identity and helps players understand the existing deep systems.
- **First version:** Office-based advisor-generated yearly plan with soft goals, forecasts, recommendations, progress tracking, and year-end review.
- **Notes:** Missed goals have no downside. Completed goals can award legacy and morale-style rewards.

### Full-Scale Adaptive Guide
- **Status:** specced
- **Spec:** `docs/superpowers/specs/2026-06-03-full-scale-adaptive-guide-design.md`
- **Theme:** guide, onboarding, UI, visuals, era-aware help
- **Why it matters:** Gives lost players a reliable way to understand every object and system, then return to play with a clear next action.
- **First version:** Compiled searchable guide, object-level info buttons, long-press shortcuts, era-aware and farm-state-aware entries, diagrams, and category-level generated illustrations.
- **Notes:** Advisor-aware guide entries are deferred until Annual Farm Planning exists.

---

## Deferred From Annual Farm Planning V1

These ideas are good candidates, but they are intentionally outside the first Annual Farm Planning build so the core planner can ship cleanly.

### Automatic Farm Actions
- **Status:** promising
- **Theme:** automation, operations
- **Why it matters:** Could reduce repetitive late-game management.
- **First version:** Optional one-click "apply recommendation" buttons for simple actions.
- **Notes:** Deferred because the planner should advise first, not play the game. Auto-actions create edge cases around money, inventory, contracts, timing, and player agency.

### Hard Plan Penalties
- **Status:** rejected for planning V1
- **Theme:** difficulty, goals
- **Why it matters:** Could make business plans feel binding in harder modes.
- **First version:** Optional hard-mode modifier only.
- **Notes:** Rejected for the base planner because missed goals should have no downside. Could return as an opt-in difficulty rule.

### HUD Plan Shortcut
- **Status:** promising
- **Theme:** UI, planning
- **Why it matters:** Keeps important plan warnings visible without opening Office.
- **First version:** Small HUD badge for active urgent recommendations.
- **Notes:** Deferred because the chosen first home is Office. Add only if playtesting shows the planner feels hidden.

### Cloud Save Changes
- **Status:** raw idea
- **Theme:** infrastructure, saves
- **Why it matters:** Long-running dynasty saves need strong persistence across devices.
- **First version:** Cloud sync for existing save/export/import flow.
- **Notes:** Separate infrastructure project, not part of Annual Planning V1.

### Multi-Year Strategic Plans
- **Status:** promising
- **Theme:** planning, dynasty, finance
- **Why it matters:** Supports debt strategy, crop rotations, land expansion, machinery depreciation, and generational planning.
- **First version:** Three-year plan with high-level goals only.
- **Notes:** Needs Annual Planning V1 first. Should also wait until Living History Phase 3 settles.

### Visual Workload Calendar
- **Status:** promising
- **Theme:** UI, operations, planning
- **Why it matters:** Helps players see planting, harvest, spraying, contractor, worker, transport, and processing bottlenecks.
- **First version:** Read-only seasonal workload timeline.
- **Notes:** Larger than a planner subfeature. Could later become a full scheduling system.

### AI Text Generation / External API
- **Status:** rejected for planning V1
- **Theme:** recommendations, narrative
- **Why it matters:** Could make advisors feel more expressive.
- **First version:** Optional generated advisor summaries.
- **Notes:** V1 should use deterministic local templates so the game remains offline-friendly, cheap, fast, and testable.

### Dedicated Annual Plan Tab
- **Status:** rejected for planning V1
- **Theme:** navigation, UI
- **Why it matters:** Could make planning more discoverable.
- **First version:** Main tab if Annual Planning becomes central enough.
- **Notes:** Rejected for V1 because Office is the agreed home and navigation is already dense.

### Forced Tutorial Flow
- **Status:** rejected for planning V1
- **Theme:** onboarding
- **Why it matters:** Could teach first-time players how planning works.
- **First version:** Optional first-year walkthrough.
- **Notes:** Avoid forced hand-holding. Use start-of-year prompt and Office discovery first.

### Seasonal Replanning After Disasters
- **Status:** promising
- **Theme:** planning, disasters, resilience
- **Why it matters:** Lets players adapt plans after droughts, disease, market shocks, or family events.
- **First version:** One mid-year "revise plan" option triggered by major events.
- **Notes:** Good follow-up after the annual loop works.

### Farm Board / Family Meeting Events
- **Status:** promising
- **Theme:** dynasty, family, planning, narrative
- **Why it matters:** Turns planning into a character moment instead of only an Office dashboard.
- **First version:** Annual meeting card with spouse/heir/worker comments.
- **Notes:** Best after Living History Phase 3 family and reputation systems are stable.

### Advisor Personalities With Trust Levels
- **Status:** promising
- **Theme:** advisors, progression, planning
- **Why it matters:** Makes advisor styles feel like relationships, not filters.
- **First version:** Advisor trust increases when their recommended goals are completed.
- **Notes:** Keep as cosmetic/soft reward at first.

### Advisor-Aware Guide Entries
- **Status:** promising
- **Theme:** guide, advisors, planning, onboarding
- **Why it matters:** Helps the guide explain systems through the player's current strategy instead of generic advice.
- **First version:** When Annual Farm Planning exists, guide entries can show an "Advisor angle" section tied to the active advisor style and current annual goals.
- **Notes:** Deferred from the first full-scale guide build. V1 guide should be era-aware and farm-state-aware only; advisor-aware guidance can return once the planner is implemented and stable.

### Famous Farming Strategy Templates
- **Status:** raw idea
- **Theme:** planning, education, realism
- **Why it matters:** Gives players recognizable strategic archetypes.
- **First version:** Templates like "low-debt mixed farm", "high-input commodity farm", "organic transition", "dairy intensification".
- **Notes:** Avoid real brand/licensing issues. Strategy names can be fictional.

### Plan Sharing / Export
- **Status:** raw idea
- **Theme:** community, sharing
- **Why it matters:** Lets players share yearly plans, challenges, and screenshots.
- **First version:** Export a text summary or image-like report card.
- **Notes:** Best after the plan review screen has strong presentation.

---

## Other High-Value Mechanics To Consider

### Input Procurement Market
- **Status:** promising
- **Theme:** economy, realism, planning
- **Why it matters:** Makes cost timing matter, not only sell-price timing.
- **First version:** Buy-ahead contracts for fertilizer, feed, fuel, seed, lime, pesticide, and packaging.
- **Notes:** Can interact with co-op discounts, historical shortages, storage capacity, and Annual Planning recommendations.

### Farm Logistics Calendar
- **Status:** promising
- **Theme:** operations, workers, machinery
- **Why it matters:** Creates realistic bottlenecks around planting, harvest, spraying, irrigation, processing, inspections, and transport.
- **First version:** Read-only job pressure calendar before becoming a scheduling tool.
- **Notes:** Strong overlap with Visual Workload Calendar.

### Herd Health & Biosecurity
- **Status:** promising
- **Theme:** animals, realism
- **Why it matters:** Adds meaningful livestock management beyond production and genetics.
- **First version:** Vaccination, quarantine, vet checks, disease-prevention score.
- **Notes:** Fits existing nutrition, genetics, production building, and animal disease systems.

### Traceability & Food Safety
- **Status:** promising
- **Theme:** processing, storage, quality
- **Why it matters:** Gives storage quality and processed batches more gameplay meaning.
- **First version:** Batch IDs, buyer audits, recalls, contamination warnings, premium traceability buyers.
- **Notes:** Works best once processing/storage quality UI is mature.

### Neighbour Diplomacy
- **Status:** promising
- **Theme:** neighbours, world map, reputation
- **Why it matters:** Makes the world feel alive beyond auctions.
- **First version:** Shared machinery, land offers, disputes, worker poaching, emergency help, neighbour trust.
- **Notes:** Strong candidate after Living History Phase 3 neighbours are implemented.

### Farm Diversification
- **Status:** promising
- **Theme:** economy, community, history
- **Why it matters:** Gives farms a hedge against commodity crashes and makes the farm feel like a place.
- **First version:** Farm shop, farmers market, pick-your-own, school visits, B&B, or events as unlockable revenue streams.
- **Notes:** Already appears in the Living History design as a future direction.

### Regulation & Compliance
- **Status:** promising
- **Theme:** realism, risk, certification
- **Why it matters:** Adds realistic pressure around animal welfare, organic rules, water, pesticide use, worker safety, and food hygiene.
- **First version:** Warning-first inspection system with fines only for repeated neglect.
- **Notes:** Should remain readable and avoid feeling like paperwork.

### Crisis Response Choices
- **Status:** promising
- **Theme:** timeline, events, strategy
- **Why it matters:** Makes historical events interactive instead of mostly informational.
- **First version:** Major event choice cards with 2-3 responses such as refinance, store grain, diversify, sell land, join co-op, or invest in irrigation.
- **Notes:** Strong fit for Living History once timeline events cover more years.

---

## Review Queue

Ideas worth discussing next:

1. Input Procurement Market
2. Neighbour Diplomacy
3. Visual Workload Calendar / Farm Logistics Calendar
4. Herd Health & Biosecurity
5. Crisis Response Choices
