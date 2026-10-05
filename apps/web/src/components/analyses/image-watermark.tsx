import { cn } from "@/lib/utils";

/**
 * Marca de agua sobre las imágenes clínicas del análisis. Se monta dentro de
 * un contenedor `relative` y se superpone en la esquina inferior derecha.
 *
 * El ancho va en el contenedor y no en la imagen: un porcentaje sobre un
 * `<img>` dentro de un absoluto sin ancho se resuelve contra sí mismo y el
 * logo saldría a tamaño original. `pointer-events-none` evita que robe el
 * arrastre del visor con zoom del análisis estético.
 */
export function ImageWatermark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-1.5 bottom-1.5 z-10 w-[22%] max-w-[110px] min-w-[36px] select-none",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- asset local; es un overlay decorativo, no contenido */}
      <img
        src="/logo-piel360.png"
        alt=""
        className="block h-auto w-full opacity-70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
      />
    </span>
  );
}
