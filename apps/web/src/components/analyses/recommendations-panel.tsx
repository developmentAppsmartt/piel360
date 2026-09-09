"use client";

import { useMemo, useState } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import {
  useAnalysisCareRecommendations,
  type AnalysisCareItem,
} from "@/lib/queries/skin-age-rules";
import { useRecommendedRoutines, type Routine } from "@/lib/queries/routines";
import { useRecommendedTreatments, type Treatment } from "@/lib/queries/treatments";
import { cn } from "@/lib/utils";

type Tab = "todas" | "rutinas" | "productos" | "suplementos" | "tratamientos";

const TABS: { id: Tab; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "rutinas", label: "Rutinas" },
  { id: "productos", label: "Productos" },
  { id: "suplementos", label: "Suplementos" },
  { id: "tratamientos", label: "Tratamientos" },
];

function firstNonEmpty(...lists: AnalysisCareItem[][]): AnalysisCareItem[] {
  for (const list of lists) {
    if (list.length > 0) return list;
  }
  return [];
}

/** ¿Alguna condición de la rutina/tratamiento matchea esta métrica? Misma
 * comparación que usaban RecommendedRoutines/RecommendedTreatments antes de
 * quedar sin uso (commit d6435c2). */
function matchesMetric(
  conditions: { metricType: string }[],
  metricType: string,
): boolean {
  return conditions.some((c) => c.metricType === metricType);
}

function routineToCareItem(routine: Routine): AnalysisCareItem {
  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    stepsCount: routine.steps.length,
    steps: routine.steps.map((step) => ({
      id: step.id,
      order: step.order,
      title: step.title,
      description: step.description,
      mediaUrl: step.mediaUrl,
      mediaType: step.mediaType,
      productId: step.productId,
      productName: step.product?.productName ?? null,
      productImageUrl: step.product?.imageUrl ?? null,
      productUrl: step.product?.productUrl ?? null,
    })),
  };
}

/** `productType` filtra los items del grupo (para separar Productos de
 * Suplementos dentro de los "productos sugeridos" sin categoría) — omitido
 * para tratamientos con categoría, que no distinguen tipo. */
function treatmentToCareItem(
  treatment: Treatment,
  productType?: "product" | "supplement",
): AnalysisCareItem {
  const items = productType
    ? treatment.items.filter((item) => item.product.productType === productType)
    : treatment.items;
  return {
    id: treatment.id,
    name: treatment.name,
    description: treatment.description,
    categoryName: treatment.category?.categoryName ?? null,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.productName,
      productType: item.product.productType,
      note: item.note,
    })),
  };
}

function CareList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: AnalysisCareItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.map((item) => (
        <ModuleCard key={item.id} className="space-y-3 p-4">
          <div className="flex gap-3">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              {(item.description || item.categoryName) && (
                <p className="text-sm text-muted-foreground">
                  {item.description ?? item.categoryName}
                </p>
              )}
              {item.stepsCount != null && !item.steps?.length ? (
                <p className="text-xs text-muted-foreground">
                  {item.stepsCount} paso{item.stepsCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>

          {item.steps && item.steps.length > 0 ? (
            <ol className="space-y-3">
              {[...item.steps]
                .sort((a, b) => a.order - b.order)
                .map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    {step.mediaUrl ? (
                      step.mediaType === "video" ? (
                        <video
                          src={step.mediaUrl}
                          controls
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={step.mediaUrl}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                        />
                      )
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {index + 1}. {step.title}
                      </p>
                      {step.description ? (
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      ) : null}
                      {step.productName ? (
                        <p className="text-sm text-muted-foreground">
                          Producto: <span className="font-medium">{step.productName}</span>
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
            </ol>
          ) : null}

          {item.items && item.items.length > 0 ? (
            <ol className="space-y-2">
              {item.items.map((row, index) => (
                <li key={row.id} className="text-sm">
                  <span className="font-medium">
                    {index + 1}. {row.productName}
                  </span>
                  {row.note ? (
                    <span className="text-muted-foreground"> — {row.note}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </ModuleCard>
      ))}
    </div>
  );
}

export function RecommendationsPanel({
  analysisId,
  metricType,
}: {
  analysisId: string;
  /** Métrica de la tarjeta seleccionada arriba (ej. "hd_wrinkle" para
   * "Arrugas"), o `null` en la vista general/resumen. Cuando hay una métrica
   * puntual, se filtra por condiciones de esa métrica (motor de
   * rutinas/tratamientos) en vez de por la regla de edad de piel. */
  metricType: string | null;
}) {
  const [tab, setTab] = useState<Tab>("todas");
  const { data, isLoading: careLoading } = useAnalysisCareRecommendations(analysisId);
  const { data: allRoutines, isLoading: routinesLoading } = useRecommendedRoutines(
    analysisId,
    true,
  );
  const { data: allTreatments, isLoading: treatmentsLoading } = useRecommendedTreatments(
    analysisId,
    true,
  );

  const isLoading = metricType
    ? routinesLoading || treatmentsLoading
    : careLoading;

  const emptySuffix = metricType
    ? " para esta métrica."
    : " todavía.";

  const metricRoutines = useMemo(
    () => (allRoutines ?? []).filter((r) => matchesMetric(r.conditions, metricType ?? "")),
    [allRoutines, metricType],
  );
  const metricTreatments = useMemo(
    () => (allTreatments ?? []).filter((t) => matchesMetric(t.conditions, metricType ?? "")),
    [allTreatments, metricType],
  );

  const routines = useMemo(() => {
    if (metricType) return metricRoutines.map(routineToCareItem);
    return firstNonEmpty(
      data?.recommendations.routines ?? [],
      data?.catalog.routines ?? [],
    );
  }, [metricType, metricRoutines, data]);
  const products = useMemo(() => {
    if (metricType) {
      return metricTreatments
        .filter((t) => !t.categoryId)
        .map((t) => treatmentToCareItem(t, "product"))
        .filter((t) => (t.items?.length ?? 0) > 0);
    }
    return firstNonEmpty(
      data?.recommendations.products ?? [],
      data?.catalog.products ?? [],
    );
  }, [metricType, metricTreatments, data]);
  const supplements = useMemo(() => {
    if (metricType) {
      return metricTreatments
        .filter((t) => !t.categoryId)
        .map((t) => treatmentToCareItem(t, "supplement"))
        .filter((t) => (t.items?.length ?? 0) > 0);
    }
    return firstNonEmpty(
      data?.recommendations.supplements ?? [],
      data?.catalog.supplements ?? [],
    );
  }, [metricType, metricTreatments, data]);
  const treatments = useMemo(() => {
    if (metricType) {
      return metricTreatments.filter((t) => !!t.categoryId).map((t) => treatmentToCareItem(t));
    }
    return firstNonEmpty(
      data?.recommendations.treatments ?? [],
      data?.catalog.treatments ?? [],
    );
  }, [metricType, metricTreatments, data]);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Recomendaciones</h3>

      {data?.matchedRule ? (
        <p className="text-sm text-muted-foreground">
          Según edad de piel: {data.matchedRule.label}
          {data.snapshot.skinAgeDifference != null
            ? ` (diferencia ${data.snapshot.skinAgeDifference > 0 ? "+" : ""}${data.snapshot.skinAgeDifference})`
            : ""}
        </p>
      ) : data?.snapshot.message ? (
        <p className="text-sm text-muted-foreground">{data.snapshot.message}</p>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando recomendaciones…</p>
      ) : (
        <>
          {tab === "todas" && (
            <div className="space-y-6">
              <CareList
                title="Rutinas"
                items={routines}
                emptyMessage={`No hay rutinas configuradas${emptySuffix}`}
              />
              <CareList
                title="Productos"
                items={products}
                emptyMessage={`No hay productos configurados${emptySuffix}`}
              />
              <CareList
                title="Suplementos"
                items={supplements}
                emptyMessage={`No hay suplementos configurados${emptySuffix}`}
              />
              <CareList
                title="Tratamientos"
                items={treatments}
                emptyMessage={`No hay tratamientos configurados${emptySuffix}`}
              />
            </div>
          )}

          {tab === "rutinas" && (
            <CareList
              title="Rutinas"
              items={routines}
              emptyMessage="No hay rutinas configuradas todavía."
            />
          )}
          {tab === "productos" && (
            <CareList
              title="Productos"
              items={products}
              emptyMessage="No hay productos configurados todavía."
            />
          )}
          {tab === "suplementos" && (
            <CareList
              title="Suplementos"
              items={supplements}
              emptyMessage="No hay suplementos configurados todavía."
            />
          )}
          {tab === "tratamientos" && (
            <CareList
              title="Tratamientos"
              items={treatments}
              emptyMessage="No hay tratamientos configurados todavía."
            />
          )}
        </>
      )}
    </div>
  );
}
