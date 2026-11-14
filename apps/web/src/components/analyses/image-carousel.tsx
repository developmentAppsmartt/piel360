"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWatermark } from "@/components/analyses/image-watermark";
import { ImageZoomDialog } from "./image-zoom-dialog";

export function ImageCarousel({
  images,
  backgroundUrl,
}: {
  images: { label: string; url: string | null }[];
  // Foto original detrás de cada imagen del carrusel — usado por YouCam con
  // enableMaskOverlay:false, donde cada máscara es un .png crudo (transparente
  // salvo donde aplica) que necesita la foto de fondo para tener sentido.
  backgroundUrl?: string | null;
}) {
  const available = images.filter((img): img is { label: string; url: string } => !!img.url);
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">Las imágenes aún se están procesando...</p>;
  }

  const current = available[Math.min(index, available.length - 1)];

  const zoomButton = (
    <button
      type="button"
      onClick={() => setZoomOpen(true)}
      aria-label={`Ampliar imagen ${current.label}`}
      className="absolute top-2 right-2 z-20 flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-zinc-900 shadow-sm hover:bg-white"
    >
      <Maximize2 className="size-4" aria-hidden />
    </button>
  );

  // Alto tope: una foto vertical a todo el ancho empujaba los botones (y en
  // el modal del historial 3D, todo lo demás) fuera de una pantalla de
  // portátil. El contenedor se ajusta a la imagen para que la marca de agua
  // quede sobre la foto y no en el hueco de al lado. Clic en la imagen o en
  // el botón la abre ampliada.
  return (
    <div className="space-y-2">
      {backgroundUrl ? (
        <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
          <img
            src={backgroundUrl}
            alt="Foto original"
            className="block max-h-[55vh] w-auto max-w-full cursor-zoom-in"
            onClick={() => setZoomOpen(true)}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
          <img
            src={current.url}
            alt={current.label}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
          <ImageWatermark />
          {zoomButton}
        </div>
      ) : (
        <div className="relative mx-auto w-fit max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
          <img
            src={current.url}
            alt={current.label}
            className="block max-h-[55vh] w-auto max-w-full cursor-zoom-in rounded-lg border border-border"
            onClick={() => setZoomOpen(true)}
          />
          <ImageWatermark />
          {zoomButton}
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">{current.label}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === available.length - 1}
          onClick={() => setIndex((i) => Math.min(available.length - 1, i + 1))}
        >
          Siguiente
        </Button>
      </div>
      <ImageZoomDialog
        image={zoomOpen ? current : null}
        backgroundUrl={backgroundUrl ?? null}
        onClose={() => setZoomOpen(false)}
      />
    </div>
  );
}
