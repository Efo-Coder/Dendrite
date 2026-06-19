export interface Collaborator {
  id: string;
  userId: string;
  role: string;
  status: string;
  invitedAt: string;
  acceptedAt?: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface Invitation {
  id: string;
  noteId: string;
  userId: string;
  status: string;
  invitedAt: string;
  note: { id: string; title?: string; content: string };
  noteOwner: { id: string; name: string | null; email: string; avatarUrl: string | null } | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  plan: string;
  provider?: string | null;
  twoFactorEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title?: string;
  content: string;
  coverImage?: string | null;
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
  collaborators?: Collaborator[];
}

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  coverImage?: string | null;
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

export interface NoteVersion {
  id: string;
  title?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

// Login returns either a full session or a 2FA challenge
export type LoginResponse = AuthResponse | { requiresTwoFactor: true; tempToken: string };

export interface ApiError {
  error: string;
  message?: string;
}

export interface Reflection {
  id: string;
  userId: string;
  prompt: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
