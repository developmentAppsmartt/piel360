"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import { PatientAnalysesTable } from "@/components/patients/patient-analyses-table";
import { PatientProfileShell } from "@/components/patients/patient-profile-shell";
import { ANALYSIS_PROVIDER_STATIC_LABELS } from "@/lib/analysis-provider-label";
import { ApiError } from "@/lib/api-error";
import { usePatient, usePatientAnalyses } from "@/lib/queries/patients";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import {
  PROVIDER_PUBLIC_ALIASES,
  providerSlugMatches,
} from "@piel360/shared";

export default function PacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const analyses = usePatientAnalyses(id);
  const doctorProfile = useMyDoctorProfile();

  const allowedProviders = doctorProfile.data?.allowedProviderSlugs ?? [
    PROVIDER_PUBLIC_ALIASES.skiniver,
    PROVIDER_PUBLIC_ALIASES.youcam,
    "fitzpatrick",
  ];
  const allows = (slug: string) => providerSlugMatches(slug, allowedProviders);

  const authError =
    (patient.error instanceof ApiError && patient.error.status === 401) ||
    (analyses.error instanceof ApiError && analyses.error.status === 401);

  useEffect(() => {
    if (authError) router.push("/doctor/login");
  }, [authError, router]);

  if (patient.isLoading) {
    return <p className="text-muted-foreground">Cargando paciente…</p>;
  }
  if (!authError && patient.error) {
    return <p className="text-destructive">No se pudo cargar el paciente.</p>;
  }
  if (!patient.data) return null;

  const p = patient.data;

  return (
    <PatientProfileShell patient={p} panel="doctor">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/doctor/pacientes/${p.id}/editar`} />}
        >
          Editar
        </Button>
        {allows("skiniver") ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/doctor/pacientes/${p.id}/nuevo-analisis`} />}
          >
            {ANALYSIS_PROVIDER_STATIC_LABELS.skiniver}
          </Button>
        ) : null}
        {allows("youcam") ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/doctor/pacientes/${p.id}/nuevo-analisis-analisispiel360`}
              />
            }
          >
            {ANALYSIS_PROVIDER_STATIC_LABELS.youcam}
          </Button>
        ) : null}
        {allows("fitzpatrick") ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/doctor/pacientes/${p.id}/nuevo-analisis-fitzpatrick`}
              />
            }
          >
            {ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick}
          </Button>
        ) : null}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/doctor/pacientes/${p.id}/historial-3d`} />}
        >
          Historial 3D
        </Button>
      </div>

      {analyses.isLoading || (!authError && analyses.error) ? (
        <ModuleCard className="p-4">
          <h2 className="text-base font-semibold">Historial de análisis</h2>
          <p
            className={
              analyses.isLoading
                ? "mt-2 text-sm text-muted-foreground"
                : "mt-2 text-sm text-destructive"
            }
          >
            {analyses.isLoading
              ? "Cargando historial…"
              : "No se pudo cargar el historial."}
          </p>
        </ModuleCard>
      ) : null}

      {analyses.data ? (
        <PatientAnalysesTable
          analyses={analyses.data}
          getRowHref={(a) => `/doctor/pacientes/${id}/analisis/${a.id}`}
        />
      ) : null}
    </PatientProfileShell>
  );
}
