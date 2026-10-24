"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList, Pill, ShoppingBag, Syringe } from "lucide-react";
import { useAnalysisCareRecommendations } from "@/lib/queries/skin-age-rules";
import { useAnalysisFitzpatrickRecommendations } from "@/lib/queries/fitzpatrick-rules";
import { useRecommendedRoutines } from "@/lib/queries/routines";
import { useRecommendedTreatments } from "@/lib/queries/treatments";
import { analisisPiel360SkinTypeLabel } from "@/lib/youcam-metric-labels";
import {
  CardCarousel,
  RecoSection,
  RoutineCarousel,
  RoutineDetail,
} from "./recommendation-cards";
import { CatalogDetailModal, MediaLightbox, SeeAllDialog } from "./recommendation-dialogs";
import {
  firstNonEmpty,
  mapRoutineToCareItem,
  mapTreatmentToCareItem,
  type CatalogDetail,
  type MediaPreview,
} from "./recommendation-items";

type RecoKind = "productos" | "rutinas" | "tratamientos" | "suplementos";

/** Chip de fototipo del visor — no es una métrica YouCam, tiene su propio
 * motor de reglas (ver analisispiel360-results-section.tsx). */
const FITZPATRICK_METRIC = "fitzpatrick";

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
  const [panelOpen, setPanelOpen] = useState(true);
  const [sectionOpen, setSectionOpen] = useState<Record<RecoKind, boolean>>({
    productos: true,
    rutinas: true,
    tratamientos: true,
    suplementos: true,
  });
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [seeAllSection, setSeeAllSection] = useState<{ title: string; names: string[] } | null>(
    null,
  );
  const [catalogDetail, setCatalogDetail] = useState<CatalogDetail | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  // El fototipo tiene su propio motor de reglas (igual que la app móvil):
  // sus recomendaciones no salen del motor de condiciones YouCam, cuyos
  // `matchedMetricTypes` nunca contienen "fitzpatrick".
  const isFitzpatrick = metricType === FITZPATRICK_METRIC;
  const byCondition = !!metricType && !isFitzpatrick;

  const { data, isLoading: isLoadingSkinAge } = useAnalysisCareRecommendations(analysisId);
  const fitzpatrickQuery = useAnalysisFitzpatrickRecommendations(
    analysisId,
    isFitzpatrick,
  );
  // Cuando hay una tarjeta de métrica puntual seleccionada arriba (ej.
  // "Arrugas" → hd_wrinkle), se filtra por el motor de condiciones en vez de
  // por la regla de edad de piel — mismo criterio que ya usaban (sin usar
  // hoy) RecommendedRoutines/RecommendedTreatments.
  const routinesQuery = useRecommendedRoutines(analysisId, byCondition);
  const treatmentsQuery = useRecommendedTreatments(analysisId, byCondition);

  const generalRoutines = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.routines ?? [],
        data?.catalog.routines ?? [],
      ),
    [data],
  );
  const generalProducts = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.products ?? [],
        data?.catalog.products ?? [],
      ),
    [data],
  );
  const generalSupplements = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.supplements ?? [],
        data?.catalog.supplements ?? [],
      ),
    [data],
  );
  const generalTreatments = useMemo(
    () =>
      firstNonEmpty(
        data?.recommendations.treatments ?? [],
        data?.catalog.treatments ?? [],
      ),
    [data],
  );

  const byFitzpatrick = useMemo(() => {
    if (!isFitzpatrick) return null;
    const reco = fitzpatrickQuery.data?.recommendations;
    return {
      routines: reco?.routines ?? [],
      treatments: reco?.treatments ?? [],
      products: reco?.products ?? [],
      supplements: reco?.supplements ?? [],
    };
  }, [isFitzpatrick, fitzpatrickQuery.data]);

  const filteredByMetric = useMemo(() => {
    if (!byCondition || !metricType) return null;
    // Ojo: filtrar por `conditions.some(c => c.metricType === metricType)`
    // solo mira si la rutina/tratamiento TIENE una condición de esa métrica,
    // no si fue la que realmente matcheó (las condiciones se combinan con
    // lógica O — pudo matchear por otra distinta). Eso hacía que, por
    // ejemplo, una rutina para piel grasa apareciera bajo el filtro de
    // "Tipo de piel: seca" solo por tener esa condición configurada sin
    // haber matcheado. `matchedMetricTypes` (ver routines/treatments
    // .service.ts#getRecommended*) trae solo las que sí matchearon.
    const matchingRoutines = (routinesQuery.data ?? []).filter((r) =>
      r.matchedMetricTypes?.includes(metricType),
    );
    const matchingTreatments = (treatmentsQuery.data ?? []).filter((t) =>
      t.matchedMetricTypes?.includes(metricType),
    );
    const treatments = matchingTreatments
      .filter((t) => !!t.categoryId)
      .map(mapTreatmentToCareItem);
    const plain = matchingTreatments.filter((t) => !t.categoryId);
    const byProductType = (productType: "product" | "supplement") =>
      plain
        .map((t) => ({
          ...t,
          items: t.items.filter((i) => i.product.productType === productType),
        }))
        .filter((t) => t.items.length > 0)
        .map(mapTreatmentToCareItem);

    return {
      routines: matchingRoutines.map(mapRoutineToCareItem),
      treatments,
      products: byProductType("product"),
      supplements: byProductType("supplement"),
    };
  }, [byCondition, metricType, routinesQuery.data, treatmentsQuery.data]);

  const active = byFitzpatrick ?? filteredByMetric;
  const routines = active ? active.routines : generalRoutines;
  const products = active ? active.products : generalProducts;
  const supplements = active ? active.supplements : generalSupplements;
  const treatments = active ? active.treatments : generalTreatments;
  const isLoading = isFitzpatrick
    ? fitzpatrickQuery.isLoading
    : byCondition
      ? routinesQuery.isLoading || treatmentsQuery.isLoading
      : isLoadingSkinAge;

  const sourceNote = useMemo(() => {
    if (isFitzpatrick) {
      const snapshot = fitzpatrickQuery.data?.snapshot;
      const rule = fitzpatrickQuery.data?.matchedRule;
      if (rule) {
        return `Según fototipo${snapshot?.fitzpatrickScale ? ` (Tipo ${snapshot.fitzpatrickScale})` : ""}: ${rule.label}`;
      }
      return snapshot?.message ?? null;
    }
    if (byCondition) return null;
    if (data?.matchedRule) {
      // Con qué datos del paciente coincidió la regla: la diferencia de edad,
      // el biotipo del análisis y el fototipo.
      const { skinAgeDifference: diff, skinType, fitzpatrickScale } = data.snapshot;
      const details = [
        diff != null ? `diferencia ${diff > 0 ? "+" : ""}${diff}` : null,
        skinType ? `biotipo ${analisisPiel360SkinTypeLabel(skinType)}` : null,
        fitzpatrickScale ? `fototipo ${fitzpatrickScale}` : null,
      ].filter(Boolean);
      return `Según edad de piel: ${data.matchedRule.label}${
        details.length ? ` (${details.join(" · ")})` : ""
      }`;
    }
    return data?.snapshot.message ?? null;
  }, [isFitzpatrick, fitzpatrickQuery.data, byCondition, data]);

  // Sin useEffect: si la selección actual ya no está en la lista (ej. cambió
  // la métrica), cae a la primera rutina disponible — no hace falta
  // sincronizar `selectedRoutineId` de vuelta, `onSelect` ya lo actualiza
  // cuando el doctor elige una rutina distinta.
  const selectedRoutine =
    routines.find((r) => r.id === selectedRoutineId) ?? routines[0] ?? null;

  function toggleSection(kind: RecoKind) {
    setSectionOpen((current) => ({ ...current, [kind]: !current[kind] }));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-left"
      >
        <span className="text-base font-semibold">
          {panelOpen ? "Ocultar recomendaciones" : "Ver recomendaciones"}
        </span>
        {panelOpen ? (
          <ChevronUp className="size-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-5 text-muted-foreground" />
        )}
      </button>

      {panelOpen ? (
        isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando recomendaciones…</p>
        ) : (
          <div className="space-y-6">
            {/* El aviso es el de la regla que realmente alimenta estas listas:
             * antes se mostraba siempre el de edad de piel, incluso con otra
             * métrica seleccionada. */}
            {sourceNote ? (
              <p className="text-sm text-muted-foreground">{sourceNote}</p>
            ) : null}

            <RecoSection
              title="Productos sugeridos"
              icon={ShoppingBag}
              open={sectionOpen.productos}
              onToggle={() => toggleSection("productos")}
              onSeeAll={() =>
                setSeeAllSection({
                  title: "Productos sugeridos",
                  names: products.map((p) => p.name),
                })
              }
            >
              <CardCarousel
                items={products}
                kind="product"
                emptyMessage="No hay productos configurados todavía."
                onOpen={setCatalogDetail}
              />
            </RecoSection>

            <RecoSection
              title="Rutinas"
              icon={ClipboardList}
              open={sectionOpen.rutinas}
              onToggle={() => toggleSection("rutinas")}
              onSeeAll={() =>
                setSeeAllSection({
                  title: "Rutinas",
                  names: routines.map((r) => r.name),
                })
              }
            >
              {routines.length > 0 ? (
                <div className="space-y-3">
                  <RoutineCarousel
                    routines={routines}
                    selectedId={selectedRoutine?.id ?? null}
                    onSelect={setSelectedRoutineId}
                  />
                  {selectedRoutine ? (
                    <RoutineDetail
                      routine={selectedRoutine}
                      onOpenMedia={setMediaPreview}
                      onOpenProduct={setCatalogDetail}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay rutinas configuradas todavía.
                </p>
              )}
            </RecoSection>

            <RecoSection
              title="Tratamientos"
              icon={Syringe}
              open={sectionOpen.tratamientos}
              onToggle={() => toggleSection("tratamientos")}
              onSeeAll={() =>
                setSeeAllSection({
                  title: "Tratamientos",
                  names: treatments.map((t) => t.name),
                })
              }
            >
              <CardCarousel
                items={treatments}
                kind="treatment"
                emptyMessage="No hay tratamientos configurados todavía."
                onOpen={setCatalogDetail}
              />
            </RecoSection>

            <RecoSection
              title="Suplementos"
              icon={Pill}
              open={sectionOpen.suplementos}
              onToggle={() => toggleSection("suplementos")}
              onSeeAll={() =>
                setSeeAllSection({
                  title: "Suplementos",
                  names: supplements.map((s) => s.name),
                })
              }
            >
              <CardCarousel
                items={supplements}
                kind="supplement"
                emptyMessage="No hay suplementos configurados todavía."
                onOpen={setCatalogDetail}
              />
            </RecoSection>
          </div>
        )
      ) : null}

      <CatalogDetailModal
        detail={catalogDetail}
        onClose={() => setCatalogDetail(null)}
        onOpenMedia={setMediaPreview}
      />
      <SeeAllDialog section={seeAllSection} onClose={() => setSeeAllSection(null)} />
      <MediaLightbox preview={mediaPreview} onClose={() => setMediaPreview(null)} />
    </div>
  );
}
