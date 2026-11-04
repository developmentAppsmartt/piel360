import {
  ACNE_OVERLAYS,
  SKIN_TYPE_OVERLAYS,
  SKIN_TYPE_ZONES,
  metricConvention,
} from "@/lib/analisis-piel360-conventions";

/** Chips sin máscara propia o con una leyenda que no es la barra. */
const WITHOUT_BAR = new Set(["overview", "all", "skin_age", "fitzpatrick"]);

const shadowText = "[text-shadow:0_1px_2px_rgba(0,0,0,0.55)]";

function MetricBar({ type }: { type: string }) {
  const { gradient, highLabel, lowLabel } = metricConvention(type);
  return (
    <div className="absolute top-14 right-2 bottom-[24%] z-10 flex w-24 flex-col items-end gap-1 text-right text-[11px] font-bold text-white">
      <span className={shadowText}>{highLabel}</span>
      <span
        className="w-3.5 flex-1 rounded-md border border-white/45"
        style={{ backgroundImage: `linear-gradient(to bottom, ${gradient.join(", ")})` }}
      />
      <span className={shadowText}>{lowLabel}</span>
    </div>
  );
}

function AcneLegend() {
  return (
    <div className="absolute top-12 right-2 z-10 w-28 space-y-1.5 rounded-lg bg-zinc-900/45 p-1.5">
      {ACNE_OVERLAYS.map((item) => (
        <div key={item.key} className="flex items-center justify-end gap-1.5">
          <span className={`text-[10px] font-bold text-white ${shadowText}`}>
            {item.label}
          </span>
          <span
            className="h-6 w-3 shrink-0 rounded-sm"
            style={{
              backgroundColor: item.color,
              border: item.color === "#FFFFFF" ? "1px solid rgba(0,0,0,0.35)" : undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function SkinTypeLegend() {
  return (
    // Deja libre la esquina inferior derecha para la marca de agua.
    <div className="absolute top-2 right-2 bottom-[20%] z-10 flex w-24 flex-col items-end justify-between">
      <div className="w-20 space-y-1.5 rounded-lg bg-zinc-900/50 p-1.5">
        {SKIN_TYPE_OVERLAYS.map((item) => (
          <div key={item.key} className="space-y-0.5 text-center">
            <p className="text-[10px] font-bold text-white">{item.label}</p>
            <span
              className="block h-4 w-full rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          </div>
        ))}
      </div>
      <div className="w-24 space-y-1 rounded border border-zinc-900/45 bg-zinc-100/90 px-1.5 py-1 text-[10px] font-semibold text-zinc-900">
        {SKIN_TYPE_ZONES.map((zone) => (
          <div key={zone.key} className="flex items-center gap-1.5">
            <span
              className={`w-4 shrink-0 border-t-2 border-zinc-800 ${zone.dashed ? "border-dashed" : ""}`}
            />
            {zone.label}
          </div>
        ))}
        {SKIN_TYPE_OVERLAYS.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}: {item.intensityLabel}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Leyenda de la categoría activa sobre la foto, con el criterio de la app
 * móvil: acné y tipo de piel tienen la suya; el resto de métricas, la barra. */
export function AnalisisPiel360Convention({ type }: { type: string | null }) {
  if (!type || WITHOUT_BAR.has(type)) return null;
  if (type === "hd_acne") return <AcneLegend />;
  if (type === "hd_skin_type") return <SkinTypeLegend />;
  return <MetricBar type={type} />;
}

/** Color de la píldora del visor: el de la convención en las métricas, el
 * primario en edad, puntaje y fototipo (igual que el móvil). */
export function conventionBadgeColor(type: string | null): string | undefined {
  if (!type || WITHOUT_BAR.has(type)) return undefined;
  return metricConvention(type).color;
}
