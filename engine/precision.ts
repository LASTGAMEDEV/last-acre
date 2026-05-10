export interface SoilAnalysis {
  analyzedDay: number;
  score: number;
  recommendation: string;
  optimalN: number;
  optimalP: number;
  optimalK: number;
  optimalPh: number;
  deficitN: number;
  deficitP: number;
  deficitK: number;
  deficitPh: number;
}

export interface YieldEntry {
  season: string;
  cropId: string;
  kgPerHa: number;
  day: number;
}

export function generateSoilAnalysis(parcel: {
  soil?: { nitrogen: number; phosphorus: number; potassium: number; pH: number };
}): SoilAnalysis {
  const soil = parcel.soil ?? { nitrogen: 50, phosphorus: 30, potassium: 30, pH: 6.0 };
  const optimalN = 85;
  const optimalP = 30;
  const optimalK = 45;
  const optimalPh = 6.5;

  const deficitN = optimalN - soil.nitrogen;
  const deficitP = optimalP - soil.phosphorus;
  const deficitK = optimalK - soil.potassium;
  const deficitPh = optimalPh - soil.pH;

  let score = 100;
  score -= Math.min(25, Math.abs(deficitN) * 2);
  score -= Math.min(25, Math.abs(deficitP) * 2);
  score -= Math.min(25, Math.abs(deficitK) * 2);
  score -= Math.min(25, Math.abs(deficitPh) * 10);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const parts: string[] = [];
  if (Math.abs(deficitN) > 2) parts.push(`${Math.round(Math.abs(deficitN))} kg/ha N`);
  if (Math.abs(deficitP) > 2) parts.push(`${Math.round(Math.abs(deficitP))} kg/ha P`);
  if (Math.abs(deficitK) > 2) parts.push(`${Math.round(Math.abs(deficitK))} kg/ha K`);
  if (Math.abs(deficitPh) > 0.2) parts.push(`lime amendment`);

  const recommendation = parts.length > 0
    ? `Apply ${parts.join(' + ')}`
    : 'No amendments needed — soil is in excellent condition.';

  return {
    analyzedDay: 0, // caller sets
    score,
    recommendation,
    optimalN,
    optimalP,
    optimalK,
    optimalPh,
    deficitN,
    deficitP,
    deficitK,
    deficitPh,
  };
}

export function getScoreLabel(score: number): { label: string; emoji: string } {
  if (score >= 80) return { label: 'Healthy', emoji: '✅' };
  if (score >= 50) return { label: 'Needs attention', emoji: '⚠️' };
  return { label: 'Critical', emoji: '🚨' };
}

export function getYieldTrend(history: YieldEntry[]): 'rising' | 'stable' | 'declining' | 'underperforming' {
  if (history.length < 2) return 'stable';
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const change = (last.kgPerHa - prev.kgPerHa) / prev.kgPerHa;

  if (change > 0.10) return 'rising';
  if (change < -0.10) {
    // Check for underperforming
    const recent = history.slice(-3);
    if (recent.length >= 3 && recent.every((h, i) => i === 0 || h.kgPerHa < recent[i - 1].kgPerHa)) {
      return 'underperforming';
    }
    return 'declining';
  }
  return 'stable';
}
