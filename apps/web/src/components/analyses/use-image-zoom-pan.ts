"use client";

import { useRef, useState, type PointerEvent } from "react";

export const MIN_IMAGE_ZOOM = 1;
export const MAX_IMAGE_ZOOM = 2.5;
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

/** Zoom con botones y arrastre dentro de un recuadro (`viewerRef`). El
 * desplazamiento se limita para que la imagen no deje huecos en el borde. */
export function useImageZoomPan() {
  const [zoom, setZoom] = useState(MIN_IMAGE_ZOOM);
  const [pan, setPan] = useState(ZERO_PAN);
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const canPan = zoom > MIN_IMAGE_ZOOM;

  function viewerSize() {
    const rect = viewerRef.current?.getBoundingClientRect();
    return [rect?.width ?? 0, rect?.height ?? 0] as const;
  }

  function changeZoom(next: number) {
    const nextZoom = Math.min(MAX_IMAGE_ZOOM, Math.max(MIN_IMAGE_ZOOM, +next.toFixed(2)));
    setZoom(nextZoom);
    setPan((current) =>
      clampImagePan(
        nextZoom <= MIN_IMAGE_ZOOM ? ZERO_PAN : current,
        nextZoom,
        ...viewerSize(),
      ),
    );
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!canPan || e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    // Forma funcional: varios movimientos entre dos renders se suman sobre la
    // posición más reciente, sin guardarla aparte en un ref.
    setPan((current) =>
      clampImagePan({ x: current.x + dx, y: current.y + dy }, zoom, ...viewerSize()),
    );
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return {
    zoom,
    canPan,
    viewerRef,
    zoomIn: () => changeZoom(zoom + IMAGE_ZOOM_STEP),
    zoomOut: () => changeZoom(zoom - IMAGE_ZOOM_STEP),
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
