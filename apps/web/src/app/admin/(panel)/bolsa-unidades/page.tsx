"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Button } from "@/components/ui/button";
import {
  MOCK_ACTIVITY,
  MOCK_UNIT_POOLS,
  MOCK_USAGE_SERIES,
} from "@/lib/mocks/admin-bolsa";
import { cn } from "@/lib/utils";

function formatInt(n: number) {
  return n.toLocaleString("es-CO");
}

function MiniLineChart({
  values,
  strokeClass,
}: {
  values: number[];
  strokeClass: string;
}) {
  const max = Math.max(...values, 1);
  const w = 280;
  const h = 96;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
      <polyline
        fill="none"
        strokeWidth="2.5"
        points={points}
        className={strokeClass}
      />
    </svg>
  );
}

export default function BolsaUnidadesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bolsa de unidades global
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario central de unidades para planes estéticos y dermatológicos.
            Datos mock hasta conectar el servicio B2B.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/bolsa-unidades/clientes" />}
        >
          Ver detalle de clientes
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <p className="flex gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Las unidades se descuentan al confirmar un análisis. No son
            transferibles entre empresas. La bolsa global alimenta los cupos
            asignados a cada cliente.
          </span>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {MOCK_UNIT_POOLS.map((pool) => {
              const pct = (pool.available / pool.total) * 100;
              const isAesthetic = pool.accent === "aesthetic";
              return (
                <section
                  key={pool.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={cn(
                          "text-xs font-semibold tracking-wide uppercase",
                          isAesthetic ? "text-primary" : "text-chart-2",
                        )}
                      >
                        {isAesthetic ? "Estético" : "Dermatológico"}
                      </p>
                      <h2 className="mt-1 text-base font-semibold">{pool.name}</h2>
                      <p className="mt-3 text-3xl font-bold tabular-nums">
                        {formatInt(pool.available)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        disponibles de {formatInt(pool.total)}
                      </p>
                    </div>
                    <UnitRing
                      percent={pct}
                      label="Disponible"
                      progressClassName={
                        isAesthetic ? "stroke-primary" : "stroke-chart-2"
                      }
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold tabular-nums">
                        {formatInt(pool.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Usadas</p>
                      <p className="font-semibold tabular-nums">
                        {formatInt(pool.used)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reservadas</p>
                      <p className="font-semibold tabular-nums">
                        {formatInt(pool.reserved)}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">
              Resumen de uso (últimos 30 días)
            </h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">
                  Análisis estéticos
                </p>
                <MiniLineChart
                  values={MOCK_USAGE_SERIES.aesthetic}
                  strokeClass="stroke-primary"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-chart-2">
                  Análisis dermatológicos
                </p>
                <MiniLineChart
                  values={MOCK_USAGE_SERIES.derm}
                  strokeClass="stroke-chart-2"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Actividad reciente</h2>
            <ul className="mt-3 space-y-3">
              {MOCK_ACTIVITY.map((a) => (
                <li key={a.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{a.clinic}</p>
                  <p className="text-xs text-muted-foreground">{a.plan}</p>
                  <p className="mt-1 text-xs font-semibold text-destructive">
                    {a.deltaLabel}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{a.when}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/admin/bolsa-unidades/clientes"
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Ver todas las actividades
            </Link>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Alertas y recomendaciones</h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/40">
              <p className="flex gap-2 font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4 shrink-0" />
                Unidades estéticas al 62%
              </p>
              <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/80">
                Considera recargar la bolsa.{" "}
                <Link href="/admin/compras" className="font-semibold underline">
                  Ir a compras
                </Link>
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/40">
              <p className="flex gap-2 font-medium text-sky-900 dark:text-sky-200">
                <Info className="size-4 shrink-0" />
                Dermatológicas al 55%
              </p>
              <p className="mt-1 text-xs text-sky-800/90 dark:text-sky-200/80">
                Nivel óptimo de disponibilidad.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
