"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  ADMIN_PAGE_SIZES,
  AdminSearchInput,
  AdminTableFooter,
  formatAdminDate,
} from "@/components/admin/admin-directory-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { PoolCreditsAlert } from "@/components/admin/pool-credits-alert";
import { useAdminPlans, useDeletePlan, type PlanAdmin } from "@/lib/queries/plans";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

function formatCOP(price: string | number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function PlanTypeBadge({ planType }: { planType?: string }) {
  const isIndividual = planType === "individual";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isIndividual
          ? "bg-sky-50 text-sky-700"
          : "bg-violet-50 text-violet-700",
      )}
    >
      {isIndividual ? "Individual" : "Empresas"}
    </span>
  );
}

function PlanStatusBadge({
  active,
  poolPurchasable,
}: {
  active: boolean;
  poolPurchasable?: boolean;
}) {
  if (active && poolPurchasable === false) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        Sin créditos en bolsa
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      Inactivo
    </span>
  );
}

function PlanAvatar({ slug }: { slug: string }) {
  const styles: Record<string, string> = {
    skiniver: "bg-violet-100 text-violet-700",
    youcam: "bg-fuchsia-100 text-fuchsia-700",
    fitzpatrick: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        styles[slug] ?? "bg-primary/10 text-primary",
      )}
    >
      <Layers className="size-4" aria-hidden />
    </span>
  );
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "No se pudo cargar la lista de planes.";
}

function planProviderSlugs(plan: PlanAdmin): string[] {
  if (plan.providers?.length) return plan.providers.map((p) => p.slug);
  return [plan.provider.slug];
}

function providerLabelsForPlan(plan: PlanAdmin): string {
  const slugs = planProviderSlugs(plan);
  return slugs
    .map((slug) => {
      const key = slug as keyof typeof ANALYSIS_PROVIDER_STATIC_LABELS;
      return ANALYSIS_PROVIDER_STATIC_LABELS[key] ?? plan.provider.name;
    })
    .join(" · ");
}

function DeletePlanDialog({
  plan,
  onClose,
}: {
  plan: PlanAdmin;
  onClose: () => void;
}) {
  const remove = useDeletePlan();
  const count = plan._count.subscriptions;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {plan.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {count > 0 ? (
              <>
                Este plan tiene <strong className="text-foreground">{count}</strong> suscripción
                {count === 1 ? "" : "es"} asociada{count === 1 ? "" : "s"}. Eliminarlo{" "}
                <strong className="text-foreground">
                  borrará también esas suscripciones y su historial de uso
                </strong>{" "}
                — esta acción no se puede deshacer.
              </>
            ) : (
              "Este plan no tiene suscripciones asociadas. Esta acción no se puede deshacer."
            )}
          </p>

          {remove.error ? (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError ? remove.error.message : "No se pudo eliminar el plan."}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={remove.isPending}
              onClick={async () => {
                await remove.mutateAsync(plan.id);
                onClose();
              }}
            >
              {remove.isPending ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PlansManager() {
  const router = useRouter();
  const plans = useAdminPlans();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ADMIN_PAGE_SIZES)[number]>(10);
  const [deleting, setDeleting] = useState<PlanAdmin | null>(null);

  const stats = useMemo(() => {
    const rows = plans.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((p) => p.isActive).length,
      inactive: rows.filter((p) => !p.isActive).length,
      poolBlocked: rows.filter((p) => p.isActive && p.poolPurchasable === false).length,
      subscriptions: rows.reduce((sum, p) => sum + (p._count?.subscriptions ?? 0), 0),
    };
  }, [plans.data]);

  const filtered = useMemo(() => {
    const rows = plans.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "active" && !row.isActive) return false;
      if (statusFilter === "inactive" && row.isActive) return false;
      if (!q) return true;
      const haystack = [
        row.name,
        row.provider.name,
        row.provider.slug,
        ...(row.providers?.map((p) => p.slug) ?? []),
        row.description,
        providerLabelsForPlan(row),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [plans.data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Planes</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Crea y administra los planes de suscripción: límites de análisis IA, precio,
            duración y usuarios permitidos por plan.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/planes/nuevo" />}>
          <Plus className="size-4" />
          Nuevo plan
        </Button>
      </div>

      <PoolCreditsAlert />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total planes</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Activos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{stats.active}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Inactivos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">{stats.inactive}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Sin bolsa</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">{stats.poolBlocked}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Suscripciones</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{stats.subscriptions}</p>
        </ModuleCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "Todos" },
            { id: "active" as const, label: "Activos" },
            { id: "inactive" as const, label: "Inactivos" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setStatusFilter(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <ModuleCardTitle>Lista de planes</ModuleCardTitle>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o proveedor…"
          />
        </div>

        {plans.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando planes…</p>
        ) : plans.error ? (
          <div className="space-y-2 p-5">
            <p className="text-sm text-destructive">{apiErrorMessage(plans.error)}</p>
            <p className="text-xs text-muted-foreground">
              Si el error persiste tras actualizar la API, ejecuta en{" "}
              <code className="rounded bg-muted px-1">apps/api</code>:{" "}
              <code className="rounded bg-muted px-1">npx prisma migrate deploy</code>
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Proveedor IA</th>
                    <th className="px-4 py-3 font-semibold">Análisis / mes</th>
                    <th className="px-4 py-3 font-semibold">Usuarios</th>
                    <th className="px-4 py-3 font-semibold">Precio</th>
                    <th className="px-4 py-3 font-semibold">Duración</th>
                    <th className="px-4 py-3 font-semibold">Suscripciones</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                        No hay planes en esta categoría.{" "}
                        <Link href="/admin/planes/nuevo" className="text-primary underline">
                          Crear el primero
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-border/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <PlanAvatar slug={row.provider?.slug ?? ""} />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{row.name}</p>
                                <PlanTypeBadge planType={row.planType} />
                              </div>
                              {row.description ? (
                                <p className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                                  {row.description}
                                </p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">
                                Creado {formatAdminDate(row.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-primary">
                            {providerLabelsForPlan(row)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {planProviderSlugs(row).length > 1
                              ? `Paquete · ${planProviderSlugs(row).length} análisis`
                              : row.provider.name}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                          {(row.analysisLimit ?? 0).toLocaleString("es-CO")}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {row.maxUsers ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatCOP(row.price)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.durationDays} días
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {row._count?.subscriptions ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <PlanStatusBadge
                            active={row.isActive}
                            poolPurchasable={row.poolPurchasable}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                              onClick={() => router.push(`/admin/planes/${row.id}/editar`)}
                              aria-label={`Editar ${row.name}`}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                              onClick={() => setDeleting(row)}
                              aria-label={`Eliminar ${row.name}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 ? (
              <AdminTableFooter
                showingFrom={showingFrom}
                showingTo={showingTo}
                total={filtered.length}
                page={currentPage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            ) : null}
          </>
        )}
      </ModuleCard>

      <ModuleCard className="flex items-start gap-3 bg-muted/20 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Planes y análisis PIEL 360</p>
          <p className="mt-1">
            Cada plan está ligado a un proveedor de análisis (Dermatológico, Estético o
            Fototipo). Define límites mensuales, precio en COP y cuántos usuarios puede
            tener la cuenta suscrita.
          </p>
        </div>
      </ModuleCard>

      {deleting ? <DeletePlanDialog plan={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}
