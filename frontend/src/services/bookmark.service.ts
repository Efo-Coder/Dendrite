import api from './api';
import { Bookmark } from '../types';

export const bookmarkService = {
  async getAllBookmarks(): Promise<Bookmark[]> {
    const response = await api.get<{ bookmarks: Bookmark[] }>('/bookmarks');
    return response.data.bookmarks;
  },

  async getBookmarkById(id: string): Promise<Bookmark> {
    const response = await api.get<{ bookmark: Bookmark }>(`/bookmarks/${id}`);
    return response.data.bookmark;
  },

  async createBookmark(data: { name: string; color?: string }): Promise<Bookmark> {
    const response = await api.post<{ bookmark: Bookmark }>('/bookmarks', data);
    return response.data.bookmark;
  },

  async updateBookmark(id: string, data: { name?: string; color?: string }): Promise<Bookmark> {
    const response = await api.put<{ bookmark: Bookmark }>(`/bookmarks/${id}`, data);
    return response.data.bookmark;
  },

  async deleteBookmark(id: string): Promise<void> {
    await api.delete(`/bookmarks/${id}`);
  },
};
