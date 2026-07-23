"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api-error";
import { usePatient, usePatientAnalyses } from "@/lib/queries/patients";

export default function PacienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const analyses = usePatientAnalyses(id);

  const authError =
    (patient.error instanceof ApiError && patient.error.status === 401) ||
    (analyses.error instanceof ApiError && analyses.error.status === 401);

  useEffect(() => {
    if (authError) router.push("/doctor/login");
  }, [authError, router]);

  if (patient.isLoading) return <p className="text-muted-foreground">Cargando paciente...</p>;
  if (!authError && patient.error) return <p className="text-destructive">No se pudo cargar el paciente.</p>;
  if (!patient.data) return null;

  const p = patient.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {p.firstName} {p.lastName}
          </h1>
          <p className="text-muted-foreground">{p.email ?? "Sin email"}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/doctor/pacientes/${p.id}/editar`} />}
          >
            Editar
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/doctor/pacientes/${p.id}/nuevo-analisis`} />}
          >
            Análisis de piel (Skiniver)
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/doctor/pacientes/${p.id}/nuevo-analisis-youcam`} />}
          >
            Análisis facial (YouCam)
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Teléfono</dt>
          <dd>{p.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Documento</dt>
          <dd>{p.docType ? `${p.docType} ${p.docNumber ?? ""}` : (p.docNumber ?? "—")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Dirección</dt>
          <dd>{p.address ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Paciente desde</dt>
          <dd>{new Date(p.createdAt).toLocaleDateString("es-CO")}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Historial de análisis</h2>

        {analyses.isLoading && <p className="text-muted-foreground">Cargando historial...</p>}
        {!authError && analyses.error && (
          <p className="text-destructive">No se pudo cargar el historial.</p>
        )}

        {analyses.data && analyses.data.length === 0 && (
          <p className="text-muted-foreground">Este paciente aún no tiene análisis.</p>
        )}

        {analyses.data && analyses.data.length > 0 && (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.data.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/doctor/pacientes/${id}/analisis/${a.id}`)}
                  >
                    <TableCell>
                      <Badge variant="outline">{a.youcamTaskId ? "YouCam" : "Skiniver"}</Badge>
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
                    <TableCell>{new Date(a.createdAt).toLocaleDateString("es-CO")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
