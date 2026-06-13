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
import { MACHINE_TYPES } from '../../data/machineTypes';
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
  liquidateAllMachinery: () => void;
  consolidateDebt: () => void;
  takePaydayLoan: () => void;
  takeCoopEmergencyRescue: () => void;
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

  liquidateAllMachinery: () => {
    const state = get();
    if (state.machines.length === 0 && state.trailers.length === 0 && state.attachments.length === 0) return;
    let cashGained = 0;
    for (const m of state.machines) {
      const type = MACHINE_TYPES.find(t => t.id === m.typeId);
      if (!type) continue;
      const condition = m.condition ?? 100;
      cashGained += Math.round(type.cost * 0.40 * (condition / 100));
    }
    for (const t of state.trailers) {
      const type = MACHINE_TYPES.find(mt => mt.id === t.typeId);
      if (!type) continue;
      cashGained += Math.round(type.cost * 0.40);
    }
    for (const a of state.attachments) {
      const type = MACHINE_TYPES.find(mt => mt.id === a.typeId);
      if (!type) continue;
      cashGained += Math.round(type.cost * 0.40);
    }
    set({
      money: state.money + cashGained,
      machines: [],
      trailers: [],
      attachments: [],
      tractorJobs: [],
      harvestJobs: [],
    });
  },

  consolidateDebt: () => {
    const state = get();
    const activeLoans = state.loans.filter(l => !l.paid && !l.defaulted);
    if (activeLoans.length < 2) return;
    const totalPrincipal = activeLoans.reduce((s, l) => s + l.principal, 0);
    const avgRate = activeLoans.reduce((s, l) => s + l.rate, 0) / activeLoans.length;
    const consolidatedRate = Math.min(avgRate + 0.05, 0.35);
    const termDays = 270;
    const totalOwed = loanTotalOwed(totalPrincipal, consolidatedRate, termDays);
    const consolidatedLoan: Loan = {
      id: `loan_consolidated_${state.day}`,
      label: '🔀 Consolidated Debt',
      principal: totalPrincipal,
      rate: consolidatedRate,
      startDay: state.day,
      termDays,
      payoffDay: state.day + termDays,
      totalOwed,
      paid: false,
      defaulted: false,
    };
    const oldLoanHistory = activeLoans.map(l => ({ loanId: l.id, paidOnTime: false }));
    set({
      loans: [
        ...state.loans.map(l => activeLoans.some(al => al.id === l.id) ? { ...l, paid: true } : l),
        consolidatedLoan,
      ],
      loanHistory: [...state.loanHistory, ...oldLoanHistory],
    });
  },

  takePaydayLoan: () => {
    const state = get();
    const COOLDOWN = 90;
    const lastUsed = (state as any).paydayLoanUsedDay ?? null;
    if (lastUsed !== null && state.day - lastUsed < COOLDOWN) return;
    const isCrisis = state.money < 1000 || state.loans.some(l => l.defaulted && !l.paid);
    if (!isCrisis) return;
    const principal = 2500;
    const rate = 0.40;
    const termDays = 21;
    const totalOwed = Math.round(principal * (1 + rate * termDays / 365));
    const loan: Loan = {
      id: `loan_payday_${state.day}`,
      label: '🦈 Payday Lender',
      principal,
      rate,
      startDay: state.day,
      termDays,
      payoffDay: state.day + termDays,
      totalOwed,
      paid: false,
      defaulted: false,
    };
    set({ money: state.money + principal, loans: [...state.loans, loan], paydayLoanUsedDay: state.day } as any);
  },

  takeCoopEmergencyRescue: () => {
    const state = get();
    const COOLDOWN = 720;
    const lastUsed = (state as any).coopRescueLoanDay ?? null;
    if (lastUsed !== null && state.day - lastUsed < COOLDOWN) return;
    const isMember = Object.values(state.coopMemberships ?? {}).some((m: any) => m?.active);
    if (!isMember) return;
    if (state.reputation.score < 40) return;
    const isCrisis = state.money < 3000 || state.loans.some(l => l.defaulted && !l.paid);
    if (!isCrisis) return;
    const principal = 5000;
    const loan: Loan = {
      id: `loan_coop_rescue_${state.day}`,
      label: '🤝 Co-op Emergency Advance',
      principal,
      rate: 0,
      startDay: state.day,
      termDays: 90,
      payoffDay: state.day + 90,
      totalOwed: principal,
      paid: false,
      defaulted: false,
    };
    set({ money: state.money + principal, loans: [...state.loans, loan], coopRescueLoanDay: state.day } as any);
  },
});
