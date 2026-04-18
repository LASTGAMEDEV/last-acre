export type BuildingCategory = 'animal' | 'silo' | 'industrial' | 'lab' | 'upgrade' | 'production';

export interface BuildingType {
  id: string;
  name: string;
  category: BuildingCategory;
  cost: number;
  maintenancePerDay: number;
  capacity?: number;        // animal slots OR storage kg/L
  effectLabel: string;
  description?: string;
  animalTypeId?: string;
  dailyCapacity?: number;
  buildingTier?: 'small' | 'medium' | 'large';
  equipmentSlotCount?: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  cost: number;
  /** Building type id prefix this equipment fits — matches any tier (s/m/l). */
  applicableBuildingPrefixes: string[];
  effectLabel: string;
  slot: 1 | 2 | 3;
}

export const PRODUCTION_EQUIPMENT: EquipmentItem[] = [
  // ── Milking buildings (parlour, goat stand, buffalo dairy) ─────────────
  {
    id: 'eq_auto_cluster',
    name: 'Automatic Cluster Unit',
    cost: 8000,
    applicableBuildingPrefixes: ['bld_milking_parlour', 'bld_goat_milking_stand', 'bld_buffalo_dairy'],
    effectLabel: '+20% throughput · −1 worker required',
    slot: 1,
  },
  {
    id: 'eq_milk_analyser',
    name: 'Inline Milk Analyser',
    cost: 12000,
    applicableBuildingPrefixes: ['bld_milking_parlour', 'bld_goat_milking_stand', 'bld_buffalo_dairy'],
    effectLabel: 'Detects mastitis early · +10 effective hygiene for SCC',
    slot: 2,
  },
  {
    id: 'eq_refrigerated_pipe',
    name: 'Refrigerated Pipe',
    cost: 9000,
    applicableBuildingPrefixes: ['bld_milking_parlour', 'bld_buffalo_dairy'],
    effectLabel: 'Replaces need for a separate milk cooling tank',
    slot: 3,
  },
  // ── Shearing shed ──────────────────────────────────────────────────────
  {
    id: 'eq_electric_shears',
    name: 'Electric Shears',
    cost: 5000,
    applicableBuildingPrefixes: ['bld_shearing_shed'],
    effectLabel: '2× shearing speed',
    slot: 1,
  },
  {
    id: 'eq_wool_press',
    name: 'Wool Press',
    cost: 7000,
    applicableBuildingPrefixes: ['bld_shearing_shed'],
    effectLabel: 'Bales wool — required to ship via export trailer',
    slot: 2,
  },
  {
    id: 'eq_lanolin_extractor',
    name: 'Lanolin Extractor',
    cost: 6000,
    applicableBuildingPrefixes: ['bld_shearing_shed'],
    effectLabel: 'Captures lanolin as a sellable byproduct',
    slot: 3,
  },
  // ── Egg collection buildings ───────────────────────────────────────────
  {
    id: 'eq_auto_belt',
    name: 'Automatic Belt Collector',
    cost: 6000,
    applicableBuildingPrefixes: ['bld_egg_collection_house', 'bld_duck_egg_house', 'bld_quail_egg_station'],
    effectLabel: 'Faster collection · −1 worker required',
    slot: 1,
  },
  {
    id: 'eq_egg_grader',
    name: 'Egg Grading Machine',
    cost: 9000,
    applicableBuildingPrefixes: ['bld_egg_collection_house', 'bld_duck_egg_house', 'bld_quail_egg_station'],
    effectLabel: 'Identifies premium eggs at 1.3× price',
    slot: 2,
  },
  {
    id: 'eq_uv_sanitiser',
    name: 'UV Sanitiser',
    cost: 5000,
    applicableBuildingPrefixes: ['bld_egg_collection_house'],
    effectLabel: 'Reduces contamination events · −0.5 daily hygiene decay',
    slot: 3,
  },
  // ── Butchery buildings ─────────────────────────────────────────────────
  {
    id: 'eq_vacuum_packer',
    name: 'Vacuum Packer',
    cost: 7000,
    applicableBuildingPrefixes: ['bld_pig_butchery', 'bld_rabbit_butchery'],
    effectLabel: '5-day shelf life on fresh meat — removes same-day sale pressure',
    slot: 1,
  },
  {
    id: 'eq_bone_saw',
    name: 'Bone Saw',
    cost: 5000,
    applicableBuildingPrefixes: ['bld_pig_butchery', 'bld_rabbit_butchery'],
    effectLabel: 'Unlocks bone meal byproduct per cull',
    slot: 2,
  },
  {
    id: 'eq_smoke_unit',
    name: 'Smoke Unit',
    cost: 12000,
    applicableBuildingPrefixes: ['bld_pig_butchery'],
    effectLabel: 'Smoked pork at 1.4× price',
    slot: 3,
  },
  // ── Honey extraction suite ─────────────────────────────────────────────
  {
    id: 'eq_uncapping_machine',
    name: 'Uncapping Machine',
    cost: 8000,
    applicableBuildingPrefixes: ['bld_honey_extraction_suite'],
    effectLabel: 'Raises honey yield from 40% to 65%',
    slot: 1,
  },
  {
    id: 'eq_centrifugal_extractor',
    name: 'Centrifugal Extractor',
    cost: 12000,
    applicableBuildingPrefixes: ['bld_honey_extraction_suite'],
    effectLabel: 'Raises honey yield from 65% to 100%',
    slot: 2,
  },
  {
    id: 'eq_wax_press',
    name: 'Wax Press',
    cost: 6000,
    applicableBuildingPrefixes: ['bld_honey_extraction_suite'],
    effectLabel: 'Captures beeswax as a sellable byproduct',
    slot: 3,
  },
  {
    id: 'eq_pregnancy_scanner',
    name: 'Pregnancy Scanner',
    cost: 9500,
    applicableBuildingPrefixes: ['bld_calving_pen'],
    effectLabel: 'Due dates appear in calendar · pen capacity warning 3 days before birth',
    slot: 1,
  },
];

export const BUILDING_TYPES: BuildingType[] = [
  // ── Animal Buildings ───────────────────────────────────────────
  // ── Poultry (gallinero) ────────────────────────────────────────
  {
    id: 'bld_gallinero_s',
    name: 'Small Poultry House',
    category: 'animal',
    cost: 8000,
    maintenancePerDay: 8,
    capacity: 30,
    effectLabel: '30 birds · one species only',
  },
  {
    id: 'bld_gallinero_m',
    name: 'Medium Poultry House',
    category: 'animal',
    cost: 36000,
    maintenancePerDay: 36,
    capacity: 120,
    effectLabel: '120 birds · one species only',
  },
  {
    id: 'bld_gallinero_l',
    name: 'Large Poultry House',
    category: 'animal',
    cost: 112000,
    maintenancePerDay: 112,
    capacity: 400,
    effectLabel: '400 birds · one species only',
  },
  // ── Cattle Barn (establo) ─────────────────────────────────────
  {
    id: 'bld_establo_s',
    name: 'Small Cattle Barn',
    category: 'animal',
    cost: 32000,
    maintenancePerDay: 32,
    capacity: 12,
    effectLabel: '12 cows or buffalo · one species only',
  },
  {
    id: 'bld_establo_m',
    name: 'Medium Cattle Barn',
    category: 'animal',
    cost: 96000,
    maintenancePerDay: 96,
    capacity: 35,
    effectLabel: '35 cows or buffalo · one species only',
  },
  {
    id: 'bld_establo_l',
    name: 'Large Cattle Barn',
    category: 'animal',
    cost: 260000,
    maintenancePerDay: 260,
    capacity: 100,
    effectLabel: '100 cows or buffalo · one species only',
  },
  // ── Horse Stable (caballeriza) ────────────────────────────────
  {
    id: 'bld_caballeriza_s',
    name: 'Small Horse Stable',
    category: 'animal',
    cost: 48000,
    maintenancePerDay: 48,
    capacity: 6,
    effectLabel: '6 horses',
  },
  {
    id: 'bld_caballeriza_m',
    name: 'Medium Horse Stable',
    category: 'animal',
    cost: 128000,
    maintenancePerDay: 128,
    capacity: 15,
    effectLabel: '15 horses',
  },
  {
    id: 'bld_caballeriza_l',
    name: 'Large Horse Stable',
    category: 'animal',
    cost: 320000,
    maintenancePerDay: 320,
    capacity: 40,
    effectLabel: '40 horses',
  },
  // ── Pigsty (pocilga) ──────────────────────────────────────────
  {
    id: 'bld_pocilga',
    name: 'Small Pigsty',
    category: 'animal',
    cost: 18000,
    maintenancePerDay: 18,
    capacity: 30,
    effectLabel: '30 pigs',
  },
  {
    id: 'bld_pocilga_m',
    name: 'Medium Pigsty',
    category: 'animal',
    cost: 56000,
    maintenancePerDay: 56,
    capacity: 100,
    effectLabel: '100 pigs',
  },
  {
    id: 'bld_pocilga_l',
    name: 'Large Pigsty',
    category: 'animal',
    cost: 152000,
    maintenancePerDay: 152,
    capacity: 300,
    effectLabel: '300 pigs',
  },
  // ── Paddock (corral) ──────────────────────────────────────────
  {
    id: 'bld_corral',
    name: 'Small Paddock',
    category: 'animal',
    cost: 14000,
    maintenancePerDay: 14,
    capacity: 40,
    effectLabel: '40 animals · one species only',
  },
  {
    id: 'bld_corral_m',
    name: 'Medium Paddock',
    category: 'animal',
    cost: 48000,
    maintenancePerDay: 48,
    capacity: 130,
    effectLabel: '130 animals · one species only',
  },
  {
    id: 'bld_corral_l',
    name: 'Large Paddock',
    category: 'animal',
    cost: 128000,
    maintenancePerDay: 128,
    capacity: 400,
    effectLabel: '400 animals · one species only',
  },
  // ── Apiary (colmena) ──────────────────────────────────────────
  {
    id: 'bld_colmena',
    name: 'Small Apiary',
    category: 'animal',
    cost: 4800,
    maintenancePerDay: 5,
    capacity: 15,
    effectLabel: '15 bee hives',
  },
  {
    id: 'bld_colmena_m',
    name: 'Medium Apiary',
    category: 'animal',
    cost: 18000,
    maintenancePerDay: 18,
    capacity: 40,
    effectLabel: '40 bee hives',
  },
  {
    id: 'bld_colmena_l',
    name: 'Large Apiary',
    category: 'animal',
    cost: 48000,
    maintenancePerDay: 48,
    capacity: 100,
    effectLabel: '100 bee hives',
  },
  // ── Rabbit Hutch (conejera) ───────────────────────────────────
  {
    id: 'bld_conejera',
    name: 'Small Rabbit Hutch',
    category: 'animal',
    cost: 7200,
    maintenancePerDay: 7,
    capacity: 60,
    effectLabel: '60 rabbits',
  },
  {
    id: 'bld_conejera_m',
    name: 'Medium Rabbit Hutch',
    category: 'animal',
    cost: 26000,
    maintenancePerDay: 26,
    capacity: 200,
    effectLabel: '200 rabbits',
  },
  {
    id: 'bld_conejera_l',
    name: 'Large Rabbit Hutch',
    category: 'animal',
    cost: 72000,
    maintenancePerDay: 72,
    capacity: 600,
    effectLabel: '600 rabbits',
  },

  // ── Greenhouses ───────────────────────────────────────────────
  {
    id: 'bld_greenhouse_s',
    name: 'Small Greenhouse',
    category: 'industrial',
    cost: 60000,
    maintenancePerDay: 60,
    capacity: 5,
    effectLabel: '5 greenhouse slots — crops grow any season, protected from weather',
  },
  {
    id: 'bld_greenhouse_m',
    name: 'Medium Greenhouse',
    category: 'industrial',
    cost: 160000,
    maintenancePerDay: 160,
    capacity: 15,
    effectLabel: '15 greenhouse slots — crops grow any season, protected from weather',
  },
  {
    id: 'bld_greenhouse_l',
    name: 'Large Greenhouse',
    category: 'industrial',
    cost: 400000,
    maintenancePerDay: 400,
    capacity: 40,
    effectLabel: '40 greenhouse slots — crops grow any season, protected from weather',
  },

  // ── Silos ──────────────────────────────────────────────────────
  {
    id: 'bld_silo_s',
    name: 'Small Silo',
    category: 'silo',
    cost: 20000,
    maintenancePerDay: 20,
    capacity: 50000,
    effectLabel: 'Stores up to 50,000 kg/L',
  },
  {
    id: 'bld_silo_m',
    name: 'Medium Silo',
    category: 'silo',
    cost: 72000,
    maintenancePerDay: 72,
    capacity: 200000,
    effectLabel: 'Stores up to 200,000 kg/L',
  },
  {
    id: 'bld_silo_l',
    name: 'Large Silo',
    category: 'silo',
    cost: 200000,
    maintenancePerDay: 200,
    capacity: 600000,
    effectLabel: 'Stores up to 600,000 kg/L',
  },
  {
    id: 'bld_silo_xl',
    name: 'Industrial Silo',
    category: 'silo',
    cost: 480000,
    maintenancePerDay: 480,
    capacity: 2000000,
    effectLabel: 'Stores up to 2,000,000 kg/L',
  },

  // ── Industrial Buildings ───────────────────────────────────────
  {
    id: 'bld_almacen',
    name: 'General Warehouse',
    category: 'industrial',
    cost: 28000,
    maintenancePerDay: 28,
    effectLabel: '-10% machine purchase cost',
  },
  {
    id: 'bld_taller',
    name: 'Mechanical Workshop',
    category: 'industrial',
    cost: 56000,
    maintenancePerDay: 56,
    effectLabel: 'Reduces machine maintenance by 25%',
  },
  {
    id: 'bld_granero',
    name: 'Barn',
    category: 'industrial',
    cost: 32000,
    maintenancePerDay: 32,
    effectLabel: '+20% animal daily production',
  },
  {
    id: 'bld_agua',
    name: 'Water Tower',
    category: 'industrial',
    cost: 48000,
    maintenancePerDay: 48,
    effectLabel: '+5% crop yield on all harvests',
  },
  {
    id: 'bld_biodigestor',
    name: 'Biodigester',
    category: 'industrial',
    cost: 88000,
    maintenancePerDay: 88,
    effectLabel: 'Converts waste into free fertilizer',
  },
  {
    id: 'bld_secadero',
    name: 'Grain Dryer',
    category: 'industrial',
    cost: 64000,
    maintenancePerDay: 64,
    effectLabel: 'Prevents post-harvest losses, +5% sell price',
  },
  {
    id: 'bld_oficina',
    name: 'Administrative Office',
    category: 'industrial',
    cost: 72000,
    maintenancePerDay: 72,
    effectLabel: '+5% contract delivery revenue',
  },

  // ── Winery ─────────────────────────────────────────────────────
  {
    id: 'bld_bodega',
    name: 'Winery',
    category: 'industrial',
    cost: 152000,
    maintenancePerDay: 152,
    effectLabel: 'Ferments grapes into wine',
  },

  // ── Processing Plants ──────────────────────────────────────────
  {
    id: 'bld_molino',
    name: 'Flour Mill',
    category: 'industrial',
    cost: 72000,
    maintenancePerDay: 72,
    effectLabel: 'Processes grains into flour, polenta, malt and flakes',
  },
  {
    id: 'bld_prensa',
    name: 'Oil Press',
    category: 'industrial',
    cost: 28000,
    maintenancePerDay: 7,
    effectLabel: 'Extracts sunflower, rapeseed, canola and soy oil',
  },
  {
    id: 'bld_lacteo',
    name: 'Dairy Plant',
    category: 'industrial',
    cost: 32000,
    maintenancePerDay: 8,
    effectLabel: 'Produces cheese, butter and egg pasta',
  },
  {
    id: 'bld_procesadora',
    name: 'Agricultural Processor',
    category: 'industrial',
    cost: 22000,
    maintenancePerDay: 6,
    effectLabel: 'Processes sugar, ethanol, cotton fiber, fabric and cold cuts',
  },

  // ── Seed Lab ──────────────────────────────────────────────────────────────
  {
    id: 'bld_seed_lab_1',
    name: 'Seed Lab (Level 1)',
    category: 'lab',
    cost: 5000,
    maintenancePerDay: 5,
    effectLabel: '1 hybridization slot · 14-day cycles',
  },
  {
    id: 'bld_seed_lab_2',
    name: 'Seed Lab (Level 2)',
    category: 'lab',
    cost: 15000,
    maintenancePerDay: 12,
    effectLabel: '2 hybridization slots · 10-day cycles',
  },
  {
    id: 'bld_seed_lab_3',
    name: 'Seed Lab (Level 3)',
    category: 'lab',
    cost: 40000,
    maintenancePerDay: 25,
    effectLabel: '3 hybridization slots · 7-day cycles',
  },

  // ── Farm Upgrades (late game, high-cost, game-changing effects) ────────────
  {
    id: 'bld_cold_storage',
    name: 'Cold Storage',
    category: 'upgrade',
    cost: 60_000,
    maintenancePerDay: 12,
    effectLabel: 'Prevents crop spoilage · +10% sell price on stored inventory',
  },
  {
    id: 'bld_smart_irrigation',
    name: 'Smart Irrigation System',
    category: 'upgrade',
    cost: 80_000,
    maintenancePerDay: 10,
    effectLabel: '+30% crop yield on all owned parcels (stacks with irrigation)',
  },
  {
    id: 'bld_research_station',
    name: 'Research Station',
    category: 'upgrade',
    cost: 120_000,
    maintenancePerDay: 20,
    effectLabel: 'Cuts all crop growth time by 20% · unlocks advanced contracts',
  },
  {
    id: 'bld_solar_array',
    name: 'Solar Panel Array',
    category: 'upgrade',
    cost: 90_000,
    maintenancePerDay: -20,
    effectLabel: 'Generates energy — reduces all maintenance costs by 30%',
  },
  {
    id: 'bld_shelter',
    name: 'Storm Shelter',
    category: 'upgrade' as BuildingCategory,
    cost: 35_000,
    maintenancePerDay: 6,
    effectLabel: 'Protects all animals from seasonal events (heat wave, frost, flood) — halves sickness chance during events',
  },
  {
    id: 'bld_export_terminal',
    name: 'Export Terminal',
    category: 'upgrade',
    cost: 150_000,
    maintenancePerDay: 30,
    effectLabel: '+50% revenue on all delivery contracts · unlocks export-tier contracts',
  },
  {
    id: 'bld_hydroponic_lab',
    name: 'Hydroponic Lab',
    category: 'upgrade',
    cost: 200_000,
    maintenancePerDay: 35,
    capacity: 10,
    effectLabel: '10 hydroponic slots — any crop, any season, +40% yield, no soil degradation',
  },
  // ── Fuel Tanks ─────────────────────────────────────────────────────────────
  {
    id: 'bld_fuel_tank_s',
    name: 'Small Fuel Tank',
    category: 'upgrade',
    cost: 3_500,
    maintenancePerDay: 0,
    capacity: 500,
    effectLabel: '+500 L fuel capacity for tractors and combines',
  },
  {
    id: 'bld_fuel_tank_l',
    name: 'Large Fuel Tank',
    category: 'upgrade',
    cost: 9_000,
    maintenancePerDay: 0,
    capacity: 2000,
    effectLabel: '+2000 L fuel capacity for tractors and combines',
  },
  // ── Henil (Hay Drying Barn) ──────────────────────────────────────────────
  {
    id: 'bld_henil',
    name: 'Henil (Hay Barn)',
    category: 'animal' as BuildingCategory,
    cost: 1200,
    maintenancePerDay: 1,
    capacity: 700,      // max kg wet grass per batch
    effectLabel: 'Converts wet grass → hay · 3-day drying · up to 2 active batches',
  },

  // ── Production Buildings ───────────────────────────────────────────────

  // Milking Parlour (cow)
  { id: 'bld_milking_parlour_s', name: 'Small Milking Parlour', category: 'production', cost: 15000, maintenancePerDay: 5, animalTypeId: 'vaca', dailyCapacity: 12, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '12 cows/day · 4 stalls' },
  { id: 'bld_milking_parlour_m', name: 'Medium Milking Parlour', category: 'production', cost: 38000, maintenancePerDay: 10, animalTypeId: 'vaca', dailyCapacity: 30, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '30 cows/day · 10 stalls' },
  { id: 'bld_milking_parlour_l', name: 'Large Milking Parlour', category: 'production', cost: 85000, maintenancePerDay: 20, animalTypeId: 'vaca', dailyCapacity: 60, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '60 cows/day · 20 stalls' },

  // Goat Milking Stand (goat)
  { id: 'bld_goat_milking_stand_s', name: 'Small Goat Milking Stand', category: 'production', cost: 10000, maintenancePerDay: 4, animalTypeId: 'cabra', dailyCapacity: 18, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '18 goats/day · 6 stalls' },
  { id: 'bld_goat_milking_stand_m', name: 'Medium Goat Milking Stand', category: 'production', cost: 25000, maintenancePerDay: 8, animalTypeId: 'cabra', dailyCapacity: 45, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '45 goats/day · 15 stalls' },
  { id: 'bld_goat_milking_stand_l', name: 'Large Goat Milking Stand', category: 'production', cost: 60000, maintenancePerDay: 16, animalTypeId: 'cabra', dailyCapacity: 90, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '90 goats/day · 30 stalls' },

  // Buffalo Dairy (buffalo)
  { id: 'bld_buffalo_dairy_s', name: 'Small Buffalo Dairy', category: 'production', cost: 18000, maintenancePerDay: 6, animalTypeId: 'bufalo', dailyCapacity: 10, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '10 buffalo/day · 4 stalls' },
  { id: 'bld_buffalo_dairy_m', name: 'Medium Buffalo Dairy', category: 'production', cost: 45000, maintenancePerDay: 12, animalTypeId: 'bufalo', dailyCapacity: 25, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '25 buffalo/day · 10 stalls' },
  { id: 'bld_buffalo_dairy_l', name: 'Large Buffalo Dairy', category: 'production', cost: 110000, maintenancePerDay: 25, animalTypeId: 'bufalo', dailyCapacity: 50, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '50 buffalo/day · 20 stalls' },

  // Shearing Shed (sheep)
  { id: 'bld_shearing_shed_s', name: 'Small Shearing Shed', category: 'production', cost: 12000, maintenancePerDay: 4, animalTypeId: 'oveja', dailyCapacity: 15, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '15 sheep/day' },
  { id: 'bld_shearing_shed_m', name: 'Medium Shearing Shed', category: 'production', cost: 30000, maintenancePerDay: 8, animalTypeId: 'oveja', dailyCapacity: 38, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '38 sheep/day' },
  { id: 'bld_shearing_shed_l', name: 'Large Shearing Shed', category: 'production', cost: 70000, maintenancePerDay: 16, animalTypeId: 'oveja', dailyCapacity: 75, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '75 sheep/day' },

  // Egg Collection House (chicken)
  { id: 'bld_egg_collection_house_s', name: 'Small Egg Collection House', category: 'production', cost: 8000, maintenancePerDay: 3, animalTypeId: 'gallina', dailyCapacity: 80, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '80 chickens/day' },
  { id: 'bld_egg_collection_house_m', name: 'Medium Egg Collection House', category: 'production', cost: 20000, maintenancePerDay: 6, animalTypeId: 'gallina', dailyCapacity: 200, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '200 chickens/day' },
  { id: 'bld_egg_collection_house_l', name: 'Large Egg Collection House', category: 'production', cost: 50000, maintenancePerDay: 14, animalTypeId: 'gallina', dailyCapacity: 400, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '400 chickens/day' },

  // Duck Egg House (duck)
  { id: 'bld_duck_egg_house_s', name: 'Small Duck Egg House', category: 'production', cost: 8000, maintenancePerDay: 3, animalTypeId: 'pato', dailyCapacity: 60, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '60 ducks/day' },
  { id: 'bld_duck_egg_house_m', name: 'Medium Duck Egg House', category: 'production', cost: 20000, maintenancePerDay: 6, animalTypeId: 'pato', dailyCapacity: 150, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '150 ducks/day' },
  { id: 'bld_duck_egg_house_l', name: 'Large Duck Egg House', category: 'production', cost: 50000, maintenancePerDay: 14, animalTypeId: 'pato', dailyCapacity: 300, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '300 ducks/day' },

  // Quail Egg Station (quail)
  { id: 'bld_quail_egg_station_s', name: 'Small Quail Egg Station', category: 'production', cost: 8000, maintenancePerDay: 3, animalTypeId: 'codorniz', dailyCapacity: 120, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '120 quail/day' },
  { id: 'bld_quail_egg_station_m', name: 'Medium Quail Egg Station', category: 'production', cost: 20000, maintenancePerDay: 6, animalTypeId: 'codorniz', dailyCapacity: 300, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '300 quail/day' },
  { id: 'bld_quail_egg_station_l', name: 'Large Quail Egg Station', category: 'production', cost: 50000, maintenancePerDay: 14, animalTypeId: 'codorniz', dailyCapacity: 600, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '600 quail/day' },

  // Pig Butchery (pig)
  { id: 'bld_pig_butchery_s', name: 'Small Pig Butchery', category: 'production', cost: 14000, maintenancePerDay: 5, animalTypeId: 'cerdo', dailyCapacity: 8, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '8 pigs per cull session · +30% meat yield' },
  { id: 'bld_pig_butchery_m', name: 'Medium Pig Butchery', category: 'production', cost: 35000, maintenancePerDay: 10, animalTypeId: 'cerdo', dailyCapacity: 20, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '20 pigs per session · +30% meat yield' },
  { id: 'bld_pig_butchery_l', name: 'Large Pig Butchery', category: 'production', cost: 80000, maintenancePerDay: 22, animalTypeId: 'cerdo', dailyCapacity: 40, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '40 pigs per session · +30% meat yield' },

  // Rabbit Butchery (rabbit)
  { id: 'bld_rabbit_butchery_s', name: 'Small Rabbit Butchery', category: 'production', cost: 10000, maintenancePerDay: 4, animalTypeId: 'conejo', dailyCapacity: 12, buildingTier: 'small', equipmentSlotCount: 2, effectLabel: '12 rabbits per session · +30% meat yield' },
  { id: 'bld_rabbit_butchery_m', name: 'Medium Rabbit Butchery', category: 'production', cost: 25000, maintenancePerDay: 7, animalTypeId: 'conejo', dailyCapacity: 30, buildingTier: 'medium', equipmentSlotCount: 2, effectLabel: '30 rabbits per session · +30% meat yield' },
  { id: 'bld_rabbit_butchery_l', name: 'Large Rabbit Butchery', category: 'production', cost: 60000, maintenancePerDay: 15, animalTypeId: 'conejo', dailyCapacity: 60, buildingTier: 'large', equipmentSlotCount: 2, effectLabel: '60 rabbits per session · +30% meat yield' },

  // Honey Extraction Suite (bee)
  { id: 'bld_honey_extraction_suite_s', name: 'Small Honey Extraction Suite', category: 'production', cost: 12000, maintenancePerDay: 4, animalTypeId: 'abeja', dailyCapacity: 5, buildingTier: 'small', equipmentSlotCount: 3, effectLabel: '5 hives per harvest · 40% yield without equipment' },
  { id: 'bld_honey_extraction_suite_m', name: 'Medium Honey Extraction Suite', category: 'production', cost: 30000, maintenancePerDay: 8, animalTypeId: 'abeja', dailyCapacity: 12, buildingTier: 'medium', equipmentSlotCount: 3, effectLabel: '12 hives per harvest · 40% yield without equipment' },
  { id: 'bld_honey_extraction_suite_l', name: 'Large Honey Extraction Suite', category: 'production', cost: 70000, maintenancePerDay: 16, animalTypeId: 'abeja', dailyCapacity: 25, buildingTier: 'large', equipmentSlotCount: 3, effectLabel: '25 hives per harvest · 40% yield without equipment' },

  // ── Breeding Infrastructure ────────────────────────────────────────────────
  { id: 'bld_quarantine_pen',       name: 'Quarantine Pen',                      category: 'production', cost: 8000,  maintenancePerDay: 4,  capacity: 10,  effectLabel: 'New arrivals isolated 14 days · disease intro risk 2% (vs 15%)' },
  { id: 'bld_calving_pen_s',        name: 'Small Calving / Farrowing Pen',       category: 'production', cost: 12000, maintenancePerDay: 5,  capacity: 2,   buildingTier: 'small',  effectLabel: '2 simultaneous births · newborn mortality 5% (vs 25%)' },
  { id: 'bld_calving_pen_m',        name: 'Medium Calving / Farrowing Pen',      category: 'production', cost: 28000, maintenancePerDay: 10, capacity: 5,   buildingTier: 'medium', effectLabel: '5 simultaneous births · newborn mortality 5% (vs 25%)' },
  { id: 'bld_calving_pen_l',        name: 'Large Calving / Farrowing Pen',       category: 'production', cost: 60000, maintenancePerDay: 18, capacity: 10,  buildingTier: 'large',  effectLabel: '10 simultaneous births · newborn mortality 5% (vs 25%)' },
  { id: 'bld_sire_pen',             name: 'Sire Pen',                            category: 'production', cost: 15000, maintenancePerDay: 6,  capacity: 4,   effectLabel: 'Enables free on-farm breeding using designated sires' },
  // ── Veterinary & Health Infrastructure ────────────────────────────────────
  { id: 'bld_vet_room',             name: 'Vet Room',                            category: 'production', cost: 22000, maintenancePerDay: 8,  effectLabel: 'Eliminates callout fee for routine vet events · vet worker handles auto-treatments' },
  { id: 'bld_medicine_cabinet',     name: 'Medicine Cabinet',                    category: 'production', cost: 9000,  maintenancePerDay: 2,  effectLabel: 'Medicines maintain shelf life · enables bulk purchase discounts' },
  { id: 'bld_isolation_sick_bay_s', name: 'Small Sick Bay',                      category: 'production', cost: 14000, maintenancePerDay: 5,  capacity: 5,   buildingTier: 'small',  effectLabel: '5 animals isolated · disease spread near zero when vet assigned' },
  { id: 'bld_isolation_sick_bay_m', name: 'Medium Sick Bay',                     category: 'production', cost: 30000, maintenancePerDay: 10, capacity: 15,  buildingTier: 'medium', effectLabel: '15 animals isolated · disease spread near zero when vet assigned' },
  { id: 'bld_cattle_crush',         name: 'Cattle Crush',                        category: 'production', cost: 10000, maintenancePerDay: 3,  effectLabel: 'Cattle treatments same day at standard cost · required for Weigh Crate' },
  { id: 'bld_weigh_crate',          name: 'Weigh Crate',                         category: 'production', cost: 8000,  maintenancePerDay: 2,  effectLabel: 'Flags optimal slaughter weight · +5% sale bonus · requires Cattle Crush' },
  { id: 'bld_cctv_monitor',         name: 'CCTV Monitor',                        category: 'production', cost: 12000, maintenancePerDay: 3,  effectLabel: 'Overnight surveillance · −1 worker requirement across all animal buildings' },
  // ── Feed & Waste Infrastructure ───────────────────────────────────────────
  { id: 'bld_silage_pit_s',           name: 'Small Silage Pit',                  category: 'production', cost: 6000,  maintenancePerDay: 3,  capacity: 5000,  buildingTier: 'small',  effectLabel: 'Stores 5,000 kg silage · winter hay alternative for ruminants' },
  { id: 'bld_silage_pit_m',           name: 'Medium Silage Pit',                 category: 'production', cost: 14000, maintenancePerDay: 6,  capacity: 15000, buildingTier: 'medium', effectLabel: 'Stores 15,000 kg silage · winter hay alternative for ruminants' },
  { id: 'bld_silage_pit_l',           name: 'Large Silage Pit',                  category: 'production', cost: 32000, maintenancePerDay: 12, capacity: 40000, buildingTier: 'large',  effectLabel: 'Stores 40,000 kg silage · winter hay alternative for ruminants' },
  { id: 'bld_feed_mill_s',            name: 'Small Feed Mill',                   category: 'production', cost: 18000, maintenancePerDay: 8,  buildingTier: 'small',  effectLabel: 'Grinds grain to feed on-farm · reduces daily grain consumption by 35%' },
  { id: 'bld_feed_mill_m',            name: 'Medium Feed Mill',                  category: 'production', cost: 40000, maintenancePerDay: 16, buildingTier: 'medium', effectLabel: 'Grinds grain to feed on-farm · reduces daily grain consumption by 35%' },
  { id: 'bld_feed_mill_l',            name: 'Large Feed Mill',                   category: 'production', cost: 85000, maintenancePerDay: 30, buildingTier: 'large',  effectLabel: 'Grinds grain to feed on-farm · reduces daily grain consumption by 35%' },
  { id: 'bld_slurry_tank_s',          name: 'Small Slurry Tank',                 category: 'production', cost: 8000,  maintenancePerDay: 3,  capacity: 5000,  buildingTier: 'small',  effectLabel: 'Stores 5,000 L slurry safely · prevents environmental fines' },
  { id: 'bld_slurry_tank_m',          name: 'Medium Slurry Tank',                category: 'production', cost: 18000, maintenancePerDay: 5,  capacity: 15000, buildingTier: 'medium', effectLabel: 'Stores 15,000 L slurry safely · prevents environmental fines' },
  { id: 'bld_slurry_tank_l',          name: 'Large Slurry Tank',                 category: 'production', cost: 40000, maintenancePerDay: 10, capacity: 40000, buildingTier: 'large',  effectLabel: 'Stores 40,000 L slurry safely · prevents environmental fines' },
  { id: 'bld_slurry_treatment',       name: 'Slurry Treatment System',           category: 'production', cost: 25000, maintenancePerDay: 10, effectLabel: 'Processes slurry into high-grade liquid fertiliser · sellable output' },
  { id: 'bld_composting_bay',         name: 'Composting Bay',                    category: 'production', cost: 10000, maintenancePerDay: 4,  effectLabel: 'Converts manure + crop waste to compost over 14 days · required for Organic Certification' },
  { id: 'bld_rendering_incinerator',  name: 'Rendering / Incinerator',           category: 'production', cost: 15000, maintenancePerDay: 8,  effectLabel: 'Legal disposal at $8/day · no per-death callout fee · bone meal + tallow output' },
  { id: 'bld_biogas_upgrader',        name: 'Biogas Upgrader',                   category: 'production', cost: 30000, maintenancePerDay: 12, effectLabel: 'Converts biogas to biomethane · passive income scales with herd size' },
  { id: 'bld_pest_control_station',   name: 'Pest Control Station',              category: 'production', cost: 4000,  maintenancePerDay: 2,  effectLabel: 'Eliminates 1–2% daily feed loss to rodents and insects' },
  // ── Species-Specific Buildings ────────────────────────────────────────────
  { id: 'bld_hatchery_s',             name: 'Small Hatchery',                    category: 'production', cost: 12000, maintenancePerDay: 5,  capacity: 50,   buildingTier: 'small',  effectLabel: 'Incubates 50 eggs · self-renewing flock at zero purchase cost' },
  { id: 'bld_hatchery_m',             name: 'Medium Hatchery',                   category: 'production', cost: 28000, maintenancePerDay: 10, capacity: 150,  buildingTier: 'medium', effectLabel: 'Incubates 150 eggs · self-renewing flock at zero purchase cost' },
  { id: 'bld_hatchery_l',             name: 'Large Hatchery',                    category: 'production', cost: 60000, maintenancePerDay: 18, capacity: 400,  buildingTier: 'large',  effectLabel: 'Incubates 400 eggs · self-renewing flock at zero purchase cost' },
  { id: 'bld_brooder_house_s',        name: 'Small Brooder House',               category: 'production', cost: 8000,  maintenancePerDay: 4,  capacity: 50,   buildingTier: 'small',  effectLabel: 'Heated housing for chicks · mortality 3% (vs 30%)' },
  { id: 'bld_brooder_house_m',        name: 'Medium Brooder House',              category: 'production', cost: 18000, maintenancePerDay: 8,  capacity: 150,  buildingTier: 'medium', effectLabel: 'Heated housing for chicks · mortality 3% (vs 30%)' },
  { id: 'bld_brooder_house_l',        name: 'Large Brooder House',               category: 'production', cost: 38000, maintenancePerDay: 16, capacity: 400,  buildingTier: 'large',  effectLabel: 'Heated housing for chicks · mortality 3% (vs 30%)' },
  { id: 'bld_lighting_system',        name: 'Poultry Lighting System',           category: 'production', cost: 9000,  maintenancePerDay: 3,  effectLabel: 'Year-round consistent egg production · prevents 60% winter laying drop' },
  { id: 'bld_sheep_dip',              name: 'Sheep Dip / Foot Bath',             category: 'production', cost: 7000,  maintenancePerDay: 2,  effectLabel: 'Annual autumn dip · lameness events rare · eliminates scab outbreak risk' },
  { id: 'bld_wool_store_s',           name: 'Small Wool Store',                  category: 'production', cost: 10000, maintenancePerDay: 3,  capacity: 500,  buildingTier: 'small',  effectLabel: 'Stores 500 kg baled wool · sell at price peaks instead of immediately' },
  { id: 'bld_wool_store_m',           name: 'Medium Wool Store',                 category: 'production', cost: 22000, maintenancePerDay: 6,  capacity: 2000, buildingTier: 'medium', effectLabel: 'Stores 2,000 kg baled wool · sell at price peaks instead of immediately' },
  { id: 'bld_wool_store_l',           name: 'Large Wool Store',                  category: 'production', cost: 48000, maintenancePerDay: 12, capacity: 8000, buildingTier: 'large',  effectLabel: 'Stores 8,000 kg baled wool · sell at price peaks instead of immediately' },
  { id: 'bld_weaner_accommodation_s', name: 'Small Weaner Accommodation',        category: 'production', cost: 10000, maintenancePerDay: 4,  capacity: 20,   buildingTier: 'small',  effectLabel: '20 weaners · post-weaning mortality 4% (vs 25%)' },
  { id: 'bld_weaner_accommodation_m', name: 'Medium Weaner Accommodation',       category: 'production', cost: 22000, maintenancePerDay: 8,  capacity: 50,   buildingTier: 'medium', effectLabel: '50 weaners · post-weaning mortality 4% (vs 25%)' },
  { id: 'bld_weaner_accommodation_l', name: 'Large Weaner Accommodation',        category: 'production', cost: 48000, maintenancePerDay: 16, capacity: 120,  buildingTier: 'large',  effectLabel: '120 weaners · post-weaning mortality 4% (vs 25%)' },
  { id: 'bld_finishing_unit_s',       name: 'Small Finishing Unit',              category: 'production', cost: 14000, maintenancePerDay: 6,  capacity: 20,   buildingTier: 'small',  effectLabel: 'Grow-out pens for 20 pigs · +10% sale value at optimal weight' },
  { id: 'bld_finishing_unit_m',       name: 'Medium Finishing Unit',             category: 'production', cost: 30000, maintenancePerDay: 12, capacity: 50,   buildingTier: 'medium', effectLabel: 'Grow-out pens for 50 pigs · +10% sale value at optimal weight' },
  { id: 'bld_finishing_unit_l',       name: 'Large Finishing Unit',              category: 'production', cost: 65000, maintenancePerDay: 22, capacity: 120,  buildingTier: 'large',  effectLabel: 'Grow-out pens for 120 pigs · +10% sale value at optimal weight' },
  { id: 'bld_milk_cooling_tank_s',    name: 'Small Milk Cooling Tank',           category: 'production', cost: 12000, maintenancePerDay: 4,  capacity: 500,  buildingTier: 'small',  effectLabel: 'Holds 500 L milk up to 3 days · batch shipments for better prices' },
  { id: 'bld_milk_cooling_tank_m',    name: 'Medium Milk Cooling Tank',          category: 'production', cost: 28000, maintenancePerDay: 8,  capacity: 2000, buildingTier: 'medium', effectLabel: 'Holds 2,000 L milk up to 3 days · batch shipments for better prices' },
  { id: 'bld_milk_cooling_tank_l',    name: 'Large Milk Cooling Tank',           category: 'production', cost: 60000, maintenancePerDay: 16, capacity: 6000, buildingTier: 'large',  effectLabel: 'Holds 6,000 L milk up to 3 days · batch shipments for better prices' },
  { id: 'bld_pasteurisation_unit',    name: 'Pasteurisation Unit',               category: 'production', cost: 35000, maintenancePerDay: 12, effectLabel: 'Required for city supermarket milk sales · opens direct-sale channel' },
  { id: 'bld_cream_separator',        name: 'Cream Separator',                   category: 'production', cost: 18000, maintenancePerDay: 5,  effectLabel: 'Splits milk into cream + skim milk · cream sold as separate product' },
  { id: 'bld_apiary_shelter',         name: 'Apiary Shelter',                    category: 'production', cost: 8000,  maintenancePerDay: 3,  effectLabel: 'Protects hives from winter · colony collapse 4% (vs 20%) per winter' },
  { id: 'bld_queen_rearing_unit',     name: 'Queen Rearing Unit',                category: 'production', cost: 14000, maintenancePerDay: 5,  effectLabel: 'Breed replacement queens on-farm in 16 days · excess queens sellable' },
  // ── Processing Buildings ───────────────────────────────────────────────────
  { id: 'bld_smokehouse_s',      name: 'Small Smokehouse',      category: 'production', cost: 12000, maintenancePerDay: 5,  capacity: 20,  buildingTier: 'small',  effectLabel: 'Cures & smokes meat · +40% sale price on all meat products' },
  { id: 'bld_smokehouse_m',      name: 'Medium Smokehouse',     category: 'production', cost: 28000, maintenancePerDay: 10, capacity: 50,  buildingTier: 'medium', effectLabel: 'Cures & smokes meat · +40% sale price on all meat products' },
  { id: 'bld_smokehouse_l',      name: 'Large Smokehouse',      category: 'production', cost: 60000, maintenancePerDay: 20, capacity: 150, buildingTier: 'large',  effectLabel: 'Cures & smokes meat · +40% sale price on all meat products' },
  { id: 'bld_wool_scouring_s',   name: 'Small Wool Scouring',   category: 'production', cost: 8000,  maintenancePerDay: 3,  buildingTier: 'small',  effectLabel: 'Washes raw wool before sale · +30% sale price on all wool' },
  { id: 'bld_wool_scouring_m',   name: 'Medium Wool Scouring',  category: 'production', cost: 18000, maintenancePerDay: 6,  buildingTier: 'medium', effectLabel: 'Washes raw wool before sale · +30% sale price on all wool' },
  { id: 'bld_wool_scouring_l',   name: 'Large Wool Scouring',   category: 'production', cost: 40000, maintenancePerDay: 14, buildingTier: 'large',  effectLabel: 'Washes raw wool before sale · +30% sale price on all wool' },
];

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  animal:     '🐄 Animal Buildings',
  silo:       '🏗️ Silos',
  industrial: '🏭 Industrial Buildings',
  lab:        '🧪 Seed Lab',
  upgrade:    '⚡ Farm Upgrades',
  production: 'Production Buildings',
};
