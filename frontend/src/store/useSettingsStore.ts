import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateDisplayMode = 'updatedAt' | 'createdAt';
export type PaletteId = 'onyx' | 'bordeaux' | 'forest' | 'midnight' | 'obsidian' | 'nacre';
export type ThemeMode = 'light' | 'dark';
export type FontId = 'cormorant' | 'eb-garamond' | 'mixed';
export type DensityId = 'compact' | 'regular' | 'comfy';
export type CursorStyle = 'classic' | 'modern';

interface SettingsState {
  dateDisplayMode: DateDisplayMode;
  palette: PaletteId;
  themeMode: ThemeMode;
  font: FontId;
  fontSize: number;
  dropCap: boolean;
  density: DensityId;
  autoSave: boolean;
  cursorStyle: CursorStyle;

  setDateDisplayMode: (mode: DateDisplayMode) => void;
  setPalette: (palette: PaletteId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFont: (font: FontId) => void;
  setFontSize: (size: number) => void;
  setDropCap: (on: boolean) => void;
  setDensity: (density: DensityId) => void;
  setAutoSave: (on: boolean) => void;
  setCursorStyle: (style: CursorStyle) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dateDisplayMode: 'updatedAt',
      palette: 'onyx',
      themeMode: 'light',
      font: 'cormorant',
      fontSize: 19,
      dropCap: true,
      density: 'regular',
      autoSave: true,
      cursorStyle: 'classic',

      setDateDisplayMode: (mode) => set({ dateDisplayMode: mode }),
      setPalette: (palette) => set({ palette }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setFont: (font) => set({ font }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDropCap: (dropCap) => set({ dropCap }),
      setDensity: (density) => set({ density }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setCursorStyle: (cursorStyle) => set({ cursorStyle }),
    }),
    {
      name: 'dendrite-settings',
      version: 4,
      migrate: (_: any, version: number) => {
        if (version < 2) {
          return { dateDisplayMode: 'updatedAt', palette: 'onyx', themeMode: 'light', font: 'cormorant', fontSize: 19, dropCap: true, density: 'regular', autoSave: true, cursorStyle: 'classic' };
        }
        if (version < 3) return { ..._, cursorStyle: 'classic' };
        if (version < 4) {
          const oldStyle = _?.cursorStyle;
          return { ..._, cursorStyle: oldStyle === 'classic' ? 'modern' : 'classic' };
        }
        return _;
      },
    }
  )
);
