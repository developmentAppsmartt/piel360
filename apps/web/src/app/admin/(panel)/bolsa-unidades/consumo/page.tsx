"use client";

import Link from "next/link";
import { AnalysisConsumptionView } from "@/components/analyses/analysis-consumption-view";
import { MOCK_COMPANY_CONSUMPTION } from "@/lib/mocks/admin-bolsa";

export default function BolsaConsumoPage() {
  const data = MOCK_COMPANY_CONSUMPTION;

  return (
    <AnalysisConsumptionView
      aesthetic={data.aesthetic}
      derm={data.derm}
      daily={data.daily}
      rows={data.rows}
      subtitle={`Vista empresa: ${data.company} (${data.companyId}). Consulta el consumo de análisis estéticos y dermatológicos.`}
      headerExtra={
        <p className="mb-1 text-xs text-muted-foreground">
          <Link href="/admin/bolsa-unidades" className="hover:text-foreground">
            Bolsa de unidades
          </Link>{" "}
          ›{" "}
          <Link
            href="/admin/bolsa-unidades/clientes"
            className="hover:text-foreground"
          >
            Clientes
          </Link>{" "}
          › Consumo
        </p>
      }
    />
  );
}
