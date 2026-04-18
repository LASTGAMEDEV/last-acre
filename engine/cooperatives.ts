// engine/cooperatives.ts
import type { CoopId, CoopMembership, CoopState, CoopTerms, AGMProposal, CoopEquipmentItem } from './cooperativeTypes';

// ── Pool Pricing ────────────────────────────────────────────────────────────

export function getHandlingFee(health: number): number {
  if (health >= 70) return 0.03;
  if (health >= 40) return 0.04;
  return 0.05;
}

export function rollingAvg(priceHistory: number[], days = 90): number {
  const slice = priceHistory.slice(-days);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function calculatePoolPrice(
  avgPrice: number,
  health: number,
  floorPct: number,
): number {
  const fee = getHandlingFee(health);
  const raw = avgPrice * (1 - fee);
  const floor = avgPrice * (floorPct / 100);
  return Math.max(raw, floor);
}

// ── Share Pricing ───────────────────────────────────────────────────────────

export function calculateSharePriceDelta(health: number): number {
  if (health > 70) return 0.02;   // +2% appreciation
  if (health < 40) return -0.05;  // -5% depreciation
  return 0;
}

export function calculateRedemptionMultiplier(health: number): number {
  if (health >= 60) return 1.0;
  if (health >= 40) return 0.8;
  if (health >= 20) return 0.6;
  return 0.4;
}

// ── Input Discounts ─────────────────────────────────────────────────────────

export function getSeedDiscount(_coopId: CoopId): number {
  return 0.10; // all three co-ops: -10% seeds
}

export function getFertilizerDiscount(coopId: CoopId): number {
  if (coopId === 'grain') return 0.12;
  if (coopId === 'horticulture') return 0.12; // irrigation supplies
  return 0;
}

export function getFeedDiscount(): number {
  return 0.10; // livestock co-op: -10% feed
}

export function getVetDiscount(): number {
  return 0.12; // livestock co-op: -12% vet
}

// ── Health Calculation ──────────────────────────────────────────────────────

export interface HealthDeltaInput {
  totalMembers: number;
  membersFullyDelivered: number;
  poolBelowFloor: boolean;
  membersLeft: number;
  membersJoined: number;
  poolPriceStrongVsSpot: boolean; // pool > spot by >10%
  equipmentVotePassed: boolean;
  offendingMembers: number;
}

export function calculateHealthDelta(input: HealthDeltaInput): number {
  let delta = 0;

  // Increases
  if (input.totalMembers > 0) {
    delta += input.membersFullyDelivered / input.totalMembers * 1;
  }
  if (input.poolPriceStrongVsSpot) delta += 3;
  if (input.equipmentVotePassed) delta += 2;
  delta += Math.min(input.membersJoined, 5);

  // Decreases
  delta -= input.offendingMembers * 2;
  if (input.poolBelowFloor) delta -= 3;
  delta -= Math.min(input.membersLeft, 5);
  delta -= 1; // baseline equipment maintenance

  return delta;
}

// ── Dividends ───────────────────────────────────────────────────────────────

export function calculateDividend(
  coopNetProfit: number,
  playerDelivered: number,
  totalMemberDelivered: number,
  dividendPct: number,
  health: number,
): number {
  if (health < 40) return 0;
  if (totalMemberDelivered === 0) return 0;
  const share = playerDelivered / totalMemberDelivered;
  return coopNetProfit * share * (dividendPct / 100);
}

// ── Equipment ───────────────────────────────────────────────────────────────

export function getAvailableEquipment(equipment: CoopEquipmentItem[], health: number): CoopEquipmentItem[] {
  return equipment.filter(e => health >= e.unlocksAtHealth);
}

export function isSlotBooked(item: CoopEquipmentItem, day: number): boolean {
  return item.bookings.some(b => b.day === day);
}

export function nextAvailableDay(item: CoopEquipmentItem, fromDay: number): number {
  let d = fromDay;
  while (isSlotBooked(item, d)) d++;
  return d;
}

// ── Membership State ────────────────────────────────────────────────────────

export function isMemberSuspended(membership: CoopMembership, currentSeason: number): boolean {
  if (membership.suspendedUntilSeason === null) return false;
  return currentSeason < membership.suspendedUntilSeason;
}

export function isCoopActive(coopState: CoopState, currentYear: number): boolean {
  if (coopState.dissolvedUntilYear === null) return true;
  return currentYear >= coopState.dissolvedUntilYear;
}

export function getSeason(day: number): number {
  return Math.floor((day - 1) / 90); // season 0 = first spring, increments each 90 days
}

export function getYear(day: number): number {
  return Math.floor((day - 1) / 360) + 1;
}

export function isStartOfSeason(day: number): boolean {
  return (day - 1) % 90 === 0;
}

export function isStartOfSpring(day: number): boolean {
  return (day - 1) % 360 === 0;
}

export function isEndOfYear(day: number): boolean {
  return day % 360 === 0;
}

// ── AGM Simulation ──────────────────────────────────────────────────────────

export function generateAGMProposal(
  coopId: CoopId,
  season: number,
  health: number,
  terms: CoopTerms,
): AGMProposal {
  let changes: Partial<CoopTerms> = {};

  if (health > 70) {
    changes = { floorPct: Math.min(terms.floorPct + 5, 95), dividendPct: Math.min(terms.dividendPct + 5, 60) };
  } else if (health < 40) {
    changes = {
      floorPct: Math.max(terms.floorPct - 5, 60),
      annualFeePerShare: terms.annualFeePerShare * 1.1,
      dividendPct: Math.max(terms.dividendPct - 5, 5),
    };
  } else {
    changes = { deliveryPct: Math.min(Math.max(terms.deliveryPct + (Math.random() > 0.5 ? 5 : -5), 30), 70) };
  }

  let baseLean = 0.5;
  if (health > 70) baseLean = 0.65;
  if (health < 40) baseLean = 0.60;
  const variance = (Math.random() - 0.5) * 0.30;
  const otherYesPct = Math.max(0, Math.min(1, baseLean + variance));

  return {
    coopId,
    season,
    changes,
    playerVote: null,
    otherYesPct,
    resolved: false,
  };
}

export function resolveAGMVote(
  proposal: AGMProposal,
  memberCount: number,
): boolean {
  const playerWeight = 1 / memberCount;
  const otherWeight = 1 - playerWeight;
  const otherVotes = proposal.otherYesPct * otherWeight;

  let playerVotes = 0;
  if (proposal.playerVote === 'yes') playerVotes = playerWeight;
  else if (proposal.playerVote === 'no') playerVotes = 0;
  else playerVotes = proposal.otherYesPct * playerWeight; // abstain follows majority

  return otherVotes + playerVotes > 0.5;
}

// ── Fuel Cost for Delivery ──────────────────────────────────────────────────

export const COOP_DEPOT_FUEL_COST: Record<CoopId, number> = {
  grain: 25,
  horticulture: 30,
  livestock: 20,
};
