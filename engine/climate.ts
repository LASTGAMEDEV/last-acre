import type { PlantedCrop } from './crops';
import type { CropType } from '../data/cropTypes';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type WeatherEvent =
  | 'sunny' | 'cloudy' | 'rain' | 'heavy_rain' | 'drought'
  | 'frost' | 'hail' | 'wind' | 'fog' | 'perfect';

export interface WeatherDay {
  event: WeatherEvent;
  climateModifier: number;
  minTemp: number;       // °C
  maxTemp: number;       // °C
  probability: number;   // 0.0–1.0 forecast accuracy; 1.0 = certain (today)
  streakDay?: number;    // 1-based day within a streak; undefined for non-streak events
}

const SEASON_DAYS = 90;

const WEATHER_MODIFIERS: Record<WeatherEvent, number> = {
  perfect:    1.2,
  sunny:      1.0,
  cloudy:     0.95,
  rain:       1.05,
  heavy_rain: 0.85,
  drought:    0.6,
  frost:      0.65,
  hail:       0.7,
  wind:       0.9,
  fog:        0.92,
};

// Temperature ranges [min_lo, min_hi, max_lo, max_hi] by season
const TEMP_RANGES: Record<Season, [number, number, number, number]> = {
  spring: [-3, 15,  8, 25],
  summer: [10, 22, 25, 40],
  autumn: [ 0, 15, 10, 25],
  winter: [-15, 5, -5, 12],
};

// Max streak length per event (min always 1)
const MAX_STREAK: Partial<Record<WeatherEvent, number>> = {
  frost:      5,
  drought:   14,
  heavy_rain: 3,
  hail:       2,
  perfect:    4,
};

// Forecast accuracy by distance (index = days ahead, 0 = today)
const FORECAST_ACCURACY = [1.0, 0.95, 0.85, 0.70, 0.70, 0.55, 0.55, 0.45];

function generateTemp(event: WeatherEvent, season: Season): { minTemp: number; maxTemp: number } {
  const [minLo, minHi, maxLo, maxHi] = TEMP_RANGES[season];
  let minTemp = minLo + Math.random() * (minHi - minLo);
  let maxTemp = maxLo + Math.random() * (maxHi - maxLo);

  // Force temperatures appropriate to event type
  if (event === 'frost') {
    minTemp = Math.min(minTemp, -0.5);           // always below freezing
    maxTemp = Math.min(maxTemp, minTemp + 10);   // cold day overall
  } else if (event === 'drought') {
    maxTemp = Math.max(maxTemp, 32);             // always hot
    minTemp = Math.max(minTemp, 12);
  } else if (event === 'perfect') {
    minTemp = 15 + Math.random() * 7;            // 15–22°C
    maxTemp = 22 + Math.random() * 6;            // 22–28°C
  } else if (event === 'heavy_rain') {
    maxTemp = Math.min(maxTemp, 20);             // cool and wet
  }

  return { minTemp: Math.round(minTemp * 10) / 10, maxTemp: Math.round(maxTemp * 10) / 10 };
}

export function getSeason(day: number): Season {
  const seasonIndex = Math.floor((day % (SEASON_DAYS * 4)) / SEASON_DAYS);
  return (['spring', 'summer', 'autumn', 'winter'] as Season[])[seasonIndex];
}

export function generateForecast(season: Season, days = 7): WeatherDay[] {
  const seasonWeights: Record<Season, Partial<Record<WeatherEvent, number>>> = {
    spring: { rain: 3, sunny: 3, cloudy: 2, perfect: 1, wind: 1 },
    summer: { sunny: 4, drought: 2, perfect: 2, hail: 1, cloudy: 1 },
    autumn: { cloudy: 3, rain: 3, wind: 2, fog: 2 },
    winter: { frost: 3, cloudy: 3, rain: 2, heavy_rain: 1, wind: 1 },
  };

  const weights = seasonWeights[season];
  const pool: WeatherEvent[] = [];
  for (const [event, weight] of Object.entries(weights)) {
    for (let i = 0; i < (weight as number); i++) pool.push(event as WeatherEvent);
  }

  const result: WeatherDay[] = [];
  let dayIndex = 0;

  while (result.length < days) {
    const event = pool[Math.floor(Math.random() * pool.length)];
    const maxLen = MAX_STREAK[event] ?? 1;
    const streakLen = maxLen > 1 ? 1 + Math.floor(Math.random() * maxLen) : 1;
    const actualLen = Math.min(streakLen, days - result.length);

    for (let s = 0; s < actualLen; s++) {
      const distanceAhead = result.length; // 0 = first slot (today+1 in a fresh forecast)
      const accuracy = FORECAST_ACCURACY[Math.min(distanceAhead, FORECAST_ACCURACY.length - 1)];
      const { minTemp, maxTemp } = generateTemp(event, season);
      result.push({
        event,
        climateModifier: WEATHER_MODIFIERS[event],
        minTemp,
        maxTemp,
        probability: accuracy,
        streakDay: actualLen > 1 ? s + 1 : undefined,
      });
    }
    dayIndex += actualLen;
  }

  return result.slice(0, days);
}

// Frost damage per day, indexed by temperature buckets
function frostDamageForTemp(minTemp: number): number {
  if (minTemp >= 0)    return 0;
  if (minTemp >= -2)   return 0.05;
  if (minTemp >= -5)   return 0.15;
  if (minTemp >= -10)  return 0.30;
  return 0.50;
}

export interface ParcelWeatherState {
  id: string;
  plantedCrop: PlantedCrop | null;
  irrigated: boolean;
  greenhouse: boolean;
}

export interface ParcelWeatherResult {
  id: string;
  plantedCrop: PlantedCrop | null;
  killed: boolean; // true if frostDamage reached ≥ 1.0 this day
}

/**
 * Apply one day of weather to all planted crops.
 * Returns updated parcels — caller is responsible for merging back into state.
 */
export function applyDailyWeather(
  parcels: ParcelWeatherState[],
  weather: WeatherDay,
  cropTypes: CropType[],
): ParcelWeatherResult[] {
  return parcels.map(parcel => {
    if (!parcel.plantedCrop || parcel.greenhouse) {
      return { id: parcel.id, plantedCrop: parcel.plantedCrop, killed: false };
    }

    const crop = parcel.plantedCrop;
    const cropType = cropTypes.find(ct => ct.id === crop.cropId);
    if (!cropType) return { id: parcel.id, plantedCrop: crop, killed: false };

    let moistureLevel = crop.moistureLevel ?? 0.7;
    let frostDamage   = crop.frostDamage   ?? 0;
    let droughtStress = crop.droughtStress  ?? 0;

    // ── Moisture update ──────────────────────────────────────────────────────
    const irrigated = parcel.irrigated;
    let moistureDelta = 0;
    switch (weather.event) {
      case 'rain':       moistureDelta = 0.15 + Math.random() * 0.05; break;
      case 'heavy_rain': moistureDelta = 0.25; break;
      case 'drought':    moistureDelta = irrigated ? -0.01 : -0.08;   break;
      case 'sunny':      moistureDelta = irrigated ? -0.01 : -0.03;   break;
      default:           moistureDelta = irrigated ? 0    : -0.01;    break;
    }
    moistureLevel = Math.max(0, Math.min(1, moistureLevel + moistureDelta));

    // ── Frost damage accumulation ─────────────────────────────────────────────
    if (weather.event === 'frost') {
      const effectiveKillTemp = cropType.frostKillTemp;
      if (weather.minTemp < 0) {
        const rawDamage = frostDamageForTemp(weather.minTemp);
        if (weather.minTemp < effectiveKillTemp + 5) {
          frostDamage = Math.min(1.0, frostDamage + rawDamage);
        }
      }
    } else {
      // Slight recovery when not freezing
      frostDamage = Math.max(0, frostDamage - 0.02);
    }

    // ── Drought stress accumulation ───────────────────────────────────────────
    if (moistureLevel < 0.3) {
      const rawStress = moistureLevel < 0.1 ? 0.10 : moistureLevel < 0.2 ? 0.05 : 0.02;
      const stressRate = rawStress * (1 - cropType.droughtTolerance);
      droughtStress = Math.min(1.0, droughtStress + stressRate);
    } else {
      // Recovery when moisture is good
      droughtStress = Math.max(0, droughtStress - 0.01);
    }

    const killed = frostDamage >= 1.0;

    return {
      id: parcel.id,
      plantedCrop: killed ? null : {
        ...crop,
        frostDamage,
        droughtStress,
        moistureLevel,
      },
      killed,
    };
  });
}
