"use client";

import Link from "next/link";
import {
  Apple,
  CheckCircle2,
  Clock3,
  Eye,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import type { Doctor } from "@/lib/queries/doctors";
import type { OrgCompanyProfile } from "@/lib/queries/organizations";
import { cn } from "@/lib/utils";
import {
  registrationChecklist,
  registrationProgressPercent,
} from "./doctor-registration-progress";

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {n}
    </span>
  );
}

/** Espacio reservado para assets (QR, badges de tiendas). */
function AssetPlaceholder({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/80",
        className,
      )}
      title={label}
    />
  );
}

export function DoctorPendingOnboarding({
  profile,
  org,
  showProgressBanner = true,
}: {
  profile: Doctor;
  org?: OrgCompanyProfile | null;
  /** Banner ¡Hola! + progreso: solo para cuentas no verificadas. */
  showProgressBanner?: boolean;
}) {
  const firstName = profile.firstName?.trim() || "Doctor";
  const { percent, completed, total } = registrationProgressPercent(profile, org);
  const checklist = registrationChecklist(profile, org);
  const verificationPending = checklist.find((i) => i.id === "verification")?.pending;
  const allVerified = checklist.every((i) => i.done);

  return (
    <section className="space-y-6">
      {showProgressBanner ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
                ¡Hola,{" "}
                <span className="text-primary">{firstName.toUpperCase()}</span>!
              </h1>
              <p className="mt-1 text-sm text-zinc-600 sm:text-base">
                Completa tu registro para comenzar a usar PIEL360
              </p>
            </div>

            <div className="w-full shrink-0 lg:max-w-md xl:max-w-lg">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">
                  Progreso de registro
                </span>
                <span className="font-semibold text-primary">{percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-chart-2 to-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-zinc-500">
                {completed} de {total} pasos completados
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Paso 1 — Descarga app */}
        <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <StepBadge n={1} />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Descarga la app PIEL360
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Escanea el código QR o descarga desde tu tienda de aplicaciones
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row sm:items-stretch">
            <AssetPlaceholder
              label="Código QR"
              className="size-32 shrink-0 sm:size-36"
            />
            <div className="flex w-full max-w-[180px] flex-col justify-center gap-3">
              <AssetPlaceholder label="App Store" className="h-12 w-full" />
              <AssetPlaceholder label="Google Play" className="h-12 w-full" />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3">
            <p className="text-sm text-zinc-700">
              <span className="font-semibold text-primary">PIEL360</span> está
              disponible para Android e iOS. La app es necesaria para realizar
              análisis de piel.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <Apple className="size-3.5" />
                iOS 13.0 o superior
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-3.5" />
                Android 8.0 o superior
              </span>
            </div>
          </div>
        </article>

        {/* Paso 2 — Registro */}
        <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <StepBadge n={2} />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Termina tu registro solicitado
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Completa tu información profesional y envía los documentos
                requeridos para verificación
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {checklist.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  {item.done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                  ) : item.pending ? (
                    <Clock3 className="size-5 shrink-0 text-amber-500" />
                  ) : (
                    <span className="size-5 shrink-0 rounded-full border-2 border-zinc-300" />
                  )}
                  <span className="text-sm text-zinc-800">{item.label}</span>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    item.done && "text-emerald-600",
                    item.pending && "text-amber-600",
                    !item.done && !item.pending && "text-zinc-400",
                  )}
                >
                  {item.done
                    ? "Completado"
                    : item.pending
                      ? "En revisión"
                      : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>

          {verificationPending ? (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">
                  Tu información está siendo verificada.
                </p>
                <p className="mt-0.5 text-amber-800/90">
                  Una vez aprobada, podrás acceder a todas las funciones de
                  PIEL360.
                </p>
              </div>
            </div>
          ) : allVerified ? (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p>
                Tu cuenta está verificada. Descarga la app y continúa usando
                PIEL360.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
              Completa tu perfil y documentos en{" "}
              <Link
                href="/doctor/configuracion"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Configuración
              </Link>
              .
            </div>
          )}
        </article>

        {/* Paso 3 — Login */}
        <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <StepBadge n={3} />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Inicia sesión en PIEL360
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Una vez autorizado, podrás iniciar sesión en la plataforma con
                tu correo y contraseña
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex justify-center">
              <Logo className="h-12" />
            </div>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Correo electrónico
                </span>
                <div className="flex h-10 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400">
                  tu@correo.com
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Contraseña
                </span>
                <div className="flex h-10 items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400">
                  <span>Ingresa tu contraseña</span>
                  <Eye className="size-4 text-zinc-400" />
                </div>
              </label>
              <p className="text-right text-xs text-primary">
                ¿Olvidaste tu contraseña?
              </p>
              <Button
                type="button"
                className="h-10 w-full"
                disabled
              >
                Iniciar sesión
              </Button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
