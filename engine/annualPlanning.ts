import type {
  AdvisorStyle,
  AnnualPlan,
  AnnualPlanDraft,
  AnnualPlanForecast,
  AnnualPlanGoal,
  AnnualPlanGoalCategory,
  AnnualPlanMetric,
  AnnualPlanRecommendation,
  AnnualPlanReview,
  AnnualPlanReward,
  AnnualPlanRisk,
  AnnualPlanningState,
} from '../types/domain/annualPlanning';

export type {
  AdvisorStyle,
  AnnualPlan,
  AnnualPlanDraft,
  AnnualPlanForecast,
  AnnualPlanGoal,
  AnnualPlanRecommendation,
  AnnualPlanReview,
  AnnualPlanningState,
} from '../types/domain/annualPlanning';

export interface AnnualPlanningInput {
  day: number;
  calendarYear: number;
  money: number;
  savingsBalance: number;
  debtOwed: number;
  ownedHectares: number;
  idleHectares: number;
  plantedHectares: number;
  averageOrganicMatter: number;
  averageCompaction: number;
  inventoryValue: number;
  storageRiskCount: number;
  animalCount: number;
  lowWelfareAnimalCount: number;
  machineCount: number;
  activeRepairCount: number;
  activeContractCount: number;
  urgentContractCount: number;
  workerCount: number;
  averageWorkerSatisfaction: number;
  buildingCount: number;
  processingBuildingCount: number;
  csaActive: boolean;
  coopMember: boolean;
  neighbourPressure: number;
  recentRevenue: number;
  completedContracts: number;
}

interface GoalTemplate {
  key: string;
  advisorWeight: AdvisorStyle[];
  category: AnnualPlanGoalCategory;
  title: string;
  description: string;
  metric: AnnualPlanMetric;
  target: (input: AnnualPlanningInput) => number;
  unit: string;
  required: boolean | ((input: AnnualPlanningInput) => boolean);
  adjustable: boolean;
  reward: AnnualPlanReward;
}

export const ADVISOR_LABELS: Record<AdvisorStyle, string> = {
  steady_steward: 'Steady Steward',
  expansion_planner: 'Expansion Planner',
  soil_sustainability: 'Soil & Sustainability Advisor',
  market_strategist: 'Market Strategist',
  livestock_operator: 'Livestock Operator',
  community_builder: 'Community Builder',
};

export const ADVISOR_DESCRIPTIONS: Record<AdvisorStyle, string> = {
  steady_steward: 'Keeps the year focused on debt, savings, repairs, and reliability.',
  expansion_planner: 'Pushes land, buildings, machines, workers, and production capacity.',
  soil_sustainability: 'Prioritizes rotation, organic matter, water care, and long-term land health.',
  market_strategist: 'Looks for storage, contracts, futures, selling channels, and processing margin.',
  livestock_operator: 'Centers feed, welfare, breeding, production buildings, and winter readiness.',
  community_builder: 'Builds workers, CSA, co-op ties, reputation, and local trust.',
};

const DEFAULT_REWARD: AnnualPlanReward = {
  legacyReputation: 1,
  workerMorale: 0,
  label: '+1 legacy reputation',
};

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    key: 'cash-reserve',
    advisorWeight: ['steady_steward', 'community_builder'],
    category: 'finance',
    title: 'Build a cash reserve',
    description: 'Finish the year with enough cash and savings to absorb seed, feed, repair, or weather shocks.',
    metric: 'savingsAbove',
    target: input => Math.max(5000, Math.round((input.debtOwed * 0.2 + input.ownedHectares * 450) / 100) * 100),
    unit: '$',
    required: true,
    adjustable: true,
    reward: { legacyReputation: 2, workerMorale: 1, label: '+2 legacy, small morale lift' },
  },
  {
    key: 'debt-control',
    advisorWeight: ['steady_steward'],
    category: 'finance',
    title: 'Bring debt under control',
    description: 'Reduce exposure so a bad market week or weather event does not force emergency selling.',
    metric: 'debtBelow',
    target: input => Math.max(0, Math.round(Math.max(2500, input.debtOwed * 0.7) / 100) * 100),
    unit: '$',
    required: inputRequired,
    adjustable: true,
    reward: { legacyReputation: 2, workerMorale: 0, label: '+2 legacy reputation' },
  },
  {
    key: 'plant-owned-land',
    advisorWeight: ['expansion_planner', 'soil_sustainability'],
    category: 'planting',
    title: 'Put owned land to work',
    description: 'Plant enough hectares to keep the farm loop moving without forcing automation.',
    metric: 'plantedHectares',
    target: input => Math.max(3, Math.ceil(input.ownedHectares * 0.65)),
    unit: 'ha',
    required: true,
    adjustable: true,
    reward: DEFAULT_REWARD,
  },
  {
    key: 'idle-land',
    advisorWeight: ['expansion_planner'],
    category: 'planting',
    title: 'Reduce idle fields',
    description: 'Keep empty owned fields from becoming the hidden bottleneck in the year plan.',
    metric: 'idleHectaresBelow',
    target: input => Math.max(0, Math.floor(input.ownedHectares * 0.25)),
    unit: 'ha',
    required: false,
    adjustable: true,
    reward: DEFAULT_REWARD,
  },
  {
    key: 'soil-organic-matter',
    advisorWeight: ['soil_sustainability'],
    category: 'soil',
    title: 'Protect soil organic matter',
    description: 'Keep the average organic matter line healthy enough for future crop plans.',
    metric: 'averageOrganicMatter',
    target: input => Math.min(8, Math.max(3.5, Number((input.averageOrganicMatter + 0.2).toFixed(1)))),
    unit: '%',
    required: true,
    adjustable: true,
    reward: { legacyReputation: 2, workerMorale: 0, label: '+2 legacy reputation' },
  },
  {
    key: 'contracts',
    advisorWeight: ['market_strategist', 'community_builder'],
    category: 'market',
    title: 'Deliver reliable contracts',
    description: 'Use contracts as stable demand without selling promised inventory by mistake.',
    metric: 'fulfilledContracts',
    target: input => Math.max(1, input.activeContractCount + 1),
    unit: 'contracts',
    required: false,
    adjustable: true,
    reward: { legacyReputation: 2, workerMorale: 1, label: '+2 legacy, small morale lift' },
  },
  {
    key: 'inventory-value',
    advisorWeight: ['market_strategist'],
    category: 'market',
    title: 'Build sellable inventory value',
    description: 'Create enough marketable stock to make storage, contracts, or price timing meaningful.',
    metric: 'inventoryValue',
    target: input => Math.max(1500, Math.round((input.inventoryValue + input.ownedHectares * 350) / 100) * 100),
    unit: '$',
    required: false,
    adjustable: true,
    reward: DEFAULT_REWARD,
  },
  {
    key: 'welfare',
    advisorWeight: ['livestock_operator'],
    category: 'livestock',
    title: 'Stabilize animal welfare',
    description: 'Keep welfare trouble from turning livestock into a daily cost sink.',
    metric: 'lowWelfareAnimalCountBelow',
    target: () => 1,
    unit: 'animals',
    required: true,
    adjustable: false,
    reward: { legacyReputation: 1, workerMorale: 2, label: '+1 legacy, +2 worker morale' },
  },
  {
    key: 'herd-growth',
    advisorWeight: ['livestock_operator'],
    category: 'livestock',
    title: 'Grow livestock capacity carefully',
    description: 'Add animals only when feed, housing, and production support can keep up.',
    metric: 'animalCount',
    target: input => Math.max(2, input.animalCount + 2),
    unit: 'animals',
    required: false,
    adjustable: true,
    reward: DEFAULT_REWARD,
  },
  {
    key: 'repairs',
    advisorWeight: ['steady_steward', 'expansion_planner'],
    category: 'machinery',
    title: 'Clear critical repairs',
    description: 'Avoid entering peak planting or harvest windows with broken machinery.',
    metric: 'activeRepairCountBelow',
    target: () => 1,
    unit: 'repairs',
    required: false,
    adjustable: false,
    reward: DEFAULT_REWARD,
  },
  {
    key: 'processing',
    advisorWeight: ['market_strategist', 'expansion_planner'],
    category: 'infrastructure',
    title: 'Add processing capacity',
    description: 'Create a value-add path before relying only on commodity prices.',
    metric: 'processingBuildingCount',
    target: input => Math.max(1, input.processingBuildingCount),
    unit: 'buildings',
    required: false,
    adjustable: false,
    reward: DEFAULT_REWARD,
  },
  {
    key: 'worker-capacity',
    advisorWeight: ['community_builder', 'expansion_planner'],
    category: 'community',
    title: 'Build a dependable team',
    description: 'Hire or retain enough staff to support the farm without overloading one system.',
    metric: 'workerCount',
    target: input => Math.max(1, input.workerCount + 1),
    unit: 'workers',
    required: false,
    adjustable: true,
    reward: { legacyReputation: 1, workerMorale: 2, label: '+1 legacy, +2 worker morale' },
  },
  {
    key: 'csa',
    advisorWeight: ['community_builder'],
    category: 'community',
    title: 'Strengthen local customers',
    description: 'Use CSA or local relationships to build trust outside commodity markets.',
    metric: 'csaActive',
    target: () => 1,
    unit: '',
    required: false,
    adjustable: false,
    reward: { legacyReputation: 2, workerMorale: 1, label: '+2 legacy, small morale lift' },
  },
  {
    key: 'land-base',
    advisorWeight: ['expansion_planner'],
    category: 'infrastructure',
    title: 'Expand the working land base',
    description: 'Acquire or lease land only if the operating base can support it.',
    metric: 'ownedHectares',
    target: input => Math.ceil(input.ownedHectares + Math.max(2, input.ownedHectares * 0.15)),
    unit: 'ha',
    required: false,
    adjustable: true,
    reward: DEFAULT_REWARD,
  },
];

function inputRequired(input: AnnualPlanningInput): boolean {
  return input.debtOwed > 0;
}

export function createInitialAnnualPlanningState(year: number): AnnualPlanningState {
  return {
    activeYear: year,
    status: 'none',
    dismissedRecommendationIds: [],
  };
}

export function recommendAdvisor(input: AnnualPlanningInput): AdvisorStyle {
  if (input.debtOwed > Math.max(5000, input.money * 2) || input.money < 1500 || input.activeRepairCount > 0) {
    return 'steady_steward';
  }
  if (input.lowWelfareAnimalCount > 0 || input.animalCount >= 3) return 'livestock_operator';
  if (input.urgentContractCount > 0 || input.inventoryValue > 3000 || input.activeContractCount > 1) return 'market_strategist';
  if (input.averageOrganicMatter < 3.5 || input.averageCompaction > 55) return 'soil_sustainability';
  if (input.money > 15000 && input.ownedHectares < 20) return 'expansion_planner';
  if (input.workerCount > 0 || input.csaActive || input.coopMember) return 'community_builder';
  return 'steady_steward';
}

export function generateAnnualPlanDraft(input: AnnualPlanningInput, advisor: AdvisorStyle): AnnualPlanDraft {
  const goals = chooseGoals(input, advisor);
  const draft: AnnualPlanDraft = {
    id: `draft-${input.calendarYear}-${advisor}-${input.day}`,
    year: input.calendarYear,
    advisor,
    createdDay: input.day,
    status: 'draft',
    goals,
    forecasts: generateForecastCards(input),
    risks: generateRiskWarnings(input),
    recommendations: [],
  };
  return {
    ...draft,
    recommendations: generateAnnualPlanRecommendations(input, approveDraftForPreview(draft)),
  };
}

export function approveAnnualPlanDraft(input: AnnualPlanningInput, draft: AnnualPlanDraft): AnnualPlan {
  return updateAnnualPlanProgress(input, {
    ...draft,
    id: `plan-${draft.year}-${draft.advisor}-${draft.createdDay}`,
    status: 'active',
    approvedDay: input.day,
    progressPercent: 0,
    completedGoalIds: [],
    rewarded: false,
  });
}

export function updateAnnualPlanProgress(input: AnnualPlanningInput, plan: AnnualPlan): AnnualPlan {
  const goals = plan.goals.map(goal => {
    const current = currentMetricValue(input, goal.metric);
    return {
      ...goal,
      current,
      completed: isGoalComplete(goal.metric, current, goal.target),
    };
  });
  const completedGoalIds = goals.filter(goal => goal.completed).map(goal => goal.id);
  const progressPercent = goals.length === 0 ? 0 : Math.round((completedGoalIds.length / goals.length) * 100);
  const refreshed = { ...plan, goals, completedGoalIds, progressPercent };
  return {
    ...refreshed,
    forecasts: generateForecastCards(input),
    risks: generateRiskWarnings(input),
    recommendations: generateAnnualPlanRecommendations(input, refreshed),
  };
}

export function generateAnnualPlanRecommendations(input: AnnualPlanningInput, plan: AnnualPlan): AnnualPlanRecommendation[] {
  const recommendations: AnnualPlanRecommendation[] = [];
  const dayOfYear = ((input.day - 1) % 365) + 1;

  if (dayOfYear <= 90 && plan.goals.some(goal => goal.metric === 'plantedHectares' && !goal.completed)) {
    recommendations.push({
      id: `planting-window-${plan.year}`,
      title: 'Planting window is open',
      body: 'Owned land is part of this year plan. Check fields, seed, soil, and water before advancing too far.',
      urgency: 'now',
      relatedGoalId: plan.goals.find(goal => goal.metric === 'plantedHectares')?.id,
    });
  }
  if (input.urgentContractCount > 0) {
    recommendations.push({
      id: `urgent-contracts-${plan.year}`,
      title: 'Contract deadline pressure',
      body: 'A contract is close to deadline. Reserve inventory before making spot sales.',
      urgency: 'now',
    });
  }
  if (input.activeRepairCount > 0) {
    recommendations.push({
      id: `machine-repair-${plan.year}`,
      title: 'Repair before peak work',
      body: 'A repair is still active. Clear machinery issues before harvest or delivery bottlenecks stack up.',
      urgency: 'soon',
    });
  }
  if (input.storageRiskCount > 0) {
    recommendations.push({
      id: `storage-risk-${plan.year}`,
      title: 'Storage quality risk',
      body: 'Some stored batches are at risk. Sell, process, or protect them before quality falls further.',
      urgency: 'soon',
    });
  }
  if (input.debtOwed > 0 && input.money < input.debtOwed * 0.2) {
    recommendations.push({
      id: `debt-buffer-${plan.year}`,
      title: 'Debt buffer is thin',
      body: 'Cash is low compared with debt. Delay optional upgrades until reserves improve.',
      urgency: 'watch',
    });
  }
  if (input.lowWelfareAnimalCount > 0) {
    recommendations.push({
      id: `welfare-risk-${plan.year}`,
      title: 'Animal welfare needs attention',
      body: 'Fix feed, housing, or care before expanding livestock commitments.',
      urgency: 'now',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: `plan-on-track-${plan.year}`,
      title: 'Plan is stable',
      body: 'No urgent planner risks are showing. Use the next few days to push the slowest goal.',
      urgency: 'watch',
    });
  }

  return recommendations.slice(0, 5);
}

export function replaceAnnualPlanGoal(input: AnnualPlanningInput, draft: AnnualPlanDraft, goalId: string): AnnualPlanDraft {
  const existingIds = new Set(draft.goals.map(goal => goal.id));
  existingIds.delete(goalId);
  const replacement = buildGoalPool(input, draft.advisor).find(goal => goal.id !== goalId && !existingIds.has(goal.id));
  if (!replacement) return draft;
  return {
    ...draft,
    goals: draft.goals.map(goal => goal.id === goalId ? replacement : goal),
  };
}

export function adjustAnnualPlanGoalTarget<T extends AnnualPlanDraft | AnnualPlan>(plan: T, goalId: string, target: number): T {
  return {
    ...plan,
    goals: plan.goals.map(goal => {
      if (goal.id !== goalId || !goal.adjustable) return goal;
      const min = goal.metric.endsWith('Below') || goal.metric === 'debtBelow' ? 0 : 1;
      const nextTarget = Math.max(min, Math.round(target));
      return { ...goal, target: nextTarget, completed: isGoalComplete(goal.metric, goal.current, nextTarget) };
    }),
  };
}

export function generateAnnualPlanReview(input: AnnualPlanningInput, plan: AnnualPlan): AnnualPlanReview {
  const finalPlan = updateAnnualPlanProgress(input, plan);
  const completedGoals = finalPlan.goals.filter(goal => goal.completed);
  const incompleteGoals = finalPlan.goals.filter(goal => !goal.completed);
  const earnedReward = completedGoals.reduce<AnnualPlanReward>((reward, goal) => ({
    legacyReputation: reward.legacyReputation + goal.reward.legacyReputation,
    workerMorale: reward.workerMorale + goal.reward.workerMorale,
    label: '',
  }), { legacyReputation: 0, workerMorale: 0, label: '' });
  earnedReward.label = `+${earnedReward.legacyReputation} legacy${earnedReward.workerMorale > 0 ? `, +${earnedReward.workerMorale} morale` : ''}`;

  return {
    id: `review-${plan.year}-${input.day}`,
    year: plan.year,
    advisor: plan.advisor,
    completedGoals,
    incompleteGoals,
    earnedReward,
    strongestResult: completedGoals[0]?.title ?? 'The farm stayed flexible through the year.',
    missedOpportunity: incompleteGoals[0]?.title ?? 'No major missed opportunity stood out.',
    suggestedAdvisor: recommendAdvisor(input),
    createdDay: input.day,
  };
}

export function advanceAnnualPlanningForDay(
  input: AnnualPlanningInput,
  planningOrPlan: AnnualPlanningState | AnnualPlan,
): { next: AnnualPlanningState | AnnualPlan; review?: AnnualPlanReview; reward: AnnualPlanReward } {
  const zeroReward: AnnualPlanReward = { legacyReputation: 0, workerMorale: 0, label: 'No annual planning reward' };

  if ('goals' in planningOrPlan) {
    if (input.calendarYear > planningOrPlan.year) {
      const review = generateAnnualPlanReview(input, planningOrPlan);
      return {
        next: {
          activeYear: input.calendarYear,
          status: 'reviewed',
          selectedAdvisor: planningOrPlan.advisor,
          review,
          dismissedRecommendationIds: [],
        },
        review,
        reward: planningOrPlan.rewarded ? zeroReward : review.earnedReward,
      };
    }
    return { next: updateAnnualPlanProgress(input, planningOrPlan), reward: zeroReward };
  }

  const planning = planningOrPlan;
  if (planning.active && input.calendarYear > planning.active.year) {
    const review = generateAnnualPlanReview(input, planning.active);
    return {
      next: {
        ...planning,
        activeYear: input.calendarYear,
        status: 'reviewed',
        active: undefined,
        draft: undefined,
        review,
        dismissedRecommendationIds: [],
      },
      review,
      reward: planning.active.rewarded ? zeroReward : review.earnedReward,
    };
  }

  if (planning.active && planning.status === 'active') {
    return {
      next: {
        ...planning,
        active: updateAnnualPlanProgress(input, planning.active),
      },
      reward: zeroReward,
    };
  }

  if (planning.activeYear !== input.calendarYear) {
    return {
      next: {
        activeYear: input.calendarYear,
        status: 'none',
        selectedAdvisor: recommendAdvisor(input),
        dismissedRecommendationIds: [],
      },
      reward: zeroReward,
    };
  }

  return { next: planning, reward: zeroReward };
}

function chooseGoals(input: AnnualPlanningInput, advisor: AdvisorStyle): AnnualPlanGoal[] {
  const pool = buildGoalPool(input, advisor);
  const required = pool.filter(goal => goal.required);
  const advisorGoals = pool.filter(goal => !goal.required && GOAL_TEMPLATES.find(t => goal.id.includes(t.key))?.advisorWeight.includes(advisor));
  const fallback = pool.filter(goal => !required.includes(goal) && !advisorGoals.includes(goal));
  return uniqueGoals([...required, ...advisorGoals, ...fallback]).slice(0, 6);
}

function buildGoalPool(input: AnnualPlanningInput, advisor: AdvisorStyle): AnnualPlanGoal[] {
  return GOAL_TEMPLATES
    .filter(template => template.required === true || template.required === false || template.required(input))
    .map(template => makeGoal(input, advisor, template));
}

function makeGoal(input: AnnualPlanningInput, advisor: AdvisorStyle, template: GoalTemplate): AnnualPlanGoal {
  const target = template.target(input);
  const current = currentMetricValue(input, template.metric);
  return {
    id: `${input.calendarYear}-${advisor}-${template.key}`,
    category: template.category,
    title: template.title,
    description: template.description,
    metric: template.metric,
    target,
    current,
    unit: template.unit,
    required: typeof template.required === 'boolean' ? template.required : template.required(input),
    completed: isGoalComplete(template.metric, current, target),
    adjustable: template.adjustable,
    reward: template.reward,
  };
}

function uniqueGoals(goals: AnnualPlanGoal[]): AnnualPlanGoal[] {
  return goals.filter((goal, index) => goals.findIndex(other => other.metric === goal.metric) === index);
}

function currentMetricValue(input: AnnualPlanningInput, metric: AnnualPlanMetric): number {
  switch (metric) {
    case 'plantedHectares': return input.plantedHectares;
    case 'idleHectaresBelow': return input.idleHectares;
    case 'debtBelow': return input.debtOwed;
    case 'savingsAbove': return input.money + input.savingsBalance;
    case 'ownedHectares': return input.ownedHectares;
    case 'animalCount': return input.animalCount;
    case 'lowWelfareAnimalCountBelow': return input.lowWelfareAnimalCount;
    case 'activeRepairCountBelow': return input.activeRepairCount;
    case 'fulfilledContracts': return input.completedContracts;
    case 'inventoryValue': return input.inventoryValue;
    case 'workerCount': return input.workerCount;
    case 'averageOrganicMatter': return input.averageOrganicMatter;
    case 'processingBuildingCount': return input.processingBuildingCount;
    case 'csaActive': return input.csaActive ? 1 : 0;
    default: return 0;
  }
}

function isGoalComplete(metric: AnnualPlanMetric, current: number, target: number): boolean {
  if (metric === 'debtBelow' || metric === 'idleHectaresBelow' || metric === 'lowWelfareAnimalCountBelow' || metric === 'activeRepairCountBelow') {
    return current <= target;
  }
  return current >= target;
}

function generateForecastCards(input: AnnualPlanningInput): AnnualPlanForecast[] {
  const cashPressure = input.money + input.savingsBalance - input.debtOwed * 0.15;
  const workload = input.ownedHectares + input.animalCount * 1.5 + input.activeContractCount * 2 - input.workerCount * 5 - input.machineCount * 3;
  return [
    {
      id: 'cashflow',
      title: 'Cashflow',
      band: cashPressure < 1000 ? 'tight' : cashPressure < 8000 ? 'workable' : 'comfortable',
      tone: cashPressure < 1000 ? 'danger' : cashPressure < 8000 ? 'warning' : 'good',
      detail: 'Compares cash and savings against near-term debt pressure.',
    },
    {
      id: 'revenue',
      title: 'Revenue band',
      band: input.recentRevenue < 1000 ? 'low' : input.recentRevenue < 10000 ? 'steady' : 'strong',
      tone: input.recentRevenue < 1000 ? 'warning' : input.recentRevenue < 10000 ? 'info' : 'good',
      detail: 'Uses recent sales and inventory value as a rough planning signal.',
    },
    {
      id: 'workload',
      title: 'Workload',
      band: workload > 12 ? 'strained' : workload > 4 ? 'busy' : 'stable',
      tone: workload > 12 ? 'danger' : workload > 4 ? 'warning' : 'good',
      detail: 'Blends land, livestock, contracts, machines, and staff into a simple pressure label.',
    },
    {
      id: 'soil',
      title: 'Soil outlook',
      band: input.averageOrganicMatter < 3.5 || input.averageCompaction > 55 ? 'needs care' : 'stable',
      tone: input.averageOrganicMatter < 3.5 || input.averageCompaction > 55 ? 'warning' : 'good',
      detail: 'Flags organic matter and compaction risks without pretending to forecast exact yields.',
    },
    {
      id: 'market',
      title: 'Market exposure',
      band: input.activeContractCount > 0 || input.inventoryValue > 2500 ? 'active' : 'quiet',
      tone: input.urgentContractCount > 0 ? 'danger' : input.activeContractCount > 0 ? 'warning' : 'info',
      detail: 'Looks at contracts, urgent deadlines, and sellable stock.',
    },
  ];
}

function generateRiskWarnings(input: AnnualPlanningInput): AnnualPlanRisk[] {
  const risks: AnnualPlanRisk[] = [];
  if (input.money < 1500) risks.push({ id: 'low-cash', title: 'Low cash', severity: 'danger', detail: 'Essential seed, feed, fuel, and repairs may compete for the same money.' });
  if (input.debtOwed > Math.max(5000, input.money * 2)) risks.push({ id: 'debt-load', title: 'Debt load', severity: 'warning', detail: 'Debt is high compared with available cash.' });
  if (input.urgentContractCount > 0) risks.push({ id: 'contracts', title: 'Contract deadline', severity: 'danger', detail: 'At least one contract is close to deadline.' });
  if (input.lowWelfareAnimalCount > 0) risks.push({ id: 'welfare', title: 'Welfare pressure', severity: 'warning', detail: 'Some animals are below the welfare threshold.' });
  if (input.activeRepairCount > 0) risks.push({ id: 'repairs', title: 'Machinery repair', severity: 'warning', detail: 'A machine repair can block planned work.' });
  if (input.storageRiskCount > 0) risks.push({ id: 'storage', title: 'Storage risk', severity: 'warning', detail: 'Some stored batches may lose value.' });
  if (input.neighbourPressure > 70) risks.push({ id: 'neighbours', title: 'Neighbour pressure', severity: 'warning', detail: 'Nearby farms may compete for land or opportunities.' });
  return risks.length > 0 ? risks : [{ id: 'stable', title: 'No major planner risks', severity: 'info', detail: 'The farm has no urgent annual planning risk right now.' }];
}

function approveDraftForPreview(draft: AnnualPlanDraft): AnnualPlan {
  return {
    ...draft,
    id: draft.id,
    status: 'active',
    approvedDay: draft.createdDay,
    progressPercent: 0,
    completedGoalIds: [],
    rewarded: false,
  };
}
