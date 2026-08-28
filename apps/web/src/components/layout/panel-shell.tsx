import type { Role } from "@piel360/shared";
import { Shield } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { Logo } from "./logo";
import { filterNavByFeatures, type NavItem } from "./nav-items";
import { PanelHeader } from "./panel-header";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";

export function PanelShell({
  nav,
  user,
  children,
  notificationCount = 0,
  sidebarUser,
  hideHeaderLogout = false,
}: {
  nav: NavItem[];
  user: {
    email: string;
    role: Role;
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string | null;
  };
  children: React.ReactNode;
  notificationCount?: number;
  /** Perfil inferior del sidebar + cerrar sesión. */
  sidebarUser?: {
    name: string;
    subtitle: string;
    avatarUrl?: string | null;
    enrichFromDoctorProfile?: boolean;
    monitorHint?: string;
  };
  /** Oculta «Cerrar sesión» del header si ya está en el sidebar. */
  hideHeaderLogout?: boolean;
}) {
  const visibleNav = filterNavByFeatures(nav, {
    role: user.role,
    empresa: user.empresa,
    empresaReferida: user.empresaReferida,
    verificationStatus: user.verificationStatus,
  });

  function resolveItems(
    items: ReturnType<typeof filterNavByFeatures>,
  ): Parameters<typeof SidebarNav>[0]["items"] {
    return items.map(
      ({
        icon: Icon,
        children,
        roles: _roles,
        requiresEmpresa: _e,
        requiresEmpresaReferida: _er,
        allowedWhilePending: _p,
        badgeKey: _bk,
        ...item
      }) => ({
        label: item.label,
        href: item.href,
        icon: <Icon className="size-5 shrink-0" />,
        children: children?.length
          ? children.map(
              ({
                icon: ChildIcon,
                roles: _r,
                children: _c,
                requiresEmpresa: _ce,
                requiresEmpresaReferida: _cer,
                allowedWhilePending: _cp,
                badgeKey: _cbk,
                ...child
              }) => ({
                label: child.label,
                href: child.href,
                icon: <ChildIcon className="size-4 shrink-0" />,
              }),
            )
          : undefined,
      }),
    );
  }

  const resolvedNav = resolveItems(visibleNav);
  const isMonitor = user.role === "monitor";

  return (
    <div className="flex min-h-full flex-1 bg-[#F5F6FA] dark:bg-background">
      <aside className="hidden min-h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="shrink-0 overflow-hidden border-b border-sidebar-border px-4 pt-0 pb-0">
          <Logo fullWidth />
        </div>
        {isMonitor ? (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold tracking-wide text-primary uppercase">
              <Shield className="size-3.5" />
              Rol moderador
            </div>
          </div>
        ) : null}
        {isMonitor ? (
          <AdminSidebarNav items={resolvedNav} enablePendingBadge />
        ) : (
          <SidebarNav items={resolvedNav} />
        )}
        {sidebarUser ? (
          <SidebarFooter
            name={sidebarUser.name}
            subtitle={sidebarUser.subtitle}
            avatarUrl={sidebarUser.avatarUrl}
            enrichFromDoctorProfile={
              sidebarUser.enrichFromDoctorProfile ?? user.role === "doctor"
            }
            monitorHint={
              isMonitor
                ? (sidebarUser.monitorHint ??
                  "Validar profesionales mantiene la confianza de la plataforma.")
                : sidebarUser.monitorHint
            }
          />
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <PanelHeader
          email={user.email}
          role={user.role}
          notificationCount={notificationCount}
          showLogout={!hideHeaderLogout && !sidebarUser}
        />
        <main className="flex-1 space-y-6 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
