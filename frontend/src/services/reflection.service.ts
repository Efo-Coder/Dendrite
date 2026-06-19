import api from './api';
import { Reflection } from '../types';

// Today's entry may not exist yet; the prompt is always returned so the UI can show the question.
export interface TodayReflection {
  reflection: Reflection | null;
  prompt: string;
  date: string;
}

export const reflectionService = {
  async getReflections(): Promise<Reflection[]> {
    const response = await api.get<{ reflections: Reflection[] }>('/reflections');
    return response.data.reflections;
  },

  async getToday(): Promise<TodayReflection> {
    const response = await api.get<TodayReflection>('/reflections/today');
    return response.data;
  },

  async saveToday(content: string): Promise<Reflection> {
    const response = await api.put<{ reflection: Reflection }>('/reflections/today', { content });
    return response.data.reflection;
  },
};
