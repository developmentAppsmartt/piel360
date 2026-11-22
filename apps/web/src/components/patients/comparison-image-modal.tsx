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
import { BeforeAfterSlider } from "@/components/patients/before-after-slider";
import { LayeredAnalysisImage } from "@/components/patients/layered-analysis-image";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type Pan = { x: number; y: number };
type Size = { width: number; height: number };
const ZERO_PAN: Pan = { x: 0, y: 0 };

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/** El contenido escalado desde el centro sobra `(zoom − 1) · lado / 2` por
 * cada borde: moverlo más que eso metía el borde de la imagen en el recuadro
 * y lo dejaba en blanco. */
export function clampPan(pan: Pan, zoom: number, size: Size): Pan {
  const maxX = Math.max(0, ((zoom - 1) * size.width) / 2);
  const maxY = Math.max(0, ((zoom - 1) * size.height) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
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
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const canPan = zoom > 1;
  // Al bajar el zoom el margen se encoge: el pan guardado se acota al pintar.
  const effectivePan = clampPan(pan, zoom, size);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    onPanChange(clampPan({ x: effectivePan.x + dx, y: effectivePan.y + dy }, zoom, size));
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
      ref={boxRef}
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
        data-pan-content
        className="flex size-full items-center justify-center"
        style={{
          transform: `translate(${effectivePan.x}px, ${effectivePan.y}px) scale(${zoom})`,
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
  photoUrl,
  maskUrl,
  zoom,
  pan,
  onPanChange,
}: {
  label: string;
  date?: string;
  photoUrl: string | null;
  maskUrl: string | null;
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
        <LayeredAnalysisImage
          photoUrl={photoUrl}
          maskUrl={maskUrl}
          alt={label}
          fit="contain"
          className="size-full min-h-60"
        />
      </PanZoomViewport>
    </div>
  );
}

type ModalImages = {
  initialPhotoUrl: string | null;
  initialMaskUrl: string | null;
  currentPhotoUrl: string | null;
  currentMaskUrl: string | null;
  initialLabel: string;
  currentLabel: string;
  initialDate?: string;
  currentDate?: string;
  defaultView: "side" | "overlay";
};

/** El cuerpo del modal: vive dentro de `DialogContent`, que se monta al
 * abrir, así que zoom, vista y pan arrancan de cero en cada apertura sin
 * efectos que los reinicien. */
function ComparisonImageBody({
  initialPhotoUrl,
  initialMaskUrl,
  currentPhotoUrl,
  currentMaskUrl,
  initialLabel,
  currentLabel,
  initialDate,
  currentDate,
  defaultView,
}: ModalImages) {
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"side" | "overlay">(defaultView);
  const [initialPan, setInitialPan] = useState<Pan>(ZERO_PAN);
  const [currentPan, setCurrentPan] = useState<Pan>(ZERO_PAN);
  const [overlayPan, setOverlayPan] = useState<Pan>(ZERO_PAN);

  const viewButton = (value: "side" | "overlay", label: ReactNode) => (
    <button
      type="button"
      onClick={() => setView(value)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
        view === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-border p-1">
          {viewButton(
            "overlay",
            <>
              <Layers className="size-3.5" />
              Superposición
            </>,
          )}
          {viewButton("side", "Lado a lado")}
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
            photoUrl={initialPhotoUrl}
            maskUrl={initialMaskUrl}
            zoom={zoom}
            pan={initialPan}
            onPanChange={setInitialPan}
          />
          <ZoomablePane
            label={currentLabel}
            date={currentDate}
            photoUrl={currentPhotoUrl}
            maskUrl={currentMaskUrl}
            zoom={zoom}
            pan={currentPan}
            onPanChange={setCurrentPan}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <p className="text-center text-xs text-muted-foreground">
            {initialDate ?? initialLabel} vs {currentDate ?? currentLabel} · desliza la barra para comparar
            {zoom > 1 ? " · arrastra la imagen para moverla" : ""}
          </p>
          <PanZoomViewport
            zoom={zoom}
            pan={overlayPan}
            onPanChange={setOverlayPan}
            className="relative mx-auto aspect-[3/4] w-full max-w-md rounded-xl border border-border bg-muted/20"
          >
            <BeforeAfterSlider
              initial={{ photoUrl: initialPhotoUrl, maskUrl: initialMaskUrl }}
              current={{ photoUrl: currentPhotoUrl, maskUrl: currentMaskUrl }}
              initialLabel={initialLabel}
              currentLabel={currentLabel}
            />
          </PanZoomViewport>
        </div>
      )}
    </>
  );
}

export function ComparisonImageModal({
  open,
  onOpenChange,
  title = "Comparación de imágenes",
  subtitle,
  initialPhotoUrl,
  initialMaskUrl,
  currentPhotoUrl,
  currentMaskUrl,
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
  initialPhotoUrl: string | null;
  initialMaskUrl: string | null;
  currentPhotoUrl: string | null;
  currentMaskUrl: string | null;
  initialLabel?: string;
  currentLabel?: string;
  initialDate?: string;
  currentDate?: string;
  defaultView?: "side" | "overlay";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <ComparisonImageBody
          initialPhotoUrl={initialPhotoUrl}
          initialMaskUrl={initialMaskUrl}
          currentPhotoUrl={currentPhotoUrl}
          currentMaskUrl={currentMaskUrl}
          initialLabel={initialLabel}
          currentLabel={currentLabel}
          initialDate={initialDate}
          currentDate={currentDate}
          defaultView={defaultView}
        />
      </DialogContent>
    </Dialog>
  );
}

export type ComparisonImageModalState = {
  initialPhotoUrl: string | null;
  initialMaskUrl: string | null;
  currentPhotoUrl: string | null;
  currentMaskUrl: string | null;
  initialLabel?: string;
  currentLabel?: string;
  initialDate?: string;
  currentDate?: string;
  subtitle?: string;
  defaultView?: "side" | "overlay";
};
