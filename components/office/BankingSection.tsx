import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import HelpSheet from '../../components/HelpSheet';
import GuideButton from '../../components/GuideButton';
import {
  LOAN_TIERS,
  computeCreditScore,
  creditRating,
  calculateRate,
  loanTotalOwed,
  checkEligibility,
  rollingIncome,
  timeDepositPayout,
  timeDepositMatured,
} from '../../engine/banking';
import { MACHINE_TYPES } from '../../data/machineTypes';

const TERM_OPTIONS = [
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 180, label: '180d' },
  { days: 365, label: '1 year' },
];

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

const TIME_DEPOSIT_OPTIONS = [
  { days: 30, rate: 0.04, label: '30 days', rateLabel: '4% APR' },
  { days: 90, rate: 0.06, label: '90 days', rateLabel: '6% APR' },
  { days: 180, rate: 0.08, label: '180 days', rateLabel: '8% APR' },
  { days: 365, rate: 0.12, label: '1 year', rateLabel: '12% APR' },
];

function BankingSection() {
  const {
    money, loans, savings, timeDeposits, salesLog, loanHistory, day,
    requestLoan, repayLoan, depositSavings, withdrawSavings,
    openTimeDeposit, closeTimeDeposit, resetGame, renegotiateLoan,
    familyLoanUsedDay, takeFamilyLoan, parcels, emergencyLeaseback,
    machines, trailers, attachments,
    liquidateAllMachinery, consolidateDebt, takePaydayLoan, takeCoopEmergencyRescue,
    coopMemberships, reputation,
    paydayLoanUsedDay, coopRescueLoanDay,
  } = useGameStore() as any;

  const [loanAmount, setLoanAmount]   = useState('');
  const [termDays, setTermDays]       = useState(90);
  const [depositInput, setDepositInput] = useState('');
  const [tdAmount, setTdAmount]         = useState('');
  const [tdTerm, setTdTerm]             = useState(90);

  const income30d = rollingIncome(salesLog, day - 30, day);
  const income90d = rollingIncome(salesLog, day - 90, day);
  const activeLoans = loans.filter(l => !l.paid && !l.defaulted);
  const creditScore = computeCreditScore(loanHistory, activeLoans, income30d);
  const rating = creditRating(creditScore);

  const principal = parseFloat(loanAmount.replace(/,/g, '')) || 0;
  const rate = principal > 0 ? calculateRate(termDays, creditScore, principal, income30d) : 0;
  const totalOwed = principal > 0 ? loanTotalOwed(principal, rate, termDays) : 0;
  const interest = totalOwed - principal;
  const eligibility = principal > 0
    ? checkEligibility(principal, termDays, income30d, income90d, creditScore, activeLoans)
    : { eligible: false, reason: 'Enter an amount.' };

  const maxApproved = Math.max(5000, income30d * 3);

  function handleRequestLoan() {
    if (!eligibility.eligible) return;
    requestLoan(principal, termDays, `Custom loan (${termDays}d)`);
    setLoanAmount('');
  }

  return (
    <View>
      {/* Credit profile */}
      <View style={styles.creditCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Banking profile</Text>
          <GuideButton entryId="system_banking_credit" compact />
        </View>
        <View style={styles.creditRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.creditLabel}>Credit score</Text>
              <HelpSheet
                title="Credit Score"
                body="Your credit score determines how much you can borrow and at what interest rate. It's based on your rolling income over recent days, your existing debt, and how reliably you've repaid past loans."
                buttonSize={12}
                entryId="system_banking_credit"
              />
            </View>
            <Text style={[styles.creditScore, { color: rating.color }]}>{creditScore}</Text>
            <Text style={[styles.creditRating, { color: rating.color }]}>{rating.label}</Text>
          </View>
          <View style={styles.creditStats}>
            <View style={styles.creditStat}>
              <Text style={styles.creditStatLabel}>30d income</Text>
              <Text style={styles.creditStatValue}>${Math.round(income30d).toLocaleString()}</Text>
            </View>
            <View style={styles.creditStat}>
              <Text style={styles.creditStatLabel}>90d income</Text>
              <Text style={styles.creditStatValue}>${Math.round(income90d).toLocaleString()}</Text>
            </View>
            <View style={styles.creditStat}>
              <Text style={styles.creditStatLabel}>Max approved</Text>
              <Text style={styles.creditStatValue}>${Math.round(maxApproved).toLocaleString()}</Text>
            </View>
            <View style={styles.creditStat}>
              <Text style={styles.creditStatLabel}>History</Text>
              <Text style={styles.creditStatValue}>
                {loanHistory.filter(r => r.paidOnTime).length}✓ {loanHistory.filter(r => !r.paidOnTime).length}✗
              </Text>
            </View>
          </View>
        </View>
        {/* Score bar */}
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, {
            width: `${((creditScore - 300) / 550) * 100}%` as any,
            backgroundColor: rating.color,
          }]} />
        </View>
        <View style={styles.scoreBarLabels}>
          <Text style={styles.scoreBarTick}>300</Text>
          <Text style={styles.scoreBarTick}>450</Text>
          <Text style={styles.scoreBarTick}>600</Text>
          <Text style={styles.scoreBarTick}>750</Text>
          <Text style={styles.scoreBarTick}>850</Text>
        </View>
      </View>

      {/* Family Emergency Loan */}
      {(() => {
        const COOLDOWN = 1080; // 3 game years
        const lastUsed = familyLoanUsedDay ?? null;
        const cooldownLeft = lastUsed !== null ? Math.max(0, COOLDOWN - (day - lastUsed)) : 0;
        const isCashCrisis = money < 2000;
        const hasDefaulted = loans.some(l => l.defaulted && !l.paid);
        const eligible = (isCashCrisis || hasDefaulted) && cooldownLeft === 0;
        if (!eligible && cooldownLeft === 0 && !isCashCrisis && !hasDefaulted) return null;
        return (
          <View style={[styles.section, { borderColor: '#c8860a55', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#ffa726' }]}>👨‍👩‍👧 Family Emergency Loan</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.sm, marginBottom: 10, lineHeight: 18 }}>
              Your family offers an interest-free loan of $10,000 — no questions asked. Repay within 180 days to protect the relationship.
            </Text>
            {cooldownLeft > 0 ? (
              <Text style={{ color: '#888', fontSize: F.size.sm }}>
                Available again in {cooldownLeft} days (used {lastUsed !== null ? `on day ${lastUsed}` : ''})
              </Text>
            ) : eligible ? (
              <TouchableOpacity
                style={{ backgroundColor: '#c8860a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => Alert.alert(
                  '👨‍👩‍👧 Family Loan',
                  'Your family will lend you $10,000 at 0% interest, due in 180 days.\n\nThis can only be used once every 3 years.',
                  [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Accept $10,000', onPress: takeFamilyLoan },
                  ]
                )}
              >
                <Text style={{ color: C.white, fontWeight: 'bold', fontSize: F.size.md }}>Accept $10,000 · 0% interest · 180 days</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#888', fontSize: F.size.sm }}>
                Available when cash is below $2,000 or a loan is in default.
              </Text>
            )}
          </View>
        );
      })()}

      {/* Emergency Land Leaseback */}
      {(() => {
        const ownedParcels = (parcels ?? []).filter(p => p.owned);
        const availableParcels = ownedParcels.filter(p => !p.leasedOut || (p.leasebackEndDay ?? 0) <= day);
        const leasedOut = ownedParcels.filter(p => p.leasedOut && (p.leasebackEndDay ?? 0) > day);
        const totalDebt = loans.filter(l => !l.paid && !l.defaulted).reduce((s, l) => s + l.totalOwed, 0);
        const inDistress = money < totalDebt * 0.3 || (money < 5000 && totalDebt > 0);
        if (!inDistress && leasedOut.length === 0) return null;
        return (
          <View style={[styles.section, { borderColor: '#8b232255', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#ef9a9a' }]}>🏚️ Emergency Land Leaseback</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.sm, marginBottom: S.sm, lineHeight: 18 }}>
              Lease your land to a neighbor for immediate cash. You get 60% of land value upfront; the parcel is unavailable for 1 year.
            </Text>
            {leasedOut.length > 0 && leasedOut.map(p => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginBottom: 4 }}>
                <Text style={{ flex: 1, color: '#ef9a9a', fontSize: F.size.sm }}>🏷️ {p.name} — leased out</Text>
                <Text style={{ color: C.textFaint, fontSize: F.size.xs }}>returns day {p.leasebackEndDay}</Text>
              </View>
            ))}
            {availableParcels.length === 0 ? (
              <Text style={{ color: C.textFaint, fontSize: F.size.sm }}>No parcels available to lease out.</Text>
            ) : (
              availableParcels.map(p => {
                const upfront = Math.round(p.hectares * p.pricePerHa * 0.6);
                return (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: F.size.sm, fontWeight: 'bold' }}>{p.name} · {p.hectares} ha</Text>
                      <Text style={{ color: '#64b5f6', fontSize: F.size.xs }}>Receive ${upfront.toLocaleString()} · 1 year term</Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#3a1515', borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#8b2322' }}
                      onPress={() => Alert.alert(
                        '🏚️ Lease Out Land',
                        `Lease "${p.name}" (${p.hectares} ha) for $${upfront.toLocaleString()} upfront.\n\nThe parcel will be unavailable for 1 game year (360 days). Any planted crops will be lost.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: `Lease · $${upfront.toLocaleString()}`, style: 'destructive', onPress: () => emergencyLeaseback(p.id) },
                        ]
                      )}
                    >
                      <Text style={{ color: '#ef9a9a', fontSize: 11, fontWeight: 'bold' }}>Lease Out</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        );
      })()}

      {/* Equipment Liquidation */}
      {(() => {
        const allMachines = [...(machines ?? []), ...(trailers ?? []), ...(attachments ?? [])];
        if (allMachines.length === 0) return null;
        const totalDebt = loans.filter((l: any) => !l.paid && !l.defaulted).reduce((s: number, l: any) => s + l.totalOwed, 0);
        const inDistress = money < totalDebt * 0.2 || (money < 3000 && totalDebt > 0) || loans.some((l: any) => l.defaulted && !l.paid);
        if (!inDistress) return null;
        let liquidationValue = 0;
        for (const m of (machines ?? [])) {
          const type = MACHINE_TYPES.find((t: any) => t.id === m.typeId);
          if (type) liquidationValue += Math.round(type.cost * 0.40 * ((m.condition ?? 100) / 100));
        }
        for (const t of (trailers ?? [])) {
          const type = MACHINE_TYPES.find((mt: any) => mt.id === t.typeId);
          if (type) liquidationValue += Math.round(type.cost * 0.40);
        }
        for (const a of (attachments ?? [])) {
          const type = MACHINE_TYPES.find((mt: any) => mt.id === a.typeId);
          if (type) liquidationValue += Math.round(type.cost * 0.40);
        }
        return (
          <View style={[styles.section, { borderColor: '#c8380a55', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#ff7043' }]}>🔧 Emergency Equipment Liquidation</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.sm, marginBottom: 10, lineHeight: 18 }}>
              Sell all machinery, trailers, and attachments immediately at 40% of purchase value. You will lose access to field operations until you re-buy equipment.
            </Text>
            <View style={{ backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginBottom: 10 }}>
              <Text style={{ color: C.textMuted, fontSize: F.size.xs, marginBottom: 2 }}>Machines to liquidate: {allMachines.length}</Text>
              <Text style={{ color: '#ff7043', fontWeight: 'bold', fontSize: F.size.lg }}>Receive ${liquidationValue.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#7f2a0a', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ff5722' }}
              onPress={() => Alert.alert(
                '🔧 Liquidate All Equipment',
                `Sell all ${allMachines.length} machine(s) for $${liquidationValue.toLocaleString()}?\n\nAll field jobs will be cancelled. Equipment must be re-purchased.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: `Sell All · $${liquidationValue.toLocaleString()}`, style: 'destructive', onPress: liquidateAllMachinery },
                ]
              )}
            >
              <Text style={{ color: '#ffccbc', fontWeight: 'bold', fontSize: F.size.md }}>Liquidate All Equipment · ${liquidationValue.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Debt Consolidation */}
      {(() => {
        const activeLoans = loans.filter((l: any) => !l.paid && !l.defaulted);
        if (activeLoans.length < 2) return null;
        const totalPrincipal = activeLoans.reduce((s: number, l: any) => s + l.principal, 0);
        const avgRate = activeLoans.reduce((s: number, l: any) => s + l.rate, 0) / activeLoans.length;
        const consolidatedRate = Math.min(avgRate + 0.05, 0.35);
        const totalOwed = Math.round(totalPrincipal * (1 + consolidatedRate * 270 / 365));
        return (
          <View style={[styles.section, { borderColor: '#546e7a55', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#90caf9' }]}>🔀 Debt Restructuring</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.sm, marginBottom: 10, lineHeight: 18 }}>
              Merge all {activeLoans.length} active loans into one consolidated loan at a fixed 270-day term. Simplifies repayment but incurs a 5% rate penalty.
            </Text>
            <View style={{ backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Combined principal</Text>
                <Text style={{ color: C.text, fontSize: F.size.xs, fontWeight: 'bold' }}>${totalPrincipal.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Consolidated rate</Text>
                <Text style={{ color: '#ef9a9a', fontSize: F.size.xs, fontWeight: 'bold' }}>{(consolidatedRate * 100).toFixed(1)}% APR</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Total to repay</Text>
                <Text style={{ color: '#ef9a9a', fontWeight: 'bold', fontSize: F.size.sm }}>${totalOwed.toLocaleString()}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#0d2a40', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#546e7a' }}
              onPress={() => Alert.alert(
                '🔀 Consolidate Debt',
                `Merge ${activeLoans.length} loans (total $${totalPrincipal.toLocaleString()}) into one 270-day loan at ${(consolidatedRate * 100).toFixed(1)}%?\n\nTotal to repay: $${totalOwed.toLocaleString()}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Consolidate', onPress: consolidateDebt },
                ]
              )}
            >
              <Text style={{ color: '#90caf9', fontWeight: 'bold', fontSize: F.size.md }}>Consolidate {activeLoans.length} Loans · ${totalOwed.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Payday Lender */}
      {(() => {
        const COOLDOWN = 90;
        const lastUsed = paydayLoanUsedDay ?? null;
        const cooldownLeft = lastUsed !== null ? Math.max(0, COOLDOWN - (day - lastUsed)) : 0;
        const isCrisis = money < 1000 || loans.some((l: any) => l.defaulted && !l.paid);
        if (!isCrisis && cooldownLeft === 0) return null;
        const termDays = 21;
        const rate = 0.40;
        const principal = 2500;
        const totalOwed = Math.round(principal * (1 + rate * termDays / 365));
        return (
          <View style={[styles.section, { borderColor: '#ff6f0055', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#ffa726' }]}>🦈 Short-term Emergency Lender</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.sm, marginBottom: 10, lineHeight: 18 }}>
              A predatory lender offers quick cash with no credit check. Extremely high interest — only use as a last resort.
            </Text>
            {cooldownLeft > 0 ? (
              <Text style={{ color: '#888', fontSize: F.size.sm }}>Available again in {cooldownLeft} days.</Text>
            ) : isCrisis ? (
              <>
                <View style={{ backgroundColor: C.bgDeep, borderRadius: R.sm, padding: S.sm, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Amount received</Text>
                    <Text style={{ color: C.green, fontSize: F.size.xs, fontWeight: 'bold' }}>${principal.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Interest rate</Text>
                    <Text style={{ color: '#ef9a9a', fontSize: F.size.xs, fontWeight: 'bold' }}>40% APR — {termDays}-day term</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: C.textMuted, fontSize: F.size.xs }}>Total to repay</Text>
                    <Text style={{ color: '#ef9a9a', fontWeight: 'bold', fontSize: F.size.sm }}>${totalOwed.toLocaleString()}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#7f3300', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ff6f00' }}
                  onPress={() => Alert.alert(
                    '🦈 Predatory Loan',
                    `Borrow $${principal.toLocaleString()} at 40% APR?\n\nYou must repay $${totalOwed.toLocaleString()} within ${termDays} days or face default.`,
                    [
                      { text: 'Walk away', style: 'cancel' },
                      { text: `Take $${principal.toLocaleString()}`, style: 'destructive', onPress: takePaydayLoan },
                    ]
                  )}
                >
                  <Text style={{ color: '#ffe0b2', fontWeight: 'bold', fontSize: F.size.md }}>Borrow $2,500 · 40% APR · 21 days</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={{ color: '#888', fontSize: F.size.sm }}>Available when cash is below $1,000 or a loan is in default.</Text>
            )}
          </View>
        );
      })()}

      {/* Co-op Emergency Rescue */}
      {(() => {
        const isMember = Object.values(coopMemberships ?? {}).some((m: any) => m?.active);
        if (!isMember) return null;
        const repScore = reputation?.score ?? 0;
        if (repScore < 40) return null;
        const COOLDOWN = 720;
        const lastUsed = coopRescueLoanDay ?? null;
        const cooldownLeft = lastUsed !== null ? Math.max(0, COOLDOWN - (day - lastUsed)) : 0;
        const isCrisis = money < 3000 || loans.some((l: any) => l.defaulted && !l.paid);
        if (!isCrisis && cooldownLeft === 0) return null;
        return (
          <View style={[styles.section, { borderColor: '#1b5e2055', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#a5d6a7' }]}>🤝 Co-op Emergency Rescue</Text>
            <Text style={{ color: C.textMuted, fontSize: F.size.sm, marginBottom: 10, lineHeight: 18 }}>
              Your co-op values your {repScore}-point reputation. Members have voted to offer an emergency advance on future dividends — interest-free, due in 90 days.
            </Text>
            {cooldownLeft > 0 ? (
              <Text style={{ color: '#888', fontSize: F.size.sm }}>Available again in {cooldownLeft} days (usable once every 2 years).</Text>
            ) : isCrisis ? (
              <TouchableOpacity
                style={{ backgroundColor: '#1b3a1b', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#388e3c' }}
                onPress={() => Alert.alert(
                  '🤝 Co-op Emergency Advance',
                  'Your co-op will advance $5,000 against future dividends.\n\n0% interest · repay within 90 days.\n\nThis is available once every 2 years.',
                  [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Accept $5,000 · 0%', onPress: takeCoopEmergencyRescue },
                  ]
                )}
              >
                <Text style={{ color: '#c8e6c9', fontWeight: 'bold', fontSize: F.size.md }}>Accept $5,000 Advance · 0% · 90 days</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#888', fontSize: F.size.sm }}>Available when cash is below $3,000 or a loan is in default.</Text>
            )}
          </View>
        );
      })()}

      {/* Custom loan form */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Request loan</Text>
          <GuideButton entryId="system_banking_credit" compact />
        </View>

        {/* Quick amount buttons */}
        <Text style={styles.fieldLabel}>Quick amount</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {QUICK_AMOUNTS.map(amt => (
            <TouchableOpacity
              key={amt}
              style={[styles.quickAmtBtn, loanAmount === String(amt) && styles.quickAmtBtnActive]}
              onPress={() => setLoanAmount(String(amt))}
            >
              <Text style={[styles.quickAmtText, loanAmount === String(amt) && styles.quickAmtTextActive]}>
                ${(amt / 1000).toFixed(0)}k
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom amount input */}
        <Text style={styles.fieldLabel}>Or enter custom amount</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={loanAmount}
          onChangeText={setLoanAmount}
          placeholder="e.g. 15000"
          placeholderTextColor="#555"
        />

        {/* Term selector */}
        <Text style={styles.fieldLabel}>Repayment term</Text>
        <View style={styles.termRow}>
          {TERM_OPTIONS.map(t => (
            <TouchableOpacity
              key={t.days}
              style={[styles.termBtn, termDays === t.days && styles.termBtnActive]}
              onPress={() => setTermDays(t.days)}
            >
              <Text style={[styles.termBtnText, termDays === t.days && styles.termBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loan summary */}
        {principal > 0 && (
          <View style={styles.loanSummary}>
            <View style={styles.loanSummaryRow}>
              <Text style={styles.loanSummaryLabel}>Annual rate</Text>
              <Text style={styles.loanSummaryValue}>{(rate * 100).toFixed(1)}%</Text>
            </View>
            <View style={styles.loanSummaryRow}>
              <Text style={styles.loanSummaryLabel}>Total interest</Text>
              <Text style={[styles.loanSummaryValue, { color: '#ef9a9a' }]}>${Math.round(interest).toLocaleString()}</Text>
            </View>
            <View style={styles.loanSummaryRow}>
              <Text style={styles.loanSummaryLabel}>Total to repay</Text>
              <Text style={[styles.loanSummaryValue, { color: C.white, fontWeight: 'bold' }]}>${Math.round(totalOwed).toLocaleString()}</Text>
            </View>
            <View style={styles.loanSummaryRow}>
              <Text style={styles.loanSummaryLabel}>Due on day</Text>
              <Text style={styles.loanSummaryValue}>{day + termDays}</Text>
            </View>
          </View>
        )}

        {/* Eligibility message */}
        {principal > 0 && (
          <View style={[styles.eligibilityBox, eligibility.eligible ? styles.eligOk : styles.eligNo]}>
            <Text style={styles.eligibilityText}>
              {eligibility.eligible ? '✓ Loan approved' : `✗ ${eligibility.reason}`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.requestBtn, !eligibility.eligible && styles.requestBtnDisabled]}
          onPress={handleRequestLoan}
          disabled={!eligibility.eligible}
        >
          <Text style={styles.requestBtnText}>
            {eligibility.eligible ? `Request $${principal.toLocaleString()}` : 'Not eligible'}
          </Text>
        </TouchableOpacity>

        {/* Tier reference */}
        <Text style={styles.fieldLabel}>Base rate reference</Text>
        <View style={styles.tiersRow}>
          {LOAN_TIERS.map(tier => (
            <View key={tier.name} style={styles.tierRef}>
              <Text style={styles.tierRefName}>{tier.name}</Text>
              <Text style={styles.tierRefRate}>{(tier.baseRate * 100).toFixed(0)}% base</Text>
              <Text style={styles.tierRefIncome}>
                {tier.minMonthlyIncome > 0 ? `Min $${(tier.minMonthlyIncome / 1000).toFixed(0)}k/month` : 'No requirement'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Active loans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active loans</Text>
        {activeLoans.length === 0 && <Text style={styles.emptyText}>No active loans.</Text>}
        {activeLoans.map(loan => {
          const overdue = day > loan.payoffDay;
          const canPay = money >= loan.totalOwed;
          return (
            <View key={loan.id} style={[styles.loanCard, overdue && styles.loanCardOverdue]}>
              <View style={styles.loanCardHeader}>
                <Text style={styles.loanCardTitle}>{loan.label}</Text>
                {overdue && <Text style={styles.overdueTag}>OVERDUE</Text>}
              </View>
              <View style={styles.loanCardDetails}>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Principal</Text>
                  <Text style={styles.loanDetailValue}>${loan.principal.toLocaleString()}</Text>
                </View>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Rate</Text>
                  <Text style={styles.loanDetailValue}>{(loan.rate * 100).toFixed(1)}%</Text>
                </View>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Total owed</Text>
                  <Text style={[styles.loanDetailValue, { color: '#ef9a9a' }]}>${Math.round(loan.totalOwed).toLocaleString()}</Text>
                </View>
                <View style={styles.loanDetail}>
                  <Text style={styles.loanDetailLabel}>Due day</Text>
                  <Text style={[styles.loanDetailValue, overdue && { color: '#f44336' }]}>{loan.payoffDay}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.payBtn, !canPay && styles.payBtnDisabled]}
                onPress={() => repayLoan(loan.id)}
                disabled={!canPay}
              >
                <Text style={styles.payBtnText}>
                  {canPay ? `Pay $${Math.round(loan.totalOwed).toLocaleString()}` : `Insufficient funds`}
                </Text>
              </TouchableOpacity>
              {!loan.renegotiated && !overdue && loan.payoffDay - day > 7 && (
                <View style={styles.extendRow}>
                  <Text style={styles.extendLabel}>Extend term (2% fee = ${Math.round(loan.principal * 0.02).toLocaleString()}):</Text>
                  <View style={styles.extendBtns}>
                    {([30, 60, 90] as const).map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.extendBtn, money < Math.round(loan.principal * 0.02) && styles.extendBtnDisabled]}
                        onPress={() => renegotiateLoan(loan.id, d)}
                        disabled={money < Math.round(loan.principal * 0.02)}
                      >
                        <Text style={styles.extendBtnText}>+{d}d</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {loan.renegotiated && (
                <Text style={styles.renegotiatedTag}>✓ Extended once</Text>
              )}
            </View>
          );
        })}
        {/* Paid / defaulted history */}
        {loans.filter(l => l.paid || l.defaulted).length > 0 && (
          <Text style={styles.historyTitle}>History</Text>
        )}
        {loans.filter(l => l.paid || l.defaulted).map(loan => {
          const record = loanHistory.find(r => r.loanId === loan.id);
          const onTime = record?.paidOnTime ?? false;
          const statusColor = loan.defaulted ? '#f44336' : onTime ? C.green : '#ff9800';
          const statusLabel = loan.defaulted ? 'Defaulted' : onTime ? 'On time' : 'Late';
          const statusIcon = loan.defaulted ? '✗' : onTime ? '✓' : '⚠️';
          return (
            <View key={loan.id} style={[styles.loanCardDone, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.bg }]}>
              <View>
                <Text style={[styles.loanCardDoneText, { color: C.textMuted }]}>{loan.label}</Text>
                <Text style={[styles.loanCardDoneText, { color: '#555' }]}>${loan.principal.toLocaleString()} · due day {loan.payoffDay}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: statusColor, fontWeight: 'bold', fontSize: 12 }}>{statusIcon} {statusLabel}</Text>
                <Text style={{ color: '#444', fontSize: 10 }}>{(loan.rate * 100).toFixed(1)}% rate</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Savings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Savings Account <Text style={styles.apr}>(10% APR · S&P 500)</Text></Text>
        <Text style={styles.savingsBalance}>${Math.round(savings.balance).toLocaleString()}</Text>
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          keyboardType="numeric"
          value={depositInput}
          onChangeText={setDepositInput}
          placeholder="Amount"
          placeholderTextColor="#555"
        />
        <View style={styles.savingsBtns}>
          {[500, 1000, 5000].map(amt => (
            <View key={amt} style={styles.savingsBtnPair}>
              <TouchableOpacity
                style={[styles.savBtn, money < amt && styles.savBtnDisabled]}
                onPress={() => depositSavings(amt)}
                disabled={money < amt}
              >
                <Text style={styles.savBtnText}>+${(amt / 1000).toFixed(amt >= 1000 ? 0 : 1)}k</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savBtnOut, savings.balance < amt && styles.savBtnDisabled]}
                onPress={() => withdrawSavings(amt)}
                disabled={savings.balance < amt}
              >
                <Text style={styles.savBtnText}>-${(amt / 1000).toFixed(amt >= 1000 ? 0 : 1)}k</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {depositInput !== '' && (
          <View style={styles.savingsCustomRow}>
            <TouchableOpacity
              style={[styles.savBtn, { flex: 1 }, money < parseFloat(depositInput) && styles.savBtnDisabled]}
              onPress={() => { depositSavings(parseFloat(depositInput) || 0); setDepositInput(''); }}
            >
              <Text style={styles.savBtnText}>Deposit ${parseFloat(depositInput || '0').toLocaleString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.savBtnOut, { flex: 1 }, savings.balance < parseFloat(depositInput) && styles.savBtnDisabled]}
              onPress={() => { withdrawSavings(parseFloat(depositInput) || 0); setDepositInput(''); }}
            >
              <Text style={styles.savBtnText}>Withdraw ${parseFloat(depositInput || '0').toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Time Deposits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Deposits <Text style={styles.apr}>(locked · higher yield)</Text></Text>
        {/* Selector */}
        <Text style={styles.fieldLabel}>Lock-up term</Text>
        <View style={styles.termRow}>
          {TIME_DEPOSIT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.days}
              style={[styles.termBtn, tdTerm === opt.days && styles.termBtnActive]}
              onPress={() => setTdTerm(opt.days)}
            >
              <Text style={[styles.termBtnText, tdTerm === opt.days && styles.termBtnTextActive]}>
                {opt.label}
              </Text>
              <Text style={[styles.tierRefRate, { marginTop: 2 }]}>{opt.rateLabel}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Amount input */}
        <Text style={styles.fieldLabel}>Amount to lock</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={tdAmount}
          onChangeText={setTdAmount}
          placeholder="e.g. 10000"
          placeholderTextColor="#555"
        />
        {(() => {
          const tdOpt = TIME_DEPOSIT_OPTIONS.find(o => o.days === tdTerm)!;
          const principal = parseFloat(tdAmount.replace(/,/g, '')) || 0;
          const payout = principal > 0 ? Math.round(principal * (1 + tdOpt.rate * (tdOpt.days / 365))) : 0;
          const interest = payout - principal;
          const canOpen = principal > 0 && money >= principal;
          return (
            <>
              {principal > 0 && (
                <View style={styles.loanSummary}>
                  <View style={styles.loanSummaryRow}>
                    <Text style={styles.loanSummaryLabel}>Interest earned</Text>
                    <Text style={[styles.loanSummaryValue, { color: C.green }]}>+${interest.toLocaleString()}</Text>
                  </View>
                  <View style={styles.loanSummaryRow}>
                    <Text style={styles.loanSummaryLabel}>Total at maturity</Text>
                    <Text style={[styles.loanSummaryValue, { color: C.white, fontWeight: 'bold' }]}>${payout.toLocaleString()}</Text>
                  </View>
                  <View style={styles.loanSummaryRow}>
                    <Text style={styles.loanSummaryLabel}>Matures on day</Text>
                    <Text style={styles.loanSummaryValue}>{day + tdOpt.days}</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={[styles.requestBtn, !canOpen && styles.requestBtnDisabled]}
                onPress={() => {
                  openTimeDeposit(principal, tdOpt.days, tdOpt.rate);
                  setTdAmount('');
                }}
                disabled={!canOpen}
              >
                <Text style={styles.requestBtnText}>
                  {canOpen ? `Lock $${principal.toLocaleString()} for ${tdOpt.days}d` : principal <= 0 ? 'Enter an amount' : 'Insufficient funds'}
                </Text>
              </TouchableOpacity>
            </>
          );
        })()}

        {/* Active time deposits */}
        {timeDeposits.length > 0 && (
          <>
            <Text style={[styles.historyTitle, { marginTop: 14 }]}>Active deposits</Text>
            {timeDeposits.map(d => {
              const matured = timeDepositMatured(d, day);
              const payout = Math.round(timeDepositPayout(d));
              const daysLeft = (d.startDay + d.termDays) - day;
              return (
                <View key={d.id} style={[styles.loanCard, matured && { borderWidth: 1, borderColor: C.green }]}>
                  <View style={styles.loanCardDetails}>
                    <View style={styles.loanDetail}>
                      <Text style={styles.loanDetailLabel}>Locked</Text>
                      <Text style={styles.loanDetailValue}>${d.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.loanDetailLabel}>Rate</Text>
                      <Text style={styles.loanDetailValue}>{(d.rate * 100).toFixed(0)}% APR</Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.loanDetailLabel}>Payout</Text>
                      <Text style={[styles.loanDetailValue, { color: C.green }]}>${payout.toLocaleString()}</Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.loanDetailLabel}>{matured ? 'Status' : 'Matures in'}</Text>
                      <Text style={[styles.loanDetailValue, matured && { color: C.green }]}>
                        {matured ? '✓ Matured' : `${daysLeft}d`}
                      </Text>
                    </View>
                  </View>
                  {matured && (
                    <TouchableOpacity
                      style={[styles.payBtn, { marginTop: 4 }]}
                      onPress={() => closeTimeDeposit(d.id)}
                    >
                      <Text style={styles.payBtnText}>Collect ${payout.toLocaleString()}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>

      {/* Reset game */}
      <View style={[styles.section, { borderWidth: 1, borderColor: '#4a1515' }]}>
        <Text style={styles.sectionTitle}>Danger zone</Text>
        <Text style={[styles.emptyText, { marginBottom: 10 }]}>
          Resetting will erase all your saved progress. This action cannot be undone.
        </Text>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() =>
            Alert.alert(
              'Reset game',
              'Are you sure? All progress will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: resetGame },
              ]
            )
          }
        >
          <Text style={styles.resetBtnText}>🗑 Reset game</Text>
        </TouchableOpacity>
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

export default BankingSection;
