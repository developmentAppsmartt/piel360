import { Camera } from "lucide-react";
import {
  analisisPiel360ScoreBandLabel,
  configuredAnalisisPiel360Advice,
  configuredAnalisisPiel360ScoreBand,
  resolveScoreRanges,
  type AnalisisPiel360ScoreConfig,
} from "@piel360/shared";
import type { ReportMetricRow } from "@/lib/youcam-report-rows";
import { REPORT_BAND_COLOR, ScoreRangeBar } from "./report-score-bar";

/** Una métrica (o subcategoría de Arrugas/Poros) del reporte, como la tarjeta
 * de la app: la zona marcada, su nivel con los rangos configurados y el texto
 * de ese nivel. */
export function ReportMetricCard({
  row,
  photoUrl,
  scoreConfig,
}: {
  row: ReportMetricRow;
  photoUrl: string | null;
  scoreConfig: AnalisisPiel360ScoreConfig | undefined;
}) {
  const band = configuredAnalisisPiel360ScoreBand(row.score, row.type, scoreConfig, row.region);
  const color = REPORT_BAND_COLOR[band];
  const advice = configuredAnalisisPiel360Advice(row.type, band, scoreConfig, row.region);

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {photoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3 */}
              <img src={photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
              {row.maskUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3
                <img src={row.maskUrl} alt="" className="absolute inset-0 size-full object-cover" />
              ) : null}
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Camera className="size-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">{row.title}</h3>
            <span className="shrink-0 text-xs font-bold" style={{ color }}>
              {analisisPiel360ScoreBandLabel(band)}
            </span>
          </div>
          <ScoreRangeBar
            score={row.score}
            ranges={resolveScoreRanges(scoreConfig, row.type, row.region)}
            compact
          />
        </div>
      </div>

      <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm leading-relaxed text-foreground">
        {advice}
      </p>
    </article>
  );
}
