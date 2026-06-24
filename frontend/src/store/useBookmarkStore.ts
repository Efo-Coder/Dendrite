import { create } from 'zustand';
import { Bookmark } from '../types';
import { bookmarkService } from '../services/bookmark.service';
import { getApiErrorMessage } from '../lib/apiError';

interface BookmarkState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBookmarks: () => Promise<void>;
  createBookmark: (data: { name: string; color?: string }) => Promise<Bookmark>;
  updateBookmark: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  bookmarks: [],
  isLoading: false,
  error: null,

  fetchBookmarks: async () => {
    set({ isLoading: true, error: null });
    try {
      const bookmarks = await bookmarkService.getAllBookmarks();
      set({ bookmarks, isLoading: false });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Laden der Bookmarks'),
        isLoading: false,
      });
    }
  },

  createBookmark: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const bookmark = await bookmarkService.createBookmark(data);
      set((state) => ({
        bookmarks: [...state.bookmarks, bookmark],
        isLoading: false,
      }));
      return bookmark;
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Erstellen des Bookmarks'),
        isLoading: false,
      });
      throw error;
    }
  },

  updateBookmark: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBookmark = await bookmarkService.updateBookmark(id, data);
      set((state) => ({
        bookmarks: state.bookmarks.map((bookmark) => (bookmark.id === id ? updatedBookmark : bookmark)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Aktualisieren des Bookmarks'),
        isLoading: false,
      });
      throw error;
    }
  },

  deleteBookmark: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await bookmarkService.deleteBookmark(id);
      set((state) => ({
        bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Löschen des Bookmarks'),
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
