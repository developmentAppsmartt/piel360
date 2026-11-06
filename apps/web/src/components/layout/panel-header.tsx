"use client";

import Link from "next/link";
import { Crown, Menu } from "lucide-react";
import type { Role } from "@piel360/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUserRoleDisplay } from "@/lib/hooks/use-user-role-display";
import { initialsFromEmail } from "@/lib/initials";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import { Logo } from "./logo";

export function PanelHeader({
  email,
  role,
  notificationsHref = null,
  profileHref = null,
  showLogout = true,
  onMenuClick,
  empresa,
  empresaReferida,
  verificationStatus,
}: {
  email: string;
  role: Role;
  /** Página con todas las notificaciones; `null` = el panel no la tiene. */
  notificationsHref?: string | null;
  /** Perfil del usuario (Configuración). `null` = el chip no enlaza y no
   * muestra foto: paneles sin perfil propio o sin permiso a esa ruta. */
  profileHref?: string | null;
  showLogout?: boolean;
  onMenuClick?: () => void;
  empresa?: boolean;
  empresaReferida?: boolean;
  verificationStatus?: string | null;
}) {
  const { label: roleLabel, scope: roleScope } = useUserRoleDisplay(role, {
    empresa,
    empresaReferida,
    verificationStatus,
  });
  // Misma query que el menú lateral y Configuración: al cambiar la foto se
  // actualizan los tres a la vez.
  const profile = useMyDoctorProfile(Boolean(profileHref));
  const avatarUrl = profileHref ? profile.data?.avatarUrl : null;

  const chip = (
    <>
      <Avatar className="size-8 bg-primary text-primary-foreground">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-primary text-primary-foreground">
          {role === "superadmin" ? (
            <Crown className="size-3.5" />
          ) : (
            initialsFromEmail(email)
          )}
        </AvatarFallback>
      </Avatar>
      <div className="hidden text-sm leading-tight sm:block">
        <p className="font-medium">{roleLabel}</p>
        <p className="text-xs text-muted-foreground">{roleScope}</p>
      </div>
    </>
  );
  const chipClass =
    "flex items-center gap-2 rounded-full border border-border bg-background py-1 pr-3 pl-1";

  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu className="size-5" />
          </button>
        ) : null}
        <div className="md:hidden">
          <Logo className="h-8" />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell allHref={notificationsHref} />

        {profileHref ? (
          <Link
            href={profileHref}
            aria-label="Ir a mi perfil"
            className={`${chipClass} transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
          >
            {chip}
          </Link>
        ) : (
          <div className={chipClass}>{chip}</div>
        )}

        {showLogout ? <LogoutButton /> : null}
      </div>
    </header>
  );
}
