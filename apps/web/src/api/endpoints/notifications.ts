import { apiFetch } from '../client';
import type { Notification } from '../types';

export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/notifications'),

  unreadCount: () =>
    apiFetch<{ count: number }>('/notifications/unread-count').then(
      (result) => result.count,
    ),

  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<void>('/notifications/read-all', { method: 'PATCH' }),
};
