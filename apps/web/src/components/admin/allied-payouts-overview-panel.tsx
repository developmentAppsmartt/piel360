"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { buttonVariants } from "@/components/ui/button";

type AlliedOrg = {
  id: string;
  name: string;
  referralCode: string | null;
  referralCommissionPercent: number | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  payoutReady: boolean;
  earnedPending: number;
  earnedDispersed: number;
  earnedTotal: number;
  pendingInvoiceCount: number;
  referralsCount: number;
};

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Panel lateral: empresas aliadas / referidos que reciben pagos a terceros. */
export function AlliedPayoutsOverviewPanel() {
  const query = useQuery({
    queryKey: ["admin", "organizations", "allied"],
    queryFn: () =>
      apiClientFetch<AlliedOrg[]>("/admin/organizations/allied"),
  });

  const rows = query.data ?? [];
  const pendingTotal = rows.reduce((sum, r) => sum + (r.earnedPending || 0), 0);
  const readyCount = rows.filter((r) => r.payoutReady && r.earnedPending > 0).length;
  const referredPros = rows.reduce((sum, r) => sum + (r.referralsCount || 0), 0);

  return (
    <div className="space-y-4">
      <ModuleCard className="p-5">
        <ModuleCardTitle>Pagos a terceros · referidos</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de empresas aliadas que reciben comisión cuando un profesional
          referido compra un plan.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Aliadas</p>
            <p className="text-xl font-bold tabular-nums">{rows.length}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Profesionales referidos</p>
            <p className="text-xl font-bold tabular-nums">{referredPros}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs text-amber-800/70">Pendiente dispersar</p>
            <p className="text-xl font-bold tabular-nums text-amber-800">
              {formatCop(pendingTotal)}
            </p>
            <p className="text-[11px] text-amber-800/70">
              {readyCount} lista{readyCount === 1 ? "" : "s"} para lote Wompi
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/configuracion/empresas-aliadas"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver empresas aliadas
          </Link>
          <Link
            href="/admin/facturacion"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ir a facturación
          </Link>
        </div>
      </ModuleCard>

      <ModuleCard className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold">Beneficiarios (aliadas)</p>
        </div>
        {query.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">
            No se pudo cargar el listado de aliadas.
          </p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Aún no hay empresas aliadas registradas.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((org) => (
              <li key={org.id} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.referralCode ?? "Sin código"} · comisión{" "}
                      {org.referralCommissionPercent != null
                        ? `${org.referralCommissionPercent}%`
                        : "—"}{" "}
                      · {org.referralsCount} referido
                      {org.referralsCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={
                      org.payoutReady
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                        : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                    }
                  >
                    {org.payoutReady ? "Lista" : "Datos incompletos"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {org.bankName ?? "Sin banco"} ·{" "}
                  {org.bankAccountNumber ?? "sin cuenta"}
                </p>
                <p className="text-xs">
                  Pendiente{" "}
                  <span className="font-semibold text-amber-800">
                    {formatCop(org.earnedPending)}
                  </span>
                  {" · "}
                  Total ganado{" "}
                  <span className="font-medium">{formatCop(org.earnedTotal)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </ModuleCard>
    </div>
  );
}
