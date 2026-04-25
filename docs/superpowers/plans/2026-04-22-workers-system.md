# Workers System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing passive-bonus workers system with a fully realistic labour system — named workers with personalities, skill trees, certifications, satisfaction, a Charlie consultant, a hiring job board, and a permission request system.

**Architecture:** `data/workerTypes.ts` holds all types and role configs; `engine/workers.ts` holds pure tick/generation functions; `store/useGameStore.ts` gets new state fields wired into `advanceDay()`; `app/(tabs)/trabajadores.tsx` gets a full multi-tab rewrite. The old `OwnedWorker` type is replaced by the full `Worker` interface — save key bumps v6 → v7 (old saves wiped, no migration).

**Tech Stack:** React Native 0.81.5 · Expo 54 · TypeScript 5.9.2 · Zustand 5 · React 19

**Read before starting:** `granja-tycoon/CLAUDE.md` — critical web compatibility rules (Zustand ESM fix, partialize, GestureHandlerRootView, no pointerEvents on tabs).

---

## Role ID Migration

Old store role IDs → new IDs used throughout this plan:

| Old | New |
|-----|-----|
| `field_worker` | `field_hand` |
| `agronomist` | `agronomist` |
| `botanist` | _removed_ (absorbed into agronomist tier bonuses) |
| `animal_keeper` | `livestock_hand` |
| `zootechnician` | _removed_ (absorbed into vet/livestock tier bonuses) |
| `mechanic` | `farm_mechanic` |
| `engineer` | _removed_ (absorbed into farm_mechanic Electrical Engineer cert) |
| `processor` | `processing_tech` |
| `supervisor` | `quality_controller` |
| `vet` | `veterinarian` |
| `truck_driver` | `transport_driver` |
| `hydrogeologist` | `hydrogeologist` (kept — water system dependency) |

New roles added: `irrigation_tech`, `ai_inseminator`, `farrier`, `tractor_operator`, `combine_operator`, `farm_admin`, `security_guard`, `dept_foreman`.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| **Rewrite** | `data/workerTypes.ts` | All types, interfaces, role configs, name pools |
| **Create** | `engine/workers.ts` | Pure functions: tick, generation, bonuses |
| **Modify** | `store/useGameStore.ts` | New state, actions, advanceDay wiring, bump v7 |
| **Rewrite** | `app/(tabs)/trabajadores.tsx` | Multi-tab UI: Staff / Requests / Hire |

---

## Task 1: Rewrite data/workerTypes.ts

**Files:**
- Rewrite: `data/workerTypes.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
// data/workerTypes.ts

export type WorkerDepartment = 'fields' | 'animals' | 'machinery' | 'processing' | 'transport' | 'office';

export type WorkerRole =
  // Fields
  | 'field_hand' | 'agronomist' | 'irrigation_tech'
  // Animals
  | 'livestock_hand' | 'veterinarian' | 'ai_inseminator' | 'farrier'
  // Machinery
  | 'tractor_operator' | 'combine_operator' | 'farm_mechanic'
  // Processing
  | 'processing_tech' | 'quality_controller'
  // Transport
  | 'transport_driver'
  // Office
  | 'farm_admin' | 'security_guard' | 'dept_foreman'
  // Standalone (legacy – water system)
  | 'hydrogeologist';

export type ContractType = 'permanent' | 'seasonal' | 'casual';

export interface WorkerCertification {
  id: string;
  name: string;
  studyProgressHours: number;
  totalHours: number;
  examFeePaid: boolean;
  passed: boolean;
}

export interface SkillNode {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  isCert: boolean;
  certId?: string;
  branchId?: string; // tier-3 branch identifier
}

export interface Worker {
  id: string;
  name: string;
  age: number;
  nationality: string;
  role: WorkerRole;
  department: WorkerDepartment | null;
  pinnedAssetId?: string;

  experienceYears: number;
  tier: 1 | 2 | 3 | 4;
  selectedBranch?: string;
  unlockedNodeIds: string[];
  certifications: WorkerCertification[];

  contractType: ContractType;
  wagePerDay: number;
  hireDay: number;
  contractEndDay?: number;

  satisfaction: number; // 0–100
  satisfactionHistory: { day: number; delta: number; reason: string }[];
  isInjured: boolean;
  injuryRecoveryDay?: number;

  workEthic: number;       // 0–100
  teamPlayer: number;      // 0–100
  stressThreshold: number; // 0–100
  personalityRevealed: boolean;

  goodChemistryWith: string[];
  badChemistryWith: string[];
  chemistryCheckedWith: string[];

  isStudying: boolean;
  studyingCertId?: string;
  studyStartDay?: number;
  isOnLeave: boolean;
  leaveReturnDay?: number;
  nightShift: boolean;
  lastPerformanceReviewDay?: number;
}

export interface WorkerRequest {
  id: string;
  workerId: string;
  workerName: string;
  workerIcon: string;
  type: WorkerRequestType;
  message: string;
  cost?: number;
  consequence?: string;
  urgency: 'urgent' | 'routine';
  postedDay: number;
  timeoutDay?: number;
  resolved: boolean;
  resolution?: 'approved' | 'denied' | 'auto';
}

export type WorkerRequestType =
  | 'pay_rise' | 'time_off' | 'exam_fee' | 'equipment_request'
  | 'treatment_approval' | 'large_batch' | 'machinery_repair'
  | 'poaching_alert' | 'performance_review' | 'disagreement';

export interface WorkerApplicant {
  id: string;
  name: string;
  age: number;
  nationality: string;
  experienceYears: number;
  contractPreference: ContractType;
  askingWagePerDay: number;
  certificationIds: string[];
  personalityHints: string[];
  // hidden until hired
  workEthic: number;
  teamPlayer: number;
  stressThreshold: number;
}

export interface WorkerJobPosting {
  id: string;
  role: WorkerRole;
  contractType: ContractType;
  offeredWagePerDay: number;
  postedDay: number;
  applicants: WorkerApplicant[];
  applicantsGeneratedDay?: number;
  closed: boolean;
}

export interface Consultant {
  id: 'charlie';
  name: string;
  age: number;
  specialization: 'crops' | 'livestock' | 'operations' | 'business' | 'compliance' | null;
  specializationProgress: { crops: number; livestock: number; operations: number; business: number; compliance: number };
  relationshipScore: number;  // 0–100
  autonomyLevel: number;      // 0–100
  employerReputation: number; // 0–100 (Charlie tracks this)
  isHired: boolean;
  hireCostPerDay: number;
}

// ── Role config ─────────────────────────────────────────────────────────────

export interface WorkerRoleConfig {
  id: WorkerRole;
  name: string;
  icon: string;
  department: WorkerDepartment | null;
  wageRangeJunior: [number, number];  // $/day
  wageRangeSenior: [number, number];
  autonomyCeiling: 'low' | 'medium' | 'high';
  alwaysPrecertified: boolean;
  skillTree: SkillNode[];
}

export const WORKER_ROLE_CONFIG: Record<WorkerRole, WorkerRoleConfig> = {
  field_hand: {
    id: 'field_hand', name: 'Field Hand', icon: '👨‍🌾',
    department: 'fields',
    wageRangeJunior: [40, 60], wageRangeSenior: [60, 90],
    autonomyCeiling: 'low', alwaysPrecertified: false,
    skillTree: [
      { id: 'fh_basics', name: 'Manual Harvesting', tier: 1, isCert: false },
      { id: 'fh_irrigation', name: 'Irrigation Checks', tier: 1, isCert: false },
      { id: 'fh_seeding', name: 'Precision Seeding', tier: 2, isCert: false },
      { id: 'fh_pesticide', name: '📜 Pesticide Applicator', tier: 2, isCert: true, certId: 'pesticide_applicator' },
      { id: 'fh_ipm', name: 'IPM Basics', tier: 3, isCert: false, branchId: 'crop_specialist' },
      { id: 'fh_organic', name: 'Organic Methods', tier: 3, isCert: false, branchId: 'organic_specialist' },
      { id: 'fh_master', name: 'Master Field Hand', tier: 4, isCert: false },
    ],
  },
  agronomist: {
    id: 'agronomist', name: 'Agronomist', icon: '🌱',
    department: 'fields',
    wageRangeJunior: [120, 160], wageRangeSenior: [180, 250],
    autonomyCeiling: 'high', alwaysPrecertified: false,
    skillTree: [
      { id: 'agro_scout', name: 'Field Scouting', tier: 1, isCert: false },
      { id: 'agro_soil', name: 'Soil Reading', tier: 1, isCert: false },
      { id: 'agro_rotation', name: 'Crop Rotation', tier: 2, isCert: false },
      { id: 'agro_pesticide', name: '📜 Pesticide Applicator', tier: 2, isCert: true, certId: 'pesticide_applicator' },
      { id: 'agro_irrigation', name: 'Irrigation Planning', tier: 2, isCert: false },
      { id: 'agro_ipm', name: 'IPM Specialist', tier: 3, isCert: false, branchId: 'ipm' },
      { id: 'agro_cert', name: '📜 Certified Agronomist', tier: 3, isCert: true, certId: 'certified_agronomist', branchId: 'certified' },
      { id: 'agro_precision', name: 'Precision Ag', tier: 3, isCert: false, branchId: 'precision' },
      { id: 'agro_master', name: 'Master Agronomist', tier: 4, isCert: false },
    ],
  },
  irrigation_tech: {
    id: 'irrigation_tech', name: 'Irrigation Technician', icon: '💧',
    department: 'fields',
    wageRangeJunior: [80, 110], wageRangeSenior: [120, 160],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'irr_schedule', name: 'Water Scheduling', tier: 1, isCert: false },
      { id: 'irr_drip', name: 'Drip Systems', tier: 2, isCert: false },
      { id: 'irr_aquifer', name: 'Aquifer Management', tier: 2, isCert: false },
      { id: 'irr_cert', name: '📜 Irrigation Cert', tier: 3, isCert: true, certId: 'irrigation_management' },
      { id: 'irr_master', name: 'Master Technician', tier: 4, isCert: false },
    ],
  },
  livestock_hand: {
    id: 'livestock_hand', name: 'Livestock Hand', icon: '🤠',
    department: 'animals',
    wageRangeJunior: [40, 65], wageRangeSenior: [65, 95],
    autonomyCeiling: 'low', alwaysPrecertified: false,
    skillTree: [
      { id: 'lh_feeding', name: 'Daily Feeding', tier: 1, isCert: false },
      { id: 'lh_health', name: 'Basic Health Checks', tier: 1, isCert: false },
      { id: 'lh_welfare', name: 'Animal Welfare', tier: 2, isCert: false },
      { id: 'lh_handling', name: '📜 Safe Handling Cert', tier: 2, isCert: true, certId: 'safe_animal_handling' },
      { id: 'lh_dairy', name: 'Dairy Specialist', tier: 3, isCert: false, branchId: 'dairy' },
      { id: 'lh_beef', name: 'Beef Specialist', tier: 3, isCert: false, branchId: 'beef' },
      { id: 'lh_master', name: 'Master Stockperson', tier: 4, isCert: false },
    ],
  },
  veterinarian: {
    id: 'veterinarian', name: 'Veterinarian', icon: '👨‍⚕️',
    department: 'animals',
    wageRangeJunior: [200, 300], wageRangeSenior: [300, 450],
    autonomyCeiling: 'high', alwaysPrecertified: true,
    skillTree: [
      { id: 'vet_diag', name: 'Diagnosis', tier: 1, isCert: false },
      { id: 'vet_treat', name: 'Treatment', tier: 1, isCert: false },
      { id: 'vet_surgery', name: 'Minor Surgery', tier: 2, isCert: false },
      { id: 'vet_preg', name: 'Pregnancy Management', tier: 2, isCert: false },
      { id: 'vet_specialist', name: 'Large Animal Specialist', tier: 3, isCert: false, branchId: 'large_animal' },
      { id: 'vet_poultry', name: 'Poultry Specialist', tier: 3, isCert: false, branchId: 'poultry' },
      { id: 'vet_master', name: 'Senior Vet', tier: 4, isCert: false },
    ],
  },
  ai_inseminator: {
    id: 'ai_inseminator', name: 'AI Inseminator', icon: '🧬',
    department: 'animals',
    wageRangeJunior: [150, 200], wageRangeSenior: [220, 300],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'ai_ai', name: '📜 AI Insemination Cert', tier: 1, isCert: true, certId: 'ai_insemination' },
      { id: 'ai_semen', name: 'Semen Evaluation', tier: 2, isCert: false },
      { id: 'ai_genetics', name: 'Genetic Selection', tier: 2, isCert: false },
      { id: 'ai_embryo', name: '📜 Embryo Transfer Cert', tier: 3, isCert: true, certId: 'embryo_transfer', branchId: 'embryo' },
      { id: 'ai_master', name: 'Senior Inseminator', tier: 4, isCert: false },
    ],
  },
  farrier: {
    id: 'farrier', name: 'Farrier / Hoof Tech', icon: '🐾',
    department: 'animals',
    wageRangeJunior: [100, 140], wageRangeSenior: [150, 220],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'far_trim', name: 'Hoof Trimming', tier: 1, isCert: false },
      { id: 'far_cert', name: '📜 Registered Farrier', tier: 2, isCert: true, certId: 'registered_farrier' },
      { id: 'far_lameness', name: 'Lameness Prevention', tier: 2, isCert: false },
      { id: 'far_ortho', name: 'Orthopaedic Shoeing', tier: 3, isCert: false, branchId: 'orthopaedic' },
      { id: 'far_master', name: 'Master Farrier', tier: 4, isCert: false },
    ],
  },
  tractor_operator: {
    id: 'tractor_operator', name: 'Tractor Operator', icon: '🚜',
    department: 'machinery',
    wageRangeJunior: [80, 120], wageRangeSenior: [120, 180],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'to_safe', name: '📜 Tractor Safety Cert ✦', tier: 1, isCert: true, certId: 'tractor_safety' },
      { id: 'to_implements', name: 'Implement Operation', tier: 1, isCert: false },
      { id: 'to_gps', name: 'GPS Guidance', tier: 2, isCert: false },
      { id: 'to_precision', name: 'Precision Application', tier: 2, isCert: false },
      { id: 'to_spray', name: '📜 Sprayer Operator', tier: 3, isCert: true, certId: 'sprayer_operator', branchId: 'sprayer' },
      { id: 'to_master', name: 'Senior Operator', tier: 4, isCert: false },
    ],
  },
  combine_operator: {
    id: 'combine_operator', name: 'Combine Operator', icon: '🌾',
    department: 'machinery',
    wageRangeJunior: [90, 130], wageRangeSenior: [130, 190],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'co_safe', name: '📜 Combine Safety Cert ✦', tier: 1, isCert: true, certId: 'combine_safety' },
      { id: 'co_settings', name: 'Header Settings', tier: 2, isCert: false },
      { id: 'co_grain', name: 'Grain Quality', tier: 2, isCert: false },
      { id: 'co_forage', name: 'Forage Harvesting', tier: 3, isCert: false, branchId: 'forage' },
      { id: 'co_master', name: 'Senior Operator', tier: 4, isCert: false },
    ],
  },
  farm_mechanic: {
    id: 'farm_mechanic', name: 'Farm Mechanic', icon: '🔧',
    department: 'machinery',
    wageRangeJunior: [90, 130], wageRangeSenior: [140, 200],
    autonomyCeiling: 'high', alwaysPrecertified: false,
    skillTree: [
      { id: 'fm_maint', name: 'Basic Maintenance', tier: 1, isCert: false },
      { id: 'fm_safety', name: 'Tool Safety ✦', tier: 1, isCert: true, certId: 'tool_safety' },
      { id: 'fm_log', name: 'Machine Log-keeping', tier: 1, isCert: false },
      { id: 'fm_hydraulics', name: 'Hydraulics', tier: 2, isCert: false },
      { id: 'fm_electrical', name: '📜 Electrical Engineer Cert', tier: 2, isCert: true, certId: 'electrical_engineer' },
      { id: 'fm_welding', name: 'Welding & Fabrication', tier: 2, isCert: false },
      { id: 'fm_heavy', name: 'Heavy Plant Specialist', tier: 3, isCert: false, branchId: 'heavy_plant' },
      { id: 'fm_electronics', name: 'Precision Electronics', tier: 3, isCert: false, branchId: 'electronics' },
      { id: 'fm_workshop', name: 'Workshop Manager', tier: 3, isCert: false, branchId: 'workshop' },
      { id: 'fm_master', name: 'Master Mechanic', tier: 4, isCert: false },
    ],
  },
  processing_tech: {
    id: 'processing_tech', name: 'Processing Technician', icon: '🏭',
    department: 'processing',
    wageRangeJunior: [70, 100], wageRangeSenior: [100, 140],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'pt_ops', name: 'Equipment Operation', tier: 1, isCert: false },
      { id: 'pt_hygiene', name: '📜 Food Hygiene Cert ✦', tier: 1, isCert: true, certId: 'food_hygiene' },
      { id: 'pt_quality', name: 'Quality Standards', tier: 2, isCert: false },
      { id: 'pt_dairy', name: 'Dairy Processing', tier: 3, isCert: false, branchId: 'dairy_proc' },
      { id: 'pt_meat', name: 'Meat Processing', tier: 3, isCert: false, branchId: 'meat_proc' },
      { id: 'pt_master', name: 'Senior Technician', tier: 4, isCert: false },
    ],
  },
  quality_controller: {
    id: 'quality_controller', name: 'Quality Controller', icon: '📋',
    department: 'processing',
    wageRangeJunior: [100, 140], wageRangeSenior: [140, 200],
    autonomyCeiling: 'high', alwaysPrecertified: false,
    skillTree: [
      { id: 'qc_testing', name: 'Lab Testing', tier: 1, isCert: false },
      { id: 'qc_food', name: '📜 Food Safety Cert ✦', tier: 1, isCert: true, certId: 'food_safety' },
      { id: 'qc_reject', name: 'Batch Rejection', tier: 2, isCert: false },
      { id: 'qc_premium', name: '📜 Premium Quality Cert', tier: 3, isCert: true, certId: 'premium_quality', branchId: 'premium' },
      { id: 'qc_master', name: 'Senior QC', tier: 4, isCert: false },
    ],
  },
  transport_driver: {
    id: 'transport_driver', name: 'Transport Driver', icon: '🚛',
    department: 'transport',
    wageRangeJunior: [80, 110], wageRangeSenior: [110, 160],
    autonomyCeiling: 'medium', alwaysPrecertified: false,
    skillTree: [
      { id: 'td_licence', name: '📜 HGV Licence ✦', tier: 1, isCert: true, certId: 'hgv_licence' },
      { id: 'td_adr', name: '📜 ADR Hazmat', tier: 2, isCert: true, certId: 'adr_hazmat' },
      { id: 'td_refrig', name: 'Refrigerated Loads', tier: 2, isCert: false },
      { id: 'td_logistics', name: 'Logistics Planning', tier: 3, isCert: false, branchId: 'logistics' },
      { id: 'td_master', name: 'Senior Driver', tier: 4, isCert: false },
    ],
  },
  farm_admin: {
    id: 'farm_admin', name: 'Farm Administrator', icon: '📊',
    department: 'office',
    wageRangeJunior: [80, 120], wageRangeSenior: [130, 190],
    autonomyCeiling: 'high', alwaysPrecertified: false,
    skillTree: [
      { id: 'fa_records', name: 'Record Keeping', tier: 1, isCert: false },
      { id: 'fa_subsidy', name: 'Subsidy Applications', tier: 2, isCert: false },
      { id: 'fa_compliance', name: '📜 Compliance Cert', tier: 2, isCert: true, certId: 'farm_compliance' },
      { id: 'fa_insurance', name: 'Insurance Claims', tier: 2, isCert: false },
      { id: 'fa_accounts', name: 'Farm Accounting', tier: 3, isCert: false, branchId: 'accounts' },
      { id: 'fa_master', name: 'Senior Administrator', tier: 4, isCert: false },
    ],
  },
  security_guard: {
    id: 'security_guard', name: 'Security Guard', icon: '🛡️',
    department: 'office',
    wageRangeJunior: [60, 90], wageRangeSenior: [90, 130],
    autonomyCeiling: 'high', alwaysPrecertified: false,
    skillTree: [
      { id: 'sg_patrol', name: 'Patrol Routine', tier: 1, isCert: false },
      { id: 'sg_sia', name: '📜 SIA Licence ✦', tier: 1, isCert: true, certId: 'sia_licence' },
      { id: 'sg_cctv', name: 'CCTV Monitoring', tier: 2, isCert: false },
      { id: 'sg_night', name: 'Night Security', tier: 3, isCert: false, branchId: 'night' },
      { id: 'sg_master', name: 'Head of Security', tier: 4, isCert: false },
    ],
  },
  dept_foreman: {
    id: 'dept_foreman', name: 'Department Foreman', icon: '👷',
    department: 'office',
    wageRangeJunior: [130, 180], wageRangeSenior: [180, 260],
    autonomyCeiling: 'high', alwaysPrecertified: false,
    skillTree: [
      { id: 'df_supervision', name: 'Team Supervision', tier: 1, isCert: false },
      { id: 'df_planning', name: 'Daily Planning', tier: 2, isCert: false },
      { id: 'df_filter', name: 'Request Filtering', tier: 2, isCert: false },
      { id: 'df_fields', name: 'Fields Specialism', tier: 3, isCert: false, branchId: 'fields_spec' },
      { id: 'df_animals', name: 'Animals Specialism', tier: 3, isCert: false, branchId: 'animals_spec' },
      { id: 'df_master', name: 'Senior Foreman', tier: 4, isCert: false },
    ],
  },
  hydrogeologist: {
    id: 'hydrogeologist', name: 'Hydrogeologist', icon: '🔍',
    department: null,
    wageRangeJunior: [400, 500], wageRangeSenior: [400, 500],
    autonomyCeiling: 'high', alwaysPrecertified: true,
    skillTree: [
      { id: 'hg_survey', name: 'Well Survey', tier: 1, isCert: false },
      { id: 'hg_aquifer', name: 'Aquifer Analysis', tier: 2, isCert: false },
      { id: 'hg_master', name: 'Senior Hydrogeologist', tier: 4, isCert: false },
    ],
  },
};

// ── Name pools ──────────────────────────────────────────────────────────────

export const WORKER_FIRST_NAMES = [
  'Tom', 'James', 'Pedro', 'Maria', 'Anna', 'Lukasz', 'Dmitri', 'Aoife',
  'Sean', 'Brigid', 'Carlos', 'Elena', 'Mihai', 'Ionut', 'Fatima', 'Yusuf',
  'Patrick', 'Siobhan', 'Andrei', 'Bogdan', 'Cristina', 'Radu', 'Jana',
  'Wojtek', 'Karolina', 'Tibor', 'Attila', 'Eszter', 'Conor', 'Niamh',
];

export const WORKER_LAST_NAMES = [
  'Bradley', 'Murphy', 'Walsh', 'O\'Brien', 'Ryan', 'Kowalski', 'Novak',
  'Ionescu', 'Popescu', 'Garcia', 'Martinez', 'Ferreira', 'Santos', 'Nagy',
  'Kovács', 'Horváth', 'Szabo', 'Petrov', 'Ivanov', 'Smirnov', 'Byrne',
  'Kelly', 'O\'Connor', 'McCarthy', 'Fitzgerald', 'Munteanu', 'Stan',
];

export const WORKER_NATIONALITIES = [
  'Irish', 'Polish', 'Romanian', 'Lithuanian', 'Ukrainian', 'Portuguese',
  'Spanish', 'Hungarian', 'Bulgarian', 'Czech', 'Slovak', 'Latvian',
];

export const PERSONALITY_HINTS: string[] = [
  'Works well under pressure', 'Prefers clear instructions', 'Quick learner',
  'Very punctual', 'Takes initiative', 'Team-oriented', 'Independent worker',
  'Methodical approach', 'High stamina', 'Good with animals', 'Technically minded',
  'Strong communicator', 'Quiet but reliable', 'Can work night shifts',
];
```

- [ ] **Step 2: Check types compile**

Run from `granja-tycoon/`: `npx tsc --noEmit 2>&1 | head -30`

Expected: errors only in files that import old `WorkerRole` values like `'field_worker'` — these are fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add granja-tycoon/data/workerTypes.ts
git commit -m "feat(workers): rewrite workerTypes.ts with full type system and 17 role configs"
```

---

## Task 2: Create engine/workers.ts

**Files:**
- Create: `engine/workers.ts`

- [ ] **Step 1: Create the file**

```typescript
// engine/workers.ts
import {
  Worker, WorkerRole, WorkerApplicant, WorkerRequest, WorkerJobPosting,
  Consultant, ContractType, WORKER_ROLE_CONFIG, WORKER_FIRST_NAMES,
  WORKER_LAST_NAMES, WORKER_NATIONALITIES, PERSONALITY_HINTS,
} from '../data/workerTypes';

// ── Utility ──────────────────────────────────────────────────────────────────

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Tier from experience ─────────────────────────────────────────────────────

export function calcTier(experienceYears: number): 1 | 2 | 3 | 4 {
  if (experienceYears >= 10) return 4;
  if (experienceYears >= 6) return 3;
  if (experienceYears >= 1) return 2;
  return 1;
}

// ── Skill nodes unlocked for a given experience level ───────────────────────

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

// ── Applicant generation ─────────────────────────────────────────────────────

export function generateApplicants(role: WorkerRole, season: string, count: number): WorkerApplicant[] {
  const config = WORKER_ROLE_CONFIG[role];
  return Array.from({ length: count }, (_, i) => {
    const expYears = rng(0, 12);
    const tier = calcTier(expYears);
    const certNodes = config.skillTree.filter(n => n.isCert && n.tier <= tier && n.tier < 3);
    const certIds = certNodes.map(n => n.certId!).filter(Boolean);
    // Pre-certified roles always have their tier-1 certs
    if (config.alwaysPrecertified) {
      const tier1Certs = config.skillTree.filter(n => n.isCert && n.tier === 1).map(n => n.certId!);
      certIds.push(...tier1Certs);
    }
    const [wMin, wMax] = expYears >= 5 ? config.wageRangeSenior : config.wageRangeJunior;
    // Seasonal demand: harvest season bumps asking wage
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

// ── Create Worker from hired applicant ───────────────────────────────────────

export function createWorkerFromApplicant(
  applicant: WorkerApplicant,
  role: WorkerRole,
  contractType: ContractType,
  hireDay: number,
  contractEndDay?: number,
): Worker {
  const config = WORKER_ROLE_CONFIG[role];
  const unlockedNodes = calcUnlockedNodes(role, applicant.experienceYears);
  const certifications = applicant.certificationIds.map(certId => {
    const node = config.skillTree.find(n => n.certId === certId);
    return {
      id: certId,
      name: node?.name.replace('📜 ', '') ?? certId,
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
    unlockedNodeIds: unlockedNodes,
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

// ── Default consultant ───────────────────────────────────────────────────────

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

// ── Daily tick for a single worker ───────────────────────────────────────────

export function tickWorker(worker: Worker, day: number, daysPerYear: number = 365): Worker {
  if (worker.isInjured && worker.injuryRecoveryDay && day < worker.injuryRecoveryDay) {
    return worker;
  }
  // Recover from injury
  const recovered = worker.isInjured && worker.injuryRecoveryDay && day >= worker.injuryRecoveryDay
    ? { ...worker, isInjured: false, injuryRecoveryDay: undefined }
    : worker;

  // XP gain: 1 year per 365 days
  const newExpYears = recovered.experienceYears + (1 / daysPerYear);
  const newTier = calcTier(newExpYears);

  // Reveal personality after 14 days
  const personalityRevealed = recovered.personalityRevealed || (day - recovered.hireDay >= 14);

  // Satisfaction baseline: +0.05/day when things are normal, clamped 0-100
  let sat = recovered.satisfaction + 0.05;

  // Chemistry effects — checked weekly
  if (day % 7 === 0) {
    sat += recovered.goodChemistryWith.length * 2;
    sat += recovered.badChemistryWith.length * -3;
  }

  sat = Math.max(0, Math.min(100, sat));

  // Cert study progress
  let updatedCerts = recovered.certifications;
  if (recovered.isStudying && recovered.studyingCertId) {
    updatedCerts = recovered.certifications.map(c => {
      if (c.id !== recovered.studyingCertId || c.passed) return c;
      // Study at 2 hours/day when studying (30% productivity penalty tracked separately)
      const newProgress = Math.min(c.totalHours, c.studyProgressHours + 2);
      const passed = newProgress >= c.totalHours && c.examFeePaid;
      return { ...c, studyProgressHours: newProgress, passed };
    });
  }

  return {
    ...recovered,
    experienceYears: newExpYears,
    tier: newTier,
    satisfaction: sat,
    personalityRevealed,
    certifications: updatedCerts,
  };
}

// ── Weekly payroll calculation ────────────────────────────────────────────────

export function calcWeeklyPayroll(workers: Worker[], consultant: Consultant | null): number {
  const workerTotal = workers.reduce((s, w) => s + w.wagePerDay * 7, 0);
  const consultantCost = consultant?.isHired ? consultant.hireCostPerDay * 7 : 0;
  return workerTotal + consultantCost;
}

// ── Injury roll ──────────────────────────────────────────────────────────────

export function rollInjury(worker: Worker, hasMechanic: boolean): boolean {
  let chance = 0.001; // 0.1% per day base
  if (worker.role === 'tractor_operator' || worker.role === 'combine_operator') chance = 0.002;
  if (worker.role === 'farm_mechanic') chance = 0.0015;
  if (hasMechanic) chance *= 0.7; // mechanic maintaining equipment reduces risk
  if (!worker.certifications.some(c => c.passed)) chance *= 1.3; // no certs = higher risk
  return Math.random() < chance;
}

// ── Poaching roll ────────────────────────────────────────────────────────────

export function rollPoaching(worker: Worker, employerReputation: number): { poached: boolean; offerWage: number } {
  if (worker.tier < 2 || worker.contractType === 'permanent') {
    return { poached: false, offerWage: 0 };
  }
  // Higher tier = more likely to be poached
  const tierChance = [0, 0.0005, 0.001, 0.002, 0.003][worker.tier];
  const repDiscount = Math.max(0.3, 1 - (employerReputation / 100) * 0.7);
  const chance = tierChance * repDiscount;
  if (Math.random() < chance) {
    const offerWage = Math.round(worker.wagePerDay * 1.2);
    return { poached: true, offerWage };
  }
  return { poached: false, offerWage: 0 };
}

// ── Satisfaction delta helpers ────────────────────────────────────────────────

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
  const certs = worker.certifications.map(c =>
    c.id === worker.studyingCertId ? { ...c, examFeePaid: true } : c,
  );
  return {
    ...worker,
    certifications: certs,
    satisfaction: Math.min(100, worker.satisfaction + delta),
    satisfactionHistory: [...worker.satisfactionHistory.slice(-29), { day: -1, delta, reason: 'Exam fee covered' }],
  };
}

// ── Worker bonuses (replaces getWorkerBonuses in store) ──────────────────────

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
  const count = (role: WorkerRole) => workers.filter(w => w.role === role && !w.isInjured && !w.isOnLeave).length;
  const fieldHands = count('field_hand');
  const agronomists = count('agronomist');
  const livestock = count('livestock_hand');
  const vets = count('veterinarian');
  const mechanics = count('farm_mechanic');
  const procTechs = count('processing_tech');
  const qcCount = count('quality_controller');

  return {
    cropYieldMultiplier:    1 + fieldHands * 0.05 + agronomists * 0.15,
    cropGrowthReduction:    agronomists > 0 ? 1 : 0,
    fertilityDrainMult:     agronomists >= 2 ? 0.5 : 1.0,
    fallowRestoreInterval:  agronomists > 0 ? 15 : 30,
    animalProductionMult:   1 + livestock * 0.08 + vets * 0.12,
    sicknessBonusReduction: vets > 0 ? 0.3 : 0,
    maintenanceMult:        mechanics >= 2 ? 0.6 : Math.max(0.6, 1 - mechanics * 0.2),
    machineYieldBonus:      workers.some(w => w.role === 'farm_mechanic' && w.certifications.some(c => c.id === 'electrical_engineer' && c.passed)) ? 0.1 : 0,
    processingOutputMult:   1 + procTechs * 0.10 + qcCount * 0.15,
    autoProcessEnabled:     qcCount > 0,
  };
}

// ── Applicant pool count by season ───────────────────────────────────────────

export function applicantCountForSeason(season: string): number {
  if (season === 'summer' || season === 'autumn') return rng(0, 3);
  if (season === 'spring') return rng(1, 6);
  return rng(3, 12); // winter
}
```

- [ ] **Step 2: Check types**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: errors only in `useGameStore.ts` where old `WorkerRole` string literals are used — fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add granja-tycoon/engine/workers.ts
git commit -m "feat(workers): create engine/workers.ts with tick, generation, bonus functions"
```

---

## Task 3: Migrate store state — types, initial state, save key

**Files:**
- Modify: `store/useGameStore.ts`

This task only changes types and initial state. Actions and advanceDay wiring come in Tasks 4–5.

- [ ] **Step 1: Update imports at the top of useGameStore.ts**

Find the existing worker import:
```typescript
import { WorkerRole, WorkerType as WorkerTypeDef } from '../data/workerTypes';
```

Replace with:
```typescript
import {
  Worker, WorkerRole, WorkerRequest, WorkerJobPosting, Consultant,
  ContractType, WORKER_ROLE_CONFIG,
} from '../data/workerTypes';
import {
  getWorkerBonuses, createDefaultConsultant, tickWorker,
  calcWeeklyPayroll, rollInjury, rollPoaching, generateApplicants,
  createWorkerFromApplicant, applyPayRiseApproved, applyPayRiseDenied,
  applyTimeOffApproved, applyExamFeeApproved, applicantCountForSeason,
  WorkerBonuses,
} from '../engine/workers';
```

- [ ] **Step 2: Replace OwnedWorker interface**

Find and remove:
```typescript
export interface OwnedWorker {
  id: string;
  typeId: WorkerRole;
  hiredDay: number;
}
```

Replace with:
```typescript
export type { Worker as OwnedWorker };
export type { Worker };
```

- [ ] **Step 3: Add new state fields to GameState interface**

Find the `workers: OwnedWorker[];` line in the GameState interface and replace it with:

```typescript
  workers: Worker[];
  consultant: Consultant | null;
  pendingRequests: WorkerRequest[];
  requestLog: WorkerRequest[];       // resolved, capped at 50
  jobPostings: WorkerJobPosting[];
  employerReputation: number;        // 0–100
```

- [ ] **Step 4: Add new actions to GameState interface**

After the existing `hireWorker` and `fireWorker` declarations, add:

```typescript
  postVacancy: (role: WorkerRole, contractType: ContractType, offeredWage: number) => void;
  closePosting: (postingId: string) => void;
  hireApplicant: (postingId: string, applicantId: string) => void;
  approveRequest: (requestId: string) => void;
  denyRequest: (requestId: string) => void;
  chooseBranch: (workerId: string, branchId: string) => void;
  startCertStudy: (workerId: string, certId: string) => void;
  setWorkerNightShift: (workerId: string, enabled: boolean) => void;
  hireConsultant: () => void;
```

- [ ] **Step 5: Update initial state**

Find `workers: [] as OwnedWorker[],` in `makeInitialState()` and replace with:

```typescript
workers: [] as Worker[],
consultant: createDefaultConsultant(),
pendingRequests: [] as WorkerRequest[],
requestLog: [] as WorkerRequest[],
jobPostings: [] as WorkerJobPosting[],
employerReputation: 50,
```

- [ ] **Step 6: Bump save key to v7**

Find:
```typescript
name: 'granja-tycoon-save-v6',
version: 6,
migrate: (persistedState: any, version: number) => {
  if (version < 6) {
```

Replace with:
```typescript
name: 'granja-tycoon-save-v7',
version: 7,
migrate: (persistedState: any, version: number) => {
  if (version < 7) {
```

- [ ] **Step 7: Fix getWorkerBonuses call in advanceDay**

Find the local `getWorkerBonuses` function definition (around line 1094) and remove it entirely — we now import it from `engine/workers.ts`.

Also update the call site:
```typescript
const workerBonuses = getWorkerBonuses(state.workers ?? []);
```
This stays the same — signature is compatible.

- [ ] **Step 8: Fix all old typeId string literals throughout the store**

Find-replace each of these (they appear in `advanceDay`, `hireWorker`, etc.):

| Find | Replace |
|------|---------|
| `w.typeId === 'field_worker'` | `w.role === 'field_hand'` |
| `w.typeId === 'animal_keeper'` | `w.role === 'livestock_hand'` |
| `w.typeId === 'zootechnician'` | `w.role === 'veterinarian'` |
| `w.typeId === 'mechanic'` | `w.role === 'farm_mechanic'` |
| `w.typeId === 'engineer'` | `w.role === 'farm_mechanic'` |
| `w.typeId === 'processor'` | `w.role === 'processing_tech'` |
| `w.typeId === 'supervisor'` | `w.role === 'quality_controller'` |
| `w.typeId === 'vet'` | `w.role === 'veterinarian'` |
| `w.typeId === 'truck_driver'` | `w.role === 'transport_driver'` |
| `w.typeId === 'hydrogeologist'` | `w.role === 'hydrogeologist'` |
| `w.typeId === 'agronomist'` | `w.role === 'agronomist'` |

Also replace any `w.typeId` → `w.role` and `worker.typeId` → `worker.role`.
Replace `w.hiredDay` → `w.hireDay` everywhere.

- [ ] **Step 9: Update hireWorker action**

Find the `hireWorker` implementation and replace it:

```typescript
hireWorker: (typeId) => {
  // Legacy path — kept for compatibility with old UI until trabajadores.tsx is rewritten
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
```

- [ ] **Step 10: Add new actions**

After the `fireWorker` action, add:

```typescript
postVacancy: (role, contractType, offeredWage) => {
  const state = get();
  const season = getSeason(state.day);
  const count = applicantCountForSeason(season);
  const applicants = count > 0 ? generateApplicants(role, season, count) : [];
  const posting: WorkerJobPosting = {
    id: `posting_${Date.now()}`,
    role, contractType, offeredWage,
    postedDay: state.day,
    applicants,
    applicantsGeneratedDay: count > 0 ? state.day + Math.floor(Math.random() * 3) + 1 : undefined,
    closed: false,
  };
  set({ jobPostings: [...state.jobPostings, posting] });
},

closePosting: (postingId) => {
  const state = get();
  set({ jobPostings: state.jobPostings.map(p => p.id === postingId ? { ...p, closed: true } : p) });
},

hireApplicant: (postingId, applicantId) => {
  const state = get();
  const posting = state.jobPostings.find(p => p.id === postingId);
  if (!posting) return;
  const applicant = posting.applicants.find(a => a.id === applicantId);
  if (!applicant) return;
  const worker = createWorkerFromApplicant(applicant, posting.role, posting.contractType, state.day);
  set({
    workers: [...state.workers, worker],
    jobPostings: state.jobPostings.map(p => p.id === postingId ? { ...p, closed: true } : p),
    money: state.money - 200, // one-off hiring fee
  });
},

approveRequest: (requestId) => {
  const state = get();
  const req = state.pendingRequests.find(r => r.id === requestId);
  if (!req) return;
  let workers = state.workers;
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
    const worker = workers.find(w => w.id === req.workerId);
    if (worker) {
      workers = workers.map(w => w.id === req.workerId ? applyExamFeeApproved(w) : w);
      money -= req.cost ?? 400;
    }
  }
  const resolved: WorkerRequest = { ...req, resolved: true, resolution: 'approved' };
  set({
    workers,
    money,
    pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
    requestLog: [resolved, ...state.requestLog].slice(0, 50),
  });
},

denyRequest: (requestId) => {
  const state = get();
  const req = state.pendingRequests.find(r => r.id === requestId);
  if (!req) return;
  let workers = state.workers;
  if (req.type === 'pay_rise') {
    workers = workers.map(w => w.id === req.workerId ? applyPayRiseDenied(w) : w);
  }
  const resolved: WorkerRequest = { ...req, resolved: true, resolution: 'denied' };
  set({
    workers,
    pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
    requestLog: [resolved, ...state.requestLog].slice(0, 50),
  });
},

chooseBranch: (workerId, branchId) => {
  const state = get();
  const worker = state.workers.find(w => w.id === workerId);
  if (!worker || worker.tier < 3) return;
  const { calcUnlockedNodes } = require('../engine/workers');
  const newNodes = calcUnlockedNodes(worker.role, worker.experienceYears, branchId);
  set({
    workers: state.workers.map(w =>
      w.id === workerId ? { ...w, selectedBranch: branchId, unlockedNodeIds: newNodes } : w,
    ),
  });
},

startCertStudy: (workerId, certId) => {
  const state = get();
  const worker = state.workers.find(w => w.id === workerId);
  if (!worker) return;
  const config = WORKER_ROLE_CONFIG[worker.role];
  const node = config.skillTree.find(n => n.certId === certId);
  if (!node) return;
  const existing = worker.certifications.find(c => c.id === certId);
  const cert = existing ?? {
    id: certId,
    name: node.name.replace('📜 ', ''),
    studyProgressHours: 0,
    totalHours: 60,
    examFeePaid: false,
    passed: false,
  };
  const updatedCerts = existing
    ? worker.certifications
    : [...worker.certifications, cert];
  set({
    workers: state.workers.map(w =>
      w.id === workerId ? { ...w, isStudying: true, studyingCertId: certId, studyStartDay: state.day, certifications: updatedCerts } : w,
    ),
  });
},

setWorkerNightShift: (workerId, enabled) => {
  const state = get();
  set({ workers: state.workers.map(w => w.id === workerId ? { ...w, nightShift: enabled } : w) });
},

hireConsultant: () => {
  set({ consultant: createDefaultConsultant() });
},
```

- [ ] **Step 11: Update partialize to include new fields**

Find the `partialize` function and add the new fields to the serialized state:

```typescript
partialize: (state: GameState) => ({
  // ... existing fields ...
  workers: state.workers,
  consultant: state.consultant,
  pendingRequests: state.pendingRequests,
  requestLog: state.requestLog,
  jobPostings: state.jobPostings,
  employerReputation: state.employerReputation,
}),
```

- [ ] **Step 12: Check types compile**

Run: `npx tsc --noEmit 2>&1 | head -40`

Fix any remaining `typeId` references to `role` and `hiredDay` to `hireDay`.

- [ ] **Step 13: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat(workers): migrate store to new Worker type, add all worker actions, bump save v7"
```

---

## Task 4: Wire workers tick into advanceDay()

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Find the advanceDay worker auto-actions section**

Find `// Worker auto-actions` (around line 2829 in original). Add the daily workers tick just before this block:

```typescript
// ── Workers daily tick ────────────────────────────────────────────────────
const tickedWorkers = (state.workers ?? []).map(w => tickWorker(w, newDay));

// Injury rolls
const injuredWorkers = tickedWorkers.map(w => {
  if (w.isInjured || w.isOnLeave) return w;
  const hasMechanic = tickedWorkers.some(x => x.role === 'farm_mechanic' && !x.isInjured);
  if (rollInjury(w, hasMechanic)) {
    const recoveryDays = Math.floor(Math.random() * 18) + 3;
    return { ...w, isInjured: true, injuryRecoveryDay: newDay + recoveryDays, satisfaction: Math.max(0, w.satisfaction - 15) };
  }
  return w;
});

// Poaching rolls (daily, low probability — handled via request)
let poachingRequests: WorkerRequest[] = [];
const employerRep = state.employerReputation ?? 50;
const afterPoachingWorkers = injuredWorkers.map(w => {
  const { poached, offerWage } = rollPoaching(w, employerRep);
  if (poached) {
    poachingRequests.push({
      id: `req_poach_${w.id}_${newDay}`,
      workerId: w.id,
      workerName: w.name,
      workerIcon: WORKER_ROLE_CONFIG[w.role]?.icon ?? '👷',
      type: 'poaching_alert',
      message: `${w.name} has been approached by a competitor farm offering $${offerWage}/day.`,
      cost: offerWage - w.wagePerDay,
      consequence: `${w.name} may leave if you don't match or exceed the offer.`,
      urgency: 'urgent',
      postedDay: newDay,
      timeoutDay: newDay + 3,
      resolved: false,
    });
  }
  return w;
});

// Weekly payroll (every 7 days)
const weeklyPayrollDue = newDay % 7 === 0;
let workerPayrollDeducted = 0;
let workerSatisfactionAfterPayroll = afterPoachingWorkers;
if (weeklyPayrollDue) {
  workerPayrollDeducted = calcWeeklyPayroll(afterPoachingWorkers, state.consultant ?? null);
  // Payroll satisfaction tick: +1/week for all active workers
  workerSatisfactionAfterPayroll = afterPoachingWorkers.map(w => ({
    ...w,
    satisfaction: Math.min(100, w.satisfaction + 1),
  }));
}

// Performance review reminders (every 180 days per worker)
const reviewRequests: WorkerRequest[] = workerSatisfactionAfterPayroll
  .filter(w => {
    const lastReview = w.lastPerformanceReviewDay ?? w.hireDay;
    return newDay - lastReview >= 180;
  })
  .filter(w => !(state.pendingRequests ?? []).some(r => r.workerId === w.id && r.type === 'performance_review'))
  .map(w => ({
    id: `req_review_${w.id}_${newDay}`,
    workerId: w.id,
    workerName: w.name,
    workerIcon: WORKER_ROLE_CONFIG[w.role]?.icon ?? '👷',
    type: 'performance_review' as const,
    message: `${w.name} is due for a performance review.`,
    urgency: 'routine' as const,
    postedDay: newDay,
    resolved: false,
  }));

const allNewRequests = [...poachingRequests, ...reviewRequests];
const newPendingRequests = [...(state.pendingRequests ?? []), ...allNewRequests];
```

- [ ] **Step 2: Update the workers state in the final set() call**

Find the big `set({...})` at the end of `advanceDay`. Update the workers field:

```typescript
workers: workerSatisfactionAfterPayroll,
pendingRequests: newPendingRequests,
```

- [ ] **Step 3: Integrate payroll into daily cost deduction**

Find where `workerWages` is calculated:
```typescript
const workerWages = (state.workers ?? []).reduce((s: number, w: OwnedWorker) => {
```

Replace with:
```typescript
const workerWages = weeklyPayrollDue ? workerPayrollDeducted : 0;
```

And update the daily summary string to show weekly payroll:
```typescript
weeklyPayrollDue && workerWages > 0 && `${workerSatisfactionAfterPayroll.length} workers (weekly wages) -$${workerWages}`,
```

- [ ] **Step 4: Update advanceDay reference to old OwnedWorker type**

Replace any remaining `OwnedWorker` type annotations in advanceDay with `Worker`.

- [ ] **Step 5: Check types**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Test manually**

Run dev server: `npx expo start --web`

Open the app. Advance a day. Check browser console for errors. Advance 7 days and verify payroll is deducted from balance.

- [ ] **Step 7: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat(workers): wire workers tick, injuries, poaching, and weekly payroll into advanceDay"
```

---

## Task 5: Rewrite trabajadores.tsx — Staff tab

**Files:**
- Rewrite: `app/(tabs)/trabajadores.tsx`

This task builds the full multi-tab shell + the Staff tab. Requests and Hire tabs follow in Tasks 6–7.

- [ ] **Step 1: Replace trabajadores.tsx**

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Worker, WorkerRole, WORKER_ROLE_CONFIG, ContractType } from '../../data/workerTypes';
import { C, S, F, R } from '../../constants/theme';
import SubTabBar from '../../components/SubTabBar';

type Tab = 'staff' | 'requests' | 'hire';

function satisfactionColor(sat: number): string {
  if (sat >= 70) return '#66bb6a';
  if (sat >= 40) return '#ffa726';
  return '#ef5350';
}

function tierLabel(tier: number): string {
  return ['', 'Junior', 'Mid', 'Senior', 'Expert'][tier] ?? '';
}

function SatisfactionBar({ value }: { value: number }) {
  return (
    <View style={satStyles.track}>
      <View style={[satStyles.fill, { width: `${value}%` as any, backgroundColor: satisfactionColor(value) }]} />
      <Text style={satStyles.label}>{Math.round(value)}%</Text>
    </View>
  );
}
const satStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden', flex: 1, marginRight: 6 },
  fill: { height: '100%', borderRadius: 4 },
  label: { color: C.textMuted, fontSize: 10, minWidth: 28, textAlign: 'right' },
});

function WorkerCard({ worker, onPress }: { worker: Worker; onPress: () => void }) {
  const config = WORKER_ROLE_CONFIG[worker.role];
  const injuredLabel = worker.isInjured ? ' 🤕 Injured' : '';
  const leaveLabel = worker.isOnLeave ? ' 🏖️ On leave' : '';
  const studyLabel = worker.isStudying ? ' 📖 Studying' : '';
  return (
    <TouchableOpacity style={wcStyles.card} onPress={onPress}>
      <View style={wcStyles.row}>
        <Text style={wcStyles.icon}>{config?.icon ?? '👷'}</Text>
        <View style={wcStyles.info}>
          <Text style={wcStyles.name}>{worker.name}{injuredLabel}{leaveLabel}{studyLabel}</Text>
          <Text style={wcStyles.sub}>{config?.name} · {tierLabel(worker.tier)} · ${worker.wagePerDay}/day</Text>
          <Text style={wcStyles.sub}>{worker.nationality} · {worker.contractType}</Text>
          {worker.personalityRevealed && (
            <Text style={wcStyles.sub}>
              Ethics {worker.workEthic}% · Team {worker.teamPlayer}%
            </Text>
          )}
        </View>
      </View>
      <View style={[wcStyles.row, { marginTop: 6 }]}>
        <SatisfactionBar value={worker.satisfaction} />
      </View>
    </TouchableOpacity>
  );
}
const wcStyles = StyleSheet.create({
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 28, marginRight: S.md },
  info: { flex: 1 },
  name: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  sub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
});

function StaffTab() {
  const { workers, consultant, fireWorker, employerReputation } = useGameStore();
  const [detailWorker, setDetailWorker] = useState<Worker | null>(null);
  const allWorkers = workers ?? [];
  const totalDaily = allWorkers.reduce((s, w) => s + w.wagePerDay, 0);
  const consultantCost = consultant?.isHired ? consultant.hireCostPerDay : 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.stat}>👥 {allWorkers.length} staff · ${totalDaily + consultantCost}/day total</Text>
        <Text style={styles.stat}>⭐ Employer reputation: {employerReputation ?? 50}/100</Text>
      </View>

      {consultant?.isHired && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎩 Consultant</Text>
          <View style={wcStyles.card}>
            <View style={wcStyles.row}>
              <Text style={wcStyles.icon}>🤵</Text>
              <View style={wcStyles.info}>
                <Text style={wcStyles.name}>{consultant.name}</Text>
                <Text style={wcStyles.sub}>Farm Consultant · ${consultant.hireCostPerDay}/day</Text>
                <Text style={wcStyles.sub}>Relationship: {consultant.relationshipScore}/100 · Autonomy: {consultant.autonomyLevel}/100</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {allWorkers.length === 0 ? (
        <Text style={styles.empty}>No staff hired. Use the Hire tab to post vacancies.</Text>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Active Staff</Text>
          {allWorkers.map(w => (
            <WorkerCard key={w.id} worker={w} onPress={() => setDetailWorker(w)} />
          ))}
        </View>
      )}

      {detailWorker && (
        <WorkerDetailModal worker={detailWorker} onClose={() => setDetailWorker(null)} />
      )}
    </ScrollView>
  );
}

function WorkerDetailModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const { fireWorker, chooseBranch, startCertStudy } = useGameStore();
  const config = WORKER_ROLE_CONFIG[worker.role];
  const certIds = worker.certifications.filter(c => c.passed).map(c => c.id);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{config?.icon} {worker.name}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Profile</Text>
        <Text style={styles.detailText}>Role: {config?.name} · {tierLabel(worker.tier)} ({worker.experienceYears.toFixed(1)} yrs exp)</Text>
        <Text style={styles.detailText}>Age: {worker.age} · {worker.nationality} · {worker.contractType}</Text>
        <Text style={styles.detailText}>Wage: ${worker.wagePerDay}/day</Text>
        {worker.personalityRevealed && (
          <Text style={styles.detailText}>
            Work ethic {worker.workEthic}% · Team {worker.teamPlayer}% · Stress threshold {worker.stressThreshold}%
          </Text>
        )}

        <Text style={styles.sectionLabel}>Satisfaction</Text>
        <SatisfactionBar value={worker.satisfaction} />
        {worker.satisfaction < 30 && (
          <Text style={styles.warning}>⚠️ Low satisfaction — quit risk</Text>
        )}

        <Text style={styles.sectionLabel}>Skill Tree</Text>
        {config?.skillTree.map(node => {
          const unlocked = worker.unlockedNodeIds.includes(node.id);
          const hasCert = node.certId ? certIds.includes(node.certId) : false;
          const studying = worker.studyingCertId === node.certId;
          return (
            <View key={node.id} style={[stStyles.node, !unlocked && stStyles.locked]}>
              <Text style={stStyles.nodeText}>
                Tier {node.tier} · {node.name}
                {hasCert ? ' ✅' : node.isCert && unlocked ? ' (cert available)' : ''}
                {studying ? ' 📖' : ''}
              </Text>
              {node.isCert && unlocked && !hasCert && !studying && node.certId && (
                <TouchableOpacity
                  style={stStyles.studyBtn}
                  onPress={() => startCertStudy(worker.id, node.certId!)}
                >
                  <Text style={stStyles.studyBtnText}>Start studying</Text>
                </TouchableOpacity>
              )}
              {node.tier === 3 && node.branchId && !worker.selectedBranch && worker.tier >= 3 && (
                <TouchableOpacity
                  style={stStyles.studyBtn}
                  onPress={() => chooseBranch(worker.id, node.branchId!)}
                >
                  <Text style={stStyles.studyBtnText}>Choose this branch</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.fireBtn}
          onPress={() => { fireWorker(worker.id); onClose(); }}
        >
          <Text style={styles.fireBtnText}>🔴 Fire {worker.name}</Text>
        </TouchableOpacity>
        <View style={{ height: 48 }} />
      </ScrollView>
    </Modal>
  );
}
const stStyles = StyleSheet.create({
  node: { padding: 8, marginBottom: 4, backgroundColor: '#1a2744', borderRadius: 8 },
  locked: { opacity: 0.4 },
  nodeText: { color: C.text, fontSize: 13 },
  studyBtn: { marginTop: 4, backgroundColor: '#1565c0', borderRadius: 6, padding: 6, alignSelf: 'flex-start' },
  studyBtnText: { color: C.white, fontSize: 11, fontWeight: 'bold' },
});

export default function TrabajadoresScreen() {
  const [tab, setTab] = useState<Tab>('staff');
  const { pendingRequests } = useGameStore();
  const requestCount = (pendingRequests ?? []).length;

  return (
    <View style={styles.container}>
      <SubTabBar
        tabs={[
          { id: 'staff', label: 'Staff' },
          { id: 'requests', label: `Requests${requestCount > 0 ? ` (${requestCount})` : ''}` },
          { id: 'hire', label: 'Hire' },
        ]}
        active={tab}
        onChange={(t) => setTab(t as Tab)}
      />
      <View style={styles.content}>
        {tab === 'staff' && <StaffTab />}
        {tab === 'requests' && <RequestsTab />}
        {tab === 'hire' && <HireTab />}
      </View>
    </View>
  );
}

// ── RequestsTab placeholder (Task 6) ─────────────────────────────────────────

function RequestsTab() {
  const { pendingRequests, requestLog, approveRequest, denyRequest } = useGameStore();
  const pending = pendingRequests ?? [];
  const log = requestLog ?? [];
  const [showLog, setShowLog] = useState(false);

  if (pending.length === 0 && log.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.empty}>No pending requests. Charlie is handling things.</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>Needs Your Decision ({pending.length})</Text>
      {pending.map(req => (
        <View key={req.id} style={reqStyles.card}>
          <View style={reqStyles.header}>
            <Text style={reqStyles.icon}>{req.workerIcon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={reqStyles.name}>{req.workerName}</Text>
              {req.urgency === 'urgent' && <Text style={reqStyles.urgent}>⚡ URGENT</Text>}
            </View>
          </View>
          <Text style={reqStyles.message}>{req.message}</Text>
          {req.cost !== undefined && <Text style={reqStyles.cost}>Cost: ${req.cost}</Text>}
          {req.consequence && <Text style={reqStyles.consequence}>If denied: {req.consequence}</Text>}
          <View style={reqStyles.buttons}>
            <TouchableOpacity style={reqStyles.approveBtn} onPress={() => approveRequest(req.id)}>
              <Text style={reqStyles.btnText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={reqStyles.denyBtn} onPress={() => denyRequest(req.id)}>
              <Text style={reqStyles.btnText}>✕ Deny</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.section} onPress={() => setShowLog(!showLog)}>
        <Text style={styles.sectionLabel}>Charlie Handled ({log.length}) {showLog ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showLog && log.map(req => (
        <View key={req.id} style={[reqStyles.card, reqStyles.logCard]}>
          <Text style={reqStyles.message}>{req.workerName}: {req.message}</Text>
          <Text style={reqStyles.sub}>→ {req.resolution}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const reqStyles = StyleSheet.create({
  card: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: S.md, marginBottom: S.sm, marginHorizontal: S.md },
  logCard: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xs },
  icon: { fontSize: 22, marginRight: S.sm },
  name: { color: C.text, fontWeight: 'bold', fontSize: F.size.md },
  urgent: { color: '#ff7043', fontWeight: 'bold', fontSize: 11 },
  message: { color: C.text, fontSize: F.size.sm, marginBottom: S.xs },
  cost: { color: '#ef9a9a', fontSize: 12 },
  consequence: { color: '#ffcc80', fontSize: 11, fontStyle: 'italic' },
  sub: { color: C.textMuted, fontSize: 11 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: S.sm },
  approveBtn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  denyBtn: { flex: 1, backgroundColor: '#b71c1c', borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  btnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.sm },
});

// ── HireTab placeholder (Task 7) ──────────────────────────────────────────────

function HireTab() {
  const { jobPostings, postVacancy, closePosting, hireApplicant, day } = useGameStore();
  const [selectedRole, setSelectedRole] = useState<WorkerRole | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractType>('permanent');
  const [offeredWage, setOfferedWage] = useState(100);
  const openPostings = (jobPostings ?? []).filter(p => !p.closed);
  const allRoles = Object.keys(WORKER_ROLE_CONFIG) as WorkerRole[];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>Post a Vacancy</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Role</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: S.sm }}>
          {allRoles.map(role => {
            const cfg = WORKER_ROLE_CONFIG[role];
            return (
              <TouchableOpacity
                key={role}
                style={[hireStyles.roleChip, selectedRole === role && hireStyles.roleChipSelected]}
                onPress={() => {
                  setSelectedRole(role);
                  setOfferedWage(Math.round((cfg.wageRangeJunior[0] + cfg.wageRangeJunior[1]) / 2));
                }}
              >
                <Text style={hireStyles.roleChipText}>{cfg.icon} {cfg.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.label}>Contract type</Text>
        <View style={hireStyles.contractRow}>
          {(['permanent', 'seasonal', 'casual'] as ContractType[]).map(ct => (
            <TouchableOpacity
              key={ct}
              style={[hireStyles.contractChip, selectedContract === ct && hireStyles.contractChipSelected]}
              onPress={() => setSelectedContract(ct)}
            >
              <Text style={hireStyles.contractText}>{ct}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Offered wage: ${offeredWage}/day</Text>
        <View style={hireStyles.wageRow}>
          <TouchableOpacity style={hireStyles.wageBtn} onPress={() => setOfferedWage(w => Math.max(20, w - 10))}>
            <Text style={hireStyles.wageBtnText}>−10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={hireStyles.wageBtn} onPress={() => setOfferedWage(w => w + 10)}>
            <Text style={hireStyles.wageBtnText}>+10</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.hireBtn, !selectedRole && styles.hireBtnDisabled]}
          disabled={!selectedRole}
          onPress={() => { if (selectedRole) { postVacancy(selectedRole, selectedContract, offeredWage); setSelectedRole(null); } }}
        >
          <Text style={styles.hireBtnText}>Post Vacancy</Text>
        </TouchableOpacity>
      </View>

      {openPostings.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Open Postings</Text>
          {openPostings.map(posting => {
            const cfg = WORKER_ROLE_CONFIG[posting.role];
            const applicantsReady = posting.applicants.length > 0 &&
              (posting.applicantsGeneratedDay == null || day >= posting.applicantsGeneratedDay);
            return (
              <View key={posting.id} style={wcStyles.card}>
                <Text style={wcStyles.name}>{cfg?.icon} {cfg?.name} — ${posting.offeredWage}/day · {posting.contractType}</Text>
                <Text style={wcStyles.sub}>Posted day {posting.postedDay}</Text>
                {!applicantsReady ? (
                  <Text style={wcStyles.sub}>⏳ Waiting for applicants…</Text>
                ) : posting.applicants.length === 0 ? (
                  <Text style={wcStyles.sub}>No applicants this round.</Text>
                ) : (
                  <>
                    <Text style={[wcStyles.sub, { marginTop: S.xs, marginBottom: 4 }]}>Applicants:</Text>
                    {posting.applicants.map(applicant => (
                      <View key={applicant.id} style={hireStyles.applicantCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={wcStyles.name}>{applicant.name}</Text>
                          <Text style={wcStyles.sub}>{applicant.nationality} · {applicant.age}yr · {applicant.experienceYears}yr exp</Text>
                          <Text style={wcStyles.sub}>Asking ${applicant.askingWagePerDay}/day · prefers {applicant.contractPreference}</Text>
                          {applicant.certificationIds.length > 0 && (
                            <Text style={wcStyles.sub}>Certs: {applicant.certificationIds.join(', ')}</Text>
                          )}
                          {applicant.personalityHints.map((h, i) => (
                            <Text key={i} style={wcStyles.sub}>💬 {h}</Text>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={hireStyles.hireBtn}
                          onPress={() => hireApplicant(posting.id, applicant.id)}
                        >
                          <Text style={hireStyles.hireBtnText}>Hire</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
                <TouchableOpacity onPress={() => closePosting(posting.id)}>
                  <Text style={[wcStyles.sub, { color: '#ef9a9a', marginTop: S.xs }]}>Cancel posting</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
const hireStyles = StyleSheet.create({
  roleChip: { backgroundColor: '#1e2a3a', borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  roleChipSelected: { backgroundColor: '#1565c0' },
  roleChipText: { color: C.text, fontSize: 12 },
  contractRow: { flexDirection: 'row', gap: 8, marginBottom: S.sm },
  contractChip: { flex: 1, backgroundColor: '#1e2a3a', borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  contractChipSelected: { backgroundColor: '#1565c0' },
  contractText: { color: C.text, fontSize: 12 },
  wageRow: { flexDirection: 'row', gap: 8, marginBottom: S.sm },
  wageBtn: { backgroundColor: '#1e2a3a', borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 8 },
  wageBtnText: { color: C.text, fontWeight: 'bold' },
  applicantCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0d1a2a', borderRadius: 8, padding: S.sm, marginBottom: 4 },
  hireBtn: { backgroundColor: '#1565c0', borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8, marginLeft: S.sm, alignSelf: 'flex-start' },
  hireBtnText: { color: C.white, fontWeight: 'bold', fontSize: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1 },
  section: { paddingHorizontal: S.md, paddingTop: S.sm },
  sectionLabel: { color: C.textMuted, fontSize: F.size.md, fontWeight: 'bold', paddingHorizontal: S.md, paddingTop: S.lg, paddingBottom: 6 },
  stat: { color: C.text, fontSize: F.size.sm, paddingBottom: 4 },
  empty: { color: '#555', padding: S.lg },
  label: { color: C.textMuted, fontSize: 12, marginBottom: 4 },
  detailText: { color: C.text, fontSize: F.size.sm, paddingHorizontal: S.md, paddingBottom: 4 },
  warning: { color: '#ff7043', fontSize: 12, paddingHorizontal: S.md, marginTop: 4 },
  hireBtn: { backgroundColor: '#1565c0', borderRadius: R.md, padding: S.sm, alignItems: 'center', margin: S.sm },
  hireBtnDisabled: { backgroundColor: '#333' },
  hireBtnText: { color: C.white, fontWeight: 'bold' },
  fireBtn: { backgroundColor: '#b71c1c', borderRadius: R.lg, padding: S.md, margin: S.md, alignItems: 'center' },
  fireBtnText: { color: C.white, fontWeight: 'bold', fontSize: F.size.md },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.md, paddingTop: S.xl },
  modalTitle: { color: C.text, fontWeight: 'bold', fontSize: F.size.xl },
  closeBtn: { color: '#aaa', fontSize: F.size.md },
});
```

- [ ] **Step 2: Check types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Open in browser and test all three tabs**

Run: `npx expo start --web`

Test:
- Staff tab shows Charlie consultant and any hired workers
- Requests tab shows "No pending requests"
- Hire tab: pick a role, set wage, post vacancy → see posting appear with applicants

- [ ] **Step 4: Commit**

```bash
git add "granja-tycoon/app/(tabs)/trabajadores.tsx"
git commit -m "feat(workers): rewrite trabajadores.tsx with Staff/Requests/Hire tabs and worker detail modal"
```

---

## Task 6: Fix hydrogeologist compatibility

The water system checks for workers with `typeId === 'hydrogeologist'`. This needs updating.

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Find and fix the hydrogeologist check**

Find (around line 6712 original):
```typescript
const hasHydro = (state.workers ?? []).some(w => w.typeId === 'hydrogeologist');
```

This was already fixed in Task 3 Step 8. Verify it now reads:
```typescript
const hasHydro = (state.workers ?? []).some(w => w.role === 'hydrogeologist');
```

- [ ] **Step 2: Check the water survey action that assigned hydrogeologist workers**

Search for any other `hydrogeologist` references:

```bash
grep -n "hydrogeologist" granja-tycoon/store/useGameStore.ts
```

Fix any remaining `typeId` references.

- [ ] **Step 3: Check types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "fix(workers): fix hydrogeologist role reference for water system compatibility"
```

---

## Task 7: Personal request generation (pay rises, time off, exam fees)

**Files:**
- Modify: `store/useGameStore.ts` (advanceDay)

- [ ] **Step 1: Add personal request generation to advanceDay**

Inside the workers tick block (after `workerSatisfactionAfterPayroll` is defined), add:

```typescript
// Personal requests (throttled: max 1 per worker at a time)
const personalRequests: WorkerRequest[] = [];
const existingWorkerRequestIds = new Set(newPendingRequests.map(r => r.workerId));

for (const w of workerSatisfactionAfterPayroll) {
  if (existingWorkerRequestIds.has(w.id)) continue;
  const icon = WORKER_ROLE_CONFIG[w.role]?.icon ?? '👷';

  // Pay rise request: satisfaction < 60, every 60 days, random 1% chance/day
  if (w.satisfaction < 60 && Math.random() < 0.01) {
    personalRequests.push({
      id: `req_payrise_${w.id}_${newDay}`,
      workerId: w.id, workerName: w.name, workerIcon: icon,
      type: 'pay_rise',
      message: `${w.name} is asking for a pay rise from $${w.wagePerDay}/day.`,
      cost: Math.round(w.wagePerDay * 0.15),
      consequence: 'Satisfaction will drop if denied.',
      urgency: 'routine',
      postedDay: newDay,
      resolved: false,
    });
    existingWorkerRequestIds.add(w.id);
    continue;
  }

  // Time off request: random 0.3% chance/day
  if (Math.random() < 0.003) {
    personalRequests.push({
      id: `req_timeoff_${w.id}_${newDay}`,
      workerId: w.id, workerName: w.name, workerIcon: icon,
      type: 'time_off',
      message: `${w.name} is asking for 3 days off.`,
      consequence: 'Tasks will be unmanned for 3 days.',
      urgency: 'routine',
      postedDay: newDay,
      resolved: false,
    });
    existingWorkerRequestIds.add(w.id);
    continue;
  }

  // Exam fee request: worker is studying and hasn't paid fee yet
  if (w.isStudying && w.studyingCertId) {
    const cert = w.certifications.find(c => c.id === w.studyingCertId);
    if (cert && !cert.examFeePaid && Math.random() < 0.01) {
      personalRequests.push({
        id: `req_examfee_${w.id}_${newDay}`,
        workerId: w.id, workerName: w.name, workerIcon: icon,
        type: 'exam_fee',
        message: `${w.name} is asking you to cover the exam fee for ${cert.name}.`,
        cost: 400,
        consequence: 'Certification will stall without the exam fee.',
        urgency: 'routine',
        postedDay: newDay,
        resolved: false,
      });
      existingWorkerRequestIds.add(w.id);
    }
  }
}

const allNewRequests = [...poachingRequests, ...reviewRequests, ...personalRequests];
```

- [ ] **Step 2: Check types compile + test**

Run: `npx tsc --noEmit 2>&1 | head -20`

Advance several days. Check that requests appear in the Requests tab. Approve/deny them and verify worker satisfaction changes.

- [ ] **Step 3: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat(workers): add personal request generation (pay rise, time off, exam fee)"
```

---

## Task 8: Satisfaction degradation events (micromanagement, overwork, bad pay)

**Files:**
- Modify: `store/useGameStore.ts` (advanceDay workers tick)

- [ ] **Step 1: Add weekly satisfaction pressure to tickedWorkers**

In the workers tick section, after `tickedWorkers` is created, add a weekly satisfaction pass:

```typescript
const weeklyTickedWorkers = weeklyPayrollDue
  ? tickedWorkers.map(w => {
      let sat = w.satisfaction;
      const satisfactionHistory = [...w.satisfactionHistory];

      // Night shift without premium: −5/week
      if (w.nightShift && w.wagePerDay < Math.round((WORKER_ROLE_CONFIG[w.role]?.wageRangeJunior[1] ?? 100) * 1.25)) {
        sat -= 5;
        satisfactionHistory.push({ day: newDay, delta: -5, reason: 'Night shift without premium' });
      }

      // Underutilized: −2/week (no pinned asset and role needs one)
      if (!w.pinnedAssetId && (w.role === 'tractor_operator' || w.role === 'combine_operator')) {
        sat -= 2;
        satisfactionHistory.push({ day: newDay, delta: -2, reason: 'Underutilized' });
      }

      sat = Math.max(0, Math.min(100, sat));
      return { ...w, satisfaction: sat, satisfactionHistory: satisfactionHistory.slice(-30) };
    })
  : tickedWorkers;
```

Replace the `injuredWorkers` line to use `weeklyTickedWorkers`:
```typescript
const injuredWorkers = weeklyTickedWorkers.map(w => {
```

- [ ] **Step 2: Add strike check**

After `workerSatisfactionAfterPayroll` is defined, add:

```typescript
// Strike check: farm-wide average < 25 for 3+ consecutive days
const avgSatisfaction = workerSatisfactionAfterPayroll.length > 0
  ? workerSatisfactionAfterPayroll.reduce((s, w) => s + w.satisfaction, 0) / workerSatisfactionAfterPayroll.length
  : 100;
// (Strike trigger logic: tracked via consultant event — Charlie escalates this as urgent request when avg < 25)
if (avgSatisfaction < 25 && workerSatisfactionAfterPayroll.length >= 3) {
  const strikeAlreadyPending = (state.pendingRequests ?? []).some(r => r.type === 'disagreement' && r.workerId === 'all');
  if (!strikeAlreadyPending) {
    allNewRequests.push({
      id: `req_strike_${newDay}`,
      workerId: 'all',
      workerName: 'All Staff',
      workerIcon: '⚠️',
      type: 'disagreement',
      message: `Charlie: "The whole team is at breaking point — average satisfaction is ${Math.round(avgSatisfaction)}%. You need to act now before they walk out."`,
      consequence: 'All workers may strike. Farm operations will halt.',
      urgency: 'urgent',
      postedDay: newDay,
      timeoutDay: newDay + 3,
      resolved: false,
    });
  }
}
```

- [ ] **Step 3: Check types + test**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat(workers): add weekly satisfaction degradation and strike check"
```

---

## Task 9: Wire processing building min-workers check

The spec requires: below `minWorkers` → factory paused; at minimum → reduced output; full staff → full output.

**Files:**
- Modify: `store/useGameStore.ts`

- [ ] **Step 1: Check how processing buildings currently use workers**

In `advanceDay`, find the section that processes recipes (search for `PROCESSING_RECIPES`). The `processingOutputMult` from `getWorkerBonuses` already applies. We need to add a minimum headcount check.

Find:
```typescript
const processingOutputMult = workerBonuses.processingOutputMult;
```
(or the equivalent usage)

- [ ] **Step 2: Add minimum-worker check before processing runs**

Before the processing loop, add:

```typescript
const processingStaff = (workerSatisfactionAfterPayroll).filter(w =>
  (w.role === 'processing_tech' || w.role === 'quality_controller') && !w.isInjured && !w.isOnLeave
).length;
// minWorkers = 1 per active processing building (simplified rule)
const activeProcessingBuildings = state.buildings.filter(b => b.startsWith('bld_')).length;
const processingUnderManned = processingStaff === 0 && activeProcessingBuildings > 0;
const processingEfficiency = processingStaff === 0 ? 0 : Math.min(1, processingStaff / Math.max(1, activeProcessingBuildings));
```

Then in the processing output calculation, multiply output by `processingEfficiency`. If `processingUnderManned`, skip the auto-process step.

- [ ] **Step 3: Check types + test**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add granja-tycoon/store/useGameStore.ts
git commit -m "feat(workers): wire processing building min-worker headcount check"
```

---

## Task 10: Final cleanup — update CLAUDE.md save key note and verify

**Files:**
- Modify: `granja-tycoon/CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md save key reference**

Find any mention of `save-v5` or `save-v6` in `granja-tycoon/CLAUDE.md` and update to `save-v7`.

- [ ] **Step 2: Full TypeScript check**

Run: `npx tsc --noEmit`

Expected: 0 errors.

- [ ] **Step 3: Full browser smoke test**

Run: `npx expo start --web`

Test checklist:
- [ ] App loads without console errors
- [ ] Advance a day — no crashes
- [ ] Workers tab loads all three sub-tabs
- [ ] Post a vacancy, wait a day, see applicants, hire one
- [ ] Hired worker appears in Staff tab with satisfaction bar
- [ ] Advance 7 days — weekly payroll is deducted from balance
- [ ] Worker detail modal opens, shows skill tree
- [ ] Requests tab handles approve/deny
- [ ] Existing systems still work (tierras, animales, etc.)

- [ ] **Step 4: Final commit**

```bash
git add granja-tycoon/CLAUDE.md granja-tycoon/store/useGameStore.ts
git commit -m "feat(workers): full workers system — named workers, skill trees, certs, satisfaction, requests, hiring job board, Charlie consultant (save v7)"
```

---

## Spec Coverage Check

| Spec section | Covered by |
|-------------|-----------|
| 15 job roles | Task 1 (WORKER_ROLE_CONFIG) |
| Worker entity (full interface) | Task 1 |
| Consultant (Charlie) | Tasks 2, 3 |
| Skill trees + certifications | Tasks 1, 2, 5 |
| Electrical Engineer cert | Task 1 (farm_mechanic tree) |
| Satisfaction system | Tasks 2, 4, 8 |
| Permission request system | Tasks 4, 5, 7 |
| Hiring job board | Tasks 3, 5 |
| Contract types | Tasks 1, 3 |
| Worker events: injuries | Task 4 |
| Worker events: poaching | Task 4 |
| Worker events: pay rise / time off / exam fee | Task 7 |
| Worker events: performance review | Task 4 |
| Strike system | Task 8 |
| Weekly payroll | Task 4 |
| System integrations: processing min-workers | Task 9 |
| System integrations: animal/machinery bonuses | Task 2 (getWorkerBonuses) |
| Employer reputation | Task 3 (state field) |
| Retirement / aging | Partial — age ticks in Task 4, retirement events not yet wired |
| Team chemistry discovery | Not yet wired — add as follow-up |
| Worker-to-worker communication | Not yet wired — add as follow-up |
| Night shift scheduling | Task 3 (setWorkerNightShift action), Task 8 (satisfaction penalty) |

**Follow-up (post-MVP):** retirement events, team chemistry discovery, disagreement requests, joint tasks, department foreman request filtering.
