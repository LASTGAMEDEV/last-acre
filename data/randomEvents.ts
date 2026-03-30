export type GameEventType =
  | 'weather_frost'
  | 'weather_heatwave'
  | 'weather_hailstorm'
  | 'pest_outbreak'
  | 'market_surge'
  | 'equipment_failure'
  | 'animal_illness'
  | 'windfall_subsidy'
  | 'windfall_soil'
  | 'windfall_harvest';

export interface GameEventTemplate {
  id: string;
  type: GameEventType;
  icon: string;
  title: string;
  description: string;
  durationDays: number; // 0 = one-shot (equipment_failure creates a MachineRepair instead)
  weight: number;       // relative probability
  modifier?: number;    // yield/price multiplier where applicable
}

export const RANDOM_EVENT_TEMPLATES: GameEventTemplate[] = [
  // ── Weather extremes ────────────────────────────────────────────────────────
  {
    id: 'e01', type: 'weather_frost',     icon: '🧊',
    title: 'Sudden Frost',
    description: 'An unexpected frost damages exposed crops.',
    durationDays: 3, weight: 10, modifier: 0.50,
  },
  {
    id: 'e02', type: 'weather_heatwave',  icon: '🥵',
    title: 'Heatwave',
    description: 'Extreme heat stresses crops and reduces yield.',
    durationDays: 5, weight: 8, modifier: 0.65,
  },
  {
    id: 'e03', type: 'weather_hailstorm', icon: '🌨️',
    title: 'Hailstorm',
    description: 'Hail batters several parcels, cutting yields.',
    durationDays: 2, weight: 6, modifier: 0.40,
  },
  // ── Pest / disease ──────────────────────────────────────────────────────────
  {
    id: 'e04', type: 'pest_outbreak',     icon: '🦗',
    title: 'Pest Outbreak',
    description: 'A pest surge hits your fields. Crop value and yield reduced for affected crop.',
    durationDays: 7, weight: 12, modifier: 0.50,
  },
  // ── Market ──────────────────────────────────────────────────────────────────
  {
    id: 'e05', type: 'market_surge',      icon: '📈',
    title: 'Demand Shock',
    description: "A sudden surge in demand spikes a crop's price.",
    durationDays: 4, weight: 10, modifier: 1.60,
  },
  // ── Equipment ───────────────────────────────────────────────────────────────
  {
    id: 'e06', type: 'equipment_failure', icon: '⚙️',
    title: 'Equipment Failure',
    description: 'A machine breaks down and needs repair. Machine runs at half bonus until fixed.',
    durationDays: 0, weight: 8,
    // durationDays 0: does NOT push to activeEvents — creates a MachineRepair entry instead
  },
  // ── Animal ──────────────────────────────────────────────────────────────
  {
    id: 'e07', type: 'animal_illness',    icon: '🐄',
    title: 'Animal Illness',
    description: 'One of your animals falls ill regardless of hardiness.',
    durationDays: 5, weight: 6,
  },
  // ── Windfall ────────────────────────────────────────────────────────────────
  {
    id: 'e08', type: 'windfall_subsidy',  icon: '🍀',
    title: 'Government Subsidy',
    description: 'A surprise government subsidy boosts your cash reserves.',
    durationDays: 1, weight: 5, modifier: 2500, // modifier = flat cash amount
  },
  {
    id: 'e09', type: 'windfall_soil',     icon: '🌱',
    title: 'Bumper Soil Conditions',
    description: 'Exceptional soil conditions boost yield on your planted plots.',
    durationDays: 7, weight: 4, modifier: 1.25,
  },
  {
    id: 'e10', type: 'windfall_harvest',  icon: '🎯',
    title: 'Lucky Harvest Bonus',
    description: 'Exceptional conditions grant a surprise yield bonus on all plots.',
    durationDays: 5, weight: 4, modifier: 1.30,
  },
];
