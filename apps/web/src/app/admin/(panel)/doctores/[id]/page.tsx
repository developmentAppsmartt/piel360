"use client";

import { useParams, useRouter } from "next/navigation";
import { DoctorForm } from "@/components/admin/doctor-form";
import { useDoctor, useUpdateDoctor } from "@/lib/queries/doctors";

export default function EditarDoctorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const doctor = useDoctor(id);
  const updateDoctor = useUpdateDoctor(id);

  if (doctor.isLoading) return <p className="text-muted-foreground">Cargando doctor...</p>;
  if (!doctor.data) return <p className="text-destructive">No se pudo cargar el doctor.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {doctor.data.firstName} {doctor.data.lastName}
        </h1>
        <p className="text-muted-foreground">{doctor.data.user.email}</p>
      </div>
      <DoctorForm
        defaultValues={doctor.data}
        submitLabel="Guardar cambios"
        onSubmit={async (input) => {
          await updateDoctor.mutateAsync(input);
          router.push("/admin/doctores");
        }}
      />
    </div>
  );
}
