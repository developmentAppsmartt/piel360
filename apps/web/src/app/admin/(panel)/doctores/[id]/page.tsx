"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DoctorForm } from "@/components/admin/doctor-form";
import { DoctorVerificationActions } from "@/components/admin/doctor-verification-actions";
import { useDoctor, useUpdateDoctor } from "@/lib/queries/doctors";

export default function EditarDoctorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const doctor = useDoctor(id);
  const updateDoctor = useUpdateDoctor(id);

  if (doctor.isLoading)
    return <p className="text-muted-foreground">Cargando doctor...</p>;
  if (!doctor.data)
    return <p className="text-destructive">No se pudo cargar el doctor.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {doctor.data.firstName} {doctor.data.lastName}
          </h1>
          <p className="text-muted-foreground">{doctor.data.user.email}</p>
          <Link
            href={`/admin/verificacion/${id}`}
            className="mt-1 inline-block text-sm text-sky-700 underline"
          >
            Ver ficha de verificación
          </Link>
        </div>
        <DoctorVerificationActions
          doctorId={id}
          verificationStatus={doctor.data.verificationStatus}
        />
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
