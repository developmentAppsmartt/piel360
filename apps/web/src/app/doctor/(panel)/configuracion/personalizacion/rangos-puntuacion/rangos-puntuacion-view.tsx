"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Loader2, RotateCcw } from "lucide-react";
import {
  YOUCAM_METRIC_LABELS,
  YOUCAM_SCORE_BANDS,
  YOUCAM_SCORE_CONFIG_METRICS,
  defaultYoucamAdvice,
  resolveScoreRanges,
  sanitizeYoucamScoreConfig,
  type YoucamMetricScoreConfig,
  type YoucamScoreBand,
  type YoucamScoreConfig,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import { useMyScoreConfig, useUpdateScoreConfig } from "@/lib/queries/score-config";

const BAND_LABELS: Record<YoucamScoreBand, string> = {
  regular: "Regular",
  promedio: "Promedio",
  buena: "Buena",
};

const BAND_STYLES: Record<YoucamScoreBand, { bar: string; chip: string }> = {
  regular: { bar: "bg-rose-400", chip: "bg-rose-50 text-rose-700" },
  promedio: { bar: "bg-amber-400", chip: "bg-amber-50 text-amber-700" },
  buena: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
};

const CARD_CLASS =
  "rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

const INPUT_CLASS =
  "h-10 w-20 rounded-lg border border-border bg-background px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function metricLabel(type: string) {
  return YOUCAM_METRIC_LABELS[type] ?? type;
}

function isCustomized(metric: YoucamMetricScoreConfig | undefined) {
  return !!metric && Object.keys(metric).length > 0;
}

/** Quita textos iguales al por defecto para que sigan las futuras mejoras del texto base. */
function withoutDefaultTexts(config: YoucamScoreConfig): YoucamScoreConfig {
  const metrics: YoucamScoreConfig["metrics"] = {};
  for (const [type, metric] of Object.entries(config.metrics)) {
    const texts = Object.fromEntries(
      Object.entries(metric.texts ?? {}).filter(
        ([band, text]) =>
          text?.trim() &&
          text.trim() !== defaultYoucamAdvice(type, band as YoucamScoreBand),
      ),
    );
    metrics[type] = { ...metric, texts };
  }
  return { ...config, metrics };
}

function parseInt0(value: string): number | null {
  if (value.trim() === "" || value.trim() === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Campo numérico que deja borrar y reescribir sin saltar al valor anterior. */
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
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((prev) => (parseInt0(prev) === value ? prev : String(value)));
  }, [value]);
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseInt0(e.target.value);
        if (n != null) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      className={INPUT_CLASS}
    />
  );
}

export function RangosPuntuacionView() {
  const query = useMyScoreConfig();
  const update = useUpdateScoreConfig();
  const [draft, setDraft] = useState<YoucamScoreConfig | null>(null);
  const [selected, setSelected] = useState<string>(YOUCAM_SCORE_CONFIG_METRICS[0]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (query.data && !draft) setDraft(query.data);
  }, [query.data, draft]);

  const normalized = useMemo(() => {
    if (!draft) return { config: null, error: null as string | null };
    try {
      return { config: sanitizeYoucamScoreConfig(withoutDefaultTexts(draft)), error: null };
    } catch (err) {
      return { config: null, error: err instanceof Error ? err.message : "Configuración inválida" };
    }
  }, [draft]);

  const dirty = useMemo(() => {
    if (!draft || !query.data) return false;
    if (!normalized.config) return true;
    return JSON.stringify(normalized.config) !== JSON.stringify(query.data);
  }, [draft, normalized.config, query.data]);

  if (query.isLoading || (!draft && !query.isError)) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Cargando rangos de puntuación…
      </div>
    );
  }

  if (query.isError || !draft) {
    return (
      <p className="py-10 text-sm text-destructive">
        No se pudieron cargar los rangos de puntuación.{" "}
        {query.error instanceof Error ? query.error.message : "Intenta de nuevo más tarde."}
      </p>
    );
  }

  const metric = draft.metrics[selected] ?? {};
  const ranges = resolveScoreRanges(draft, selected);

  const patchMetric = (patch: Partial<YoucamMetricScoreConfig>) => {
    setMessage(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...(prev.metrics[selected] ?? {}), ...patch };
      return { ...prev, metrics: { ...prev.metrics, [selected]: next } };
    });
  };

  const setText = (band: YoucamScoreBand, value: string | null) =>
    patchMetric({ texts: { ...(metric.texts ?? {}), [band]: value } });

  const resetMetric = () => {
    setMessage(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const metrics = { ...prev.metrics };
      delete metrics[selected];
      return { ...prev, metrics };
    });
  };

  const discard = () => {
    setMessage(null);
    if (query.data) setDraft(query.data);
  };

  const save = async () => {
    if (!normalized.config) return;
    setMessage(null);
    try {
      const saved = await update.mutateAsync(normalized.config);
      setDraft(saved);
      setMessage({
        ok: true,
        text: "Cambios guardados. Se aplican a los análisis de tu cuenta, tu equipo y tus pacientes.",
      });
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "No se pudieron guardar los cambios.",
      });
    }
  };

  const rangesValid = ranges.regularMax >= 1 && ranges.regularMax < ranges.promedioMax && ranges.promedioMax <= 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/doctor/configuracion/personalizacion"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Personalización
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Rangos de puntuación</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Por cada métrica del análisis estético define los rangos de cada nivel y el
            texto que verá el paciente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={discard}
              disabled={update.isPending}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60"
            >
              Descartar
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || !normalized.config || update.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {update.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Guardar cambios
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm",
            message.ok ? "bg-emerald-50 text-emerald-700" : "bg-destructive/10 text-destructive",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className={cn(CARD_CLASS, "h-fit p-2")} aria-label="Métricas">
          <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Análisis estéticos
          </p>
          <ul className="space-y-0.5">
            {YOUCAM_SCORE_CONFIG_METRICS.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => setSelected(type)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                    type === selected
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground/80 hover:bg-muted/60",
                  )}
                >
                  <span className="truncate">{metricLabel(type)}</span>
                  {isCustomized(draft.metrics[type]) ? (
                    <span className="size-2 shrink-0 rounded-full bg-primary" title="Personalizada" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <section className={CARD_CLASS}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{metricLabel(selected)}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Lo que no cambies usa los valores por defecto de PIEL 360.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCustomized(draft.metrics[selected]) ? (
                  <button
                    type="button"
                    onClick={resetMetric}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Restaurar métrica
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-foreground">Rangos</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Puntaje de cada nivel, de 0 a 100. Al mover un límite se ajusta el nivel vecino.
              </p>
              <div className="mt-3 space-y-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("w-24 rounded-full px-2.5 py-1 text-center text-xs font-semibold", BAND_STYLES.regular.chip)}>
                    Regular
                  </span>
                  <span className="inline-flex h-10 w-20 items-center rounded-lg bg-muted px-3 text-sm tabular-nums text-muted-foreground">
                    0
                  </span>
                  <span className="text-sm text-muted-foreground">a</span>
                  <NumberField
                    value={ranges.regularMax - 1}
                    min={0}
                    max={98}
                    label="Regular hasta"
                    onChange={(n) => patchMetric({ regularMax: n + 1 })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("w-24 rounded-full px-2.5 py-1 text-center text-xs font-semibold", BAND_STYLES.promedio.chip)}>
                    Promedio
                  </span>
                  <NumberField
                    value={ranges.regularMax}
                    min={1}
                    max={99}
                    label="Promedio desde"
                    onChange={(n) => patchMetric({ regularMax: n })}
                  />
                  <span className="text-sm text-muted-foreground">a</span>
                  <NumberField
                    value={ranges.promedioMax - 1}
                    min={1}
                    max={99}
                    label="Promedio hasta"
                    onChange={(n) => patchMetric({ promedioMax: n + 1 })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("w-24 rounded-full px-2.5 py-1 text-center text-xs font-semibold", BAND_STYLES.buena.chip)}>
                    Buena
                  </span>
                  <NumberField
                    value={ranges.promedioMax}
                    min={2}
                    max={100}
                    label="Buena desde"
                    onChange={(n) => patchMetric({ promedioMax: n })}
                  />
                  <span className="text-sm text-muted-foreground">a</span>
                  <span className="inline-flex h-10 w-20 items-center rounded-lg bg-muted px-3 text-sm tabular-nums text-muted-foreground">
                    100
                  </span>
                </div>
              </div>
              {rangesValid ? (
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

            {normalized.error ? (
              <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {normalized.error}
              </p>
            ) : null}
          </section>

          <section className={CARD_CLASS}>
            <h4 className="text-base font-semibold text-foreground">
              Textos por nivel
            </h4>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Se muestran al paciente según el nivel en que quede su puntaje.
            </p>

            <div className="mt-4 space-y-4">
              {YOUCAM_SCORE_BANDS.map((band) => {
                const fallback = defaultYoucamAdvice(selected, band);
                const value = metric.texts?.[band] ?? fallback;
                const isDefault = value.trim() === fallback;
                const range =
                  band === "regular"
                    ? `0 – ${ranges.regularMax - 1}`
                    : band === "promedio"
                      ? `${ranges.regularMax} – ${ranges.promedioMax - 1}`
                      : `${ranges.promedioMax} – 100`;
                return (
                  <div key={band}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", BAND_STYLES[band].chip)}>
                          {BAND_LABELS[band]}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">{range}</span>
                        {isDefault ? (
                          <span className="text-xs text-muted-foreground">· Por defecto</span>
                        ) : null}
                      </div>
                      {!isDefault ? (
                        <button
                          type="button"
                          onClick={() => setText(band, null)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="size-3" aria-hidden />
                          Usar texto por defecto
                        </button>
                      ) : null}
                    </div>
                    <textarea
                      value={value}
                      maxLength={1000}
                      rows={3}
                      onChange={(e) => setText(band, e.target.value)}
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground/80">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>Si dejas un texto vacío o igual al de PIEL 360, se usa el texto por defecto.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
