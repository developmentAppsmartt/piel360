"use client";

import { AnalysesTable } from "@/components/analyses/analyses-table";
import { useAnalyses } from "@/lib/queries/analyses";

export default function AnalisisPage() {
  const analyses = useAnalyses();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Análisis y resultados</h1>

      {analyses.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {analyses.error && <p className="text-destructive">No se pudo cargar el historial.</p>}
      {analyses.data && <AnalysesTable analyses={analyses.data} />}
    </div>
  );
}
