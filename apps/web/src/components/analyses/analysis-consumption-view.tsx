"use client";

import { useRef } from "react";
import {
  CalendarDays,
  Download,
  MoreVertical,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Button } from "@/components/ui/button";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import type {
  ConsumptionPool,
  DailyConsumptionPoint,
  DailyConsumptionRow,
} from "@/lib/queries/analysis-consumption";
import { cn } from "@/lib/utils";

export type ConsumptionRangePreset = "day" | "month" | "custom";

function DualLineChart({ points }: { points: DailyConsumptionPoint[] }) {
  const w = 640;
  const h = 200;
  const padX = 28;
  const padY = 24;
  const maxY = Math.max(...points.flatMap((p) => [p.aesthetic, p.derm]), 1);
  const yMax = Math.ceil(maxY / 5) * 5 || 5;

  const toX = (i: number) =>
    padX + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - padX * 2));
  const toY = (v: number) => padY + (1 - v / yMax) * (h - padY * 2);

  const aestheticLine = points
    .map((p, i) => `${toX(i)},${toY(p.aesthetic)}`)
    .join(" ");
  const dermLine = points.map((p, i) => `${toX(i)},${toY(p.derm)}`).join(" ");
  const ticks = [0, yMax / 2, yMax];

  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay análisis en el periodo seleccionado.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 28}`} className="h-56 w-full min-w-[520px]">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padX}
              x2={w - padX}
              y1={toY(t)}
              y2={toY(t)}
              className="stroke-border"
              strokeDasharray="4 4"
            />
            <text
              x={padX - 8}
              y={toY(t) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {t}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          strokeWidth="2.5"
          points={aestheticLine}
          className="stroke-primary"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          fill="none"
          strokeWidth="2.5"
          points={dermLine}
          className="stroke-chart-2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={toX(i)} cy={toY(p.aesthetic)} r="4" className="fill-primary" />
            <circle cx={toX(i)} cy={toY(p.derm)} r="4" className="fill-chart-2" />
            <text
              x={toX(i)}
              y={toY(p.aesthetic) - 10}
              textAnchor="middle"
              className="fill-primary text-[10px] font-semibold"
            >
              {p.aesthetic}
            </text>
            <text
              x={toX(i)}
              y={toY(p.derm) - 10}
              textAnchor="middle"
              className="fill-chart-2 text-[10px] font-semibold"
            >
              {p.derm}
            </text>
            <text
              x={toX(i)}
              y={h + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {p.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PoolCard({
  title,
  accent,
  pool,
}: {
  title: string;
  accent: "aesthetic" | "derm";
  pool: ConsumptionPool;
}) {
  const consumedPct = pool.limit > 0 ? (pool.done / pool.limit) * 100 : 0;
  const availablePct = pool.limit > 0 ? (pool.available / pool.limit) * 100 : 0;
  const isAesthetic = accent === "aesthetic";
  const Icon = isAesthetic ? Sparkles : Stethoscope;

  return (
    <ModuleCard className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              isAesthetic ? "bg-primary/10 text-primary" : "bg-chart-2/15 text-chart-2",
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
        <h2 className="mt-3 text-[15px] font-semibold leading-snug">{title}</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Realizados:</dt>
            <dd className="font-semibold tabular-nums">
              {pool.done}{" "}
              <span className="font-medium text-muted-foreground">
                ({consumedPct.toFixed(1)}%)
              </span>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Límite del plan:</dt>
            <dd className="font-semibold tabular-nums">{pool.limit} /mes</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Disponibles:</dt>
            <dd className="font-semibold tabular-nums">
              {pool.available}{" "}
              <span className="font-medium text-muted-foreground">
                ({availablePct.toFixed(1)}%)
              </span>
            </dd>
          </div>
        </dl>
      </div>
      <UnitRing
        percent={consumedPct}
        label="Consumido"
        decimals={1}
        progressClassName={isAesthetic ? "stroke-primary" : "stroke-chart-2"}
      />
    </ModuleCard>
  );
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Campo fecha/mes: clic en todo el control abre el calendario nativo. */
function CalendarField({
  label,
  value,
  display,
  onChange,
  inputType = "date",
  className,
}: {
  label: string;
  value: string;
  display: string;
  onChange: (next: string) => void;
  inputType?: "date" | "month";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <div className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={openPicker}
        className="relative flex h-9 min-w-[11.5rem] cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-medium tabular-nums text-foreground">
          {display || "Seleccionar"}
        </span>
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </button>
    </div>
  );
}

export function AnalysisConsumptionView({
  aesthetic,
  derm,
  daily,
  rows,
  subtitle = "Consulta el consumo detallado de análisis de piel estéticos y análisis de imágenes dermatológicas.",
  headerExtra,
  range,
  onRangeChange,
  dayDate,
  onDayDateChange,
  monthKey,
  onMonthKeyChange,
  dateFrom,
  dateTo,
  onCustomDatesChange,
  isRefreshing = false,
}: {
  aesthetic: ConsumptionPool;
  derm: ConsumptionPool;
  daily: DailyConsumptionPoint[];
  rows: DailyConsumptionRow[];
  subtitle?: string;
  headerExtra?: React.ReactNode;
  range: ConsumptionRangePreset;
  onRangeChange: (range: ConsumptionRangePreset) => void;
  dayDate: string;
  onDayDateChange: (iso: string) => void;
  monthKey: string;
  onMonthKeyChange: (yyyyMm: string) => void;
  dateFrom: string;
  dateTo: string;
  onCustomDatesChange: (from: string, to: string) => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {headerExtra}
          <h1>Consumo de análisis</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
          <Download className="size-4" />
          Exportar reporte
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Vista rápida
          </p>
          <div
            className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1"
            role="tablist"
            aria-label="Periodo"
          >
            {(
              [
                ["day", "Día"],
                ["month", "Mes"],
                ["custom", "Personalizado"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={range === key}
                onClick={() => onRangeChange(key)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  range === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {range === "day" ? (
          <CalendarField
            label="Fecha"
            value={dayDate}
            display={formatDisplayDate(dayDate)}
            onChange={onDayDateChange}
          />
        ) : null}

        {range === "month" ? (
          <CalendarField
            label="Mes"
            inputType="month"
            value={monthKey}
            display={formatMonthLabel(monthKey)}
            onChange={onMonthKeyChange}
          />
        ) : null}

        {range === "custom" ? (
          <>
            <CalendarField
              label="Desde"
              value={dateFrom}
              display={formatDisplayDate(dateFrom)}
              onChange={(from) =>
                onCustomDatesChange(from, dateTo < from ? from : dateTo)
              }
            />
            <CalendarField
              label="Hasta"
              value={dateTo}
              display={formatDisplayDate(dateTo)}
              onChange={(to) =>
                onCustomDatesChange(dateFrom > to ? to : dateFrom, to)
              }
            />
          </>
        ) : null}

        {isRefreshing ? (
          <p className="pb-2 text-xs text-muted-foreground">Actualizando…</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PoolCard
          title="Análisis de piel estéticos"
          accent="aesthetic"
          pool={aesthetic}
        />
        <PoolCard
          title="Análisis de imágenes dermatológicas"
          accent="derm"
          pool={derm}
        />
      </div>

      <ModuleCard>
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <ModuleCardTitle>Consumo por día</ModuleCardTitle>
            <ModuleCardDescription>
              Detalle de análisis realizados por día.
            </ModuleCardDescription>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 text-primary">
            <span className="size-2.5 rounded-full bg-primary" />
            Análisis de piel estéticos
          </span>
          <span className="inline-flex items-center gap-1.5 text-chart-2">
            <span className="size-2.5 rounded-full bg-chart-2" />
            Análisis de imágenes dermatológicas
          </span>
        </div>
        <DualLineChart points={daily} />
      </ModuleCard>

      <ModuleCard className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4">
          <ModuleCardTitle className="text-sm">Detalle de consumo</ModuleCardTitle>
          <ModuleCardDescription>
            Listado del periodo seleccionado.
          </ModuleCardDescription>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Análisis de piel estéticos</th>
                <th className="px-4 py-3 font-medium">
                  Análisis de imágenes dermatológicas
                </th>
                <th className="px-4 py-3 font-medium">Total análisis</th>
                <th className="px-4 py-3 font-medium">Pacientes</th>
                <th className="px-4 py-3 font-medium">Profesional</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Sin consumo en este periodo.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.date} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{r.date}</td>
                    <td className="px-4 py-3 tabular-nums text-primary">{r.aesthetic}</td>
                    <td className="px-4 py-3 tabular-nums text-chart-2">{r.derm}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{r.total}</td>
                    <td className="px-4 py-3 tabular-nums">{r.patients}</td>
                    <td className="px-4 py-3">{r.professional}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                        aria-label="Acciones"
                        disabled
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            {rows.length === 0
              ? "Sin resultados"
              : `Mostrando 1 a ${rows.length} de ${rows.length} días`}
          </span>
        </div>
      </ModuleCard>
    </div>
  );
}
