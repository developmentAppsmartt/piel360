"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useComparisonReport, type ComparisonReportInput } from "@/lib/queries/patients";

/** «Exportar reporte»: genera el PDF comparativo de las dos fechas elegidas
 * y lo abre en otra pestaña, como «Descargar PDF» del reporte estético. */
export function ComparisonExportButton({
  patientId,
  input,
}: {
  patientId: string;
  /** null mientras no haya dos análisis elegidos. */
  input: ComparisonReportInput | null;
}) {
  const report = useComparisonReport(patientId);

  async function handleExport() {
    if (!input || report.isPending) return;
    try {
      const { url } = await report.mutateAsync(input);
      window.open(url, "_blank", "noreferrer");
    } catch (err) {
      window.alert(
        err instanceof ApiError
          ? err.message
          : "No se pudo generar el reporte comparativo. Inténtalo de nuevo en unos segundos.",
      );
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={!input || report.isPending}
      onClick={() => void handleExport()}
    >
      <Download className="size-4" />
      {report.isPending ? "Generando…" : "Exportar reporte"}
    </Button>
  );
}
