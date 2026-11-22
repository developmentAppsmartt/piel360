"use client";

import { useRef, useState } from "react";
import { LayeredAnalysisImage } from "@/components/patients/layered-analysis-image";
import { cn } from "@/lib/utils";

type Capture = { photoUrl: string | null; maskUrl: string | null };

const KEY_STEP = 5;

/**
 * Superposición antes/después: las dos capturas a color completo, una encima
 * de la otra, y una barra que se arrastra para descubrir la inicial o la
 * actual. Antes la actual se pintaba al 55 % en modo multiplicar y todo se
 * veía oscuro.
 *
 * `interactive={false}` la deja fija al 50 % (vista previa que abre el modal).
 */
export function BeforeAfterSlider({
  initial,
  current,
  initialLabel = "Inicial",
  currentLabel = "Actual",
  interactive = true,
  fit = "contain",
  className,
}: {
  initial: Capture;
  current: Capture;
  initialLabel?: string;
  currentLabel?: string;
  interactive?: boolean;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const [split, setSplit] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function splitAt(clientX: number) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  }

  // La manija no debe arrastrar la imagen del visor con zoom que la contiene.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || e.button !== 0) return;
    e.stopPropagation();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    splitAt(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    e.stopPropagation();
    splitAt(e.clientX);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    e.stopPropagation();
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - KEY_STEP));
    else if (e.key === "ArrowRight") setSplit((s) => Math.min(100, s + KEY_STEP));
    else return;
    e.preventDefault();
  }

  return (
    <div ref={boxRef} className={cn("relative size-full overflow-hidden select-none", className)}>
      <LayeredAnalysisImage
        photoUrl={initial.photoUrl}
        maskUrl={initial.maskUrl}
        alt={initialLabel}
        fit={fit}
        className="absolute inset-0 size-full"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        <LayeredAnalysisImage
          photoUrl={current.photoUrl}
          maskUrl={current.maskUrl}
          alt={currentLabel}
          fit={fit}
          className="absolute inset-0 size-full"
        />
      </div>

      <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
        {initialLabel}
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
        {currentLabel}
      </span>

      <div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)]"
        style={{ left: `${split}%` }}
        aria-hidden
      />
      {interactive ? (
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Deslizar entre ${initialLabel.toLowerCase()} y ${currentLabel.toLowerCase()}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ left: `${split}%` }}
        >
          ⇆
        </div>
      ) : null}
    </div>
  );
}
