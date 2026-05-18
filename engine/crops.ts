import { CropType } from '../data/cropTypes';
import { degradationYieldModifier } from './soilDegradation';
import type { LandParcel } from '../store/useGameStore';

export type SoilType = 'loamy' | 'sandy' | 'clay' | 'chalky';

const SOIL_AFFINITY: Record<SoilType, Partial<Record<string, number>>> = {
  loamy:  {}, // neutral — all crops 1.0
  sandy:  { potatoes: 1.20, sugarbeet: 1.15, sunflower: 1.10, lavender: 1.15, ginseng: 1.10, rice: 0.90, sugarcane: 0.90 },
  clay:   { wheat: 1.15, rice: 1.20, corn: 1.10, soy: 1.10, lavender: 0.90, saffron: 0.90, ginseng: 0.90 },
  chalky: { grapes: 1.20, lavender: 1.20, olives: 1.15, saffron: 1.10, corn: 0.90, rice: 0.90, sugarcane: 0.90 },
};

export function getSoilModifier(soilType: SoilType | undefined, cropId: string): number {
  if (!soilType || soilType === 'loamy') return 1.0;
  return SOIL_AFFINITY[soilType][cropId] ?? 1.0;
}

export interface PlantedCrop {
  cropId: string;
  parcelId: string;
  plantedDay: number;
  hectares: number;
  appliedN?: number;  // nitrogen fertilizer multiplier (e.g. 1.2); undefined = 1.0
  appliedP?: number;  // phosphorus fertilizer multiplier
  appliedK?: number;  // potassium fertilizer multiplier
  frostDamage?: number;    // 0–1 accumulated; ≥1.0 = crop killed
  droughtStress?: number;  // 0–1 accumulated
  moistureLevel?: number;  // 0–1 soil moisture; default 0.7
}

export function isReady(crop: PlantedCrop, cropType: CropType, currentDay: number): boolean {
  return currentDay >= crop.plantedDay + cropType.growthDays;
}

export function harvestAmount(
  crop: PlantedCrop,
  cropType: CropType,
  soil: SoilStats,            // replaces fertility: number
  climateModifier: number,    // 0.6–1.2
  hasWeeds: boolean,
  machineYieldBonus: number,  // 1.0 = no machine, 1.1+ = from owned machines
  frostDamage = 0,
  droughtStress = 0,
  degradationMod = 1.0,       // soil degradation multiplier
  tillageYieldMod = 1.0,      // tillage transition penalty/bonus
  organicYieldMod = 1.0,      // organic certification modifier
): number {
  const soilMod     = computeSoilYieldModifier(soil);
  const fertilizerMod = (crop.appliedN ?? 1.0) * (crop.appliedP ?? 1.0) * (crop.appliedK ?? 1.0);
  const weedMod     = hasWeeds ? 0.75 : 1.0;
  const frostMod    = Math.max(0, 1 - frostDamage * 0.7);
  const droughtMod  = Math.max(0, 1 - droughtStress * 0.8);

  return (
    crop.hectares *
    cropType.baseYield *
    soilMod *
    fertilizerMod *
    weedMod *
    climateModifier *
    machineYieldBonus *
    frostMod *
    droughtMod *
    degradationMod *
    tillageYieldMod *
    organicYieldMod
  );
}

// ─── Soil System ─────────────────────────────────────────────────────────────

export interface SoilStats {
  nitrogen: number;       // 0–100, optimal 60–80
  organicMatter: number;  // 0–10, optimal 4–7
  compaction: number;     // 0–100, optimal 0–25 (lower = better)
  pH: number;             // 4.0–8.5, optimal 6.0–7.0
  microbialLife: number;  // 0–100, optimal 60–100
  phosphorus: number;     // 0–100, optimal 50–80
  potassium: number;      // 0–100, optimal 50–80
  drainage: number;       // 0–100, optimal 60–100
}

export const SOIL_DEFAULTS: SoilStats = {
  nitrogen: 65,
  organicMatter: 4.5,
  compaction: 20,
  pH: 6.5,
  microbialLife: 70,
  phosphorus: 60,
  potassium: 60,
  drainage: 65,
};

/**
 * Returns a yield multiplier (0.3–1.2) based on all 5 soil dimensions.
 * Modifiers stack multiplicatively. A perfectly managed parcel can reach 1.2.
 */
export function computeSoilYieldModifier(soil: SoilStats): number {
  // Nitrogen: optimal 60–80, penalise outside that range
  const nMod =
    soil.nitrogen < 40
      ? 0.6 + (soil.nitrogen / 40) * 0.4        // 0.6 at 0, 1.0 at 40
      : soil.nitrogen > 90
      ? 0.85                                     // excess nitrogen = slight penalty
      : 1.0 + Math.max(0, Math.min((soil.nitrogen - 60) / 200, 0.10)); // +0–10% in 60–80 range; neutral 40–60

  // Organic matter: optimal ≥ 4%; below 2% penalised
  const omMod =
    soil.organicMatter < 2
      ? 0.75 + (soil.organicMatter / 2) * 0.25  // 0.75 at 0%, 1.0 at 2%
      : 1.0 + Math.max(0, Math.min((soil.organicMatter - 4) / 40, 0.05)); // +0–5% above 4%; neutral 2–4%

  // Compaction: 0 = best, 100 = worst
  const compMod =
    soil.compaction > 50
      ? 1.0 - ((soil.compaction - 50) / 50) * 0.30 // −30% at 100
      : 1.0;

  // pH: optimal 6.0–7.0; outside 5.5–7.5 penalised
  const pHDev = Math.max(0, Math.abs(soil.pH - 6.5) - 1.0); // deviation beyond ±1.0 (outside 5.5–7.5)
  const pHMod = Math.max(0.80, 1.0 - pHDev * 0.20);

  // Microbial life: below 30 penalised; above 60 slight bonus
  const microMod =
    soil.microbialLife < 30
      ? 0.85 + (soil.microbialLife / 30) * 0.15 // 0.85 at 0, 1.0 at 30
      : Math.max(1.0, 1.0 + Math.min((soil.microbialLife - 60) / 400, 0.05)); // +0–5% above 60; neutral 30–60

  // Phosphorus: optimal 50–80; 0.60–1.08
  const p = soil.phosphorus ?? 60;
  const pMod =
    p < 30
      ? 0.60 + (p / 30) * 0.40   // 0.60 at 0, 1.00 at 30
      : p < 50
      ? 1.00
      : 1.0 + Math.min((p - 50) / 375, 0.08); // +0–8% from 50–80

  // Potassium: optimal 50–80; 0.65–1.06
  const k = soil.potassium ?? 60;
  const kMod =
    k < 30
      ? 0.65 + (k / 30) * 0.35   // 0.65 at 0, 1.00 at 30
      : k < 50
      ? 1.00
      : 1.0 + Math.min((k - 50) / 500, 0.06); // +0–6% from 50–80

  // Drainage: poor drainage causes waterlogging; 0.60–1.00
  const d = soil.drainage ?? 65;
  const drainMod =
    d < 30
      ? 0.60 + (d / 30) * 0.20   // 0.60 at 0, 0.80 at 30
      : d < 60
      ? 0.80 + ((d - 30) / 30) * 0.20  // 0.80–1.00 from 30–60
      : 1.00;

  return Math.max(0.3, nMod * omMod * compMod * pHMod * microMod * pMod * kMod * drainMod);
}

export interface SoilTickParams {
  /** cropId currently growing, or null if fallow */
  activeCropId: string | null;
  /** true if a crop was harvested TODAY on this parcel */
  harvestedToday: boolean;
  /** true if any machinery operated on this parcel today */
  machineryUsedToday: boolean;
  /** true if today's rainfall was heavy (≥ 8 mm simulated) */
  heavyRainToday: boolean;
  /** true if today is a drought day */
  droughtToday: boolean;
  /** true if a pesticide was applied to this parcel today */
  pesticideAppliedToday: boolean;
  /** true if manure/compost was applied today */
  manureAppliedToday: boolean;
  /** true if subsoiler attachment was used today */
  subsoilerUsedToday: boolean;
}

/**
 * Pure daily soil tick. Returns a new SoilStats object.
 * Called once per owned parcel per advanceDay() call.
 */
export function advanceSoilStats(
  soil: SoilStats,
  params: SoilTickParams,
  cropNitrogenDemand: number, // nitrogenDemand from CropType, 0 if fallow
): SoilStats {
  let { nitrogen, organicMatter, compaction, pH, microbialLife } = soil;
  let phosphorus = soil.phosphorus ?? 60;
  let potassium  = soil.potassium  ?? 60;
  let drainage   = soil.drainage   ?? 65;

  // ── Nitrogen ──
  if (params.activeCropId) {
    nitrogen -= cropNitrogenDemand / 90; // spread demand over ~1 season of growth
  }
  if (params.heavyRainToday) {
    nitrogen -= 1.5; // runoff loss
  }
  if (params.harvestedToday) {
    nitrogen -= cropNitrogenDemand * 0.5; // burst loss at harvest
  }
  // Fallow recovery (very slow natural mineralisation)
  if (!params.activeCropId) {
    nitrogen += 0.1;
  }

  // ── Organic Matter ──
  if (params.activeCropId) {
    organicMatter -= 0.004; // slow depletion during active crop
  }
  if (!params.activeCropId) {
    organicMatter += 0.003; // slow natural accumulation when fallow
  }
  if (params.manureAppliedToday) {
    organicMatter += 0.5;
  }

  // ── Compaction ──
  if (params.machineryUsedToday) {
    compaction += 2;
  }
  if (!params.activeCropId && !params.machineryUsedToday) {
    compaction -= 0.5; // fallow recovery via freeze-thaw etc.
  }
  if (params.subsoilerUsedToday) {
    compaction -= 18;
  }

  // ── pH ── (drifts very slowly; lime/sulfur handled by applySoilAmendment action)
  if (params.heavyRainToday) {
    pH -= 0.005; // leaching slightly acidifies
  }

  // ── Microbial Life ──
  if (params.pesticideAppliedToday) {
    microbialLife -= 10;
  }
  // Follows organic matter: tends toward organicMatter * 12 over time
  const microTarget = Math.min(100, organicMatter * 12);
  microbialLife += (microTarget - microbialLife) * 0.01; // 1% convergence per day

  // –– Phosphorus (slow natural recovery; bulk drain handled at harvest in store)
  if (!params.activeCropId) {
    phosphorus += 0.05; // very slow natural mineralisation when fallow
  }

  // –– Potassium (same pattern)
  if (!params.activeCropId) {
    potassium += 0.04;
  }

  // –– Drainage
  if (params.heavyRainToday) {
    drainage -= 12; // waterlogging event
  } else if (params.droughtToday) {
    drainage += 2;  // soil dries and cracks open, improving drainage
  } else {
    drainage += 0.3; // natural slow recovery
  }

  // Clamp all values
  return {
    nitrogen:     Math.max(0, Math.min(100, nitrogen)),
    organicMatter: Math.max(0, Math.min(10, organicMatter)),
    compaction:   Math.max(0, Math.min(100, compaction)),
    pH:           Math.max(4.0, Math.min(8.5, pH)),
    microbialLife: Math.max(0, Math.min(100, microbialLife)),
    phosphorus:   Math.max(0, Math.min(100, phosphorus)),
    potassium:    Math.max(0, Math.min(100, potassium)),
    drainage:     Math.max(0, Math.min(100, drainage)),
  };
}
