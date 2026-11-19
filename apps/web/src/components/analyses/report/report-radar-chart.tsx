import { ANALISIS_PIEL360_METRIC_LABELS } from "@/lib/youcam-metric-labels";

/** Las 15 condiciones, en el orden de la referencia del cliente (en sentido
 * horario desde arriba). Siempre se pintan las 15: un radar que se encoge
 * cuando falta una métrica cambia de forma y ya no se puede comparar. */
const RADAR_TYPES = [
  "hd_wrinkle",
  "hd_age_spot",
  "hd_texture",
  "hd_pore",
  "hd_firmness",
  "hd_eye_bag",
  "hd_droopy_upper_eyelid",
  "hd_droopy_lower_eyelid",
  "hd_acne",
  "hd_dark_circle",
  "hd_redness",
  "hd_radiance",
  "hd_moisture",
  "hd_oiliness",
  "hd_tear_trough",
] as const;

const RINGS = [0.2, 0.4, 0.6, 0.8, 1];
const GRID_COLOR = "#D1D5DB";
const LABEL_COLOR = "#374151";

const SIZE = 460;
const CENTER = SIZE / 2;
const RADIUS = 140;
const LABEL_RADIUS = RADIUS + 28;

function polar(angle: number, r: number) {
  return { x: CENTER + Math.cos(angle) * r, y: CENTER + Math.sin(angle) * r };
}

function angleOf(index: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / RADAR_TYPES.length;
}

/** «Párpado superior caído» no cabe en una línea: se parte en dos. */
function labelLines(label: string): string[] {
  if (label.length <= 16) return [label];
  const words = label.split(" ");
  const cut = words.length - 1;
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

function anchorFor(x: number): "start" | "middle" | "end" {
  // Las de arriba y abajo van centradas: alineadas a un lado chocaban con la
  // vecina (los dos «Párpado … caído»).
  if (Math.abs(x - CENTER) < LABEL_RADIUS * 0.3) return "middle";
  return x > CENTER ? "start" : "end";
}

export function ReportRadarChart({
  scores,
  color,
}: {
  scores: Record<string, number>;
  color: string;
}) {
  if (!RADAR_TYPES.some((t) => scores[t] != null)) {
    return <p className="text-sm text-muted-foreground">No hay suficientes métricas para el radar.</p>;
  }

  const axes = RADAR_TYPES.map((type, i) => {
    const angle = angleOf(i);
    const raw = scores[type];
    const value = raw == null ? null : Math.max(0, Math.min(100, raw));
    return {
      type,
      angle,
      value,
      point: polar(angle, (RADIUS * (value ?? 0)) / 100),
      tip: polar(angle, RADIUS),
      label: polar(angle, LABEL_RADIUS),
    };
  });

  const ringPoints = (ring: number) =>
    RADAR_TYPES.map((_, i) => {
      const p = polar(angleOf(i), RADIUS * ring);
      return `${p.x},${p.y}`;
    }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto w-full max-w-md"
      role="img"
      aria-label="Radar de las 15 condiciones de la piel"
    >
      {RINGS.map((ring) => (
        <polygon key={ring} points={ringPoints(ring)} fill="none" stroke={GRID_COLOR} strokeWidth={1} />
      ))}
      {axes.map((a) => (
        <line
          key={a.type}
          x1={CENTER}
          y1={CENTER}
          x2={a.tip.x}
          y2={a.tip.y}
          stroke={GRID_COLOR}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}
      <polygon
        points={axes.map((a) => `${a.point.x},${a.point.y}`).join(" ")}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {axes.map((a) =>
        a.value == null ? null : (
          <circle key={`p-${a.type}`} cx={a.point.x} cy={a.point.y} r={3.5} fill={color} />
        ),
      )}
      {axes.map((a) => {
        const lines = labelLines(ANALISIS_PIEL360_METRIC_LABELS[a.type] ?? a.type);
        const anchor = anchorFor(a.label.x);
        // Las etiquetas de abajo crecen hacia abajo; las de arriba, hacia arriba.
        const lineHeight = 11;
        const blockHeight = lines.length * lineHeight + 18;
        const top = a.label.y > CENTER + 10 ? a.label.y : a.label.y - blockHeight + 14;
        return (
          <text key={`t-${a.type}`} x={a.label.x} y={top} textAnchor={anchor} fill={LABEL_COLOR}>
            {lines.map((line, i) => (
              <tspan key={line} x={a.label.x} dy={i === 0 ? 0 : lineHeight} fontSize={10} fontWeight={600}>
                {line}
              </tspan>
            ))}
            <tspan x={a.label.x} dy={18} fontSize={16} fontWeight={800}>
              {a.value == null ? "—" : Math.round(a.value)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
