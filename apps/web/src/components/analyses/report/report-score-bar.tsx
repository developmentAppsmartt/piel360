import type { AnalisisPiel360ScoreBand, ResolvedScoreRanges } from "@piel360/shared";
import { cn } from "@/lib/utils";

export const REPORT_BAND_COLOR: Record<AnalisisPiel360ScoreBand, string> = {
  regular: "#F59E0B",
  promedio: "#3B82F6",
  buena: "#22C55E",
};

const TICKS = [0, 20, 40, 60, 80, 100];

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Barra de Regular / Promedio / Buena con los límites de Rangos de
 * puntuación (antes fija en 70/20/10) y marcas cada 20. */
export function ScoreRangeBar({
  score,
  ranges,
  compact = false,
}: {
  score: number;
  ranges: ResolvedScoreRanges;
  /** Versión de las tarjetas de métrica: sin rótulos de nivel. */
  compact?: boolean;
}) {
  const regular = clamp(ranges.regularMax);
  const promedio = clamp(ranges.promedioMax) - regular;
  const buena = 100 - regular - promedio;
  const segments: [AnalisisPiel360ScoreBand, number, string][] = [
    ["regular", regular, "Regular"],
    ["promedio", promedio, "Promedio"],
    ["buena", buena, "Buena"],
  ];

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="relative pt-6">
        <span
          className="absolute top-0 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background tabular-nums"
          style={{ left: `${clamp(score)}%` }}
        >
          {Math.round(score)}
        </span>
        <div className={cn("flex overflow-hidden rounded-full", compact ? "h-2" : "h-3")}>
          {segments.map(([band, width]) =>
            width > 0 ? (
              <div key={band} style={{ width: `${width}%`, backgroundColor: REPORT_BAND_COLOR[band] }} />
            ) : null,
          )}
        </div>
      </div>
      <div className="relative h-4 text-[10px] text-muted-foreground tabular-nums">
        {TICKS.map((tick) => (
          <span
            key={tick}
            className={cn(
              "absolute",
              tick === 0 ? "left-0" : tick === 100 ? "right-0" : "-translate-x-1/2",
            )}
            style={tick === 0 || tick === 100 ? undefined : { left: `${tick}%` }}
          >
            {tick}
          </span>
        ))}
      </div>
      {compact ? null : (
        <div className="flex text-xs font-semibold">
          {segments.map(([band, width, label]) =>
            width > 0 ? (
              <span
                key={band}
                className="truncate text-center"
                style={{ width: `${width}%`, color: REPORT_BAND_COLOR[band] }}
              >
                {label}
              </span>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
