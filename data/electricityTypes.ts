// data/electricityTypes.ts
import type { Season } from '../engine/climate';
import type { WeatherEvent } from '../engine/climate';

export type GridTier = 'basic' | 'standard' | 'industrial' | 'heavy';
export type GeneratorModel = '25kw' | '50kw' | '100kw';

export interface GridTierConfig {
  id: GridTier;
  label: string;
  maxImportKw: number;
  upgradeCost: number;
}

export const GRID_TIER_CONFIG: Record<GridTier, GridTierConfig> = {
  basic:      { id: 'basic',      label: 'Basic',            maxImportKw:    50, upgradeCost:      0 },
  standard:   { id: 'standard',   label: 'Standard',         maxImportKw:   150, upgradeCost:  8_000 },
  industrial: { id: 'industrial', label: 'Industrial',       maxImportKw:   400, upgradeCost: 25_000 },
  heavy:      { id: 'heavy',      label: 'Heavy Industrial', maxImportKw: 1_000, upgradeCost: 80_000 },
};

export const GRID_TIER_ORDER: GridTier[] = ['basic', 'standard', 'industrial', 'heavy'];

export interface GeneratorConfig {
  model: GeneratorModel;
  label: string;
  outputKw: number;
  purchaseCost: number;
  tankCapacityLitres: number;
}

export const GENERATOR_CONFIG: Record<GeneratorModel, GeneratorConfig> = {
  '25kw':  { model: '25kw',  label: '25 kW',  outputKw:  25, purchaseCost:  5_000, tankCapacityLitres: 200 },
  '50kw':  { model: '50kw',  label: '50 kW',  outputKw:  50, purchaseCost: 10_000, tankCapacityLitres: 400 },
  '100kw': { model: '100kw', label: '100 kW', outputKw: 100, purchaseCost: 18_000, tankCapacityLitres: 800 },
};

// Building power draws in kW (per active day)
export const BUILDING_POWER_DRAWS: Partial<Record<string, number>> = {
  bld_gallinero_s:      2,
  bld_gallinero_m:      3,
  bld_gallinero_l:      5,
  bld_establo_s:        2,
  bld_establo_m:        4,
  bld_establo_l:        6,
  bld_caballeriza_s:    2,
  bld_caballeriza_m:    3,
  bld_caballeriza_l:    5,
  bld_pocilga:          2,
  bld_pocilga_m:        3,
  bld_pocilga_l:        5,
  bld_corral:           2,
  bld_corral_m:         3,
  bld_corral_l:         5,
  bld_colmena:          0.5,
  bld_colmena_m:        1,
  bld_colmena_l:        2,
  bld_conejera:         1,
  bld_conejera_m:       2,
  bld_conejera_l:       3,
  bld_greenhouse_s:     5,
  bld_greenhouse_m:    12,
  bld_greenhouse_l:    22,
  bld_silo_s:           0.5,
  bld_silo_m:           1,
  bld_silo_l:           1.5,
  bld_silo_xl:          2,
  bld_almacen:          1,
  bld_cold_storage:     8,
  bld_taller:           3,
  bld_granero:          1,
  bld_agua:            12,
  bld_biodigestor:      2,
  bld_secadero:         6,
  bld_oficina:          2,
  bld_shelter:          1,
  bld_henil:            1,
  bld_bodega:           5,
  bld_molino:          18,
  bld_prensa:          14,
  bld_lacteo:          22,
  bld_procesadora:     15,
  bld_seed_lab_1:       4,
  bld_seed_lab_2:       6,
  bld_seed_lab_3:       8,
  bld_research_station: 10,
  bld_hydroponic_lab:  15,
  bld_smart_irrigation: 12,
  bld_solar_array:      0,
  bld_export_terminal:  5,
  bld_fuel_tank_s:      0,
  bld_fuel_tank_l:      0,
};

// Solar sun multipliers by weather event
export const SOLAR_WEATHER_MULT: Record<WeatherEvent, number> = {
  perfect:    1.0,
  sunny:      1.0,
  drought:    1.0,
  wind:       0.8,
  frost:      0.7,
  cloudy:     0.35,
  fog:        0.3,
  rain:       0.2,
  hail:       0.2,
  heavy_rain: 0.1,
};

// Solar season multipliers
export const SOLAR_SEASON_MULT: Record<Season, number> = {
  summer: 1.0,
  spring: 0.8,
  autumn: 0.7,
  winter: 0.6,
};

// Wind multipliers by weather event
export const WIND_WEATHER_MULT: Record<WeatherEvent, number> = {
  wind:       1.2,
  heavy_rain: 0.8,
  hail:       0.8,
  rain:       0.6,
  cloudy:     0.5,
  frost:      0.5,
  perfect:    0.3,
  sunny:      0.3,
  fog:        0.2,
  drought:    0.1,
};

export const SOLAR_KW_PER_PANEL       = 0.4;
export const SOLAR_COST_PER_PANEL     = 300;
export const SOLAR_GRANT_PCT          = 0.15;
export const SOLAR_DEGRADE_PER_YEAR   = 1.5;   // % per year
export const SOLAR_SERVICE_INTERVAL_Y = 3;
export const SOLAR_SERVICE_COST       = 200;

export const WIND_KW_PER_TURBINE       = 5;
export const WIND_COST_PER_TURBINE     = 2_000;
export const WIND_GRANT_PCT            = 0.15;
export const WIND_DEGRADE_PER_YEAR     = 1.0;   // % per year
export const WIND_SERVICE_INTERVAL_Y   = 2;
export const WIND_SERVICE_COST         = 300;

export const BATTERY_KWH_PER_BANK      = 50;
export const BATTERY_COST_PER_BANK     = 8_000;
export const BATTERY_ROUNDTRIP_EFF     = 0.85;
export const BATTERY_REPLACE_YEARS     = 7;
export const BATTERY_SERVICE_COST      = 500;

export const BIOGAS_KW_PER_ANIMAL_UNIT = 0.8;
export const BIOGAS_MIN_ANIMAL_UNITS   = 10;
export const BIOGAS_BUILD_COST         = 8_000;

export const BIOMASS_OUTPUT_KW         = 15;
export const BIOMASS_BUILD_COST        = 12_000;
export const BIOMASS_FUEL_SEASON_DAYS  = 90;

export const HEAT_PIPE_BUILD_COST      = 5_000;

export const GRID_RATE_BASE            = 0.14;  // $/kWh
export const GENERATOR_FUEL_L_PER_KWH = 0.3;
export const SURGE_PROTECTOR_COST      = 500;

// Pending grant type
export interface PendingGrant {
  amount: number;
  dueDay: number;
  label: string;
}
