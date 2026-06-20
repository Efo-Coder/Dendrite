import api from './api';
import { NotificationItem } from '../types';

export const notificationService = {
  /** Recent notifications + unread badge count. */
  async list(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const res = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
    return res.data;
  },

  /** Mark every notification read (called when the panel opens). */
  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read');
  },

  /** Remove one notification (after accepting/declining an invite). */
  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
