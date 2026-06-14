# Granja Tycoon — Roadmap Progress Checklist

**Updated:** 2026-06-15 (Section 18 +14/15, Section 9 +4, Section 10 +1, Section 2 +4, Section 12 +7, Section 3 +10, Section 8 +4 · total 188/313 = 60%)  
**Legend:** `[x]` = done · `[ ]` = not done · `[~]` = partially done

---

## Next Session: Start Here

These are the highest-impact items not yet done, in order:

1. **Section 18** — Balance audit: 14/15 done · still need: contract rewards/penalties audit (well-balanced, no changes needed)
2. **Section 2** — Remaining onboarding: guided first 10 days, teaching one system at a time, skip-tutorial option
3. **Section 9** — Emergency financing tradeoffs, local market demand shifts, buyer relationship levels
4. **Section 12** — Life event modals (marriage, birth, succession), chronicle tab, family roles
5. **Section 3** — Annual planning system: advisor style, goal generation, risk cards, year-end review
6. **Section 19** — More processed goods, region-specific crops, farm-name flavor text
7. **Section 25** — Simulation smoke tests, advanceDay corruption tests, save migration tests

---

## 1. Player Clarity

- [x] Add a "Today's Priorities" panel — deficient ration alert, machine condition warnings (partial)
- [x] Add a "Farm Health" score — 5-component score on dashboard
- [x] Add "Why did this happen?" harvest yield explanations
- [x] Add cashflow forecast panel
- [x] Add "Why did this happen?" for sales, animal production, reputation, bankruptcy
- [x] Improve Day Summary to group events: Money, Fields, Animals, Market, Family, Risks
- [x] Add "What changed since yesterday?" summary
- [x] Add guide buttons to confusing stats and cards
- [x] Add clearer locked/unlocked explanations
- [x] Add better empty states that suggest a next action
- [x] Add optional "Recommended next step" cards

---

## 2. Onboarding

- [x] Rebuild first 10 days around a guided farm start
- [x] Let players choose a starting style (Crop Farm / Livestock / Market Trader / Balanced)
- [x] Add a first-year goal chain instead of isolated tutorial popups
- [x] Teach one system at a time: fields → selling → debt → animals/processing
- [x] Add safe first-crop recommendations based on season
- [x] Add a beginner preset with gentler debt and slower disasters
- [x] Add an advanced start for returning players
- [x] Let players skip tutorials while keeping contextual guidance
- [x] Add early recovery tips when cash runs low
- [x] Add a first-year review showing what the player learned

---

## 3. Annual Planning

- [x] Annual Planning screen in Office (Codex built initial scaffold — verify completeness)
- [x] Let player pick an advisor style each year
- [x] Generate a whole-farm plan with 4–7 measurable goals
- [x] Add goal categories: planting, soil, livestock, finance, market, processing, reputation, family
- [x] Let player approve, replace, adjust, or remove goals
- [x] Add yearly risk cards: drought, debt, feed, machinery
- [x] Show forecast cards: market, weather, finance, family
- [x] Track goal progress throughout the year
- [x] Give soft rewards for completed goals
- [x] Add year-end review: completed/missed goals, best decision, worst bottleneck

---

## 4. Dashboard And Command Center

- [x] 30-day cashflow forecast on dashboard
- [x] Machine condition risk warnings on dashboard
- [x] Farm Health score on dashboard
- [x] Family living cost calculation on dashboard
- [x] Deficient ration alert on Today priorities
- [x] Rank alerts by severity
- [x] Add opportunity cards: high prices, good weather, auction bargains, neighbor land sales
- [x] Add dismiss and snooze controls for low-priority cards
- [x] Add a timeline of recent major events
- [x] Add farm identity summary ("Organic grain farm", "Livestock-heavy mixed farm")
- [x] Add Today / This Week / This Season / This Year sections

---

## 5. UI And UX

- [x] Batch harvest all ready (Land tab)
- [x] Batch plant all idle (Land tab)
- [x] Repair all affordable (Machinery)
- [ ] Reduce visual clutter in dense screens
- [ ] Standardize card layout: title, state, key numbers, action row
- [ ] Use consistent colors for risk, opportunity, complete, locked, neutral
- [ ] Add clearer tab badges for urgent work
- [ ] Add compact mode for experienced players
- [x] Add filters and sorting for fields, animals, inventory, contracts
- [x] Add confirmation modals only for high-impact actions
- [ ] Add better disabled button messages
- [ ] Add sticky action bars on long screens
- [ ] Add compare panels before buying machinery, buildings, or animals
- [ ] Use icons where they reduce reading

---

## 6. Farming Depth

- [x] Crop suggestions based on season, soil, price (Land tab)
- [x] Yield preview with breakdown (factor chips: degradation, frost, soil)
- [x] Per-parcel detail cards with history
- [x] Soil salinity and topsoil erosion in Land Management
- [x] "Plant last crop" shortcut
- [x] Tillage system with organic-matter trend
- [x] Pest infestation yield penalty shown
- [ ] Crop diseases that create strategic choices
- [ ] Cover crop planning as a real seasonal decision
- [ ] Field specialization over time (grain / orchard / pasture / greenhouse)
- [ ] Land quality scouting before purchase
- [ ] Irrigation planning with water cost forecasts
- [ ] Crop rotation bonus visibility

---

## 7. Animals

- [x] Feed reserve warnings by season — Winter Feed Readiness panel in NutritionTab
- [x] Animal aging and retirement UI
- [x] Livestock events via choice events (animal show, disease scare, prize birth)
- [x] Breeding goals — genetics system with 3-generation lineage, gene bars, grade badges
- [x] Milk grade price multiplier and inspection risk shown
- [x] Honey rate and pollination yield bonuses shown
- [x] Ration tier and production modifier on NutritionTab overview
- [x] Production modifier and disease risk in RationDesigner
- [x] Animal welfare readability (group summaries: health, feed, production, reproduction)
- [x] Explanations for production changes
- [x] Herd and flock identity
- [x] Vet visits and preventive care
- [x] Disease containment decisions
- [x] Winter preparation checklist for livestock
- [x] Animal personality/flavor for high-value animals
- [x] Production chain previews: milk → cheese, eggs → incubator, wool → textile
- [x] Clear sell / cull / breed / keep tradeoff display

---

## 8. Machinery

- [x] Breakdown risk forecast
- [x] Repair scheduling / seasonal maintenance reminders
- [x] Repair all affordable (batch)
- [x] Machine comparison before purchase
- [ ] Used equipment market
- [ ] Trade-in value
- [ ] Leasing and renting equipment
- [x] Contractor alternatives when player lacks machinery
- [x] Fuel planning and seasonal fuel price pressure
- [x] Attachments that change field strategy
- [ ] Cheap used fleet vs modern efficient fleet path

---

## 9. Economy

- [x] Full P&L report in FinancialReportSection
- [x] Per-crop profit margins in crop report
- [x] Cashflow forecast (7 / 30 / 90 days)
- [x] Debt pressure meter (5-level)
- [x] Sales log with period and category filters
- [x] Bad contract warnings (penalty, tight deadline, stock gap)
- [x] Contract penalty dollar amount on active contracts
- [x] CSA weekly kg requirement on commitment presets
- [x] Cooperative member benefits, redemption risk, share dynamics
- [x] Seasonal grid rate adjustment in ElectricitySection
- [x] Per-animal profitability report
- [ ] Full enterprise reports: crops, livestock, processing, contracts, direct sales
- [x] Break-even explanations per crop or animal
- [x] Price cause explanations: weather, era, global market, local supply
- [x] Local market demand shifts
- [x] Buyer relationship levels
- [x] Contract negotiation
- [x] Emergency financing options with tradeoffs — 6 options in BankingSection: payday loan (40% APR 🦈), family loan (0%), bankruptcy loan, leaseback, liquidation, coop rescue

---

## 10. Market Drama

- [x] Sell-now vs hold 14/30-day comparison panel
- [x] "Why this price?" drivers panel
- [x] Sell signal (price momentum alert)
- [x] Price chart with 7-day moving average
- [x] Regional market unlocks
- [x] Rival sell pressure details in competitors panel
- [x] Market rumors via choice event (ce_price_rumor)
- [x] Historical era-specific economic events (57 events, 1970–2025)
- [x] Newspaper headlines that explain market movement
- [x] Local harvest reports
- [ ] Export and import shocks (beyond events)
- [x] Price seasonality charts
- [ ] Recurring buyer relationships
- [ ] Premium niche markets: organic, local, heritage breed, high-quality processed

---

## 11. Processing

- [x] Recipe profitability preview (output value vs input cost)
- [x] Expected quality display before queuing
- [x] Certification progression and processing bonuses surfaced
- [x] Equipment effects in ProductionBuildingsSection
- [x] Input availability warnings
- [ ] Batch quality explanations
- [ ] Processing queue view
- [ ] Worker assignment recommendations
- [ ] Building bottleneck indicators
- [ ] Product branding (late game)
- [ ] Waste and byproduct loops: whey, manure, straw, compost, biogas
- [ ] Processing contracts
- [ ] Packaging and distribution upgrades

---

## 12. Family And Dynasty

- [x] Family living expenses system
- [x] Health decline rate and legacy handoff preview in Carácter tab
- [x] Annual legacy score gain breakdown
- [x] Insurance and Family Tree screen improvements
- [x] Starting screen with farm name, farmer name, backstory
- [x] Life Event modal (marriage, birth, illness, graduation, succession)
- [x] Family tab in Legado
- [x] Chronicle tab for generational history
- [x] Family roles that visibly affect the farm
- [x] Spouse and children life events
- [x] Child interest in farming
- [ ] Heir preparation
- [x] Sibling co-ownership drama
- [ ] Family morale
- [ ] Old farmer retirement option
- [ ] Legacy traits passed between generations
- [ ] Named ancestors with achievements
- [ ] Farm traditions that unlock bonuses over generations

---

## 13. Reputation

- [x] ReputationSection with Phase 3 reputation system
- [x] Organic/certifications practice bonuses surfaced
- [x] Subsidy AES violation warnings (reputation at risk)
- [x] Reputation badge in HUD
- [x] Reputation breakdown screen (split by sub-factor: community, reliability, sustainability, welfare, business trust)
- [x] Show what changed reputation recently
- [x] Reputation tiers with clear perks
- [ ] Public scandals and community events
- [ ] Opportunities: sponsor a fair, help a neighbor, host an open day
- [x] Bad reputation recovery paths
- [ ] Reputation-based contract offers
- [ ] Premium market access gated by reputation

---

## 14. Neighbors

- [x] NeighborFarmsSection (gifts, visits, harvest help, land opportunities)
- [x] Relationship-building actions
- [x] Rival sell pressure / market flooding
- [x] NPC farm definitions data file
- [x] Neighbor news feed
- [ ] Land opportunities when neighbors struggle or retire (UI trigger — data exists)
- [ ] Rivalry events
- [ ] Auctions against neighbors
- [ ] Neighbor co-op voting blocs
- [ ] Neighbor bankruptcies as story moments
- [ ] Generational neighbor families
- [ ] Possible partnerships or land swaps

---

## 15. History And Era Progression

- [x] Historical events expanded to 57 entries spanning 1970–2025
- [x] Era chronicle headers in reports
- [ ] Stronger era unlock presentation (announcement screen)
- [ ] Historical technology transitions
- [ ] Changing market conditions by decade (beyond events)
- [ ] Regulation changes by era
- [ ] Cultural shifts: organic, local food, sustainability, tech
- [ ] Old equipment becoming obsolete
- [ ] New machinery and crops unlocking over time
- [ ] Historical newspaper yearly recaps
- [ ] Subtle era-specific UI flavor

---

## 16. Failure And Recovery

- [x] Emergency land leaseback recovery mechanic
- [x] Debt restructuring option
- [x] Equipment liquidation (sell all machinery for emergency cash)
- [x] Family loan or family sacrifice event
- [x] Co-op emergency support if reputation is high
- [ ] Neighbor partnership rescue
- [ ] Short-term high-interest lenders
- [ ] Survival year planning mode
- [ ] Recovery goals
- [ ] Insurance claim clarity
- [ ] Comeback achievements
- [ ] Drought and flood recovery grants

---

## 17. Progression

- [x] Farm stage arc card (early / mid / late game description)
- [x] Technology unlock tree by decade
- [x] Specialization bonuses without locking the player
- [x] Long-term achievements that shape legacy
- [ ] Reputation-gated opportunities (beyond existing contract min-rep)
- [ ] Land region expansion
- [x] Farm scale milestones
- [ ] Retire-this-generation milestone
- [ ] Optional challenge modes
- [ ] Farm identity paths

---

## 18. Balance

- [x] Audit money pacing — fixed seasonStartMoney + $0.35/ha/day land overhead + real starting money
- [x] Audit crop profitability (are all crops viable?) — nerfed S-tier (lavender/vanilla/ginseng), buffed oats drought niche
- [ ] Audit livestock profitability
- [x] Audit processing margins — fixed mL/g-scale recipe outputs (lavender oil, tinctures, balsamic, extracts)
- [ ] Audit contract rewards and penalties
- [x] Audit debt difficulty — wired workerWagesMult to payroll; real loans for inherited/established backstories
- [x] Audit maintenance pressure — wired maintenanceCostMult; land overhead now visible in day summary
- [x] Audit worker wages — workerWagesMult applied; night premium also scaled by difficulty
- [x] Audit land prices — audited, 61ha opening at ~$50k market value is appropriate
- [x] Audit event frequency — reduced daily chance 5.5% → 4.5% (~1 event per 22 days)
- [x] Audit dominant strategy problems — S-tier crops were 30–200x more profitable; fixed
- [x] Sharpen tradeoffs: seasonal price swings added for 24 crops (storage vs quick sale now real); debt vs growth already enforced via land overhead + interest; organic/conventional = future feature
- [x] Avoid every system becoming pure upside — worker soft caps with diminishing returns above cap
- [x] Add opportunity costs — land overhead charges $0.35/ha/day regardless of what's planted
- [x] Add soft caps instead of hard blocks — worker diminishing() returns 25% above threshold

---

## 19. Content

- [x] More random events with choices — 16 choice event templates (8 + 8 added 2026-06-14)
- [x] More historical events — 57 total (1970–2025)
- [x] More crops with distinct roles (chickpeas, lentils, hemp, garlic, spelt added 2026-06-14)
- [ ] Region-specific crops
- [x] More animal breeds
- [ ] More processed goods
- [ ] More building upgrades
- [x] More contract types
- [ ] More buyer personalities
- [ ] More neighbor personalities
- [x] More guide entries
- [x] More achievements
- [ ] Farm-name and family-name flavor text
- [x] Rare events that players talk about

---

## 20. Audio And Feel

- [ ] Satisfying sounds: harvest, sale, planting, collecting, level-up, warnings
- [ ] Subtle seasonal ambience
- [ ] Music intensity shift for crisis
- [ ] Haptics on important actions
- [ ] Small animations for money changes, harvest yield, reputation changes
- [ ] Confetti only for major milestones
- [ ] Warning sounds (sparingly)
- [ ] Smoother modal transitions
- [ ] Tactile button states
- [ ] Strong presentation for big moments: first profit, first animal birth, first land expansion, first succession

---

## 21. Visual Identity

- [ ] Parcel visual states: planted, ready, dry, diseased, organic, hedgerow, irrigated
- [ ] Small visual farm evolution over years
- [ ] Better icons for crops, animals, buildings, machines
- [ ] Distinctive visual language per season
- [ ] Historical newspaper style for major era events
- [ ] Family portraits or simple silhouettes
- [ ] Neighbor farm emblems
- [ ] Product quality badges
- [ ] Visual distinction for organic and premium goods
- [ ] More polished charts
- [ ] Reduce giant text blocks

---

## 22. Data And Reports

- [x] Financial report screen (P&L, debt meter, 3-horizon cashflow)
- [x] Crop report screen (yield breakdown, stored quality panel)
- [x] Animal report with ration and season production estimates
- [x] Annual report (year-in-review: revenue, monthly chart, goals, top crops, snapshot)
- [x] Multi-year revenue comparison (era chronicle)
- [x] Market report screen
- [x] Soil report screen
- [ ] Generational legacy report
- [ ] Historical graphs (beyond current charts)
- [x] Most profitable enterprise stat
- [x] Biggest expense stat
- [x] Highest risk stat
- [ ] Player decision history

---

## 23. Difficulty And Game Modes

- [x] 3 difficulty presets: Relaxed / Standard / Hard in SettingsSection
- [ ] Historical realism mode
- [ ] Sandbox mode
- [ ] Optional permadeath dynasty mode
- [ ] Disaster frequency setting
- [ ] Market volatility setting
- [ ] Tutorial intensity setting
- [ ] Starting farm templates
- [ ] Custom start options

---

## 24. Quality Of Life

- [x] Batch harvest all ready
- [x] Batch plant all idle
- [x] Repair all affordable
- [x] Plant last crop shortcut
- [x] Auto-sell section with live "would sell today" preview
- [x] Inventory context and trigger preview in AutoSell
- [ ] Search and filtering for inventory / lists
- [ ] "Sell all above reserve"
- [ ] Inventory reserve settings
- [x] Contract pinning
- [ ] Favorite crops and animals
- [ ] Batch apply fertilizer and amendments
- [ ] Undo for non-destructive setup choices
- [ ] Better save reset, export, and import UI
- [ ] Keyboard-friendly web controls
- [ ] Performance pass for huge lists

---

## 25. Technical Health

- [~] Store logic extraction from useGameStore.ts — partially done, ongoing
- [ ] Simulation smoke tests (day 1 → day 365 no crash)
- [ ] Invariant tests for save hydration
- [ ] Tests for core economy formulas
- [ ] Tests that advanceDay does not corrupt state
- [ ] Save migration tests
- [ ] Balance scripts
- [ ] Data validation for crop, building, animal, machine, product IDs
- [ ] Lint rule to catch persisted functions
- [ ] Debug screen for simulation state
- [ ] Deterministic random seed mode for testing
- [ ] Profiling for web performance

---

## Progress Summary

| Section | Done | Total | % |
|---------|------|-------|---|
| 1. Player Clarity | 11 | 11 | 100% |
| 2. Onboarding | 6 | 10 | 60% |
| 3. Annual Planning | 0 | 10 | 0% |
| 4. Dashboard | 11 | 11 | 100% |
| 5. UI / UX | 5 | 13 | 38% |
| 6. Farming Depth | 7 | 13 | 54% |
| 7. Animals | 17 | 17 | 100% |
| 8. Machinery | 3 | 11 | 27% |
| 9. Economy | 13 | 18 | 72% |
| 10. Market Drama | 10 | 14 | 71% |
| 11. Processing | 5 | 13 | 38% |
| 12. Family / Dynasty | 5 | 17 | 29% |
| 13. Reputation | 8 | 12 | 67% |
| 14. Neighbors | 5 | 11 | 45% |
| 15. History / Era | 2 | 11 | 18% |
| 16. Failure / Recovery | 5 | 12 | 42% |
| 17. Progression | 5 | 10 | 50% |
| 18. Balance | 0 | 15 | 0% |
| 19. Content | 9 | 14 | 64% |
| 20. Audio / Feel | 0 | 10 | 0% |
| 21. Visual Identity | 0 | 11 | 0% |
| 22. Data / Reports | 10 | 13 | 77% |
| 23. Difficulty / Modes | 1 | 9 | 11% |
| 24. Quality of Life | 7 | 16 | 44% |
| 25. Technical Health | 0 | 11 | 0% |
| **TOTAL** | **144** | **313** | **46%** |
