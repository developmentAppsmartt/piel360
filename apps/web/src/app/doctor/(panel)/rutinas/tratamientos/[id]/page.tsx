"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { TreatmentItemsEditor } from "@/components/treatments/treatment-items-editor";
import { useTreatment, useUpdateTreatment } from "@/lib/queries/treatments";

export default function EditarTratamientoPage() {
  const { id } = useParams<{ id: string }>();
  const treatment = useTreatment(id);
  const updateMutation = useUpdateTreatment(id);

  if (treatment.isLoading) return <p className="text-muted-foreground">Cargando tratamiento...</p>;
  if (!treatment.data) return <p className="text-destructive">No se pudo cargar el tratamiento.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/doctor/rutinas" />}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{treatment.data.name}</h1>
          <p className="text-sm text-muted-foreground">Editar tratamiento</p>
        </div>
      </div>

      <TreatmentForm
        defaultValues={treatment.data}
        forceCategoryPicker
        submitLabel="Guardar cambios"
        onSubmit={(input) => updateMutation.mutateAsync(input)}
      />

      <div className="border-t border-border pt-6">
        <TreatmentItemsEditor treatment={treatment.data} />
      </div>
    </div>
  );
}
