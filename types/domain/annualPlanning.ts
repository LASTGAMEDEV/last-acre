export type AdvisorStyle =
  | 'steady_steward'
  | 'expansion_planner'
  | 'soil_sustainability'
  | 'market_strategist'
  | 'livestock_operator'
  | 'community_builder';

export type AnnualPlanStatus = 'none' | 'draft' | 'active' | 'reviewed';

export type AnnualPlanGoalCategory =
  | 'planting'
  | 'rotation'
  | 'soil'
  | 'finance'
  | 'livestock'
  | 'machinery'
  | 'market'
  | 'community'
  | 'infrastructure';

export type AnnualPlanMetric =
  | 'plantedHectares'
  | 'idleHectaresBelow'
  | 'debtBelow'
  | 'savingsAbove'
  | 'ownedHectares'
  | 'animalCount'
  | 'lowWelfareAnimalCountBelow'
  | 'activeRepairCountBelow'
  | 'fulfilledContracts'
  | 'inventoryValue'
  | 'workerCount'
  | 'averageOrganicMatter'
  | 'processingBuildingCount'
  | 'csaActive';

export interface AnnualPlanReward {
  legacyReputation: number;
  workerMorale: number;
  label: string;
}

export interface AnnualPlanGoal {
  id: string;
  category: AnnualPlanGoalCategory;
  title: string;
  description: string;
  metric: AnnualPlanMetric;
  target: number;
  current: number;
  unit: string;
  required: boolean;
  completed: boolean;
  adjustable: boolean;
  reward: AnnualPlanReward;
}

export interface AnnualPlanForecast {
  id: string;
  title: string;
  band: string;
  tone: 'good' | 'info' | 'warning' | 'danger';
  detail: string;
}

export interface AnnualPlanRisk {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'danger';
  detail: string;
}

export interface AnnualPlanRecommendation {
  id: string;
  title: string;
  body: string;
  urgency: 'now' | 'soon' | 'watch';
  relatedGoalId?: string;
}

export interface AnnualPlanDraft {
  id: string;
  year: number;
  advisor: AdvisorStyle;
  createdDay: number;
  status: 'draft';
  goals: AnnualPlanGoal[];
  forecasts: AnnualPlanForecast[];
  risks: AnnualPlanRisk[];
  recommendations: AnnualPlanRecommendation[];
}

export interface AnnualPlan extends Omit<AnnualPlanDraft, 'status'> {
  status: 'active';
  approvedDay: number;
  progressPercent: number;
  completedGoalIds: string[];
  rewarded: boolean;
}

export interface AnnualPlanReview {
  id: string;
  year: number;
  advisor: AdvisorStyle;
  completedGoals: AnnualPlanGoal[];
  incompleteGoals: AnnualPlanGoal[];
  earnedReward: AnnualPlanReward;
  strongestResult: string;
  missedOpportunity: string;
  suggestedAdvisor: AdvisorStyle;
  createdDay: number;
}

export interface AnnualPlanningState {
  activeYear: number;
  status: AnnualPlanStatus;
  selectedAdvisor?: AdvisorStyle;
  draft?: AnnualPlanDraft;
  active?: AnnualPlan;
  review?: AnnualPlanReview;
  dismissedRecommendationIds: string[];
}
