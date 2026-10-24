"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  analisisDermaPiel360CategoryLabel,
  analisisDermaPiel360DiagnosisLabel,
  analisisDermaPiel360RiskLabel,
  colombiaDateKey,
  type AnalisisDermaPiel360DiagnosisCandidate,
  type AnalisisDermaPiel360Prediction,
} from "@piel360/shared";
import { DiagnosisDetailDialog } from "@/components/analyses/diagnosis-detail-dialog";
import { DiagnosisList } from "@/components/analyses/diagnosis-list";
import { ImageCarousel } from "@/components/analyses/image-carousel";
import { gaugePercent } from "@/components/analyses/derma-risk";
import { RiskGauge } from "@/components/analyses/risk-gauge";
import { isDermatologicalAnalysis } from "@/lib/patient-comparison";
import { useAnalyses, useAnalysis } from "@/lib/queries/analyses";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

type ClinicoTab = "imagenes" | "resultados";

/**
 * Widget 10 del mockup ("Clínico: Análisis imágenes dermatológica"): un
 * selector de análisis (buscador por nombre de paciente sobre useAnalyses(),
 * filtrado a Skiniver + válidos — mismo patrón fetch-all-y-filtra-en-cliente
 * que ya usa DoctorAnalysesHub, no hay endpoint de búsqueda server-side) +
 * tabs "Imágenes"/"Resultados IA" que recomponen las mismas piezas que ya usa
 * analysis-results-view.tsx (ImageCarousel, RiskGauge, DiagnosisList,
 * DiagnosisDetailDialog) — ese componente no expone esas dos vistas por
 * separado, así que acá se arman con las mismas piezas, no se duplica su
 * lógica de estado.
 */
export function AnalisisDermaPiel360ClinicoWidget({
  range,
}: {
  /** El periodo del reporte (`YYYY-MM-DD`, días de Colombia): la lista
   * muestra los mismos análisis que cuentan los gráficos. */
  range: { from: string; to: string };
}) {
  const analyses = useAnalyses();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ClinicoTab>("imagenes");
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<AnalisisDermaPiel360DiagnosisCandidate | null>(null);

  const analisisDermaPiel360Analyses = useMemo(() => {
    // Por tipo de análisis y no por `provider.displayLabel`: esa etiqueta es
    // texto para el usuario y en producción quedó con el valor anterior al
    // seed, así que compararla dejaba la lista siempre vacía. Es el mismo
    // criterio que el SQL del reporte (analisisdermapiel360-reports.queries.ts).
    const rows = (analyses.data ?? []).filter((a) => {
      const day = colombiaDateKey(new Date(a.createdAt));
      return (
        a.isValid &&
        isDermatologicalAnalysis(a) &&
        day >= range.from &&
        day <= range.to
      );
    });
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter((a) =>
          `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase().includes(q),
        )
      : rows;
    return filtered.slice(0, 20);
  }, [analyses.data, search, range.from, range.to]);

  const selected = useAnalysis(selectedId ?? "", { enabled: !!selectedId });

  const prediction = selected.data?.aiRawResponse as AnalisisDermaPiel360Prediction | undefined;
  const topDiagnosis = prediction?.topn?.[0];
  const riskLabel = analisisDermaPiel360RiskLabel(prediction?.risk, topDiagnosis?.risk_level);

  return (
    <div className="space-y-4">
      <div>
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-ring"
          />
        </label>

        {analyses.isLoading && (
          <p className="mt-2 text-sm text-muted-foreground">Cargando análisis...</p>
        )}

        {!analyses.isLoading && (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/80 p-1">
            {analisisDermaPiel360Analyses.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                Sin análisis dermatológicos{" "}
                {search ? "que coincidan" : "en el periodo"}.
              </li>
            )}
            {analisisDermaPiel360Analyses.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60",
                    selectedId === a.id && "bg-primary/10",
                  )}
                >
                  <span>
                    {a.patient.firstName} {a.patient.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                    })}
                    {/* El del profesional si lo hay, como en el historial
                        del paciente: es el que cuentan los gráficos. */}
                    {a.finalDiagnosis || a.aiDiagnosis
                      ? ` · ${analisisDermaPiel360DiagnosisLabel(a.finalDiagnosis ?? a.aiDiagnosis)}`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!selectedId && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Elige un análisis de la lista para ver la imagen y los resultados de IA.
        </p>
      )}

      {selectedId && selected.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando análisis...</p>
      )}

      {selectedId && selected.data && (
        <div className="space-y-4">
          <div
            role="tablist"
            className="inline-flex gap-1 rounded-lg border border-border bg-muted/40 p-0.5"
          >
            {(
              [
                { key: "imagenes", label: "Imágenes" },
                { key: "resultados", label: "Resultados IA" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === item.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "imagenes" && (
            <ImageCarousel
              images={[
                { label: "Original", url: selected.data.imageUrl },
                { label: "Coloreada", url: selected.data.coloredUrl },
                { label: "Máscara", url: selected.data.maskedUrl },
              ]}
            />
          )}

          {tab === "resultados" && (
            <div className="space-y-4">
              <RiskGauge
                percent={gaugePercent(prediction)}
                riskLabel={riskLabel}
              />

              {topDiagnosis ? (
                <ModuleCard className="flex items-center gap-4 p-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-primary text-lg font-bold text-primary">
                    {Math.round(
                      topDiagnosis.prob <= 1 ? topDiagnosis.prob * 100 : topDiagnosis.prob,
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {analisisDermaPiel360CategoryLabel(topDiagnosis.desease) ||
                        "Diagnóstico principal"}
                    </p>
                    <p className="truncate text-base font-semibold">
                      {analisisDermaPiel360DiagnosisLabel(
                        topDiagnosis.class,
                        topDiagnosis.class_raw,
                      )}
                    </p>
                    {topDiagnosis.risk ? (
                      <p className="text-sm text-muted-foreground">
                        Riesgo:{" "}
                        {analisisDermaPiel360RiskLabel(
                          topDiagnosis.risk,
                          topDiagnosis.risk_level,
                        )}
                      </p>
                    ) : null}
                  </div>
                </ModuleCard>
              ) : null}

              {prediction?.topn && prediction.topn.length > 0 ? (
                <DiagnosisList items={prediction.topn} onSelect={setSelectedDiagnosis} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin candidatos de diagnóstico para este análisis.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <DiagnosisDetailDialog
        item={selectedDiagnosis}
        onClose={() => setSelectedDiagnosis(null)}
      />
    </div>
  );
}
