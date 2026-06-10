import api from './api';

export const feedbackService = {
  async submitRating(rating: number, comment?: string): Promise<void> {
    await api.post('/feedback/rating', { rating, comment });
  },

  async submitBugReport(title: string, description: string): Promise<void> {
    await api.post('/feedback/bug-report', { title, description });
  },
};
