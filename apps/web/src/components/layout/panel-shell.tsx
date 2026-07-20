import type { Role } from "@piel360/shared";
import { Logo } from "./logo";
import type { NavItem } from "./nav-items";
import { PanelHeader } from "./panel-header";
import { SidebarNav } from "./sidebar-nav";

export function PanelShell({
  nav,
  user,
  children,
}: {
  nav: NavItem[];
  user: { email: string; role: Role };
  children: React.ReactNode;
}) {
  // Los componentes de icono se renderizan aquí (Server Component) porque no
  // se pueden pasar como función a SidebarNav ("use client").
  const resolvedNav = nav.map(({ icon: Icon, ...item }) => ({
    ...item,
    icon: <Icon className="size-4 shrink-0" />,
  }));

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 shrink-0 items-center px-6">
          <Logo />
        </div>
        <SidebarNav items={resolvedNav} />
      </aside>

      <div className="flex flex-1 flex-col">
        <PanelHeader email={user.email} role={user.role} />
        <main className="flex-1 space-y-4 p-8">{children}</main>
      </div>
    </div>
  );
}
