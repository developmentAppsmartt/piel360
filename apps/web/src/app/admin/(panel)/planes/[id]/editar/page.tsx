"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PlanWizardForm } from "@/components/admin/plan-wizard-form";
import { useAdminPlans, useUpdatePlan } from "@/lib/queries/plans";

export default function EditarPlanPage() {
  const params = useParams<{ id: string }>();
  const plans = useAdminPlans();
  const updatePlan = useUpdatePlan(params.id);
  const plan = plans.data?.find((item) => item.id === params.id);

  if (plans.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando plan…</p>;
  }

  if (!plan) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">No se encontró el plan.</p>
        <Link href="/admin/planes" className="text-sm text-primary underline">
          Volver a planes
        </Link>
      </div>
    );
  }

  return (
    <PlanWizardForm
      mode="edit"
      planType={plan.planType ?? "business"}
      defaultValues={plan}
      onSubmit={async (input) => {
        await updatePlan.mutateAsync(input);
      }}
    />
  );
}
