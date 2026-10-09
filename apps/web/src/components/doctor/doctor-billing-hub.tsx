"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  Hourglass,
  LifeBuoy,
  Receipt,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BillingHistoryDialog } from "@/components/doctor/billing/billing-history-dialog";
import { BillingPlanDetailDialog } from "@/components/doctor/billing/billing-plan-detail-dialog";
import { BillingPlanRow } from "@/components/doctor/billing/billing-plan-row";
import { BILLING_THEME } from "@/components/doctor/billing/billing-theme";
import {
  formatAdminDate,
  formatCOP,
  subscriptionAmount,
  subscriptionBucket,
  subscriptionEndsAtDate,
  subscriptionPurchaseDate,
  SUBSCRIPTION_BUCKET_HEADINGS,
  SUBSCRIPTION_BUCKET_LABELS,
  SUBSCRIPTION_BUCKETS,
  type SubscriptionBucket,
} from "@/components/payments/subscription-utils";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

const BILLING_WINDOW_DAYS = 30;

type SortKey = "recent" | "endsAt" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Más recientes",
  endsAt: "Vigencia más próxima",
  name: "Nombre del plan",
};

const BUCKET_SUMMARY: Record<
  SubscriptionBucket,
  { title: string; hint: string; icon: LucideIcon }
> = {
  active: { title: "Planes activos", hint: "Con créditos disponibles", icon: CreditCard },
  consumed: { title: "Planes consumidos", hint: "Sin créditos o vencidos", icon: Clock },
  pending: { title: "Planes pendientes", hint: "Pago sin completar", icon: Hourglass },
  cancelled: { title: "Planes cancelados", hint: "No disponibles", icon: CircleAlert },
};

/** Sin acentos ni mayúsculas, para que el buscador no dependa de cómo se escriba. */
function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function sortRows(rows: Subscription[], sort: SortKey): Subscription[] {
  const copy = [...rows];
  if (sort === "name") return copy.sort((a, b) => a.plan.name.localeCompare(b.plan.name, "es"));
  if (sort === "endsAt") {
    const time = (s: Subscription) =>
      subscriptionEndsAtDate(s)?.getTime() ?? Number.POSITIVE_INFINITY;
    return copy.sort((a, b) => time(a) - time(b));
  }
  return copy.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function DoctorBillingHub() {
  const doctorProfile = useMyDoctorProfile();
  const isEmpresa = doctorProfile.data ? isEnterpriseDoctor(doctorProfile.data) : false;
  const customerName = doctorProfile.data
    ? `${doctorProfile.data.firstName} ${doctorProfile.data.lastName}`.trim()
    : null;
  const subscriptions = useMySubscriptions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bucketFilter, setBucketFilter] = useState<SubscriptionBucket | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const rows = useMemo(() => subscriptions.data ?? [], [subscriptions.data]);
  const selected = rows.find((sub) => sub.id === selectedId) ?? null;

  function openDetail(sub: Subscription) {
    setSelectedId(sub.id);
    setDetailOpen(true);
  }

  function openHistory() {
    setDetailOpen(false);
    setHistoryOpen(true);
  }

  // Todo lo que sigue se deriva de `rows` + filtros; nada de estado espejo.
  const { counts, grouped, billingTotal, billingCount } = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - BILLING_WINDOW_DAYS);

    const withBucket = sortRows(rows, sort).map((sub) => ({
      sub,
      bucket: subscriptionBucket(sub, now),
    }));

    const counts: Record<SubscriptionBucket, number> = {
      active: 0,
      consumed: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const { bucket } of withBucket) counts[bucket] += 1;

    // Facturación: solo compras pagadas (ni canceladas ni pendientes) de la ventana.
    let billingTotal = 0;
    let billingCount = 0;
    for (const { sub, bucket } of withBucket) {
      if (bucket === "cancelled" || bucket === "pending") continue;
      const purchasedAt = new Date(subscriptionPurchaseDate(sub));
      if (Number.isNaN(purchasedAt.getTime()) || purchasedAt < windowStart) continue;
      billingTotal += subscriptionAmount(sub);
      billingCount += 1;
    }

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

    return { counts, grouped, billingTotal, billingCount };
  }, [rows, bucketFilter, search, sort]);

  const total = rows.length;
  const pendingCount = counts.pending;

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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_BUCKETS.map((bucket) => {
          const theme = BILLING_THEME[bucket];
          const summary = BUCKET_SUMMARY[bucket];
          const Icon = summary.icon;
          const active = bucketFilter === bucket;
          return (
            <button
              key={bucket}
              type="button"
              aria-pressed={active}
              onClick={() => setBucketFilter(active ? null : bucket)}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-shadow hover:shadow-md",
                theme.card,
                active && "ring-2 ring-primary/40",
              )}
            >
              <span className={cn("flex size-9 items-center justify-center rounded-full", theme.icon)}>
                <Icon className="size-4.5" aria-hidden />
              </span>
              <p className={cn("text-sm font-semibold", theme.text)}>{summary.title}</p>
              <p className="text-3xl font-bold tabular-nums text-foreground">{counts[bucket]}</p>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", theme.dot)} aria-hidden />
                {summary.hint}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex w-full items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-left transition-shadow hover:shadow-md"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Receipt className="size-6" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Total de facturación</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatCOP(billingTotal)}
              </p>
              <p className="text-xs text-muted-foreground">
                Últimos {BILLING_WINDOW_DAYS} días · {billingCount}{" "}
                {billingCount === 1 ? "compra" : "compras"}
              </p>
            </div>
            <span className="hidden items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
              Ver historial
              <ChevronRight className="size-4" aria-hidden />
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-50 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre del plan..."
                aria-label="Buscar por nombre del plan"
                className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
              />
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Ordenar planes"
              className="h-10 rounded-full border border-border bg-card px-4 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBucketFilter(null)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                bucketFilter == null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted/50",
              )}
            >
              Todos los planes
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px]",
                  bucketFilter == null ? "bg-white/25" : "bg-muted",
                )}
              >
                {total}
              </span>
            </button>
            {SUBSCRIPTION_BUCKETS.map((bucket) => {
              const active = bucketFilter === bucket;
              return (
                <button
                  key={bucket}
                  type="button"
                  onClick={() => setBucketFilter(bucket)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted/50",
                  )}
                >
                  <span className={cn("size-2 rounded-full", BILLING_THEME[bucket].dot)} aria-hidden />
                  {SUBSCRIPTION_BUCKET_LABELS[bucket]}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px]",
                      active ? "bg-white/25" : "bg-muted",
                    )}
                  >
                    {counts[bucket]}
                  </span>
                </button>
              );
            })}
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
              {grouped.map(({ bucket, items }) => {
                const theme = BILLING_THEME[bucket];
                return (
                  <section key={bucket} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", theme.dot)} aria-hidden />
                      <h2 className="flex-1 text-base font-semibold text-foreground">
                        {SUBSCRIPTION_BUCKET_HEADINGS[bucket]}
                      </h2>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          theme.pill,
                        )}
                      >
                        {items.length} {items.length === 1 ? "plan" : "planes"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {items.map((sub) => (
                        <BillingPlanRow key={sub.id} subscription={sub} onSelect={openDetail} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
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
          </section>

          <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold text-foreground">¿Necesitas más créditos?</p>
            <p className="text-sm text-muted-foreground">
              Puedes adquirir un nuevo plan o recargar créditos según tu necesidad.
            </p>
            <Link
              href="/doctor/planes"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Comprar créditos
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" aria-hidden />
              <p className="font-medium text-foreground">Soporte y ayuda</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ¿Necesitas ayuda con un plan, un cobro o tu factura?
            </p>
            <Link
              href="/doctor/soporte"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Contactar soporte
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sobre facturación</p>
            <p className="mt-1">
              Los pagos se procesan a través de Wompi. Desde el detalle de cada plan puedes
              descargar el comprobante o solicitar la factura electrónica con la referencia de
              pago.
            </p>
          </section>
        </aside>
      </div>

      <BillingPlanDetailDialog
        subscription={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onOpenHistory={openHistory}
        showTeamFeatures={isEmpresa}
        customerName={customerName}
      />
      <BillingHistoryDialog
        subscriptions={rows}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        customerName={customerName}
      />
    </div>
  );
}
