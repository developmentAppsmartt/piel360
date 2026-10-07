"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FileSearch,
  FileText,
  Gauge,
  Info,
  ListTree,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SkinAnalysisOption = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  href?: string;
};

const SKIN_ANALYSIS_OPTIONS: SkinAnalysisOption[] = [
  {
    id: "score-ranges",
    label: "Rangos de puntuación",
    icon: Gauge,
    href: "/doctor/configuracion/personalizacion/rangos-puntuacion",
    description:
      "Los rangos de puntuación permiten parametrizar qué contenidos se muestran en el análisis y reporte según los rangos de los puntajes de las categorías.",
  },
  {
    id: "categories",
    label: "Categorías y resultados",
    icon: ListTree,
    description:
      "Define qué categorías de la piel se muestran y cómo se presentan sus resultados en el análisis.",
  },
  {
    id: "report",
    label: "Reporte resultados de la piel",
    icon: FileText,
    description:
      "Configura las secciones y el contenido del reporte de resultados que recibe el paciente.",
  },
  {
    id: "generic",
    label: "Configuraciones genéricas",
    icon: Settings,
    description:
      "Ajustes generales que aplican a todo el proceso de análisis de piel.",
  },
  {
    id: "category-description",
    label: "Descripción categoría de la piel en el reporte",
    icon: FileSearch,
    description:
      "Personaliza el texto descriptivo de cada categoría de la piel que aparece en el reporte.",
  },
];

function PreviewPlaceholder() {
  return (
    <div className="aspect-[16/10] w-full rounded-xl border border-border/80 bg-white" />
  );
}

function StepNumber({ value }: { value: number }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {value}
    </span>
  );
}

const CONFIG_BUTTON_CLASS =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-90";

function ConfigButton({ href }: { href?: string }) {
  if (href) {
    return (
      <Link href={href} className={cn(CONFIG_BUTTON_CLASS, "hover:bg-primary/90")}>
        <Settings className="size-4" aria-hidden />
        Configuración
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled
      title="Disponible en una próxima actualización"
      className={CONFIG_BUTTON_CLASS}
    >
      <Settings className="size-4" aria-hidden />
      Configuración
    </button>
  );
}

export function PersonalizacionView() {
  const [selected, setSelected] = useState(SKIN_ANALYSIS_OPTIONS[0].id);
  const active =
    SKIN_ANALYSIS_OPTIONS.find((option) => option.id === selected) ??
    SKIN_ANALYSIS_OPTIONS[0];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Personalización</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Administre la configuración y los contenidos que se utilizan en las
          diferentes páginas de PIEL 360.
        </p>
      </div>

      <section className="grid gap-6 rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(0,320px)_1fr]">
        <PreviewPlaceholder />
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <StepNumber value={1} />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Personalización de identidad corporativa
              </h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Administre la identidad corporativa y los componentes que se van
                a usar en varias páginas de la aplicación.
              </p>
            </div>
          </div>
          <div className="mt-auto flex justify-end">
            <ConfigButton href="/doctor/configuracion/personalizacion/identidad-corporativa" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(0,320px)_1fr]">
        <PreviewPlaceholder />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <StepNumber value={2} />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Análisis de piel
                </h3>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Administre los contenidos de visualización y los componentes
                  para el proceso de Análisis de piel.
                </p>
              </div>
            </div>
            <ConfigButton href={active.href} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {SKIN_ANALYSIS_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = option.id === active.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/5 text-primary"
                      : "border-border/80 text-foreground/80 hover:bg-muted/40",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground/80">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>{active.description}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
