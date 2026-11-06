import { cn } from "@/lib/utils";
import { MAX_IMAGE_ZOOM, MIN_IMAGE_ZOOM } from "./use-image-zoom-pan";

const buttonClass =
  "flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-lg font-bold text-zinc-900 shadow-sm disabled:opacity-40";

/** Botones + / − sobre una imagen con zoom. `stopPropagation` en el
 * pointerdown: si no, el clic empezaría un arrastre del visor. */
export function ImageZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  className,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}) {
  return (
    <div className={cn("absolute z-10 flex flex-col gap-2", className)}>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onZoomIn}
        disabled={zoom >= MAX_IMAGE_ZOOM}
        aria-label="Acercar imagen"
        className={buttonClass}
      >
        +
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onZoomOut}
        disabled={zoom <= MIN_IMAGE_ZOOM}
        aria-label="Alejar imagen"
        className={buttonClass}
      >
        −
      </button>
    </div>
  );
}
