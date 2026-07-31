"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Lightbulb,
  Stethoscope,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  type Analysis,
  useMyPatient,
  usePatientAnalyses,
} from "@/lib/queries/patients";
import { useMySubscriptions } from "@/lib/queries/subscriptions";
import { cn } from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  skiniver: "Skiniver",
  youcam: "YouCam",
};

function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function formatDoc(docType: string | null, docNumber: string | null): string | null {
  if (!docNumber?.trim()) return null;
  if (docType?.trim()) return `${docType.trim()} ${docNumber.trim()}`;
  return docNumber.trim();
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

type AnalysisTone = "danger" | "warning" | "success" | "muted";

function analysisTone(a: Analysis): AnalysisTone {
  const label = (a.finalDiagnosis ?? a.aiDiagnosis ?? "").trim();
  if (!label) return "muted";
  if (a.isConfirmed && !a.isCorrected) return "success";
  if (a.isCorrected) return "danger";
  if ((a.aiProbability ?? 0) >= 0.7) return "danger";
  if ((a.aiProbability ?? 0) >= 0.4) return "warning";
  return "warning";
}

const TONE_ICON: Record<AnalysisTone, typeof AlertTriangle> = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle2,
  muted: Stethoscope,
};

const TONE_CLASS: Record<AnalysisTone, string> = {
  danger: "text-red-500",
  warning: "text-amber-500",
  success: "text-emerald-600",
  muted: "text-muted-foreground",
};

export default function PatientDashboardPage() {
  const router = useRouter();
  const patient = useMyPatient();
  const subscriptions = useMySubscriptions();
  const analyses = usePatientAnalyses(patient.data?.id ?? "");
  const [consentOpen, setConsentOpen] = useState(false);

  const authError =
    patient.error instanceof ApiError && patient.error.status === 401;

  useEffect(() => {
    if (authError) router.push("/patient/login");
  }, [authError, router]);

  const history = useMemo(() => {
    const list = [...(analyses.data ?? [])];
    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return list;
  }, [analyses.data]);

  if (patient.isLoading) {
    return <p className="text-muted-foreground">Cargando panel...</p>;
  }
  if (!patient.data) return null;

  const p = patient.data;
  const age = ageFromBirthDate(p.birthDate);
  const doc = formatDoc(p.docType, p.docNumber);
  const activeSub = subscriptions.data?.find((s) => s.status === "active");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido a Piel 360 AI
        </h1>
        <p className="text-muted-foreground">
          Tu piel tiene mucho que decir. Escúchala aquí.
        </p>
      </header>

      {/* Perfil */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <Avatar className="size-20 border border-border">
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials(p.firstName, p.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-xl font-semibold">
            {p.firstName} {p.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Última actualización:{" "}
            {new Date(p.updatedAt).toLocaleDateString("es-CO")}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {doc ? <span>{doc}</span> : null}
            {age != null ? <span>Edad: {age} años</span> : null}
            {!doc && age == null ? (
              <span className="text-muted-foreground">
                Completa tu documento y fecha de nacimiento en tu perfil.
              </span>
            ) : null}
          </div>
          {activeSub ? (
            <Badge className="mt-1" variant="secondary">
              Plan: {PROVIDER_LABELS[activeSub.plan.provider.slug] ?? activeSub.plan.name}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          className="shrink-0"
          onClick={() => setConsentOpen(true)}
        >
          Nuevo análisis
        </Button>
      </section>

      {/* Atajos informativos */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/patient/soporte"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/60"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="size-5" />
          </span>
          <span className="flex-1 text-sm font-medium">
            Consejos para el cuidado de la piel
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          href="/patient/historial"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/60"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </span>
          <span className="flex-1 text-sm font-medium">Enfermedades de la piel</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </section>

      {/* Histórico */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Histórico análisis</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href="/patient/soporte" />}
          >
            <CalendarPlus className="size-4" />
            Asignar cita
          </Button>
        </div>

        {analyses.isLoading && (
          <p className="text-sm text-muted-foreground">Cargando análisis...</p>
        )}

        {!analyses.isLoading && history.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Todavía no tienes análisis. Empieza con uno nuevo.
            </p>
            <Button
              type="button"
              className="mt-3"
              onClick={() => setConsentOpen(true)}
            >
              Nuevo análisis
            </Button>
          </div>
        )}

        {history.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {history.map((a) => {
              const tone = analysisTone(a);
              const Icon = TONE_ICON[tone];
              const title =
                a.finalDiagnosis ?? a.aiDiagnosis ?? "Procesando...";
              const thumb = a.coloredS3Url;
              return (
                <li key={a.id}>
                  <Link
                    href={`/patient/analisis/${a.id}`}
                    className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Stethoscope className="size-5" />
                        </div>
                      )}
                    </div>
                    <Icon
                      className={cn("size-5 shrink-0", TONE_CLASS[tone])}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("es-CO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {a.youcamTaskId ? " · Facial" : " · Piel"}
                        {a.isConfirmed ? " · Confirmado" : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!activeSub && !subscriptions.isLoading ? (
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Aún no tienes un plan activo para análisis.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            nativeButton={false}
            render={<Link href="/patient/planes" />}
          >
            Ver planes
          </Button>
        </section>
      ) : null}

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center sm:items-center">
            <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Stethoscope className="size-7" />
            </span>
            <DialogTitle className="text-lg">Consentimiento</DialogTitle>
            <DialogDescription className="text-center">
              Lee por favor antes de realizar el análisis. Se usará una foto de
              tu piel o rostro para generar un diagnóstico asistido por IA. Tu
              médico podrá revisarlo, confirmarlo o corregirlo. No sustituye una
              consulta presencial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setConsentOpen(false);
                router.push("/patient/auto-analisis");
              }}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
