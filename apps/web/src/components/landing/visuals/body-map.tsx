import { cn } from "@/lib/utils";

/** Puntos de lesión de muestra sobre la silueta (coordenadas del viewBox). */
const LESIONS = [
  { x: 74, y: 70, risk: "low" },
  { x: 108, y: 118, risk: "medium" },
  { x: 88, y: 160, risk: "low" },
  { x: 58, y: 132, risk: "high" },
  { x: 80, y: 232, risk: "low" },
  { x: 112, y: 262, risk: "medium" },
] as const;

const RISK_COLOR = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" } as const;

/**
 * Mapa corporal estilizado: silueta en SVG con giro 3D por CSS
 * (`landing-body-3d`) y lesiones que pulsan.
 */
export function BodyMap({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(29,107,255,0.25),transparent_70%)]" aria-hidden />
      <svg
        viewBox="0 0 180 320"
        className="landing-body-3d relative h-full max-h-[420px] w-auto"
        role="img"
        aria-label="Mapa corporal con lesiones ubicadas por nivel de riesgo"
      >
        <defs>
          <linearGradient id="body-fill" x1="0" x2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
        </defs>
        <g fill="url(#body-fill)" stroke="#1d6bff" strokeOpacity="0.55" strokeWidth="1.2">
          <circle cx="90" cy="32" r="22" />
          <rect x="82" y="52" width="16" height="12" rx="4" />
          <path d="M52 66 Q90 56 128 66 L134 170 Q90 182 46 170 Z" />
          <path d="M52 68 L30 150 L38 154 L60 90 Z" />
          <path d="M128 68 L150 150 L142 154 L120 90 Z" />
          <path d="M50 168 L88 172 L84 300 L64 300 Z" />
          <path d="M130 168 L92 172 L96 300 L116 300 Z" />
        </g>
        <g stroke="#1d6bff" strokeOpacity="0.18" strokeWidth="0.6" fill="none">
          {[90, 120, 150, 200, 250].map((y) => (
            <line key={y} x1="20" x2="160" y1={y} y2={y} />
          ))}
        </g>
        {LESIONS.map((lesion, i) => (
          <g key={i}>
            <circle className="landing-pulse" cx={lesion.x} cy={lesion.y} r="5" fill={RISK_COLOR[lesion.risk]} opacity="0.5" />
            <circle cx={lesion.x} cy={lesion.y} r="3.5" fill={RISK_COLOR[lesion.risk]} stroke="#fff" strokeWidth="1.2" />
          </g>
        ))}
      </svg>
    </div>
  );
}
