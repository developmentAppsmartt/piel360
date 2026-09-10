import { Injectable, Logger } from '@nestjs/common';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EMAIL_TEMPLATE_DEFAULTS } from '../email-templates/email-templates.defaults';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

const APPOINTMENT_SCHEDULED_KIND = 'appointment_scheduled';

/**
 * Puente entre las plantillas guardadas (`EmailTemplate`, kind=
 * "appointment_scheduled") y el envío real (`MailService`/Brevo) — mismo
 * patrón que `ReportEmailService` (apps/api/src/reports/report-email.service.ts).
 * Se llama desde `AgendaService.proposeAppointment`/`updateAppointmentAsDoctor`.
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
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });
    if (!appointment?.patient.email) return;

    const template = await this.emailTemplates.findActiveByKind(
      appointment.doctorId,
      APPOINTMENT_SCHEDULED_KIND,
    );

    const clinicName = appointment.doctor.user.name?.trim() || 'Piel360';
    const values: Record<string, string> = {
      '{nombre}': appointment.patient.firstName,
      '{apellido}': appointment.patient.lastName,
      '{email}': appointment.patient.email,
      '{fecha_cita}': appointment.startsAt.toLocaleDateString('es-CO', {
        dateStyle: 'long',
      }),
      '{hora_cita}': appointment.startsAt.toLocaleTimeString('es-CO', {
        timeStyle: 'short',
      }),
      '{cita_titulo}': appointment.title || 'Consulta',
      '{clinic_name}': clinicName,
    };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[APPOINTMENT_SCHEDULED_KIND];
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
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo de cita agendada (appointment ${appointmentId}): ${String(error)}`,
      );
    }
  }
}
