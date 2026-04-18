export type InsuranceType = 'clima' | 'plaga' | 'incendio' | 'maquinaria';

export interface InsurancePlan {
  type: InsuranceType;
  name: string;
  icon: string;
  description: string;
  premiumPerDay: number;
  coveragePercent: number;
  triggerEvents: string[];
  perHa?: boolean;
  ratePerHaPerDay?: number;
}

export const INSURANCE_PLANS: InsurancePlan[] = [
  {
    type: 'clima',
    name: 'Weather Insurance',
    icon: '🌦️',
    description: 'Covers crop destruction from all extreme weather: drought, frost, hail, and heatwave. Reimburses the estimated value of the lost harvest.',
    premiumPerDay: 0,
    ratePerHaPerDay: 0.18,
    perHa: true,
    coveragePercent: 0.70,
    triggerEvents: ['drought', 'frost', 'hail', 'weather_frost', 'weather_heatwave', 'weather_hailstorm'],
  },
  {
    type: 'plaga',
    name: 'Pest Insurance',
    icon: '🐛',
    description: 'Pays compensation for pest or disease events on your plots, including random pest outbreak events.',
    premiumPerDay: 0,
    ratePerHaPerDay: 0.08,
    perHa: true,
    coveragePercent: 0.60,
    triggerEvents: ['pest', 'disease', 'pest_outbreak'],
  },
  {
    type: 'incendio',
    name: 'Fire Insurance',
    icon: '🔥',
    description: 'Covers total crop destruction by fire. Higher coverage as it is the most catastrophic event.',
    premiumPerDay: 0,
    ratePerHaPerDay: 0.16,
    perHa: true,
    coveragePercent: 0.85,
    triggerEvents: ['fire'],
  },
  {
    type: 'maquinaria',
    name: 'Machinery Insurance',
    icon: '⚙️',
    description: 'Covers repair costs from equipment failure events. Payout scales with the repair cost.',
    premiumPerDay: 12,
    perHa: false,
    coveragePercent: 0.75,
    triggerEvents: ['equipment_failure'],
  },
];
