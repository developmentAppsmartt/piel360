"use client";

import { useEffect, useRef, useState } from "react";
import { PlayCircle, X } from "lucide-react";

/** «Ver video». Mientras no exista el video, el modal lo avisa. `<dialog>`
 * nativo: trae el foco atrapado y el cierre con Escape. */
export function VideoButton({
  label,
  pendingText,
  className,
}: {
  label: string;
  pendingText: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <PlayCircle className="size-5" aria-hidden />
        {label}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-labelledby="landing-video-title"
        className="m-auto w-[min(92vw,640px)] rounded-3xl p-0 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm"
      >
        <div className="relative flex aspect-video flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#0b2a52] to-[#1d6bff] p-8 text-center text-white">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
          <PlayCircle className="size-14 opacity-80" aria-hidden />
          <p id="landing-video-title" className="text-lg font-semibold">
            {pendingText}
          </p>
        </div>
      </dialog>
    </>
  );
}
