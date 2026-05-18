export interface ImprovementClause {
  guaranteedCompensationPct: number;
  additionalRentPct: number;
}

export interface LeaseAgreement {
  id: string;
  parcelId: string;
  npcId: string;
  npcName: string;
  leaseType: 'cash_rent' | 'sharecrop' | 'short_term';
  startDay: number;
  endDay: number;
  cashRentPerSeason?: number;
  landOwnerSharePct?: number;
  autoRenew: boolean;
  improvementClause?: ImprovementClause;
  status: 'active' | 'expired' | 'terminated';
}

export interface AvailableLease {
  parcelId: string;
  npcId: string;
  npcName: string;
  leaseType: 'cash_rent' | 'sharecrop' | 'short_term';
  termsPerSeason: number;
  landOwnerSharePct?: number;
  availableUntilDay: number;
  improvementClauseAvailable: boolean;
}

export interface TenantImprovement {
  id: string;
  parcelId: string;
  leaseId: string;
  type: 'hedgerow' | 'organic_transition' | 'soil_amendment' | 'infrastructure';
  installDay: number;
  installCost: number;
  description: string;
}

export interface NPCLandowner {
  id: string;
  name: string;
  generous: boolean;
  generosityMult: number;
  prefersLongTerm: boolean;
}

export const NPC_LANDOWNERS: NPCLandowner[] = [
  { id: 'npc_martinez', name: 'Martinez Farm', generous: true, generosityMult: 1.15, prefersLongTerm: true },
  { id: 'npc_sanchez', name: 'Sánchez Plot', generous: false, generosityMult: 0.85, prefersLongTerm: false },
  { id: 'npc_valley', name: 'Valley Fields', generous: false, generosityMult: 1.0, prefersLongTerm: true },
  { id: 'npc_hermitage', name: 'Old Hermitage', generous: true, generosityMult: 1.0, prefersLongTerm: false },
];

export const CASH_RENT_PER_HA_PER_SEASON = 120;
export const SHORT_TERM_PREMIUM = 1.4;
export const DEFAULT_SHARE_OWNER_PCT = 0.35;
export const IMPROVEMENT_CLAUSE_RENT_PREMIUM = 0.10;
export const DEFAULT_LEASE_SEASONS = 4;

export function calculateCashRent(hectares: number, shortTerm = false): number {
  const base = hectares * CASH_RENT_PER_HA_PER_SEASON;
  return shortTerm ? Math.round(base * SHORT_TERM_PREMIUM) : Math.round(base);
}

export function depreciatedValue(
  improvement: TenantImprovement,
  currentDay: number,
): number {
  const ageYears = (currentDay - improvement.installDay) / 365;
  const depreciationRate = 0.15;
  const factor = Math.max(0, 1 - ageYears * depreciationRate);
  return Math.round(improvement.installCost * factor);
}

export function npcCompensationOffer(
  totalDepreciated: number,
  reputation: number,
  npc: NPCLandowner,
): number | null {
  if (reputation < 40 && !npc.generous) return null;
  const basePct = reputation > 70 ? 0.65 : reputation > 40 ? 0.40 : 0.20;
  return Math.round(totalDepreciated * basePct * npc.generosityMult);
}

export function generateAvailableLeases(
  day: number,
  reputation: number,
): AvailableLease[] {
  const leases: AvailableLease[] = [];
  const types: Array<'cash_rent' | 'sharecrop' | 'short_term'> = ['cash_rent', 'sharecrop', 'short_term'];
  for (const npc of NPC_LANDOWNERS) {
    // Reputation gates: < 30 rep, fewer offers
    if (reputation < 30 && Math.random() > 0.5) continue;
    const hectares = 2 + Math.floor(Math.random() * 4); // 2-5 ha
    const type = types[Math.floor(Math.random() * types.length)];
    if (npc.prefersLongTerm && type === 'short_term' && Math.random() > 0.3) continue;
    const cashRent = calculateCashRent(hectares, type === 'short_term');
    const sharePct = reputation > 70 ? 0.30 : reputation > 40 ? 0.35 : 0.40;
    leases.push({
      parcelId: `lease_${npc.id}_${day}`,
      npcId: npc.id,
      npcName: npc.name,
      leaseType: type,
      termsPerSeason: type === 'sharecrop' ? Math.round(sharePct * 100) : cashRent,
      landOwnerSharePct: type === 'sharecrop' ? sharePct : undefined,
      availableUntilDay: day + 90,
      improvementClauseAvailable: npc.generous || reputation > 60,
    });
  }
  return leases;
}

export function isLeasedParcel(parcelId: string, leases: LeaseAgreement[]): boolean {
  return leases.some(l => l.parcelId === parcelId && l.status === 'active');
}

export function getActiveLeaseForParcel(
  parcelId: string,
  leases: LeaseAgreement[],
): LeaseAgreement | undefined {
  return leases.find(l => l.parcelId === parcelId && l.status === 'active');
}
