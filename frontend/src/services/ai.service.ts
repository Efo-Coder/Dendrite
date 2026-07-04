import api from './api';

export const aiService = {
  async summarize(text: string): Promise<string> {
    const res = await api.post<{ markdown: string }>('/ai/summarize', { text });
    return res.data.markdown;
  },
};
