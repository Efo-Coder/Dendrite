import api from './api';
import { Space } from '../types';

export const spaceService = {
  async getAllSpaces(): Promise<Space[]> {
    const response = await api.get<{ spaces: Space[] }>('/spaces');
    return response.data.spaces;
  },

  async getSpaceById(id: string): Promise<Space> {
    const response = await api.get<{ space: Space }>(`/spaces/${id}`);
    return response.data.space;
  },

  async createSpace(data: {
    name: string;
    color?: string;
    icon?: string;
    coverImage?: string | null;
  }): Promise<Space> {
    const response = await api.post<{ space: Space }>('/spaces', data);
    return response.data.space;
  },

  async updateSpace(
    id: string,
    data: { name?: string; color?: string; icon?: string; coverImage?: string | null },
  ): Promise<Space> {
    const response = await api.put<{ space: Space }>(`/spaces/${id}`, data);
    return response.data.space;
  },

  async deleteSpace(id: string): Promise<void> {
    await api.delete(`/spaces/${id}`);
  },

  async reorderSpaces(spaceOrders: { id: string; order: number }[]): Promise<void> {
    await api.post('/spaces/reorder', { spaceOrders });
  },

  async togglePin(id: string): Promise<Space> {
    const response = await api.patch<{ space: Space }>(`/spaces/${id}/pin`);
    return response.data.space;
  },
};
