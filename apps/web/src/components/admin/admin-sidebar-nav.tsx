"use client";

import { SidebarNav, type ResolvedNavItem } from "@/components/layout/sidebar-nav";
import { useVerificationStats } from "@/lib/queries/doctors";

export function AdminSidebarNav({
  items,
  enablePendingBadge,
  collapsed,
  onNavigate,
}: {
  items: ResolvedNavItem[];
  enablePendingBadge?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const stats = useVerificationStats();
  const pending = enablePendingBadge ? (stats.data?.pending ?? null) : null;

  const withBadges = items.map((item) => {
    if (
      item.href === "/admin/verificacion" &&
      typeof pending === "number"
    ) {
      return { ...item, badge: pending };
    }
    return item;
  });

  return (
    <SidebarNav
      items={withBadges}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );
}
