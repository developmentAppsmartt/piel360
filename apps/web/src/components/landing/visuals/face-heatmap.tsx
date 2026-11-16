import Image from "next/image";
import { cn } from "@/lib/utils";

/** Zonas del mapa de calor sobre el rostro del banner (coordenadas en % de la
 * imagen recortada `rostro-malla.webp`, perfil mirando a la izquierda). */
const HEAT_ZONES = [
  { cx: 58, cy: 22, r: 11, color: "#f59e0b" }, // frente
  { cx: 66, cy: 46, r: 13, color: "#ef4444" }, // mejilla
  { cx: 44, cy: 38, r: 7, color: "#8b5cf6" }, // ojera
  { cx: 40, cy: 52, r: 6, color: "#0fb5ba" }, // nariz
  { cx: 50, cy: 70, r: 9, color: "#1d6bff" }, // mentón
] as const;

export function FaceHeatmap({ className, labelled = false }: { className?: string; labelled?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-[#e8f0fb]", className)}>
      <Image
        src="/landing/rostro-malla.webp"
        alt={labelled ? "Rostro con mapa de calor del análisis estético" : ""}
        fill
        sizes="(min-width: 1024px) 480px, 90vw"
        className="object-cover object-[60%_30%]"
      />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full mix-blend-multiply" aria-hidden>
        <defs>
          {HEAT_ZONES.map((zone, i) => (
            <radialGradient key={i} id={`heat-${i}`}>
              <stop offset="0%" stopColor={zone.color} stopOpacity="0.75" />
              <stop offset="100%" stopColor={zone.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        {HEAT_ZONES.map((zone, i) => (
          <ellipse key={i} cx={zone.cx} cy={zone.cy} rx={zone.r} ry={zone.r * 0.9} fill={`url(#heat-${i})`} />
        ))}
      </svg>
      <div className="landing-scan top-0" aria-hidden />
    </div>
  );
}
