"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResolvedNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: ResolvedNavItem[];
}

function isActivePath(pathname: string, href: string) {
  const isPanelRoot =
    href === "/admin" ||
    href === "/doctor" ||
    href === "/doctor/home" ||
    href === "/patient/dashboard";
  if (isPanelRoot) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  nested,
}: {
  item: ResolvedNavItem;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const hasChildren = Boolean(item.children?.length);
  const childActive = item.children?.some((c) => isActivePath(pathname, c.href));
  const [open, setOpen] = useState(Boolean(childActive));

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-colors",
          nested && "min-h-9 py-2 pl-11 text-[13px] font-medium",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        {!nested ? item.icon : null}
        {item.label}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-colors",
          childActive || active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-1">
          {item.children!.map((child) => (
            <NavLink key={child.href} item={child} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({ items }: { items: ResolvedNavItem[] }) {
  return (
    <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
      {items.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}
    </nav>
  );
}
