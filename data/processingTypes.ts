export type ProcessingInputSource = 'crop' | 'animal';

export interface ProcessingInput {
  source: ProcessingInputSource;
  itemId: string;   // cropId or animal productType ('milk','eggs','wool','meat')
  amount: number;   // units required per batch
}

export interface ProcessedProduct {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
}

export interface ProcessingRecipe {
  id: string;
  name: string;
  icon: string;
  requiredBuilding: string;
  input: ProcessingInput;
  outputProductId: string;
  outputAmount: number;   // units produced per batch
}

// ── Processed products ────────────────────────────────────────────────────────
export const PROCESSED_PRODUCTS: ProcessedProduct[] = [
  // Flour Mill
  { id: 'harina_trigo',  name: 'Wheat Flour',     unit: 'kg', basePrice: 0.55 },
  { id: 'polenta',       name: 'Polenta',          unit: 'kg', basePrice: 0.60 },
  { id: 'malta',         name: 'Barley Malt',      unit: 'kg', basePrice: 0.65 },
  { id: 'copos_avena',   name: 'Oat Flakes',       unit: 'kg', basePrice: 0.70 },
  { id: 'harina_arroz',  name: 'Rice Flour',       unit: 'kg', basePrice: 1.05 },
  // Oil Press
  { id: 'aceite_girasol', name: 'Sunflower Oil',   unit: 'L', basePrice: 1.80 },
  { id: 'aceite_colza',   name: 'Rapeseed Oil',    unit: 'L', basePrice: 1.90 },
  { id: 'aceite_canola',  name: 'Canola Oil',      unit: 'L', basePrice: 1.95 },
  { id: 'aceite_soja',    name: 'Soy Oil',         unit: 'L', basePrice: 2.50 },
  // Dairy Plant
  { id: 'queso',          name: 'Cheese',          unit: 'kg', basePrice: 12.00 },
  { id: 'mantequilla',    name: 'Butter',          unit: 'kg', basePrice: 8.50 },
  { id: 'pasta_huevo',    name: 'Egg Pasta',       unit: 'kg', basePrice: 3.50 },
  // Agricultural Processor
  { id: 'azucar',         name: 'Sugar',           unit: 'kg', basePrice: 0.55 },
  { id: 'etanol',         name: 'Ethanol',         unit: 'L',  basePrice: 0.65 },
  { id: 'fibra_algodon',  name: 'Cotton Fiber',    unit: 'kg', basePrice: 4.80 },
  { id: 'tejido_lana',    name: 'Wool Fabric',     unit: 'kg', basePrice: 8.00 },
  { id: 'embutidos',      name: 'Cold Cuts',       unit: 'kg', basePrice: 9.50 },
  // Winery
  { id: 'vino',               name: 'Wine',            unit: 'L',  basePrice: 5.00 },
  // Oil Press (new)
  { id: 'aceite_oliva',       name: 'Olive Oil',       unit: 'L',  basePrice: 7.50 },
  // Agricultural Processor (new)
  { id: 'mermelada',          name: 'Strawberry Jam',  unit: 'kg', basePrice: 4.50 },
  { id: 'almendras_tostadas', name: 'Roasted Almonds', unit: 'kg', basePrice: 9.00 },
  { id: 'tomate_triturado',   name: 'Tomato Paste',    unit: 'kg', basePrice: 1.20  },
];

// ── Recipes ───────────────────────────────────────────────────────────────────
export const PROCESSING_RECIPES: ProcessingRecipe[] = [
  // Flour Mill
  { id: 'rec_harina_trigo', name: 'Wheat Flour',    icon: '🌾', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'wheat',     amount: 2  }, outputProductId: 'harina_trigo',  outputAmount: 1 },
  { id: 'rec_polenta',      name: 'Polenta',         icon: '🌽', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'corn',      amount: 2  }, outputProductId: 'polenta',        outputAmount: 1 },
  { id: 'rec_malta',        name: 'Barley Malt',     icon: '🍺', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'barley',    amount: 3  }, outputProductId: 'malta',          outputAmount: 1 },
  { id: 'rec_copos_avena',  name: 'Oat Flakes',      icon: '🥣', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'oats',      amount: 2  }, outputProductId: 'copos_avena',    outputAmount: 1 },
  { id: 'rec_harina_arroz', name: 'Rice Flour',      icon: '🍚', requiredBuilding: 'bld_molino',      input: { source: 'crop',   itemId: 'rice',      amount: 2  }, outputProductId: 'harina_arroz',   outputAmount: 1 },
  // Oil Press
  { id: 'rec_aceite_girasol', name: 'Sunflower Oil', icon: '🌻', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'sunflower', amount: 3  }, outputProductId: 'aceite_girasol', outputAmount: 1 },
  { id: 'rec_aceite_colza',   name: 'Rapeseed Oil',  icon: '🌼', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'rapeseed',  amount: 3  }, outputProductId: 'aceite_colza',   outputAmount: 1 },
  { id: 'rec_aceite_canola',  name: 'Canola Oil',    icon: '🌼', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'canola',    amount: 3  }, outputProductId: 'aceite_canola',  outputAmount: 1 },
  { id: 'rec_aceite_soja',    name: 'Soy Oil',       icon: '🫘', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'soy',       amount: 4  }, outputProductId: 'aceite_soja',    outputAmount: 1 },
  // Dairy Plant
  { id: 'rec_queso',         name: 'Cheese',          icon: '🧀', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'milk',      amount: 5  }, outputProductId: 'queso',          outputAmount: 1 },
  { id: 'rec_mantequilla',   name: 'Butter',          icon: '🧈', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'milk',      amount: 8  }, outputProductId: 'mantequilla',    outputAmount: 1 },
  { id: 'rec_pasta_huevo',   name: 'Egg Pasta',       icon: '🍝', requiredBuilding: 'bld_lacteo',      input: { source: 'animal', itemId: 'eggs',      amount: 12 }, outputProductId: 'pasta_huevo',    outputAmount: 1 },
  // Agricultural Processor
  { id: 'rec_azucar',        name: 'Sugar',            icon: '🍬', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'sugarbeet', amount: 3  }, outputProductId: 'azucar',         outputAmount: 1 },
  { id: 'rec_etanol',        name: 'Ethanol',          icon: '⛽', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'sugarcane', amount: 2  }, outputProductId: 'etanol',         outputAmount: 1 },
  { id: 'rec_fibra_algodon', name: 'Cotton Fiber',     icon: '🩷', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'cotton',    amount: 2  }, outputProductId: 'fibra_algodon',  outputAmount: 1 },
  { id: 'rec_tejido_lana',   name: 'Wool Fabric',      icon: '🧶', requiredBuilding: 'bld_procesadora', input: { source: 'animal', itemId: 'wool',      amount: 2  }, outputProductId: 'tejido_lana',    outputAmount: 1 },
  { id: 'rec_embutidos',     name: 'Cold Cuts',        icon: '🥩', requiredBuilding: 'bld_procesadora', input: { source: 'animal', itemId: 'meat',      amount: 4  }, outputProductId: 'embutidos',      outputAmount: 3 },
  // Winery
  { id: 'rec_vino',             name: 'Wine',            icon: '🍷', requiredBuilding: 'bld_bodega',      input: { source: 'crop',   itemId: 'grapes',       amount: 3  }, outputProductId: 'vino',               outputAmount: 1 },
  // Oil Press (new crops)
  { id: 'rec_aceite_oliva',     name: 'Olive Oil',       icon: '🫒', requiredBuilding: 'bld_prensa',      input: { source: 'crop',   itemId: 'olives',       amount: 4  }, outputProductId: 'aceite_oliva',        outputAmount: 1 },
  // Agricultural Processor (new crops)
  { id: 'rec_mermelada',        name: 'Strawberry Jam',  icon: '🍓', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'strawberries', amount: 2  }, outputProductId: 'mermelada',           outputAmount: 1 },
  { id: 'rec_almendras',        name: 'Roasted Almonds', icon: '🥜', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'almonds',      amount: 1  }, outputProductId: 'almendras_tostadas',  outputAmount: 1 },
  { id: 'rec_tomate_triturado', name: 'Tomato Paste',    icon: '🍅', requiredBuilding: 'bld_procesadora', input: { source: 'crop',   itemId: 'tomatoes',     amount: 3  }, outputProductId: 'tomate_triturado',    outputAmount: 1 },
];
