"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageWatermark } from "@/components/analyses/image-watermark";

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

  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">Las imágenes aún se están procesando...</p>;
  }

  const current = available[Math.min(index, available.length - 1)];

  // Alto tope: una foto vertical a todo el ancho empujaba los botones (y en
  // el modal del historial 3D, todo lo demás) fuera de una pantalla de
  // portátil. El contenedor se ajusta a la imagen para que la marca de agua
  // quede sobre la foto y no en el hueco de al lado.
  return (
    <div className="space-y-2">
      {backgroundUrl ? (
        <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
          <img
            src={backgroundUrl}
            alt="Foto original"
            className="block max-h-[55vh] w-auto max-w-full"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
          <img
            src={current.url}
            alt={current.label}
            className="absolute inset-0 h-full w-full object-contain"
          />
          <ImageWatermark />
        </div>
      ) : (
        <div className="relative mx-auto w-fit max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
          <img
            src={current.url}
            alt={current.label}
            className="block max-h-[55vh] w-auto max-w-full rounded-lg border border-border"
          />
          <ImageWatermark />
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
    </div>
  );
}
