import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContextService } from '../organizations/org-context.service';
import type {
  CreateAppointmentDto,
  CreateBlockedDayDto,
  PatientRequestAppointmentDto,
  ReplaceWeeklySlotsDto,
  UpdateAppointmentStatusDto,
} from './dto/agenda.dto';

const ACTIVE_STATUSES = ['proposed', 'requested', 'confirmed'] as const;

function parseYmd(date: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (!m) throw new BadRequestException('Fecha inválida (usa YYYY-MM-DD)');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  private async catalogDoctorId(userId: string) {
    const ctx = await this.orgContext.resolve(userId);
    if (ctx.isOrgMember && !ctx.isOrgOwner) {
      this.orgContext.assertTeamPermission(ctx, 'patients');
    }
    return ctx.catalogDoctorId;
  }

  /** Agenda compartida del owner si el doctor del paciente es miembro de equipo. */
  private async agendaDoctorIdFromPatientDoctor(
    patientDoctorId: bigint,
  ): Promise<bigint> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: patientDoctorId },
      select: { userId: true },
    });
    if (!doctor?.userId) return patientDoctorId;
    try {
      const ctx = await this.orgContext.resolve(doctor.userId.toString());
      return ctx.catalogDoctorId;
    } catch {
      return patientDoctorId;
    }
  }

  private serializeSlot(row: {
    id: bigint;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }) {
    return {
      id: row.id.toString(),
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      isActive: row.isActive,
    };
  }

  private serializeBlocked(row: {
    id: bigint;
    date: Date;
    reason: string | null;
  }) {
    return {
      id: row.id.toString(),
      date: toYmd(row.date),
      reason: row.reason,
    };
  }

  private serializeAppointment(row: {
    id: bigint;
    doctorId: bigint;
    patientId: bigint;
    startsAt: Date;
    endsAt: Date;
    status: string;
    initiatedBy: string;
    title: string | null;
    notes: string | null;
    createdByUserId: bigint;
    createdAt: Date;
    updatedAt: Date;
    patient?: {
      id: bigint;
      firstName: string;
      lastName: string;
      email: string | null;
    } | null;
    doctor?: {
      id: bigint;
      firstName: string;
      lastName: string;
    } | null;
  }) {
    return {
      id: row.id.toString(),
      doctorId: row.doctorId.toString(),
      patientId: row.patientId.toString(),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status,
      initiatedBy: row.initiatedBy,
      title: row.title,
      notes: row.notes,
      createdByUserId: row.createdByUserId.toString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      patient: row.patient
        ? {
            id: row.patient.id.toString(),
            firstName: row.patient.firstName,
            lastName: row.patient.lastName,
            email: row.patient.email,
          }
        : undefined,
      doctor: row.doctor
        ? {
            id: row.doctor.id.toString(),
            firstName: row.doctor.firstName,
            lastName: row.doctor.lastName,
          }
        : undefined,
    };
  }

  // ─── Profesional: horarios ───────────────────────────────────────────────

  async getWeeklySlots(userId: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const rows = await this.prisma.doctorWeeklySlot.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((r) => this.serializeSlot(r));
  }

  async replaceWeeklySlots(userId: string, dto: ReplaceWeeklySlotsDto) {
    const doctorId = await this.catalogDoctorId(userId);
    for (const slot of dto.slots) {
      if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime)) {
        throw new BadRequestException(
          `El horario del día ${slot.dayOfWeek} tiene inicio ≥ fin`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.doctorWeeklySlot.deleteMany({ where: { doctorId } });
      if (dto.slots.length > 0) {
        await tx.doctorWeeklySlot.createMany({
          data: dto.slots.map((s) => ({
            doctorId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: s.isActive ?? true,
          })),
        });
      }
    });

    return this.getWeeklySlots(userId);
  }

  // ─── Profesional: días bloqueados ────────────────────────────────────────

  async listBlockedDays(userId: string, from?: string, to?: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const where: {
      doctorId: bigint;
      date?: { gte?: Date; lte?: Date };
    } = { doctorId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = parseYmd(from);
      if (to) where.date.lte = parseYmd(to);
    }
    const rows = await this.prisma.doctorBlockedDay.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => this.serializeBlocked(r));
  }

  async createBlockedDay(userId: string, dto: CreateBlockedDayDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const date = parseYmd(dto.date);
    try {
      const row = await this.prisma.doctorBlockedDay.create({
        data: {
          doctorId,
          date,
          reason: dto.reason?.trim() || null,
        },
      });
      return this.serializeBlocked(row);
    } catch {
      throw new BadRequestException('Ese día ya está marcado como no disponible');
    }
  }

  async deleteBlockedDay(userId: string, id: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const row = await this.prisma.doctorBlockedDay.findFirst({
      where: { id: BigInt(id), doctorId },
    });
    if (!row) throw new NotFoundException('Día bloqueado no encontrado');
    await this.prisma.doctorBlockedDay.delete({ where: { id: row.id } });
    return { ok: true };
  }

  // ─── Citas (profesional) ─────────────────────────────────────────────────

  async listDoctorAppointments(userId: string, from?: string, to?: string) {
    const doctorId = await this.catalogDoctorId(userId);
    const where: {
      doctorId: bigint;
      startsAt?: { gte?: Date; lte?: Date };
    } = { doctorId };
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = new Date(from);
      if (to) where.startsAt.lte = new Date(to);
    }
    const rows = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map((r) => this.serializeAppointment(r));
  }

  async proposeAppointment(userId: string, dto: CreateAppointmentDto) {
    const doctorId = await this.catalogDoctorId(userId);
    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(dto.patientId) },
    });
    if (!patient?.doctorId) {
      throw new NotFoundException('Paciente no encontrado');
    }
    const canAccess = await this.orgContext
      .canAccessPatientDoctorId(userId, patient.doctorId)
      .catch(() => false);
    if (!canAccess) {
      throw new ForbiddenException('No tienes acceso a este paciente');
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!(startsAt < endsAt)) {
      throw new BadRequestException('La hora de fin debe ser posterior al inicio');
    }
    await this.assertSlotFree(doctorId, startsAt, endsAt);

    const row = await this.prisma.appointment.create({
      data: {
        doctorId,
        patientId: patient.id,
        startsAt,
        endsAt,
        status: 'proposed',
        initiatedBy: 'doctor',
        title: dto.title?.trim() || 'Cita',
        notes: dto.notes?.trim() || null,
        createdByUserId: BigInt(userId),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return this.serializeAppointment(row);
  }

  async updateAppointmentAsDoctor(
    userId: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const doctorId = await this.catalogDoctorId(userId);
    const row = await this.prisma.appointment.findFirst({
      where: { id: BigInt(id), doctorId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Cita no encontrada');

    if (dto.status === row.status) {
      return this.serializeAppointment(row);
    }

    const updated = await this.prisma.appointment.update({
      where: { id: row.id },
      data: {
        status: dto.status,
        ...(dto.notes != null ? { notes: dto.notes.trim() || null } : {}),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return this.serializeAppointment(updated);
  }

  // ─── Paciente ────────────────────────────────────────────────────────────

  private async requirePatient(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        doctor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!patient) {
      throw new ForbiddenException('No tienes un perfil de paciente');
    }
    return patient;
  }

  async getMyDoctorAgenda(userId: string, from?: string, to?: string) {
    const patient = await this.requirePatient(userId);
    if (!patient.doctorId || !patient.doctor) {
      return {
        doctor: null,
        weeklySlots: [] as ReturnType<AgendaService['serializeSlot']>[],
        blockedDays: [] as ReturnType<AgendaService['serializeBlocked']>[],
        busySlots: [] as {
          id: string;
          startsAt: string;
          endsAt: string;
          mine: boolean;
          status: string;
        }[],
        message: 'Aún no estás vinculado a un profesional.',
      };
    }

    const doctorId = await this.agendaDoctorIdFromPatientDoctor(
      patient.doctorId,
    );
    const agendaDoctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, firstName: true, lastName: true },
    });

    const [slots, blocked, appointments] = await Promise.all([
      this.prisma.doctorWeeklySlot.findMany({
        where: { doctorId, isActive: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.doctorBlockedDay.findMany({
        where: {
          doctorId,
          ...(from || to
            ? {
                date: {
                  ...(from ? { gte: parseYmd(from) } : {}),
                  ...(to ? { lte: parseYmd(to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          status: { in: [...ACTIVE_STATUSES] },
          ...(from || to
            ? {
                startsAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          patientId: true,
        },
      }),
    ]);

    return {
      doctor: agendaDoctor
        ? {
            id: agendaDoctor.id.toString(),
            firstName: agendaDoctor.firstName,
            lastName: agendaDoctor.lastName,
          }
        : {
            id: patient.doctor.id.toString(),
            firstName: patient.doctor.firstName,
            lastName: patient.doctor.lastName,
          },
      weeklySlots: slots.map((r) => this.serializeSlot(r)),
      blockedDays: blocked.map((r) => this.serializeBlocked(r)),
      busySlots: appointments.map((a) => ({
        id: a.id.toString(),
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        mine: a.patientId === patient.id,
        status: a.status,
      })),
      message: null as string | null,
    };
  }

  async listMyAppointments(userId: string) {
    const patient = await this.requirePatient(userId);
    const rows = await this.prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map((r) => this.serializeAppointment(r));
  }

  async requestAppointment(userId: string, dto: PatientRequestAppointmentDto) {
    const patient = await this.requirePatient(userId);
    if (!patient.doctorId) {
      throw new BadRequestException(
        'Debes estar vinculado a un profesional para solicitar una cita',
      );
    }
    const doctorId = await this.agendaDoctorIdFromPatientDoctor(
      patient.doctorId,
    );
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!(startsAt < endsAt)) {
      throw new BadRequestException('La hora de fin debe ser posterior al inicio');
    }

    const dayDate = parseYmd(toYmd(startsAt));
    const day = dayDate.getUTCDay();
    const blocked = await this.prisma.doctorBlockedDay.findFirst({
      where: {
        doctorId,
        date: dayDate,
      },
    });
    if (blocked) {
      throw new BadRequestException(
        blocked.reason
          ? `Ese día no está disponible: ${blocked.reason}`
          : 'Ese día no está disponible',
      );
    }

    const slots = await this.prisma.doctorWeeklySlot.findMany({
      where: { doctorId, dayOfWeek: day, isActive: true },
    });
    if (slots.length === 0) {
      throw new BadRequestException('El profesional no atiende ese día');
    }

    await this.assertSlotFree(doctorId, startsAt, endsAt);

    const row = await this.prisma.appointment.create({
      data: {
        doctorId,
        patientId: patient.id,
        startsAt,
        endsAt,
        status: 'requested',
        initiatedBy: 'patient',
        title: dto.title?.trim() || 'Solicitud de cita',
        notes: dto.notes?.trim() || null,
        createdByUserId: BigInt(userId),
      },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return this.serializeAppointment(row);
  }

  async updateAppointmentAsPatient(
    userId: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const patient = await this.requirePatient(userId);
    const row = await this.prisma.appointment.findFirst({
      where: { id: BigInt(id), patientId: patient.id },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('Cita no encontrada');

    if (dto.status === 'completed') {
      throw new ForbiddenException('Solo el profesional puede completar la cita');
    }

    if (dto.status === 'confirmed' && row.status !== 'proposed') {
      throw new BadRequestException(
        'Solo puedes aceptar citas propuestas por tu profesional',
      );
    }
    if (
      dto.status === 'declined' &&
      !['proposed', 'requested'].includes(row.status)
    ) {
      throw new BadRequestException('No se puede rechazar esta cita');
    }
    if (
      dto.status === 'cancelled' &&
      !['proposed', 'requested', 'confirmed'].includes(row.status)
    ) {
      throw new BadRequestException('No se puede cancelar esta cita');
    }

    if (dto.status === row.status) {
      return this.serializeAppointment(row);
    }

    const updated = await this.prisma.appointment.update({
      where: { id: row.id },
      data: {
        status: dto.status,
        ...(dto.notes != null ? { notes: dto.notes.trim() || null } : {}),
      },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return this.serializeAppointment(updated);
  }

  /** Vista unificada para CRM/mobile profesional. */
  async getDoctorOverview(userId: string, from?: string, to?: string) {
    const [weeklySlots, blockedDays, appointments] = await Promise.all([
      this.getWeeklySlots(userId),
      this.listBlockedDays(userId, from, to),
      this.listDoctorAppointments(userId, from, to),
    ]);
    return { weeklySlots, blockedDays, appointments };
  }

  private async assertSlotFree(
    doctorId: bigint,
    startsAt: Date,
    endsAt: Date,
    excludeId?: bigint,
  ) {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { in: [...ACTIVE_STATUSES] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) {
      throw new BadRequestException('Ese horario ya está ocupado');
    }
  }
}
