import { create } from 'zustand';
import { Reflection } from '../types';
import { reflectionService } from '../services/reflection.service';
import { getApiErrorMessage } from '../lib/apiError';

interface ReflectionState {
  history: Reflection[];
  today: Reflection | null;
  prompt: string;
  date: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchToday: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  saveToday: (content: string) => Promise<void>;
  clearError: () => void;
}

export const useReflectionStore = create<ReflectionState>((set) => ({
  history: [],
  today: null,
  prompt: '',
  date: null,
  isLoading: false,
  error: null,

  fetchToday: async () => {
    set({ isLoading: true, error: null });
    try {
      const { reflection, prompt, date } = await reflectionService.getToday();
      set({ today: reflection, prompt, date, isLoading: false });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Laden der Reflexion'),
        isLoading: false,
      });
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const history = await reflectionService.getReflections();
      set({ history, isLoading: false });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Laden der Reflexionen'),
        isLoading: false,
      });
    }
  },

  saveToday: async (content) => {
    set({ isLoading: true, error: null });
    try {
      const today = await reflectionService.saveToday(content);
      set((state) => ({
        today,
        history: [today, ...state.history.filter((r) => r.id !== today.id)],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Speichern der Reflexion'),
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
