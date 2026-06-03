import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import type { CoopId } from '../../engine/cooperativeTypes';
import { COOP_NAMES, INITIAL_SHARE_PRICES } from '../../engine/cooperativeData';
import {
  getAvailableEquipment,
  nextAvailableDay,
  isMemberSuspended,
  getSeason,
  isCoopActive,
  getYear,
} from '../../engine/cooperatives';

function CoopPanel({ coopId }: { coopId: CoopId }) {
  const {
    coopMemberships, coopStates, day, money,
    joinCoop, leaveCoop, deliverToCoop, voteAGM, bookCoopEquipment,
    inventory, animalInventory,
  } = useGameStore();
  const [expanded, setExpanded] = React.useState(false);
  const [shareInput, setShareInput] = React.useState('10');

  const coopState = coopStates[coopId];
  const membership = coopMemberships[coopId];
  const currentSeason = getSeason(day);
  const currentYear = getYear(day);
  const active = isCoopActive(coopState, currentYear);
  const suspended = membership ? isMemberSuspended(membership, currentSeason) : false;
  const availableEquipment = getAvailableEquipment(coopState.equipment, coopState.health);

  const healthColor =
    coopState.health >= 80 ? C.green
    : coopState.health >= 60 ? '#aed581'
    : coopState.health >= 40 ? '#ffb74d'
    : coopState.health >= 20 ? '#ef5350'
    : '#b71c1c';

  if (!active) {
    return (
      <View style={styles.coopCard}>
        <Text style={styles.coopName}>{COOP_NAMES[coopId]}</Text>
        <Text style={[styles.coopDetail, { color: '#ef5350' }]}>
          Dissolved — reforms in year {coopState.dissolvedUntilYear}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.coopCard}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.coopHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.coopName}>{COOP_NAMES[coopId]}</Text>
          <Text style={styles.coopDetail}>{coopState.memberCount} members</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.coopHealth, { color: healthColor }]}>
            Health {coopState.health.toFixed(0)}%
          </Text>
          <Text style={styles.coopDetail}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View>
          <View style={styles.healthBarBg}>
            <View style={[styles.healthBarFill, { width: `${coopState.health}%` as any, backgroundColor: healthColor }]} />
          </View>

          <Text style={styles.coopSectionLabel}>Terms</Text>
          <Text style={styles.coopDetail}>Delivery obligation: {coopState.terms.deliveryPct}% of harvest</Text>
          <Text style={styles.coopDetail}>Floor price: {coopState.terms.floorPct}% of 90-day avg</Text>
          <Text style={styles.coopDetail}>Annual fee: ${coopState.terms.annualFeePerShare}/share/yr</Text>
          <Text style={styles.coopDetail}>Dividend: {coopState.terms.dividendPct}% of net profit</Text>

          {membership ? (
            <View>
              <Text style={styles.coopSectionLabel}>Your Membership</Text>
              <Text style={styles.coopDetail}>Shares: {membership.shares} @ ${membership.sharePrice.toFixed(2)}/share</Text>
              <Text style={styles.coopDetail}>Equity value: ${(membership.shares * membership.sharePrice).toFixed(0)}</Text>
              {membership.pendingRedemption && (
                <Text style={[styles.coopDetail, { color: '#ffb74d' }]}>
                  ⏳ Exit pending since day {membership.pendingRedemption.requestedDay} — processing after 1 season
                </Text>
              )}
              {suspended && (
                <Text style={[styles.coopDetail, { color: '#ef5350' }]}>
                  ⛔ Benefits suspended until season {membership.suspendedUntilSeason}
                </Text>
              )}

              <Text style={styles.coopSectionLabel}>Delivery Obligation</Text>
              <Text style={styles.coopDetail}>
                {membership.seasonDelivered.toFixed(0)} / {membership.seasonObligation.toFixed(0)} units delivered this season
              </Text>
              {membership.seasonObligation > 0 && (
                <View style={styles.healthBarBg}>
                  <View style={[styles.healthBarFill, {
                    width: `${Math.min(100, (membership.seasonDelivered / membership.seasonObligation) * 100)}%` as any,
                    backgroundColor: C.green,
                  }]} />
                </View>
              )}

              <Text style={styles.coopSectionLabel}>Pool Prices (this season)</Text>
              {Object.keys(coopState.poolPrices).length === 0 ? (
                <Text style={styles.coopDetail}>Pool prices calculated at season start</Text>
              ) : (
                Object.entries(coopState.poolPrices).slice(0, 5).map(([itemId, price]) => (
                  <Text key={itemId} style={styles.coopDetail}>{itemId}: ${(price as number).toFixed(2)}/unit</Text>
                ))
              )}

              {!suspended && membership.seasonObligation > membership.seasonDelivered && (
                <View style={{ marginTop: 8 }}>
                  {Object.entries(coopState.poolPrices).map(([itemId, price]) => {
                    const avail = (inventory[itemId] ?? 0) + (animalInventory[itemId] ?? 0);
                    if (avail <= 0) return null;
                    const needed = membership.seasonObligation - membership.seasonDelivered;
                    const vol = Math.min(avail, needed);
                    return (
                      <TouchableOpacity
                        key={itemId}
                        style={styles.coopDeliverBtn}
                        onPress={() => deliverToCoop(coopId, itemId, vol)}
                      >
                        <Text style={styles.coopDeliverBtnText}>
                          Deliver {vol.toFixed(0)} {itemId} (${((price as number) * vol).toFixed(0)})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {coopState.pendingAGM && !coopState.pendingAGM.resolved && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.coopSectionLabel}>📋 AGM Proposal</Text>
                  <Text style={styles.coopDetail}>
                    Proposed changes: {Object.entries(coopState.pendingAGM.changes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </Text>
                  <Text style={styles.coopDetail}>
                    Other members: {(coopState.pendingAGM.otherYesPct * 100).toFixed(0)}% likely to vote yes
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity style={styles.voteYesBtn} onPress={() => voteAGM(coopId, 'yes')}>
                      <Text style={styles.voteBtnText}>Vote Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.voteNoBtn} onPress={() => voteAGM(coopId, 'no')}>
                      <Text style={styles.voteBtnText}>Vote No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {coopState.pendingAGM?.resolved && (
                <Text style={[styles.coopDetail, { color: C.green, marginTop: 4 }]}>
                  ✅ AGM resolved
                </Text>
              )}

              <Text style={styles.coopSectionLabel}>Equipment Pool ({availableEquipment.length} available)</Text>
              {availableEquipment.map(item => {
                const playerBooked = item.bookings.some(b => b.memberId === 'player' && b.day >= day);
                const nextDay = nextAvailableDay(item, day + 1);
                return (
                  <View key={item.id} style={styles.equipRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coopDetail}>{item.label} — ${item.usageFeePerDay}/day</Text>
                      {playerBooked && <Text style={[styles.coopDetail, { color: C.green }]}>Booked ✓</Text>}
                    </View>
                    {!playerBooked && !suspended && (
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => bookCoopEquipment(coopId, item.id, nextDay)}
                      >
                        <Text style={styles.bookBtnText}>Book day {nextDay} (${item.usageFeePerDay})</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {!membership.pendingRedemption && (
                <TouchableOpacity style={styles.leaveBtn} onPress={() => leaveCoop(coopId)}>
                  <Text style={styles.leaveBtnText}>Request Exit (1-season delay)</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.coopSectionLabel}>Join Co-op</Text>
              <Text style={styles.coopDetail}>
                Share price: ${INITIAL_SHARE_PRICES[coopId].toFixed(2)} · Min 10 shares
              </Text>
              <TextInput
                style={styles.shareInput}
                keyboardType="numeric"
                value={shareInput}
                onChangeText={setShareInput}
                placeholder="Shares to buy"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={[styles.joinBtn, money < 10 * INITIAL_SHARE_PRICES[coopId] && styles.joinBtnDisabled]}
                onPress={() => joinCoop(coopId, parseInt(shareInput, 10) || 10)}
                disabled={money < 10 * INITIAL_SHARE_PRICES[coopId]}
              >
                <Text style={styles.joinBtnText}>
                  Join ({(parseInt(shareInput, 10) || 10)} shares · ${((parseInt(shareInput, 10) || 10) * INITIAL_SHARE_PRICES[coopId]).toFixed(0)})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function CoopsSection() {
  return (
    <View>
      <Text style={styles.sectionTitle}>🤝 Agricultural Co-operatives</Text>
      <CoopPanel coopId="grain" />
      <CoopPanel coopId="horticulture" />
      <CoopPanel coopId="livestock" />
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
  loanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
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
  offerName: { color: C.text, fontWeight: 'bold', fontSize: F.size.lg, marginBottom: S.xs },
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

export default CoopsSection;
