import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateDisplayMode = 'updatedAt' | 'createdAt';
export type ThemeId = 'leafGreen' | 'sproutGreen' | 'blossomPink' | 'neuralBlue' | 'synapseCream' | 'pulseOrange' | 'branchBrown' | 'growthBeige' | 'cortexGray';

interface SettingsState {
  dateDisplayMode: DateDisplayMode;
  theme: ThemeId;

  // Actions
  setDateDisplayMode: (mode: DateDisplayMode) => void;
  setTheme: (theme: ThemeId) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default settings
      dateDisplayMode: 'updatedAt',
      theme: 'leafGreen',

      // Actions
      setDateDisplayMode: (mode) => set({ dateDisplayMode: mode }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'dendrite-settings', // localStorage key
    }
  )
);
