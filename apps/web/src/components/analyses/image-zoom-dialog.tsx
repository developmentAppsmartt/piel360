"use client";

import { XIcon } from "lucide-react";
import { ImageWatermark } from "@/components/analyses/image-watermark";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ImageZoomControls } from "./image-zoom-controls";
import { useImageZoomPan } from "./use-image-zoom-pan";

type ZoomImage = { label: string; url: string };

/** Va aparte del diálogo: se desmonta al cerrar, así que el zoom vuelve a 1
 * cada vez que se abre sin tener que reiniciarlo a mano. */
function ZoomStage({
  image,
  backgroundUrl,
}: {
  image: ZoomImage;
  backgroundUrl: string | null;
}) {
  const { zoom, canPan, viewerRef, zoomIn, zoomOut, transform, pointerHandlers } =
    useImageZoomPan();
  const base = backgroundUrl ?? image.url;

  return (
    <div
      ref={viewerRef}
      className={cn(
        "relative mx-auto w-fit max-w-full touch-none overflow-hidden rounded-lg select-none",
        canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
      )}
      {...pointerHandlers}
    >
      <div className="origin-center" style={{ transform }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
        <img
          src={base}
          alt={backgroundUrl ? "Foto original" : image.label}
          draggable={false}
          className="block max-h-[75vh] w-auto max-w-full"
        />
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image
          <img
            src={image.url}
            alt={image.label}
            draggable={false}
            className="absolute inset-0 size-full object-contain"
          />
        ) : null}
      </div>
      <ImageZoomControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        className="top-1/2 right-3 -translate-y-1/2"
      />
      <ImageWatermark />
    </div>
  );
}

/** Imagen del análisis ampliada, con + / − y arrastre. */
export function ImageZoomDialog({
  image,
  backgroundUrl,
  onClose,
}: {
  /** null = cerrado. */
  image: ZoomImage | null;
  backgroundUrl: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="gap-3 bg-zinc-800 p-3 text-white ring-white/10 sm:max-w-3xl"
      >
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="text-sm text-white">{image?.label}</DialogTitle>
          <DialogClose
            aria-label="Cerrar imagen"
            className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <XIcon className="size-5" />
          </DialogClose>
        </div>
        {image ? <ZoomStage image={image} backgroundUrl={backgroundUrl} /> : null}
        <DialogClose className="mx-auto rounded-full px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10">
          Cerrar
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
