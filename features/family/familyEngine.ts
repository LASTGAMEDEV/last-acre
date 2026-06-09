// features/family/familyEngine.ts
// Pure functions only. No Zustand imports.

import { FIRST_NAMES, LAST_NAMES } from '../../data/farmerNames';
import { LIFE_EVENT_GATES, LIFE_EVENT_TEMPLATES } from '../../data/lifeEvents';
import {
  FamilyState, FamilyMember, FamilyRoleEffects, CoOwnerState,
  PendingLifeEvent, FarmRole,
} from './familyTypes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function makePendingEventId(templateId: string, day: number): string {
  return `${templateId}-${day}-${Math.random().toString(36).slice(2, 6)}`;
}

export function farmerAgeFromBirthYear(birthYear: number, calendarYear: number): number {
  return calendarYear - birthYear;
}

export function createFamilyMember(
  relation: 'spouse' | 'child',
  calendarYear: number,
  options: Partial<{ birthYear: number; farmInterestBase: number }> = {}
): FamilyMember {
  const birthYear = options.birthYear ?? (
    relation === 'spouse' ? calendarYear - randomInt(22, 32) : calendarYear
  );
  return {
    id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    firstName: randomFrom(FIRST_NAMES),
    relation,
    birthYear,
    age: calendarYear - birthYear,
    health: 100,
    personality: {
      ambitious:       Math.random() < 0.4,
      traditional:     Math.random() < 0.4,
      techSavvy:       Math.floor(birthYear / 10) * 10 >= 1980,
      entrepreneurial: Math.random() < 0.35,
      contentious:     Math.random() < 0.25,
    },
    farmInterest: options.farmInterestBase ?? randomInt(20, 65),
    farmRole: undefined,
    relationshipWithFarmer: randomInt(60, 90),
    isAlive: true,
    isMarried: relation === 'spouse' ? false : undefined,
  };
}

export function ageFamilyMembers(family: FamilyState): FamilyState {
  return {
    ...family,
    spouse:   family.spouse ? { ...family.spouse, age: family.spouse.age + 1 } : undefined,
    children: family.children.map(c => ({ ...c, age: c.age + 1 })),
  };
}

export function computeFamilyRoleEffects(family: FamilyState): FamilyRoleEffects {
  const effects: FamilyRoleEffects = {
    animalCareMultiplier:           1.0,
    cropSpeedMultiplier:            1.0,
    machineryMaintenanceMultiplier: 1.0,
    loanRateMultiplier:             1.0,
    generalMultiplier:              1.0,
  };

  const members = [family.spouse, ...family.children].filter(
    (m): m is FamilyMember => m !== undefined && m.isAlive
  );

  for (const m of members) {
    switch (m.farmRole) {
      case 'livestock_manager':  effects.animalCareMultiplier           = Math.min(effects.animalCareMultiplier * 1.15, 2.0);   break;
      case 'crop_assistant':     effects.cropSpeedMultiplier            = Math.min(effects.cropSpeedMultiplier * 1.2, 2.0);     break;
      case 'machinery_operator': effects.machineryMaintenanceMultiplier = Math.max(effects.machineryMaintenanceMultiplier * 0.85, 0.4); break;
      case 'office_manager':     effects.loanRateMultiplier             = Math.max(effects.loanRateMultiplier * 0.95, 0.6);     break;
      case 'general_help':       effects.generalMultiplier              = Math.min(effects.generalMultiplier * 1.05, 1.3);      break;
    }
  }

  return effects;
}

// ── Life Event Generation ─────────────────────────────────────────────────────

function getEligibleGates(
  family: FamilyState,
  farmerAge: number,
  calendarYear: number,
  dynastyHandoffPending: boolean
) {
  return LIFE_EVENT_GATES.filter(gate => {
    if (farmerAge < gate.minFarmerAge || farmerAge > gate.maxFarmerAge) return false;
    switch (gate.condition) {
      case 'no_spouse':              return !family.spouse && !family.hasSpousePending;
      case 'has_spouse_pending':     return family.hasSpousePending && !family.spouse?.isMarried;
      case 'has_spouse_married':     return !!family.spouse?.isMarried;
      case 'has_young_children':     return family.children.some(c => c.age >= 8 && c.age <= 14);
      case 'has_teen_children':      return family.children.some(c => c.age >= 15 && c.age <= 17);
      case 'dynasty_handoff_pending':
        return dynastyHandoffPending && family.children.filter(c => c.farmInterest >= 60).length >= 2;
      case 'always':
        if (gate.templateId === 'county_fair') return calendarYear > family.lastCountyFairYear;
        return true;
      default: return false;
    }
  });
}

export function advanceFamilyDay(
  family: FamilyState,
  currentDay: number,
  calendarYear: number,
  prevCalendarYear: number,
  farmerBirthYear: number,
  dynastyHandoffPending: boolean,
  rand: number
): { family: FamilyState; newEvent: PendingLifeEvent | null } {
  let updated = family;
  const isNewYear = calendarYear > prevCalendarYear;

  if (isNewYear) {
    updated = ageFamilyMembers(updated);

    // Annual farm interest drift
    updated = {
      ...updated,
      children: updated.children.map(child => {
        if (child.age < 6 || child.age > 22) return child;
        const delta = child.age < 15 ? randomInt(0, 3) : child.age <= 17 ? -randomInt(0, 2) : 0;
        return { ...child, farmInterest: Math.max(0, Math.min(100, child.farmInterest + delta)) };
      }),
    };

    // Guaranteed heir nudge
    const hasHeir = updated.children.some(c => c.age >= 18 && c.farmInterest >= 60);
    if (!hasHeir) {
      const eligible = updated.children.filter(c => c.age < 18);
      if (eligible.length > 0) {
        const top = [...eligible].sort((a, b) => b.farmInterest - a.farmInterest)[0];
        const yearsLeft = Math.max(1, 18 - top.age);
        const needed = Math.max(0, 60 - top.farmInterest);
        if (needed > 0 && needed / yearsLeft > 3) {
          updated = {
            ...updated,
            children: updated.children.map(c =>
              c.id === top.id
                ? { ...c, farmInterest: Math.min(100, c.farmInterest + Math.ceil(needed / yearsLeft)) }
                : c
            ),
          };
        }
      }
    }

    // Farm interest reveal at 18
    const revealed = updated.children.filter(c => c.age === 18);
    if (revealed.length > 0 && updated.pendingLifeEvents.length === 0) {
      const event: PendingLifeEvent = {
        id: makePendingEventId('farm_interest_reveal', currentDay),
        templateId: 'farm_interest_reveal',
        memberId: revealed[0].id,
        calendarYear,
      };
      return { family: { ...updated, pendingLifeEvents: [event] }, newEvent: event };
    }
  }

  // Don't generate new events if queue is non-empty
  if (updated.pendingLifeEvents.length > 0) return { family: updated, newEvent: null };

  const farmerAge = farmerAgeFromBirthYear(farmerBirthYear, calendarYear);
  const gates = getEligibleGates(updated, farmerAge, calendarYear, dynastyHandoffPending);

  for (const gate of gates) {
    const shouldFire = gate.dailyChance === 0 || rand < gate.dailyChance;
    if (!shouldFire) continue;

    let memberId: string | undefined;
    if (gate.condition === 'has_young_children') {
      const pool = updated.children.filter(c => c.age >= 8 && c.age <= 14);
      memberId = pool[Math.floor(Math.random() * pool.length)]?.id;
    } else if (gate.condition === 'has_teen_children') {
      const pool = updated.children.filter(c => c.age >= 15 && c.age <= 17);
      memberId = pool[Math.floor(Math.random() * pool.length)]?.id;
    } else if (gate.condition === 'has_spouse_married') {
      memberId = updated.spouse?.id;
    }

    const event: PendingLifeEvent = {
      id: makePendingEventId(gate.templateId, currentDay),
      templateId: gate.templateId,
      memberId,
      calendarYear,
    };

    return {
      family: {
        ...updated,
        pendingLifeEvents: [event],
        lastCountyFairYear: gate.templateId === 'county_fair' ? calendarYear : updated.lastCountyFairYear,
      },
      newEvent: event,
    };
  }

  return { family: updated, newEvent: null };
}

export function applyLifeEventChoice(
  family: FamilyState,
  eventId: string,
  choiceId: string,
  calendarYear: number,
  cost: number
): { family: FamilyState; cashDelta: number; reputationDelta: number } {
  const event = family.pendingLifeEvents.find(e => e.id === eventId);
  if (!event) return { family, cashDelta: 0, reputationDelta: 0 };

  const template = LIFE_EVENT_TEMPLATES.find(t => t.id === event.templateId);
  if (!template) return { family, cashDelta: 0, reputationDelta: 0 };

  const choice = template.choices.find(c => c.id === choiceId);
  if (!choice) return { family, cashDelta: 0, reputationDelta: 0 };

  let updated: FamilyState = {
    ...family,
    pendingLifeEvents: family.pendingLifeEvents.filter(e => e.id !== eventId),
  };

  switch (choice.effect.type) {
    case 'set_spouse_pending':
      updated = { ...updated, hasSpousePending: true };
      break;
    case 'add_child': {
      const child = createFamilyMember('child', calendarYear);
      updated = { ...updated, children: [...updated.children, child] };
      break;
    }
    case 'update_member_health': {
      const delta = choice.effect.delta ?? 0;
      const applyHealth = (m: FamilyMember) =>
        m.id === event.memberId ? { ...m, health: Math.max(0, Math.min(100, m.health + delta)) } : m;
      updated = {
        ...updated,
        children: updated.children.map(applyHealth),
        spouse: updated.spouse ? applyHealth(updated.spouse) : undefined,
      };
      break;
    }
    case 'update_farm_interest': {
      const delta = choice.effect.delta ?? 0;
      updated = {
        ...updated,
        children: updated.children.map(c =>
          c.id === event.memberId
            ? { ...c, farmInterest: Math.max(0, Math.min(100, c.farmInterest + delta)) }
            : c
        ),
      };
      break;
    }
    case 'none':
    default:
      break;
  }

  if (event.templateId === 'marriage_proposal' && choiceId === 'propose') {
    const newSpouse = createFamilyMember('spouse', calendarYear);
    updated = {
      ...updated,
      spouse: { ...newSpouse, isMarried: true },
      hasSpousePending: false,
      familyStartYear: calendarYear,
    };
  }

  return { family: updated, cashDelta: -cost, reputationDelta: choice.reputationDelta ?? 0 };
}

// ── Co-Ownership ──────────────────────────────────────────────────────────────

export function initiateCoOwnership(
  family: FamilyState,
  siblingId: string,
  playerOwnershipShare: number
): FamilyState {
  const sibling = family.children.find(c => c.id === siblingId);
  if (!sibling) return family;
  return {
    ...family,
    coOwner: {
      sibling,
      playerOwnershipShare,
      relationship: 70,
      frictionEventsPerYear: sibling.personality.contentious ? 4 : 2,
      frictionEventsFiredThisYear: 0,
    },
  };
}

export function maybeGenerateFrictionEvent(
  family: FamilyState,
  currentDay: number,
  calendarYear: number
): { family: FamilyState; frictionEvent: PendingLifeEvent | null } {
  if (!family.coOwner) return { family, frictionEvent: null };

  const resetFamily = { ...family, coOwner: { ...family.coOwner, frictionEventsFiredThisYear: 0 } };

  if (family.coOwner.relationship < 20 && family.pendingLifeEvents.length === 0) {
    const buyout: PendingLifeEvent = {
      id: makePendingEventId('sibling_buyout', currentDay),
      templateId: 'sibling_buyout',
      memberId: family.coOwner.sibling.id,
      calendarYear,
    };
    return { family: { ...resetFamily, pendingLifeEvents: [buyout] }, frictionEvent: buyout };
  }

  return { family: resetFamily, frictionEvent: null };
}

export function applyFrictionChoice(family: FamilyState, choiceId: string): FamilyState {
  if (!family.coOwner) return family;
  const delta = choiceId === 'agree' ? 5 : choiceId === 'negotiate' ? 0 : -8;
  return {
    ...family,
    coOwner: {
      ...family.coOwner,
      relationship: Math.max(0, Math.min(100, family.coOwner.relationship + delta)),
      frictionEventsFiredThisYear: family.coOwner.frictionEventsFiredThisYear + 1,
    },
  };
}

export function resolveBuyout(
  family: FamilyState,
  choiceId: 'buy_them_out' | 'sell_to_them' | 'renegotiate'
): FamilyState {
  if (!family.coOwner) return family;
  if (choiceId === 'renegotiate') return { ...family, coOwner: { ...family.coOwner, relationship: 30 } };
  return { ...family, coOwner: undefined };
}
