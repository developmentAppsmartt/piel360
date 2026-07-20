import type { SkiniverDiagnosisCandidate } from "@piel360/shared";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#facc15",
  high: "#ef4444",
};

function normalizedProb(prob: number) {
  return prob <= 1 ? prob * 100 : prob;
}

export function DiagnosisList({
  items,
  onSelect,
}: {
  items: SkiniverDiagnosisCandidate[];
  onSelect: (item: SkiniverDiagnosisCandidate) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const color = RISK_COLORS[item.risk_level] ?? RISK_COLORS.low;
        const prob = normalizedProb(item.prob);
        return (
          <button
            key={`${item.class}-${index}`}
            type="button"
            onClick={() => onSelect(item)}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted"
          >
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
              <p className="text-sm font-medium">{item.class}</p>
              {item.desease && <p className="text-xs text-muted-foreground">{item.desease}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
