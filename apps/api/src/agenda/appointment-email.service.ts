import { Injectable, Logger } from '@nestjs/common';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  APPOINTMENT_REMINDER_KIND,
  EMAIL_TEMPLATE_DEFAULTS,
} from '../email-templates/email-templates.defaults';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

const APPOINTMENT_SCHEDULED_KIND = 'appointment_scheduled';
const ZONA = 'America/Bogota';

type AppointmentForEmail = {
  startsAt: Date;
  title: string | null;
  patient: { firstName: string; lastName: string; email: string | null };
  doctor: { user: { name: string | null } };
};

/** Variables de los correos de cita. La fecha y la hora van en hora de
 * Colombia: el contenedor corre en UTC y sin `timeZone` una cita a las
 * 3:00 p. m. llegaba como 8:00 p. m. */
export function appointmentEmailValues(
  appointment: AppointmentForEmail,
): Record<string, string> {
  return {
    '{nombre}': appointment.patient.firstName,
    '{apellido}': appointment.patient.lastName,
    '{email}': appointment.patient.email ?? '',
    '{fecha_cita}': appointment.startsAt.toLocaleDateString('es-CO', {
      dateStyle: 'long',
      timeZone: ZONA,
    }),
    '{hora_cita}': appointment.startsAt.toLocaleTimeString('es-CO', {
      timeStyle: 'short',
      timeZone: ZONA,
    }),
    '{cita_titulo}': appointment.title || 'Consulta',
    '{clinic_name}': appointment.doctor.user.name?.trim() || 'Piel360',
  };
}

/**
 * Puente entre las plantillas guardadas (`EmailTemplate`) y el envío real
 * (`MailService`/Brevo) para los correos de cita al paciente — mismo patrón
 * que `ReportEmailService` (apps/api/src/reports/report-email.service.ts).
 * «Cita agendada» se llama desde `AgendaService`; el recordatorio, desde
 * `AppointmentRemindersCron`.
 */
@Injectable()
export class AppointmentEmailService {
  private readonly logger = new Logger(AppointmentEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  async sendAppointmentScheduledEmail(appointmentId: bigint): Promise<void> {
    await this.send(appointmentId, APPOINTMENT_SCHEDULED_KIND);
  }

  /** `true` si el correo salió. */
  sendAppointmentReminderEmail(appointmentId: bigint): Promise<boolean> {
    return this.send(appointmentId, APPOINTMENT_REMINDER_KIND);
  }

  private async send(appointmentId: bigint, kind: string): Promise<boolean> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });
    if (!appointment?.patient.email) return false;

    const template = await this.emailTemplates.findActiveByKind(
      appointment.doctorId,
      kind,
    );
    const values = appointmentEmailValues(appointment);
    const defaults = EMAIL_TEMPLATE_DEFAULTS[kind];
    const subject = applyEmailTemplateVariables(
      template?.subject ?? defaults.subject,
      values,
    );
    const html = applyEmailTemplateVariables(
      template?.bodyHtml ?? defaults.bodyHtml,
      values,
    );

    try {
      await this.mail.send({ to: appointment.patient.email, subject, html });
      return true;
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo «${kind}» (appointment ${appointmentId}): ${String(error)}`,
      );
      return false;
    }
  }
}
