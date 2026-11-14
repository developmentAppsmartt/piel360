"use client";

import { useState } from "react";
import type {
  AnalisisPiel360MetricScoreConfig,
  ResolvedScoreRanges,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import { SCORE_BAND_STYLES as BAND_STYLES } from "@/lib/score-band-styles";

const INPUT_CLASS =
  "h-10 w-20 rounded-lg border border-border bg-background px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const FIXED_CLASS =
  "inline-flex h-10 w-20 items-center rounded-lg bg-muted px-3 text-sm tabular-nums text-muted-foreground";
const CHIP_CLASS = "w-24 rounded-full px-2.5 py-1 text-center text-xs font-semibold";

function parseInt0(value: string): number | null {
  if (value.trim() === "" || value.trim() === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Campo numérico que deja borrar y reescribir sin saltar al valor anterior:
 * mientras tiene el foco muestra lo tecleado; fuera de él, el valor. */
function NumberField({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={editing ?? String(value)}
      aria-label={label}
      onFocus={() => setEditing(String(value))}
      onChange={(e) => {
        setEditing(e.target.value);
        const n = parseInt0(e.target.value);
        if (n != null) onChange(n);
      }}
      onBlur={() => setEditing(null)}
      className={INPUT_CLASS}
    />
  );
}

/** Límites de Regular / Promedio / Buena. Al mover un límite se ajusta el vecino. */
export function ScoreRangesEditor({
  ranges,
  onPatch,
}: {
  ranges: ResolvedScoreRanges;
  onPatch: (patch: Partial<AnalisisPiel360MetricScoreConfig>) => void;
}) {
  const valid = ranges.regularMax >= 1 && ranges.regularMax < ranges.promedioMax && ranges.promedioMax <= 100;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-foreground">Rangos</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Puntaje de cada nivel, de 0 a 100. Al mover un límite se ajusta el nivel vecino.
      </p>
      <div className="mt-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn(CHIP_CLASS, BAND_STYLES.regular.chip)}>Regular</span>
          <span className={FIXED_CLASS}>0</span>
          <span className="text-sm text-muted-foreground">a</span>
          <NumberField
            value={ranges.regularMax - 1}
            min={0}
            max={98}
            label="Regular hasta"
            onChange={(n) => onPatch({ regularMax: n + 1 })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn(CHIP_CLASS, BAND_STYLES.promedio.chip)}>Promedio</span>
          <NumberField
            value={ranges.regularMax}
            min={1}
            max={99}
            label="Promedio desde"
            onChange={(n) => onPatch({ regularMax: n })}
          />
          <span className="text-sm text-muted-foreground">a</span>
          <NumberField
            value={ranges.promedioMax - 1}
            min={1}
            max={99}
            label="Promedio hasta"
            onChange={(n) => onPatch({ promedioMax: n + 1 })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn(CHIP_CLASS, BAND_STYLES.buena.chip)}>Buena</span>
          <NumberField
            value={ranges.promedioMax}
            min={2}
            max={100}
            label="Buena desde"
            onChange={(n) => onPatch({ promedioMax: n })}
          />
          <span className="text-sm text-muted-foreground">a</span>
          <span className={FIXED_CLASS}>100</span>
        </div>
      </div>
      {valid ? (
        <div className="mt-4 flex h-2.5 max-w-md overflow-hidden rounded-full">
          <div className={BAND_STYLES.regular.bar} style={{ width: `${ranges.regularMax}%` }} />
          <div
            className={BAND_STYLES.promedio.bar}
            style={{ width: `${ranges.promedioMax - ranges.regularMax}%` }}
          />
          <div className={cn("flex-1", BAND_STYLES.buena.bar)} />
        </div>
      ) : null}
    </div>
  );
}
