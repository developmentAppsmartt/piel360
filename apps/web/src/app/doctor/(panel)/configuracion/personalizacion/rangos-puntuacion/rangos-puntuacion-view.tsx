"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import {
  ANALISIS_PIEL360_MAIN_METRIC_TYPES,
  configuredAnalisisPiel360Advice,
  defaultAnalisisPiel360Advice,
  parseScoreConfigKey,
  resolveScoreRanges,
  sanitizeAnalisisPiel360ScoreConfig,
  type AnalisisPiel360MetricScoreConfig,
  type AnalisisPiel360ScoreBand,
  type AnalisisPiel360ScoreConfig,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import { useMyScoreConfig, useUpdateScoreConfig } from "@/lib/queries/score-config";
import { CARD_CLASS, isCustomized, metricLabel, scoreConfigKeyLabel } from "./score-config-labels";
import { ScoreMetricNav } from "./score-metric-nav";
import { ScoreRangesEditor } from "./score-ranges-editor";
import { ScoreTextsEditor } from "./score-texts-editor";

export function RangosPuntuacionView() {
  const query = useMyScoreConfig();
  const update = useUpdateScoreConfig();
  // null = sin cambios: se edita sobre lo guardado (que llega después).
  const [draftState, setDraft] = useState<AnalisisPiel360ScoreConfig | null>(null);
  const draft = draftState ?? query.data ?? null;
  /** Clave de `metrics`: una métrica (`hd_wrinkle`) o una subcategoría (`hd_wrinkle:forehead`). */
  // Abre en la primera métrica de verdad, no en el puntaje general.
  const [selected, setSelected] = useState<string>(ANALISIS_PIEL360_MAIN_METRIC_TYPES[0]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // `sanitize` también quita lo igual a lo heredado: lo que no se cambió
  // sigue al texto o al rango de su base si esta mejora después.
  const normalized = useMemo(() => {
    if (!draft) return { config: null, error: null as string | null };
    try {
      return { config: sanitizeAnalisisPiel360ScoreConfig(draft), error: null };
    } catch (err) {
      return { config: null, error: err instanceof Error ? err.message : "Configuración inválida" };
    }
  }, [draft]);

  const dirty = useMemo(() => {
    if (!draftState || !query.data) return false;
    if (!normalized.config) return true;
    return JSON.stringify(normalized.config) !== JSON.stringify(query.data);
  }, [draftState, normalized.config, query.data]);

  if (query.isLoading) {
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

  const { type, region } = parseScoreConfigKey(selected);
  const metric = draft.metrics[selected] ?? {};
  const ranges = resolveScoreRanges(draft, type, region);
  const inheritedFrom = region ? metricLabel(type) : "PIEL 360";
  const inheritedText = (band: AnalisisPiel360ScoreBand) =>
    region
      ? configuredAnalisisPiel360Advice(type, band, draft)
      : defaultAnalisisPiel360Advice(type, band);

  const editDraft = (change: (prev: AnalisisPiel360ScoreConfig) => AnalisisPiel360ScoreConfig) => {
    setMessage(null);
    setDraft(change(draft));
  };

  const patchMetric = (patch: Partial<AnalisisPiel360MetricScoreConfig>) =>
    editDraft((prev) => ({
      ...prev,
      metrics: { ...prev.metrics, [selected]: { ...(prev.metrics[selected] ?? {}), ...patch } },
    }));

  const setText = (band: AnalisisPiel360ScoreBand, value: string | null) =>
    patchMetric({ texts: { ...(metric.texts ?? {}), [band]: value } });

  const resetMetric = () =>
    editDraft((prev) => {
      const metrics = { ...prev.metrics };
      delete metrics[selected];
      return { ...prev, metrics };
    });

  const discard = () => {
    setMessage(null);
    setDraft(null);
  };

  const save = async () => {
    if (!normalized.config) return;
    setMessage(null);
    try {
      await update.mutateAsync(normalized.config);
      setDraft(null);
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
            texto que verá el paciente. Arrugas y Poros se pueden ajustar también por zona.
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
        <ScoreMetricNav config={draft} selected={selected} onSelect={setSelected} />

        <div className="min-w-0 space-y-5">
          <section className={CARD_CLASS}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{scoreConfigKeyLabel(selected)}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {region
                    ? `Lo que no cambies usa lo de ${metricLabel(type)}.`
                    : "Lo que no cambies usa los valores por defecto de PIEL 360."}
                </p>
              </div>
              {isCustomized(draft.metrics[selected]) ? (
                <button
                  type="button"
                  onClick={resetMetric}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  {region ? "Restaurar zona" : "Restaurar métrica"}
                </button>
              ) : null}
            </div>

            <ScoreRangesEditor key={selected} ranges={ranges} onPatch={patchMetric} />

            {normalized.error ? (
              <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {normalized.error}
              </p>
            ) : null}
          </section>

          <ScoreTextsEditor
            texts={metric.texts}
            inheritedText={inheritedText}
            inheritedFrom={inheritedFrom}
            ranges={ranges}
            onChange={setText}
          />
        </div>
      </div>
    </div>
  );
}
