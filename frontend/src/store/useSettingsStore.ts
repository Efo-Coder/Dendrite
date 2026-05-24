import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateDisplayMode = 'updatedAt' | 'createdAt';
export type ThemeId = 'sproutGreen' | 'blossomPink' | 'neuralBlue' | 'synapseCream' | 'pulseOrange' | 'branchBrown' | 'growthBeige' | 'cortexGray';
export type ThemeMode = 'light' | 'dark';

interface SettingsState {
  dateDisplayMode: DateDisplayMode;
  theme: ThemeId;
  themeMode: ThemeMode;
  showFocusTimer: boolean;

  // Actions
  setDateDisplayMode: (mode: DateDisplayMode) => void;
  setTheme: (theme: ThemeId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setShowFocusTimer: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default settings
      dateDisplayMode: 'updatedAt',
      theme: 'sproutGreen',
      themeMode: 'dark',
      showFocusTimer: true,

      // Actions
      setDateDisplayMode: (mode) => set({ dateDisplayMode: mode }),
      setTheme: (theme) => set({ theme }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setShowFocusTimer: (show) => set({ showFocusTimer: show }),
    }),
    {
      name: 'dendrite-settings', // localStorage key
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Migration für leafGreen -> sproutGreen mit Dark Mode
        if (version === 0 && persistedState.theme === 'leafGreen') {
          return {
            ...persistedState,
            theme: 'sproutGreen',
            themeMode: 'dark',
          };
        }
        return persistedState;
      },
    }
  )
);
