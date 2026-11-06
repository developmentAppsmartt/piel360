"use client";

import { useState } from "react";
import { ImageWatermark } from "@/components/analyses/image-watermark";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import {
  AnalisisPiel360Convention,
  conventionBadgeColor,
} from "./analisis-piel360-conventions";
import { ImageZoomControls } from "./image-zoom-controls";
import { useImageZoomPan } from "./use-image-zoom-pan";

/** Mientras la foto no carga (o si no hay foto), la caja de la app móvil. */
const FALLBACK_ASPECT = 4 / 5;

/** «Puntaje de la piel» pinta varias máscaras a la vez y, al 100 %, juntas
 * tapaban la piel (el cliente lo veía como una capa opaca). La opacidad va en
 * el grupo, no en cada capa: así no se suman al superponerse. Igual en la app
 * móvil (YoucamResultsSection). */
const OVERVIEW_LAYERS_OPACITY = 0.55;

/** Foto del análisis con la máscara de la métrica (o las capas del puntaje
 * general) encima, con zoom, arrastre y la leyenda de la categoría. */
export function AnalisisPiel360Viewer({
  imageUrl,
  overviewMaskUrls,
  maskUrl,
  badgeLabel,
  metricType,
}: {
  /** La foto original; null si el análisis no la tiene. */
  imageUrl: string | null;
  /** Solo en el chip del puntaje general: varias máscaras superpuestas. */
  overviewMaskUrls: string[] | null;
  maskUrl: string | null;
  badgeLabel: string | null;
  /** El chip activo: decide la leyenda y el color de la píldora. */
  metricType: string | null;
}) {
  const showBase = !!imageUrl;
  const hasImage = showBase || !!maskUrl;
  const { zoom, canPan, viewerRef, zoomIn, zoomOut, transform, pointerHandlers } =
    useImageZoomPan();
  // La caja toma la proporción de la foto. Con una fija, una foto más angosta
  // dejaba franjas a los lados y el zoom y la píldora quedaban sobre la franja,
  // a medio montar sobre la foto.
  const [aspect, setAspect] = useState(FALLBACK_ASPECT);

  function onBaseLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) setAspect(naturalWidth / naturalHeight);
  }

  const imageClass = "absolute inset-0 size-full object-contain";
  const mask = maskUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={maskUrl} alt={badgeLabel ?? "Máscara"} className={imageClass} />
  ) : null;

  return (
    // El ancho se limita en vez del alto: con `max-h` la caja quedaba apaisada
    // en una columna ancha. `contain` en la foto y en las máscaras: miden lo
    // mismo, así que siguen alineadas.
    <ModuleCard className="mx-auto w-full max-w-md overflow-hidden p-0">
      <div
        ref={viewerRef}
        className={cn(
          "relative w-full overflow-hidden bg-muted touch-none select-none",
          canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        )}
        style={{ aspectRatio: showBase ? aspect : FALLBACK_ASPECT }}
        {...pointerHandlers}
      >
        <div className="absolute inset-0 origin-center" style={{ transform }}>
          {showBase ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Foto del análisis"
                className={imageClass}
                onLoad={onBaseLoad}
              />
              {overviewMaskUrls ? (
                <div
                  className="absolute inset-0"
                  style={{ opacity: OVERVIEW_LAYERS_OPACITY }}
                >
                  {overviewMaskUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className={imageClass} />
                  ))}
                </div>
              ) : (
                mask
              )}
            </>
          ) : (
            (mask ?? (
              <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                No hay foto original disponible para este análisis. Puedes revisar
                las métricas y el reporte.
              </div>
            ))
          )}
        </div>
        {hasImage ? (
          <ImageZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            className="top-3 left-3"
          />
        ) : null}
        {badgeLabel ? (
          <span
            className="absolute bottom-3 left-3 z-10 max-w-[60%] truncate rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: conventionBadgeColor(metricType) }}
          >
            {badgeLabel}
          </span>
        ) : null}
        {hasImage ? <AnalisisPiel360Convention type={metricType} /> : null}
        {/* Fuera del contenedor que se escala: con el zoom la marca crecería
            y podría salirse del encuadre. */}
        {hasImage ? <ImageWatermark className="bottom-3 right-3" /> : null}
      </div>
    </ModuleCard>
  );
}
