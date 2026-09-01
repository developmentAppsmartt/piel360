"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PatientsListHeader,
  PatientsProfessionalFilter,
  PatientsTable,
} from "@/components/patients/patients-table";
import { ApiError } from "@/lib/api-error";
import { useOrganizationTeam } from "@/lib/queries/organizations";
import { usePatients } from "@/lib/queries/patients";

export default function PacientesPage() {
  const router = useRouter();
  const [professionalUserId, setProfessionalUserId] = useState("all");

  const { data: org } = useOrganizationTeam();
  const isOrgOwner = org?.memberRole === "owner";
  const teamMembers = useMemo(
    () => org?.members?.filter((member) => member.memberRole !== "owner") ?? [],
    [org?.members],
  );
  const filterMembers = useMemo(() => org?.members ?? [], [org?.members]);

  const selectedProfessional =
    professionalUserId === "all" ? undefined : professionalUserId;

  const { data, isLoading, error } = usePatients(true, selectedProfessional);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/doctor/login");
    }
  }, [error, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PatientsListHeader
          onNew={() => router.push("/doctor/pacientes/nuevo")}
          description={
            isOrgOwner
              ? "Consulta los pacientes de tu equipo. Cada profesional invitado solo ve los suyos; tú puedes verlos todos y filtrar por persona."
              : undefined
          }
        />
        {isOrgOwner && filterMembers.length > 0 ? (
          <PatientsProfessionalFilter
            members={filterMembers}
            value={professionalUserId}
            onChange={setProfessionalUserId}
          />
        ) : null}
      </div>

      {isOrgOwner && teamMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay profesionales invitados. Los pacientes que registres
          aparecerán aquí; cuando agregues miembros al equipo, también verás los
          suyos.
        </p>
      ) : null}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando pacientes…</p>
      )}
      {error && !(error instanceof ApiError && error.status === 401) && (
        <p className="text-sm text-destructive">
          No se pudieron cargar los pacientes.
        </p>
      )}
      {data ? (
        <PatientsTable
          patients={data}
          panel="doctor"
          showProfessionalColumn={isOrgOwner && professionalUserId === "all"}
        />
      ) : null}
    </div>
  );
}
