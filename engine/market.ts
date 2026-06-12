// Daily price fluctuation: ±2% random, news events ±30%

export interface MarketPrice {
  cropId: string;
  price: number;
  basePrice: number;
}

export interface NewsEvent {
  id: string;
  description: string;
  cropId: string | null;   // null = affects all
  modifier: number;        // e.g. 1.3 or 0.7
  daysRemaining: number;
}

export function applyDailyFluctuation(price: number): number {
  const change = (Math.random() - 0.5) * 0.04; // ±2%
  return Math.max(price * (1 + change), 1);
}

export function sellRevenue(units: number, price: number): number {
  const gross = units * price;
  const tax = gross * 0.15;
  return gross - tax;
}

export interface SellPressure {
  cropId: string;
  modifier: number;   // e.g. 0.88 = -12% price
  expiresDay: number;
  source?: string;    // 'player' or rival farm name
}

/** Returns a price modifier (< 1.0) when selling a large quantity. Returns 1.0 for no effect. */
export function computeSellPressureModifier(units: number): number {
  if (units > 2000) return 0.80;
  if (units > 1000) return 0.88;
  if (units > 500)  return 0.94;
  return 1.0;
}

/** Duration (days) that the sell pressure lasts. */
export function sellPressureDuration(units: number): number {
  return Math.min(7, 3 + Math.floor(units / 1000));
}
