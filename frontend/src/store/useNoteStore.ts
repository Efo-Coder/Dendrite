import { create } from 'zustand';
import { Note, NoteCounts } from '../types';
import { noteService } from '../services/note.service';

interface NoteState {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
  noteCounts: NoteCounts;
  justCreatedNoteIds: string[];

  // Actions
  fetchNoteCounts: () => Promise<void>;
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
    title?: string;
    content: string;
    folderId?: string;
    tags?: string[];
  }) => Promise<Note>;
  updateNote: (
    id: string,
    data: {
      title?: string;
      content?: string;
      folderId?: string | null;
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
  clearJustCreatedNoteIds: () => void;
  setNoteTitleOptimistic: (id: string, title: string) => void;
  updateNoteInStore: (note: Note) => void;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,
  noteCounts: { all: 0, favorites: 0, archive: 0, trash: 0, shared: 0, pendingInvitations: 0 },
  justCreatedNoteIds: [],

  fetchNoteCounts: async () => {
    try {
      const res = await noteService.getNoteCounts();
      set({ noteCounts: res });
    } catch {}
  },

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
      const note = await noteService.createNote({
        title: data.title ?? '',
        content: data.content,
        folderId: data.folderId,
        tags: data.tags,
      });
      // currentNote wird bewusst NICHT hier gesetzt — die DashboardPage öffnet den Editor
      // erst nach der Listen-Animation (Editor-Mount blockiert sonst den Main-Thread)
      set((state) => ({
        notes: [note, ...state.notes],
        justCreatedNoteIds: [note.id, ...state.justCreatedNoteIds],
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
    // Optimistic update so the editor never reads stale content/title when switching notes quickly
    const optimistic: { title?: string; content?: string } = {};
    if (data.title !== undefined) optimistic.title = data.title;
    if (data.content !== undefined) optimistic.content = data.content;

    set((state) => ({
      isLoading: true,
      error: null,
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...optimistic } : note
      ),
      currentNote:
        state.currentNote?.id === id
          ? { ...state.currentNote, ...optimistic }
          : state.currentNote,
    }));

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
        currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
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
        currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
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
  clearJustCreatedNoteIds: () => set({ justCreatedNoteIds: [] }),
  setNoteTitleOptimistic: (id, title) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, title } : n)),
    })),
  updateNoteInStore: (note) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? note : n)),
      currentNote: state.currentNote?.id === note.id ? note : state.currentNote,
    })),
  clearError: () => set({ error: null }),
}));
