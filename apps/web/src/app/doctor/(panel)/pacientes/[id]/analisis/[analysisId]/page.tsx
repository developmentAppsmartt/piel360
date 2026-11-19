"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, ScanFace, Stethoscope, UserRound } from "lucide-react";
import { AnalysisResultsView } from "@/components/analyses/analysis-results-view";
import { Button } from "@/components/ui/button";
import { BannerChip, PageBanner } from "@/components/ui/page-banner";
import { analysisProviderLabel } from "@/lib/analysis-provider-label";
import { bodyRegionLabel } from "@/lib/body-regions";
import { isDermatologicalAnalysis } from "@/lib/patient-comparison";
import { useAnalysis } from "@/lib/queries/analyses";

export default function AnalisisDetallePage() {
  const { id: patientId, analysisId } = useParams<{ id: string; analysisId: string }>();
  const analysis = useAnalysis(analysisId);
  const data = analysis.data;
  const derm = data ? isDermatologicalAnalysis(data) : false;
  const dateLabel = data
    ? `${new Date(data.createdAt).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "medium" })}${
        data.bodyRegion ? ` · ${bodyRegionLabel(data.bodyRegion)}` : ""
      }`
    : null;
  const patientName = data?.patient ? `${data.patient.firstName} ${data.patient.lastName}`.trim() : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageBanner
        tone="brand"
        icon={derm ? Stethoscope : ScanFace}
        title="Análisis de piel"
        subtitle={data ? analysisProviderLabel(data) : "Cargando…"}
        aside={
          data ? (
            <div className="flex flex-col items-start gap-1.5">
              {patientName ? <BannerChip icon={UserRound}>{patientName}</BannerChip> : null}
              {dateLabel ? <BannerChip icon={CalendarDays}>{dateLabel}</BannerChip> : null}
            </div>
          ) : null
        }
        actions={
          <Button
            variant="outline"
            className="gap-1.5 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            nativeButton={false}
            render={<Link href={`/doctor/pacientes/${patientId}`} />}
          >
            <ArrowLeft className="size-4" />
            Volver a la ficha
          </Button>
        }
      />

      <AnalysisResultsView analysisId={analysisId} patientId={patientId} />
    </div>
  );
}
