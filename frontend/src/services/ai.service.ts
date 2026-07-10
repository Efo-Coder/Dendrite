import api from './api';

// null limit = unlimited (Author plan).
export interface SummarizeUsage {
  used: number;
  limit: number | null;
}

export const aiService = {
  async summarize(text: string): Promise<{ markdown: string; usage?: SummarizeUsage }> {
    const res = await api.post<{ markdown: string; usage?: SummarizeUsage }>('/ai/summarize', { text });
    return res.data;
  },

  async getUsage(): Promise<SummarizeUsage> {
    const res = await api.get<SummarizeUsage>('/ai/usage');
    return res.data;
  },
};
