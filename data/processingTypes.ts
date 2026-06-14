// ═══════════════════════════════════════════════════════════════════════════════
// Processing System — Full Rebuild (2026-04-19 spec)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Input source types ────────────────────────────────────────────────────────
export type ProcessingInputSource = 'crop' | 'animal' | 'processed';

export interface ProcessingInput {
  source: ProcessingInputSource;
  itemId: string;
  quantity: number;
}

// ── Batch & Item types ────────────────────────────────────────────────────────
export interface ProcessingBatch {
  id: string;
  buildingId: string;           // which processing building is running this
  recipeId: string;
  startDay: number;
  completionDay: number;
  inputSnapshot: Record<string, number>; // itemId → quantity consumed
  outputItemId: string;
  outputQuantity: number;
  quality: number;              // 0–100, computed at batch start
}

export interface ProcessedItem {
  itemId: string;
  quantity: number;
  quality: number;              // 0–100
  producedDay: number;
  expiryDay: number;
}

// ── Recipe type ───────────────────────────────────────────────────────────────
export interface ProcessingRecipe {
  id: string;
  name: string;
  icon: string;
  buildingTypeId: string;       // required processing building type
  minBuildingTier: 1 | 2 | 3;   // minimum tier to run this recipe
  inputs: ProcessingInput[];    // ALL inputs required (multi-input support)
  outputItemId: string;
  baseOutputQuantity: number;   // at Tier 1; ×2 at Tier 2; ×4 at Tier 3
  processingDays: number;
  electricityKwhPerDay: number; // power draw while active
  requiredWorkerRole?: string;  // optional specific role requirement
}

// ── Processed item definition ─────────────────────────────────────────────────
export interface ProcessedItemDef {
  id: string;
  name: string;
  unit: string;
  basePrice: number;            // at quality 50
  shelfLifeDays: number;
  coldStorageMultiplier: number;
  agingImproves?: boolean;      // true for cheese, wine, spirits, balsamic
  optimalAgeDays?: number;      // day at which quality peaks if agingImproves
}

// ── Processing building config (static metadata) ──────────────────────────────
export interface ProcessingBuildingConfig {
  buildingTypeId: string;
  name: string;
  stage: 1 | 2 | 3 | 4;
  role: string;                 // worker role that can operate this building
  baseCost: number;
  maintenancePerDay: number;
  upgradeCostTier2: number;
  upgradeCostTier3: number;
  electricityStandbyKwh: number; // passive draw when idle
  description: string;
}

// ── Quality helpers ───────────────────────────────────────────────────────────
export function qualityLabel(q: number): string {
  if (q < 40) return 'Poor';
  if (q < 60) return 'Standard';
  if (q < 75) return 'Good';
  if (q < 90) return 'Premium';
  return 'Artisan';
}

export function qualityColor(q: number): string {
  if (q < 40) return '#888';
  if (q < 60) return '#ccc';
  if (q < 75) return '#81c784';
  if (q < 90) return '#4fc3f7';
  return '#ffd54f';
}

// ── Tier helpers ──────────────────────────────────────────────────────────────
export const BATCH_MULTIPLIER: Record<number, number> = { 1: 1, 2: 2, 3: 4 };
export const QUALITY_CEILING: Record<number, number> = { 1: 70, 2: 85, 3: 100 };
export const BUILDING_BONUS: Record<number, number> = { 1: 0, 2: 10, 3: 20 };

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSING BUILDING CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

export const PROCESSING_BUILDING_CONFIGS: ProcessingBuildingConfig[] = [
  // ═══ Stage 1 — Basic Equipment ═══
  {
    buildingTypeId: 'bld_grain_dryer',
    name: 'Grain Dryer & Store',
    stage: 1,
    role: 'grain_handler',
    baseCost: 18000,
    maintenancePerDay: 8,
    upgradeCostTier2: 25000,
    upgradeCostTier3: 45000,
    electricityStandbyKwh: 0.5,
    description: 'Dries and stores cereals for milling or malting.',
  },
  {
    buildingTypeId: 'bld_malting_floor',
    name: 'Malting Floor',
    stage: 1,
    role: 'grain_handler',
    baseCost: 22000,
    maintenancePerDay: 10,
    upgradeCostTier2: 30000,
    upgradeCostTier3: 55000,
    electricityStandbyKwh: 0.3,
    description: 'Converts grain into malted grain for brewing and distilling.',
  },
  {
    buildingTypeId: 'bld_feed_mixer',
    name: 'Feed Mixer',
    stage: 1,
    role: 'grain_handler',
    baseCost: 15000,
    maintenancePerDay: 6,
    upgradeCostTier2: 20000,
    upgradeCostTier3: 35000,
    electricityStandbyKwh: 0.8,
    description: 'Blends grain, soy and alfalfa into compound animal feed.',
  },
  {
    buildingTypeId: 'bld_milk_pasteuriser',
    name: 'Milk Pasteuriser',
    stage: 1,
    role: 'dairy_hand',
    baseCost: 28000,
    maintenancePerDay: 12,
    upgradeCostTier2: 40000,
    upgradeCostTier3: 70000,
    electricityStandbyKwh: 1.2,
    description: 'Pasteurises raw milk. Required before all dairy processing.',
  },
  {
    buildingTypeId: 'bld_abattoir',
    name: 'Licensed Abattoir',
    stage: 1,
    role: 'butcher',
    baseCost: 45000,
    maintenancePerDay: 18,
    upgradeCostTier2: 65000,
    upgradeCostTier3: 110000,
    electricityStandbyKwh: 1.5,
    description: 'Slaughters livestock into carcasses, hides, fat and bones.',
  },
  {
    buildingTypeId: 'bld_egg_grader',
    name: 'Egg Washer & Grader',
    stage: 1,
    role: 'packager',
    baseCost: 12000,
    maintenancePerDay: 5,
    upgradeCostTier2: 18000,
    upgradeCostTier3: 30000,
    electricityStandbyKwh: 0.6,
    description: 'Washes, grades and packs eggs for premium shop prices.',
  },
  {
    buildingTypeId: 'bld_drying_rack',
    name: 'Drying Rack & Kiln',
    stage: 1,
    role: 'herbalist',
    baseCost: 14000,
    maintenancePerDay: 5,
    upgradeCostTier2: 22000,
    upgradeCostTier3: 38000,
    electricityStandbyKwh: 0.4,
    description: 'Dries herbs, flowers, tomatoes and fruit for storage or tinning.',
  },
  {
    buildingTypeId: 'bld_fibre_prep',
    name: 'Fibre Prep',
    stage: 1,
    role: 'textile_worker',
    baseCost: 16000,
    maintenancePerDay: 6,
    upgradeCostTier2: 24000,
    upgradeCostTier3: 42000,
    electricityStandbyKwh: 0.5,
    description: 'Cleans and prepares raw cotton and wool for textile workshops.',
  },

  // ═══ Stage 2 — Processing Rooms ═══
  {
    buildingTypeId: 'bld_flour_mill',
    name: 'Stone Flour Mill',
    stage: 2,
    role: 'grain_handler',
    baseCost: 32000,
    maintenancePerDay: 12,
    upgradeCostTier2: 48000,
    upgradeCostTier3: 85000,
    electricityStandbyKwh: 0.8,
    description: 'Mills dried grain into stoneground flour.',
  },
  {
    buildingTypeId: 'bld_olive_press',
    name: 'Olive Press',
    stage: 2,
    role: 'press_operator',
    baseCost: 26000,
    maintenancePerDay: 10,
    upgradeCostTier2: 38000,
    upgradeCostTier3: 65000,
    electricityStandbyKwh: 0.7,
    description: 'Presses olives into extra virgin olive oil.',
  },
  {
    buildingTypeId: 'bld_nut_roaster',
    name: 'Nut Roaster & Press',
    stage: 2,
    role: 'press_operator',
    baseCost: 24000,
    maintenancePerDay: 9,
    upgradeCostTier2: 35000,
    upgradeCostTier3: 60000,
    electricityStandbyKwh: 0.6,
    description: 'Roasts and presses almonds into oil, flour and butter.',
  },
  {
    buildingTypeId: 'bld_dairy_room',
    name: 'Dairy Room',
    stage: 2,
    role: 'dairy_hand',
    baseCost: 30000,
    maintenancePerDay: 12,
    upgradeCostTier2: 45000,
    upgradeCostTier3: 78000,
    electricityStandbyKwh: 1.0,
    description: 'Transforms pasteurised milk into butter, cream and yoghurt.',
  },
  {
    buildingTypeId: 'bld_cheese_room',
    name: 'Cheese Room',
    stage: 2,
    role: 'cheesemaker',
    baseCost: 35000,
    maintenancePerDay: 14,
    upgradeCostTier2: 52000,
    upgradeCostTier3: 90000,
    electricityStandbyKwh: 1.0,
    description: 'Makes fresh soft cheese and curds for ageing.',
  },
  {
    buildingTypeId: 'bld_farm_butchery',
    name: 'Farm Butchery',
    stage: 2,
    role: 'butcher',
    baseCost: 28000,
    maintenancePerDay: 11,
    upgradeCostTier2: 42000,
    upgradeCostTier3: 72000,
    electricityStandbyKwh: 0.9,
    description: 'Butchers carcasses into retail cuts, mince and sausages.',
  },
  {
    buildingTypeId: 'bld_lard_bone_room',
    name: 'Lard & Bone Meal Room',
    stage: 2,
    role: 'butcher',
    baseCost: 18000,
    maintenancePerDay: 7,
    upgradeCostTier2: 26000,
    upgradeCostTier3: 45000,
    electricityStandbyKwh: 0.5,
    description: 'Renders fat into cooking lard and bones into fertiliser.',
  },
  {
    buildingTypeId: 'bld_fruit_press',
    name: 'Fruit Press',
    stage: 2,
    role: 'press_operator',
    baseCost: 22000,
    maintenancePerDay: 8,
    upgradeCostTier2: 32000,
    upgradeCostTier3: 55000,
    electricityStandbyKwh: 0.6,
    description: 'Presses grapes and strawberries into fresh juice and must.',
  },
  {
    buildingTypeId: 'bld_tomato_kitchen',
    name: 'Tomato Kitchen',
    stage: 2,
    role: 'preserve_maker',
    baseCost: 20000,
    maintenancePerDay: 8,
    upgradeCostTier2: 30000,
    upgradeCostTier3: 52000,
    electricityStandbyKwh: 0.5,
    description: 'Makes tomato paste, passata and sundried tomatoes.',
  },
  {
    buildingTypeId: 'bld_preserving_kitchen',
    name: 'Preserving Kitchen',
    stage: 2,
    role: 'preserve_maker',
    baseCost: 24000,
    maintenancePerDay: 9,
    upgradeCostTier2: 36000,
    upgradeCostTier3: 62000,
    electricityStandbyKwh: 0.6,
    description: 'Produces jams, chutneys, pickles and sauces.',
  },
  {
    buildingTypeId: 'bld_tinning_room',
    name: 'Tinning & Packaging Room',
    stage: 2,
    role: 'packager',
    baseCost: 26000,
    maintenancePerDay: 10,
    upgradeCostTier2: 38000,
    upgradeCostTier3: 65000,
    electricityStandbyKwh: 0.7,
    description: 'Packages dried herbs, saffron, lavender and vanilla into tins and gift boxes.',
  },
  {
    buildingTypeId: 'bld_small_still',
    name: 'Small Still',
    stage: 2,
    role: 'herbalist',
    baseCost: 20000,
    maintenancePerDay: 8,
    upgradeCostTier2: 30000,
    upgradeCostTier3: 52000,
    electricityStandbyKwh: 0.5,
    description: 'Distils lavender and herbs into essential oils and herbal waters.',
  },
  {
    buildingTypeId: 'bld_honey_room',
    name: 'Honey Room',
    stage: 2,
    role: 'honey_wax_worker',
    baseCost: 18000,
    maintenancePerDay: 7,
    upgradeCostTier2: 26000,
    upgradeCostTier3: 45000,
    electricityStandbyKwh: 0.4,
    description: 'Processes raw honey into filtered, creamed and infused varieties.',
  },
  {
    buildingTypeId: 'bld_wax_workshop',
    name: 'Wax Workshop',
    stage: 2,
    role: 'honey_wax_worker',
    baseCost: 16000,
    maintenancePerDay: 6,
    upgradeCostTier2: 24000,
    upgradeCostTier3: 42000,
    electricityStandbyKwh: 0.4,
    description: 'Makes candles, beeswax wraps and wood polish from beeswax.',
  },
  {
    buildingTypeId: 'bld_wool_workshop',
    name: 'Wool & Fibre Workshop',
    stage: 2,
    role: 'textile_worker',
    baseCost: 22000,
    maintenancePerDay: 8,
    upgradeCostTier2: 33000,
    upgradeCostTier3: 58000,
    electricityStandbyKwh: 0.5,
    description: 'Spins cleaned wool and cotton into yarn and thread.',
  },
  {
    buildingTypeId: 'bld_leather_workshop',
    name: 'Small Leather Workshop',
    stage: 2,
    role: 'leatherworker',
    baseCost: 20000,
    maintenancePerDay: 7,
    upgradeCostTier2: 30000,
    upgradeCostTier3: 52000,
    electricityStandbyKwh: 0.4,
    description: 'Tans hides into leather and crafts small leather goods.',
  },

  // ═══ Stage 3 — Craft Production ═══
  {
    buildingTypeId: 'bld_farm_bakery',
    name: 'Farm Bakery',
    stage: 3,
    role: 'baker',
    baseCost: 35000,
    maintenancePerDay: 14,
    upgradeCostTier2: 52000,
    upgradeCostTier3: 90000,
    electricityStandbyKwh: 1.0,
    description: 'Bakes bread, scones, pastries and shortbread from farm flour and eggs.',
  },
  {
    buildingTypeId: 'bld_pasta_workshop',
    name: 'Pasta Workshop',
    stage: 3,
    role: 'baker',
    baseCost: 28000,
    maintenancePerDay: 11,
    upgradeCostTier2: 42000,
    upgradeCostTier3: 72000,
    electricityStandbyKwh: 0.8,
    description: 'Makes fresh and dried pasta from flour and eggs.',
  },
  {
    buildingTypeId: 'bld_ice_cream_churner',
    name: 'Ice Cream Churner',
    stage: 3,
    role: 'ice_cream_maker',
    baseCost: 32000,
    maintenancePerDay: 12,
    upgradeCostTier2: 48000,
    upgradeCostTier3: 82000,
    electricityStandbyKwh: 1.5,
    description: 'Churns cream, milk and eggs into artisan ice cream and gelato.',
  },
  {
    buildingTypeId: 'bld_cheese_ageing',
    name: 'Cheese Ageing Room',
    stage: 3,
    role: 'cheesemaker',
    baseCost: 38000,
    maintenancePerDay: 15,
    upgradeCostTier2: 56000,
    upgradeCostTier3: 98000,
    electricityStandbyKwh: 1.2,
    description: 'Ages fresh curds into hard and mature cheeses.',
  },
  {
    buildingTypeId: 'bld_curing_room',
    name: 'Curing & Smoking Room',
    stage: 3,
    role: 'charcutier',
    baseCost: 34000,
    maintenancePerDay: 13,
    upgradeCostTier2: 50000,
    upgradeCostTier3: 86000,
    electricityStandbyKwh: 0.8,
    description: 'Cures and smokes meats into bacon, ham, sausages and salami.',
  },
  {
    buildingTypeId: 'bld_farm_winery',
    name: 'Farm Winery',
    stage: 3,
    role: 'winemaker',
    baseCost: 45000,
    maintenancePerDay: 16,
    upgradeCostTier2: 68000,
    upgradeCostTier3: 120000,
    electricityStandbyKwh: 1.0,
    description: 'Ferments grape must into table wine, rosé and sparkling wine.',
  },
  {
    buildingTypeId: 'bld_micro_brewery',
    name: 'Micro-Brewery',
    stage: 3,
    role: 'brewer',
    baseCost: 42000,
    maintenancePerDay: 15,
    upgradeCostTier2: 62000,
    upgradeCostTier3: 108000,
    electricityStandbyKwh: 0.9,
    description: 'Brews craft ales, stouts and lagers from malted grain.',
  },
  {
    buildingTypeId: 'bld_cider_house',
    name: 'Cider House',
    stage: 3,
    role: 'cider_maker',
    baseCost: 30000,
    maintenancePerDay: 11,
    upgradeCostTier2: 44000,
    upgradeCostTier3: 76000,
    electricityStandbyKwh: 0.7,
    description: 'Ferments pressed juice into still and sparkling cider.',
  },
  {
    buildingTypeId: 'bld_small_distillery',
    name: 'Small Batch Distillery',
    stage: 3,
    role: 'distiller',
    baseCost: 48000,
    maintenancePerDay: 18,
    upgradeCostTier2: 72000,
    upgradeCostTier3: 125000,
    electricityStandbyKwh: 1.2,
    description: 'Distils malted grain and fruit wine into gin, vodka and new-make spirit.',
  },
  {
    buildingTypeId: 'bld_infused_oil_kitchen',
    name: 'Infused Oil Kitchen',
    stage: 3,
    role: 'preserve_maker',
    baseCost: 22000,
    maintenancePerDay: 8,
    upgradeCostTier2: 33000,
    upgradeCostTier3: 58000,
    electricityStandbyKwh: 0.5,
    description: 'Infuses olive oil with garlic, herbs and chilli.',
  },
  {
    buildingTypeId: 'bld_vinegar_barrel',
    name: 'Vinegar Barrel Room',
    stage: 3,
    role: 'winemaker',
    baseCost: 26000,
    maintenancePerDay: 9,
    upgradeCostTier2: 38000,
    upgradeCostTier3: 65000,
    electricityStandbyKwh: 0.3,
    description: 'Ages wine and cider into wine vinegar and cider vinegar.',
  },
  {
    buildingTypeId: 'bld_extract_kitchen',
    name: 'Infusion & Extract Kitchen',
    stage: 3,
    role: 'herbalist',
    baseCost: 24000,
    maintenancePerDay: 9,
    upgradeCostTier2: 36000,
    upgradeCostTier3: 62000,
    electricityStandbyKwh: 0.5,
    description: 'Creates vanilla extract, saffron water and ginseng tincture.',
  },

  // ═══ Stage 4 — Premium & Aged ═══
  {
    buildingTypeId: 'bld_cave_cheese',
    name: 'Cave-Aged Cheese Cellar',
    stage: 4,
    role: 'cheesemaker',
    baseCost: 55000,
    maintenancePerDay: 18,
    upgradeCostTier2: 82000,
    upgradeCostTier3: 140000,
    electricityStandbyKwh: 0.5,
    description: 'Ages hard cheese for 12–36 months into parmesan-style, cheddar and blue.',
  },
  {
    buildingTypeId: 'bld_wine_cellar',
    name: 'Wine Cellar',
    stage: 4,
    role: 'winemaker',
    baseCost: 52000,
    maintenancePerDay: 16,
    upgradeCostTier2: 78000,
    upgradeCostTier3: 135000,
    electricityStandbyKwh: 0.4,
    description: 'Barrel-ages farm winery output into reserve wines.',
  },
  {
    buildingTypeId: 'bld_spirit_casks',
    name: 'Spirit Maturation Casks',
    stage: 4,
    role: 'distiller',
    baseCost: 60000,
    maintenancePerDay: 20,
    upgradeCostTier2: 90000,
    upgradeCostTier3: 155000,
    electricityStandbyKwh: 0.3,
    description: 'Matures new-make spirit into aged whisky, brandy and rum.',
  },
  {
    buildingTypeId: 'bld_bottle_ales',
    name: 'Bottle-Conditioned Ale Store',
    stage: 4,
    role: 'brewer',
    baseCost: 32000,
    maintenancePerDay: 10,
    upgradeCostTier2: 48000,
    upgradeCostTier3: 82000,
    electricityStandbyKwh: 0.3,
    description: 'Conditions micro-brewery ales into bottle-conditioned and gift-boxed beers.',
  },
  {
    buildingTypeId: 'bld_long_cured_meats',
    name: 'Long-Cured Meat Chamber',
    stage: 4,
    role: 'charcutier',
    baseCost: 48000,
    maintenancePerDay: 15,
    upgradeCostTier2: 72000,
    upgradeCostTier3: 125000,
    electricityStandbyKwh: 0.4,
    description: 'Ages curing room output into prosciutto and dry-cured ham.',
  },
  {
    buildingTypeId: 'bld_aged_balsamic',
    name: 'Aged Balsamic Loft',
    stage: 4,
    role: 'winemaker',
    baseCost: 38000,
    maintenancePerDay: 12,
    upgradeCostTier2: 56000,
    upgradeCostTier3: 98000,
    electricityStandbyKwh: 0.2,
    description: 'Ages vinegar in oak barrels for 5–10 year balsamic.',
  },
];

// Helper to look up a building config by type id
export function getProcessingBuildingConfig(buildingTypeId: string): ProcessingBuildingConfig | undefined {
  return PROCESSING_BUILDING_CONFIGS.find(c => c.buildingTypeId === buildingTypeId);
}

export function getRecipesForBuilding(buildingTypeId: string): ProcessingRecipe[] {
  return PROCESSING_RECIPES.filter(r => r.buildingTypeId === buildingTypeId);
}

export function getBuildingsForStage(stage: number): ProcessingBuildingConfig[] {
  return PROCESSING_BUILDING_CONFIGS.filter(c => c.stage === stage);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSED ITEM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const PROCESSED_ITEM_DEFS: ProcessedItemDef[] = [
  // ── Stage 1 outputs ──
  { id: 'dried_wheat',      name: 'Dried Wheat',           unit: 'kg',  basePrice: 0.28,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_barley',     name: 'Dried Barley',          unit: 'kg',  basePrice: 0.23,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_oats',       name: 'Dried Oats',            unit: 'kg',  basePrice: 0.20,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_corn',       name: 'Dried Corn',            unit: 'kg',  basePrice: 0.22,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_sorghum',    name: 'Dried Sorghum',         unit: 'kg',  basePrice: 0.21,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'malted_barley',    name: 'Malted Barley',         unit: 'kg',  basePrice: 0.55,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'malted_wheat',     name: 'Malted Wheat',          unit: 'kg',  basePrice: 0.48,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'compound_feed',    name: 'Compound Animal Feed',  unit: 'kg',  basePrice: 0.35,  shelfLifeDays: 90,   coldStorageMultiplier: 1 },
  { id: 'pasteurised_milk', name: 'Pasteurised Milk',      unit: 'L',   basePrice: 0.55,  shelfLifeDays: 10,   coldStorageMultiplier: 3 },
  { id: 'carcass',          name: 'Carcass',               unit: 'kg',  basePrice: 3.20,  shelfLifeDays: 3,    coldStorageMultiplier: 5 },
  { id: 'hide',             name: 'Hide',                  unit: 'ud',  basePrice: 18.00, shelfLifeDays: 60,   coldStorageMultiplier: 2 },
  { id: 'animal_fat',       name: 'Animal Fat',            unit: 'kg',  basePrice: 1.50,  shelfLifeDays: 60,   coldStorageMultiplier: 2 },
  { id: 'bones',            name: 'Bones',                 unit: 'kg',  basePrice: 0.30,  shelfLifeDays: 90,   coldStorageMultiplier: 1 },
  { id: 'graded_eggs',      name: 'Graded Eggs',           unit: 'ud',  basePrice: 0.28,  shelfLifeDays: 21,   coldStorageMultiplier: 2 },
  { id: 'dried_lavender',   name: 'Dried Lavender',        unit: 'kg',  basePrice: 200,   shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_saffron',    name: 'Dried Saffron Threads', unit: 'g',   basePrice: 4.50,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'cured_vanilla',    name: 'Cured Vanilla Pods',    unit: 'kg',  basePrice: 180,   shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_ginseng',    name: 'Dried Ginseng Root',    unit: 'kg',  basePrice: 420,   shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_tomatoes',   name: 'Sundried Tomatoes',     unit: 'kg',  basePrice: 4.50,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'dried_strawberries', name: 'Dried Strawberries',  unit: 'kg',  basePrice: 8.00,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'cleaned_cotton',   name: 'Cleaned Cotton Lint',   unit: 'kg',  basePrice: 2.80,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'scoured_wool',     name: 'Scoured Wool',          unit: 'kg',  basePrice: 12.00, shelfLifeDays: 730,  coldStorageMultiplier: 1 },

  // ── Stage 2 outputs ──
  { id: 'stoneground_flour',    name: 'Stoneground Flour',     unit: 'kg',  basePrice: 0.55,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'extra_virgin_olive_oil', name: 'Extra Virgin Olive Oil', unit: 'L', basePrice: 8.50, shelfLifeDays: 540,  coldStorageMultiplier: 1 },
  { id: 'roasted_almonds',      name: 'Roasted Almonds',       unit: 'kg',  basePrice: 8.50,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'almond_flour',         name: 'Almond Flour',          unit: 'kg',  basePrice: 9.50,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'almond_butter',        name: 'Almond Butter',         unit: 'kg',  basePrice: 12.00, shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'butter',               name: 'Butter',                unit: 'kg',  basePrice: 6.50,  shelfLifeDays: 30,   coldStorageMultiplier: 3 },
  { id: 'cream_product',        name: 'Cream',                 unit: 'L',   basePrice: 3.80,  shelfLifeDays: 14,   coldStorageMultiplier: 3 },
  { id: 'yoghurt',              name: 'Yoghurt',               unit: 'kg',  basePrice: 3.20,  shelfLifeDays: 14,   coldStorageMultiplier: 3 },
  { id: 'fresh_soft_cheese',    name: 'Fresh Soft Cheese',     unit: 'kg',  basePrice: 10.00, shelfLifeDays: 14,   coldStorageMultiplier: 3 },
  { id: 'cheese_curds',         name: 'Cheese Curds',          unit: 'kg',  basePrice: 8.00,  shelfLifeDays: 10,   coldStorageMultiplier: 3 },
  { id: 'retail_cuts',          name: 'Retail Meat Cuts',      unit: 'kg',  basePrice: 8.50,  shelfLifeDays: 2,    coldStorageMultiplier: 5 },
  { id: 'mince',                name: 'Mince',                 unit: 'kg',  basePrice: 6.00,  shelfLifeDays: 2,    coldStorageMultiplier: 5 },
  { id: 'sausages_fresh',       name: 'Fresh Sausages',        unit: 'kg',  basePrice: 7.50,  shelfLifeDays: 5,    coldStorageMultiplier: 4 },
  { id: 'cooking_lard',         name: 'Cooking Lard',          unit: 'kg',  basePrice: 2.20,  shelfLifeDays: 180,  coldStorageMultiplier: 2 },
  { id: 'bone_meal_fertiliser', name: 'Bone Meal Fertiliser',  unit: 'kg',  basePrice: 1.80,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'fresh_juice',          name: 'Fresh Pressed Juice',   unit: 'L',   basePrice: 2.80,  shelfLifeDays: 3,    coldStorageMultiplier: 4 },
  { id: 'grape_must',           name: 'Grape Must',            unit: 'L',   basePrice: 1.80,  shelfLifeDays: 5,    coldStorageMultiplier: 3 },
  { id: 'tomato_paste',         name: 'Tomato Paste',          unit: 'kg',  basePrice: 1.40,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'passata',              name: 'Passata',               unit: 'L',   basePrice: 1.60,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'strawberry_jam',       name: 'Strawberry Jam',        unit: 'kg',  basePrice: 5.50,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'grape_chutney',        name: 'Grape Chutney',         unit: 'kg',  basePrice: 4.20,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'tomato_pickles',       name: 'Tomato Pickles',        unit: 'kg',  basePrice: 3.80,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'saffron_tin',          name: 'Saffron Tin',           unit: 'g',   basePrice: 5.50,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'herb_tin',             name: 'Dried Herb Tin',        unit: 'g',   basePrice: 2.80,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'vanilla_gift_box',     name: 'Gift-Boxed Vanilla',    unit: 'ud',  basePrice: 22.00, shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'spice_set',            name: 'Branded Spice Set',     unit: 'ud',  basePrice: 35.00, shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'lavender_oil',         name: 'Lavender Essential Oil', unit: 'mL', basePrice: 18.00, shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'herbal_water',         name: 'Herbal Water',          unit: 'L',   basePrice: 8.50,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'filtered_honey',       name: 'Filtered Honey',        unit: 'kg',  basePrice: 10.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'creamed_honey',        name: 'Creamed Honey',         unit: 'kg',  basePrice: 12.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'infused_honey',        name: 'Infused Honey',         unit: 'kg',  basePrice: 14.00, shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'beeswax_candle',       name: 'Beeswax Candle',        unit: 'ud',  basePrice: 6.50,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'beeswax_wrap',         name: 'Beeswax Wrap',          unit: 'ud',  basePrice: 4.50,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'wood_polish',          name: 'Wood Polish',           unit: 'ud',  basePrice: 8.00,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'basic_soap',           name: 'Basic Soap',            unit: 'ud',  basePrice: 3.50,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'yarn_wool',            name: 'Wool Yarn',             unit: 'kg',  basePrice: 28.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'yarn_cotton',          name: 'Cotton Yarn',           unit: 'kg',  basePrice: 5.50,  shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'linen_thread',         name: 'Linen Thread',          unit: 'kg',  basePrice: 7.00,  shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'tanned_leather',       name: 'Tanned Leather',        unit: 'm2',  basePrice: 18.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'leather_goods',        name: 'Small Leather Goods',   unit: 'ud',  basePrice: 28.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },

  // ── Stage 3 outputs ──
  { id: 'farm_bread',           name: 'Farm Bread',            unit: 'kg',  basePrice: 3.50,  shelfLifeDays: 2,    coldStorageMultiplier: 2 },
  { id: 'scones',               name: 'Scones',                unit: 'kg',  basePrice: 5.50,  shelfLifeDays: 2,    coldStorageMultiplier: 2 },
  { id: 'pastries',             name: 'Pastries',              unit: 'kg',  basePrice: 7.50,  shelfLifeDays: 2,    coldStorageMultiplier: 2 },
  { id: 'shortbread',           name: 'Shortbread',            unit: 'kg',  basePrice: 6.00,  shelfLifeDays: 60,   coldStorageMultiplier: 1 },
  { id: 'fresh_pasta',          name: 'Fresh Pasta',           unit: 'kg',  basePrice: 3.80,  shelfLifeDays: 4,    coldStorageMultiplier: 3 },
  { id: 'dried_pasta',          name: 'Dried Pasta',           unit: 'kg',  basePrice: 2.80,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'ice_cream',            name: 'Artisan Ice Cream',     unit: 'L',   basePrice: 8.50,  shelfLifeDays: 7,    coldStorageMultiplier: 8 },
  { id: 'gelato',               name: 'Gelato',                unit: 'L',   basePrice: 9.50,  shelfLifeDays: 7,    coldStorageMultiplier: 8 },
  { id: 'hard_cheese',          name: 'Hard Cheese',           unit: 'kg',  basePrice: 18.00, shelfLifeDays: 60,   coldStorageMultiplier: 2, agingImproves: true, optimalAgeDays: 120 },
  { id: 'aged_cheese',          name: 'Aged Cheese',           unit: 'kg',  basePrice: 22.00, shelfLifeDays: 90,   coldStorageMultiplier: 2, agingImproves: true, optimalAgeDays: 240 },
  { id: 'smoked_bacon',         name: 'Smoked Bacon',          unit: 'kg',  basePrice: 10.50, shelfLifeDays: 90,   coldStorageMultiplier: 2 },
  { id: 'smoked_ham',           name: 'Smoked Ham',            unit: 'kg',  basePrice: 12.00, shelfLifeDays: 90,   coldStorageMultiplier: 2 },
  { id: 'salami',               name: 'Salami',                unit: 'kg',  basePrice: 14.00, shelfLifeDays: 120,  coldStorageMultiplier: 2 },
  { id: 'table_wine',           name: 'Table Wine',            unit: 'L',   basePrice: 6.50,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 365 },
  { id: 'rose_wine',            name: 'Rosé Wine',             unit: 'L',   basePrice: 7.00,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'sparkling_wine',       name: 'Sparkling Wine',        unit: 'L',   basePrice: 12.00, shelfLifeDays: 365,  coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 730 },
  { id: 'craft_ale',            name: 'Craft Ale',             unit: 'L',   basePrice: 5.50,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'stout',                name: 'Stout',                 unit: 'L',   basePrice: 6.00,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'lager',                name: 'Lager',                 unit: 'L',   basePrice: 5.00,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'still_cider',          name: 'Still Cider',           unit: 'L',   basePrice: 4.20,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'sparkling_cider',      name: 'Sparkling Cider',       unit: 'L',   basePrice: 5.50,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'gin',                  name: 'Gin',                   unit: 'L',   basePrice: 28.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'vodka',                name: 'Vodka',                 unit: 'L',   basePrice: 22.00, shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  { id: 'new_make_spirit',      name: 'New-Make Spirit',       unit: 'L',   basePrice: 15.00, shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'infused_olive_oil',    name: 'Infused Olive Oil',     unit: 'L',   basePrice: 12.00, shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'wine_vinegar',         name: 'Wine Vinegar',          unit: 'L',   basePrice: 3.50,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'cider_vinegar',        name: 'Cider Vinegar',         unit: 'L',   basePrice: 3.00,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'vanilla_extract',      name: 'Vanilla Extract',       unit: 'mL',  basePrice: 8.50,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'saffron_water',        name: 'Saffron Water',         unit: 'mL',  basePrice: 6.50,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'ginseng_tincture',     name: 'Ginseng Tincture',      unit: 'mL',  basePrice: 12.00, shelfLifeDays: 730,  coldStorageMultiplier: 1 },

  // ── Stage 4 outputs ──
  { id: 'cave_aged_cheese',     name: 'Cave-Aged Cheese',      unit: 'kg',  basePrice: 35.00, shelfLifeDays: 120,  coldStorageMultiplier: 2, agingImproves: true, optimalAgeDays: 540 },
  { id: 'barrel_aged_wine',     name: 'Barrel-Aged Wine',      unit: 'L',   basePrice: 14.00, shelfLifeDays: 730,  coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 730 },
  { id: 'reserve_wine',         name: 'Reserve Wine',          unit: 'L',   basePrice: 22.00, shelfLifeDays: 1825, coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 1460 },
  { id: 'aged_whisky',          name: 'Aged Whisky',           unit: 'L',   basePrice: 65.00, shelfLifeDays: 1825, coldStorageMultiplier: 1, agingImproves: true, optimalAgeDays: 2190 },
  { id: 'brandy',               name: 'Brandy',                unit: 'L',   basePrice: 48.00, shelfLifeDays: 1825, coldStorageMultiplier: 1, agingImproves: true, optimalAgeDays: 1460 },
  { id: 'rum',                  name: 'Rum',                   unit: 'L',   basePrice: 42.00, shelfLifeDays: 1825, coldStorageMultiplier: 1, agingImproves: true, optimalAgeDays: 1460 },
  { id: 'bottle_conditioned_ale', name: 'Bottle-Conditioned Ale', unit: 'L', basePrice: 7.50, shelfLifeDays: 365, coldStorageMultiplier: 1.5 },
  { id: 'prosciutto',           name: 'Aged Prosciutto',       unit: 'kg',  basePrice: 28.00, shelfLifeDays: 365,  coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 730 },
  { id: 'dry_cured_ham',        name: 'Dry-Cured Ham',         unit: 'kg',  basePrice: 22.00, shelfLifeDays: 365,  coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 540 },
  { id: 'aged_balsamic_5yr',    name: '5-Year Aged Balsamic',  unit: 'mL',  basePrice: 1.20,  shelfLifeDays: 1825, coldStorageMultiplier: 1, agingImproves: true, optimalAgeDays: 1825 },
  { id: 'aged_balsamic_10yr',   name: '10-Year Aged Balsamic', unit: 'mL',  basePrice: 2.80,  shelfLifeDays: 3650, coldStorageMultiplier: 1, agingImproves: true, optimalAgeDays: 3650 },
];

// Backward compat: flat product list used by price engine
export const PROCESSED_PRODUCTS = PROCESSED_ITEM_DEFS.map(d => ({
  id: d.id,
  name: d.name,
  unit: d.unit,
  basePrice: d.basePrice,
}));

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════════════════════════════════════════

export const PROCESSING_RECIPES: ProcessingRecipe[] = [
  // ═══ Stage 1 ═══
  // Grain Dryer
  { id: 'rec_dry_wheat',     name: 'Dry Wheat',     icon: '🌾', buildingTypeId: 'bld_grain_dryer',     minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'wheat', quantity: 3 }], outputItemId: 'dried_wheat',      baseOutputQuantity: 2,  processingDays: 1, electricityKwhPerDay: 2.0 },
  { id: 'rec_dry_barley',    name: 'Dry Barley',    icon: '🌾', buildingTypeId: 'bld_grain_dryer',     minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'barley', quantity: 3 }], outputItemId: 'dried_barley',     baseOutputQuantity: 2,  processingDays: 1, electricityKwhPerDay: 2.0 },
  { id: 'rec_dry_oats',      name: 'Dry Oats',      icon: '🌾', buildingTypeId: 'bld_grain_dryer',     minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'oats', quantity: 3 }], outputItemId: 'dried_oats',       baseOutputQuantity: 2,  processingDays: 1, electricityKwhPerDay: 2.0 },
  { id: 'rec_dry_corn',      name: 'Dry Corn',      icon: '🌽', buildingTypeId: 'bld_grain_dryer',     minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'corn', quantity: 3 }], outputItemId: 'dried_corn',       baseOutputQuantity: 2,  processingDays: 1, electricityKwhPerDay: 2.0 },
  { id: 'rec_dry_sorghum',   name: 'Dry Sorghum',   icon: '🌾', buildingTypeId: 'bld_grain_dryer',     minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'sorghum', quantity: 3 }], outputItemId: 'dried_sorghum',    baseOutputQuantity: 2,  processingDays: 1, electricityKwhPerDay: 2.0 },
  // Malting Floor
  { id: 'rec_malt_barley',   name: 'Malt Barley',   icon: '🍺', buildingTypeId: 'bld_malting_floor',   minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'barley', quantity: 3 }], outputItemId: 'malted_barley',    baseOutputQuantity: 1,  processingDays: 3, electricityKwhPerDay: 0.5 },
  { id: 'rec_malt_wheat',    name: 'Malt Wheat',    icon: '🍺', buildingTypeId: 'bld_malting_floor',   minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'wheat', quantity: 3 }], outputItemId: 'malted_wheat',     baseOutputQuantity: 1,  processingDays: 3, electricityKwhPerDay: 0.5 },
  // Feed Mixer
  { id: 'rec_compound_feed', name: 'Compound Feed', icon: '🌿', buildingTypeId: 'bld_feed_mixer',      minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'wheat', quantity: 2 }, { source: 'crop', itemId: 'soy', quantity: 1 }, { source: 'crop', itemId: 'alfalfa', quantity: 1 }], outputItemId: 'compound_feed', baseOutputQuantity: 3, processingDays: 1, electricityKwhPerDay: 1.0 },
  // Milk Pasteuriser
  { id: 'rec_pasteurise_milk', name: 'Pasteurise Milk', icon: '🥛', buildingTypeId: 'bld_milk_pasteuriser', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'milk', quantity: 5 }], outputItemId: 'pasteurised_milk', baseOutputQuantity: 4, processingDays: 1, electricityKwhPerDay: 1.5 },
  // Licensed Abattoir
  { id: 'rec_slaughter',     name: 'Slaughter Livestock', icon: '🔪', buildingTypeId: 'bld_abattoir', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'meat', quantity: 5 }], outputItemId: 'carcass', baseOutputQuantity: 4, processingDays: 1, electricityKwhPerDay: 1.0, requiredWorkerRole: 'butcher' },
  { id: 'rec_render_hide',   name: 'Process Hides',       icon: '🟫', buildingTypeId: 'bld_abattoir', minBuildingTier: 2, inputs: [{ source: 'animal', itemId: 'meat', quantity: 3 }], outputItemId: 'hide', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.8 },
  // Egg Grader
  { id: 'rec_grade_eggs',    name: 'Grade Eggs', icon: '🥚', buildingTypeId: 'bld_egg_grader', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'eggs', quantity: 12 }], outputItemId: 'graded_eggs', baseOutputQuantity: 12, processingDays: 1, electricityKwhPerDay: 0.3 },
  // Drying Rack
  { id: 'rec_dry_lavender',  name: 'Dry Lavender',  icon: '🌸', buildingTypeId: 'bld_drying_rack', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'lavender', quantity: 2 }], outputItemId: 'dried_lavender', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.5 },
  { id: 'rec_dry_saffron',   name: 'Dry Saffron',   icon: '🌺', buildingTypeId: 'bld_drying_rack', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'saffron', quantity: 1 }], outputItemId: 'dried_saffron', baseOutputQuantity: 1, processingDays: 3, electricityKwhPerDay: 0.5 },
  { id: 'rec_cure_vanilla',  name: 'Cure Vanilla',  icon: '🌿', buildingTypeId: 'bld_drying_rack', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'vanilla', quantity: 2 }], outputItemId: 'cured_vanilla', baseOutputQuantity: 1, processingDays: 5, electricityKwhPerDay: 0.4 },
  { id: 'rec_dry_ginseng',   name: 'Dry Ginseng',   icon: '🌱', buildingTypeId: 'bld_drying_rack', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'ginseng', quantity: 2 }], outputItemId: 'dried_ginseng', baseOutputQuantity: 1, processingDays: 4, electricityKwhPerDay: 0.4 },
  { id: 'rec_dry_tomatoes',  name: 'Sundry Tomatoes', icon: '🍅', buildingTypeId: 'bld_drying_rack', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'tomatoes', quantity: 3 }], outputItemId: 'dried_tomatoes', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.6 },
  { id: 'rec_dry_strawberries', name: 'Dry Strawberries', icon: '🍓', buildingTypeId: 'bld_drying_rack', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'strawberries', quantity: 3 }], outputItemId: 'dried_strawberries', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.6 },
  // Fibre Prep
  { id: 'rec_prep_cotton',   name: 'Prep Cotton',  icon: '🧵', buildingTypeId: 'bld_fibre_prep', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'cotton', quantity: 2 }], outputItemId: 'cleaned_cotton', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.5 },
  { id: 'rec_prep_wool',     name: 'Prep Wool',    icon: '🧶', buildingTypeId: 'bld_fibre_prep', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'wool', quantity: 2 }], outputItemId: 'scoured_wool', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.5 },

  // ═══ Stage 2 ═══
  // Stone Flour Mill
  { id: 'rec_flour_wheat',   name: 'Wheat Flour',   icon: '🌾', buildingTypeId: 'bld_flour_mill', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_wheat', quantity: 2 }], outputItemId: 'stoneground_flour', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.0 },
  { id: 'rec_flour_barley',  name: 'Barley Flour',  icon: '🌾', buildingTypeId: 'bld_flour_mill', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_barley', quantity: 2 }], outputItemId: 'stoneground_flour', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.0 },
  { id: 'rec_flour_oats',    name: 'Oat Flour',     icon: '🥣', buildingTypeId: 'bld_flour_mill', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_oats', quantity: 2 }], outputItemId: 'stoneground_flour', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.0 },
  // Olive Press
  { id: 'rec_olive_oil',     name: 'Olive Oil',     icon: '🫒', buildingTypeId: 'bld_olive_press', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'olives', quantity: 4 }], outputItemId: 'extra_virgin_olive_oil', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.8 },
  // Nut Roaster
  { id: 'rec_roast_almonds', name: 'Roast Almonds', icon: '🥜', buildingTypeId: 'bld_nut_roaster', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'almonds', quantity: 1 }], outputItemId: 'roasted_almonds', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.8 },
  { id: 'rec_almond_flour',  name: 'Almond Flour',  icon: '🥜', buildingTypeId: 'bld_nut_roaster', minBuildingTier: 2, inputs: [{ source: 'crop', itemId: 'almonds', quantity: 2 }], outputItemId: 'almond_flour', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.8 },
  { id: 'rec_almond_butter', name: 'Almond Butter', icon: '🥜', buildingTypeId: 'bld_nut_roaster', minBuildingTier: 2, inputs: [{ source: 'crop', itemId: 'almonds', quantity: 2 }], outputItemId: 'almond_butter', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.8 },
  // Dairy Room
  { id: 'rec_butter',        name: 'Butter',        icon: '🧈', buildingTypeId: 'bld_dairy_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'pasteurised_milk', quantity: 5 }], outputItemId: 'butter', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.0 },
  { id: 'rec_cream',         name: 'Cream',         icon: '🥛', buildingTypeId: 'bld_dairy_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'pasteurised_milk', quantity: 4 }], outputItemId: 'cream_product', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.0 },
  { id: 'rec_yoghurt',       name: 'Yoghurt',       icon: '🍶', buildingTypeId: 'bld_dairy_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'pasteurised_milk', quantity: 3 }], outputItemId: 'yoghurt', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.0 },
  // Cheese Room
  { id: 'rec_soft_cheese',   name: 'Fresh Soft Cheese', icon: '🧀', buildingTypeId: 'bld_cheese_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'pasteurised_milk', quantity: 4 }], outputItemId: 'fresh_soft_cheese', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.8 },
  { id: 'rec_cheese_curds',  name: 'Cheese Curds',      icon: '🧀', buildingTypeId: 'bld_cheese_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'pasteurised_milk', quantity: 5 }], outputItemId: 'cheese_curds', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.8 },
  // Farm Butchery
  { id: 'rec_retail_cuts',   name: 'Retail Cuts',   icon: '🥩', buildingTypeId: 'bld_farm_butchery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'carcass', quantity: 1 }], outputItemId: 'retail_cuts', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.5 },
  { id: 'rec_mince',         name: 'Mince',         icon: '🥩', buildingTypeId: 'bld_farm_butchery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'carcass', quantity: 1 }], outputItemId: 'mince', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.5 },
  { id: 'rec_sausages',      name: 'Sausages',      icon: '🌭', buildingTypeId: 'bld_farm_butchery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'carcass', quantity: 1 }, { source: 'processed', itemId: 'animal_fat', quantity: 1 }], outputItemId: 'sausages_fresh', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 0.5 },
  // Lard & Bone Meal
  { id: 'rec_lard',          name: 'Cooking Lard',  icon: '🟨', buildingTypeId: 'bld_lard_bone_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'animal_fat', quantity: 2 }], outputItemId: 'cooking_lard', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.5 },
  { id: 'rec_bone_meal',     name: 'Bone Meal',     icon: '🦴', buildingTypeId: 'bld_lard_bone_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'bones', quantity: 3 }], outputItemId: 'bone_meal_fertiliser', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.5 },
  // Fruit Press
  { id: 'rec_grape_juice',   name: 'Grape Juice',   icon: '🍇', buildingTypeId: 'bld_fruit_press', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'grapes', quantity: 3 }], outputItemId: 'fresh_juice', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 0.6 },
  { id: 'rec_grape_must',    name: 'Grape Must',    icon: '🍇', buildingTypeId: 'bld_fruit_press', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'grapes', quantity: 4 }], outputItemId: 'grape_must', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 0.6 },
  { id: 'rec_strawberry_juice', name: 'Strawberry Juice', icon: '🍓', buildingTypeId: 'bld_fruit_press', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'strawberries', quantity: 3 }], outputItemId: 'fresh_juice', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 0.6 },
  // Tomato Kitchen
  { id: 'rec_tomato_paste',  name: 'Tomato Paste',  icon: '🍅', buildingTypeId: 'bld_tomato_kitchen', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'tomatoes', quantity: 4 }], outputItemId: 'tomato_paste', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.6 },
  { id: 'rec_passata',       name: 'Passata',       icon: '🍅', buildingTypeId: 'bld_tomato_kitchen', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'tomatoes', quantity: 3 }], outputItemId: 'passata', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.6 },
  // Preserving Kitchen
  { id: 'rec_strawberry_jam', name: 'Strawberry Jam', icon: '🍓', buildingTypeId: 'bld_preserving_kitchen', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'strawberries', quantity: 2 }], outputItemId: 'strawberry_jam', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.5 },
  { id: 'rec_grape_chutney',  name: 'Grape Chutney',  icon: '🍇', buildingTypeId: 'bld_preserving_kitchen', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'grapes', quantity: 2 }], outputItemId: 'grape_chutney', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.5 },
  { id: 'rec_tomato_pickles', name: 'Tomato Pickles', icon: '🍅', buildingTypeId: 'bld_preserving_kitchen', minBuildingTier: 1, inputs: [{ source: 'crop', itemId: 'tomatoes', quantity: 2 }], outputItemId: 'tomato_pickles', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.5 },
  // Tinning Room
  { id: 'rec_tin_saffron',   name: 'Tin Saffron',   icon: '🌺', buildingTypeId: 'bld_tinning_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_saffron', quantity: 1 }], outputItemId: 'saffron_tin', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.4 },
  { id: 'rec_tin_herbs',     name: 'Tin Herbs',     icon: '🌿', buildingTypeId: 'bld_tinning_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_lavender', quantity: 1 }], outputItemId: 'herb_tin', baseOutputQuantity: 80, processingDays: 1, electricityKwhPerDay: 0.4 },
  { id: 'rec_gift_vanilla',  name: 'Gift Vanilla',  icon: '🎁', buildingTypeId: 'bld_tinning_room', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'cured_vanilla', quantity: 1 }], outputItemId: 'vanilla_gift_box', baseOutputQuantity: 10, processingDays: 1, electricityKwhPerDay: 0.4 },
  { id: 'rec_spice_set',     name: 'Spice Set',     icon: '🎁', buildingTypeId: 'bld_tinning_room', minBuildingTier: 3, inputs: [{ source: 'processed', itemId: 'dried_saffron', quantity: 1 }, { source: 'processed', itemId: 'dried_lavender', quantity: 1 }, { source: 'processed', itemId: 'dried_ginseng', quantity: 1 }], outputItemId: 'spice_set', baseOutputQuantity: 20, processingDays: 1, electricityKwhPerDay: 0.4 },
  // Small Still
  { id: 'rec_lavender_oil',  name: 'Lavender Oil',  icon: '🧴', buildingTypeId: 'bld_small_still', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_lavender', quantity: 2 }], outputItemId: 'lavender_oil', baseOutputQuantity: 15, processingDays: 2, electricityKwhPerDay: 0.8 },
  { id: 'rec_herbal_water',  name: 'Herbal Water',  icon: '💧', buildingTypeId: 'bld_small_still', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_ginseng', quantity: 1 }], outputItemId: 'herbal_water', baseOutputQuantity: 50, processingDays: 2, electricityKwhPerDay: 0.8 },
  // Honey Room
  { id: 'rec_filter_honey',  name: 'Filter Honey',  icon: '🍯', buildingTypeId: 'bld_honey_room', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'honey', quantity: 1 }], outputItemId: 'filtered_honey', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.3 },
  { id: 'rec_cream_honey',   name: 'Cream Honey',   icon: '🍯', buildingTypeId: 'bld_honey_room', minBuildingTier: 2, inputs: [{ source: 'animal', itemId: 'honey', quantity: 1 }], outputItemId: 'creamed_honey', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.3 },
  // Wax Workshop
  { id: 'rec_beeswax_candle', name: 'Beeswax Candle', icon: '🕯️', buildingTypeId: 'bld_wax_workshop', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'honey', quantity: 2 }], outputItemId: 'beeswax_candle', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 0.3 },
  { id: 'rec_beeswax_wrap',   name: 'Beeswax Wrap',   icon: '🐝', buildingTypeId: 'bld_wax_workshop', minBuildingTier: 1, inputs: [{ source: 'animal', itemId: 'honey', quantity: 1 }], outputItemId: 'beeswax_wrap', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 0.3 },
  // Wool Workshop
  { id: 'rec_wool_yarn',     name: 'Wool Yarn',     icon: '🧶', buildingTypeId: 'bld_wool_workshop', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'scoured_wool', quantity: 2 }], outputItemId: 'yarn_wool', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.5 },
  { id: 'rec_cotton_yarn',   name: 'Cotton Yarn',   icon: '🧵', buildingTypeId: 'bld_wool_workshop', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'cleaned_cotton', quantity: 2 }], outputItemId: 'yarn_cotton', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.5 },
  // Leather Workshop
  { id: 'rec_tan_hide',      name: 'Tan Hide',      icon: '🟫', buildingTypeId: 'bld_leather_workshop', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'hide', quantity: 1 }], outputItemId: 'tanned_leather', baseOutputQuantity: 1, processingDays: 3, electricityKwhPerDay: 0.4 },
  { id: 'rec_leather_goods', name: 'Leather Goods', icon: '👜', buildingTypeId: 'bld_leather_workshop', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'tanned_leather', quantity: 1 }], outputItemId: 'leather_goods', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.4 },

  // ═══ Stage 3 ═══
  // Farm Bakery
  { id: 'rec_farm_bread',    name: 'Farm Bread',    icon: '🍞', buildingTypeId: 'bld_farm_bakery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'stoneground_flour', quantity: 2 }, { source: 'animal', itemId: 'eggs', quantity: 2 }, { source: 'processed', itemId: 'butter', quantity: 1 }], outputItemId: 'farm_bread', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 1.5 },
  { id: 'rec_scones',        name: 'Scones',        icon: '🥐', buildingTypeId: 'bld_farm_bakery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'stoneground_flour', quantity: 1 }, { source: 'animal', itemId: 'eggs', quantity: 2 }, { source: 'processed', itemId: 'butter', quantity: 1 }], outputItemId: 'scones', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.5 },
  { id: 'rec_pastries',      name: 'Pastries',      icon: '🥮', buildingTypeId: 'bld_farm_bakery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'stoneground_flour', quantity: 1 }, { source: 'animal', itemId: 'eggs', quantity: 3 }, { source: 'processed', itemId: 'butter', quantity: 1 }], outputItemId: 'pastries', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.5 },
  { id: 'rec_shortbread',    name: 'Shortbread',    icon: '🍪', buildingTypeId: 'bld_farm_bakery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'stoneground_flour', quantity: 1 }, { source: 'processed', itemId: 'butter', quantity: 1 }], outputItemId: 'shortbread', baseOutputQuantity: 1, processingDays: 1, electricityKwhPerDay: 1.5 },
  // Pasta Workshop
  { id: 'rec_fresh_pasta',   name: 'Fresh Pasta',   icon: '🍝', buildingTypeId: 'bld_pasta_workshop', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'stoneground_flour', quantity: 2 }, { source: 'animal', itemId: 'eggs', quantity: 2 }], outputItemId: 'fresh_pasta', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 1.0 },
  { id: 'rec_dried_pasta',   name: 'Dried Pasta',   icon: '🍝', buildingTypeId: 'bld_pasta_workshop', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'stoneground_flour', quantity: 2 }, { source: 'animal', itemId: 'eggs', quantity: 2 }], outputItemId: 'dried_pasta', baseOutputQuantity: 2, processingDays: 2, electricityKwhPerDay: 1.0 },
  // Ice Cream Churner
  { id: 'rec_ice_cream',     name: 'Ice Cream',     icon: '🍨', buildingTypeId: 'bld_ice_cream_churner', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'cream_product', quantity: 2 }, { source: 'processed', itemId: 'pasteurised_milk', quantity: 1 }, { source: 'animal', itemId: 'eggs', quantity: 1 }], outputItemId: 'ice_cream', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 2.0 },
  { id: 'rec_gelato',        name: 'Gelato',        icon: '🍧', buildingTypeId: 'bld_ice_cream_churner', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'cream_product', quantity: 2 }, { source: 'processed', itemId: 'pasteurised_milk', quantity: 1 }, { source: 'animal', itemId: 'eggs', quantity: 1 }], outputItemId: 'gelato', baseOutputQuantity: 2, processingDays: 1, electricityKwhPerDay: 2.0 },
  // Cheese Ageing
  { id: 'rec_age_hard_cheese', name: 'Age Hard Cheese', icon: '🧀', buildingTypeId: 'bld_cheese_ageing', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'cheese_curds', quantity: 2 }], outputItemId: 'hard_cheese', baseOutputQuantity: 1, processingDays: 14, electricityKwhPerDay: 0.8 },
  { id: 'rec_age_aged_cheese', name: 'Age Mature Cheese', icon: '🧀', buildingTypeId: 'bld_cheese_ageing', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'cheese_curds', quantity: 2 }], outputItemId: 'aged_cheese', baseOutputQuantity: 1, processingDays: 30, electricityKwhPerDay: 0.8 },
  // Curing & Smoking
  { id: 'rec_smoke_bacon',   name: 'Smoke Bacon',   icon: '🥓', buildingTypeId: 'bld_curing_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'retail_cuts', quantity: 2 }], outputItemId: 'smoked_bacon', baseOutputQuantity: 1, processingDays: 5, electricityKwhPerDay: 0.6 },
  { id: 'rec_smoke_ham',     name: 'Smoke Ham',     icon: '🍖', buildingTypeId: 'bld_curing_room', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'retail_cuts', quantity: 2 }], outputItemId: 'smoked_ham', baseOutputQuantity: 1, processingDays: 7, electricityKwhPerDay: 0.6 },
  { id: 'rec_salami',        name: 'Make Salami',   icon: '🌭', buildingTypeId: 'bld_curing_room', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'mince', quantity: 2 }, { source: 'processed', itemId: 'animal_fat', quantity: 1 }], outputItemId: 'salami', baseOutputQuantity: 1, processingDays: 10, electricityKwhPerDay: 0.6 },
  // Farm Winery
  { id: 'rec_table_wine',    name: 'Table Wine',    icon: '🍷', buildingTypeId: 'bld_farm_winery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'grape_must', quantity: 3 }], outputItemId: 'table_wine', baseOutputQuantity: 2, processingDays: 7, electricityKwhPerDay: 0.5 },
  { id: 'rec_rose_wine',     name: 'Rosé Wine',     icon: '🍷', buildingTypeId: 'bld_farm_winery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'grape_must', quantity: 3 }], outputItemId: 'rose_wine', baseOutputQuantity: 2, processingDays: 7, electricityKwhPerDay: 0.5 },
  { id: 'rec_sparkling_wine', name: 'Sparkling Wine', icon: '🥂', buildingTypeId: 'bld_farm_winery', minBuildingTier: 3, inputs: [{ source: 'processed', itemId: 'grape_must', quantity: 4 }], outputItemId: 'sparkling_wine', baseOutputQuantity: 2, processingDays: 14, electricityKwhPerDay: 0.8 },
  // Micro-Brewery
  { id: 'rec_craft_ale',     name: 'Craft Ale',     icon: '🍺', buildingTypeId: 'bld_micro_brewery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'malted_barley', quantity: 2 }], outputItemId: 'craft_ale', baseOutputQuantity: 2, processingDays: 5, electricityKwhPerDay: 0.8 },
  { id: 'rec_stout',         name: 'Stout',         icon: '🍺', buildingTypeId: 'bld_micro_brewery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'malted_barley', quantity: 3 }], outputItemId: 'stout', baseOutputQuantity: 2, processingDays: 7, electricityKwhPerDay: 0.8 },
  { id: 'rec_lager',         name: 'Lager',         icon: '🍺', buildingTypeId: 'bld_micro_brewery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'malted_barley', quantity: 2 }, { source: 'processed', itemId: 'malted_wheat', quantity: 1 }], outputItemId: 'lager', baseOutputQuantity: 2, processingDays: 7, electricityKwhPerDay: 0.8 },
  // Cider House
  { id: 'rec_still_cider',   name: 'Still Cider',   icon: '🍎', buildingTypeId: 'bld_cider_house', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'fresh_juice', quantity: 3 }], outputItemId: 'still_cider', baseOutputQuantity: 2, processingDays: 5, electricityKwhPerDay: 0.5 },
  { id: 'rec_sparkling_cider', name: 'Sparkling Cider', icon: '🍾', buildingTypeId: 'bld_cider_house', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'fresh_juice', quantity: 3 }], outputItemId: 'sparkling_cider', baseOutputQuantity: 2, processingDays: 7, electricityKwhPerDay: 0.7 },
  // Small Distillery
  { id: 'rec_gin',           name: 'Gin',           icon: '🍸', buildingTypeId: 'bld_small_distillery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'malted_barley', quantity: 3 }], outputItemId: 'gin', baseOutputQuantity: 1, processingDays: 7, electricityKwhPerDay: 1.0 },
  { id: 'rec_vodka',         name: 'Vodka',         icon: '🍸', buildingTypeId: 'bld_small_distillery', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'malted_wheat', quantity: 3 }], outputItemId: 'vodka', baseOutputQuantity: 1, processingDays: 7, electricityKwhPerDay: 1.0 },
  { id: 'rec_new_make_spirit', name: 'New-Make Spirit', icon: '🥃', buildingTypeId: 'bld_small_distillery', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'malted_barley', quantity: 4 }], outputItemId: 'new_make_spirit', baseOutputQuantity: 1, processingDays: 10, electricityKwhPerDay: 1.2 },
  // Infused Oil Kitchen
  { id: 'rec_infused_oil',   name: 'Infused Olive Oil', icon: '🫒', buildingTypeId: 'bld_infused_oil_kitchen', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'extra_virgin_olive_oil', quantity: 2 }, { source: 'processed', itemId: 'dried_tomatoes', quantity: 1 }], outputItemId: 'infused_olive_oil', baseOutputQuantity: 2, processingDays: 2, electricityKwhPerDay: 0.4 },
  // Vinegar Barrel
  { id: 'rec_wine_vinegar',  name: 'Wine Vinegar',  icon: '🍶', buildingTypeId: 'bld_vinegar_barrel', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'table_wine', quantity: 2 }], outputItemId: 'wine_vinegar', baseOutputQuantity: 1, processingDays: 14, electricityKwhPerDay: 0.2 },
  { id: 'rec_cider_vinegar', name: 'Cider Vinegar', icon: '🍶', buildingTypeId: 'bld_vinegar_barrel', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'still_cider', quantity: 2 }], outputItemId: 'cider_vinegar', baseOutputQuantity: 1, processingDays: 14, electricityKwhPerDay: 0.2 },
  // Extract Kitchen
  { id: 'rec_vanilla_extract', name: 'Vanilla Extract', icon: '🧴', buildingTypeId: 'bld_extract_kitchen', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'cured_vanilla', quantity: 1 }], outputItemId: 'vanilla_extract', baseOutputQuantity: 25, processingDays: 3, electricityKwhPerDay: 0.4 },
  { id: 'rec_saffron_water',   name: 'Saffron Water',   icon: '💧', buildingTypeId: 'bld_extract_kitchen', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'dried_saffron', quantity: 1 }], outputItemId: 'saffron_water', baseOutputQuantity: 1, processingDays: 2, electricityKwhPerDay: 0.4 },
  { id: 'rec_ginseng_tincture', name: 'Ginseng Tincture', icon: '🧪', buildingTypeId: 'bld_extract_kitchen', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'dried_ginseng', quantity: 1 }], outputItemId: 'ginseng_tincture', baseOutputQuantity: 40, processingDays: 3, electricityKwhPerDay: 0.4 },

  // ═══ Stage 4 ═══
  // Cave-Aged Cheese
  { id: 'rec_cave_cheese',   name: 'Cave-Age Cheese', icon: '🧀', buildingTypeId: 'bld_cave_cheese', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'hard_cheese', quantity: 2 }], outputItemId: 'cave_aged_cheese', baseOutputQuantity: 1, processingDays: 90, electricityKwhPerDay: 0.3 },
  // Wine Cellar
  { id: 'rec_barrel_wine',   name: 'Barrel-Age Wine', icon: '🍷', buildingTypeId: 'bld_wine_cellar', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'table_wine', quantity: 3 }], outputItemId: 'barrel_aged_wine', baseOutputQuantity: 2, processingDays: 60, electricityKwhPerDay: 0.2 },
  { id: 'rec_reserve_wine',  name: 'Reserve Wine',    icon: '🍾', buildingTypeId: 'bld_wine_cellar', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'rose_wine', quantity: 3 }], outputItemId: 'reserve_wine', baseOutputQuantity: 2, processingDays: 180, electricityKwhPerDay: 0.2 },
  // Spirit Casks
  { id: 'rec_aged_whisky',   name: 'Age Whisky',      icon: '🥃', buildingTypeId: 'bld_spirit_casks', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'new_make_spirit', quantity: 2 }], outputItemId: 'aged_whisky', baseOutputQuantity: 1, processingDays: 365, electricityKwhPerDay: 0.2 },
  { id: 'rec_brandy',        name: 'Age Brandy',      icon: '🥃', buildingTypeId: 'bld_spirit_casks', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'new_make_spirit', quantity: 2 }], outputItemId: 'brandy', baseOutputQuantity: 1, processingDays: 180, electricityKwhPerDay: 0.2 },
  { id: 'rec_rum',           name: 'Age Rum',         icon: '🥃', buildingTypeId: 'bld_spirit_casks', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'new_make_spirit', quantity: 2 }], outputItemId: 'rum', baseOutputQuantity: 1, processingDays: 240, electricityKwhPerDay: 0.2 },
  // Bottle-Conditioned Ales
  { id: 'rec_bottle_ale',    name: 'Bottle-Condition Ale', icon: '🍺', buildingTypeId: 'bld_bottle_ales', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'craft_ale', quantity: 3 }], outputItemId: 'bottle_conditioned_ale', baseOutputQuantity: 2, processingDays: 14, electricityKwhPerDay: 0.2 },
  // Long-Cured Meats
  { id: 'rec_prosciutto',    name: 'Age Prosciutto',  icon: '🍖', buildingTypeId: 'bld_long_cured_meats', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'smoked_ham', quantity: 2 }], outputItemId: 'prosciutto', baseOutputQuantity: 1, processingDays: 180, electricityKwhPerDay: 0.2 },
  { id: 'rec_dry_cured_ham', name: 'Dry-Cure Ham',    icon: '🍖', buildingTypeId: 'bld_long_cured_meats', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'smoked_ham', quantity: 2 }], outputItemId: 'dry_cured_ham', baseOutputQuantity: 1, processingDays: 120, electricityKwhPerDay: 0.2 },
  // Aged Balsamic
  { id: 'rec_balsamic_5yr',  name: '5-Year Balsamic', icon: '🍶', buildingTypeId: 'bld_aged_balsamic', minBuildingTier: 1, inputs: [{ source: 'processed', itemId: 'wine_vinegar', quantity: 3 }], outputItemId: 'aged_balsamic_5yr', baseOutputQuantity: 100, processingDays: 180, electricityKwhPerDay: 0.1 },
  { id: 'rec_balsamic_10yr', name: '10-Year Balsamic', icon: '🍶', buildingTypeId: 'bld_aged_balsamic', minBuildingTier: 2, inputs: [{ source: 'processed', itemId: 'wine_vinegar', quantity: 3 }], outputItemId: 'aged_balsamic_10yr', baseOutputQuantity: 100, processingDays: 365, electricityKwhPerDay: 0.1 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VALUE DECAY & AGING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns multiplier from 1.0 → 0.4 in the final 25% of shelf life */
export function getValueDecayMultiplier(item: ProcessedItem, currentDay: number): number {
  const shelfLife = item.expiryDay - item.producedDay;
  const daysElapsed = currentDay - item.producedDay;
  const pctRemaining = (item.expiryDay - currentDay) / shelfLife;
  if (pctRemaining > 0.25) return 1.0;
  if (pctRemaining <= 0) return 0;
  return 0.4 + (pctRemaining / 0.25) * 0.6; // linear from 1.0 at 25% to 0.4 at 0%
}

/** Returns aging quality bonus for items where agingImproves === true */
export function getAgingQualityBonus(item: ProcessedItem, def: ProcessedItemDef, currentDay: number): number {
  if (!def.agingImproves || !def.optimalAgeDays) return 0;
  const age = currentDay - item.producedDay;
  if (age <= 0) return 0;
  // Quality improves on a sigmoid curve toward peak at optimalAgeDays
  // Max bonus: +25 quality points at optimal age
  const progress = Math.min(age / def.optimalAgeDays, 1.5);
  const sigmoid = 1 / (1 + Math.exp(-6 * (progress - 0.5))); // 0→1 sigmoid
  return Math.round(sigmoid * 25);
}

/** Checks if item is within warning zone (≤25% shelf life remaining) */
export function isExpiryWarning(item: ProcessedItem, currentDay: number): boolean {
  const shelfLife = item.expiryDay - item.producedDay;
  const daysRemaining = item.expiryDay - currentDay;
  return daysRemaining > 0 && daysRemaining <= shelfLife * 0.25;
}
