import {
  Worker, WorkerRole, WorkerApplicant, Consultant, ContractType,
  WORKER_ROLE_CONFIG, WORKER_FIRST_NAMES, WORKER_LAST_NAMES,
  WORKER_NATIONALITIES, PERSONALITY_HINTS,
} from '../data/workerTypes';

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export function calcTier(experienceYears: number): 1 | 2 | 3 | 4 {
  if (experienceYears >= 10) return 4;
  if (experienceYears >= 6) return 3;
  if (experienceYears >= 1) return 2;
  return 1;
}

export function calcUnlockedNodes(role: WorkerRole, experienceYears: number, selectedBranch?: string): string[] {
  const config = WORKER_ROLE_CONFIG[role];
  const tier = calcTier(experienceYears);
  return config.skillTree
    .filter(node => {
      if (node.tier > tier) return false;
      if (node.tier === 3 && node.branchId && node.branchId !== selectedBranch) return false;
      return true;
    })
    .map(node => node.id);
}

export function generateApplicants(role: WorkerRole, season: string, count: number): WorkerApplicant[] {
  const config = WORKER_ROLE_CONFIG[role];
  return Array.from({ length: count }, (_, i) => {
    const expYears = rng(0, 12);
    const tier = calcTier(expYears);
    const certNodes = config.skillTree.filter(n => n.isCert && n.tier <= tier && n.tier < 3);
    const certIds = certNodes.map(n => n.certId!).filter(Boolean);
    if (config.alwaysPrecertified) {
      config.skillTree.filter(n => n.isCert && n.tier === 1).forEach(n => { if (n.certId) certIds.push(n.certId); });
    }
    const [wMin, wMax] = expYears >= 5 ? config.wageRangeSenior : config.wageRangeJunior;
    const seasonMult = season === 'summer' || season === 'autumn' ? 1.2 : 1.0;
    return {
      id: `applicant_${Date.now()}_${i}`,
      name: `${pick(WORKER_FIRST_NAMES)} ${pick(WORKER_LAST_NAMES)}`,
      age: rng(18, 55),
      nationality: pick(WORKER_NATIONALITIES),
      experienceYears: expYears,
      contractPreference: (['permanent', 'seasonal', 'casual'] as ContractType[])[rng(0, 2)],
      askingWagePerDay: Math.round(rng(wMin, wMax) * seasonMult),
      certificationIds: [...new Set(certIds)],
      personalityHints: pickN(PERSONALITY_HINTS, rng(1, 2)),
      workEthic: rng(30, 100),
      teamPlayer: rng(20, 100),
      stressThreshold: rng(20, 100),
    };
  });
}

export function createWorkerFromApplicant(
  applicant: WorkerApplicant,
  role: WorkerRole,
  contractType: ContractType,
  hireDay: number,
  contractEndDay?: number,
): Worker {
  const config = WORKER_ROLE_CONFIG[role];
  const unlockedNodeIds = calcUnlockedNodes(role, applicant.experienceYears);
  const certifications = applicant.certificationIds.map(certId => {
    const node = config.skillTree.find(n => n.certId === certId);
    return {
      id: certId,
      name: (node?.name ?? certId).replace('📜 ', ''),
      studyProgressHours: 60,
      totalHours: 60,
      examFeePaid: true,
      passed: true,
    };
  });
  return {
    id: `worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: applicant.name,
    age: applicant.age,
    nationality: applicant.nationality,
    role,
    department: config.department,
    experienceYears: applicant.experienceYears,
    tier: calcTier(applicant.experienceYears),
    unlockedNodeIds,
    certifications,
    contractType,
    wagePerDay: applicant.askingWagePerDay,
    hireDay,
    contractEndDay,
    satisfaction: 70,
    satisfactionHistory: [],
    isInjured: false,
    workEthic: applicant.workEthic,
    teamPlayer: applicant.teamPlayer,
    stressThreshold: applicant.stressThreshold,
    personalityRevealed: false,
    goodChemistryWith: [],
    badChemistryWith: [],
    chemistryCheckedWith: [],
    isStudying: false,
    isOnLeave: false,
    nightShift: false,
  };
}

export function createDefaultConsultant(): Consultant {
  return {
    id: 'charlie',
    name: 'Charlie Ireland',
    age: 44,
    specialization: null,
    specializationProgress: { crops: 0, livestock: 0, operations: 0, business: 0, compliance: 0 },
    relationshipScore: 50,
    autonomyLevel: 40,
    employerReputation: 50,
    isHired: true,
    hireCostPerDay: 350,
  };
}

export function tickWorker(worker: Worker, day: number, daysPerYear = 365): Worker {
  if (worker.isInjured && worker.injuryRecoveryDay != null && day < worker.injuryRecoveryDay) {
    return worker;
  }
  const recovered: Worker = worker.isInjured && worker.injuryRecoveryDay != null && day >= worker.injuryRecoveryDay
    ? { ...worker, isInjured: false, injuryRecoveryDay: undefined }
    : worker;

  const newExpYears = recovered.experienceYears + (1 / daysPerYear);
  const newTier = calcTier(newExpYears);
  const personalityRevealed = recovered.personalityRevealed || (day - recovered.hireDay >= 14);

  let sat = recovered.satisfaction + 0.05;
  if (day % 7 === 0) {
    sat += recovered.goodChemistryWith.length * 2;
    sat += recovered.badChemistryWith.length * -3;
  }
  sat = Math.max(0, Math.min(100, sat));

  let updatedCerts = recovered.certifications;
  if (recovered.isStudying && recovered.studyingCertId) {
    updatedCerts = recovered.certifications.map(c => {
      if (c.id !== recovered.studyingCertId || c.passed) return c;
      const newProgress = Math.min(c.totalHours, c.studyProgressHours + 2);
      const passed = newProgress >= c.totalHours && c.examFeePaid;
      return { ...c, studyProgressHours: newProgress, passed };
    });
  }

  return { ...recovered, experienceYears: newExpYears, tier: newTier, satisfaction: sat, personalityRevealed, certifications: updatedCerts };
}

export function calcWeeklyPayroll(workers: Worker[], consultant: Consultant | null): number {
  const workerTotal = workers.reduce((s, w) => s + w.wagePerDay * 7, 0);
  const consultantCost = consultant?.isHired ? consultant.hireCostPerDay * 7 : 0;
  return workerTotal + consultantCost;
}

export function rollInjury(worker: Worker, hasMechanic: boolean): boolean {
  let chance = 0.001;
  if (worker.role === 'tractor_operator' || worker.role === 'combine_operator') chance = 0.002;
  if (worker.role === 'farm_mechanic') chance = 0.0015;
  if (hasMechanic) chance *= 0.7;
  if (worker.certifications.length === 0) chance *= 1.3;
  return Math.random() < chance;
}

export function rollPoaching(worker: Worker, employerReputation: number): { poached: boolean; offerWage: number } {
  if (worker.tier < 2 || worker.contractType === 'permanent') return { poached: false, offerWage: 0 };
  const tierChances: number[] = [0, 0, 0.0005, 0.001, 0.002, 0.003];
  const tierChance = tierChances[worker.tier] ?? 0;
  const repDiscount = Math.max(0.3, 1 - (employerReputation / 100) * 0.7);
  if (Math.random() < tierChance * repDiscount) {
    return { poached: true, offerWage: Math.round(worker.wagePerDay * 1.2) };
  }
  return { poached: false, offerWage: 0 };
}

export function applyPayRiseApproved(worker: Worker, newWage: number): Worker {
  const delta = rng(10, 20);
  return {
    ...worker,
    wagePerDay: newWage,
    satisfaction: Math.min(100, worker.satisfaction + delta),
    satisfactionHistory: [...worker.satisfactionHistory.slice(-29), { day: -1, delta, reason: 'Pay rise approved' }],
  };
}

export function applyPayRiseDenied(worker: Worker): Worker {
  const delta = -rng(8, 15);
  return {
    ...worker,
    satisfaction: Math.max(0, worker.satisfaction + delta),
    satisfactionHistory: [...worker.satisfactionHistory.slice(-29), { day: -1, delta, reason: 'Pay rise denied' }],
  };
}

export function applyTimeOffApproved(worker: Worker, day: number, days: number): Worker {
  const delta = rng(6, 12);
  return {
    ...worker,
    isOnLeave: true,
    leaveReturnDay: day + days,
    satisfaction: Math.min(100, worker.satisfaction + delta),
    satisfactionHistory: [...worker.satisfactionHistory.slice(-29), { day, delta, reason: 'Time off approved' }],
  };
}

export function applyExamFeeApproved(worker: Worker): Worker {
  if (!worker.studyingCertId) return worker;
  const delta = rng(6, 10);
  const certifications = worker.certifications.map(c =>
    c.id === worker.studyingCertId ? { ...c, examFeePaid: true } : c,
  );
  return {
    ...worker,
    certifications,
    satisfaction: Math.min(100, worker.satisfaction + delta),
    satisfactionHistory: [...worker.satisfactionHistory.slice(-29), { day: -1, delta, reason: 'Exam fee covered' }],
  };
}

export interface WorkerBonuses {
  cropYieldMultiplier: number;
  cropGrowthReduction: number;
  fertilityDrainMult: number;
  fallowRestoreInterval: number;
  animalProductionMult: number;
  sicknessBonusReduction: number;
  maintenanceMult: number;
  machineYieldBonus: number;
  processingOutputMult: number;
  autoProcessEnabled: boolean;
}

export function getWorkerBonuses(workers: Worker[]): WorkerBonuses {
  const active = workers.filter(w => !w.isInjured && !w.isOnLeave);
  const count = (role: WorkerRole) => active.filter(w => w.role === role).length;
  const fieldHands = count('field_hand');
  const agronomists = count('agronomist');
  const livestock = count('livestock_hand');
  const vets = count('veterinarian');
  const mechanics = count('farm_mechanic');
  const procTechs = count('processing_tech');
  const qcCount = count('quality_controller');
  const hasElectricalEngineer = active.some(
    w => w.role === 'farm_mechanic' && w.certifications.some(c => c.id === 'electrical_engineer' && c.passed),
  );
  return {
    cropYieldMultiplier:    1 + fieldHands * 0.05 + agronomists * 0.15,
    cropGrowthReduction:    agronomists > 0 ? 1 : 0,
    fertilityDrainMult:     agronomists >= 2 ? 0.5 : 1.0,
    fallowRestoreInterval:  agronomists > 0 ? 15 : 30,
    animalProductionMult:   1 + livestock * 0.08 + vets * 0.12,
    sicknessBonusReduction: vets > 0 ? 0.3 : 0,
    maintenanceMult:        mechanics >= 2 ? 0.6 : Math.max(0.6, 1 - mechanics * 0.2),
    machineYieldBonus:      hasElectricalEngineer ? 0.1 : 0,
    processingOutputMult:   1 + procTechs * 0.10 + qcCount * 0.15,
    autoProcessEnabled:     qcCount > 0,
  };
}

export function applicantCountForSeason(season: string): number {
  if (season === 'summer' || season === 'autumn') return rng(0, 3);
  if (season === 'spring') return rng(1, 6);
  return rng(3, 12);
}
