"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowUpRight, CalendarDays, Download, Sparkles, Stethoscope } from "lucide-react";
import {
  ComparisonImageModal,
  type ComparisonImageModalState,
} from "@/components/patients/comparison-image-modal";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { useAnalysis } from "@/lib/queries/analyses";
import { usePatientAnalyses } from "@/lib/queries/patients";
import {
  analysisPhotoUrl,
  buildComparisonCategories,
  defaultComparisonPair,
  filterAnalysesByMode,
  formatAnalysisDateTime,
  formatAnalysisDateShort,
  type ComparisonMode,
  analisisPiel360MetricMaskUrl,
  analisisPiel360OverallFromAnalysis,
} from "@/lib/patient-comparison";
import { useComparisonNotes } from "@/lib/use-comparison-notes";
import { cn } from "@/lib/utils";
import { ComparisonAestheticTable } from "./comparison/comparison-aesthetic-table";
import { ComparisonDermCard } from "./comparison/comparison-derm-card";
import { ScoreMini } from "./comparison/comparison-pieces";
import { ComparisonVisualPanel, type VisualMode } from "./comparison/comparison-visual-panel";

type Pair = { initialId: string | null; currentId: string | null };

export function PatientComparisonView({ patientId }: { patientId: string }) {
  const analysesQuery = usePatientAnalyses(patientId);
  const [mode, setMode] = useState<ComparisonMode>("aesthetic");
  // Lo que eligió el usuario; null = el par por defecto. El par efectivo se
  // deriva (antes un efecto lo copiaba al estado).
  const [selection, setSelection] = useState<Pair>({ initialId: null, currentId: null });
  const [category, setCategory] = useState<string>("all");
  const [visualMode, setVisualMode] = useState<VisualMode>("side");
  const [imageModal, setImageModal] = useState<ComparisonImageModalState | null>(null);

  const filteredAnalyses = useMemo(
    () => filterAnalysesByMode(analysesQuery.data ?? [], mode),
    [analysesQuery.data, mode],
  );
  const { initialId, currentId } = useMemo((): Pair => {
    const ids = new Set(filteredAnalyses.map((a) => a.id));
    const valid =
      selection.initialId && ids.has(selection.initialId) &&
      selection.currentId && ids.has(selection.currentId);
    return valid ? selection : defaultComparisonPair(filteredAnalyses);
  }, [filteredAnalyses, selection]);

  const { notes, setGeneralNote, setCategoryNote } = useComparisonNotes({
    patientId,
    mode,
    initialId,
    currentId,
  });

  const initialAnalysis = filteredAnalyses.find((a) => a.id === initialId);
  const currentAnalysis = filteredAnalyses.find((a) => a.id === currentId);
  const initialDetail = useAnalysis(initialId ?? "", { enabled: !!initialId });
  const currentDetail = useAnalysis(currentId ?? "", { enabled: !!currentId });

  const categories = useMemo(
    () => buildComparisonCategories(initialAnalysis, currentAnalysis),
    [initialAnalysis, currentAnalysis],
  );

  const overallInitial = analisisPiel360OverallFromAnalysis(initialAnalysis) ?? 0;
  const overallCurrent = analisisPiel360OverallFromAnalysis(currentAnalysis) ?? 0;
  const overallDelta = overallCurrent - overallInitial;
  const overallPct = overallInitial > 0 ? ((overallDelta / overallInitial) * 100).toFixed(2) : "0.00";
  const overallDeltaLabel = `${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(2)}`;

  const initialPhotoUrl = analysisPhotoUrl(initialDetail.data) ?? null;
  const currentPhotoUrl = analysisPhotoUrl(currentDetail.data) ?? null;
  const maskUrl = (side: "initial" | "current", metricType: string) =>
    analisisPiel360MetricMaskUrl(side === "initial" ? initialDetail.data : currentDetail.data, metricType) ??
    null;
  const visualMetricType = category === "all" ? null : category;
  const categoryLabel = categories.find((c) => c.id === category)?.label ?? null;

  const initialDateLabel = initialAnalysis ? formatAnalysisDateShort(initialAnalysis.createdAt) : undefined;
  const currentDateLabel = currentAnalysis ? formatAnalysisDateShort(currentAnalysis.createdAt) : undefined;

  function openImageModal(payload: ComparisonImageModalState) {
    if (!payload.initialPhotoUrl && !payload.initialMaskUrl && !payload.currentPhotoUrl && !payload.currentMaskUrl) {
      return;
    }
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
      initialPhotoUrl,
      initialMaskUrl: maskUrl("initial", metricType),
      currentPhotoUrl,
      currentMaskUrl: maskUrl("current", metricType),
      subtitle: metricLabel,
    });
  }

  // Cambiar de tipo vuelve al par por defecto y a «Todas», en el propio clic.
  function handleModeChange(next: ComparisonMode) {
    setMode(next);
    setSelection({ initialId: null, currentId: null });
    setCategory("all");
  }

  if (analysesQuery.isLoading) {
    return <p className="text-muted-foreground">Cargando análisis…</p>;
  }

  const modeButton = (value: ComparisonMode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => handleModeChange(value)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );

  const dateSelect = (label: string, value: string | null, onChange: (id: string | null) => void) => (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <CalendarDays className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={filteredAnalyses.length === 0}
        className="max-w-[14rem] border-0 bg-transparent text-sm font-medium outline-none"
      >
        {filteredAnalyses.length === 0 ? (
          <option value="">Sin análisis</option>
        ) : (
          filteredAnalyses.map((a) => (
            <option key={a.id} value={a.id}>
              {formatAnalysisDateTime(a.createdAt)}
            </option>
          ))
        )}
      </select>
    </div>
  );

  return (
    <div className="space-y-5">
      <ComparisonImageModal
        open={!!imageModal}
        onOpenChange={(open) => {
          if (!open) setImageModal(null);
        }}
        subtitle={imageModal?.subtitle}
        initialPhotoUrl={imageModal?.initialPhotoUrl ?? null}
        initialMaskUrl={imageModal?.initialMaskUrl ?? null}
        currentPhotoUrl={imageModal?.currentPhotoUrl ?? null}
        currentMaskUrl={imageModal?.currentMaskUrl ?? null}
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
            {modeButton("aesthetic", <Sparkles className="size-3.5" />, "Estético")}
            {modeButton("derm", <Stethoscope className="size-3.5" />, "Dermatológico")}
          </div>
          {dateSelect("Fecha inicial", initialId, (id) => setSelection({ initialId: id, currentId }))}
          <ArrowDownUp className="size-4 text-muted-foreground" />
          {dateSelect("Fecha final", currentId, (id) => setSelection({ initialId, currentId: id }))}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
            <Download className="size-4" />
            Exportar reporte
          </Button>
        </div>
      </div>

      {filteredAnalyses.length < 2 ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>
            Se necesitan al menos 2 análisis {mode === "aesthetic" ? "estéticos" : "dermatológicos"} para
            comparar.
            {filteredAnalyses.length === 1
              ? " Por ahora solo hay uno registrado."
              : " Aún no hay análisis de este tipo."}
          </p>
        </div>
      ) : null}

      {mode === "derm" ? (
        <ComparisonDermCard
          initialPhotoUrl={initialPhotoUrl}
          currentPhotoUrl={currentPhotoUrl}
          initialDate={initialDateLabel}
          currentDate={currentDateLabel}
          initialDiagnosis={initialDetail.data?.finalDiagnosis ?? initialDetail.data?.aiDiagnosis ?? null}
          currentDiagnosis={currentDetail.data?.finalDiagnosis ?? currentDetail.data?.aiDiagnosis ?? null}
          onOpen={() =>
            openImageModal({
              initialPhotoUrl,
              initialMaskUrl: null,
              currentPhotoUrl,
              currentMaskUrl: null,
              subtitle: "Comparación dermatológica",
            })
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr_300px]">
          <aside className="space-y-4">
            <ModuleCard className="p-4">
              <ModuleCardTitle className="text-sm">Puntuación general</ModuleCardTitle>
              <div className="mt-4 flex items-center justify-center gap-4">
                <ScoreMini score={overallInitial} caption="Inicial" />
                <ArrowUpRight
                  className={cn("size-5", overallDelta >= 0 ? "text-emerald-600" : "text-red-600")}
                />
                <ScoreMini score={overallCurrent} caption="Actual" />
              </div>
              {categories.length > 0 && (
                <div
                  className={cn(
                    "mt-4 rounded-xl px-3 py-2 text-center text-sm",
                    overallDelta >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800",
                  )}
                >
                  <span className="font-semibold">{overallDeltaLabel} puntos</span>
                  <span className={overallDelta >= 0 ? "text-emerald-700/80" : "text-red-700/80"}>
                    {" "}
                    · {overallPct}% {overallDelta >= 0 ? "de mejora" : "de cambio"}
                  </span>
                </div>
              )}
            </ModuleCard>
          </aside>

          <ModuleCard className="overflow-hidden p-0">
            <ComparisonAestheticTable
              categories={categories}
              category={category}
              onCategoryChange={setCategory}
              initialPhotoUrl={initialPhotoUrl}
              currentPhotoUrl={currentPhotoUrl}
              maskUrl={maskUrl}
              notes={notes.categories}
              onNoteChange={setCategoryNote}
              onOpenMetric={openMetricModal}
            />
          </ModuleCard>

          <ComparisonVisualPanel
            visualMode={visualMode}
            onVisualModeChange={setVisualMode}
            initial={{
              photoUrl: initialPhotoUrl,
              maskUrl: visualMetricType ? maskUrl("initial", visualMetricType) : null,
            }}
            current={{
              photoUrl: currentPhotoUrl,
              maskUrl: visualMetricType ? maskUrl("current", visualMetricType) : null,
            }}
            datesLabel={`${initialDateLabel ?? "—"} vs ${currentDateLabel ?? "—"}`}
            onOpen={() =>
              openImageModal({
                initialPhotoUrl,
                initialMaskUrl: visualMetricType ? maskUrl("initial", visualMetricType) : null,
                currentPhotoUrl,
                currentMaskUrl: visualMetricType ? maskUrl("current", visualMetricType) : null,
                subtitle: categoryLabel ?? "Comparación visual",
              })
            }
            generalNote={notes.general}
            onGeneralNoteChange={setGeneralNote}
            categoryLabel={category === "all" ? null : (categoryLabel ?? category)}
            categoryNote={notes.categories[category] ?? ""}
            onCategoryNoteChange={(value) => setCategoryNote(category, value)}
          />
        </div>
      )}

      <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p>
          Los resultados de comparación son orientativos y no sustituyen el criterio clínico del profesional
          tratante.
        </p>
      </div>
    </div>
  );
}
