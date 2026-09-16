"use client";

import type { SkinReportSegmentBucket } from "@piel360/shared";

/**
 * Variante de ScoreDistributionDonut (mismo patrón de arcos encadenados)
 * generalizada a cualquier segmento demográfico en vez de las 4 bandas de
 * puntaje: cada slice es un SkinReportSegmentBucket (valor de Patient, ya
 * con color y % resueltos por el service).
 */
export function SegmentDistributionDonut({
  buckets,
  total,
  centerLabel = "Pacientes",
}: {
  buckets: SkinReportSegmentBucket[];
  total: number;
  centerLabel?: string;
}) {
  const r = 60;
  const c = 2 * Math.PI * r;

  let consumed = 0;
  const arcs = buckets
    .filter((bucket) => bucket.patients > 0)
    .map((bucket) => {
      const fraction = total > 0 ? bucket.patients / total : 0;
      const arc = {
        ...bucket,
        dash: `${fraction * c} ${c - fraction * c}`,
        offset: -consumed * c,
      };
      consumed += fraction;
      return arc;
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            strokeWidth="20"
            className="stroke-muted"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.value}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              strokeWidth="20"
              stroke={arc.color}
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
          <span className="text-2xl font-bold tabular-nums">
            {total.toLocaleString("es-CO")}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {buckets.map((bucket) => (
          <li key={bucket.value} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: bucket.color }}
              aria-hidden
            />
            <span className="flex-1 text-foreground">{bucket.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {bucket.patients}
            </span>
            <span className="w-12 text-right font-semibold tabular-nums">
              {bucket.pct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
