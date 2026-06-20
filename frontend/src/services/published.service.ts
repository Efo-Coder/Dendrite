import api from './api';
import { PublishedNote, PublishedList } from '../types';

export interface PublishInput {
  description: string;
  coverImage: string | null;
  tags: string[];
  topics: string[];
}

export const publishedService = {
  /** Publish a note or refresh its existing publication (snapshot is re-frozen). */
  async publish(noteId: string, input: PublishInput): Promise<PublishedNote> {
    const res = await api.post<{ publication: PublishedNote }>(`/published/notes/${noteId}`, input);
    return res.data.publication;
  },

  /** Remove a note from Browse — the original note stays untouched. */
  async unpublish(noteId: string): Promise<void> {
    await api.delete(`/published/notes/${noteId}`);
  },

  /** Current publication for the owner's note, or null when not published. */
  async getStatus(noteId: string): Promise<PublishedNote | null> {
    const res = await api.get<{ publication: PublishedNote | null }>(
      `/published/notes/${noteId}/status`,
    );
    return res.data.publication;
  },

  /** Recently published notes, paginated. */
  async list(page = 1, limit = 20): Promise<PublishedList> {
    const res = await api.get<PublishedList>('/published', { params: { page, limit } });
    return res.data;
  },

  /** Full published note (with content) for the reading view. */
  async getById(id: string): Promise<PublishedNote> {
    const res = await api.get<{ publication: PublishedNote }>(`/published/${id}`);
    return res.data.publication;
  },
};
