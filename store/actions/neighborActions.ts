import { updateNeighborRelationship } from '../../features/neighbors/neighborEngine';
import type { NeighborId } from '../../data/neighborData';
import type { ActionFactory } from './types';

export interface NeighborActions {
  visitNeighbor: (id: NeighborId) => void;
  sendNeighborGift: (id: NeighborId, amount: number) => void;
  helpNeighborHarvest: (id: NeighborId) => void;
}

const VISIT_COOLDOWN   = 14;
const GIFT_COOLDOWN    = 30;
const HELP_COOLDOWN    = 60;

const VISIT_REL_BOOST  = 4;
const HELP_REL_BOOST   = 15;

function giftBoost(amount: number): number {
  if (amount >= 500) return 20;
  if (amount >= 200) return 12;
  return 6;
}

function cooldownKey(id: NeighborId, action: string): string {
  return `${id}_${action}`;
}

export const createNeighborActions: ActionFactory<NeighborActions> = (set, get) => ({
  visitNeighbor: (id) => {
    const { day, neighborActionCooldowns = {}, neighbors, money } = get();
    const key = cooldownKey(id, 'visit');
    const lastDay = neighborActionCooldowns[key] ?? 0;
    if (day - lastDay < VISIT_COOLDOWN) return;
    if (!neighbors) return;
    set({
      neighbors: updateNeighborRelationship(neighbors, id, VISIT_REL_BOOST),
      neighborActionCooldowns: { ...neighborActionCooldowns, [key]: day },
    });
  },

  sendNeighborGift: (id, amount) => {
    const { day, neighborActionCooldowns = {}, neighbors, money } = get();
    const key = cooldownKey(id, 'gift');
    const lastDay = neighborActionCooldowns[key] ?? 0;
    if (day - lastDay < GIFT_COOLDOWN) return;
    if (!neighbors || money < amount) return;
    set({
      money: money - amount,
      neighbors: updateNeighborRelationship(neighbors, id, giftBoost(amount)),
      neighborActionCooldowns: { ...neighborActionCooldowns, [key]: day },
    });
  },

  helpNeighborHarvest: (id) => {
    const { day, neighborActionCooldowns = {}, neighbors } = get();
    const key = cooldownKey(id, 'help');
    const lastDay = neighborActionCooldowns[key] ?? 0;
    if (day - lastDay < HELP_COOLDOWN) return;
    if (!neighbors) return;
    const farm = (neighbors as any)[id];
    if (!farm || farm.status === 'bankrupt' || farm.status === 'sold') return;
    set({
      neighbors: updateNeighborRelationship(neighbors, id, HELP_REL_BOOST),
      neighborActionCooldowns: { ...neighborActionCooldowns, [key]: day },
    });
  },
});
