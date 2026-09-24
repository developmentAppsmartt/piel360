"use client";

import type { SkiniverTopDiagnosis } from "@piel360/shared";

/**
 * Widget "Top 10 de diagnósticos más recurrentes". Tabla HTML plana, sin
 * DataTable: son 10 filas como máximo y no necesita paginar ni ordenar —
 * mismo criterio que top-problems-table.tsx.
 *
 * El ICD sale de `aiRawResponse.lesion_code`, que solo existe en la raíz de la
 * respuesta; los candidatos de `topn[]` nunca lo traen, por eso puede faltar.
 */
export function TopDiagnosesTable({ rows }: { rows: SkiniverTopDiagnosis[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay diagnósticos en el periodo seleccionado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Diagnóstico</th>
            <th className="py-2 pr-3 font-medium">CIE-10</th>
            <th className="py-2 pr-3 text-right font-medium">Cantidad</th>
            <th className="py-2 text-right font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.diagnosis} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                {index + 1}
              </td>
              <td className="py-2.5 pr-3 font-medium">{row.diagnosis}</td>
              <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                {row.icdCode ?? "—"}
              </td>
              <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">
                {row.count}
              </td>
              <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                {row.pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
