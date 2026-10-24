"use client";

import { useMemo, useState } from "react";
import { Droplet, Sun } from "lucide-react";
import {
  configuredAnalisisPiel360Advice,
  configuredAnalisisPiel360ScoreBand,
} from "@piel360/shared";
import { ModuleCard } from "@/components/ui/module-card";
import { RecommendationsPanel } from "@/components/analyses/recommendations-panel";
import {
  FitzpatrickResultsSection,
  resolveFitzpatrickScale,
} from "@/components/analyses/fitzpatrick-results-section";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import { useEffectiveScoreConfig } from "@/lib/queries/score-config";
import { analisisPiel360MetricCopy } from "@/lib/youcam-metric-copy";
import type { AnalysisDetail } from "@/lib/queries/analyses";
import {
  parseAnalisisPiel360Metrics,
  analisisPiel360OverallScore,
  analisisPiel360SkinAge,
  analisisPiel360SkinType,
  type AnalisisPiel360RawResponse,
} from "@/lib/youcam-metrics";
import { cn } from "@/lib/utils";
import {
  chronologicalAgeYears,
  formatSignedYears,
  skinAgeDifference,
} from "@/lib/skin-age";
import {
  DEFAULT_REGION,
  FITZPATRICK_TYPE,
  SKIN_AGE_TYPE,
  buildChips,
  buildOverviewMaskUrls,
  regionPillLabel,
} from "./analisis-piel360-chips";
import { AnalisisPiel360Summary } from "./analisis-piel360-summary";
import { AnalisisPiel360Viewer } from "./analisis-piel360-viewer";
import { RegionCarousel } from "./region-carousel";

/** Puntuación ajustada (uiScore): la elige el doctor; sin toggle en el análisis. */
const PREFER_RAW = false;

export function AnalisisPiel360ResultsSection({
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
      parseAnalisisPiel360Metrics(analysis.aiRawResponse as AnalisisPiel360RawResponse | null),
    [analysis.aiRawResponse],
  );
  // Rangos y textos de la cuenta (Configuración › Rangos de puntuación): los
  // mismos que aplica la app móvil.
  const { data: scoreConfig } = useEffectiveScoreConfig();
  const overall = analisisPiel360OverallScore(metrics);
  const skinAge = analysis.skinAgeYears ?? analisisPiel360SkinAge(metrics);
  const chronologicalAge =
    analysis.chronologicalAgeYears ??
    chronologicalAgeYears(analysis.patient?.birthDate, analysis.createdAt);
  const ageDiff =
    analysis.skinAgeDifference ??
    skinAgeDifference(skinAge, chronologicalAge);
  const skinType = analisisPiel360SkinType(metrics);
  const fitzpatrickScale = useMemo(
    () => resolveFitzpatrickScale(analysis),
    [analysis],
  );
  const chips = useMemo(
    () => buildChips(metrics, analysis.masks, PREFER_RAW, skinAge),
    [metrics, analysis.masks, skinAge],
  );
  const overviewMaskUrls = useMemo(
    () => buildOverviewMaskUrls(metrics, analysis.masks),
    [metrics, analysis.masks],
  );

  const [selectedType, setSelectedType] = useState(SKIN_AGE_TYPE);
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const selected = chips.find((c) => c.type === selectedType) ?? chips[0] ?? null;
  const activeRegion = selected?.regions?.find((r) => r.region === selectedRegion) ?? null;
  const isOverview = selected?.type === "overview";
  const isSkinAge = selected?.type === SKIN_AGE_TYPE;
  const isFitzpatrick = selected?.type === FITZPATRICK_TYPE;
  // "Edad de la piel" y "Puntaje de la piel" se apoyan en las reglas por edad
  // de piel (el panel las usa cuando no hay métrica); el fototipo tiene su
  // propio motor. Mismo criterio que la app móvil.
  const metricType = isOverview || isSkinAge ? null : (selected?.type ?? null);

  const maskUrl =
    isOverview || isSkinAge || isFitzpatrick
      ? null
      : (activeRegion?.maskUrl ?? selected?.maskUrl ?? null);
  const badgeLabel = selected
    ? activeRegion && activeRegion.region !== DEFAULT_REGION
      ? `${selected.label} — ${activeRegion.label}`
      : selected.label
    : null;

  function selectChip(type: string) {
    setSelectedType(type);
    setSelectedRegion(DEFAULT_REGION);
  }

  const fitzpatrickDetail = fitzpatrickScale
    ? `Tipo ${fitzpatrickScale} · ${FITZPATRICK_TYPES[fitzpatrickScale].label}`
    : null;

  // Los chips de edad y fototipo no tienen texto por métrica: se arman con
  // los datos del propio análisis (mismo criterio que la app móvil).
  const copyText = isSkinAge
    ? `Edad de la piel: ${skinAge != null ? `${Math.round(skinAge)} años` : "—"}${
        chronologicalAge != null
          ? ` · Edad cronológica: ${chronologicalAge} años`
          : ""
      }.${ageDiff != null ? ` Diferencia ${formatSignedYears(ageDiff)}.` : ""}`
    : isFitzpatrick
      ? fitzpatrickDetail
        ? `Fototipo ${fitzpatrickDetail}. Describe cómo reacciona tu piel al sol (escala de Fitzpatrick).`
        : "El fototipo describe cómo reacciona tu piel al sol según la escala de Fitzpatrick. Este paciente aún no tiene un fototipo registrado."
      : analisisPiel360MetricCopy(isOverview ? "all" : selected?.type);

  // Texto del nivel en que cae el puntaje de la zona activa, con los rangos y
  // textos de Rangos de puntuación. Antes el web solo mostraba la descripción
  // fija de la métrica y lo configurado no aparecía en ninguna parte.
  const activeScore = activeRegion?.score ?? selected?.score ?? null;
  const adviceText =
    selected && !isOverview && !isSkinAge && !isFitzpatrick && activeScore != null
      ? `${
          activeRegion && activeRegion.region !== DEFAULT_REGION
            ? `${activeRegion.label}: `
            : ""
        }${configuredAnalisisPiel360Advice(
          selected.type,
          configuredAnalisisPiel360ScoreBand(activeScore, selected.type, scoreConfig),
          scoreConfig,
        )}`
      : null;

  return (
    <div className="space-y-4">
      <AnalisisPiel360Summary
        skinAge={skinAge}
        chronologicalAge={chronologicalAge}
        overall={overall}
        ageDiff={ageDiff}
        skinType={skinType}
        fitzpatrickDetail={fitzpatrickDetail}
      />

      <AnalisisPiel360Viewer
        imageUrl={analysis.hasOriginalPhoto ? analysis.imageUrl : null}
        overviewMaskUrls={isOverview ? overviewMaskUrls : null}
        maskUrl={maskUrl}
        badgeLabel={badgeLabel}
      />

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
                {chip.type === "hd_skin_type" ? (
                  <Droplet className="size-5" />
                ) : chip.type === "fitzpatrick" ? (
                  <Sun className="size-5" />
                ) : chip.score != null ? (
                  Math.round(chip.score)
                ) : (
                  "·"
                )}
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
      {isFitzpatrick ? (
        <FitzpatrickResultsSection analysis={analysis} compact silentIfEmpty />
      ) : selected?.regions && selected.regions.length > 0 ? (
        <>
          <RegionCarousel
            options={selected.regions}
            selectedRegion={selectedRegion}
            onSelect={setSelectedRegion}
            title={`Análisis de ${selected.label}`}
            baseImageUrl={
              analysis.hasOriginalPhoto ? analysis.imageUrl : null
            }
          />
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
        </>
      ) : null}

      <ModuleCard className="space-y-2 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{copyText}</p>
        {adviceText ? (
          <p className="text-sm leading-relaxed text-foreground">{adviceText}</p>
        ) : null}
      </ModuleCard>

      <RecommendationsPanel analysisId={analysis.id} metricType={metricType} />
    </div>
  );
}
