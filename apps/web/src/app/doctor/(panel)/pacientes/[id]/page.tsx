"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/ui/module-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientProfileShell } from "@/components/patients/patient-profile-shell";
import {
  ANALYSIS_PROVIDER_STATIC_LABELS,
  analysisProviderLabel,
} from "@/lib/analysis-provider-label";
import { ApiError } from "@/lib/api-error";
import { usePatient, usePatientAnalyses } from "@/lib/queries/patients";
import { useMyDoctorProfile } from "@/lib/queries/doctors";
import type { AnalysisProviderSlug } from "@piel360/shared";

export default function PacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const analyses = usePatientAnalyses(id);
  const doctorProfile = useMyDoctorProfile();

  const allowedProviders = new Set(
    (doctorProfile.data?.allowedProviderSlugs ?? [
      "skiniver",
      "youcam",
      "fitzpatrick",
    ]) as AnalysisProviderSlug[],
  );

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
        {allowedProviders.has("skiniver") ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/doctor/pacientes/${p.id}/nuevo-analisis`} />}
          >
            {ANALYSIS_PROVIDER_STATIC_LABELS.skiniver}
          </Button>
        ) : null}
        {allowedProviders.has("youcam") ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/doctor/pacientes/${p.id}/nuevo-analisis-youcam`} />
            }
          >
            {ANALYSIS_PROVIDER_STATIC_LABELS.youcam}
          </Button>
        ) : null}
        {allowedProviders.has("fitzpatrick") ? (
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

      <ModuleCard className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-4">
          <h2 className="text-base font-semibold">Historial de análisis</h2>
        </div>

        {analyses.isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Cargando historial…</p>
        )}
        {!authError && analyses.error && (
          <p className="p-4 text-sm text-destructive">
            No se pudo cargar el historial.
          </p>
        )}

        {analyses.data && analyses.data.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            Este paciente aún no tiene análisis.
          </p>
        )}

        {analyses.data && analyses.data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold tracking-wide uppercase">
                    Tipo de análisis
                  </TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase">
                    Región
                  </TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase">
                    Diagnóstico
                  </TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase">
                    Estado
                  </TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide uppercase">
                    Fecha
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.data.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() =>
                      router.push(`/doctor/pacientes/${id}/analisis/${a.id}`)
                    }
                  >
                    <TableCell>
                      <Badge variant="outline">{analysisProviderLabel(a)}</Badge>
                    </TableCell>
                    <TableCell>{a.bodyRegion ?? "—"}</TableCell>
                    <TableCell>{a.finalDiagnosis ?? a.aiDiagnosis ?? "—"}</TableCell>
                    <TableCell>
                      {!a.isValid ? (
                        <Badge variant="destructive">Inválido</Badge>
                      ) : a.isConfirmed ? (
                        <Badge>{a.isCorrected ? "Corregido" : "Confirmado"}</Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("es-CO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ModuleCard>
    </PatientProfileShell>
  );
}
