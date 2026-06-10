import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { buildAnnualPlanningInput } from '../../store/annualPlanningInput';
import {
  ADVISOR_DESCRIPTIONS,
  ADVISOR_LABELS,
  recommendAdvisor,
  type AdvisorStyle,
  type AnnualPlan,
  type AnnualPlanDraft,
  type AnnualPlanGoal,
} from '../../engine/annualPlanning';
import { C, F, R, S } from '../../constants/theme';
import Badge, { BadgeVariant } from '../ui/Badge';
import GuideButton from '../GuideButton';

const ADVISORS: AdvisorStyle[] = [
  'steady_steward',
  'expansion_planner',
  'soil_sustainability',
  'market_strategist',
  'livestock_operator',
  'community_builder',
];

const TONE_TO_BADGE: Record<string, BadgeVariant> = {
  good: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  now: 'danger',
  soon: 'warning',
  watch: 'info',
};

function fmtValue(value: number, unit: string) {
  if (unit === '$') return `$${Math.round(value).toLocaleString()}`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (!unit) return value >= 1 ? 'Yes' : 'No';
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

function goalProgress(goal: AnnualPlanGoal) {
  if (goal.metric === 'debtBelow' || goal.metric === 'idleHectaresBelow' || goal.metric === 'lowWelfareAnimalCountBelow' || goal.metric === 'activeRepairCountBelow') {
    if (goal.current <= goal.target) return 1;
    return Math.max(0, Math.min(1, goal.target / Math.max(goal.current, 1)));
  }
  return Math.max(0, Math.min(1, goal.current / Math.max(goal.target, 1)));
}

function ProgressBar({ value }: { value: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${percent}%` as any }]} />
    </View>
  );
}

function AdvisorSelector({
  selected,
  recommended,
  onSelect,
}: {
  selected: AdvisorStyle;
  recommended: AdvisorStyle;
  onSelect: (advisor: AdvisorStyle) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Advisor style</Text>
        <GuideButton entryId="problem_dont_know_next" compact />
      </View>
      <Text style={styles.body}>{ADVISOR_DESCRIPTIONS[selected]}</Text>
      <View style={styles.advisorGrid}>
        {ADVISORS.map(advisor => {
          const active = advisor === selected;
          return (
            <TouchableOpacity
              key={advisor}
              style={[styles.advisorButton, active && styles.advisorButtonActive]}
              onPress={() => onSelect(advisor)}
            >
              <View style={styles.advisorTitleRow}>
                <Text style={[styles.advisorLabel, active && styles.advisorLabelActive]}>{ADVISOR_LABELS[advisor]}</Text>
                {advisor === recommended && <Badge label="Recommended" variant="info" />}
              </View>
              <Text style={styles.advisorBody}>{ADVISOR_DESCRIPTIONS[advisor]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ForecastAndRiskCards({ plan }: { plan: AnnualPlanDraft | AnnualPlan }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Forecast</Text>
      </View>
      <View style={styles.grid}>
        {plan.forecasts.map(forecast => (
          <View key={forecast.id} style={styles.smallCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.smallTitle}>{forecast.title}</Text>
              <Badge label={forecast.band} variant={TONE_TO_BADGE[forecast.tone] ?? 'neutral'} />
            </View>
            <Text style={styles.smallBody}>{forecast.detail}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Risks</Text>
      </View>
      {plan.risks.map(risk => (
        <View key={risk.id} style={styles.riskRow}>
          <Badge label={risk.severity} variant={TONE_TO_BADGE[risk.severity] ?? 'neutral'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.riskTitle}>{risk.title}</Text>
            <Text style={styles.smallBody}>{risk.detail}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function GoalCard({
  goal,
  draft,
  onReplace,
  onRemove,
  onAdjust,
}: {
  goal: AnnualPlanGoal;
  draft: boolean;
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
  onAdjust: (id: string, target: number) => void;
}) {
  const progress = goalProgress(goal);
  const step = goal.unit === '$' ? 500 : goal.unit === '%' ? 1 : 1;
  return (
    <View style={styles.goalCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Badge label={goal.completed ? 'Complete' : goal.required ? 'Required' : 'Optional'} variant={goal.completed ? 'success' : goal.required ? 'warning' : 'neutral'} />
      </View>
      <Text style={styles.body}>{goal.description}</Text>
      <View style={styles.goalMetricRow}>
        <Text style={styles.metricText}>{fmtValue(goal.current, goal.unit)}</Text>
        <Text style={styles.metricTarget}>/ {fmtValue(goal.target, goal.unit)}</Text>
      </View>
      <ProgressBar value={progress} />
      <Text style={styles.rewardText}>{goal.reward.label}</Text>

      {draft && (
        <View style={styles.goalActions}>
          {goal.adjustable && (
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.iconButton} onPress={() => onAdjust(goal.id, goal.target - step)}>
                <Text style={styles.iconButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => onAdjust(goal.id, goal.target + step)}>
                <Text style={styles.iconButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => onReplace(goal.id)}>
            <Text style={styles.secondaryButtonText}>Replace</Text>
          </TouchableOpacity>
          {!goal.required && (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => onRemove(goal.id)}>
              <Text style={styles.secondaryButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function RecommendationList({ plan }: { plan: AnnualPlan }) {
  const dismissed = useGameStore(s => s.annualPlanning.dismissedRecommendationIds);
  const dismissAnnualPlanRecommendation = useGameStore(s => s.dismissAnnualPlanRecommendation);
  const visible = plan.recommendations.filter(rec => !dismissed.includes(rec.id));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Recommendations</Text>
      {visible.map(rec => (
        <View key={rec.id} style={styles.recommendationRow}>
          <Badge label={rec.urgency} variant={TONE_TO_BADGE[rec.urgency] ?? 'neutral'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.riskTitle}>{rec.title}</Text>
            <Text style={styles.smallBody}>{rec.body}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => dismissAnnualPlanRecommendation(rec.id)}>
            <Text style={styles.iconButtonText}>x</Text>
          </TouchableOpacity>
        </View>
      ))}
      {visible.length === 0 && <Text style={styles.emptyText}>No active planner recommendations.</Text>}
    </View>
  );
}

export default function AnnualPlanningSection() {
  const state = useGameStore();
  const planning = state.annualPlanning;
  const generateAnnualPlan = state.generateAnnualPlan;
  const replaceAnnualPlanGoal = state.replaceAnnualPlanGoal;
  const removeAnnualPlanGoal = state.removeAnnualPlanGoal;
  const adjustAnnualPlanGoal = state.adjustAnnualPlanGoal;
  const approveAnnualPlan = state.approveAnnualPlan;
  const completeAnnualPlanReview = state.completeAnnualPlanReview;
  const input = useMemo(() => buildAnnualPlanningInput(state), [state]);
  const recommendedAdvisor = recommendAdvisor(input);
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorStyle>(planning.selectedAdvisor ?? recommendedAdvisor);

  const draft = planning.status === 'draft' ? planning.draft : undefined;
  const active = planning.status === 'active' ? planning.active : undefined;
  const review = planning.status === 'reviewed' ? planning.review : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>Annual Planner</Text>
            <Text style={styles.heroSub}>Year {input.calendarYear} strategy briefing</Text>
          </View>
          <Badge label={planning.status} variant={planning.status === 'active' ? 'success' : planning.status === 'draft' ? 'warning' : 'info'} />
        </View>
        <Text style={styles.body}>Generate a soft yearly plan from the current farm state. It tracks goals and suggests priorities, but never plays the farm for you.</Text>
      </View>

      {!draft && !active && !review && (
        <>
          <AdvisorSelector selected={selectedAdvisor} recommended={recommendedAdvisor} onSelect={setSelectedAdvisor} />
          <TouchableOpacity style={styles.primaryButton} onPress={() => generateAnnualPlan(selectedAdvisor)}>
            <Text style={styles.primaryButtonText}>Generate annual plan</Text>
          </TouchableOpacity>
        </>
      )}

      {draft && (
        <>
          <AdvisorSelector selected={draft.advisor} recommended={recommendedAdvisor} onSelect={advisor => generateAnnualPlan(advisor)} />
          <ForecastAndRiskCards plan={draft} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Draft goals</Text>
            <Badge label={`${draft.goals.length} goals`} variant="neutral" />
          </View>
          {draft.goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              draft
              onReplace={replaceAnnualPlanGoal}
              onRemove={removeAnnualPlanGoal}
              onAdjust={adjustAnnualPlanGoal}
            />
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={approveAnnualPlan}>
            <Text style={styles.primaryButtonText}>Approve plan</Text>
          </TouchableOpacity>
        </>
      )}

      {active && (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{ADVISOR_LABELS[active.advisor]}</Text>
              <Badge label={`${active.progressPercent}%`} variant={active.progressPercent >= 70 ? 'success' : 'info'} />
            </View>
            <Text style={styles.body}>{ADVISOR_DESCRIPTIONS[active.advisor]}</Text>
            <ProgressBar value={active.progressPercent / 100} />
          </View>
          <RecommendationList plan={active} />
          <ForecastAndRiskCards plan={active} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Goal progress</Text>
            <Badge label={`${active.completedGoalIds.length}/${active.goals.length}`} variant="neutral" />
          </View>
          {active.goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              draft={false}
              onReplace={replaceAnnualPlanGoal}
              onRemove={removeAnnualPlanGoal}
              onAdjust={adjustAnnualPlanGoal}
            />
          ))}
        </>
      )}

      {review && (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Year {review.year} review</Text>
              <Badge label={review.earnedReward.label} variant="success" />
            </View>
            <Text style={styles.body}>Strongest result: {review.strongestResult}</Text>
            <Text style={styles.body}>Next opportunity: {review.missedOpportunity}</Text>
            <Text style={styles.body}>Suggested advisor: {ADVISOR_LABELS[review.suggestedAdvisor]}</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.smallCard}>
              <Text style={styles.smallTitle}>Completed goals</Text>
              <Text style={styles.bigNumber}>{review.completedGoals.length}</Text>
            </View>
            <View style={styles.smallCard}>
              <Text style={styles.smallTitle}>Incomplete goals</Text>
              <Text style={styles.bigNumber}>{review.incompleteGoals.length}</Text>
            </View>
          </View>
          {review.completedGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} draft={false} onReplace={replaceAnnualPlanGoal} onRemove={removeAnnualPlanGoal} onAdjust={adjustAnnualPlanGoal} />
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={completeAnnualPlanReview}>
            <Text style={styles.primaryButtonText}>Start next plan</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: S.md, gap: S.md, paddingBottom: S.xxl },
  hero: { backgroundColor: C.bgCard, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: S.sm },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: S.md },
  heroTitle: { color: C.text, fontSize: F.size.title, fontWeight: F.weight.heavy },
  heroSub: { color: C.textDim, fontSize: F.size.sm, marginTop: 2 },
  card: { backgroundColor: C.bgCard, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: S.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: S.md },
  cardTitle: { flex: 1, color: C.text, fontSize: F.size.lg, fontWeight: F.weight.heavy },
  body: { color: C.textDim, fontSize: F.size.body, lineHeight: 20 },
  advisorGrid: { gap: S.sm },
  advisorButton: { backgroundColor: C.bgDeep, borderRadius: R.sm, borderWidth: 1, borderColor: C.divider, padding: S.md, gap: S.xs },
  advisorButtonActive: { borderColor: C.amber, backgroundColor: '#1a1200' },
  advisorTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: S.sm },
  advisorLabel: { flex: 1, color: C.textDim, fontSize: F.size.body, fontWeight: F.weight.bold },
  advisorLabelActive: { color: C.amberSoft },
  advisorBody: { color: C.textMuted, fontSize: F.size.sm, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md },
  sectionTitle: { color: C.text, fontSize: F.size.xl, fontWeight: F.weight.heavy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  smallCard: { flexGrow: 1, flexBasis: '47%', backgroundColor: C.bgCard, borderRadius: R.md, borderWidth: 1, borderColor: C.divider, padding: S.md, gap: S.xs },
  smallTitle: { color: C.text, fontSize: F.size.sm, fontWeight: F.weight.bold },
  smallBody: { color: C.textMuted, fontSize: F.size.sm, lineHeight: 18 },
  riskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, backgroundColor: C.bgCard, borderRadius: R.sm, padding: S.md, borderWidth: 1, borderColor: C.divider },
  riskTitle: { color: C.text, fontSize: F.size.sm, fontWeight: F.weight.bold, marginBottom: 2 },
  goalCard: { backgroundColor: C.bgCard, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: S.sm },
  goalTitle: { flex: 1, color: C.text, fontSize: F.size.body, fontWeight: F.weight.heavy },
  goalMetricRow: { flexDirection: 'row', alignItems: 'baseline', gap: S.xs },
  metricText: { color: C.text, fontSize: F.size.xxl, fontWeight: F.weight.heavy },
  metricTarget: { color: C.textMuted, fontSize: F.size.sm },
  progressTrack: { height: 6, borderRadius: R.pill, backgroundColor: C.bgDeep, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: R.pill, backgroundColor: C.green },
  rewardText: { color: C.amberSoft, fontSize: F.size.xs, fontWeight: F.weight.bold },
  goalActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.sm },
  stepper: { flexDirection: 'row', gap: S.xs },
  iconButton: { width: 34, height: 34, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { color: C.text, fontSize: F.size.body, fontWeight: F.weight.heavy },
  secondaryButton: { minHeight: 34, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, justifyContent: 'center' },
  secondaryButtonText: { color: C.textDim, fontSize: F.size.sm, fontWeight: F.weight.bold },
  primaryButton: { minHeight: 44, borderRadius: R.md, backgroundColor: C.amberDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.lg, paddingVertical: S.md },
  primaryButtonText: { color: C.white, fontSize: F.size.body, fontWeight: F.weight.heavy },
  recommendationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: S.sm },
  emptyText: { color: C.textMuted, fontSize: F.size.sm },
  bigNumber: { color: C.text, fontSize: 28, fontWeight: F.weight.heavy },
});
