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
  | 'hydrogeologist'
  // Pest & Disease
  | 'crop_consultant';

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
  branchId?: string;
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

  satisfaction: number;
  satisfactionHistory: { day: number; delta: number; reason: string }[];
  isInjured: boolean;
  injuryRecoveryDay?: number;

  workEthic: number;
  teamPlayer: number;
  stressThreshold: number;
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
  relationshipScore: number;
  autonomyLevel: number;
  employerReputation: number;
  isHired: boolean;
  hireCostPerDay: number;
}

export interface WorkerRoleConfig {
  id: WorkerRole;
  name: string;
  icon: string;
  department: WorkerDepartment | null;
  wageRangeJunior: [number, number];
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
  crop_consultant: {
    id: 'crop_consultant', name: 'Crop Consultant', icon: '🔬',
    department: 'fields',
    wageRangeJunior: [150, 200], wageRangeSenior: [250, 350],
    autonomyCeiling: 'high', alwaysPrecertified: true,
    skillTree: [
      { id: 'cc_scout', name: 'Scouting', tier: 1, isCert: false },
      { id: 'cc_ipm', name: 'Integrated Pest Management', tier: 2, isCert: false },
      { id: 'cc_master', name: 'Senior Consultant', tier: 4, isCert: false },
    ],
  },
};

export const WORKER_FIRST_NAMES = [
  'Tom', 'James', 'Pedro', 'Maria', 'Anna', 'Lukasz', 'Dmitri', 'Aoife',
  'Sean', 'Brigid', 'Carlos', 'Elena', 'Mihai', 'Ionut', 'Fatima', 'Yusuf',
  'Patrick', 'Siobhan', 'Andrei', 'Bogdan', 'Cristina', 'Radu', 'Jana',
  'Wojtek', 'Karolina', 'Tibor', 'Attila', 'Eszter', 'Conor', 'Niamh',
];

export const WORKER_LAST_NAMES = [
  'Bradley', 'Murphy', 'Walsh', "O'Brien", 'Ryan', 'Kowalski', 'Novak',
  'Ionescu', 'Popescu', 'Garcia', 'Martinez', 'Ferreira', 'Santos', 'Nagy',
  'Kovács', 'Horváth', 'Szabo', 'Petrov', 'Ivanov', 'Smirnov', 'Byrne',
  'Kelly', "O'Connor", 'McCarthy', 'Fitzgerald', 'Munteanu', 'Stan',
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
