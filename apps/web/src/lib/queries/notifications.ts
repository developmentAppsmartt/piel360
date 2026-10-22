"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

const KEY = ["notifications"] as const;
/** La campana no tiene canal en tiempo real: se consulta cada minuto y al
 * volver a la pestaña. */
const REFRESCO_MS = 60_000;

export function useNotifications(limit = 20, enabled = true) {
  return useQuery({
    queryKey: [...KEY, "list", limit],
    queryFn: () => apiClientFetch<AppNotification[]>(`/notifications?limit=${limit}`),
    enabled,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...KEY, "unread"],
    queryFn: () => apiClientFetch<{ count: number }>("/notifications/unread-count"),
    refetchInterval: REFRESCO_MS,
    refetchOnWindowFocus: true,
    select: (data) => data.count,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClientFetch("/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

