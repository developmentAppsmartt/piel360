"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { PlansBrowser } from "@/components/payments/plans-browser";
import { useMyDoctorProfile, isEnterpriseDoctor } from "@/lib/queries/doctors";

export function DoctorPlansHub() {
  const doctorProfile = useMyDoctorProfile();
  const isEmpresa = doctorProfile.data ? isEnterpriseDoctor(doctorProfile.data) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Planes y suscripciones
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Contrata planes de análisis IA por especialidad según el tipo de práctica.
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

      <PlansBrowser
        hideActiveSection
        showTeamFeatures={isEmpresa}
        planTypeFilter={
          doctorProfile.isSuccess ? (isEmpresa ? "business" : "individual") : undefined
        }
      />
    </div>
  );
}
