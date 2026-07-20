"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { useMyPatient, usePatientAnalyses } from "@/lib/queries/patients";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { useMySurvey } from "@/lib/queries/survey";
import { FITZPATRICK_DESCRIPTIONS } from "@/lib/survey-questions";

const PROVIDER_LABELS: Record<string, string> = {
  skiniver: "Skiniver (análisis de piel)",
  youcam: "YouCam (análisis facial)",
};

export default function PatientDashboardPage() {
  const router = useRouter();
  const patient = useMyPatient();
  const survey = useMySurvey();
  const subscriptions = useMySubscriptions();
  const analyses = usePatientAnalyses(patient.data?.id ?? "");

  const authError =
    (patient.error instanceof ApiError && patient.error.status === 401) ||
    (survey.error instanceof ApiError && survey.error.status === 401);

  useEffect(() => {
    if (authError) router.push("/patient/login");
  }, [authError, router]);

  if (patient.isLoading) return <p className="text-muted-foreground">Cargando panel...</p>;
  if (!patient.data) return null;

  const p = patient.data;
  const recentAnalyses = (analyses.data ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Hola, {p.firstName} {p.lastName}
        </h1>
        <p className="text-muted-foreground">Este es el resumen de tu cuenta.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">Mi perfil de piel</h2>
          {survey.isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {survey.data && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Tipo de piel:</span>{" "}
                {survey.data.skinType ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Fototipo:</span>{" "}
                {survey.data.fitzpatrickType ?? "—"}
              </p>
              {survey.data.fitzpatrickType && (
                <p className="text-xs text-muted-foreground">
                  {FITZPATRICK_DESCRIPTIONS[survey.data.fitzpatrickType]}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">Mis suscripciones</h2>
          {subscriptions.isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {subscriptions.data && subscriptions.data.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Aún no tienes un plan activo.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/patient/planes" />}
              >
                Ver planes
              </Button>
            </div>
          )}
          {subscriptions.data && subscriptions.data.length > 0 && (
            <ul className="space-y-2 text-sm">
              {subscriptions.data.map((sub) => (
                <li key={sub.id} className="flex items-center justify-between gap-2">
                  <span>
                    {PROVIDER_LABELS[sub.plan.provider.slug] ?? sub.plan.provider.name} —{" "}
                    {sub.plan.name}
                  </span>
                  <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                    {sub.status === "active" ? "Activo" : sub.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" nativeButton={false} render={<Link href="/patient/auto-analisis" />}>
          Hacer un auto-análisis
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/patient/analisis" />}
        >
          Ver mis análisis
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Análisis recientes</h2>
        {analyses.isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {recentAnalyses.length === 0 && !analyses.isLoading && (
          <p className="text-sm text-muted-foreground">Todavía no tienes análisis registrados.</p>
        )}
        {recentAnalyses.length > 0 && (
          <ul className="space-y-2">
            {recentAnalyses.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{a.youcamTaskId ? "YouCam" : "Skiniver"}</Badge>
                  <span>{a.finalDiagnosis ?? a.aiDiagnosis ?? "Procesando..."}</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
