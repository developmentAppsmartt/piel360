"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isEnterpriseDoctor, useMyDoctorProfile } from "@/lib/queries/doctors";

const BASE = "/doctor/configuracion";

type ConfigTab = {
  id: string;
  label: string;
  href: string;
  visible?: (ctx: { empresa: boolean }) => boolean;
};

const TABS: ConfigTab[] = [
  { id: "cuenta", label: "Cuenta", href: BASE },
  {
    id: "equipo",
    label: "Equipo",
    href: `${BASE}/equipos`,
    visible: ({ empresa }) => empresa,
  },
  { id: "preferencias", label: "Preferencias", href: `${BASE}/preferencias` },
];

function isTabActive(pathname: string, href: string) {
  if (href === BASE) return pathname === BASE;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ConfiguracionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useMyDoctorProfile();
  const empresa = profile.data ? isEnterpriseDoctor(profile.data) : false;

  const tabs = TABS.filter((tab) => tab.visible?.({ empresa }) ?? true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {empresa
            ? "Administra tu empresa, equipo y preferencias."
            : "Administra tu cuenta, equipo y preferencias."}
        </p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-1 border-b border-border px-4 pt-3">
          {tabs.map((tab) => {
            const active = isTabActive(pathname, tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-b-2 border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
