const RADAR_TYPES = [
  "hd_moisture",
  "hd_oiliness",
  "hd_firmness",
  "hd_age_spot",
  "hd_wrinkle",
  "hd_texture",
  "hd_pore",
  "hd_acne",
] as const;

// Cuadrícula gris y números oscuros, como el radar de la app móvil.
const GRID_COLOR = "#E5E7EB";
const LABEL_COLOR = "#374151";

export function ReportRadarChart({
  scores,
  color,
}: {
  scores: Record<string, number>;
  color: string;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 95;
  const axes = RADAR_TYPES.filter((t) => scores[t] != null);
  if (axes.length < 3) {
    return <p className="text-sm text-muted-foreground">No hay suficientes métricas para el radar.</p>;
  }

  const points = axes.map((type, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    const value = Math.max(0, Math.min(100, scores[type] ?? 0)) / 100;
    return {
      type,
      value: scores[type] ?? 0,
      x: cx + Math.cos(angle) * radius * value,
      y: cy + Math.sin(angle) * radius * value,
      lx: cx + Math.cos(angle) * (radius + 20),
      ly: cy + Math.sin(angle) * (radius + 20),
      ax: cx + Math.cos(angle) * radius,
      ay: cy + Math.sin(angle) * radius,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-64 w-64" role="img" aria-label="Radar de métricas">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <circle key={ring} cx={cx} cy={cy} r={radius * ring} fill="none" stroke={GRID_COLOR} strokeWidth={1} />
      ))}
      {points.map((p) => (
        <line key={p.type} x1={cx} y1={cy} x2={p.ax} y2={p.ay} stroke={GRID_COLOR} strokeWidth={1} />
      ))}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={2}
      />
      {points.map((p) => (
        <text
          key={`t-${p.type}`}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          fill={LABEL_COLOR}
          fontSize={9}
          fontWeight={700}
        >
          {Math.round(p.value)}
        </text>
      ))}
    </svg>
  );
}
