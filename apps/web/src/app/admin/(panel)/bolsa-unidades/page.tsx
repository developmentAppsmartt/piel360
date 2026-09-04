"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  Filter,
  Info,
  MoreVertical,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { UnitRing } from "@/components/admin/unit-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ModuleCard,
  ModuleCardTitle,
  ModuleMetric,
} from "@/components/ui/module-card";
import {
  usePerfectCorpUnits,
  useSkiniverUnits,
  useCreateSkiniverRecharge,
} from "@/lib/queries/admin-bolsa-units";
import { PoolCreditsAlert } from "@/components/admin/pool-credits-alert";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type UnitPool = {
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

const EMPTY_AESTHETIC_POOL: UnitPool = {
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

const EMPTY_DERM_POOL: UnitPool = {
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

function formatInt(n: number) {
  return Math.round(n).toLocaleString("es-CO");
}

function formatUnits(n: number) {
  return n.toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });
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

function UnitPoolCard({
  pool,
  live,
  liveLabel,
  loading,
}: {
  pool: UnitPool;
  live?: boolean;
  liveLabel?: string;
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
            {live ? "Saldo + uso reciente" : "Total compradas"}
          </p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {formatUnits(pool.total)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {live ? "Consumidas (historial)" : "Consumidas"}
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

function DistributionDonut({ pools }: { pools: UnitPool[] }) {
  const slices = useMemo(() => {
    const total = pools.reduce((sum, p) => sum + p.available, 0);
    return pools.map((p) => ({
      id: p.id,
      label: p.name,
      value: p.available,
      percent: total > 0 ? (p.available / total) * 100 : 0,
      accent: p.accent,
    }));
  }, [pools]);
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
            const len = total > 0 ? (slice.value / total) * c : 0;
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
            {formatUnits(total)}
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
                {formatUnits(slice.value)} unidades
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function historyActionLabel(action: string) {
  const map: Record<string, string> = {
    subscription_credits: "Recarga suscripción",
    permanent_credits: "Créditos permanentes",
    renew: "Renovación",
    expire: "Vencimiento",
    sign_up_gift: "Regalo registro",
    subscriber_gift: "Regalo suscriptor",
    compensation_from_customer_service: "Compensación",
    subscription_return: "Cancelación de suscripción",
    subscription_reserve: "Activación de suscripción",
  };
  return map[action] ?? action.replaceAll("_", " ");
}

function skiniverMovementStatus(kind: string | undefined, quantity: number) {
  if (kind === "subscription_return") return "Devolución" as const;
  if (kind === "subscription_reserve") return "Activación" as const;
  if (quantity < 0) return "Consumo" as const;
  return "Activa" as const;
}

function perfectCorpMovementStatus(action: string, delta: number) {
  if (action === "subscription_return") return "Devolución" as const;
  if (action === "subscription_reserve") return "Activación" as const;
  if (delta < 0) return "Consumo" as const;
  return "Activa" as const;
}

function SkiniverRechargeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recharge = useCreateSkiniverRecharge();

  const reset = () => {
    setQuantity("");
    setExpiresAt("");
    setNote("");
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recargar créditos Skiniver</DialogTitle>
          <DialogDescription>
            Registra una compra o renovación de créditos dermatológicos. El
            saldo disponible se calcula como recargas activas menos análisis
            realizados en la plataforma.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const parsed = Number(quantity.replace(/\./g, "").replace(",", "."));
            if (!Number.isFinite(parsed) || parsed < 1) {
              setError("Ingresa una cantidad válida (mínimo 1).");
              return;
            }
            void recharge
              .mutateAsync({
                quantity: Math.round(parsed),
                expiresAt: expiresAt.trim() || undefined,
                note: note.trim() || undefined,
              })
              .then(() => {
                reset();
                onOpenChange(false);
              })
              .catch((err) => {
                setError(
                  err instanceof ApiError
                    ? err.message
                    : "No se pudo registrar la recarga.",
                );
              });
          }}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="skiniver-quantity"
              className="text-sm font-medium"
            >
              Cantidad de créditos
            </label>
            <input
              id="skiniver-quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 3000"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="skiniver-expires" className="text-sm font-medium">
              Vencimiento (opcional)
            </label>
            <input
              id="skiniver-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="skiniver-note" className="text-sm font-medium">
              Nota / referencia (opcional)
            </label>
            <textarea
              id="skiniver-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Factura, orden de compra, contacto Skiniver…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recharge.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={recharge.isPending}>
              {recharge.isPending ? "Registrando…" : "Registrar recarga"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BolsaUnidadesPage() {
  const [typeFilter, setTypeFilter] = useState<"all" | "aesthetic" | "derm">(
    "all",
  );
  const [skiniverRechargeOpen, setSkiniverRechargeOpen] = useState(false);
  const perfectCorp = usePerfectCorpUnits();
  const skiniver = useSkiniverUnits();

  const dermPool: UnitPool = skiniver.data?.pool
    ? {
        id: "derm",
        name: skiniver.data.pool.name,
        accent: "derm",
        available: skiniver.data.pool.available,
        total: skiniver.data.pool.total,
        used: skiniver.data.pool.used,
        reserved: skiniver.data.pool.reserved,
        expiringSoon: skiniver.data.pool.expiringSoon,
        unitLabel: "créditos",
      }
    : EMPTY_DERM_POOL;
  const aestheticPool: UnitPool = perfectCorp.data?.pool
    ? {
        id: "aesthetic",
        name: perfectCorp.data.pool.name,
        accent: "aesthetic",
        available: perfectCorp.data.pool.available,
        total: perfectCorp.data.pool.total,
        used: perfectCorp.data.pool.used,
        reserved: perfectCorp.data.pool.reserved,
        expiringSoon: perfectCorp.data.pool.expiringSoon,
        unitLabel: "unidades",
      }
    : EMPTY_AESTHETIC_POOL;

  const pools: UnitPool[] = [aestheticPool, dermPool];
  const estimate = perfectCorp.data?.featureCosts.estimatedPerAnalysis;

  const recharges = useMemo(() => {
    const liveHistory = perfectCorp.data?.history ?? [];
    const liveRows = liveHistory
      .filter((h) => h.delta !== 0)
      .map((h) => ({
        id: `pc-${h.id}`,
        unitType: "aesthetic" as const,
        unitLabel: "Análisis estéticos / Fitzpatrick",
        rechargedAt: h.timestamp
          ? new Date(h.timestamp).toLocaleString("es-CO")
          : "—",
        sortAt: h.timestamp ? new Date(h.timestamp).getTime() : 0,
        quantity: Math.abs(h.delta),
        expiresAt: "—",
        addedBy: h.note?.trim()
          ? `${historyActionLabel(h.action)} · ${h.note.trim()}`
          : historyActionLabel(h.action),
        status: perfectCorpMovementStatus(h.action, h.delta),
        delta: h.delta,
      }));

    const skiniverRows = (skiniver.data?.history ?? []).map((h) => ({
      id: `sv-${h.id}`,
      unitType: "derm" as const,
      unitLabel: "Análisis dermatológico",
      rechargedAt: new Date(h.createdAt).toLocaleString("es-CO"),
      sortAt: new Date(h.createdAt).getTime(),
      quantity: Math.abs(h.quantity),
      expiresAt: h.expiresAt
        ? new Date(h.expiresAt).toLocaleDateString("es-CO")
        : "—",
      addedBy: h.note?.trim()
        ? `${h.addedBy} · ${h.note.trim()}`
        : h.addedBy,
      status: skiniverMovementStatus(h.kind, h.quantity),
      delta: h.quantity,
    }));

    const all = [...liveRows, ...skiniverRows].sort(
      (a, b) => b.sortAt - a.sortAt,
    );
    if (typeFilter === "all") return all;
    return all.filter((r) => r.unitType === typeFilter);
  }, [perfectCorp.data?.history, skiniver.data?.history, typeFilter]);

  const movementsLoading =
    typeFilter === "all"
      ? perfectCorp.isLoading || skiniver.isLoading
      : typeFilter === "aesthetic"
        ? perfectCorp.isLoading
        : skiniver.isLoading;

  return (
    <div className="space-y-6">
      <PoolCreditsAlert />

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
            disabled={perfectCorp.isFetching}
            onClick={() => void perfectCorp.refetch()}
          >
            <RefreshCw
              className={cn(
                "size-4",
                perfectCorp.isFetching && "animate-spin",
              )}
            />
            Actualizar Perfect Corp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={skiniver.isFetching}
            onClick={() => void skiniver.refetch()}
          >
            <RefreshCw
              className={cn("size-4", skiniver.isFetching && "animate-spin")}
            />
            Actualizar Skiniver
          </Button>
          <Button type="button" variant="outline" size="sm">
            Historial de recargas
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => setSkiniverRechargeOpen(true)}
          >
            <Plus className="size-4" />
            Recargar Skiniver
          </Button>
          <a
            href="https://yce.perfectcorp.com/ai-api/api-pricing"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/80",
            )}
          >
            <Plus className="size-4" />
            Recargar en Perfect Corp
          </a>
        </div>
      </div>

      {perfectCorp.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No se pudo consultar el saldo Perfect Corp (
          {perfectCorp.error instanceof Error
            ? perfectCorp.error.message
            : "error desconocido"}
          ).
        </div>
      ) : null}

      {skiniver.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No se pudo consultar la bolsa Skiniver (
          {skiniver.error instanceof Error
            ? skiniver.error.message
            : "error desconocido"}
          ).
        </div>
      ) : null}

      {estimate ? (
        <ModuleCard className="p-4">
          <ModuleCardTitle className="text-sm">
            Costo por análisis (Perfect Corp)
          </ModuleCardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Fuente:{" "}
            {estimate.source === "api"
              ? "GET /s2s/v2.0/credit/feature-cost"
              : "tarifas documentadas (fallback)"}
            {perfectCorp.data?.fetchedAt
              ? ` · actualizado ${new Date(perfectCorp.data.fetchedAt).toLocaleString("es-CO")}`
              : null}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                AI Skin Analysis HD ({estimate.youcamConcerns} concerns)
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatUnits(estimate.youcamHdUnits)}{" "}
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

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <UnitPoolCard
              pool={aestheticPool}
              live={Boolean(perfectCorp.data)}
              liveLabel="Perfect Corp"
              loading={perfectCorp.isLoading && !perfectCorp.data}
            />
            <UnitPoolCard
              pool={dermPool}
              live={Boolean(skiniver.data)}
              liveLabel="Skiniver"
              loading={skiniver.isLoading && !skiniver.data}
            />
          </div>

          <ModuleCard className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <ModuleCardTitle className="text-base">
                Movimientos de unidades
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
                  Historial Perfect Corp
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
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Cantidad</th>
                    <th className="px-4 py-3 font-semibold">
                      Fecha de vencimiento
                    </th>
                    <th className="px-4 py-3 font-semibold">Origen / acción</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {movementsLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Cargando movimientos…
                      </td>
                    </tr>
                  ) : recharges.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No hay movimientos registrados para este filtro.
                      </td>
                    </tr>
                  ) : (
                    recharges.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <PoolIcon
                            pool={
                              pools.find((p) => p.id === row.unitType) ??
                              aestheticPool
                            }
                          />
                          <span className="font-medium">{row.unitLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.rechargedAt}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-medium tabular-nums",
                          "delta" in row && row.delta < 0
                            ? "text-destructive"
                            : null,
                        )}
                      >
                        {"delta" in row && row.delta < 0 ? "−" : "+"}
                        {formatUnits(row.quantity)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.expiresAt}
                      </td>
                      <td className="px-4 py-3">{row.addedBy}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn(
                            row.status === "Consumo" || row.status === "Activación"
                              ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                              : row.status === "Devolución"
                                ? "bg-sky-100 text-sky-900 hover:bg-sky-100"
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                          )}
                        >
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Mostrando {recharges.length} movimiento
              {recharges.length === 1 ? "" : "s"}
            </div>
          </ModuleCard>
        </div>

        <aside className="space-y-4">
          <ModuleCard className="overflow-hidden p-4">
            <ModuleCardTitle className="text-sm">
              Distribución de unidades
            </ModuleCardTitle>
            {perfectCorp.data || skiniver.data ? (
              <div className="mt-4">
                <DistributionDonut pools={pools} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {perfectCorp.isLoading || skiniver.isLoading
                  ? "Cargando saldos…"
                  : "Sin datos de saldo disponibles."}
              </p>
            )}
          </ModuleCard>
        </aside>
      </div>

      <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
          <span>
            Estético y Fitzpatrick comparten la bolsa Perfect Corp (
            `GET /s2s/v1.0/client/credit`); la recarga se hace en su portal.
            Dermatológico (Skiniver) se registra aquí con &quot;Recargar
            Skiniver&quot;: el saldo es recargas activas menos análisis
            dermatológicos consumidos en la plataforma. Para ampliar el plan con
            Skiniver contacta{" "}
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

      <SkiniverRechargeDialog
        open={skiniverRechargeOpen}
        onOpenChange={setSkiniverRechargeOpen}
      />
    </div>
  );
}
