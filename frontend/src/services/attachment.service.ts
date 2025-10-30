import api from './api';
import { Attachment } from '../types';

export const attachmentService = {
  // Einfacher Image-Upload für Editor-Bilder (keine Attachment-DB-Einträge)
  async uploadImage(file: File): Promise<{ url: string; filename: string; fileType: string; fileSize: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ url: string; filename: string; fileType: string; fileSize: number }>(
      '/upload/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async uploadAttachment(file: File, noteId: string): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('noteId', noteId);

    const response = await api.post<Attachment>('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getAttachmentsByNoteId(noteId: string): Promise<Attachment[]> {
    const response = await api.get<Attachment[]>(`/attachments/note/${noteId}`);
    return response.data;
  },

  async deleteAttachment(id: string): Promise<void> {
    await api.delete(`/attachments/${id}`);
  },

  getAttachmentUrl(url: string): string {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${API_URL}${url}`;
  },
};
