"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Info,
  ShoppingCart,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Button } from "@/components/ui/button";
import {
  ModuleCard,
  ModuleCardTitle,
  ModuleMetric,
} from "@/components/ui/module-card";
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
  fillClass,
  dotClass,
}: {
  values: number[];
  strokeClass: string;
  fillClass: string;
  dotClass: string;
}) {
  const max = Math.max(...values, 1);
  const w = 280;
  const h = 96;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 8) - 4;
    return { x, y };
  });
  const line = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full overflow-visible">
        <polyline points={area} className={fillClass} stroke="none" />
        <polyline
          fill="none"
          strokeWidth="2.5"
          points={line}
          className={strokeClass}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" className={dotClass} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>30 días atrás</span>
        <span>15 días atrás</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

export default function BolsaUnidadesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1>Bolsa de unidades global</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
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

      <div className="grid gap-3">
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p className="flex gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Las unidades se descuentan al confirmar un análisis. No son
              transferibles entre empresas. La bolsa global alimenta los cupos
              asignados a cada cliente.
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
            <span>
              Monitorea disponibilidad estética y dermatológica por separado
              para anticipar recargas y evitar interrupciones de servicio.
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {MOCK_UNIT_POOLS.map((pool) => {
              const pct = (pool.available / pool.total) * 100;
              const isAesthetic = pool.accent === "aesthetic";
              const Icon = isAesthetic ? Sparkles : Stethoscope;
              return (
                <ModuleCard key={pool.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg",
                            isAesthetic
                              ? "bg-primary/10 text-primary"
                              : "bg-chart-2/15 text-chart-2",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <p
                          className={cn(
                            "text-[11px] font-bold tracking-[0.06em] uppercase",
                            isAesthetic ? "text-primary" : "text-chart-2",
                          )}
                        >
                          {isAesthetic ? "Estético" : "Dermatológico"}
                        </p>
                      </div>
                      <h2 className="mt-3 text-[15px] font-semibold leading-snug">
                        {pool.name}
                      </h2>
                      <ModuleMetric className="mt-4">
                        {formatInt(pool.available)}
                      </ModuleMetric>
                      <p className="mt-1.5 text-sm text-muted-foreground">
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
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/80 pt-4 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {formatInt(pool.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Usadas</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {formatInt(pool.used)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reservadas</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {formatInt(pool.reserved)}
                      </p>
                    </div>
                  </div>
                </ModuleCard>
              );
            })}
          </div>

          <ModuleCard>
            <ModuleCardTitle>Resumen de uso (últimos 30 días)</ModuleCardTitle>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-primary">
                  Análisis estéticos
                </p>
                <MiniLineChart
                  values={MOCK_USAGE_SERIES.aesthetic}
                  strokeClass="stroke-primary"
                  fillClass="fill-primary/10"
                  dotClass="fill-primary"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-chart-2">
                  Análisis dermatológicos
                </p>
                <MiniLineChart
                  values={MOCK_USAGE_SERIES.derm}
                  strokeClass="stroke-chart-2"
                  fillClass="fill-chart-2/10"
                  dotClass="fill-chart-2"
                />
              </div>
            </div>
          </ModuleCard>
        </div>

        <aside className="space-y-4">
          <ModuleCard className="p-4">
            <ModuleCardTitle className="text-sm">Actividad reciente</ModuleCardTitle>
            <ul className="mt-4 space-y-3.5">
              {MOCK_ACTIVITY.map((a) => {
                const Icon = a.kind === "purchase" ? ShoppingCart : Building2;
                return (
                  <li
                    key={a.id}
                    className="flex gap-3 border-b border-border/70 pb-3.5 last:border-0 last:pb-0"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                        a.kind === "purchase"
                          ? "bg-primary/10 text-primary"
                          : "bg-chart-2/15 text-chart-2",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.clinic}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.plan}</p>
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        {a.deltaLabel}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{a.when}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/admin/bolsa-unidades/clientes"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Ver todas las actividades
            </Link>
          </ModuleCard>

          <ModuleCard className="space-y-3 p-4">
            <ModuleCardTitle className="text-sm">
              Alertas y recomendaciones
            </ModuleCardTitle>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/40">
              <p className="flex gap-2 font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4 shrink-0" />
                Unidades estéticas al 62%
              </p>
              <p className="mt-1 pl-6 text-xs text-amber-800/90 dark:text-amber-200/80">
                Considera recargar la bolsa.{" "}
                <Link href="/admin/compras" className="font-semibold underline">
                  Ir a compras
                </Link>
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/40">
              <p className="flex gap-2 font-semibold text-sky-900 dark:text-sky-200">
                <Info className="size-4 shrink-0" />
                Dermatológicas al 55%
              </p>
              <p className="mt-1 pl-6 text-xs text-sky-800/90 dark:text-sky-200/80">
                Nivel óptimo de disponibilidad.
              </p>
            </div>
          </ModuleCard>
        </aside>
      </div>
    </div>
  );
}
