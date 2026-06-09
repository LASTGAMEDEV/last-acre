import type { InsuranceType } from '../../data/insuranceTypes';

export interface FuturesPosition {
  id: string;
  cropId: string;
  quantity: number;
  lockPrice: number;
  deliveryDay: number;
  createdDay: number;
  settled: boolean;
}

export interface MarketOrder {
  id: string;
  cropId: string;
  quantity: number;
  targetPrice: number;
  createdDay: number;
  expiresDay: number;
  status: 'active' | 'executed' | 'expired' | 'cancelled';
  executedDay?: number;
  executedRevenue?: number;
}

export interface SeasonGoal {
  id: string;
  icon: string;
  label: string;
  type: 'earn' | 'harvest_count' | 'own_ha';
  target: number;
  reward: number;
  claimed?: boolean;
}

export interface InsurancePolicy {
  id: string;
  type: InsuranceType;
  startDay: number;
  active: boolean;
}

export interface InsuranceClaim {
  id: string;
  day: number;
  type: InsuranceType;
  payout: number;
  description: string;
}

export interface RivalNewsItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  day: number;
}

export interface PriceAlert {
  id: string;
  cropId: string;
  targetPrice: number;
  direction: 'above' | 'below';
}
