import type { AdminReports } from "@/lib/queries/admin-reports";

// Misma paleta categórica de diagnosis-by-class-chart.tsx, primeras 3
// entradas — consistencia visual entre los charts categóricos de la página.
const BUCKET_COLORS: Record<string, string> = {
  Menores: "#3b82f6",
  Adultos: "#8b5cf6",
  Seniors: "#14b8a6",
};

/** Port de DiagnosisByAgeChart.php (Filament) — 3 tramos fijos calculados en
 * el backend desde `patient.birthDate` (admin.service.ts#getDiagnosisByAge).
 * Barra horizontal en vez del pie original, mismo patrón que risk-chart.tsx. */
export function DiagnosisByAgeChart({
  diagnosisByAge,
}: {
  diagnosisByAge: AdminReports["diagnosisByAge"];
}) {
  const max = Math.max(...diagnosisByAge.map((d) => d.count), 1);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Diagnósticos por edad</h2>
      <div className="space-y-3">
        {diagnosisByAge.map((item) => {
          const percent = (item.count / max) * 100;
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-muted-foreground">{item.label}</span>
              <div className="h-5 flex-1 rounded-full bg-muted">
                <div
                  className="h-5 rounded-full transition-all"
                  style={{ width: `${percent}%`, backgroundColor: BUCKET_COLORS[item.label] }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
