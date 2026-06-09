import { getSeason } from '../../engine/climate';
import {
  ContractType,
  Worker,
  WorkerJobPosting,
  WorkerRequest,
  WorkerRole,
  WORKER_ROLE_CONFIG,
} from '../../data/workerTypes';
import {
  applicantCountForSeason,
  applyExamFeeApproved,
  applyPayRiseApproved,
  applyPayRiseDenied,
  applyTimeOffApproved,
  calcUnlockedNodes,
  createDefaultConsultant,
  createWorkerFromApplicant,
  generateApplicants,
} from '../../engine/workers';
import type { ActionFactory } from './types';

export interface WorkerActions {
  hireWorker: (typeId: WorkerRole) => void;
  fireWorker: (workerId: string) => void;
  postVacancy: (role: WorkerRole, contractType: ContractType, offeredWage: number) => void;
  closePosting: (postingId: string) => void;
  hireApplicant: (postingId: string, applicantId: string) => void;
  approveRequest: (requestId: string) => void;
  denyRequest: (requestId: string) => void;
  chooseBranch: (workerId: string, branchId: string) => void;
  startCertStudy: (workerId: string, certId: string) => void;
  setWorkerNightShift: (workerId: string, enabled: boolean) => void;
  hireConsultant: () => void;
  setWorkerShiftPreference: (workerId: string, pref: Worker['shiftPreference']) => void;
}

export const createWorkerActions: ActionFactory<WorkerActions> = (set, get) => ({
  hireWorker: (typeId) => {
    const state = get();
    const config = WORKER_ROLE_CONFIG[typeId];
    if (!config) return;
    const [wMin, wMax] = config.wageRangeJunior;
    const worker: Worker = {
      id: `worker_${Date.now()}`,
      name: 'Unnamed Worker',
      age: 25,
      nationality: 'Irish',
      role: typeId,
      department: config.department,
      experienceYears: 0,
      tier: 1,
      unlockedNodeIds: [],
      certifications: [],
      contractType: 'permanent',
      wagePerDay: Math.round((wMin + wMax) / 2),
      hireDay: state.day,
      satisfaction: 70,
      satisfactionHistory: [],
      isInjured: false,
      workEthic: 70,
      teamPlayer: 70,
      stressThreshold: 60,
      personalityRevealed: false,
      goodChemistryWith: [],
      badChemistryWith: [],
      chemistryCheckedWith: [],
      isStudying: false,
      isOnLeave: false,
      nightShift: false,
    };
    set({ workers: [...(state.workers ?? []), worker] });
  },

  fireWorker: (workerId) => {
    const state = get();
    set({ workers: (state.workers ?? []).filter((w: Worker) => w.id !== workerId) });
  },

  postVacancy: (role, contractType, offeredWage) => {
    const state = get();
    const season = getSeason(state.day);
    const count = applicantCountForSeason(season);
    const applicants = count > 0 ? generateApplicants(role, season, count) : [];
    const posting: WorkerJobPosting = {
      id: `posting_${Date.now()}`,
      role,
      contractType,
      offeredWagePerDay: offeredWage,
      postedDay: state.day,
      applicants,
      applicantsGeneratedDay: count > 0 ? state.day + Math.floor(Math.random() * 3) + 1 : undefined,
      closed: false,
    };
    set({ jobPostings: [...(state.jobPostings ?? []), posting] });
  },

  closePosting: (postingId) => {
    const state = get();
    set({ jobPostings: (state.jobPostings ?? []).map(p => p.id === postingId ? { ...p, closed: true } : p) });
  },

  hireApplicant: (postingId, applicantId) => {
    const state = get();
    const posting = (state.jobPostings ?? []).find(p => p.id === postingId);
    if (!posting) return;
    const applicant = posting.applicants.find(a => a.id === applicantId);
    if (!applicant) return;
    const worker = createWorkerFromApplicant(applicant, posting.role, posting.contractType, state.day);
    set({
      workers: [...(state.workers ?? []), worker],
      jobPostings: (state.jobPostings ?? []).map(p => p.id === postingId ? { ...p, closed: true } : p),
      money: state.money - 200,
    });
  },

  approveRequest: (requestId) => {
    const state = get();
    const req = (state.pendingRequests ?? []).find(r => r.id === requestId);
    if (!req) return;
    let workers = state.workers ?? [];
    let money = state.money;
    if (req.type === 'pay_rise') {
      const worker = workers.find(w => w.id === req.workerId);
      if (worker) {
        const newWage = Math.round(worker.wagePerDay * 1.15);
        workers = workers.map(w => w.id === req.workerId ? applyPayRiseApproved(w, newWage) : w);
      }
    } else if (req.type === 'time_off') {
      workers = workers.map(w => w.id === req.workerId ? applyTimeOffApproved(w, state.day, 3) : w);
    } else if (req.type === 'exam_fee') {
      workers = workers.map(w => w.id === req.workerId ? applyExamFeeApproved(w) : w);
      money -= req.cost ?? 400;
    } else if (req.type === 'performance_review') {
      workers = workers.map(w => w.id === req.workerId
        ? { ...w, lastPerformanceReviewDay: state.day, satisfaction: Math.min(100, w.satisfaction + 8) }
        : w);
    }
    const resolved: WorkerRequest = { ...req, resolved: true, resolution: 'approved' };
    set({
      workers,
      money,
      pendingRequests: (state.pendingRequests ?? []).filter(r => r.id !== requestId),
      requestLog: [resolved, ...(state.requestLog ?? [])].slice(0, 50),
    });
  },

  denyRequest: (requestId) => {
    const state = get();
    const req = (state.pendingRequests ?? []).find(r => r.id === requestId);
    if (!req) return;
    let workers = state.workers ?? [];
    if (req.type === 'pay_rise') {
      workers = workers.map(w => w.id === req.workerId ? applyPayRiseDenied(w) : w);
    }
    const resolved: WorkerRequest = { ...req, resolved: true, resolution: 'denied' };
    set({
      workers,
      pendingRequests: (state.pendingRequests ?? []).filter(r => r.id !== requestId),
      requestLog: [resolved, ...(state.requestLog ?? [])].slice(0, 50),
    });
  },

  chooseBranch: (workerId, branchId) => {
    const state = get();
    const worker = (state.workers ?? []).find(w => w.id === workerId);
    if (!worker || worker.tier < 3) return;
    const newNodes = calcUnlockedNodes(worker.role, worker.experienceYears, branchId);
    set({
      workers: (state.workers ?? []).map(w =>
        w.id === workerId ? { ...w, selectedBranch: branchId, unlockedNodeIds: newNodes } : w,
      ),
    });
  },

  startCertStudy: (workerId, certId) => {
    const state = get();
    const worker = (state.workers ?? []).find(w => w.id === workerId);
    if (!worker) return;
    const config = WORKER_ROLE_CONFIG[worker.role];
    const node = config.skillTree.find(n => n.certId === certId);
    if (!node) return;
    const existing = worker.certifications.find(c => c.id === certId);
    const cert = existing ?? {
      id: certId,
      name: node.name.replace(/^[^A-Za-z0-9]+\s*/, ''),
      studyProgressHours: 0,
      totalHours: 60,
      examFeePaid: false,
      passed: false,
    };
    const updatedCerts = existing ? worker.certifications : [...worker.certifications, cert];
    set({
      workers: (state.workers ?? []).map(w =>
        w.id === workerId ? { ...w, isStudying: true, studyingCertId: certId, studyStartDay: state.day, certifications: updatedCerts } : w,
      ),
    });
  },

  setWorkerNightShift: (workerId, enabled) => {
    const state = get();
    set({ workers: (state.workers ?? []).map(w => w.id === workerId ? { ...w, nightShift: enabled } : w) });
  },

  hireConsultant: () => {
    set({ consultant: createDefaultConsultant() });
  },

  setWorkerShiftPreference: (workerId, pref) => {
    set((state) => ({
      workers: (state.workers ?? []).map((w) =>
        w.id === workerId ? { ...w, shiftPreference: pref } : w
      ),
    }));
  },
});
