import type { ChoiceEventTemplate } from '../../data/choiceEvents';
import { sellRevenue } from '../../engine/market';
import { CROP_TYPES } from '../../data/cropTypes';
import { SOIL_DEFAULTS } from '../../engine/crops';
import type { ActionFactory } from './types';

export interface ChoiceEventActions {
  resolveChoiceEvent: (optionIndex: number) => void;
}

export const createChoiceEventActions: ActionFactory<ChoiceEventActions> = (set, get) => ({
  resolveChoiceEvent: (optionIndex: number) => {
    const state = get();
    const event = state.pendingChoiceEvent;
    if (!event) return;

    const option = event.options[optionIndex as 0 | 1];
    if (!option) return;

    const effect = option.effect;
    let moneyDelta = effect.money ?? 0;
    let newInventory = { ...state.inventory };
    let newActiveShocks = [...(state.activeShocks ?? [])];

    // Liquidate inventory at a percentage of market price
    if (effect.inventoryLiquidatePct !== undefined) {
      const rate = effect.inventoryLiquidatePct;
      CROP_TYPES.forEach(crop => {
        const qty = newInventory[crop.id] ?? 0;
        if (qty <= 0) return;
        const price = state.prices.find(p => p.cropId === crop.id)?.price ?? crop.basePrice;
        moneyDelta += Math.round(sellRevenue(qty, price) * rate);
        newInventory[crop.id] = 0;
      });
    }

    // Apply price shock
    if (effect.priceShock && effect.priceShock.durationDays > 0) {
      newActiveShocks = [
        ...newActiveShocks,
        {
          ...effect.priceShock,
          remainingDays: effect.priceShock.durationDays,
        },
      ];
    }

    // Apply soil nitrogen boost to all owned parcels
    const soilN = effect.soilNitrogenAll ?? 0;
    const soilOrg = effect.soilOrganicAll ?? 0;
    const newParcels = (soilN !== 0 || soilOrg !== 0)
      ? state.parcels.map(p => {
          if (!p.owned) return p;
          const soil = p.soil ?? SOIL_DEFAULTS;
          return {
            ...p,
            soil: {
              ...soil,
              nitrogen: Math.min(100, (soil.nitrogen ?? 0) + soilN),
              organicMatter: Math.min(10, (soil.organicMatter ?? 0) + soilOrg),
            },
          };
        })
      : state.parcels;

    // Apply reputation delta
    let newReputation = state.reputation;
    if (effect.reputationDelta && newReputation) {
      newReputation = {
        ...newReputation,
        score: Math.max(0, Math.min(100, (newReputation.score ?? 0) + effect.reputationDelta)),
      };
    }

    set({
      pendingChoiceEvent: null,
      firedChoiceEventIds: [...(state.firedChoiceEventIds ?? []), event.id],
      money: state.money + moneyDelta,
      inventory: newInventory,
      parcels: newParcels,
      activeShocks: newActiveShocks,
      reputation: newReputation,
    });
  },
});
