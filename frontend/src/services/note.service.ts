import api from './api';
import { Note, NoteVersion } from '../types';

export const noteService = {
  async getAllNotes(filters?: {
    folderId?: string;
    tagId?: string;
    pinned?: boolean;
    favorite?: boolean;
    archived?: boolean;
    deleted?: boolean;
    shared?: boolean;
  }): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filters?.folderId) params.append('folderId', filters.folderId);
    if (filters?.tagId) params.append('tagId', filters.tagId);
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
    folderId?: string;
    tags?: string[];
  }): Promise<Note> {
    const response = await api.post<{ note: Note }>('/notes', data);
    return response.data.note;
  },

  async updateNote(
    id: string,
    data: {
      title?: string;
      content?: string;
      folderId?: string | null;
      coverImage?: string | null;
      tags?: string[];
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

  async togglePin(id: string): Promise<Note> {
    const response = await api.patch<{ note: Note }>(`/notes/${id}/pin`);
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

  async exportPdf(id: string, title: string): Promise<void> {
    const response = await api.get(`/notes/${id}/export/pdf`, { responseType: 'blob' });
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
