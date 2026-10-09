"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HelpCircle, SlidersHorizontal } from "lucide-react";
import {
  YOUCAM_MAIN_METRIC_TYPES,
  YOUCAM_SCORE_BANDS,
  resolveScoreRanges,
  type YoucamScoreBand,
  type YoucamScoreConfig,
} from "@piel360/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { conditionMetricLabel, conditionSentence } from "@/lib/condition-labels";
import { useMyScoreConfig } from "@/lib/queries/score-config";
import { SCORE_BAND_LABELS, SCORE_BAND_STYLES } from "@/lib/score-band-styles";
import { cn } from "@/lib/utils";

const RANGES_HREF = "/doctor/configuracion/personalizacion/rangos-puntuacion";

/** Métricas que NO son un puntaje de 0 a 100 — quien las usa sin saberlo
 * escribe una condición que no se cumple nunca. */
const SPECIAL_METRICS = [
  { type: "hd_skin_type", note: "se elige un tipo (grasa, mixta…), no un número" },
  { type: "patient_age", note: "son años del paciente, no un puntaje" },
  { type: "all", note: "el promedio de todo el análisis" },
];

function bandRange(
  band: YoucamScoreBand,
  ranges: { regularMax: number; promedioMax: number },
): string {
  if (band === "regular") return `0 – ${ranges.regularMax - 1}`;
  if (band === "promedio") return `${ranges.regularMax} – ${ranges.promedioMax - 1}`;
  return `${ranges.promedioMax} – 100`;
}

/** Métricas con cortes propios: los rangos son por métrica, así que mostrar
 * solo los generales sería mentir a quien ya los personalizó. */
function customizedMetrics(config: YoucamScoreConfig | undefined) {
  return Object.entries(config?.metrics ?? {})
    .filter(([, m]) => m?.regularMax != null || m?.promedioMax != null)
    .map(([type]) => ({ type, ranges: resolveScoreRanges(config, type) }));
}

/**
 * Guía de puntajes del tab de productos sugeridos / tratamientos: explica qué
 * es una condición, con qué niveles se corresponde y cómo se parametriza.
 *
 * Se abre sola la primera vez y queda el botón para reabrirla — mismo patrón
 * que `RoutineOnboarding` en Rutinas.
 */
export function ScoreGuideDialog({ kind }: { kind: "plain" | "treatment" }) {
  const [open, setOpen] = useState(false);
  const { data: config } = useMyScoreConfig();
  // Sin esto el foco cae en el primer enlace del contenido ("Rangos de
  // puntuación"); y apuntarlo al botón de cerrar abría el modal con el scroll
  // ya abajo. Enfocar el propio panel lo deja arriba, en el título.
  const panelRef = useRef<HTMLDivElement>(null);

  const esTratamiento = kind === "treatment";
  const sujeto = esTratamiento ? "este tratamiento" : "este grupo de productos";
  const titulo = esTratamiento
    ? "¿Cómo funcionan los tratamientos por puntaje?"
    : "¿Cómo funcionan los puntajes sugeridos?";

  useEffect(() => {
    // localStorage no existe en el server — se abre client-only después del
    // mount para no desincronizar el HTML de SSR/hidratación.
    const storageKey = `piel360-score-guide-${kind}-seen`;
    // En Rutinas la cabecera ya tiene su propio onboarding: si está abierto no
    // nos apilamos encima. Tampoco se marca como vista, así que la guía sale
    // la próxima vez que entre al tab.
    if (document.querySelector('[data-slot="dialog-content"]')) return;
    if (!localStorage.getItem(storageKey)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      localStorage.setItem(storageKey, "1");
    }
  }, [kind]);

  // Los rangos generales de la cuenta; cada métrica puede mover los suyos.
  const ranges = resolveScoreRanges(config, null);
  const personalizadas = useMemo(() => customizedMetrics(config), [config]);

  // Los ejemplos se arman con los cortes reales y se escriben con la misma
  // función que usa el formulario, así que no pueden decir una cosa distinta.
  const ejemplos = [
    {
      frase: conditionSentence(
        { metricType: "hd_wrinkle", operator: "lt", value: ranges.regularMax },
        sujeto,
      ),
      lectura: `Cubre todo el nivel Regular de Arrugas: se recomienda cuando el paciente está por debajo de ${ranges.regularMax}.`,
    },
    {
      frase: conditionSentence(
        {
          metricType: "hd_acne",
          operator: "between",
          value: ranges.regularMax,
          valueTo: ranges.promedioMax - 1,
        },
        sujeto,
      ),
      lectura:
        "«Entre» incluye los dos extremos — aquí, justo el nivel Promedio de Acné.",
    },
    {
      frase: conditionSentence(
        { metricType: "hd_dark_circle", operator: "lt", value: ranges.regularMax },
        sujeto,
      ),
      lectura:
        "Si añades varias condiciones, basta con que se cumpla UNA para que se recomiende. No hace falta que se cumplan todas.",
    },
  ];

  const pasos = [
    esTratamiento
      ? "Crea el tratamiento con su nombre y su categoría."
      : "Crea el grupo con un nombre que reconozcas después.",
    "Añade las condiciones: elige la métrica, el operador y el puntaje.",
    "Guarda. El grupo ya queda listo para evaluarse en cada análisis.",
    "Entra a editarlo y añade los productos que se van a recomendar.",
  ];

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <HelpCircle className="mr-1 size-4" />
        {titulo}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={panelRef}
          className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
          initialFocus={panelRef}
        >
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground">
              Cada análisis facial puntúa de <strong>0 a 100</strong> cosas como
              arrugas, poros o hidratación, y{" "}
              <strong>mientras más alto, mejor está la piel</strong>. Una{" "}
              <strong>condición</strong> compara ese puntaje con un número que
              eliges tú, y así{" "}
              {esTratamiento ? "el tratamiento" : "el grupo de productos"} se
              recomienda solo cuando toca.
            </p>

            {/* Los tres niveles */}
            <section className="space-y-2">
              <h3 className="font-medium">Los tres niveles de puntaje</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {YOUCAM_SCORE_BANDS.map((band) => (
                  <div
                    key={band}
                    className="rounded-xl border border-border bg-card p-3"
                  >
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        SCORE_BAND_STYLES[band].chip,
                      )}
                    >
                      {SCORE_BAND_LABELS[band]}
                    </span>
                    <p className="mt-2 text-base font-semibold tabular-nums">
                      {bandRange(band, ranges)}
                    </p>
                  </div>
                ))}
              </div>
              {personalizadas.length > 0 ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {personalizadas.map(({ type, ranges: r }) => (
                    <li key={type}>
                      <strong className="text-foreground">
                        {conditionMetricLabel(type)}
                      </strong>{" "}
                      tiene rangos propios: {bandRange("regular", r)} ·{" "}
                      {bandRange("promedio", r)} · {bandRange("buena", r)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Son los mismos niveles que ve el paciente en su reporte. Puedes
                moverlos, métrica por métrica, en{" "}
                <Link
                  href={RANGES_HREF}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Rangos de puntuación
                </Link>
                .
              </p>
            </section>

            {/* Métricas */}
            <section className="space-y-2">
              <h3 className="font-medium">Qué puedes condicionar</h3>
              <div className="flex flex-wrap gap-1.5">
                {YOUCAM_MAIN_METRIC_TYPES.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {conditionMetricLabel(type)}
                  </span>
                ))}
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {SPECIAL_METRICS.map(({ type, note }) => (
                  <li key={type}>
                    <strong className="text-foreground">
                      {conditionMetricLabel(type)}
                    </strong>{" "}
                    — {note}.
                  </li>
                ))}
              </ul>
            </section>

            {/* Ejemplos */}
            <section className="space-y-2">
              <h3 className="font-medium">Cómo se leen</h3>
              {ejemplos.map((ejemplo) => (
                <div
                  key={ejemplo.frase}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <p className="font-medium text-primary">
                    &ldquo;{ejemplo.frase}&rdquo;
                  </p>
                  <p className="mt-1 text-muted-foreground">{ejemplo.lectura}</p>
                </div>
              ))}
            </section>

            {/* Pasos */}
            <section className="space-y-2">
              <h3 className="font-medium">Cómo parametrizar una regla</h3>
              <ol className="space-y-2">
                {pasos.map((paso, i) => (
                  <li key={paso} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{paso}</span>
                  </li>
                ))}
              </ol>
              <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-primary" />
                Si nada se recomienda, suele ser porque el puntaje no cae en el
                rango: revisa el operador y el número contra los niveles de
                arriba.
              </p>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
