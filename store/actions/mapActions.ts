import type { MapOwner } from '../../types/worldMap';
import type { ActionFactory } from './types';

export interface MapActions {
  selectMapField: (id: string | null) => void;
  savePanZoom: (x: number, y: number, zoom: number) => void;
  buyMapField: (id: string) => void;
  scoutMapField: (id: string) => void;
}

export const createMapActions: ActionFactory<MapActions> = (set, get) => ({
  selectMapField: (id) => set({ selectedMapFieldId: id }),

  savePanZoom: (x, y, zoom) => set({ mapPanX: x, mapPanY: y, mapZoom: zoom }),

  buyMapField: (id) => {
    const state = get();
    const field = state.mapFields.find(f => f.id === id);
    if (!field || field.owner !== 'forsale' || !field.askingPrice) return;
    if (state.money < field.askingPrice) return;
    const parcelId = `p-${id}`;
    set({
      money: state.money - field.askingPrice,
      parcels: state.parcels.map(p =>
        p.id === parcelId ? { ...p, owned: true } : p
      ),
      mapFields: state.mapFields.map(f =>
        f.id === id ? { ...f, owner: 'player' as MapOwner, parcelId } : f
      ),
    });
  },

  scoutMapField: (id) => {
    const state = get();
    const field = state.mapFields.find(f => f.id === id);
    if (!field || field.owner === 'player' || field.owner === 'forsale') return;
    if (state.money < 500) return;
    set({
      money: state.money - 500,
      mapFields: state.mapFields.map(f =>
        f.id === id ? { ...f, scouted: true, scoutExpiresDay: state.day + 30 } : f
      ),
    });
  },
});
