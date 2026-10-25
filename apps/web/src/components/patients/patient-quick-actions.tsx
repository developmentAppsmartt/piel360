"use client";

import Link from "next/link";
import { Box, ChevronRight, Pencil, type LucideIcon } from "lucide-react";
import {
  newAnalysisHref,
  useAllowedAnalysisOptions,
} from "./new-analysis-options";

type QuickAction = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

/** Accesos de la ficha del paciente: editar, iniciar cada análisis
 * habilitado y el historial 3D. */
export function PatientQuickActions({ patientId }: { patientId: string }) {
  const options = useAllowedAnalysisOptions();
  const actions: QuickAction[] = [
    {
      href: `/doctor/pacientes/${patientId}/editar`,
      title: "Editar",
      subtitle: "Datos del paciente",
      icon: Pencil,
    },
    ...options.map((option) => ({
      href: newAnalysisHref(patientId, option),
      title: option.shortLabel,
      subtitle: option.subtitle,
      icon: option.icon,
    })),
    // Título corto como en el mockup: el nombre completo («Historial 3D
    // análisis dermatológico») va en la página, aquí no cabe en una línea.
    {
      href: `/doctor/pacientes/${patientId}/historial-3d`,
      title: "Historial 3D",
      subtitle: "Análisis dermatológico",
      icon: Box,
    },
  ];

  return (
    <nav className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <action.icon className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-tight font-semibold text-primary">
              {action.title}
            </span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {action.subtitle}
            </span>
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ))}
    </nav>
  );
}
