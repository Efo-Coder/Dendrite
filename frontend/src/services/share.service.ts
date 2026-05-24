import { api } from './api';
import axios from 'axios';
import { Note } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getShare = (noteId: string) =>
  api.get<{ token: string | null }>(`/notes/${noteId}/share`);

export const createShare = (noteId: string) =>
  api.post<{ token: string }>(`/notes/${noteId}/share`);

export const deleteShare = (noteId: string) =>
  api.delete(`/notes/${noteId}/share`);

export const getSharedNote = (token: string) =>
  axios.get<{ note: Note; shareToken: string }>(`${API_URL}/api/shared/${token}`);

export const updateSharedNote = (token: string, data: { content?: string; title?: string }) =>
  axios.put(`${API_URL}/api/shared/${token}`, data);
