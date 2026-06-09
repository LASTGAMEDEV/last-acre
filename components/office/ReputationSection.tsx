import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useGameStore, FuturesPosition } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import { CROP_TYPES, CropType } from '../../data/cropTypes';
import { PROCESSED_ITEM_DEFS } from '../../data/processingTypes';

function ReputationSection() {
  const { legacyReputation, prices, futures, prestige, openFuture, awardHistory, productAwardBonuses } = useGameStore();
  const rep = legacyReputation ?? 50;
  const repColor = rep >= 80 ? C.green : rep >= 60 ? '#ffb74d' : rep >= 40 ? C.text : '#f44336';
  const repTier = rep >= 80 ? 'Excellent' : rep >= 65 ? 'Good' : rep >= 40 ? 'Average' : 'Poor';

  const [selectedCrop, setSelectedCrop] = React.useState('');
  const [futureQty, setFutureQty] = React.useState('');
  const [futureTerm, setFutureTerm] = React.useState(30);

  const openFutures = (futures ?? []).filter((f: any) => !f.settled);

  return (
    <View>
      {/* Reputation card */}
      <View style={styles.repCard}>
        <Text style={styles.sectionTitle}>⭐ Farm Reputation</Text>
        <View style={styles.repRow}>
          <Text style={[styles.repScore, { color: repColor }]}>{rep}</Text>
          <View style={styles.repInfo}>
            <Text style={[styles.repTier, { color: repColor }]}>{repTier}</Text>
            <Text style={styles.repEffect}>
              {rep >= 80 ? '−1% loan rate · S-tier contracts unlocked' :
               rep >= 65 ? '−0.5% loan rate · A-tier contracts unlocked' :
               rep >= 40 ? 'Standard rates' :
               '+1% loan rate penalty'}
            </Text>
            <Text style={styles.repEffect}>+5 on contract completion · −10 on failure</Text>
          </View>
        </View>
        <View style={styles.repBar}>
          <View style={[styles.repFill, { width: `${rep}%` as any, backgroundColor: repColor }]} />
        </View>
      </View>

      {/* Prestige card */}
      {(prestige ?? 0) > 0 && (
        <View style={[styles.repCard, { marginTop: 0, borderColor: '#ffb74d', borderWidth: 1 }]}>
          <Text style={styles.sectionTitle}>⚡ Prestige</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: '#ffb74d', fontSize: 32, fontWeight: 'bold' }}>{prestige}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: 'bold' }}>Level {prestige} Farmer</Text>
              <Text style={{ color: C.textMuted, fontSize: 11 }}>+{(prestige ?? 0) * 5}% revenue on all sales</Text>
              <Text style={{ color: '#555', fontSize: 10, marginTop: 2 }}>Earned by completing full years</Text>
            </View>
          </View>
        </View>
      )}

      {/* Awards */}
      <View style={styles.repCard}>
        <Text style={styles.sectionTitle}>🏆 Awards</Text>
        {(awardHistory ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No awards yet</Text>
        ) : (
          <>
            {(awardHistory ?? []).map((award: any, idx: number) => {
              const def = PROCESSED_ITEM_DEFS.find(d => d.id === award.productId);
              return (
                <View key={idx} style={styles.awardRow}>
                  <Text style={styles.awardBadge}>
                    {award.award === 'gold' ? '🥇' : award.award === 'silver' ? '🥈' : '🥉'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.awardText}>
                      {def?.name ?? award.productId} — {award.showName}
                    </Text>
                    <Text style={styles.awardDay}>Day {award.day}</Text>
                  </View>
                </View>
              );
            })}
            {Object.keys(productAwardBonuses ?? {}).length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: F.size.sm, fontWeight: 'bold', marginBottom: 4 }}>
                  Product Bonuses
                </Text>
                {Object.entries(productAwardBonuses).map(([pid, bonus]: [string, any]) => {
                  const def = PROCESSED_ITEM_DEFS.find(d => d.id === pid);
                  return (
                    <Text key={pid} style={styles.bonusText}>
                      {def?.name ?? pid}: +{bonus}% price
                    </Text>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>

      {/* Futures */}
      <View style={styles.futuresCard}>
        <Text style={styles.sectionTitle}>📊 Futures Contracts</Text>
        <Text style={styles.coopDetail}>Lock in today&apos;s price for future delivery. Auto-settles at delivery day.</Text>

        {/* Open a future */}
        <View style={styles.futureForm}>
          <Text style={styles.futureFormLabel}>Crop</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CROP_TYPES.map((c: CropType) => {
              const price = prices.find((p: any) => p.cropId === c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.futureChip, selectedCrop === c.id && styles.futureChipActive]}
                  onPress={() => setSelectedCrop(c.id)}
                >
                  <Text style={[styles.futureChipText, selectedCrop === c.id && { color: C.white }]}>
                    {c.name} ${price?.price.toFixed(2) ?? '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.futureFormLabel}>Quantity (units)</Text>
          <TextInput
            style={styles.futureInput}
            keyboardType="numeric"
            placeholder="e.g. 10000"
            placeholderTextColor="#555"
            value={futureQty}
            onChangeText={setFutureQty}
          />
          <Text style={styles.futureFormLabel}>Delivery in</Text>
          <View style={styles.futureTermRow}>
            {[30, 60, 90].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.termChip, futureTerm === t && styles.termChipActive]}
                onPress={() => setFutureTerm(t)}
              >
                <Text style={[styles.termChipText, futureTerm === t && { color: C.white }]}>{t}d</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.openFutureBtn, (!selectedCrop || !futureQty) && styles.joinBtnDisabled]}
            disabled={!selectedCrop || !futureQty}
            onPress={() => {
              const qty = parseInt(futureQty);
              if (!selectedCrop || isNaN(qty) || qty <= 0) return;
              openFuture(selectedCrop, qty, futureTerm);
              setFutureQty('');
            }}
          >
            <Text style={styles.joinBtnText}>Open Future</Text>
          </TouchableOpacity>
        </View>

        {/* Active futures */}
        {openFutures.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.futureFormLabel}>Active positions</Text>
            {openFutures.map((f: FuturesPosition) => {
              const crop = CROP_TYPES.find((c: CropType) => c.id === f.cropId);
              return (
                <View key={f.id} style={styles.futureRow}>
                  <Text style={styles.futureCrop}>{crop?.name ?? f.cropId}</Text>
                  <Text style={styles.futureDetail}>
                    {f.quantity.toLocaleString()} {crop?.unit} @ ${f.lockPrice.toFixed(2)} · delivers day {f.deliveryDay}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
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
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    borderRadius: R.sm,
    padding: S.sm,
    marginBottom: S.xs,
  },
  awardBadge: {
    fontSize: F.size.xl,
    marginRight: S.sm,
  },
  awardText: {
    color: C.text,
    fontSize: F.size.md,
    fontWeight: 'bold',
  },
  awardDay: {
    color: C.textMuted,
    fontSize: F.size.sm,
  },
  bonusText: {
    color: C.textDim,
    fontSize: F.size.sm,
    marginBottom: 2,
  },
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

export default ReputationSection;
