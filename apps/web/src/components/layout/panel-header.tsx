"use client";

import { Crown, Menu } from "lucide-react";
import type { Role } from "@piel360/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUserRoleDisplay } from "@/lib/hooks/use-user-role-display";
import { initialsFromEmail } from "@/lib/initials";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import { Logo } from "./logo";
import { PanelHeaderMenu } from "./panel-header-menu";
import type { ResolvedNavItem } from "./sidebar-nav";

export function PanelHeader({
  email,
  role,
  notificationsHref = null,
  profileHref = null,
  navItems,
  onMenuClick,
  empresa,
  empresaReferida,
  verificationStatus,
}: {
  email: string;
  role: Role;
  /** Página con todas las notificaciones; `null` = el panel no la tiene. */
  notificationsHref?: string | null;
  /** Perfil del usuario (Configuración). `null` = sin foto ni nombre del
   * perfil: paneles sin perfil propio o sin permiso a esa ruta. */
  profileHref?: string | null;
  /** El menú del panel: de aquí salen Configuración y Soporte del desplegable. */
  navItems: ResolvedNavItem[];
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
  const fullName = profile.data ? `${profile.data.firstName} ${profile.data.lastName}`.trim() : "";

  const avatar = (size: string) => (
    <Avatar className={`${size} bg-primary text-primary-foreground`}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-primary text-primary-foreground">
        {role === "superadmin" ? <Crown className="size-3.5" /> : initialsFromEmail(email)}
      </AvatarFallback>
    </Avatar>
  );

  const chip = (
    <>
      {avatar("size-8")}
      <div className="hidden text-left text-sm leading-tight sm:block">
        <p className="font-medium">{roleLabel}</p>
        <p className="text-xs text-muted-foreground">{roleScope}</p>
      </div>
    </>
  );

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
        <PanelHeaderMenu
          chip={chip}
          avatar={avatar("size-11")}
          name={fullName || email}
          subtitle={roleLabel}
          navItems={navItems}
        />
      </div>
    </header>
  );
}
