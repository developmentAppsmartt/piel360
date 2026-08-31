"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ShoppingBag, Sparkles } from "lucide-react";
import {
  SubscriptionDetailCard,
  SubscriptionSummaryMetrics,
} from "@/components/payments/subscription-detail-card";
import { SubscriptionDetailDialog } from "@/components/payments/subscription-detail-dialog";
import { SubscriptionHistoryTable } from "@/components/payments/subscription-history-table";
import { ModuleCard } from "@/components/ui/module-card";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

export function DoctorBillingHub() {
  const subscriptions = useMySubscriptions();
  const doctorProfile = useMyDoctorProfile();
  const isEmpresa = doctorProfile.data ? isEnterpriseDoctor(doctorProfile.data) : false;
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const sorted = useMemo(() => {
    const rows = subscriptions.data ?? [];
    const order = { active: 0, pending: 1, cancelled: 2 } as const;
    return [...rows].sort(
      (a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt),
    );
  }, [subscriptions.data]);

  function openDetail(sub: Subscription) {
    setSelected(sub);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Compras y facturación
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Revisa tus suscripciones, el consumo de créditos, el historial de compras y las
            referencias de pago Wompi.
          </p>
        </div>
        <Link
          href="/doctor/planes"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <Sparkles className="size-4" aria-hidden />
          Ver planes
        </Link>
      </div>

      {subscriptions.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando historial…</p>
      ) : (
        <>
          {subscriptions.data && subscriptions.data.length > 0 ? (
            <>
              <SubscriptionSummaryMetrics subscriptions={subscriptions.data} />

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-primary" aria-hidden />
                  <h2 className="text-lg font-semibold text-foreground">Mis suscripciones</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sorted.map((sub) => (
                    <SubscriptionDetailCard
                      key={sub.id}
                      subscription={sub}
                      showTeamFeatures={isEmpresa}
                      onViewDetail={() => openDetail(sub)}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <ModuleCard className="border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Aún no tienes compras registradas. Contrata un plan en{" "}
              <Link href="/doctor/planes" className="font-medium text-primary hover:underline">
                Planes y suscripciones
              </Link>
              .
            </ModuleCard>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-foreground">Historial de compras</h2>
            </div>
            <SubscriptionHistoryTable onSelect={openDetail} />
          </section>

          <ModuleCard className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sobre facturación</p>
            <p className="mt-1">
              Los comprobantes de pago se procesan a través de Wompi. La referencia de transacción
              aparece en cada fila del historial y en el detalle de cada suscripción. Si necesitas
              soporte con un cobro, comparte esa referencia al equipo de Piel 360.
            </p>
          </ModuleCard>
        </>
      )}

      <SubscriptionDetailDialog
        subscription={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showTeamFeatures={isEmpresa}
      />
    </div>
  );
}
