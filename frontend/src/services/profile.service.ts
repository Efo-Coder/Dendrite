import api from './api';
import { Profile, UserSearchResult } from '../types';

export const profileService = {
  /** Public profile of a user (identity, counts, whether the viewer follows them). */
  async getProfile(userId: string): Promise<Profile> {
    const res = await api.get<{ profile: Profile }>(`/users/${userId}`);
    return res.data.profile;
  },

  /** People search for the invite picker. Matches name or username, max 8 hits. */
  async search(query: string): Promise<UserSearchResult[]> {
    const res = await api.get<{ users: UserSearchResult[] }>('/users/search', { params: { q: query } });
    return res.data.users;
  },

  async follow(userId: string): Promise<void> {
    await api.post(`/users/${userId}/follow`);
  },

  async unfollow(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/follow`);
  },
};
