// features/neighbors/neighborEngine.ts
// Pure functions only. No Zustand imports.

import { NEIGHBOR_PROFILES, NEIGHBOR_IDS, OPERATING_COST_PER_HECTARE, NeighborId } from '../../data/neighborData';
import { getHistoricalBaseline } from '../../data/historicalPrices';
import { NeighborFarm, NeighborState, NeighborStatus, NeighborLandOpportunity } from './neighborTypes';
import type { ReputationTier } from '../reputation/reputationTypes';

function buildInitialFarm(id: NeighborId): NeighborFarm {
  const p = NEIGHBOR_PROFILES[id];
  return {
    id,
    status: 'thriving',
    cash: p.startingCash,
    debt: p.startingDebt,
    landHectares: p.startingLandHectares,
    landValue: 220,
    relationship: Math.floor(Math.random() * 51) + 20,
    strugglingYears: 0,
    events: [],
  };
}

export const INITIAL_NEIGHBOR_STATE: NeighborState = {
  caldwells:   buildInitialFarm('caldwells'),
  petrovs:     buildInitialFarm('petrovs'),
  greens:      buildInitialFarm('greens'),
  hendersons:  buildInitialFarm('hendersons'),
  obriens:     buildInitialFarm('obriens'),
  rodriguezes: buildInitialFarm('rodriguezes'),
  millers:     buildInitialFarm('millers'),
  kowalskis:   buildInitialFarm('kowalskis'),
};

const COMMODITY_MAP: Record<NeighborId, string> = {
  caldwells: 'wheat', petrovs: 'beef', greens: 'wheat', hendersons: 'wheat',
  obriens: 'milk', rodriguezes: 'beef', millers: 'wheat', kowalskis: 'wheat',
};

function historicalLandValue(year: number): number {
  if (year <= 1975) return 220;
  if (year <= 1980) return 500;
  if (year <= 1986) return 800;
  if (year <= 1990) return 560;
  if (year <= 2000) return 650;
  if (year <= 2008) return 900;
  if (year <= 2010) return 800;
  if (year <= 2020) return 1800;
  return 3200;
}

function deriveStatus(cash: number, debt: number, income: number, stress: number, bankrupt: number): NeighborStatus {
  if (cash < 0 && debt / Math.max(income, 1) > bankrupt) return 'bankrupt';
  if (debt / Math.max(income, 1) > stress || cash < 0) return 'struggling';
  return 'thriving';
}

function simulateYear(farm: NeighborFarm, calYear: number, multipliers: Record<string, number>): NeighborFarm {
  if (farm.status === 'bankrupt' || farm.status === 'sold') return farm;

  const profile  = NEIGHBOR_PROFILES[farm.id];
  const fuelMult = multipliers['fuel_cost'] ?? 1;
  const cropMult = multipliers['all_crop_prices'] ?? 1;
  const price    = getHistoricalBaseline(COMMODITY_MAP[farm.id], calYear) * cropMult;
  const income   = farm.landHectares * profile.productivityBase * price;
  const rate     = 0.07 + ((multipliers['loan_rate'] ?? 1) - 1) * 0.15;
  const expenses = farm.landHectares * OPERATING_COST_PER_HECTARE * fuelMult + farm.debt * rate;
  let cash = farm.cash + income - expenses;

  const isBoom = cropMult > 1.2;
  let { debt, landHectares } = farm;
  if (isBoom && profile.leverageAggressiveness > 0.5) {
    const newDebt = landHectares * 20 * profile.leverageAggressiveness;
    debt += newDebt;
    landHectares += newDebt / historicalLandValue(calYear);
  } else {
    const paydown = Math.max(0, cash * 0.3);
    cash -= paydown;
    debt = Math.max(0, debt - paydown);
  }

  const newStatus = deriveStatus(cash, debt, income, profile.stressRatio, profile.bankruptRatio);
  return {
    ...farm,
    cash,
    debt,
    landHectares,
    landValue: historicalLandValue(calYear),
    status: newStatus,
    strugglingYears: newStatus === 'struggling' ? farm.strugglingYears + 1 : 0,
  };
}

export function advanceNeighborYear(
  neighbors: NeighborState,
  calYear: number,
  multipliers: Record<string, number>,
  reputationTier: ReputationTier
): { neighbors: NeighborState; landOpportunities: NeighborLandOpportunity[] } {
  const updated: Partial<NeighborState> = {};
  const opps: NeighborLandOpportunity[] = [];

  for (const id of NEIGHBOR_IDS) {
    const farm = neighbors[id];
    const sim  = simulateYear(farm, calYear, multipliers);
    updated[id] = sim;

    if (farm.status !== 'bankrupt' && sim.status === 'bankrupt') {
      opps.push({
        neighborId: id, type: 'auction',
        hectares: Math.floor(sim.landHectares * 0.6),
        pricePerHectare: sim.landValue * 0.7,
        playerHasPriority: reputationTier !== 'unknown',
        description: `${NEIGHBOR_PROFILES[id].displayName} has gone bankrupt. Their land goes to auction.`,
      });
      updated[id] = { ...sim, events: [...sim.events, `bankrupt-${calYear}`] };
    }

    if ((id === 'millers' || id === 'petrovs') && sim.strugglingYears >= 2) {
      opps.push({
        neighborId: id, type: 'direct_sale',
        hectares: sim.landHectares,
        pricePerHectare: sim.landValue * 0.9,
        playerHasPriority: false,
        description: `${NEIGHBOR_PROFILES[id].displayName} has approached you about selling their land.`,
      });
    }

    if ((id === 'kowalskis' || id === 'greens') && sim.relationship >= 50 && sim.status !== 'bankrupt') {
      if (!sim.events.includes(`partnership-offered-${calYear}`)) {
        opps.push({
          neighborId: id, type: 'partnership', hectares: 0, pricePerHectare: 0,
          playerHasPriority: false,
          description: `${NEIGHBOR_PROFILES[id].displayName} has proposed a shared equipment co-op.`,
        });
        updated[id] = { ...(updated[id] ?? sim), events: [...sim.events, `partnership-offered-${calYear}`] };
      }
    }
  }

  return { neighbors: updated as NeighborState, landOpportunities: opps };
}

export function updateNeighborRelationship(
  neighbors: NeighborState,
  id: NeighborId,
  delta: number
): NeighborState {
  const farm = neighbors[id];
  return { ...neighbors, [id]: { ...farm, relationship: Math.max(0, Math.min(100, farm.relationship + delta)) } };
}
