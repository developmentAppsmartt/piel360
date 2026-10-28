"use client";

import { useRef, useState } from "react";
import { ImageWatermark } from "@/components/analyses/image-watermark";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

const MIN_IMAGE_ZOOM = 1;
const MAX_IMAGE_ZOOM = 2.5;
const IMAGE_ZOOM_STEP = 0.25;
const ZERO_PAN = { x: 0, y: 0 };

function clampImagePan(
  pan: { x: number; y: number },
  zoom: number,
  width: number,
  height: number,
) {
  if (zoom <= MIN_IMAGE_ZOOM || width <= 0 || height <= 0) return ZERO_PAN;
  const maxX = (width * zoom - width) / 2;
  const maxY = (height * zoom - height) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

/** Foto del análisis con la máscara de la métrica (o las capas del puntaje
 * general) encima, con zoom y arrastre. */
export function AnalisisPiel360Viewer({
  imageUrl,
  overviewMaskUrls,
  maskUrl,
  badgeLabel,
}: {
  /** La foto original; null si el análisis no la tiene. */
  imageUrl: string | null;
  /** Solo en el chip del puntaje general: varias máscaras superpuestas. */
  overviewMaskUrls: string[] | null;
  maskUrl: string | null;
  badgeLabel: string | null;
}) {
  const showBase = !!imageUrl;
  const [imageZoom, setImageZoom] = useState(MIN_IMAGE_ZOOM);
  const [imagePan, setImagePan] = useState(ZERO_PAN);
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const canPan = imageZoom > MIN_IMAGE_ZOOM;

  function changeImageZoom(next: number) {
    const zoom = Math.min(
      MAX_IMAGE_ZOOM,
      Math.max(MIN_IMAGE_ZOOM, +next.toFixed(2)),
    );
    const rect = viewerRef.current?.getBoundingClientRect();
    setImageZoom(zoom);
    setImagePan((pan) =>
      clampImagePan(
        zoom <= MIN_IMAGE_ZOOM ? ZERO_PAN : pan,
        zoom,
        rect?.width ?? 0,
        rect?.height ?? 0,
      ),
    );
  }

  function onViewerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canPan || e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onViewerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const rect = viewerRef.current?.getBoundingClientRect();
    // Forma funcional: varios movimientos entre dos renders se suman sobre la
    // posición más reciente, sin guardarla aparte en un ref.
    setImagePan((pan) =>
      clampImagePan(
        { x: pan.x + dx, y: pan.y + dy },
        imageZoom,
        rect?.width ?? 0,
        rect?.height ?? 0,
      ),
    );
  }

  function endViewerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
      // El ancho se limita en vez del alto: con `max-h` la caja quedaba
      // apaisada en una columna ancha y `object-cover` cortaba la cara arriba y
      // abajo (en el móvil se veía completa). `contain` en la foto y en las
      // máscaras: miden lo mismo, así que siguen alineadas.
      <ModuleCard className="mx-auto w-full max-w-md overflow-hidden p-0">
        <div
          ref={viewerRef}
          className={cn(
            "relative aspect-[4/5] w-full overflow-hidden bg-muted touch-none select-none",
            canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={onViewerPointerDown}
          onPointerMove={onViewerPointerMove}
          onPointerUp={endViewerDrag}
          onPointerCancel={endViewerDrag}
        >
          <div
            className="absolute inset-0 origin-center"
            style={{
              transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
            }}
          >
          {showBase ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl!}
                alt="Foto del análisis"
                className="absolute inset-0 size-full object-contain"
              />
              {overviewMaskUrls
                ? overviewMaskUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="absolute inset-0 size-full object-contain"
                    />
                  ))
                : maskUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={maskUrl}
                      alt={badgeLabel ?? "Máscara"}
                      className="absolute inset-0 size-full object-contain"
                    />
                  )}
            </>
          ) : maskUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={maskUrl}
              alt={badgeLabel ?? "Máscara"}
              className="absolute inset-0 size-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              No hay foto original disponible para este análisis. Puedes revisar
              las métricas y el reporte.
            </div>
          )}
          </div>
          {showBase || maskUrl ? (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => changeImageZoom(imageZoom + IMAGE_ZOOM_STEP)}
                disabled={imageZoom >= MAX_IMAGE_ZOOM}
                aria-label="Acercar imagen"
                className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-lg font-bold text-foreground shadow-sm disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => changeImageZoom(imageZoom - IMAGE_ZOOM_STEP)}
                disabled={imageZoom <= MIN_IMAGE_ZOOM}
                aria-label="Alejar imagen"
                className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-lg font-bold text-foreground shadow-sm disabled:opacity-40"
              >
                −
              </button>
            </div>
          ) : null}
          {badgeLabel ? (
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {badgeLabel}
            </span>
          ) : null}
          {/* Fuera del contenedor que se escala: con el zoom la marca crecería
              y podría salirse del encuadre. */}
          {showBase || maskUrl ? <ImageWatermark className="bottom-3 right-3" /> : null}
        </div>
      </ModuleCard>
  );
}
