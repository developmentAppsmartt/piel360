"use client";

import Link from "next/link";
import { Building2, User } from "lucide-react";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import type { PlanType } from "@/lib/queries/plans";

const PLAN_TYPE_OPTIONS: {
  type: PlanType;
  title: string;
  description: string;
  href: string;
  icon: typeof User;
}[] = [
  {
    type: "individual",
    title: "Plan individual",
    description:
      "Para profesionales que trabajan solos. Solo información del plan y revisión.",
    href: "/admin/planes/nuevo/individual",
    icon: User,
  },
  {
    type: "business",
    title: "Plan empresas",
    description:
      "Para equipos y organizaciones. Incluye módulos, permisos y usuarios permitidos.",
    href: "/admin/planes/nuevo/empresas",
    icon: Building2,
  },
];

export default function NuevoPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/admin/planes" className="hover:text-foreground">
            Planes
          </Link>{" "}
          › <span className="text-foreground">Crear nuevo plan</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          ¿Qué tipo de plan vas a crear?
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Elige el flujo según si el plan es para un profesional individual o
          para una empresa con equipo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_TYPE_OPTIONS.map((option) => (
          <Link key={option.type} href={option.href} className="group block">
            <ModuleCard className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <option.icon className="size-6" aria-hidden />
                </span>
                <div>
                  <ModuleCardTitle className="text-base">{option.title}</ModuleCardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                  <p className="mt-3 text-sm font-medium text-primary">
                    Continuar →
                  </p>
                </div>
              </div>
            </ModuleCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
