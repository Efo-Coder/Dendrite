import api from './api';
import { Folder } from '../types';

export const folderService = {
  // No params → all of the user's folders; spaceId → a space's top-level folders;
  // parentId → a folder's subfolders.
  async getFolders(params?: { spaceId?: string; parentId?: string }): Promise<Folder[]> {
    const q = new URLSearchParams();
    if (params?.spaceId) q.append('spaceId', params.spaceId);
    if (params?.parentId) q.append('parentId', params.parentId);
    const response = await api.get<{ folders: Folder[] }>(`/folders?${q.toString()}`);
    return response.data.folders;
  },

  async getFolderById(id: string): Promise<Folder> {
    const response = await api.get<{ folder: Folder }>(`/folders/${id}`);
    return response.data.folder;
  },

  async createFolder(data: {
    name: string;
    spaceId: string;
    parentId?: string;
    color?: string;
    icon?: string;
    coverImage?: string | null;
  }): Promise<Folder> {
    const response = await api.post<{ folder: Folder }>('/folders', data);
    return response.data.folder;
  },

  async updateFolder(
    id: string,
    data: {
      name?: string;
      color?: string;
      icon?: string;
      coverImage?: string | null;
      parentId?: string;
    }
  ): Promise<Folder> {
    const response = await api.put<{ folder: Folder }>(`/folders/${id}`, data);
    return response.data.folder;
  },

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/folders/${id}`);
  },

  async togglePin(id: string): Promise<Folder> {
    const response = await api.patch<{ folder: Folder }>(`/folders/${id}/pin`);
    return response.data.folder;
  },

  async reorderFolders(folderOrders: { id: string; order: number }[]): Promise<void> {
    await api.post('/folders/reorder', { folderOrders });
  },
};
