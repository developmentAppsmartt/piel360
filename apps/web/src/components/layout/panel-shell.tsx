import type { Role } from "@piel360/shared";
import { isClinicalPanelRole } from "@piel360/shared";
import { filterNavByFeatures, type NavItem } from "./nav-items";
import { PanelLayoutClient } from "./panel-layout-client";
import type { ResolvedNavItem } from "./sidebar-nav";

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
    permissions?: string[];
  };
  children: React.ReactNode;
  notificationCount?: number;
  sidebarUser?: {
    name: string;
    subtitle: string;
    avatarUrl?: string | null;
    enrichFromDoctorProfile?: boolean;
    monitorHint?: string;
  };
  hideHeaderLogout?: boolean;
}) {
  const visibleNav = filterNavByFeatures(nav, {
    role: user.role,
    empresa: user.empresa,
    empresaReferida: user.empresaReferida,
    verificationStatus: user.verificationStatus,
    permissions: user.permissions,
  });

  function resolveItems(
    items: ReturnType<typeof filterNavByFeatures>,
  ): ResolvedNavItem[] {
    const mapItem = (
      {
        icon: Icon,
        children,
        roles: _roles,
        requiresEmpresa: _e,
        requiresEmpresaReferida: _er,
        allowedWhilePending: _p,
        permissionsAny: _pa,
        badgeKey: _bk,
        ...item
      }: (typeof items)[number],
      depth: number,
    ): ResolvedNavItem => ({
      label: item.label,
      href: item.href,
      icon:
        depth === 0 ? (
          <Icon className="size-5 shrink-0" />
        ) : (
          <Icon className="size-4 shrink-0" />
        ),
      children: children?.length
        ? children.map((child) => mapItem(child, depth + 1))
        : undefined,
    });

    return items.map((item) => mapItem(item, 0));
  }

  const resolvedNav = resolveItems(visibleNav);
  const isMonitor = user.role === "monitor";

  return (
    <PanelLayoutClient
      resolvedNav={resolvedNav}
      isMonitor={isMonitor}
      user={user}
      notificationCount={notificationCount}
      sidebarUser={
        sidebarUser
          ? {
              ...sidebarUser,
              enrichFromDoctorProfile:
                sidebarUser.enrichFromDoctorProfile ??
                isClinicalPanelRole(user.role),
              monitorHint:
                isMonitor
                  ? (sidebarUser.monitorHint ??
                    "Validar profesionales mantiene la confianza de la plataforma.")
                  : sidebarUser.monitorHint,
            }
          : undefined
      }
      hideHeaderLogout={hideHeaderLogout}
    >
      {children}
    </PanelLayoutClient>
  );
}
