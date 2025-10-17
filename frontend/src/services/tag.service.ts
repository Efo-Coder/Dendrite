import api from './api';
import { Tag } from '../types';

export const tagService = {
  async getAllTags(): Promise<Tag[]> {
    const response = await api.get<{ tags: Tag[] }>('/tags');
    return response.data.tags;
  },

  async getTagById(id: string): Promise<Tag> {
    const response = await api.get<{ tag: Tag }>(`/tags/${id}`);
    return response.data.tag;
  },

  async createTag(data: { name: string; color?: string }): Promise<Tag> {
    const response = await api.post<{ tag: Tag }>('/tags', data);
    return response.data.tag;
  },

  async updateTag(id: string, data: { name?: string; color?: string }): Promise<Tag> {
    const response = await api.put<{ tag: Tag }>(`/tags/${id}`, data);
    return response.data.tag;
  },

  async deleteTag(id: string): Promise<void> {
    await api.delete(`/tags/${id}`);
  },
};
