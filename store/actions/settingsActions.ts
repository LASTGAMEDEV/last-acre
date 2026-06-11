import type { Difficulty } from '../../engine/difficulty';
import type { ActionFactory } from './types';

export interface SettingsActions {
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setDifficulty: (d: Difficulty) => void;
}

export const createSettingsActions: ActionFactory<SettingsActions> = (set) => ({
  setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
  setHapticEnabled: (enabled: boolean) => set({ hapticEnabled: enabled }),
  setMusicEnabled: (enabled: boolean) => set({ musicEnabled: enabled }),
  setDifficulty: (d: Difficulty) => set({ difficulty: d }),
});
