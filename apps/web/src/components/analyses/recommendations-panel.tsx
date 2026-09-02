"use client";

import { useMemo, useState } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import {
  useAnalysisCareRecommendations,
  type AnalysisCareItem,
} from "@/lib/queries/skin-age-rules";
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
}: {
  analysisId: string;
  /** Conservado por compatibilidad; el catálogo ya no se filtra por métrica aquí. */
  metricType: string | null;
}) {
  const [tab, setTab] = useState<Tab>("todas");
  const { data, isLoading } = useAnalysisCareRecommendations(analysisId);

  const routines = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.routines ?? [],
        data?.catalog.routines ?? [],
      ),
    [data],
  );
  const products = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.products ?? [],
        data?.catalog.products ?? [],
      ),
    [data],
  );
  const supplements = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.supplements ?? [],
        data?.catalog.supplements ?? [],
      ),
    [data],
  );
  const treatments = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.treatments ?? [],
        data?.catalog.treatments ?? [],
      ),
    [data],
  );

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
                emptyMessage="No hay rutinas configuradas todavía."
              />
              <CareList
                title="Productos"
                items={products}
                emptyMessage="No hay productos configurados todavía."
              />
              <CareList
                title="Suplementos"
                items={supplements}
                emptyMessage="No hay suplementos configurados todavía."
              />
              <CareList
                title="Tratamientos"
                items={treatments}
                emptyMessage="No hay tratamientos configurados todavía."
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
