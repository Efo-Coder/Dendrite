import { create } from 'zustand';
import { Folder } from '../types';
import { folderService } from '../services/folder.service';
import { getApiErrorMessage } from '../lib/apiError';

interface FolderState {
  folders: Folder[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFolders: () => Promise<void>;
  createFolder: (data: {
    name: string;
    color?: string;
    icon?: string;
    coverImage?: string | null;
    parentId?: string;
  }) => Promise<Folder>;
  updateFolder: (
    id: string,
    data: {
      name?: string;
      color?: string;
      icon?: string;
      coverImage?: string | null;
      parentId?: string;
    }
  ) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useFolderStore = create<FolderState>((set) => ({
  folders: [],
  isLoading: false,
  error: null,

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const folders = await folderService.getAllFolders();
      set({ folders, isLoading: false });
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Laden der Ordner'),
        isLoading: false,
      });
    }
  },

  createFolder: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const folder = await folderService.createFolder(data);
      set((state) => ({
        folders: [...state.folders, folder],
        isLoading: false,
      }));
      return folder;
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Erstellen des Ordners'),
        isLoading: false,
      });
      throw error;
    }
  },

  updateFolder: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedFolder = await folderService.updateFolder(id, data);
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? updatedFolder : folder
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Aktualisieren des Ordners'),
        isLoading: false,
      });
      throw error;
    }
  },

  deleteFolder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await folderService.deleteFolder(id);
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'Fehler beim Löschen des Ordners'),
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
