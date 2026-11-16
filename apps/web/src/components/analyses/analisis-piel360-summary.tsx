import { ArrowDown, ArrowUp, CalendarDays, HeartPulse, Lightbulb, Palette, Star, Sun } from "lucide-react";
import {
  ANALISIS_PIEL360_OVERALL_TYPE,
  configuredAnalisisPiel360Advice,
  configuredAnalisisPiel360ScoreBand,
  resolveScoreRanges,
  type AnalisisPiel360ScoreConfig,
} from "@piel360/shared";
import { ModuleCard } from "@/components/ui/module-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatTile } from "@/components/ui/stat-tile";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import { analisisPiel360ScoreBandLabel } from "@/lib/youcam-metrics";
import { formatSignedYears, skinAgeDifferenceMessage } from "@/lib/skin-age";
import { cn } from "@/lib/utils";
import { REPORT_BAND_COLOR, ScoreRangeBar } from "./report/report-score-bar";

const diffTone = (diff: number) =>
  diff < 0
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : diff > 0
      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : "bg-muted text-muted-foreground";

/** Diferencia de edad con su flecha y el mensaje (rojo si envejece, verde si
 * rejuvenece). La comparten el resumen del análisis y el del reporte. */
export function SkinAgeDifference({ ageDiff }: { ageDiff: number }) {
  const Arrow = ageDiff > 0 ? ArrowUp : ArrowDown;
  return (
    <div className="space-y-2">
      <p className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold", diffTone(ageDiff))}>
        {ageDiff !== 0 ? <Arrow className="size-4" aria-hidden /> : null}
        Diferencia: {formatSignedYears(ageDiff)}
      </p>
      <p className="text-base font-semibold text-foreground">{skinAgeDifferenceMessage(ageDiff)}</p>
    </div>
  );
}

/** Resumen de arriba del análisis estético, como la maqueta del cliente:
 * tarjetas, anillo, barra con los rangos configurados y el texto del nivel. */
export function AnalisisPiel360Summary({
  skinAge,
  chronologicalAge,
  overall,
  ageDiff,
  skinType,
  fitzpatrickDetail,
  scoreConfig,
}: {
  skinAge: number | null;
  chronologicalAge: number | null;
  overall: number | null;
  ageDiff: number | null;
  skinType: string | null;
  fitzpatrickDetail: string | null;
  scoreConfig: AnalisisPiel360ScoreConfig | null | undefined;
}) {
  const band =
    overall != null ? configuredAnalisisPiel360ScoreBand(overall, ANALISIS_PIEL360_OVERALL_TYPE, scoreConfig) : null;
  const advice = band ? configuredAnalisisPiel360Advice(ANALISIS_PIEL360_OVERALL_TYPE, band, scoreConfig) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          layout="stack"
          icon={HeartPulse}
          tone="blue"
          label="Salud de la piel"
          value={overall != null ? `${Math.round(overall)} / 100` : "—"}
          footer="Puntaje general"
        />
        <StatTile
          layout="stack"
          icon={CalendarDays}
          tone="violet"
          label="Edad de la piel"
          value={<span className="text-primary">{skinAge != null ? `${Math.round(skinAge)} años` : "—"}</span>}
          footer="(Edad actual)"
        />
        <StatTile
          layout="stack"
          icon={Star}
          tone="amber"
          label="Edad cronológica"
          value={chronologicalAge != null ? `${chronologicalAge} años` : "—"}
        />
      </div>

      {overall != null && band ? (
        <ModuleCard className="space-y-5 p-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <ScoreRing score={overall} color={REPORT_BAND_COLOR[band]} size={120} />
            <div className="w-full border-border/80 sm:border-l sm:pl-5">
              {ageDiff != null ? (
                <SkinAgeDifference ageDiff={ageDiff} />
              ) : (
                <p className="text-base font-semibold">
                  Su piel está en el nivel {analisisPiel360ScoreBandLabel(band).toLowerCase()}
                </p>
              )}
            </div>
          </div>
          <ScoreRangeBar score={overall} ranges={resolveScoreRanges(scoreConfig, ANALISIS_PIEL360_OVERALL_TYPE)} />
          <p className="flex items-start gap-3 rounded-xl bg-sky-50 p-3 text-sm dark:bg-sky-950/30">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
            <span>
              Tu piel tiene un puntaje de <strong>{Math.round(overall)}/100</strong>, un nivel{" "}
              <strong>{analisisPiel360ScoreBandLabel(band).toLowerCase()}</strong>.{advice ? ` ${advice}` : ""}
            </span>
          </p>
        </ModuleCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          icon={Palette}
          tone="orange"
          label="Biotipo"
          value={skinType ? analisisPiel360SkinTypeLabel(skinType) : "—"}
        />
        <StatTile icon={Sun} tone="amber" label="Fototipo" value={fitzpatrickDetail ?? "Sin registrar"} />
      </div>
    </div>
  );
}
