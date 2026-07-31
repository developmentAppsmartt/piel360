"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Download,
  Filter,
  MoreVertical,
  Search,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleMetric } from "@/components/ui/module-card";
import { MOCK_CLIENTS, MOCK_UNIT_POOLS } from "@/lib/mocks/admin-bolsa";
import { cn } from "@/lib/utils";

type Tab = "aesthetic" | "derm";

function formatInt(n: number) {
  return n.toLocaleString("es-CO");
}

export default function BolsaClientesPage() {
  const [tab, setTab] = useState<Tab>("aesthetic");
  const [q, setQ] = useState("");
  const pool = MOCK_UNIT_POOLS.find((p) => p.id === tab)!;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return MOCK_CLIENTS.filter(
      (c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.url.toLowerCase().includes(term),
    );
  }, [q]);

  const usedPct = (pool.used / pool.total) * 100;
  const availPct = (pool.available / pool.total) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/admin/bolsa-unidades" className="hover:text-foreground">
              Bolsa de unidades
            </Link>{" "}
            › Detalle de clientes
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Detalle de clientes y consumo de unidades
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clientes con planes activos y utilización de cupos (mock).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Download className="size-4" />
          Exportar reporte
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("aesthetic")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "aesthetic"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          Análisis de piel estéticos
        </button>
        <button
          type="button"
          onClick={() => setTab("derm")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "derm"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          Análisis de imágenes dermatológicas
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total unidades</p>
          <ModuleMetric className="mt-2 text-2xl">{formatInt(pool.total)}</ModuleMetric>
        </ModuleCard>
        <ModuleCard className="flex items-center justify-between gap-2 p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Unidades usadas</p>
            <ModuleMetric className="mt-2 text-2xl">{formatInt(pool.used)}</ModuleMetric>
            <p className="text-xs text-muted-foreground">{usedPct.toFixed(2)}%</p>
          </div>
          <UnitRing
            percent={usedPct}
            label="Usado"
            className="size-16"
            progressClassName="stroke-primary"
          />
        </ModuleCard>
        <ModuleCard className="flex items-center justify-between gap-2 p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Disponibles</p>
            <ModuleMetric className="mt-2 text-2xl">{formatInt(pool.available)}</ModuleMetric>
            <p className="text-xs text-muted-foreground">{availPct.toFixed(2)}%</p>
          </div>
          <UnitRing
            percent={availPct}
            label="Disp."
            className="size-16"
            progressClassName="stroke-chart-2"
          />
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Empresas activas</p>
          <ModuleMetric className="mt-2 text-2xl text-emerald-600">24</ModuleMetric>
          <p className="text-xs text-muted-foreground">Últimos 30 días</p>
        </ModuleCard>
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">
            Clientes con planes activos –{" "}
            {tab === "aesthetic"
              ? "Análisis de piel estéticos"
              : "Análisis dermatológicos"}
          </h2>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar empresa..."
                className="h-9 w-56 rounded-lg border border-border bg-background pr-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Filter className="size-4" />
              Filtros
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Usuarios</th>
                <th className="px-4 py-3 font-medium">Asignadas</th>
                <th className="px-4 py-3 font-medium">Usadas</th>
                <th className="px-4 py-3 font-medium">Disponibles</th>
                <th className="px-4 py-3 font-medium">% Utilización</th>
                <th className="px-4 py-3 font-medium">Última compra</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {c.initials}
                      </span>
                      <div>
                        <Link
                          href="/admin/bolsa-unidades/consumo"
                          className="font-medium hover:text-primary"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.plan}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.users} usuarios
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.users}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatInt(c.assigned)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatInt(c.used)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatInt(c.available)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${c.utilization}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums">
                        {c.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.lastPurchase}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      aria-label="Acciones"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Mostrando 1 a {rows.length} de {MOCK_CLIENTS.length} empresas
          </span>
          <span>10 por página</span>
        </div>
      </ModuleCard>
    </div>
  );
}
