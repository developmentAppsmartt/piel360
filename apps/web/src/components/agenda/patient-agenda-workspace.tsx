"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  ModuleCard,
  ModuleCardDescription,
  ModuleCardTitle,
} from "@/components/ui/module-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClientFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import type { AgendaAppointment } from "@/lib/queries/agenda";
import { cn } from "@/lib/utils";

type DoctorCalendar = {
  doctor: { id: string; firstName: string; lastName: string } | null;
  weeklySlots: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
  blockedDays: { id: string; date: string; reason: string | null }[];
  busySlots: {
    id: string;
    startsAt: string;
    endsAt: string;
    mine: boolean;
    status: string;
  }[];
  message: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  proposed: "Propuesta de tu profesional — responde",
  requested: "Solicitud enviada",
  confirmed: "Confirmada",
  declined: "Rechazada",
  cancelled: "Cancelada",
  completed: "Completada",
};

const STATUS_BADGE: Record<string, string> = {
  proposed: "bg-amber-50 text-amber-800 border-amber-200",
  requested: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  declined: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-sky-50 text-sky-800 border-sky-200",
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function PatientAgendaWorkspace() {
  const qc = useQueryClient();
  const calendar = useQuery({
    queryKey: ["agenda", "patient-calendar"],
    queryFn: () =>
      apiClientFetch<DoctorCalendar>("/agenda/me/doctor-calendar"),
  });
  const mine = useQuery({
    queryKey: ["agenda", "patient-appointments"],
    queryFn: () =>
      apiClientFetch<AgendaAppointment[]>("/agenda/me/appointments"),
  });

  const request = useMutation({
    mutationFn: (body: {
      startsAt: string;
      endsAt: string;
      title?: string;
      notes?: string;
    }) =>
      apiClientFetch<AgendaAppointment>("/agenda/me/appointments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  const update = useMutation({
    mutationFn: (input: {
      id: string;
      status: "confirmed" | "declined" | "cancelled";
    }) =>
      apiClientFetch<AgendaAppointment>(
        `/agenda/me/appointments/${input.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: input.status }),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openAppt, setOpenAppt] = useState<AgendaAppointment | null>(null);

  const blockedSet = useMemo(
    () => new Set((calendar.data?.blockedDays ?? []).map((b) => b.date)),
    [calendar.data?.blockedDays],
  );

  async function submitRequest() {
    if (!startsLocal || !endsLocal) {
      setError("Indica inicio y fin");
      return;
    }
    setError(null);
    try {
      await request.mutateAsync({
        startsAt: new Date(startsLocal).toISOString(),
        endsAt: new Date(endsLocal).toISOString(),
        notes: notes.trim() || undefined,
        title: "Solicitud de cita",
      });
      setStartsLocal("");
      setEndsLocal("");
      setNotes("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo enviar la solicitud",
      );
    }
  }

  const doctor = calendar.data?.doctor;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {doctor
            ? `Horarios de ${doctor.firstName} ${doctor.lastName}. Los días en rojo no están disponibles.`
            : (calendar.data?.message ??
              "Consulta disponibilidad y solicita citas.")}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <ModuleCard>
          <ModuleCardTitle>Disponibilidad</ModuleCardTitle>
          <ModuleCardDescription>
            Franjas semanales y días bloqueados.
          </ModuleCardDescription>
          <div className="mt-3 space-y-2">
            {(calendar.data?.weeklySlots ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tu profesional aún no configuró horarios.
              </p>
            ) : (
              calendar.data!.weeklySlots.map((s) => (
                <p key={s.id} className="text-sm">
                  <span className="font-semibold">
                    {DAY_LABELS[s.dayOfWeek]}
                  </span>
                  : {s.startTime} – {s.endTime}
                </p>
              ))
            )}
          </div>
          {(calendar.data?.blockedDays.length ?? 0) > 0 ? (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-semibold uppercase text-red-700">
                No disponibles
              </p>
              {calendar.data!.blockedDays.map((b) => (
                <p key={b.id} className="rounded-lg bg-red-50 px-2 py-1 text-sm text-red-800">
                  {b.date}
                  {b.reason ? ` — ${b.reason}` : ""}
                </p>
              ))}
            </div>
          ) : null}
        </ModuleCard>

        <ModuleCard>
          <ModuleCardTitle>Solicitar cita</ModuleCardTitle>
          <ModuleCardDescription>
            Elige un horario dentro de la disponibilidad.
          </ModuleCardDescription>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-muted-foreground">
              Inicio
              <input
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            {startsLocal && blockedSet.has(startsLocal.slice(0, 10)) ? (
              <p className="text-xs text-red-700">
                Ese día está marcado como no disponible.
              </p>
            ) : null}
            <label className="block text-xs text-muted-foreground">
              Fin
              <input
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nota (opcional)"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              rows={2}
            />
            <button
              type="button"
              disabled={!doctor || request.isPending}
              onClick={() => void submitRequest()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Enviar solicitud
            </button>
          </div>
        </ModuleCard>
      </div>

      <ModuleCard>
        <ModuleCardTitle>Mis citas</ModuleCardTitle>
        <ModuleCardDescription>
          Toca una cita para abrirla y cambiar el estado.
        </ModuleCardDescription>
        <div className="mt-3 space-y-2">
          {(mine.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tienes citas.</p>
          ) : (
            mine.data!.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpenAppt(a)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-muted/50"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {STATUS_LABEL[a.status] ?? a.status}
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_BADGE[a.status] ??
                          "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {a.status}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.startsAt).toLocaleString("es-CO")} —{" "}
                    {new Date(a.endsAt).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </ModuleCard>

      <Dialog
        open={!!openAppt}
        onOpenChange={(open) => {
          if (!open) setOpenAppt(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de la cita</DialogTitle>
            <DialogDescription>
              Revisa y actualiza el estado de tu cita.
            </DialogDescription>
          </DialogHeader>
          {openAppt ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-semibold">
                  {STATUS_LABEL[openAppt.status] ?? openAppt.status}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {new Date(openAppt.startsAt).toLocaleString("es-CO", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}{" "}
                  —{" "}
                  {new Date(openAppt.endsAt).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {openAppt.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nota: {openAppt.notes}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {openAppt.status === "proposed" ? (
                  <>
                    <button
                      type="button"
                      disabled={update.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                      onClick={() =>
                        void update
                          .mutateAsync({
                            id: openAppt.id,
                            status: "confirmed",
                          })
                          .then((u) => setOpenAppt(u))
                          .catch((err) =>
                            setError(
                              err instanceof ApiError
                                ? err.message
                                : "No se pudo actualizar",
                            ),
                          )
                      }
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      disabled={update.isPending}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                      onClick={() =>
                        void update
                          .mutateAsync({
                            id: openAppt.id,
                            status: "declined",
                          })
                          .then((u) => setOpenAppt(u))
                          .catch((err) =>
                            setError(
                              err instanceof ApiError
                                ? err.message
                                : "No se pudo actualizar",
                            ),
                          )
                      }
                    >
                      Rechazar
                    </button>
                  </>
                ) : null}
                {["proposed", "requested", "confirmed"].includes(
                  openAppt.status,
                ) ? (
                  <button
                    type="button"
                    disabled={update.isPending}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                    onClick={() =>
                      void update
                        .mutateAsync({
                          id: openAppt.id,
                          status: "cancelled",
                        })
                        .then((u) => setOpenAppt(u))
                        .catch((err) =>
                          setError(
                            err instanceof ApiError
                              ? err.message
                              : "No se pudo actualizar",
                          ),
                        )
                    }
                  >
                    Cancelar cita
                  </button>
                ) : null}
                {["declined", "cancelled", "completed"].includes(
                  openAppt.status,
                ) ? (
                  <p className="text-sm text-muted-foreground">
                    Esta cita ya no admite cambios.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
