import { NPC_FARM_DEFINITIONS } from '../data/npcFarms';

export interface NPCFarmRuntime {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  specialization: string[];
  sellIntervalDays: number;
  nextSellDay: number;
  wealth: number;
}

/**
 * Build the initial runtime NPCFarm array from static definitions.
 * Called once in makeInitialState().
 */
export function initNpcFarms(): NPCFarmRuntime[] {
  return NPC_FARM_DEFINITIONS.map(def => ({
    id: def.id,
    name: def.name,
    tier: def.tier,
    specialization: def.specialization,
    sellIntervalDays: def.sellIntervalDays,
    nextSellDay: def.sellIntervalDays, // first sell on day = interval
    wealth: def.startingWealth,
  }));
}

/**
 * Volume of crop units an NPC dumps this tick.
 * Scales with tier (base 300/600/900) and wealth (log scale).
 */
export function npcSellVolume(farm: NPCFarmRuntime): number {
  const base = farm.tier * 300;
  const wealthScale = Math.log10(Math.max(10, farm.wealth)) / 4;
  return Math.round(base * wealthScale * (0.8 + Math.random() * 0.4));
}

/**
 * Bid amount an NPC will place on an auction parcel.
 * Returns 0 if the NPC can't afford to compete.
 */
export function npcAuctionBid(farm: NPCFarmRuntime, parcelValue: number): number {
  if (farm.wealth < parcelValue * 0.3) return 0;
  const aggression = farm.tier * 0.15;
  return Math.round(parcelValue * (0.5 + aggression + Math.random() * 0.2));
}
