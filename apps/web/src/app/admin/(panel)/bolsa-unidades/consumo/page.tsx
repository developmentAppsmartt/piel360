"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, MoreVertical } from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Button } from "@/components/ui/button";
import { MOCK_COMPANY_CONSUMPTION } from "@/lib/mocks/admin-bolsa";
import { cn } from "@/lib/utils";

type Range = "day" | "month" | "custom";

export default function BolsaConsumoPage() {
  const [range, setRange] = useState<Range>("day");
  const data = MOCK_COMPANY_CONSUMPTION;
  const aPct = (data.aesthetic.done / data.aesthetic.limit) * 100;
  const dPct = (data.derm.done / data.derm.limit) * 100;
  const maxY = Math.max(
    ...data.daily.flatMap((d) => [d.aesthetic, d.derm]),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Consumo de análisis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista empresa: {data.company} ({data.companyId}) — datos mock.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Download className="size-4" />
          Exportar reporte
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => setRange(key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              range === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
        <input
          type="text"
          defaultValue="06/07/2026"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          readOnly
        />
        <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
          <option>Sin comparación</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Estético
            </p>
            <h2 className="mt-1 font-semibold">Análisis de piel estéticos</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Realizados</dt>
                <dd className="font-semibold tabular-nums">
                  {data.aesthetic.done}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Límite</dt>
                <dd className="font-semibold tabular-nums">
                  {data.aesthetic.limit}/mes
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Disponibles</dt>
                <dd className="font-semibold tabular-nums">
                  {data.aesthetic.available}
                </dd>
              </div>
            </dl>
          </div>
          <UnitRing
            percent={aPct}
            label="Consumido"
            progressClassName="stroke-primary"
          />
        </section>

        <section className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold tracking-wide text-chart-2 uppercase">
              Dermatológico
            </p>
            <h2 className="mt-1 font-semibold">
              Análisis de imágenes dermatológicas
            </h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Realizados</dt>
                <dd className="font-semibold tabular-nums">{data.derm.done}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Límite</dt>
                <dd className="font-semibold tabular-nums">
                  {data.derm.limit}/mes
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Disponibles</dt>
                <dd className="font-semibold tabular-nums">
                  {data.derm.available}
                </dd>
              </div>
            </dl>
          </div>
          <UnitRing
            percent={dPct}
            label="Consumido"
            progressClassName="stroke-chart-2"
          />
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Consumo por día</h2>
          <span className="text-xs text-muted-foreground">Ver por: Cantidad</span>
        </div>
        <div className="flex h-48 items-end gap-3">
          {data.daily.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-36 w-full items-end justify-center gap-0.5">
                <div
                  className="w-2.5 rounded-t bg-primary"
                  style={{ height: `${(d.aesthetic / maxY) * 100}%` }}
                  title={`Estético ${d.aesthetic}`}
                />
                <div
                  className="w-2.5 rounded-t bg-chart-2"
                  style={{ height: `${(d.derm / maxY) * 100}%` }}
                  title={`Derm ${d.derm}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.date}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Detalle de consumo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estéticos</th>
                <th className="px-4 py-3 font-medium">Dermatológicos</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pacientes</th>
                <th className="px-4 py-3 font-medium">Profesional</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.date} className="border-t border-border">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3 tabular-nums">{r.aesthetic}</td>
                  <td className="px-4 py-3 tabular-nums">{r.derm}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {r.total}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.patients}</td>
                  <td className="px-4 py-3">{r.professional}</td>
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
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Mostrando 1 a {data.rows.length} de {data.rows.length} días
        </div>
      </section>
    </div>
  );
}
