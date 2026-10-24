"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openUrl, type CatalogDetail, type MediaPreview } from "./recommendation-items";

export function MediaLightbox({
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

export function CatalogDetailModal({
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

export function SeeAllDialog({
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
