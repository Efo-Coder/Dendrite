import { create } from 'zustand';
import { Note } from '../types';
import { noteService } from '../services/note.service';

interface NoteState {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotes: (filters?: {
    folderId?: string;
    tagId?: string;
    pinned?: boolean;
    favorite?: boolean;
    archived?: boolean;
    deleted?: boolean;
  }) => Promise<void>;
  fetchNoteById: (id: string) => Promise<void>;
  createNote: (data: {
    title: string;
    content: string;
    folderId?: string;
    tags?: string[];
  }) => Promise<Note>;
  updateNote: (
    id: string,
    data: {
      title?: string;
      content?: string;
      folderId?: string;
      tags?: string[];
    }
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  toggleTrash: (id: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,

  fetchNotes: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await noteService.getAllNotes(filters);
      set({ notes, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Laden der Notizen',
        isLoading: false,
      });
    }
  },

  fetchNoteById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const note = await noteService.getNoteById(id);
      set({ currentNote: note, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Notiz nicht gefunden',
        isLoading: false,
      });
    }
  },

  createNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const note = await noteService.createNote(data);
      set((state) => ({
        notes: [note, ...state.notes],
        currentNote: note,
        isLoading: false,
      }));
      return note;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Erstellen der Notiz',
        isLoading: false,
      });
      throw error;
    }
  },

  updateNote: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedNote = await noteService.updateNote(id, data);
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Aktualisieren der Notiz',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await noteService.deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Löschen der Notiz',
        isLoading: false,
      });
      throw error;
    }
  },

  searchNotes: async (query: string) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await noteService.searchNotes(query);
      set({ notes, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler bei der Suche',
        isLoading: false,
      });
    }
  },

  togglePin: async (id: string) => {
    try {
      const updatedNote = await noteService.togglePin(id);
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Pinnen der Notiz',
      });
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const updatedNote = await noteService.toggleFavorite(id);
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Favorisieren der Notiz',
      });
    }
  },

  toggleArchive: async (id: string) => {
    try {
      const updatedNote = await noteService.toggleArchive(id);
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Archivieren der Notiz',
      });
    }
  },

  toggleTrash: async (id: string) => {
    try {
      const updatedNote = await noteService.toggleTrash(id);
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Fehler beim Verschieben in den Papierkorb',
      });
    }
  },

  setCurrentNote: (note) => set({ currentNote: note }),
  clearError: () => set({ error: null }),
}));
