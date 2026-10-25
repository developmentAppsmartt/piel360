"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import {
  NotificationItem,
  notificationHref,
} from "@/components/notifications/notification-item";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
  type AppNotification,
} from "@/lib/queries/notifications";

/** Cuántas se ven en el desplegable; el resto, en la página. */
const EN_LA_CAMPANA = 6;

function Contador({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Campana del encabezado: contador de no leídas y desplegable con las últimas
 * notificaciones. La lista solo se pide al abrirla; el contador, cada minuto.
 */
export function NotificationBell({ allHref }: { allHref: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unread = useUnreadNotificationCount();
  const list = useNotifications(EN_LA_CAMPANA, open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const count = unread.data ?? 0;

  function abrir(n: AppNotification) {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={count > 0 ? `Notificaciones, ${count} sin leer` : "Notificaciones"}
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" />
        <Contador count={count} className="absolute -top-0.5 -right-0.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-xl outline-none">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <Popover.Title className="flex items-center gap-2 text-base font-semibold">
                Notificaciones
                <Contador count={count} className="h-5 min-w-5 text-[11px]" />
              </Popover.Title>
              {count > 0 ? (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Marcar todas como leídas
                </button>
              ) : null}
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {list.isLoading ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Cargando…
                </p>
              ) : (list.data ?? []).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tienes notificaciones.
                </p>
              ) : (
                list.data!.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={abrir} />
                ))
              )}
            </div>

            {allHref ? (
              <div className="flex justify-center pt-2">
                <Link
                  href={allHref}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
