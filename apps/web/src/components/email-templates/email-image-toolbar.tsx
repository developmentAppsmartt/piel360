"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Alineacion = "left" | "center" | "right";

/** `<p>` que envuelve la imagen. Si no está sola en un párrafo se le crea uno:
 * alinear el párrafo que comparte con texto movería también el texto. */
function contenedorDe(img: HTMLImageElement): HTMLElement {
  const padre = img.parentElement;
  if (padre?.tagName === "P" && padre.childNodes.length === 1) return padre;
  const p = document.createElement("p");
  p.style.margin = "0 0 16px";
  img.replaceWith(p);
  p.appendChild(img);
  return p;
}

/**
 * Se alinea el PÁRRAFO, no la imagen: es lo que entienden los clientes de
 * correo. El atributo `align` del `<p>` es lo único que respeta Outlook; el
 * `text-align` cubre al resto. La imagen pasa a `inline-block` y pierde el
 * `width:100%` del banner, porque ocupando todo el ancho no hay nada que
 * alinear.
 */
export function alinearImagen(img: HTMLImageElement, alineacion: Alineacion) {
  const p = contenedorDe(img);
  p.setAttribute("align", alineacion);
  p.style.textAlign = alineacion;
  img.style.display = "inline-block";
  img.style.width = "";
  img.style.maxWidth = "100%";
  img.style.height = "auto";
}

export function alineacionDe(img: HTMLImageElement): Alineacion | null {
  const valor = (
    img.parentElement?.getAttribute("align") ??
    img.parentElement?.style.textAlign ??
    ""
  ).toLowerCase();
  return valor === "left" || valor === "center" || valor === "right"
    ? valor
    : null;
}

/** Quita la imagen y, si su párrafo queda vacío, también el párrafo — si no
 * queda un hueco de 16px donde estaba el banner. */
export function quitarImagen(img: HTMLImageElement) {
  const padre = img.parentElement;
  img.remove();
  if (
    padre?.tagName === "P" &&
    !padre.textContent?.trim() &&
    !padre.querySelector("img")
  ) {
    padre.remove();
  }
}

const BOTONES: { id: Alineacion; label: string; Icon: typeof AlignLeft }[] = [
  { id: "left", label: "Alinear a la izquierda", Icon: AlignLeft },
  { id: "center", label: "Centrar", Icon: AlignCenter },
  { id: "right", label: "Alinear a la derecha", Icon: AlignRight },
];

export function EmailImageToolbar({
  alineacion,
  onAlinear,
  onReemplazar,
  onEliminar,
  subiendo,
}: {
  alineacion: Alineacion | null;
  onAlinear: (alineacion: Alineacion) => void;
  onReemplazar: () => void;
  onEliminar: () => void;
  subiendo: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Imagen seleccionada"
      className="flex flex-wrap items-center gap-1 border-b border-border bg-primary/5 px-2 py-1.5 text-xs"
    >
      <span className="mr-1 font-medium text-foreground">Imagen:</span>
      {BOTONES.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-pressed={alineacion === id}
          onClick={() => onAlinear(id)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md hover:bg-muted",
            alineacion === id
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        onClick={onReemplazar}
        disabled={subiendo}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        <ImageIcon className="size-3.5" />
        {subiendo ? "Subiendo…" : "Reemplazar"}
      </button>
      <button
        type="button"
        onClick={onEliminar}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" />
        Eliminar
      </button>
    </div>
  );
}
