"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImageCarousel({ images }: { images: { label: string; url: string | null }[] }) {
  const available = images.filter((img): img is { label: string; url: string } => !!img.url);
  const [index, setIndex] = useState(0);

  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">Las imágenes aún se están procesando...</p>;
  }

  const current = available[Math.min(index, available.length - 1)];

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada externa (S3), no apta para next/image */}
      <img src={current.url} alt={current.label} className="w-full rounded-lg border border-border" />
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
