# Encyclopedia Spec

> The ONLY remaining system to implement before ship
> Status: Spec phase — needs Jose approval before code

---

## 🎯 Purpose

In-game reference that:
1. **Teaches** players about real agriculture
2. **Helps** them make better farming decisions
3. **Rewards** discovery — unlocks as they play
4. **Builds** domain expertise (Jose's ag engineering knowledge shines here)

---

## 📚 Categories

```
Encyclopedia/
├── Crops
│   ├── Wheat
│   ├── Corn
│   ├── Olives
│   └── ...
├── Animals
│   ├── Dairy Cows
│   ├── Pigs
│   └── ...
├── Machinery
│   ├── Tractors
│   ├── Harvesters
│   └── ...
├── Pests
│   ├── Olive Fly
│   ├── Aphids
│   └── ...
├── Diseases
│   ├── Powdery Mildew
│   ├── Blight
│   └── ...
├── Processing
│   ├── Cheese Making
│   ├── Wine Production
│   └── ...
└── Soil
    ├── pH Guide
    ├── NPK Guide
    └── ...
```

---

## 🔓 Unlock System

| Tier | Condition | What Unlocks |
|------|-----------|--------------|
| **Tier 0 (Locked)** | Never encountered | Entry hidden entirely |
| **Tier 1 (Discovered)** | First encounter | Basic info: name, icon, one-line description |
| **Tier 2 (Basic)** | Interact 3+ times | Core stats, requirements, basic tips |
| **Tier 3 (Advanced)** | Master-level interaction | Deep data, cross-references, expert strategies |
| **Tier 4 (Complete)** | Special achievement | Lore/flavor text, fun facts, Archie's tips |

**Example — Wheat:**
- Tier 0: Hidden
- Tier 1: "You discovered wheat!" → Icon + "A cereal grain widely cultivated for its seed"
- Tier 2: Planting season, harvest season, water needs, soil pH range
- Tier 3: Optimal NPK, companion crops, disease susceptibility, storage tips
- Tier 4: "Archie says: 'I once had a wheat field that...'" / Historical fun fact

---

## 📖 Entry Template (Per Item)

```
┌─────────────────────────────┐
│  [Icon] Wheat               │
│  "Triticum aestivum"        │
├─────────────────────────────┤
│  BASIC INFO                 │
│  • Planting: Autumn         │
│  • Harvest: Summer          │
│  • Growth: 8-10 months    │
│  • Water: Low               │
├─────────────────────────────┤
│  REQUIREMENTS (Tier 2)      │
│  • Soil pH: 6.0-7.0         │
│  • Soil: Loam preferred     │
│  • Climate: Temperate       │
├─────────────────────────────┤
│  STRATEGY (Tier 3)          │
│  • Best companion: Legumes  │
│  • Watch for: Rust, bunt    │
│  • Storage: <14% moisture   │
├─────────────────────────────┤
│  ARCHIE'S TIP (Tier 4)      │
│  "Don't plant after corn    │
│   — disease carryover is    │
│   brutal."                  │
└─────────────────────────────┘
```

---

## 🔗 Cross-References

Every entry links to related entries:
- **Wheat** → links to: Rust (disease), Combine Harvester (machine), Bread (processing)
- **Dairy Cow** → links to: Mastitis (disease), Milking Machine (equipment), Cheese (processing)
- **Olive Fly** → links to: Olives (crop), Integrated Pest Management (concept)

**UI:** "Related entries" section at bottom, tappable chips

---

## 🔍 Search & Filter

- **Search bar:** Type to filter across all entries
- **Category tabs:** Crops | Animals | Machines | Pests | Diseases | Processing
- **Filter by:**
  - Unlocked only / Show all (including locked)
  - Season (spring crops, winter animals, etc.)
  - Difficulty (beginner-friendly vs advanced)

---

## 🎨 Visual Design

- **Icons:** Consistent style per category (crops = green, pests = red, etc.)
- **Progress bars:** Show how close to next unlock tier
- **Badges:** "Fully researched" when Tier 4 reached
- **Animations:** Gentle unlock celebration (noob-friendly feedback)

---

## 📊 Data Source

**Jose's knowledge + Archie's tips = the secret sauce**

Format for each entry:
```json
{
  "id": "wheat",
  "name": "Wheat",
  "scientific": "Triticum aestivum",
  "category": "crops",
  "unlock_conditions": {
    "tier1": "first_plant",
    "tier2": "harvest_3_times",
    "tier3": "reach_quality_90",
    "tier4": "complete_quest"
  },
  "tiers": {
    "tier1": { "name": "Wheat", "description": "..." },
    "tier2": { "requirements": {...}, "stats": {...} },
    "tier3": { "strategy": "...", "optimal_conditions": {...} },
    "tier4": { "archie_tip": "...", "fun_fact": "..." }
  },
  "related": ["rust", "combine_harvester", "bread"]
}
```

---

## 🚀 Implementation Plan

### Phase 1: Structure
1. Encyclopedia screen UI (categories, search, list)
2. Entry detail view (tiered info display)
3. Unlock system (track progress, reveal tiers)

### Phase 2: Content
4. Write entries for all crops (use your real ag knowledge!)
5. Write entries for animals, machines, pests, diseases
6. Add Archie's tips (flavor + personality)

### Phase 3: Polish
7. Cross-reference linking
8. Progress tracking UI
9. Unlock animations/feedback

---

## ✅ Approval Checklist

Before code, Jose decides:
- [ ] Categories look right? (add/remove?)
- [ ] Unlock conditions make sense?
- [ ] Tier 4 content: Archie tips + fun facts = good idea?
- [ ] JSON format works with your stack?
- [ ] Any categories missing? (soil? weather? economics?)

**This is YOUR domain — your ag engineering knowledge is the content.** I can structure it, but the data comes from you and Archie.

---

> **Status:** Awaiting Jose approval
> **Next:** Jose reviews → approves/modifies → DOMINGO refines → Jose builds
