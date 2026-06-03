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

  async setup2FA(): Promise<{ secret: string; qrCode: string }> {
    const response = await api.post<{ secret: string; qrCode: string }>('/auth/2fa/setup');
    return response.data;
  },

  async enable2FA(code: string): Promise<void> {
    await api.post('/auth/2fa/enable', { code });
  },

  async disable2FA(password: string): Promise<void> {
    await api.post('/auth/2fa/disable', { password });
  },

  async verify2FA(tempToken: string, code: string): Promise<{ user: any; token: string }> {
    const response = await api.post<{ user: any; token: string }>('/auth/2fa/verify', { tempToken, code });
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },

  async deleteAvatar(): Promise<User> {
    const response = await api.delete<{ user: User }>('/auth/avatar');
    return response.data.user;
  },

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<{ user: User }>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.user;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
