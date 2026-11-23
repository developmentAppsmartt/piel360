"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedNavItem } from "./sidebar-nav";

/** Grupos del menú lateral: el flotante (menú contraído) y el acordeón
 * (menú abierto), y cómo se decide qué ítem está activo. */


export function isActivePath(pathname: string, href: string) {
  const isPanelRoot =
    href === "/admin" ||
    href === "/doctor" ||
    href === "/doctor/home" ||
    href === "/patient/dashboard";
  if (isPanelRoot) return pathname === href;
  if (href === "/admin/verificacion") {
    return pathname === "/admin/verificacion";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function itemOrChildActive(pathname: string, item: ResolvedNavItem): boolean {
  if (isActivePath(pathname, item.href)) return true;
  return item.children?.some((child) => itemOrChildActive(pathname, child)) ?? false;
}

function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  enabled: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!enabled) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onOutside();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [enabled, onOutside, refs]);
}

function FlyoutNavEntry({
  child,
  pathname,
  onClose,
  onNavigate,
  nested = false,
}: {
  child: ResolvedNavItem;
  pathname: string;
  onClose: () => void;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  if (child.children?.length) {
    return (
      <div className="space-y-1">
        <p
          className={cn(
            "px-3 py-1.5 text-xs font-semibold text-sidebar-foreground/80",
            nested && "pt-2",
          )}
        >
          {child.label}
        </p>
        {child.children.map((grandchild) => (
          <FlyoutNavEntry
            key={`${child.href}-${grandchild.href}-${grandchild.label}`}
            child={grandchild}
            pathname={pathname}
            onClose={onClose}
            onNavigate={onNavigate}
            nested
          />
        ))}
      </div>
    );
  }

  const active = isActivePath(pathname, child.href);
  return (
    <Link
      href={child.href}
      onClick={() => {
        onClose();
        onNavigate?.();
      }}
      className={cn(
        "flex min-h-9 items-center rounded-lg py-2 text-sm font-medium transition-colors",
        nested ? "px-5" : "px-3",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {child.label}
    </Link>
  );
}

function SidebarFlyoutPanel({
  item,
  pathname,
  coords,
  onNavigate,
  onClose,
  panelRef,
}: {
  item: ResolvedNavItem;
  pathname: string;
  coords: { top: number; left: number };
  onNavigate?: () => void;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-[200] min-w-52 rounded-xl border border-sidebar-border bg-sidebar p-2 shadow-lg"
    >
      <p className="px-3 py-2 text-sm font-semibold text-sidebar-foreground">
        {item.label}
      </p>
      <div className="space-y-1">
        {item.children!.map((child) => (
          <FlyoutNavEntry
            key={`${item.href}-${child.href}-${child.label}`}
            child={child}
            pathname={pathname}
            onClose={onClose}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

/** Flyout lateral — solo en sidebar minimizado. */
export function NavFlyoutGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: ResolvedNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const childActive = itemOrChildActive(pathname, item);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.top, left: rect.right + 8 });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useClickOutside([triggerRef, panelRef], open, () => setOpen(false));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((v) => !v);
        }}
        title={item.label}
        aria-label={item.label}
        aria-expanded={open}
        className={cn(
          "relative mx-auto flex size-10 min-h-10 items-center justify-center rounded-xl transition-colors",
          childActive || open
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon} 
        </span>
        {typeof item.badge === "number" && item.badge > 0 ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <SidebarFlyoutPanel
          item={item}
          pathname={pathname}
          coords={coords}
          onNavigate={onNavigate}
          onClose={() => setOpen(false)}
          panelRef={panelRef}
        />
      ) : null}
    </>
  );
}

/** Acordeón hacia abajo — sidebar expandido en desktop. */
export function NavAccordionGroup({
  item,
  pathname,
  onNavigate,
  depth = 0,
}: {
  item: ResolvedNavItem;
  pathname: string;
  onNavigate?: () => void;
  depth?: number;
}) {
  const childActive = itemOrChildActive(pathname, item);
  // Se abre solo al entrar a uno de sus hijos; después manda el clic. Se
  // deriva en vez de sincronizar con un efecto.
  const [toggle, setToggle] = useState({ active: childActive, open: childActive });
  const open = toggle.active === childActive ? toggle.open : childActive || toggle.open;
  const nested = depth > 0;

  return (
    <div className={cn("space-y-1", nested && "pl-2")}>
      <button
        type="button"
        onClick={() => setToggle({ active: childActive, open: !open })}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl text-sm font-semibold tracking-tight transition-colors",
          nested
            ? "min-h-9 py-2 pl-9 pr-4 text-[13px] font-medium"
            : "min-h-11 px-4 py-2.5",
          childActive || open
            ? nested
              ? "text-sidebar-primary"
              : "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        {!nested ? (
          <span className="flex size-5 shrink-0 items-center justify-center">
            {item.icon}
          </span>
        ) : null}
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
      <div className="space-y-1">
        {item.children!.map((child) => {
          const hasGrandchildren = Boolean(child.children?.length);
          if (hasGrandchildren) {
            return (
              <NavAccordionGroup
                key={`${item.href}-${child.href}-${child.label}`}
                item={child}
                pathname={pathname}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            );
          }
          const active = isActivePath(pathname, child.href);
          return (
            <Link
              key={`${item.href}-${child.href}-${child.label}`}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-9 items-center rounded-xl py-2 pr-4 text-[13px] font-medium transition-colors",
                depth === 0 ? "pl-11" : "pl-14",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}
