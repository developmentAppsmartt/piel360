"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AboutNavItem } from "./about-dialog";
import { isActivePath, NavAccordionGroup, NavFlyoutGroup } from "./sidebar-nav-groups";

export interface ResolvedNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | null;
  children?: ResolvedNavItem[];
}

function NavLink({
  item,
  depth = 0,
  collapsed = false,
  onNavigate,
}: {
  item: ResolvedNavItem;
  depth?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const hasChildren = Boolean(item.children?.length);

  if (hasChildren && depth === 0) {
    if (collapsed) {
      return (
        <NavFlyoutGroup
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      );
    }
    return (
      <NavAccordionGroup
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed && depth === 0 ? item.label : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-colors",
        collapsed &&
          depth === 0 &&
          "relative mx-auto size-10 min-h-10 justify-center px-0",
        depth > 0 && "min-h-9 py-2 pl-11 text-[13px] font-medium",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {depth === 0 ? (
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      ) : null}
      {!(collapsed && depth === 0) ? (
        <span className="flex-1 truncate text-left">{item.label}</span>
      ) : null}
      {typeof item.badge === "number" &&
      item.badge > 0 &&
      !(collapsed && depth === 0) ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            active
              ? "bg-white/20 text-white"
              : "bg-primary text-primary-foreground",
          )}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
      {typeof item.badge === "number" &&
      item.badge > 0 &&
      collapsed &&
      depth === 0 ? (
        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SidebarCollapseToggle({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
      className={cn(
        "absolute z-30 flex size-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-md transition-colors hover:bg-sidebar-accent hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft
        className={cn(
          "size-4 transition-transform",
          collapsed && "rotate-180",
        )}
      />
    </button>
  );
}

export function SidebarNav({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: ResolvedNavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto pt-2 pb-3",
        collapsed ? "px-2" : "px-3",
      )}
    >
      {items.map((item) => (
        <div key={item.href} className="relative">
          <NavLink
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>
      ))}
      <div className="relative mt-auto pt-1">
        <AboutNavItem collapsed={collapsed} />
      </div>
    </nav>
  );
}
