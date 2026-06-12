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
  activeLine: boolean;
  density: DensityId;
  autoSave: boolean;
  cursorStyle: CursorStyle;

  setDateDisplayMode: (mode: DateDisplayMode) => void;
  setPalette: (palette: PaletteId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFont: (font: FontId) => void;
  setFontSize: (size: number) => void;
  setDropCap: (on: boolean) => void;
  setActiveLine: (on: boolean) => void;
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
      activeLine: true,
      density: 'regular',
      autoSave: true,
      cursorStyle: 'classic',

      setDateDisplayMode: (mode) => set({ dateDisplayMode: mode }),
      setPalette: (palette) => set({ palette }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setFont: (font) => set({ font }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDropCap: (dropCap) => set({ dropCap }),
      setActiveLine: (activeLine) => set({ activeLine }),
      setDensity: (density) => set({ density }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setCursorStyle: (cursorStyle) => set({ cursorStyle }),
    }),
    {
      name: 'dendrite-settings',
      version: 5,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          return { dateDisplayMode: 'updatedAt', palette: 'onyx', themeMode: 'light', font: 'cormorant', fontSize: 19, dropCap: true, activeLine: true, density: 'regular', autoSave: true, cursorStyle: 'classic' };
        }
        // Migrations apply cumulatively — no early returns, otherwise an old
        // stored version skips every later step.
        const s = { ...(persisted as Partial<SettingsState>) };
        if (version < 3) s.cursorStyle = 'classic';
        if (version < 4) s.cursorStyle = s.cursorStyle === 'classic' ? 'modern' : 'classic';
        if (version < 5) s.activeLine = true;
        return s;
      },
    }
  )
);

// Cross-tab sync: zustand persist only reads localStorage on startup. Without this,
// a second tab keeps its stale in-memory settings and writes them back wholesale on
// its next set(), silently reverting changes made in the other tab (e.g. dropCap).
window.addEventListener('storage', (e) => {
  if (e.key === 'dendrite-settings') useSettingsStore.persist.rehydrate();
});
