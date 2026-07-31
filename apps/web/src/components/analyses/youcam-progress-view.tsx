"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import { usePatientAnalyses } from "@/lib/queries/patients";
import { YOUCAM_METRIC_LABELS } from "@/lib/youcam-metric-labels";
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamScoresByType,
  type YoucamRawResponse,
} from "@/lib/youcam-metrics";
import { cn } from "@/lib/utils";

type LayoutMode = "vertical" | "horizontal";

function shortLabel(type: string): string {
  const full = YOUCAM_METRIC_LABELS[type] ?? type;
  if (full.length <= 10) return full;
  return full.split(/[\s—-]/)[0] ?? full.slice(0, 9);
}

export function YoucamProgressView({
  analysis,
  onBack,
}: {
  analysis: AnalysisDetail;
  onBack: () => void;
}) {
  const [layout, setLayout] = useState<LayoutMode>("vertical");
  const list = usePatientAnalyses(analysis.patientId);

  const currentScores = useMemo(
    () =>
      youcamScoresByType(
        parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
      ),
    [analysis.aiRawResponse],
  );

  const previous = useMemo(() => {
    const youcam = (list.data ?? [])
      .filter(
        (a) =>
          !!a.youcamTaskId &&
          a.isValid !== false &&
          a.id !== analysis.id,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    return youcam[0] ?? null;
  }, [list.data, analysis.id]);

  const previousScores = useMemo(
    () =>
      previous?.aiRawResponse
        ? youcamScoresByType(
            parseYoucamMetrics(previous.aiRawResponse as YoucamRawResponse),
          )
        : {},
    [previous],
  );

  const rows = YOUCAM_MAIN_METRIC_TYPES.filter(
    (type) => currentScores[type] != null || previousScores[type] != null,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight">
          Avance en la Salud de la Piel
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["horizontal", "Columnas"],
            ["vertical", "Listado"],
          ] as const
        ).map(([mode, label]) => {
          const on = layout === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setLayout(mode)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                on
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-muted",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {layout === "vertical"
          ? "Listado: una métrica por fila con barras horizontales."
          : "Columnas: barras verticales; desplaza a la derecha para ver más."}
      </p>

      <div className="flex flex-wrap gap-4 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          Análisis actual
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          Último análisis
        </span>
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando comparación...</p>
      ) : (
        <ModuleCard className="space-y-4">
          {!previous ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Aún no hay un análisis YouCam anterior para comparar. Se muestran
              solo las métricas del análisis actual.
            </p>
          ) : null}

          {layout === "vertical" ? (
            <div className="space-y-4">
              {rows.map((type) => {
                const current = currentScores[type];
                const prev = previousScores[type];
                return (
                  <div key={type} className="space-y-1.5">
                    <ModuleCardTitle className="text-sm">
                      {YOUCAM_METRIC_LABELS[type] ?? type}
                    </ModuleCardTitle>
                    <div className="space-y-1">
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${current ?? 0}%` }}
                        />
                      </div>
                      {prev != null ? (
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-muted-foreground/35"
                            style={{ width: `${prev}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Actual: {current != null ? Math.round(current) : "—"}
                      {prev != null ? ` · Anterior: ${Math.round(prev)}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {rows.map((type) => {
                const current = currentScores[type] ?? 0;
                const prev = previousScores[type];
                return (
                  <div
                    key={type}
                    className="flex w-16 shrink-0 flex-col items-center gap-2"
                  >
                    <p className="text-xs font-semibold tabular-nums">
                      {Math.round(current)}
                      {prev != null ? `/${Math.round(prev)}` : ""}
                    </p>
                    <div className="flex h-36 items-end gap-1">
                      <div className="flex h-full w-3 items-end rounded-full bg-muted">
                        <div
                          className="w-full rounded-full bg-primary"
                          style={{ height: `${Math.max(4, current)}%` }}
                        />
                      </div>
                      {prev != null ? (
                        <div className="flex h-full w-3 items-end rounded-full bg-muted">
                          <div
                            className="w-full rounded-full bg-muted-foreground/35"
                            style={{ height: `${Math.max(4, prev)}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <p className="text-center text-[11px] leading-tight text-muted-foreground">
                      {shortLabel(type)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ModuleCard>
      )}
    </div>
  );
}
