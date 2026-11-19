import { cn } from "@/lib/utils";

// Medidor semicircular — mismo criterio que create-analysis.blade.php: la
// aguja rota de -90° (0%) a +90° (100%) según `high_risk_prob`.
const CENTER = { x: 60, y: 62 };
const RADIUS = 40;
const TICK_RADIUS = RADIUS + 9;

const ZONES = [
  { label: "Riesgo bajo", color: "#22c55e", from: 0, to: 60 },
  { label: "Riesgo medio", color: "#facc15", from: 60, to: 120 },
  { label: "Riesgo alto", color: "#ef4444", from: 120, to: 180 },
] as const;

const TICKS = [25, 50, 75] as const;

function polarToCartesian(angleDeg: number, radius = RADIUS) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: CENTER.x + radius * Math.cos(rad),
    y: CENTER.y + radius * Math.sin(rad),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

export function RiskGauge({
  percent,
  riskLabel,
  className,
}: {
  percent: number;
  riskLabel: string;
  /** Ancho del medidor; por defecto `max-w-xs`. */
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const rotation = -90 + (clamped / 100) * 180;

  return (
    <div className="flex flex-col items-center gap-2">
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-foreground">
        {ZONES.map((zone) => (
          <li key={zone.label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: zone.color }} aria-hidden />
            {zone.label}
          </li>
        ))}
      </ul>
      <svg
        viewBox="0 0 120 74"
        className={cn("w-full max-w-xs", className)}
        role="img"
        aria-label={`Riesgo ${riskLabel}: ${Math.round(clamped)} de 100`}
      >
        {ZONES.map((zone) => (
          <path
            key={zone.label}
            d={arcPath(zone.from, zone.to)}
            stroke={zone.color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {TICKS.map((tick) => {
          const p = polarToCartesian((tick / 100) * 180, TICK_RADIUS);
          return (
            <text
              key={tick}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="5.5"
              className="fill-muted-foreground"
            >
              {tick}
            </text>
          );
        })}
        <text x={CENTER.x - RADIUS} y={CENTER.y + 10} textAnchor="middle" fontSize="6" fontWeight="700" className="fill-muted-foreground">
          Bajo
        </text>
        <text x={CENTER.x + RADIUS} y={CENTER.y + 10} textAnchor="middle" fontSize="6" fontWeight="700" className="fill-muted-foreground">
          Alto
        </text>
        <line
          x1={CENTER.x}
          y1={CENTER.y}
          x2={CENTER.x}
          y2={CENTER.y - RADIUS + 6}
          stroke="currentColor"
          strokeWidth="2"
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px`, transform: `rotate(${rotation}deg)` }}
        />
        <circle cx={CENTER.x} cy={CENTER.y} r="3" fill="currentColor" />
      </svg>
      <p className="text-sm font-medium">
        Riesgo: <span className="font-semibold">{riskLabel}</span>
      </p>
    </div>
  );
}
