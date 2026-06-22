import { create } from 'zustand';
import { Space } from '../types';
import { spaceService } from '../services/space.service';
import { getApiErrorMessage } from '../lib/apiError';
import { getCachedList, setCachedList } from '../lib/listCache';

// Cached so Home/Spaces render immediately on reload.
const SPACES_CACHE = 'store:spaces';

interface SpaceState {
  spaces: Space[];
  isLoading: boolean;
  error: string | null;

  fetchSpaces: () => Promise<void>;
  createSpace: (data: { name: string; color?: string; icon?: string; coverImage?: string | null }) => Promise<Space>;
  updateSpace: (id: string, data: { name?: string; color?: string; icon?: string; coverImage?: string | null }) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  reorderSpaces: (ordered: Space[]) => void;
}

export const useSpaceStore = create<SpaceState>((set) => ({
  spaces: getCachedList<Space>(SPACES_CACHE) ?? [],
  isLoading: false,
  error: null,

  fetchSpaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const spaces = await spaceService.getAllSpaces();
      setCachedList(SPACES_CACHE, spaces);
      set({ spaces, isLoading: false });
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Fehler beim Laden der Spaces'), isLoading: false });
    }
  },

  createSpace: async (data) => {
    try {
      const space = await spaceService.createSpace(data);
      set((state) => ({ spaces: [space, ...state.spaces] }));
      return space;
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Fehler beim Erstellen des Space') });
      throw error;
    }
  },

  updateSpace: async (id, data) => {
    const updated = await spaceService.updateSpace(id, data);
    set((state) => ({ spaces: state.spaces.map((s) => (s.id === id ? updated : s)) }));
  },

  deleteSpace: async (id) => {
    await spaceService.deleteSpace(id);
    set((state) => ({ spaces: state.spaces.filter((s) => s.id !== id) }));
  },

  // Optimistic reorder: apply locally, then persist.
  reorderSpaces: (ordered) => {
    set({ spaces: ordered });
    spaceService.reorderSpaces(ordered.map((s, i) => ({ id: s.id, order: i }))).catch(() => {});
  },
}));
