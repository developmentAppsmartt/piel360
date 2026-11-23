"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Info, LifeBuoy, LogOut, Settings } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { logoutAction } from "@/lib/actions/auth";
import { useClearClientQueryCache } from "@/lib/clear-client-query-cache";
import { cn } from "@/lib/utils";
import { AboutDialogContent } from "./about-dialog";
import type { ResolvedNavItem } from "./sidebar-nav";

const ITEM =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted";

/** «Configuración» (con sus hijos) y «Soporte» salen del mismo menú que el
 * lateral, así respetan los mismos permisos. */
function menuSections(items: ResolvedNavItem[]) {
  const settings = items.find((i) => i.href.includes("/configuracion"));
  const support = items.find((i) => i.href.endsWith("/soporte"));
  return {
    settingsLinks: settings ? (settings.children?.length ? settings.children : [settings]) : [],
    support,
  };
}

/**
 * Menú desplegable del encabezado: el chip con la foto y el rol abre
 * perfil, Configuración, Soporte, Acerca de y Cerrar sesión.
 */
export function PanelHeaderMenu({
  chip,
  avatar,
  name,
  subtitle,
  navItems,
}: {
  /** Lo que se ve en el encabezado (avatar + rol). */
  chip: ReactNode;
  avatar: ReactNode;
  name: string;
  subtitle: string;
  navItems: ResolvedNavItem[];
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const clearClientCache = useClearClientQueryCache();
  const { settingsLinks, support } = menuSections(navItems);

  async function logout() {
    clearClientCache();
    await logoutAction();
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Abrir menú de usuario"
          className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pr-2.5 pl-1 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[popup-open]:bg-muted"
        >
          {chip}
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="end" className="z-50">
            <Menu.Popup className="w-64 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl outline-none">
              <div className="flex items-center gap-3 px-3 pt-2 pb-3">
                {avatar}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
              <Menu.Separator className="my-1 h-px bg-border" />

              {settingsLinks.length ? (
                <Menu.Group>
                  <Menu.GroupLabel className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted-foreground">
                    <Settings className="size-4" aria-hidden />
                    Configuración
                  </Menu.GroupLabel>
                  {settingsLinks.map((item) => (
                    <Menu.LinkItem key={item.href} render={<Link href={item.href} />} className={cn(ITEM, "pl-9")}>
                      {item.label}
                    </Menu.LinkItem>
                  ))}
                </Menu.Group>
              ) : null}

              {support ? (
                <Menu.LinkItem render={<Link href={support.href} />} className={ITEM}>
                  <LifeBuoy className="size-4 text-muted-foreground" aria-hidden />
                  {support.label}
                </Menu.LinkItem>
              ) : null}

              <Menu.Item className={ITEM} onClick={() => setAboutOpen(true)}>
                <Info className="size-4 text-muted-foreground" aria-hidden />
                Acerca de
              </Menu.Item>

              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item className={cn(ITEM, "text-destructive")} onClick={() => void logout()}>
                <LogOut className="size-4" aria-hidden />
                Cerrar sesión
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <AboutDialogContent />
      </Dialog>
    </>
  );
}
