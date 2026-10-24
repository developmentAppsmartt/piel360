import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { colombiaDateKey, colombiaDayStart } from '@piel360/shared';
import {
  APPOINTMENT_REMINDER_KIND,
  REMINDER_DEFAULT_DAYS,
} from '../email-templates/email-templates.defaults';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentEmailService } from './appointment-email.service';

const ZONA = 'America/Bogota';
const DIA_MS = 24 * 60 * 60 * 1000;
/** Tope del campo «Días de anticipación» (`daysBefore` del DTO). */
const MAX_DIAS = 30;

/** `YYYY-MM-DD` de Colombia, `dias` después de hoy. */
function diaColombia(ahora: Date, dias: number): string {
  const hoy = colombiaDayStart(colombiaDateKey(ahora));
  return colombiaDateKey(new Date(hoy.getTime() + dias * DIA_MS));
}

/**
 * Días de anticipación de cada agenda. `null` = el profesional desactivó la
 * plantilla, y entonces no se le manda recordatorio a nadie. Sin plantilla
 * guardada se usa la de por defecto, igual que «Cita agendada».
 */
async function diasPorAgenda(
  prisma: PrismaService,
  doctorIds: bigint[],
): Promise<Map<bigint, number | null>> {
  const plantillas = await prisma.emailTemplate.findMany({
    where: { kind: APPOINTMENT_REMINDER_KIND, doctorId: { in: doctorIds } },
    orderBy: [{ updatedAt: 'desc' }],
    select: { doctorId: true, isActive: true, daysBefore: true },
  });
  const dias = new Map<bigint, number | null>();
  for (const doctorId of doctorIds) {
    const suyas = plantillas.filter((p) => p.doctorId === doctorId);
    const activa = suyas.find((p) => p.isActive);
    dias.set(
      doctorId,
      activa
        ? (activa.daysBefore ?? REMINDER_DEFAULT_DAYS)
        : suyas.length
          ? null
          : REMINDER_DEFAULT_DAYS,
    );
  }
  return dias;
}

/**
 * A las 8:00 de Colombia se le recuerda al paciente su cita confirmada, N días
 * antes (los que configuró el profesional en la plantilla). Una cita agendada
 * con menos anticipación sale en la siguiente ronda si todavía no pasó.
 * `reminder_sent_at` hace que nunca se repita (una cita no cambia de fecha:
 * `AgendaService` solo le cambia el estado).
 */
@Injectable()
export class AppointmentRemindersCron {
  private readonly logger = new Logger(AppointmentRemindersCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentEmail: AppointmentEmailService,
  ) {}

  @Cron('0 8 * * *', { timeZone: ZONA })
  async alaMañana() {
    try {
      const enviados = await this.enviarPendientes();
      this.logger.log(`Recordatorios de cita enviados: ${enviados}`);
    } catch (err) {
      this.logger.error(
        `Recordatorios de cita fallaron: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Devuelve cuántos correos salieron. Se puede ejecutar varias veces: una
   * cita ya recordada no vuelve a entrar. */
  async enviarPendientes(ahora = new Date()): Promise<number> {
    const citas = await this.prisma.appointment.findMany({
      where: {
        status: 'confirmed',
        reminderSentAt: null,
        startsAt: {
          gt: ahora,
          lt: colombiaDayStart(diaColombia(ahora, MAX_DIAS + 1)),
        },
      },
      select: { id: true, doctorId: true, startsAt: true },
    });
    if (citas.length === 0) return 0;

    const dias = await diasPorAgenda(this.prisma, [
      ...new Set(citas.map((c) => c.doctorId)),
    ]);

    let enviados = 0;
    for (const cita of citas) {
      const anticipacion = dias.get(cita.doctorId);
      if (anticipacion == null) continue;
      if (colombiaDateKey(cita.startsAt) > diaColombia(ahora, anticipacion)) {
        continue;
      }
      // Se marca antes de enviar y solo si nadie la marcó: dos instancias del
      // API no mandan el mismo recordatorio. Si el envío falla no se
      // reintenta — mejor un recordatorio de menos que correos repetidos.
      const { count } = await this.prisma.appointment.updateMany({
        where: { id: cita.id, reminderSentAt: null },
        data: { reminderSentAt: ahora },
      });
      if (count === 0) continue;
      if (await this.appointmentEmail.sendAppointmentReminderEmail(cita.id)) {
        enviados++;
      }
    }
    return enviados;
  }
}
