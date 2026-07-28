"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/lib/queries/analyses";

export default function AnalisisDetallePage() {
  const { id: patientId, analysisId } = useParams<{ id: string; analysisId: string }>();
  const analysis = useAnalysis(analysisId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Análisis</h1>
            {analysis.data && (
              <Badge variant="outline">{analysis.data.youcamTaskId ? "YouCam" : "Skiniver"}</Badge>
            )}
          </div>
          {analysis.data && (
            <p className="text-sm text-muted-foreground">
              {new Date(analysis.data.createdAt).toLocaleDateString("es-CO", {
                dateStyle: "long",
              })}
              {analysis.data.bodyRegion ? ` — ${analysis.data.bodyRegion}` : ""}
            </p>
          )}
        </div>
        <Button
          variant="outline"
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
