"use client";

import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import type { BolsaPlanCupo } from "@/lib/queries/admin-bolsa-units";

function formatInt(n: number) {
  return Math.round(n).toLocaleString("es-CO");
}

function summarizeByPlan(rows: BolsaPlanCupo[]) {
  const byPlan = new Map<string, { analyses: number; credits: number }>();
  for (const row of rows) {
    const current = byPlan.get(row.planName) ?? { analyses: 0, credits: 0 };
    current.analyses += row.analyses;
    current.credits += row.credits;
    byPlan.set(row.planName, current);
  }
  return [...byPlan.entries()].map(([planName, totals]) => ({
    planName,
    ...totals,
  }));
}

export function BolsaPlanCupos({
  aesthetic,
  derm,
}: {
  aesthetic: BolsaPlanCupo[];
  derm: BolsaPlanCupo[];
}) {
  const rows = summarizeByPlan([...derm, ...aesthetic]);

  return (
    <ModuleCard className="h-full min-w-0 overflow-hidden p-0">
      <div className="border-b border-border p-4">
        <ModuleCardTitle className="text-base">Planes y créditos</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Total apartado por plan. Estético 22 por análisis, fototipo 10 y
          dermatológico 1.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Análisis</th>
              <th className="px-4 py-3 font-semibold">Créditos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-sm text-muted-foreground"
                >
                  No hay planes con créditos apartados.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.planName} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{row.planName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatInt(row.analyses)}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {formatInt(row.credits)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ModuleCard>
  );
}
