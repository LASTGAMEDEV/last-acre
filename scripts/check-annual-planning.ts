import {
  advanceAnnualPlanningForDay,
  generateAnnualPlanDraft,
  recommendAdvisor,
  updateAnnualPlanProgress,
  type AnnualPlanningInput,
} from '../engine/annualPlanning';

const input: AnnualPlanningInput = {
  day: 1,
  calendarYear: 1970,
  money: 850,
  savingsBalance: 0,
  debtOwed: 12000,
  ownedHectares: 8,
  idleHectares: 5,
  plantedHectares: 3,
  averageOrganicMatter: 3.2,
  averageCompaction: 42,
  inventoryValue: 650,
  storageRiskCount: 1,
  animalCount: 4,
  lowWelfareAnimalCount: 2,
  machineCount: 1,
  activeRepairCount: 1,
  activeContractCount: 2,
  urgentContractCount: 1,
  workerCount: 0,
  averageWorkerSatisfaction: 0,
  buildingCount: 2,
  processingBuildingCount: 0,
  csaActive: false,
  coopMember: false,
  neighbourPressure: 35,
  recentRevenue: 0,
  completedContracts: 0,
};

const advisor = recommendAdvisor(input);
if (advisor !== 'steady_steward') {
  throw new Error(`Expected steady steward for low cash and debt; got ${advisor}`);
}

const draft = generateAnnualPlanDraft(input, advisor);
if (draft.goals.length < 4 || draft.goals.length > 7) {
  throw new Error(`Expected 4-7 annual goals; got ${draft.goals.length}`);
}
if (draft.forecasts.length < 4) {
  throw new Error('Expected multiple forecast cards');
}
if (!draft.risks.some(risk => risk.severity === 'danger' || risk.severity === 'warning')) {
  throw new Error('Expected risk warnings for stressed input');
}

const approved = {
  ...draft,
  id: 'plan-test',
  status: 'active' as const,
  approvedDay: input.day,
  progressPercent: 0,
  completedGoalIds: [],
  rewarded: false,
};

const improvedInput: AnnualPlanningInput = {
  ...input,
  money: 9000,
  savingsBalance: 5000,
  debtOwed: 0,
  activeContractCount: 0,
  urgentContractCount: 0,
  activeRepairCount: 0,
  completedContracts: 3,
};
const progressed = updateAnnualPlanProgress(improvedInput, approved);
if (!progressed.goals.some(goal => goal.completed)) {
  throw new Error('Expected at least one goal to complete after farm state improves');
}

const tick = advanceAnnualPlanningForDay(
  { ...improvedInput, day: 366, calendarYear: 1971 },
  progressed,
);
if (!tick.review || tick.next.status !== 'reviewed') {
  throw new Error('Expected a year-end review when active plan year closes');
}
if (tick.reward.legacyReputation <= 0) {
  throw new Error('Expected completed annual goals to create a soft legacy reward');
}

console.log('annual planning check passed');
