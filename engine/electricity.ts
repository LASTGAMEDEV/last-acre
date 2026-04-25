// engine/electricity.ts
import type { WeatherEvent, Season } from './climate';
import type { GeneratorModel, GridTier } from '../data/electricityTypes';
import {
  SOLAR_KW_PER_PANEL, SOLAR_WEATHER_MULT, SOLAR_SEASON_MULT, SOLAR_DEGRADE_PER_YEAR,
  WIND_KW_PER_TURBINE, WIND_WEATHER_MULT, WIND_DEGRADE_PER_YEAR,
  BATTERY_ROUNDTRIP_EFF, BATTERY_KWH_PER_BANK,
  BIOGAS_KW_PER_ANIMAL_UNIT, BIOGAS_MIN_ANIMAL_UNITS,
  BIOMASS_OUTPUT_KW,
  BUILDING_POWER_DRAWS,
  GENERATOR_FUEL_L_PER_KWH,
  GRID_TIER_ORDER,
} from '../data/electricityTypes';

const DAYS_PER_YEAR = 360;

export function calcSolarOutput(
  panelCount: number,
  healthPct: number,
  weather: WeatherEvent,
  season: Season,
): number {
  if (panelCount === 0) return 0;
  return (
    panelCount
    * SOLAR_KW_PER_PANEL
    * (healthPct / 100)
    * (SOLAR_WEATHER_MULT[weather] ?? 0.5)
    * SOLAR_SEASON_MULT[season]
  );
}

export function calcWindOutput(
  turbineCount: number,
  healthPct: number,
  weather: WeatherEvent,
): number {
  if (turbineCount === 0) return 0;
  return (
    turbineCount
    * WIND_KW_PER_TURBINE
    * (healthPct / 100)
    * (WIND_WEATHER_MULT[weather] ?? 0.3)
  );
}

export function calcBiogasOutput(totalAnimalUnits: number, built: boolean): number {
  if (!built || totalAnimalUnits < BIOGAS_MIN_ANIMAL_UNITS) return 0;
  return totalAnimalUnits * BIOGAS_KW_PER_ANIMAL_UNIT;
}

export function calcBiomassOutput(built: boolean, fuelDaysRemaining: number): number {
  if (!built || fuelDaysRemaining <= 0) return 0;
  return BIOMASS_OUTPUT_KW;
}

export function calcGeneratorOutput(model: GeneratorModel | null, active: boolean): number {
  if (!model || !active) return 0;
  return model === '25kw' ? 25 : model === '50kw' ? 50 : 100;
}

export function calcGeneratorFuelBurn(model: GeneratorModel): number {
  const outputKw = model === '25kw' ? 25 : model === '50kw' ? 50 : 100;
  return outputKw * GENERATOR_FUEL_L_PER_KWH;
}

export function calcTotalDemand(buildingIds: string[]): number {
  return buildingIds.reduce((sum, id) => sum + (BUILDING_POWER_DRAWS[id] ?? 0), 0);
}

// Returns [kwhUsedFromBattery, newChargeKwh]
export function dischargeForDeficit(
  deficitKwh: number,
  chargeKwh: number,
  healthPct: number,
): [number, number] {
  if (deficitKwh <= 0 || chargeKwh <= 0) return [0, chargeKwh];
  const usable = chargeKwh * (healthPct / 100);
  const used = Math.min(deficitKwh, usable);
  return [used, Math.max(0, chargeKwh - used)];
}

export function chargeFromSurplus(
  surplusKwh: number,
  chargeKwh: number,
  maxCapacityKwh: number,
): number {
  if (surplusKwh <= 0) return chargeKwh;
  return Math.min(maxCapacityKwh, chargeKwh + surplusKwh * BATTERY_ROUNDTRIP_EFF);
}

export function calcGridRateForSeason(base: number, season: Season): number {
  const mult: Record<Season, number> = { winter: 1.2, summer: 0.9, spring: 1.0, autumn: 1.05 };
  return base * mult[season];
}

// Fractional health lost per day from degradation
export function solarDegradationPerDay(): number {
  return SOLAR_DEGRADE_PER_YEAR / DAYS_PER_YEAR;
}

export function windDegradationPerDay(): number {
  return WIND_DEGRADE_PER_YEAR / DAYS_PER_YEAR;
}

export function rollOutage(weather: WeatherEvent): boolean {
  if (weather === 'wind')       return Math.random() < 0.25;
  if (weather === 'heavy_rain') return Math.random() < 0.10;
  if (weather === 'hail')       return Math.random() < 0.05;
  return false;
}

export function rollOutageDuration(): number {
  return Math.floor(Math.random() * 3) + 1;
}

export function rollLightningDamage(weather: WeatherEvent, surgeProtected: boolean): boolean {
  if (weather !== 'wind' && weather !== 'hail') return false;
  if (surgeProtected) return false;
  return Math.random() < 0.03;
}

export function nextGridTier(current: GridTier): GridTier | null {
  const idx = GRID_TIER_ORDER.indexOf(current);
  return idx < GRID_TIER_ORDER.length - 1 ? GRID_TIER_ORDER[idx + 1] : null;
}

export function prevGridTier(current: GridTier): GridTier | null {
  const idx = GRID_TIER_ORDER.indexOf(current);
  return idx > 0 ? GRID_TIER_ORDER[idx - 1] : null;
}
