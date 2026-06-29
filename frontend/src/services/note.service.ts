import api from './api';
import { Note, NoteVersion } from '../types';
import { PaletteId, DensityId } from '../store/useSettingsStore';

// 'white' = plain white paper (a "normal" PDF); 'light'/'dark' use the themed page bg.
export type PdfTheme = 'light' | 'dark' | 'white';

// Appearance applied to the rendered PDF. Theme defaults to light; the rest mirror
// the user's editor settings so the export matches what they see 1:1.
export interface PdfExportOptions {
  theme: PdfTheme;
  palette: PaletteId;
  font: string | null;
  fontSize: number;
  density: DensityId;
}

export const noteService = {
  async getAllNotes(filters?: {
    spaceId?: string;
    folderId?: string;
    bookmarkId?: string;
    pinned?: boolean;
    favorite?: boolean;
    archived?: boolean;
    deleted?: boolean;
    shared?: boolean;
  }): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filters?.spaceId) params.append('spaceId', filters.spaceId);
    if (filters?.folderId) params.append('folderId', filters.folderId);
    if (filters?.bookmarkId) params.append('bookmarkId', filters.bookmarkId);
    if (filters?.pinned !== undefined) params.append('pinned', String(filters.pinned));
    if (filters?.favorite !== undefined) params.append('favorite', String(filters.favorite));
    if (filters?.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters?.deleted !== undefined) params.append('deleted', String(filters.deleted));
    if (filters?.shared) params.append('shared', 'true');

    const response = await api.get<{ notes: Note[] }>(`/notes?${params.toString()}`);
    return response.data.notes;
  },

  async getNoteById(id: string): Promise<Note> {
    const response = await api.get<{ note: Note }>(`/notes/${id}`);
    return response.data.note;
  },

  async createNote(data: {
    title: string;
    content: string;
    spaceId?: string;
    folderId?: string;
    coverImage?: string | null;
    bookmarks?: string[];
  }): Promise<Note> {
    const response = await api.post<{ note: Note }>('/notes', data);
    return response.data.note;
  },

  async updateNote(
    id: string,
    data: {
      title?: string;
      content?: string;
      spaceId?: string | null;
      folderId?: string | null;
      coverImage?: string | null;
      bookmarks?: string[];
    }
  ): Promise<Note> {
    const response = await api.put<{ note: Note }>(`/notes/${id}`, data);
    return response.data.note;
  },

  async deleteNote(id: string): Promise<void> {
    await api.delete(`/notes/${id}`);
  },

  async searchNotes(query: string): Promise<Note[]> {
    const response = await api.get<{ notes: Note[] }>(`/notes/search?q=${encodeURIComponent(query)}`);
    return response.data.notes;
  },

  // shared=true: pin in the collaborations view (a per-user override, even for owned notes).
  async togglePin(id: string, shared?: boolean): Promise<Note> {
    const response = await api.patch<{ note: Note }>(`/notes/${id}/pin`, shared ? { context: 'shared' } : undefined);
    return response.data.note;
  },

  async toggleFavorite(id: string): Promise<Note> {
    const response = await api.patch<{ note: Note }>(`/notes/${id}/favorite`);
    return response.data.note;
  },

  async toggleArchive(id: string): Promise<Note> {
    const response = await api.patch<{ note: Note }>(`/notes/${id}/archive`);
    return response.data.note;
  },

  async toggleTrash(id: string): Promise<Note> {
    const response = await api.patch<{ note: Note }>(`/notes/${id}/trash`);
    return response.data.note;
  },

  async reorderNotes(
    noteOrders: { id: string; order: number }[],
    contextType: string,
    contextId?: string | null
  ): Promise<void> {
    await api.post('/notes/reorder', { noteOrders, contextType, contextId });
  },

  async getNoteVersions(id: string): Promise<{ versions: NoteVersion[]; plan: string }> {
    const response = await api.get<{ versions: NoteVersion[]; plan: string }>(`/notes/${id}/versions`);
    return response.data;
  },

  async restoreNoteVersion(id: string, versionId: string): Promise<Note> {
    const response = await api.post<{ note: Note }>(`/notes/${id}/versions/${versionId}/restore`);
    return response.data.note;
  },

  async exportPdf(id: string, title: string, opts: PdfExportOptions): Promise<void> {
    const params = new URLSearchParams({
      theme: opts.theme,
      palette: opts.palette,
      fontSize: String(opts.fontSize),
      density: opts.density,
    });
    if (opts.font) params.append('font', opts.font);
    const response = await api.get(`/notes/${id}/export/pdf?${params.toString()}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Note'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
