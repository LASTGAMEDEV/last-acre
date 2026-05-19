export type ProductCategory = 'fertilizer_solid' | 'fertilizer_liquid' | 'herbicide' | 'fungicide' | 'insecticide' | 'nematicide';

export interface ProductType {
  id: string;
  name: string;
  category: ProductCategory;
  cost: number;        // $ per application (per ha)
  packSize: number;    // doses per purchase
  packCost: number;    // total $ for one pack
  effectLabel: string; // shown in UI
  fertilizerBonus?: number; // harvest yield multiplier (fertilizers only)
  unlockId?: string;   // historical unlock gate
}

export const PRODUCT_TYPES: ProductType[] = [
  // ── Solid Fertilizers ──────────────────────────────────────────
  {
    id: 'fert_solid_basic',
    name: 'NPK Solid Fertilizer',
    category: 'fertilizer_solid',
    cost: 120,
    packSize: 5,
    packCost: 550,
    effectLabel: '+20% yield per ha',
    fertilizerBonus: 1.20,
  },
  {
    id: 'fert_solid_premium',
    name: 'Premium Solid Fertilizer',
    category: 'fertilizer_solid',
    cost: 230,
    packSize: 5,
    packCost: 1050,
    effectLabel: '+35% yield per ha',
    fertilizerBonus: 1.35,
  },
  {
    id: 'fert_solid_slow',
    name: 'Slow-Release Fertilizer',
    category: 'fertilizer_solid',
    cost: 190,
    packSize: 5,
    packCost: 860,
    effectLabel: '+25% yield per ha',
    fertilizerBonus: 1.25,
  },

  // ── Liquid Fertilizers ─────────────────────────────────────────
  {
    id: 'fert_liquid_basic',
    name: 'Foliar Liquid Fertilizer',
    category: 'fertilizer_liquid',
    cost: 160,
    packSize: 5,
    packCost: 730,
    effectLabel: '+25% yield per ha',
    fertilizerBonus: 1.25,
  },
  {
    id: 'fert_liquid_premium',
    name: 'Premium Liquid Fertilizer',
    category: 'fertilizer_liquid',
    cost: 300,
    packSize: 5,
    packCost: 1380,
    effectLabel: '+40% yield per ha',
    fertilizerBonus: 1.40,
  },
  {
    id: 'fert_liquid_nitrogen',
    name: 'UAN Nitrogen Solution',
    category: 'fertilizer_liquid',
    cost: 200,
    packSize: 5,
    packCost: 920,
    effectLabel: '+30% yield per ha',
    fertilizerBonus: 1.30,
  },

  // ── Herbicides ─────────────────────────────────────────────────
  {
    id: 'herb_basic',
    name: 'Basic Herbicide',
    category: 'herbicide',
    cost: 70,
    packSize: 5,
    packCost: 320,
    effectLabel: 'Removes weeds from plot',
  },
  {
    id: 'herb_systemic',
    name: 'Systemic Herbicide',
    category: 'herbicide',
    cost: 130,
    packSize: 5,
    packCost: 590,
    effectLabel: 'Removes weeds + prevents 60 days',
  },
  {
    id: 'herb_total',
    name: 'Total Herbicide',
    category: 'herbicide',
    cost: 210,
    packSize: 5,
    packCost: 950,
    effectLabel: 'Removes all + prevents 90 days',
  },
  {
    id: 'herbicide_glyphosate_t1',
    name: 'Glyphosate Herbicide',
    category: 'herbicide',
    cost: 140,
    packSize: 5,
    packCost: 640,
    effectLabel: 'Broad-spectrum weed elimination · no-till compatible',
    unlockId: 'herbicide_glyphosate_t1',
  },

  // ── Fungicides ─────────────────────────────────────────────────
  {
    id: 'fungi_basic',
    name: 'Copper Fungicide',
    category: 'fungicide',
    cost: 85,
    packSize: 5,
    packCost: 380,
    effectLabel: 'Protects against fungal diseases',
  },
  {
    id: 'fungi_systemic',
    name: 'Systemic Fungicide',
    category: 'fungicide',
    cost: 160,
    packSize: 5,
    packCost: 730,
    effectLabel: 'Cures + protects 45 days against fungi',
  },

  // ── Growth treatments ──────────────────────────────────────────
  {
    id: 'bst_treatment',
    name: 'Bovine Growth Hormone',
    category: 'fertilizer_liquid',
    cost: 200,
    packSize: 5,
    packCost: 900,
    effectLabel: '+15% dairy yield · animal welfare concern',
    unlockId: 'bst_treatment',
  },

  // ── Insecticides ───────────────────────────────────────────────
  {
    id: 'insect_basic',
    name: 'Organic Insecticide',
    category: 'insecticide',
    cost: 75,
    packSize: 5,
    packCost: 340,
    effectLabel: 'Controls insect pests',
  },
  {
    id: 'insect_systemic',
    name: 'Systemic Insecticide',
    category: 'insecticide',
    cost: 150,
    packSize: 5,
    packCost: 680,
    effectLabel: 'Eliminates pests + protects 30 days',
  },
  {
    id: 'insect_integral',
    name: 'Complete Treatment',
    category: 'insecticide',
    cost: 260,
    packSize: 5,
    packCost: 1180,
    effectLabel: 'Combats fungi + pests + weeds',
  },

  // ── Nematicides ────────────────────────────────────────────────
  {
    id: 'nematicide_basic',
    name: 'Basic Nematicide',
    category: 'nematicide',
    cost: 90,
    packSize: 5,
    packCost: 410,
    effectLabel: 'Clears root nematodes',
  },
  {
    id: 'nematicide_systemic',
    name: 'Systemic Nematicide',
    category: 'nematicide',
    cost: 170,
    packSize: 5,
    packCost: 780,
    effectLabel: 'Eliminates nematodes + protects 30 days',
  },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  fertilizer_solid:  '🧱 Solid Fertilizer',
  fertilizer_liquid: '💧 Liquid Fertilizer',
  herbicide:         '🌿 Herbicides',
  fungicide:         '🍄 Fungicides',
  insecticide:       '🐛 Insecticides',
  nematicide:        '🪱 Nematicides',
};
