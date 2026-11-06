import type { AdminReports } from "@/lib/queries/admin-reports";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";

/** Todas las clases dermatológicas, sin «Otros», con el color de cada clase
 * que usa el donut del reporte dermatológico (admin.service.ts#getDiagnosisByClass). */
export function DiagnosisByClassChart({
  diagnosisByClass,
}: {
  diagnosisByClass: AdminReports["diagnosisByClass"];
}) {
  const max = Math.max(...diagnosisByClass.map((d) => d.count), 1);

  return (
    <ModuleCard className="space-y-3 p-4">
      <ModuleCardTitle className="text-sm font-medium text-muted-foreground">
        Diagnósticos por clase
      </ModuleCardTitle>
      {diagnosisByClass.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos en el rango seleccionado.</p>
      ) : (
        <div className="space-y-3">
          {diagnosisByClass.map((item) => {
            const percent = (item.count / max) * 100;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-muted-foreground" title={item.label}>
                  {item.label}
                </span>
                <div className="h-5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-5 rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ModuleCard>
  );
}
