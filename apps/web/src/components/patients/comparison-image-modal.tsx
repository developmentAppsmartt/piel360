"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Layers, Minus, Plus, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type Pan = { x: number; y: number };
const ZERO_PAN: Pan = { x: 0, y: 0 };

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function PanZoomViewport({
  zoom,
  pan,
  onPanChange,
  className,
  children,
}: {
  zoom: number;
  pan: Pan;
  onPanChange: (pan: Pan) => void;
  className?: string;
  children: ReactNode;
}) {
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const canPan = zoom > 1;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canPan || e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    onPanChange({ x: pan.x + dx, y: pan.y + dy });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden touch-none select-none",
        canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div
        className="flex size-full items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ZoomablePane({
  label,
  date,
  url,
  zoom,
  pan,
  onPanChange,
}: {
  label: string;
  date?: string;
  url: string | null;
  zoom: number;
  pan: Pan;
  onPanChange: (pan: Pan) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        {date ? <p className="text-xs text-muted-foreground">{date}</p> : null}
        {zoom > 1 ? (
          <p className="text-[10px] text-muted-foreground">Arrastra para mover</p>
        ) : null}
      </div>
      <PanZoomViewport
        zoom={zoom}
        pan={pan}
        onPanChange={onPanChange}
        className="relative min-h-60 flex-1 rounded-xl border border-border bg-muted/20"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            draggable={false}
            className="pointer-events-none max-h-[55vh] max-w-full object-contain"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sin imagen</p>
        )}
      </PanZoomViewport>
    </div>
  );
}

export function ComparisonImageModal({
  open,
  onOpenChange,
  title = "Comparación de imágenes",
  subtitle,
  initialUrl,
  currentUrl,
  initialLabel = "Inicial",
  currentLabel = "Actual",
  initialDate,
  currentDate,
  defaultView = "side",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  initialUrl: string | null;
  currentUrl: string | null;
  initialLabel?: string;
  currentLabel?: string;
  initialDate?: string;
  currentDate?: string;
  defaultView?: "side" | "overlay";
}) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"side" | "overlay">(defaultView);
  const [initialPan, setInitialPan] = useState<Pan>(ZERO_PAN);
  const [currentPan, setCurrentPan] = useState<Pan>(ZERO_PAN);
  const [overlayPan, setOverlayPan] = useState<Pan>(ZERO_PAN);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setView(defaultView);
      setInitialPan(ZERO_PAN);
      setCurrentPan(ZERO_PAN);
      setOverlayPan(ZERO_PAN);
    }
  }, [open, defaultView]);

  useEffect(() => {
    if (zoom <= 1) {
      setInitialPan(ZERO_PAN);
      setCurrentPan(ZERO_PAN);
      setOverlayPan(ZERO_PAN);
    }
  }, [zoom]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setView("overlay")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                view === "overlay"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Layers className="size-3.5" />
              Superposición
            </button>
            <button
              type="button"
              onClick={() => setView("side")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                view === "side"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Lado a lado
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <ZoomIn className="size-4 text-muted-foreground" />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Reducir zoom"
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-12 text-center text-xs font-semibold tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Ampliar zoom"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {view === "side" ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden sm:grid-cols-2">
            <ZoomablePane
              label={initialLabel}
              date={initialDate}
              url={initialUrl}
              zoom={zoom}
              pan={initialPan}
              onPanChange={setInitialPan}
            />
            <ZoomablePane
              label={currentLabel}
              date={currentDate}
              url={currentUrl}
              zoom={zoom}
              pan={currentPan}
              onPanChange={setCurrentPan}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <p className="text-center text-xs text-muted-foreground">
              {initialDate ?? initialLabel} vs {currentDate ?? currentLabel}
              {zoom > 1 ? " · arrastra para mover" : ""}
            </p>
            <PanZoomViewport
              zoom={zoom}
              pan={overlayPan}
              onPanChange={setOverlayPan}
              className="relative mx-auto aspect-[3/4] w-full max-w-md rounded-xl border border-border bg-muted/20"
            >
              <div className="relative size-full max-w-md">
                {initialUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={initialUrl}
                    alt={initialLabel}
                    draggable={false}
                    className="pointer-events-none absolute inset-0 size-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Sin imagen inicial
                  </div>
                )}
                {currentUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUrl}
                    alt={currentLabel}
                    draggable={false}
                    className="pointer-events-none absolute inset-0 size-full object-contain opacity-55 mix-blend-multiply"
                  />
                ) : null}
              </div>
            </PanZoomViewport>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type ComparisonImageModalState = {
  initialUrl: string | null;
  currentUrl: string | null;
  initialLabel?: string;
  currentLabel?: string;
  initialDate?: string;
  currentDate?: string;
  subtitle?: string;
  defaultView?: "side" | "overlay";
};
