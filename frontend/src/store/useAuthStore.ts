import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';
import { getApiErrorMessage } from '../lib/apiError';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  tempToken: string | null;

  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: { name?: string; bio?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  requiresTwoFactor: false,
  tempToken: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      if ('requiresTwoFactor' in data) {
        set({ requiresTwoFactor: true, tempToken: data.tempToken, isLoading: false });
        return;
      }
      authService.setToken(data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Login failed'), isLoading: false });
      throw error;
    }
  },

  loginWithToken: async (token: string) => {
    authService.setToken(token);
    try {
      const user = await authService.getMe();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      authService.logout();
      set({ user: null, token: null, isAuthenticated: false });
      throw new Error('Failed to load user');
    }
  },

  verifyTwoFactor: async (code: string) => {
    const { tempToken } = get();
    if (!tempToken) return;
    set({ isLoading: true, error: null });
    try {
      const data = await authService.verify2FA(tempToken, code);
      authService.setToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        requiresTwoFactor: false,
        tempToken: null,
      });
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Invalid code'), isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register(email, password, name);
      set({ isLoading: false });
    } catch (error) {
      set({ error: getApiErrorMessage(error, 'Registration failed'), isLoading: false });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, token: null, isAuthenticated: false, error: null, requiresTwoFactor: false, tempToken: null });
  },

  loadUser: async () => {
    const token = authService.getToken();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      authService.logout();
    }
  },

  updateProfile: async (data) => {
    const user = await authService.updateProfile(data);
    set({ user });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  },

  uploadAvatar: async (file: File) => {
    const user = await authService.uploadAvatar(file);
    set({ user });
  },

  deleteAvatar: async () => {
    const user = await authService.deleteAvatar();
    set({ user });
  },

  deleteAccount: async () => {
    await authService.deleteAccount();
    set({ user: null, token: null, isAuthenticated: false });
    authService.logout();
  },

  clearError: () => set({ error: null }),
}));
