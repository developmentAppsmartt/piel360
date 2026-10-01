"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Timer, Trash2 } from "lucide-react";
import {
  EXPIRED_PLAN_DATA_RETENTION_DAYS,
  type ExpiredPlanInfo,
} from "@piel360/shared";
import { Logo } from "@/components/layout/logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function joinPlanNames(names: string[]) {
  if (names.length <= 1) return names;
  return names.flatMap((name, index) => {
    if (index === 0) return [name];
    return [index === names.length - 1 ? " y " : ", ", name];
  });
}

/**
 * Aviso al entrar al CRM sin plan vigente. Se muestra una vez por sesión del
 * navegador; el menú restringido queda activo aunque se cierre.
 */
export function NoActivePlanNotice({
  userId,
  expiredPlans,
}: {
  userId: string;
  expiredPlans: ExpiredPlanInfo[];
}) {
  const storageKey = `piel360:no-plan-notice:${userId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
    setOpen(true);
  }, [storageKey]);

  const expired = expiredPlans.length > 0;
  const names = joinPlanNames(expiredPlans.map((plan) => plan.planName));

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {expired ? "Tu suscripción finalizó." : "No tienes un plan activo."} Mientras
          tanto solo puedes usar <strong>Inicio</strong>, <strong>Reportes</strong>,{" "}
          <strong>Planes y suscripciones</strong> y <strong>Soporte</strong>.
        </p>
        <Link
          href="/doctor/planes"
          className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-amber-900 underline underline-offset-2"
        >
          Ver planes
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <div className="pointer-events-none absolute -top-16 -left-16 size-44 rounded-full bg-primary/10" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 size-44 rounded-full bg-primary/10" />

          <div className="relative space-y-5 px-6 pt-8 pb-6 text-center sm:px-10">
            <div className="flex justify-center">
              <Logo className="h-16" />
            </div>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Timer className="size-9" aria-hidden />
            </div>

            <DialogTitle className="text-2xl font-bold text-primary sm:text-3xl">
              {expired ? "¡Su suscripción ha finalizado!" : "No tiene un plan activo"}
            </DialogTitle>

            <DialogDescription className="sr-only">
              Su cuenta no tiene un plan vigente; el menú queda limitado hasta renovar.
            </DialogDescription>
            <div className="space-y-3 text-left text-sm text-foreground/80 sm:text-base">
              {expired ? (
                <>
                  <p>
                    ¡Esperamos que haya disfrutado mucho usando{" "}
                    {names.map((part, index) =>
                      index % 2 === 0 ? (
                        <strong key={index} className="text-primary">
                          {part}
                        </strong>
                      ) : (
                        <span key={index}>{part}</span>
                      ),
                    )}
                    !
                  </p>
                  <p>
                    Su suscripción ha caducado. Guarde todas sus configuraciones y siga
                    usando la plataforma haciendo clic en el botón siguiente para
                    extender su suscripción.
                  </p>
                  <p>
                    Si no realiza ninguna acción, sus datos analíticos se eliminarán
                    después de {EXPIRED_PLAN_DATA_RETENTION_DAYS} días en:
                  </p>
                </>
              ) : (
                <p>
                  Para usar pacientes, agenda, análisis y el resto de módulos necesita
                  un plan vigente. Mientras tanto puede consultar el inicio, sus
                  reportes, los planes disponibles y soporte.
                </p>
              )}
            </div>

            {expired ? (
              <div className="flex items-center gap-4 rounded-2xl bg-primary/5 px-5 py-4 text-left">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Trash2 className="size-7" aria-hidden />
                </span>
                <ol className="space-y-2 border-l border-primary/15 pl-4">
                  {expiredPlans.map((plan, index) => (
                    <li key={plan.planName} className="flex items-center gap-3 text-sm sm:text-base">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span>
                        {plan.planName}:{" "}
                        <strong>{formatDate(plan.dataDeletionAt)}</strong>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="flex justify-center">
              <Link
                href="/doctor/planes"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-90"
              >
                {expired ? "Extender mi suscripción" : "Ver planes"}
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              ¿Necesita ayuda? Por favor{" "}
              <Link
                href="/doctor/soporte"
                onClick={() => setOpen(false)}
                className="text-primary underline"
              >
                contacte con nosotros
              </Link>
              .
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
