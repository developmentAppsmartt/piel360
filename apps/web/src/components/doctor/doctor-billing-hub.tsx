"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Receipt, Search, Sparkles, Wallet } from "lucide-react";
import { BUCKET_STYLES, SubscriptionCard } from "@/components/payments/subscription-card";
import { SubscriptionDetailDialog } from "@/components/payments/subscription-detail-dialog";
import {
  formatAdminDate,
  formatCOP,
  subscriptionBucket,
  SUBSCRIPTION_BUCKET_HEADINGS,
  SUBSCRIPTION_BUCKET_LABELS,
  SUBSCRIPTION_BUCKETS,
  type SubscriptionBucket,
} from "@/components/payments/subscription-utils";
import { ModuleCard, ModuleMetric } from "@/components/ui/module-card";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

const BILLING_WINDOW_DAYS = 30;

/** Sin acentos ni mayúsculas, para que el buscador no dependa de cómo se escriba. */
function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function DoctorBillingHub() {
  const doctorProfile = useMyDoctorProfile();
  const isEmpresa = doctorProfile.data ? isEnterpriseDoctor(doctorProfile.data) : false;
  const subscriptions = useMySubscriptions();

  const [selected, setSelected] = useState<Subscription | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bucketFilter, setBucketFilter] = useState<SubscriptionBucket | null>(null);
  const [search, setSearch] = useState("");

  function openDetail(sub: Subscription) {
    setSelected(sub);
    setDetailOpen(true);
  }

  const rows = useMemo(() => subscriptions.data ?? [], [subscriptions.data]);

  // Todo lo que sigue se deriva de `rows` + filtros; nada de estado espejo.
  const { counts, grouped, billingTotal, pendingCount } = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - BILLING_WINDOW_DAYS);

    const withBucket = rows.map((sub) => ({ sub, bucket: subscriptionBucket(sub, now) }));

    const counts: Record<SubscriptionBucket, number> = {
      active: 0,
      consumed: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const { bucket } of withBucket) counts[bucket] += 1;

    // Facturación: solo compras pagadas (ni canceladas ni pendientes) de la ventana.
    const billingTotal = withBucket.reduce((total, { sub, bucket }) => {
      if (bucket === "cancelled" || bucket === "pending") return total;
      const purchasedAt = new Date(sub.createdAt);
      if (Number.isNaN(purchasedAt.getTime()) || purchasedAt < windowStart) return total;
      return total + Number(sub.plan.price);
    }, 0);

    const needle = searchKey(search);
    const visible = withBucket.filter(({ sub, bucket }) => {
      if (bucketFilter && bucket !== bucketFilter) return false;
      if (!needle) return true;
      return searchKey(sub.plan.name).includes(needle);
    });

    const grouped = SUBSCRIPTION_BUCKETS.map((bucket) => ({
      bucket,
      items: visible.filter((row) => row.bucket === bucket).map((row) => row.sub),
    })).filter((group) => group.items.length > 0);

    return { counts, grouped, billingTotal, pendingCount: counts.pending };
  }, [rows, bucketFilter, search]);

  const total = rows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Compras y facturación
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Consulta el estado de tus planes, créditos disponibles y facturación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Última actualización: {formatAdminDate(new Date().toISOString())}
          </p>
          <Link
            href="/doctor/planes"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <Sparkles className="size-4" aria-hidden />
            Ver planes
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUBSCRIPTION_BUCKETS.map((bucket) => {
              const selectedFilter = bucketFilter === bucket;
              return (
                <button
                  key={bucket}
                  type="button"
                  aria-pressed={selectedFilter}
                  onClick={() => setBucketFilter(selectedFilter ? null : bucket)}
                  className="text-left"
                >
                  <ModuleCard
                    className={cn(
                      "h-full transition-colors hover:bg-muted/30",
                      selectedFilter && "border-primary/70 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("size-2 rounded-full", BUCKET_STYLES[bucket].dot)}
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-muted-foreground">
                        Planes {SUBSCRIPTION_BUCKET_LABELS[bucket].toLowerCase()}
                      </p>
                    </div>
                    <ModuleMetric className="mt-3">{counts[bucket]}</ModuleMetric>
                  </ModuleCard>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBucketFilter(null)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  bucketFilter == null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                Todos los planes ({total})
              </button>
              {SUBSCRIPTION_BUCKETS.map((bucket) => (
                <button
                  key={bucket}
                  type="button"
                  onClick={() => setBucketFilter(bucket)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    bucketFilter === bucket
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {SUBSCRIPTION_BUCKET_LABELS[bucket]} ({counts[bucket]})
                </button>
              ))}
            </div>
            <div className="relative min-w-50 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre del plan..."
                aria-label="Buscar por nombre del plan"
                className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
              />
            </div>
          </div>

          {subscriptions.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-33 animate-pulse rounded-2xl border border-border/60 bg-muted/30"
                />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center">
              <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Receipt className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-medium text-foreground">
                Aún no tienes planes adquiridos
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando contrates un plan, aparecerá aquí con sus créditos y su referencia de
                pago.
              </p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-10 text-center text-sm text-muted-foreground">
              Ningún plan coincide con el filtro.
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ bucket, items }) => (
                <section key={bucket} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn("size-2.5 rounded-full", BUCKET_STYLES[bucket].dot)}
                      aria-hidden
                    />
                    <h2 className="text-base font-semibold text-foreground">
                      {SUBSCRIPTION_BUCKET_HEADINGS[bucket]}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {items.length} {items.length === 1 ? "plan" : "planes"}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <ul className="divide-y divide-border/70">
                      {items.map((sub) => (
                        <li key={sub.id}>
                          <SubscriptionCard subscription={sub} onSelect={openDetail} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <ModuleCard>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-4" aria-hidden />
              <p className="text-sm font-medium">Total de facturación</p>
            </div>
            <ModuleMetric className="mt-3 text-2xl">{formatCOP(billingTotal)}</ModuleMetric>
            <p className="mt-1 text-xs text-muted-foreground">
              Compras de los últimos {BILLING_WINDOW_DAYS} días
            </p>
          </ModuleCard>

          <ModuleCard>
            <p className="font-medium text-foreground">
              {pendingCount === 0 ? "Tu cuenta está al día" : "Tienes pagos sin completar"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {pendingCount === 0
                ? "No tienes planes pendientes de pago."
                : `${pendingCount} ${
                    pendingCount === 1 ? "plan quedó pendiente" : "planes quedaron pendientes"
                  } de pago. Puedes retomar la compra desde el catálogo.`}
            </p>
            {pendingCount > 0 ? (
              <Link
                href="/doctor/planes"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Ir a planes
              </Link>
            ) : null}
          </ModuleCard>

          <ModuleCard>
            <div className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" aria-hidden />
              <p className="font-medium text-foreground">Soporte y ayuda</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ¿Necesitas ayuda con un plan o con un cobro?
            </p>
            <Link
              href="/doctor/soporte"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Contactar soporte
            </Link>
          </ModuleCard>

          <ModuleCard className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sobre facturación</p>
            <p className="mt-1">
              Los comprobantes de pago se procesan a través de Wompi. La referencia de
              transacción aparece en cada compra y en su detalle. Si necesitas soporte con un
              cobro, comparte esa referencia al equipo de Piel 360.
            </p>
          </ModuleCard>
        </aside>
      </div>

      <SubscriptionDetailDialog
        subscription={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showTeamFeatures={isEmpresa}
      />
    </div>
  );
}
