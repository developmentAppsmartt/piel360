"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type WeeklySlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type BlockedDay = {
  id: string;
  date: string;
  reason: string | null;
};

export type AgendaAppointment = {
  id: string;
  doctorId: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  initiatedBy: string;
  title: string | null;
  notes: string | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type AgendaOverview = {
  weeklySlots: WeeklySlot[];
  blockedDays: BlockedDay[];
  appointments: AgendaAppointment[];
};

function rangeParams(from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useAgendaOverview(from?: string, to?: string) {
  return useQuery({
    queryKey: ["agenda", "overview", from, to],
    queryFn: () =>
      apiClientFetch<AgendaOverview>(
        `/agenda/overview${rangeParams(from, to)}`,
      ),
  });
}

export function useReplaceWeeklySlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: Omit<WeeklySlot, "id">[]) =>
      apiClientFetch<WeeklySlot[]>("/agenda/weekly-slots", {
        method: "PUT",
        body: JSON.stringify({ slots }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useCreateBlockedDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; reason?: string }) =>
      apiClientFetch<BlockedDay>("/agenda/blocked-days", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useDeleteBlockedDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch<{ ok: boolean }>(`/agenda/blocked-days/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useProposeAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      patientId: string;
      startsAt: string;
      endsAt: string;
      title?: string;
      notes?: string;
    }) =>
      apiClientFetch<AgendaAppointment>("/agenda/appointments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useUpdateDoctorAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      status: "confirmed" | "declined" | "cancelled" | "completed";
      notes?: string;
    }) =>
      apiClientFetch<AgendaAppointment>(`/agenda/appointments/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: input.status,
          notes: input.notes,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}
