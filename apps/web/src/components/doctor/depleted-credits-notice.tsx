"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BatteryLow,
  CalendarClock,
  CalendarX,
  Gauge,
} from "lucide-react";
import type { DepletedPlanInfo } from "@piel360/shared";
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
 * Aviso de planes consumidos (sin créditos o vencidos) mientras la cuenta
 * conserva otro plan vigente. Se muestra una vez por sesión del navegador y
 * por combinación de planes: si se consume otro, vuelve a aparecer.
 */
export function DepletedCreditsNotice({
  userId,
  depletedPlans,
}: {
  userId: string;
  depletedPlans: DepletedPlanInfo[];
}) {
  const ids = depletedPlans
    .map((plan) => plan.subscriptionId)
    .sort()
    .join(",");
  const storageKey = `piel360:depleted-notice:${userId}:${ids}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // sessionStorage no existe en el server: se abre después del mount para
    // no desincronizar la hidratación, que siempre arranca con open=false.
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [storageKey]);

  const names = joinPlanNames(depletedPlans.map((plan) => plan.planName));
  const plural = depletedPlans.length > 1;
  const hasCredits = depletedPlans.some((plan) => plan.reason === "credits");
  const hasExpired = depletedPlans.some((plan) => plan.reason === "expired");
  const copy =
    hasCredits && hasExpired
      ? {
          title: "¡Algunos de sus planes se consumieron!",
          section: "Planes sin créditos o vencidos",
          body: "Algunos planes ya usaron todos sus análisis y otros terminaron su vigencia. Sus demás planes siguen activos; para seguir usando los consumidos, renuévelos o adquiera más créditos.",
          cta: "Ver planes",
        }
      : hasExpired
        ? {
            title: plural ? "¡Sus planes han finalizado!" : "¡Su plan ha finalizado!",
            section: plural ? "Planes vencidos" : "Plan vencido",
            body: "Terminó su vigencia. Sus demás planes siguen activos; los datos asociados se conservarán hasta la fecha indicada. Para seguir usándolo, renuévelo con el botón siguiente.",
            cta: plural ? "Renovar planes" : "Renovar plan",
          }
        : {
            title: plural
              ? "¡Sus planes se quedaron sin créditos!"
              : "¡Su plan se quedó sin créditos!",
            section: plural ? "Planes sin créditos" : "Plan sin créditos",
            body: "Ya utilizó todos los análisis incluidos. Sus pacientes, configuraciones y reportes se conservan; para seguir realizando análisis adquiera más créditos con el botón siguiente.",
            cta: "Adquirir más créditos",
          };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <div className="pointer-events-none absolute -top-16 -left-16 size-44 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 size-44 rounded-full bg-primary/10" />

        <div className="relative space-y-5 px-6 pt-8 pb-6 text-center sm:px-10">
          <div className="flex justify-center">
            <Logo className="h-16" />
          </div>
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gauge className="size-9" aria-hidden />
          </div>

          <DialogTitle className="text-2xl font-bold text-primary sm:text-3xl">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Uno o más planes se quedaron sin créditos o terminaron su vigencia.
          </DialogDescription>

          <div className="space-y-3 text-left text-sm text-foreground/80 sm:text-base">
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
            <p>{copy.body}</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
            <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
              {copy.section}
            </p>
            <ul className="space-y-3">
              {depletedPlans.map((plan) => {
                const expired = plan.reason === "expired";
                const Icon = expired ? CalendarX : BatteryLow;
                return (
                  <li key={plan.subscriptionId} className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-base font-bold text-foreground">
                        <span className="truncate">{plan.planName}</span>
                        <span className="shrink-0 rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          {expired ? "Vencido" : "Sin créditos"}
                        </span>
                      </p>
                      <p className="text-sm text-foreground/70">
                        <strong className="text-amber-800">{plan.remaining}</strong> de{" "}
                        {plan.analysisLimit} análisis{" "}
                        {expired ? "sin usar" : "disponibles"}
                      </p>
                      {plan.endsAt ? (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarClock className="size-3.5" aria-hidden />
                          {expired ? "Venció el" : "Vigente hasta"}{" "}
                          {formatDate(plan.endsAt)}
                        </p>
                      ) : null}
                      {expired && plan.dataDeletionAt ? (
                        <p className="mt-0.5 text-xs font-medium text-destructive">
                          Datos del plan se conservan hasta{" "}
                          {formatDate(plan.dataDeletionAt)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex justify-center">
            <Link
              href="/doctor/planes"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-90"
            >
              {copy.cta}
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
  );
}
