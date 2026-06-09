import type { StoreApi } from 'zustand';
import type { GameState } from '../../types/domain/gameState';

export type GameSet = StoreApi<GameState>['setState'];
export type GameGet = StoreApi<GameState>['getState'];

export type ActionFactory<TActions> = (set: GameSet, get: GameGet) => TActions;
