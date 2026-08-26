"use client";

import { PendingDoctorsTable } from "@/components/admin/pending-doctors-table";
import { usePendingVerificationDoctors } from "@/lib/queries/doctors";

export default function VerificacionPage() {
  const query = usePendingVerificationDoctors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verificación de doctores</h1>
        <p className="text-sm text-muted-foreground">
          Revisa el perfil y documentos de cada médico pendiente.
        </p>
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar la cola de verificación.
        </p>
      ) : (
        <PendingDoctorsTable doctors={query.data ?? []} />
      )}
    </div>
  );
}
