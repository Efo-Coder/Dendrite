import api from './api';
import { Profile } from '../types';

export const profileService = {
  /** Public profile of a user (identity, counts, whether the viewer follows them). */
  async getProfile(userId: string): Promise<Profile> {
    const res = await api.get<{ profile: Profile }>(`/users/${userId}`);
    return res.data.profile;
  },

  async follow(userId: string): Promise<void> {
    await api.post(`/users/${userId}/follow`);
  },

  async unfollow(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/follow`);
  },
};
