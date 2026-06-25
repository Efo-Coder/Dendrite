import api from './api';
import { Reminder, Recurrence } from '../types';

export const reminderService = {
  /** Reminders attached to one note, soonest first. */
  async list(noteId: string): Promise<Reminder[]> {
    const res = await api.get<{ reminders: Reminder[] }>('/reminders', { params: { noteId } });
    return res.data.reminders;
  },

  async create(input: {
    noteId: string;
    description: string;
    remindAt: string;
    recurrence: Recurrence;
  }): Promise<Reminder> {
    const res = await api.post<{ reminder: Reminder }>('/reminders', input);
    return res.data.reminder;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/reminders/${id}`);
  },
};
