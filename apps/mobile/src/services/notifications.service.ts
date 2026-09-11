import { apiRequest } from './api.client';
import type { AppNotification } from '../types/notifications';

export const notificationsService = {
  list(limit = 50) {
    return apiRequest<AppNotification[]>(
      `/notifications?limit=${encodeURIComponent(String(limit))}`,
      { auth: true },
    );
  },

  unreadCount() {
    return apiRequest<{ count: number }>('/notifications/unread-count', {
      auth: true,
    });
  },

  markRead(id: string) {
    return apiRequest<AppNotification>(`/notifications/${id}/read`, {
      method: 'PATCH',
      auth: true,
    });
  },

  markAllRead() {
    return apiRequest<{ ok: boolean }>('/notifications/read-all', {
      method: 'PATCH',
      auth: true,
    });
  },
};
