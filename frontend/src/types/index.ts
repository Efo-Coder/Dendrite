export type ViewType = 'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag';

export interface NoteCounts {
  all: number;
  favorites: number;
  archive: number;
  trash: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title?: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  folderId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  folder?: Folder;
  tags?: Tag[];
  attachments?: Attachment[];
}

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
  notes?: Note[];
  parent?: Folder;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  notes?: Note[];
}

export interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  url: string;
  noteId: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ApiError {
  error: string;
  message?: string;
}
