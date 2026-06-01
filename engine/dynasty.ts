import { FIRST_NAMES, LAST_NAMES } from '../data/farmerNames';

export type FarmerSkills = {
  crops: number;
  livestock: number;
  machinery: number;
  finance: number;
  technology: number;
};

export type KnowledgeEffect = {
  target:
    | 'organic_cert_days'
    | 'loan_rate'
    | 'land_price'
    | 'auction_signals'
    | 'tech_cost'
    | 'farm_interest_base';
  delta: number;
};

export type KnowledgeEntry = {
  id: string;
  name: string;
  description: string;
  earnedBy: string;
  effect: KnowledgeEffect;
};

export type Farmer = {
  id: string;
  firstName: string;
  familyName: string;
  birthYear: number;
  health: number;
  skills: FarmerSkills;
  unlockedKnowledge: string[];
  mentorId?: string;
  isRetired: boolean;
};

export type AncestorRecord = {
  farmer: Farmer;
  startYear: number;
  endYear: number;
  cause: 'voluntary_handoff' | 'health_decline' | 'death';
  legacyContribution: number;
  memorableEvents: string[];
};

export type DynastyState = {
  legacyScore: number;
  currentFarmer: Farmer;
  ancestors: AncestorRecord[];
  knowledgeBank: KnowledgeEntry[];
  pendingHandoff: boolean;
  pendingHandoffCause: AncestorRecord['cause'] | null;
  mentorFarmer: Farmer | null;
  mentorExpiresYear: number | null;
};

export const KNOWLEDGE_CATALOGUE: KnowledgeEntry[] = [
  {
    id: 'organic-mastery',
    name: 'Organic Mastery',
    description: 'First parcel reached certified organic status.',
    earnedBy: 'Any parcel reaches organicStatus === "organic"',
    effect: { target: 'organic_cert_days', delta: -365 },
  },
  {
    id: 'land-builder',
    name: 'Land Builder',
    description: 'Farm grew to 100+ hectares under single ownership.',
    earnedBy: 'Own 100+ total hectares',
    effect: { target: 'land_price', delta: -0.05 },
  },
  {
    id: 'crisis-resilience',
    name: 'Crisis Resilience',
    description: 'Survived near-bankruptcy and came back stronger.',
    earnedBy: 'Bankrupt flag set then cleared',
    effect: { target: 'loan_rate', delta: -0.10 },
  },
  {
    id: 'auction-eye',
    name: 'Auction Eye',
    description: 'Won five or more land auctions.',
    earnedBy: 'Win 5+ auctions',
    effect: { target: 'auction_signals', delta: 1 },
  },
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Adopted a new technology within 5 years of its historical unlock.',
    earnedBy: 'Buy a shop item within 5 game-years of its unlock date',
    effect: { target: 'tech_cost', delta: -0.20 },
  },
  {
    id: 'family-legacy',
    name: 'Family Legacy',
    description: 'Raised three or more children on the farm.',
    earnedBy: 'Have 3+ children reach age 10',
    effect: { target: 'farm_interest_base', delta: 10 },
  },
];

const ERA_TECH_BONUS: Record<number, number> = {
  1940: 0,
  1950: 5,
  1960: 10,
  1970: 15,
  1980: 25,
  1990: 35,
  2000: 50,
};

function getTechBonus(birthYear: number): number {
  const decade = Math.floor(birthYear / 10) * 10;
  return ERA_TECH_BONUS[decade] ?? (decade >= 2000 ? 50 : 0);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createInitialFarmer(calendarYear: number): Farmer {
  const birthYear = calendarYear - 30;
  return {
    id: `farmer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    firstName: randomFrom(FIRST_NAMES),
    familyName: randomFrom(LAST_NAMES),
    birthYear,
    health: 100,
    skills: {
      crops: 20,
      livestock: 10,
      machinery: 10,
      finance: 5,
      technology: getTechBonus(birthYear),
    },
    unlockedKnowledge: [],
    isRetired: false,
  };
}

export function farmerAge(farmer: Farmer, calendarYear: number): number {
  return calendarYear - farmer.birthYear;
}

export function annualHealthDelta(farmer: Farmer, calendarYear: number): number {
  const age = farmerAge(farmer, calendarYear);
  if (age < 45) return 0;
  if (age < 60) return -0.3;
  if (age < 70) return -0.5;
  return -1.5;
}

export function annualSkillGain(
  farmer: Farmer,
  farmStats: {
    hasPlantedCrops: boolean;
    hasAnimals: boolean;
    hasMachines: boolean;
    hasLoans: boolean;
    calendarYear: number;
  }
): FarmerSkills {
  return {
    crops: Math.min(100, farmer.skills.crops + (farmStats.hasPlantedCrops ? 2 : 0)),
    livestock: Math.min(100, farmer.skills.livestock + (farmStats.hasAnimals ? 2 : 0)),
    machinery: Math.min(100, farmer.skills.machinery + (farmStats.hasMachines ? 1 : 0)),
    finance: Math.min(100, farmer.skills.finance + (farmStats.hasLoans ? 1 : 0)),
    technology: Math.min(100, farmer.skills.technology + (farmStats.calendarYear >= 1980 ? 1 : 0)),
  };
}

export function advanceDynastyYear(
  dynasty: DynastyState,
  calendarYear: number,
  farmStats: {
    hasPlantedCrops: boolean;
    hasAnimals: boolean;
    hasMachines: boolean;
    hasLoans: boolean;
  }
): { dynasty: DynastyState; triggerHandoff: boolean; handoffCause: 'health_decline' | 'death' | null } {
  const farmer = dynasty.currentFarmer;
  const healthDelta = annualHealthDelta(farmer, calendarYear);
  const newHealth = Math.max(0, Math.min(100, farmer.health + healthDelta));
  const newSkills = annualSkillGain(farmer, { ...farmStats, calendarYear });

  const updatedFarmer: Farmer = { ...farmer, health: newHealth, skills: newSkills };
  const mentorExpired = dynasty.mentorExpiresYear !== null && calendarYear > dynasty.mentorExpiresYear;
  const age = farmerAge(farmer, calendarYear);

  let triggerHandoff = false;
  let handoffCause: 'health_decline' | 'death' | null = null;

  if (newHealth < 30 && !dynasty.pendingHandoff) {
    triggerHandoff = true;
    handoffCause = age >= 72 ? 'death' : 'health_decline';
  }

  return {
    dynasty: {
      ...dynasty,
      currentFarmer: updatedFarmer,
      mentorFarmer: mentorExpired ? null : dynasty.mentorFarmer,
      mentorExpiresYear: mentorExpired ? null : dynasty.mentorExpiresYear,
    },
    triggerHandoff,
    handoffCause,
  };
}

export const INITIAL_DYNASTY_STATE: DynastyState = {
  legacyScore: 0,
  currentFarmer: createInitialFarmer(1970),
  ancestors: [],
  knowledgeBank: [],
  pendingHandoff: false,
  pendingHandoffCause: null,
  mentorFarmer: null,
  mentorExpiresYear: null,
};
