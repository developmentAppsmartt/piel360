"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Receipt, ShoppingBag } from "lucide-react";
import { PlansBrowser } from "@/components/payments/plans-browser";
import {
  SubscriptionDetailCard,
  SubscriptionSummaryMetrics,
} from "@/components/payments/subscription-detail-card";
import { SubscriptionDetailDialog } from "@/components/payments/subscription-detail-dialog";
import { ModuleCard } from "@/components/ui/module-card";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import type { Subscription } from "@/lib/queries/subscriptions";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

export function DoctorPlansHub() {
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

  const active = sorted.filter((s) => s.status === "active");

  function openDetail(sub: Subscription) {
    setSelected(sub);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Planes y suscripciones
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Contrata planes de análisis IA por especialidad, revisa tus suscripciones activas y el
            consumo de créditos incluidos.
          </p>
        </div>
        <Link
          href="/doctor/facturacion"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <Receipt className="size-4" aria-hidden />
          Compras y facturación
        </Link>
      </div>

      {subscriptions.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando suscripciones…</p>
      ) : subscriptions.data && subscriptions.data.length > 0 ? (
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
          Aún no tienes suscripciones. Elige un plan abajo para empezar a realizar análisis IA.
        </ModuleCard>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Catálogo de planes</h2>
          <p className="text-sm text-muted-foreground">
            {active.length > 0
              ? "Puedes ampliar tu capacidad contratando planes adicionales por tipo de análisis."
              : "Selecciona el tipo de análisis y contrata el plan que mejor se adapte a tu práctica."}
          </p>
        </div>
        <PlansBrowser
          hideActiveSection
          showTeamFeatures={isEmpresa}
          planTypeFilter={
            doctorProfile.isSuccess ? (isEmpresa ? "business" : "individual") : undefined
          }
        />
      </section>

      <SubscriptionDetailDialog
        subscription={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showTeamFeatures={isEmpresa}
      />
    </div>
  );
}
