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
  effectLabel: string;
  applicableBuildingPrefixes: string[];  // e.g. ['milking_parlour'] matches any building whose typeId starts with 'milking_parlour'
}

export const PRODUCTION_EQUIPMENT: EquipmentItem[] = [
  // Dairy buildings
  { id: 'eq_auto_cluster',       name: 'Automatic Cluster Milker',  cost: 4500,  effectLabel: '+20% milking capacity',           applicableBuildingPrefixes: ['milking_parlour', 'goat_milking', 'buffalo_dairy'] },
  { id: 'eq_milk_analyser',      name: 'Milk Analyser',             cost: 3200,  effectLabel: '+10 hygiene for milk grade check', applicableBuildingPrefixes: ['milking_parlour', 'goat_milking', 'buffalo_dairy'] },
  { id: 'eq_refrigerated_pipe',  name: 'Refrigerated Pipeline',     cost: 2800,  effectLabel: 'Reduces milk spoilage',            applicableBuildingPrefixes: ['milking_parlour', 'goat_milking', 'buffalo_dairy'] },
  // Shearing
  { id: 'eq_electric_shears',    name: 'Electric Shears',           cost: 1800,  effectLabel: '+25% shearing capacity',          applicableBuildingPrefixes: ['shearing_shed'] },
  { id: 'eq_wool_press',         name: 'Wool Press',                cost: 2200,  effectLabel: '+10% wool yield per animal',      applicableBuildingPrefixes: ['shearing_shed'] },
  { id: 'eq_lanolin_extractor',  name: 'Lanolin Extractor',         cost: 3500,  effectLabel: 'Enables lanolin by-product',      applicableBuildingPrefixes: ['shearing_shed'] },
  // Poultry (egg)
  { id: 'eq_auto_belt',          name: 'Automated Egg Belt',        cost: 2500,  effectLabel: '+30% egg collection capacity',    applicableBuildingPrefixes: ['egg_collection', 'duck_egg', 'quail_egg'] },
  { id: 'eq_egg_grader',         name: 'Egg Grader',                cost: 1600,  effectLabel: 'Sorts by size/quality grade',     applicableBuildingPrefixes: ['egg_collection', 'duck_egg', 'quail_egg'] },
  { id: 'eq_uv_sanitiser',       name: 'UV Sanitiser',              cost: 1200,  effectLabel: 'Slows hygiene decay by 30%',      applicableBuildingPrefixes: ['egg_collection', 'duck_egg', 'quail_egg', 'milking_parlour', 'goat_milking', 'buffalo_dairy', 'pig_butchery', 'rabbit_butchery'] },
  // Butchery
  { id: 'eq_vacuum_packer',      name: 'Vacuum Packer',             cost: 2000,  effectLabel: '+10% meat shelf life / value',    applicableBuildingPrefixes: ['pig_butchery', 'rabbit_butchery'] },
  { id: 'eq_bone_saw',           name: 'Bone Saw',                  cost: 1400,  effectLabel: '+15% carcass yield',              applicableBuildingPrefixes: ['pig_butchery', 'rabbit_butchery'] },
  { id: 'eq_smoke_unit',         name: 'Smoking Unit',              cost: 3000,  effectLabel: 'Enables smoked product variant',  applicableBuildingPrefixes: ['pig_butchery', 'rabbit_butchery'] },
  // Honey
  { id: 'eq_uncapping_machine',  name: 'Uncapping Machine',         cost: 1800,  effectLabel: '+20% honey extraction speed',     applicableBuildingPrefixes: ['honey_extraction'] },
  { id: 'eq_centrifugal_extractor', name: 'Centrifugal Extractor',  cost: 2600,  effectLabel: '+15% honey yield per hive',       applicableBuildingPrefixes: ['honey_extraction'] },
  { id: 'eq_wax_press',          name: 'Wax Press',                 cost: 1500,  effectLabel: 'Enables beeswax by-product',      applicableBuildingPrefixes: ['honey_extraction'] },
];

export const BUILDING_TYPES: BuildingType[] = [
  // ── Animal Buildings ───────────────────────────────────────────
  // ── Poultry (gallinero) ────────────────────────────────────────
  {
    id: 'bld_gallinero_s',
    name: 'Small Poultry House',
    category: 'animal',
    cost: 2000,
    maintenancePerDay: 2,
    capacity: 30,
    effectLabel: '30 birds · one species only',
  },
  {
    id: 'bld_gallinero_m',
    name: 'Medium Poultry House',
    category: 'animal',
    cost: 9000,
    maintenancePerDay: 7,
    capacity: 120,
    effectLabel: '120 birds · one species only',
  },
  {
    id: 'bld_gallinero_l',
    name: 'Large Poultry House',
    category: 'animal',
    cost: 28000,
    maintenancePerDay: 18,
    capacity: 400,
    effectLabel: '400 birds · one species only',
  },
  // ── Cattle Barn (establo) ─────────────────────────────────────
  {
    id: 'bld_establo_s',
    name: 'Small Cattle Barn',
    category: 'animal',
    cost: 8000,
    maintenancePerDay: 8,
    capacity: 12,
    effectLabel: '12 cows or buffalo · one species only',
  },
  {
    id: 'bld_establo_m',
    name: 'Medium Cattle Barn',
    category: 'animal',
    cost: 24000,
    maintenancePerDay: 20,
    capacity: 35,
    effectLabel: '35 cows or buffalo · one species only',
  },
  {
    id: 'bld_establo_l',
    name: 'Large Cattle Barn',
    category: 'animal',
    cost: 65000,
    maintenancePerDay: 45,
    capacity: 100,
    effectLabel: '100 cows or buffalo · one species only',
  },
  // ── Horse Stable (caballeriza) ────────────────────────────────
  {
    id: 'bld_caballeriza_s',
    name: 'Small Horse Stable',
    category: 'animal',
    cost: 12000,
    maintenancePerDay: 10,
    capacity: 6,
    effectLabel: '6 horses',
  },
  {
    id: 'bld_caballeriza_m',
    name: 'Medium Horse Stable',
    category: 'animal',
    cost: 32000,
    maintenancePerDay: 22,
    capacity: 15,
    effectLabel: '15 horses',
  },
  {
    id: 'bld_caballeriza_l',
    name: 'Large Horse Stable',
    category: 'animal',
    cost: 80000,
    maintenancePerDay: 45,
    capacity: 40,
    effectLabel: '40 horses',
  },
  // ── Pigsty (pocilga) ──────────────────────────────────────────
  {
    id: 'bld_pocilga',
    name: 'Small Pigsty',
    category: 'animal',
    cost: 4500,
    maintenancePerDay: 5,
    capacity: 30,
    effectLabel: '30 pigs',
  },
  {
    id: 'bld_pocilga_m',
    name: 'Medium Pigsty',
    category: 'animal',
    cost: 14000,
    maintenancePerDay: 13,
    capacity: 100,
    effectLabel: '100 pigs',
  },
  {
    id: 'bld_pocilga_l',
    name: 'Large Pigsty',
    category: 'animal',
    cost: 38000,
    maintenancePerDay: 30,
    capacity: 300,
    effectLabel: '300 pigs',
  },
  // ── Paddock (corral) ──────────────────────────────────────────
  {
    id: 'bld_corral',
    name: 'Small Paddock',
    category: 'animal',
    cost: 3500,
    maintenancePerDay: 4,
    capacity: 40,
    effectLabel: '40 animals · one species only',
  },
  {
    id: 'bld_corral_m',
    name: 'Medium Paddock',
    category: 'animal',
    cost: 12000,
    maintenancePerDay: 11,
    capacity: 130,
    effectLabel: '130 animals · one species only',
  },
  {
    id: 'bld_corral_l',
    name: 'Large Paddock',
    category: 'animal',
    cost: 32000,
    maintenancePerDay: 25,
    capacity: 400,
    effectLabel: '400 animals · one species only',
  },
  // ── Apiary (colmena) ──────────────────────────────────────────
  {
    id: 'bld_colmena',
    name: 'Small Apiary',
    category: 'animal',
    cost: 1200,
    maintenancePerDay: 1,
    capacity: 15,
    effectLabel: '15 bee hives',
  },
  {
    id: 'bld_colmena_m',
    name: 'Medium Apiary',
    category: 'animal',
    cost: 4500,
    maintenancePerDay: 3,
    capacity: 40,
    effectLabel: '40 bee hives',
  },
  {
    id: 'bld_colmena_l',
    name: 'Large Apiary',
    category: 'animal',
    cost: 12000,
    maintenancePerDay: 7,
    capacity: 100,
    effectLabel: '100 bee hives',
  },
  // ── Rabbit Hutch (conejera) ───────────────────────────────────
  {
    id: 'bld_conejera',
    name: 'Small Rabbit Hutch',
    category: 'animal',
    cost: 1800,
    maintenancePerDay: 2,
    capacity: 60,
    effectLabel: '60 rabbits',
  },
  {
    id: 'bld_conejera_m',
    name: 'Medium Rabbit Hutch',
    category: 'animal',
    cost: 6500,
    maintenancePerDay: 5,
    capacity: 200,
    effectLabel: '200 rabbits',
  },
  {
    id: 'bld_conejera_l',
    name: 'Large Rabbit Hutch',
    category: 'animal',
    cost: 18000,
    maintenancePerDay: 12,
    capacity: 600,
    effectLabel: '600 rabbits',
  },

  // ── Greenhouses ───────────────────────────────────────────────
  {
    id: 'bld_greenhouse_s',
    name: 'Small Greenhouse',
    category: 'industrial',
    cost: 15000,
    maintenancePerDay: 8,
    capacity: 5,
    effectLabel: '5 greenhouse slots — crops grow any season, protected from weather',
  },
  {
    id: 'bld_greenhouse_m',
    name: 'Medium Greenhouse',
    category: 'industrial',
    cost: 40000,
    maintenancePerDay: 18,
    capacity: 15,
    effectLabel: '15 greenhouse slots — crops grow any season, protected from weather',
  },
  {
    id: 'bld_greenhouse_l',
    name: 'Large Greenhouse',
    category: 'industrial',
    cost: 100000,
    maintenancePerDay: 40,
    capacity: 40,
    effectLabel: '40 greenhouse slots — crops grow any season, protected from weather',
  },

  // ── Silos ──────────────────────────────────────────────────────
  {
    id: 'bld_silo_s',
    name: 'Small Silo',
    category: 'silo',
    cost: 5000,
    maintenancePerDay: 1,
    capacity: 50000,
    effectLabel: 'Stores up to 50,000 kg/L',
  },
  {
    id: 'bld_silo_m',
    name: 'Medium Silo',
    category: 'silo',
    cost: 18000,
    maintenancePerDay: 3,
    capacity: 200000,
    effectLabel: 'Stores up to 200,000 kg/L',
  },
  {
    id: 'bld_silo_l',
    name: 'Large Silo',
    category: 'silo',
    cost: 50000,
    maintenancePerDay: 7,
    capacity: 600000,
    effectLabel: 'Stores up to 600,000 kg/L',
  },
  {
    id: 'bld_silo_xl',
    name: 'Industrial Silo',
    category: 'silo',
    cost: 120000,
    maintenancePerDay: 15,
    capacity: 2000000,
    effectLabel: 'Stores up to 2,000,000 kg/L',
  },

  // ── Industrial Buildings ───────────────────────────────────────
  {
    id: 'bld_almacen',
    name: 'General Warehouse',
    category: 'industrial',
    cost: 7000,
    maintenancePerDay: 3,
    effectLabel: '-10% machine purchase cost',
  },
  {
    id: 'bld_taller',
    name: 'Mechanical Workshop',
    category: 'industrial',
    cost: 14000,
    maintenancePerDay: 5,
    effectLabel: 'Reduces machine maintenance by 25%',
  },
  {
    id: 'bld_granero',
    name: 'Barn',
    category: 'industrial',
    cost: 8000,
    maintenancePerDay: 2,
    effectLabel: '+20% animal daily production',
  },
  {
    id: 'bld_agua',
    name: 'Water Tower',
    category: 'industrial',
    cost: 12000,
    maintenancePerDay: 3,
    effectLabel: '+5% crop yield on all harvests',
  },
  {
    id: 'bld_biodigestor',
    name: 'Biodigester',
    category: 'industrial',
    cost: 22000,
    maintenancePerDay: 6,
    effectLabel: 'Converts waste into free fertilizer',
  },
  {
    id: 'bld_secadero',
    name: 'Grain Dryer',
    category: 'industrial',
    cost: 16000,
    maintenancePerDay: 4,
    effectLabel: 'Prevents post-harvest losses, +5% sell price',
  },
  {
    id: 'bld_oficina',
    name: 'Administrative Office',
    category: 'industrial',
    cost: 18000,
    maintenancePerDay: 4,
    effectLabel: '+5% contract delivery revenue',
  },

  // ── Winery ─────────────────────────────────────────────────────
  {
    id: 'bld_bodega',
    name: 'Winery',
    category: 'industrial',
    cost: 38000,
    maintenancePerDay: 9,
    effectLabel: 'Ferments grapes into wine',
  },

  // ── Processing Plants ──────────────────────────────────────────
  {
    id: 'bld_molino',
    name: 'Flour Mill',
    category: 'industrial',
    cost: 18000,
    maintenancePerDay: 5,
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

  // ── Production Buildings ─────────────────────────────────────────────────
  // Milking Parlour (vaca / cow)
  { id: 'milking_parlour_s', name: 'Milking Parlour S', category: 'production', cost: 15000,  maintenancePerDay: 5,  effectLabel: 'Milks up to 12 cows/day',  description: 'Small milking parlour — 12 cows/day', animalTypeId: 'vaca',  dailyCapacity: 12, buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'milking_parlour_m', name: 'Milking Parlour M', category: 'production', cost: 38000,  maintenancePerDay: 12, effectLabel: 'Milks up to 30 cows/day',  description: 'Medium milking parlour — 30 cows/day', animalTypeId: 'vaca',  dailyCapacity: 30, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'milking_parlour_l', name: 'Milking Parlour L', category: 'production', cost: 85000,  maintenancePerDay: 25, effectLabel: 'Milks up to 60 cows/day',  description: 'Large milking parlour — 60 cows/day',  animalTypeId: 'vaca',  dailyCapacity: 60, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Goat Milking Stand (cabra / goat)
  { id: 'goat_milking_s',    name: 'Goat Milking Stand S', category: 'production', cost: 10000, maintenancePerDay: 3,  effectLabel: 'Milks up to 18 goats/day',  description: 'Small goat milking stand — 18 goats/day', animalTypeId: 'cabra', dailyCapacity: 18, buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'goat_milking_m',    name: 'Goat Milking Stand M', category: 'production', cost: 25000, maintenancePerDay: 8,  effectLabel: 'Milks up to 45 goats/day',  description: 'Medium goat milking stand — 45 goats/day', animalTypeId: 'cabra', dailyCapacity: 45, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'goat_milking_l',    name: 'Goat Milking Stand L', category: 'production', cost: 60000, maintenancePerDay: 18, effectLabel: 'Milks up to 90 goats/day',  description: 'Large goat milking stand — 90 goats/day',  animalTypeId: 'cabra', dailyCapacity: 90, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Buffalo Dairy (bufalo / buffalo)
  { id: 'buffalo_dairy_s',   name: 'Buffalo Dairy S', category: 'production', cost: 18000,  maintenancePerDay: 6,  effectLabel: 'Milks up to 10 buffalo/day',  description: 'Small buffalo dairy — 10 buffalo/day', animalTypeId: 'bufalo', dailyCapacity: 10, buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'buffalo_dairy_m',   name: 'Buffalo Dairy M', category: 'production', cost: 45000,  maintenancePerDay: 15, effectLabel: 'Milks up to 25 buffalo/day',  description: 'Medium buffalo dairy — 25 buffalo/day', animalTypeId: 'bufalo', dailyCapacity: 25, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'buffalo_dairy_l',   name: 'Buffalo Dairy L', category: 'production', cost: 110000, maintenancePerDay: 30, effectLabel: 'Milks up to 50 buffalo/day',  description: 'Large buffalo dairy — 50 buffalo/day',  animalTypeId: 'bufalo', dailyCapacity: 50, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Shearing Shed (oveja / sheep)
  { id: 'shearing_shed_s',   name: 'Shearing Shed S', category: 'production', cost: 12000,  maintenancePerDay: 4,  effectLabel: 'Shears up to 15 sheep/day',  description: 'Small shearing shed — 15 sheep/day', animalTypeId: 'oveja', dailyCapacity: 15, buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'shearing_shed_m',   name: 'Shearing Shed M', category: 'production', cost: 30000,  maintenancePerDay: 10, effectLabel: 'Shears up to 38 sheep/day',  description: 'Medium shearing shed — 38 sheep/day', animalTypeId: 'oveja', dailyCapacity: 38, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'shearing_shed_l',   name: 'Shearing Shed L', category: 'production', cost: 70000,  maintenancePerDay: 22, effectLabel: 'Shears up to 75 sheep/day',  description: 'Large shearing shed — 75 sheep/day',  animalTypeId: 'oveja', dailyCapacity: 75, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Egg Collection House (gallina / chicken)
  { id: 'egg_collection_s',  name: 'Egg Collection House S', category: 'production', cost: 8000,   maintenancePerDay: 3,  effectLabel: 'Collects eggs from up to 80 chickens/day',  description: 'Small egg house — 80 chickens/day',  animalTypeId: 'gallina', dailyCapacity: 80,  buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'egg_collection_m',  name: 'Egg Collection House M', category: 'production', cost: 20000,  maintenancePerDay: 8,  effectLabel: 'Collects eggs from up to 200 chickens/day', description: 'Medium egg house — 200 chickens/day', animalTypeId: 'gallina', dailyCapacity: 200, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'egg_collection_l',  name: 'Egg Collection House L', category: 'production', cost: 50000,  maintenancePerDay: 18, effectLabel: 'Collects eggs from up to 400 chickens/day', description: 'Large egg house — 400 chickens/day',  animalTypeId: 'gallina', dailyCapacity: 400, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Duck Egg House (pato / duck)
  { id: 'duck_egg_s',        name: 'Duck Egg House S', category: 'production', cost: 8000,   maintenancePerDay: 3,  effectLabel: 'Collects eggs from up to 60 ducks/day',  description: 'Small duck egg house — 60 ducks/day',  animalTypeId: 'pato', dailyCapacity: 60,  buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'duck_egg_m',        name: 'Duck Egg House M', category: 'production', cost: 20000,  maintenancePerDay: 8,  effectLabel: 'Collects eggs from up to 150 ducks/day', description: 'Medium duck egg house — 150 ducks/day', animalTypeId: 'pato', dailyCapacity: 150, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'duck_egg_l',        name: 'Duck Egg House L', category: 'production', cost: 50000,  maintenancePerDay: 18, effectLabel: 'Collects eggs from up to 300 ducks/day', description: 'Large duck egg house — 300 ducks/day',  animalTypeId: 'pato', dailyCapacity: 300, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Quail Egg Station (codorniz / quail)
  { id: 'quail_egg_s',       name: 'Quail Egg Station S', category: 'production', cost: 8000,   maintenancePerDay: 3,  effectLabel: 'Collects eggs from up to 120 quail/day',  description: 'Small quail station — 120 quail/day',  animalTypeId: 'codorniz', dailyCapacity: 120, buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'quail_egg_m',       name: 'Quail Egg Station M', category: 'production', cost: 20000,  maintenancePerDay: 8,  effectLabel: 'Collects eggs from up to 300 quail/day', description: 'Medium quail station — 300 quail/day', animalTypeId: 'codorniz', dailyCapacity: 300, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'quail_egg_l',       name: 'Quail Egg Station L', category: 'production', cost: 50000,  maintenancePerDay: 18, effectLabel: 'Collects eggs from up to 600 quail/day', description: 'Large quail station — 600 quail/day',  animalTypeId: 'codorniz', dailyCapacity: 600, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Pig Butchery (cerdo / pig)
  { id: 'pig_butchery_s',    name: 'Pig Butchery S', category: 'production', cost: 14000,  maintenancePerDay: 5,  effectLabel: 'Processes up to 8 pigs/session',  description: 'Small pig butchery — 8/session',  animalTypeId: 'cerdo', dailyCapacity: 8,  buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'pig_butchery_m',    name: 'Pig Butchery M', category: 'production', cost: 35000,  maintenancePerDay: 12, effectLabel: 'Processes up to 20 pigs/session', description: 'Medium pig butchery — 20/session', animalTypeId: 'cerdo', dailyCapacity: 20, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'pig_butchery_l',    name: 'Pig Butchery L', category: 'production', cost: 80000,  maintenancePerDay: 25, effectLabel: 'Processes up to 40 pigs/session', description: 'Large pig butchery — 40/session',  animalTypeId: 'cerdo', dailyCapacity: 40, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Rabbit Butchery (conejo / rabbit)
  { id: 'rabbit_butchery_s', name: 'Rabbit Butchery S', category: 'production', cost: 10000, maintenancePerDay: 4,  effectLabel: 'Processes up to 12 rabbits/session', description: 'Small rabbit butchery — 12/session', animalTypeId: 'conejo', dailyCapacity: 12, buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'rabbit_butchery_m', name: 'Rabbit Butchery M', category: 'production', cost: 25000, maintenancePerDay: 10, effectLabel: 'Processes up to 30 rabbits/session', description: 'Medium rabbit butchery — 30/session', animalTypeId: 'conejo', dailyCapacity: 30, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'rabbit_butchery_l', name: 'Rabbit Butchery L', category: 'production', cost: 60000, maintenancePerDay: 20, effectLabel: 'Processes up to 60 rabbits/session', description: 'Large rabbit butchery — 60/session',  animalTypeId: 'conejo', dailyCapacity: 60, buildingTier: 'large',  equipmentSlotCount: 3 },
  // Honey Extraction Suite (abeja / bees)
  { id: 'honey_extraction_s', name: 'Honey Extraction Suite S', category: 'production', cost: 12000, maintenancePerDay: 4,  effectLabel: 'Extracts honey from up to 5 hives/harvest',  description: 'Small extraction suite — 5 hives/harvest',  animalTypeId: 'abeja', dailyCapacity: 5,  buildingTier: 'small',  equipmentSlotCount: 2 },
  { id: 'honey_extraction_m', name: 'Honey Extraction Suite M', category: 'production', cost: 30000, maintenancePerDay: 10, effectLabel: 'Extracts honey from up to 12 hives/harvest', description: 'Medium extraction suite — 12 hives/harvest', animalTypeId: 'abeja', dailyCapacity: 12, buildingTier: 'medium', equipmentSlotCount: 3 },
  { id: 'honey_extraction_l', name: 'Honey Extraction Suite L', category: 'production', cost: 70000, maintenancePerDay: 22, effectLabel: 'Extracts honey from up to 25 hives/harvest', description: 'Large extraction suite — 25 hives/harvest',  animalTypeId: 'abeja', dailyCapacity: 25, buildingTier: 'large',  equipmentSlotCount: 3 },
];

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  animal:     '🐄 Animal Buildings',
  silo:       '🏗️ Silos',
  industrial: '🏭 Industrial Buildings',
  lab:        '🧪 Seed Lab',
  upgrade:    '⚡ Farm Upgrades',
  production: 'Production Buildings',
};
