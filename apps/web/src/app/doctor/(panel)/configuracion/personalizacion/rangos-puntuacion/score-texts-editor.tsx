"use client";

import { Info, RotateCcw } from "lucide-react";
import {
  ANALISIS_PIEL360_SCORE_BANDS,
  type AnalisisPiel360BandTexts,
  type AnalisisPiel360ScoreBand,
  type ResolvedScoreRanges,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import {
  SCORE_BAND_LABELS as BAND_LABELS,
  SCORE_BAND_STYLES as BAND_STYLES,
} from "@/lib/score-band-styles";
import { CARD_CLASS } from "./score-config-labels";

function bandRange(band: AnalisisPiel360ScoreBand, ranges: ResolvedScoreRanges) {
  if (band === "regular") return `0 – ${ranges.regularMax - 1}`;
  if (band === "promedio") return `${ranges.regularMax} – ${ranges.promedioMax - 1}`;
  return `${ranges.promedioMax} – 100`;
}

/** Texto de cada nivel. Lo que no se cambia usa el heredado: el de PIEL 360
 * en una métrica, el de su métrica en una subcategoría. */
export function ScoreTextsEditor({
  texts,
  inheritedText,
  inheritedFrom,
  ranges,
  onChange,
}: {
  texts: AnalisisPiel360BandTexts | undefined;
  inheritedText: (band: AnalisisPiel360ScoreBand) => string;
  /** «PIEL 360» o el nombre de la métrica de la que hereda. */
  inheritedFrom: string;
  ranges: ResolvedScoreRanges;
  onChange: (band: AnalisisPiel360ScoreBand, value: string | null) => void;
}) {
  return (
    <section className={CARD_CLASS}>
      <h4 className="text-base font-semibold text-foreground">Textos por nivel</h4>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Se muestran al paciente según el nivel en que quede su puntaje.
      </p>

      <div className="mt-4 space-y-4">
        {ANALISIS_PIEL360_SCORE_BANDS.map((band) => {
          const fallback = inheritedText(band);
          const value = texts?.[band] ?? fallback;
          const inherited = value.trim() === fallback;
          return (
            <div key={band}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", BAND_STYLES[band].chip)}>
                    {BAND_LABELS[band]}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{bandRange(band, ranges)}</span>
                  {inherited ? (
                    <span className="text-xs text-muted-foreground">· De {inheritedFrom}</span>
                  ) : null}
                </div>
                {!inherited ? (
                  <button
                    type="button"
                    onClick={() => onChange(band, null)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    Usar el texto de {inheritedFrom}
                  </button>
                ) : null}
              </div>
              <textarea
                value={value}
                maxLength={1000}
                rows={3}
                aria-label={`Texto ${BAND_LABELS[band]}`}
                onChange={(e) => onChange(band, e.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground/80">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>Si dejas un texto vacío o igual al de {inheritedFrom}, se usa ese.</p>
      </div>
    </section>
  );
}
