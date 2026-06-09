// data/lifeEvents.ts

export type LifeEventType =
  | 'meet_someone'
  | 'marriage_proposal'
  | 'pregnancy'
  | 'child_born'
  | 'child_school_event'
  | 'farm_interest_drop'
  | 'farm_interest_reveal'
  | 'illness_farmer'
  | 'illness_family'
  | 'county_fair'
  | 'neighbor_interaction'
  | 'sibling_friction'
  | 'sibling_buyout'
  | 'sibling_coowner_decision';

export type LifeEventChoiceEffect = {
  type:
    | 'none'
    | 'set_spouse_pending'
    | 'add_child'
    | 'update_member_health'
    | 'update_farm_interest'
    | 'update_neighbor_relationship';
  memberId?: string;
  neighborId?: string;
  delta?: number;
};

export type LifeEventChoice = {
  id: string;
  label: string;
  description: string;
  effect: LifeEventChoiceEffect;
  hasCost?: boolean;
  reputationDelta?: number;
};

export type LifeEventTemplate = {
  id: string;
  type: LifeEventType;
  tier: 'major' | 'minor';
  headline: string;
  narrativeTemplate: string;
  choices: LifeEventChoice[];
};

export type LifeEventGate = {
  templateId: string;
  minFarmerAge: number;
  maxFarmerAge: number;
  dailyChance: number;
  condition:
    | 'no_spouse'
    | 'has_spouse_pending'
    | 'has_spouse_married'
    | 'always'
    | 'has_young_children'
    | 'has_teen_children'
    | 'dynasty_handoff_pending';
};

export const LIFE_EVENT_GATES: LifeEventGate[] = [
  { templateId: 'meet_someone',             minFarmerAge: 20, maxFarmerAge: 32, dailyChance: 0.003,  condition: 'no_spouse' },
  { templateId: 'marriage_proposal',        minFarmerAge: 22, maxFarmerAge: 40, dailyChance: 0.008,  condition: 'has_spouse_pending' },
  { templateId: 'pregnancy',                minFarmerAge: 25, maxFarmerAge: 40, dailyChance: 0.004,  condition: 'has_spouse_married' },
  { templateId: 'child_school_event',       minFarmerAge: 30, maxFarmerAge: 60, dailyChance: 0.002,  condition: 'has_young_children' },
  { templateId: 'farm_interest_drop',       minFarmerAge: 35, maxFarmerAge: 55, dailyChance: 0.003,  condition: 'has_teen_children' },
  { templateId: 'illness_farmer',           minFarmerAge: 25, maxFarmerAge: 80, dailyChance: 0.001,  condition: 'always' },
  { templateId: 'illness_family',           minFarmerAge: 25, maxFarmerAge: 80, dailyChance: 0.001,  condition: 'has_spouse_married' },
  { templateId: 'county_fair',              minFarmerAge: 20, maxFarmerAge: 80, dailyChance: 0.003,  condition: 'always' },
  { templateId: 'neighbor_interaction',     minFarmerAge: 20, maxFarmerAge: 80, dailyChance: 0.0015, condition: 'always' },
  { templateId: 'sibling_coowner_decision', minFarmerAge: 20, maxFarmerAge: 80, dailyChance: 0,      condition: 'dynasty_handoff_pending' },
];

export const LIFE_EVENT_TEMPLATES: LifeEventTemplate[] = [
  {
    id: 'meet_someone',
    type: 'meet_someone',
    tier: 'major',
    headline: 'Someone catches your eye at the county fair',
    narrativeTemplate: "You've been talking for an hour. She knows more about soil drainage than most people you've met. You get the feeling this isn't the last time you'll see her.",
    choices: [
      { id: 'pursue',  label: 'Ask to meet again',                 description: 'Begin a relationship', effect: { type: 'set_spouse_pending' } },
      { id: 'slow',    label: 'Exchange numbers, see what happens', description: 'Slow start',           effect: { type: 'set_spouse_pending' } },
      { id: 'decline', label: 'Politely decline',                  description: 'Focus on the farm',    effect: { type: 'none' } },
    ],
  },
  {
    id: 'marriage_proposal',
    type: 'marriage_proposal',
    tier: 'major',
    headline: 'Will you propose?',
    narrativeTemplate: "You've known {memberName} for a while now. The farm feels like it could use a partner.",
    choices: [
      { id: 'propose', label: 'Propose marriage', description: 'A wedding this season', hasCost: true, effect: { type: 'none' }, reputationDelta: 5 },
      { id: 'wait',    label: 'Not quite yet',    description: 'Give it more time',                   effect: { type: 'none' } },
    ],
  },
  {
    id: 'pregnancy',
    type: 'pregnancy',
    tier: 'major',
    headline: 'Your family is growing',
    narrativeTemplate: "The news comes on a quiet morning. A child changes the rhythm of everything.",
    choices: [
      { id: 'welcome', label: 'Wonderful news',  description: 'Welcome the child', effect: { type: 'add_child' } },
      { id: 'prepare', label: 'Start preparing', description: 'Same outcome',      effect: { type: 'add_child' } },
    ],
  },
  {
    id: 'child_school_event',
    type: 'child_school_event',
    tier: 'minor',
    headline: "{memberName}'s school has an agricultural programme",
    narrativeTemplate: "The school is running a week-long farm visit. {memberName} is excited.",
    choices: [
      { id: 'enroll', label: 'Enroll them',    description: 'Farm interest +8', hasCost: true, effect: { type: 'update_farm_interest', delta: 8 } },
      { id: 'skip',   label: 'Skip this time', description: 'No change',                       effect: { type: 'none' } },
    ],
  },
  {
    id: 'farm_interest_drop',
    type: 'farm_interest_drop',
    tier: 'minor',
    headline: "{memberName} seems less interested in the farm lately",
    narrativeTemplate: "Friends, music, other plans — the farm feels less exciting to {memberName} this year.",
    choices: [
      { id: 'engage', label: 'Give them more responsibility', description: 'Farm interest −5, chance to recover', effect: { type: 'update_farm_interest', delta: -5 } },
      { id: 'space',  label: 'Give them space',              description: 'Farm interest −10',                   effect: { type: 'update_farm_interest', delta: -10 } },
    ],
  },
  {
    id: 'illness_farmer',
    type: 'illness_farmer',
    tier: 'major',
    headline: 'You fall ill',
    narrativeTemplate: "Three days in bed. The farm does not stop for illness.",
    choices: [
      { id: 'treat', label: 'See a doctor',    description: 'Health −5, cost deducted', hasCost: true, effect: { type: 'update_member_health', delta: -5 } },
      { id: 'rest',  label: 'Rest and recover', description: 'Health −15, no cost',                   effect: { type: 'update_member_health', delta: -15 } },
    ],
  },
  {
    id: 'illness_family',
    type: 'illness_family',
    tier: 'major',
    headline: '{memberName} is unwell',
    narrativeTemplate: "It started as a cough and has not improved. Medical care is not cheap.",
    choices: [
      { id: 'treat', label: 'Get medical treatment', description: 'Health −5, cost deducted', hasCost: true, effect: { type: 'update_member_health', delta: -5 } },
      { id: 'wait',  label: 'Wait and see',          description: 'Health −20, no cost',                    effect: { type: 'update_member_health', delta: -20 } },
    ],
  },
  {
    id: 'county_fair',
    type: 'county_fair',
    tier: 'minor',
    headline: 'The county fair is this weekend',
    narrativeTemplate: "Every farm in the area will have something on show.",
    choices: [
      { id: 'compete',  label: 'Enter livestock',            description: 'Reputation +6 if win',        effect: { type: 'none' }, reputationDelta: 6 },
      { id: 'sell',     label: 'Sell surplus animals',       description: '+15% price on sold animals',  effect: { type: 'none' } },
      { id: 'network',  label: 'Socialise with neighbours',  description: 'Neighbour relationships +5',  effect: { type: 'none' }, reputationDelta: 3 },
      { id: 'skip',     label: 'Skip this year',             description: 'No cost, no gain',            effect: { type: 'none' } },
    ],
  },
  {
    id: 'neighbor_interaction',
    type: 'neighbor_interaction',
    tier: 'minor',
    headline: 'A neighbouring farm needs help',
    narrativeTemplate: "One of the farms nearby is struggling with a harvest. A hand now could mean a favour later.",
    choices: [
      { id: 'help',   label: 'Lend a hand', description: 'Relationship +10 with that farm', effect: { type: 'update_neighbor_relationship', delta: 10 }, reputationDelta: 4 },
      { id: 'ignore', label: 'Too busy',    description: 'No change',                       effect: { type: 'none' } },
    ],
  },
  {
    id: 'sibling_friction',
    type: 'sibling_friction',
    tier: 'major',
    headline: '{memberName} disagrees with your decision',
    narrativeTemplate: "Your co-owner has a different view on how the farm should be run.",
    choices: [
      { id: 'agree',     label: 'Agree with them',   description: 'Co-owner relationship +5',  effect: { type: 'none' } },
      { id: 'negotiate', label: 'Find a compromise', description: 'No relationship change',     effect: { type: 'none' } },
      { id: 'override',  label: 'Override them',     description: 'Co-owner relationship −8',  effect: { type: 'none' } },
    ],
  },
  {
    id: 'sibling_buyout',
    type: 'sibling_buyout',
    tier: 'major',
    headline: '{memberName} wants out',
    narrativeTemplate: "The relationship has been strained for too long. {memberName} has proposed a buyout.",
    choices: [
      { id: 'buy_them_out', label: 'Buy their share',    description: 'Full ownership, pay market rate', hasCost: true, effect: { type: 'none' } },
      { id: 'sell_to_them', label: 'Sell your share',    description: 'Exit co-ownership',               effect: { type: 'none' } },
      { id: 'renegotiate',  label: 'Renegotiate terms',  description: 'Relationship resets to 30',        effect: { type: 'none' } },
    ],
  },
  {
    id: 'sibling_coowner_decision',
    type: 'sibling_coowner_decision',
    tier: 'major',
    headline: 'Multiple heirs want the farm',
    narrativeTemplate: "More than one of your children is ready to take over. Who leads, and what happens to the others?",
    choices: [
      { id: 'coown',     label: 'Share ownership', description: 'Two heirs co-own the farm together', effect: { type: 'none' } },
      { id: 'sole_heir', label: 'Choose one heir', description: 'Others stay as skilled workers',      effect: { type: 'none' } },
    ],
  },
];
