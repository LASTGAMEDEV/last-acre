import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useGameStore, FuturesPosition } from '../../store/useGameStore';
import ScreenHeader from '../../components/ScreenHeader';
import { CONTRACT_TEMPLATES } from '../../engine/contracts';
import { CROP_TYPES, CropType } from '../../data/cropTypes';
import { INSURANCE_PLANS, InsuranceType } from '../../data/insuranceTypes';
import { MILESTONES } from '../../data/milestones';
import { LOAN_TIERS, computeCreditScore, creditRating, calculateRate,
         loanTotalOwed, checkEligibility, rollingIncome, timeDepositPayout, timeDepositMatured } from '../../engine/banking';

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
            <Text style={styles.creditLabel}>Credit score</Text>
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
              <Text style={[styles.loanSummaryValue, { color: '#fff', fontWeight: 'bold' }]}>${Math.round(totalOwed).toLocaleString()}</Text>
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
            <View key={loan.id} style={[styles.loanCardDone, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' }]}>
              <View>
                <Text style={[styles.loanCardDoneText, { color: '#888' }]}>{loan.label}</Text>
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
                    <Text style={[styles.loanSummaryValue, { color: '#fff', fontWeight: 'bold' }]}>${payout.toLocaleString()}</Text>
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
  const { contracts, prices, inventory, day, acceptContract, declineContract, deliverCrop, declinedTemplates } = useGameStore();

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
              <View style={styles.offerBtns}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptContract(t.id)}>
                  <Text style={styles.acceptBtnText}>✓ Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => declineContract(t.id)}>
                  <Text style={styles.declineBtnText}>✕ Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Reputation & Cooperative Section ─────────────────────────────────────────
function ReputationSection() {
  const { reputation, cooperative, money, prices, futures, joinCooperative, leaveCooperative, openFuture } = useGameStore();
  const rep = reputation ?? 50;
  const repColor = rep >= 80 ? '#4caf50' : rep >= 60 ? '#ffb74d' : rep >= 40 ? '#e8d5a3' : '#f44336';
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

      {/* Cooperative card */}
      <View style={styles.coopCard}>
        <Text style={styles.sectionTitle}>🤝 Agricultural Cooperative</Text>
        {cooperative?.member ? (
          <>
            <Text style={styles.coopActive}>✅ Member since day {cooperative.joinDay}</Text>
            <Text style={styles.coopDetail}>+12% on all sales · -10% seed costs · $400 dues every 30 days</Text>
            <TouchableOpacity style={styles.leaveBtn} onPress={leaveCooperative}>
              <Text style={styles.leaveBtnText}>Leave Cooperative</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.coopDetail}>+12% on all crop, animal & processed sales</Text>
            <Text style={styles.coopDetail}>-10% on all seed costs</Text>
            <Text style={styles.coopDetail}>Monthly dues: $400 · Join fee: $500</Text>
            <TouchableOpacity
              style={[styles.joinBtn, money < 500 && styles.joinBtnDisabled]}
              onPress={joinCooperative}
              disabled={money < 500}
            >
              <Text style={styles.joinBtnText}>Join Cooperative ($500)</Text>
            </TouchableOpacity>
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
                  <Text style={[styles.futureChipText, selectedCrop === c.id && { color: '#fff' }]}>
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
                <Text style={[styles.termChipText, futureTerm === t && { color: '#fff' }]}>{t}d</Text>
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
function MilestonesSection() {
  const { completedMilestones } = useGameStore();
  const done = new Set(completedMilestones);
  const earned = MILESTONES.filter(m => done.has(m.id));
  const locked = MILESTONES.filter(m => !done.has(m.id));

  return (
    <View style={styles.milestoneContainer}>
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
          <Text style={{ color: '#888', fontSize: 11 }}>Daily premium</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>${totalPremiumPerDay}/day</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#0f3460', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#888', fontSize: 11 }}>Total paid out</Text>
          <Text style={{ color: '#81c784', fontSize: 16, fontWeight: 'bold' }}>${totalPayouts.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Available policies</Text>
      {INSURANCE_PLANS.map(plan => {
        const activePolicy = getPolicyForType(plan.type);
        const active = activePolicy !== null;
        return (
          <View key={plan.type} style={{ backgroundColor: active ? '#0f3460' : '#16213e', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: active ? 1 : 0, borderColor: '#4fc3f7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 24 }}>{plan.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#e8d5a3', fontSize: 14, fontWeight: 'bold' }}>{plan.name}</Text>
                <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{plan.description}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>Premium</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>${plan.premiumPerDay}/day</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>Coverage</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{Math.round(plan.coveragePercent * 100)}%</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0a1628', borderRadius: 6, padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 10 }}>Status</Text>
                <Text style={{ color: active ? '#66bb6a' : '#888', fontSize: 13, fontWeight: 'bold' }}>{active ? '✅ Active' : '—'}</Text>
              </View>
            </View>
            {active ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#888', fontSize: 11 }}>
                  Since day {activePolicy!.startDay} · ${plan.premiumPerDay * (day - activePolicy!.startDay)} paid
                </Text>
                <TouchableOpacity
                  onPress={() => cancelInsurance(activePolicy!.id)}
                  style={{ backgroundColor: '#c62828', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => money >= plan.premiumPerDay && buyInsurance(plan.type)}
                style={{ backgroundColor: money >= plan.premiumPerDay ? '#1565c0' : '#333', borderRadius: 6, padding: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  Activate — ${plan.premiumPerDay}/day
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {recentClaims.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Recent claims</Text>
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
  const { npcFarms = [], sellPressures = [], day } = useGameStore();

  function wealthLabel(wealth: number): string {
    if (wealth < 10000) return 'Low';
    if (wealth < 30000) return 'Medium';
    return 'High';
  }

  function wealthColor(wealth: number): string {
    if (wealth < 10000) return '#66bb6a';
    if (wealth < 30000) return '#ffb74d';
    return '#ef5350';
  }

  function activePressure(farm: { specialization: string[] }): string | null {
    for (const crop of farm.specialization) {
      const sp = sellPressures.find(s => s.cropId === crop && s.expiresDay >= day);
      if (sp) return crop;
    }
    return null;
  }

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
        Competitor farms apply sell pressure to the market and bid at auction.
      </Text>
      {npcFarms.map(farm => {
        const pressure = activePressure(farm);
        return (
          <View key={farm.id} style={{ backgroundColor: '#16213e', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#e8d5a3', fontSize: 14, fontWeight: 'bold' }}>{farm.name}</Text>
                <View style={{ backgroundColor: farm.tier === 3 ? '#c62828' : farm.tier === 2 ? '#f57f17' : '#1b5e20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Tier {farm.tier}</Text>
                </View>
              </View>
              <Text style={{ color: wealthColor(farm.wealth), fontSize: 12, fontWeight: 'bold' }}>
                {wealthLabel(farm.wealth)} wealth
              </Text>
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
                ⚠️ Currently pushing {CROP_TYPES.find(c => c.id === pressure)?.name ?? pressure} — price depressed
              </Text>
            )}
            <Text style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
              Sells every {farm.sellIntervalDays}d · next in {Math.max(0, farm.nextSellDay - day)}d
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
type OfficeTab = 'banking' | 'contracts' | 'reputation' | 'milestones' | 'insurance' | 'competitors';

export default function OficinaScreen() {
  const { money, savings, timeDeposits } = useGameStore();
  const totalLocked = timeDeposits.reduce((s, d) => s + d.amount, 0);
  const [activeTab, setActiveTab] = useState<OfficeTab>('banking');

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Office" />

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

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {([
          { id: 'banking',     label: '🏦 Bank' },
          { id: 'contracts',   label: '📋 Contracts' },
          { id: 'reputation',  label: '⭐ Farm' },
          { id: 'milestones',  label: '🏆 Goals' },
          { id: 'insurance',   label: '🌦️ Insurance' },
          { id: 'competitors', label: '🏭 Rivals' },
        ] as { id: OfficeTab; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  // Balance card
  balanceCard: { backgroundColor: '#0f3460', borderRadius: 12, marginHorizontal: 12, marginBottom: 8, padding: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { color: '#888', fontSize: 11, marginBottom: 2 },
  balanceMoney: { color: '#4caf50', fontSize: 26, fontWeight: 'bold' },
  balanceSavings: { color: '#64b5f6', fontSize: 26, fontWeight: 'bold' },
  balanceDivider: { width: 1, height: 40, backgroundColor: '#1a3a6a', marginHorizontal: 12 },

  // Tab bar
  tabBar: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#0d1117', borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#0f3460' },
  tabBtnText: { color: '#555', fontSize: 13, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#e8d5a3' },

  // Reputation
  repCard: { backgroundColor: '#16213e', borderRadius: 12, margin: 12, padding: 14 },
  repRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  repScore: { fontSize: 48, fontWeight: 'bold', marginRight: 16 },
  repInfo: { flex: 1 },
  repTier: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  repEffect: { color: '#888', fontSize: 11, marginBottom: 1 },
  repBar: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, overflow: 'hidden' },
  repFill: { height: 6, borderRadius: 3 },
  // Cooperative
  coopCard: { backgroundColor: '#16213e', borderRadius: 12, marginHorizontal: 12, marginBottom: 8, padding: 14 },
  coopActive: { color: '#81c784', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  coopDetail: { color: '#888', fontSize: 12, marginBottom: 6 },
  joinBtn: { backgroundColor: '#1565c0', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  joinBtnDisabled: { backgroundColor: '#333', opacity: 0.5 },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  leaveBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 8 },
  leaveBtnText: { color: '#ef9a9a', fontWeight: 'bold', fontSize: 12 },
  // Futures
  futuresCard: { backgroundColor: '#16213e', borderRadius: 12, marginHorizontal: 12, marginBottom: 8, padding: 14 },
  futureForm: { marginTop: 10 },
  futureFormLabel: { color: '#888', fontSize: 11, marginBottom: 4, fontWeight: 'bold' },
  futureInput: { backgroundColor: '#0d1117', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 14 },
  futureTermRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  termChip: { backgroundColor: '#0d1117', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  termChipActive: { backgroundColor: '#1565c0' },
  termChipText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  openFutureBtn: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 10, alignItems: 'center' },
  futureChip: { backgroundColor: '#0d1117', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  futureChipActive: { backgroundColor: '#1565c0' },
  futureChipText: { color: '#888', fontSize: 11 },
  futureRow: { backgroundColor: '#0d1117', borderRadius: 8, padding: 10, marginBottom: 4 },
  futureCrop: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  futureDetail: { color: '#888', fontSize: 11, marginTop: 2 },

  // Credit card
  creditCard: { backgroundColor: '#16213e', borderRadius: 12, margin: 12, padding: 14 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  creditLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  creditScore: { fontSize: 36, fontWeight: 'bold' },
  creditRating: { fontSize: 13, fontWeight: 'bold' },
  creditStats: { gap: 6 },
  creditStat: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  creditStatLabel: { color: '#666', fontSize: 11 },
  creditStatValue: { color: '#e8d5a3', fontSize: 11, fontWeight: 'bold' },
  scoreBarBg: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, marginBottom: 4 },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreBarLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreBarTick: { color: '#444', fontSize: 9 },

  // Sections
  section: { backgroundColor: '#16213e', borderRadius: 12, margin: 12, padding: 14 },
  sectionTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
  emptyText: { color: '#555', fontSize: 12 },
  apr: { color: '#888', fontSize: 12, fontWeight: 'normal' },

  // Loan form
  fieldLabel: { color: '#888', fontSize: 11, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', color: '#e8d5a3', padding: 10, fontSize: 14, marginBottom: 4 },
  quickAmtBtn: { backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  quickAmtBtnActive: { backgroundColor: '#0f3460', borderColor: '#e8d5a3' },
  quickAmtText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  quickAmtTextActive: { color: '#e8d5a3' },
  termRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  termBtn: { flex: 1, backgroundColor: '#0d1117', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', padding: 8, alignItems: 'center' },
  termBtnActive: { backgroundColor: '#0f3460', borderColor: '#e8d5a3' },
  termBtnText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  termBtnTextActive: { color: '#e8d5a3' },
  loanSummary: { backgroundColor: '#0d1117', borderRadius: 8, padding: 12, marginTop: 8 },
  loanSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  loanSummaryLabel: { color: '#888', fontSize: 12 },
  loanSummaryValue: { color: '#aaa', fontSize: 12 },
  eligibilityBox: { borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 6 },
  eligOk: { backgroundColor: '#1b5e20' },
  eligNo: { backgroundColor: '#4a1515' },
  eligibilityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  requestBtn: { backgroundColor: '#1565c0', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  requestBtnDisabled: { backgroundColor: '#333' },
  requestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  tiersRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tierRef: { flex: 1, backgroundColor: '#0d1117', borderRadius: 8, padding: 8, alignItems: 'center' },
  tierRefName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 11 },
  tierRefRate: { color: '#64b5f6', fontSize: 10 },
  tierRefIncome: { color: '#666', fontSize: 9, textAlign: 'center' },

  // Active loans
  loanCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 12, marginBottom: 8 },
  loanCardOverdue: { borderWidth: 1, borderColor: '#f44336' },
  loanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  loanCardTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  overdueTag: { backgroundColor: '#f44336', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  loanCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  loanDetail: { minWidth: '40%' },
  loanDetailLabel: { color: '#666', fontSize: 10 },
  loanDetailValue: { color: '#ccc', fontSize: 13, fontWeight: 'bold' },
  payBtn: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 9, alignItems: 'center' },
  deliverBtn: { backgroundColor: '#1565c0', borderRadius: 8, padding: 9, alignItems: 'center', marginTop: 8 },
  payBtnDisabled: { backgroundColor: '#333' },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  extendRow: { marginTop: 8 },
  extendLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  extendBtns: { flexDirection: 'row', gap: 6 },
  extendBtn: { backgroundColor: '#1a2a40', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#546e7a' },
  extendBtnDisabled: { opacity: 0.4 },
  extendBtnText: { color: '#90caf9', fontSize: 12, fontWeight: 'bold' },
  renegotiatedTag: { color: '#546e7a', fontSize: 11, marginTop: 6, textAlign: 'center' },
  historyTitle: { color: '#555', fontSize: 11, marginTop: 8, marginBottom: 4 },
  loanCardDone: { paddingVertical: 4 },
  loanCardDoneText: { color: '#555', fontSize: 12 },

  // Savings
  savingsBalance: { color: '#64b5f6', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  savingsBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  savingsBtnPair: { flexDirection: 'row', gap: 4 },
  savBtn: { backgroundColor: '#1565c0', borderRadius: 8, padding: 8, minWidth: 52, alignItems: 'center' },
  savBtnOut: { backgroundColor: '#4a1515', borderRadius: 8, padding: 8, minWidth: 52, alignItems: 'center' },
  savBtnDisabled: { backgroundColor: '#333' },
  savBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  savingsCustomRow: { flexDirection: 'row', gap: 8 },
  resetBtn: { backgroundColor: '#7f2020', borderRadius: 8, padding: 12, alignItems: 'center' },
  resetBtnText: { color: '#ffcdd2', fontWeight: 'bold', fontSize: 14 },

  // Contracts
  contractCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 12, marginBottom: 8 },
  contractTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14 },
  contractDetail: { color: '#aaa', fontSize: 12, marginTop: 2 },
  progressBar: { height: 6, backgroundColor: '#0d1117', borderRadius: 3, marginTop: 8, marginBottom: 4 },
  progressFill: { height: 6, backgroundColor: '#4caf50', borderRadius: 3 },
  progressLabel: { color: '#666', fontSize: 10 },
  offerCard: { backgroundColor: '#1b3a4b', borderRadius: 8, padding: 12, marginBottom: 10 },
  offerName: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  offerDetail: { color: '#aaa', fontSize: 12, marginBottom: 2 },
  offerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: 8, padding: 9, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  declineBtn: { flex: 1, backgroundColor: '#4a1515', borderRadius: 8, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: '#7f2020' },
  declineBtnText: { color: '#ef9a9a', fontWeight: 'bold', fontSize: 13 },

  // Milestones
  milestoneContainer: { paddingHorizontal: 12, paddingTop: 12 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  milestoneLocked: { opacity: 0.6 },
  milestoneIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  milestoneInfo: { flex: 1, marginLeft: 8 },
  milestoneTitle: { color: '#e8d5a3', fontWeight: 'bold', fontSize: 13 },
  milestoneDesc: { color: '#666', fontSize: 11, marginTop: 1 },
  milestoneDone: { color: '#4caf50', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});
