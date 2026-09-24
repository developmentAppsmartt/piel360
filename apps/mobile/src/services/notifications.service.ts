import { apiRequest } from './api.client';
import type { AppNotification } from '../types/notifications';
import {
  appointmentDataField,
  isAppointmentNotification,
} from '../types/notifications';

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

  /** Marca leídas las notificaciones de una cita concreta (p. ej. al responder). */
  async markAppointmentRead(appointmentId: string) {
    try {
      const list = await this.list(40);
      const related = list.filter(
        (n) =>
          isAppointmentNotification(n.type) &&
          !n.readAt &&
          appointmentDataField(n.data, 'appointmentId') === appointmentId,
      );
      await Promise.all(related.map((n) => this.markRead(n.id)));
    } catch {
      /* ignore */
    }
  },
};
