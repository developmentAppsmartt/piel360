"use client";

import { useMemo } from "react";
import { ArrowLeft, Download } from "lucide-react";
import {
  ANALISIS_PIEL360_OVERALL_TYPE,
  configuredAnalisisPiel360ScoreBand,
  resolveScoreRanges,
} from "@piel360/shared";
import { FitzpatrickResultsSection } from "@/components/analyses/fitzpatrick-results-section";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-error";
import { type AnalysisDetail, useDownloadAnalisisPiel360Report } from "@/lib/queries/analyses";
import { useEffectiveScoreConfig } from "@/lib/queries/score-config";
import { ANALISIS_PIEL360_METRIC_LABELS, analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import { buildReportRows } from "@/lib/youcam-report-rows";
import {
  chronologicalAgeYears,
  formatSignedYears,
  skinAgeDifference,
  skinAgeDifferenceMessage,
} from "@/lib/skin-age";
import {
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  parseAnalisisPiel360Metrics,
  analisisPiel360OverallScore,
  analisisPiel360ScoreBandLabel,
  analisisPiel360ScoresByType,
  analisisPiel360SkinAge,
  analisisPiel360SkinType,
  type AnalisisPiel360RawResponse,
} from "@/lib/youcam-metrics";
import { ReportMetricCard } from "./report/report-metric-card";
import { ReportRadarChart } from "./report/report-radar-chart";
import { ScoreRangeBar } from "./report/report-score-bar";

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MAIN_METRIC_SET = new Set<string>(ANALISIS_PIEL360_MAIN_METRIC_TYPES);

/** El mismo resumen que el reporte de la app móvil. */
function buildSummary(
  scores: Record<string, number>,
  overall: number | null,
  skinTypeLabel: string | null,
): string {
  // Solo métricas principales: `scores` también trae `skin_age` y `all`, y el
  // resumen llegaba a pedir «cuidado en Edad de la piel».
  const lows = Object.entries(scores)
    .filter(([type, v]) => MAIN_METRIC_SET.has(type) && v < 70)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => ANALISIS_PIEL360_METRIC_LABELS[type] ?? type);
  const typeHint = skinTypeLabel ? ` Tu tipo de piel es ${skinTypeLabel.toLowerCase()}.` : "";

  if (overall != null && overall >= 90) {
    return `Ya vas camino a una gran piel.${typeHint} Mantén tu rutina y protección solar diaria. Revisa el detalle de cada métrica abajo.`;
  }
  if (overall != null && overall >= 70) {
    return `Vas en el promedio.${typeHint}${
      lows.length ? ` Un poco más de cuidado en ${lows.join(", ")} puede marcar la diferencia.` : ""
    } Revisa el análisis completo abajo.`;
  }
  if (lows.length === 0) {
    return `Hay margen de mejora general.${typeHint} Prioriza hidratación, SPF y una rutina constante.`;
  }
  return `Prioriza mejorar: ${lows.join(", ")}.${typeHint} Considera hidratación, protección solar y seguimiento dermatológico si persisten las molestias.`;
}

const ageTone = (diff: number) =>
  diff < 0
    ? "text-emerald-600 dark:text-emerald-400"
    : diff > 0
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground";

/** «Reporte Salud de la Piel»: mismo orden y contenido que el de la app
 * móvil; los niveles, las barras y los textos usan Rangos de puntuación. */
export function AnalisisPiel360ReportView({
  analysis,
  patientName,
  onBack,
}: {
  analysis: AnalysisDetail;
  patientName?: string;
  onBack: () => void;
}) {
  const metrics = useMemo(
    () => parseAnalisisPiel360Metrics(analysis.aiRawResponse as AnalisisPiel360RawResponse | null),
    [analysis.aiRawResponse],
  );
  const { data: scoreConfig } = useEffectiveScoreConfig();
  // Puntuación ajustada (uiScore): la elige el doctor; sin toggle en el análisis.
  const scores = useMemo(() => analisisPiel360ScoresByType(metrics, false), [metrics]);
  const rows = useMemo(() => buildReportRows(metrics, analysis.masks), [metrics, analysis.masks]);
  const overall = analisisPiel360OverallScore(metrics);
  const skinAge = analysis.skinAgeYears ?? analisisPiel360SkinAge(metrics);
  const chronologicalAge =
    analysis.chronologicalAgeYears ?? chronologicalAgeYears(analysis.patient?.birthDate, analysis.createdAt);
  const ageDiff = analysis.skinAgeDifference ?? skinAgeDifference(skinAge, chronologicalAge);
  const skinType = analisisPiel360SkinType(metrics);
  const skinTypeLabel = skinType ? analisisPiel360SkinTypeLabel(skinType) : null;
  const fitzpatrickType = analysis.patient?.fitzpatrickType ?? null;
  const band =
    overall != null
      ? configuredAnalisisPiel360ScoreBand(overall, ANALISIS_PIEL360_OVERALL_TYPE, scoreConfig)
      : null;
  const photoUrl = analysis.hasOriginalPhoto ? analysis.imageUrl : null;
  const name =
    patientName ??
    (analysis.patient ? `${analysis.patient.firstName} ${analysis.patient.lastName}`.trim() : "Paciente");

  const downloadReport = useDownloadAnalisisPiel360Report(analysis.id);

  async function handleDownloadPdf() {
    if (downloadReport.isPending) return;
    try {
      const { url } = await downloadReport.mutateAsync();
      window.open(url, "_blank", "noreferrer");
    } catch (err) {
      window.alert(
        err instanceof ApiError
          ? err.message
          : "No se pudo generar el reporte en PDF. Inténtalo de nuevo en unos segundos.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold tracking-tight">Reporte Salud de la Piel</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
          title="Descargar PDF"
          disabled={downloadReport.isPending}
          onClick={() => void handleDownloadPdf()}
        >
          <Download className="size-4" />
          <span className="text-sm font-medium">{downloadReport.isPending ? "Generando…" : "Descargar PDF"}</span>
        </button>
      </div>

      <ModuleCard className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-14 overflow-hidden rounded-full bg-primary/10">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div>
            <p className="font-semibold">Paciente: {name}</p>
            <p className="text-sm text-muted-foreground">{formatStamp(analysis.createdAt)}</p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            Tipo de piel: <span className="font-semibold">{skinTypeLabel ?? "—"}</span>
          </p>
          {fitzpatrickType ? (
            <p>
              Piel: <span className="font-semibold">Tipo {fitzpatrickType}</span>
            </p>
          ) : null}
          <p>
            Puntuación de la piel:{" "}
            <span className="font-semibold">{overall != null ? Math.round(overall) : "—"}</span>
          </p>
          <p>
            Edad de tu piel:{" "}
            <span className="font-semibold">{skinAge != null ? `${Math.round(skinAge)} años` : "—"}</span>
          </p>
          <p>
            Edad cronológica:{" "}
            <span className="font-semibold text-muted-foreground">
              {chronologicalAge != null ? `${chronologicalAge} años` : "—"}
            </span>
          </p>
          {ageDiff != null ? (
            <>
              <p className={cn("font-semibold", ageTone(ageDiff))}>Diferencia: {formatSignedYears(ageDiff)}</p>
              <p className={cn("font-medium", ageTone(ageDiff))}>{skinAgeDifferenceMessage(ageDiff)}</p>
            </>
          ) : null}
          {band ? (
            <p className="font-semibold text-primary">
              Su piel está en el {analisisPiel360ScoreBandLabel(band).toLowerCase()}
            </p>
          ) : null}
        </div>

        {fitzpatrickType ? <FitzpatrickResultsSection analysis={analysis} compact silentIfEmpty /> : null}

        {overall != null ? (
          <ScoreRangeBar
            score={overall}
            ranges={resolveScoreRanges(scoreConfig, ANALISIS_PIEL360_OVERALL_TYPE)}
          />
        ) : null}

        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-xs font-bold tracking-wide text-muted-foreground">RESUMEN</p>
          <p className="mt-1 text-sm leading-relaxed">{buildSummary(scores, overall, skinTypeLabel)}</p>
        </div>

        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-xs font-bold tracking-wide text-muted-foreground">OBSERVACIONES DEL MÉDICO</p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">
            {analysis.doctorNotes?.trim() ? analysis.doctorNotes : "Sin observaciones del médico todavía."}
          </p>
        </div>

        <div className="flex justify-center py-2">
          <ReportRadarChart scores={scores} color="var(--primary)" />
        </div>
      </ModuleCard>

      <h3 className="text-base font-semibold">Detalle por métrica</h3>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <ReportMetricCard key={row.key} row={row} photoUrl={photoUrl} scoreConfig={scoreConfig} />
        ))}
      </div>
    </div>
  );
}
