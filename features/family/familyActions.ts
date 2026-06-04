// features/family/familyActions.ts

import type { ActionFactory } from '../../store/actions/types';
import type { FarmRole, FamilyMember } from './familyTypes';
import type { NeighborId } from '../../data/neighborData';
import { LIFE_EVENT_TEMPLATES } from '../../data/lifeEvents';
import {
  applyLifeEventChoice, initiateCoOwnership,
  applyFrictionChoice, resolveBuyout,
} from './familyEngine';
import { gameDayToCalendarYear } from '../../engine/calendarUtils';

/** Era-calibrated cost for events that have hasCost: true */
function computeLifeEventCost(templateId: string, choiceId: string, calendarYear: number): number {
  switch (templateId) {
    case 'marriage_proposal':
      if (choiceId !== 'propose') return 0;
      if (calendarYear < 1980) return 2000;
      if (calendarYear < 1990) return 6000;
      if (calendarYear < 2000) return 14000;
      if (calendarYear < 2010) return 22000;
      return 32000;
    case 'illness_farmer':
    case 'illness_family':
      if (choiceId !== 'treat') return 0;
      if (calendarYear < 1980) return 300;
      if (calendarYear < 1995) return 800;
      if (calendarYear < 2010) return 2500;
      return 5000;
    case 'child_school_event':
      if (choiceId !== 'enroll') return 0;
      return calendarYear < 1990 ? 200 : calendarYear < 2005 ? 400 : 800;
    default:
      return 0;
  }
}

export interface FamilyActions {
  makeLifeEventChoice: (eventId: string, choiceId: string) => void;
  setFamilyMemberRole: (memberId: string, role: FarmRole | undefined) => void;
  initiateCoOwnershipAction: (siblingId: string, playerShare: number) => void;
  applyFrictionChoiceAction: (choiceId: string) => void;
  resolveBuyoutAction: (choiceId: 'buy_them_out' | 'sell_to_them' | 'renegotiate') => void;
  completeGameSetup: (farmName: string, farmerFirstName: string, backstory: 'first_gen' | 'inherited' | 'established') => void;
}

export const createFamilyActions: ActionFactory<FamilyActions> = (set, get) => ({
  makeLifeEventChoice: (eventId, choiceId) => {
    const state = get();
    // NOTE: state.family, state.reputation, state.neighbors, state.money, state.day
    // are pre-Task-9 fields — TypeScript will error until GameState is extended in Task 9.
    const calYear = gameDayToCalendarYear(state.day);
    const event = state.family.pendingLifeEvents.find(e => e.id === eventId);
    const template = event ? LIFE_EVENT_TEMPLATES.find(t => t.id === event.templateId) : undefined;
    const choice = template?.choices.find(c => c.id === choiceId);
    const cost = choice?.hasCost ? computeLifeEventCost(event!.templateId, choiceId, calYear) : 0;

    const { family: newFamily, cashDelta, reputationDelta } = applyLifeEventChoice(
      state.family, eventId, choiceId, calYear, cost
    );

    // Inline community standing delta — will be refactored once reputationEngine exists (Task 7)
    const newReputation = reputationDelta !== 0
      ? { ...state.reputation, communityStandingDelta: (state.reputation.communityStandingDelta ?? 0) + reputationDelta }
      : state.reputation;

    // Handle neighbor relationship updates for neighbor_interaction events
    let newNeighbors = state.neighbors;
    if (event?.neighborId && choice?.effect.type === 'update_neighbor_relationship') {
      const delta = choice.effect.delta ?? 0;
      const farm = state.neighbors[event.neighborId as NeighborId];
      if (farm) {
        newNeighbors = {
          ...state.neighbors,
          [event.neighborId]: {
            ...farm,
            relationship: Math.max(0, Math.min(100, farm.relationship + delta)),
          },
        };
      }
    }

    set({ family: newFamily, reputation: newReputation, neighbors: newNeighbors, money: state.money + cashDelta });
  },

  setFamilyMemberRole: (memberId, role) => {
    set(state => {
      const update = (m: FamilyMember): FamilyMember =>
        m.id === memberId ? { ...m, farmRole: role } : m;
      return {
        family: {
          ...state.family,
          spouse:   state.family.spouse ? update(state.family.spouse) : undefined,
          children: state.family.children.map(update),
        },
      };
    });
  },

  initiateCoOwnershipAction: (siblingId, playerShare) => {
    set(state => ({ family: initiateCoOwnership(state.family, siblingId, playerShare) }));
  },

  applyFrictionChoiceAction: (choiceId) => {
    set(state => ({ family: applyFrictionChoice(state.family, choiceId) }));
  },

  resolveBuyoutAction: (choiceId) => {
    const state = get();
    const buyoutCost = choiceId === 'buy_them_out' && state.family.coOwner
      ? Math.floor(50 * 500 * (1 - state.family.coOwner.playerOwnershipShare / 100))
      : 0;
    set({
      family: resolveBuyout(state.family, choiceId),
      money: state.money - buyoutCost,
    });
  },

  completeGameSetup: (farmName, farmerFirstName, backstory) => {
    const assets = {
      first_gen:   { money: 8000,  repScore: 5  + Math.floor(Math.random() * 11) },
      inherited:   { money: 22000, repScore: 20 + Math.floor(Math.random() * 16) },
      established: { money: 45000, repScore: 35 + Math.floor(Math.random() * 21) },
    }[backstory];

    set(state => ({
      farmName,
      money: assets.money,
      reputation: {
        ...state.reputation,
        score: assets.repScore,
        tier: assets.repScore >= 40 ? 'respected' : assets.repScore >= 20 ? 'local' : ('unknown' as const),
      },
      dynasty: {
        ...state.dynasty,
        currentFarmer: { ...state.dynasty.currentFarmer, firstName: farmerFirstName },
      },
      gameSetupComplete: true,
    }));
  },
});
