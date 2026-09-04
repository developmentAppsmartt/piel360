"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
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
import { ApiError } from "@/lib/api-error";
import {
  useAgendaOverview,
  useCreateBlockedDay,
  useDeleteBlockedDay,
  useProposeAppointment,
  useReplaceWeeklySlots,
  useUpdateDoctorAppointment,
  type AgendaAppointment,
} from "@/lib/queries/agenda";
import { usePatients } from "@/lib/queries/patients";
import { cn } from "@/lib/utils";

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const STATUS_LABEL: Record<string, string> = {
  proposed: "Pendiente",
  requested: "Pendiente (solicitud)",
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

const SLOT_MINUTES = 30;

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthBounds(anchor: Date) {
  const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const to = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  );
  return { from: ymd(from), to: ymd(to) };
}

function daysInMonthGrid(anchor: Date) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const lastDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: { date: string | null; day: number | null }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= lastDate; d++) {
    cells.push({
      date: ymd(new Date(Date.UTC(year, month, d))),
      day: d,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

function parseYmdLocal(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayOfWeekFromYmd(dateStr: string) {
  return parseYmdLocal(dateStr).getDay();
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Genera horas de inicio disponibles según franjas del día. */
function availableStartTimes(
  dateStr: string,
  weeklySlots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[],
  appointments: { startsAt: string; endsAt: string; status: string }[],
): string[] {
  const dow = dayOfWeekFromYmd(dateStr);
  const franjas = weeklySlots.filter(
    (s) => s.isActive && s.dayOfWeek === dow,
  );
  if (franjas.length === 0) return [];

  const busy = appointments.filter(
    (a) =>
      a.startsAt.startsWith(dateStr) &&
      ["proposed", "requested", "confirmed"].includes(a.status),
  );

  const times: string[] = [];
  for (const f of franjas) {
    let cursor = timeToMinutes(f.startTime);
    const end = timeToMinutes(f.endTime);
    while (cursor + SLOT_MINUTES <= end) {
      const startLabel = minutesToTime(cursor);
      const endLabel = minutesToTime(cursor + SLOT_MINUTES);
      const startMs = parseYmdLocal(dateStr);
      startMs.setHours(
        Math.floor(cursor / 60),
        cursor % 60,
        0,
        0,
      );
      const endMs = new Date(startMs.getTime() + SLOT_MINUTES * 60_000);

      const overlaps = busy.some((a) => {
        const aStart = new Date(a.startsAt).getTime();
        const aEnd = new Date(a.endsAt).getTime();
        return startMs.getTime() < aEnd && endMs.getTime() > aStart;
      });

      if (!overlaps) times.push(startLabel);
      void endLabel;
      cursor += SLOT_MINUTES;
    }
  }
  return [...new Set(times)].sort();
}

function localDateTimeIso(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

export function AgendaWorkspace() {
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1));
  });
  const { from, to } = useMemo(() => monthBounds(anchor), [anchor]);
  const overview = useAgendaOverview(from, to);
  const patients = usePatients();
  const replaceSlots = useReplaceWeeklySlots();
  const createBlocked = useCreateBlockedDay();
  const deleteBlocked = useDeleteBlockedDay();
  const propose = useProposeAppointment();
  const updateAppt = useUpdateDoctorAppointment();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openAppt, setOpenAppt] = useState<AgendaAppointment | null>(null);

  const [slotDraft, setSlotDraft] = useState<
    { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]
  >([
    { dayOfWeek: 1, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 1, startTime: "14:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 2, startTime: "14:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 3, startTime: "14:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "13:00", isActive: true },
    { dayOfWeek: 4, startTime: "14:00", endTime: "18:00", isActive: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "13:00", isActive: true },
  ]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  useEffect(() => {
    if (!overview.data || slotsLoaded) return;
    if (overview.data.weeklySlots.length > 0) {
      setSlotDraft(
        overview.data.weeklySlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive,
        })),
      );
    }
    setSlotsLoaded(true);
  }, [overview.data, slotsLoaded]);

  const blockedByDate = useMemo(() => {
    const map = new Map<string, { id: string; reason: string | null }>();
    for (const b of overview.data?.blockedDays ?? []) {
      map.set(b.date, { id: b.id, reason: b.reason });
    }
    return map;
  }, [overview.data?.blockedDays]);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of overview.data?.appointments ?? []) {
      const key = a.startsAt.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [overview.data?.appointments]);

  const [patientId, setPatientId] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [title, setTitle] = useState("Consulta");

  const hourOptions = useMemo(() => {
    if (!selectedDate) return [];
    if (blockedByDate.has(selectedDate)) return [];
    const slots =
      overview.data?.weeklySlots?.length
        ? overview.data.weeklySlots
        : slotDraft;
    return availableStartTimes(
      selectedDate,
      slots,
      overview.data?.appointments ?? [],
    );
  }, [
    selectedDate,
    blockedByDate,
    overview.data?.weeklySlots,
    overview.data?.appointments,
    slotDraft,
  ]);

  useEffect(() => {
    if (appointmentTime && !hourOptions.includes(appointmentTime)) {
      setAppointmentTime("");
    }
  }, [hourOptions, appointmentTime]);

  async function saveSlots() {
    setError(null);
    try {
      await replaceSlots.mutateAsync(slotDraft);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar los horarios",
      );
    }
  }

  async function toggleBlockSelected() {
    if (!selectedDate) return;
    setError(null);
    const existing = blockedByDate.get(selectedDate);
    try {
      if (existing) {
        await deleteBlocked.mutateAsync(existing.id);
      } else {
        const reason = blockReason.trim();
        if (!reason) {
          setError("Indica un motivo para marcar el día como no disponible");
          return;
        }
        await createBlocked.mutateAsync({
          date: selectedDate,
          reason,
        });
        setBlockReason("");
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo actualizar el día",
      );
    }
  }

  async function createAppointment() {
    if (!patientId || !selectedDate || !appointmentTime) {
      setError("Selecciona paciente, día en el calendario y hora disponible");
      return;
    }
    if (blockedByDate.has(selectedDate)) {
      setError("Ese día está marcado como no disponible");
      return;
    }
    setError(null);
    try {
      const startsAt = localDateTimeIso(selectedDate, appointmentTime);
      const [hh, mm] = appointmentTime.split(":").map(Number);
      const endMins = hh * 60 + mm + SLOT_MINUTES;
      const endsAt = localDateTimeIso(selectedDate, minutesToTime(endMins));
      await propose.mutateAsync({
        patientId,
        startsAt,
        endsAt,
        title: title.trim() || "Cita",
      });
      setAppointmentTime("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo crear la cita",
      );
    }
  }

  const monthLabel = anchor.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarDays className="size-6 text-primary" />
          Agenda
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura horarios, marca días no disponibles y asigna citas a tus
          pacientes. Ellos verán las propuestas en su app.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <ModuleCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <ModuleCardTitle>Calendario</ModuleCardTitle>
              <ModuleCardDescription>
                Rojo = no disponible (con motivo). Selecciona el día de la cita
                o para bloquearlo.
              </ModuleCardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() =>
                  setAnchor(
                    new Date(
                      Date.UTC(
                        anchor.getUTCFullYear(),
                        anchor.getUTCMonth() - 1,
                        1,
                      ),
                    ),
                  )
                }
              >
                ←
              </button>
              <span className="min-w-[9rem] text-center text-sm font-semibold capitalize">
                {monthLabel}
              </span>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() =>
                  setAnchor(
                    new Date(
                      Date.UTC(
                        anchor.getUTCFullYear(),
                        anchor.getUTCMonth() + 1,
                        1,
                      ),
                    ),
                  )
                }
              >
                →
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysInMonthGrid(anchor).map((cell, idx) => {
              if (!cell.date) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }
              const blocked = blockedByDate.get(cell.date);
              const count = apptsByDate.get(cell.date) ?? 0;
              const hasAppts = count > 0 && !blocked;
              const selected = selectedDate === cell.date;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.date);
                    setAppointmentTime("");
                    if (blocked?.reason) setBlockReason(blocked.reason);
                    else setBlockReason("");
                  }}
                  className={cn(
                    "aspect-square rounded-xl border text-sm font-semibold transition",
                    blocked
                      ? "border-red-300 bg-red-50 text-red-700"
                      : hasAppts
                        ? "border-blue-300 bg-blue-100 text-blue-700"
                        : "border-border bg-card hover:bg-muted/60",
                    selected && "ring-2 ring-primary",
                  )}
                  title={blocked?.reason ?? undefined}
                >
                  <div>{cell.day}</div>
                  {count > 0 ? (
                    <div
                      className={cn(
                        "text-[10px] font-medium",
                        blocked ? "text-red-700" : "text-blue-700",
                      )}
                    >
                      {count} cita{count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedDate ? (
            <div className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                Día {selectedDate}
                {blockedByDate.has(selectedDate) ? (
                  <span className="ml-2 text-red-700">· No disponible</span>
                ) : (
                  <span className="ml-2 text-primary">
                    · Seleccionado para cita
                  </span>
                )}
              </p>
              <label className="block text-xs font-semibold text-foreground">
                Motivo (días no disponibles)
                <input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej. Vacaciones, congreso, emergencia…"
                  disabled={blockedByDate.has(selectedDate)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal disabled:opacity-70"
                />
              </label>
              {blockedByDate.get(selectedDate)?.reason ? (
                <p className="text-sm text-red-700">
                  Motivo: {blockedByDate.get(selectedDate)?.reason}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void toggleBlockSelected()}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold text-white",
                  blockedByDate.has(selectedDate)
                    ? "bg-primary"
                    : "bg-red-600 hover:bg-red-700",
                )}
              >
                {blockedByDate.has(selectedDate)
                  ? "Marcar como disponible"
                  : "Marcar como no disponible"}
              </button>
            </div>
          ) : null}

          {(overview.data?.blockedDays.length ?? 0) > 0 ? (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Días no disponibles
              </p>
              {overview.data!.blockedDays.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                >
                  <span className="font-semibold">{b.date}</span>
                  {b.reason ? ` — ${b.reason}` : " — Sin motivo"}
                </div>
              ))}
            </div>
          ) : null}
        </ModuleCard>

        <div className="space-y-6">
          <ModuleCard>
            <ModuleCardTitle>Horarios de atención</ModuleCardTitle>
            <ModuleCardDescription>
              Define franjas semanales recurrentes (HH:mm). Las horas de cita se
              generan desde aquí.
            </ModuleCardDescription>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {slotDraft.map((slot, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => {
                      const next = [...slotDraft];
                      next[i] = {
                        ...slot,
                        dayOfWeek: Number(e.target.value),
                      };
                      setSlotDraft(next);
                    }}
                    className="rounded-lg border bg-background px-2 py-1.5"
                  >
                    {DAY_LABELS.map((label, d) => (
                      <option key={label} value={d}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => {
                      const next = [...slotDraft];
                      next[i] = { ...slot, startTime: e.target.value };
                      setSlotDraft(next);
                    }}
                    className="rounded-lg border bg-background px-2 py-1.5"
                  />
                  <span>—</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => {
                      const next = [...slotDraft];
                      next[i] = { ...slot, endTime: e.target.value };
                      setSlotDraft(next);
                    }}
                    className="rounded-lg border bg-background px-2 py-1.5"
                  />
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() =>
                      setSlotDraft(slotDraft.filter((_, j) => j !== i))
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm"
                onClick={() =>
                  setSlotDraft([
                    ...slotDraft,
                    {
                      dayOfWeek: 1,
                      startTime: "09:00",
                      endTime: "12:00",
                      isActive: true,
                    },
                  ])
                }
              >
                + Franja
              </button>
              <button
                type="button"
                onClick={() => void saveSlots()}
                disabled={replaceSlots.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Guardar horarios
              </button>
            </div>
          </ModuleCard>

          <ModuleCard>
            <ModuleCardTitle>Asignar cita</ModuleCardTitle>
            <ModuleCardDescription>
              Elige el día en el calendario y una hora según tus horarios de
              atención.
            </ModuleCardDescription>
            <div className="mt-3 space-y-2">
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona paciente</option>
                {(patients.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-xs font-semibold text-muted-foreground">
                  Día (desde el calendario)
                </span>
                <p className="font-semibold">
                  {selectedDate
                    ? `${selectedDate} · ${DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}`
                    : "Selecciona un día en el calendario"}
                </p>
                {selectedDate && blockedByDate.has(selectedDate) ? (
                  <p className="mt-1 text-xs text-red-700">
                    Este día no está disponible
                    {blockedByDate.get(selectedDate)?.reason
                      ? `: ${blockedByDate.get(selectedDate)?.reason}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <label className="block text-xs font-semibold">
                Hora
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  disabled={
                    !selectedDate ||
                    blockedByDate.has(selectedDate) ||
                    hourOptions.length === 0
                  }
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal disabled:opacity-60"
                >
                  <option value="">
                    {!selectedDate
                      ? "Primero elige un día"
                      : blockedByDate.has(selectedDate)
                        ? "Día no disponible"
                        : hourOptions.length === 0
                          ? "Sin horarios ese día"
                          : "Selecciona hora"}
                  </option>
                  {hourOptions.map((t) => (
                    <option key={t} value={t}>
                      {t} ({SLOT_MINUTES} min)
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void createAppointment()}
                disabled={propose.isPending}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                Enviar propuesta al paciente
              </button>
            </div>
          </ModuleCard>
        </div>
      </div>

      <ModuleCard>
        <ModuleCardTitle>Citas del mes</ModuleCardTitle>
        <ModuleCardDescription>
          Toca una cita para abrirla y cambiar el estado (pendiente, confirmada,
          cancelada, completada).
        </ModuleCardDescription>
        <div className="mt-4 space-y-2">
          {overview.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (overview.data?.appointments.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay citas en este mes.
            </p>
          ) : (
            overview.data!.appointments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpenAppt(a)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-muted/50"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {a.patient
                      ? `${a.patient.firstName} ${a.patient.lastName}`
                      : "Paciente"}
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_BADGE[a.status] ??
                          "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.startsAt).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    —{" "}
                    {new Date(a.endsAt).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {a.title ? ` · ${a.title}` : ""}
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
              Cambia el estado según corresponda.
            </DialogDescription>
          </DialogHeader>
          {openAppt ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-semibold">
                  {openAppt.patient
                    ? `${openAppt.patient.firstName} ${openAppt.patient.lastName}`
                    : "Paciente"}
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
                {openAppt.title ? (
                  <p className="mt-1">{openAppt.title}</p>
                ) : null}
                {openAppt.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nota: {openAppt.notes}
                  </p>
                ) : null}
                <p className="mt-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      STATUS_BADGE[openAppt.status] ??
                        "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {STATUS_LABEL[openAppt.status] ?? openAppt.status}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["confirmed", "Confirmada"],
                    ["completed", "Completada"],
                    ["cancelled", "Cancelada"],
                    ["declined", "Rechazada"],
                  ] as const
                ).map(([status, label]) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      updateAppt.isPending || openAppt.status === status
                    }
                    onClick={() =>
                      void updateAppt
                        .mutateAsync({ id: openAppt.id, status })
                        .then((updated) => setOpenAppt(updated))
                        .catch((err) =>
                          setError(
                            err instanceof ApiError
                              ? err.message
                              : "No se pudo actualizar",
                          ),
                        )
                    }
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                      openAppt.status === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted",
                      status === "cancelled" &&
                        openAppt.status !== status &&
                        "border-red-200 text-red-700",
                      status === "confirmed" &&
                        openAppt.status !== status &&
                        "border-emerald-200 text-emerald-800",
                      status === "completed" &&
                        openAppt.status !== status &&
                        "border-sky-200 text-sky-800",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
