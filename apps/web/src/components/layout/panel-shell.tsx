import type { Role } from "@piel360/shared";
import { Shield } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { Logo } from "./logo";
import { filterNavByFeatures, type NavItem } from "./nav-items";
import { PanelHeader } from "./panel-header";
import { SidebarNav } from "./sidebar-nav";

export function PanelShell({
  nav,
  user,
  children,
  notificationCount = 0,
  sidebarUser,
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
  /** Card inferior del sidebar (p. ej. Super Admin). */
  sidebarUser?: { name: string; subtitle: string };
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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Logo />
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
          <div className="mt-auto border-t border-sidebar-border p-3">
            {isMonitor ? (
              <div className="rounded-xl bg-sidebar-accent/80 p-3">
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Shield className="size-4" />
                </div>
                <p className="text-sm font-semibold text-sidebar-foreground">
                  Tu rol es clave
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Validar profesionales mantiene la confianza de la plataforma.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 px-3 py-2.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {sidebarUser.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">
                    {sidebarUser.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {sidebarUser.subtitle}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <PanelHeader
          email={user.email}
          role={user.role}
          notificationCount={notificationCount}
        />
        <main className="flex-1 space-y-6 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
