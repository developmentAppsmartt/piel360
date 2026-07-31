"use client";

import { useMemo, useState } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import { youcamMetricCopy } from "@/lib/youcam-metric-copy";
import { YOUCAM_METRIC_LABELS } from "@/lib/youcam-metric-labels";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamMetricValue,
  youcamOverallScore,
  youcamSkinAge,
  youcamSkinType,
  type YoucamMetric,
  type YoucamRawResponse,
} from "@/lib/youcam-metrics";
import { cn } from "@/lib/utils";

type MetricChip = {
  type: string;
  label: string;
  score: number | null;
  maskUrl: string | null;
};

function shortLabel(type: string): string {
  const full = YOUCAM_METRIC_LABELS[type] ?? type;
  if (full.length <= 12) return full;
  return full.split(" ")[0] ?? full;
}

function buildChips(
  metrics: YoucamMetric[],
  masks: AnalysisDetail["masks"],
): MetricChip[] {
  const byType = new Map<string, YoucamMetric>();
  for (const m of metrics) {
    if (!byType.has(m.type) || !m.region || m.region === "whole") {
      byType.set(m.type, m);
    }
  }

  const chips: MetricChip[] = [
    {
      type: "overview",
      label: "Resumen",
      score: youcamOverallScore(metrics),
      maskUrl: null,
    },
  ];

  const skinTypeMetric = byType.get("hd_skin_type");
  if (skinTypeMetric) {
    chips.push({
      type: "hd_skin_type",
      label: "Tipo piel",
      score: youcamMetricValue(skinTypeMetric),
      maskUrl: masks.find((x) => x.type === "hd_skin_type")?.url ?? null,
    });
  }

  for (const type of YOUCAM_MAIN_METRIC_TYPES) {
    const metric = byType.get(type);
    if (!metric) continue;
    chips.push({
      type,
      label: shortLabel(type),
      score: youcamMetricValue(metric),
      maskUrl: masks.find((x) => x.type === type)?.url ?? null,
    });
  }

  return chips;
}

export function YoucamResultsSection({
  analysis,
  onOpenProgress,
  onOpenReport,
}: {
  analysis: AnalysisDetail;
  onOpenProgress: () => void;
  onOpenReport: () => void;
}) {
  const metrics = useMemo(
    () =>
      parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
    [analysis.aiRawResponse],
  );
  const overall = youcamOverallScore(metrics);
  const skinAge = youcamSkinAge(metrics);
  const skinType = youcamSkinType(metrics);
  const chips = useMemo(
    () => buildChips(metrics, analysis.masks),
    [metrics, analysis.masks],
  );

  const [selectedType, setSelectedType] = useState("overview");
  const selected = chips.find((c) => c.type === selectedType) ?? chips[0] ?? null;

  const showBase = analysis.hasOriginalPhoto && !!analysis.imageUrl;
  const maskUrl =
    selected?.type === "overview" ? null : (selected?.maskUrl ?? null);

  return (
    <div className="space-y-4">
      <ModuleCard className="space-y-2 bg-sky-50/80 p-4 dark:bg-sky-950/20">
        <p className="text-sm">
          Salud de la piel (años):{" "}
          <span className="font-semibold text-muted-foreground">
            {skinAge != null ? Math.round(skinAge) : "—"}
          </span>
        </p>
        <p className="text-sm">
          Puntaje de la piel:{" "}
          <span className="font-semibold text-muted-foreground">
            {overall != null ? Math.round(overall) : "—"}
          </span>
        </p>
        {overall != null ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(100, overall))}%` }}
            />
          </div>
        ) : null}
        <p className="text-sm">
          Tipo de piel:{" "}
          <span className="font-semibold text-muted-foreground">
            {skinType ?? "—"}
          </span>
        </p>
      </ModuleCard>

      <ModuleCard className="overflow-hidden p-0">
        <div className="relative aspect-[4/5] max-h-[420px] w-full bg-muted">
          {showBase ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={analysis.imageUrl!}
                alt="Foto del análisis"
                className="absolute inset-0 size-full object-cover"
              />
              {maskUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={maskUrl}
                  alt={selected?.label ?? "Máscara"}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : null}
            </>
          ) : maskUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={maskUrl}
              alt={selected?.label ?? "Máscara"}
              className="absolute inset-0 size-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No hay foto original disponible para este análisis. Puedes revisar
              las métricas y el reporte.
            </div>
          )}
          {selected && selected.type !== "overview" ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {selected.label}
            </span>
          ) : null}
        </div>
      </ModuleCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenProgress}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Mi Progreso
        </button>
        <button
          type="button"
          onClick={onOpenReport}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Reportes
        </button>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-1">
        {chips.map((chip) => {
          const active = chip.type === selected?.type;
          return (
            <button
              key={chip.type}
              type="button"
              onClick={() => setSelectedType(chip.type)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground",
                )}
              >
                {chip.score != null ? Math.round(chip.score) : "·"}
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight",
                  active ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>

      <ModuleCard className="p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {youcamMetricCopy(selected?.type)}
        </p>
      </ModuleCard>
    </div>
  );
}
