"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  Filter,
  Info,
  MoreVertical,
  Plus,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ModuleCard,
  ModuleCardTitle,
  ModuleMetric,
} from "@/components/ui/module-card";
import {
  MOCK_CLIENT_USAGE,
  MOCK_RECHARGES,
  MOCK_UNIT_POOLS,
  unitDistribution,
  type UnitPool,
} from "@/lib/mocks/admin-bolsa";
import { cn } from "@/lib/utils";

function formatInt(n: number) {
  return n.toLocaleString("es-CO");
}

function PoolIcon({ pool }: { pool: UnitPool }) {
  const Icon = pool.accent === "aesthetic" ? Sparkles : Stethoscope;
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-xl",
        pool.accent === "aesthetic"
          ? "bg-primary/10 text-primary"
          : "bg-emerald-500/10 text-emerald-600",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

function UnitPoolCard({ pool }: { pool: UnitPool }) {
  const pct = (pool.available / pool.total) * 100;
  const isAesthetic = pool.accent === "aesthetic";

  return (
    <ModuleCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PoolIcon pool={pool} />
            <p
              className={cn(
                "text-[11px] font-bold tracking-[0.06em] uppercase",
                isAesthetic ? "text-primary" : "text-emerald-600",
              )}
            >
              {isAesthetic ? "Estético / Fitzpatrick" : "Dermatológico"}
            </p>
          </div>
          <h2 className="mt-3 text-[15px] font-semibold leading-snug">
            {pool.name}
          </h2>
          <ModuleMetric className="mt-4">{formatInt(pool.available)}</ModuleMetric>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pool.unitLabel} disponibles
          </p>
        </div>
        <UnitRing
          percent={pct}
          label="Disponible"
          progressClassName={
            isAesthetic ? "stroke-primary" : "stroke-emerald-500"
          }
        />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/80 pt-4 text-center text-xs">
        <div>
          <p className="text-muted-foreground">Total compradas</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {formatInt(pool.total)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Consumidas</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {formatInt(pool.used)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Vencen pronto</p>
          <p className="mt-0.5 font-semibold tabular-nums text-amber-600">
            {formatInt(pool.expiringSoon)}
          </p>
        </div>
      </div>
    </ModuleCard>
  );
}

const DISTRIBUTION_LEGEND: Record<string, string> = {
  aesthetic: "Estético / Fitzpatrick",
  derm: "Dermatológico",
};

function DistributionDonut() {
  const slices = unitDistribution();
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            strokeWidth="12"
            className="stroke-muted"
          />
          {slices.map((slice) => {
            const len = (slice.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={slice.id}
                cx="64"
                cy="64"
                r={r}
                fill="none"
                strokeWidth="12"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                className={
                  slice.accent === "aesthetic"
                    ? "stroke-primary"
                    : "stroke-emerald-500"
                }
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <p className="text-base font-bold leading-none tabular-nums">
            {formatInt(total)}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
            Total unidades
          </p>
        </div>
      </div>

      <ul className="w-full space-y-3 border-t border-border/70 pt-4">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-1 size-2.5 shrink-0 rounded-full",
                slice.accent === "aesthetic" ? "bg-primary" : "bg-emerald-500",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium leading-snug text-foreground">
                  {DISTRIBUTION_LEGEND[slice.id] ?? slice.label}
                </p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {slice.percent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                {formatInt(slice.value)} unidades
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BolsaUnidadesPage() {
  const [typeFilter, setTypeFilter] = useState<"all" | "aesthetic" | "derm">(
    "all",
  );

  const recharges = useMemo(() => {
    if (typeFilter === "all") return MOCK_RECHARGES;
    return MOCK_RECHARGES.filter((r) => r.unitType === typeFilter);
  }, [typeFilter]);

  const maxClientUsage = Math.max(
    ...MOCK_CLIENT_USAGE.map((c) => c.consumed),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1>Bolsa de unidades global</h1>
            <Shield className="size-6 text-primary" />
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Administra y controla las unidades disponibles para análisis
            estéticos, fototipo Fitzpatrick y dermatológicos en toda la
            plataforma.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm">
            Historial de recargas
          </Button>
          <Button type="button" size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Recargar unidades
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {MOCK_UNIT_POOLS.map((pool) => (
              <UnitPoolCard key={pool.id} pool={pool} />
            ))}
          </div>

          <ModuleCard className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <ModuleCardTitle className="text-base">
                Recargas de unidades
              </ModuleCardTitle>
              <div className="flex flex-wrap gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as typeof typeFilter)
                  }
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="aesthetic">
                    Análisis estéticos / Fitzpatrick
                  </option>
                  <option value="derm">Análisis dermatológico</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                >
                  <CalendarDays className="size-4" />
                  01/01/2026 – 20/05/2026
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <Filter className="size-4" />
                  Filtros
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tipo de unidad</th>
                    <th className="px-4 py-3 font-semibold">Fecha de recarga</th>
                    <th className="px-4 py-3 font-semibold">Cantidad</th>
                    <th className="px-4 py-3 font-semibold">
                      Fecha de vencimiento
                    </th>
                    <th className="px-4 py-3 font-semibold">Agregado por</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {recharges.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <PoolIcon
                            pool={
                              MOCK_UNIT_POOLS.find(
                                (p) => p.id === row.unitType,
                              )!
                            }
                          />
                          <span className="font-medium">{row.unitLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.rechargedAt}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatInt(row.quantity)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.expiresAt}
                      </td>
                      <td className="px-4 py-3">{row.addedBy}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            aria-label="Ver detalle"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            aria-label="Más acciones"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Mostrando {recharges.length} de {MOCK_RECHARGES.length} resultados
            </div>
          </ModuleCard>
        </div>

        <aside className="space-y-4">
          <ModuleCard className="p-4">
            <ModuleCardTitle className="text-sm">
              Consumo por cliente (últimos 30 días)
            </ModuleCardTitle>
            <ul className="mt-4 space-y-3">
              {MOCK_CLIENT_USAGE.map((client) => {
                const pct = (client.consumed / maxClientUsage) * 100;
                const isAesthetic = client.accent === "aesthetic";
                return (
                  <li
                    key={client.id}
                    className="flex items-center gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isAesthetic
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-500/10 text-emerald-600",
                      )}
                    >
                      {client.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {client.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {client.plan}
                          </p>
                        </div>
                        <div className="hidden w-24 shrink-0 sm:block">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                isAesthetic ? "bg-primary" : "bg-emerald-500",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-destructive tabular-nums">
                          -{formatInt(client.consumed)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/admin/bolsa-unidades/clientes"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Ver detalle de clientes
            </Link>
          </ModuleCard>

          <ModuleCard className="overflow-hidden p-4">
            <ModuleCardTitle className="text-sm">
              Distribución de unidades
            </ModuleCardTitle>
            <div className="mt-4">
              <DistributionDonut />
            </div>
          </ModuleCard>
        </aside>
      </div>

      <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
          <span>
            Las unidades vencidas no son transferibles entre empresas y se
            eliminan automáticamente. Estético y Fitzpatrick comparten la misma
            bolsa de unidades.
          </span>
        </p>
      </div>
    </div>
  );
}
