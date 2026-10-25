"use client";

import { useRouter } from "next/navigation";
import {
  NotificationItem,
  notificationHref,
} from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from "@/lib/queries/notifications";

/** El API devuelve como máximo 100. */
const LIMITE = 100;

export default function NotificacionesPage() {
  const router = useRouter();
  const list = useNotifications(LIMITE);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  function abrir(n: AppNotification) {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} sin leer` : "Estás al día."}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            Marcar todas como leídas
          </Button>
        ) : null}
      </div>

      <ModuleCard className="space-y-1 p-3">
        {list.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tienes notificaciones.
          </p>
        ) : (
          items.map((n) => (
            <NotificationItem key={n.id} notification={n} onOpen={abrir} />
          ))
        )}
      </ModuleCard>
    </div>
  );
}
