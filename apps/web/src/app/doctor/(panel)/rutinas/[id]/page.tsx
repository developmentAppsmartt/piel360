"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoutineForm } from "@/components/routines/routine-form";
import { RoutineStepsEditor } from "@/components/routines/routine-steps-editor";
import { useRoutine, useUpdateRoutine } from "@/lib/queries/routines";

export default function EditarRutinaPage() {
  const { id } = useParams<{ id: string }>();
  const routine = useRoutine(id);
  const updateMutation = useUpdateRoutine(id);

  if (routine.isLoading) return <p className="text-muted-foreground">Cargando rutina...</p>;
  if (!routine.data) return <p className="text-destructive">No se pudo cargar la rutina.</p>;

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
          <h1 className="text-2xl font-semibold">{routine.data.name}</h1>
          <p className="text-sm text-muted-foreground">Editar rutina</p>
        </div>
      </div>

      <RoutineForm
        defaultValues={routine.data}
        submitLabel="Guardar cambios"
        onSubmit={(input) => updateMutation.mutateAsync(input)}
      />

      <div className="border-t border-border pt-6">
        <RoutineStepsEditor routineId={id} steps={routine.data.steps} />
      </div>
    </div>
  );
}
