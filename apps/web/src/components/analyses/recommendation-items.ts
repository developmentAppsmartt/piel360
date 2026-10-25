import type { AnalysisCareItem } from "@/lib/queries/skin-age-rules";
import type { Routine } from "@/lib/queries/routines";
import type { Treatment } from "@/lib/queries/treatments";

/** Adapta el shape de RoutinesService al que ya consume este panel. */
export function mapRoutineToCareItem(routine: Routine): AnalysisCareItem {
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
export function mapTreatmentToCareItem(treatment: Treatment): AnalysisCareItem {
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

export type CatalogKind = "routine" | "product" | "treatment" | "supplement";

export type CatalogDetail = {
  title: string;
  subtitle?: string;
  description?: string | null;
  imageUrl: string | null;
  url?: string | null;
  kind: CatalogKind;
  /** Líneas extra (ej. productos de un grupo/tratamiento plano). */
  extras?: string[];
};

export type MediaPreview = {
  kind: "video" | "image";
  url: string;
  title: string;
};

export function firstNonEmpty(...lists: AnalysisCareItem[][]): AnalysisCareItem[] {
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
 * rutina — mismo criterio que la versión mobile (AnalisisPiel360CatalogSection). */
export function routineHasMoment(routine: AnalysisCareItem, kind: "am" | "pm") {
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

export function routineMediaItems(routine: AnalysisCareItem): MediaPreview[] {
  return [...(routine.steps ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(stepMedia)
    .filter((item): item is MediaPreview => item != null);
}

export function routineImages(routine: AnalysisCareItem): string[] {
  return routineMediaItems(routine)
    .filter((item) => item.kind === "image")
    .map((item) => item.url)
    .slice(0, 3);
}

/** Productos vinculados a los pasos de una rutina, sin duplicados — cada
 * link de paso ya trae nombre/imagen/URL del producto, no hace falta
 * cruzarlo contra otra lista. */
export function linkedProductsForRoutine(routine: AnalysisCareItem): CatalogDetail[] {
  const seen = new Set<string>();
  const linked: CatalogDetail[] = [];
  for (const step of [...(routine.steps ?? [])].sort((a, b) => a.order - b.order)) {
    // `products` viene tipado como obligatorio, pero según el motor que
    // devuelva la rutina puede llegar ausente — la app móvil también lo
    // tolera (mapRuleRoutines en AnalisisPiel360CatalogSection).
    for (const product of step.products ?? []) {
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

export function openUrl(url?: string | null) {
  if (url) window.open(url, "_blank", "noreferrer");
}

export function itemToDetail(item: AnalysisCareItem, kind: CatalogKind): CatalogDetail {
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
