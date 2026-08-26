"use client";

import { useRouter } from "next/navigation";
import { RoutineForm } from "@/components/routines/routine-form";
import { useCreateRoutine } from "@/lib/queries/routines";

export default function NuevaRutinaPage() {
  const router = useRouter();
  const createMutation = useCreateRoutine();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva rutina</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define el nombre y las condiciones. Después de guardar podrás agregarle pasos.
        </p>
      </div>
      <RoutineForm
        submitLabel="Crear rutina"
        onSubmit={async (input) => {
          const routine = await createMutation.mutateAsync(input);
          router.push(`/doctor/rutinas/${routine.id}`);
        }}
      />
    </div>
  );
}
