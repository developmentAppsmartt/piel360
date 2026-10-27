"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Info, Plus, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import {
  useAnalisisDermaPiel360Units,
  useAnalisisPiel360Units,
} from "@/lib/queries/admin-bolsa-units";
import { PoolCreditsAlert } from "@/components/admin/pool-credits-alert";
import { PrebolsaCreditsCard } from "@/components/admin/prebolsa-credits-card";
import { cn } from "@/lib/utils";
import {
  AnalisisDermaPiel360RechargeDialog,
  MovementDetailDialog,
} from "@/components/admin/bolsa/bolsa-movement-dialogs";
import { BolsaPlanCupos } from "@/components/admin/bolsa/bolsa-plan-cupos";
import {
  buildBolsaMovements,
  type BolsaTypeFilter,
  type MovementRow,
} from "@/components/admin/bolsa/bolsa-movement-model";
import { BolsaMovementsTable } from "@/components/admin/bolsa/bolsa-movements-table";
import {
  DistributionDonut,
  EMPTY_AESTHETIC_POOL,
  EMPTY_DERM_POOL,
  UnitPoolCard,
  formatInt,
  formatUnits,
  type UnitPool,
} from "@/components/admin/bolsa/unit-pools";

export default function BolsaUnidadesPage() {
  const [typeFilter, setTypeFilter] = useState<"all" | "aesthetic" | "derm">(
    "all",
  );
  const [analisisDermaPiel360RechargeOpen, setAnalisisDermaPiel360RechargeOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<MovementRow | null>(
    null,
  );
  const analisisPiel360Pool = useAnalisisPiel360Units();
  const analisisdermapiel360 = useAnalisisDermaPiel360Units();

  const dermPool: UnitPool = analisisdermapiel360.data?.pool
    ? {
        id: "derm",
        name: analisisdermapiel360.data.pool.name,
        accent: "derm",
        available: analisisdermapiel360.data.pool.available,
        total: analisisdermapiel360.data.pool.total,
        used: analisisdermapiel360.data.pool.used,
        reserved: analisisdermapiel360.data.pool.reserved,
        expiringSoon: analisisdermapiel360.data.pool.expiringSoon,
        unitLabel: "créditos",
      }
    : EMPTY_DERM_POOL;
  const aestheticPool: UnitPool = analisisPiel360Pool.data?.pool
    ? {
        id: "aesthetic",
        name: analisisPiel360Pool.data.pool.name,
        accent: "aesthetic",
        available: analisisPiel360Pool.data.pool.available,
        total: analisisPiel360Pool.data.pool.total,
        used: analisisPiel360Pool.data.pool.used,
        reserved: analisisPiel360Pool.data.pool.reserved,
        expiringSoon: analisisPiel360Pool.data.pool.expiringSoon,
        unitLabel: "unidades",
      }
    : EMPTY_AESTHETIC_POOL;

  const pools: UnitPool[] = [aestheticPool, dermPool];
  const estimate = analisisPiel360Pool.data?.featureCosts.estimatedPerAnalysis;

  const [movementView, setMovementView] = useState<"all" | "recharges">("all");
  const recharges = useMemo(
    () =>
      buildBolsaMovements(
        analisisPiel360Pool.data?.history,
        analisisdermapiel360.data?.history,
        analisisPiel360Pool.data?.planCupos,
        analisisdermapiel360.data?.planCupos,
        typeFilter,
        movementView === "recharges",
      ),
    [
      analisisPiel360Pool.data?.history,
      analisisdermapiel360.data?.history,
      analisisPiel360Pool.data?.planCupos,
      analisisdermapiel360.data?.planCupos,
      typeFilter,
      movementView,
    ],
  );
  const movementsLoading =
    typeFilter === "all"
      ? analisisPiel360Pool.isLoading || analisisdermapiel360.isLoading
      : typeFilter === "aesthetic"
        ? analisisPiel360Pool.isLoading
        : analisisdermapiel360.isLoading;

  return (
    <div className="min-w-0 space-y-6">
      <PoolCreditsAlert />
      <PrebolsaCreditsCard />

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={analisisPiel360Pool.isFetching}
            onClick={() => void analisisPiel360Pool.refetch()}
          >
            <RefreshCw
              className={cn(
                "size-4",
                analisisPiel360Pool.isFetching && "animate-spin",
              )}
            />
            Actualizar Estético
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={analisisdermapiel360.isFetching}
            onClick={() => void analisisdermapiel360.refetch()}
          >
            <RefreshCw
              className={cn("size-4", analisisdermapiel360.isFetching && "animate-spin")}
            />
            Actualizar Dermatológico
          </Button>
          <Button
            type="button"
            variant={movementView === "recharges" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setMovementView((current) =>
                current === "recharges" ? "all" : "recharges",
              )
            }
          >
            Historial de recargas
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => setAnalisisDermaPiel360RechargeOpen(true)}
          >
            <Plus className="size-4" />
            Recargar Dermatológico
          </Button>
        </div>
      </div>

      {analisisPiel360Pool.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No se pudo consultar el saldo Estético (
          {analisisPiel360Pool.error instanceof Error
            ? analisisPiel360Pool.error.message
            : "error desconocido"}
          ).
        </div>
      ) : null}

      {analisisdermapiel360.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No se pudo consultar la bolsa Dermatológica (
          {analisisdermapiel360.error instanceof Error
            ? analisisdermapiel360.error.message
            : "error desconocido"}
          ).
        </div>
      ) : null}

      {estimate ? (
        <ModuleCard className="p-4">
          <ModuleCardTitle className="text-sm">
            Costo por análisis (Estético)
          </ModuleCardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Fuente:{" "}
            {estimate.source === "api"
              ? "GET /s2s/v2.0/credit/feature-cost"
              : "tarifas documentadas (fallback)"}
            {analisisPiel360Pool.data?.fetchedAt
              ? ` · actualizado ${new Date(analisisPiel360Pool.data.fetchedAt).toLocaleString("es-CO")}`
              : null}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                AI Skin Analysis HD ({estimate.concerns} concerns)
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatUnits(estimate.hdUnits)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  u.
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                AI Fitzpatrick Skin Type
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatUnits(estimate.fitzpatrickUnits)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  u.
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                Combinado (estético + fototipo)
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
                {formatUnits(estimate.combinedUnits)}{" "}
                <span className="text-sm font-medium text-primary/70">
                  u.
                </span>
              </p>
              {aestheticPool.available > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ≈{" "}
                  {formatInt(
                    Math.floor(
                      aestheticPool.available / estimate.combinedUnits,
                    ),
                  )}{" "}
                  análisis combinados restantes
                </p>
              ) : null}
            </div>
          </div>
        </ModuleCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <UnitPoolCard
              pool={aestheticPool}
              live={Boolean(analisisPiel360Pool.data)}
              liveLabel="Estético"
              totalLabel="Saldo + en planes"
              usedLabel="En planes"
              loading={analisisPiel360Pool.isLoading && !analisisPiel360Pool.data}
            />
            <UnitPoolCard
              pool={dermPool}
              live={Boolean(analisisdermapiel360.data)}
              liveLabel="Dermatológico"
              totalLabel="Total compradas"
              usedLabel="En planes"
              loading={analisisdermapiel360.isLoading && !analisisdermapiel360.data}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <ModuleCard className="p-4">
            <ModuleCardTitle className="text-sm">
              Distribución de unidades
            </ModuleCardTitle>
            {analisisPiel360Pool.data || analisisdermapiel360.data ? (
              <div className="mt-4">
                <DistributionDonut pools={pools} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {analisisPiel360Pool.isLoading || analisisdermapiel360.isLoading
                  ? "Cargando saldos…"
                  : "Sin datos de saldo disponibles."}
              </p>
            )}
          </ModuleCard>
        </aside>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <BolsaPlanCupos
          aesthetic={analisisPiel360Pool.data?.planCupos ?? []}
          derm={analisisdermapiel360.data?.planCupos ?? []}
        />
        <BolsaMovementsTable
          rows={recharges}
          loading={movementsLoading}
          pools={pools}
          fallbackPool={aestheticPool}
          onSelect={setSelectedMovement}
          title={
            movementView === "recharges"
              ? "Historial de recargas"
              : "Créditos asignados a planes"
          }
          emptyLabel={
            movementView === "recharges"
              ? "No hay ingresos de créditos para este filtro."
              : "No hay planes con créditos apartados para este filtro."
          }
          toolbar={
            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as BolsaTypeFilter)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Todos los tipos</option>
                <option value="aesthetic">Análisis estéticos / Fitzpatrick</option>
                <option value="derm">Análisis dermatológico</option>
              </select>
              <Button
                type="button"
                variant={typeFilter === "aesthetic" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  setTypeFilter((current) =>
                    current === "aesthetic" ? "all" : "aesthetic",
                  )
                }
              >
                <CalendarDays className="size-4" />
                Historial Estético
              </Button>
            </div>
          }
        />
      </div>

      <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
          <span>
            Estético y Fototipo comparten la misma bolsa; la recarga se hace
            en el portal del proveedor. La bolsa Dermatológica se registra aquí
            con &quot;Recargar Dermatológico&quot;: el saldo es recargas activas
            menos análisis dermatológicos consumidos en la plataforma. Para
            ampliar el plan dermatológico contacta{" "}
            <a
              href="mailto:info@skinive.com"
              className="font-medium underline underline-offset-2"
            >
              info@skinive.com
            </a>
            .
          </span>
        </p>
      </div>

      <AnalisisDermaPiel360RechargeDialog
        open={analisisDermaPiel360RechargeOpen}
        onOpenChange={setAnalisisDermaPiel360RechargeOpen}
      />
      <MovementDetailDialog
        movement={selectedMovement}
        pools={pools}
        open={selectedMovement != null}
        onOpenChange={(next) => {
          if (!next) setSelectedMovement(null);
        }}
      />
    </div>
  );
}
