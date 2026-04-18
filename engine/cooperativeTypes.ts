// engine/cooperativeTypes.ts
export type CoopId = 'grain' | 'horticulture' | 'livestock';

export interface CoopMembership {
  shares: number;
  sharePrice: number;         // $/share at time of purchase
  joinDay: number;
  pendingRedemption: { requestedDay: number } | null;
  offenceHistory: number[];   // game days on which delivery failures occurred
  seasonDelivered: number;    // volume delivered this season (kg or L)
  seasonObligation: number;   // volume owed this season (kg or L)
  suspendedUntilSeason: number | null;
}

export interface CoopEquipmentItem {
  id: string;
  label: string;
  usageFeePerDay: number;
  unlocksAtHealth: number;   // 0, 60, or 80
  bookings: { memberId: string; day: number }[];
}

export interface AGMProposal {
  coopId: CoopId;
  season: number;
  changes: Partial<CoopTerms>;
  playerVote: 'yes' | 'no' | null;
  otherYesPct: number;
  resolved: boolean;
}

export interface CoopTerms {
  deliveryPct: number;        // 0–100, default 50
  floorPct: number;           // % of 90-day rolling avg, default 80
  annualFeePerShare: number;  // $ per share per year
  dividendPct: number;        // % of co-op net profit returned to members
}

export interface CoopState {
  health: number;             // 0–100
  memberCount: number;
  terms: CoopTerms;
  equipment: CoopEquipmentItem[];
  poolPrices: Record<string, number>;   // cropId/animalId → pool price this season
  pendingAGM: AGMProposal | null;
  dissolvedUntilYear: number | null;
  consecutiveLowHealthSeasons: number;  // tracks dissolution trigger
}
