"use client";

import { PlanWizardForm } from "@/components/admin/plan-wizard-form";
import { useCreatePlan } from "@/lib/queries/plans";

export default function NuevoPlanEmpresasPage() {
  const createPlan = useCreatePlan();

  return (
    <PlanWizardForm
      mode="create"
      planType="business"
      onSubmit={async (input) => {
        await createPlan.mutateAsync(input);
      }}
    />
  );
}
