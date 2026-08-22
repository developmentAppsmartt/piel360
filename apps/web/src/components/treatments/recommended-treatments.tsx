"use client";

import { ModuleCard } from "@/components/ui/module-card";
import { useRecommendedTreatments } from "@/lib/queries/treatments";

export function RecommendedTreatments({
  analysisId,
  metricType,
  kind,
  productType,
  emptyMessage,
}: {
  analysisId: string;
  /** Filtra a tratamientos con al menos una condición sobre esta métrica. `null`/omitido = sin filtrar. */
  metricType?: string | null;
  /** "treatment" = con categoría (Tratamientos). "plain" = sin categoría (Productos sugeridos). Omitido = ambos. */
  kind?: "plain" | "treatment";
  /** Solo aplica junto a kind="plain": deja solo los ítems de ese tipo de producto dentro de cada grupo. */
  productType?: "product" | "supplement";
  /** Si se da, se muestra este texto cuando el filtro deja la lista vacía (en vez de ocultar la sección). */
  emptyMessage?: string;
}) {
  const { data, isLoading } = useRecommendedTreatments(analysisId, true);

  if (isLoading) return null;

  let treatments = metricType
    ? (data ?? []).filter((t) => t.conditions.some((c) => c.metricType === metricType))
    : (data ?? []);

  if (kind === "plain") {
    treatments = treatments.filter((t) => !t.categoryId);
    if (productType) {
      treatments = treatments
        .map((t) => ({
          ...t,
          items: t.items.filter((i) => i.product.productType === productType),
        }))
        .filter((t) => t.items.length > 0);
    }
  } else if (kind === "treatment") {
    treatments = treatments.filter((t) => !!t.categoryId);
  }

  if (treatments.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  const heading =
    kind === "treatment"
      ? "Tratamientos recomendados"
      : productType === "supplement"
        ? "Suplementos sugeridos"
        : productType === "product"
          ? "Productos sugeridos"
          : "Tratamientos y productos sugeridos";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{heading}</h3>
      {treatments.map((treatment) => (
        <ModuleCard key={treatment.id} className="space-y-3 p-4">
          <div>
            <p className="font-medium">
              {treatment.name}
              {treatment.category && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({treatment.category.categoryName})
                </span>
              )}
            </p>
            {treatment.description && (
              <p className="text-sm text-muted-foreground">{treatment.description}</p>
            )}
          </div>
          {treatment.items.length > 0 && (
            <ol className="space-y-3">
              {[...treatment.items]
                .sort((a, b) => a.order - b.order)
                .map((item, index) => (
                  <li key={item.id} className="flex gap-3">
                    {item.product.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {index + 1}. {item.product.productName}
                      </p>
                      {item.note && (
                        <p className="text-sm text-muted-foreground">{item.note}</p>
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
