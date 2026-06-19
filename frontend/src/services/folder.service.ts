import api from './api';
import { Folder } from '../types';

export const folderService = {
  async getAllFolders(): Promise<Folder[]> {
    const response = await api.get<{ folders: Folder[] }>('/folders');
    return response.data.folders;
  },

  async getFolderById(id: string): Promise<Folder> {
    const response = await api.get<{ folder: Folder }>(`/folders/${id}`);
    return response.data.folder;
  },

  async createFolder(data: {
    name: string;
    color?: string;
    icon?: string;
    coverImage?: string | null;
    parentId?: string;
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
};
