"use client";

import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import {
  useSubscriptionConsumptions,
  type SubscriptionConsumption,
} from "@/lib/queries/subscriptions";

const BOGOTA = "America/Bogota";

function formatConsumptionDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: BOGOTA,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatConsumptionTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: BOGOTA,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function analysisHref(row: SubscriptionConsumption) {
  return `/doctor/pacientes/${row.patientId}/analisis/${row.analysisId}`;
}

export function BillingPlanConsumptions({
  subscriptionId,
  active,
}: {
  subscriptionId: string;
  active: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useSubscriptionConsumptions(subscriptionId, active);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2.5 bg-primary/5 px-4 py-3">
        <ClipboardList className="size-4.5 text-primary" aria-hidden />
        <h3 className="font-semibold text-foreground">Análisis consumidos</h3>
      </header>
      {isLoading ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Cargando el registro…</p>
      ) : isError ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          No se pudo cargar el registro de análisis de este plan.
        </p>
      ) : !data?.length ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Este plan todavía no tiene análisis consumidos.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-4 py-2 font-medium">Paciente</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/50"
                  onClick={() => router.push(analysisHref(row))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") router.push(analysisHref(row));
                  }}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.patientName}</td>
                  <td className="px-4 py-2.5 text-foreground">{formatConsumptionDate(row.consumedAt)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-foreground">
                    {formatConsumptionTime(row.consumedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
