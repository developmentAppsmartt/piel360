import { ArrowLeft, CalendarDays, Clock, Download, FileHeart, Smile, Sun, UserRound } from "lucide-react";
import {
  ANALISIS_PIEL360_OVERALL_TYPE,
  resolveScoreRanges,
  type AnalisisPiel360ScoreBand,
  type AnalisisPiel360ScoreConfig,
} from "@piel360/shared";
import { ModuleCard } from "@/components/ui/module-card";
import { PageBanner } from "@/components/ui/page-banner";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatTile } from "@/components/ui/stat-tile";
import { analisisPiel360ScoreBandLabel } from "@/lib/youcam-metrics";
import { SkinAgeDifference } from "../analisis-piel360-summary";
import { REPORT_BAND_COLOR, ScoreRangeBar } from "./report-score-bar";

const bannerButton =
  "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/40 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-60";

/** Encabezado del «Reporte Salud de la Piel», como la maqueta del cliente. */
export function ReportHeader({
  name,
  photoUrl,
  stamp,
  skinTypeLabel,
  fitzpatrickType,
  overall,
  skinAge,
  chronologicalAge,
  ageDiff,
  band,
  scoreConfig,
  onBack,
  downloading,
  onDownload,
}: {
  name: string;
  photoUrl: string | null;
  stamp: string;
  skinTypeLabel: string | null;
  fitzpatrickType: string | null;
  overall: number | null;
  skinAge: number | null;
  chronologicalAge: number | null;
  ageDiff: number | null;
  band: AnalisisPiel360ScoreBand | null;
  scoreConfig: AnalisisPiel360ScoreConfig | null | undefined;
  onBack: () => void;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="space-y-4">
      <PageBanner
        tone="brand"
        headingLevel="h2"
        icon={FileHeart}
        title="Reporte de Salud de la Piel"
        subtitle="Análisis Estético Piel 360"
        actions={
          <>
            <button type="button" onClick={onBack} className={bannerButton}>
              <ArrowLeft className="size-4" aria-hidden />
              Volver
            </button>
            <button type="button" onClick={onDownload} disabled={downloading} className={bannerButton}>
              <Download className="size-4" aria-hidden />
              {downloading ? "Generando…" : "Descargar PDF"}
            </button>
          </>
        }
      />

      <ModuleCard className="flex items-center gap-4 p-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-4 ring-primary/10">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-lg font-bold">
            <UserRound className="size-5 text-primary" aria-hidden />
            Paciente: {name}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" aria-hidden />
            {stamp}
          </p>
        </div>
      </ModuleCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          layout="stack"
          icon={Smile}
          tone="blue"
          label="Tipo de piel"
          value={
            <span className="mt-1 inline-flex rounded-xl bg-sky-100 px-4 py-1 text-lg dark:bg-sky-950">
              {skinTypeLabel ?? "—"}
            </span>
          }
        />
        <StatTile
          layout="stack"
          icon={CalendarDays}
          tone="violet"
          label="Edad de tu piel"
          value={skinAge != null ? `${Math.round(skinAge)} años` : "—"}
          footer={chronologicalAge != null ? `(Edad actual: ${chronologicalAge} años)` : null}
        />
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/80 bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Puntuación</p>
          {overall != null && band ? (
            <ScoreRing score={overall} color={REPORT_BAND_COLOR[band]} size={92} />
          ) : (
            <p className="text-2xl font-bold">—</p>
          )}
        </div>
      </div>

      <ModuleCard className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {ageDiff != null ? <SkinAgeDifference ageDiff={ageDiff} /> : null}
          <div className="space-y-1 text-sm">
            {band ? (
              <p className="font-semibold text-primary">
                Su piel está en el {analisisPiel360ScoreBandLabel(band).toLowerCase()}
              </p>
            ) : null}
            {fitzpatrickType ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Sun className="size-4 text-amber-500" aria-hidden />
                Fototipo: <span className="font-semibold text-foreground">Tipo {fitzpatrickType}</span>
              </p>
            ) : null}
          </div>
        </div>
        {overall != null ? (
          <ScoreRangeBar score={overall} ranges={resolveScoreRanges(scoreConfig, ANALISIS_PIEL360_OVERALL_TYPE)} />
        ) : null}
      </ModuleCard>
    </div>
  );
}
