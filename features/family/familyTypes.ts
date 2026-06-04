// features/family/familyTypes.ts

import type { NeighborId } from '../../data/neighborData';

export type FarmRole =
  | 'livestock_manager'
  | 'crop_assistant'
  | 'machinery_operator'
  | 'office_manager'
  | 'general_help';

export type PersonalityTraits = {
  ambitious: boolean;
  traditional: boolean;
  techSavvy: boolean;
  entrepreneurial: boolean;
  contentious: boolean;
};

export type FamilyMember = {
  id: string;
  firstName: string;
  relation: 'spouse' | 'child';
  birthYear: number;
  age: number;
  health: number;
  personality: PersonalityTraits;
  farmInterest: number;
  farmRole?: FarmRole;
  relationshipWithFarmer: number;
  isAlive: boolean;
  isMarried?: boolean;
};

export type CoOwnerState = {
  sibling: FamilyMember;
  playerOwnershipShare: number;
  relationship: number;
  frictionEventsPerYear: number;
  frictionEventsFiredThisYear: number;
};

export type PendingLifeEvent = {
  id: string;
  templateId: string;
  memberId?: string;
  neighborId?: NeighborId;
  calendarYear: number;
};

export type FamilyState = {
  spouse?: FamilyMember;
  children: FamilyMember[];
  pendingLifeEvents: PendingLifeEvent[];
  coOwner?: CoOwnerState;
  familyStartYear?: number;
  hasSpousePending: boolean;
  lastCountyFairYear: number;
};

export type FamilyRoleEffects = {
  animalCareMultiplier: number;
  cropSpeedMultiplier: number;
  machineryMaintenanceMultiplier: number;
  loanRateMultiplier: number;
  generalMultiplier: number;
};

export const INITIAL_FAMILY_STATE: FamilyState = {
  spouse: undefined,
  children: [],
  pendingLifeEvents: [],
  coOwner: undefined,
  familyStartYear: undefined,
  hasSpousePending: false,
  lastCountyFairYear: 0,
};
