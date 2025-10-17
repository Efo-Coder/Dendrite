import { create } from 'zustand';
import { Tag } from '../types';
import { tagService } from '../services/tag.service';

interface TagState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTags: () => Promise<void>;
  createTag: (data: { name: string; color?: string }) => Promise<Tag>;
  updateTag: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await tagService.getAllTags();
      set({ tags, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Laden der Tags',
        isLoading: false,
      });
    }
  },

  createTag: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const tag = await tagService.createTag(data);
      set((state) => ({
        tags: [...state.tags, tag],
        isLoading: false,
      }));
      return tag;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Erstellen des Tags',
        isLoading: false,
      });
      throw error;
    }
  },

  updateTag: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTag = await tagService.updateTag(id, data);
      set((state) => ({
        tags: state.tags.map((tag) => (tag.id === id ? updatedTag : tag)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Aktualisieren des Tags',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteTag: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await tagService.deleteTag(id);
      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Löschen des Tags',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
