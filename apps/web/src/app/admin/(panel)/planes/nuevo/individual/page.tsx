"use client";

import { PlanWizardForm } from "@/components/admin/plan-wizard-form";
import { useCreatePlan } from "@/lib/queries/plans";

export default function NuevoPlanIndividualPage() {
  const createPlan = useCreatePlan();

  return (
    <PlanWizardForm
      mode="create"
      planType="individual"
      onSubmit={async (input) => {
        await createPlan.mutateAsync(input);
      }}
    />
  );
}
