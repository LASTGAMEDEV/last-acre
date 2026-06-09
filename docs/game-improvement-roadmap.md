# Granja Tycoon - Whole-Game Improvement Roadmap

**Date:** 2026-06-09  
**Purpose:** A persistent, high-level list of improvements that would make Granja Tycoon better as an overall game.

This roadmap is not a single implementation plan. It is a product direction map: ideas can be pulled from here into focused specs, plans, and milestones.

## Guiding Principle

Make the game easier to understand, more emotionally alive, more strategically interesting, and more satisfying to play moment to moment.

The strongest next milestone would be:

> Make the game understandable, alive, and strategic.

That milestone should prioritize:

1. Daily Attention Dashboard
2. Annual Planning
3. Phase 3 life UI: family, reputation, neighbors
4. "Why did this happen?" explanations
5. Economy and balance audit
6. Better day-end and year-end summaries
7. More market and history storytelling
8. UI hierarchy polish
9. Failure recovery systems
10. Technical extraction and simulation tests

## 1. Player Clarity

- Add a "Today's Priorities" panel on the main dashboard.
- Show the top urgent actions: crops ready, loans due, contracts at risk, animal welfare issues, repairs needed.
- Add "Why did this happen?" explanations after harvests, sales, animal production, reputation changes, and bankruptcy events.
- Improve Day Summary so it groups events by category: Money, Fields, Animals, Market, Family, Risks.
- Add a "What changed since yesterday?" summary.
- Add guide buttons to every confusing stat and card.
- Add clearer locked and unlocked explanations: required reputation, required year, required building, required technology.
- Add better empty states that suggest a useful next action.
- Add optional "Recommended next step" cards.
- Add a "Farm Health" score that summarizes cash, debt, soil, animals, machinery, and reputation.

## 2. Onboarding

- Rebuild the first 10 days around a guided farm start.
- Let players choose a starting style: Crop Farm, Livestock Farm, Market Trader, Balanced Farm.
- Add a first-year goal chain instead of isolated tutorial popups.
- Teach one system at a time: fields first, then selling, then debt, then animals or processing.
- Add safe first-crop recommendations based on season.
- Add a beginner preset with gentler debt and slower disasters.
- Add an advanced start for returning players.
- Let players skip tutorials while keeping contextual guidance available.
- Add early recovery tips when cash runs low.
- Add a first-year review showing what the player learned.

## 3. Annual Planning

- Add an Annual Planning screen in Office.
- Each year, let the player pick an advisor style.
- Generate a whole-farm plan with 4-7 measurable goals.
- Add goal categories: planting, soil, livestock, finance, market, processing, reputation, family.
- Let the player approve, replace, adjust, or remove goals.
- Add yearly risk cards: drought risk, debt risk, feed risk, machinery risk.
- Show forecast cards for market, weather, finance, and family.
- Track goal progress throughout the year.
- Give soft rewards for completed goals: legacy, morale, reputation, small efficiency boosts.
- Add a year-end review with completed goals, missed goals, best decision, and worst bottleneck.
- Keep missed goals non-punitive in the first build.

## 4. Dashboard And Command Center

- Make Office Dashboard the command center of the game.
- Add sections for Today, This Week, This Season, and This Year.
- Rank alerts by severity.
- Add opportunity cards: high prices, good planting weather, auction bargains, neighbor land sales.
- Add risk cards: low cash, contract deadlines, weak feed reserves, machines near failure.
- Add one-tap navigation from each card to the relevant screen.
- Add dismiss and snooze controls for low-priority cards.
- Add a timeline of recent major events.
- Add a farm identity summary such as "Organic grain farm" or "Livestock-heavy mixed farm."

## 5. UI And UX

- Reduce visual clutter in dense screens.
- Standardize card layout: title, state, key numbers, action row.
- Use consistent colors for risk, opportunity, complete, locked, and neutral states.
- Add clearer tab badges for urgent work.
- Improve mobile readability with tighter, cleaner layouts.
- Add stronger typography hierarchy.
- Add compact mode for experienced players.
- Add filters and sorting to large lists: fields, animals, inventory, contracts.
- Add batch actions where useful: batch plant, batch harvest, batch sell, batch feed.
- Add confirmation modals only for high-impact actions.
- Add better disabled button messages.
- Add sticky action bars on long screens.
- Add compare panels before buying machinery, buildings, or animals.
- Use icons where they reduce reading.

## 6. Farming Depth

- Make crop rotation more visible and rewarding.
- Add field history summaries.
- Add soil diagnosis per parcel.
- Add recommended crop choices based on season, soil, water, price, and seed stock.
- Add better yield previews with cause breakdowns.
- Add equipment suitability warnings before planting and harvesting.
- Add weather risk warnings before planting.
- Make crop tiers feel more distinct.
- Add crop diseases that create strategic choices.
- Add cover crop planning as a real seasonal decision.
- Add soil recovery plans.
- Add field specialization over time: grain fields, orchard fields, pasture fields, greenhouse plots.
- Add land quality scouting before purchase.
- Add irrigation planning with water cost forecasts.

## 7. Animals

- Make animal welfare more readable.
- Add animal group summaries: health, feed, production, reproduction.
- Add explanations for production changes.
- Add breeding goals: milk yield, disease resistance, fertility, show quality.
- Add herd and flock identity.
- Add animal aging and retirement.
- Add vet visits and preventive care.
- Add disease containment decisions.
- Add feed reserve warnings by season.
- Add winter preparation for livestock.
- Add animal personality or flavor for high-value animals.
- Add livestock events: prize births, injuries, disease scares, show invitations.
- Add clearer sell, cull, breed, and keep tradeoffs.
- Add production chain previews: milk to cheese, eggs to incubator, wool to textile.

## 8. Machinery

- Make machine condition a more central mechanic.
- Add repair scheduling.
- Add seasonal maintenance reminders.
- Add machine comparison before purchase.
- Add "right tool for the job" recommendations.
- Add breakdown risk forecast.
- Add a used equipment market.
- Add trade-in value.
- Add leasing and renting equipment.
- Add contractor alternatives when the player lacks machinery.
- Add fuel planning and seasonal fuel price pressure.
- Add attachments that meaningfully change field strategy.
- Add machinery paths: cheap used fleet versus modern efficient fleet.

## 9. Economy

- Add clearer profit and loss accounting.
- Add per-crop profitability history.
- Add per-animal profitability.
- Add enterprise reports: crops, livestock, processing, contracts, direct sales.
- Add cashflow forecast for next 7, 30, and 90 days.
- Add a debt pressure meter.
- Add break-even explanations.
- Add better sales log filters.
- Add tax, insurance, and maintenance annual summaries.
- Add price cause explanations: weather, era, global market, local supply.
- Add local market demand shifts.
- Add buyer relationship levels.
- Add contract negotiation.
- Add bad contract warnings.
- Add co-op politics and voting outcomes with real consequences.
- Add emergency financing options with tradeoffs.

## 10. Market Drama

- Add newspaper headlines that explain market movement.
- Add local harvest reports.
- Add competitor production pressure.
- Add export and import shocks.
- Add co-op announcements.
- Add buyer shortages and surpluses.
- Add price seasonality charts.
- Add market rumors with uncertainty.
- Add historical era-specific economic events.
- Add market opportunity alerts.
- Add sell-now versus store comparison.
- Add recurring buyer relationships.
- Add premium niche markets: organic, local, heritage breed, high-quality processed goods.

## 11. Processing

- Make processing chains easier to understand.
- Add recipe profitability preview.
- Add input availability warnings.
- Add batch quality explanations.
- Add aging and expiry timelines.
- Add processing queue view.
- Add worker assignment recommendations.
- Add building bottleneck indicators.
- Add product branding later in the game.
- Add premium products unlocked by reputation, family skill, or technology.
- Add waste and byproduct loops: whey, manure, straw, compost, biogas.
- Add processing contracts.
- Add packaging and distribution upgrades.

## 12. Family And Dynasty

- Finish Phase 3 UI.
- Add Starting Screen with farm name, farmer name, and backstory.
- Add Life Event modal.
- Add Family tab in Legado.
- Add Chronicle tab for generational history.
- Add family roles that visibly affect the farm.
- Add spouse and children life events.
- Add child interest in farming.
- Add heir preparation.
- Add sibling co-ownership drama.
- Add family expenses.
- Add family morale.
- Add major life milestones: marriage, birth, illness, graduation, succession.
- Add emotional year-end family notes.
- Add old farmer retirement option.
- Add legacy traits passed between generations.
- Add named ancestors with achievements.
- Add farm traditions that unlock bonuses over generations.

## 13. Reputation

- Add reputation badge to HUD.
- Add reputation breakdown screen.
- Split reputation into factors: community, reliability, sustainability, animal welfare, business trust.
- Show what changed reputation recently.
- Tie reputation to buyers, loans, co-ops, neighbors, and workers.
- Add reputation tiers with clear perks.
- Add public scandals and community events.
- Add opportunities such as sponsoring a fair, helping a neighbor, or hosting an open day.
- Add local trust as a long-term asset.
- Add bad reputation recovery paths.
- Add reputation-based contract offers.
- Add premium market access.

## 14. Neighbors

- Add visible neighbor farms screen.
- Show 8 nearby farms with status, relationship, specialization, and debt pressure.
- Add neighbor news.
- Add land opportunities when neighbors struggle or retire.
- Add relationship-building actions.
- Add neighbor help events.
- Add rivalry events.
- Add auctions against neighbors.
- Add neighbor co-op voting blocs.
- Add local supply pressure from neighbors.
- Add neighbor bankruptcies as story moments.
- Add generational neighbor families.
- Add possible partnerships or land swaps.

## 15. History And Era Progression

- Expand historical events beyond 1970-1985.
- Add stronger era unlock presentation.
- Add historical technology transitions.
- Add changing market conditions by decade.
- Add inflation and debt pressure by era.
- Add regulation changes.
- Add cultural shifts around organic, local food, sustainability, and technology.
- Add old equipment becoming obsolete.
- Add new machinery and crops over time.
- Add historical newspaper yearly recaps.
- Add subtle era-specific UI flavor.
- Make the farm feel like it exists across decades.

## 16. Failure And Recovery

- Make bankruptcy more interesting.
- Add debt restructuring.
- Add emergency land leaseback.
- Add equipment liquidation.
- Add family loan or family sacrifice event.
- Add co-op emergency support if reputation is high.
- Add neighbor partnership rescue.
- Add short-term high-interest lenders.
- Add survival year planning mode.
- Add recovery goals.
- Add reputation effects without making recovery impossible.
- Add drought and flood recovery grants.
- Add insurance claim clarity.
- Add comeback achievements.

## 17. Progression

- Add clearer early, mid, and late-game arcs.
- Early game: survive, learn, stabilize.
- Mid game: specialize, expand, manage complexity.
- Late game: legacy, resilience, market power, succession.
- Add farm identity paths.
- Add specialization bonuses without locking the player.
- Add long-term achievements that shape legacy.
- Add technology unlock tree by decade.
- Add reputation-gated opportunities.
- Add land region expansion.
- Add farm scale milestones.
- Add retire-this-generation milestone.
- Add optional challenge modes.

## 18. Balance

- Audit money pacing.
- Audit crop profitability.
- Audit livestock profitability.
- Audit processing margins.
- Audit contract rewards and penalties.
- Audit debt difficulty.
- Audit maintenance pressure.
- Audit worker wages.
- Audit land prices.
- Audit event frequency.
- Audit dominant strategy problems.
- Make tradeoffs sharper: storage versus quick sale, debt versus growth, animals versus crops, organic versus conventional.
- Avoid every system becoming pure upside.
- Add opportunity costs.
- Add more soft caps instead of hard blocks.

## 19. Content

- Add more crops with distinct roles.
- Add region-specific crops.
- Add more animal breeds.
- Add more processed goods.
- Add more building upgrades.
- Add more contract types.
- Add more buyer personalities.
- Add more neighbor personalities.
- Add more random events with choices.
- Add more historical events.
- Add more guide entries.
- Add more achievements.
- Add farm-name and family-name flavor text.
- Add rare events that players talk about.

## 20. Audio And Feel

- Add satisfying sounds for harvest, sale, planting, collecting, level-up, and warnings.
- Add subtle seasonal ambience.
- Add different music intensity for normal play and crisis.
- Add haptics on important actions.
- Add small animations for money changes, harvest yield, and reputation changes.
- Add confetti only for major milestones.
- Add warning sounds sparingly.
- Add smoother modal transitions.
- Add tactile button states.
- Add stronger presentation for big moments: first profit, first animal birth, first land expansion, first succession.

## 21. Visual Identity

- Make the farm map more central.
- Add parcel visual states: planted, ready, dry, diseased, organic, hedgerow, irrigated.
- Add small visual farm evolution over years.
- Add better icons for crops, animals, buildings, and machines.
- Add distinctive visual language for each season.
- Add historical newspaper style for major era events.
- Add family portraits or simple silhouettes.
- Add neighbor farm emblems.
- Add product quality badges.
- Add visual distinction for organic and premium goods.
- Add more polished charts.
- Reduce giant text blocks.

## 22. Data And Reports

- Add financial report screen.
- Add crop report screen.
- Add animal report screen.
- Add market report screen.
- Add soil report screen.
- Add annual report.
- Add generational legacy report.
- Add most profitable enterprise stat.
- Add biggest expense stat.
- Add highest risk stat.
- Add historical graphs.
- Add player decision history.
- Add exportable save or report later if useful.

## 23. Difficulty And Game Modes

- Add difficulty presets.
- Add relaxed mode.
- Add standard mode.
- Add hard economy mode.
- Add historical realism mode.
- Add sandbox mode.
- Add optional permadeath dynasty mode.
- Add disaster frequency setting.
- Add market volatility setting.
- Add tutorial intensity setting.
- Add starting farm templates.
- Add custom start options.

## 24. Quality Of Life

- Add search and filtering wherever inventory or lists get large.
- Add "sell all above reserve."
- Add inventory reserve settings.
- Add contract pinning.
- Add favorite crops and animals.
- Add repeat last planting.
- Add batch apply fertilizer and amendments.
- Add repair all affordable.
- Improve collect all clarity.
- Add undo for some non-destructive setup choices.
- Add better save reset, export, and import UI.
- Add keyboard-friendly web controls.
- Add faster tab navigation.
- Add performance pass for huge lists.

## 25. Technical Health

- Finish extracting store logic from `useGameStore.ts`.
- Keep new features in engine, action, and UI modules.
- Add simulation smoke tests.
- Add invariant tests for save hydration.
- Add tests for core economy formulas.
- Add tests that `advanceDay` does not corrupt state.
- Add save migration tests.
- Add balance scripts.
- Add data validation for crop, building, animal, machine, and product IDs.
- Add a lint rule or script to catch persisted functions.
- Add feature flags for unfinished systems.
- Add debug screen for simulation state.
- Add deterministic random seed mode for testing.
- Add profiling for web performance.

## Suggested Milestones

### Milestone 1: Make The Game Understandable

- Daily Attention Dashboard
- "Why did this happen?" explanations
- Better Day Summary
- Better empty states
- Guide coverage pass
- First 30-minute onboarding pass

### Milestone 2: Make The Game Alive

- Phase 3 UI
- Family events
- Reputation HUD and breakdown
- Neighbor farm screen
- Chronicle and yearly story recap
- More historical event coverage

### Milestone 3: Make The Game Strategic

- Annual Planning
- Cashflow forecast
- Enterprise profitability reports
- Market cause explanations
- Recovery systems
- Balance audit

### Milestone 4: Make The Game Polished

- UI hierarchy pass
- Audio and haptics pass
- Better charts
- Better visual farm states
- Performance pass
- Simulation tests and save migration tests

