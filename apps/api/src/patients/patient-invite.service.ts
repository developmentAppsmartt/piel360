import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrgContextService } from '../organizations/org-context.service';
import { EMAIL_TEMPLATE_DEFAULTS } from '../email-templates/email-templates.defaults';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import type { JwtPayload } from '../auth/types';

const PATIENT_INVITATION_KIND = 'patient_invitation';

/**
 * Puente entre las plantillas guardadas (`EmailTemplate`, kind=
 * "patient_invitation") y el envío real (`MailService`/Brevo) — mismo
 * patrón que `ReportEmailService`/`AppointmentEmailService`. Alcance
 * acordado: solo el correo informativo — no genera ningún token ni vincula
 * cuentas (el registro en la app sigue siendo autónomo).
 */
@Injectable()
export class PatientInviteService {
  private readonly logger = new Logger(PatientInviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly orgContext: OrgContextService,
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  async sendInvite(patientId: string, currentUser: JwtPayload): Promise<{ ok: true }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(patientId) },
      include: { doctor: { include: { user: true } } },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (!patient.doctorId) {
      throw new BadRequestException('El paciente no está vinculado a un profesional');
    }

    await this.orgContext.assertTeamPermissionForUser(currentUser.sub, 'patients');
    const allowed = await this.orgContext
      .canAccessPatientDoctorId(currentUser.sub, patient.doctorId)
      .catch(() => false);
    if (!allowed) {
      throw new ForbiddenException('No tienes acceso a este paciente');
    }

    if (!patient.email) {
      throw new BadRequestException('El paciente no tiene correo registrado');
    }
    if (patient.userId) {
      throw new BadRequestException('El paciente ya tiene una cuenta vinculada');
    }

    const template = await this.emailTemplates.findActiveByKind(
      patient.doctorId,
      PATIENT_INVITATION_KIND,
    );

    const clinicName = patient.doctor?.user.name?.trim() || 'Piel360';
    const values: Record<string, string> = {
      '{nombre}': patient.firstName,
      '{apellido}': patient.lastName,
      '{email}': patient.email,
      '{clinic_name}': clinicName,
    };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[PATIENT_INVITATION_KIND];
    const subject = applyEmailTemplateVariables(
      template?.subject ?? defaults.subject,
      values,
    );
    const html = applyEmailTemplateVariables(
      template?.bodyHtml ?? defaults.bodyHtml,
      values,
    );

    try {
      await this.mail.send({ to: patient.email, subject, html });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar la invitación al paciente ${patientId}: ${String(error)}`,
      );
      throw new BadRequestException('No se pudo enviar la invitación');
    }

    return { ok: true };
  }
}
