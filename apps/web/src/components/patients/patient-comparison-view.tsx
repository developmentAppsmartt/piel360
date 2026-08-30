"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  CalendarDays,
  Circle,
  CircleDot,
  Download,
  Droplets,
  Layers,
  NotebookPen,
  Sparkles,
  Stethoscope,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import {
  ComparisonImageModal,
  type ComparisonImageModalState,
} from "@/components/patients/comparison-image-modal";
import { Button } from "@/components/ui/button";
import {
  ModuleCard,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import { useAnalysis } from "@/lib/queries/analyses";
import { usePatientAnalyses } from "@/lib/queries/patients";
import {
  analysisPreviewUrl,
  buildComparisonCategories,
  defaultComparisonPair,
  filterAnalysesByMode,
  formatAnalysisDate,
  formatAnalysisDateShort,
  type ComparisonMode,
  youcamMetricMaskUrl,
  youcamOverallFromAnalysis,
} from "@/lib/patient-comparison";
import { useComparisonNotes } from "@/lib/use-comparison-notes";
import { cn } from "@/lib/utils";

const METRIC_ICONS: Partial<Record<string, LucideIcon>> = {
  hd_moisture: Droplets,
  hd_oiliness: Sparkles,
  hd_acne: CircleDot,
  hd_pore: Circle,
  hd_wrinkle: Waves,
  hd_texture: Waves,
  hd_radiance: Sparkles,
  hd_redness: CircleDot,
};

function MetricIcon({ metricType }: { metricType: string }) {
  const Icon = METRIC_ICONS[metricType] ?? Circle;
  return <Icon className="size-4 text-primary" aria-hidden />;
}

function ScoreMini({ score, caption }: { score: number; caption?: string }) {
  const tone =
    score >= 70 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <UnitRing
        percent={score}
        display="fraction"
        className="size-16"
        progressClassName={tone}
      />
      {caption ? (
        <p className="text-[10px] text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}

function SkinThumb({
  label,
  url,
  onClick,
}: {
  label: string;
  url?: string | null;
  onClick?: () => void;
}) {
  if (url) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${label} — ampliar`}
        className="size-14 shrink-0 overflow-hidden rounded-lg border border-border transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="size-full object-cover" />
      </button>
    );
  }
  return (
    <div
      aria-hidden
      title={label}
      className="size-14 rounded-lg border border-dashed border-border bg-muted/40"
    />
  );
}

function ComparisonImage({
  label,
  url,
  date,
  onClick,
}: {
  label: string;
  url?: string | null;
  date?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={!url || !onClick}
        className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted/30 transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:ring-0"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </button>
      <div className="text-center">
        <p className="text-xs font-semibold">{label}</p>
        {date ? (
          <p className="text-[10px] text-muted-foreground">{date}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PatientComparisonView({ patientId }: { patientId: string }) {
  const analysesQuery = usePatientAnalyses(patientId);
  const [mode, setMode] = useState<ComparisonMode>("aesthetic");
  const [initialId, setInitialId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [visualMode, setVisualMode] = useState<"overlay" | "side">("side");
  const [imageModal, setImageModal] = useState<ComparisonImageModalState | null>(
    null,
  );
  const prevModeRef = useRef(mode);
  const { notes, setGeneralNote, setCategoryNote } = useComparisonNotes({
    patientId,
    mode,
    initialId,
    currentId,
  });

  const filteredAnalyses = useMemo(
    () => filterAnalysesByMode(analysesQuery.data ?? [], mode),
    [analysesQuery.data, mode],
  );

  useEffect(() => {
    const modeChanged = prevModeRef.current !== mode;
    prevModeRef.current = mode;

    if (modeChanged || initialId === null || currentId === null) {
      const pair = defaultComparisonPair(filteredAnalyses);
      setInitialId(pair.initialId);
      setCurrentId(pair.currentId);
      setCategory("all");
      return;
    }

    const ids = new Set(filteredAnalyses.map((a) => a.id));
    if (!initialId || !ids.has(initialId) || !currentId || !ids.has(currentId)) {
      const pair = defaultComparisonPair(filteredAnalyses);
      setInitialId(pair.initialId);
      setCurrentId(pair.currentId);
    }
  }, [filteredAnalyses, mode, initialId, currentId]);

  const initialAnalysis = filteredAnalyses.find((a) => a.id === initialId);
  const currentAnalysis = filteredAnalyses.find((a) => a.id === currentId);

  const initialDetail = useAnalysis(initialId ?? "", { enabled: !!initialId });
  const currentDetail = useAnalysis(currentId ?? "", { enabled: !!currentId });

  const categories = useMemo(
    () => buildComparisonCategories(initialAnalysis, currentAnalysis),
    [initialAnalysis, currentAnalysis],
  );

  const visibleCategories = useMemo(() => {
    if (category === "all") return categories;
    return categories.filter((c) => c.id === category);
  }, [category, categories]);

  const overallInitial = youcamOverallFromAnalysis(initialAnalysis) ?? 0;
  const overallCurrent = youcamOverallFromAnalysis(currentAnalysis) ?? 0;
  const overallDelta = overallCurrent - overallInitial;
  const overallPct =
    overallInitial > 0
      ? ((overallDelta / overallInitial) * 100).toFixed(2)
      : "0.00";
  const overallDeltaLabel = `${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(2)}`;

  const initialImageUrl = analysisPreviewUrl(initialDetail.data);
  const currentImageUrl = analysisPreviewUrl(currentDetail.data);

  const visualMetricType =
    category === "all" ? (visibleCategories[0]?.id ?? null) : category;
  const visualInitialUrl =
    (visualMetricType
      ? youcamMetricMaskUrl(initialDetail.data, visualMetricType)
      : null) ?? initialImageUrl;
  const visualCurrentUrl =
    (visualMetricType
      ? youcamMetricMaskUrl(currentDetail.data, visualMetricType)
      : null) ?? currentImageUrl;

  const categoryFilters = [
    { id: "all", label: "Todas" },
    ...categories.map((c) => ({ id: c.id, label: c.label })),
  ];

  const needsTwoAnalyses = filteredAnalyses.length < 2;
  const isLoading = analysesQuery.isLoading;

  const initialDateLabel = initialAnalysis
    ? formatAnalysisDateShort(initialAnalysis.createdAt)
    : undefined;
  const currentDateLabel = currentAnalysis
    ? formatAnalysisDateShort(currentAnalysis.createdAt)
    : undefined;

  function openImageModal(payload: ComparisonImageModalState) {
    if (!payload.initialUrl && !payload.currentUrl) return;
    setImageModal({
      initialLabel: "Inicial",
      currentLabel: "Actual",
      initialDate: initialDateLabel,
      currentDate: currentDateLabel,
      defaultView: visualMode,
      ...payload,
    });
  }

  function openMetricModal(metricType: string, metricLabel: string) {
    openImageModal({
      initialUrl: youcamMetricMaskUrl(initialDetail.data, metricType),
      currentUrl: youcamMetricMaskUrl(currentDetail.data, metricType),
      subtitle: metricLabel,
    });
  }

  function handleModeChange(next: ComparisonMode) {
    setMode(next);
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando análisis…</p>;
  }

  return (
    <div className="space-y-5">
      <ComparisonImageModal
        open={!!imageModal}
        onOpenChange={(open) => {
          if (!open) setImageModal(null);
        }}
        subtitle={imageModal?.subtitle}
        initialUrl={imageModal?.initialUrl ?? null}
        currentUrl={imageModal?.currentUrl ?? null}
        initialLabel={imageModal?.initialLabel}
        currentLabel={imageModal?.currentLabel}
        initialDate={imageModal?.initialDate}
        currentDate={imageModal?.currentDate}
        defaultView={imageModal?.defaultView}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold">Comparación de análisis</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => handleModeChange("aesthetic")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "aesthetic"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Sparkles className="size-3.5" />
              Estético
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("derm")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === "derm"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Stethoscope className="size-3.5" />
              Dermatológico
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Fecha inicial</span>
            <select
              value={initialId ?? ""}
              onChange={(e) => setInitialId(e.target.value || null)}
              disabled={filteredAnalyses.length === 0}
              className="max-w-[11rem] border-0 bg-transparent text-sm font-medium outline-none"
            >
              {filteredAnalyses.length === 0 ? (
                <option value="">Sin análisis</option>
              ) : (
                filteredAnalyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatAnalysisDate(a.createdAt)}
                  </option>
                ))
              )}
            </select>
          </div>

          <ArrowDownUp className="size-4 text-muted-foreground" />

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Fecha final</span>
            <select
              value={currentId ?? ""}
              onChange={(e) => setCurrentId(e.target.value || null)}
              disabled={filteredAnalyses.length === 0}
              className="max-w-[11rem] border-0 bg-transparent text-sm font-medium outline-none"
            >
              {filteredAnalyses.length === 0 ? (
                <option value="">Sin análisis</option>
              ) : (
                filteredAnalyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatAnalysisDate(a.createdAt)}
                  </option>
                ))
              )}
            </select>
          </div>

          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
            <Download className="size-4" />
            Exportar reporte
          </Button>
        </div>
      </div>

      {needsTwoAnalyses ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            Se necesitan al menos 2 análisis{" "}
            {mode === "aesthetic" ? "estéticos" : "dermatológicos"} para comparar.
            {filteredAnalyses.length === 1
              ? " Por ahora solo hay uno registrado."
              : " Aún no hay análisis de este tipo."}
          </p>
        </div>
      ) : null}

      {mode === "derm" ? (
        <ModuleCard className="p-5">
          <ModuleCardTitle className="text-sm">Comparación dermatológica</ModuleCardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Comparación visual entre las dos capturas seleccionadas.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <ComparisonImage
              label="Inicial"
              url={initialImageUrl}
              date={initialDateLabel}
              onClick={() =>
                openImageModal({
                  initialUrl: initialImageUrl,
                  currentUrl: currentImageUrl,
                  subtitle: "Comparación dermatológica",
                })
              }
            />
            <ComparisonImage
              label="Actual"
              url={currentImageUrl}
              date={currentDateLabel}
              onClick={() =>
                openImageModal({
                  initialUrl: initialImageUrl,
                  currentUrl: currentImageUrl,
                  subtitle: "Comparación dermatológica",
                })
              }
            />
          </div>
          {(initialDetail.data?.aiDiagnosis || currentDetail.data?.aiDiagnosis) && (
            <div className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Diagnóstico inicial
                </p>
                <p className="mt-1 text-sm">
                  {initialDetail.data?.finalDiagnosis ??
                    initialDetail.data?.aiDiagnosis ??
                    "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Diagnóstico actual
                </p>
                <p className="mt-1 text-sm">
                  {currentDetail.data?.finalDiagnosis ??
                    currentDetail.data?.aiDiagnosis ??
                    "—"}
                </p>
              </div>
            </div>
          )}
        </ModuleCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr_300px]">
          <aside className="space-y-4">
            <ModuleCard className="p-4">
              <ModuleCardTitle className="text-sm">Puntuación general</ModuleCardTitle>
              <div className="mt-4 flex items-center justify-center gap-4">
                <ScoreMini score={overallInitial} caption="Inicial" />
                <ArrowUpRight
                  className={cn(
                    "size-5",
                    overallDelta >= 0 ? "text-emerald-600" : "text-red-600",
                  )}
                />
                <ScoreMini score={overallCurrent} caption="Actual" />
              </div>
              {categories.length > 0 && (
                <div
                  className={cn(
                    "mt-4 rounded-xl px-3 py-2 text-center text-sm",
                    overallDelta >= 0
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800",
                  )}
                >
                  <span className="font-semibold">
                    {overallDeltaLabel} puntos
                  </span>
                  <span
                    className={
                      overallDelta >= 0 ? "text-emerald-700/80" : "text-red-700/80"
                    }
                  >
                    {" "}
                    · {overallPct}%{" "}
                    {overallDelta >= 0 ? "de mejora" : "de cambio"}
                  </span>
                </div>
              )}
            </ModuleCard>
          </aside>

          <ModuleCard className="overflow-hidden p-0">
            {categories.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No hay métricas comparables en los análisis seleccionados.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-border p-4">
                  {categoryFilters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCategory(f.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        category === f.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Categoría</th>
                        <th className="px-4 py-3 font-semibold">Inicial</th>
                        <th className="px-4 py-3 font-semibold">Actual</th>
                        <th className="px-4 py-3 font-semibold">Mejora</th>
                        <th className="min-w-[12rem] px-4 py-3 font-semibold">
                          Notas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCategories.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-border hover:bg-muted/20"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                                <MetricIcon metricType={row.id} />
                              </span>
                              <span className="font-medium">{row.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <ScoreMini score={row.initialScore} />
                              <SkinThumb
                                label="Captura inicial"
                                url={youcamMetricMaskUrl(initialDetail.data, row.id)}
                                onClick={() => openMetricModal(row.id, row.label)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <ScoreMini score={row.currentScore} />
                              <SkinThumb
                                label="Captura actual"
                                url={youcamMetricMaskUrl(currentDetail.data, row.id)}
                                onClick={() => openMetricModal(row.id, row.label)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div
                              className={cn(
                                "flex items-center gap-1.5",
                                row.improvement >= 0
                                  ? "text-emerald-700"
                                  : "text-red-700",
                              )}
                            >
                              <ArrowUpRight
                                className={cn(
                                  "size-4",
                                  row.improvement < 0 && "rotate-90",
                                )}
                              />
                              <div>
                                <p className="font-semibold tabular-nums">
                                  {row.improvement >= 0 ? "+" : ""}
                                  {row.improvement}
                                </p>
                                <p
                                  className={cn(
                                    "text-xs",
                                    row.improvement >= 0
                                      ? "text-emerald-600/90"
                                      : "text-red-600/90",
                                  )}
                                >
                                  {row.improvementLabel}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <textarea
                              value={notes.categories[row.id] ?? ""}
                              onChange={(e) =>
                                setCategoryNote(row.id, e.target.value)
                              }
                              rows={2}
                              placeholder={`Notas de ${row.label.toLowerCase()}…`}
                              className="w-full min-w-[11rem] resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </ModuleCard>

          <aside className="space-y-4">
            <ModuleCard className="p-4">
              <ModuleCardTitle className="text-sm">Comparación visual</ModuleCardTitle>
              <div className="mt-3 flex rounded-xl border border-border p-1">
                <button
                  type="button"
                  onClick={() => setVisualMode("overlay")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold",
                    visualMode === "overlay"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Layers className="size-3.5" />
                  Superposición
                </button>
                <button
                  type="button"
                  onClick={() => setVisualMode("side")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold",
                    visualMode === "side"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  Lado a lado
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  openImageModal({
                    initialUrl: visualInitialUrl,
                    currentUrl: visualCurrentUrl,
                    subtitle:
                      categories.find((c) => c.id === visualMetricType)?.label ??
                      "Comparación visual",
                  })
                }
                className={cn(
                  "mt-4 w-full overflow-hidden rounded-xl border border-border bg-muted/20 text-left transition hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  visualMode === "overlay"
                    ? "relative aspect-[3/4]"
                    : "grid grid-cols-2 gap-2 p-2",
                )}
              >
                {visualMode === "side" ? (
                  <>
                    {visualInitialUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={visualInitialUrl}
                        alt="Captura inicial"
                        className="aspect-[3/4] w-full rounded-lg border border-border object-contain"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                    {visualCurrentUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={visualCurrentUrl}
                        alt="Captura actual"
                        className="aspect-[3/4] w-full rounded-lg border border-primary/30 object-contain"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-primary/30 bg-primary/5 text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {visualInitialUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={visualInitialUrl}
                        alt="Captura inicial"
                        className="absolute inset-0 size-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        Sin imagen inicial
                      </div>
                    )}
                    {visualCurrentUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={visualCurrentUrl}
                        alt="Captura actual"
                        className="absolute inset-0 size-full object-contain opacity-55 mix-blend-multiply"
                      />
                    ) : null}
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {initialAnalysis
                  ? formatAnalysisDateShort(initialAnalysis.createdAt)
                  : "—"}{" "}
                vs{" "}
                {currentAnalysis
                  ? formatAnalysisDateShort(currentAnalysis.createdAt)
                  : "—"}
              </p>
            </ModuleCard>

            <ModuleCard className="flex min-h-[220px] flex-col p-4">
              <div className="flex items-center gap-2">
                <NotebookPen className="size-4 text-primary" aria-hidden />
                <ModuleCardTitle className="text-sm">Notas</ModuleCardTitle>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Observaciones generales de esta comparación y notas por categoría
                en la tabla.
              </p>
              <label className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Nota general
                </span>
                <textarea
                  value={notes.general}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  rows={6}
                  placeholder="Resumen clínico, plan de tratamiento, observaciones generales…"
                  className="min-h-[8rem] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </label>
              {category !== "all" ? (
                <label className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Nota —{" "}
                    {categories.find((c) => c.id === category)?.label ?? category}
                  </span>
                  <textarea
                    value={notes.categories[category] ?? ""}
                    onChange={(e) => setCategoryNote(category, e.target.value)}
                    rows={3}
                    placeholder="Observaciones de esta categoría…"
                    className="resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ) : null}
            </ModuleCard>
          </aside>
        </div>
      )}

      <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p>
          Los resultados de comparación son orientativos y no sustituyen el
          criterio clínico del profesional tratante.
        </p>
      </div>
    </div>
  );
}
