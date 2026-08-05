"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Los iconos de lucide-react son componentes (funciones) y no se pueden pasar
// como prop desde un Server Component a este Client Component ("Functions
// cannot be passed directly to Client Components") — por eso PanelShell ya
// los renderiza a ReactNode antes de pasarlos aquí.
export interface ResolvedNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function SidebarNav({ items }: { items: ResolvedNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
      {items.map((item) => {
        // Evitar que `/admin` marque activo todo el panel.
        const isPanelRoot =
          item.href === "/admin" ||
          item.href === "/doctor" ||
          item.href === "/patient/dashboard";
        const active = isPanelRoot
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
