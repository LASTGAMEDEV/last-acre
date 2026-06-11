export type Difficulty = 'relaxed' | 'standard' | 'hard';

export interface DifficultyConfig {
  label: string;
  description: string;
  disasterFreqMult: number;
  weatherDamageMult: number;
  fireChanceMult: number;
  pestChanceMult: number;
  weedChanceMult: number;
  priceVolatilityMult: number;
  loanInterestMult: number;
  maintenanceCostMult: number;
  workerWagesMult: number;
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
  relaxed: {
    label: 'Relaxed',
    description: 'Fewer disasters, lower loan rates, gentler market swings.',
    disasterFreqMult:   0.35,
    weatherDamageMult:  0.40,
    fireChanceMult:     0.20,
    pestChanceMult:     0.40,
    weedChanceMult:     0.40,
    priceVolatilityMult: 0.60,
    loanInterestMult:   0.60,
    maintenanceCostMult: 0.70,
    workerWagesMult:    0.80,
  },
  standard: {
    label: 'Standard',
    description: 'Balanced challenge with realistic farm economics.',
    disasterFreqMult:   1.00,
    weatherDamageMult:  1.00,
    fireChanceMult:     1.00,
    pestChanceMult:     1.00,
    weedChanceMult:     1.00,
    priceVolatilityMult: 1.00,
    loanInterestMult:   1.00,
    maintenanceCostMult: 1.00,
    workerWagesMult:    1.00,
  },
  hard: {
    label: 'Hard',
    description: 'Frequent disasters, higher interest, volatile markets.',
    disasterFreqMult:   1.60,
    weatherDamageMult:  1.50,
    fireChanceMult:     2.00,
    pestChanceMult:     1.50,
    weedChanceMult:     1.50,
    priceVolatilityMult: 1.60,
    loanInterestMult:   1.50,
    maintenanceCostMult: 1.30,
    workerWagesMult:    1.20,
  },
};

export function getDifficultyConfig(d: Difficulty = 'standard'): DifficultyConfig {
  return CONFIGS[d] ?? CONFIGS.standard;
}
