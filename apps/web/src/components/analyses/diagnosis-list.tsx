import {
  analisisDermaPiel360CategoryLabel,
  analisisDermaPiel360DiagnosisLabel,
  type AnalisisDermaPiel360DiagnosisCandidate,
} from "@piel360/shared";
import { cn } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#facc15",
  high: "#ef4444",
};

function normalizedProb(prob: number) {
  return prob <= 1 ? prob * 100 : prob;
}

const RISK_LEGEND = [
  { level: "low", label: "Riesgo Bajo" },
  { level: "medium", label: "Riesgo Medio" },
  { level: "high", label: "Riesgo Alto" },
] as const;

/** Qué significa el color del anillo de cada diagnóstico. Usa los mismos
 * colores que la lista, para que la leyenda y las marcas no se separen. */
export function RiskLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {RISK_LEGEND.map(({ level, label }, index) => (
        <li
          key={level}
          className={cn(
            "flex items-center gap-2",
            index > 0 && "border-l border-border pl-4",
          )}
        >
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ background: RISK_COLORS[level] }}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Identidad de un candidato: `class_raw` no cambia con el idioma del nombre. */
export function candidateKey(item: AnalisisDermaPiel360DiagnosisCandidate) {
  return item.class_raw || item.class;
}

export function DiagnosisList({
  items,
  onSelect,
  selectedKey = null,
}: {
  items: AnalisisDermaPiel360DiagnosisCandidate[];
  onSelect: (item: AnalisisDermaPiel360DiagnosisCandidate) => void;
  /** `candidateKey` del diagnóstico elegido por el profesional. */
  selectedKey?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const color = RISK_COLORS[item.risk_level] ?? RISK_COLORS.low;
        const prob = normalizedProb(item.prob);
        const selected = selectedKey != null && candidateKey(item) === selectedKey;
        return (
          <button
            key={`${item.class}-${index}`}
            type="button"
            onClick={() => onSelect(item)}
            aria-pressed={selected}
            className={cn(
              "relative flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted",
              selected ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            {selected ? (
              <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                Diagnóstico seleccionado
              </span>
            ) : null}
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{
                background: `conic-gradient(${color} ${prob}%, var(--muted) ${prob}%)`,
              }}
            >
              <span
                className="flex size-9 items-center justify-center rounded-full bg-background text-foreground"
                style={{ fontSize: "0.65rem" }}
              >
                {Math.round(prob)}%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {analisisDermaPiel360DiagnosisLabel(item.class, item.class_raw)}
              </p>
              {item.desease && (
                <p className="text-xs text-muted-foreground">
                  {analisisDermaPiel360CategoryLabel(item.desease)}
                </p>
              )}
              {item.lesion_code?.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Código ICD: {item.lesion_code.trim()}
                </p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
