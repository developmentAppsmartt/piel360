"use client";

import { useState } from "react";
import { RecommendedRoutines } from "@/components/routines/recommended-routines";
import { RecommendedTreatments } from "@/components/treatments/recommended-treatments";
import { cn } from "@/lib/utils";

type Tab = "todas" | "rutinas" | "productos" | "suplementos" | "tratamientos";

const TABS: { id: Tab; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "rutinas", label: "Rutinas" },
  { id: "productos", label: "Productos" },
  { id: "suplementos", label: "Suplementos" },
  { id: "tratamientos", label: "Tratamientos" },
];

export function RecommendationsPanel({
  analysisId,
  metricType,
}: {
  analysisId: string;
  /** Métrica activa arriba (ej. "hd_wrinkle") o null en la pestaña "Salud de la piel" (sin filtrar). */
  metricType: string | null;
}) {
  const [tab, setTab] = useState<Tab>("todas");

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Recomendaciones</h3>

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "todas" && (
        <>
          <RecommendedRoutines analysisId={analysisId} metricType={metricType} />
          <RecommendedTreatments analysisId={analysisId} metricType={metricType} kind="treatment" />
          <RecommendedTreatments analysisId={analysisId} metricType={metricType} kind="plain" />
        </>
      )}

      {tab === "rutinas" && (
        <RecommendedRoutines
          analysisId={analysisId}
          metricType={metricType}
          emptyMessage="No hay rutinas recomendadas para esta métrica."
        />
      )}

      {tab === "productos" && (
        <RecommendedTreatments
          analysisId={analysisId}
          metricType={metricType}
          kind="plain"
          productType="product"
          emptyMessage="No hay productos sugeridos para esta métrica."
        />
      )}

      {tab === "suplementos" && (
        <RecommendedTreatments
          analysisId={analysisId}
          metricType={metricType}
          kind="plain"
          productType="supplement"
          emptyMessage="No hay suplementos sugeridos para esta métrica."
        />
      )}

      {tab === "tratamientos" && (
        <RecommendedTreatments
          analysisId={analysisId}
          metricType={metricType}
          kind="treatment"
          emptyMessage="No hay tratamientos recomendados para esta métrica."
        />
      )}
    </div>
  );
}
