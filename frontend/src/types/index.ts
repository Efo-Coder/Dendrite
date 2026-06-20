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
  bio?: string | null;
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

// ─── Idea Constellations ─────────────────────────────────────────────────────

export type ConstellationSource = 'tag' | 'keyword';

export interface Constellation {
  id: string;
  title: string;
  source: ConstellationSource;
  color: string | null; // tag colour hex; null for emergent keyword themes
  importance: number; // 0..1, normalized — never shown as a number
  noteCount: number;
  keywords: string[];
  firstActivity: string;
  lastActivity: string;
}

export interface ConstellationLink {
  source: string;
  target: string;
  weight: number; // 0..1
}

export type InsightFact =
  | { kind: 'consistency'; theme: string; months: number }
  | { kind: 'connection'; a: string; b: string }
  | { kind: 'recency'; theme: string };

export interface ConstellationGraph {
  constellations: Constellation[];
  links: ConstellationLink[];
  insights: InsightFact[];
  generatedAt: string;
}

// A note belonging to a theme, lazily loaded for the constellation detail view.
export interface ThemeNote {
  id: string;
  title: string | null;
  preview: string;
  updatedAt: string;
  folderId: string | null;
}

// ─── Browse & Community Discovery ────────────────────────────────────────────

export interface PublishedAuthor {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

// A published note as returned by the API. `content` is only present on the
// detail endpoint (reading view); list/card responses omit it to stay light.
export interface PublishedNote {
  id: string;
  title: string | null;
  description: string | null;
  coverImage: string | null;
  tags: string[];
  topics: string[];
  readingTime: number;
  publishedAt: string;
  updatedAt: string;
  owner: PublishedAuthor;
  content?: string;
}

export interface PublishedList {
  items: PublishedNote[];
  total: number;
  page: number;
  limit: number;
}

export interface Profile {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  publishedCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}
