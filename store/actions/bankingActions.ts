import {
  Loan,
  TimeDeposit,
  calculateRate,
  loanTotalOwed,
  rollingIncome,
  checkEligibility,
  computeCreditScore,
  timeDepositMatured,
  timeDepositPayout,
} from '../../engine/banking';
import type { ActionFactory } from './types';

export interface BankingActions {
  requestLoan: (principal: number, termDays: number, label: string) => void;
  repayLoan: (loanId: string) => void;
  depositSavings: (amount: number) => void;
  withdrawSavings: (amount: number) => void;
  openTimeDeposit: (amount: number, termDays: number, rate: number) => void;
  closeTimeDeposit: (depositId: string) => void;
  renegotiateLoan: (loanId: string, extraDays: number) => void;
  takeBankruptcyLoan: () => void;
  clearBankruptcy: () => void;
  takeFamilyLoan: () => void;
  emergencyLeaseback: (parcelId: string) => void;
}

export const createBankingActions: ActionFactory<BankingActions> = (set, get) => ({
  requestLoan: (principal, termDays, label) => {
    const state = get();
    const income30d = rollingIncome(state.salesLog, state.day - 30, state.day);
    const income90d = rollingIncome(state.salesLog, state.day - 90, state.day);
    const creditScore = computeCreditScore(state.loanHistory, state.loans, income30d);
    const activeLoans = state.loans.filter(l => !l.paid && !l.defaulted);
    const eligibility = checkEligibility(principal, termDays, income30d, income90d, creditScore, activeLoans);
    if (!eligibility.eligible) return;
    const rate = calculateRate(termDays, creditScore, principal, income30d);
    const totalOwed = loanTotalOwed(principal, rate, termDays);
    const loan: Loan = {
      id: `loan_${Date.now()}`,
      label,
      principal,
      rate,
      startDay: state.day,
      termDays,
      payoffDay: state.day + termDays,
      totalOwed,
      paid: false,
      defaulted: false,
    };
    set({ money: state.money + principal, loans: [...state.loans, loan] });
  },

  repayLoan: (loanId) => {
    const state = get();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || loan.paid || loan.defaulted) return;
    const daysElapsed = Math.max(0, state.day - loan.startDay);
    const amountDue = Math.min(
      loan.totalOwed,
      Math.round(loan.principal * (1 + loan.rate * (daysElapsed / 365)))
    );
    if (state.money < amountDue) return;
    const onTime = state.day <= loan.payoffDay;
    set({
      money: state.money - amountDue,
      loans: state.loans.map(l => l.id === loanId ? { ...l, paid: true } : l),
      loanHistory: [...state.loanHistory, { loanId, paidOnTime: onTime }],
    });
  },

  depositSavings: (amount) => {
    const state = get();
    if (state.money < amount) return;
    set({ money: state.money - amount, savings: { ...state.savings, balance: state.savings.balance + amount } });
  },

  withdrawSavings: (amount) => {
    const state = get();
    const toWithdraw = Math.min(amount, state.savings.balance);
    set({ money: state.money + toWithdraw, savings: { ...state.savings, balance: state.savings.balance - toWithdraw } });
  },

  openTimeDeposit: (amount, termDays, rate) => {
    const state = get();
    if (amount <= 0 || state.money < amount) return;
    const deposit: TimeDeposit = {
      id: `td_${Date.now()}`,
      amount,
      startDay: state.day,
      termDays,
      rate,
    };
    set({
      money: state.money - amount,
      timeDeposits: [...state.timeDeposits, deposit],
    });
  },

  closeTimeDeposit: (depositId) => {
    const state = get();
    const deposit = state.timeDeposits.find(d => d.id === depositId);
    if (!deposit) return;
    if (!timeDepositMatured(deposit, state.day)) return;
    const payout = Math.round(timeDepositPayout(deposit));
    set({
      money: state.money + payout,
      timeDeposits: state.timeDeposits.filter(d => d.id !== depositId),
    });
  },

  renegotiateLoan: (loanId, extraDays) => {
    const state = get();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || loan.paid || loan.defaulted || loan.renegotiated) return;
    if (loan.payoffDay - state.day <= 7) return;
    const fee = Math.round(loan.principal * 0.02);
    if (state.money < fee) return;
    set({
      money: state.money - fee,
      loans: state.loans.map(l => l.id === loanId
        ? { ...l, payoffDay: l.payoffDay + extraDays, renegotiated: true }
        : l
      ),
    });
  },

  takeBankruptcyLoan: () => {
    const state = get();
    const principal = 2000;
    const rate = 0.20;
    const termDays = 60;
    const totalOwed = Math.round(principal * (1 + rate * termDays / 365));
    const loan: Loan = {
      id: `loan_emergency_${state.day}`,
      label: 'Emergency Loan',
      principal,
      rate,
      startDay: state.day,
      termDays,
      payoffDay: state.day + termDays,
      totalOwed,
      paid: false,
      defaulted: false,
    };
    set({ money: state.money + principal, loans: [...state.loans, loan], bankrupt: false });
  },

  clearBankruptcy: () => {
    set({ bankrupt: false });
  },

  takeFamilyLoan: () => {
    const state = get();
    const principal = 10_000;
    const termDays = 180;
    const loan: Loan = {
      id: `family_loan_${state.day}`,
      label: '👨‍👩‍👧 Family Emergency Loan',
      principal,
      rate: 0,
      termDays,
      startDay: state.day,
      payoffDay: state.day + termDays,
      totalOwed: principal,
      paid: false,
      defaulted: false,
    };
    set({
      money: state.money + principal,
      loans: [...state.loans, loan],
      familyLoanUsedDay: state.day,
      bankrupt: false,
    });
  },

  emergencyLeaseback: (parcelId) => {
    const state = get();
    const parcel = state.parcels.find(p => p.id === parcelId && p.owned);
    if (!parcel) return;
    if (parcel.leasedOut && (parcel.leasebackEndDay ?? 0) > state.day) return;
    const upfrontCash = Math.round(parcel.hectares * parcel.pricePerHa * 0.6);
    if (upfrontCash <= 0) return;
    set({
      money: state.money + upfrontCash,
      parcels: state.parcels.map(p =>
        p.id === parcelId
          ? { ...p, leasedOut: true, leasebackEndDay: state.day + 360, plantedCrop: null, tilled: false }
          : p
      ),
    });
  },
});
