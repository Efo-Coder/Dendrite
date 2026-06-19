import { create } from 'zustand';
import { ConstellationGraph } from '../types';
import { constellationService } from '../services/constellation.service';
import { getApiErrorMessage } from '../lib/apiError';

interface ConstellationState {
  graph: ConstellationGraph | null;
  isLoading: boolean;
  error: string | null;

  fetchGraph: () => Promise<void>;
  clearError: () => void;
}

export const useConstellationStore = create<ConstellationState>((set) => ({
  graph: null,
  isLoading: false,
  error: null,

  fetchGraph: async () => {
    set({ isLoading: true, error: null });
    try {
      const graph = await constellationService.getGraph();
      set({ graph, isLoading: false });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Laden der Konstellationen'),
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
