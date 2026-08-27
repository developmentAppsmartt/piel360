"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useUpdateDoctorVerification } from "@/lib/queries/doctors";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  verified: "Verificado",
  approved: "Aprobado",
  active: "Activo",
  rejected: "Rechazado",
};

export function DoctorVerificationActions({
  doctorId,
  verificationStatus,
  onDone,
}: {
  doctorId: string;
  verificationStatus: string;
  onDone?: () => void;
}) {
  const verify = useUpdateDoctorVerification(doctorId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pending =
    verificationStatus === "pending" ||
    verificationStatus === "in_review";

  async function decide(status: "active" | "rejected" | "in_review") {
    setError(null);
    setMessage(null);
    try {
      await verify.mutateAsync({ status });
      setMessage(
        status === "active"
          ? "Doctor validado. Ya puede usar el panel completo."
          : status === "rejected"
            ? "Doctor rechazado."
            : "Se solicitaron ajustes.",
      );
      onDone?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el estado.",
      );
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Estado:{" "}
        <span className="font-medium">
          {STATUS_LABELS[verificationStatus] ?? verificationStatus}
        </span>
      </p>
      {pending ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={verify.isPending}
            onClick={() => void decide("active")}
          >
            Validar doctor
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={verify.isPending}
            onClick={() => void decide("in_review")}
          >
            Solicitar ajustes
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={verify.isPending}
            onClick={() => void decide("rejected")}
          >
            Rechazar doctor
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
