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

  /** Published notes, paginated. Optional author/search/topic/recency/length filters. */
  async list(
    opts: {
      page?: number;
      limit?: number;
      author?: string;
      q?: string;
      topic?: string;
      days?: number;
      maxReadingTime?: number;
    } = {},
  ): Promise<PublishedList> {
    const { page = 1, limit = 20, author, q, topic, days, maxReadingTime } = opts;
    const res = await api.get<PublishedList>('/published', {
      params: { page, limit, author, q, topic, days, maxReadingTime },
    });
    return res.data;
  },

  /** Full published note (with content) for the reading view. */
  async getById(id: string): Promise<PublishedNote> {
    const res = await api.get<{ publication: PublishedNote }>(`/published/${id}`);
    return res.data.publication;
  },

  /** Like / unlike — returns the new state and total. */
  async like(id: string): Promise<{ liked: boolean; likeCount: number }> {
    const res = await api.post<{ liked: boolean; likeCount: number }>(`/published/${id}/like`);
    return res.data;
  },

  async unlike(id: string): Promise<{ liked: boolean; likeCount: number }> {
    const res = await api.delete<{ liked: boolean; likeCount: number }>(`/published/${id}/like`);
    return res.data;
  },
};
