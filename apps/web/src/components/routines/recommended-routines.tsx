"use client";

import { ModuleCard } from "@/components/ui/module-card";
import { useRecommendedRoutines } from "@/lib/queries/routines";

export function RecommendedRoutines({
  analysisId,
  metricType,
  emptyMessage,
}: {
  analysisId: string;
  /** Filtra a rutinas con al menos una condición sobre esta métrica. `null`/omitido = sin filtrar. */
  metricType?: string | null;
  /** Si se da, se muestra este texto cuando el filtro deja la lista vacía (en vez de ocultar la sección). */
  emptyMessage?: string;
}) {
  const { data, isLoading } = useRecommendedRoutines(analysisId, true);

  if (isLoading) return null;

  const routines = metricType
    ? (data ?? []).filter((r) => r.conditions.some((c) => c.metricType === metricType))
    : data;

  if (!routines || routines.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Rutinas recomendadas</h3>
      {routines.map((routine) => (
        <ModuleCard key={routine.id} className="space-y-3 p-4">
          <div>
            <p className="font-medium">{routine.name}</p>
            {routine.description && (
              <p className="text-sm text-muted-foreground">{routine.description}</p>
            )}
          </div>
          {routine.steps.length > 0 && (
            <ol className="space-y-3">
              {[...routine.steps]
                .sort((a, b) => a.order - b.order)
                .map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    {step.mediaUrl &&
                      (step.mediaType === "video" ? (
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
                      ))}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {index + 1}. {step.title}
                      </p>
                      {step.description && (
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </ModuleCard>
      ))}
    </div>
  );
}
