"use client";

import Link from "next/link";
import { AnalysisConsumptionScreen } from "@/components/analyses/analysis-consumption-screen";

export default function BolsaConsumoPage() {
  return (
    <AnalysisConsumptionScreen
      subtitle="Consulta el consumo de análisis estéticos y dermatológicos en la plataforma."
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
