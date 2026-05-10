# Research Findings

> Real agriculture mechanics and data for FArM TYCOON
> Last updated: 2026-05-10 by DOMINGO

---

## 🌱 SOIL MECHANICS

### pH System
- **Scale:** 0-14 (acidic → alkaline)
- **Optimal ranges by crop:**
  - Wheat: 6.0-7.0
  - Corn: 5.8-7.0
  - Potatoes: 5.0-6.0 (slightly acidic = less scab disease)
  - Alfalfa: 6.5-7.5
  - Blueberries: 4.5-5.5 (VERY acidic)
- **Game mechanic:** Player can test soil pH → apply lime (raises pH) or sulfur (lowers pH)
- **Consequence:** Wrong pH = reduced nutrient uptake = lower yields

### NPK Nutrients
| Nutrient | What It Does | Deficiency Signs | Source |
|----------|-------------|------------------|--------|
| **N (Nitrogen)** | Leaf growth, green color | Yellow leaves, stunted growth | Urea, manure, legumes |
| **P (Phosphorus)** | Root growth, flowering | Purple stems, poor flowering | Bone meal, rock phosphate |
| **K (Potassium)** | Disease resistance, water regulation | Brown leaf edges, weak stems | Potash, wood ash |

**Game mechanic:**
- Soil test shows NPK levels
- Player applies fertilizers (organic = slower but builds soil, synthetic = fast but can burn)
- Over-fertilization = nutrient runoff (environmental penalty?) + waste money
- Crop rotation with legumes = free nitrogen fix

### Organic Matter
- **Range:** 1-10% (by weight)
- **What it does:**
  - Improves water retention
  - Feeds beneficial microbes
  - Slowly releases nutrients
  - Reduces compaction
- **Game mechanic:** Add compost/manure → organic matter % rises → soil quality improves over seasons
- **Long-term play:** Organic matter takes YEARS to build

### Soil Compaction
- **Caused by:** Heavy machinery when soil is wet, over-tillage
- **Effects:** Poor drainage, poor root penetration, reduced yields
- **Game mechanic:**
  - Weather matters — don't drive heavy tractors after rain!
  - Subsoiler = expensive tool that breaks compaction
  - Cover crops with deep roots = natural compaction breaker

### Soil Texture Triangle
- **Sand:** Drains fast, low nutrients, warms early
- **Silt:** Moderate everything
- **Clay:** Holds water, high nutrients, slow to warm, gets compacted
- **Loam:** The goldilocks mix (40% sand, 40% silt, 20% clay)

**Game mechanic:** Each field has a soil type → affects:
- Watering frequency
- Drainage after rain
- Fertilizer needed
- Suitable crops

---

## 🐛 PEST & DISEASE CYCLES

### Integrated Pest Management (IPM) — The Game Framework

IPM = combine multiple methods, not just spray chemicals. **This is a SKILL TREE waiting to happen.**

| Level | Method | Cost | Effectiveness |
|-------|--------|------|---------------|
| **Prevention** | Resistant crop varieties | Seed cost | High |
| **Prevention** | Crop rotation | Planning | Medium-High |
| **Prevention** | Beneficial insects (ladybugs, lacewings) | Habitat cost | Medium |
| **Monitoring** | Scout fields regularly | Time | Essential |
| **Monitoring** | Pheromone traps | Low cost | Early warning |
| **Cultural** | Remove crop residues | Labor | Reduces overwintering |
| **Cultural** | Adjust planting date | Planning | Avoid peak pest time |
| **Mechanical** | Row covers / netting | Material cost | Very effective (small scale) |
| **Mechanical** | Trap crops (sacrifice plants) | Land cost | Diverts pests |
| **Biological** | Release parasitic wasps | High cost | Targeted |
| **Biological** | Bt bacteria (Bacillus thuringiensis) | Medium cost | Specific pests |
| **Chemical** | Synthetic pesticides | Low cost, high enviro impact | Immediate |

### Pesticide Resistance — The Hidden Boss

**This is GENIUS for a game:**
- Use same pesticide too many times → pest develops resistance
- Resistant pests = pesticide stops working
- Solution: Pesticide rotation (different modes of action)
- **Game mechanic:** Pesticide effectiveness % drops over time if overused
- **IRAC codes:** Real-world classification system for rotating pesticides

### Common Mediterranean Pests (Spain-Centric)

| Pest | Crops Affected | Damage | Season |
|------|---------------|--------|--------|
| **Olive fly (Bactrocera oleae)** | Olives | Fruit rot, oil quality drop | Summer |
| **Corn borer (Ostrinia nubilalis)** | Corn | Stalk tunneling | Summer |
| **Aphids** | Everything | Sap sucking, virus spread | Spring-Fall |
| **Red spider mite** | Greenhouse crops | Webbing, yellowing | Hot, dry |
| **Mediterranean fruit fly** | Stone fruits, citrus | Fruit rot | Summer |
| **Codling moth** | Apples, pears | Worm in fruit | Spring-Summer |

### Disease Triangle

Disease = **Host + Pathogen + Environment** (all 3 needed)

**Game mechanic:**
- If you remove one corner → no disease
- Plant resistant variety = remove host susceptibility
- Sanitation = remove pathogen
- Don't water leaves in evening = change environment

### Common Diseases (Spain/Mediterranean)

| Disease | Crops | Trigger | Control |
|---------|-------|---------|---------|
| **Powdery mildew** | Grapes, cucurbits | Dry days, warm | Sulfur, resistant varieties |
| **Downy mildew** | Grapes, potatoes | Wet, cool | Copper, drainage |
| **Fusarium wilt** | Many | Soil-borne, warm | Resistant varieties, solarization |
| **Olive knot** | Olives | Rain + wounds | Prune in dry, copper spray |
| **Late blight** | Tomatoes, potatoes | Wet, cool weather | Remove infected plants, fungicide |
| **Citrus canker** | Citrus | Wind, rain, wounds | Remove infected trees |

---

## 🏭 PROCESSING SYSTEMS

### Tier 1: Raw → Primary

| Input | Processing | Output | Equipment | Time |
|-------|-----------|--------|-----------|------|
| Milk | Pasteurization | Drinkable milk | Pasteurizer | Hours |
| Milk | Culturing + rennet | Cheese | Cheese vat | Days-Months |
| Milk | Churning | Butter | Churn | Hours |
| Wheat | Milling | Flour | Mill | Continuous |
| Grapes | Crushing + fermentation | Wine | Fermenter | Weeks-Months |
| Olives | Pressing | Olive oil | Press | Hours |
| Wool | Scouring + carding | Clean wool | Scourer | Hours |
| Honey | Extracting | Honey | Extractor | Hours |

### Tier 2: Primary → Secondary

| Input | Processing | Output |
|-------|-----------|--------|
| Flour | Baking | Bread, pastries |
| Flour + eggs + sugar | Mixing + baking | Pasta, cookies |
| Cheese | Aging | Aged cheese (higher value) |
| Wine | Aging in barrels | Reserve wine (higher value) |
| Tomatoes | Cooking + jarring | Tomato sauce |
| Meat | Smoking/curing | Ham, bacon |
| Wool | Spinning | Yarn |
| Wool | Weaving | Cloth |

### Processing Game Mechanics

**Quality factors:**
- Input quality = output quality (garbage in, garbage out)
- Equipment quality = efficiency and consistency
- Operator skill = less waste, better quality
- Processing time = rushed = lower quality

**Shelf life:**
- Raw milk = 7 days
- Pasteurized = 2-3 weeks
- Cheese = months to years (aging improves!)
- Wine = years to decades (aging improves!)
- Flour = 6-12 months

**Batch vs Continuous:**
- Small artisan = batch (small quantities, higher quality, higher price)
- Industrial = continuous (large quantities, consistent, lower price per unit)

---

## 💰 MARKET DYNAMICS

### Selling Channels

| Channel | Price | Volume | Consistency | Effort |
|-----------|-------|--------|-------------|--------|
| **Farmers market** | Highest | Low | Unpredictable | High (booth, time) |
| **CSA (Community Supported Ag)** | High | Medium | Guaranteed (subscribers) | Medium (packing) |
| **Wholesale / distributor** | Medium | High | Contract-based | Low |
| **Processor contract** | Fixed | High | Guaranteed | Low |
| **Export** | Variable | Very high | Market-dependent | High (regulations) |
| **Direct online** | High | Low-Medium | Unpredictable | High (shipping) |

### Price Volatility — The Commodity Feel

**Factors affecting crop prices:**
- Weather in major producing regions (drought = price spike)
- Global supply (good harvest everywhere = price crash)
- Energy costs (fertilizer, transport)
- Currency exchange rates
- Trade policies / tariffs
- Disease outbreaks (avian flu = egg prices spike)

**Game mechanic:**
- Player checks market board before selling
- Contracts = guaranteed price but locked in (miss out on spikes)
- Spot market = variable but can hit jackpots
- Storage = hold product until prices improve (but costs money)

### Cooperatives vs Independent

| | Cooperative | Independent |
|--|-------------|-------------|
| **Buying power** | High (group purchase) | Low |
| **Processing access** | Shared facilities | Must build own |
| **Market access** | Group contracts | Individual hustle |
| **Decision making** | Democratic (slow) | Fast |
| **Profit share** | Dividends based on contribution | All yours |

**Game mechanic:** Join coop = access shared equipment, but follow group decisions. Stay independent = full control, but higher investment.

### EU Agricultural Policy (CAP)

- **Direct payments:** Money per hectare (subsidies!)
- **Greening requirements:** Crop diversification, permanent grassland, ecological focus areas
- **Young farmer scheme:** Extra support if under 40

**Game mechanic:** Player can apply for subsidies but must meet requirements.

---

## 🌦️ WEATHER SYSTEMS

### Historical Data Integration

**This is your differentiation:** Use REAL historical weather for the game region.

**Sources:**
- AEMET (Agencia Estatal de Meteorología) — Spain's weather service
- Open-Meteo API (free, historical + forecast)
- NOAA GHCN (Global Historical Climatology Network)

### Key Weather Variables

| Variable | Affects | Game Impact |
|----------|---------|-------------|
| **Temperature** | Growth rate, frost damage, heat stress | Planting windows, yield variance |
| **Rainfall** | Soil moisture, disease pressure, irrigation need | Drought = irrigation costs, flood = crop loss |
| **Humidity** | Disease pressure (fungi love wet) | High humidity = spray more |
| **Wind** | Pollination, physical damage, spray drift | Windy day = can't spray effectively |
| **Sunshine hours** | Photosynthesis, fruit sugar content | Cloudy year = lower quality grapes |
| **Frost dates** | Planting start, harvest end | Last frost = safe planting date |

### Microclimates

**Game mechanic:** Different fields have different microclimates:
- Valley bottom = frost pocket (cold air sinks)
- South-facing slope = warmer, dries faster
- Near water = moderated temperatures
- Urban heat island = warmer (if near city)

### Climate Change Layer (Optional But Realistic)

- **Shifting planting dates:** What worked 20 years ago = too early/late now
- **New pests:** Warmer winters = pests survive, expand range
- **Water stress:** More droughts = irrigation more critical
- **Extreme weather:** More hail, more floods

---

## 🐄 LIVESTOCK DEPTH

### Genetics & Breeding

**Trait inheritance = simple Mendelian + quantitative genetics**

| Trait | Heritability | Selection Effect |
|-------|-------------|------------------|
| **Milk yield** | High | Fast improvement |
| **Butterfat %** | High | Fast improvement |
| **Fertility** | Low | Slow improvement |
| **Disease resistance** | Low-Medium | Moderate |
| **Temperament** | Medium | Moderate |
| **Longevity** | Low | Very slow |

**Game mechanic:**
- Choose sire (bull/ram/boar) with desired traits
- AI (artificial insemination) = access elite genetics without buying bull
- Generations = gradual improvement
- Inbreeding = BAD (health defects, reduced fertility)

### Feed Conversion Ratio (FCR)

| Animal | FCR | Meaning |
|--------|-----|---------|
| **Chicken (meat)** | 1.5:1 | 1.5kg feed → 1kg meat |
| **Pig** | 2.5:1 | 2.5kg feed → 1kg meat |
| **Beef cattle** | 6:1 | 6kg feed → 1kg meat |
| **Dairy cow** | N/A | Input = feed, output = milk (liters/day) |

**Game mechanic:** Better genetics + better feed = better FCR = more profit.

### Animal Health Events

| Event | Trigger | Prevention | Cost |
|-------|---------|-----------|------|
| **Mastitis** (udder infection) | Bacteria + poor hygiene | Clean milking, dry cow therapy | High (treatment + lost production) |
| **Lameness** | Poor housing, infection | Clean floors, hoof trimming | Medium |
| **Bloat** (ruminants) | Rich legume pasture | Anti-bloat blocks, gradual diet change | Low (prevention), High (death) |
| **PRRS** (pig disease) | Virus | Biosecurity, vaccination | Very high |
| **Avian influenza** | Wild bird contact | Indoor housing, biosecurity | Catastrophic (cull whole flock) |
| **Foot-and-mouth** | Virus | Biosecurity, movement controls | Catastrophic (trade ban) |

### Biosecurity Levels

| Level | Measures | Cost | Protection |
|-------|----------|------|------------|
| **None** | Open farm, visitors welcome | Free | Zero |
| **Basic** | Foot dips, visitor log | Low | Some |
| **Enhanced** | Quarantine new animals, controlled access | Medium | Good |
| **Maximum** | Shower-in-shower-out, feed sterilization | High | Best |

**Game mechanic:** Higher biosecurity = lower disease risk but higher operating cost.

### Reproduction Management

| Animal | Gestation | Heat cycle | Signs |
|--------|-----------|------------|-------|
| **Cow** | 9 months (283 days) | 21 days | Mounting, restlessness, mucus |
| **Pig** | 3.5 months (114 days) | 21 days | Swollen vulva, standing reflex |
| **Sheep** | 5 months | 17 days | Tail wagging, seeking ram |
| **Chicken** | 21 days (incubation) | N/A (daily eggs) | N/A |

**Game mechanic:**
- Missed heat = lost pregnancy = lost production
- Pregnancy check = costs money but confirms
- Calving/lambing = high risk event, might need assistance

---

## 🔬 ADDITIONAL MECHANICS TO CONSIDER

### Water Rights & Irrigation

- **Water is scarce in Spain** — especially southeast
- **Irrigation systems:**
  - Flood = cheapest, least efficient
  - Sprinkler = moderate
  - Drip = most efficient, highest setup cost
  - Pivot = large scale, high cost

**Game mechanic:**
- Water quotas (legal limits)
- Drought years = water restrictions
- Efficient irrigation = grow more with less

### Soil Testing & Precision Ag

- **Grid sampling:** Test soil every X meters
- **Variable rate application:** GPS-guided spreader applies exact amount needed
- **NDVI imaging:** Drone/satellite shows crop health zones

**Game mechanic:**
- Soil test = costs money but reveals hidden problems
- Precision ag = expensive equipment but reduces waste
- Drone scouting = spot problems early

### Cover Crops & Green Manure

| Cover Crop | Benefit | When to Plant |
|------------|---------|---------------|
| **Clover** | Nitrogen fix | After main crop |
| **Rye** | Prevent erosion, add organic matter | Fall |
| **Mustard** | Biofumigant (suppresses pests) | Fall |
| **Buckwheat** | Attract pollinators | Summer gap |

**Game mechanic:** Plant cover crop = can't sell it, but improves next season's soil.

### No-Till / Regenerative Ag

- **No plowing:** Plant directly into residue
- **Benefits:** Less erosion, more soil life, carbon sequestration
- **Challenges:** Harder weed control, need special planter

**Game mechanic:** Adopt no-till = unlock "regenerative" brand premium, but need different equipment.

---

## 📝 RESEARCH SOURCES

| Source | What For | URL |
|--------|----------|-----|
| **AEMET** | Spain weather data | aemet.es |
| **MAPA** | Spanish ag policy, stats | mapa.gob.es |
| **EU CAP** | Subsidy info | ec.europa.eu/info/food-farming-fisheries |
| **FAO** | Global ag data | fao.org |
| **Open-Meteo** | Free weather API | open-meteo.com |
| **IRAC** | Pesticide resistance codes | irac-online.org |
| **Teagasc** | Irish farming research | teagasc.ie |

---

## 🎯 PRIORITY RECOMMENDATIONS FOR IMPLEMENTATION

### Phase 1: Core Realism (Do First)
1. **Soil pH + NPK system** — adds strategic depth
2. **Pest/disease triangle** — IPM skill tree is engaging
3. **Processing system** — raw → processed = value chain
4. **Market board** — spot prices + contracts = economic depth

### Phase 2: Advanced Realism
5. **Weather integration** — historical data = differentiation
6. **Livestock genetics** — breeding = long-term progression
7. **Biosecurity** — disease outbreaks = risk management
8. **Cooperatives** — social/economic choice

### Phase 3: Polish
9. **Cover crops** — reward planning ahead
10. **No-till/regenerative** — sustainability angle
11. **Precision ag** — late-game tech upgrade
12. **Climate change** — long-term challenge layer

---

> **Status:** Research dump complete
> **Next:** Jose reviews, picks priorities, spec design begins

---

## 🌾 PART 2: ADVANCED MECHANICS (New Research)

> Additional realistic systems for deeper gameplay
> Researched: 2026-05-10

---

## 1. CROP ROTATION SYSTEM

### Why It Matters in Real Life
- Breaks pest/disease cycles
- Fixes nitrogen (legumes)
- Reduces weed pressure
- Improves soil structure

### Rotation Families
| Family | Crops | Risk if Repeated |
|--------|-------|------------------|
| **Grasses** | Wheat, barley, corn | Fusarium, rust, root rot |
| **Legumes** | Beans, peas, clover, alfalfa | Aphids, root rot |
| **Brassicas** | Cabbage, rapeseed, mustard | Clubroot, flea beetles |
| **Nightshades** | Tomatoes, potatoes, peppers | Blight, wilt |
| **Umbellifers** | Carrots, parsley | Carrot fly |
| **Chenopods** | Beets, spinach, quinoa | Leaf miners |

### Penalty System (Game Mechanic)
| Years Since Last Rotation | Yield Penalty | Disease Risk |
|---------------------------|---------------|--------------|
| 1 year (different family) | 0% | Normal |
| Same family, 2nd year | -15% | +30% |
| Same family, 3rd year | -30% | +60% |
| Same family, 4th+ year | -50% | +90% |

### Nitrogen Bonus
- Plant legumes → next year's grass crop gets FREE nitrogen
- No fertilizer needed for first year after legumes
- Bonus fades over 2-3 years

---

## 2. WEED MANAGEMENT

### Weed Types
| Type | Examples | Control Method |
|------|----------|----------------|
| **Annual grasses** | Foxtail, crabgrass | Pre-emergent herbicide, cultivation |
| **Broadleaf annuals** | Lambsquarters, pigweed | Post-emergent spray, hand weeding |
| **Perennials** | Dandelion, thistle, bindweed | Systemic herbicide, repeated mowing |
| **Parasitic** | Dodder, broomrape | Remove host, resistant varieties |

### Herbicide Resistance (Evolution in Game!)
- Use same herbicide mode-of-action 3+ years → weeds develop resistance
- Resistant weeds = herbicide stops working completely
- HRAC codes (like IRAC for pesticides) for rotation
- **Game mechanic:** Resistance % builds up silently → sudden failure

### Mechanical Weeding
| Method | Cost | Effectiveness | Soil Impact |
|--------|------|-------------|-------------|
| **Hand hoeing** | High labor | Very good | Low |
| **Cultivator** | Medium | Good | Some compaction |
| **Flame weeding** | Fuel cost | Surface only | None |
| **Mulching** | Material cost | Excellent | Improves soil |
| **Cover crops** | Seed cost | Good (smothers) | Builds soil |

### Weed Seed Bank
- Every weed that goes to seed adds to soil seed bank
- Seed bank = 10+ years of future weeds
- **Game mechanic:** Let weeds seed one year → fight them for a decade
- Deep tillage brings old seeds to surface

---

## 3. GREENHOUSE / CONTROLLED ENVIRONMENT

### Types of Protected Cropping
| Type | Cost | Control Level | Suitable For |
|------|------|--------------|--------------|
| **Low tunnel / cloche** | Very low | Minimal | Season extension |
| **High tunnel (polytunnel)** | Low | Basic climate | Tomatoes, berries |
| **Greenhouse (glass/poly)** | Medium | Full climate | High-value crops |
| **Hydroponic greenhouse** | High | Complete | Leafy greens, herbs |
| **Vertical farm** | Very high | Total control | Urban, premium |

### Climate Control Parameters
| Parameter | Optimal Range | Deviation Cost |
|-----------|--------------|----------------|
| **Temperature** | Crop-specific | Growth slowdown |
| **Humidity** | 60-80% RH | Disease (too high), stress (too low) |
| **CO2 enrichment** | 800-1000 ppm | 20-30% yield boost |
| **Light (supplemental)** | 16h photoperiod | Winter production |
| **Ventilation** | Air exchange rate | Disease, temperature |

### Hydroponic Systems
| System | Complexity | Best For | Failure Mode |
|--------|-----------|----------|--------------|
| **NFT (Nutrient Film)** | Medium | Leafy greens | Pump failure = death in hours |
| **DWC (Deep Water)** | Low | Lettuce, herbs | Power outage = oxygen depletion |
| **Drip (substrate)** | Medium | Tomatoes, peppers | Dripper clog = dry plants |
| **Aeroponic** | High | Herbs, microgreens | Nozzle clog = immediate death |

---

## 4. MACHINERY ECONOMICS

### Total Cost of Ownership

**Tractor example (100hp, €80,000):**
| Cost | Annual | Notes |
|------|--------|-------|
| **Depreciation** | €8,000 | 10% per year |
| **Interest** | €3,200 | 4% on remaining value |
| **Insurance** | €800 | Required for loans |
| **Maintenance** | €4,000 | Service every 250h |
| **Fuel** | €6,000 | 8L/hour × 750h/year |
| **Storage** | €500 | Shed/yard space |
| **TOTAL** | **€22,500/year** | Whether you use it or not |

### Hours Meter = Critical
- Machinery depreciates by hours AND age
- 750h/year = standard farm tractor
- 200h/year = hobby farm (high cost per hour!)
- **Game mechanic:** Small machines = lower fixed cost, lower capacity

### Used vs New
| | New | 5-Year Used | 15-Year Used |
|--|-----|-------------|--------------|
| **Purchase** | €80,000 | €40,000 | €15,000 |
| **Reliability** | High | Medium | Low |
| **Breakdown risk** | Low | Medium | High |
| **Parts availability** | Perfect | Good | Poor |

**Game mechanic:** Buy cheap old machine → save money but random breakdowns during critical seasons.

### Attachments vs Dedicated Machines
- **Universal tractor + attachments** = versatile, lower total cost
- **Dedicated harvester** = faster, higher capacity, very expensive
- **Contract hiring** = pay per hectare, no ownership cost

---

## 5. POST-HARVEST HANDLING

### Grain Drying
| Method | Cost | Speed | Quality |
|--------|------|-------|---------|
| **Field drying** | Free | Slow (weeks) | Risk: rain, pests |
| **Ambient air dryer** | Low | Medium | Good |
| **Heated air dryer** | High fuel | Fast | Very good |
| **Continuous flow dryer** | Very high | Very fast | Excellent |

**Safe storage moisture:**
- Wheat: <14%
- Corn: <15%
- Soybeans: <13%
- Rice: <14%

**Above these = mold, mycotoxins, total loss.**

### Cold Chain for Produce
| Crop | Optimal Temp | Shelf Life (cold) | Shelf Life (ambient) |
|------|-------------|-------------------|------------------------|
| **Lettuce** | 0-2°C | 2-3 weeks | 2-3 days |
| **Tomatoes** | 10-13°C | 2 weeks | 5-7 days |
| **Apples** | 0-1°C | 6-12 months | 1-2 weeks |
| **Grapes** | 0-1°C | 4-8 weeks | 3-5 days |
| **Strawberries** | 0-1°C | 5-7 days | 1-2 days |
| **Milk** | 2-4°C | 7-10 days | 4-6 hours |

**Game mechanic:** No cold storage = sell immediately or lose product. Cold storage = hold for better prices but costs electricity.

### Packaging & Grading
- **Grade A:** Perfect appearance → premium market
- **Grade B:** Slight blemish → processing or discount
- **Grade C:** Damaged → animal feed or compost
- **Game mechanic:** Sorting line = labor cost but higher revenue

---

## 6. ANIMAL WELFARE & HOUSING

### Housing Systems
| Species | System | Welfare | Cost | Output |
|---------|--------|---------|------|--------|
| **Dairy cows** | Pasture-based | High | Low | Lower yield |
| **Dairy cows** | Free stall barn | Medium | Medium | Medium yield |
| **Dairy cows** | Tied stall (traditional) | Low | Low | Higher yield |
| **Pigs** | Outdoor (rare in Spain) | High | Low | Slow growth |
| **Pigs** | Straw bedded | Medium | Medium | Good |
| **Pigs** | Slatted floor | Low | Low | Fast growth |
| **Chickens** | Free range | High | Medium | Lower density |
| **Chickens** | Barn (indoor) | Medium | Low | Higher density |
| **Chickens** | Cage (battery) | Very low | Very low | Maximum density |

### Stocking Density Penalties
| Species | Optimal Density | Overstocked | Consequence |
|---------|--------------|-------------|-------------|
| **Cows** | 1 per 1-2ha pasture | 1 per 0.5ha | Parasites, poor condition |
| **Pigs** | 1 per 1m² | 1 per 0.5m² | Disease, aggression, stunted |
| **Chickens** | 9/m² (barn) | 15+/m² | Feather pecking, disease |

**Game mechanic:** High density = more animals = more money... until disease wipes them out.

### Animal Welfare Score
- Visible to consumers
- Premium for high welfare products
- EU regulations minimum standards
- Organic = even higher welfare requirements

---

## 7. FOOD SAFETY & TRACEABILITY

### HACCP Principles (Real System)
1. **Hazard analysis** — what can go wrong?
2. **Critical control points** — where to monitor?
3. **Critical limits** — what's acceptable?
4. **Monitoring** — check regularly
5. **Corrective action** — what if it fails?
6. **Verification** — did it work?
7. **Documentation** — record everything

**Game mechanic:** Implement HACCP = pass inspections, access premium markets, avoid recalls.

### Organic Certification Process
| Step | Time | Cost | Requirement |
|------|------|------|-------------|
| **Transition period** | 2 years | Lost premiums | No synthetic inputs |
| **Inspection** | Annual | €500-2000 | Full audit |
| **Documentation** | Continuous | Labor | All inputs recorded |
| **Certification** | Annual | €300-1000 | Meet EU organic regs |
| **Premium price** | — | — | +20-50% market price |

**Game mechanic:** 2-year transition = lower yields, no organic premium yet. After = higher prices but strict rules.

### Recall System
- Contaminated batch detected → recall entire batch
- Traceability = know exactly where every unit went
- **Game mechanic:** Poor traceability = recall everything = bankruptcy risk

---

## 8. AGROFORESTRY

### Systems
| Type | Layout | Products | Benefit |
|------|--------|----------|---------|
| **Alley cropping** | Trees in rows, crops between | Timber + crops | Windbreak, shade |
| **Silvopasture** | Trees + livestock | Meat + timber/acorns | Shade, forage |
| **Windbreaks** | Tree lines on field edges | Timber | Reduce wind erosion |
| **Riparian buffer** | Trees along waterways | Timber | Filter runoff |

### Tree Crops (Long-Term Investment)
| Tree | First Harvest | Peak Yield | Lifespan |
|------|--------------|------------|----------|
| **Almonds** | Year 3-4 | Year 8+ | 25-30 years |
| **Walnuts** | Year 5-7 | Year 10+ | 50+ years |
| **Chestnuts** | Year 5-7 | Year 10+ | 100+ years |
| **Truffles** | Year 5-10 | Year 10+ | 30-50 years |
| **Cork oak** | Year 25 | Every 9-12 years | 150+ years |

**Game mechanic:** Plant trees = no income for years, then passive income for decades. Cork oak = Spanish iconic crop.

---

## 9. ON-FARM ENERGY

### Renewable Options
| Source | Setup Cost | Output | Payback |
|--------|-----------|--------|---------|
| **Solar panels** | €15-30k | Reduce grid power | 6-10 years |
| **Solar thermal** | €5-10k | Hot water | 3-5 years |
| **Biogas digester** | €50-200k | Electricity + heat | 8-15 years |
| **Small wind** | €20-50k | Electricity | 10-20 years |
| **Hydropower** | €30-100k | Baseload power | 10-15 years |

### Biogas Inputs
| Waste | Methane Potential | Notes |
|-------|-------------------|-------|
| **Cow manure** | High | Most common feedstock |
| **Pig slurry** | Very high | Also produces digestate fertilizer |
| **Crop residues** | Medium | Seasonal availability |
| **Food waste** | High | May need permits |
| **Digestate output** | — | Excellent fertilizer, liquid + solid |

**Game mechanic:** Biogas = solve manure problem + generate power + produce fertilizer. Triple win but expensive setup.

---

## 10. SOIL MICROBIOME (Deep Science)

### Key Players
| Organism | Function | Game Indicator |
|----------|----------|----------------|
| **Mycorrhizal fungi** | Extend root reach 100x | Phosphorus uptake boost |
| **Nitrogen-fixing bacteria** | Convert N2 to plant-available N | Legumes don't need fertilizer |
| **Decomposers** | Break organic matter | Faster compost turnover |
| **Predatory nematodes** | Eat pest nematodes | Natural pest control |
| **Earthworms** | Aerate soil, create channels | Drainage, root penetration |

### Microbiome Health Score
| Factor | Good | Bad |
|--------|------|-----|
| **Tillage** | Minimal / no-till | Deep plowing kills fungi |
| **Pesticides** | Organic, selective | Broad-spectrum = kills beneficials |
| **Fertilizers** | Organic, slow-release | Synthetic salt = burns microbes |
| **Crop diversity** | Many species | Monoculture = simple, weak |
| **Cover crops** | Living roots year-round | Bare soil = dead microbiome |

**Game mechanic:** Soil microbiome meter = hidden stat. Healthy soil = unexplained yield bonuses. Dead soil = everything costs more.

---

## 11. COMPOSTING DEEP DIVE

### C:N Ratios (Critical for Compost)
| Material | C:N Ratio | Category |
|----------|-----------|----------|
| **Fresh grass clippings** | 15:1 | Green (nitrogen-rich) |
| **Food waste** | 20:1 | Green |
| **Cow manure** | 20:1 | Green |
| **Straw** | 80:1 | Brown (carbon-rich) |
| **Wood chips** | 400:1 | Brown |
| **Sawdust** | 500:1 | Brown |

**Optimal compost C:N = 25-30:1**
- Too green (low C:N) = smelly, slimy, anaerobic
- Too brown (high C:N) = slow, dry, doesn't heat up

### Compost Process
| Stage | Temperature | Time | What Happens |
|-------|-------------|------|--------------|
| **Mesophilic** | 20-40°C | Days 1-3 | Bacteria multiply |
| **Thermophilic** | 40-65°C | Days 3-14 | Pathogens killed, weed seeds destroyed |
| **Cooling** | 40-20°C | Weeks 2-8 | Fungi take over |
| **Curing** | Ambient | Months 2-6 | Stabilizes, matures |

**Game mechanic:** Rush compost = immature, can harm plants. Proper compost = 6 months = best results.

---

## 12. SLURRY & MANURE MANAGEMENT

### Regulations (Real EU/Spain)
| Rule | Limit | Consequence |
|------|-------|-------------|
| **Nitrate Vulnerable Zones** | 170kg N/ha/year from livestock | Fines, restrictions |
| **Storage capacity** | Must hold 4-6 months | Illegal to spread in winter |
| **Spreading ban** | Winter spreading prohibited | Water pollution |
| **Buffer zones** | 10m from waterways | Fines |

### Storage Types
| Type | Cost | Capacity | Risk |
|------|------|----------|------|
| **Lagoons** | Low | High | Leakage, smell |
| **Slurry tanks** | Medium | Medium | Overflow |
| **Composting bays** | Low | Low | Rain, runoff |
| **Anaerobic digester** | Very high | N/A | Produces biogas + digestate |

**Game mechanic:** Too many animals = too much manure = can't legally spread it = must build expensive storage or reduce herd.

---

## 13. BIODIVERSITY & CARBON CREDITS (Emerging)

### Biodiversity Measures
| Action | Cost | Biodiversity Score | Premium |
|--------|------|-------------------|---------|
| **Hedgerows** | Low | +10% | Some markets |
| **Flower strips** | Low | +5% | Pollinator support |
| **Ponds/wetlands** | Medium | +15% | Water retention |
| **Bird nesting boxes** | Very low | +2% | — |
| **Reduced tillage** | Medium | +10% | Carbon storage |

### Carbon Farming (New Real-World Mechanic!)
- Sequester carbon in soil = sell carbon credits
- No-till + cover crops + compost = carbon negative farm
- **Game mechanic:** Get paid for environmental services, not just products

---

## 14. CONTRACT FARMING

### Types of Contracts
| Type | Who Bears Risk | Price Certainty |
|------|---------------|-----------------|
| **Fixed price** | Buyer | High (guaranteed) |
| **Cost-plus** | Buyer | Medium (cost + margin) |
| **Market-linked** | Shared | Low (spot + premium) |
| **Production contract** | Farmer | Variable |

**Game mechanic:**
- Fixed price = safe but capped upside
- Market-linked = risk but jackpot potential
- Breach contract = reputation damage, future contracts harder

---

## 15. FARM SUCCESSION (Long-Term Progression)

### Generational Transfer
- **Year 1-10:** Establish farm, build infrastructure
- **Year 10-20:** Optimize, expand, pay off debt
- **Year 20-30:** Peak production, mentor next generation
- **Year 30+:** Transition planning, retirement, succession

**Game mechanic:**
- Character ages
- Skills improve over time
- Physical tasks harder as character gets older
- Hire younger workers or transition to management
- Legacy score = what you built lasts beyond your character

---

## 16. SEED SAVING & VARIETAL SELECTION

### Seed Types
| Type | Cost | Can Save Seeds? | Notes |
|------|------|-----------------|-------|
| **Heirloom** | Low | ✅ Yes | Stable genetics, regional adaptation |
| **Hybrid F1** | Medium | ❌ No | Uniform, high yield, seeds don't breed true |
| **GMO** | High (license) | ❌ Illegal | Herbicide tolerance, Bt traits |
| **Organic certified** | High | ✅ Yes | Must use organic seed if available |

### Seed Viability Over Time
| Crop | Viable Years | Germination Decline |
|------|-------------|---------------------|
| **Onions** | 1 year | Drops fast |
| **Parsley** | 1-2 years | Slow decline |
| **Tomatoes** | 4-5 years | Moderate |
| **Cucumbers** | 5+ years | Slow |
| **Lettuce** | 5+ years | Slow |

**Game mechanic:** Save seeds = free next year, but germination drops. Buy new = guaranteed quality, costs money.

---

## 17. GRAFTING (Fruit Trees)

### Why Graft
- **Rootstock** = controls vigor, disease resistance, soil adaptation
- **Scion** = controls fruit quality, variety
- **Dwarf rootstock** = smaller tree, easier harvest, sooner fruiting

| Rootstock | Effect | Common Use |
|-----------|--------|------------|
| **M9 (apple)** | Dwarf, precocious | High-density orchards |
| **MM106 (apple)** | Semi-vigorous | Standard orchards |
| **SO4 (grape)** | Phylloxera resistant | Wine grapes |
| **1103P (grape)** | Drought tolerant | Dry regions |

**Game mechanic:** Wrong rootstock = wrong soil = poor performance. Right combination = thriving orchard.

---

## 18. BEEKEEPING / POLLINATION SERVICES

### Hive Economics
| Product | Value | Season |
|---------|-------|--------|
| **Pollination service** | €50-100/hive | Spring |
| **Honey** | €5-15/kg | Summer |
| **Beeswax** | €10-20/kg | Year-round |
| **Propolis** | €50-100/kg | Year-round |
| **Royal jelly** | €100+/kg | Spring |

### Pollination Dependence
| Crop | Dependence | Yield Without Bees |
|------|-----------|-------------------|
| **Almonds** | 100% | Zero |
| **Apples** | 90% | 10% yield |
| **Strawberries** | 20% | 80% yield |
| **Self-pollinating** | 0% | 100% yield (tomatoes, peppers) |

**Game mechanic:** No bees = some crops fail entirely. Rent hives = cost but guaranteed pollination.

---

## 19. ROBOTICS & AUTONOMOUS MACHINERY

### Emerging Technology
| Machine | Stage | Cost | Benefit |
|---------|-------|------|---------|
| **Autonomous tractor** | Commercial | €200k+ | 24h operation, precision |
| **Weeding robot** | Early commercial | €50k+ | No herbicide, selective |
| **Harvesting robot** | R&D | Prototype only | Labor savings |
| **Drone spraying** | Commercial | €10k+ | Spot application, reduced chemical |
| **Soil scanning robot** | Early | €30k+ | Real-time nutrient maps |

**Game mechanic:** Late-game unlock. Expensive but solves labor shortage and precision problems.

---

## 20. FOOD MILES & LOCAL FOOD MOVEMENT

### Distance Premium
| Distance | Consumer Preference | Price Premium |
|----------|---------------------|---------------|
| **0-50km** | "Local" | +20-50% |
| **50-200km** | "Regional" | +10-20% |
| **200-1000km** | "National" | 0% |
| **>1000km** | "Import" | -10% (cheap, low perception) |

**Game mechanic:** Short supply chain = higher prices but smaller market. Long chain = volume but commodity prices.

---

## 🎯 NEW PRIORITY RECOMMENDATIONS

### Phase 4: Deep Realism (Your 13 Pending Specs + These)
1. **Crop rotation** → Links to tillage, pest, soil specs
2. **Weed management + resistance** → Active soil degradation, tillage
3. **Greenhouse/hydroponics** → Precision agriculture, climate control
4. **Machinery economics** → All systems (hidden cost layer)
5. **Post-harvest cold chain** → Storage quality decay
6. **Animal welfare scoring** → Organic certification, premium markets
7. **Food safety / traceability** → HACCP, organic cert
8. **Agroforestry** → Hedgerows, long-term tree crops
9. **On-farm energy / biogas** → Manure management, sustainability
10. **Soil microbiome** → Hidden stat affecting everything
11. **Composting** → Manure management, organic matter
12. **Contract farming** → Land leasing, risk management
13. **Beekeeping** → Pollination, biodiversity, side income

---

> **Status:** Part 2 research dump complete
> **Total mechanics researched:** 20 new systems
> **Next:** Jose picks which to spec next
