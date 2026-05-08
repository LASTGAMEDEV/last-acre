// ── Types ─────────────────────────────────────────────────────────────────────
export type ProcessingInputSource = 'crop' | 'animal';

export interface ProcessingInput {
  source: ProcessingInputSource;
  itemId: string;
  amount: number;
}

export interface ProcessingBatch {
  id: string;
  recipeId: string;
  startDay: number;
  completionDay: number;
  outputItemId: string;
  outputQuantity: number;
  quality: number; // 0–100
}

export interface ProcessedItem {
  itemId: string;
  quantity: number;
  quality: number; // 0–100
  producedDay: number;
  expiryDay: number;
}

export interface ProcessedItemDef {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  shelfLifeDays: number;
  coldStorageMultiplier: number;
  agingImproves?: boolean;
  optimalAgeDays?: number;
}

export interface ProcessingRecipe {
  id: string;
  name: string;
  icon: string;
  requiredBuilding: string;
  input: ProcessingInput;       // primary input
  outputProductId: string;      // alias for outputItemId (backward compat)
  outputItemId: string;
  outputAmount: number;         // alias for baseOutputQuantity (backward compat)
  baseOutputQuantity: number;
  processingDays: number;
  electricityKwhPerDay?: number;
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

// ── Processed item definitions (with shelf life) ──────────────────────────────
export const PROCESSED_ITEM_DEFS: ProcessedItemDef[] = [
  // Stage 1 — Flour mill
  { id: 'harina_trigo',       name: 'Wheat Flour',       unit: 'kg',  basePrice: 0.55,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'polenta',            name: 'Polenta',            unit: 'kg',  basePrice: 0.60,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'malta',              name: 'Barley Malt',        unit: 'kg',  basePrice: 0.65,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'copos_avena',        name: 'Oat Flakes',         unit: 'kg',  basePrice: 0.70,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'harina_arroz',       name: 'Rice Flour',         unit: 'kg',  basePrice: 1.05,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  // Stage 1 — Oil press
  { id: 'aceite_girasol',     name: 'Sunflower Oil',      unit: 'L',   basePrice: 1.80,  shelfLifeDays: 540,  coldStorageMultiplier: 1 },
  { id: 'aceite_colza',       name: 'Rapeseed Oil',       unit: 'L',   basePrice: 1.90,  shelfLifeDays: 540,  coldStorageMultiplier: 1 },
  { id: 'aceite_canola',      name: 'Canola Oil',         unit: 'L',   basePrice: 1.95,  shelfLifeDays: 540,  coldStorageMultiplier: 1 },
  { id: 'aceite_soja',        name: 'Soy Oil',            unit: 'L',   basePrice: 2.50,  shelfLifeDays: 540,  coldStorageMultiplier: 1 },
  { id: 'aceite_oliva',       name: 'Olive Oil',          unit: 'L',   basePrice: 7.50,  shelfLifeDays: 540,  coldStorageMultiplier: 1 },
  // Stage 2 — Dairy plant
  { id: 'queso',              name: 'Cheese',             unit: 'kg',  basePrice: 12.00, shelfLifeDays: 60,   coldStorageMultiplier: 2, agingImproves: true, optimalAgeDays: 120 },
  { id: 'mantequilla',        name: 'Butter',             unit: 'kg',  basePrice: 8.50,  shelfLifeDays: 30,   coldStorageMultiplier: 3 },
  { id: 'yogur',              name: 'Yoghurt',            unit: 'kg',  basePrice: 2.80,  shelfLifeDays: 14,   coldStorageMultiplier: 3 },
  { id: 'pasta_huevo',        name: 'Egg Pasta',          unit: 'kg',  basePrice: 3.50,  shelfLifeDays: 4,    coldStorageMultiplier: 3 },
  // Stage 2 — Agricultural processor
  { id: 'azucar',             name: 'Sugar',              unit: 'kg',  basePrice: 0.55,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'etanol',             name: 'Ethanol',            unit: 'L',   basePrice: 0.65,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'fibra_algodon',      name: 'Cotton Fiber',       unit: 'kg',  basePrice: 4.80,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'tejido_lana',        name: 'Wool Fabric',        unit: 'kg',  basePrice: 8.00,  shelfLifeDays: 730,  coldStorageMultiplier: 1 },
  { id: 'embutidos',          name: 'Cold Cuts',          unit: 'kg',  basePrice: 9.50,  shelfLifeDays: 90,   coldStorageMultiplier: 2 },
  { id: 'mermelada',          name: 'Strawberry Jam',     unit: 'kg',  basePrice: 4.50,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'almendras_tostadas', name: 'Roasted Almonds',    unit: 'kg',  basePrice: 9.00,  shelfLifeDays: 180,  coldStorageMultiplier: 1 },
  { id: 'tomate_triturado',   name: 'Tomato Paste',       unit: 'kg',  basePrice: 1.20,  shelfLifeDays: 365,  coldStorageMultiplier: 1 },
  { id: 'miel',               name: 'Honey',              unit: 'kg',  basePrice: 9.00,  shelfLifeDays: 1825, coldStorageMultiplier: 1 },
  // Stage 3 — Winery
  { id: 'vino',               name: 'Wine',               unit: 'L',   basePrice: 5.00,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5, agingImproves: true, optimalAgeDays: 365 },
  // Stage 3 — Craft drinks
  { id: 'cerveza',            name: 'Craft Beer',         unit: 'L',   basePrice: 4.50,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
  { id: 'sidra',              name: 'Cider',              unit: 'L',   basePrice: 3.80,  shelfLifeDays: 180,  coldStorageMultiplier: 1.5 },
];

// Backward compat: PROCESSED_PRODUCTS shape used by generateInitialPrices and the market
export const PROCESSED_PRODUCTS = PROCESSED_ITEM_DEFS.map(d => ({
  id: d.id,
  name: d.name,
  unit: d.unit,
  basePrice: d.basePrice,
}));

// ── Recipes ───────────────────────────────────────────────────────────────────
export const PROCESSING_RECIPES: ProcessingRecipe[] = [
  // Flour Mill
  { id: 'rec_harina_trigo',     name: 'Wheat Flour',    icon: '🌾', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'wheat',        amount: 2  }, outputProductId: 'harina_trigo',      outputItemId: 'harina_trigo',      outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  { id: 'rec_polenta',          name: 'Polenta',         icon: '🌽', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'corn',         amount: 2  }, outputProductId: 'polenta',            outputItemId: 'polenta',            outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  { id: 'rec_malta',            name: 'Barley Malt',     icon: '🍺', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'barley',       amount: 3  }, outputProductId: 'malta',              outputItemId: 'malta',              outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_copos_avena',      name: 'Oat Flakes',      icon: '🥣', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'oats',         amount: 2  }, outputProductId: 'copos_avena',        outputItemId: 'copos_avena',        outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  { id: 'rec_harina_arroz',     name: 'Rice Flour',      icon: '🍚', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'rice',         amount: 2  }, outputProductId: 'harina_arroz',       outputItemId: 'harina_arroz',       outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  // Oil Press
  { id: 'rec_aceite_girasol',   name: 'Sunflower Oil',   icon: '🌻', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'sunflower',    amount: 3  }, outputProductId: 'aceite_girasol',     outputItemId: 'aceite_girasol',     outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_aceite_colza',     name: 'Rapeseed Oil',    icon: '🌼', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'rapeseed',     amount: 3  }, outputProductId: 'aceite_colza',       outputItemId: 'aceite_colza',       outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_aceite_canola',    name: 'Canola Oil',      icon: '🌼', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'canola',       amount: 3  }, outputProductId: 'aceite_canola',      outputItemId: 'aceite_canola',      outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_aceite_soja',      name: 'Soy Oil',         icon: '🫘', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'soy',          amount: 4  }, outputProductId: 'aceite_soja',        outputItemId: 'aceite_soja',        outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_aceite_oliva',     name: 'Olive Oil',       icon: '🫒', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'olives',       amount: 4  }, outputProductId: 'aceite_oliva',       outputItemId: 'aceite_oliva',       outputAmount: 1, baseOutputQuantity: 1, processingDays: 3 },
  // Dairy Plant
  { id: 'rec_queso',            name: 'Cheese',          icon: '🧀', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'milk',         amount: 5  }, outputProductId: 'queso',              outputItemId: 'queso',              outputAmount: 1, baseOutputQuantity: 1, processingDays: 5 },
  { id: 'rec_mantequilla',      name: 'Butter',          icon: '🧈', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'milk',         amount: 8  }, outputProductId: 'mantequilla',        outputItemId: 'mantequilla',        outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_yogur',            name: 'Yoghurt',         icon: '🍶', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'milk',         amount: 3  }, outputProductId: 'yogur',              outputItemId: 'yogur',              outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  { id: 'rec_pasta_huevo',      name: 'Egg Pasta',       icon: '🍝', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'eggs',         amount: 12 }, outputProductId: 'pasta_huevo',        outputItemId: 'pasta_huevo',        outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  // Agricultural Processor
  { id: 'rec_azucar',           name: 'Sugar',           icon: '🍬', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'sugarbeet',    amount: 3  }, outputProductId: 'azucar',             outputItemId: 'azucar',             outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_etanol',           name: 'Ethanol',         icon: '⛽', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'sugarcane',    amount: 2  }, outputProductId: 'etanol',             outputItemId: 'etanol',             outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_fibra_algodon',    name: 'Cotton Fiber',    icon: '🩷', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'cotton',       amount: 2  }, outputProductId: 'fibra_algodon',      outputItemId: 'fibra_algodon',      outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_tejido_lana',      name: 'Wool Fabric',     icon: '🧶', requiredBuilding: 'bld_procesadora', input: { source: 'animal', itemId: 'wool',         amount: 2  }, outputProductId: 'tejido_lana',        outputItemId: 'tejido_lana',        outputAmount: 1, baseOutputQuantity: 1, processingDays: 3 },
  { id: 'rec_embutidos',        name: 'Cold Cuts',       icon: '🥩', requiredBuilding: 'bld_procesadora', input: { source: 'animal', itemId: 'meat',         amount: 4  }, outputProductId: 'embutidos',          outputItemId: 'embutidos',          outputAmount: 3, baseOutputQuantity: 3, processingDays: 7 },
  { id: 'rec_mermelada',        name: 'Strawberry Jam',  icon: '🍓', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'strawberries', amount: 2  }, outputProductId: 'mermelada',          outputItemId: 'mermelada',          outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_almendras',        name: 'Roasted Almonds', icon: '🥜', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'almonds',      amount: 1  }, outputProductId: 'almendras_tostadas', outputItemId: 'almendras_tostadas', outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  { id: 'rec_tomate_triturado', name: 'Tomato Paste',    icon: '🍅', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'tomatoes',     amount: 3  }, outputProductId: 'tomate_triturado',   outputItemId: 'tomate_triturado',   outputAmount: 1, baseOutputQuantity: 1, processingDays: 2 },
  { id: 'rec_miel',             name: 'Honey',           icon: '🍯', requiredBuilding: 'bld_procesadora', input: { source: 'animal', itemId: 'honey',        amount: 1  }, outputProductId: 'miel',               outputItemId: 'miel',               outputAmount: 1, baseOutputQuantity: 1, processingDays: 1 },
  // Winery
  { id: 'rec_vino',             name: 'Wine',            icon: '🍷', requiredBuilding: 'bld_bodega',      input: { source: 'crop',   itemId: 'grapes',       amount: 3  }, outputProductId: 'vino',               outputItemId: 'vino',               outputAmount: 1, baseOutputQuantity: 1, processingDays: 14, electricityKwhPerDay: 1.5 },
];
