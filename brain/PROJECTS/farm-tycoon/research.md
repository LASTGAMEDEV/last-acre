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
