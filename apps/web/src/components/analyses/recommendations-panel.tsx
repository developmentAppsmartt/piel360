"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pill,
  ShoppingBag,
  Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModuleCard } from "@/components/ui/module-card";
import {
  useAnalysisCareRecommendations,
  type AnalysisCareItem,
} from "@/lib/queries/skin-age-rules";
import { useRecommendedRoutines, type Routine } from "@/lib/queries/routines";
import { useRecommendedTreatments, type Treatment } from "@/lib/queries/treatments";
import { cn } from "@/lib/utils";

/** Adapta el shape de RoutinesService al que ya consume este panel. */
function mapRoutineToCareItem(routine: Routine): AnalysisCareItem {
  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    steps: routine.steps.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      description: s.description,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      products: s.products.map((link) => ({
        id: link.product.id,
        productName: link.product.productName,
        productType: link.product.productType,
        productUrl: link.product.productUrl,
        imageUrl: link.product.imageUrl,
      })),
    })),
  };
}

/** Adapta el shape de TreatmentsService al que ya consume este panel. */
function mapTreatmentToCareItem(treatment: Treatment): AnalysisCareItem {
  return {
    id: treatment.id,
    name: treatment.name,
    description: treatment.description,
    categoryName: treatment.category?.categoryName ?? null,
    items: treatment.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.productName,
      productType: item.product.productType,
      note: item.note,
    })),
  };
}

type CatalogKind = "routine" | "product" | "treatment" | "supplement";
type RecoKind = "productos" | "rutinas" | "tratamientos" | "suplementos";

type CatalogDetail = {
  title: string;
  subtitle?: string;
  description?: string | null;
  imageUrl: string | null;
  url?: string | null;
  kind: CatalogKind;
  /** Líneas extra (ej. productos de un grupo/tratamiento plano). */
  extras?: string[];
};

type MediaPreview = {
  kind: "video" | "image";
  url: string;
  title: string;
};

function firstNonEmpty(...lists: AnalysisCareItem[][]): AnalysisCareItem[] {
  for (const list of lists) {
    if (list.length > 0) return list;
  }
  return [];
}

function inferMediaKind(
  mediaType: string | null | undefined,
  url: string,
): "video" | "image" {
  const type = (mediaType ?? "").toLowerCase().trim();
  if (type === "video") return "video";
  if (type === "image" || type === "gif") return "image";
  if (/\.(mp4|mov|webm|m4v|mkv)(\?|#|$)/i.test(url)) return "video";
  return "image";
}

function mentions(text: string | null | undefined, words: string[]): boolean {
  const n = (text ?? "").toLowerCase();
  return words.some((w) => n.includes(w));
}

/** Mañana/Noche detectados por palabras clave en el nombre/pasos de la
 * rutina — mismo criterio que la versión mobile (YoucamCatalogSection). */
function routineHasMoment(routine: AnalysisCareItem, kind: "am" | "pm") {
  const words =
    kind === "am"
      ? ["mañana", "manana", "am", "morning", "día", "dia"]
      : ["noche", "pm", "night", "evening"];
  if (mentions(routine.name, words) || mentions(routine.description, words)) {
    return true;
  }
  return (routine.steps ?? []).some(
    (s) => mentions(s.title, words) || mentions(s.description, words),
  );
}

function stepMedia(step: NonNullable<AnalysisCareItem["steps"]>[number]): MediaPreview | null {
  if (!step.mediaUrl) return null;
  return {
    kind: inferMediaKind(step.mediaType, step.mediaUrl),
    url: step.mediaUrl,
    title: step.title,
  };
}

function routineMediaItems(routine: AnalysisCareItem): MediaPreview[] {
  return [...(routine.steps ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(stepMedia)
    .filter((item): item is MediaPreview => item != null);
}

function routineImages(routine: AnalysisCareItem): string[] {
  return routineMediaItems(routine)
    .filter((item) => item.kind === "image")
    .map((item) => item.url)
    .slice(0, 3);
}

/** Productos vinculados a los pasos de una rutina, sin duplicados — cada
 * link de paso ya trae nombre/imagen/URL del producto, no hace falta
 * cruzarlo contra otra lista. */
function linkedProductsForRoutine(routine: AnalysisCareItem): CatalogDetail[] {
  const seen = new Set<string>();
  const linked: CatalogDetail[] = [];
  for (const step of [...(routine.steps ?? [])].sort((a, b) => a.order - b.order)) {
    for (const product of step.products) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      linked.push({
        title: product.productName,
        subtitle: "Producto vinculado",
        description: null,
        imageUrl: product.imageUrl ?? null,
        url: product.productUrl ?? null,
        kind: product.productType === "supplement" ? "supplement" : "product",
      });
    }
  }
  return linked;
}

function openUrl(url?: string | null) {
  if (url) window.open(url, "_blank", "noreferrer");
}

function MediaLightbox({
  preview,
  onClose,
}: {
  preview: MediaPreview | null;
  onClose: () => void;
}) {
  if (!preview) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F3D73]/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-[#0F3D73]">
            {preview.kind === "video" ? "Video de la rutina" : "Imagen guía"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
        <div className="bg-slate-950">
          {preview.kind === "video" ? (
            <video
              src={preview.url}
              controls
              autoPlay
              className="max-h-[70vh] w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt={preview.title}
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </div>
        {preview.title ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {preview.title}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RecoSection({
  title,
  icon: Icon,
  open,
  onToggle,
  onSeeAll,
  children,
}: {
  title: string;
  icon: typeof ShoppingBag;
  open: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="truncate">{title}</span>
          {open ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {open ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        ) : null}
      </div>
      <div className="h-0.5 rounded-full bg-primary/20" />
      {open ? children : null}
    </div>
  );
}

function itemToDetail(item: AnalysisCareItem, kind: CatalogKind): CatalogDetail {
  return {
    title: item.name,
    subtitle: item.categoryName ?? undefined,
    description: item.description,
    imageUrl: item.imageUrl ?? null,
    url: item.productUrl ?? null,
    kind,
    extras: item.items?.length
      ? item.items.map((row) => `${row.productName}${row.note ? ` — ${row.note}` : ""}`)
      : undefined,
  };
}

function CardCarousel({
  items,
  kind,
  emptyMessage,
  onOpen,
}: {
  items: AnalysisCareItem[];
  kind: CatalogKind;
  emptyMessage: string;
  onOpen: (detail: CatalogDetail) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(itemToDetail(item, kind))}
          className="w-32 shrink-0 space-y-1.5 rounded-xl border border-border bg-card p-2 text-left hover:border-primary/40"
        >
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-20 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-muted text-lg font-bold text-primary">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="line-clamp-2 text-xs font-medium">{item.name}</p>
          {item.categoryName ? (
            <p className="truncate text-[11px] text-muted-foreground">{item.categoryName}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function DetailCardCarousel({
  cards,
  onOpen,
}: {
  cards: CatalogDetail[];
  onOpen: (detail: CatalogDetail) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {cards.map((card, index) => (
        <button
          key={`${card.title}-${index}`}
          type="button"
          onClick={() => onOpen(card)}
          className="w-28 shrink-0 space-y-1.5 rounded-xl border border-border bg-card p-2 text-left hover:border-primary/40"
        >
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt=""
              className="h-16 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-muted text-base font-bold text-primary">
              {card.title.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="line-clamp-2 text-xs font-medium">{card.title}</p>
        </button>
      ))}
    </div>
  );
}

function RoutineCarousel({
  routines,
  selectedId,
  onSelect,
}: {
  routines: AnalysisCareItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {routines.map((routine, index) => {
        const active = routine.id === selectedId;
        const images = routineImages(routine);
        const am = routineHasMoment(routine, "am");
        const pm = routineHasMoment(routine, "pm");
        return (
          <button
            key={routine.id}
            type="button"
            onClick={() => onSelect(routine.id)}
            className={cn(
              "w-36 shrink-0 space-y-1.5 rounded-xl border p-2 text-left",
              active ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="relative flex h-20 w-full overflow-hidden rounded-lg bg-muted">
              {index === 0 ? (
                <span className="absolute left-1 top-1 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  Recomendada
                </span>
              ) : null}
              {images.length > 0 ? (
                images.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-full flex-1 object-cover" />
                ))
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                  {routine.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-xs font-medium">{routine.name}</p>
            {am || pm ? (
              <p className="truncate text-[11px] font-medium text-primary">
                {[am ? "Mañana" : null, pm ? "Noche" : null].filter(Boolean).join(" / ")}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function RoutineDetail({
  routine,
  onOpenMedia,
  onOpenProduct,
}: {
  routine: AnalysisCareItem;
  onOpenMedia: (preview: MediaPreview) => void;
  onOpenProduct: (detail: CatalogDetail) => void;
}) {
  const am = routineHasMoment(routine, "am");
  const pm = routineHasMoment(routine, "pm");
  const mediaItems = routineMediaItems(routine);
  const linkedProducts = linkedProductsForRoutine(routine);
  const steps = [...(routine.steps ?? [])].sort((a, b) => a.order - b.order);

  return (
    <ModuleCard className="space-y-4 p-4">
      <div>
        <p className="font-medium">{routine.name}</p>
        {routine.description ? (
          <p className="text-sm text-muted-foreground">{routine.description}</p>
        ) : null}
        {am || pm ? (
          <p className="mt-1 text-xs font-medium text-primary">
            {[am ? "☀ Mañana" : null, pm ? "☾ Noche" : null].filter(Boolean).join("   ·   ")}
          </p>
        ) : null}
      </div>

      {steps.length > 0 ? (
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={step.id} className="text-sm">
              <span className="font-medium">
                {index + 1}. {step.title}
              </span>
              {step.description ? (
                <span className="text-muted-foreground"> — {step.description}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {mediaItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            ¿Cómo seguir esta rutina?
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {mediaItems.map((item) => (
              <button
                key={`${item.kind}-${item.url}`}
                type="button"
                onClick={() => onOpenMedia(item)}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
              >
                {item.kind === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] font-semibold text-white">
                  {item.kind === "video" ? "Ver video" : "Ampliar"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {linkedProducts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Productos vinculados</p>
          <DetailCardCarousel cards={linkedProducts} onOpen={onOpenProduct} />
        </div>
      ) : null}
    </ModuleCard>
  );
}

function CatalogDetailModal({
  detail,
  onClose,
  onOpenMedia,
}: {
  detail: CatalogDetail | null;
  onClose: () => void;
  onOpenMedia: (preview: MediaPreview) => void;
}) {
  const kindLabel =
    detail?.kind === "routine"
      ? "Rutina"
      : detail?.kind === "treatment"
        ? "Tratamiento"
        : detail?.kind === "supplement"
          ? "Suplemento"
          : "Producto";

  return (
    <Dialog
      open={detail != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{kindLabel}</DialogTitle>
        </DialogHeader>
        {detail?.imageUrl ? (
          <button
            type="button"
            onClick={() =>
              onOpenMedia({ kind: "image", url: detail.imageUrl!, title: detail.title })
            }
            className="relative block overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.imageUrl}
              alt=""
              className="max-h-56 w-full bg-muted object-contain"
            />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
              Ampliar
            </span>
          </button>
        ) : null}
        <div className="space-y-1">
          <p className="text-base font-semibold">{detail?.title}</p>
          {detail?.subtitle ? (
            <p className="text-sm font-medium text-primary">{detail.subtitle}</p>
          ) : null}
          {detail?.description ? (
            <p className="text-sm text-muted-foreground">{detail.description}</p>
          ) : null}
        </div>
        {detail?.extras?.length ? (
          <ul className="space-y-1 text-sm">
            {detail.extras.map((line) => (
              <li key={line} className="text-muted-foreground">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {detail?.url ? (
          <Button
            type="button"
            className="w-fit"
            onClick={() => openUrl(detail.url)}
          >
            Ver más
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SeeAllDialog({
  section,
  onClose,
}: {
  section: { title: string; names: string[] } | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={section != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section?.title}</DialogTitle>
        </DialogHeader>
        {section && section.names.length > 0 ? (
          <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
            {section.names.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no hay ítems en esta categoría.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const { data, isLoading: isLoadingSkinAge } = useAnalysisCareRecommendations(analysisId);
  // Cuando hay una tarjeta de métrica puntual seleccionada arriba (ej.
  // "Arrugas" → hd_wrinkle), se filtra por el motor de condiciones en vez de
  // por la regla de edad de piel — mismo criterio que ya usaban (sin usar
  // hoy) RecommendedRoutines/RecommendedTreatments.
  const routinesQuery = useRecommendedRoutines(analysisId, !!metricType);
  const treatmentsQuery = useRecommendedTreatments(analysisId, !!metricType);

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

  const filteredByMetric = useMemo(() => {
    if (!metricType) return null;
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
  }, [metricType, routinesQuery.data, treatmentsQuery.data]);

  const routines = filteredByMetric ? filteredByMetric.routines : generalRoutines;
  const products = filteredByMetric ? filteredByMetric.products : generalProducts;
  const supplements = filteredByMetric
    ? filteredByMetric.supplements
    : generalSupplements;
  const treatments = filteredByMetric ? filteredByMetric.treatments : generalTreatments;
  const isLoading = metricType
    ? routinesQuery.isLoading || treatmentsQuery.isLoading
    : isLoadingSkinAge;

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
