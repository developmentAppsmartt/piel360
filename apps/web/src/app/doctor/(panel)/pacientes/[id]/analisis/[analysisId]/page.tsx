"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analysisProviderLabel } from "@/lib/analysis-provider-label";
import { bodyRegionLabel } from "@/lib/body-regions";
import { useAnalysis } from "@/lib/queries/analyses";

export default function AnalisisDetallePage() {
  const { id: patientId, analysisId } = useParams<{ id: string; analysisId: string }>();
  const analysis = useAnalysis(analysisId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1>Análisis</h1>
            {analysis.data && (
              <Badge variant="outline">{analysisProviderLabel(analysis.data)}</Badge>
            )}
          </div>
          {analysis.data && (
            <p className="text-sm text-muted-foreground">
              {new Date(analysis.data.createdAt).toLocaleDateString("es-CO", {
                dateStyle: "long",
              })}
              {analysis.data.bodyRegion ? ` — ${bodyRegionLabel(analysis.data.bodyRegion)}` : ""}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          nativeButton={false}
          render={<Link href={`/doctor/pacientes/${patientId}`} />}
        >
          Volver a la ficha
        </Button>
      </div>

      <AnalysisResultsView analysisId={analysisId} patientId={patientId} />
    </div>
  );
}
