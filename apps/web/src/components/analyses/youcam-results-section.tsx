"use client";

import { useMemo, useState } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import { RecommendationsPanel } from "@/components/analyses/recommendations-panel";
import { youcamMetricCopy } from "@/lib/youcam-metric-copy";
import { YOUCAM_METRIC_LABELS, youcamRegionLabel, youcamSkinTypeLabel } from "@/lib/youcam-metric-labels";
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

// hd_pore/hd_wrinkle/hd_skin_type traen varias regiones bajo el mismo `type`
// (ej. hd_wrinkle: forehead/glabellar/crowfeet/periocular/nasolabial/marionette/whole).
// El chip principal sigue mostrando "whole" (como antes), pero además expone
// `regions` para que el usuario pueda ver cada subcategoría — antes se perdían
// por completo, colapsadas a un solo chip por `type`.
const MULTI_REGION_TYPES = new Set(["hd_wrinkle", "hd_pore", "hd_skin_type"]);
const DEFAULT_REGION = "whole";

// Capas superpuestas en el chip "Salud de la piel" (overview) — ojeras,
// firmeza, enrojecimiento, bolsas, surco, poros/manchas/arrugas general.
const OVERVIEW_LAYER_TYPES = [
  "hd_dark_circle",
  "hd_firmness",
  "hd_redness",
  "hd_eye_bag",
  "hd_tear_trough",
  "hd_pore",
  "hd_age_spot",
  "hd_wrinkle",
];

type MetricRegionOption = {
  region: string;
  label: string;
  score: number | null;
  skinType: string | null;
  maskUrl: string | null;
};

type MetricChip = {
  type: string;
  label: string;
  score: number | null;
  maskUrl: string | null;
  regions?: MetricRegionOption[];
};

function shortLabel(type: string): string {
  const full = YOUCAM_METRIC_LABELS[type] ?? type;
  if (full.length <= 12) return full;
  return full.split(" ")[0] ?? full;
}

/** A diferencia de `masks.find((x) => x.type === type)` (el bug original: toma
 * el primer mask con ese `type` sin mirar la región, mezclando por ejemplo la
 * imagen de "frente" con el puntaje de "general"), esto siempre matchea la
 * región exacta. */
function findMaskUrl(
  masks: AnalysisDetail["masks"],
  type: string,
  region: string | undefined,
): string | null {
  return masks.find((m) => m.type === type && m.region === region)?.url ?? null;
}

function buildRegionOptions(
  type: string,
  candidates: YoucamMetric[],
  masks: AnalysisDetail["masks"],
  preferRaw: boolean,
): MetricRegionOption[] {
  const sorted = [...candidates].sort((a, b) => {
    const aWhole = (a.region ?? DEFAULT_REGION) === DEFAULT_REGION;
    const bWhole = (b.region ?? DEFAULT_REGION) === DEFAULT_REGION;
    if (aWhole === bWhole) return 0;
    return aWhole ? -1 : 1;
  });
  return sorted.map((m) => {
    const region = m.region ?? DEFAULT_REGION;
    return {
      region,
      label: youcamRegionLabel(region),
      score: youcamMetricValue(m, preferRaw),
      skinType: m.skinType,
      maskUrl: findMaskUrl(masks, type, m.region),
    };
  });
}

function buildChips(
  metrics: YoucamMetric[],
  masks: AnalysisDetail["masks"],
  preferRaw: boolean,
): MetricChip[] {
  const chips: MetricChip[] = [
    {
      type: "overview",
      label: "Salud de la piel",
      score: youcamOverallScore(metrics),
      maskUrl: null,
    },
  ];

  const skinTypeCandidates = metrics.filter((m) => m.type === "hd_skin_type");
  if (skinTypeCandidates.length > 0) {
    const whole =
      skinTypeCandidates.find((m) => !m.region || m.region === DEFAULT_REGION) ??
      skinTypeCandidates[0];
    chips.push({
      type: "hd_skin_type",
      label: "Tipo piel",
      score: youcamMetricValue(whole, preferRaw),
      maskUrl: findMaskUrl(masks, "hd_skin_type", whole.region),
      regions:
        skinTypeCandidates.length > 1
          ? buildRegionOptions("hd_skin_type", skinTypeCandidates, masks, preferRaw)
          : undefined,
    });
  }

  for (const type of YOUCAM_MAIN_METRIC_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    if (candidates.length === 0) continue;
    const whole =
      candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ?? candidates[0];
    chips.push({
      type,
      label: shortLabel(type),
      score: youcamMetricValue(whole, preferRaw),
      maskUrl: findMaskUrl(masks, type, whole.region),
      regions:
        MULTI_REGION_TYPES.has(type) && candidates.length > 1
          ? buildRegionOptions(type, candidates, masks, preferRaw)
          : undefined,
    });
  }

  return chips;
}

/** URLs de las capas superpuestas del chip "Salud de la piel" — mismo
 * criterio whole/default que buildChips para elegir la región de cada tipo. */
function buildOverviewMaskUrls(
  metrics: YoucamMetric[],
  masks: AnalysisDetail["masks"],
): string[] {
  const urls: string[] = [];
  for (const type of OVERVIEW_LAYER_TYPES) {
    const candidates = metrics.filter((m) => m.type === type);
    if (candidates.length === 0) continue;
    const whole =
      candidates.find((m) => !m.region || m.region === DEFAULT_REGION) ?? candidates[0];
    const url = findMaskUrl(masks, type, whole.region);
    if (url) urls.push(url);
  }
  return urls;
}

function regionPillLabel(option: MetricRegionOption): string {
  if (option.skinType) return `${option.label} · ${youcamSkinTypeLabel(option.skinType)}`;
  if (option.score != null) return `${option.label} ${Math.round(option.score)}`;
  return option.label;
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
  const [preferRaw, setPreferRaw] = useState(false);
  const chips = useMemo(
    () => buildChips(metrics, analysis.masks, preferRaw),
    [metrics, analysis.masks, preferRaw],
  );
  const overviewMaskUrls = useMemo(
    () => buildOverviewMaskUrls(metrics, analysis.masks),
    [metrics, analysis.masks],
  );

  const [selectedType, setSelectedType] = useState("overview");
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const selected = chips.find((c) => c.type === selectedType) ?? chips[0] ?? null;
  const activeRegion = selected?.regions?.find((r) => r.region === selectedRegion) ?? null;
  const isOverview = selected?.type === "overview";
  const metricType = selected && !isOverview ? selected.type : null;

  const showBase = analysis.hasOriginalPhoto && !!analysis.imageUrl;
  const maskUrl = isOverview ? null : (activeRegion?.maskUrl ?? selected?.maskUrl ?? null);
  const badgeLabel =
    selected && selected.type !== "overview"
      ? activeRegion && activeRegion.region !== DEFAULT_REGION
        ? `${selected.label} — ${activeRegion.label}`
        : selected.label
      : null;

  function selectChip(type: string) {
    setSelectedType(type);
    setSelectedRegion(DEFAULT_REGION);
  }

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
            {skinType ? youcamSkinTypeLabel(skinType) : "—"}
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
              {isOverview
                ? overviewMaskUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ))
                : maskUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={maskUrl}
                      alt={badgeLabel ?? "Máscara"}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}
            </>
          ) : maskUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={maskUrl}
              alt={badgeLabel ?? "Máscara"}
              className="absolute inset-0 size-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No hay foto original disponible para este análisis. Puedes revisar
              las métricas y el reporte.
            </div>
          )}
          {badgeLabel ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {badgeLabel}
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

      <div className="flex justify-end gap-1 text-xs">
        <button
          type="button"
          onClick={() => setPreferRaw(false)}
          className={cn(
            "rounded-full border px-3 py-1 font-medium",
            !preferRaw
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Puntuación ajustada
        </button>
        <button
          type="button"
          onClick={() => setPreferRaw(true)}
          className={cn(
            "rounded-full border px-3 py-1 font-medium",
            preferRaw
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Puntuación real
        </button>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-1">
        {chips.map((chip) => {
          const active = chip.type === selected?.type;
          return (
            <button
              key={chip.type}
              type="button"
              onClick={() => selectChip(chip.type)}
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

      {/* Subcategorías (regiones) de la métrica activa — antes no había
       * forma de ver forehead/nose/cheek/etc. de hd_pore, las 7 zonas de
       * hd_wrinkle, o Zona T/Zona U de hd_skin_type: quedaban colapsadas
       * al chip principal ("General"/whole) sin ninguna alternativa. */}
      {selected?.regions && selected.regions.length > 0 ? (
        <div className="-mx-1 flex flex-wrap gap-2 px-1">
          {selected.regions.map((option) => {
            const active = option.region === selectedRegion;
            return (
              <button
                key={option.region}
                type="button"
                onClick={() => setSelectedRegion(option.region)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {regionPillLabel(option)}
              </button>
            );
          })}
        </div>
      ) : null}

      <ModuleCard className="p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {youcamMetricCopy(selected?.type)}
        </p>
      </ModuleCard>

      <RecommendationsPanel analysisId={analysis.id} metricType={metricType} />
    </div>
  );
}
