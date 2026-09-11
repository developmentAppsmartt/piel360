export type AppNotificationType = 'message' | 'analysis_request';

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
