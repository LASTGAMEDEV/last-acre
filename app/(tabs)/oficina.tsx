import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useGameStore, FuturesPosition, SeasonGoal } from '../../store/useGameStore';
import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';
import HintCard from '../../components/HintCard';
import { CONTRACT_TEMPLATES } from '../../engine/contracts';
import { CROP_TYPES, CropType } from '../../data/cropTypes';
import { INSURANCE_PLANS, InsuranceType } from '../../data/insuranceTypes';
import { MILESTONES } from '../../data/milestones';
import { LOAN_TIERS, computeCreditScore, creditRating, calculateRate,
         loanTotalOwed, checkEligibility, rollingIncome, timeDepositPayout, timeDepositMatured } from '../../engine/banking';
import HelpSheet from '../../components/HelpSheet';
import { NPC_FARM_GROUP, RIVAL_GROUP_NAME } from '../../data/npcFarmGroups';
import type { CoopId } from '../../engine/cooperativeTypes';
import { COOP_NAMES, INITIAL_SHARE_PRICES } from '../../engine/cooperativeData';
import { getAvailableEquipment, nextAvailableDay, isMemberSuspended, getSeason, isCoopActive, getYear } from '../../engine/cooperatives';

const TERM_OPTIONS = [
  { days: 30,  label: '30d' },
  { days: 90,  label: '90d' },
  { days: 180, label: '180d' },
  { days: 365, label: '1 year' },
];

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

const TIME_DEPOSIT_OPTIONS = [
  { days: 30,  rate: 0.04, label: '30 days',  rateLabel: '4% APR' },
  { days: 90,  rate: 0.06, label: '90 days',  rateLabel: '6% APR' },
  { days: 180, rate: 0.08, label: '180 days', rateLabel: '8% APR' },
  { days: 365, rate: 0.12, label: '1 year',   rateLabel: '12% APR' },
];

// ── Banking Tab ──────────────────────────────────────────────────────────────
function BankingSection() {
  const {
    money, loans, savings, timeDeposits, salesLog, loanHistory, day,
    requestLoan, repayLoan, depositSavings, withdrawSavings,
    openTimeDeposit, closeTimeDeposit, resetGame, renegotiateLoan,
  } = useGameStore();

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
        <View style={styles.creditRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.creditLabel}>Credit score</Text>
              <HelpSheet
                title="Credit Score"
                body="Your credit score determines how much you can borrow and at what interest rate. It's based on your rolling income over recent days, your existing debt, and how reliably you've repaid past loans."
                buttonSize={12}
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

      {/* Custom loan form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request loan</Text>

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
          const statusColor = loan.defaulted ? '#f44336' : onTime ? '#4caf50' : '#ff9800';
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
                    <Text style={[styles.loanSummaryValue, { color: '#81c784' }]}>+${interest.toLocaleString()}</Text>
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
                <View key={d.id} style={[styles.loanCard, matured && { borderWidth: 1, borderColor: '#4caf50' }]}>
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
                      <Text style={[styles.loanDetailValue, { color: '#81c784' }]}>${payout.toLocaleString()}</Text>
                    </View>
                    <View style={styles.loanDetail}>
                      <Text style={styles.loanDetailLabel}>{matured ? 'Status' : 'Matures in'}</Text>
                      <Text style={[styles.loanDetailValue, matured && { color: '#4caf50' }]}>
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

// ── Contracts Section ────────────────────────────────────────────────────────
function ContractsSection() {
  const { contracts, prices, inventory, day, acceptContract, declineContract, deliverCrop, declinedTemplates, counterOfferContract } = useGameStore();
  const [negotiatingId, setNegotiatingId] = React.useState<string | null>(null);

  const activeContracts = contracts.filter(c => !c.completed && !c.failed);
  const availableTemplates = CONTRACT_TEMPLATES.filter(
    t => !activeContracts.some(c => c.templateId === t.id) && !declinedTemplates.includes(t.id)
  );

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active contracts ({activeContracts.length})</Text>
        {activeContracts.length === 0 && <Text style={styles.emptyText}>No active contracts.</Text>}
        {activeContracts.map(c => {
          const crop = CROP_TYPES.find(cr => cr.id === c.cropId);
          const unit = crop?.unit ?? 'kg';
          const overdue = day > c.deadlineDay;
          const inStock = Math.round(inventory[c.cropId] ?? 0);
          const remaining = c.amount - c.delivered;
          const canDeliver = inStock > 0 && remaining > 0;
          return (
            <View key={c.id} style={[styles.contractCard, overdue && styles.loanCardOverdue]}>
              <View style={styles.loanCardHeader}>
                <Text style={styles.contractTitle}>{crop?.name}</Text>
                {overdue && <Text style={styles.overdueTag}>OVERDUE</Text>}
              </View>
              <Text style={styles.contractDetail}>
                {c.amount.toLocaleString()} {unit} · ${c.pricePerUnit.toFixed(2)}/{unit}
              </Text>
              <Text style={styles.contractDetail}>Due day {c.deadlineDay}</Text>
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
        <Text style={styles.sectionTitle}>Available offers</Text>
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
              <Text style={styles.offerName}>{t.name}</Text>
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

// ── Reputation & Cooperative Section ─────────────────────────────────────────
function ReputationSection() {
  const { reputation, prices, futures, prestige, openFuture } = useGameStore();
  const rep = reputation ?? 50;
  const repColor = rep >= 80 ? '#4caf50' : rep >= 60 ? '#ffb74d' : rep >= 40 ? C.text : '#f44336';
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

      {/* Co-operatives */}
      <CoopsSection />

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

// ── Milestones Section ───────────────────────────────────────────────────────
function SeasonGoalsSection() {
  const {
    seasonGoals, seasonGoalSeason, money, seasonStartMoney, seasonStartRevenue,
    totalRevenue, seasonHarvestCount, parcels, claimSeasonGoalReward,
  } = useGameStore();

  if (seasonGoals.length === 0) {
    return (
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <View style={{ backgroundColor: C.bgCard, borderRadius: 10, padding: 14 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>
            Seasonal goals appear when a new season begins.
          </Text>
        </View>
      </View>
    );
  }

  function getProgress(goal: SeasonGoal): number {
    switch (goal.type) {
      case 'earn':
        return Math.max(0, (totalRevenue ?? 0) - (seasonStartRevenue ?? 0));
      case 'harvest_count':
        return seasonHarvestCount ?? 0;
      case 'own_ha':
        return parcels.filter(p => p.owned).reduce((s, p) => s + p.hectares, 0);
    }
  }

  function progressLabel(goal: SeasonGoal, progress: number): string {
    switch (goal.type) {
      case 'earn':
        return `$${Math.round(progress).toLocaleString()} / $${goal.target.toLocaleString()}`;
      case 'harvest_count':
        return `${progress} / ${goal.target} harvests`;
      case 'own_ha':
        return `${progress.toFixed(1)} / ${goal.target} ha`;
    }
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
        {seasonGoalSeason.charAt(0).toUpperCase() + seasonGoalSeason.slice(1)} Goals
      </Text>
      {seasonGoals.map(goal => {
        const progress = getProgress(goal);
        const pct = Math.min(1, progress / goal.target);
        const complete = pct >= 1;
        return (
          <View key={goal.id} style={{ backgroundColor: complete ? '#0f3460' : C.bgCard, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: complete && !goal.claimed ? 1 : 0, borderColor: '#4caf50' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{goal.icon}</Text>
                <Text style={{ color: complete ? C.text : '#aaa', fontSize: 13, fontWeight: 'bold', flex: 1 }}>{goal.label}</Text>
              </View>
              {goal.claimed ? (
                <Text style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold' }}>✓ Claimed</Text>
              ) : complete ? (
                <TouchableOpacity
                  style={{ backgroundColor: '#4caf50', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 }}
                  onPress={() => claimSeasonGoalReward(goal.id)}
                >
                  <Text style={{ color: C.white, fontSize: 12, fontWeight: 'bold' }}>Claim +${goal.reward.toLocaleString()}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: C.text, fontSize: 12, fontWeight: 'bold' }}>+${goal.reward.toLocaleString()}</Text>
              )}
            </View>
            <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 6 }}>{progressLabel(goal, progress)}</Text>
            <View style={{ height: 6, backgroundColor: '#0d1117', borderRadius: 3 }}>
              <View style={{ height: 6, width: `${Math.round(pct * 100)}%` as any, backgroundColor: complete ? '#4caf50' : '#1565c0', borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MilestonesSection() {
  const { completedMilestones } = useGameStore();
  const done = new Set(completedMilestones);
  const earned = MILESTONES.filter(m => done.has(m.id));
  const locked = MILESTONES.filter(m => !done.has(m.id));

  return (
    <View style={styles.milestoneContainer}>
      {/* Seasonal goals at the top */}
      <SeasonGoalsSection />

      {earned.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earned ({earned.length}/{MILESTONES.length})</Text>
          {earned.map(m => (
            <View key={m.id} style={styles.milestoneRow}>
              <Text style={styles.milestoneIcon}>{m.icon}</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>{m.title}</Text>
                <Text style={styles.milestoneDesc}>{m.description}</Text>
              </View>
              <Text style={styles.milestoneDone}>✓</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Locked ({locked.length})</Text>
        {locked.map(m => (
          <View key={m.id} style={[styles.milestoneRow, styles.milestoneLocked]}>
            <Text style={[styles.milestoneIcon, { opacity: 0.35 }]}>{m.icon}</Text>
            <View style={styles.milestoneInfo}>
              <Text style={[styles.milestoneTitle, { color: '#555' }]}>{m.title}</Text>
              <Text style={styles.milestoneDesc}>{m.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Insurance Section ────────────────────────────────────────────────────────
function InsuranceSection() {
  const {
    day, money, insurances, insuranceClaims,
    buyInsurance, cancelInsurance,
  } = useGameStore();

  const totalPremiumPerDay = insurances
    .filter(p => p.active)
    .reduce((s, p) => {
      const plan = INSURANCE_PLANS.find(pl => pl.type === p.type);
      return s + (plan?.premiumPerDay ?? 0);
    }, 0);

  const totalPayouts = insuranceClaims.reduce((s, c) => s + c.payout, 0);
  const recentClaims = [...insuranceClaims].reverse().slice(0, 20);

  function getPolicyForType(type: InsuranceType) {
    return insurances.find(p => p.type === type && p.active) ?? null;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      {/* Summary */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Daily premium</Text>
          <Text style={{ color: C.white, fontSize: 16, fontWeight: 'bold' }}>${totalPremiumPerDay}/day</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>Total paid out</Text>
          <Text style={{ color: '#81c784', fontSize: 16, fontWeight: 'bold' }}>${totalPayouts.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Available policies</Text>
      {INSURANCE_PLANS.map(plan => {
        const activePolicy = getPolicyForType(plan.type);
        const active = activePolicy !== null;
        return (
          <View key={plan.type} style={{ backgroundColor: active ? '#0f3460' : C.bgCard, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: active ? 1 : 0, borderColor: '#4fc3f7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 24 }}>{plan.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: 'bold' }}>{plan.name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{plan.description}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Premium</Text>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: 'bold' }}>${plan.premiumPerDay}/day</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Coverage</Text>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: 'bold' }}>{Math.round(plan.coveragePercent * 100)}%</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>Status</Text>
                <Text style={{ color: active ? '#66bb6a' : C.textMuted, fontSize: 13, fontWeight: 'bold' }}>{active ? '✅ Active' : '—'}</Text>
              </View>
            </View>
            {active ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>
                  Since day {activePolicy!.startDay} · ${plan.premiumPerDay * (day - activePolicy!.startDay)} paid
                </Text>
                <TouchableOpacity
                  onPress={() => cancelInsurance(activePolicy!.id)}
                  style={{ backgroundColor: '#c62828', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ color: C.white, fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => money >= plan.premiumPerDay && buyInsurance(plan.type)}
                style={{ backgroundColor: money >= plan.premiumPerDay ? '#1565c0' : '#333', borderRadius: 6, padding: 10, alignItems: 'center' }}
              >
                <Text style={{ color: C.white, fontSize: 13, fontWeight: 'bold' }}>
                  Activate — ${plan.premiumPerDay}/day
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {recentClaims.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Recent claims</Text>
          {recentClaims.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#222' }}>
              <Text style={{ color: '#ccc', fontSize: 12 }}>Day {c.day} · {c.description}</Text>
              <Text style={{ color: '#81c784', fontSize: 12, fontWeight: 'bold' }}>+${c.payout.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Competitors Section ──────────────────────────────────────────────────────
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

// ── Co-op Panels ─────────────────────────────────────────────────────────────
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
    coopState.health >= 80 ? '#81c784'
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
                    backgroundColor: '#81c784',
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
                <Text style={[styles.coopDetail, { color: '#81c784', marginTop: 4 }]}>
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
                      {playerBooked && <Text style={[styles.coopDetail, { color: '#81c784' }]}>Booked ✓</Text>}
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

// ── Main Screen ──────────────────────────────────────────────────────────────
type OfficeTab = 'banking' | 'contracts' | 'reputation' | 'milestones' | 'insurance' | 'competitors';

export default function OficinaScreen() {
  const { money, savings, timeDeposits, loans, contracts } = useGameStore();
  const activeLoans = (loans ?? []).filter((l: { paid: boolean; defaulted: boolean }) => !l.paid && !l.defaulted);
  const totalLocked = timeDeposits.reduce((s, d) => s + d.amount, 0);
  const [activeTab, setActiveTab] = useState<OfficeTab>('banking');

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>My Office</Text>
      {activeLoans.length === 0 && (
        <HintCard id="hint_banking" title="Banking & Loans" body="Need capital? The Banking tab lets you take loans at rates based on your credit score. Repay on time to unlock larger tiers." />
      )}
      {!(contracts ?? []).some((c: { completed: boolean; failed: boolean }) => !c.completed && !c.failed) && (
        <HintCard id="hint_contract" title="Sign a delivery contract" body="Contracts guarantee a buyer for your crops at a fixed price. Go to the Contracts tab and accept an offer — fulfilled contracts raise your reputation." />
      )}

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Cash</Text>
            <Text style={styles.balanceMoney}>${money.toLocaleString()}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Savings</Text>
            <Text style={styles.balanceSavings}>${Math.round(savings.balance).toLocaleString()}</Text>
          </View>
          {totalLocked > 0 && (
            <>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Locked</Text>
                <Text style={[styles.balanceSavings, { color: '#ffb74d' }]}>${totalLocked.toLocaleString()}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <SubTabBar
        tabs={[
          { id: 'banking',     label: '🏦 Bank' },
          { id: 'contracts',   label: '📋 Contracts' },
          { id: 'reputation',  label: '⭐ Farm' },
          { id: 'milestones',  label: '🏆 Goals' },
          { id: 'insurance',   label: '🌦️ Insurance' },
          { id: 'competitors', label: '🏭 Rivals' },
        ]}
        active={activeTab}
        onSelect={id => setActiveTab(id as OfficeTab)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {activeTab === 'banking'     && <BankingSection />}
        {activeTab === 'contracts'   && <ContractsSection />}
        {activeTab === 'reputation'  && <ReputationSection />}
        {activeTab === 'milestones'  && <MilestonesSection />}
        {activeTab === 'insurance'   && <InsuranceSection />}
        {activeTab === 'competitors' && <CompetitorsSection />}
      </ScrollView>
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
