// data/historicalPrices.ts
// Year-indexed commodity baseline prices.
// These are calibrated to the game's internal price scale (same as COMMODITY_BASELINES in data/prices.ts).
// Event multipliers from the timeline engine stack on top of these.

type CommodityBaselines = {
  wheat: number;
  corn: number;
  soy: number;
  milk: number;
  meat: number;
  wool: number;
  fuel: number;
};

// Prices indexed by calendar year (1970–2026).
// Interpolate between years for smooth transitions.
const PRICE_TABLE: Record<number, CommodityBaselines> = {
  1970: { wheat: 0.25, corn: 0.19, soy: 0.49, milk: 0.45, meat: 4.5, wool: 3.2, fuel: 1.2 },
  1971: { wheat: 0.262, corn: 0.197, soy: 0.506, milk: 0.462, meat: 4.582, wool: 3.2, fuel: 1.2 },
  1972: { wheat: 0.274, corn: 0.204, soy: 0.531, milk: 0.474, meat: 4.705, wool: 3.316, fuel: 1.267 },
  1973: { wheat: 0.476, corn: 0.38, soy: 0.98, milk: 0.497, meat: 5.114, wool: 3.491, fuel: 1.867 },
  1974: { wheat: 0.417, corn: 0.339, soy: 0.898, milk: 0.545, meat: 5.318, wool: 3.607, fuel: 2.267 },
  1975: { wheat: 0.345, corn: 0.271, soy: 0.735, milk: 0.568, meat: 5.236, wool: 3.491, fuel: 2.133 },
  1976: { wheat: 0.327, corn: 0.258, soy: 0.694, milk: 0.58, meat: 5.318, wool: 3.549, fuel: 2.067 },
  1977: { wheat: 0.298, corn: 0.237, soy: 0.653, milk: 0.592, meat: 5.236, wool: 3.491, fuel: 2.0 },
  1978: { wheat: 0.31, corn: 0.244, soy: 0.67, milk: 0.616, meat: 5.4, wool: 3.607, fuel: 2.067 },
  1979: { wheat: 0.321, corn: 0.251, soy: 0.686, milk: 0.639, meat: 5.523, wool: 3.665, fuel: 3.0 },
  1980: { wheat: 0.226, corn: 0.197, soy: 0.572, milk: 0.651, meat: 5.318, wool: 3.665, fuel: 3.333 },
  1981: { wheat: 0.214, corn: 0.19, soy: 0.555, milk: 0.663, meat: 5.236, wool: 3.607, fuel: 3.467 },
  1982: { wheat: 0.202, corn: 0.176, soy: 0.531, milk: 0.639, meat: 5.114, wool: 3.491, fuel: 3.2 },
  1983: { wheat: 0.196, corn: 0.17, soy: 0.506, milk: 0.628, meat: 4.991, wool: 3.433, fuel: 3.0 },
  1984: { wheat: 0.208, corn: 0.183, soy: 0.523, milk: 0.639, meat: 5.073, wool: 3.491, fuel: 2.933 },
  1985: { wheat: 0.179, corn: 0.163, soy: 0.474, milk: 0.616, meat: 4.705, wool: 3.316, fuel: 2.533 },
  1986: { wheat: 0.167, corn: 0.149, soy: 0.441, milk: 0.592, meat: 4.295, wool: 3.142, fuel: 1.867 },
  1987: { wheat: 0.179, corn: 0.156, soy: 0.457, milk: 0.592, meat: 4.418, wool: 3.2, fuel: 1.933 },
  1988: { wheat: 0.226, corn: 0.204, soy: 0.555, milk: 0.616, meat: 4.705, wool: 3.316, fuel: 2.0 },
  1989: { wheat: 0.214, corn: 0.197, soy: 0.539, milk: 0.628, meat: 4.827, wool: 3.375, fuel: 2.067 },
  1990: { wheat: 0.202, corn: 0.19, soy: 0.523, milk: 0.639, meat: 4.909, wool: 3.433, fuel: 2.333 },
  1991: { wheat: 0.208, corn: 0.19, soy: 0.531, milk: 0.639, meat: 4.909, wool: 3.433, fuel: 2.133 },
  1992: { wheat: 0.214, corn: 0.197, soy: 0.539, milk: 0.651, meat: 4.991, wool: 3.491, fuel: 2.067 },
  1993: { wheat: 0.22, corn: 0.197, soy: 0.547, milk: 0.651, meat: 4.991, wool: 3.491, fuel: 2.067 },
  1994: { wheat: 0.226, corn: 0.204, soy: 0.555, milk: 0.663, meat: 5.073, wool: 3.549, fuel: 2.133 },
  1995: { wheat: 0.268, corn: 0.244, soy: 0.637, milk: 0.687, meat: 5.318, wool: 3.724, fuel: 2.267 },
  1996: { wheat: 0.357, corn: 0.326, soy: 0.817, milk: 0.711, meat: 4.295, wool: 3.782, fuel: 2.4 },
  1997: { wheat: 0.298, corn: 0.271, soy: 0.719, milk: 0.711, meat: 4.582, wool: 3.782, fuel: 2.333 },
  1998: { wheat: 0.25, corn: 0.231, soy: 0.621, milk: 0.687, meat: 4.5, wool: 3.665, fuel: 2.0 },
  1999: { wheat: 0.238, corn: 0.217, soy: 0.588, milk: 0.675, meat: 4.418, wool: 3.607, fuel: 1.867 },
  2000: { wheat: 0.25, corn: 0.231, soy: 0.604, milk: 0.687, meat: 4.582, wool: 3.665, fuel: 2.133 },
  2001: { wheat: 0.238, corn: 0.217, soy: 0.588, milk: 0.675, meat: 4.418, wool: 3.607, fuel: 2.067 },
  2002: { wheat: 0.25, corn: 0.224, soy: 0.613, milk: 0.675, meat: 4.5, wool: 3.607, fuel: 2.2 },
  2003: { wheat: 0.262, corn: 0.237, soy: 0.653, milk: 0.687, meat: 4.582, wool: 3.665, fuel: 2.533 },
  2004: { wheat: 0.274, corn: 0.244, soy: 0.776, milk: 0.711, meat: 4.827, wool: 3.724, fuel: 2.933 },
  2005: { wheat: 0.286, corn: 0.258, soy: 0.735, milk: 0.734, meat: 4.991, wool: 3.782, fuel: 3.467 },
  2006: { wheat: 0.31, corn: 0.285, soy: 0.751, milk: 0.758, meat: 5.236, wool: 3.84, fuel: 3.867 },
  2007: { wheat: 0.417, corn: 0.394, soy: 0.98, milk: 0.805, meat: 5.523, wool: 3.956, fuel: 4.333 },
  2008: { wheat: 0.524, corn: 0.489, soy: 1.184, milk: 0.829, meat: 5.727, wool: 4.073, fuel: 6.333 },
  2009: { wheat: 0.327, corn: 0.299, soy: 0.817, milk: 0.687, meat: 5.114, wool: 3.665, fuel: 3.333 },
  2010: { wheat: 0.357, corn: 0.353, soy: 0.915, milk: 0.734, meat: 5.4, wool: 3.84, fuel: 4.0 },
  2011: { wheat: 0.446, corn: 0.441, soy: 1.062, milk: 0.805, meat: 5.809, wool: 4.073, fuel: 5.2 },
  2012: { wheat: 0.536, corn: 0.543, soy: 1.225, milk: 0.829, meat: 6.055, wool: 4.189, fuel: 5.333 },
  2013: { wheat: 0.417, corn: 0.407, soy: 1.062, milk: 0.853, meat: 6.341, wool: 4.247, fuel: 5.0 },
  2014: { wheat: 0.357, corn: 0.339, soy: 0.898, milk: 0.876, meat: 6.75, wool: 4.305, fuel: 4.533 },
  2015: { wheat: 0.31, corn: 0.285, soy: 0.776, milk: 0.77, meat: 6.545, wool: 4.189, fuel: 3.0 },
  2016: { wheat: 0.286, corn: 0.258, soy: 0.735, milk: 0.711, meat: 6.218, wool: 4.073, fuel: 2.667 },
  2017: { wheat: 0.298, corn: 0.271, soy: 0.751, milk: 0.734, meat: 6.136, wool: 4.131, fuel: 3.2 },
  2018: { wheat: 0.31, corn: 0.285, soy: 0.719, milk: 0.758, meat: 6.341, wool: 4.189, fuel: 3.667 },
  2019: { wheat: 0.327, corn: 0.299, soy: 0.735, milk: 0.782, meat: 6.464, wool: 4.247, fuel: 3.467 },
  2020: { wheat: 0.345, corn: 0.312, soy: 0.8, milk: 0.758, meat: 6.341, wool: 4.189, fuel: 2.533 },
  2021: { wheat: 0.405, corn: 0.394, soy: 0.939, milk: 0.829, meat: 6.873, wool: 4.364, fuel: 4.333 },
  2022: { wheat: 0.625, corn: 0.543, soy: 1.184, milk: 0.888, meat: 7.159, wool: 4.538, fuel: 7.0 },
  2023: { wheat: 0.446, corn: 0.407, soy: 1.021, milk: 0.853, meat: 6.955, wool: 4.422, fuel: 6.0 },
  2024: { wheat: 0.387, corn: 0.353, soy: 0.939, milk: 0.829, meat: 6.75, wool: 4.305, fuel: 5.667 },
  2025: { wheat: 0.369, corn: 0.339, soy: 0.915, milk: 0.829, meat: 6.627, wool: 4.305, fuel: 5.467 },
  2026: { wheat: 0.369, corn: 0.339, soy: 0.915, milk: 0.829, meat: 6.627, wool: 4.305, fuel: 5.467 },
};

/**
 * Returns the historical baseline price for a commodity in a given calendar year.
 * Interpolates linearly between table entries for smooth transitions.
 */
export function getHistoricalBaseline(commodityId: string, calendarYear: number): number {
  const clampedYear = Math.max(1970, Math.min(2026, calendarYear));
  const entry = PRICE_TABLE[clampedYear];
  if (entry) {
    const key = commodityId as keyof CommodityBaselines;
    return entry[key] ?? 0;
  }
  // Fallback: linear interpolation between nearest years
  const years = Object.keys(PRICE_TABLE).map(Number).sort((a, b) => a - b);
  const lower = years.filter(y => y <= clampedYear).pop() ?? years[0];
  const upper = years.find(y => y > clampedYear) ?? years[years.length - 1];
  if (lower === upper) return PRICE_TABLE[lower]?.[commodityId as keyof CommodityBaselines] ?? 0;
  const t = (clampedYear - lower) / (upper - lower);
  const lo = PRICE_TABLE[lower]?.[commodityId as keyof CommodityBaselines] ?? 0;
  const hi = PRICE_TABLE[upper]?.[commodityId as keyof CommodityBaselines] ?? 0;
  return Math.round(lo + (hi - lo) * t);
}
