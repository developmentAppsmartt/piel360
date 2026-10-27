"use client";

import { useMemo } from "react";
import { Sparkles, Stethoscope } from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Badge } from "@/components/ui/badge";
import { ModuleCard, ModuleMetric } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

export type UnitPool = {
  id: "aesthetic" | "derm";
  name: string;
  accent: "aesthetic" | "derm";
  available: number;
  total: number;
  used: number;
  reserved: number;
  expiringSoon: number;
  unitLabel: "unidades" | "créditos";
};

export const EMPTY_AESTHETIC_POOL: UnitPool = {
  id: "aesthetic",
  name: "Análisis estéticos / Fitzpatrick",
  accent: "aesthetic",
  available: 0,
  total: 0,
  used: 0,
  reserved: 0,
  expiringSoon: 0,
  unitLabel: "unidades",
};

export const EMPTY_DERM_POOL: UnitPool = {
  id: "derm",
  name: "Análisis dermatológico (créditos)",
  accent: "derm",
  available: 0,
  total: 0,
  used: 0,
  reserved: 0,
  expiringSoon: 0,
  unitLabel: "créditos",
};

export function formatInt(n: number) {
  return Math.round(n).toLocaleString("es-CO");
}

export function formatUnits(n: number) {
  return n.toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });
}

export function PoolIcon({ pool }: { pool: UnitPool }) {
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

export function UnitPoolCard({
  pool,
  live,
  liveLabel,
  totalLabel,
  usedLabel,
  loading,
}: {
  pool: UnitPool;
  live?: boolean;
  liveLabel?: string;
  totalLabel?: string;
  usedLabel?: string;
  loading?: boolean;
}) {
  const pct =
    pool.total > 0 ? Math.min(100, (pool.available / pool.total) * 100) : 0;
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
            {live ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                {liveLabel ?? "En vivo"}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-[15px] font-semibold leading-snug">
            {pool.name}
          </h2>
          <ModuleMetric className="mt-4">
            {loading ? "—" : formatUnits(pool.available)}
          </ModuleMetric>
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
          <p className="text-muted-foreground">
            {totalLabel ?? (live ? "Saldo + uso reciente" : "Total compradas")}
          </p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {formatUnits(pool.total)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {usedLabel ?? (live ? "Consumidas (historial)" : "Consumidas")}
          </p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {formatUnits(pool.used)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Vencen pronto</p>
          <p className="mt-0.5 font-semibold tabular-nums text-amber-600">
            {formatUnits(pool.expiringSoon)}
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

export function DistributionDonut({ pools }: { pools: UnitPool[] }) {
  const slices = useMemo(() => {
    const total = pools.reduce((sum, p) => sum + p.available, 0);
    const circumference = 2 * Math.PI * 46;
    const built = pools.reduce<{
      cursor: number;
      arcs: Array<{
        id: string;
        label: string;
        value: number;
        percent: number;
        accent: UnitPool["accent"];
        dash: string;
        dashOffset: number;
      }>;
    }>(
      (acc, p) => {
        const value = p.available;
        const len = total > 0 ? (value / total) * circumference : 0;
        return {
          cursor: acc.cursor + len,
          arcs: [
            ...acc.arcs,
            {
              id: p.id,
              label: p.name,
              value,
              percent: total > 0 ? (value / total) * 100 : 0,
              accent: p.accent,
              dash: `${len} ${circumference - len}`,
              dashOffset: acc.cursor,
            },
          ],
        };
      },
      { cursor: 0, arcs: [] },
    );
    return built.arcs;
  }, [pools]);
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={46}
            fill="none"
            strokeWidth="12"
            className="stroke-muted"
          />
          {slices.map((slice) => (
            <circle
              key={slice.id}
              cx="64"
              cy="64"
              r={46}
              fill="none"
              strokeWidth="12"
              strokeDasharray={slice.dash}
              strokeDashoffset={-slice.dashOffset}
              className={
                slice.accent === "aesthetic"
                  ? "stroke-primary"
                  : "stroke-emerald-500"
              }
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <p className="text-base font-bold leading-none tabular-nums">
            {formatUnits(total)}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
            Total unidades
          </p>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-3 border-t border-border/70 pt-4">
        {slices.map((slice) => (
          <li
            key={slice.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5"
          >
            <span
              className={cn(
                "mt-1 size-2.5 rounded-full",
                slice.accent === "aesthetic" ? "bg-primary" : "bg-emerald-500",
              )}
            />
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-medium leading-snug text-foreground">
                  {DISTRIBUTION_LEGEND[slice.id] ?? slice.label}
                </p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {slice.percent.toFixed(1)}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                {formatUnits(slice.value)} unidades
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
