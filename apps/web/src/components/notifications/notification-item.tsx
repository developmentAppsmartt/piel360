import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification } from "@/lib/queries/notifications";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

type Tono = { icon: LucideIcon; iconClass: string; unreadClass: string };

const PENDIENTE: Tono = {
  icon: CalendarClock,
  iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  unreadClass: "bg-amber-50 dark:bg-amber-950/30",
};
const CONFIRMADA: Tono = {
  icon: CalendarCheck,
  iconClass: "bg-primary/10 text-primary",
  unreadClass: "bg-primary/5",
};
const CAIDA: Tono = {
  icon: CalendarX,
  iconClass: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
  unreadClass: "bg-red-50 dark:bg-red-950/30",
};

const TONOS: Record<string, Tono> = {
  appointment_requested: PENDIENTE,
  appointment_proposed: PENDIENTE,
  appointment_confirmed: CONFIRMADA,
  appointment_declined: CAIDA,
  appointment_cancelled: CAIDA,
  appointment_daily_summary: { ...CONFIRMADA, icon: CalendarDays },
};
const GENERICO: Tono = {
  icon: Bell,
  iconClass: "bg-muted text-muted-foreground",
  unreadClass: "bg-primary/5",
};

/** Adónde lleva un aviso al abrirlo; `null` = no navega. */
export function notificationHref(n: AppNotification): string | null {
  return n.type.startsWith("appointment_") ? "/doctor/agenda" : null;
}

/** Una notificación: icono por tipo, título, texto y cuándo. Las no leídas
 * llevan el fondo de su tono. */
export function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const tono = TONOS[notification.type] ?? GENERICO;
  const Icon = tono.icon;
  const unread = !notification.readAt;
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60",
        unread ? tono.unreadClass : "bg-transparent",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tono.iconClass,
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm text-foreground",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {notification.title}
          </span>
          {unread ? (
            <span aria-label="Sin leer" className="size-2 shrink-0 rounded-full bg-primary" />
          ) : null}
        </span>
        <span className="block text-sm text-muted-foreground">{notification.body}</span>
        <span className="block text-xs text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>
      <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
