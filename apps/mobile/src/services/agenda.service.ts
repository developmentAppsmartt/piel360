import { apiRequest } from './api.client';

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

export type PatientDoctorCalendar = {
  doctor: { id: string; firstName: string; lastName: string } | null;
  weeklySlots: WeeklySlot[];
  blockedDays: BlockedDay[];
  busySlots: {
    id: string;
    startsAt: string;
    endsAt: string;
    mine: boolean;
    status: string;
  }[];
  message: string | null;
};

function range(from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const agendaService = {
  getOverview(from?: string, to?: string) {
    return apiRequest<AgendaOverview>(
      `/agenda/overview${range(from, to)}`,
      { auth: true },
    );
  },

  replaceWeeklySlots(
    slots: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isActive?: boolean;
    }[],
  ) {
    return apiRequest<WeeklySlot[]>('/agenda/weekly-slots', {
      method: 'PUT',
      auth: true,
      body: { slots },
    });
  },

  createBlockedDay(date: string, reason?: string) {
    return apiRequest<BlockedDay>('/agenda/blocked-days', {
      method: 'POST',
      auth: true,
      body: { date, reason },
    });
  },

  deleteBlockedDay(id: string) {
    return apiRequest<{ ok: boolean }>(`/agenda/blocked-days/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  proposeAppointment(input: {
    patientId: string;
    startsAt: string;
    endsAt: string;
    title?: string;
    notes?: string;
  }) {
    return apiRequest<AgendaAppointment>('/agenda/appointments', {
      method: 'POST',
      auth: true,
      body: input,
    });
  },

  updateDoctorAppointment(
    id: string,
    status: 'confirmed' | 'declined' | 'cancelled' | 'completed',
  ) {
    return apiRequest<AgendaAppointment>(`/agenda/appointments/${id}`, {
      method: 'PATCH',
      auth: true,
      body: { status },
    });
  },

  getMyDoctorCalendar(from?: string, to?: string) {
    return apiRequest<PatientDoctorCalendar>(
      `/agenda/me/doctor-calendar${range(from, to)}`,
      { auth: true },
    );
  },

  listMyAppointments() {
    return apiRequest<AgendaAppointment[]>('/agenda/me/appointments', {
      auth: true,
    });
  },

  requestAppointment(input: {
    startsAt: string;
    endsAt: string;
    title?: string;
    notes?: string;
  }) {
    return apiRequest<AgendaAppointment>('/agenda/me/appointments', {
      method: 'POST',
      auth: true,
      body: input,
    });
  },

  updateMyAppointment(
    id: string,
    status: 'confirmed' | 'declined' | 'cancelled',
  ) {
    return apiRequest<AgendaAppointment>(`/agenda/me/appointments/${id}`, {
      method: 'PATCH',
      auth: true,
      body: { status },
    });
  },
};
