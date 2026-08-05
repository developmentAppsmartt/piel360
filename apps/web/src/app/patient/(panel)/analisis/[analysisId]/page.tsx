"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/lib/queries/analyses";
import { useMyPatient } from "@/lib/queries/patients";

export default function PatientAnalisisDetallePage() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const analysis = useAnalysis(analysisId);
  const me = useMyPatient();
  const patientId = analysis.data?.patientId ?? me.data?.id ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1>Análisis</h1>
            {analysis.data && (
              <Badge variant="outline">
                {analysis.data.youcamTaskId ? "YouCam" : "Skiniver"}
              </Badge>
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
          render={<Link href="/patient/analisis" />}
        >
          Volver
        </Button>
      </div>

      {patientId ? (
        <AnalysisResultsView
          analysisId={analysisId}
          patientId={patientId}
          hideConfirm
          patientName={
            me.data
              ? `${me.data.firstName} ${me.data.lastName}`.trim()
              : undefined
          }
        />
      ) : (
        <p className="text-muted-foreground">Cargando...</p>
      )}
    </div>
  );
}
