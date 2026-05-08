import api from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  async updateProfile(name: string): Promise<User> {
    const response = await api.put<{ user: User }>('/auth/profile', { name });
    return response.data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/password', { currentPassword, newPassword });
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/auth/account');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setToken(token: string) {
    localStorage.setItem('token', token);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
