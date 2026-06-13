import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import GuideButton from '../GuideButton';
import { CONTRACT_TEMPLATES, contractPenalty } from '../../engine/contracts';
import { CROP_TYPES } from '../../data/cropTypes';
import { GUIDE_ENTRY_IDS } from '../../data/guideEntries';

function ContractsSection() {
  const { contracts, prices, inventory, day, acceptContract, declineContract, deliverCrop, declinedTemplates, counterOfferContract } = useGameStore();
  const [negotiatingId, setNegotiatingId] = React.useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set());

  function togglePin(id: string) {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allActive = contracts.filter(c => !c.completed && !c.failed);
  const activeContracts = [
    ...allActive.filter(c => pinnedIds.has(c.id)),
    ...allActive.filter(c => !pinnedIds.has(c.id)),
  ];
  const availableTemplates = CONTRACT_TEMPLATES.filter(
    t => !allActive.some(c => c.templateId === t.id) && !declinedTemplates.includes(t.id)
  );

  return (
    <View>
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Active contracts ({activeContracts.length})</Text>
          <GuideButton entryId="system_contracts" compact />
        </View>
        {activeContracts.length === 0 && <Text style={styles.emptyText}>No active contracts.</Text>}
        {activeContracts.map(c => {
          const crop = CROP_TYPES.find(cr => cr.id === c.cropId);
          const unit = crop?.unit ?? 'kg';
          const overdue = day > c.deadlineDay;
          const inStock = Math.round(inventory[c.cropId] ?? 0);
          const remaining = c.amount - c.delivered;
          const penalty = Math.round(contractPenalty(c));
          const canDeliver = inStock > 0 && remaining > 0;
          const pinned = pinnedIds.has(c.id);
          const daysLeft = c.deadlineDay - day;
          const urgent = daysLeft <= 7 && daysLeft >= 0;
          return (
            <View key={c.id} style={[styles.contractCard, overdue && styles.loanCardOverdue, pinned && { borderLeftWidth: 3, borderLeftColor: '#ffa726' }]}>
              <View style={styles.loanCardHeader}>
                <TouchableOpacity onPress={() => togglePin(c.id)} style={{ marginRight: 6 }}>
                  <Text style={{ fontSize: 16, opacity: pinned ? 1 : 0.3 }}>📌</Text>
                </TouchableOpacity>
                <Text style={styles.contractTitle}>{crop?.name}</Text>
                {crop && <GuideButton entryId={GUIDE_ENTRY_IDS.crop(crop.id)} compact />}
                {overdue && <Text style={styles.overdueTag}>OVERDUE</Text>}
                {urgent && !overdue && <Text style={[styles.overdueTag, { backgroundColor: '#7f3200', color: '#ffb74d' }]}>⏰ {daysLeft}d</Text>}
              </View>
              <Text style={styles.contractDetail}>
                {c.amount.toLocaleString()} {unit} · ${c.pricePerUnit.toFixed(2)}/{unit}
              </Text>
              <Text style={styles.contractDetail}>Due day {c.deadlineDay}</Text>
              {!c.completed && !c.failed && penalty > 0 && (
                <Text style={[styles.contractDetail, { color: overdue ? '#ef5350' : '#888' }]}>
                  ⚠️ Default penalty: ${penalty.toLocaleString()}
                </Text>
              )}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (c.delivered / c.amount) * 100)}%` as any }]} />
              </View>
              <Text style={styles.progressLabel}>
                {c.delivered.toLocaleString()} / {c.amount.toLocaleString()} {unit}
                {inStock > 0 ? `  ·  ${inStock.toLocaleString()} in stock` : ''}
              </Text>
              <TouchableOpacity
                style={[styles.deliverBtn, !canDeliver && styles.payBtnDisabled]}
                onPress={() => deliverCrop(c.id, Math.min(inStock, remaining))}
                disabled={!canDeliver}
              >
                <Text style={styles.payBtnText}>
                  {canDeliver
                    ? `Deliver ${Math.min(inStock, remaining).toLocaleString()} ${unit} · $${Math.round(Math.min(inStock, remaining) * c.pricePerUnit).toLocaleString()}`
                    : inStock === 0 ? 'No stock' : 'Delivered'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Available offers</Text>
          <GuideButton entryId="system_contracts" compact />
        </View>
        {availableTemplates.length === 0 && <Text style={styles.emptyText}>No offers available right now.</Text>}
        {availableTemplates.map(t => {
          const crop = CROP_TYPES.find(c => c.id === t.cropId);
          const unit = crop?.unit ?? 'kg';
          const marketPrice = prices.find(p => p.cropId === t.cropId)?.price ?? 0;
          const bonusPrice = (marketPrice * t.priceBonus).toFixed(2);
          const negotiatedPrice = (marketPrice * t.priceBonus * 1.10).toFixed(2);
          const isNegotiating = negotiatingId === t.id;
          return (
            <View key={t.id} style={styles.offerCard}>
              <View style={styles.offerTitleRow}>
                <Text style={styles.offerName}>{t.name}</Text>
                {crop && <GuideButton entryId={GUIDE_ENTRY_IDS.crop(crop.id)} compact />}
              </View>
              <Text style={styles.offerDetail}>
                {crop?.name} · {t.amountRange[0].toLocaleString()}–{t.amountRange[1].toLocaleString()} {unit}
              </Text>
              <Text style={styles.offerDetail}>
                💰 ${bonusPrice}/{unit} (+{Math.round((t.priceBonus - 1) * 100)}%) · {t.termDays}d term
              </Text>
              <Text style={[styles.offerDetail, { color: '#ef9a9a' }]}>
                ⚠️ {(t.penaltyRate * 100).toFixed(0)}% penalty if you default
              </Text>

              {isNegotiating ? (
                <View style={negStyles.negotiateBox}>
                  <Text style={negStyles.negotiateTitle}>🤝 Choose a counter-offer:</Text>
                  <TouchableOpacity style={negStyles.counterBtn} onPress={() => { counterOfferContract(t.id, 'price'); setNegotiatingId(null); }}>
                    <Text style={negStyles.counterBtnText}>💰 Better Price</Text>
                    <Text style={negStyles.counterBtnSub}>${negotiatedPrice}/{unit} (+10%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={negStyles.counterBtn} onPress={() => { counterOfferContract(t.id, 'quantity'); setNegotiatingId(null); }}>
                    <Text style={negStyles.counterBtnText}>📦 Less Quantity</Text>
                    <Text style={negStyles.counterBtnSub}>{t.amountRange[0].toLocaleString()} {unit} (min)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={negStyles.counterBtn} onPress={() => { counterOfferContract(t.id, 'deadline'); setNegotiatingId(null); }}>
                    <Text style={negStyles.counterBtnText}>⏰ More Time</Text>
                    <Text style={negStyles.counterBtnSub}>+20 days ({t.termDays + 20}d total)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={negStyles.cancelBtn} onPress={() => setNegotiatingId(null)}>
                    <Text style={negStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.offerBtns}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptContract(t.id)}>
                    <Text style={styles.acceptBtnText}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={negStyles.negotiateBtn} onPress={() => setNegotiatingId(t.id)}>
                    <Text style={negStyles.negotiateBtnText}>🤝 Negotiate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => declineContract(t.id)}>
                    <Text style={styles.declineBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const negStyles = StyleSheet.create({
  negotiateBtn:     { flex: 1, backgroundColor: '#1a3a5c', borderRadius: R.md, paddingVertical: S.sm, alignItems: 'center', marginHorizontal: 3 },
  negotiateBtnText: { color: '#64b5f6', fontSize: 11, fontWeight: 'bold' },
  negotiateBox:     { backgroundColor: '#0d2137', borderRadius: R.md, padding: 10, marginTop: S.sm, gap: 6 },
  negotiateTitle:   { color: '#90caf9', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  counterBtn:       { backgroundColor: '#1a3a5c', borderRadius: 7, paddingHorizontal: 10, paddingVertical: S.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterBtnText:   { color: '#e3f2fd', fontSize: F.size.sm, fontWeight: 'bold' },
  counterBtnSub:    { color: '#64b5f6', fontSize: F.size.xs },
  cancelBtn:        { alignItems: 'center', paddingVertical: 6 },
  cancelBtnText:    { color: '#555', fontSize: 11 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Balance card
  balanceCard: { backgroundColor: '#0f3460', borderRadius: R.lg, marginHorizontal: S.md, marginBottom: S.sm, padding: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { color: C.textMuted, fontSize: 11, marginBottom: 2 },
  balanceMoney: { color: C.green, fontSize: 26, fontWeight: 'bold' },
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
  coopActive: { color: C.green, fontSize: F.size.md, fontWeight: 'bold', marginBottom: S.xs },
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
  coopDeliverBtn: { backgroundColor: C.greenDark, borderRadius: 6, padding: 8, marginBottom: 4 },
  coopDeliverBtnText: { color: C.greenSoft, fontSize: 13, fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#0d47a1', borderRadius: 6, padding: 6 },
  bookBtnText: { color: '#90caf9', fontSize: 11 },
  voteYesBtn: { flex: 1, backgroundColor: C.greenDark, borderRadius: 6, padding: 8, alignItems: 'center' as const },
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
  openFutureBtn: { backgroundColor: C.greenDark, borderRadius: R.md, padding: 10, alignItems: 'center' },
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.sm, marginBottom: 10 },
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
  eligOk: { backgroundColor: C.greenDark },
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
  loanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm, marginBottom: S.sm },
  loanCardTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  overdueTag: { backgroundColor: '#f44336', borderRadius: R.xs, paddingHorizontal: 6, paddingVertical: 2 },
  loanCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  loanDetail: { minWidth: '40%' },
  loanDetailLabel: { color: C.textFaint, fontSize: F.size.xs },
  loanDetailValue: { color: '#ccc', fontSize: F.size.md, fontWeight: 'bold' },
  payBtn: { backgroundColor: C.greenDark, borderRadius: R.md, padding: 9, alignItems: 'center' },
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
  progressFill: { height: 6, backgroundColor: C.green, borderRadius: 3 },
  progressLabel: { color: C.textFaint, fontSize: F.size.xs },
  offerCard: { backgroundColor: '#1b3a4b', borderRadius: R.md, padding: S.md, marginBottom: 10 },
  offerTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.sm, marginBottom: S.xs },
  offerName: { flex: 1, color: C.text, fontWeight: 'bold', fontSize: F.size.lg },
  offerDetail: { color: '#aaa', fontSize: F.size.sm, marginBottom: 2 },
  offerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: C.greenDark, borderRadius: R.md, padding: 9, alignItems: 'center' },
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
  milestoneDone: { color: C.green, fontWeight: 'bold', fontSize: F.size.xl, marginLeft: S.sm },
  screenTitle: {
    color: C.text,
    fontSize: F.size.xl,
    fontWeight: F.weight.bold,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
});

export default ContractsSection;
