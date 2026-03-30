export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type WeatherEvent =
  | 'sunny' | 'cloudy' | 'rain' | 'heavy_rain' | 'drought'
  | 'frost' | 'hail' | 'wind' | 'fog' | 'perfect';

export interface WeatherDay {
  event: WeatherEvent;
  climateModifier: number;
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

  return Array.from({ length: days }, () => {
    const event = pool[Math.floor(Math.random() * pool.length)];
    return { event, climateModifier: WEATHER_MODIFIERS[event] };
  });
}
