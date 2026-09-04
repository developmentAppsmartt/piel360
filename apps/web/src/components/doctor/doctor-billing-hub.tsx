"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, Sparkles } from "lucide-react";
import { SubscriptionDetailDialog } from "@/components/payments/subscription-detail-dialog";
import { SubscriptionHistoryTable } from "@/components/payments/subscription-history-table";
import { ModuleCard } from "@/components/ui/module-card";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";
import type { Subscription } from "@/lib/queries/subscriptions";

export function DoctorBillingHub() {
  const doctorProfile = useMyDoctorProfile();
  const isEmpresa = doctorProfile.data ? isEnterpriseDoctor(doctorProfile.data) : false;
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
            Historial de compras y referencias de pago Wompi.
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

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">Historial de compras</h2>
        </div>
        <SubscriptionHistoryTable onSelect={openDetail} />
      </section>

      <ModuleCard className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sobre facturación</p>
        <p className="mt-1">
          Los comprobantes de pago se procesan a través de Wompi. La referencia de transacción
          aparece en cada compra y en su detalle. Si necesitas soporte con un cobro, comparte esa
          referencia al equipo de Piel 360.
        </p>
      </ModuleCard>

      <SubscriptionDetailDialog
        subscription={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showTeamFeatures={isEmpresa}
      />
    </div>
  );
}
