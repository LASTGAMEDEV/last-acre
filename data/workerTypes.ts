export type WorkerDepartment = 'fields' | 'animals' | 'machinery' | 'processing';
export type WorkerTier = 'basic' | 'specialist' | 'standalone';

export type WorkerRole =
  | 'field_worker'
  | 'agronomist'
  | 'botanist'
  | 'animal_keeper'
  | 'zootechnician'
  | 'mechanic'
  | 'engineer'
  | 'processor'
  | 'supervisor'
  | 'vet';

export interface WorkerType {
  id: WorkerRole;
  name: string;
  icon: string;
  dailyWage: number;
  maxCount: number;
  description: string;
  department: WorkerDepartment | null;  // null for standalone (vet)
  tier: WorkerTier;
  requiresBasicId?: WorkerRole;  // specialist unlock requirement
}

export const WORKER_TYPES: WorkerType[] = [
  // ── Fields ──────────────────────────────────────────────────────────────
  {
    id: 'field_worker',
    name: 'Field Worker',
    icon: '👨‍🌾',
    dailyWage: 50,
    maxCount: 5,
    department: 'fields',
    tier: 'basic',
    description: 'Auto-harvests ready plots · +5% crop yield per worker',
  },
  {
    id: 'agronomist',
    name: 'Agronomist',
    icon: '🌱',
    dailyWage: 120,
    maxCount: 2,
    department: 'fields',
    tier: 'specialist',
    requiresBasicId: 'field_worker',
    description: '+15% crop yield · crops grow 1 day faster',
  },
  {
    id: 'botanist',
    name: 'Botanist',
    icon: '🌿',
    dailyWage: 110,
    maxCount: 2,
    department: 'fields',
    tier: 'specialist',
    requiresBasicId: 'field_worker',
    description: '−50% fertility drain · fallow fields recover 2× faster',
  },

  // ── Animals ─────────────────────────────────────────────────────────────
  {
    id: 'animal_keeper',
    name: 'Animal Keeper',
    icon: '🤠',
    dailyWage: 40,
    maxCount: 3,
    department: 'animals',
    tier: 'basic',
    description: 'Auto-collects animal products · +8% production per keeper',
  },
  {
    id: 'zootechnician',
    name: 'Zootechnician',
    icon: '🐄',
    dailyWage: 100,
    maxCount: 2,
    department: 'animals',
    tier: 'specialist',
    requiresBasicId: 'animal_keeper',
    description: '+25% animal production · −30% sickness chance',
  },

  // ── Machinery ────────────────────────────────────────────────────────────
  {
    id: 'mechanic',
    name: 'Mechanic',
    icon: '🔧',
    dailyWage: 70,
    maxCount: 2,
    department: 'machinery',
    tier: 'basic',
    description: '−20% machine maintenance cost per mechanic',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    icon: '⚙️',
    dailyWage: 150,
    maxCount: 1,
    department: 'machinery',
    tier: 'specialist',
    requiresBasicId: 'mechanic',
    description: '−40% machine maintenance · +10% machine yield bonus',
  },

  // ── Processing ───────────────────────────────────────────────────────────
  {
    id: 'processor',
    name: 'Processor',
    icon: '🏭',
    dailyWage: 60,
    maxCount: 3,
    department: 'processing',
    tier: 'basic',
    description: '+10% processing output per worker',
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    icon: '📋',
    dailyWage: 130,
    maxCount: 1,
    department: 'processing',
    tier: 'specialist',
    requiresBasicId: 'processor',
    description: '+25% processing output · auto-processes 1 batch/day',
  },

  // ── Standalone ───────────────────────────────────────────────────────────
  {
    id: 'vet',
    name: 'Veterinarian',
    icon: '👨‍⚕️',
    dailyWage: 80,
    maxCount: 2,
    department: null,
    tier: 'standalone',
    description: 'Auto-treats all sick animals each day',
  },
];
