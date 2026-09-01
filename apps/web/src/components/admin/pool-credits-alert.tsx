"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { usePlanPoolAlerts } from "@/lib/queries/admin-bolsa-units";
import { cn } from "@/lib/utils";

const POOL_LABELS = {
  skiniver: "Skiniver",
  perfectcorp: "Perfect Corp",
} as const;

export function PoolCreditsAlert({ className }: { className?: string }) {
  const alerts = usePlanPoolAlerts();

  if (alerts.isLoading || alerts.isError || !alerts.data?.hasAlerts) {
    return null;
  }

  const { unavailablePlans, balances } = alerts.data;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950",
        className,
      )}
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold text-amber-950">
            Créditos insuficientes en la bolsa
          </p>
          <p className="text-amber-900/90">
            {unavailablePlans.length === 1
              ? "Hay 1 plan activo que no puede contratarse"
              : `Hay ${unavailablePlans.length} planes activos que no pueden contratarse`}{" "}
            porque la bolsa no alcanza para cubrir sus créditos. Los doctores no verán estos
            planes en el catálogo hasta que recargues la bolsa correspondiente.
          </p>
          <ul className="list-inside list-disc space-y-1 text-amber-900/90">
            {unavailablePlans.map((plan) => (
              <li key={plan.id}>
                <span className="font-medium">{plan.name}</span>
                {" — "}
                requiere {plan.poolRequired.toLocaleString("es-CO")} créditos{" "}
                ({POOL_LABELS[plan.poolProvider]}:{" "}
                {plan.poolAvailable.toLocaleString("es-CO")} disponibles)
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-800/80">
            Saldo actual — Skiniver: {balances.skiniver.toLocaleString("es-CO")} · Perfect Corp:{" "}
            {balances.perfectcorp.toLocaleString("es-CO")}
          </p>
          <Link
            href="/admin/bolsa-unidades"
            className="inline-flex font-medium text-amber-950 underline underline-offset-2 hover:text-amber-900"
          >
            Ir a bolsa de unidades
          </Link>
        </div>
      </div>
    </div>
  );
}
