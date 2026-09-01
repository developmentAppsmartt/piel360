"use client";

import { useMemo, useState } from "react";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ADMIN_PAGE_SIZES,
  AdminSearchInput,
  AdminTableFooter,
  formatAdminDate,
  UserAvatar,
} from "@/components/admin/admin-directory-ui";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { ApiError } from "@/lib/api-error";
import { subscriptionEndsAtDisplay } from "@/components/payments/subscription-utils";
import {
  subscriptionPackageSummary,
  subscriptionProviderLabels,
} from "@/lib/subscription-admin-display";
import {
  useAdminSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
  type SubscriptionAdmin,
} from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | SubscriptionAdmin["status"];

const STATUS_LABELS: Record<SubscriptionAdmin["status"], string> = {
  active: "Activa",
  pending: "Pendiente",
  cancelled: "Cancelada",
};

function SubscriptionStatusBadge({ status }: { status: SubscriptionAdmin["status"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {STATUS_LABELS.active}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        {STATUS_LABELS.pending}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
      {STATUS_LABELS.cancelled}
    </span>
  );
}

function EditDialog({
  subscription,
  onClose,
}: {
  subscription: SubscriptionAdmin;
  onClose: () => void;
}) {
  const update = useUpdateSubscription(subscription.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Editar suscripción — {subscription.user.email}
          </DialogTitle>
        </DialogHeader>
        <SubscriptionForm
          key={subscription.id}
          mode="edit"
          defaultValues={subscription}
          submitLabel="Guardar cambios"
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  subscription,
  onClose,
}: {
  subscription: SubscriptionAdmin;
  onClose: () => void;
}) {
  const remove = useDeleteSubscription();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar suscripción</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esto elimina la suscripción de{" "}
            <strong className="text-foreground">{subscription.user.name}</strong> al plan{" "}
            <strong className="text-foreground">{subscription.plan.name}</strong>, junto con su
            historial de consumo de créditos. Esta acción no se puede deshacer.
          </p>

          {remove.error ? (
            <p className="text-sm text-destructive">
              {remove.error instanceof ApiError
                ? remove.error.message
                : "No se pudo eliminar la suscripción."}
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
                await remove.mutateAsync(subscription.id);
                onClose();
              }}
            >
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionsManager() {
  const subscriptions = useAdminSubscriptions();
  const createSubscription = useCreateSubscription();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SubscriptionAdmin | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionAdmin | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ADMIN_PAGE_SIZES)[number]>(10);

  const stats = useMemo(() => {
    const rows = (subscriptions.data ?? []).filter((s) => s.status !== "pending");
    return {
      total: rows.length,
      active: rows.filter((s) => s.status === "active").length,
      cancelled: rows.filter((s) => s.status === "cancelled").length,
    };
  }, [subscriptions.data]);

  const filtered = useMemo(() => {
    const rows = (subscriptions.data ?? []).filter((s) => s.status !== "pending");
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        row.user.name,
        row.user.email,
        row.user.accountKindLabel,
        row.plan.name,
        subscriptionPackageSummary(row.plan),
        subscriptionProviderLabels(row.plan),
        row.wompiTransactionId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [subscriptions.data, search, statusFilter]);

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Suscripciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gestiona las suscripciones activas de los usuarios a planes de análisis PIEL 360:
            estado, vencimiento y asignación manual.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nueva suscripción
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Activas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{stats.active}</p>
        </ModuleCard>
        <ModuleCard className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Canceladas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">{stats.cancelled}</p>
        </ModuleCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "Todas" },
            { id: "active" as const, label: "Activas" },
            { id: "cancelled" as const, label: "Canceladas" },
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
          <ModuleCardTitle>Lista de suscripciones</ModuleCardTitle>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar por usuario, plan o transacción…"
          />
        </div>

        {subscriptions.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando suscripciones…</p>
        ) : subscriptions.error ? (
          <p className="p-5 text-sm text-destructive">No se pudo cargar la lista de suscripciones.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Finaliza</th>
                    <th className="px-4 py-3 font-semibold">Pago Wompi</th>
                    <th className="px-4 py-3 font-semibold">Creada</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                        No hay suscripciones en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-border/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={row.user.name} />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{row.user.name}</p>
                                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                  {row.user.accountKindLabel}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{row.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-primary">{row.plan.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subscriptionPackageSummary(row.plan)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <SubscriptionStatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {subscriptionEndsAtDisplay(row)}
                        </td>
                        <td className="px-4 py-3">
                          {row.wompiTransactionId ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {row.wompiTransactionId.slice(0, 12)}…
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Manual / sin pago</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatAdminDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                              onClick={() => setEditing(row)}
                              aria-label={`Editar suscripción de ${row.user.name}`}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                              onClick={() => setDeleting(row)}
                              aria-label={`Eliminar suscripción de ${row.user.name}`}
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
          <CreditCard className="size-4" aria-hidden />
        </span>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Suscripciones y créditos de análisis</p>
          <p className="mt-1">
            Cada suscripción activa reserva créditos de la bolsa global según el plan.
            Al cancelar, los créditos no usados vuelven a la bolsa y el usuario deja de
            poder ejecutar análisis. Las compras por Wompi se activan solas al confirmar el pago.
          </p>
        </div>
      </ModuleCard>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva suscripción</DialogTitle>
          </DialogHeader>
          <SubscriptionForm
            mode="create"
            submitLabel="Crear suscripción"
            onSubmit={async (input) => {
              await createSubscription.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing ? <EditDialog subscription={editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? <DeleteDialog subscription={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}
