"use client";

import { useRouter } from "next/navigation";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { useCreateTreatment } from "@/lib/queries/treatments";

export default function NuevoGrupoSugeridoPage() {
  const router = useRouter();
  const createMutation = useCreateTreatment();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo grupo de productos sugeridos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define el nombre y las condiciones. Después de guardar podrás agregarle
          productos.
        </p>
      </div>
      <TreatmentForm
        forceCategoryPicker={false}
        submitLabel="Crear"
        onSubmit={async (input) => {
          const treatment = await createMutation.mutateAsync(input);
          router.push(`/doctor/productos/sugeridos/${treatment.id}`);
        }}
      />
    </div>
  );
}
