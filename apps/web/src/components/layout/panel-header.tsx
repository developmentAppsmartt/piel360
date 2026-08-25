import { Bell, Crown } from "lucide-react";
import type { Role } from "@piel360/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "./logo";

const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  monitor: "Moderador",
  doctor: "Doctor",
  patient: "Paciente",
};

const ROLE_SCOPE: Record<Role, string> = {
  superadmin: "Global",
  monitor: "Verificación",
  doctor: "Consulta",
  patient: "Paciente",
};

function initialsFromEmail(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function PanelHeader({
  email,
  role,
  notificationCount = 0,
}: {
  email: string;
  role: Role;
  notificationCount?: number;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-6 backdrop-blur">
      <div className="md:hidden">
        <Logo className="h-8" />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
          {notificationCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : null}
        </button>

        <div className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pr-3 pl-1">
          <Avatar className="size-8 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {role === "superadmin" ? (
                <Crown className="size-3.5" />
              ) : (
                initialsFromEmail(email)
              )}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-sm leading-tight sm:block">
            <p className="font-medium">{ROLE_LABELS[role]}</p>
            <p className="text-xs text-muted-foreground">{ROLE_SCOPE[role]}</p>
          </div>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
