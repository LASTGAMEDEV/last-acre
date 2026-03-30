export interface Loan {
  id: string;
  label: string;          // e.g. "Custom Loan" or tier name
  principal: number;
  rate: number;           // annual, e.g. 0.07 = 7%
  startDay: number;
  termDays: number;
  payoffDay: number;
  totalOwed: number;      // principal × (1 + rate × termDays/365)
  paid: boolean;
  defaulted: boolean;
  renegotiated?: boolean; // true once extended; only one extension allowed per loan
}

export interface SavingsAccount {
  balance: number;
  lastInterestDay: number;
}

export interface TimeDeposit {
  id: string;
  amount: number;
  startDay: number;
  termDays: number;
  rate: number;
}

export interface SaleRecord {
  day: number;
  amount: number;
  category?: 'crops' | 'animals' | 'processed' | 'contracts';
}

export interface LoanRecord {
  loanId: string;
  paidOnTime: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const SAVINGS_APR = 0.10; // S&P 500 historical average annual return

export const LOAN_TIERS: { name: string; maxAmount: number; baseRate: number; minMonthlyIncome: number }[] = [
  { name: 'Micro',   maxAmount: 5000,   baseRate: 0.10, minMonthlyIncome: 0     },
  { name: 'Small',   maxAmount: 25000,  baseRate: 0.08, minMonthlyIncome: 1000  },
  { name: 'Medium',  maxAmount: 100000, baseRate: 0.07, minMonthlyIncome: 5000  },
  { name: 'Large',   maxAmount: 400000, baseRate: 0.06, minMonthlyIncome: 20000 },
];

// ── Credit Score ─────────────────────────────────────────────────────────────

export function computeCreditScore(
  loanHistory: LoanRecord[],
  activeLoans: Loan[],
  income30d: number,
): number {
  let score = 500;

  // Payment history (most important factor)
  for (const record of loanHistory) {
    score += record.paidOnTime ? 40 : -80;
  }

  // Debt-to-income ratio
  const totalDebt = activeLoans.filter(l => !l.paid).reduce((s, l) => s + l.totalOwed, 0);
  const annualizedIncome = income30d * 12;
  if (annualizedIncome > 0) {
    const dti = totalDebt / annualizedIncome;
    if (dti < 0.2)       score += 80;
    else if (dti < 0.4)  score += 40;
    else if (dti < 0.6)  score -= 20;
    else if (dti < 0.8)  score -= 60;
    else                 score -= 120;
  }

  return Math.max(300, Math.min(850, score));
}

export function creditRating(score: number): { label: string; color: string } {
  if (score >= 750) return { label: 'Excellent', color: '#4caf50' };
  if (score >= 650) return { label: 'Good',      color: '#8bc34a' };
  if (score >= 550) return { label: 'Fair',      color: '#ff9800' };
  if (score >= 450) return { label: 'Poor',      color: '#ff5722' };
  return               { label: 'Very Poor', color: '#f44336' };
}

// ── Loan rate calculation ────────────────────────────────────────────────────

export function calculateRate(termDays: number, creditScore: number, principal: number, income30d: number): number {
  // Base rate by term: shorter = higher rate
  let base: number;
  if (termDays <= 30)       base = 0.14;
  else if (termDays <= 90)  base = 0.11;
  else if (termDays <= 180) base = 0.09;
  else                      base = 0.07;

  // Credit score discount/premium
  let scoreAdj: number;
  if (creditScore >= 750)      scoreAdj = -0.02;
  else if (creditScore >= 650) scoreAdj = -0.01;
  else if (creditScore >= 550) scoreAdj = 0;
  else if (creditScore >= 450) scoreAdj = +0.01;
  else                         scoreAdj = +0.03;

  // Amount vs income premium (large loan relative to income = riskier)
  const annualizedIncome = income30d * 12;
  let amountAdj = 0;
  if (annualizedIncome > 0) {
    const ratio = principal / annualizedIncome;
    if (ratio > 2)      amountAdj = +0.02;
    else if (ratio > 1) amountAdj = +0.01;
  }

  return Math.max(0.04, Math.min(0.20, base + scoreAdj + amountAdj));
}

export function loanTotalOwed(principal: number, rate: number, termDays: number): number {
  // Simple interest
  return principal * (1 + rate * (termDays / 365));
}

// ── Eligibility check ────────────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

export function checkEligibility(
  principal: number,
  termDays: number,
  income30d: number,
  income90d: number,
  creditScore: number,
  activeLoans: Loan[],
): EligibilityResult {
  if (principal <= 0) return { eligible: false, reason: 'Please enter a valid amount.' };

  // Hard minimum income for amounts above 5k
  if (principal > 5000 && income30d < 500) {
    return { eligible: false, reason: 'You need at least $500 in income over the last 30 days.' };
  }
  if (principal > 25000 && income30d < 2000) {
    return { eligible: false, reason: 'You need at least $2,000 in monthly income.' };
  }
  if (principal > 100000 && income30d < 8000) {
    return { eligible: false, reason: 'You need at least $8,000 in monthly income.' };
  }
  if (principal > 300000 && income30d < 25000) {
    return { eligible: false, reason: 'You need at least $25,000 in monthly income.' };
  }

  // Credit score floor
  if (principal > 50000 && creditScore < 450) {
    return { eligible: false, reason: `Your credit score (${creditScore}) is too low for this amount.` };
  }

  // Max loan = 3× monthly income (or $5k minimum always)
  const maxByIncome = Math.max(5000, income30d * 3);
  if (principal > maxByIncome && income30d > 0) {
    return { eligible: false, reason: `Maximum approved: $${Math.round(maxByIncome).toLocaleString()} (3× monthly income).` };
  }

  // Existing debt load
  const existingDebt = activeLoans.filter(l => !l.paid).reduce((s, l) => s + l.totalOwed, 0);
  const annualizedIncome = income30d * 12;
  if (annualizedIncome > 0 && (existingDebt + principal) / annualizedIncome > 0.9) {
    return { eligible: false, reason: 'Total debt load is too high relative to your income.' };
  }

  return { eligible: true };
}

// ── Savings ──────────────────────────────────────────────────────────────────

export function accrueInterest(savings: SavingsAccount, currentDay: number): number {
  const daysElapsed = currentDay - savings.lastInterestDay;
  return savings.balance * (SAVINGS_APR / 365) * daysElapsed;
}

export function timeDepositMatured(deposit: TimeDeposit, currentDay: number): boolean {
  return currentDay >= deposit.startDay + deposit.termDays;
}

export function timeDepositPayout(deposit: TimeDeposit): number {
  return deposit.amount * (1 + deposit.rate * (deposit.termDays / 365));
}

// ── Income helpers ───────────────────────────────────────────────────────────

export function rollingIncome(salesLog: SaleRecord[], fromDay: number, toDay: number): number {
  return salesLog.filter(s => s.day >= fromDay && s.day <= toDay).reduce((s, r) => s + r.amount, 0);
}
