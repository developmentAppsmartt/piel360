"use client";

import type { Role } from "@piel360/shared";
import { Shield, X } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { PanelHeader } from "./panel-header";
import {
  PanelLayoutProvider,
  usePanelLayout,
} from "./panel-layout-context";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarCollapseToggle, SidebarNav, type ResolvedNavItem } from "./sidebar-nav";

type SidebarUserProps = {
  name: string;
  subtitle: string;
  avatarUrl?: string | null;
  enrichFromDoctorProfile?: boolean;
  monitorHint?: string;
};

function SidebarChrome({
  items,
  isMonitor,
  collapsed,
  onNavigate,
  className,
  showCloseButton,
  onClose,
  sidebarUser,
  showCollapseToggle,
  userRole,
  userEmpresa,
}: {
  items: ResolvedNavItem[];
  isMonitor: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  sidebarUser?: SidebarUserProps;
  showCollapseToggle?: boolean;
  userRole: Role;
  userEmpresa?: boolean;
}) {
  const { toggleCollapsed } = usePanelLayout();

  return (
    <aside
      className={cn(
        "relative flex min-h-full shrink-0 flex-col overflow-visible border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-18" : "w-72",
        className,
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-sidebar-border",
          collapsed ? "px-2 py-3" : "px-4 py-3",
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        ) : null}

        <div className={cn("flex items-center", collapsed && "justify-center")}>
          <Logo fullWidth={!collapsed} compact={collapsed} />
        </div>
      </div>

      {isMonitor ? (
        <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
          <div
            className={cn(
              "flex items-center rounded-full bg-primary/15 text-xs font-bold tracking-wide text-primary uppercase",
              collapsed
                ? "mx-auto size-9 justify-center"
                : "gap-2 px-3 py-1.5",
            )}
            title={collapsed ? "Rol moderador" : undefined}
          >
            <Shield className="size-3.5 shrink-0" />
            {!collapsed ? <span>Rol moderador</span> : null}
          </div>
        </div>
      ) : null}

      {isMonitor ? (
        <AdminSidebarNav
          items={items}
          enablePendingBadge
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ) : (
        <SidebarNav
          items={items}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      )}

      {showCollapseToggle && !showCloseButton ? (
        <SidebarCollapseToggle
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          className="top-[22rem] right-0 hidden md:flex"
        />
      ) : null}

      {sidebarUser ? (
        <SidebarFooter
          {...sidebarUser}
          collapsed={collapsed}
          panelRole={userRole}
          empresa={userEmpresa}
        />
      ) : null}
    </aside>
  );
}

function PanelLayoutInner({
  resolvedNav,
  isMonitor,
  user,
  children,
  notificationCount,
  hideHeaderLogout,
  sidebarUser,
}: {
  resolvedNav: ResolvedNavItem[];
  isMonitor: boolean;
  user: {
    email: string;
    role: Role;
    empresa?: boolean;
    empresaReferida?: boolean;
    verificationStatus?: string | null;
  };
  children: React.ReactNode;
  notificationCount: number;
  hideHeaderLogout: boolean;
  sidebarUser?: SidebarUserProps;
}) {
  const { collapsed, mobileOpen, setMobileOpen, closeMobile } =
    usePanelLayout();

  return (
    <div className="flex min-h-full flex-1 overflow-x-hidden bg-[#F5F6FA] dark:bg-background">
      <SidebarChrome
        items={resolvedNav}
        isMonitor={isMonitor}
        collapsed={collapsed}
        sidebarUser={sidebarUser}
        showCollapseToggle
        userRole={user.role}
        userEmpresa={user.empresa}
        className="hidden md:flex"
      />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
          />
          <SidebarChrome
            items={resolvedNav}
            isMonitor={isMonitor}
            collapsed={false}
            onNavigate={closeMobile}
            showCloseButton
            onClose={closeMobile}
            sidebarUser={sidebarUser}
            userRole={user.role}
            userEmpresa={user.empresa}
            className="relative z-10 h-full shadow-xl"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <PanelHeader
          email={user.email}
          role={user.role}
          notificationCount={notificationCount}
          showLogout={!hideHeaderLogout && !sidebarUser}
          onMenuClick={() => setMobileOpen(true)}
          empresa={user.empresa}
          empresaReferida={user.empresaReferida}
          verificationStatus={user.verificationStatus}
        />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function PanelLayoutClient(props: {
  resolvedNav: ResolvedNavItem[];
  isMonitor: boolean;
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
  sidebarUser?: SidebarUserProps;
  hideHeaderLogout?: boolean;
}) {
  return (
    <PanelLayoutProvider>
      <PanelLayoutInner
        resolvedNav={props.resolvedNav}
        isMonitor={props.isMonitor}
        user={props.user}
        notificationCount={props.notificationCount ?? 0}
        hideHeaderLogout={props.hideHeaderLogout ?? false}
        sidebarUser={props.sidebarUser}
      >
        {props.children}
      </PanelLayoutInner>
    </PanelLayoutProvider>
  );
}
