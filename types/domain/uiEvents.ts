import type { GameEventType } from '../../data/randomEvents';

export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  description: string;
  icon: string;
  expiresDay: number;
  affectedIds?: string[];
  modifier?: number;
}

export interface FieldEvent {
  id: string;
  parcelId: string;
  type: 'disease' | 'pest';
  startDay: number;
  resolved: boolean;
}

export interface DaySummaryEvent {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  severity: 'info' | 'good' | 'warning' | 'danger';
}

export interface FairEvent {
  id: string;
  daysRemaining: number;
  discount: number;
}
