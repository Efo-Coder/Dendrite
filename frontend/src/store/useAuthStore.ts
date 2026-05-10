import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      authService.setToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Login fehlgeschlagen',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.register(email, password, name);
      authService.setToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Registrierung fehlgeschlagen',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
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
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      authService.logout();
    }
  },

  updateProfile: async (name: string) => {
    const user = await authService.updateProfile(name);
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
    authService.logout();
  },

  clearError: () => set({ error: null }),
}));
