import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applyEmailTemplateVariables } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrgContextService } from '../organizations/org-context.service';
import { EMAIL_TEMPLATE_DEFAULTS } from '../email-templates/email-templates.defaults';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import type { JwtPayload } from '../auth/types';

const PATIENT_INVITATION_KIND = 'patient_invitation';
const PATIENT_ACCOUNT_CREATED_KIND = 'patient_account_created';

/**
 * Puente entre las plantillas guardadas (`EmailTemplate`) y el envío real
 * (`MailService`/Brevo) — mismo patrón que `ReportEmailService`/
 * `AppointmentEmailService`. Dos entradas:
 *
 * - `sendOnCreate`: automático al dar de alta al paciente.
 * - `sendInvite`: el botón «Invitar» de la tabla, para reenviarlo.
 *
 * Alcance acordado: solo el correo informativo — no genera ningún token ni
 * vincula cuentas (el registro en la app sigue siendo autónomo).
 */
@Injectable()
export class PatientInviteService {
  private readonly logger = new Logger(PatientInviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly orgContext: OrgContextService,
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  /** Al crear el paciente. Nunca lanza: el paciente ya existe y deshacer el
   * alta por un correo sería peor que avisar en el panel. */
  async sendOnCreate(input: {
    catalogDoctorId: bigint | null;
    to: string;
    firstName: string;
    lastName: string;
    clinicName: string;
    /** La que escribió el profesional, si marcó «Crear cuenta». */
    temporaryPassword?: string;
  }): Promise<boolean> {
    try {
      return await this.sendTemplate({
        catalogDoctorId: input.catalogDoctorId,
        kind: input.temporaryPassword
          ? PATIENT_ACCOUNT_CREATED_KIND
          : PATIENT_INVITATION_KIND,
        to: input.to,
        firstName: input.firstName,
        lastName: input.lastName,
        clinicName: input.clinicName,
        temporaryPassword: input.temporaryPassword,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo dar la bienvenida a ${input.to}: ${String(error)}`,
      );
      return false;
    }
  }

  /** El botón «Invitar» de la tabla: reenvía la invitación a un paciente que
   * todavía no tiene cuenta. Sí lanza, porque el panel espera el error. */
  async sendInvite(patientId: string, currentUser: JwtPayload): Promise<{ ok: true }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: BigInt(patientId) },
      include: { doctor: { include: { user: true } } },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (!patient.doctorId) {
      throw new BadRequestException('El paciente no está vinculado a un profesional');
    }

    const ctx = await this.orgContext.assertTeamPermissionForUser(
      currentUser.sub,
      'patients',
    );
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

    const enviado = await this.sendTemplate({
      // El catálogo de plantillas es de la empresa: con `patient.doctorId` un
      // miembro del equipo recibía siempre el texto por defecto, nunca el que
      // configuró el dueño.
      catalogDoctorId: ctx.catalogDoctorId,
      kind: PATIENT_INVITATION_KIND,
      to: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      clinicName: patient.doctor?.user.name?.trim() || 'Piel360',
    });
    if (!enviado) {
      throw new BadRequestException('No se pudo enviar la invitación');
    }

    return { ok: true };
  }

  private async sendTemplate(input: {
    catalogDoctorId: bigint | null;
    kind: string;
    to: string;
    firstName: string;
    lastName: string;
    clinicName: string;
    temporaryPassword?: string;
  }): Promise<boolean> {
    const template = await this.emailTemplates.findActiveByKind(
      input.catalogDoctorId,
      input.kind,
    );

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ??
      'http://localhost:3001';

    const values: Record<string, string> = {
      '{nombre}': input.firstName,
      '{apellido}': input.lastName,
      '{email}': input.to,
      '{clinic_name}': input.clinicName,
      '{clave_temporal}': input.temporaryPassword ?? '',
      // El paciente no entra por web: /patient explica cómo hacerlo desde la
      // app (el proxy manda ahí todo /patient/*).
      '{url_app}': `${frontendUrl}/patient`,
    };

    const defaults = EMAIL_TEMPLATE_DEFAULTS[input.kind];
    const subject = applyEmailTemplateVariables(
      template?.subject ?? defaults.subject,
      values,
    );
    const html = applyEmailTemplateVariables(
      template?.bodyHtml ?? defaults.bodyHtml,
      values,
    );

    try {
      return await this.mail.send({ to: input.to, subject, html });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar «${input.kind}» a ${input.to}: ${String(error)}`,
      );
      return false;
    }
  }
}
