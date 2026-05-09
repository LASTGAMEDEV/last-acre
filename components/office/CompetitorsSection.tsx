import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES } from '../../data/cropTypes';
import { NPC_FARM_GROUP } from '../../data/npcFarmGroups';

function CompetitorsSection() {
  const { npcFarms = [], sellPressures = [], mapFields = [], day, rivalNews = [] } = useGameStore();
  const [expandedFarmId, setExpandedFarmId] = React.useState<string | null>(null);

  const NPC_MAP_OWNER = NPC_FARM_GROUP;

  function wealthColor(wealth: number): string {
    if (wealth < 10000) return '#66bb6a';
    if (wealth < 30000) return '#ffb74d';
    return '#ef5350';
  }

  function wealthTrend(wealth: number): string {
    if (wealth < 3000) return '📉 Struggling';
    if (wealth < 10000) return '🟡 Growing';
    if (wealth < 30000) return '🟠 Established';
    return '🔴 Dominant';
  }

  function activePressure(farm: { specialization: string[] }): string | null {
    for (const crop of farm.specialization) {
      const sp = sellPressures.find(s => s.cropId === crop && s.expiresDay >= day);
      if (sp) return crop;
    }
    return null;
  }

  function landCount(farmId: string): number {
    const owner = NPC_MAP_OWNER[farmId];
    if (!owner) return 0;
    return mapFields.filter((f: any) => f.owner === owner).length;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>
        Rivals apply sell pressure to the market and bid at auction. Watch them expand.
      </Text>
      {npcFarms.map(farm => {
        const pressure = activePressure(farm);
        const fields = landCount(farm.id);
        const isExpanded = expandedFarmId === farm.id;
        const farmNews = rivalNews.filter((n: any) => n.detail?.includes(farm.name) || n.title?.includes(farm.name));
        const totalHa = mapFields.filter((f: any) => f.owner === NPC_MAP_OWNER[farm.id]).reduce((s: number, f: any) => s + (f.approximateHa ?? 0), 0);
        return (
          <View key={farm.id} style={{ backgroundColor: C.bgCard, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <TouchableOpacity onPress={() => setExpandedFarmId(isExpanded ? null : farm.id)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: 'bold' }}>{farm.name}</Text>
                  <View style={{ backgroundColor: farm.tier === 3 ? '#c62828' : farm.tier === 2 ? '#f57f17' : '#1b5e20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: C.white, fontSize: 10, fontWeight: 'bold' }}>Tier {farm.tier}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: wealthColor(farm.wealth), fontSize: 12, fontWeight: 'bold' }}>
                    ${Math.round(farm.wealth).toLocaleString()}
                  </Text>
                  <Text style={{ color: '#555', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9 }}>STATUS</Text>
                  <Text style={{ color: wealthColor(farm.wealth), fontSize: 11, fontWeight: 'bold' }}>{wealthTrend(farm.wealth)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9 }}>MAP FIELDS</Text>
                  <Text style={{ color: C.text, fontSize: 11, fontWeight: 'bold' }}>{fields} field{fields !== 1 ? 's' : ''} · {Math.round(totalHa)}ha</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                  <Text style={{ color: C.textMuted, fontSize: 9 }}>NEXT SELL</Text>
                  <Text style={{ color: '#ccc', fontSize: 11, fontWeight: 'bold' }}>in {Math.max(0, farm.nextSellDay - day)}d</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {farm.specialization.map((cropId: string) => {
                  const crop = CROP_TYPES.find(c => c.id === cropId);
                  return (
                    <View key={cropId} style={{ backgroundColor: '#0f3460', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#ccc', fontSize: 11 }}>{crop?.name ?? cropId}</Text>
                    </View>
                  );
                })}
              </View>
              {pressure && (
                <Text style={{ color: '#ef9a9a', fontSize: 11 }}>
                  ⚠️ Flooding market with {CROP_TYPES.find(c => c.id === pressure)?.name ?? pressure} — price depressed
                </Text>
              )}
              {farm.wealth < 5000 && (
                <Text style={{ color: '#ffb74d', fontSize: 11 }}>
                  ⚡ Financial trouble — foreclosure risk
                </Text>
              )}
            </TouchableOpacity>

            {/* Expanded profile */}
            {isExpanded && (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#1e2a3a', paddingTop: 10 }}>
                <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 0.5 }}>📊 PROFILE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>WEALTH</Text>
                    <Text style={{ color: wealthColor(farm.wealth), fontSize: 13, fontWeight: 'bold' }}>${Math.round(farm.wealth).toLocaleString()}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>SELL INTERVAL</Text>
                    <Text style={{ color: '#ccc', fontSize: 13, fontWeight: 'bold' }}>every {farm.sellIntervalDays}d</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#0d1117', borderRadius: 6, padding: 8 }}>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>TIER</Text>
                    <Text style={{ color: farm.tier === 3 ? '#ef5350' : farm.tier === 2 ? '#ffb74d' : '#66bb6a', fontSize: 13, fontWeight: 'bold' }}>
                      {farm.tier === 3 ? 'Dominant' : farm.tier === 2 ? 'Growing' : 'Small'}
                    </Text>
                  </View>
                </View>

                {farmNews.length > 0 && (
                  <View>
                    <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>📡 Recent Activity</Text>
                    {farmNews.slice(0, 5).map((item: any) => (
                      <View key={item.id} style={{ flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e2a3a' }}>
                        <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontSize: 11 }}>{item.title}</Text>
                          <Text style={{ color: '#555', fontSize: 10 }}>Day {item.day}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {farmNews.length === 0 && (
                  <Text style={{ color: '#444', fontSize: 11, fontStyle: 'italic' }}>No recent activity recorded for this farm.</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Rival Intel feed */}
      {rivalNews.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 0.5 }}>📡 RIVAL INTEL</Text>
          {rivalNews.slice(0, 10).map(item => (
            <View key={item.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1e2a3a', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 11, fontWeight: 'bold' }}>{item.title}</Text>
                <Text style={{ color: C.textFaint, fontSize: 10, marginTop: 2 }}>{item.detail}</Text>
              </View>
              <Text style={{ color: '#444', fontSize: 10 }}>d{item.day}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Balance card
  balanceCard: { backgroundColor: '#0f3460', borderRadius: R.lg, marginHorizontal: S.md, marginBottom: S.sm, padding: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { color: C.textMuted, fontSize: 11, marginBottom: 2 },
  balanceMoney: { color: '#4caf50', fontSize: 26, fontWeight: 'bold' },
  balanceSavings: { color: '#64b5f6', fontSize: 26, fontWeight: 'bold' },
  balanceDivider: { width: 1, height: 40, backgroundColor: '#1a3a6a', marginHorizontal: S.md },

  // Tab bar

  // Reputation
  repCard: { backgroundColor: C.bgCard, borderRadius: R.lg, margin: S.md, padding: 14 },
  repRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm },
  repScore: { fontSize: 48, fontWeight: 'bold', marginRight: S.lg },
  repInfo: { flex: 1 },
  repTier: { fontSize: F.size.xl, fontWeight: 'bold', marginBottom: 2 },
  repEffect: { color: C.textMuted, fontSize: 11, marginBottom: 1 },
  repBar: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, overflow: 'hidden' },
  repFill: { height: 6, borderRadius: 3 },
  // Cooperative
  coopCard: { backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: S.md, marginBottom: S.sm, padding: 14 },
  coopActive: { color: '#81c784', fontSize: F.size.md, fontWeight: 'bold', marginBottom: S.xs },
  coopDetail: { color: C.textMuted, fontSize: F.size.sm, marginBottom: 6 },
  joinBtn: { backgroundColor: '#1565c0', borderRadius: R.md, padding: 10, alignItems: 'center', marginTop: S.xs },
  joinBtnDisabled: { backgroundColor: '#333', opacity: 0.5 },
  joinBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  leaveBtn: { backgroundColor: '#7f1d1d', borderRadius: R.md, padding: S.sm, alignItems: 'center', marginTop: S.sm },
  leaveBtnText: { color: '#ef9a9a', fontWeight: 'bold', fontSize: F.size.sm },
  coopName: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  coopHealth: { fontSize: 13, fontWeight: 'bold' },
  coopHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  coopSectionLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' as const },
  healthBarBg: { height: 6, backgroundColor: '#333', borderRadius: 3, marginVertical: 6 },
  healthBarFill: { height: 6, borderRadius: 3 },
  equipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  coopDeliverBtn: { backgroundColor: '#1b5e20', borderRadius: 6, padding: 8, marginBottom: 4 },
  coopDeliverBtnText: { color: '#a5d6a7', fontSize: 13, fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#0d47a1', borderRadius: 6, padding: 6 },
  bookBtnText: { color: '#90caf9', fontSize: 11 },
  voteYesBtn: { flex: 1, backgroundColor: '#1b5e20', borderRadius: 6, padding: 8, alignItems: 'center' as const },
  voteNoBtn: { flex: 1, backgroundColor: '#7f1d1d', borderRadius: 6, padding: 8, alignItems: 'center' as const },
  voteBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  shareInput: { backgroundColor: '#1a1a2e', color: '#ffffff', borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 15 },
  // Futures
  futuresCard: { backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: S.md, marginBottom: S.sm, padding: 14 },
  futureForm: { marginTop: 10 },
  futureFormLabel: { color: C.textMuted, fontSize: 11, marginBottom: S.xs, fontWeight: 'bold' },
  futureInput: { backgroundColor: '#0d1117', color: C.white, borderRadius: R.md, padding: 10, marginBottom: S.sm, fontSize: F.size.lg },
  futureTermRow: { flexDirection: 'row', gap: 8, marginBottom: S.sm },
  termChip: { backgroundColor: '#0d1117', borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 6 },
  termChipActive: { backgroundColor: '#1565c0' },
  termChipText: { color: C.textMuted, fontWeight: 'bold', fontSize: F.size.md },
  openFutureBtn: { backgroundColor: '#2e7d32', borderRadius: R.md, padding: 10, alignItems: 'center' },
  futureChip: { backgroundColor: '#0d1117', borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  futureChipActive: { backgroundColor: '#1565c0' },
  futureChipText: { color: C.textMuted, fontSize: 11 },
  futureRow: { backgroundColor: '#0d1117', borderRadius: R.md, padding: 10, marginBottom: S.xs },
  futureCrop: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  futureDetail: { color: C.textMuted, fontSize: 11, marginTop: 2 },

  // Credit card
  creditCard: { backgroundColor: C.bgCard, borderRadius: R.lg, margin: S.md, padding: 14 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.md },
  creditLabel: { color: C.textMuted, fontSize: 11, marginBottom: S.xs },
  creditScore: { fontSize: 36, fontWeight: 'bold' },
  creditRating: { fontSize: F.size.md, fontWeight: 'bold' },
  creditStats: { gap: 6 },
  creditStat: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  creditStatLabel: { color: C.textFaint, fontSize: 11 },
  creditStatValue: { color: C.text, fontSize: 11, fontWeight: 'bold' },
  scoreBarBg: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, marginBottom: S.xs },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreBarLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreBarTick: { color: '#444', fontSize: 9 },

  // Sections
  section: { backgroundColor: C.bgCard, borderRadius: R.lg, margin: S.md, padding: 14 },
  sectionTitle: { color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
  emptyText: { color: '#555', fontSize: F.size.sm },
  apr: { color: C.textMuted, fontSize: F.size.sm, fontWeight: 'normal' },

  // Loan form
  fieldLabel: { color: C.textMuted, fontSize: 11, marginBottom: 6, marginTop: S.sm },
  input: { backgroundColor: '#0d1117', borderRadius: R.md, borderWidth: 1, borderColor: '#2a2a4a', color: C.text, padding: 10, fontSize: F.size.lg, marginBottom: S.xs },
  quickAmtBtn: { backgroundColor: '#0d1117', borderRadius: R.md, borderWidth: 1, borderColor: '#2a2a4a', paddingHorizontal: 14, paddingVertical: S.sm, marginRight: S.sm },
  quickAmtBtnActive: { backgroundColor: '#0f3460', borderColor: C.text },
  quickAmtText: { color: C.textFaint, fontWeight: 'bold', fontSize: F.size.md },
  quickAmtTextActive: { color: C.text },
  termRow: { flexDirection: 'row', gap: 8, marginBottom: S.xs },
  termBtn: { flex: 1, backgroundColor: '#0d1117', borderRadius: R.md, borderWidth: 1, borderColor: '#2a2a4a', padding: S.sm, alignItems: 'center' },
  termBtnActive: { backgroundColor: '#0f3460', borderColor: C.text },
  termBtnText: { color: C.textFaint, fontSize: F.size.sm, fontWeight: 'bold' },
  termBtnTextActive: { color: C.text },
  loanSummary: { backgroundColor: '#0d1117', borderRadius: R.md, padding: S.md, marginTop: S.sm },
  loanSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.xs },
  loanSummaryLabel: { color: C.textMuted, fontSize: F.size.sm },
  loanSummaryValue: { color: '#aaa', fontSize: F.size.sm },
  eligibilityBox: { borderRadius: R.md, padding: 10, marginTop: S.sm, marginBottom: 6 },
  eligOk: { backgroundColor: '#1b5e20' },
  eligNo: { backgroundColor: '#4a1515' },
  eligibilityText: { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },
  requestBtn: { backgroundColor: '#1565c0', borderRadius: R.md, padding: S.md, alignItems: 'center', marginTop: S.xs },
  requestBtnDisabled: { backgroundColor: '#333' },
  requestBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.lg },
  tiersRow: { flexDirection: 'row', gap: 6, marginTop: S.xs },
  tierRef: { flex: 1, backgroundColor: '#0d1117', borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  tierRefName: { color: C.text, fontWeight: 'bold', fontSize: 11 },
  tierRefRate: { color: '#64b5f6', fontSize: F.size.xs },
  tierRefIncome: { color: C.textFaint, fontSize: 9, textAlign: 'center' },

  // Active loans
  loanCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: S.md, marginBottom: S.sm },
  loanCardOverdue: { borderWidth: 1, borderColor: '#f44336' },
  loanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  loanCardTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  overdueTag: { backgroundColor: '#f44336', borderRadius: R.xs, paddingHorizontal: 6, paddingVertical: 2 },
  loanCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  loanDetail: { minWidth: '40%' },
  loanDetailLabel: { color: C.textFaint, fontSize: F.size.xs },
  loanDetailValue: { color: '#ccc', fontSize: F.size.md, fontWeight: 'bold' },
  payBtn: { backgroundColor: '#2e7d32', borderRadius: R.md, padding: 9, alignItems: 'center' },
  deliverBtn: { backgroundColor: '#1565c0', borderRadius: R.md, padding: 9, alignItems: 'center', marginTop: S.sm },
  payBtnDisabled: { backgroundColor: '#333' },
  payBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  extendRow: { marginTop: S.sm },
  extendLabel: { color: C.textMuted, fontSize: 11, marginBottom: S.xs },
  extendBtns: { flexDirection: 'row', gap: 6 },
  extendBtn: { backgroundColor: '#1a2a40', borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#546e7a' },
  extendBtnDisabled: { opacity: 0.4 },
  extendBtnText: { color: '#90caf9', fontSize: F.size.sm, fontWeight: 'bold' },
  renegotiatedTag: { color: '#546e7a', fontSize: 11, marginTop: 6, textAlign: 'center' },
  historyTitle: { color: '#555', fontSize: 11, marginTop: S.sm, marginBottom: S.xs },
  loanCardDone: { paddingVertical: S.xs },
  loanCardDoneText: { color: '#555', fontSize: F.size.sm },

  // Savings
  savingsBalance: { color: '#64b5f6', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  savingsBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: S.sm },
  savingsBtnPair: { flexDirection: 'row', gap: 4 },
  savBtn: { backgroundColor: '#1565c0', borderRadius: R.md, padding: S.sm, minWidth: 52, alignItems: 'center' },
  savBtnOut: { backgroundColor: '#4a1515', borderRadius: R.md, padding: S.sm, minWidth: 52, alignItems: 'center' },
  savBtnDisabled: { backgroundColor: '#333' },
  savBtnText: { color: C.white, fontSize: F.size.sm, fontWeight: 'bold' },
  savingsCustomRow: { flexDirection: 'row', gap: 8 },
  resetBtn: { backgroundColor: '#7f2020', borderRadius: R.md, padding: S.md, alignItems: 'center' },
  resetBtnText: { color: '#ffcdd2', fontWeight: 'bold', fontSize: F.size.lg },

  // Contracts
  contractCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: S.md, marginBottom: S.sm },
  contractTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  contractDetail: { color: '#aaa', fontSize: F.size.sm, marginTop: 2 },
  progressBar: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, marginTop: S.sm, marginBottom: S.xs },
  progressFill: { height: 6, backgroundColor: '#4caf50', borderRadius: 3 },
  progressLabel: { color: C.textFaint, fontSize: F.size.xs },
  offerCard: { backgroundColor: '#1b3a4b', borderRadius: R.md, padding: S.md, marginBottom: 10 },
  offerName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.xs },
  offerDetail: { color: '#aaa', fontSize: F.size.sm, marginBottom: 2 },
  offerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: R.md, padding: 9, alignItems: 'center' },
  acceptBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  declineBtn: { flex: 1, backgroundColor: '#4a1515', borderRadius: R.md, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: '#7f2020' },
  declineBtnText: { color: '#ef9a9a', fontWeight: 'bold', fontSize: F.size.md },

  // Milestones
  milestoneContainer: { paddingHorizontal: S.md, paddingTop: S.md },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.divider },
  milestoneLocked: { opacity: 0.6 },
  milestoneIcon: { fontSize: F.size.title, width: 36, textAlign: 'center' },
  milestoneInfo: { flex: 1, marginLeft: S.sm },
  milestoneTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  milestoneDesc: { color: C.textFaint, fontSize: 11, marginTop: 1 },
  milestoneDone: { color: '#4caf50', fontWeight: 'bold', fontSize: F.size.xl, marginLeft: S.sm },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
});

export default CompetitorsSection;
