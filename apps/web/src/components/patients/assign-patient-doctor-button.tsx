"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import { useDoctors } from "@/lib/queries/doctors";
import {
  useAssignPatientDoctor,
  type Patient,
} from "@/lib/queries/patients";

export function AssignPatientDoctorButton({
  patient,
}: {
  patient: Patient;
}) {
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState(patient.doctorId ?? "");
  const doctors = useDoctors();
  const assign = useAssignPatientDoctor(patient.id);

  const options = useMemo(() => {
    const list = doctors.data ?? [];
    return [...list].sort((a, b) => {
      const an = `${a.firstName} ${a.lastName}`.trim();
      const bn = `${b.firstName} ${b.lastName}`.trim();
      return an.localeCompare(bn, "es");
    });
  }, [doctors.data]);

  function openDialog() {
    setDoctorId(patient.doctorId ?? "");
    setOpen(true);
  }

  async function handleSave() {
    await assign.mutateAsync(doctorId.trim() ? doctorId.trim() : null);
    setOpen(false);
  }

  const currentLabel =
    patient.professionalName?.trim() ||
    (patient.doctorId ? `Doctor #${patient.doctorId}` : "Sin profesional");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-1.5"
        onClick={openDialog}
      >
        <UserPlus className="size-4" />
        Asignar profesional
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar profesional</DialogTitle>
            <DialogDescription>
              Vincula a {patient.firstName} {patient.lastName} con un médico o
              profesional activo. Actual: {currentLabel}.
            </DialogDescription>
          </DialogHeader>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Profesional</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={doctors.isLoading || assign.isPending}
            >
              <option value="">Sin profesional</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {`${d.firstName} ${d.lastName}`.trim() || d.user.email}
                  {d.specialty ? ` · ${d.specialty}` : ""}
                  {d.verificationStatus && d.verificationStatus !== "active"
                    ? ` (${d.verificationStatus})`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          {doctors.error ? (
            <p className="text-sm text-destructive">
              No se pudo cargar el listado de profesionales.
            </p>
          ) : null}
          {assign.error ? (
            <p className="text-sm text-destructive">
              {assign.error instanceof ApiError
                ? assign.error.message
                : "No se pudo guardar la asignación."}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={assign.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={assign.isPending || doctors.isLoading}
            >
              {assign.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
