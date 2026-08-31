"use client";

import { AnalysisConsumptionView } from "@/components/analyses/analysis-consumption-view";
import { MOCK_COMPANY_CONSUMPTION } from "@/lib/mocks/admin-bolsa";

/** Vista global de consumo para superadmin (datos demo hasta conectar API agregada). */
export default function AdminConsumoPage() {
  const data = MOCK_COMPANY_CONSUMPTION;

  return (
    <AnalysisConsumptionView
      aesthetic={data.aesthetic}
      derm={data.derm}
      daily={data.daily}
      rows={data.rows}
      subtitle="Resumen del consumo de análisis en la plataforma: estéticos, dermatológicos y créditos por suscripción."
    />
  );
}
