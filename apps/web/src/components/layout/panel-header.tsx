import { Bell } from "lucide-react";
import type { Role } from "@piel360/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "./logo";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  doctor: "Doctor",
  patient: "Paciente",
};

function initialsFromEmail(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function PanelHeader({
  email,
  role,
}: {
  email: string;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div className="md:hidden">
        <Logo className="h-6" />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>

        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{initialsFromEmail(email)}</AvatarFallback>
          </Avatar>
          <div className="hidden text-sm leading-tight sm:block">
            <p className="font-medium">{email}</p>
            <p className="text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
