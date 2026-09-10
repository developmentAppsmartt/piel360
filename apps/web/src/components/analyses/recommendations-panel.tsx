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
  { id: "productos", label: "Productos" },
  { id: "rutinas", label: "Rutinas" },
  { id: "suplementos", label: "Suplementos" },
  { id: "tratamientos", label: "Tratamientos" },
];

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

function CareList({
  title,
  items,
  emptyMessage,
  onOpenMedia,
}: {
  title: string;
  items: AnalysisCareItem[];
  emptyMessage: string;
  onOpenMedia: (preview: MediaPreview) => void;
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
              <button
                type="button"
                className="shrink-0"
                onClick={() =>
                  onOpenMedia({
                    kind: "image",
                    url: item.imageUrl!,
                    title: item.name,
                  })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                />
              </button>
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
                .map((step, index) => {
                  const mediaUrl = step.mediaUrl;
                  const kind = mediaUrl
                    ? inferMediaKind(step.mediaType, mediaUrl)
                    : null;
                  return (
                    <li key={step.id} className="flex gap-3">
                      {mediaUrl && kind ? (
                        <button
                          type="button"
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                          onClick={() =>
                            onOpenMedia({
                              kind,
                              url: mediaUrl,
                              title: step.title,
                            })
                          }
                        >
                          {kind === "video" ? (
                            <video
                              src={mediaUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaUrl}
                              alt=""
                              className="h-full w-full border border-border object-cover"
                            />
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[10px] font-semibold text-white">
                            Ampliar
                          </span>
                        </button>
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
                        {step.product ? (
                          <p className="mt-1 text-xs text-[#1E5A9E]">
                            Producto vinculado: {step.product.productName}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
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
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
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
                title="Productos sugeridos"
                items={products}
                emptyMessage="No hay productos configurados todavía."
                onOpenMedia={setMediaPreview}
              />
              <CareList
                title="Rutinas"
                items={routines}
                emptyMessage="No hay rutinas configuradas todavía."
                onOpenMedia={setMediaPreview}
              />
              <CareList
                title="Suplementos"
                items={supplements}
                emptyMessage="No hay suplementos configurados todavía."
                onOpenMedia={setMediaPreview}
              />
              <CareList
                title="Tratamientos"
                items={treatments}
                emptyMessage="No hay tratamientos configurados todavía."
                onOpenMedia={setMediaPreview}
              />
            </div>
          )}

          {tab === "productos" && (
            <CareList
              title="Productos sugeridos"
              items={products}
              emptyMessage="No hay productos configurados todavía."
              onOpenMedia={setMediaPreview}
            />
          )}
          {tab === "rutinas" && (
            <CareList
              title="Rutinas"
              items={routines}
              emptyMessage="No hay rutinas configuradas todavía."
              onOpenMedia={setMediaPreview}
            />
          )}
          {tab === "suplementos" && (
            <CareList
              title="Suplementos"
              items={supplements}
              emptyMessage="No hay suplementos configurados todavía."
              onOpenMedia={setMediaPreview}
            />
          )}
          {tab === "tratamientos" && (
            <CareList
              title="Tratamientos"
              items={treatments}
              emptyMessage="No hay tratamientos configurados todavía."
              onOpenMedia={setMediaPreview}
            />
          )}
        </>
      )}

      <MediaLightbox
        preview={mediaPreview}
        onClose={() => setMediaPreview(null)}
      />
    </div>
  );
}
