export type AppNotificationType =
  | 'message'
  | 'analysis_request'
  | 'analysis_shared'
  | 'appointment_proposed'
  | 'appointment_requested'
  | 'appointment_confirmed'
  | 'appointment_declined'
  | 'appointment_cancelled';

export type AppNotification = {
  id: string;
  userId: string;
  type: AppNotificationType | string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

const APPOINTMENT_TYPES = new Set<string>([
  'appointment_proposed',
  'appointment_requested',
  'appointment_confirmed',
  'appointment_declined',
  'appointment_cancelled',
]);

export function isAppointmentNotification(
  type: string | undefined | null,
): boolean {
  return !!type && APPOINTMENT_TYPES.has(type);
}

export function appointmentDataField(
  data: AppNotification['data'],
  key: string,
): string | null {
  if (!data || typeof data !== 'object') return null;
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const HOME_REMINDER_TYPES = new Set<string>([
  'message',
  'analysis_request',
  'analysis_shared',
  'appointment_proposed',
  'appointment_requested',
  'appointment_confirmed',
  'appointment_declined',
  'appointment_cancelled',
]);

export function conversationIdFromNotification(
  data: AppNotification['data'],
): string | null {
  return appointmentDataField(data, 'conversationId');
}

/** Últimas notificaciones accionables para el panel de inicio (máx. 3). */
export function selectHomeReminders(
  notices: AppNotification[],
  options?: {
    pendingAnalysisRequestIds?: ReadonlySet<string>;
    dismissedIds?: ReadonlySet<string>;
    limit?: number;
  },
): AppNotification[] {
  const limit = options?.limit ?? 3;
  const pending = options?.pendingAnalysisRequestIds;
  const dismissed = options?.dismissedIds;

  const actionable = notices.filter((n) => {
    if (!HOME_REMINDER_TYPES.has(n.type)) return false;
    if (dismissed?.has(n.id)) return false;

    if (n.type === 'analysis_request') {
      const requestId = appointmentDataField(n.data, 'analysisRequestId');
      if (requestId && pending?.has(requestId)) return true;
      return !n.readAt;
    }

    return !n.readAt;
  });

  return [...actionable]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}
