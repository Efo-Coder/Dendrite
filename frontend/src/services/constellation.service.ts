import api from './api';
import { ConstellationGraph, ThemeNote } from '../types';

export const constellationService = {
  async getGraph(): Promise<ConstellationGraph> {
    const response = await api.get<ConstellationGraph>('/constellations');
    return response.data;
  },

  async getThemeNotes(themeId: string): Promise<ThemeNote[]> {
    const response = await api.get<{ notes: ThemeNote[] }>(
      `/constellations/${encodeURIComponent(themeId)}/notes`,
    );
    return response.data.notes;
  },
};
